import { addDays, addMonths, daysBetween } from './dates';

export interface ChangeOrder {
  id: string;
  desc: string;
  amount: number;
  days: number;
  status: 'Draft' | 'Pending' | 'Approved' | 'Rejected' | string;
  raisedOn: string;
  reason?: string;
  type?: string;
  decidedBy?: string;
  decidedAt?: string;
}

export interface Guarantee {
  id: string;
  type: 'Performance' | 'Advance' | 'Retention' | string;
  bank: string;
  number: string;
  amount: number;
  expiry: string;
  status: string;
  receivedOn?: string;
}

export interface Contract {
  id: string;
  vendorId: string;
  project: string;
  title: string;
  type: string;
  value: number;
  start: string;
  end: string;
  retentionPct: number;
  advancePct: number;
  advanceAmount?: number;
  advanceRecoveryPct: number;
  securityDepositPct?: number;
  cessPct: number;
  gstPct: number;
  dlpMonths: number;
  ldPctPerWeek: number;
  ldCapPct: number;
  pbgPct?: number;
  status: string;
  changeOrders?: ChangeOrder[];
  guarantees?: Guarantee[];
  handover?: { date: string } | null;
}

export const approvedChangeOrders = (c: Pick<Contract, 'changeOrders'>): ChangeOrder[] =>
  (c.changeOrders ?? []).filter((co) => co.status === 'Approved');

/** Contract value including approved variations. */
export const revisedValue = (c: Contract): number =>
  c.value + approvedChangeOrders(c).reduce((s, co) => s + (co.amount || 0), 0);

/** Completion date including approved extensions of time. */
export const revisedEnd = (c: Contract): string =>
  addDays(c.end, approvedChangeOrders(c).reduce((s, co) => s + (co.days || 0), 0));

/** DLP starts at handover when there is one, otherwise at (revised) completion. */
export const dlpStartDate = (c: Contract): string => c.handover?.date ?? revisedEnd(c);

/** Single source of truth for the DLP end (fixes B2/B3: calendar months, one base date). */
export const dlpEndDate = (c: Contract): string => addMonths(dlpStartDate(c), c.dlpMonths || 0);

export interface CoverageIssue {
  guaranteeId: string;
  type: string;
  expiry: string;
  requiredUntil: string;
  shortByDays: number;
  message: string;
}

/**
 * A performance guarantee must stay valid until the DLP ends (fixes B4).
 * Advance guarantees must stay valid until the contract's completion.
 */
export function bgCoverageIssues(c: Contract): CoverageIssue[] {
  const issues: CoverageIssue[] = [];
  for (const g of c.guarantees ?? []) {
    if (g.status && !['Active', 'Extended'].includes(g.status)) continue;
    const requiredUntil = g.type === 'Advance' ? revisedEnd(c) : dlpEndDate(c);
    if (g.expiry < requiredUntil) {
      const short = daysBetween(g.expiry, requiredUntil);
      issues.push({
        guaranteeId: g.id,
        type: g.type,
        expiry: g.expiry,
        requiredUntil,
        shortByDays: short,
        message: `${g.type} BG ${g.number} expires ${g.expiry}, ${short} days before ${
          g.type === 'Advance' ? 'completion' : 'DLP end'
        } (${requiredUntil}) — extend it`,
      });
    }
  }
  const pbgRequired = (c.pbgPct ?? 0) > 0;
  const hasPbg = (c.guarantees ?? []).some((g) => g.type === 'Performance');
  if (pbgRequired && !hasPbg && c.status !== 'Draft')
    issues.push({
      guaranteeId: '',
      type: 'Performance',
      expiry: '',
      requiredUntil: dlpEndDate(c),
      shortByDays: 0,
      message: `Contract requires a ${c.pbgPct}% performance BG but none is recorded`,
    });
  return issues;
}

/** LD for a delay: pct per week of revised value, capped. */
export function liquidatedDamages(c: Contract, actualCompletion: string): number {
  const lateDays = daysBetween(revisedEnd(c), actualCompletion);
  if (lateDays <= 0 || !c.ldPctPerWeek) return 0;
  const weeks = Math.ceil(lateDays / 7);
  const v = revisedValue(c);
  return Math.min((v * c.ldPctPerWeek * weeks) / 100, (v * (c.ldCapPct || 0)) / 100);
}

const FIXED_STATUSES = ['Draft', 'Pending Approval', 'Approved', 'Rejected', 'Closed', 'Terminated', 'Short-closed'];

/**
 * Lifecycle status to store on the contract (fixes B8: it used to stay "Active" forever).
 * Active → In DLP (after handover, until DLP ends) → Completed (DLP over, awaiting close) → Closed.
 */
export function contractPhase(c: Contract, today: string): string {
  if (FIXED_STATUSES.includes(c.status)) return c.status;
  if (c.handover?.date) return today <= dlpEndDate(c) ? 'In DLP' : 'Completed';
  return 'Active';
}

/** Display flag: an active contract within 90 days of (revised) completion. */
export const isExpiring = (c: Contract, today: string): boolean =>
  c.status === 'Active' && daysBetween(today, revisedEnd(c)) <= 90;
