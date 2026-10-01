import { round2 } from './money';
import type { Contract } from './contract';

export interface WoItem { id: string; code?: string; desc: string; unit: string; qty: number; rate: number }
export interface Milestone { id: string; name: string; weight: number }
export interface WorkOrderLite { id: string; type: string; items?: WoItem[]; lumpSum?: number; milestones?: Milestone[]; start: string; end: string; status?: string }
export interface Measurement { id: string; woId: string; lineId: string; qty: number | null; pct: number | null; billedIn?: string | null; jms?: { status: string }; qc?: { status: string } }

/** Item-rate line (quantities) */
export interface RaQtyLine { lineId: string; code?: string; desc: string; unit: string; rate: number; woQty: number; prevQty: number; thisQty: number; cumQty: number; amount: number }
/** Lump-sum milestone line (cumulative %) */
export interface RaPctLine { lineId: string; desc: string; prevPct: number; cumPct: number; thisPct: number; base: number; amount: number }
export type RaLine = RaQtyLine | RaPctLine;
export interface PrevBillLite { lines: Array<Partial<RaQtyLine & RaPctLine>>; ded?: { advance?: number } }

export interface RaDeductions {
  retention: number; advance: number; securityDeposit: number; tds: number; cess: number;
  materials: number; penalty: number; other: number;
}

export interface RaComputation { lines: RaLine[]; gross: number; gst: number; ded: RaDeductions; totalDed: number; net: number; warnings: string[] }

export interface RaInput {
  contract: Contract;
  workOrder: WorkOrderLite;
  /** Measurements being billed now (JMS-signed; QC-passed when required). */
  measurements: Measurement[];
  /** Earlier non-rejected bills on the same work order. */
  previousBills: PrevBillLite[];
  /** Advance recovered so far on this contract across all earlier bills. */
  advanceRecoveredSoFar: number;
  /** TDS rate from the vendor's section, e.g. "194C-2" → 2. */
  tdsPct: number;
  materials?: number;
  penalty?: number;
  other?: number;
}

/** Vendor TDS code → rate (e.g. "194C-2" → 2, "194Q" → 0.1). */
export function tdsRate(code: string | null | undefined): number {
  if (!code) return 0;
  const m = /-(\d+(?:\.\d+)?)$/.exec(code);
  if (m) return Number(m[1]);
  if (code.startsWith('194Q')) return 0.1;
  return 0;
}

/** Value of a work order: sum of item qty × rate, or the lump sum. */
export const workOrderValue = (w: WorkOrderLite): number =>
  w.type === 'Lump Sum' ? Number(w.lumpSum) || 0 : (w.items ?? []).reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.rate) || 0), 0);

/**
 * Computes an RA bill exactly like the prototype, with the same rules:
 * net = gross + GST − deductions; advance recovery capped at the outstanding advance.
 * Adds: security deposit deduction, and a warning when cumulative qty exceeds the WO qty.
 */
export function computeRaBill(i: RaInput): RaComputation {
  const warnings: string[] = [];
  const w = i.workOrder;
  const prevLines = i.previousBills.flatMap((b) => b.lines);
  let lines: RaLine[];
  if (w.type === 'Lump Sum') {
    lines = (w.milestones ?? []).map((m) => {
      const prevPct = Math.max(0, ...prevLines.filter((l) => l.lineId === m.id).map((l) => Number(l.cumPct) || 0));
      const cumPct = Math.max(prevPct, ...i.measurements.filter((x) => x.lineId === m.id).map((x) => Number(x.pct) || 0));
      const base = ((Number(w.lumpSum) || 0) * (Number(m.weight) || 0)) / 100;
      return { lineId: m.id, desc: m.name, prevPct, cumPct, thisPct: cumPct - prevPct, base, amount: round2(((cumPct - prevPct) / 100) * base) };
    }).filter((l) => l.thisPct > 0 || l.prevPct > 0);
  } else {
    lines = (w.items ?? []).map((it) => {
      const prevQty = prevLines.filter((l) => l.lineId === it.id).reduce((s, l) => s + (Number(l.thisQty) || 0), 0);
      const thisQty = round2(i.measurements.filter((x) => x.lineId === it.id).reduce((s, x) => s + (Number(x.qty) || 0), 0));
      if (prevQty + thisQty > it.qty + 1e-9)
        warnings.push(`${it.code ?? it.id} ${it.desc}: cumulative ${round2(prevQty + thisQty)} ${it.unit} exceeds WO quantity ${it.qty} — needs a change order`);
      return { lineId: it.id, code: it.code, desc: it.desc, unit: it.unit, rate: it.rate, woQty: it.qty, prevQty, thisQty, cumQty: round2(prevQty + thisQty), amount: round2(thisQty * it.rate) };
    }).filter((l) => l.thisQty > 0 || l.prevQty > 0);
  }
  for (const m of i.measurements) {
    if (m.jms && m.jms.status !== 'Signed') warnings.push(`${m.id}: joint measurement not signed`);
  }
  const gross = round2(lines.reduce((s, l) => s + l.amount, 0));
  const c = i.contract;
  const advanceOutstanding = Math.max(0, (Number(c.advanceAmount) || 0) - i.advanceRecoveredSoFar);
  const ded: RaDeductions = {
    retention: round2((gross * (c.retentionPct || 0)) / 100),
    advance: round2(Math.min((gross * (c.advanceRecoveryPct || 0)) / 100, advanceOutstanding)),
    securityDeposit: round2((gross * (c.securityDepositPct || 0)) / 100),
    tds: round2((gross * i.tdsPct) / 100),
    cess: round2((gross * (c.cessPct || 0)) / 100),
    materials: round2(Number(i.materials) || 0),
    penalty: round2(Number(i.penalty) || 0),
    other: round2(Number(i.other) || 0),
  };
  const gst = round2((gross * (c.gstPct || 0)) / 100);
  const totalDed = round2(Object.values(ded).reduce((s, v) => s + v, 0));
  return { lines, gross, gst, ded, totalDed, net: round2(gross + gst - totalDed), warnings };
}

/** Linear planned % for a date window (prototype rule). */
export function plannedPct(start: string, end: string, today: string): number {
  const a = Date.parse(start); const b = Date.parse(end); const t = Date.parse(today);
  if (!start || !end || b <= a) return 0;
  return Math.max(0, Math.min(100, ((t - a) / (b - a)) * 100));
}

export interface WoProgress { value: number; measured: number; billed: number; physical: number; financial: number; planned: number; spi: number }

/** Physical / financial progress and SPI for a work order (prototype rule; SPI = 1 while planned < 5%). */
export function workOrderProgress(
  w: WorkOrderLite,
  measurements: Measurement[],
  bills: Array<{ status: string; lines: Array<Partial<RaQtyLine & RaPctLine>> }>,
  today: string,
): WoProgress {
  const ms = measurements.filter((m) => m.woId === w.id && m.jms?.status === 'Signed');
  const bs = bills.filter((b) => b.status !== 'Rejected');
  let measured = 0; let billed = 0;
  if (w.type === 'Lump Sum') {
    for (const m of w.milestones ?? []) {
      const base = ((Number(w.lumpSum) || 0) * m.weight) / 100;
      const mp = Math.max(0, ...ms.filter((x) => x.lineId === m.id).map((x) => Number(x.pct) || 0));
      const bp = Math.max(0, ...bs.flatMap((b) => b.lines.filter((l) => l.lineId === m.id).map((l) => Number(l.cumPct) || 0)));
      measured += (base * mp) / 100; billed += (base * bp) / 100;
    }
  } else {
    for (const it of w.items ?? []) {
      measured += ms.filter((x) => x.lineId === it.id).reduce((s, x) => s + (Number(x.qty) || 0), 0) * it.rate;
      billed += bs.flatMap((b) => b.lines.filter((l) => l.lineId === it.id)).reduce((s, l) => s + (Number(l.thisQty) || 0), 0) * it.rate;
    }
  }
  const value = workOrderValue(w);
  const denom = value || 1;
  const planned = plannedPct(w.start, w.end, today);
  const physical = (measured / denom) * 100;
  return { value, measured, billed, physical, financial: (billed / denom) * 100, planned, spi: planned < 5 ? 1 : physical / planned };
}
