import { ReactNode, useState } from "react";
import {
  AlertTriangle, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Download,
  FolderOpen, LayoutGrid, Lightbulb, List, MoreHorizontal, Plus, Search, Sparkles, Filter,
  LucideIcon,
} from "lucide-react";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* ── Brand ─────────────────────────────────────────── */
export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#14b8a6" />
        </linearGradient>
      </defs>
      <circle cx="11" cy="11" r="8" fill="url(#lg)" />
      <circle cx="29" cy="11" r="8" fill="#14b8a6" />
      <circle cx="11" cy="29" r="8" fill="#14b8a6" />
      <circle cx="29" cy="29" r="8" fill="url(#lg)" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2 text-[17px] font-bold tracking-tight">
      <LogoMark size={17} />
      <span>
        <span className="text-[#3b82f6]">Nebulla</span>
        <span className="text-teal-brand">ONE</span>
      </span>
    </span>
  );
}

/* ── Buttons ───────────────────────────────────────── */
export function PrimaryButton({ icon: Icon = Plus, children, onClick }: { icon?: LucideIcon; children: ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex h-[28px] items-center gap-1.5 rounded-md bg-brand px-2.5 text-[13px] font-medium text-white hover:bg-brand-dark">
      <Icon size={14} strokeWidth={2.2} />
      {children}
    </button>
  );
}

export function AskAIButton() {
  return (
    <button className="inline-flex h-[28px] items-center gap-1.5 rounded-md bg-gradient-to-r from-[#2cc6a8] to-[#60a5fa] px-2.5 text-[13px] font-semibold text-white">
      <Sparkles size={14} />
      Ask AI
    </button>
  );
}

export function SelectProject({ value, onChange }: { value?: string; onChange?: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const projects = ["Skyline Towers — Phase 1", "Metro Line Extension", "400kV Transmission Line A"];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-[28px] items-center gap-1.5 rounded-md border border-line bg-white px-2.5 text-[13px] text-ink hover:bg-gray-50"
      >
        <FolderOpen size={13} className="text-ink-mute" />
        <span className="max-w-[160px] truncate">{value ?? "Select project"}</span>
        <ChevronDown size={12} className="text-ink-mute" />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-60 rounded-lg border border-line bg-white p-1 shadow-lg">
          {projects.map((p) => (
            <button key={p} onClick={() => { onChange?.(p); setOpen(false); }} className="block w-full rounded-md px-2.5 py-1.5 text-left text-[13px] hover:bg-gray-100">
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function GhostButton({ icon: Icon, children }: { icon?: LucideIcon; children: ReactNode }) {
  return (
    <button className="inline-flex h-[28px] items-center gap-1.5 rounded-md border border-line bg-white px-2.5 text-[13px] font-medium text-ink hover:bg-gray-50">
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}

/* ── Page card ─────────────────────────────────────── */
export function PageCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("flex min-h-full flex-col overflow-hidden rounded-xl bg-white shadow-card", className)}>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, icon: Icon, actions }: { title: string; subtitle?: string; icon?: LucideIcon; actions?: ReactNode }) {
  return (
    <div className="flex min-h-[44px] items-center justify-between gap-3 border-b border-line px-4 py-2">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-soft text-brand">
            <Icon size={18} />
          </span>
        )}
        <div>
          <h1 className="text-[15.5px] font-semibold leading-tight tracking-tight">{title}</h1>
          {subtitle && <p className="mt-0.5 text-[13.5px] text-ink-soft">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Tabs({ tabs, active, onChange }: { tabs: { id: string; label: string; icon?: LucideIcon }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="flex gap-1 border-b border-line px-3">
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={cx(
              "-mb-px flex h-[36px] items-center gap-1.5 border-b-2 px-3 text-[13px]",
              on ? "border-brand font-medium text-brand" : "border-transparent text-ink-soft hover:text-ink",
            )}
          >
            {t.icon && <t.icon size={13} />}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function Toolbar({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex min-h-[40px] items-center justify-between gap-2 border-b border-line px-4 py-1.5">
      <div className="flex items-center gap-2">{left}</div>
      <div className="flex items-center gap-3 text-ink-soft">{right ?? <Search size={15} />}</div>
    </div>
  );
}

export function ViewToggle({ grid = true }: { grid?: boolean }) {
  const [v, setV] = useState<"list" | "grid">("list");
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5">
      <button onClick={() => setV("list")} className={cx("flex h-[26px] items-center gap-1 rounded-md px-2 text-[13px]", v === "list" ? "bg-white font-medium text-brand shadow-sm" : "text-ink-soft")}>
        <List size={13} /> List
      </button>
      {grid && (
        <button onClick={() => setV("grid")} className={cx("grid h-[26px] w-[26px] place-items-center rounded-md", v === "grid" ? "bg-white text-brand shadow-sm" : "text-ink-soft")}>
          <LayoutGrid size={13} />
        </button>
      )}
    </div>
  );
}

export const Divider = () => <span className="mx-1 h-5 w-px bg-line" />;
export const StatusDot = () => <span className="mx-1.5 h-2 w-2 rounded-full bg-gray-400" />;

export function IconBtn({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <button className="grid h-7 w-7 place-items-center rounded-md text-ink-soft hover:bg-gray-100">
      <Icon size={15} />
    </button>
  );
}

export function DatesButton() {
  return (
    <button className="flex h-[28px] w-[125px] items-center gap-1.5 rounded-md border border-line px-2 text-[12px] text-ink-mute">
      <CalendarDays size={13} /> Set dates
    </button>
  );
}

export function Dropdown({ label, width = 150 }: { label: string; width?: number }) {
  return (
    <button style={{ width }} className="flex h-[28px] items-center justify-between rounded-md border border-line bg-white px-3 text-[13px] text-ink">
      {label}
      <ChevronDown size={13} className="text-ink-mute" />
    </button>
  );
}

export const SearchMore = () => (
  <>
    <Search size={15} />
    <MoreHorizontal size={15} />
  </>
);
export const SearchFilter = () => (
  <>
    <Search size={15} />
    <Filter size={15} />
  </>
);
export const SearchDownload = () => (
  <>
    <Search size={15} />
    <Download size={15} />
  </>
);

/* ── Empty / error states ──────────────────────────── */
export function EmptyState({
  icon: Icon, title, text, action, tips, className,
}: {
  icon: LucideIcon; title: string; text?: string; action?: ReactNode;
  tips?: { icon: LucideIcon; title: string; text: string }[]; className?: string;
}) {
  return (
    <div className={cx("flex flex-col items-center px-6 text-center", className ?? "py-16")}>
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand">
        <Icon size={24} />
      </span>
      <h3 className="mt-4 text-[14px] font-semibold">{title}</h3>
      {text && <p className="mt-2 max-w-[440px] text-[13px] leading-5 text-ink-soft">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
      {tips && (
        <div className="mt-8 w-full max-w-[450px] rounded-xl border border-dashed border-gray-300 bg-gray-50/60 p-4 text-left">
          <p className="flex items-center gap-2 text-[12px] font-semibold">
            <Lightbulb size={13} className="text-amber-500" /> Tips to get started
          </p>
          <ul className="mt-3 space-y-3">
            {tips.map((t) => (
              <li key={t.title} className="flex gap-2.5">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border border-line bg-white text-brand">
                  <t.icon size={11} />
                </span>
                <span>
                  <span className="block text-[12px] font-medium">{t.title}</span>
                  <span className="block text-[11.5px] leading-[17px] text-ink-soft">{t.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ErrorState({ title, onRetry }: { title: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <AlertTriangle size={38} strokeWidth={1.6} className="text-red-400" />
      <p className="mt-3 text-[13px] font-medium">{title}</p>
      <button onClick={onRetry} className="mt-4 rounded-md border border-line bg-gray-50 px-3 py-1 text-[13px] hover:bg-gray-100">
        Try again
      </button>
    </div>
  );
}

export function ComingSoon({ icon, name }: { icon: LucideIcon; name: string }) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <EmptyState icon={icon} title="Coming Soon" text={`${name} is being rebuilt as part of the new Cost Center module.`} />
    </div>
  );
}

export function PickHint({ icon: Icon, title, text, cta }: { icon: LucideIcon; title: string; text: string; cta: string }) {
  return (
    <div className="flex flex-col items-center py-14 text-center">
      <span className="relative grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-b from-brand-soft to-white text-brand shadow-sm">
        <Icon size={22} />
        <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-white text-[9px] text-brand shadow">✦</span>
      </span>
      <h3 className="mt-4 text-[14px] font-semibold">{title}</h3>
      <p className="mt-2 max-w-[300px] text-[13px] leading-5 text-ink-mute">{text}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-dashed border-blue-300 bg-blue-50/50 px-3 py-1 text-[11.5px] font-medium text-brand">
        <Icon size={11} /> {cta}
      </span>
    </div>
  );
}

export function TipBar() {
  return (
    <div className="mx-auto mb-3 mt-auto flex w-[512px] items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 shadow-sm">
      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-brand">TIP</span>
      <span className="truncate text-[11.5px] text-ink-soft">
        <b className="font-semibold text-brand">Complete Work Items:</b> Mark activities, tasks, or sub-tasks as 100% complete to send them for approval.
      </span>
      <span className="ml-auto flex items-center gap-1">
        <span className="h-1 w-3.5 rounded-full bg-brand" />
        {[0, 1, 2, 3, 4].map((i) => <span key={i} className="h-1 w-1 rounded-full bg-gray-300" />)}
      </span>
    </div>
  );
}

/* ── Stat cards ────────────────────────────────────── */
const tones = {
  blue: "border-blue-200 bg-blue-50/70 text-blue-700",
  purple: "border-violet-200 bg-violet-50/70 text-violet-700",
  amber: "border-amber-200 bg-amber-50/70 text-amber-700",
  green: "border-green-200 bg-green-50/70 text-green-700",
  red: "border-red-200 bg-red-50/70 text-red-600",
  orange: "border-orange-200 bg-orange-50/70 text-orange-600",
  cyan: "border-cyan-200 bg-cyan-50/70 text-cyan-700",
};
export type Tone = keyof typeof tones;
const dots: Record<Tone, string> = {
  blue: "bg-blue-500", purple: "bg-violet-500", amber: "bg-amber-500", green: "bg-green-500",
  red: "bg-red-500", orange: "bg-orange-500", cyan: "bg-cyan-500",
};

export function StatCard({ label, value, sub, icon: Icon, tone }: { label: string; value: ReactNode; sub?: string; icon?: LucideIcon; tone: Tone }) {
  return (
    <div className={cx("flex items-start justify-between rounded-xl border px-4 py-3", tones[tone])}>
      <div>
        <p className="flex items-center gap-1.5 text-[11.5px] font-semibold">
          <span className={cx("h-1.5 w-1.5 rounded-full", dots[tone])} />
          {label}
        </p>
        <p className="mt-0.5 flex items-baseline gap-1.5">
          <span className="mono text-[18px] font-bold">{value}</span>
          {sub && <span className="text-[11.5px] opacity-70">{sub}</span>}
        </p>
      </div>
      {Icon && (
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/60">
          <Icon size={15} />
        </span>
      )}
    </div>
  );
}

/* ── Table pieces ──────────────────────────────────── */
export function Th({ children, align = "left", className }: { children?: ReactNode; align?: "left" | "right" | "center"; className?: string }) {
  return (
    <th className={cx("whitespace-nowrap border-b border-r border-line bg-gray-50 px-3 py-2.5 text-[11.5px] font-semibold tracking-wide text-ink-soft last:border-r-0", `text-${align}`, className)}>
      {children}
    </th>
  );
}

export function Td({ children, align = "left", className }: { children?: ReactNode; align?: "left" | "right" | "center"; className?: string }) {
  return (
    <td className={cx("whitespace-nowrap border-b border-r border-line px-3 py-[7px] text-[13.5px] last:border-r-0", `text-${align}`, className)}>
      {children}
    </td>
  );
}

export function FooterStats({ items, updated, range }: { items: { value: ReactNode; label: string; color?: string }[]; updated?: string; range?: string }) {
  return (
    <div className="mt-auto flex h-[40px] items-center border-t border-line px-4 text-[11.5px] text-ink-mute">
      <div className="flex flex-1 items-center justify-center gap-3">
        {items.map((it, i) => (
          <span key={it.label} className="flex items-center gap-3">
            {i > 0 && <span className="h-3 w-px bg-line" />}
            <span>
              <b className={cx("font-semibold", it.color ?? "text-ink")}>{it.value}</b> {it.label}
            </span>
          </span>
        ))}
        {updated && (
          <>
            <span className="h-3 w-px bg-line" />
            <span className="text-ink-faint">Last updated: {updated}</span>
          </>
        )}
      </div>
      {range && (
        <span className="flex items-center gap-3 text-ink">
          <b className="font-semibold">{range}</b>
          <ChevronLeft size={13} className="text-ink-faint" />
          <ChevronRight size={13} className="text-ink-faint" />
        </span>
      )}
    </div>
  );
}

export const nowStamp = () =>
  new Date().toLocaleString("en-IN", { day: "numeric", month: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" });

/* ── Badges / progress ─────────────────────────────── */
const badgeTone: Record<string, string> = {
  green: "border-green-200 bg-green-50 text-green-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  red: "border-red-200 bg-red-50 text-red-600",
  gray: "border-gray-200 bg-gray-50 text-ink-soft",
  purple: "border-violet-200 bg-violet-50 text-violet-700",
};
const statusTone: Record<string, keyof typeof badgeTone> = {
  "on track": "green", approved: "green", completed: "green", active: "green", achieved: "green", present: "green",
  "in progress": "blue", submitted: "blue", "in review": "blue", upcoming: "blue", "gantry filled": "purple",
  "at risk": "amber", pending: "amber", draft: "amber", "in draft": "amber", late: "amber", planned: "amber", "not started": "gray",
  delayed: "red", overdue: "red", rejected: "red", leave: "red", inactive: "gray",
};

export function Badge({ children, tone }: { children: string; tone?: keyof typeof badgeTone }) {
  const t = tone ?? statusTone[children.toLowerCase()] ?? "gray";
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-md border px-1.5 py-[1px] text-[11.5px] font-medium", badgeTone[t])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {children}
    </span>
  );
}

export function Progress({ value, color = "bg-brand" }: { value: number; color?: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-200">
        <span className={cx("block h-full rounded-full", color)} style={{ width: `${Math.min(100, value)}%` }} />
      </span>
      <span className="num w-9 text-right text-[12px] text-ink-soft">{value}%</span>
    </span>
  );
}
