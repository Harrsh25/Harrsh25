import {
  bgCoverageIssues, contractPhase, dlpEndDate, fsLedger, invoiceTotals, liquidatedDamages, revisedEnd, revisedValue, round2,
  type Hold,
} from '@nebulla/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { canActOnStage, requireInternal, requireRole } from '../auth';
import { all, pool, type Db } from '../db';
import { badRequest, conflict, forbidden, get, insert, list, mutate, nextId, save } from '../repo';
import { checkGate, settingsOf, today } from '../services/rules';
import { act, isoDate, money, nowISO, params, parse } from './helpers';

type Doc = Record<string, any>;

const pct = z.coerce.number().min(0).max(100);

const contractBody = z.object({
  vendorId: z.string(), project: z.string().min(1), title: z.string().min(3), type: z.enum(['Item-Rate', 'Lump Sum', 'Rate Contract']),
  value: z.coerce.number().positive(), start: isoDate, end: isoDate,
  retentionPct: pct.default(5), advancePct: pct.default(0), advanceRecoveryPct: pct.default(0), securityDepositPct: pct.default(0),
  cessPct: pct.default(1), gstPct: z.coerce.number().min(0).max(28).default(18), dlpMonths: z.coerce.number().int().min(0).max(60).default(12),
  ldPctPerWeek: pct.default(0.5), ldCapPct: pct.default(5), pbgPct: pct.default(5), owner: z.string().optional(),
}).superRefine((c, ctx) => {
  if (c.end <= c.start) ctx.addIssue({ code: 'custom', path: ['end'], message: 'End must be after start' });
  if (c.ldCapPct < c.ldPctPerWeek) ctx.addIssue({ code: 'custom', path: ['ldCapPct'], message: "LD cap can't be lower than the weekly LD" });
  if (c.advancePct > 0 && c.advanceRecoveryPct <= 0) ctx.addIssue({ code: 'custom', path: ['advanceRecoveryPct'], message: 'Set an advance recovery % when an advance is given' });
});

export const KICKOFF_ITEMS = [
  'Scope & BOQ confirmed', 'Drawings & documents handed over', 'Site handed over', 'Schedule & milestones agreed',
  'Labour & material rates confirmed', 'Payment terms, retention & guarantees confirmed', 'Roles, contacts & communication matrix',
];

export async function contractRoutes(app: FastifyInstance) {
  app.post('/api/contracts', { preHandler: requireRole('project') }, async (req) => {
    const b = parse(contractBody, req.body);
    return act(req, async ({ db, by, log }) => {
      const v = await get('vendors', b.vendorId, db);
      if (!v.isContractor) throw conflict(`${v.name} is not registered as a contractor`);
      const c = await insert('contracts', {
        ...b, advanceAmount: round2((b.value * b.advancePct) / 100), status: 'Draft', owner: b.owner ?? by, changeOrders: [], guarantees: [],
        approval: { stages: [] }, createdBy: by, createdAt: nowISO(),
      }, db);
      await log('contracts', c.id, 'Created (draft)');
      return c;
    });
  });

  app.patch('/api/contracts/:id', { preHandler: requireRole('project') }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(contractBody.innerType().partial(), req.body);
    return act(req, async ({ db, log }) => {
      const c = await mutate('contracts', id, db, (c: Doc) => {
        if (c.status !== 'Draft') throw conflict('Only draft contracts can be edited — use a change order');
        Object.assign(c, b);
        c.advanceAmount = round2((c.value * c.advancePct) / 100);
      });
      await log('contracts', id, 'Draft updated', { fields: Object.keys(b) });
      return c;
    });
  });

  app.post('/api/contracts/:id/submit', { preHandler: requireRole('project') }, async (req) => {
    const { id } = parse(params, req.params);
    return act(req, async ({ db, by, log }) => {
      const settings = await settingsOf(db);
      const c = await mutate('contracts', id, db, (c: Doc) => {
        if (!['Draft', 'Returned'].includes(c.status)) throw conflict(`Contract is ${c.status}`);
        const stages = (settings.contractFlow ?? []).filter((s: Doc) => c.value >= (s.minValue ?? 0));
        c.approval = { stages: stages.map((s: Doc) => ({ role: s.name, status: 'Pending', by: null, at: null, remark: '' })) };
        c.status = 'Pending Approval'; c.submittedBy = by; c.submittedAt = nowISO();
      });
      await log('contracts', id, 'Submitted for approval');
      return c;
    });
  });

  const decision = z.object({ decision: z.enum(['Approve', 'Reject', 'Return']), remark: z.string().default(''), overrideReason: z.string().optional() });
  app.post('/api/contracts/:id/approval', { preHandler: requireInternal }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(decision, req.body);
    if (b.decision !== 'Approve' && !b.remark.trim()) throw badRequest('Give a reason when rejecting or returning');
    return act(req, async ({ db, user, by, log }) => {
      const settings = await settingsOf(db);
      const c = await get('contracts', id, db, true);
      if (c.status !== 'Pending Approval') throw conflict('Contract is not awaiting approval');
      const stage = c.approval.stages.find((s: Doc) => s.status === 'Pending');
      if (!stage) throw conflict('No pending stage');
      if (!canActOnStage(user, stage.role)) throw forbidden(`Waiting for ${stage.role}`);
      if (c.submittedBy === by) throw forbidden('The person who submitted the contract cannot approve it');
      const isLast = c.approval.stages.filter((s: Doc) => s.status === 'Pending').length === 1;
      if (b.decision === 'Approve' && isLast) {
        // Final stage checks the contractor gates.
        await checkGate(db, user, { action: 'po', vendorId: c.vendorId, overrideReason: b.overrideReason });
        const v = await get('vendors', c.vendorId, db);
        if (v.qualification?.decision === 'Rejected') throw conflict('Contractor failed qualification');
      }
      stage.status = b.decision === 'Approve' ? 'Approved' : b.decision === 'Reject' ? 'Rejected' : 'Returned';
      stage.by = by; stage.at = nowISO(); stage.remark = b.remark;
      if (b.decision === 'Reject') c.status = 'Rejected';
      else if (b.decision === 'Return') c.status = 'Returned';
      else if (c.approval.stages.every((s: Doc) => s.status === 'Approved')) c.status = 'Approved';
      await save('contracts', c, db);
      await log('contracts', id, `Approval: ${b.decision} (${stage.role})`, { remark: b.remark });
      return c;
    });
  });

  // Sign → Active. Needs the PBG when the contract requires one, valid to DLP end (B4).
  const sign = z.object({ signedOn: isoDate, signedBy: z.string().min(2) });
  app.post('/api/contracts/:id/sign', { preHandler: requireRole('project', 'legal') }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(sign, req.body);
    return act(req, async ({ db, log }) => {
      const c = await mutate('contracts', id, db, (c: Doc) => {
        if (c.status !== 'Approved') throw conflict('Contract must be approved before signing');
        const issues = bgCoverageIssues({ ...c, status: 'Active' } as any);
        if (issues.length) throw conflict('Guarantee requirements are not met', { blocking: issues.map((i) => i.message) });
        c.status = 'Active'; c.signedOn = b.signedOn; c.signedBy = b.signedBy;
      });
      await log('contracts', id, 'Signed — contract active');
      return c;
    });
  });

  const bg = z.object({ type: z.enum(['Performance', 'Advance', 'Retention']), bank: z.string().min(2), number: z.string().min(3), amount: z.coerce.number().positive(), expiry: isoDate, receivedOn: isoDate });
  app.post('/api/contracts/:id/guarantees', { preHandler: requireRole('finance', 'legal', 'project') }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(bg, req.body);
    return act(req, async ({ db, log }) => {
      const gid = await nextId(db, 'BG');
      const c = await mutate('contracts', id, db, (c: Doc) => {
        if (b.type === 'Performance' && c.pbgPct && b.amount < (revisedValue(c as any) * c.pbgPct) / 100 - 1) throw conflict(`PBG must be at least ${c.pbgPct}% of contract value`);
        c.guarantees = [...(c.guarantees ?? []), { id: gid, ...b, status: 'Active', history: [] }];
        if (b.type === 'Performance') { c.bgNo = b.number; c.bgExpiry = b.expiry; }
      });
      await log('contracts', id, `Bank guarantee ${b.number} recorded`);
      return { contract: c, coverage: bgCoverageIssues(c as any) };
    });
  });

  const extend = z.object({ guaranteeId: z.string(), expiry: isoDate, amendmentRef: z.string().min(2) });
  app.post('/api/contracts/:id/guarantees/extend', { preHandler: requireRole('finance', 'legal', 'project') }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(extend, req.body);
    return act(req, async ({ db, by, log }) => {
      const c = await mutate('contracts', id, db, (c: Doc) => {
        const g = (c.guarantees ?? []).find((x: Doc) => x.id === b.guaranteeId);
        if (!g) throw conflict('Guarantee not found');
        if (b.expiry <= g.expiry) throw badRequest('New expiry must be later than the current one');
        g.history = [...(g.history ?? []), { at: nowISO(), by, from: g.expiry, to: b.expiry, ref: b.amendmentRef }];
        g.expiry = b.expiry; g.status = 'Active';
        if (g.type === 'Performance') c.bgExpiry = b.expiry;
      });
      await log('contracts', id, `Guarantee ${b.guaranteeId} extended to ${b.expiry}`);
      return { contract: c, coverage: bgCoverageIssues(c as any) };
    });
  });

  // ── Change / variation (stage 17) ────────────────────────────────────────
  const co = z.object({
    type: z.enum(['Scope Change', 'Quantity Change', 'Rate Change', 'Additional Work', 'Deleted Work', 'Time Extension']),
    desc: z.string().min(3), amount: z.coerce.number(), days: z.coerce.number().int().min(0).default(0), reason: z.string().min(3),
    technicalJustification: z.string().default(''), commercialJustification: z.string().default(''), attachments: z.array(z.string()).default([]),
  }).refine((x) => x.type === 'Time Extension' ? x.days > 0 : true, { message: 'Time extension needs days', path: ['days'] })
    .refine((x) => x.type === 'Deleted Work' ? x.amount <= 0 : true, { message: 'Deleted work reduces value (amount ≤ 0)', path: ['amount'] });
  app.post('/api/contracts/:id/change-orders', { preHandler: requireRole('project') }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(co, req.body);
    return act(req, async ({ db, by, log }) => {
      const coId = await nextId(db, 'CO');
      const c = await mutate('contracts', id, db, (c: Doc) => {
        if (!['Active', 'In DLP'].includes(c.status)) throw conflict(`Change orders need an active contract (this one is ${c.status})`);
        c.changeOrders = [...(c.changeOrders ?? []), { id: coId, ...b, status: 'Pending', raisedOn: today(), raisedBy: by, history: [{ status: 'Pending', by, at: nowISO(), remark: '' }] }];
      });
      await log('contracts', id, `Change order ${coId} raised`, b);
      return c;
    });
  });

  const coDecision = z.object({ decision: z.enum(['Approved', 'Rejected']), remark: z.string().default('') });
  app.post('/api/contracts/:id/change-orders/:coId/decision', { preHandler: requireRole('project', 'finance') }, async (req) => {
    const { id, coId } = parse(z.object({ id: z.string(), coId: z.string() }), req.params);
    const b = parse(coDecision, req.body);
    if (b.decision === 'Rejected' && !b.remark.trim()) throw badRequest('Give a reason for rejecting');
    return act(req, async ({ db, by, log }) => {
      const c = await mutate('contracts', id, db, (c: Doc) => {
        const x = (c.changeOrders ?? []).find((o: Doc) => o.id === coId);
        if (!x) throw conflict('Change order not found');
        if (x.status !== 'Pending') throw conflict(`Change order is ${x.status}`);
        if (x.raisedBy === by) throw forbidden('The person who raised the change order cannot approve it');
        x.status = b.decision; x.decidedBy = by; x.decidedAt = nowISO(); x.decisionRemark = b.remark;
        x.history = [...(x.history ?? []), { status: b.decision, by, at: nowISO(), remark: b.remark }];
      });
      await log('contracts', id, `Change order ${coId} ${b.decision.toLowerCase()}`, b);
      return { contract: c, revisedValue: revisedValue(c as any), revisedEnd: revisedEnd(c as any), coverage: bgCoverageIssues(c as any) };
    });
  });

  // ── Kickoff (stage 08 — new) ─────────────────────────────────────────────
  const ko = z.object({ meetingDate: isoDate, attendees: z.array(z.string()).default([]), checklist: z.array(z.object({ item: z.string(), done: z.boolean(), note: z.string().default('') })).optional() });
  app.post('/api/contracts/:id/kickoff', { preHandler: requireRole('project') }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(ko, req.body);
    return act(req, async ({ db, by, log }) => {
      const c = await get('contracts', id, db);
      if (!['Approved', 'Active'].includes(c.status)) throw conflict('Kickoff happens once the contract is approved');
      const existing = (await list('kickoffs', { db, where: { contract_id: id } }))[0];
      const checklist = b.checklist ?? existing?.checklist ?? KICKOFF_ITEMS.map((item) => ({ item, done: false, note: '' }));
      const doc = { contractId: id, meetingDate: b.meetingDate, attendees: b.attendees, chairedBy: by, checklist, status: existing?.status === 'Completed' ? 'Completed' : 'In Progress' };
      const k = existing ? await save('kickoffs', { ...existing, ...doc, id: existing.id }, db) : await insert('kickoffs', doc, db);
      await log('kickoffs', (k as Doc).id, 'Kickoff updated');
      return k;
    });
  });

  app.post('/api/contracts/:id/kickoff/complete', { preHandler: requireRole('project') }, async (req) => {
    const { id } = parse(params, req.params);
    return act(req, async ({ db, by, log }) => {
      const k = (await list('kickoffs', { db, where: { contract_id: id } }))[0];
      if (!k) throw conflict('Record the kickoff meeting first');
      const open = k.checklist.filter((i: Doc) => !i.done);
      if (open.length) throw conflict(`Kickoff items still open: ${open.map((i: Doc) => i.item).join(', ')}`);
      const next = await save('kickoffs', { ...k, status: 'Completed', completedAt: nowISO(), completedBy: by }, db);
      await log('kickoffs', k.id, 'Kickoff completed');
      return next;
    });
  });

  // ── Handover (stage 26) ──────────────────────────────────────────────────
  const handover = z.object({ date: isoDate, takenOverBy: z.string().min(2), inspectionId: z.string(), note: z.string().default('') });
  app.post('/api/contracts/:id/handover', { preHandler: requireRole('project') }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(handover, req.body);
    return act(req, async ({ db, by, log }) => {
      const insp = await get('inspections', b.inspectionId, db);
      if (insp.contractId !== id || insp.result !== 'Passed') throw conflict('Handover needs a passed final inspection for this contract');
      const punch = await list('punchItems', { db, where: { contract_id: id } });
      const open = punch.filter((p) => !['Closed', 'Verified'].includes(p.status) && p.severity !== 'Minor');
      if (open.length) throw conflict(`Close major punch items first: ${open.map((p) => p.id).join(', ')}`);
      const wos = await list('workOrders', { db, where: { contract_id: id } });
      if (wos.some((w) => !['Completed', 'Closed', 'Cancelled'].includes(w.status))) throw conflict('All work orders must be completed before handover');
      const c = await mutate('contracts', id, db, (c: Doc) => {
        c.handover = { ...b, by, recordedAt: nowISO() };
        c.status = contractPhase(c as any, today());
      });
      await log('contracts', id, `Handed over — DLP until ${dlpEndDate(c as any)}`);
      return c;
    });
  });

  // ── Final settlement (stage 25 — new) ────────────────────────────────────
  app.get('/api/contracts/:id/final-settlement', { preHandler: requireInternal }, async (req) => {
    const { id } = parse(params, req.params);
    return computeSettlement(id, pool);
  });

  const settle = z.object({ ldWaived: z.boolean().default(false), ldWaiverReason: z.string().optional(), otherDeduction: money.default(0), remark: z.string().default('') });
  app.post('/api/contracts/:id/final-settlement', { preHandler: requireRole('project', 'finance') }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(settle, req.body);
    if (b.ldWaived && !b.ldWaiverReason?.trim()) throw badRequest('Give a reason for waiving LD');
    return act(req, async ({ db, user, by, log }) => {
      const s = await computeSettlement(id, db);
      if (s.blockers.length) throw conflict('Final settlement is blocked', { blocking: s.blockers });
      const existing = (await list('finalSettlements', { db, where: { contract_id: id } }))[0];
      const ld = b.ldWaived ? 0 : s.ld;
      const finalPayable = round2(s.balanceToPay - ld - b.otherDeduction);
      const doc: Doc = { ...s, ld, ldWaived: b.ldWaived, ldWaiverReason: b.ldWaiverReason ?? '', otherDeduction: b.otherDeduction, finalPayable, remark: b.remark };
      if (!existing) {
        const r = await insert('finalSettlements', { ...doc, status: 'Submitted', preparedBy: by, preparedAt: nowISO(), approvals: [] }, db);
        await log('finalSettlements', r.id, 'Prepared');
        return r;
      }
      if (existing.status === 'Approved') throw conflict('Final settlement is already approved');
      if (existing.preparedBy === by) throw forbidden('The preparer cannot approve the final settlement');
      if (user.role !== 'finance' && user.role !== 'admin') throw forbidden('Finance approves the final settlement');
      const r = await save('finalSettlements', { ...existing, ...doc, status: 'Approved', approvedBy: by, approvedAt: nowISO(), id: existing.id }, db);
      await log('finalSettlements', existing.id, 'Approved');
      return r;
    });
  });

  // ── Contractor release (stage 28 — new) ──────────────────────────────────
  app.get('/api/contracts/:id/release', { preHandler: requireInternal }, async (req) => {
    const { id } = parse(params, req.params);
    return computeRelease(id, pool);
  });

  const manual = z.object({ checks: z.record(z.boolean()) });
  app.post('/api/contracts/:id/release', { preHandler: requireRole('project') }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(manual, req.body);
    return act(req, async ({ db, by, log }) => {
      const existing = (await list('contractorReleases', { db, where: { contract_id: id } }))[0];
      const manualChecks = { ...(existing?.manualChecks ?? {}), ...b.checks };
      const doc = { contractId: id, manualChecks, status: existing?.status ?? 'In Progress', updatedBy: by };
      const r = existing ? await save('contractorReleases', { ...existing, ...doc, id: existing.id }, db) : await insert('contractorReleases', doc, db);
      await log('contractorReleases', (r as Doc).id, 'Checklist updated');
      return computeRelease(id, db);
    });
  });

  app.post('/api/contracts/:id/release/complete', { preHandler: requireRole('project') }, async (req) => {
    const { id } = parse(params, req.params);
    return act(req, async ({ db, by, log }) => {
      const r = await computeRelease(id, db);
      const open = r.checks.filter((c) => !c.ok);
      if (open.length) throw conflict('Release checklist is not complete', { blocking: open.map((c) => `${c.label}${c.detail ? ` — ${c.detail}` : ''}`) });
      const rel = (await list('contractorReleases', { db, where: { contract_id: id } }))[0];
      await save('contractorReleases', { ...rel, status: 'Released', releasedBy: by, releasedAt: nowISO() }, db);
      const c = await mutate('contracts', id, db, (c: Doc) => { c.status = 'Closed'; c.closedOn = today(); });
      await log('contracts', id, 'Contractor released — contract closed');
      return c;
    });
  });
}

export async function computeSettlement(id: string, db: Db) {
  const c = await get('contracts', id, db);
  const [bills, releases, claims, invoices, ncrs, holds] = await all(db, [() => list('raBills', { db, where: { contract_id: id } }), () => list('retentionReleases', { db, where: { contract_id: id } }), () => list('claims', { db, where: { vendor_id: c.vendorId } }), () => list('invoices', { db, where: { vendor_id: c.vendorId } }), () => list('ncrs', { db }), () => list<Hold & Doc>('holds', { db, where: { vendor_id: c.vendorId, status: 'Active' } })] as const);
  const wos = await list('workOrders', { db, where: { contract_id: id } });
  const woIds = new Set(wos.map((w) => w.id));
  const counted = bills.filter((b) => !['Rejected', 'Draft'].includes(b.status));
  const grossBilled = round2(counted.reduce((s, b) => s + b.gross, 0));
  const netCertified = round2(counted.filter((b) => ['Approved', 'Paid'].includes(b.status)).reduce((s, b) => s + b.net, 0));
  const paid = round2(invoices.filter((i) => i.raBillId && counted.some((b) => b.id === i.raBillId)).reduce((s, i) => s + invoiceTotals(i).paid, 0));
  const fs = fsLedger(c as any, bills as any, releases as any);
  const actual = c.handover?.date ?? today();
  const ld = liquidatedDamages(c as any, actual);
  const blockers: string[] = [];
  const pendingBills = counted.filter((b) => !['Approved', 'Paid'].includes(b.status));
  if (pendingBills.length) blockers.push(`RA bills still in certification: ${pendingBills.map((b) => b.id).join(', ')}`);
  const openClaims = claims.filter((x) => woIds.has(x.woId) && !['Approved', 'Rejected', 'Settled', 'Closed'].includes(x.status));
  if (openClaims.length) blockers.push(`Open claims: ${openClaims.map((x) => x.id).join(', ')}`);
  const openNcrs = ncrs.filter((n) => woIds.has(n.woId) && n.status !== 'Closed');
  if (openNcrs.length) blockers.push(`Open NCRs: ${openNcrs.map((n) => n.id).join(', ')}`);
  if (!c.handover) blockers.push('Contract has not been handed over');
  const pendingCos = (c.changeOrders ?? []).filter((x: Doc) => x.status === 'Pending');
  if (pendingCos.length) blockers.push(`Pending change orders: ${pendingCos.map((x: Doc) => x.id).join(', ')}`);
  return {
    contractId: id, originalValue: c.value, approvedVariations: round2(revisedValue(c as any) - c.value), finalContractValue: revisedValue(c as any),
    grossBilled, netCertified, paid, balanceToPay: round2(netCertified - paid),
    advanceOutstanding: fs.advanceBalance, retentionHeld: fs.retentionBalance, securityDepositHeld: fs.sdBalance,
    dlpEnds: fs.dlpEnds, ld, activeHolds: holds.map((h) => h.detail), blockers,
  };
}

export async function computeRelease(id: string, db: Db) {
  const c = await get('contracts', id, db);
  const rel = (await list('contractorReleases', { db, where: { contract_id: id } }))[0];
  const settlement = (await list('finalSettlements', { db, where: { contract_id: id } }))[0];
  const [bills, releases, ncrs, claims, holds, workers] = await all(db, [() => list('raBills', { db, where: { contract_id: id } }), () => list('retentionReleases', { db, where: { contract_id: id } }), () => list('ncrs', { db }), () => list('claims', { db, where: { vendor_id: c.vendorId } }), () => list<Hold & Doc>('holds', { db, where: { vendor_id: c.vendorId, status: 'Active' } }), () => list('workers', { db, where: { vendor_id: c.vendorId } })] as const);
  const wos = await list('workOrders', { db, where: { contract_id: id } });
  const woIds = new Set(wos.map((w) => w.id));
  const fs = fsLedger(c as any, bills as any, releases as any);
  const m = rel?.manualChecks ?? {};
  const openNcr = ncrs.filter((n) => woIds.has(n.woId) && n.status !== 'Closed');
  const openClaims = claims.filter((x) => woIds.has(x.woId) && !['Approved', 'Rejected', 'Settled', 'Closed'].includes(x.status));
  const contractHolds = holds.filter((h) => h.level === 'Vendor' || h.refId === id);
  const activeWorkers = workers.filter((w) => w.active && woIds.has(w.woId));
  const today_ = today();
  const checks = [
    { key: 'site', label: 'Site released', ok: !!m.site, manual: true },
    { key: 'equipment', label: 'Equipment demobilised', ok: !!m.equipment, manual: true },
    { key: 'materials', label: 'Material reconciliation done (free-issue material recovered)', ok: !!m.materials, manual: true },
    { key: 'tools', label: 'Tools / company assets returned', ok: !!m.tools, manual: true },
    { key: 'documents', label: 'As-built drawings & documents received', ok: !!m.documents, manual: true },
    { key: 'labour', label: 'Labour released — gate passes deactivated', ok: activeWorkers.length === 0, detail: activeWorkers.length ? `${activeWorkers.length} workers still active` : '' },
    { key: 'settlement', label: 'Final settlement approved', ok: settlement?.status === 'Approved', detail: settlement ? settlement.status : 'not prepared' },
    { key: 'dlp', label: 'DLP ended', ok: fs.dlpEnds < today_, detail: `DLP ends ${fs.dlpEnds}` },
    { key: 'retention', label: 'Retention fully released', ok: fs.retentionBalance <= 0.5, detail: fs.retentionBalance > 0.5 ? `₹${fs.retentionBalance.toLocaleString('en-IN')} held` : '' },
    { key: 'sd', label: 'Security deposit refunded', ok: fs.sdBalance <= 0.5, detail: fs.sdBalance > 0.5 ? `₹${fs.sdBalance.toLocaleString('en-IN')} held` : '' },
    { key: 'advance', label: 'Advance fully recovered', ok: fs.advanceBalance <= 0.5, detail: fs.advanceBalance > 0.5 ? `₹${fs.advanceBalance.toLocaleString('en-IN')} outstanding` : '' },
    { key: 'bg', label: 'Guarantees returned to contractor', ok: !!m.bg, manual: true },
    { key: 'ncr', label: 'No open NCRs', ok: openNcr.length === 0, detail: openNcr.map((n) => n.id).join(', ') },
    { key: 'claims', label: 'No open claims', ok: openClaims.length === 0, detail: openClaims.map((x) => x.id).join(', ') },
    { key: 'holds', label: 'No active holds on the contract', ok: contractHolds.length === 0, detail: contractHolds.map((h) => h.id).join(', ') },
    { key: 'access', label: 'Portal & site access revoked', ok: !!m.access, manual: true },
  ];
  return { contractId: id, status: rel?.status ?? 'Not started', checks, fs };
}

