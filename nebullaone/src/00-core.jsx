// Core: aliases to the host bundle's components, persistent demo store,
// formatting helpers and a small UI kit shared by every Vendor / Contract page.
//
// Host bundle names used here (minified, stable for this build):
//   B card · H page header · nr tab bar · se toolbar · ue stat tile · S th · g td
//   rt footer bar · le status badge · Ws progress bar · Te empty state · R classnames
//   fn useNavigate · Ht useLocation · Zn Link · at auth store

const Card = B, PageHeader = H, TabBar = nr, Toolbar = se, Th = S, Td = g;
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
  "changes requested": "amber", invited: "amber", registered: "green", declined: "red", quoted: "green", "not sent": "gray", "under review": "blue",
  returned: "red", ordered: "green", "partially ordered": "purple", "partially awarded": "purple", "to send": "blue", waiting: "amber", late: "red",
  "fully billed": "green", "partially billed": "purple", "waiting bills": "amber", "nothing to bill": "gray", "fully consumed": "gray", cancelled: "gray",
  exception: "amber", "claim submitted": "blue",
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
// Settings without forcing a load — safe to call while the seed is being built
const currentSettings = () => settingsOf(state || {});
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

// Detail-panel tabs (Project Center style): plain text, single line, blue when active
function DetailTabs({ tabs, active, onChange }) {
  return (
    <div role="tablist" className="flex gap-7 overflow-x-auto border-b border-line px-6">
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button key={t.id} type="button" role="tab" aria-selected={on} onClick={() => onChange(t.id)}
            className={cls("-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 pb-3 pt-1 text-[14px]",
              on ? "border-brand font-medium text-brand" : "border-transparent text-ink hover:text-brand")}>
            {t.label}
            {t.count != null && <span className={cls("rounded-full px-1.5 text-[11px] font-medium", on ? "bg-brand-soft text-brand" : "bg-gray-100 text-ink-mute")}>{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

function Drawer({ open, title, subtitle, onClose, actions, width = 760, tabs, children }) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[55] flex justify-end bg-gray-900/25" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined} className="flex h-full w-full flex-col bg-white shadow-2xl" style={{ maxWidth: width }}
        onMouseDown={(e) => e.stopPropagation()}>
        <div className={cls("shrink-0", !tabs && "border-b border-line")}>
          <div className={cls("flex items-start justify-between gap-4 px-6 pt-5", tabs ? "pb-5" : "pb-4")}>
            <div className="min-w-0">
              <h2 className="truncate text-[17px] font-semibold leading-tight tracking-tight">{title}</h2>
              {subtitle && <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink-soft">{subtitle}</div>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {actions}
              <IconBtn icon={Icon.x} title="Close" onClick={onClose} />
            </div>
          </div>
          {tabs && <DetailTabs {...tabs} />}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

const inputCls =
  "h-[32px] w-full rounded-md border border-line bg-white px-2.5 text-[13px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";
const FieldCtx = y.createContext(null);
function Field({ label, hint, required, span = 1, children }) {
  return h(FieldCtx.Provider, { value: typeof label === "string" ? label : null }, (
    <label className={cls("block", span === 2 && "col-span-2", span === 3 && "col-span-3", span === 4 && "col-span-4")}>
      <span className="mb-1 block text-[12px] font-medium text-ink-soft">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-ink-mute">{hint}</span>}
    </label>
  ));
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
// Form dropdown — same popover menu as the list filters (heading, dots, tick), positioned on screen
function Select({ value, onChange, options, placeholder, disabled, className, label, ...rest }) {
  const fieldLabel = y.useContext(FieldCtx);
  const [open, setOpen] = y.useState(false);
  const [pos, setPos] = y.useState(null);
  const [q, setQ] = y.useState("");
  const [hi, setHi] = y.useState(-1);
  const btn = y.useRef(null), menu = y.useRef(null);
  const opts = [...(placeholder !== undefined ? [{ value: "", label: placeholder, ph: true }] : []), ...options.map((o) => (typeof o === "object" ? o : { value: o, label: o }))];
  const cur = opts.find((o) => String(o.value) === String(value ?? ""));
  const searchable = opts.length > 8;
  const ql = q.trim().toLowerCase();
  const list = ql ? opts.filter((o) => !o.ph && !o.header && String(o.label).toLowerCase().includes(ql)) : opts;
  const place = () => {
    const r = btn.current.getBoundingClientRect(), vw = window.innerWidth, vh = window.innerHeight;
    const width = Math.min(Math.max(r.width, 200), 360), below = vh - r.bottom - 12, above = r.top - 12;
    const up = below < 220 && above > below;
    setPos({ left: Math.max(8, Math.min(r.left, vw - width - 8)), width, top: up ? undefined : r.bottom + 4, bottom: up ? vh - r.top + 4 : undefined, maxH: Math.max(160, Math.min(320, up ? above : below)) });
  };
  y.useLayoutEffect(() => { if (open) { place(); setQ(""); setHi(opts.findIndex((o) => String(o.value) === String(value ?? ""))); } }, [open]);
  y.useEffect(() => {
    if (!open) return;
    const off = (e) => { if (!btn.current?.contains(e.target) && !menu.current?.contains(e.target)) setOpen(false); };
    const scr = (e) => { if (!menu.current?.contains(e.target)) setOpen(false); };
    const close = () => setOpen(false);
    document.addEventListener("mousedown", off); document.addEventListener("scroll", scr, true); window.addEventListener("resize", close);
    return () => { document.removeEventListener("mousedown", off); document.removeEventListener("scroll", scr, true); window.removeEventListener("resize", close); };
  }, [open]);
  const pick = (o) => { onChange(String(o.value)); setOpen(false); btn.current?.focus(); };
  const key = (e) => {
    if (disabled) return;
    if (!open && ["ArrowDown", "Enter", " "].includes(e.key)) { e.preventDefault(); setOpen(true); return; }
    if (!open) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setOpen(false); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setHi((i) => Math.min(list.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((i) => Math.max(0, i - 1)); }
    else if (e.key === "Enter" && list[hi] && !list[hi].header) { e.preventDefault(); pick(list[hi]); }
  };
  const heading = label || fieldLabel;
  const dotOf = (o) => { const t = o.tone || TONE[String(o.label).toLowerCase()] || EXTRA_DOT[String(o.label).toLowerCase()]; return t ? <span className={cls("h-2 w-2 shrink-0 rounded-full", DOT[t])} /> : null; };
  return (
    <>
      <button ref={btn} type="button" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-label={rest["aria-label"] || heading} data-value={value ?? ""} disabled={disabled}
        onClick={() => setOpen((o) => !o)} onKeyDown={key}
        className={cls(inputCls, "flex items-center gap-2 text-left", open && "border-brand ring-2 ring-brand/15", disabled ? "cursor-not-allowed bg-gray-50 text-ink-mute" : "hover:border-gray-300", className)}>
        {cur && !cur.ph && dotOf(cur)}
        <span className={cls("min-w-0 flex-1 truncate", (!cur || cur.ph) && "text-ink-mute")}>{cur ? String(cur.label).trim() : placeholder || "Select…"}</span>
        {h(Icon.chevronDown, { size: 14, className: cls("shrink-0 text-ink-mute transition-transform", open && "rotate-180") })}
      </button>
      {open && pos && (
        <div ref={menu} role="listbox" onClick={(e) => e.preventDefault()} onKeyDown={key}
          className="fixed z-[80] flex flex-col overflow-hidden rounded-lg border border-line bg-white py-1 shadow-lg"
          style={{ left: pos.left, top: pos.top, bottom: pos.bottom, width: pos.width, maxHeight: pos.maxH }}>
          {heading && <p className="px-3 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-mute">{String(heading).replace(/\s*\*$/, "")}</p>}
          {searchable && (
            <div className="px-2 pb-1">
              <input autoFocus className="h-[28px] w-full rounded-md border border-line px-2 text-[12.5px] outline-none focus:border-brand" placeholder="Search…" value={q} onChange={(e) => { setQ(e.target.value); setHi(0); }} />
            </div>)}
          <div className="min-h-0 overflow-y-auto">
            {list.length ? list.map((o, i) => {
              if (o.header) return <p key={"h" + i} className="px-3 pb-0.5 pt-2 text-[10.5px] font-semibold uppercase tracking-wider text-ink-faint">{o.label}</p>;
              const on = String(o.value) === String(value ?? "");
              return (
                <button key={String(o.value) + i} type="button" role="option" aria-selected={on} disabled={o.disabled} onMouseEnter={() => setHi(i)} onClick={() => !o.disabled && pick(o)}
                  className={cls("flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px]", o.disabled ? "cursor-not-allowed text-ink-faint" : on ? "bg-brand-soft/60 text-brand" : i === hi ? "bg-gray-50 text-ink" : "text-ink", o.ph && !on && "text-ink-mute")}>
                  {dotOf(o)}<span className="flex-1 truncate">{String(o.label).trim()}</span>{on && h(Icon.check, { size: 14, className: "shrink-0 text-brand" })}
                </button>
              );
            }) : <p className="px-3 py-2 text-[12.5px] text-ink-mute">No matches</p>}
          </div>
        </div>)}
    </>
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

const TRADE_GROUPS = [
  { label: "Civil & structure", items: ["Civil", "RCC / Structural", "Formwork", "Masonry", "Excavation", "Waterproofing", "Scaffolding", "Painting & Finishing"] },
  { label: "Electrical, MEP & power", items: ["Electrical", "Plumbing", "Tower Erection", "Stringing", "Solar EPC"] },
  { label: "Materials", items: ["Steel", "Cement & Aggregates", "Hardware"] },
  { label: "Equipment & manpower", items: ["Equipment Hire", "Manpower Supply"] },
];
function TradePicker({ options, value = [], onChange }) {
  const [q, setQ] = y.useState("");
  const known = new Set(TRADE_GROUPS.flatMap((g) => g.items));
  const rest = options.filter((o) => !known.has(o));
  const groups = [...TRADE_GROUPS.map((g) => ({ ...g, items: g.items.filter((o) => options.includes(o)) })), ...(rest.length ? [{ label: "Other", items: rest }] : [])];
  const ql = q.trim().toLowerCase();
  const shown = groups.map((g) => ({ ...g, items: g.items.filter((o) => !ql || o.toLowerCase().includes(ql)) })).filter((g) => g.items.length);
  const toggle = (o) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-gray-50/70 px-3 py-2">
        <label className="flex h-[28px] w-[200px] items-center gap-2 rounded-md border border-line bg-white px-2 text-[13px] text-ink-mute">
          {h(Icon.search, { size: 13 })}
          <input className="w-full bg-transparent text-ink outline-none placeholder:text-ink-mute" placeholder="Find a trade…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          {value.length ? value.map((o) => (
            <span key={o} className="inline-flex items-center gap-1 rounded-md bg-brand-soft py-[2px] pl-2 pr-1 text-[12px] font-medium text-brand">
              {o}<button type="button" aria-label={"Remove " + o} className="rounded p-[1px] hover:bg-white/70" onClick={() => toggle(o)}>{h(Icon.x, { size: 11 })}</button>
            </span>)) : <span className="text-[12px] text-ink-faint">No trades selected yet</span>}
        </div>
        <span className="ml-auto flex items-center gap-2 whitespace-nowrap text-[12px] text-ink-mute">
          <b className="text-ink">{value.length}</b> selected
          {value.length > 0 && <button type="button" className="text-brand hover:underline" onClick={() => onChange([])}>Clear</button>}
        </span>
      </div>
      <div className="divide-y divide-line">
        {shown.length ? shown.map((g) => (
          <div key={g.label} className="flex flex-col gap-1.5 px-3 py-2.5 sm:flex-row sm:items-start">
            <div className="w-[170px] shrink-0 pt-[5px] text-[11px] font-semibold uppercase tracking-wide text-ink-mute">{g.label}</div>
            <div className="flex flex-1 flex-wrap gap-1.5">
              {g.items.map((o) => {
                const on = value.includes(o);
                return (
                  <button key={o} type="button" aria-pressed={on} onClick={() => toggle(o)}
                    className={cls("inline-flex items-center gap-1 rounded-md border px-2.5 py-[4px] text-[12.5px] transition-colors",
                      on ? "border-brand bg-brand-soft font-medium text-brand" : "border-line bg-white text-ink-soft hover:border-gray-300 hover:bg-gray-50")}>
                    {on ? h(Icon.check, { size: 12 }) : <span className="text-[13px] leading-none text-ink-faint">+</span>}{o}
                  </button>
                );
              })}
            </div>
          </div>)) : <div className="px-3 py-4 text-center text-[12.5px] text-ink-mute">No trade matches “{q}”</div>}
      </div>
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
// Filter dropdown (popover menu): uppercase heading, status-coloured dots, tick on the selected option
const DOT = { green: "bg-green-500", blue: "bg-blue-500", amber: "bg-amber-500", red: "bg-red-500", purple: "bg-violet-500", cyan: "bg-cyan-500", orange: "bg-orange-500", gray: "bg-gray-400" };
const EXTRA_DOT = { "attention needed": "amber", "payments blocked": "red", "not grouped": "gray", "group companies": "cyan", ongoing: "blue", "not started": "gray" };
// Icon for each filter (by its label); status-like filters use a plain dot, as in Project Center
const FILTER_PALETTE = ["blue", "purple", "cyan", "orange", "green", "amber", "red"];
const FILTER_ICONS = {
  type: "shapes", tier: "chart", preferred: "star", registration: "clipboardCheck", compliance: "shieldCheck", vendor: "building", contractor: "hardHat",
  project: "folder", "deliver to": "truck", source: "branch", billing: "receipt", "bill type": "file", match: "scale", "should pay": "wallet",
  stage: "activity", mode: "users", category: "layers", standing: "gauge", insurance: "shield", "required coverage": "shield", "payment gate": "lock",
  "blocks payment": "lock", "work order": "clipboardList", jms: "listChecks", region: "globe", "wage zone": "globe", skill: "wrench", trade: "hardHat",
  trades: "hardHat", "rule sets": "listChecks", result: "target", owner: "user", level: "layers", "submitted by": "user", "rated by": "user",
  acceptance: "check", basis: "file", period: "calendar", invitation: "mail", group: "layers",
};
const filterIcon = (label) => {
  const k = FILTER_ICONS[String(label || "").toLowerCase()];
  return k && Icon[k] ? h(Icon[k], { size: 16, className: "shrink-0" }) : <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-current opacity-60" />;
};
function FilterSelect({ value, onChange, options, label }) {
  const [open, setOpen] = y.useState(false);
  const [fq, setFq] = y.useState("");
  const ref = y.useRef(null);
  y.useEffect(() => {
    if (!open) return;
    const off = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", off); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", off); document.removeEventListener("keydown", esc); };
  }, [open]);
  const menu = y.useRef(null);
  const [flip, setFlip] = y.useState(false);
  y.useLayoutEffect(() => {
    if (!open) { setFlip(false); setFq(""); return; }
    if (!menu.current || flip) return;
    const r = menu.current.getBoundingClientRect();
    setFlip(r.right > window.innerWidth - 8);
  }, [open]);
  const opts = options.map((o) => (typeof o === "object" ? o : { value: o, label: o }));
  const cur = opts.find((o) => String(o.value) === String(value)) || opts[0];
  const isAll = (o) => o === opts[0] && /^(all|any)\b/i.test(String(o.label));
  // Every option gets a colour: its status colour when it has one, otherwise a distinct colour from the palette
  const tone = (o) => (isAll(o) ? null : o.tone || EXTRA_DOT[String(o.label).toLowerCase()] || TONE[String(o.label).toLowerCase()] || TONE[String(o.value).toLowerCase()] || FILTER_PALETTE[Math.max(0, opts.indexOf(o) - 1) % FILTER_PALETTE.length]);
  const dot = (o) => { const t = tone(o); return <span className={cls("h-2 w-2 shrink-0 rounded-full", t ? DOT[t] : "border border-gray-300 bg-white")} />; };
  return (
    <div ref={ref} className="relative min-w-0 shrink">
      {/* Compact icon button (Project Center style); once a value is picked it shows that value */}
      <button type="button" aria-label={label} data-tip={cur === opts[0] ? label : `${label}: ${String(cur.label).trim()}`} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className={cls("flex h-8 min-w-8 max-w-[180px] items-center justify-center gap-1.5 rounded-md text-[13px] transition-colors",
          cur !== opts[0] ? "bg-brand-soft px-2 font-medium text-brand" : open ? "bg-gray-100 text-ink" : "text-ink-soft hover:bg-gray-100 hover:text-ink")}>
        {filterIcon(label)}
        {cur !== opts[0] && <><span className="truncate">{String(cur.label).trim()}</span>{h(Icon.chevronDown, { size: 12, className: "shrink-0" })}</>}
      </button>
      {open && (
        <div ref={menu} role="listbox" className={cls("absolute z-50 mt-1 max-h-[320px] min-w-full w-max max-w-[min(340px,calc(100vw-24px))] overflow-y-auto rounded-lg border border-line bg-white py-1 shadow-lg", flip ? "right-0" : "left-0")}>
          {label && <p className="px-3 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-mute">{label}</p>}
          {opts.length > 8 && <div className="px-2 pb-1"><input autoFocus className="h-[28px] w-full rounded-md border border-line px-2 text-[12.5px] outline-none focus:border-brand" placeholder="Search…" value={fq} onChange={(e) => setFq(e.target.value)} /></div>}
          {opts.filter((o) => !fq.trim() || isAll(o) || String(o.label).toLowerCase().includes(fq.trim().toLowerCase())).map((o) => {
            const on = String(o.value) === String(value);
            return (
              <button key={o.value} type="button" role="option" aria-selected={on} onClick={() => { onChange(o.value); setOpen(false); }}
                className={cls("flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px]", on ? "bg-brand-soft/60 text-brand" : "text-ink hover:bg-gray-50")}>
                {dot(o)}<span className="flex-1 truncate">{String(o.label).trim()}</span>{on && h(Icon.check, { size: 14, className: "text-brand" })}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Generic table built on the host's th/td cells
// Text used by the list search: every plain value on the row (2 levels deep) plus vendor / work-order names
function rowSearchText(r, depth = 0) {
  if (r == null) return "";
  if (typeof r !== "object") return String(r);
  if (depth > 2 || Array.isArray(r) && r.length > 50) return "";
  const out = [];
  for (const [k, v] of Object.entries(r)) {
    if (k === "dataUrl" || k === "history" || k === "revisions") continue;
    if (typeof v === "string" && /vendorId$/i.test(k)) out.push((byId(getState().vendors, v) || {}).name || "");
    if (typeof v === "string" && k === "woId") out.push((byId(getState().workOrders, v) || {}).title || "");
    out.push(rowSearchText(v, depth + 1));
  }
  return out.join(" ");
}

// Main list = toolbar (page filters left, search right) + table + bottom bar with the count.
// dense / plain tables (inside panels and cards) are just the table.
const pluralWord = (w) => (/(s|ing|ce|ance|by|pay|ed)$/.test(w) ? w : /(ch|sh|x)$/.test(w) ? w + "es" : /[^aeiou]y$/.test(w) ? w.slice(0, -1) + "ies" : w + "s");
function DataTable({ columns, rows, onRow, rowKey = (r) => r.id, empty, footer, dense, plain, filters, actions, noun = "records", summary, searchText = rowSearchText, placeholder = "Search…" }) {
  const list = !dense && !plain;
  // First column stays put while the rest scrolls sideways (a leading checkbox column sticks together with it)
  const lead = !dense && columns[0] && !columns[0].label && columns.length > 2 ? 1 : 0;
  const stick = (ci) => (dense || ci > lead ? null : cls("nx-stick", ci === lead && "nx-edge", ci === 1 && lead ? "left-[44px]" : "left-0"));
  const [q, setQ] = y.useState("");
  // Column filters: a column with `filter` (true = row[key], or a function returning a value / list of values) gets its own dropdown
  const [cf, setCf] = y.useState({});
  const fcols = list ? columns.filter((c) => c.filter) : [];
  const fval = (c, r) => { const v = typeof c.filter === "function" ? c.filter(r) : r[c.key]; return (Array.isArray(v) ? v : [v]).filter((x) => x !== undefined && x !== null && x !== "").map(String); };
  const colFiltered = fcols.length ? rows.filter((r) => fcols.every((c) => !cf[c.key] || cf[c.key] === "__all" || fval(c, r).includes(cf[c.key]))) : rows;
  const shown = list && q.trim() ? colFiltered.filter((r) => { const t = searchText(r).toLowerCase(); return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => t.includes(w)); }) : colFiltered;
  const active = q.trim() || fcols.some((c) => cf[c.key] && cf[c.key] !== "__all");
  const colSelects = fcols.map((c) => {
    const name = c.filterLabel || (typeof c.label === "string" ? c.label : c.key);
    // Full list of possible values (filterOptions) plus anything else present in the data
    const dom = (typeof c.filterOptions === "function" ? c.filterOptions() : c.filterOptions || []).map(String);
    const extra = [...new Set(rows.flatMap((r) => fval(c, r)))].filter((v) => !dom.includes(v)).sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
    const vals = [...dom, ...extra];
    if (vals.length < 1 && !(cf[c.key] && cf[c.key] !== "__all")) return null;
    return <FilterSelect key={"cf-" + c.key} label={name} value={cf[c.key] || "__all"} onChange={(v) => setCf((o) => ({ ...o, [c.key]: v }))}
      options={[{ value: "__all", label: c.filterAll || `All ${pluralWord(name.toLowerCase())}` }, ...vals.map((v) => (typeof v === "object" ? v : { value: v, label: v }))]} />;
  });
  const table = !shown.length
    ? (rows.length ? <EmptyState icon={Icon.search} title="No matches" text={q.trim() ? `Nothing matches “${q}”. Try another word or clear the search.` : "No records match these filters."} /> : empty || <EmptyState icon={Icon.folder} title="Nothing here yet" text="Records you add will appear in this list." />)
    : (
      <div className={cls("overflow-x-auto", list && "nx-fill")}>
        <table className={cls("w-full", !dense && "nx-list")}>
          {list && <colgroup>{columns.map((c) => <col key={c.key} style={{ width: c.width || (c.label ? `${(100 / Math.max(1, columns.filter((x) => x.label).length)).toFixed(2)}%` : c.key === "sel" ? 44 : undefined) }} />)}</colgroup>}
          <thead>
            <tr>
              {columns.map((c, ci) => (
                <Th key={c.key} align={c.align} className={cls(c.thClass, stick(ci))}>{c.label}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={rowKey(r, i)} onClick={onRow ? () => onRow(r) : undefined} className={cls("group hover:bg-gray-50", onRow && "cursor-pointer")}>
                {columns.map((c, ci) => (
                  <Td key={c.key} align={c.align} className={cls(c.num && "num", dense && "py-[5px]", c.className, stick(ci))}>
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
  if (!list) return table;
  const sum$ = typeof summary === "function" ? summary(shown) : summary || [];
  return (
    <>
      {/* One line: filters on the left (they shrink and truncate when space is tight), search on the right */}
      <div className="flex min-h-[44px] items-center gap-3 border-b border-line px-4 py-1.5">
        <div className="nx-filters flex min-w-0 flex-1 flex-nowrap items-center gap-2">{filters}{colSelects}
          {fcols.length > 0 && fcols.some((c) => cf[c.key] && cf[c.key] !== "__all") && <button type="button" className="shrink-0 whitespace-nowrap px-1 text-[12.5px] text-brand hover:underline" onClick={() => setCf({})}>Clear filters</button>}</div>
        <div className="flex shrink-0 items-center gap-2">{actions}<SearchBox value={q} onChange={setQ} placeholder={placeholder} /></div>
      </div>
      {table}
      <FooterBar items={[{ value: active ? `${shown.length} of ${rows.length}` : rows.length, label: noun }, ...sum$]} updated={new Date().toLocaleString("en-IN")} />
    </>
  );
}

// Classes used by host patches in build.mjs (kept here so Tailwind generates them):
// mt-8 max-w-[680px] gap-4 rounded-xl px-4 py-4 h-9 w-9 rounded-lg mt-3 text-[15px] mt-2
// Summary card (original tinted style) — the host's card on every page renders this too
const CARD_TONE = {
  blue: "border-blue-200 bg-blue-50/70 text-blue-700", purple: "border-violet-200 bg-violet-50/70 text-violet-700", amber: "border-amber-200 bg-amber-50/70 text-amber-700",
  green: "border-green-200 bg-green-50/70 text-green-700", red: "border-red-200 bg-red-50/70 text-red-600", orange: "border-orange-200 bg-orange-50/70 text-orange-600",
  cyan: "border-cyan-200 bg-cyan-50/70 text-cyan-700", gray: "border-slate-200 bg-slate-50/80 text-slate-700",
};
const CARD_DOT = { blue: "bg-blue-500", purple: "bg-violet-500", amber: "bg-amber-500", green: "bg-green-500", red: "bg-red-500", orange: "bg-orange-500", cyan: "bg-cyan-500", gray: "bg-slate-500" };
function StatTile({ label, value, sub, icon, tone = "blue" }) {
  return (
    <div className={cls("flex min-w-0 items-start justify-between rounded-xl border px-4 py-3", CARD_TONE[tone] || CARD_TONE.blue)}>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[11.5px] font-semibold"><span className={cls("h-1.5 w-1.5 shrink-0 rounded-full", CARD_DOT[tone] || CARD_DOT.blue)} /><span className="truncate">{label}</span></p>
        <p className="mt-0.5 flex min-w-0 items-baseline gap-1.5"><span className="mono whitespace-nowrap text-[18px] font-bold">{value}</span>{sub && <span className="truncate text-[11.5px] opacity-70">{sub}</span>}</p>
      </div>
      {icon && <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/60">{h(icon, { size: 15 })}</span>}
    </div>
  );
}

function StatGrid({ children, cols = 4 }) {
  return <div className={cls("grid gap-2.5 border-b border-line px-4 py-3", cols === 6 ? "grid-cols-6" : cols === 5 ? "grid-cols-5" : cols === 3 ? "grid-cols-3" : "grid-cols-4")}>{children}</div>;
}

function Section({ title, icon, actions, children, className }) {
  return (
    <section className={cls("nx-section rounded-xl border border-line bg-white", className)}>
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
      <span className="num absolute font-bold" style={{ color: col, fontSize: Math.max(10, Math.round(size * 0.27)) }}>{Math.round(v)}</span>
    </span>
  );
}

// Score in table cells — same bar + value style as the Progress columns
function ScoreBadge({ value }) {
  if (value == null) return <span className="text-[12px] text-ink-faint">—</span>;
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200"><span className="block h-full rounded-full bg-brand" style={{ width: `${v}%` }} /></span>
      <span className="num w-7 text-right text-[12px] text-ink-soft">{v}</span>
    </span>
  );
}

// Row star: filled when preferred; outline appears on row hover; click toggles
function PreferredStar({ v, size = 14, always }) {
  const toggle = (e) => {
    e.stopPropagation();
    setState((s) => { const x = byId(s.vendors, v.id); x.preferred = !x.preferred; }, { entity: "Vendor", id: v.id, action: v.preferred ? "Removed from preferred suppliers" : "Marked preferred supplier" });
    toast(v.preferred ? `${v.name} removed from preferred suppliers` : `${v.name} marked as preferred supplier`);
  };
  return (
    <button type="button" onClick={toggle} title={v.preferred ? "Preferred supplier — click to remove" : "Mark as preferred supplier"}
      className={cls("inline-flex rounded p-0.5 transition-opacity hover:bg-amber-50", v.preferred ? "text-amber-400" : always ? "text-gray-300 hover:text-amber-400" : "text-gray-300 opacity-0 hover:text-amber-400 focus:opacity-100 group-hover:opacity-100")}>
      {h(Icon.star, { size, fill: v.preferred ? "currentColor" : "none" })}
    </button>
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
      <PageHeader title={title} icon={icon}
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

// ---------------------------------------------------------------- global tooltip
// Hovering any text that is cut off (ellipsis / overflow hidden / long input value) shows the full
// content; elements with data-tip (e.g. "+2" chips) list the hidden items. Works across the whole app.
(function installTooltips() {
  if (typeof document === "undefined" || window.__nxTip) return;
  window.__nxTip = true;
  const tip = document.createElement("div");
  tip.setAttribute("role", "tooltip");
  Object.assign(tip.style, { position: "fixed", zIndex: 99999, maxWidth: "420px", background: "#111827", color: "#fff", font: "12px/1.45 Inter, system-ui, sans-serif",
    padding: "6px 9px", borderRadius: "6px", pointerEvents: "none", boxShadow: "0 6px 20px rgba(0,0,0,.18)", whiteSpace: "pre-line", wordBreak: "break-word", display: "none" });
  const attach = () => document.body && !tip.isConnected && document.body.appendChild(tip);
  attach(); document.addEventListener("DOMContentLoaded", attach);
  let cur = null;
  const clipped = (el) => {
    if (el.tagName === "INPUT") return el.type !== "checkbox" && el.type !== "radio" && el.scrollWidth > el.clientWidth + 1;
    if (!el.clientWidth || el.children.length > 3) return false;
    const cs = getComputedStyle(el);
    // scrollable panels (overflow auto/scroll) are not "cut-off text"
    if (/auto|scroll/.test(cs.overflowX + cs.overflowY)) return false;
    if (cs.webkitLineClamp && cs.webkitLineClamp !== "none") return el.scrollHeight > el.clientHeight + 2;
    const hides = cs.textOverflow === "ellipsis" || cs.overflowX === "hidden" || cs.overflowX === "clip";
    return hides && el.scrollWidth > el.clientWidth + 1 && (el.innerText || "").length < 600;
  };
  const find = (t) => {
    for (let el = t, i = 0; el && el !== document.body && i < 5; el = el.parentElement, i++) {
      if (!(el instanceof HTMLElement) || el === tip) continue;
      if (el.dataset && el.dataset.tip) return [el, el.dataset.tip];
      if (el.hasAttribute("title")) return null; // native tooltip already covers it
      if (clipped(el)) { const txt = (el.tagName === "INPUT" ? el.value : el.innerText || "").trim(); if (txt) return [el, txt]; }
    }
    return null;
  };
  const place = (x, y) => {
    const w = tip.offsetWidth, hgt = tip.offsetHeight;
    tip.style.left = Math.max(8, Math.min(x + 12, window.innerWidth - w - 8)) + "px";
    tip.style.top = (y + 18 + hgt > window.innerHeight ? y - hgt - 10 : y + 18) + "px";
  };
  document.addEventListener("mouseover", (e) => {
    const hit = find(e.target);
    if (!hit) { if (cur && !cur.contains(e.target)) { cur = null; tip.style.display = "none"; } return; }
    cur = hit[0]; attach(); tip.textContent = hit[1]; tip.style.display = "block"; place(e.clientX, e.clientY);
  }, true);
  document.addEventListener("mousemove", (e) => { if (cur) place(e.clientX, e.clientY); }, true);
  document.addEventListener("mouseout", (e) => { if (cur && (!e.relatedTarget || !cur.contains(e.relatedTarget))) { cur = null; tip.style.display = "none"; } }, true);
  document.addEventListener("scroll", () => { cur = null; tip.style.display = "none"; }, true);
})();
