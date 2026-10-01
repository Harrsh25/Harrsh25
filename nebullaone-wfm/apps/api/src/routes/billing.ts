import { computeRaBill, dlpEndDate, fsLedger, tdsRate } from '@nebulla/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requireRole } from '../auth';
import { all, pool } from '../db';
import type { Role } from '../entities';
import { badRequest, conflict, forbidden, get, insert, list, mutate, save } from '../repo';
import { settingsOf, today } from '../services/rules';
import { act, isoDate, money, nowISO, params, parse, pushHistory } from './helpers';

type Doc = Record<string, any>;

/** RA bill workflow: who may move a bill from one status to the next. */
const FLOW: Record<string, { to: string; roles: Role[] }[]> = {
  Submitted: [{ to: 'Verified', roles: ['project', 'qa_hse'] }, { to: 'Returned', roles: ['project', 'qa_hse'] }, { to: 'Rejected', roles: ['project'] }],
  Verified: [{ to: 'Certified', roles: ['project', 'procurement'] }, { to: 'Returned', roles: ['project', 'procurement'] }],
  Certified: [{ to: 'Approved', roles: ['project', 'finance'] }, { to: 'Returned', roles: ['project', 'finance'] }],
  Returned: [{ to: 'Submitted', roles: ['project'] }],
};

async function prepare(db: any, b: { woId: string; mbIds: string[]; materials?: number; penalty?: number; other?: number }, excludeBillId?: string) {
  const settings = await settingsOf(db);
  const w = await get('workOrders', b.woId, db);
  const c = await get('contracts', w.contractId, db);
  const v = await get('vendors', w.vendorId, db);
  const ms: Doc[] = [];
  for (const id of b.mbIds) ms.push(await get('measurements', id, db));
  for (const m of ms) {
    if (m.woId !== w.id) throw badRequest(`${m.id} belongs to another work order`);
    if (m.billedIn && m.billedIn !== excludeBillId) throw conflict(`${m.id} is already billed in ${m.billedIn}`);
    if (m.jms?.status !== 'Signed') throw conflict(`${m.id}: joint measurement is ${m.jms?.status ?? 'not signed'}`);
    if (settings.qcBeforeBilling && !['Passed', 'Not required'].includes(m.qc?.status)) throw conflict(`${m.id}: quality inspection has not passed (Procurement Settings → QC before RA billing)`);
  }
  const allBills = await list('raBills', { db, where: { contract_id: c.id } });
  const prev = allBills.filter((x) => x.woId === w.id && x.status !== 'Rejected' && x.id !== excludeBillId);
  const advRecovered = allBills.filter((x) => x.status !== 'Rejected' && x.id !== excludeBillId).reduce((s, x) => s + (x.ded?.advance ?? 0), 0);
  const mats = await list('materialIssues', { db, where: { wo_id: w.id } });
  const unrecovered = mats.filter((m) => !m.recoveredIn || m.recoveredIn === excludeBillId);
  const materials = b.materials ?? unrecovered.reduce((s, m) => s + m.qty * m.rate, 0);
  const r = computeRaBill({ contract: c as any, workOrder: w as any, measurements: ms as any, previousBills: prev as any, advanceRecoveredSoFar: advRecovered, tdsPct: tdsRate(v.tds), materials, penalty: b.penalty, other: b.other });
  return { r, w, c, v, prev, unrecovered };
}

export async function billingRoutes(app: FastifyInstance) {
  // Preview (no save) — used by the "Prepare RA bill" screen
  const prep = z.object({ woId: z.string(), mbIds: z.array(z.string()).min(1), materials: money.optional(), penalty: money.default(0), other: money.default(0), otherNote: z.string().default('') });
  app.post('/api/ra-bills/preview', { preHandler: requireRole('project') }, async (req) => {
    const b = parse(prep, req.body);
    const { r } = await prepare(pool, b);
    return r;
  });

  app.post('/api/ra-bills', { preHandler: requireRole('project') }, async (req) => {
    const b = parse(prep, req.body);
    if (b.other > 0 && !b.otherNote.trim()) throw badRequest('Explain the other deduction');
    return act(req, async ({ db, by, log }) => {
      const { r, w, c, prev, unrecovered } = await prepare(db, b);
      if (r.gross <= 0) throw conflict('Nothing to bill — the selected measurements add no new quantity');
      if (r.warnings.some((x) => x.includes('exceeds WO quantity'))) throw conflict('Quantities exceed the work order', { blocking: r.warnings });
      const ms: Doc[] = [];
      for (const id of b.mbIds) ms.push(await get('measurements', id, db));
      const dates = ms.map((m) => m.date).sort();
      const bill = await insert('raBills', {
        woId: w.id, contractId: c.id, vendorId: w.vendorId, seq: prev.length + 1, date: today(), periodFrom: dates[0], periodTo: dates[dates.length - 1],
        mbIds: b.mbIds, manual: {}, lines: r.lines, gross: r.gross, gst: r.gst, ded: r.ded, totalDed: r.totalDed, net: r.net, otherNote: b.otherNote,
        status: 'Submitted', history: [{ status: 'Submitted', by, at: nowISO(), remark: '' }], invoiceId: null, preparedBy: by,
      }, db);
      for (const m of ms) await save('measurements', { ...m, billedIn: bill.id }, db);
      if (b.materials === undefined) for (const mi of unrecovered) await save('materialIssues', { ...mi, recoveredIn: bill.id }, db);
      await log('raBills', bill.id, `RA-${bill.seq} prepared — net ₹${r.net}`);
      return bill;
    });
  });

  const move = z.object({ to: z.enum(['Verified', 'Certified', 'Approved', 'Returned', 'Rejected', 'Submitted']), remark: z.string().default('') });
  app.post('/api/ra-bills/:id/transition', { preHandler: authenticate }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(move, req.body);
    if (['Returned', 'Rejected'].includes(b.to) && !b.remark.trim()) throw badRequest('Give a reason');
    return act(req, async ({ db, user, by, log }) => {
      const bill = await get('raBills', id, db, true);
      const step = (FLOW[bill.status] ?? []).find((s) => s.to === b.to);
      if (!step) throw conflict(`An RA bill that is ${bill.status} cannot be moved to ${b.to}`);
      if (user.role !== 'admin' && !step.roles.includes(user.role)) throw forbidden(`${b.to} is done by ${step.roles.join(' / ')}`);
      assertSegregation(bill, by, b.to);
      bill.status = b.to;
      pushHistory(bill, b.to, by, b.remark);
      if (b.to === 'Rejected') {
        for (const mbId of bill.mbIds) { const m = await get('measurements', mbId, db); if (m.billedIn === id) await save('measurements', { ...m, billedIn: null }, db); }
        for (const mi of await list('materialIssues', { db, where: { wo_id: bill.woId } })) if (mi.recoveredIn === id) await save('materialIssues', { ...mi, recoveredIn: null }, db);
      }
      if (b.to === 'Approved') {
        const c = await get('contracts', bill.contractId, db);
        const v = await get('vendors', bill.vendorId, db);
        const terms = Number(/Net (\d+)/.exec(v.paymentTerms ?? '')?.[1] ?? 30);
        const inv = await insert('invoices', {
          vendorId: bill.vendorId, source: 'RA Bill', raBillId: id, number: `${id}/${bill.woId}`, date: today(),
          due: new Date(Date.now() + terms * 86_400_000).toISOString().slice(0, 10), lines: [], amount: bill.net, gstPct: 0, notes: [], payments: [], schedule: null,
          contractId: c.id, enteredBy: by,
        }, db);
        bill.invoiceId = inv.id;
        await log('invoices', inv.id, `Created from ${id}`);
      }
      await save('raBills', bill, db);
      await log('raBills', id, `→ ${b.to}`, { remark: b.remark });
      return bill;
    });
  });

  // ── Contractor claims (portal) ───────────────────────────────────────────
  const claim = z.object({ woId: z.string(), periodFrom: isoDate, periodTo: isoDate, note: z.string().default(''), lines: z.array(z.object({ lineId: z.string(), qty: z.coerce.number().positive().optional(), pct: z.coerce.number().min(0).max(100).optional(), location: z.string().min(2) })).min(1) });
  app.post('/api/claims', { preHandler: authenticate }, async (req) => {
    const b = parse(claim, req.body);
    return act(req, async ({ db, user, by, log }) => {
      const w = await get('workOrders', b.woId, db);
      if (user.role === 'vendor' ? user.vendorId !== w.vendorId : !['admin', 'project'].includes(user.role)) throw forbidden();
      const lineIds = new Set((w.type === 'Lump Sum' ? w.milestones : w.items).map((x: Doc) => x.id));
      for (const l of b.lines) if (!lineIds.has(l.lineId)) throw badRequest(`Unknown work-order line ${l.lineId}`);
      const r = await insert('claims', { ...b, vendorId: w.vendorId, date: today(), status: 'Submitted', history: [{ status: 'Submitted', by, at: nowISO(), remark: '' }] }, db);
      await log('claims', r.id, 'Submitted');
      return r;
    });
  });

  const claimDecision = z.object({ decision: z.enum(['Approved', 'Rejected']), remark: z.string().default('') });
  app.post('/api/claims/:id/decision', { preHandler: requireRole('project') }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(claimDecision, req.body);
    if (b.decision === 'Rejected' && !b.remark.trim()) throw badRequest('Give a reason for rejecting the claim');
    return act(req, async ({ db, by, log }) => {
      const c = await get('claims', id, db, true);
      if (c.status !== 'Submitted') throw conflict(`Claim is ${c.status}`);
      const created: string[] = [];
      if (b.decision === 'Approved') {
        for (const l of c.lines) {
          const m = await insert('measurements', {
            woId: c.woId, lineId: l.lineId, date: c.periodTo, location: l.location, nos: null, l: null, b: null, d: null, qty: l.qty ?? null, pct: l.pct ?? null,
            recordedBy: by, jms: { status: 'Pending' }, remarks: `From contractor claim ${id}`, billedIn: null, qc: { status: 'Pending' }, source: id,
          }, db);
          created.push(m.id);
        }
      }
      c.status = b.decision; c.measurementIds = created;
      pushHistory(c, b.decision, by, b.remark);
      await save('claims', c, db);
      await log('claims', id, `${b.decision}${created.length ? ` → ${created.join(', ')}` : ''}`);
      return c;
    });
  });

  // ── Retention / security-deposit release (FS ledger) ─────────────────────
  const rr = z.object({ contractId: z.string(), kind: z.enum(['Retention', 'Security Deposit']).default('Retention'), type: z.enum(['On completion', 'After DLP', 'Against BG']), amount: z.coerce.number().positive(), note: z.string().default('') });
  app.post('/api/retention-releases', { preHandler: requireRole('project') }, async (req) => {
    const b = parse(rr, req.body);
    return act(req, async ({ db, by, log }) => {
      const c = await get('contracts', b.contractId, db);
      const [bills, releases] = await all(db, [() => list('raBills', { db, where: { contract_id: c.id } }), () => list('retentionReleases', { db, where: { contract_id: c.id } })] as const);
      const fs = fsLedger(c as any, bills as any, releases as any);
      const pending = releases.filter((r) => r.status === 'Pending Approval' && (r.kind ?? 'Retention') === b.kind).reduce((s, r) => s + r.amount, 0);
      const bal = b.kind === 'Retention' ? fs.retentionBalance : fs.sdBalance;
      if (b.amount + pending > bal + 0.5) throw conflict(`Only ₹${Math.round(bal - pending).toLocaleString('en-IN')} of ${b.kind.toLowerCase()} is available to release`);
      if (b.type === 'After DLP' && dlpEndDate(c as any) >= today()) throw conflict(`DLP runs until ${dlpEndDate(c as any)} — release after it ends, or against a bank guarantee`);
      if (b.type === 'On completion' && !c.handover) throw conflict('Release on completion needs the contract to be handed over');
      if (b.type === 'Against BG' && !(c.guarantees ?? []).some((g: Doc) => g.type === 'Retention' && g.status === 'Active' && g.amount >= b.amount)) throw conflict('Record a retention bank guarantee covering this amount first');
      const r = await insert('retentionReleases', { ...b, status: 'Pending Approval', requestedOn: today(), requestedBy: by }, db);
      await log('retentionReleases', r.id, `${b.kind} release requested ₹${b.amount}`);
      return r;
    });
  });

  app.post('/api/retention-releases/:id/decision', { preHandler: requireRole('finance') }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(z.object({ decision: z.enum(['Approved', 'Rejected']), remark: z.string().default('') }), req.body);
    return act(req, async ({ db, by, log }) => {
      const r = await mutate('retentionReleases', id, db, (r: Doc) => {
        if (r.status !== 'Pending Approval') throw conflict(`Release is ${r.status}`);
        if (r.requestedBy === by) throw forbidden('The requester cannot approve the release');
        r.status = b.decision; r.decidedBy = by; r.decidedAt = nowISO(); r.remark = b.remark;
      });
      if (b.decision === 'Approved') {
        const c = await get('contracts', r.contractId, db);
        const inv = await insert('invoices', { vendorId: c.vendorId, source: 'Retention Release', releaseId: id, contractId: c.id, number: `${id}/${c.id}`, date: today(), due: today(), lines: [], amount: r.amount, gstPct: 0, notes: [], payments: [], schedule: null, enteredBy: by }, db);
        await mutate('retentionReleases', id, db, (x: Doc) => { x.invoiceId = inv.id; });
        await log('invoices', inv.id, `Payable created for ${id}`);
      }
      await log('retentionReleases', id, b.decision, b);
      return r;
    });
  });
}

/** No one may move a bill twice in a row, and the preparer can never verify, certify or approve it. */
function assertSegregation(bill: Doc, by: string, to: string) {
  if (!['Verified', 'Certified', 'Approved'].includes(to)) return;
  const actors = (bill.history ?? []).map((h: Doc) => h.by);
  if (bill.preparedBy === by || actors.includes(by)) throw forbidden(`You already acted on this bill — ${to.toLowerCase()} must be done by someone else`);
}
