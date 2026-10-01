import {
  Activity, BadgeCheck, Ban, Blocks, BookOpenCheck, Boxes, Building2, CalendarCheck, ChevronDown, ClipboardCheck, ClipboardList, Coins,
  FileCheck2, FileClock, FileSignature, FileStack, FileText, Flag, Gauge, Globe, HardHat, History, Handshake, Landmark, LayoutGrid, ListChecks,
  LogOut, PackageCheck, PanelLeft, Receipt, Rocket, Ruler, Scale, Settings, ShieldAlert, ShieldCheck, ShoppingCart, Tags, Truck, Users, Wrench,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ROLE_LABELS, useAuth } from '../lib/auth';
import { cls } from '../lib/format';

export interface NavItem { to: string; label: string; icon: any; isNew?: boolean }

export const VM_NAV: NavItem[] = [
  { to: '/vm/overview', label: 'Overview', icon: LayoutGrid },
  { to: '/vm/registry', label: 'Vendor Registry', icon: Building2 },
  { to: '/vm/approvals', label: 'Vendor Approvals', icon: BadgeCheck },
  { to: '/vm/compliance', label: 'Compliance Center', icon: ShieldCheck },
  { to: '/vm/holds', label: 'Holds Register', icon: Ban, isNew: true },
  { to: '/vm/requisitions', label: 'Purchase Requisitions', icon: ClipboardList },
  { to: '/vm/rfq', label: 'RFQ & Quotations', icon: Scale },
  { to: '/vm/blanket-orders', label: 'Blanket Orders', icon: Blocks },
  { to: '/vm/price-lists', label: 'Vendor Price Lists', icon: Tags },
  { to: '/vm/purchase-orders', label: 'Purchase Orders', icon: ShoppingCart },
  { to: '/vm/goods-receipts', label: 'Goods Receipts', icon: Truck, isNew: true },
  { to: '/vm/service-receipts', label: 'Service Receipts', icon: PackageCheck, isNew: true },
  { to: '/vm/invoices', label: 'Invoices & Payments', icon: Receipt },
  { to: '/vm/scorecard', label: 'Vendor Scorecard', icon: Gauge },
  { to: '/vm/portal', label: 'Vendor Portal', icon: Globe },
  { to: '/vm/settings', label: 'Procurement Settings', icon: Settings },
];

export const CL_NAV: NavItem[] = [
  { to: '/cl/overview', label: 'Overview', icon: LayoutGrid },
  { to: '/cl/onboarding', label: 'Contractor Onboarding', icon: Users },
  { to: '/cl/contracts', label: 'Contracts', icon: FileSignature },
  { to: '/cl/kickoff', label: 'Contract Kickoff', icon: Rocket, isNew: true },
  { to: '/cl/work-orders', label: 'Work Orders', icon: ClipboardCheck },
  { to: '/cl/change-orders', label: 'Change & Variations', icon: FileStack, isNew: true },
  { to: '/cl/attendance', label: 'Labour Attendance', icon: CalendarCheck },
  { to: '/cl/measurement-book', label: 'Measurement Book', icon: Ruler },
  { to: '/cl/ra-bills', label: 'RA Bills & Certification', icon: FileCheck2 },
  { to: '/cl/financial-security', label: 'Retention & Guarantees', icon: Landmark },
  { to: '/cl/labor-rates', label: 'Labor Rate Management', icon: Coins },
  { to: '/cl/performance', label: 'Performance & Progress', icon: Activity },
  { to: '/cl/safety', label: 'Safety Incidents', icon: ShieldAlert, isNew: true },
  { to: '/cl/closeout', label: 'Close-out & Handover', icon: Flag },
  { to: '/cl/final-settlement', label: 'Final Settlement', icon: Handshake, isNew: true },
  { to: '/cl/release', label: 'Contractor Release', icon: ListChecks, isNew: true },
];

const ADMIN_NAV: NavItem[] = [{ to: '/admin/audit', label: 'Audit Log', icon: History }];

function Group({ title, items, defaultOpen }: { title: string; items: NavItem[]; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-1">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-[14px] text-ink hover:bg-gray-200/60">
        {title}<ChevronDown size={15} className={cls('transition', !open && '-rotate-90')} />
      </button>
      {open && (
        <ul className="mt-0.5 space-y-0.5">
          {items.map((i) => (
            <li key={i.to}>
              <NavLink to={i.to} className={({ isActive }) => cls('relative flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13.5px]', isActive ? 'bg-white font-medium text-brand shadow-card before:absolute before:-left-2 before:top-1.5 before:h-5 before:w-0.5 before:rounded before:bg-brand' : 'text-ink-soft hover:bg-gray-200/60')}>
                <i.icon size={16} strokeWidth={1.8} /><span className="flex-1 truncate">{i.label}</span>
                {i.isNew && <span className="rounded bg-teal-50 px-1 text-[10px] font-semibold text-teal-700">NEW</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Layout() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const loc = useLocation();
  return (
    <div className="flex h-full">
      <aside className={cls('flex shrink-0 flex-col border-r border-line bg-[#f3f4f6] transition-all', collapsed ? 'w-0 overflow-hidden border-0' : 'w-[248px]')}>
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2 text-[17px] font-bold text-brand"><Logo />NebullaONE</div>
          <button className="btn btn-ghost btn-sm" onClick={() => setCollapsed(true)} aria-label="Collapse sidebar"><PanelLeft size={16} /></button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          <Group title="Vendor Management" items={VM_NAV} defaultOpen={loc.pathname.startsWith('/vm') || !loc.pathname.startsWith('/cl')} />
          <Group title="Contract & Labor" items={CL_NAV} defaultOpen={loc.pathname.startsWith('/cl')} />
          {user?.role === 'admin' && <Group title="Administration" items={ADMIN_NAV} defaultOpen={loc.pathname.startsWith('/admin')} />}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 px-4">
          {collapsed && <button className="btn btn-ghost btn-sm" onClick={() => setCollapsed(false)} aria-label="Expand sidebar"><PanelLeft size={16} /></button>}
          <div className="mx-auto hidden items-center gap-1 rounded-xl border border-line bg-white p-1 shadow-card md:flex">
            <span className="flex items-center gap-1.5 rounded-lg bg-brand-soft px-3 py-1 text-[13px] font-medium text-brand"><Wrench size={14} />Productivity</span>
            <span className="flex items-center gap-1.5 px-3 py-1 text-[13px] text-ink-faint" title="Not part of this build"><Activity size={14} />Activity</span>
            <span className="flex items-center gap-1.5 px-3 py-1 text-[13px] text-ink-faint" title="Not part of this build"><HardHat size={14} />HRMS</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block"><div className="text-[13px] font-medium leading-4">{user?.name}</div><div className="text-[11.5px] text-ink-mute">{user && ROLE_LABELS[user.role]}</div></div>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-[13px] font-semibold text-white">{user?.name?.[0] ?? '?'}</span>
            <button className="btn btn-ghost btn-sm" onClick={logout} title="Sign out" aria-label="Sign out"><LogOut size={16} /></button>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-hidden px-3 pb-3"><Outlet /></main>
      </div>
    </div>
  );
}

export function Logo() {
  return (
    <svg viewBox="0 0 40 40" className="h-5 w-5"><circle cx="11" cy="11" r="8" fill="#3b82f6" /><circle cx="29" cy="11" r="8" fill="#14b8a6" /><circle cx="11" cy="29" r="8" fill="#14b8a6" /><circle cx="29" cy="29" r="8" fill="#3b82f6" /></svg>
  );
}

/** Page frame: white card with an icon title bar, optional tabs, and content. */
export function Page({ title, icon: Icon, actions, tabs, children, scroll }: { title: string; icon?: any; actions?: ReactNode; tabs?: ReactNode; children: ReactNode; scroll?: boolean }) {
  return (
    <div className="card flex h-full flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        {Icon && <span className="rounded-lg bg-brand-soft p-2 text-brand"><Icon size={18} /></span>}
        <h1 className="text-[16px] font-semibold">{title}</h1>
        <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>
      </div>
      {tabs}
      <div className={cls('flex min-h-0 flex-1 flex-col', scroll && 'overflow-y-auto')}>{children}</div>
    </div>
  );
}

export const Icons = { Boxes, BookOpenCheck, FileClock, FileText };
