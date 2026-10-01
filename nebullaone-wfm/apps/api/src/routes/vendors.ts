import { applies, poReceiptStatus } from '@nebulla/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, canActOnStage, requireInternal, requireRole } from '../auth';
import { badRequest, conflict, forbidden, get, insert, list, mutate, save } from '../repo';
import { settingsOf, syncComplianceHolds } from '../services/rules';
import { act, isoDate, nowISO, params, parse } from './helpers';

type Doc = Record<string, any>;

const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN = /^[A-Z]{5}\d{4}[A-Z]$/;
const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/** GSTIN state code → state (first two digits). */
const GST_STATES: Record<string, string> = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
  '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand',
  '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat', '27': 'Maharashtra', '29': 'Karnataka',
  '30': 'Goa', '32': 'Kerala', '33': 'Tamil Nadu', '36': 'Telangana', '37': 'Andhra Pradesh',
};

const bank = z.object({
  bank: z.string().min(1), holder: z.string().min(1), account: z.string().regex(/^\d{9,18}$/, 'account number must be 9–18 digits'),
  reAccount: z.string().optional(), ifsc: z.string().regex(IFSC, 'invalid IFSC'), type: z.string().optional(), currency: z.string().default('INR'), branch: z.string().optional(),
});

const registration = z.object({
  name: z.string().min(2),
  legalName: z.string().optional(),
  type: z.enum(['Goods', 'Services', 'Labor']),
  isContractor: z.boolean().default(false),
  categories: z.array(z.string()).min(1, 'pick at least one trade / category'),
  country: z.string().default('India'),
  gstin: z.string().optional().default(''),
  pan: z.string().optional().default(''),
  supplierType: z.enum(['Company', 'Individual', 'HUF', 'Firm']).default('Company'),
  paymentTerms: z.string().default('Net 30'),
  currency: z.string().default('INR'),
  contact: z.object({ name: z.string().min(1), email: z.string().email(), phone: z.string().optional() }),
  address: z.string().optional(), city: z.string().optional(), state: z.string().optional(), pin: z.string().optional(),
  tier: z.string().default('Approved'),
  regTier: z.enum(['Prospective', 'Spend Authorized']).default('Spend Authorized'),
  group: z.string().optional(),
  msmeType: z.string().optional(), udyam: z.string().optional(),
  creditLimit: z.coerce.number().nonnegative().optional(),
  bankAccounts: z.array(bank).default([]),
  noteToApprover: z.string().optional(),
  allowBillWithoutPO: z.boolean().default(false),
  allowBillWithoutReceipt: z.boolean().default(false),
  contractor: z.record(z.any()).optional(),
  extra: z.record(z.any()).optional(),
}).superRefine((v, ctx) => {
  if (v.country === 'India') {
    if (!GSTIN.test(v.gstin ?? '')) ctx.addIssue({ code: 'custom', path: ['gstin'], message: 'invalid GSTIN (15 characters, e.g. 27AAKCS4412M1Z3)' });
    if (!PAN.test(v.pan ?? '')) ctx.addIssue({ code: 'custom', path: ['pan'], message: 'invalid PAN (e.g. AAKCS4412M)' });
    if (GSTIN.test(v.gstin ?? '') && PAN.test(v.pan ?? '') && v.gstin!.slice(2, 12) !== v.pan)
      ctx.addIssue({ code: 'custom', path: ['pan'], message: 'PAN does not match characters 3–12 of the GSTIN' });
  }
  v.bankAccounts.forEach((b, i) => {
    if (b.reAccount !== undefined && b.reAccount !== b.account) ctx.addIssue({ code: 'custom', path: ['bankAccounts', i, 'reAccount'], message: 'account numbers do not match' });
  });
});

/** TDS section from vendor type (194Q goods; 194C 1% individual/HUF, 2% others). */
const tdsFor = (type: string, supplierType: string) => (type === 'Goods' ? '194Q' : ['Individual', 'HUF'].includes(supplierType) ? '194C-1' : '194C-2');

export async function vendorRoutes(app: FastifyInstance) {
  // Register (creates a Draft)
  app.post('/api/vendors', { preHandler: requireRole('procurement') }, async (req) => {
    const b = parse(registration, req.body);
    return act(req, async ({ db, by, log }) => {
      const settings = await settingsOf(db);
      const reqDocs = (settings.complianceDocs ?? []) as Doc[];
      const v = await insert('vendors', {
        ...b.extra,
        name: b.name, legalName: b.legalName || b.name, type: b.type, isContractor: b.isContractor, categories: b.categories,
        tier: b.tier, regTier: b.regTier, status: 'Draft', preferred: false, currency: b.currency, paymentTerms: b.paymentTerms,
        tds: tdsFor(b.type, b.supplierType), supplierType: b.supplierType, group: b.group ?? '', parentCompany: '',
        gstin: b.gstin, pan: b.pan, country: b.country, contact: b.contact, address: b.address ?? '', city: b.city ?? '',
        state: b.state || GST_STATES[b.gstin?.slice(0, 2) ?? ''] || '', pin: b.pin ?? '', msmeType: b.msmeType ?? 'Not MSME', udyam: b.udyam ?? '',
        creditLimit: b.creditLimit ?? null,
        bankAccounts: b.bankAccounts.map((x, i) => ({ id: i + 1, bank: x.bank, account: x.account, ifsc: x.ifsc, holder: x.holder, branch: x.branch ?? '', type: x.type ?? 'Current', currency: x.currency, isDefault: i === 0, status: 'Unverified' })),
        insurance: [], docs: reqDocs.map((d) => ({ name: d.name, status: 'Missing', expiry: null, file: null })),
        approval: { stages: [] }, qualification: null, background: null,
        contractor: b.isContractor ? { ...(b.contractor ?? {}) } : null,
        onboarding: b.isContractor ? { checklist: DEFAULT_MOBILISATION.map((item) => ({ item, done: false })), startedAt: null } : null,
        notes: b.noteToApprover ? [{ at: nowISO(), by, text: b.noteToApprover, kind: 'Note to approver' }] : [],
        portalUsers: [{ name: b.contact.name, email: b.contact.email, active: true, role: 'Admin', lastLogin: null }],
        allowBillWithoutPO: b.allowBillWithoutPO, allowBillWithoutReceipt: b.allowBillWithoutReceipt,
        changeRequest: null, equipment: [], createdAt: nowISO().slice(0, 10), createdBy: by,
      }, db);
      await log('vendors', v.id, 'Registered (draft)');
      return v;
    });
  });

  // Submit for approval
  app.post('/api/vendors/:id/submit', { preHandler: requireRole('procurement') }, async (req) => {
    const { id } = parse(params, req.params);
    return act(req, async ({ db, log }) => {
      const settings = await settingsOf(db);
      const v = await mutate('vendors', id, db, (v: Doc) => {
        if (!['Draft', 'Changes Requested'].includes(v.status)) throw conflict(`Vendor is ${v.status}; only drafts can be submitted`);
        if (settings.requireDocsOnSubmit) {
          const missing = (settings.complianceDocs ?? []).filter((d: Doc) => d.blocks && applies(d.applies, v as any))
            .filter((d: Doc) => !(v.docs ?? []).some((x: Doc) => x.name === d.name && x.file));
          if (missing.length) throw conflict(`Upload required documents first: ${missing.map((d: Doc) => d.name).join(', ')}`);
        }
        v.status = 'Pending Approval';
        v.submittedAt = nowISO();
        v.approval = { stages: (settings.vendorFlow ?? []).filter((s: Doc) => s.scope === 'All' || s.scope === v.type).map((s: Doc) => ({ dept: s.name, status: 'Pending', by: null, at: null, remark: '' })) };
      });
      await log('vendors', id, 'Submitted for approval');
      return v;
    });
  });

  // Approve / reject / return at the current stage
  const decision = z.object({ decision: z.enum(['Approve', 'Reject', 'Return']), remark: z.string().default('') });
  app.post('/api/vendors/:id/approval', { preHandler: requireInternal }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(decision, req.body);
    if (b.decision !== 'Approve' && !b.remark.trim()) throw badRequest('Give a reason when rejecting or returning');
    return act(req, async ({ db, user, by, log }) => {
      const v = await mutate('vendors', id, db, (v: Doc) => {
        if (v.status !== 'Pending Approval') throw conflict('Vendor is not awaiting approval');
        const stage = (v.approval?.stages ?? []).find((s: Doc) => s.status === 'Pending');
        if (!stage) throw conflict('No pending approval stage');
        if (!canActOnStage(user, stage.dept)) throw forbidden(`Waiting for ${stage.dept}`);
        stage.status = b.decision === 'Approve' ? 'Approved' : b.decision === 'Reject' ? 'Rejected' : 'Returned';
        stage.by = by; stage.at = nowISO(); stage.remark = b.remark;
        if (b.decision === 'Reject') v.status = 'Rejected';
        else if (b.decision === 'Return') v.status = 'Changes Requested';
        else if (v.approval.stages.every((s: Doc) => s.status === 'Approved')) { v.status = 'Active'; v.approvedOn = nowISO().slice(0, 10); }
      });
      await log('vendors', id, `Approval: ${b.decision}`, { remark: b.remark });
      if (v.status === 'Active') await syncComplianceHolds(db, by);
      return v;
    });
  });

  // Upload / replace a compliance document (metadata; file storage is external)
  const docBody = z.object({ name: z.string().min(1), expiry: isoDate.nullable().optional(), file: z.string().min(1) });
  app.post('/api/vendors/:id/docs', { preHandler: authenticate }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(docBody, req.body);
    if (req.user.role === 'vendor' ? req.user.vendorId !== id : !['admin', 'procurement'].includes(req.user.role)) throw forbidden();
    return act(req, async ({ db, by, log }) => {
      const v = await mutate('vendors', id, db, (v: Doc) => {
        const docs = (v.docs ?? []).filter((d: Doc) => d.name !== b.name);
        docs.push({ name: b.name, status: 'Pending', expiry: b.expiry ?? null, file: b.file, uploadedAt: nowISO().slice(0, 10), uploadedBy: by });
        v.docs = docs;
      });
      await log('vendors', id, `Document uploaded: ${b.name}`);
      await syncComplianceHolds(db, by);
      return v;
    });
  });

  const verifyDoc = z.object({ name: z.string(), decision: z.enum(['Verified', 'Rejected']), remark: z.string().default('') });
  app.post('/api/vendors/:id/docs/verify', { preHandler: requireRole('procurement', 'legal') }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(verifyDoc, req.body);
    return act(req, async ({ db, by, log }) => {
      const v = await mutate('vendors', id, db, (v: Doc) => {
        const d = (v.docs ?? []).find((x: Doc) => x.name === b.name);
        if (!d || !d.file) throw conflict(`${b.name} has not been uploaded`);
        d.status = b.decision; d.verifiedBy = by; d.verifiedAt = nowISO().slice(0, 10); d.remark = b.remark;
      });
      await log('vendors', id, `Document ${b.decision.toLowerCase()}: ${b.name}`, { remark: b.remark });
      await syncComplianceHolds(db, by);
      return v;
    });
  });

  const insBody = z.object({ type: z.string().min(1), policy: z.string().min(1), insurer: z.string().min(1), cover: z.coerce.number().positive(), expiry: isoDate });
  app.post('/api/vendors/:id/insurance', { preHandler: authenticate }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(insBody, req.body);
    if (req.user.role === 'vendor' ? req.user.vendorId !== id : !['admin', 'procurement'].includes(req.user.role)) throw forbidden();
    return act(req, async ({ db, by, log }) => {
      const v = await mutate('vendors', id, db, (v: Doc) => {
        v.insurance = [...(v.insurance ?? []), { ...b, status: req.user.role === 'vendor' ? 'Pending' : 'Verified', addedBy: by, addedAt: nowISO() }];
      });
      await log('vendors', id, `Insurance added: ${b.type} ${b.policy}`);
      await syncComplianceHolds(db, by);
      return v;
    });
  });

  // Bank account verification (penny drop recorded by finance)
  const bankVerify = z.object({ bankId: z.coerce.number(), method: z.string().default('Penny drop — name matched'), nameMatched: z.boolean() });
  app.post('/api/vendors/:id/bank/verify', { preHandler: requireRole('finance') }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(bankVerify, req.body);
    return act(req, async ({ db, by, log }) => {
      const v = await mutate('vendors', id, db, (v: Doc) => {
        const acct = (v.bankAccounts ?? []).find((a: Doc) => a.id === b.bankId);
        if (!acct) throw conflict('Bank account not found');
        acct.status = b.nameMatched ? 'Verified' : 'Failed'; acct.method = b.method; acct.verifiedBy = by; acct.verifiedAt = nowISO().slice(0, 10);
      });
      await log('vendors', id, `Bank account ${b.nameMatched ? 'verified' : 'failed verification'}`);
      return v;
    });
  });

  // Qualification result (stage 02)
  const qual = z.object({ ruleSet: z.string().min(1), score: z.coerce.number().min(0).max(100), answers: z.record(z.any()).default({}), exceptions: z.string().default(''), decision: z.enum(['Qualified', 'Conditionally Qualified', 'Rejected', 'Requalification Required']), expiry: isoDate.optional() });
  app.post('/api/vendors/:id/qualification', { preHandler: requireRole('procurement') }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(qual, req.body);
    return act(req, async ({ db, by, log }) => {
      const v = await mutate('vendors', id, db, (v: Doc) => { v.qualification = { ...b, at: nowISO().slice(0, 10), by }; });
      await log('vendors', id, `Qualification: ${b.decision} (${b.score})`);
      return v;
    });
  });

  // Mobilisation checklist (stage 09)
  const check = z.object({ index: z.coerce.number().int().min(0), done: z.boolean() });
  app.post('/api/vendors/:id/onboarding', { preHandler: requireRole('project', 'procurement') }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(check, req.body);
    return act(req, async ({ db, log }) => {
      const v = await mutate('vendors', id, db, (v: Doc) => {
        if (!v.isContractor) throw conflict('Only contractors have a mobilisation checklist');
        v.onboarding ??= { checklist: DEFAULT_MOBILISATION.map((item) => ({ item, done: false })), startedAt: null };
        const it = v.onboarding.checklist[b.index];
        if (!it) throw badRequest('No such checklist item');
        it.done = b.done;
        v.onboarding.startedAt ??= nowISO().slice(0, 10);
      });
      await log('vendors', id, `Mobilisation checklist ${b.done ? 'ticked' : 'unticked'}: #${b.index + 1}`);
      return v;
    });
  });

  // Blacklist → permanent hold with scope All (stage 29)
  const reason = z.object({ reason: z.string().min(5, 'give a reason (at least 5 characters)') });
  app.post('/api/vendors/:id/blacklist', { preHandler: requireRole('procurement', 'legal') }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(reason, req.body);
    return act(req, async ({ db, by, log }) => {
      const v = await mutate('vendors', id, db, (v: Doc) => { v.status = 'Blacklisted'; });
      await insert('holds', { level: 'Vendor', vendorId: id, refId: null, scope: 'All', reason: 'Manual', detail: `Blacklisted — ${b.reason}`, source: 'Vendor Registry', raisedBy: by, raisedAt: nowISO(), status: 'Active', permanent: true }, db);
      await log('vendors', id, 'Blacklisted', b);
      return v;
    });
  });

  app.post('/api/vendors/:id/deactivate', { preHandler: requireRole('procurement') }, async (req) => {
    const { id } = parse(params, req.params);
    return act(req, async ({ db, log }) => {
      const open = await list('purchaseOrders', { db, where: { vendor_id: id } });
      if (open.some((p) => !['Closed', 'Cancelled', 'Received'].includes(poReceiptStatus(p)))) throw conflict('Vendor has open purchase orders — receive, close or cancel them first');
      const v = await mutate('vendors', id, db, (v: Doc) => { v.status = 'Inactive'; });
      await log('vendors', id, 'Deactivated');
      return v;
    });
  });

  app.post('/api/vendors/:id/preferred', { preHandler: requireRole('procurement') }, async (req) => {
    const { id } = parse(params, req.params);
    return act(req, async ({ db, log }) => {
      const v = await mutate('vendors', id, db, (v: Doc) => { v.preferred = !v.preferred; });
      await log('vendors', id, v.preferred ? 'Marked preferred' : 'Unmarked preferred');
      return v;
    });
  });

  // Invitations
  const invite = z.object({ name: z.string().min(2), email: z.string().email(), category: z.string().min(1) });
  app.post('/api/invites', { preHandler: requireRole('procurement') }, async (req) => {
    const b = parse(invite, req.body);
    return act(req, async ({ db, by, log }) => {
      const existing = await list('invites', { db });
      if (existing.some((i) => i.email.toLowerCase() === b.email.toLowerCase() && i.status === 'Invited')) throw conflict('An invitation to this email is already open');
      const i = await insert('invites', { ...b, sentOn: nowISO().slice(0, 10), status: 'Invited', vendorId: null, by }, db);
      await log('invites', i.id, `Invitation sent to ${b.email}`);
      return i;
    });
  });

  app.post('/api/compliance/sync', { preHandler: requireInternal }, async (req) =>
    act(req, async ({ db, by }) => syncComplianceHolds(db, by)));

  // Change a vendor's editable master data (not status/approval)
  app.patch('/api/vendors/:id', { preHandler: requireRole('procurement') }, async (req) => {
    const { id } = parse(params, req.params);
    const patch = { ...(req.body as Doc) };
    for (const k of ['id', 'status', 'approval', 'docs', 'insurance', 'bankAccounts', 'qualification', 'createdAt']) delete patch[k];
    return act(req, async ({ db, log }) => {
      const cur = await get('vendors', id, db, true);
      const next = await save('vendors', { ...cur, ...patch, id }, db);
      await log('vendors', id, 'Master data updated', { fields: Object.keys(patch) });
      return next;
    });
  });
}

export const DEFAULT_MOBILISATION = [
  'KYC & statutory documents verified',
  'Labour licence & PF/ESI registrations checked',
  'Workmen compensation / CAR insurance in force',
  'Site safety induction completed for supervisors',
  'Worker gate passes issued',
  'Equipment fitness certificates checked',
  'Mobilisation advance BG received (if advance paid)',
];
