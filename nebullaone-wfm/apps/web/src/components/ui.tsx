import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { cls, toneFor } from '../lib/format';

const TONE: Record<string, string> = {
  green: 'text-green-700 [&>i]:bg-green-500',
  gray: 'text-ink-soft border-line bg-white [&>i]:bg-gray-400',
  red: 'text-red-700 border-red-200 bg-red-50 [&>i]:bg-red-500',
  blue: 'text-blue-700 border-blue-200 bg-blue-50 [&>i]:bg-blue-500',
  purple: 'text-violet-700 border-violet-200 bg-violet-50 [&>i]:bg-violet-500',
  amber: 'text-amber-700 border-amber-200 bg-amber-50 [&>i]:bg-amber-500',
};

/** Status pill — same colour rules as the prototype (green statuses render as plain dotted text). */
export function Badge({ children, tone }: { children: ReactNode; tone?: string }) {
  const t = tone ?? toneFor(String(children));
  const boxed = t !== 'green';
  return (
    <span className={cls('inline-flex items-center gap-1.5 whitespace-nowrap text-[12.5px] font-medium', boxed && 'rounded-md border px-1.5 py-0.5', TONE[t])}>
      <i className="h-1.5 w-1.5 shrink-0 rounded-full" />
      {children}
    </span>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return <span className="inline-block whitespace-nowrap rounded border border-line bg-gray-50 px-1.5 py-0.5 text-[12px] text-ink-soft">{children}</span>;
}

export function Progress({ value, tone = 'brand' }: { value: number; tone?: 'brand' | 'green' | 'amber' | 'red' }) {
  const c = { brand: 'bg-brand', green: 'bg-green-500', amber: 'bg-amber-500', red: 'bg-red-500' }[tone];
  return (
    <div className="h-1.5 w-full min-w-[60px] overflow-hidden rounded-full bg-gray-100">
      <div className={cls('h-full rounded-full', c)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-line px-4">
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={cls('-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] font-medium', value === t.id ? 'border-brand text-brand' : 'border-transparent text-ink-soft hover:text-ink')}>
          {t.label}{t.count != null && <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 text-[11px] text-ink-mute">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Kpi({ label, value, sub, tone = 'blue', icon }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'blue' | 'red' | 'teal' | 'amber' | 'violet' | 'green'; icon?: ReactNode }) {
  const t = {
    blue: 'border-blue-200 bg-blue-50/60 text-blue-700', red: 'border-red-200 bg-red-50/60 text-red-700', teal: 'border-teal-200 bg-teal-50/60 text-teal-700',
    amber: 'border-amber-200 bg-amber-50/60 text-amber-700', violet: 'border-violet-200 bg-violet-50/60 text-violet-700', green: 'border-green-200 bg-green-50/60 text-green-700',
  }[tone];
  return (
    <div className={cls('flex items-start justify-between rounded-xl border px-4 py-3', t)}>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[12px] font-semibold"><i className="h-1.5 w-1.5 rounded-full bg-current" />{label}</div>
        <div className="mt-1 whitespace-nowrap text-[22px] font-semibold leading-7 num">{value}</div>
        {sub && <div className="truncate text-[12px] opacity-80">{sub}</div>}
      </div>
      {icon && <div className="rounded-lg bg-white/70 p-2">{icon}</div>}
    </div>
  );
}

/** Donut with legend, like the prototype's overview widgets. */
export function Donut({ segments, center, sub }: { segments: { label: string; value: number; color: string }[]; center: ReactNode; sub: string }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let acc = 0;
  const r = 38; const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-6 p-4">
      <div className="relative h-[104px] w-[104px] shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#f3f4f6" strokeWidth="12" />
          {segments.filter((s) => s.value > 0).map((s) => {
            const len = (s.value / total) * c;
            const el = <circle key={s.label} cx="50" cy="50" r={r} fill="none" stroke={s.color} strokeWidth="12" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-acc} />;
            acc += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-[20px] font-semibold num">{center}</span><span className="text-[11px] text-ink-mute">{sub}</span></div>
      </div>
      <ul className="flex-1 space-y-1.5">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-[13px]">
            <i className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            <span className="flex-1 text-ink-soft">{s.label}</span>
            <span className="w-8 text-right font-medium num">{s.value}</span>
            <span className="w-12 rounded bg-gray-100 px-1 text-right text-[11px] text-ink-mute num">{Math.round((s.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Section({ title, action, children, className }: { title: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cls('card overflow-hidden', className)}>
      <header className="flex items-center justify-between border-b border-line px-4 py-3"><h3 className="text-[14px] font-semibold">{title}</h3>{action}</header>
      {children}
    </section>
  );
}

export function Drawer({ open, onClose, title, subtitle, children, actions, width = 'max-w-[760px]' }: { open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode; actions?: ReactNode; width?: string }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onMouseDown={onClose}>
      <aside role="dialog" aria-modal className={cls('flex h-full w-full flex-col bg-white shadow-lg', width)} onMouseDown={(e) => e.stopPropagation()}>
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0"><h2 className="truncate text-[16px] font-semibold">{title}</h2>{subtitle && <div className="mt-0.5 text-[12.5px] text-ink-mute">{subtitle}</div>}</div>
          <div className="flex items-center gap-2">{actions}<button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close"><X size={16} /></button></div>
        </header>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </aside>
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/30 p-4 sm:p-10" onMouseDown={onClose}>
      <div role="dialog" aria-modal className={cls('w-full rounded-xl bg-white shadow-lg', wide ? 'max-w-[860px]' : 'max-w-[540px]')} onMouseDown={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-line px-5 py-3.5"><h2 className="text-[15px] font-semibold">{title}</h2><button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close"><X size={16} /></button></header>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

export function Field({ label, children, help }: { label: string; children: ReactNode; help?: ReactNode }) {
  return <label className="block"><span className="label">{label}</span>{children}{help && <span className="mt-1 block text-[11.5px] text-ink-mute">{help}</span>}</label>;
}

export function KV({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
      {rows.map(([k, v]) => (<div key={k} className="min-w-0"><dt className="text-[11.5px] text-ink-mute">{k}</dt><dd className="truncate text-[13.5px]">{v ?? '—'}</dd></div>))}
    </dl>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="px-6 py-14 text-center"><p className="text-[14px] font-medium">{title}</p>{children && <p className="mt-1 text-[13px] text-ink-mute">{children}</p>}</div>;
}

export function Loading() {
  return <div className="flex items-center justify-center py-16 text-[13px] text-ink-mute"><span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />Loading…</div>;
}

export function Notice({ tone = 'amber', title, items, children }: { tone?: 'amber' | 'red' | 'blue' | 'green'; title: ReactNode; items?: string[]; children?: ReactNode }) {
  const t = { amber: 'border-amber-200 bg-amber-50 text-amber-800', red: 'border-red-200 bg-red-50 text-red-800', blue: 'border-blue-200 bg-blue-50 text-blue-800', green: 'border-green-200 bg-green-50 text-green-800' }[tone];
  return (
    <div className={cls('rounded-lg border px-3 py-2 text-[13px]', t)}>
      <div className="font-medium">{title}</div>
      {items && items.length > 0 && <ul className="mt-1 list-disc space-y-0.5 pl-5">{items.map((i) => <li key={i}>{i}</li>)}</ul>}
      {children}
    </div>
  );
}
