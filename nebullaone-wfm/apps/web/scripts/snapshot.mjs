/**
 * Captures a read-only snapshot of every API response the screens use, for the
 * single-file demo build (npm run build:demo). Needs the API running and seeded.
 *   API_URL=http://localhost:4000 node scripts/snapshot.mjs
 */
import { writeFileSync } from 'node:fs';
const API = process.env.API_URL ?? 'http://localhost:4000';
const ENTITIES = ['vendors', 'invites', 'holds', 'contracts', 'workOrders', 'measurements', 'raBills', 'claims', 'retentionReleases', 'invoices', 'vendorAdvances', 'requisitions', 'rfqs', 'blanketOrders', 'purchaseOrders', 'serviceReceipts', 'vendorPrices', 'laborRates', 'ratings', 'caps', 'tickets', 'workers', 'attendance', 'ncrs', 'punchItems', 'inspections', 'materialIssues', 'dprs', 'safetyIncidents', 'kickoffs', 'finalSettlements', 'contractorReleases'];

const login = await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'admin@nebullaone.in', password: process.env.SEED_PASSWORD ?? 'nebulla123' }) }).then((r) => r.json());
const get = async (p) => { const r = await fetch(`${API}/api${p}`, { headers: { authorization: `Bearer ${login.token}` } }); if (!r.ok) throw new Error(`${p} → ${r.status}`); return r.json(); };

const snap = { takenAt: new Date().toISOString(), data: {}, get: {} };
for (const e of ENTITIES) snap.data[e] = await get(`/data/${e}`);
for (const k of ['settings', 'scoreConfig', 'rfqTemplates', 'wbsBudgets']) snap.get[`/config/${k}`] = await get(`/config/${k}`);
snap.get['/scorecard'] = await get('/scorecard');
snap.get['/audit'] = await get('/audit?limit=500');
for (const c of snap.data.contracts) {
  snap.get[`/contracts/${c.id}/final-settlement`] = await get(`/contracts/${c.id}/final-settlement`);
  snap.get[`/contracts/${c.id}/release`] = await get(`/contracts/${c.id}/release`);
}
for (const v of snap.data.vendors) snap.get[`/portal/rfqs?vendorId=${v.id}`] = await get(`/portal/rfqs?vendorId=${v.id}`);
snap.users = await get('/users');
writeFileSync(new URL('../src/demo/snapshot.json', import.meta.url), JSON.stringify(snap));
console.log(`Snapshot: ${ENTITIES.length} collections, ${Object.keys(snap.get).length} views, ${snap.users.length} users`);
