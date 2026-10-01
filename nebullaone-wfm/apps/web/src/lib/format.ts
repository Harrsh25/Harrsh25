export { fmtINR, fmtINRShort, toneFor } from '@nebulla/shared';

const d = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
export const fmtDate = (iso?: string | null) => (iso ? d.format(new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso)) : '—');
export const fmtPct = (n?: number | null, digits = 0) => (n == null || Number.isNaN(n) ? '—' : `${n.toFixed(digits)}%`);
export const fmtNum = (n?: number | null) => (n == null ? '—' : new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n));
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const cls = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(' ');
