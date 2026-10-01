import { labourMarginPct, validateLabourRate } from '@nebulla/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requireInternal, requireRole } from '../auth';
import { pool } from '../db';
import { badRequest, conflict, forbidden, get, getConfig, insert, list, mutate, save, setConfig, unprocessable } from '../repo';
import { runAutoBlock, scorecard, syncComplianceHolds, today } from '../services/rules';
import { act, isoDate, nowISO, params, parse } from './helpers';

type Doc = Record<string, any>;

export async function adminRoutes(app: FastifyInstance) {
  // ── Labour rate cards (stage 03) — below-minimum-wage rates are refused (B1) ──
  const rate = z.object({
    trade: z.string().min(2), skill: z.enum(['Unskilled', 'Semi-skilled', 'Skilled', 'Highly Skilled']), region: z.string().min(2),
    minWage: z.coerce.number().positive(), rate: z.coerce.number().positive(), otMultiplier: z.coerce.number().default(2),
    basis: z.string().default('Per 8-hr man-day'), vendorId: z.string().nullable().optional(), effectiveFrom: isoDate, effectiveTo: isoDate.nullable().optional(),
  });
  app.post('/api/labor-rates', { preHandler: requireRole('project', 'procurement') }, async (req) => {
    const b = parse(rate, req.body);
    const errs = validateLabourRate(b);
    if (errs.length) throw unprocessable(errs.join('; '), errs);
    return act(req, async ({ db, by, log }) => {
      const all = await list('laborRates', { db });
      const clash = all.find((r) => r.status === 'Active' && r.trade === b.trade && r.region === b.region && (r.vendorId ?? null) === (b.vendorId ?? null) && (!r.effectiveTo || r.effectiveTo >= b.effectiveFrom));
      const r = await insert('laborRates', { ...b, vendorId: b.vendorId ?? null, effectiveTo: b.effectiveTo ?? null, status: 'Pending Approval', version: 1, proposedBy: by, supersedes: clash?.id ?? null }, db);
      await log('laborRates', r.id, `Proposed ₹${b.rate}/day (${labourMarginPct(b).toFixed(1)}% over minimum wage)`);
      return r;
    });
  });

  app.post('/api/labor-rates/:id/revise', { preHandler: requireRole('project', 'procurement') }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(z.object({ rate: z.coerce.number().positive(), minWage: z.coerce.number().positive().optional(), effectiveFrom: isoDate, reason: z.string().min(3) }), req.body);
    return act(req, async ({ db, by, log }) => {
      const cur = await get('laborRates', id, db);
      const next = { ...cur, rate: b.rate, minWage: b.minWage ?? cur.minWage, effectiveFrom: b.effectiveFrom };
      const errs = validateLabourRate(next);
      if (errs.length) throw unprocessable(errs.join('; '), errs);
      if (b.effectiveFrom <= cur.effectiveFrom) throw badRequest('Revision must take effect after the current version');
      const { id: _old, _v, ...rest } = next as Doc;
      const r = await insert('laborRates', { ...rest, status: 'Pending Approval', version: (cur.version ?? 1) + 1, proposedBy: by, supersedes: cur.id, revisionReason: b.reason }, db);
      await log('laborRates', r.id, `Revision v${r.version} of ${cur.id} proposed`);
      return r;
    });
  });

  app.post('/api/labor-rates/:id/decision', { preHandler: requireRole('finance', 'procurement') }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(z.object({ decision: z.enum(['Approved', 'Rejected']), remark: z.string().default('') }), req.body);
    return act(req, async ({ db, by, log }) => {
      const r = await get('laborRates', id, db, true);
      if (r.status !== 'Pending Approval') throw conflict(`Rate is ${r.status}`);
      if (r.proposedBy === by) throw forbidden('The proposer cannot approve the rate');
      if (b.decision === 'Approved') {
        const errs = validateLabourRate(r);
        if (errs.length) throw unprocessable(errs.join('; '), errs);
        if (r.supersedes) await mutate('laborRates', r.supersedes, db, (o: Doc) => {
          o.status = 'Superseded';
          const d = new Date(`${r.effectiveFrom}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - 1);
          o.effectiveTo = d.toISOString().slice(0, 10);
        });
      }
      r.status = b.decision === 'Approved' ? 'Active' : 'Rejected';
      r.decidedBy = by; r.decidedAt = nowISO(); r.decisionRemark = b.remark;
      await save('laborRates', r, db);
      await log('laborRates', id, b.decision, b);
      return r;
    });
  });

  // ── Performance (stage 23) ───────────────────────────────────────────────
  app.get('/api/scorecard', { preHandler: requireInternal }, async () => scorecard(pool));

  app.post('/api/scorecard/auto-block', { preHandler: requireRole('procurement') }, async (req) =>
    act(req, async ({ db, by, log }) => {
      const r = await runAutoBlock(db, by);
      await log('scorecard', 'AUTO-BLOCK', `Auto-block check: ${r.raised.length} raised, ${r.released.length} released`);
      return r;
    }));

  const rating = z.object({ vendorId: z.string(), woId: z.string().optional(), period: z.string().min(3), quality: z.coerce.number().int().min(1).max(5), safety: z.coerce.number().int().min(1).max(5), manpower: z.coerce.number().int().min(1).max(5), incidents: z.coerce.number().int().min(0).default(0), remarks: z.string().default('') });
  app.post('/api/ratings', { preHandler: requireRole('project', 'qa_hse', 'procurement') }, async (req) => {
    const b = parse(rating, req.body);
    return act(req, async ({ db, by, log }) => {
      const dup = (await list('ratings', { db, where: { vendor_id: b.vendorId } })).find((r) => r.period === b.period && (r.woId ?? null) === (b.woId ?? null));
      if (dup) throw conflict(`${b.vendorId} is already rated for ${b.period}${b.woId ? ` on ${b.woId}` : ''}`);
      const r = await insert('ratings', { ...b, woId: b.woId ?? null, by, at: today() }, db);
      await log('ratings', r.id, `Rated ${b.period}`);
      return r;
    });
  });

  const cap = z.object({ vendorId: z.string(), issue: z.string().min(5), actions: z.string().min(5), dueDate: isoDate, owner: z.string().min(2) });
  app.post('/api/caps', { preHandler: requireRole('procurement', 'qa_hse', 'project') }, async (req) => {
    const b = parse(cap, req.body);
    return act(req, async ({ db, log }) => {
      const r = await insert('caps', { ...b, issuedOn: today(), status: 'Open' }, db);
      await log('caps', r.id, 'Corrective action plan issued');
      return r;
    });
  });

  app.post('/api/caps/:id/status', { preHandler: requireRole('procurement', 'qa_hse', 'project') }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(z.object({ status: z.enum(['Open', 'In Progress', 'Closed']), note: z.string().default('') }), req.body);
    return act(req, async ({ db, by, log }) => {
      const r = await mutate('caps', id, db, (c: Doc) => { c.status = b.status; c.history = [...(c.history ?? []), { at: nowISO(), by, status: b.status, note: b.note }]; });
      await log('caps', id, `→ ${b.status}`);
      return r;
    });
  });

  // ── Vendor queries / tickets (portal) ────────────────────────────────────
  app.post('/api/tickets', { preHandler: authenticate }, async (req) => {
    const b = parse(z.object({ vendorId: z.string().optional(), subject: z.string().min(3), body: z.string().min(3) }), req.body);
    return act(req, async ({ db, user, by, log }) => {
      const vendorId = user.role === 'vendor' ? user.vendorId! : b.vendorId;
      if (!vendorId) throw badRequest('vendorId is required');
      const r = await insert('tickets', { vendorId, subject: b.subject, body: b.body, status: 'Open', raisedOn: today(), raisedBy: by, replies: [] }, db);
      await log('tickets', r.id, 'Raised');
      return r;
    });
  });

  app.post('/api/tickets/:id/reply', { preHandler: authenticate }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(z.object({ text: z.string().min(1), close: z.boolean().default(false) }), req.body);
    return act(req, async ({ db, user, by, log }) => {
      const t = await get('tickets', id, db, true);
      if (user.role === 'vendor' && user.vendorId !== t.vendorId) throw forbidden();
      t.replies = [...(t.replies ?? []), { at: nowISO(), by, text: b.text, fromVendor: user.role === 'vendor' }];
      if (b.close && user.role !== 'vendor') t.status = 'Closed';
      else if (user.role !== 'vendor') t.status = 'Answered';
      else t.status = 'Open';
      await save('tickets', t, db);
      await log('tickets', id, 'Reply');
      return t;
    });
  });

  // ── Configuration ────────────────────────────────────────────────────────
  const CONFIG_KEYS = ['settings', 'scoreConfig', 'rfqTemplates', 'wbsBudgets'];
  app.get<{ Params: { key: string } }>('/api/config/:key', { preHandler: authenticate }, async (req) => {
    if (!CONFIG_KEYS.includes(req.params.key)) throw badRequest('Unknown config key');
    if (req.user.role === 'vendor') {
      // Vendors only need to know which documents are required — never internal settings (company banks, approval flows…).
      if (req.params.key !== 'settings') throw forbidden();
      const s = await getConfig<Doc>('settings');
      return { complianceDocs: s.complianceDocs, complianceIns: s.complianceIns, expiryWarnDays: s.expiryWarnDays };
    }
    return getConfig(req.params.key);
  });

  const gate = z.enum(['Stop', 'Warn', 'Off']);
  const settingsSchema = z.object({
    poRequiredForBill: z.boolean(), receiptRequiredForBill: z.boolean(), billRejectedQty: z.boolean(),
    threeWayQty: gate, rateCheck: gate, complianceGate: gate, rfqComplianceGate: gate, poComplianceGate: gate,
    rateTolerancePct: z.coerce.number().min(0).max(20), overOrderPct: z.coerce.number().min(0).max(50), blanketAllowancePct: z.coerce.number().min(0).max(50),
    requireDocsOnSubmit: z.boolean(), mobilisationBeforeWo: z.boolean(), qcBeforeBilling: z.boolean(), expiryWarnDays: z.coerce.number().int().min(1).max(180),
    vendorFlow: z.array(z.object({ name: z.string().min(1), scope: z.string() })).min(1),
    contractFlow: z.array(z.object({ name: z.string().min(1), minValue: z.coerce.number().min(0) })).min(1),
  }).passthrough();
  app.put('/api/config/settings', { preHandler: requireRole('procurement', 'finance') }, async (req) => {
    const b = parse(settingsSchema, req.body);
    return act(req, async ({ db, log }) => {
      const cur = await getConfig<Doc>('settings', db);
      const next = { ...cur, ...b };
      await setConfig('settings', next, db);
      await log('settings', 'PROCUREMENT', 'Procurement settings updated', { changed: Object.keys(b).filter((k) => JSON.stringify(cur[k]) !== JSON.stringify((b as Doc)[k])) });
      await syncComplianceHolds(db);
      return next;
    });
  });

  const scoreSchema = z.object({
    weights: z.object({ quality: z.number(), timeliness: z.number(), safety: z.number(), compliance: z.number() }).refine((w) => Math.abs(w.quality + w.timeliness + w.safety + w.compliance - 100) < 0.01, 'weights must total 100'),
    blockThreshold: z.coerce.number().min(0).max(100), capThreshold: z.coerce.number().min(0).max(100), autoBlock: z.boolean(),
    standings: z.array(z.object({ name: z.string(), min: z.number(), max: z.number(), color: z.string(), warnRfq: z.boolean(), warnPo: z.boolean(), preventRfq: z.boolean(), preventPo: z.boolean() })).min(1),
  }).passthrough().superRefine((s, ctx) => {
    const sorted = [...s.standings].sort((a, b) => a.min - b.min);
    if (sorted[0].min !== 0) ctx.addIssue({ code: 'custom', path: ['standings'], message: 'Lowest band must start at 0' });
    for (let i = 1; i < sorted.length; i++) if (sorted[i].min !== sorted[i - 1].max) ctx.addIssue({ code: 'custom', path: ['standings'], message: `Bands must be contiguous: ${sorted[i - 1].name} ends at ${sorted[i - 1].max} but ${sorted[i].name} starts at ${sorted[i].min}` });
  });
  app.put('/api/config/scoreConfig', { preHandler: requireRole('procurement') }, async (req) => {
    const b = parse(scoreSchema, req.body);
    return act(req, async ({ db, log }) => {
      const cur = await getConfig<Doc>('scoreConfig', db);
      await setConfig('scoreConfig', { ...cur, ...b }, db);
      await log('scoreConfig', 'SCORECARD', 'Scorecard model updated');
      return { ...cur, ...b };
    });
  });

  app.get('/api/audit', { preHandler: requireInternal }, async (req) => {
    const q = parse(z.object({ entity: z.string().optional(), refId: z.string().optional(), limit: z.coerce.number().int().min(1).max(500).default(100) }), req.query);
    const conds: string[] = []; const p: unknown[] = [];
    if (q.entity) { p.push(q.entity); conds.push(`entity = $${p.length}`); }
    if (q.refId) { p.push(q.refId); conds.push(`ref_id = $${p.length}`); }
    p.push(q.limit);
    const r = await pool.query(`SELECT at, by_user AS by, entity, ref_id AS "refId", action, detail FROM audit_log ${conds.length ? `WHERE ${conds.join(' AND ')}` : ''} ORDER BY at DESC, id DESC LIMIT $${p.length}`, p);
    return r.rows;
  });

  app.get('/api/meta', { preHandler: authenticate }, async () => ({ today: today(), version: '0.1.0' }));
}
