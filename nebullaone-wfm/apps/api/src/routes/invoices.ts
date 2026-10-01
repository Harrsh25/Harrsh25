import { invoiceMatch, invoiceTotals, round2, type Hold } from '@nebulla/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireRole } from '../auth';
import { badRequest, conflict, get, insert, list, mutate, nextId } from '../repo';
import { checkGate, settingsOf, syncComplianceHolds, today } from '../services/rules';
import { act, isoDate, money, nowISO, params, parse } from './helpers';

type Doc = Record<string, any>;

export async function invoiceRoutes(app: FastifyInstance) {
  // Enter a vendor bill against a PO (stage 20A) — 3-way matched
  const bill = z.object({
    vendorId: z.string(), poId: z.string().optional(), number: z.string().min(1), date: isoDate, due: isoDate.optional(),
    gstPct: z.coerce.number().min(0).max(28).default(18),
    lines: z.array(z.object({ line: z.number().int().nonnegative(), qty: z.coerce.number().positive(), rate: money })).default([]),
    amount: money.optional(), description: z.string().optional(), attachment: z.string().optional(),
  });
  app.post('/api/invoices', { preHandler: requireRole('finance', 'procurement') }, async (req) => {
    const b = parse(bill, req.body);
    if (b.date > today()) throw badRequest('Bill date cannot be in the future');
    return act(req, async ({ db, user, by, log }) => {
      const settings = await settingsOf(db);
      const vendor = await get('vendors', b.vendorId, db);
      await checkGate(db, user, { action: 'invoice', vendorId: b.vendorId });
      let po: Doc | null = null;
      if (b.poId) {
        po = await get<Doc>('purchaseOrders', b.poId, db);
        if (po.vendorId !== b.vendorId) throw conflict('PO belongs to another vendor');
        if (!b.lines.length) throw badRequest('Bill lines are required for a PO bill');
      } else if (settings.poRequiredForBill && !vendor.allowBillWithoutPO) {
        throw conflict(`A purchase order is required for bills from ${vendor.name} (Procurement Settings)`);
      } else if (!(b.amount && b.amount > 0)) throw badRequest('Amount is required for a bill without a PO');

      const terms = /Net (\d+)/.exec(vendor.paymentTerms ?? '')?.[1];
      const due = b.due ?? (terms ? new Date(Date.parse(b.date) + Number(terms) * 86_400_000).toISOString().slice(0, 10) : b.date);
      // MSMED Act: MSME vendors must be paid within 45 days.
      const msmeDue = vendor.msmeType && vendor.msmeType !== 'Not MSME' ? new Date(Date.parse(b.date) + 45 * 86_400_000).toISOString().slice(0, 10) : null;
      const doc: Doc = {
        vendorId: b.vendorId, source: po ? 'Purchase Order' : 'Direct', poId: po?.id ?? null, raBillId: null, number: b.number, date: b.date,
        due: msmeDue && msmeDue < due ? msmeDue : due, gstPct: b.gstPct, notes: [], payments: [], schedule: null, enteredBy: by, enteredAt: nowISO(),
        lines: po ? b.lines : [{ line: 0, qty: 1, rate: b.amount! / (1 + b.gstPct / 100) }], description: b.description ?? '', attachment: b.attachment ?? null,
        review: po || !settings.directBillReview ? undefined : 'Pending',
      };
      if (po) {
        if (po.kind !== 'Service' && settings.receiptRequiredForBill && po.billingPolicy === 'On received quantity' && !vendor.allowBillWithoutReceipt && !(po.receipts ?? []).length)
          throw conflict('Nothing has been received on this PO yet — record the goods receipt first');
        const ses = po.kind === 'Service' ? await list('serviceReceipts', { db, where: { po_id: po.id } }) : [];
        const priorBills = (await list('invoices', { db, where: { vendor_id: b.vendorId } })).filter((i) => i.poId === po!.id && i.review !== 'Rejected');
        // Treat previously billed quantity as consumed receipt quantity for matching.
        const m = invoiceMatch(doc, adjustForPrior(po, priorBills), null, po.kind === 'Service' ? [...ses, priorBilledSes(po, priorBills)] : [], settings);
        const qtyFail = m.rows.some((r) => !r.qtyOk);
        const rateFail = m.rows.some((r) => !r.rateOk);
        const stops: string[] = [];
        const warns: string[] = [];
        if (qtyFail) (settings.threeWayQty === 'Stop' ? stops : settings.threeWayQty === 'Warn' ? warns : []).push('Billed quantity is more than the accepted receipt quantity');
        if (rateFail) (settings.rateCheck === 'Stop' ? stops : settings.rateCheck === 'Warn' ? warns : []).push('Billed rate differs from the PO rate beyond tolerance');
        if (stops.length) throw conflict('Bill does not match the PO and receipts', { blocking: stops, rows: m.rows });
        doc._matchAtEntry = m.status;
        doc.matchWarnings = warns;
      }
      const inv = await insert('invoices', doc, db);
      // A bill that passed with warnings is held for review rather than paid automatically.
      if (doc.matchWarnings?.length)
        await insert('holds', { level: 'Invoice', vendorId: b.vendorId, refId: inv.id, scope: 'Payments', reason: 'Manual', detail: doc.matchWarnings.join('; '), source: '3-way match', raisedBy: by, raisedAt: nowISO(), status: 'Active' }, db);
      await log('invoices', inv.id, `Vendor bill ${b.number} entered`, { warnings: doc.matchWarnings });
      return inv;
    });
  });

  // Record a payment (stage 22) — all holds and the compliance gate apply
  const pay = z.object({
    amount: z.coerce.number().positive(), date: isoDate, mode: z.enum(['NEFT', 'RTGS', 'IMPS', 'Cheque', 'UPI']), ref: z.string().min(3, 'payment reference / UTR is required'),
    tds: money.default(0), overrideReason: z.string().optional(), advanceId: z.string().optional(),
  });
  app.post('/api/invoices/:id/pay', { preHandler: requireRole('finance') }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(pay, req.body);
    if (b.date > today()) throw badRequest('Payment date cannot be in the future');
    return act(req, async ({ db, user, by, log }) => {
      await syncComplianceHolds(db, by);
      const inv = await get('invoices', id, db, true);
      const ra = inv.raBillId ? await get('raBills', inv.raBillId, db) : null;
      const { warnings, overridden } = await checkGate(db, user, { action: 'payment', vendorId: inv.vendorId, refIds: [inv.id, ra?.contractId].filter(Boolean) as string[], overrideReason: b.overrideReason });
      if (inv.review === 'Pending') throw conflict('Bill is awaiting review');
      if (inv.review === 'Rejected') throw conflict('Bill was rejected');
      const t = invoiceTotals(inv);
      if (b.amount + b.tds > t.balance + 0.5) throw conflict(`Payment ${round2(b.amount + b.tds)} exceeds balance ${t.balance}`);
      if (inv.source === 'Purchase Order') {
        const settings = await settingsOf(db);
        const po = await get('purchaseOrders', inv.poId, db);
        const ses = po.kind === 'Service' ? await list('serviceReceipts', { db, where: { po_id: po.id } }) : [];
        const m = invoiceMatch(inv, po, null, ses, settings);
        if (m.status === 'Mismatch' && settings.threeWayQty === 'Stop' && !overridden.length) throw conflict('Bill does not match PO / receipts — resolve the variance or raise a debit note first');
      }
      if (inv.source === 'RA Bill' && ra && !['Approved', 'Paid'].includes(ra.status)) throw conflict(`RA bill ${ra.id} is ${ra.status}, not approved`);
      const payId = await nextId(db, 'PAY');
      const next = await mutate('invoices', id, db, (i: Doc) => {
        i.payments = [...(i.payments ?? []), { id: payId, date: b.date, amount: b.amount, tds: b.tds, mode: b.mode, ref: b.ref, by, overridden: overridden.length ? b.overrideReason : undefined }];
      });
      if (ra && invoiceTotals(next).balance <= 0.5) await mutate('raBills', ra.id, db, (r: Doc) => { r.status = 'Paid'; r.history.push({ status: 'Paid', by, at: nowISO(), remark: b.ref }); });
      await log('invoices', id, `Payment ${payId} ₹${b.amount} (${b.mode} ${b.ref})`, { warnings, overridden });
      return { invoice: next, warnings };
    });
  });

  // Debit / credit note (e.g. rejected quantity already billed)
  const note = z.object({ type: z.enum(['Debit Note', 'Credit Note']), amount: z.coerce.number().positive(), reason: z.string().min(3) });
  app.post('/api/invoices/:id/notes', { preHandler: requireRole('finance', 'procurement') }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(note, req.body);
    return act(req, async ({ db, log }) => {
      const nid = await nextId(db, b.type === 'Debit Note' ? 'DN' : 'CN');
      const inv = await mutate('invoices', id, db, (i: Doc) => {
        const t = invoiceTotals(i);
        if (b.type === 'Debit Note' && b.amount > t.balance + 0.5) throw conflict('Debit note is larger than the unpaid balance');
        i.notes = [...(i.notes ?? []), { id: nid, ...b, date: today() }];
      });
      await log('invoices', id, `${b.type} ${nid} ₹${b.amount}`, b);
      return inv;
    });
  });

  const review = z.object({ decision: z.enum(['Approved', 'Rejected']), remark: z.string().default('') });
  app.post('/api/invoices/:id/review', { preHandler: requireRole('finance') }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(review, req.body);
    return act(req, async ({ db, by, log }) => {
      const inv = await mutate('invoices', id, db, (i: Doc) => {
        if (i.review !== 'Pending') throw conflict('Bill is not awaiting review');
        if (i.enteredBy === by) throw conflict('The person who entered the bill cannot approve it');
        i.review = b.decision === 'Approved' ? 'Approved' : 'Rejected'; i.reviewedBy = by; i.reviewRemark = b.remark;
      });
      await log('invoices', id, `Review: ${b.decision}`, b);
      return inv;
    });
  });

  // Vendor advance (not tied to a contract)
  const adv = z.object({ vendorId: z.string(), amount: z.coerce.number().positive(), date: isoDate, ref: z.string().min(3), note: z.string().default(''), poId: z.string().optional() });
  app.post('/api/vendor-advances', { preHandler: requireRole('finance') }, async (req) => {
    const b = parse(adv, req.body);
    return act(req, async ({ db, user, by, log }) => {
      await checkGate(db, user, { action: 'payment', vendorId: b.vendorId });
      const a = await insert('vendorAdvances', { ...b, allocated: [], recordedBy: by }, db);
      await log('vendorAdvances', a.id, `Advance ₹${b.amount} recorded`);
      return a;
    });
  });

  const alloc = z.object({ invoiceId: z.string(), amount: z.coerce.number().positive() });
  app.post('/api/vendor-advances/:id/allocate', { preHandler: requireRole('finance') }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(alloc, req.body);
    return act(req, async ({ db, by, log }) => {
      const a = await get('vendorAdvances', id, db, true);
      const used = (a.allocated ?? []).reduce((s: number, x: Doc) => s + x.amount, 0);
      if (used + b.amount > a.amount + 0.5) throw conflict('Allocation exceeds the unallocated advance');
      const inv = await get('invoices', b.invoiceId, db, true);
      if (inv.vendorId !== a.vendorId) throw conflict('Invoice belongs to another vendor');
      if (b.amount > invoiceTotals(inv).balance + 0.5) throw conflict('Allocation exceeds the invoice balance');
      const payId = await nextId(db, 'PAY');
      await mutate('invoices', inv.id, db, (i: Doc) => { i.payments.push({ id: payId, date: today(), amount: b.amount, tds: 0, mode: 'Advance adjustment', ref: id, by }); });
      const next = await mutate('vendorAdvances', id, db, (x: Doc) => { x.allocated = [...(x.allocated ?? []), { invoiceId: inv.id, amount: b.amount, at: nowISO(), by }]; });
      await log('vendorAdvances', id, `Allocated ₹${b.amount} to ${inv.id}`);
      return next;
    });
  });

  // Payment run proposal: what is due and payable now
  app.get('/api/payment-run', { preHandler: requireRole('finance') }, async () => {
    const holds = await list<Hold & Doc>('holds', { where: { status: 'Active' } });
    const invs = await list('invoices');
    const t = today();
    return invs.map((i) => ({ i, tot: invoiceTotals(i) })).filter(({ tot }) => tot.balance > 0.5).map(({ i, tot }) => ({
      id: i.id, vendorId: i.vendorId, number: i.number, due: i.due, balance: tot.balance,
      blocked: holds.filter((h) => h.vendorId === i.vendorId && (h.level === 'Vendor' ? ['All', 'Payments'].includes(h.scope) : h.refId === i.id)).map((h) => h.detail),
      overdue: i.due < t,
    }));
  });
}

/** Reduce GRN accepted qty by quantity already billed so a new bill is matched against what is left. */
function adjustForPrior(po: Doc, prior: Doc[]): Doc {
  const billed = (line: number) => prior.flatMap((i) => i.lines ?? []).filter((l: Doc) => l.line === line).reduce((s: number, l: Doc) => s + l.qty, 0);
  const receipts = [...(po.receipts ?? [])];
  const lines = po.lines.map((_: Doc, i: number) => i);
  const adj = lines.map((i: number) => ({ id: `ADJ-${i}`, date: '', lines: [{ line: i, qty: -billed(i), accepted: -billed(i) }] }));
  return { ...po, receipts: [...receipts, ...adj] };
}
/** Negative synthetic service receipt = quantity already billed, so it can't be billed twice. */
function priorBilledSes(po: Doc, prior: Doc[]): Doc {
  const lines = po.lines.map((_: Doc, i: number) => ({ line: i, qty: -prior.flatMap((x) => x.lines ?? []).filter((l: Doc) => l.line === i).reduce((s: number, l: Doc) => s + l.qty, 0) }));
  return { poId: po.id, status: 'Accepted', lines };
}
