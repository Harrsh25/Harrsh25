import { round2 } from '@nebulla/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requireRole } from '../auth';
import { badRequest, conflict, forbidden, get, insert, list, mutate, save } from '../repo';
import { checkGate, settingsOf, today } from '../services/rules';
import { act, isoDate, money, nowISO, params, parse, qty } from './helpers';

type Doc = Record<string, any>;

export async function executionRoutes(app: FastifyInstance) {
  // ── Work orders (stage 07/10) ────────────────────────────────────────────
  const item = z.object({ code: z.string().optional(), desc: z.string().min(1), unit: z.string().min(1), qty, rate: money, trade: z.string().optional() });
  const wo = z.object({
    contractId: z.string(), title: z.string().min(3), location: z.string().default(''), start: isoDate, end: isoDate, wbs: z.string().default(''),
    items: z.array(item).default([]), milestones: z.array(z.object({ name: z.string().min(1), weight: z.coerce.number().positive() })).default([]),
    lumpSum: money.optional(), overrideReason: z.string().optional(),
  }).refine((w) => w.end > w.start, { message: 'End must be after start', path: ['end'] });
  app.post('/api/work-orders', { preHandler: requireRole('project') }, async (req) => {
    const b = parse(wo, req.body);
    return act(req, async ({ db, user, by, log }) => {
      const settings = await settingsOf(db);
      const c = await get('contracts', b.contractId, db);
      if (c.status !== 'Active') throw conflict(`Contract ${c.id} is ${c.status} — work orders need an active (signed) contract`);
      if (b.start < c.start || b.end > c.end) throw badRequest(`Work order dates must fall inside the contract period (${c.start} → ${c.end})`);
      const kickoff = (await list('kickoffs', { db, where: { contract_id: c.id } }))[0];
      if (kickoff?.status !== 'Completed') throw conflict('Complete the contract kickoff before issuing work orders');
      const v = await get('vendors', c.vendorId, db);
      if (settings.mobilisationBeforeWo && v.isContractor && (v.onboarding?.checklist ?? []).some((i: Doc) => !i.done))
        throw conflict('Contractor mobilisation checklist is not complete (Procurement Settings → mobilisation before first work order)');
      const { warnings } = await checkGate(db, user, { action: 'po', vendorId: c.vendorId, overrideReason: b.overrideReason });
      const type = c.type === 'Lump Sum' ? 'Lump Sum' : 'Item-Rate';
      if (type === 'Lump Sum') {
        if (!b.lumpSum || !b.milestones.length) throw badRequest('Lump-sum work orders need a lump sum and milestones');
        const w = b.milestones.reduce((s, m) => s + m.weight, 0);
        if (Math.abs(w - 100) > 0.01) throw badRequest(`Milestone weights add up to ${w}% — they must total 100%`);
      } else if (!b.items.length) throw badRequest('Add at least one BOQ item');
      const existing = await list('workOrders', { db, where: { contract_id: c.id } });
      const committed = existing.filter((w) => w.status !== 'Cancelled').reduce((s, w) => s + (w.type === 'Lump Sum' ? w.lumpSum : w.items.reduce((a: number, i: Doc) => a + i.qty * i.rate, 0)), 0);
      const thisValue = type === 'Lump Sum' ? b.lumpSum! : b.items.reduce((a, i) => a + i.qty * i.rate, 0);
      const cv = c.value + (c.changeOrders ?? []).filter((x: Doc) => x.status === 'Approved').reduce((s: number, x: Doc) => s + x.amount, 0);
      if (committed + thisValue > cv + 1) throw conflict(`Work orders would total ₹${Math.round(committed + thisValue).toLocaleString('en-IN')}, above the contract value ₹${Math.round(cv).toLocaleString('en-IN')} — raise a change order`);
      const w = await insert('workOrders', {
        contractId: c.id, vendorId: c.vendorId, project: c.project, title: b.title, type, location: b.location, start: b.start, end: b.end, wbs: b.wbs,
        status: 'Issued', issuedOn: today(), issuedBy: by, acceptance: { status: 'Pending' }, equipment: [],
        ...(type === 'Lump Sum' ? { lumpSum: b.lumpSum, milestones: b.milestones.map((m, i) => ({ id: `M${i + 1}`, ...m })) } : { items: b.items.map((it, i) => ({ id: `L${i + 1}`, ...it })) }),
      }, db);
      await log('workOrders', w.id, 'Issued', { warnings });
      return { ...w, _warnings: warnings };
    });
  });

  // Contractor accepts / rejects (portal)
  const accept = z.object({ decision: z.enum(['Accepted', 'Rejected']), note: z.string().default('') });
  app.post('/api/work-orders/:id/acceptance', { preHandler: authenticate }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(accept, req.body);
    return act(req, async ({ db, user, log }) => {
      const w = await mutate('workOrders', id, db, (w: Doc) => {
        if (user.role === 'vendor' ? user.vendorId !== w.vendorId : !['admin', 'project'].includes(user.role)) throw forbidden();
        if (w.acceptance?.status !== 'Pending') throw conflict('Work order is not awaiting acceptance');
        if (b.decision === 'Rejected' && !b.note.trim()) throw badRequest('Say why the work order is rejected');
        w.acceptance = { status: b.decision, by: user.name, at: today(), note: b.note };
        w.status = b.decision === 'Accepted' ? 'In Progress' : 'Rejected';
      });
      await log('workOrders', id, `Contractor ${b.decision.toLowerCase()}`);
      return w;
    });
  });

  const woStatus = z.object({ status: z.enum(['Completed', 'Suspended', 'In Progress', 'Cancelled']), remark: z.string().default('') });
  app.post('/api/work-orders/:id/status', { preHandler: requireRole('project') }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(woStatus, req.body);
    return act(req, async ({ db, log }) => {
      if (b.status === 'Completed') {
        const ncrs = await list('ncrs', { db, where: { wo_id: id } });
        if (ncrs.some((n) => n.status !== 'Closed')) throw conflict('Close all NCRs on this work order first');
      }
      const w = await mutate('workOrders', id, db, (w: Doc) => {
        if (['Completed', 'Cancelled'].includes(w.status)) throw conflict(`Work order is ${w.status}`);
        w.status = b.status; w.statusRemark = b.remark;
        if (b.status === 'Completed') w.completedOn = today();
      });
      await log('workOrders', id, `Status → ${b.status}`, b);
      return w;
    });
  });

  // ── Workers & attendance (stage 11) ──────────────────────────────────────
  const worker = z.object({ vendorId: z.string(), woId: z.string(), name: z.string().min(2), trade: z.string().min(2), skill: z.enum(['Unskilled', 'Semi-skilled', 'Skilled', 'Highly Skilled']), gatePass: z.string().min(2), inductionOn: isoDate });
  app.post('/api/workers', { preHandler: requireRole('project') }, async (req) => {
    const b = parse(worker, req.body);
    return act(req, async ({ db, log }) => {
      const w = await get('workOrders', b.woId, db);
      if (w.vendorId !== b.vendorId) throw conflict('Work order belongs to another contractor');
      const all = await list('workers', { db });
      if (all.some((x) => x.gatePass === b.gatePass && x.active)) throw conflict(`Gate pass ${b.gatePass} is already issued`);
      const r = await insert('workers', { ...b, active: true }, db);
      await log('workers', r.id, 'Registered');
      return r;
    });
  });

  app.post('/api/workers/:id/deactivate', { preHandler: requireRole('project') }, async (req) => {
    const { id } = parse(params, req.params);
    return act(req, async ({ db, log }) => {
      const w = await mutate('workers', id, db, (w: Doc) => { w.active = false; w.releasedOn = today(); });
      await log('workers', id, 'Gate pass deactivated');
      return w;
    });
  });

  const muster = z.object({
    woId: z.string(), date: isoDate,
    entries: z.array(z.object({ workerId: z.string(), status: z.enum(['P', 'H', 'A']), ot: z.coerce.number().min(0).max(4).default(0) })).min(1),
  });
  app.post('/api/attendance', { preHandler: authenticate }, async (req) => {
    const b = parse(muster, req.body);
    if (b.date > today()) throw badRequest('Attendance cannot be marked for a future date');
    return act(req, async ({ db, user, by, log }) => {
      const w = await get('workOrders', b.woId, db);
      const isVendor = user.role === 'vendor';
      if (isVendor ? user.vendorId !== w.vendorId : !['admin', 'project'].includes(user.role)) throw forbidden();
      const workers = await list('workers', { db, where: { wo_id: b.woId } });
      const existing = await list('attendance', { db, where: { wo_id: b.woId, date: b.date } });
      for (const e of b.entries) {
        const wk = workers.find((x) => x.id === e.workerId);
        if (!wk) throw badRequest(`${e.workerId} is not deployed on ${b.woId}`);
        if (!wk.active) throw conflict(`${wk.name}'s gate pass is inactive`);
        if (wk.inductionOn > b.date) throw conflict(`${wk.name} had not completed safety induction on ${b.date}`);
        if (e.status === 'A' && e.ot > 0) throw badRequest(`${wk.name}: overtime on an absent day`);
        const cur = existing.find((a) => a.workerId === e.workerId);
        if (cur?.rolledInto) throw conflict(`${wk.name}'s attendance for ${b.date} is already billed (${cur.rolledInto})`);
        const doc = { date: b.date, woId: b.woId, workerId: e.workerId, status: e.status, hours: e.status === 'P' ? 8 : e.status === 'H' ? 4 : 0, ot: e.ot, rolledInto: null, source: isVendor ? 'Contractor' : 'Site', verified: !isVendor, markedBy: by };
        if (cur) await save('attendance', { ...cur, ...doc, id: cur.id }, db); else await insert('attendance', doc, db);
      }
      await log('workOrders', b.woId, `Muster for ${b.date} saved (${b.entries.length} workers)`);
      return list('attendance', { db, where: { wo_id: b.woId, date: b.date } });
    });
  });

  app.post('/api/attendance/verify', { preHandler: requireRole('project') }, async (req) => {
    const b = parse(z.object({ woId: z.string(), date: isoDate }), req.body);
    return act(req, async ({ db, by, log }) => {
      const rows = await list('attendance', { db, where: { wo_id: b.woId, date: b.date } });
      for (const r of rows.filter((x) => !x.verified)) await save('attendance', { ...r, verified: true, verifiedBy: by }, db);
      await log('workOrders', b.woId, `Muster for ${b.date} verified`);
      return { verified: rows.filter((x) => !x.verified).length };
    });
  });

  // Roll verified attendance into measurement-book entries (man-days per trade line)
  const rollup = z.object({ woId: z.string(), from: isoDate, to: isoDate });
  app.post('/api/attendance/rollup', { preHandler: requireRole('project') }, async (req) => {
    const b = parse(rollup, req.body);
    if (b.to < b.from) throw badRequest('Period end is before start');
    return act(req, async ({ db, by, log }) => {
      const w = await get('workOrders', b.woId, db);
      if (w.type === 'Lump Sum') throw conflict('Lump-sum work orders are not billed on attendance');
      const workers = await list('workers', { db, where: { wo_id: b.woId } });
      const att = (await list('attendance', { db, where: { wo_id: b.woId } })).filter((a) => a.date >= b.from && a.date <= b.to && !a.rolledInto);
      const unverified = att.filter((a) => !a.verified);
      if (unverified.length) throw conflict(`${unverified.length} attendance rows are not verified yet — verify the contractor's muster first`);
      const byLine = new Map<string, { qty: number; ids: string[] }>();
      const unmapped = new Set<string>();
      for (const a of att) {
        const wk = workers.find((x) => x.id === a.workerId);
        if (!wk) continue;
        const line = w.items.find((i: Doc) => (i.trade ?? '').toLowerCase() === wk.trade.toLowerCase())
          ?? w.items.find((i: Doc) => i.desc.toLowerCase().includes(wk.trade.split(/[ /]/)[0].toLowerCase()));
        if (!line) { unmapped.add(wk.trade); continue; }
        const days = (a.status === 'P' ? 1 : a.status === 'H' ? 0.5 : 0) + ((a.ot || 0) / 8) * 2; // OT at 2× (Minimum Wages Rules)
        const cur = byLine.get(line.id) ?? { qty: 0, ids: [] };
        cur.qty += days; cur.ids.push(a.id);
        byLine.set(line.id, cur);
      }
      if (unmapped.size) throw conflict(`No work-order line for trade(s): ${[...unmapped].join(', ')}`);
      if (!byLine.size) throw conflict('No unbilled attendance in this period');
      const created: Doc[] = [];
      for (const [lineId, v] of byLine) {
        const m = await insert('measurements', {
          woId: b.woId, lineId, date: b.to, location: `Muster roll ${b.from} → ${b.to}`, nos: null, l: null, b: null, d: null, qty: round2(v.qty), pct: null,
          recordedBy: by, jms: { status: 'Pending' }, remarks: `${v.ids.length} attendance rows (OT counted at 2×)`, billedIn: null, qc: { status: 'Not required' }, source: 'Attendance',
        }, db);
        for (const id of v.ids) { const a = await get('attendance', id, db); await save('attendance', { ...a, rolledInto: m.id }, db); }
        created.push(m);
      }
      await log('workOrders', b.woId, `Attendance rolled up into ${created.map((m) => m.id).join(', ')}`);
      return created;
    });
  });

  // ── Measurement book (stage 15) ──────────────────────────────────────────
  const mb = z.object({
    woId: z.string(), lineId: z.string(), date: isoDate, location: z.string().min(2),
    nos: z.coerce.number().positive().nullable().optional(), l: z.coerce.number().positive().nullable().optional(), b: z.coerce.number().positive().nullable().optional(), d: z.coerce.number().positive().nullable().optional(),
    qty: z.coerce.number().positive().nullable().optional(), pct: z.coerce.number().min(0).max(100).nullable().optional(), remarks: z.string().default(''),
  });
  app.post('/api/measurements', { preHandler: requireRole('project') }, async (req) => {
    const b = parse(mb, req.body);
    if (b.date > today()) throw badRequest('Measurement date cannot be in the future');
    return act(req, async ({ db, by, log }) => {
      const w = await get('workOrders', b.woId, db);
      if (!['In Progress', 'Issued'].includes(w.status)) throw conflict(`Work order is ${w.status}`);
      if (w.acceptance?.status !== 'Accepted') throw conflict('Contractor has not accepted this work order');
      let qtyVal: number | null = null; let pctVal: number | null = null;
      if (w.type === 'Lump Sum') {
        if (!w.milestones.some((m: Doc) => m.id === b.lineId)) throw badRequest('Unknown milestone');
        if (b.pct == null) throw badRequest('Enter cumulative % complete for the milestone');
        const prev = Math.max(0, ...(await list('measurements', { db, where: { wo_id: b.woId } })).filter((m) => m.lineId === b.lineId && m.jms?.status === 'Signed').map((m) => m.pct ?? 0));
        if (b.pct < prev) throw badRequest(`Cumulative % cannot go down (signed so far: ${prev}%)`);
        pctVal = b.pct;
      } else {
        const it = w.items.find((i: Doc) => i.id === b.lineId);
        if (!it) throw badRequest('Unknown BOQ line');
        const dims = [b.nos, b.l, b.b, b.d].filter((x) => x != null) as number[];
        qtyVal = b.qty ?? (dims.length ? round2(dims.reduce((a, x) => a * x, 1)) : null);
        if (!qtyVal) throw badRequest('Enter a quantity or the N × L × B × D dimensions');
      }
      const m = await insert('measurements', {
        woId: b.woId, lineId: b.lineId, date: b.date, location: b.location, nos: b.nos ?? null, l: b.l ?? null, b: b.b ?? null, d: b.d ?? null,
        qty: qtyVal, pct: pctVal, recordedBy: by, jms: { status: 'Pending' }, remarks: b.remarks, billedIn: null, qc: { status: 'Pending' },
      }, db);
      await log('measurements', m.id, 'Recorded');
      return m;
    });
  });

  // Joint measurement: contractor rep + engineer sign, or dispute
  const jms = z.object({ status: z.enum(['Signed', 'Disputed']), contractorRep: z.string().min(2), remark: z.string().default('') });
  app.post('/api/measurements/:id/jms', { preHandler: authenticate }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(jms, req.body);
    if (b.status === 'Disputed' && !b.remark.trim()) throw badRequest('Describe the dispute');
    return act(req, async ({ db, user, by, log }) => {
      const m = await get('measurements', id, db, true);
      const w = await get('workOrders', m.woId, db);
      if (user.role === 'vendor' ? user.vendorId !== w.vendorId : !['admin', 'project'].includes(user.role)) throw forbidden();
      if (m.billedIn) throw conflict(`Already billed in ${m.billedIn}`);
      m.jms = { status: b.status, contractorRep: b.contractorRep, engineer: user.role === 'vendor' ? m.jms?.engineer ?? null : by, at: nowISO(), remark: b.remark };
      await save('measurements', m, db);
      await log('measurements', id, `JMS ${b.status.toLowerCase()}`, b);
      return m;
    });
  });

  // QC: pass / fail. A failure raises an NCR automatically.
  const qc = z.object({ status: z.enum(['Passed', 'Failed']), remark: z.string().default(''), severity: z.enum(['Minor', 'Major', 'Critical']).default('Major') });
  app.post('/api/measurements/:id/qc', { preHandler: requireRole('qa_hse', 'project') }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(qc, req.body);
    if (b.status === 'Failed' && !b.remark.trim()) throw badRequest('Describe why the inspection failed');
    return act(req, async ({ db, by, log }) => {
      const m = await mutate('measurements', id, db, (m: Doc) => {
        if (m.billedIn) throw conflict(`Already billed in ${m.billedIn}`);
        m.qc = { status: b.status, by, at: nowISO(), remark: b.remark };
      });
      let ncr: Doc | null = null;
      if (b.status === 'Failed') {
        ncr = await insert('ncrs', { woId: m.woId, mbId: id, category: 'Quality', severity: b.severity, desc: b.remark, raisedBy: by, raisedOn: today(), status: 'Open', history: [{ at: nowISO(), by, what: 'Raised from failed inspection', note: '' }] }, db);
        await log('ncrs', ncr.id, `Raised from ${id}`);
      }
      await log('measurements', id, `QC ${b.status.toLowerCase()}`, b);
      return { measurement: m, ncr };
    });
  });

  // ── NCRs ─────────────────────────────────────────────────────────────────
  const ncr = z.object({ woId: z.string(), mbId: z.string().optional(), category: z.enum(['Quality', 'Safety', 'Environment', 'Documentation']), severity: z.enum(['Minor', 'Major', 'Critical']), desc: z.string().min(5) });
  app.post('/api/ncrs', { preHandler: requireRole('qa_hse', 'project') }, async (req) => {
    const b = parse(ncr, req.body);
    return act(req, async ({ db, by, log }) => {
      await get('workOrders', b.woId, db);
      const n = await insert('ncrs', { ...b, mbId: b.mbId ?? null, raisedBy: by, raisedOn: today(), status: 'Open', history: [{ at: nowISO(), by, what: 'Raised', note: '' }] }, db);
      await log('ncrs', n.id, 'Raised');
      return n;
    });
  });

  const NCR_FLOW: Record<string, string[]> = { Open: ['Rework Done', 'Closed'], 'Rework Done': ['Closed', 'Open'], Closed: [] };
  const ncrMove = z.object({ status: z.enum(['Rework Done', 'Closed', 'Open']), note: z.string().default(''), rootCause: z.string().optional(), correctiveAction: z.string().optional() });
  app.post('/api/ncrs/:id/status', { preHandler: authenticate }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(ncrMove, req.body);
    return act(req, async ({ db, user, by, log }) => {
      const n = await get('ncrs', id, db, true);
      const w = await get('workOrders', n.woId, db);
      if (!NCR_FLOW[n.status]?.includes(b.status)) throw conflict(`Cannot move NCR from ${n.status} to ${b.status}`);
      if (user.role === 'vendor') { if (user.vendorId !== w.vendorId || b.status !== 'Rework Done') throw forbidden(); }
      else if (!['admin', 'qa_hse', 'project'].includes(user.role)) throw forbidden();
      if (b.status === 'Closed' && user.role !== 'admin' && user.role !== 'qa_hse') throw forbidden('QA/HSE closes NCRs after re-inspection');
      if (b.status === 'Closed' && !(b.correctiveAction ?? n.correctiveAction)) throw badRequest('Record the corrective action before closing');
      n.status = b.status; if (b.rootCause) n.rootCause = b.rootCause; if (b.correctiveAction) n.correctiveAction = b.correctiveAction;
      n.history.push({ at: nowISO(), by, what: b.status, note: b.note });
      await save('ncrs', n, db);
      await log('ncrs', id, `→ ${b.status}`, b);
      return n;
    });
  });

  // ── Safety incidents (stage 14 — new) ────────────────────────────────────
  const si = z.object({
    vendorId: z.string().optional(), woId: z.string().optional(), contractId: z.string().optional(),
    type: z.enum(['Near Miss', 'Unsafe Act', 'Unsafe Condition', 'First Aid', 'Medical Treatment', 'Lost Time Injury', 'Fatality', 'Property Damage', 'Environmental']),
    severity: z.enum(['Minor', 'Major', 'Critical']), date: isoDate, location: z.string().min(2), description: z.string().min(5),
    injured: z.coerce.number().int().min(0).default(0), immediateAction: z.string().min(2),
  });
  app.post('/api/safety-incidents', { preHandler: requireRole('qa_hse', 'project') }, async (req) => {
    const b = parse(si, req.body);
    if (b.date > today()) throw badRequest('Incident date cannot be in the future');
    return act(req, async ({ db, by, log }) => {
      let vendorId = b.vendorId ?? null;
      if (b.woId) { const w = await get('workOrders', b.woId, db); vendorId = w.vendorId; b.contractId ??= w.contractId; }
      const lti = ['Lost Time Injury', 'Fatality'].includes(b.type);
      const r = await insert('safetyIncidents', { ...b, vendorId, lostTimeInjury: lti, rootCause: '', capId: null, reportedBy: by, status: lti || b.severity === 'Critical' ? 'Investigating' : 'Action Pending', history: [{ at: nowISO(), by, what: 'Reported', note: '' }] }, db);
      await log('safetyIncidents', r.id, `${b.type} reported`);
      return r;
    });
  });

  const siMove = z.object({ status: z.enum(['Investigating', 'Action Pending', 'Closed']), rootCause: z.string().optional(), capId: z.string().optional(), note: z.string().default('') });
  app.post('/api/safety-incidents/:id/status', { preHandler: requireRole('qa_hse') }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(siMove, req.body);
    return act(req, async ({ db, by, log }) => {
      const r = await mutate('safetyIncidents', id, db, (r: Doc) => {
        if (r.status === 'Closed') throw conflict('Incident is closed');
        if (b.status === 'Closed' && !(b.rootCause ?? r.rootCause)) throw badRequest('Record the root cause before closing');
        r.status = b.status; if (b.rootCause) r.rootCause = b.rootCause; if (b.capId) r.capId = b.capId;
        r.history = [...(r.history ?? []), { at: nowISO(), by, what: b.status, note: b.note }];
      });
      await log('safetyIncidents', id, `→ ${b.status}`);
      return r;
    });
  });

  // ── DPRs, material issues, punch list, final inspection ──────────────────
  const dpr = z.object({ woId: z.string(), date: isoDate, manpower: z.coerce.number().int().min(0), work: z.string().min(3), hindrance: z.string().default(''), weather: z.string().default('Clear') });
  app.post('/api/dprs', { preHandler: requireRole('project') }, async (req) => {
    const b = parse(dpr, req.body);
    return act(req, async ({ db, by, log }) => {
      const dup = (await list('dprs', { db, where: { wo_id: b.woId } })).find((d) => d.date === b.date);
      if (dup) throw conflict(`A progress report for ${b.date} already exists (${dup.id})`);
      const r = await insert('dprs', { ...b, by }, db);
      await log('dprs', r.id, 'Daily progress recorded');
      return r;
    });
  });

  const mi = z.object({ woId: z.string(), material: z.string().min(2), unit: z.string().min(1), qty, rate: money, date: isoDate });
  app.post('/api/material-issues', { preHandler: requireRole('project') }, async (req) => {
    const b = parse(mi, req.body);
    return act(req, async ({ db, by, log }) => {
      const r = await insert('materialIssues', { ...b, issuedBy: by, recoveredIn: null }, db);
      await log('materialIssues', r.id, 'Free-issue material issued');
      return r;
    });
  });

  const punch = z.object({ contractId: z.string(), woId: z.string().optional(), desc: z.string().min(3), location: z.string().min(2), severity: z.enum(['Minor', 'Major', 'Critical']), due: isoDate });
  app.post('/api/punch-items', { preHandler: requireRole('project', 'qa_hse') }, async (req) => {
    const b = parse(punch, req.body);
    return act(req, async ({ db, by, log }) => {
      const r = await insert('punchItems', { ...b, woId: b.woId ?? null, status: 'Open', raisedBy: by, raisedOn: today(), history: [{ at: nowISO(), by, what: 'Raised' }] }, db);
      await log('punchItems', r.id, 'Raised');
      return r;
    });
  });

  const PUNCH_FLOW: Record<string, string[]> = { Open: ['Rectified'], Rectified: ['Closed', 'Open'], Closed: [] };
  app.post('/api/punch-items/:id/status', { preHandler: authenticate }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(z.object({ status: z.enum(['Rectified', 'Closed', 'Open']), note: z.string().default('') }), req.body);
    return act(req, async ({ db, user, by, log }) => {
      const p = await get('punchItems', id, db, true);
      const c = await get('contracts', p.contractId, db);
      if (!PUNCH_FLOW[p.status]?.includes(b.status)) throw conflict(`Cannot move from ${p.status} to ${b.status}`);
      if (user.role === 'vendor') { if (user.vendorId !== c.vendorId || b.status !== 'Rectified') throw forbidden(); }
      else if (!['admin', 'project', 'qa_hse'].includes(user.role)) throw forbidden();
      p.status = b.status; p.history.push({ at: nowISO(), by, what: b.status, note: b.note });
      await save('punchItems', p, db);
      await log('punchItems', id, `→ ${b.status}`);
      return p;
    });
  });

  const insp = z.object({ contractId: z.string(), date: isoDate, result: z.enum(['Passed', 'Failed']), note: z.string().default('') });
  app.post('/api/inspections', { preHandler: requireRole('project', 'qa_hse') }, async (req) => {
    const b = parse(insp, req.body);
    return act(req, async ({ db, by, log }) => {
      if (b.result === 'Passed') {
        const open = (await list('punchItems', { db, where: { contract_id: b.contractId } })).filter((p) => p.status !== 'Closed' && p.severity !== 'Minor');
        if (open.length) throw conflict(`Final inspection cannot pass with open major punch items: ${open.map((p) => p.id).join(', ')}`);
      }
      const r = await insert('inspections', { ...b, by }, db);
      await log('inspections', r.id, `Final inspection ${b.result.toLowerCase()}`);
      return r;
    });
  });
}
