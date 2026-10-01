import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Layout';
import { Notice } from '../components/ui';
import { useAuth } from '../lib/auth';

const DEMO = [
  ['admin@nebullaone.in', 'Administrator — everything'],
  ['procurement@nebullaone.in', 'Procurement — vendors, RFQs, POs'],
  ['legal@nebullaone.in', 'Legal — vendor & contract approval'],
  ['finance@nebullaone.in', 'Finance — bills, payments, approvals'],
  ['pm@nebullaone.in', 'Project manager — contracts, MB, RA bills'],
  ['qa@nebullaone.in', 'QA / HSE — inspections, NCRs, safety'],
  ['ramesh@shreebalaji.in', 'Vendor portal — Shree Balaji Infra'],
];

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const u = await login(email, password);
      nav(u.role === 'vendor' ? '/portal' : '/vm/overview', { replace: true });
    } catch (ex) { setErr((ex as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="grid w-full max-w-[880px] overflow-hidden rounded-2xl border border-line bg-white shadow-card md:grid-cols-2">
        <form onSubmit={submit} className="space-y-4 p-8">
          <div className="flex items-center gap-2 text-[18px] font-bold text-brand"><Logo />NebullaONE</div>
          <div><h1 className="text-[20px] font-semibold">Sign in</h1><p className="text-[13px] text-ink-mute">Vendor & Contractor Management</p></div>
          {err && <Notice tone="red" title={err} />}
          <label className="block"><span className="label">Email</span><input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label className="block"><span className="label">Password</span><input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          <button className="btn btn-primary w-full justify-center py-2" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <div className="border-t border-line bg-gray-50 p-8 md:border-l md:border-t-0">
          <h2 className="text-[13px] font-semibold">Demo accounts</h2>
          <p className="mb-3 text-[12px] text-ink-mute">Password for all: <code className="rounded bg-white px-1">nebulla123</code> (set by the seed script — change it for real use)</p>
          <ul className="space-y-1">
            {DEMO.map(([e, d]) => (
              <li key={e}><button type="button" className="w-full rounded-lg px-2 py-1.5 text-left hover:bg-white" onClick={() => { setEmail(e); setPassword('nebulla123'); }}>
                <div className="text-[13px] font-medium">{e}</div><div className="text-[12px] text-ink-mute">{d}</div>
              </button></li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
