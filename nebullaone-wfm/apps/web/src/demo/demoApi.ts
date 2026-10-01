/**
 * Offline stand-in for the API used by the single-file demo build.
 * Answers every read from a snapshot of the real API; any change is refused
 * with a clear message (the demo has no server or database).
 */
import { ApiError } from '../lib/api';
import snapshot from './snapshot.json';

type Doc = Record<string, any>;
const snap = snapshot as { takenAt: string; data: Record<string, Doc[]>; get: Record<string, any>; users: Doc[] };
const USER_KEY = 'nebulla-demo-user';

const currentUser = (): Doc | null => { try { return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null'); } catch { return null; } };
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

export const DEMO_TAKEN_AT = snap.takenAt;

export async function demoApi(path: string, opts: { method?: string; body?: any } = {}): Promise<any> {
  const method = (opts.method ?? (opts.body !== undefined ? 'POST' : 'GET')).toUpperCase();
  const [p, qs] = path.split('?');
  const q = new URLSearchParams(qs ?? '');

  if (p === '/auth/login') {
    const u = snap.users.find((x) => x.email.toLowerCase() === String(opts.body?.email ?? '').toLowerCase());
    if (!u) throw new ApiError(401, 'Unknown demo user — pick one of the demo accounts');
    const user = { id: u.id, email: u.email, name: u.name, role: u.role, vendorId: u.vendorId };
    try { localStorage.setItem(USER_KEY, JSON.stringify(user)); } catch { /* private mode */ }
    return { token: 'demo', user };
  }
  const user = currentUser();
  if (!user) throw new ApiError(401, 'Please sign in');
  if (p === '/auth/me') return { user };

  if (method !== 'GET')
    throw new ApiError(403, 'This is a read-only demo file — saving needs the real app with its server and database. Everything you see is real data from the system; run the full app (see README) to approve, pay or create records.');

  const isVendor = user.role === 'vendor';
  const mine = (e: string, rows: Doc[]) => (!isVendor ? rows : e === 'vendors' ? rows.filter((r) => r.id === user.vendorId) : rows.filter((r) => r.vendorId === user.vendorId));

  let m = /^\/data\/([^/]+)$/.exec(p);
  if (m) return clone(mine(m[1], snap.data[m[1]] ?? []));
  m = /^\/data\/([^/]+)\/([^/]+)$/.exec(p);
  if (m) {
    const row = mine(m[1], snap.data[m[1]] ?? []).find((r) => r.id === m![2]);
    if (!row) throw new ApiError(404, `${m[1]} ${m[2]} not found`);
    return clone(row);
  }
  if (p === '/audit') {
    let rows: Doc[] = snap.get['/audit'] ?? [];
    if (q.get('entity')) rows = rows.filter((a) => a.entity === q.get('entity'));
    if (q.get('refId')) rows = rows.filter((a) => a.refId === q.get('refId'));
    return clone(rows.slice(0, Number(q.get('limit') ?? 100)));
  }
  if (p === '/portal/rfqs') return clone(snap.get[`/portal/rfqs?vendorId=${isVendor ? user.vendorId : q.get('vendorId')}`] ?? []);
  if (p in snap.get) {
    if (isVendor && p === '/config/settings') { const s = snap.get[p]; return { complianceDocs: s.complianceDocs, complianceIns: s.complianceIns, expiryWarnDays: s.expiryWarnDays }; }
    return clone(snap.get[p]);
  }
  throw new ApiError(404, 'Not available in the demo file');
}
