import { poLineStatus, poReceiptStatus } from '@nebulla/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requireRole } from '../auth';
import { badRequest, conflict, forbidden, get, insert, list, mutate, nextId, save } from '../repo';
import { checkGate, settingsOf, today } from '../services/rules';
import { act, isoDate, money, nowISO, params, parse, qty } from './helpers';

type Doc = Record<string, any>;

const line = z.object({ desc: z.string().min(1), unit: z.string().min(1), qty, rate: money.optional().default(0), requiredBy: isoDate.optional() });

export async function procurementRoutes(app: FastifyInstance) {
  // ── Requisitions (stage 04) ─────────────────────────────────────────────
  const mr = z.object({
    purpose: z.enum(['Purchase', 'Manpower (labour)', 'Service', 'Material Transfer']), requiredBy: isoDate, project: z.string().min(1),
    costCentre: z.string().optional(), targetStore: z.string().optional(), sourceStore: z.string().optional(), items: z.array(line).min(1), notes: z.string().optional(),
  });
  app.post('/api/requisitions', { preHandler: requireRole('project', 'procurement') }, async (req) => {
    const b = parse(mr, req.body);
    if (b.requiredBy < today()) throw badRequest('Required-by date is in the past');
    return act(req, async ({ db, by, log }) => {
      const r = await insert('requisitions', { ...b, date: today(), status: 'Submitted', requestedBy: by, createdAt: nowISO(), company: 'NebullaOne Infra Pvt Ltd', rfqIds: [] }, db);
      await log('requisitions', r.id, 'Submitted');
      return r;
    });
  });

  const decide = z.object({ decision: z.enum(['Approved', 'Rejected']), remark: z.string().default('') });
  app.post('/api/requisitions/:id/decision', { preHandler: requireRole('project', 'procurement') }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(decide, req.body);
    return act(req, async ({ db, by, log }) => {
      const r = await mutate('requisitions', id, db, (r: Doc) => {
        if (r.status !== 'Submitted') throw conflict(`Requisition is ${r.status}`);
        if (r.requestedBy === by) throw forbidden('You cannot approve your own requisition');
        r.status = b.decision; r.decidedBy = by; r.decidedAt = nowISO(); r.decisionRemark = b.remark;
      });
      await log('requisitions', id, b.decision, b);
      return r;
    });
  });

  // ── RFQs (stages 05–06) ─────────────────────────────────────────────────
  const rfq = z.object({
    title: z.string().min(3), project: z.string().min(1), mode: z.enum(['Call for Tenders', 'Single Vendor']).default('Call for Tenders'),
    dueDate: isoDate, template: z.string().optional(), incoterm: z.string().optional(), sourceRef: z.string().optional(), requisitionId: z.string().optional(),
    items: z.array(line).min(1), vendorIds: z.array(z.string()).min(1), weights: z.object({ price: z.number(), quality: z.number(), delivery: z.number() }).default({ price: 60, quality: 25, delivery: 15 }),
    tnc: z.string().optional(), overrideReason: z.string().optional(),
  }).refine((r) => r.mode === 'Single Vendor' ? r.vendorIds.length === 1 : r.vendorIds.length >= 2, { message: 'Invite at least two vendors (or one for a single-vendor RFQ)', path: ['vendorIds'] });

  app.post('/api/rfqs', { preHandler: requireRole('procurement') }, async (req) => {
    const b = parse(rfq, req.body);
    if (b.dueDate <= today()) throw badRequest('Quote due date must be in the future');
    return act(req, async ({ db, user, by, log }) => {
      const warnings: string[] = [];
      for (const v of b.vendorIds) warnings.push(...(await checkGate(db, user, { action: 'rfq', vendorId: v, overrideReason: b.overrideReason })).warnings);
      const r = await insert('rfqs', {
        title: b.title, project: b.project, mode: b.mode, status: 'Draft', createdOn: today(), dueDate: b.dueDate, template: b.template ?? 'Blank',
        items: b.items, vendorIds: b.vendorIds, weights: b.weights, quotes: [], negotiation: [], awardedTo: null, tnc: b.tnc ?? '', incoterm: b.incoterm ?? '',
        sourceRef: b.sourceRef ?? '', responses: {}, emails: [], awards: [], requisitionId: b.requisitionId ?? null, createdBy: by,
      }, db);
      if (b.requisitionId) await mutate('requisitions', b.requisitionId, db, (m: Doc) => {
        if (m.status !== 'Approved') throw conflict('Requisition must be approved before sourcing');
        m.rfqIds = [...(m.rfqIds ?? []), r.id];
      });
      await log('rfqs', r.id, 'Created', { warnings });
      return { ...r, _warnings: warnings };
    });
  });

  app.post('/api/rfqs/:id/send', { preHandler: requireRole('procurement') }, async (req) => {
    const { id } = parse(params, req.params);
    return act(req, async ({ db, log }) => {
      const r = await mutate('rfqs', id, db, (r: Doc) => {
        if (r.status !== 'Draft') throw conflict('RFQ already sent');
        r.status = 'Sent';
        r.emails = r.vendorIds.map((v: string) => ({ to: v, subject: `Request for Quotation ${r.id} — ${r.title}`, at: today() }));
        r.responses = Object.fromEntries(r.vendorIds.map((v: string) => [v, { status: 'Invited', at: nowISO() }]));
      });
      await log('rfqs', id, 'Sent to vendors');
      return r;
    });
  });

  // Quote — entered by the vendor in the portal, or by procurement on the vendor's behalf
  const quote = z.object({
    vendorId: z.string(), quoteNo: z.string().min(1), rates: z.array(z.coerce.number().nonnegative().nullable()), noBid: z.array(z.boolean()).optional(),
    leadDays: z.array(z.coerce.number().int().nonnegative()).optional(), discounts: z.array(z.coerce.number().min(0).max(100)).optional(),
    gstPct: z.coerce.number().min(0).max(28).default(18), deliveryDays: z.coerce.number().int().nonnegative(), validUntil: isoDate, note: z.string().default(''),
  });
  app.post('/api/rfqs/:id/quotes', { preHandler: authenticate }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(quote, req.body);
    const u = req.user;
    if (u.role === 'vendor' ? u.vendorId !== b.vendorId : !['admin', 'procurement'].includes(u.role)) throw forbidden();
    return act(req, async ({ db, by, log }) => {
      const r = await mutate('rfqs', id, db, (r: Doc) => {
        if (!['Sent', 'Quotes Received'].includes(r.status)) throw conflict(`RFQ is ${r.status}; quotes are closed`);
        if (!r.vendorIds.includes(b.vendorId)) throw forbidden('This vendor was not invited');
        if (r.dueDate < today()) throw conflict('The quote deadline has passed');
        if (b.rates.length !== r.items.length) throw badRequest(`Quote needs ${r.items.length} line rates`);
        if (b.validUntil < r.dueDate) throw badRequest('Quote must stay valid at least until the RFQ due date');
        const q = { ...b, noBid: b.noBid ?? b.rates.map((x) => x == null), leadDays: b.leadDays ?? b.rates.map(() => b.deliveryDays), discounts: b.discounts ?? b.rates.map(() => 0), currency: 'INR', fx: 1, review: 'Accepted', submittedOn: today(), submittedBy: by };
        r.quotes = [...(r.quotes ?? []).filter((x: Doc) => x.vendorId !== b.vendorId), q];
        r.responses = { ...(r.responses ?? {}), [b.vendorId]: { status: 'Quoted', at: nowISO() } };
        r.status = 'Quotes Received';
      });
      await log('rfqs', id, `Quote received from ${b.vendorId}`);
      return r;
    });
  });

  app.post('/api/rfqs/:id/decline', { preHandler: authenticate }, async (req) => {
    const { id } = parse(params, req.params);
    const vendorId = req.user.role === 'vendor' ? req.user.vendorId! : parse(z.object({ vendorId: z.string() }), req.body).vendorId;
    return act(req, async ({ db, log }) => {
      const r = await mutate('rfqs', id, db, (r: Doc) => {
        if (!r.vendorIds.includes(vendorId)) throw forbidden('This vendor was not invited');
        r.responses = { ...(r.responses ?? {}), [vendorId]: { status: 'Declined', at: nowISO() } };
      });
      await log('rfqs', id, `Declined by ${vendorId}`);
      return r;
    });
  });

  const nego = z.object({ vendorId: z.string(), text: z.string().min(2), amount: z.coerce.number().nullable().optional() });
  app.post('/api/rfqs/:id/negotiation', { preHandler: requireRole('procurement') }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(nego, req.body);
    return act(req, async ({ db, by, log }) => {
      const r = await mutate('rfqs', id, db, (r: Doc) => { r.negotiation = [...(r.negotiation ?? []), { at: nowISO(), vendorId: b.vendorId, by, text: b.text, amount: b.amount ?? null }]; });
      await log('rfqs', id, 'Negotiation note');
      return r;
    });
  });

  // Award → purchase order (stage 07). Lines may be split across vendors.
  const award = z.object({
    vendorId: z.string(), lines: z.array(z.number().int().nonnegative()).min(1), deliveryDate: isoDate,
    billingPolicy: z.enum(['On received quantity', 'On ordered quantity']).default('On received quantity'), overrideReason: z.string().optional(), justification: z.string().optional(),
  });
  app.post('/api/rfqs/:id/award', { preHandler: requireRole('procurement') }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(award, req.body);
    return act(req, async ({ db, user, by, log }) => {
      const settings = await settingsOf(db);
      const r = await get('rfqs', id, db, true);
      if (!['Quotes Received', 'Partially Awarded'].includes(r.status)) throw conflict(`RFQ is ${r.status}`);
      const q = (r.quotes ?? []).find((x: Doc) => x.vendorId === b.vendorId);
      if (!q) throw conflict('This vendor has not quoted');
      if (q.validUntil < today()) throw conflict('The quote has expired — ask the vendor to revalidate');
      const already = new Set((r.awards ?? []).map((a: Doc) => a.line));
      for (const l of b.lines) {
        if (already.has(l)) throw conflict(`Line ${l + 1} is already awarded`);
        if (q.noBid?.[l] || q.rates[l] == null) throw conflict(`Vendor did not quote line ${l + 1}`);
      }
      // Awarding above L1 requires a justification.
      for (const l of b.lines) {
        const net = (x: Doc) => x.rates[l] * (1 - (x.discounts?.[l] ?? 0) / 100);
        const l1 = Math.min(...r.quotes.filter((x: Doc) => x.rates[l] != null && !x.noBid?.[l]).map(net));
        if (net(q) > l1 + 0.001 && !b.justification?.trim()) throw badRequest(`Line ${l + 1} is not the lowest quote — add a justification`);
      }
      const { warnings } = await checkGate(db, user, { action: 'po', vendorId: b.vendorId, overrideReason: b.overrideReason });
      const po = await insert('purchaseOrders', {
        vendorId: b.vendorId, project: r.project, date: today(), deliveryDate: b.deliveryDate, status: 'Issued', billingPolicy: b.billingPolicy,
        tolerance: settings.overOrderPct ?? 0, rfqId: r.id, kind: 'Goods',
        lines: b.lines.map((l) => ({ desc: r.items[l].desc, unit: r.items[l].unit, qty: r.items[l].qty, rate: Math.round(q.rates[l] * (1 - (q.discounts?.[l] ?? 0) / 100) * 100) / 100 })),
        gstPct: q.gstPct, receipts: [], returns: [], revisions: [{ rev: 0, at: nowISO(), by, note: `PO issued from ${r.id}` }], blanketId: null, justification: b.justification ?? '',
      }, db);
      r.awards = [...(r.awards ?? []), ...b.lines.map((line) => ({ line, vendorId: b.vendorId, poId: po.id, at: nowISO(), by }))];
      r.status = r.awards.length >= r.items.length ? 'Awarded' : 'Partially Awarded';
      r.awardedTo = r.status === 'Awarded' && new Set(r.awards.map((a: Doc) => a.vendorId)).size === 1 ? b.vendorId : r.awardedTo;
      await save('rfqs', r as Doc & { id: string }, db);
      await log('rfqs', id, `Awarded lines ${b.lines.map((l) => l + 1).join(', ')} to ${b.vendorId} → ${po.id}`, { justification: b.justification });
      await log('purchaseOrders', po.id, 'Issued', { warnings });
      return { rfq: r, po, warnings };
    });
  });

  // ── Direct purchase orders ───────────────────────────────────────────────
  const po = z.object({
    vendorId: z.string(), project: z.string().min(1), deliveryDate: isoDate, kind: z.enum(['Goods', 'Service']).default('Goods'),
    lines: z.array(line.extend({ rate: money })).min(1), gstPct: z.coerce.number().min(0).max(28).default(18),
    billingPolicy: z.enum(['On received quantity', 'On ordered quantity']).default('On received quantity'),
    requisitionId: z.string().optional(), overrideReason: z.string().optional(), note: z.string().optional(),
  });
  app.post('/api/purchase-orders', { preHandler: requireRole('procurement') }, async (req) => {
    const b = parse(po, req.body);
    return act(req, async ({ db, user, by, log }) => {
      const settings = await settingsOf(db);
      const { warnings } = await checkGate(db, user, { action: 'po', vendorId: b.vendorId, overrideReason: b.overrideReason });
      if (b.requisitionId) {
        const m = await get('requisitions', b.requisitionId, db);
        if (m.status !== 'Approved') throw conflict('Requisition is not approved');
        for (const l of b.lines) {
          const src = m.items.find((x: Doc) => x.desc === l.desc);
          if (src && l.qty > src.qty * (1 + (settings.overOrderPct ?? 0) / 100)) throw conflict(`${l.desc}: ordering ${l.qty} exceeds requisition ${src.qty} + ${settings.overOrderPct}% allowance`);
        }
      }
      if (!settings.allowDuplicateItems) {
        const seen = new Set<string>();
        for (const l of b.lines) { if (seen.has(l.desc)) throw badRequest(`${l.desc} appears twice on the PO`); seen.add(l.desc); }
      }
      const p = await insert('purchaseOrders', {
        vendorId: b.vendorId, project: b.project, date: today(), deliveryDate: b.deliveryDate, status: 'Issued', billingPolicy: b.billingPolicy,
        tolerance: settings.overOrderPct ?? 0, rfqId: null, kind: b.kind, lines: b.lines.map(({ requiredBy, ...l }) => l), gstPct: b.gstPct,
        receipts: [], returns: [], revisions: [{ rev: 0, at: nowISO(), by, note: b.note ?? 'PO issued' }], blanketId: null, requisitionId: b.requisitionId ?? null,
      }, db);
      await log('purchaseOrders', p.id, 'Issued (direct)', { warnings });
      return { ...p, _warnings: warnings };
    });
  });

  // Goods receipt (stage 19A)
  const grn = z.object({
    date: isoDate, deliveryNote: z.string().optional(), vehicle: z.string().optional(), transporter: z.string().optional(),
    lines: z.array(z.object({ line: z.number().int().nonnegative(), qty: z.coerce.number().nonnegative(), accepted: z.coerce.number().nonnegative(), rejectReason: z.string().optional() })).min(1),
    qc: z.enum(['Passed', 'Partially Passed', 'Failed', 'Not required']).default('Passed'), remarks: z.string().optional(),
  });
  app.post('/api/purchase-orders/:id/receipts', { preHandler: requireRole('procurement', 'project') }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(grn, req.body);
    if (b.date > today()) throw badRequest('Receipt date cannot be in the future');
    return act(req, async ({ db, by, log }) => {
      const settings = await settingsOf(db);
      const grnId = await nextId(db, 'GRN');
      const p = await mutate('purchaseOrders', id, db, (p: Doc) => {
        if (p.kind === 'Service') throw conflict('Service POs are received with a service receipt');
        if (['Draft', 'Closed', 'Cancelled'].includes(p.status)) throw conflict(`PO is ${p.status}`);
        const ls = poLineStatus(p);
        for (const l of b.lines) {
          const pl = ls[l.line];
          if (!pl) throw badRequest(`PO has no line ${l.line + 1}`);
          if (l.accepted > l.qty) throw badRequest(`${pl.desc}: accepted is more than received`);
          if (l.accepted < l.qty && !l.rejectReason) throw badRequest(`${pl.desc}: give a reason for the rejected quantity`);
          const allowed = pl.qty * (1 + (settings.overOrderPct ?? 0) / 100);
          if (pl.received + l.qty > allowed + 1e-9) throw conflict(`${pl.desc}: receiving ${pl.received + l.qty} ${pl.unit} exceeds ordered ${pl.qty} (+${settings.overOrderPct ?? 0}% tolerance)`);
        }
        p.receipts = [...(p.receipts ?? []), { id: grnId, ...b, receivedBy: by, lines: b.lines.filter((l) => l.qty > 0) }];
        p.status = poReceiptStatus(p) === 'Received' ? 'Received' : 'Partially Received';
      });
      await log('purchaseOrders', id, `Goods received ${grnId}`, { lines: b.lines });
      return p;
    });
  });

  // Return to vendor (from a GRN's rejected quantity)
  const rtv = z.object({ grnId: z.string(), line: z.number().int().nonnegative(), qty, reason: z.string().min(2), location: z.string().optional() });
  app.post('/api/purchase-orders/:id/returns', { preHandler: requireRole('procurement', 'project') }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(rtv, req.body);
    return act(req, async ({ db, log }) => {
      const rid = await nextId(db, 'RTV');
      const p = await mutate('purchaseOrders', id, db, (p: Doc) => {
        const g = (p.receipts ?? []).find((r: Doc) => r.id === b.grnId);
        const gl = g?.lines.find((l: Doc) => l.line === b.line);
        if (!gl) throw conflict('That GRN line does not exist');
        const already = (p.returns ?? []).filter((r: Doc) => r.grnId === b.grnId && r.line === b.line).reduce((s: number, r: Doc) => s + r.qty, 0);
        if (already + b.qty > gl.qty - gl.accepted + 1e-9) throw conflict('Only rejected quantity can be returned');
        p.returns = [...(p.returns ?? []), { id: rid, ...b, date: today(), debitNote: null }];
      });
      await log('purchaseOrders', id, `Return to vendor ${rid}`);
      return p;
    });
  });

  app.post('/api/purchase-orders/:id/cancel', { preHandler: requireRole('procurement') }, async (req) => {
    const { id } = parse(params, req.params);
    const { reason } = parse(z.object({ reason: z.string().min(3) }), req.body);
    return act(req, async ({ db, by, log }) => {
      const p = await mutate('purchaseOrders', id, db, (p: Doc) => {
        if ((p.receipts ?? []).length) throw conflict('Goods already received — short-close the PO instead');
        p.status = 'Cancelled'; p.revisions.push({ rev: p.revisions.length, at: nowISO(), by, note: `Cancelled: ${reason}` });
      });
      await log('purchaseOrders', id, 'Cancelled', { reason });
      return p;
    });
  });

  app.post('/api/purchase-orders/:id/close', { preHandler: requireRole('procurement') }, async (req) => {
    const { id } = parse(params, req.params);
    const { reason } = parse(z.object({ reason: z.string().min(3) }), req.body);
    return act(req, async ({ db, by, log }) => {
      const p = await mutate('purchaseOrders', id, db, (p: Doc) => {
        if (['Closed', 'Cancelled'].includes(p.status)) throw conflict(`PO is already ${p.status}`);
        p.status = 'Closed'; p.revisions.push({ rev: p.revisions.length, at: nowISO(), by, note: `Short-closed: ${reason}` });
      });
      await log('purchaseOrders', id, 'Closed', { reason });
      return p;
    });
  });

  // ── Service receipts / SES (stage 19B — new) ─────────────────────────────
  const ses = z.object({
    poId: z.string(), periodFrom: isoDate, periodTo: isoDate, site: z.string().optional(), description: z.string().min(3),
    lines: z.array(z.object({ line: z.number().int().nonnegative(), qty: qty, measure: z.enum(['Quantity', 'Hours', '% Complete', 'Milestone']).default('Quantity') })).min(1),
    timesheetRef: z.string().optional(), evidence: z.array(z.string()).default([]),
  }).refine((s) => s.periodTo >= s.periodFrom, { message: 'Period end is before start', path: ['periodTo'] });
  app.post('/api/service-receipts', { preHandler: authenticate }, async (req) => {
    const b = parse(ses, req.body);
    return act(req, async ({ db, user, by, log }) => {
      const p = await get('purchaseOrders', b.poId, db);
      if (user.role === 'vendor' ? user.vendorId !== p.vendorId : !['admin', 'project', 'procurement'].includes(user.role)) throw forbidden();
      if (p.kind !== 'Service') throw conflict('Service receipts are only for service POs — use a goods receipt');
      const prior = await list('serviceReceipts', { db, where: { po_id: p.id } });
      for (const l of b.lines) {
        const pl = p.lines[l.line];
        if (!pl) throw badRequest(`PO has no line ${l.line + 1}`);
        const done = prior.filter((s) => s.status !== 'Rejected').flatMap((s) => s.lines).filter((x: Doc) => x.line === l.line).reduce((a: number, x: Doc) => a + x.qty, 0);
        if (done + l.qty > pl.qty + 1e-9) throw conflict(`${pl.desc}: ${done + l.qty} ${pl.unit} exceeds ordered ${pl.qty}`);
      }
      const s = await insert('serviceReceipts', {
        ...b, vendorId: p.vendorId, project: p.project, status: 'Submitted', submittedBy: by, submittedAt: nowISO(),
        lines: b.lines.map((l) => ({ ...l, desc: p.lines[l.line].desc, unit: p.lines[l.line].unit, rate: p.lines[l.line].rate, value: l.qty * p.lines[l.line].rate })),
        history: [{ status: 'Submitted', by, at: nowISO(), remark: '' }],
      }, db);
      await log('serviceReceipts', s.id, 'Submitted');
      return s;
    });
  });

  const sesDecision = z.object({ decision: z.enum(['Accepted', 'Rejected']), remark: z.string().default('') });
  app.post('/api/service-receipts/:id/decision', { preHandler: requireRole('project', 'procurement') }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(sesDecision, req.body);
    if (b.decision === 'Rejected' && !b.remark.trim()) throw badRequest('Give a reason for rejecting');
    return act(req, async ({ db, by, log }) => {
      const s = await mutate('serviceReceipts', id, db, (s: Doc) => {
        if (s.status !== 'Submitted') throw conflict(`Service receipt is ${s.status}`);
        if (s.submittedBy === by) throw forbidden('Someone other than the submitter must confirm the service');
        s.status = b.decision; s.confirmedBy = by; s.confirmedAt = nowISO(); s.remark = b.remark;
        s.history.push({ status: b.decision, by, at: nowISO(), remark: b.remark });
      });
      await log('serviceReceipts', id, b.decision, b);
      return s;
    });
  });

  // ── Blanket orders & call-offs ───────────────────────────────────────────
  const bo = z.object({ vendorId: z.string(), title: z.string().min(3), project: z.string().default(''), start: isoDate, deadline: isoDate, lines: z.array(line.extend({ rate: money })).min(1), terms: z.string().default('') })
    .refine((x) => x.deadline > x.start, { message: 'Deadline must be after start', path: ['deadline'] });
  app.post('/api/blanket-orders', { preHandler: requireRole('procurement') }, async (req) => {
    const b = parse(bo, req.body);
    return act(req, async ({ db, user, log }) => {
      await checkGate(db, user, { action: 'po', vendorId: b.vendorId });
      const r = await insert('blanketOrders', { ...b, status: 'Active', currency: 'INR', lines: b.lines.map(({ requiredBy, ...l }) => l) }, db);
      await log('blanketOrders', r.id, 'Created');
      return r;
    });
  });

  const calloff = z.object({ project: z.string().min(1), deliveryDate: isoDate, lines: z.array(z.object({ blanketLine: z.number().int().nonnegative(), qty })).min(1) });
  app.post('/api/blanket-orders/:id/call-off', { preHandler: requireRole('procurement', 'project') }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(calloff, req.body);
    return act(req, async ({ db, user, by, log }) => {
      const settings = await settingsOf(db);
      const bo = await get('blanketOrders', id, db, true);
      if (bo.status !== 'Active' || bo.deadline < today()) throw conflict('Agreement is not active');
      await checkGate(db, user, { action: 'po', vendorId: bo.vendorId });
      const prior = (await list('purchaseOrders', { db, where: { blanket_id: id } })).filter((p) => p.status !== 'Cancelled');
      for (const l of b.lines) {
        const bl = bo.lines[l.blanketLine];
        if (!bl) throw badRequest(`No agreement line ${l.blanketLine + 1}`);
        const used = prior.flatMap((p) => p.lines).filter((x: Doc) => x.blanketLine === l.blanketLine).reduce((s: number, x: Doc) => s + x.qty, 0);
        const cap = bl.qty * (1 + (settings.blanketAllowancePct ?? 0) / 100);
        if (used + l.qty > cap + 1e-9) throw conflict(`${bl.desc}: call-offs would reach ${used + l.qty} of ${bl.qty} agreed (+${settings.blanketAllowancePct ?? 0}% allowance)`);
      }
      const p = await insert('purchaseOrders', {
        vendorId: bo.vendorId, project: b.project, date: today(), deliveryDate: b.deliveryDate, status: 'Issued', billingPolicy: 'On received quantity',
        tolerance: settings.overOrderPct ?? 0, rfqId: null, kind: 'Goods', blanketId: id, gstPct: 18,
        lines: b.lines.map((l) => ({ desc: bo.lines[l.blanketLine].desc, unit: bo.lines[l.blanketLine].unit, qty: l.qty, rate: bo.lines[l.blanketLine].rate, blanketLine: l.blanketLine })),
        receipts: [], returns: [], revisions: [{ rev: 0, at: nowISO(), by, note: `Call-off against ${id}` }],
      }, db);
      await log('blanketOrders', id, `Call-off ${p.id}`);
      return p;
    });
  });
}
