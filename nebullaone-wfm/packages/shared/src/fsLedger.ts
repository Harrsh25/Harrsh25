import { round2 } from './money';
import { bgCoverageIssues, dlpEndDate, type Contract, type CoverageIssue } from './contract';

export interface RaBillLite { id: string; contractId: string; date: string; status: string; ded: Partial<Record<'retention' | 'advance' | 'securityDeposit', number>> }
export interface ReleaseLite { id: string; contractId: string; amount: number; type: string; status: string; requestedOn: string; kind?: 'Retention' | 'Security Deposit' }
export interface AdvanceLite { id: string; contractId?: string; amount: number; date: string }

export type FsType = 'Advance' | 'Retention' | 'Security Deposit';

export interface FsMovement { date: string; type: FsType; ref: string; description: string; amount: number; balance: number }

export interface FsSummary {
  contractId: string;
  advanceGiven: number; advanceRecovered: number; advanceBalance: number;
  retentionHeld: number; retentionReleased: number; retentionBalance: number;
  sdHeld: number; sdReleased: number; sdBalance: number;
  dlpEnds: string;
  bgIssues: CoverageIssue[];
  movements: FsMovement[];
}

/** Bills that count toward the ledger: anything certified or later. */
const COUNTED = new Set(['Certified', 'Approved', 'Paid', 'Verified']);

/**
 * The Financial Security ledger: one running balance per type per contract,
 * built from the advance paid, RA bill deductions and approved releases.
 */
export function fsLedger(
  c: Contract,
  bills: RaBillLite[],
  releases: ReleaseLite[],
  advances: AdvanceLite[] = [],
): FsSummary {
  const events: Omit<FsMovement, 'balance'>[] = [];
  const contractAdvances = advances.filter((a) => a.contractId === c.id);
  if (contractAdvances.length)
    for (const a of contractAdvances) events.push({ date: a.date, type: 'Advance', ref: a.id, description: 'Advance paid', amount: a.amount });
  else if ((c.advanceAmount ?? 0) > 0)
    events.push({ date: c.start, type: 'Advance', ref: c.id, description: 'Mobilisation advance (contract terms)', amount: c.advanceAmount! });

  for (const b of bills.filter((x) => x.contractId === c.id && COUNTED.has(x.status))) {
    if (b.ded.advance) events.push({ date: b.date, type: 'Advance', ref: b.id, description: 'Advance recovered', amount: -b.ded.advance });
    if (b.ded.retention) events.push({ date: b.date, type: 'Retention', ref: b.id, description: 'Retention deducted', amount: b.ded.retention });
    if (b.ded.securityDeposit) events.push({ date: b.date, type: 'Security Deposit', ref: b.id, description: 'Security deposit deducted', amount: b.ded.securityDeposit });
  }
  for (const r of releases.filter((x) => x.contractId === c.id && ['Approved', 'Released', 'Paid'].includes(x.status))) {
    const type: FsType = r.kind === 'Security Deposit' ? 'Security Deposit' : 'Retention';
    events.push({ date: r.requestedOn, type, ref: r.id, description: `${type} released (${r.type})`, amount: -r.amount });
  }
  events.sort((a, b) => a.date.localeCompare(b.date));
  const bal: Record<FsType, number> = { Advance: 0, Retention: 0, 'Security Deposit': 0 };
  const movements = events.map((e) => {
    bal[e.type] = round2(bal[e.type] + e.amount);
    return { ...e, balance: bal[e.type] };
  });
  const sum = (t: FsType, sign: 1 | -1) =>
    round2(movements.filter((m) => m.type === t && Math.sign(m.amount) === sign).reduce((s, m) => s + Math.abs(m.amount), 0));
  return {
    contractId: c.id,
    advanceGiven: sum('Advance', 1), advanceRecovered: sum('Advance', -1), advanceBalance: bal.Advance,
    retentionHeld: sum('Retention', 1), retentionReleased: sum('Retention', -1), retentionBalance: bal.Retention,
    sdHeld: sum('Security Deposit', 1), sdReleased: sum('Security Deposit', -1), sdBalance: bal['Security Deposit'],
    dlpEnds: dlpEndDate(c),
    bgIssues: bgCoverageIssues(c),
    movements,
  };
}
