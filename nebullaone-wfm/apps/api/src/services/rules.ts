import {
  blockingHolds, standingFor, todayISO, vendorCompliance, vendorMetrics, weightedScore, workOrderProgress,
  type ComplianceResult, type GateAction, type Hold, type Standing,
} from '@nebulla/shared';
import { all, type Db } from '../db';
import type { AuthUser } from '../auth';
import { STAGE_ROLE, userLabel } from '../auth';
import { audit, conflict, getConfig, insert, list, save } from '../repo';

type Doc = Record<string, any>;

export const today = (): string => todayISO();

export const settingsOf = (db: Db) => getConfig<Doc>('settings', db);
export const scoreConfigOf = (db: Db) => getConfig<Doc>('scoreConfig', db);

export function complianceOf(v: Doc, settings: Doc): ComplianceResult {
  return vendorCompliance(v as any, settings.complianceDocs ?? [], settings.complianceIns ?? [], today(), settings.expiryWarnDays ?? 30);
}

export interface GateInput {
  action: GateAction;
  vendorId: string;
  refIds?: string[];
  /** Reason given by a user allowed to override a compliance Stop. */
  overrideReason?: string;
}

export interface GateResult { warnings: string[]; overridden: string[] }

/**
 * The one place that decides whether an action may go ahead for a vendor.
 * Order: vendor status → holds (never overridable) → compliance (Stop / Warn / Off per settings;
 * a Stop may be overridden with a reason by the configured override role) → scorecard standing.
 */
export async function checkGate(db: Db, user: AuthUser, g: GateInput): Promise<GateResult> {
  const settings = await settingsOf(db);
  const vendor = (await list('vendors', { db, where: { id: g.vendorId } }))[0];
  if (!vendor) throw conflict(`Vendor ${g.vendorId} not found`);
  const stops: string[] = [];
  const warnings: string[] = [];
  const overridable: string[] = [];

  if (vendor.status === 'Blacklisted') stops.push(`${vendor.name} is blacklisted`);
  else if (['Inactive', 'Draft', 'Rejected'].includes(vendor.status)) stops.push(`${vendor.name} is ${vendor.status.toLowerCase()}`);
  else if (vendor.status === 'Pending Approval' && g.action !== 'rfq') stops.push(`${vendor.name} is still awaiting approval`);
  if (g.action === 'po' && vendor.regTier === 'Prospective') stops.push(`${vendor.name} is a prospective vendor — they can quote but cannot receive orders until spend-authorised`);

  const holds = await list<Hold>('holds', { db, where: { vendor_id: g.vendorId, status: 'Active' } });
  for (const h of blockingHolds(holds, g.action, g.vendorId, g.refIds ?? [], today())) {
    // Automatic compliance holds mirror the live compliance check below, which honours the
    // Stop/Warn/Off setting and the override role — don't double-block with the hold itself.
    if (h.reason === 'Compliance' && (h as Doc).auto) continue;
    stops.push(`On hold (${h.scope}, ${h.reason}): ${h.detail} — ${h.id}`);
  }

  const mode: string =
    g.action === 'rfq' ? settings.rfqComplianceGate : g.action === 'po' ? settings.poComplianceGate : g.action === 'payment' ? settings.complianceGate : 'Off';
  if (mode !== 'Off') {
    const c = complianceOf(vendor, settings);
    const msgs = c.blocking.map((i) => `Compliance: ${i.name} — ${i.note.toLowerCase()}`);
    if (mode === 'Stop') overridable.push(...msgs);
    else warnings.push(...msgs);
  }

  if (g.action === 'rfq' || g.action === 'po') {
    const sc = (await scorecard(db)).find((s) => s.vendorId === g.vendorId);
    const st = sc?.standing;
    if (st) {
      const prevent = g.action === 'rfq' ? st.preventRfq : st.preventPo;
      const warn = g.action === 'rfq' ? st.warnRfq : st.warnPo;
      if (prevent) stops.push(`Scorecard standing "${st.name}" (${sc.score}) prevents new ${g.action === 'rfq' ? 'RFQs' : 'orders'}`);
      else if (warn) warnings.push(`Scorecard standing "${st.name}" (${sc.score})`);
    }
  }

  const overrideRole = STAGE_ROLE[settings.overrideRole] ?? 'finance';
  const overridden: string[] = [];
  if (overridable.length) {
    const canOverride = user.role === 'admin' || user.role === overrideRole;
    if (g.overrideReason && canOverride) {
      overridden.push(...overridable);
      await audit(db, userLabel(user), 'vendors', g.vendorId, `Compliance gate overridden for ${g.action}`, { reason: g.overrideReason, items: overridable });
    } else {
      stops.push(...overridable);
    }
  }
  if (stops.length)
    throw conflict('Blocked by vendor controls', { blocking: stops, warnings, canOverride: !!overridable.length && !stops.some((s) => !overridable.includes(s)), overrideRole: settings.overrideRole });
  return { warnings, overridden };
}

/** Keeps one automatic Compliance hold (scope Payments) per vendor in step with its compliance. */
export async function syncComplianceHolds(db: Db, by = 'System'): Promise<{ raised: string[]; released: string[] }> {
  const settings = await settingsOf(db);
  const vendors = await list('vendors', { db });
  const holds = await list<Hold & Doc>('holds', { db, where: { status: 'Active' } });
  const raised: string[] = []; const released: string[] = [];
  for (const v of vendors) {
    if (['Draft', 'Blacklisted', 'Inactive', 'Rejected'].includes(v.status)) continue;
    const c = complianceOf(v, settings);
    const auto = holds.find((h) => h.vendorId === v.id && h.reason === 'Compliance' && h.auto);
    const shouldHold = settings.complianceGate !== 'Off' && c.blocking.length > 0;
    const detail = c.blocking.map((i) => `${i.name}: ${i.note.toLowerCase()}`).join(' · ');
    if (shouldHold && !auto) {
      const h = await insert('holds', {
        level: 'Vendor', vendorId: v.id, refId: null, scope: 'Payments', reason: 'Compliance', detail,
        source: 'Compliance Center', raisedBy: by, raisedAt: new Date().toISOString(), releaseDate: null,
        autoRelease: 'Released automatically when compliance is restored', status: 'Active', auto: true,
      }, db);
      raised.push(h.id);
    } else if (shouldHold && auto && auto.detail !== detail) {
      await save('holds', { ...auto, detail }, db);
    } else if (!shouldHold && auto) {
      await save('holds', { ...auto, status: 'Released', releasedBy: by, releasedAt: new Date().toISOString(), releaseNote: 'Compliance restored' }, db);
      released.push(auto.id);
    }
  }
  return { raised, released };
}

export interface ScoreRow {
  vendorId: string; name: string; category: string; score: number | null; isNew: boolean;
  parts: { quality: number | null; timeliness: number | null; safety: number | null; compliance: number | null } | null;
  standing?: Standing; complianceStatus: string;
}

/** Scorecard for every vendor (prototype formula; band boundaries fixed — see B6). */
export async function scorecard(db: Db): Promise<ScoreRow[]> {
  const [settings, cfg, vendors, ratings, wos, pos, ms, bills] = await all(db, [() => settingsOf(db), () => scoreConfigOf(db), () => list('vendors', { db }), () => list('ratings', { db }), () => list('workOrders', { db }), () => list('purchaseOrders', { db }), () => list('measurements', { db }), () => list('raBills', { db })] as const);
  const t = today();
  return vendors.map((v) => {
    const c = complianceOf(v, settings);
    const vr = ratings.filter((r) => r.vendorId === v.id);
    const woSpis = wos.filter((w) => w.vendorId === v.id && w.status !== 'Draft')
      .map((w) => workOrderProgress(w as any, ms as any, bills.filter((b) => b.woId === w.id) as any, t).spi);
    const vpos = pos.filter((p) => p.vendorId === v.id && (p.receipts ?? []).length);
    const receipts = vpos.flatMap((p) => p.receipts.map((r: Doc) => ({ date: r.date, deliveryDate: p.deliveryDate })));
    let receivedQty = 0; let acceptedQty = 0;
    for (const p of vpos) for (const r of p.receipts) for (const l of r.lines ?? []) { receivedQty += Number(l.qty) || 0; acceptedQty += Number(l.accepted) || 0; }
    const parts = vendorMetrics({ ratings: vr as any, woSpis, receipts, receivedQty, acceptedQty, complianceStatus: c.status });
    const score = parts ? weightedScore(parts, cfg.weights) : null;
    return {
      vendorId: v.id, name: v.name, category: (v.categories ?? [])[0] ?? v.type, score, isNew: !parts, parts,
      standing: score == null ? undefined : standingFor(score, cfg.standings), complianceStatus: c.status,
    };
  });
}

/** Scorecard auto-block: raise a Performance hold (scope Payments) below the block threshold; release it when back above. */
export async function runAutoBlock(db: Db, by: string): Promise<{ raised: string[]; released: string[] }> {
  const cfg = await scoreConfigOf(db);
  const rows = await scorecard(db);
  const holds = await list<Hold & Doc>('holds', { db, where: { status: 'Active' } });
  const raised: string[] = []; const released: string[] = [];
  for (const r of rows) {
    const auto = holds.find((h) => h.vendorId === r.vendorId && h.reason === 'Performance' && h.auto);
    const below = cfg.autoBlock && r.score != null && r.score < cfg.blockThreshold;
    if (below && !auto) {
      const h = await insert('holds', {
        level: 'Vendor', vendorId: r.vendorId, refId: null, scope: 'RFQ/PO', reason: 'Performance',
        detail: `Scorecard ${r.score} below block threshold ${cfg.blockThreshold}`, source: 'Vendor Scorecard',
        raisedBy: by, raisedAt: new Date().toISOString(), releaseDate: null, status: 'Active', auto: true,
      }, db);
      raised.push(h.id);
    } else if (!below && auto && r.score != null) {
      await save('holds', { ...auto, status: 'Released', releasedBy: by, releasedAt: new Date().toISOString(), releaseNote: `Score recovered to ${r.score}` }, db);
      released.push(auto.id);
    }
  }
  return { raised, released };
}
