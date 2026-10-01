/**
 * Loads the prototype's demo data (seed/prototype-store.json) into PostgreSQL.
 *
 * - Dates are shifted so the demo stays current: the prototype data was
 *   generated relative to 2026-09-30, so every date moves by (today − that day).
 * - The three old hold mechanisms (vendor.hold, invoice.hold, compliance gate)
 *   become Hold records.
 * - Data-level bug fixes are applied (see docs/BUGS.md).
 * - Demo users are created for every role, plus portal users for vendors.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addMonths, contractPhase, daysBetween, todayISO, validateLabourRate } from '@nebulla/shared';
import { config } from './config';
import { pool, tx } from './db';
import { hashPassword } from './auth';
import { ENTITIES } from './entities';
import { migrate } from './migrate';
import { insert, setConfig } from './repo';
import { syncComplianceHolds } from './services/rules';

type Doc = Record<string, any>;

const PROTOTYPE_BASE_DATE = '2026-09-30';
const ISO = /^\d{4}-\d{2}-\d{2}(T[\d:.]+Z)?$/;

function shiftDates<T>(value: T, days: number): T {
  if (!days) return value;
  if (typeof value === 'string' && ISO.test(value)) {
    const d = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
    d.setUTCDate(d.getUTCDate() + days);
    return (value.length === 10 ? d.toISOString().slice(0, 10) : d.toISOString()) as T;
  }
  if (Array.isArray(value)) return value.map((v) => shiftDates(v, days)) as T;
  if (value && typeof value === 'object') {
    const o: Doc = {};
    for (const [k, v] of Object.entries(value)) o[k] = shiftDates(v, days);
    return o as T;
  }
  return value;
}

export const DEMO_USERS = [
  { email: 'admin@nebullaone.in', name: 'Asha Rao', role: 'admin' },
  { email: 'procurement@nebullaone.in', name: 'R. Kulkarni', role: 'procurement' },
  { email: 'legal@nebullaone.in', name: 'R. Deshpande', role: 'legal' },
  { email: 'finance@nebullaone.in', name: 'M. Shah', role: 'finance' },
  { email: 'pm@nebullaone.in', name: 'Arjun Mehta', role: 'project' },
  { email: 'qa@nebullaone.in', name: 'S. Kale', role: 'qa_hse' },
] as const;

const ORDER = [
  'vendors', 'invites', 'contracts', 'workOrders', 'measurements', 'raBills', 'claims', 'retentionReleases',
  'invoices', 'vendorAdvances', 'requisitions', 'rfqs', 'blanketOrders', 'purchaseOrders', 'vendorPrices',
  'laborRates', 'ratings', 'caps', 'tickets', 'workers', 'attendance', 'ncrs', 'punchItems', 'inspections',
  'materialIssues', 'dprs',
];

export async function resetDatabase(): Promise<void> {
  const tables = [...ENTITIES.map((e) => e.table), 'users', 'audit_log', 'app_config', 'id_counters'];
  await pool.query(`TRUNCATE ${tables.join(', ')} RESTART IDENTITY CASCADE`);
}

export async function seed(opts: { storePath?: string; today?: string } = {}): Promise<Record<string, number>> {
  await migrate();
  const storePath = opts.storePath ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'seed', 'prototype-store.json');
  const raw = JSON.parse(readFileSync(storePath, 'utf8'));
  const today = opts.today ?? todayISO();
  const store: Doc = shiftDates(raw, daysBetween(PROTOTYPE_BASE_DATE, today));
  const counts: Record<string, number> = {};

  await resetDatabase();
  await tx(async (db) => {
    await setConfig('settings', { ...store.settings, myRole: undefined }, db);
    await setConfig('scoreConfig', store.scoreConfig, db);
    await setConfig('rfqTemplates', store.rfqTemplates, db);
    await setConfig('wbsBudgets', store.wbsBudgets, db);

    const holds: Doc[] = [];
    // vendor.hold / Blacklisted status → Hold records; vendor status becomes the lifecycle status only.
    for (const v of store.vendors) {
      if (v.hold) {
        holds.push({
          level: 'Vendor', vendorId: v.id, refId: null, scope: v.hold.scope, reason: v.hold.auto ? 'Performance' : 'Manual',
          detail: v.hold.reason, source: v.hold.auto ? 'Vendor Scorecard' : 'Vendor Registry', raisedBy: 'Migrated from prototype',
          raisedAt: v.hold.placedAt, releaseDate: v.hold.until ?? null, status: 'Active', auto: false,
        });
        if (v.status === 'On Hold') v.status = 'Active';
      }
      if (v.status === 'Blacklisted')
        holds.push({
          level: 'Vendor', vendorId: v.id, refId: null, scope: 'All', reason: 'Manual', detail: 'Vendor blacklisted',
          source: 'Vendor Registry', raisedBy: 'Migrated from prototype', raisedAt: v.createdAt, status: 'Active', permanent: true,
        });
      delete v.hold;
    }
    for (const inv of store.invoices) {
      if (inv.hold)
        holds.push({
          level: 'Invoice', vendorId: inv.vendorId, refId: inv.id, scope: 'Payments', reason: 'Manual',
          detail: [inv.hold.reason, inv.hold.note].filter(Boolean).join(' — ') || 'Invoice on hold', source: 'Invoices & Payments', raisedBy: inv.hold.by ?? 'Migrated from prototype',
          raisedAt: inv.hold.at ?? inv.date, releaseDate: inv.hold.until ?? null, status: 'Active',
        });
      delete inv.hold;
    }

    // B1: a labour rate below minimum wage can never be Active.
    for (const r of store.laborRates) {
      const errs = validateLabourRate(r);
      if (r.status === 'Active' && errs.length) {
        r.status = 'Rejected';
        r.rejection = { reason: errs.join('; '), by: 'System — data migration', at: new Date().toISOString() };
      }
    }

    // B8: store the real lifecycle status on contracts.
    for (const c of store.contracts) {
      c.securityDepositPct ??= 0;
      c.status = contractPhase(c, today);
    }

    // RA bills: add the new security-deposit deduction line (0 for migrated bills).
    for (const b of store.raBills) b.ded = { securityDeposit: 0, ...b.ded };

    let attN = 0;
    for (const a of store.attendance) a.id = `ATT-${String(++attN).padStart(4, '0')}`;

    for (const name of ORDER) {
      for (const d of store[name] ?? []) await insert(name, d, db);
      counts[name] = (store[name] ?? []).length;
    }
    for (const h of holds) await insert('holds', h, db);
    counts.holds = holds.length;

    // Contracts already executing had their kickoff done — record it so the new stage has history.
    const KICKOFF_ITEMS = [
      'Scope & BOQ confirmed', 'Drawings & documents handed over', 'Site handed over', 'Schedule & milestones agreed',
      'Labour & material rates confirmed', 'Payment terms, retention & guarantees confirmed', 'Roles, contacts & communication matrix',
    ];
    let ko = 0;
    for (const c of store.contracts.filter((c: Doc) => !['Draft', 'Pending Approval'].includes(c.status))) {
      await insert('kickoffs', {
        contractId: c.id, status: 'Completed', meetingDate: c.signedOn ?? c.start, chairedBy: c.owner,
        attendees: [c.owner, 'Contractor representative'], checklist: KICKOFF_ITEMS.map((item) => ({ item, done: true, note: '' })),
        completedAt: c.signedOn ?? c.start, completedBy: c.owner,
      }, db);
      ko++;
    }
    counts.kickoffs = ko;

    // Demo safety records (the prototype had a CAP for scaffold safety but no incident register).
    const cap = store.caps.find((c: Doc) => c.vendorId === 'VEN-006');
    await insert('safetyIncidents', {
      vendorId: 'VEN-006', woId: 'WO-006', contractId: 'CTR-005', type: 'Unsafe Condition', severity: 'Major',
      date: addMonths(today, -1), location: 'Tower A core — scaffold L6', description: 'Toe boards and mid-rails missing on working platform',
      injured: 0, lostTimeInjury: false, immediateAction: 'Work stopped on the bay; platform barricaded', rootCause: 'Crew not trained on scaffold inspection tags',
      capId: cap?.id ?? null, reportedBy: 'HSE — Rohit S.', status: 'Action Pending', history: [],
    }, db);
    await insert('safetyIncidents', {
      vendorId: 'VEN-001', woId: 'WO-001', contractId: 'CTR-001', type: 'Near Miss', severity: 'Minor',
      date: addMonths(today, 0).slice(0, 8) + '02', location: 'Tower A — slab L3', description: 'Loose shuttering plank fell from L3 edge into exclusion zone',
      injured: 0, lostTimeInjury: false, immediateAction: 'Area cordoned; edge netting re-fixed', rootCause: 'Edge protection removed for concreting and not restored',
      capId: null, reportedBy: 'Site Engineer — A. Joshi', status: 'Closed', history: [],
    }, db);
    counts.safetyIncidents = 2;

    for (const a of store.audit ?? [])
      await db.query('INSERT INTO audit_log (at, by_user, entity, ref_id, action) VALUES ($1,$2,$3,$4,$5)', [a.at, a.by, a.entity, a.id, a.action]);

    // Users
    const pw = await hashPassword(config.seedPassword);
    for (const u of DEMO_USERS)
      await db.query('INSERT INTO users (email, name, role, password_hash) VALUES ($1,$2,$3,$4)', [u.email, u.name, u.role, pw]);
    const seen = new Set<string>(DEMO_USERS.map((u) => u.email));
    for (const v of store.vendors)
      for (const pu of v.portalUsers ?? []) {
        const email = String(pu.email).toLowerCase();
        if (!pu.active || seen.has(email)) continue;
        seen.add(email);
        await db.query('INSERT INTO users (email, name, role, vendor_id, password_hash) VALUES ($1,$2,$3,$4,$5)', [email, pu.name, 'vendor', v.id, pw]);
      }

    // id counters continue after the highest seeded number per prefix
    for (const e of ENTITIES)
      await db.query(
        `INSERT INTO id_counters (prefix, next)
         SELECT $1, coalesce(max((regexp_match(id, '^[A-Z]+-(\\d+)$'))[1]::int), 0) + 1 FROM ${e.table}
         ON CONFLICT (prefix) DO UPDATE SET next = EXCLUDED.next`,
        [e.prefix],
      );
    // GRN, change order, payment and RTV ids live inside documents
    const nested: Record<string, number> = { GRN: 0, CO: 0, PAY: 0, RTV: 0, BG: 0 };
    const bump = (id: string) => { const m = /^([A-Z]+)-(\d+)$/.exec(id ?? ''); if (m && m[1] in nested) nested[m[1]] = Math.max(nested[m[1]], Number(m[2])); };
    for (const p of store.purchaseOrders) { p.receipts.forEach((r: Doc) => bump(r.id)); p.returns.forEach((r: Doc) => bump(r.id)); }
    for (const c of store.contracts) (c.changeOrders ?? []).forEach((x: Doc) => bump(x.id));
    for (const i of store.invoices) (i.payments ?? []).forEach((x: Doc) => bump(x.id));
    for (const [prefix, max] of Object.entries(nested)) await db.query('INSERT INTO id_counters (prefix, next) VALUES ($1,$2) ON CONFLICT (prefix) DO UPDATE SET next = EXCLUDED.next', [prefix, max + 1]);

    const synced = await syncComplianceHolds(db, 'System — seed');
    counts.complianceHolds = synced.raised.length;
  });
  return counts;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  seed()
    .then((c) => {
      console.log('Seeded:', c);
      console.log(`Demo users (password "${config.seedPassword}"): ${DEMO_USERS.map((u) => u.email).join(', ')} + vendor portal users`);
      return pool.end();
    })
    .catch((e) => { console.error(e); process.exit(1); });
}
