// Core: aliases to the host bundle's components, persistent demo store,
// formatting helpers and a small UI kit shared by every Vendor / Contract page.
//
// Host bundle names used here (minified, stable for this build):
//   B card · H page header · nr tab bar · se toolbar · ue stat tile · S th · g td
//   rt footer bar · le status badge · Ws progress bar · Te empty state · R classnames
//   fn useNavigate · Ht useLocation · Zn Link · at auth store

const Card = B, PageHeader = H, TabBar = nr, Toolbar = se, StatTile = ue, Th = S, Td = g;
const FooterBar = rt, StatusPill = le, Progress = Ws, EmptyState = Te, cls = R;
const useNavigate = fn, RouterLink = Zn;

const Icon = {
  activity: Pp, archive: V1, arrowLeft: Q1, arrowRight: Mp, book: q1, boxes: Ds, briefcase: vo,
  building: cn, calendar: jo, calendarClock: zp, chart: K1, chevronDown: Xn, chevronRight: ko,
  alert: wo, check: et, clipboardCheck: Yu, clipboardList: Jr, clock: Fs, download: Rp, more: Ap,
  eye: tx, factory: nx, fileClock: _p, filePlus: rx, sheet: Op, file: Is, fileX: lx, filter: No,
  flag: sx, folderCheck: ix, folder: ax, gauge: ox, branch: ux, globe: cx, grid: px, info: Fp,
  layers: Fn, listChecks: So, lock: Ip, mail: vx, pin: jx, network: wx, package: Nx, plus: Us,
  receipt: Px, refresh: Mx, ruler: Tx, save: zx, scale: xs, search: er, settings: va, shapes: Co,
  shieldCheck: $p, shield: Wp, sliders: Eo, sparkles: Lx, star: Rx, target: ja, timer: Ax,
  trending: Po, warning: Vp, userCheck: _x, userPlus: Ox, user: Hp, users: Bs, wrench: Dx, zap: Fx,
  handshake: vo,
};


// Extra lucide icons built with the bundle's own icon factory (N)
const mkIcon = (name, nodes) => N(name, nodes.map((n, i) => [n[0], { ...n[1], key: "k" + i }]));
Object.assign(Icon, {
  x: mkIcon("X", [["path", { d: "M18 6 6 18" }], ["path", { d: "m6 6 12 12" }]]),
  pencil: mkIcon("Pencil", [["path", { d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" }], ["path", { d: "m15 5 4 4" }]]),
  trash: mkIcon("Trash2", [["path", { d: "M3 6h18" }], ["path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" }], ["path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" }], ["line", { x1: "10", x2: "10", y1: "11", y2: "17" }], ["line", { x1: "14", x2: "14", y1: "11", y2: "17" }]]),
  send: mkIcon("Send", [["path", { d: "M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" }], ["path", { d: "m21.854 2.147-10.94 10.939" }]]),
  hardHat: mkIcon("HardHat", [["path", { d: "M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5" }], ["path", { d: "M14 6a6 6 0 0 1 6 6v3" }], ["path", { d: "M4 15v-3a6 6 0 0 1 6-6" }], ["rect", { x: "2", y: "15", width: "20", height: "4", rx: "1" }]]),
  rupee: mkIcon("IndianRupee", [["path", { d: "M6 3h12" }], ["path", { d: "M6 8h12" }], ["path", { d: "m6 13 8.5 8" }], ["path", { d: "M6 13h3" }], ["path", { d: "M9 13c6.667 0 6.667-10 0-10" }]]),
  percent: mkIcon("Percent", [["line", { x1: "19", x2: "5", y1: "5", y2: "19" }], ["circle", { cx: "6.5", cy: "6.5", r: "2.5" }], ["circle", { cx: "17.5", cy: "17.5", r: "2.5" }]]),
  upload: mkIcon("Upload", [["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }], ["polyline", { points: "17 8 12 3 7 8" }], ["line", { x1: "12", x2: "12", y1: "3", y2: "15" }]]),
  ban: mkIcon("Ban", [["circle", { cx: "12", cy: "12", r: "10" }], ["path", { d: "m4.9 4.9 14.2 14.2" }]]),
  truck: mkIcon("Truck", [["path", { d: "M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" }], ["path", { d: "M15 18H9" }], ["path", { d: "M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" }], ["circle", { cx: "17", cy: "18", r: "2" }], ["circle", { cx: "7", cy: "18", r: "2" }]]),
  wallet: mkIcon("Wallet", [["path", { d: "M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" }], ["path", { d: "M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" }]]),
  message: mkIcon("MessageSquare", [["path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" }]]),
});

// ---------------------------------------------------------------- helpers
const DAY = 86400000;
const todayISO = () => new Date().toISOString().slice(0, 10);
const shiftDays = (n, from) => new Date((from ? new Date(from) : new Date()).getTime() + n * DAY).toISOString().slice(0, 10);
const daysUntil = (iso) => (iso ? Math.round((new Date(iso).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / DAY) : null);
const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" }) : "—";
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const num = (n, d = 2) => (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: d });
const inr = (n) => "₹" + (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const inrShort = (n) => {
  const v = Number(n) || 0, a = Math.abs(v);
  if (a >= 1e7) return "₹" + (v / 1e7).toFixed(2) + " Cr";
  if (a >= 1e5) return "₹" + (v / 1e5).toFixed(2) + " L";
  return inr(v);
};
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
const sum = (arr, f = (x) => x) => arr.reduce((s, x, i) => s + (Number(f(x, i)) || 0), 0);
const byId = (list, id) => list.find((x) => x.id === id);
const nextId = (prefix, list, pad = 3) => {
  const n = list.reduce((m, x) => Math.max(m, parseInt(String(x.id).split("-").pop(), 10) || 0), 0) + 1;
  return `${prefix}-${String(n).padStart(pad, "0")}`;
};
const currentUser = () => {
  const u = at.user();
  return (u && u.name) || "Demo User";
};
const PROJECTS = [
  "Skyline Towers — Phase 1",
  "Metro Line Extension",
  "400kV Transmission Line A",
  "Riverside Business Park",
  "Solar Farm Substation",
];

// Status → tone for the host StatusPill
const TONE = {
  active: "green", approved: "green", verified: "green", certified: "green", paid: "green", signed: "green",
  compliant: "green", completed: "green", awarded: "green", received: "green", onboarded: "green", released: "green",
  "spend authorized": "green", closed: "gray", superseded: "gray", disabled: "gray", draft: "gray", expired: "red",
  submitted: "blue", issued: "blue", "in progress": "blue", sent: "blue", "quotes received": "purple", "in review": "blue",
  "pending approval": "amber", pending: "amber", "partially paid": "amber", "partially received": "amber", expiring: "amber",
  "on hold": "amber", "docs pending": "amber", prospective: "purple", "under review": "blue", open: "amber",
  unpaid: "amber", overdue: "red", rejected: "red", blacklisted: "red", "non-compliant": "red", disputed: "red",
  missing: "red", "action required": "red", held: "purple", "in dlp": "purple",
};
function Status({ children, tone }) {
  return <StatusPill tone={tone || TONE[String(children).toLowerCase()] || "gray"}>{children}</StatusPill>;
}

// ---------------------------------------------------------------- store
const STORE_KEY = "nxv-store-v1";
const listeners = new Set();
let state = null;

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.version === SEED_VERSION) return s;
    }
  } catch {}
  return buildSeed();
}
function getState() {
  if (!state) state = loadState();
  return state;
}
function setState(mutator, audit) {
  const next = structuredClone(getState());
  mutator(next);
  if (audit) next.audit.unshift({ at: new Date().toISOString(), by: currentUser(), ...audit });
  next.audit = next.audit.slice(0, 400);
  state = next;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(next));
  } catch {}
  listeners.forEach((l) => l());
}
function resetDemoData() {
  state = buildSeed();
  try {
    localStorage.removeItem(STORE_KEY);
  } catch {}
  listeners.forEach((l) => l());
}
function useStore() {
  const [, force] = y.useReducer((x) => x + 1, 0);
  y.useEffect(() => {
    listeners.add(force);
    return () => listeners.delete(force);
  }, []);
  return getState();
}

// Toasts
const toastListeners = new Set();
function toast(text, tone = "green") {
  toastListeners.forEach((l) => l({ id: Math.random(), text, tone }));
}
function Toaster() {
  const [items, setItems] = y.useState([]);
  y.useEffect(() => {
    const on = (t) => {
      setItems((xs) => [...xs, t]);
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== t.id)), 2600);
    };
    toastListeners.add(on);
    return () => toastListeners.delete(on);
  }, []);
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[80] flex flex-col items-end gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={cls(
            "flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-[13px] shadow-lg",
            t.tone === "red" ? "border-red-200 text-red-700" : "border-green-200 text-green-700"
          )}
        >
          {h(t.tone === "red" ? Icon.alert : Icon.check, { size: 14 })}
          <span className="text-ink">{t.text}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- UI kit
function Btn({ variant = "secondary", icon, children, className, size = "md", ...rest }) {
  const v = {
    primary: "bg-brand text-white hover:bg-brand-dark border border-brand",
    secondary: "border border-line bg-white text-ink hover:bg-gray-50",
    ghost: "text-ink-soft hover:bg-gray-100",
    danger: "border border-red-200 bg-white text-red-600 hover:bg-red-50",
    success: "border border-green-600 bg-green-600 text-white hover:bg-green-700",
  }[variant];
  return (
    <button
      type="button"
      className={cls(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md font-medium disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-[26px] px-2 text-[12px]" : "h-[28px] px-2.5 text-[13px]",
        v,
        className
      )}
      {...rest}
    >
      {icon && h(icon, { size: size === "sm" ? 13 : 14 })}
      {children}
    </button>
  );
}

function IconBtn({ icon, title, onClick, className }) {
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick}
      className={cls("grid h-7 w-7 place-items-center rounded-md text-ink-soft hover:bg-gray-100 hover:text-ink", className)}>
      {h(icon, { size: 15 })}
    </button>
  );
}

function useEscape(open, onClose) {
  y.useEffect(() => {
    if (!open) return;
    const k = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
}

function Modal({ open, title, subtitle, onClose, footer, width = 640, children }) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-gray-900/30 px-4 py-10" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full rounded-xl bg-white shadow-2xl" style={{ maxWidth: width }}
        onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-3">
          <div>
            <h2 className="text-[15px] font-semibold">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[12.5px] text-ink-soft">{subtitle}</p>}
          </div>
          <IconBtn icon={Icon.x} title="Close" onClick={onClose} />
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-line bg-gray-50/70 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

function Drawer({ open, title, subtitle, onClose, actions, width = 760, children }) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[55] flex justify-end bg-gray-900/25" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="flex h-full w-full flex-col bg-white shadow-2xl" style={{ maxWidth: width }}
        onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-[15.5px] font-semibold">{title}</h2>
            {subtitle && <div className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-soft">{subtitle}</div>}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <IconBtn icon={Icon.x} title="Close" onClick={onClose} />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

const inputCls =
  "h-[32px] w-full rounded-md border border-line bg-white px-2.5 text-[13px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";
function Field({ label, hint, required, span = 1, children }) {
  return (
    <label className={cls("block", span === 2 && "col-span-2", span === 3 && "col-span-3", span === 4 && "col-span-4")}>
      <span className="mb-1 block text-[12px] font-medium text-ink-soft">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-ink-mute">{hint}</span>}
    </label>
  );
}
function TextInput({ value, onChange, ...rest }) {
  return <input className={inputCls} value={value ?? ""} onChange={(e) => onChange(e.target.value)} {...rest} />;
}
function NumInput({ value, onChange, ...rest }) {
  return (
    <input type="number" className={cls(inputCls, "num")} value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} {...rest} />
  );
}
function DateInput({ value, onChange, ...rest }) {
  return <input type="date" className={inputCls} value={value ?? ""} onChange={(e) => onChange(e.target.value)} {...rest} />;
}
function Select({ value, onChange, options, placeholder, ...rest }) {
  return (
    <select className={inputCls} value={value ?? ""} onChange={(e) => onChange(e.target.value)} {...rest}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => {
        const v = typeof o === "object" ? o.value : o, l2 = typeof o === "object" ? o.label : o;
        return <option key={v} value={v}>{l2}</option>;
      })}
    </select>
  );
}
function TextArea({ value, onChange, rows = 3, ...rest }) {
  return (
    <textarea rows={rows} className={cls(inputCls, "h-auto py-2")} value={value ?? ""} onChange={(e) => onChange(e.target.value)} {...rest} />
  );
}
function Check({ checked, onChange, label }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-ink">
      <input type="checkbox" className="h-4 w-4 rounded border-gray-300 accent-[#0b5ed7]" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
function ChipPicker({ options, value = [], onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button key={o} type="button" onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
            className={cls("rounded-full border px-2.5 py-[3px] text-[12px]",
              on ? "border-brand bg-brand-soft font-medium text-brand" : "border-line bg-white text-ink-soft hover:bg-gray-50")}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

function SearchBox({ value, onChange, placeholder = "Search..." }) {
  return (
    <label className="flex h-[28px] w-[220px] items-center gap-2 rounded-md border border-line bg-white px-2 text-[13px] text-ink-mute">
      {h(Icon.search, { size: 13 })}
      <input className="w-full bg-transparent text-ink outline-none placeholder:text-ink-mute" placeholder={placeholder}
        value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
function FilterSelect({ value, onChange, options, label }) {
  return (
    <select aria-label={label} className="h-[28px] rounded-md border border-line bg-white px-2 text-[13px] text-ink outline-none"
      value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => {
        const v = typeof o === "object" ? o.value : o, l2 = typeof o === "object" ? o.label : o;
        return <option key={v} value={v}>{l2}</option>;
      })}
    </select>
  );
}

// Generic table built on the host's th/td cells
function DataTable({ columns, rows, onRow, rowKey = (r) => r.id, empty, footer, dense }) {
  if (!rows.length) return empty || <EmptyState icon={Icon.folder} title="Nothing here yet" text="Records you add will appear in this list." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            {columns.map((c) => (
              <Th key={c.key} align={c.align} className={c.thClass}>{c.label}</Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={rowKey(r, i)} onClick={onRow ? () => onRow(r) : undefined} className={cls("hover:bg-gray-50", onRow && "cursor-pointer")}>
              {columns.map((c) => (
                <Td key={c.key} align={c.align} className={cls(c.num && "num", dense && "py-[5px]", c.className)}>
                  {c.render ? c.render(r, i) : r[c.key]}
                </Td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer}
      </table>
    </div>
  );
}

function StatGrid({ children, cols = 4 }) {
  return <div className={cls("grid gap-3 border-b border-line p-4", cols === 5 ? "grid-cols-5" : cols === 3 ? "grid-cols-3" : "grid-cols-4")}>{children}</div>;
}

function Section({ title, icon, actions, children, className }) {
  return (
    <section className={cls("rounded-xl border border-line bg-white", className)}>
      {(title || actions) && (
        <div className="flex min-h-[40px] items-center justify-between gap-2 border-b border-line px-4 py-2">
          <h3 className="flex items-center gap-2 text-[13.5px] font-semibold">
            {icon && h(icon, { size: 14, className: "text-brand" })}
            {title}
          </h3>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

function KV({ items, cols = 3 }) {
  return (
    <dl className={cls("grid gap-x-6 gap-y-3 p-4", cols === 2 ? "grid-cols-2" : cols === 4 ? "grid-cols-4" : "grid-cols-3")}>
      {items.filter(Boolean).map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-[11.5px] font-medium text-ink-mute">{k}</dt>
          <dd className="mt-0.5 truncate text-[13px] text-ink">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

// Horizontal approval / workflow stepper
function Stepper({ steps }) {
  return (
    <ol className="flex flex-wrap items-start gap-y-3">
      {steps.map((s, i) => {
        const tone =
          s.status === "done" ? "border-green-500 bg-green-500 text-white"
            : s.status === "current" ? "border-brand bg-brand-soft text-brand"
            : s.status === "rejected" ? "border-red-500 bg-red-500 text-white"
            : "border-gray-300 bg-white text-ink-mute";
        return (
          <li key={s.label} className="flex min-w-[120px] flex-1 items-start">
            <div className="flex flex-col items-center text-center">
              <span className={cls("grid h-7 w-7 place-items-center rounded-full border-2 text-[11px] font-semibold", tone)}>
                {s.status === "done" ? h(Icon.check, { size: 14 }) : s.status === "rejected" ? "✕" : i + 1}
              </span>
              <span className="mt-1.5 text-[12px] font-medium text-ink">{s.label}</span>
              {s.meta && <span className="mt-0.5 max-w-[140px] text-[11px] leading-4 text-ink-mute">{s.meta}</span>}
            </div>
            {i < steps.length - 1 && <span className={cls("mx-1 mt-3.5 h-[2px] flex-1 rounded", s.status === "done" ? "bg-green-400" : "bg-gray-200")} />}
          </li>
        );
      })}
    </ol>
  );
}

// Simple horizontal bar list (values share one scale)
function BarList({ rows, format = (v) => v, max, color = "bg-brand" }) {
  const m = max || Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5 p-4">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[150px_1fr_90px] items-center gap-3 text-[12.5px]">
          <span className="truncate text-ink-soft" title={r.label}>{r.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-gray-100">
            <span className={cls("block h-full rounded-full", r.color || color)} style={{ width: `${Math.max(2, (r.value / m) * 100)}%` }} />
          </span>
          <span className="num text-right font-medium text-ink">{format(r.value)}</span>
        </li>
      ))}
    </ul>
  );
}

function ScoreRing({ value, size = 44 }) {
  const r = (size - 6) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, value || 0));
  const col = v >= 80 ? "#16a34a" : v >= 60 ? "#d97706" : "#dc2626";
  return (
    <span className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth="5" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={`${(v / 100) * c} ${c}`} />
      </svg>
      <span className="num absolute text-[11.5px] font-bold" style={{ color: col }}>{Math.round(v)}</span>
    </span>
  );
}

function Stars({ value = 0, onChange }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onChange} onClick={() => onChange && onChange(n)} aria-label={`${n} star`}
          className={cls("leading-none", n <= value ? "text-amber-400" : "text-gray-300", onChange && "hover:scale-110")}>
          {h(Icon.star, { size: 15, fill: n <= value ? "currentColor" : "none" })}
        </button>
      ))}
    </span>
  );
}

function Note({ tone = "blue", icon, children }) {
  const t = {
    blue: "border-blue-200 bg-blue-50/60 text-blue-800",
    amber: "border-amber-200 bg-amber-50/70 text-amber-800",
    red: "border-red-200 bg-red-50/70 text-red-700",
    green: "border-green-200 bg-green-50/70 text-green-800",
  }[tone];
  return (
    <div className={cls("flex items-start gap-2 rounded-lg border px-3 py-2 text-[12.5px] leading-5", t)}>
      {h(icon || (tone === "red" || tone === "amber" ? Icon.warning : Icon.info), { size: 14, className: "mt-0.5 shrink-0" })}
      <div>{children}</div>
    </div>
  );
}

function PageFooter({ items }) {
  return <FooterBar items={items} updated={new Date().toLocaleString("en-IN")} />;
}

// Reset-demo action shown in page headers
function DemoMenu() {
  const [open, setOpen] = y.useState(false);
  return (
    <div className="relative">
      <IconBtn icon={Icon.more} title="More actions" onClick={() => setOpen((o) => !o)} />
      {open && (
        <div className="absolute right-0 z-40 mt-1 w-52 rounded-lg border border-line bg-white p-1 text-[13px] shadow-lg" onMouseLeave={() => setOpen(false)}>
          <button className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left hover:bg-gray-100"
            onClick={() => { resetDemoData(); setOpen(false); toast("Demo data reset"); }}>
            {h(Icon.refresh, { size: 14, className: "text-ink-mute" })} Reset demo data
          </button>
        </div>
      )}
    </div>
  );
}

// Page wrapper: host card + header + toaster
function Page({ title, subtitle, icon, actions, children }) {
  return (
    <Card>
      <PageHeader title={title} subtitle={subtitle} icon={icon}
        actions={<>{actions}<DemoMenu /></>} />
      {children}
      <Toaster />
    </Card>
  );
}

// Link-styled button to jump between related records
function RefLink({ to, children }) {
  return (
    <RouterLink to={to} onClick={(e) => e.stopPropagation()} className="font-medium text-brand hover:underline">
      {children}
    </RouterLink>
  );
}
