export interface LabourRate {
  id?: string;
  trade: string;
  skill: string;
  region: string;
  minWage: number;
  rate: number;
  otMultiplier: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  vendorId?: string | null;
  status?: string;
}

/** Returns validation errors; empty array means the rate may be saved. (Fixes B1.) */
export function validateLabourRate(r: Partial<LabourRate>): string[] {
  const errors: string[] = [];
  if (!r.trade) errors.push('Trade is required');
  if (!r.region) errors.push('Region is required');
  if (!(Number(r.minWage) > 0)) errors.push('Statutory minimum wage is required');
  if (!(Number(r.rate) > 0)) errors.push('Rate is required');
  if (Number(r.rate) > 0 && Number(r.minWage) > 0 && Number(r.rate) < Number(r.minWage))
    errors.push(`Rate ₹${r.rate} is below the statutory minimum wage ₹${r.minWage} (Minimum Wages Act)`);
  if (r.otMultiplier != null && Number(r.otMultiplier) < 2)
    errors.push('Overtime must be paid at least 2× the ordinary rate');
  if (r.effectiveTo && r.effectiveFrom && r.effectiveTo < r.effectiveFrom)
    errors.push('Effective-to date is before effective-from');
  return errors;
}

export const labourMarginPct = (r: Pick<LabourRate, 'rate' | 'minWage'>): number =>
  r.minWage ? ((r.rate - r.minWage) / r.minWage) * 100 : 0;

/**
 * Picks the rate card that applies to a worker: vendor-specific beats standard,
 * must match trade + region and be active on the given date.
 */
export function findApplicableRate<T extends LabourRate>(
  rates: T[],
  q: { trade: string; region: string; vendorId?: string | null; date: string },
): T | undefined {
  const live = rates.filter(
    (r) =>
      r.status === 'Active' &&
      r.trade === q.trade &&
      r.region === q.region &&
      r.effectiveFrom <= q.date &&
      (!r.effectiveTo || r.effectiveTo >= q.date),
  );
  return live.find((r) => q.vendorId && r.vendorId === q.vendorId) ?? live.find((r) => !r.vendorId);
}
