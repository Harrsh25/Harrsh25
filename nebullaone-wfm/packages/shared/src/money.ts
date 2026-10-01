export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** ₹88,52,170 */
export const fmtINR = (n: number | null | undefined): string =>
  n == null || Number.isNaN(n) ? '—' : `₹${inr.format(Math.round(n))}`;

/** ₹88.52 L / ₹2.06 Cr — the compact form used on lists and tiles. */
export function fmtINRShort(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} L`;
  return `${sign}₹${inr.format(Math.round(abs))}`;
}

export const pct = (part: number, whole: number): number => (whole ? (part / whole) * 100 : 0);
