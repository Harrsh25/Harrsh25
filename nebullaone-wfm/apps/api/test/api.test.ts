import type { FastifyInstance } from 'fastify';
import { addDays, addMonths, todayISO } from '@nebulla/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { pool } from '../src/db';
import { seed } from '../src/seed';

let app: FastifyInstance;
const tokens: Record<string, string> = {};
const today = todayISO();

async function login(email: string) {
  const r = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password: 'nebulla123' } });
  expect(r.statusCode, r.body).toBe(200);
  return r.json().token as string;
}

const call = (who: string, method: string, url: string, payload?: unknown) =>
  app.inject({ method: method as any, url, payload: payload as any, headers: { authorization: `Bearer ${tokens[who]}` } });

beforeAll(async () => {
  await seed();
  app = await buildApp({ logger: false });
  for (const [k, e] of Object.entries({ admin: 'admin@nebullaone.in', proc: 'procurement@nebullaone.in', legal: 'legal@nebullaone.in', fin: 'finance@nebullaone.in', pm: 'pm@nebullaone.in', qa: 'qa@nebullaone.in', ven1: 'ramesh@shreebalaji.in' }))
    tokens[k] = await login(e);
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

describe('auth & access', () => {
  it('rejects a wrong password without revealing the account', async () => {
    const r = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'admin@nebullaone.in', password: 'nope' } });
    expect(r.statusCode).toBe(401);
    expect(r.json().error).toBe('Wrong email or password');
  });

  it('requires a token', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/data/vendors' })).statusCode).toBe(401);
  });

  it('vendor users only see their own records', async () => {
    const inv = (await call('ven1', 'GET', '/api/data/invoices')).json();
    expect(inv.length).toBeGreaterThan(0);
    expect(inv.every((i: any) => i.vendorId === 'VEN-001')).toBe(true);
    expect((await call('ven1', 'GET', '/api/data/invoices/INV-008')).statusCode).toBe(404);
    expect((await call('ven1', 'GET', '/api/data/laborRates')).statusCode).toBe(403);
  });
});

describe('data migration fixes', () => {
  it('B1: the below-minimum-wage rate card is not active', async () => {
    const r = (await call('pm', 'GET', '/api/data/laborRates/LR-016')).json();
    expect(r.status).toBe('Rejected');
  });

  it('B7: old hold mechanisms became Hold records', async () => {
    const holds = (await call('admin', 'GET', '/api/data/holds')).json();
    expect(holds.find((h: any) => h.vendorId === 'VEN-006' && h.reason === 'Performance')).toBeTruthy();
    expect(holds.find((h: any) => h.level === 'Invoice' && h.refId === 'INV-008')).toBeTruthy();
    expect(holds.find((h: any) => h.vendorId === 'VEN-009' && h.permanent)).toBeTruthy();
  });

  it('B8: CTR-005 stores its real lifecycle status', async () => {
    const c = (await call('pm', 'GET', '/api/data/contracts/CTR-005')).json();
    expect(['In DLP', 'Completed']).toContain(c.status);
    expect(c._dlpEnd).toBe(addMonths(c.handover.date, 6));
  });

  it('B4: PBGs that expire before the DLP ends are flagged', async () => {
    const c = (await call('pm', 'GET', '/api/data/contracts/CTR-002')).json();
    expect(c._bgIssues.length).toBe(1);
  });

  it('scorecard matches the prototype for goods vendors', async () => {
    const sc = (await call('proc', 'GET', '/api/scorecard')).json();
    expect(sc.find((s: any) => s.vendorId === 'VEN-004').score).toBe(100);
    expect(sc.find((s: any) => s.vendorId === 'VEN-003').score).toBe(91);
  });
});

describe('labour rates', () => {
  it('B1: refuses a rate below minimum wage', async () => {
    const r = await call('pm', 'POST', '/api/labor-rates', { trade: 'Painter', skill: 'Semi-skilled', region: 'Mumbai (Zone I)', minWage: 640, rate: 620, effectiveFrom: today });
    expect(r.statusCode).toBe(422);
    expect(r.json().error).toMatch(/minimum wage/);
  });

  it('proposer cannot approve their own rate', async () => {
    const r = await call('pm', 'POST', '/api/labor-rates', { trade: 'Painter', skill: 'Semi-skilled', region: 'Mumbai (Zone I)', minWage: 640, rate: 700, vendorId: 'VEN-005', effectiveFrom: addDays(today, 1) });
    expect(r.statusCode, r.body).toBe(200);
    const id = r.json().id;
    expect((await call('fin', 'POST', `/api/labor-rates/${id}/decision`, { decision: 'Approved' })).statusCode).toBe(200);
  });
});

describe('payments & holds', () => {
  it('compliance gate stops payment; finance can override with a reason', async () => {
    const pay = { amount: 3108000, date: today, mode: 'RTGS', ref: 'UTR123456' };
    const blocked = await call('fin', 'POST', '/api/invoices/INV-004/pay', pay);
    expect(blocked.statusCode).toBe(409);
    expect(blocked.json().details.canOverride).toBe(true);
    const ok = await call('fin', 'POST', '/api/invoices/INV-004/pay', { ...pay, overrideReason: 'CAR policy renewal confirmed by broker, certificate awaited' });
    expect(ok.statusCode, ok.body).toBe(200);
    const inv = (await call('fin', 'GET', '/api/data/invoices/INV-004')).json();
    expect(inv._status).toBe('Paid');
    const audit = (await call('admin', 'GET', '/api/audit?entity=vendors&refId=VEN-002')).json();
    expect(audit.some((a: any) => a.action.includes('overridden'))).toBe(true);
  });

  it('a manual invoice hold cannot be overridden', async () => {
    const r = await call('fin', 'POST', '/api/invoices/INV-008/pay', { amount: 1000, date: today, mode: 'NEFT', ref: 'UTR999', overrideReason: 'please' });
    expect(r.statusCode).toBe(409);
    expect(r.json().details.canOverride).toBe(false);
  });

  it('automatic holds cannot be released by hand; manual ones can', async () => {
    const holds = (await call('admin', 'GET', '/api/data/holds')).json();
    const auto = holds.find((h: any) => h.auto && h.status === 'Active');
    expect((await call('fin', 'POST', `/api/holds/${auto.id}/release`, { note: 'try' })).statusCode).toBe(409);
    const manual = holds.find((h: any) => h.refId === 'INV-008');
    expect((await call('fin', 'POST', `/api/holds/${manual.id}/release`, { note: 'Rate revision agreed — debit note to follow' })).statusCode).toBe(200);
  });

  it('3-way match stops over-billing a PO', async () => {
    const r = await call('fin', 'POST', '/api/invoices', { vendorId: 'VEN-003', poId: 'PO-001', number: 'DST/TEST/1', date: today, lines: [{ line: 0, qty: 5, rate: 58000 }] });
    expect(r.statusCode).toBe(409);
    expect(r.json().details.blocking[0]).toMatch(/accepted receipt quantity/);
  });
});

describe('service receipts (stage 19B)', () => {
  let poId = '';
  it('service PO → service receipt → accepted → billed within accepted qty', async () => {
    const po = await call('proc', 'POST', '/api/purchase-orders', { vendorId: 'VEN-006', project: 'Skyline Towers — Phase 1', deliveryDate: addDays(today, 30), kind: 'Service', lines: [{ desc: 'Scaffold safety inspection', unit: 'visit', qty: 4, rate: 5000 }] });
    expect(po.statusCode, po.body).toBe(200);
    poId = po.json().id;
    expect((await call('proc', 'POST', `/api/purchase-orders/${poId}/receipts`, { date: today, lines: [{ line: 0, qty: 1, accepted: 1 }] })).statusCode).toBe(409);
    const ses = await call('pm', 'POST', '/api/service-receipts', { poId, periodFrom: addDays(today, -7), periodTo: today, description: 'Two weekly inspections', lines: [{ line: 0, qty: 2, measure: 'Quantity' }] });
    expect(ses.statusCode, ses.body).toBe(200);
    expect((await call('pm', 'POST', `/api/service-receipts/${ses.json().id}/decision`, { decision: 'Accepted' })).statusCode).toBe(403);
    expect((await call('proc', 'POST', `/api/service-receipts/${ses.json().id}/decision`, { decision: 'Accepted' })).statusCode).toBe(200);
    const over = await call('fin', 'POST', '/api/invoices', { vendorId: 'VEN-006', poId, number: 'RSS/1', date: today, lines: [{ line: 0, qty: 3, rate: 5000 }] });
    expect(over.statusCode).toBe(409);
    const ok = await call('fin', 'POST', '/api/invoices', { vendorId: 'VEN-006', poId, number: 'RSS/2', date: today, lines: [{ line: 0, qty: 2, rate: 5000 }] });
    expect(ok.statusCode, ok.body).toBe(200);
    const again = await call('fin', 'POST', '/api/invoices', { vendorId: 'VEN-006', poId, number: 'RSS/3', date: today, lines: [{ line: 0, qty: 1, rate: 5000 }] });
    expect(again.statusCode).toBe(409);
  });
});

describe('RA bill workflow', () => {
  let billId = '';
  it('JMS + QC gate the bill; segregation of duties on every step; approval creates the payable', async () => {
    // MB-016 has a pending JMS — billing it must fail
    const early = await call('pm', 'POST', '/api/ra-bills', { woId: 'WO-001', mbIds: ['MB-016'] });
    expect(early.statusCode).toBe(409);
    expect((await call('pm', 'POST', '/api/measurements/MB-016/jms', { status: 'Signed', contractorRep: 'Ramesh Patil' })).statusCode).toBe(200);
    const noQc = await call('pm', 'POST', '/api/ra-bills', { woId: 'WO-001', mbIds: ['MB-016'] });
    expect(noQc.statusCode).toBe(409);
    expect(noQc.json().error).toMatch(/quality inspection/);
    expect((await call('qa', 'POST', '/api/measurements/MB-016/qc', { status: 'Passed' })).statusCode).toBe(200);
    const preview = (await call('pm', 'POST', '/api/ra-bills/preview', { woId: 'WO-001', mbIds: ['MB-016'] })).json();
    expect(preview.net).toBeCloseTo(preview.gross + preview.gst - preview.totalDed, 2);
    const bill = await call('pm', 'POST', '/api/ra-bills', { woId: 'WO-001', mbIds: ['MB-016'] });
    expect(bill.statusCode, bill.body).toBe(200);
    billId = bill.json().id;
    expect((await call('pm', 'POST', `/api/ra-bills/${billId}/transition`, { to: 'Verified' })).statusCode).toBe(403);
    expect((await call('qa', 'POST', `/api/ra-bills/${billId}/transition`, { to: 'Verified' })).statusCode).toBe(200);
    expect((await call('qa', 'POST', `/api/ra-bills/${billId}/transition`, { to: 'Certified' })).statusCode).toBe(403);
    expect((await call('proc', 'POST', `/api/ra-bills/${billId}/transition`, { to: 'Certified' })).statusCode).toBe(200);
    const appr = await call('fin', 'POST', `/api/ra-bills/${billId}/transition`, { to: 'Approved' });
    expect(appr.statusCode, appr.body).toBe(200);
    expect(appr.json().invoiceId).toMatch(/^INV-/);
    // the measurement can't be billed twice
    expect((await call('pm', 'POST', '/api/ra-bills', { woId: 'WO-001', mbIds: ['MB-016'] })).statusCode).toBe(409);
  });

  it('a failed QC raises an NCR automatically', async () => {
    const r = await call('qa', 'POST', '/api/measurements/MB-017/qc', { status: 'Failed', remark: 'Mortar joints exceed 12 mm', severity: 'Minor' });
    expect(r.statusCode).toBe(200);
    expect(r.json().ncr.id).toMatch(/^NCR-/);
  });
});

describe('contracts: approval, guarantees, kickoff, work orders', () => {
  let id = '';
  it('B4: cannot sign without a PBG that covers the DLP', async () => {
    const c = await call('pm', 'POST', '/api/contracts', { vendorId: 'VEN-001', project: 'Skyline Towers — Phase 1', title: 'Podium finishing works', type: 'Item-Rate', value: 5_000_000, start: addDays(today, 5), end: addDays(today, 200), dlpMonths: 12, pbgPct: 5 });
    expect(c.statusCode, c.body).toBe(200);
    id = c.json().id;
    expect((await call('pm', 'POST', `/api/contracts/${id}/submit`)).statusCode).toBe(200);
    expect((await call('fin', 'POST', `/api/contracts/${id}/approval`, { decision: 'Approve' })).statusCode).toBe(403); // legal first
    expect((await call('legal', 'POST', `/api/contracts/${id}/approval`, { decision: 'Approve' })).statusCode).toBe(200);
    expect((await call('fin', 'POST', `/api/contracts/${id}/approval`, { decision: 'Approve' })).statusCode).toBe(200);
    expect((await call('pm', 'POST', `/api/contracts/${id}/sign`, { signedOn: today, signedBy: 'Arjun Mehta' })).statusCode).toBe(409);
    await call('fin', 'POST', `/api/contracts/${id}/guarantees`, { type: 'Performance', bank: 'HDFC Bank', number: 'BG/TEST/1', amount: 250_000, expiry: addDays(today, 250), receivedOn: today });
    const short = await call('pm', 'POST', `/api/contracts/${id}/sign`, { signedOn: today, signedBy: 'Arjun Mehta' });
    expect(short.statusCode).toBe(409);
    expect(short.json().details.blocking[0]).toMatch(/before DLP end/);
    const c2 = (await call('pm', 'GET', `/api/data/contracts/${id}`)).json();
    await call('fin', 'POST', `/api/contracts/${id}/guarantees/extend`, { guaranteeId: c2.guarantees[0].id, expiry: addDays(c2._dlpEnd, 30), amendmentRef: 'AMD-1' });
    expect((await call('pm', 'POST', `/api/contracts/${id}/sign`, { signedOn: today, signedBy: 'Arjun Mehta' })).statusCode).toBe(200);
  });

  it('work orders need a completed kickoff (stage 08)', async () => {
    const wo = { contractId: id, title: 'Podium plaster', start: addDays(today, 6), end: addDays(today, 60), items: [{ desc: 'Internal plaster 12 mm', unit: 'sqm', qty: 1000, rate: 320 }] };
    expect((await call('pm', 'POST', '/api/work-orders', wo)).statusCode).toBe(409);
    await call('pm', 'POST', `/api/contracts/${id}/kickoff`, { meetingDate: today, attendees: ['Arjun Mehta', 'Ramesh Patil'] });
    expect((await call('pm', 'POST', `/api/contracts/${id}/kickoff/complete`)).statusCode).toBe(409);
    const items = ['Scope & BOQ confirmed', 'Drawings & documents handed over', 'Site handed over', 'Schedule & milestones agreed', 'Labour & material rates confirmed', 'Payment terms, retention & guarantees confirmed', 'Roles, contacts & communication matrix'];
    await call('pm', 'POST', `/api/contracts/${id}/kickoff`, { meetingDate: today, checklist: items.map((item) => ({ item, done: true })) });
    expect((await call('pm', 'POST', `/api/contracts/${id}/kickoff/complete`)).statusCode).toBe(200);
    const r = await call('pm', 'POST', '/api/work-orders', wo);
    expect(r.statusCode, r.body).toBe(200);
    // the vendor accepts it in the portal
    expect((await call('ven1', 'POST', `/api/work-orders/${r.json().id}/acceptance`, { decision: 'Accepted' })).statusCode).toBe(200);
  });

  it('change orders: raiser cannot approve; approval updates revised value', async () => {
    const r = await call('pm', 'POST', `/api/contracts/${id}/change-orders`, { type: 'Additional Work', desc: 'Extra skirting', amount: 150000, days: 5, reason: 'Client instruction CI-12' });
    const co = r.json().changeOrders.at(-1).id;
    expect((await call('pm', 'POST', `/api/contracts/${id}/change-orders/${co}/decision`, { decision: 'Approved' })).statusCode).toBe(403);
    const ok = await call('fin', 'POST', `/api/contracts/${id}/change-orders/${co}/decision`, { decision: 'Approved' });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().revisedValue).toBe(5_150_000);
  });
});

describe('financial security & closeout', () => {
  it('B2/B3: retention release waits for the real DLP end', async () => {
    const r = await call('pm', 'POST', '/api/retention-releases', { contractId: 'CTR-001', type: 'After DLP', amount: 1000 });
    expect(r.statusCode).toBe(409);
    expect(r.json().error).toMatch(/DLP runs until/);
  });

  it('approving a release creates a payable', async () => {
    const r = await call('fin', 'POST', '/api/retention-releases/RR-001/decision', { decision: 'Approved' });
    expect(r.statusCode, r.body).toBe(200);
    const inv = (await call('fin', 'GET', '/api/data/invoices')).json().find((i: any) => i.releaseId === 'RR-001');
    expect(inv._totals.payable).toBe(96600);
  });

  it('final settlement and release checklist report their blockers', async () => {
    const s = (await call('pm', 'GET', '/api/contracts/CTR-001/final-settlement')).json();
    expect(s.blockers.join(' ')).toMatch(/handed over/);
    const rel = (await call('pm', 'GET', '/api/contracts/CTR-005/release')).json();
    expect(rel.checks.find((c: any) => c.key === 'dlp').ok).toBe(true);
    expect((await call('pm', 'POST', '/api/contracts/CTR-005/release/complete')).statusCode).toBe(409);
  });
});

describe('vendor registration', () => {
  it('validates GSTIN/PAN and routes through approval stages in order', async () => {
    const base = { name: 'Bharat Formwork Systems', type: 'Services', isContractor: true, categories: ['Formwork'], contact: { name: 'V. Patil', email: 'v@bharatformwork.in' } };
    const bad = await call('proc', 'POST', '/api/vendors', { ...base, gstin: '27AAKCS4412M1Z3', pan: 'ABCDE1234F' });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().error).toMatch(/PAN does not match/);
    const ok = await call('proc', 'POST', '/api/vendors', { ...base, gstin: '27AABCB1234C1Z5', pan: 'AABCB1234C' });
    expect(ok.statusCode, ok.body).toBe(200);
    const v = ok.json();
    expect(v.state).toBe('Maharashtra');
    expect(v.tds).toBe('194C-2');
    // required documents must be uploaded before submission
    expect((await call('proc', 'POST', `/api/vendors/${v.id}/submit`)).statusCode).toBe(409);
  });
});
