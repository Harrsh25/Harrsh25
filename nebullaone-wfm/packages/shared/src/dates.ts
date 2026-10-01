/** ISO date helpers. All dates are handled as calendar dates (YYYY-MM-DD) in UTC. */

export const toISODate = (d: Date): string => d.toISOString().slice(0, 10);

export const todayISO = (): string => toISODate(new Date());

const parse = (iso: string): Date => new Date(`${iso.slice(0, 10)}T00:00:00Z`);

export function addDays(iso: string, days: number): string {
  const d = parse(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

/** Calendar-month addition; clamps to the last day of the target month (31 Jan + 1 → 28/29 Feb). */
export function addMonths(iso: string, months: number): string {
  const d = parse(iso);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return toISODate(d);
}

/** Whole days from a to b (positive when b is later). */
export function daysBetween(a: string, b: string): number {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86_400_000);
}

export const isBefore = (a: string, b: string): boolean => a.slice(0, 10) < b.slice(0, 10);
