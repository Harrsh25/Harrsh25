// Core: aliases to the host bundle's components, persistent demo store,
// formatting helpers and a small UI kit shared by every Vendor / Contract page.
//
// Host bundle names used here (minified, stable for this build):
//   B card · H page header · nr tab bar · se toolbar · ue stat tile · S th · g td
//   rt footer bar · le status badge · Ws progress bar · Te empty state · R classnames
//   fn useNavigate · Ht useLocation · Zn Link · at auth store

const Card = B, PageHeader = H, Toolbar = se, Th = S, Td = g;
// Page tabs - same look as the host tab bar, plus tab roles so keyboards, screen readers and tests can find them
// A row of tabs that never wraps or hides tabs: when they don't fit, the row scrolls sideways
// (mouse wheel, drag on touch, or the ‹ › arrows that appear at the ends) and the open tab is scrolled into view
function ScrollTabs({ className, gap = "gap-1", active, arrowClass = "", children }) {
  const ref = y.useRef(null);
  const [edge, setEdge] = y.useState({ l: false, r: false });
  const upd = () => { const e = ref.current; if (!e) return; setEdge({ l: e.scrollLeft > 2, r: e.scrollLeft + e.clientWidth < e.scrollWidth - 2 }); };
  y.useLayoutEffect(() => {
    const e = ref.current; if (!e) return;
    const cur = e.querySelector('[aria-selected="true"]');
    if (cur) { const a = cur.offsetLeft, b = a + cur.offsetWidth; if (a < e.scrollLeft || b > e.scrollLeft + e.clientWidth) e.scrollLeft = Math.max(0, a - 40); }
    upd(); const ro = new ResizeObserver(upd); ro.observe(e); return () => ro.disconnect();
  }, [active]);
  const wheel = (ev) => { const e = ref.current; if (e && e.scrollWidth > e.clientWidth && Math.abs(ev.deltaY) > Math.abs(ev.deltaX)) { e.scrollLeft += ev.deltaY; } };
  const go = (d) => ref.current?.scrollBy({ left: d * Math.max(120, ref.current.clientWidth * 0.6), behavior: "smooth" });
  const arrow = (d) => (
    // the arrows take their own space beside the tabs (never drawn over a tab) and line up with the tab text
    <button type="button" aria-label={d < 0 ? "Scroll tabs left" : "Scroll tabs right"} onClick={() => go(d)}
      className={cls("flex w-7 shrink-0 items-center justify-center self-stretch rounded-md text-ink-mute hover:bg-gray-100 hover:text-ink", d < 0 ? "mr-1" : "ml-1", arrowClass)}>
      {h(Icon.chevronRight, { size: 15, className: d < 0 ? "rotate-180" : "" })}
    </button>);
  return (
    <div className={cls("flex min-w-0 items-stretch", className)}>
      {edge.l && arrow(-1)}
      <div ref={ref} role="tablist" onScroll={upd} onWheel={wheel} className={cls("nx-noscroll flex min-w-0 flex-1 overflow-x-auto", gap)}>{children}</div>
      {edge.r && arrow(1)}
    </div>
  );
}
function TabBar({ tabs, active, onChange }) {
  return (
    <ScrollTabs className="border-b border-line px-3" active={active}>
      {tabs.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={t.id === active} onClick={() => onChange(t.id)}
          className={cls("-mb-px flex h-[36px] shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-[13px]", t.id === active ? "border-brand font-medium text-brand" : "border-transparent text-ink-soft hover:text-ink")}>
          {t.icon && h(t.icon, { size: 13 })}{t.label}
        </button>
      ))}
    </ScrollTabs>
  );
}
const FooterBar = rt, StatusPill = le, Progress = Ws, EmptyState = Te, cls = R;
const useNavigate = fn, RouterLink = Zn;

const Icon = {
  activity: Pp, archive: V1, arrowLeft: Q1, arrowRight: Mp, book: q1, boxes: Ds, briefcase: vo,
  building: cn, calendar: jo, calendarClock: zp, chart: K1, chevronDown: Xn, chevronRight: ko,
  alert: wo, check: et, clipboardCheck: Yu, clipboardList: Jr, clock: Fs, download: Rp, more: Ap,
  eye: tx, eyeOff: ex, factory: nx, fileClock: _p, filePlus: rx, sheet: Op, file: Is, fileX: lx, filter: No,
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
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
const fmtDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" }) : "-";
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
const currentUser = () => actor().name;
const PROJECTS = [
  "Skyline Towers - Phase 1",
  "Metro Line Extension",
  "400kV Transmission Line A",
  "Riverside Business Park",
  "Solar Farm Substation",
];

// Status → tone for the host StatusPill
const TONE = {
  active: "green", approved: "green", verified: "green", certified: "green", paid: "green", signed: "green",
  compliant: "green", completed: "green", awarded: "green", received: "green", onboarded: "green", released: "green",
  "spend authorized": "green", closed: "gray", superseded: "gray", disabled: "gray", inactive: "gray", draft: "gray", expired: "red",
  submitted: "blue", issued: "blue", "in progress": "blue", sent: "blue", "quotes received": "purple", "in review": "blue",
  "pending approval": "amber", pending: "amber", "partially paid": "amber", "partially received": "amber", expiring: "amber",
  "on hold": "amber", "docs pending": "amber", prospective: "purple", "under review": "blue", open: "amber",
  unpaid: "amber", overdue: "red", rejected: "red", blacklisted: "red", "non-compliant": "red", disputed: "red",
  missing: "red", "action required": "red", held: "purple", "in dlp": "purple",
  "changes requested": "amber", invited: "amber", registered: "green", declined: "red", quoted: "green", "not sent": "gray", "under review": "blue",
  returned: "red", ordered: "green", "partially ordered": "purple", "partially awarded": "purple", "to send": "blue", waiting: "amber", late: "red",
  "fully billed": "green", "partially billed": "purple", "waiting bills": "amber", "nothing to bill": "gray", "fully consumed": "gray", cancelled: "gray",
  exception: "amber", "claim submitted": "blue", "awaiting review": "blue", "rework done": "blue", rectified: "blue", "handed over": "purple",
  "short-closed": "gray", suspended: "amber", terminated: "red", "ready to close": "green", passed: "green", failed: "red",
};
function Status({ children, tone }) {
  return <StatusPill tone={tone || TONE[String(children).toLowerCase()] || "gray"}>{children}</StatusPill>;
}

// ---------------------------------------------------------------- store
const STORE_KEY = "nxv-store-v1";
const listeners = new Set();
let state = null;

// built from its char code so the build step (which swaps every long dash for "-") leaves it alone
const LONG_DASH = String.fromCharCode(8212);
function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      // the long dash is no longer used anywhere - clean it out of data saved by older versions too
      const s = JSON.parse(raw.split(LONG_DASH).join("-"));
      // "Disabled" vendors are now called "Inactive"; old supplier types map to the current list
      if (s && s.version === SEED_VERSION) { (s.vendors || []).forEach((v) => { if (v.status === "Disabled") v.status = "Inactive"; if (v.supplierType === "Partnership") v.supplierType = "Partnership / LLP"; if (v.supplierType === "Individual") v.supplierType = "Individual / HUF"; }); return s; }
    }
  } catch {}
  return buildSeed();
}
function getState() {
  if (!state) {
    state = loadState();
    if ((migrateState(state) | sweepState(state)) || (localStorage.getItem(STORE_KEY) || "").includes(LONG_DASH)) try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {}
  }
  return state;
}
// Settings without forcing a load - safe to call while the seed is being built
const currentSettings = () => settingsOf(state || {});
// Audit "old → new": for the record an action is about, the sensitive fields are compared before and after the change
// and every difference is stored with the entry (bank details, tax IDs, values, terms, status…)
const AUDIT_FIELDS = {
  Vendor: ["vendors", (v) => ({ "Name": v.name, "Legal name": v.legalName, "GSTIN": v.gstin, "PAN": v.pan, "Tax ID": v.taxId, "Status": v.status, "Tier": v.tier,
    "Registration tier": v.regTier, "Supplier type": v.supplierType, "TDS": v.tds, "Payment terms": v.paymentTerms, "Currency": v.currency, "Vendor group": v.group,
    "E-mail": v.contact?.email, "Phone": v.contact?.phone, "Address": [v.address, v.city, v.state, v.pin].filter(Boolean).join(", "),
    "Frozen": v.frozen ? "Yes" : "No", "Bills without PO": v.allowBillWithoutPO ? "Yes" : "No", "Bills before receipt": v.allowBillWithoutReceipt ? "Yes" : "No",
    "Bank accounts": (v.bankAccounts || []).map((b) => `${b.bank || ""} ••${String(b.account || "").slice(-4)} ${b.ifsc || b.swift || ""} (${b.status || "Unverified"}${b.isDefault ? ", default" : ""}${b.disabled ? ", disabled" : ""})`).join("; ") })],
  Contract: ["contracts", (c) => ({ "Status": c.status, "Contract value": typeof contractValue === "function" ? String(contractValue(c)) : String(c.value), "Start": c.start, "End": c.end,
    "Retention %": c.retentionPct, "Advance %": c.advancePct, "LD % per week": c.ldPctPerWeek, "LD cap %": c.ldCapPct, "DLP months": c.dlpMonths, "Payment terms": c.paymentTerms, "BG no.": c.bgNo, "BG expiry": c.bgExpiry })],
  PO: ["purchaseOrders", (p) => ({ "Status": p.status, "PO value": typeof poValue === "function" ? String(poValue(p)) : "", "Delivery by": p.deliveryDate, "Payment terms": p.paymentTerms })],
  "Work Order": ["workOrders", (w) => ({ "Status": w.status, "End": w.end, "Value": typeof woValue === "function" ? String(woValue(w)) : "" })],
  Invoice: ["invoices", (i) => ({ "Bill no.": i.number, "Due": i.due, "Cancelled": i.cancelled ? "Yes" : "No", "Review": i.review, "Paid": String((i.payments || []).reduce((a, p) => a + (Number(p.amount) || 0), 0)) })],
};
function auditChanges(prev, next, audit) {
  const spec = audit && AUDIT_FIELDS[audit.entity]; if (!spec || !audit.id) return null;
  const [coll, snap] = spec, id = String(audit.id).split(",")[0].trim();
  const a = (prev[coll] || []).find((r) => r.id === id), b = (next[coll] || []).find((r) => r.id === id);
  if (!b) return null;
  let sa = {}, sb = {}; try { sa = a ? snap(a) : {}; sb = snap(b); } catch { return null; }
  const norm = (x) => (x == null || x === "" ? "" : String(x));
  const out = Object.keys(sb).filter((k) => norm(sa[k]) !== norm(sb[k])).map((k) => ({ field: k, from: norm(sa[k]) || "-", to: norm(sb[k]) || "-" }));
  return out.length ? out : null;
}
function setState(mutator, audit) {
  const prev = getState();
  const next = structuredClone(prev);
  mutator(next);
  if (audit) { const changes = auditChanges(prev, next, audit); next.audit.unshift({ at: new Date().toISOString(), by: currentUser(), ...audit, ...(changes ? { changes } : {}) }); }
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
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== t.id)), t.tone === "red" || t.tone === "amber" ? 5500 : 2600);
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
            "max-w-[440px]", t.tone === "red" ? "border-red-200 text-red-700" : t.tone === "amber" ? "border-amber-200 text-amber-700" : t.tone === "blue" ? "border-blue-200 text-blue-700" : "border-green-200 text-green-700"
          )}
        >
          {h(t.tone === "red" || t.tone === "amber" ? Icon.alert : t.tone === "blue" ? Icon.info : Icon.check, { size: 14, className: "shrink-0" })}
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

function IconBtn({ icon, title, onClick, className, disabled }) {
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick} disabled={disabled}
      className={cls("grid h-7 w-7 place-items-center rounded-md text-ink-soft hover:bg-gray-100 hover:text-ink disabled:pointer-events-none disabled:opacity-30", className)}>
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
    // The dialog always fits the window at 100% zoom: title and buttons stay in view, only the body scrolls
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/30 px-4 py-6" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="flex w-full flex-col rounded-xl bg-white shadow-2xl" style={{ maxWidth: width, maxHeight: "calc(100vh - 48px)" }}
        onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-5 py-3">
          <div>
            <h2 className="text-[15px] font-semibold">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[12.5px] text-ink-soft">{subtitle}</p>}
          </div>
          <IconBtn icon={Icon.x} title="Close" onClick={onClose} />
        </div>
        <div data-modal-body className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex shrink-0 items-center justify-end gap-2 rounded-b-xl border-t border-line bg-gray-50 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

// Detail-panel tabs (Project Center style): plain text, single line, blue when active.
// Every tab is always shown - when they don't fit the panel the row scrolls sideways (no "More" menu).
function DetailTabs({ tabs, active, onChange }) {
  return (
    <div className="border-b border-line px-6">
      <ScrollTabs gap="gap-5" active={active} arrowClass="mb-2">
        {tabs.map((t) => {
          const on = t.id === active;
          return (
            <button key={t.id} type="button" role="tab" aria-selected={on} onClick={() => onChange(t.id)}
              className={cls("-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 pb-3 pt-1 text-[13.5px]",
                on ? "border-brand font-medium text-brand" : "border-transparent text-ink-soft hover:text-brand")}>
              {t.label}
              {/* no counts on tabs (anywhere) */}
            </button>
          );
        })}
      </ScrollTabs>
    </div>
  );
}

// Record information card: label / value rows in two columns (first half left, second half right)
function InfoCard({ title = "Information", icon, rows, actions }) {
  return (
    <div className="rounded-xl border border-line bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h3 className="flex items-center gap-2 text-[14.5px] font-semibold">{icon && h(icon, { size: 15, className: "text-ink-mute" })}{title}</h3>
        {actions}
      </div>
      <KV items={rows} />
    </div>
  );
}

// Side panels (record, Filters, Customize Columns) sit exactly over the page's content card, below the top bar
function useContentBox() {
  const get = () => {
    const m = typeof document !== "undefined" && document.querySelector("main");
    if (!m) return { top: 56, right: 8, bottom: 8 };
    const r = m.getBoundingClientRect(), pb = parseFloat(getComputedStyle(m).paddingBottom) || 0;
    return { top: Math.max(0, Math.round(r.top)), right: Math.max(0, Math.round(window.innerWidth - r.right)), bottom: Math.max(0, Math.round(window.innerHeight - r.bottom + pb)) };
  };
  const [b, setB] = y.useState(get);
  y.useLayoutEffect(() => { const u = () => setB(get()); u(); window.addEventListener("resize", u); return () => window.removeEventListener("resize", u); }, []);
  return b;
}
// Record panel. Header (same on every record): title, then the record ID and its status - nothing else.
// Any other key facts passed as `details` ([label, value] rows) show in a "Details" card at the top of the first tab.
function Drawer({ open, title, badge, subtitle, recordId, rowId, status, details, onClose, actions, topActions, width = 760, tabs, related, comments, children }) {
  useEscape(open, onClose);
  const box = useContentBox();
  // Previous / next record: steps through the rows of the list the panel was opened from (same order, filters and sort)
  const key = rowId ?? recordId;
  const [nav, setNav] = y.useState({ prev: null, next: null });
  y.useLayoutEffect(() => {
    if (!open || key == null) return setNav({ prev: null, next: null });
    const rows = [...document.querySelectorAll("main table tbody tr[data-row-key].cursor-pointer")];
    const i = rows.findIndex((r) => r.getAttribute("data-row-key") === String(key));
    // the arrows run in a cycle: after the last record comes the first, before the first comes the last
    const n = i < 0 || rows.length < 2 ? { prev: null, next: null } : { prev: rows[(i - 1 + rows.length) % rows.length], next: rows[(i + 1) % rows.length] };
    if (n.prev !== nav.prev || n.next !== nav.next) setNav(n);
  });
  const step = (tr) => { if (tr) { tr.click(); tr.scrollIntoView({ block: "nearest" }); } };
  if (!open) return null;
  return (
    // Side panel (Project Center style): the list stays visible and clickable beside it - pick another row to switch records
    <div className="pointer-events-none fixed inset-0 z-[55] flex justify-end">
      <div role="dialog" aria-modal="false" aria-label={typeof title === "string" ? title : undefined} data-drawer
        className="nx-drawer pointer-events-auto absolute flex flex-col rounded-xl border border-line bg-white shadow-[-8px_0_28px_rgba(16,24,40,0.14)]"
        style={{ ...box, width: `min(${width}px, max(560px, 46vw))`, maxWidth: "calc(100% - 16px)", overflow: "clip" }}>
        <div className={cls("shrink-0", !tabs && "border-b border-line")}>
          {/* Header: [‹ › previous / next] title, then ID + status; small icon actions and close on the right.
              Action buttons get their own row underneath, starting under the title, so they never wrap unevenly. */}
          <div className={cls("nx-dhead relative flex items-start gap-3 pr-6 pt-5", nav.prev || nav.next ? "pl-3" : "pl-6", tabs ? "pb-4" : "pb-4")}>
            {(nav.prev || nav.next) && (
              <div className="flex shrink-0 flex-col pt-0.5">
                <IconBtn icon={Icon.chevronDown} className="rotate-180" title="Previous record" disabled={!nav.prev} onClick={() => step(nav.prev)} />
                <IconBtn icon={Icon.chevronDown} title="Next record" disabled={!nav.next} onClick={() => step(nav.next)} />
              </div>)}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <h2 className="min-w-0 text-[17px] font-semibold leading-tight tracking-tight" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", overflowWrap: "anywhere" }}>{title}</h2>
                {badge}
              </div>
              {(recordId || status || subtitle) && <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink-soft">{recordId && <span className="mono text-ink-mute">{recordId}</span>}{status}{subtitle}</div>}
              {actions && <div data-drawer-actions className="mt-3 flex flex-wrap items-center gap-2">{actions}</div>}
            </div>
            <div className="-mt-1 flex shrink-0 items-center gap-1">{topActions}<IconBtn icon={Icon.x} title="Close" onClick={onClose} /></div>
          </div>
          {tabs && <DetailTabs {...tabs} />}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{related && related.length > 0 && <div className="pt-4"><DocBar related={related} /></div>}
          {details && details.filter(Boolean).length > 0 && (!tabs || tabs.active === tabs.tabs[0]?.id) && <div className="px-6 pt-4"><InfoCard title="Details" icon={Icon.info} rows={details} /></div>}
          {children}{comments && <RecordComments id={comments} />}</div>
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
      {hint && <span className="mt-0.5 block text-[10.5px] leading-tight text-ink-faint">{hint}</span>}
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
// Dropdown options have no tick box: the chosen option is blue with a small tick at the end of the row
function OptBox() { return null; }
const OptTick = ({ on }) => (on ? <svg className="shrink-0 text-brand" width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.5 6.2 5 8.6 9.5 3.6" /></svg> : null);
// Page filters can hold several values: "All" (nothing picked), one value, or a list of values
const selList = (sel) => (sel == null || sel === "" || sel === "All" ? [] : Array.isArray(sel) ? sel : [sel]);
const selMatch = (sel, v) => { const l = selList(sel); return !l.length || l.map(String).includes(String(v)); };
const selAny = (sel, fn) => { const l = selList(sel); return !l.length || l.some(fn); };
// Form dropdown - same popover menu as the list filters (heading, dots, tick), positioned on screen
function Select({ value, onChange, options, placeholder, disabled, className, label, ...rest }) {
  const fieldLabel = y.useContext(FieldCtx);
  const [open, setOpen] = y.useState(false);
  const [pos, setPos] = y.useState(null);
  const [q, setQ] = y.useState("");
  const [hi, setHi] = y.useState(-1);
  const btn = y.useRef(null), menu = y.useRef(null);
  // a plain "Select…" placeholder is not offered as an option; a meaningful one ("Not grouped", "- none -") is
  const opts = [...(placeholder !== undefined && !/^select\b/i.test(String(placeholder)) ? [{ value: "", label: placeholder, ph: true }] : []), ...options.map((o) => (typeof o === "object" ? o : { value: o, label: o }))];
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
    // a scroll moves the menu with its field; it closes only once the field has scrolled out of view
    const scr = (e) => { if (menu.current?.contains(e.target) || !btn.current) return; const r = btn.current.getBoundingClientRect(); if (r.bottom < 0 || r.top > window.innerHeight) setOpen(false); else place(); };
    const close = () => setOpen(false);
    document.addEventListener("mousedown", off, true); document.addEventListener("scroll", scr, true); window.addEventListener("resize", close);
    return () => { document.removeEventListener("mousedown", off, true); document.removeEventListener("scroll", scr, true); window.removeEventListener("resize", close); };
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
              const on = !o.ph && String(o.value) === String(value ?? "");
              return (
                <button key={String(o.value) + i} type="button" role="option" aria-selected={on} disabled={o.disabled} onMouseEnter={() => setHi(i)} onClick={() => !o.disabled && pick(o)}
                  className={cls("flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px]", o.disabled ? "cursor-not-allowed text-ink-faint" : on ? "text-brand" : i === hi ? "text-brand" : "text-ink", o.ph && !on && "text-ink-mute")}>
                  {dotOf(o)}<span className="flex-1 truncate">{String(o.label).trim()}</span><OptTick on={on} />
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
// Compact multi-select: picked trades show as chips in one field; the grouped, searchable list opens on click
function TradePicker({ options, value = [], onChange, placeholder = "Select trades…" }) {
  const [open, setOpen] = y.useState(false), [q, setQ] = y.useState("");
  const ref = y.useRef(null);
  y.useEffect(() => {
    if (!open) { setQ(""); return; }
    const off = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } };
    document.addEventListener("mousedown", off, true); document.addEventListener("keydown", esc, true);
    return () => { document.removeEventListener("mousedown", off, true); document.removeEventListener("keydown", esc, true); };
  }, [open]);
  const known = new Set(TRADE_GROUPS.flatMap((g) => g.items));
  const rest = options.filter((o) => !known.has(o));
  const groups = [...TRADE_GROUPS.map((g) => ({ ...g, items: g.items.filter((o) => options.includes(o)) })), ...(rest.length ? [{ label: "Other", items: rest }] : [])];
  const ql = q.trim().toLowerCase();
  const shown = groups.map((g) => ({ ...g, items: g.items.filter((o) => !ql || o.toLowerCase().includes(ql)) })).filter((g) => g.items.length);
  const toggle = (o) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  return (
    <div ref={ref} className="relative">
      <div role="combobox" aria-expanded={open} aria-haspopup="listbox" tabIndex={0} onClick={() => setOpen(true)} onKeyDown={(e) => (e.key === "Enter" || e.key === "ArrowDown") && setOpen(true)}
        className={cls(inputCls, "flex h-auto min-h-[32px] cursor-pointer flex-wrap items-center gap-1 py-1", open && "border-brand ring-2 ring-brand/15")}>
        {value.length ? value.map((o) => (
          <span key={o} className="inline-flex items-center gap-1 rounded bg-brand-soft py-[1px] pl-1.5 pr-0.5 text-[12px] font-medium text-brand">
            {o}<button type="button" aria-label={"Remove " + o} className="rounded p-[1px] hover:bg-white/70" onClick={(e) => { e.stopPropagation(); toggle(o); }}>{h(Icon.x, { size: 11 })}</button>
          </span>)) : <span className="text-ink-mute">{placeholder}</span>}
        {h(Icon.chevronDown, { size: 14, className: cls("ml-auto shrink-0 text-ink-mute transition-transform", open && "rotate-180") })}
      </div>
      {open && (
        <div role="listbox" aria-multiselectable="true" className="absolute left-0 right-0 z-40 mt-1 flex max-h-[300px] flex-col overflow-hidden rounded-lg border border-line bg-white shadow-lg">
          <div className="border-b border-line p-2">
            <input autoFocus className="h-[28px] w-full rounded-md border border-line px-2 text-[12.5px] outline-none focus:border-brand" placeholder="Find a trade…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="min-h-0 overflow-y-auto py-1">
            {shown.length ? shown.map((g) => (
              <div key={g.label}>
                <p className="px-3 pb-0.5 pt-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-faint">{g.label}</p>
                {g.items.map((o) => { const on = value.includes(o); return (
                  <button key={o} type="button" role="option" aria-selected={on} aria-pressed={on} onClick={() => toggle(o)}
                    className={cls("flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px]", on ? "text-brand" : "text-ink hover:text-brand")}>
                    <span className="flex-1">{o}</span><OptTick on={on} />
                  </button>); })}
              </div>)) : <p className="px-3 py-3 text-center text-[12.5px] text-ink-mute">No trade matches “{q}”</p>}
          </div>
          <div className="flex items-center justify-between border-t border-line px-3 py-1.5 text-[12px] text-ink-mute">
            <span><b className="text-ink">{value.length}</b> selected</span>
            {value.length > 0 && <button type="button" className="text-brand hover:underline" onClick={() => onChange([])}>Clear</button>}
          </div>
        </div>)}
    </div>
  );
}

function SearchBox({ value, onChange, placeholder = "Search...", autoFocus, onBlur }) {
  return (
    <label className="flex h-[28px] w-[220px] items-center gap-2 rounded-md border border-line bg-white px-2 text-[13px] text-ink-mute">
      {h(Icon.search, { size: 13 })}
      <input className="w-full bg-transparent text-ink outline-none placeholder:text-ink-mute" placeholder={placeholder} autoFocus={autoFocus} onBlur={onBlur}
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
  type: "shapes", supplies: "shapes", tier: "chart", preferred: "star", registration: "clipboardCheck", compliance: "shieldCheck", vendor: "building", contractor: "hardHat",
  project: "folder", "deliver to": "truck", source: "branch", billing: "receipt", "bill type": "file", match: "scale", "should pay": "wallet",
  stage: "activity", mode: "users", category: "layers", standing: "gauge", insurance: "shield", "required coverage": "shield", "payment gate": "lock",
  "blocks payment": "lock", "work order": "clipboardList", jms: "listChecks", region: "globe", "wage zone": "globe", skill: "wrench", trade: "hardHat",
  trades: "hardHat", "rule sets": "listChecks", result: "target", owner: "user", level: "layers", "submitted by": "user", "rated by": "user",
  acceptance: "check", basis: "file", period: "calendar", invitation: "mail", group: "layers", state: "globe", "supplier type": "building", "vendor group": "layers",
  purpose: "target", "billed in": "receipt", inspection: "clipboardCheck", "release": "handshake", settlement: "scale", "scorecard standing": "gauge", risk: "warning",
  severity: "alert", step: "listChecks", trigger: "zap", routing: "branch", who: "user", "requested / approved by": "user", "raised / decided": "calendarClock",
  weather: "sparkles", "mobilisation checklist": "clipboardList", "open punch items": "wrench", ncrs: "fileX", "vendor bill": "receipt", against: "file",
  "city / state": "pin", "challan · transport": "truck", "items · project": "boxes", entity: "building", designation: "user", documents: "folder",
};
const filterIcon = (label) => {
  const k = FILTER_ICONS[String(label || "").toLowerCase()];
  if (/^status$/i.test(String(label || ""))) return <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-current opacity-60" />;
  return h(Icon[k && Icon[k] ? k : "sliders"], { size: 16, className: "shrink-0" });
};
// Colour dot for a filter option: its status colour when it has one, else a palette colour by position
const isAllOpt = (o, opts) => o === opts[0] && /^(all|any)\b/i.test(String(o.label));
const optTone = (o, opts) => (isAllOpt(o, opts) ? null : o.tone || EXTRA_DOT[String(o.label).toLowerCase()] || TONE[String(o.label).toLowerCase()] || TONE[String(o.value).toLowerCase()] || FILTER_PALETTE[Math.max(0, opts.indexOf(o) - (isAllOpt(opts[0], opts) ? 1 : 0)) % FILTER_PALETTE.length]);
// Inside the Filters side panel a FilterSelect renders as a section of chips and stages its value until Apply
const FilterPanelCtx = y.createContext(null);
function FilterChip({ on, tone, label, onClick }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={cls("inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[12.5px] transition-colors", on ? "border-brand bg-brand-soft font-medium text-brand" : "border-line bg-white text-ink-soft hover:border-gray-300 hover:text-ink")}>
      <span className={cls("h-2 w-2 shrink-0 rounded-full", tone ? DOT[tone] : "border border-gray-300 bg-white")} /><span className="truncate">{label}</span>
    </button>
  );
}
function FilterSection({ title, count, defaultOpen = true, children }) {
  const [open, setOpen] = y.useState(defaultOpen);
  return (
    <section className="border-b border-line">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-5 py-3.5 text-left">
        <span className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-soft">{title}{count ? <span className="ml-1.5 rounded-full bg-brand px-1.5 py-[1px] text-[10px] text-white">{count}</span> : null}</span>
        {h(Icon.chevronDown, { size: 15, className: cls("text-ink-mute transition", open && "rotate-180") })}
      </button>
      {open && <div className="px-5 pb-4">{children}</div>}
    </section>
  );
}
function ChipList({ opts, isOn, onToggle }) {
  const [fq, setFq] = y.useState("");
  const list = opts.filter((o) => !fq.trim() || String(o.label).toLowerCase().includes(fq.trim().toLowerCase()));
  return (
    <>
      {opts.length > 10 && <input className="mb-2 h-[30px] w-full rounded-md border border-line px-2.5 text-[12.5px] outline-none focus:border-brand" placeholder="Search…" value={fq} onChange={(e) => setFq(e.target.value)} />}
      <div className="flex flex-wrap gap-1.5">{list.map((o) => <FilterChip key={String(o.value)} on={isOn(o)} tone={o.toneKey} label={String(o.label).trim()} onClick={() => onToggle(o)} />)}</div>
    </>
  );
}
// Several values can be picked from one filter (single = one value only, e.g. a period)
function FilterSelect({ value, onChange, options, label, single }) {
  const panel = y.useContext(FilterPanelCtx);
  if (panel) return <FilterSelectPanel value={value} onChange={onChange} options={options} label={label} panel={panel} single={single} />;
  return <FilterSelectMenu value={value} onChange={onChange} options={options} label={label} single={single} />;
}
// toggling o in a multi filter: nothing left → the "All" value, one → that value, more → the list
const toggleSel = (cur, o, allValue) => { const l = selList(cur).map(String), v = String(o); const n = l.includes(v) ? l.filter((x) => x !== v) : [...l, v]; return n.length === 0 ? (allValue ?? "All") : n.length === 1 ? n[0] : n; };
// Page filter shown in the side panel: one choice; tapping the chosen chip goes back to "all"
function FilterSelectPanel({ value, onChange, options, label, panel, single }) {
  const opts = options.map((o) => (typeof o === "object" ? o : { value: o, label: o }));
  const all = isAllOpt(opts[0], opts) ? opts[0] : null;
  panel.register(label, { first: opts[0].value, onChange });
  const cur = panel.draft[label] ? panel.draft[label].value : value;
  const choices = opts.filter((o) => o !== all).map((o) => ({ ...o, toneKey: optTone(o, opts) }));
  return (
    <FilterSection title={label} count={all ? selList(String(cur) === String(all.value) ? "All" : cur).length : 0}>
      <ChipList opts={choices} isOn={(o) => (single ? String(o.value) === String(cur) : selList(cur).map(String).includes(String(o.value)))}
        onToggle={(o) => panel.stage(label, single ? (String(o.value) === String(cur) && all ? all.value : o.value) : toggleSel(cur, o.value, all ? all.value : "All"), onChange)} />
    </FilterSection>
  );
}
function FilterSelectMenu({ value, onChange, options, label, single }) {
  const [open, setOpen] = y.useState(false);
  const [fq, setFq] = y.useState("");
  const ref = y.useRef(null);
  y.useEffect(() => {
    if (!open) return;
    const off = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", off, true); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", off, true); document.removeEventListener("keydown", esc); };
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
  const isAll = (o) => o === opts[0] && /^(all|any)\b/i.test(String(o.label));
  const picked = single ? [] : selList(value).filter((v) => !(isAll(opts[0]) && String(v) === String(opts[0].value)));
  const cur = picked.length > 1 ? { value: "__multi", label: `${String((opts.find((o) => String(o.value) === String(picked[0])) || {}).label || picked[0]).trim()} +${picked.length - 1}` } : opts.find((o) => String(o.value) === String(picked[0] ?? value)) || opts[0];
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
          {label && <p className="flex items-center justify-between px-3 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-mute">{label}{!single && <span className="normal-case tracking-normal font-normal">{picked.length ? <button type="button" className="text-brand" onClick={() => onChange(isAll(opts[0]) ? opts[0].value : "All")}>Clear</button> : "pick one or more"}</span>}</p>}
          {opts.length > 8 && <div className="px-2 pb-1"><input autoFocus className="h-[28px] w-full rounded-md border border-line px-2 text-[12.5px] outline-none focus:border-brand" placeholder="Search…" value={fq} onChange={(e) => setFq(e.target.value)} /></div>}
          {opts.filter((o) => !fq.trim() || isAll(o) || String(o.label).toLowerCase().includes(fq.trim().toLowerCase())).map((o) => {
            const on = single || isAll(o) ? (isAll(o) ? !picked.length && String(value) === String(o.value) || (!single && !picked.length) : String(o.value) === String(value)) : picked.map(String).includes(String(o.value));
            return (
              <button key={o.value} type="button" role="option" aria-selected={on} onClick={() => { if (single) { onChange(o.value); setOpen(false); } else onChange(isAll(o) ? o.value : toggleSel(picked, o.value, isAll(opts[0]) ? opts[0].value : "All")); }}
                className={cls("flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px]", on ? "text-brand" : "text-ink hover:text-brand")}>
                {dot(o)}<span className="flex-1 truncate">{String(o.label).trim()}</span><OptTick on={on} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Quick filter on a list column (Project Center style): an icon in the toolbar, multi-select menu, applies at once
function QuickColFilter({ def, value, onChange }) {
  const [open, setOpen] = y.useState(false), ref = y.useRef(null);
  y.useEffect(() => {
    if (!open) return;
    const off = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", off, true); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", off, true); document.removeEventListener("keydown", esc); };
  }, [open]);
  const sel = value || [];
  const toggle = (v) => onChange(sel.includes(v) ? sel.filter((x) => x !== v) : [...sel, v]);
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label={def.name} data-quick-filter={def.name} data-tip={sel.length ? `${def.name}: ${sel.join(", ")}` : def.name} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className={cls("relative grid h-8 w-8 place-items-center rounded-md", sel.length ? "bg-brand-soft text-brand" : open ? "bg-gray-100 text-ink" : "text-ink-mute hover:bg-gray-100 hover:text-ink")}>
        {filterIcon(def.name)}
        {sel.length > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">{sel.length}</span>}
      </button>
      {open && (
        <div role="listbox" aria-multiselectable="true" className="absolute left-0 z-50 mt-1 max-h-[320px] w-max min-w-[200px] max-w-[min(320px,calc(100vw-24px))] overflow-y-auto rounded-lg border border-line bg-white py-1 shadow-lg">
          <p className="flex items-center justify-between px-3 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-mute">{def.name}{sel.length > 0 && <button type="button" className="normal-case tracking-normal text-brand" onClick={() => onChange([])}>Clear</button>}</p>
          {def.opts.map((o) => {
            const on = sel.includes(o.value);
            return (
              <button key={o.value} type="button" role="option" aria-selected={on} onClick={() => toggle(o.value)}
                className={cls("flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px]", on ? "text-brand" : "text-ink hover:text-brand")}>
                <span className={cls("h-2 w-2 shrink-0 rounded-full", o.toneKey ? DOT[o.toneKey] : "bg-gray-300")} /><span className="flex-1 truncate">{o.label}</span><OptTick on={on} />
              </button>);
          })}
        </div>)}
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
    // other linked records: search by the name the list shows, not only the code
    if (typeof v === "string" && /^(contractId|poId|rfqId|requisitionId|blanketId|raBillId|invoiceId)$/.test(k)) {
      const coll = { contractId: "contracts", poId: "purchaseOrders", rfqId: "rfqs", requisitionId: "requisitions", blanketId: "blanketOrders", raBillId: "raBills", invoiceId: "invoices" }[k];
      const x = byId(getState()[coll] || [], v) || {}; out.push(x.title || x.name || x.purpose || x.number || "");
    }
    // search what the list shows: dates as displayed (12 Sept 2026) and RA bill numbers (RA-3)
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) out.push(fmtDate(v));
    if (k === "seq" && v != null) out.push(`RA-${v}`);
    out.push(rowSearchText(v, depth + 1));
  }
  return out.join(" ");
}

// Main list = toolbar (page filters left, search right) + table + bottom bar with the count.
// dense / plain tables (inside panels and cards) are just the table.
const pluralWord = (w) => (/(s|ing|ce|ance|by|pay|ed)$/.test(w) ? w : /(ch|sh|x)$/.test(w) ? w + "es" : /[^aeiou]y$/.test(w) ? w.slice(0, -1) + "ies" : w + "s");
// Customize Columns panel (Project Center style): toggle optional columns on/off, Apply saves the choice for this browser
// Filters side panel, docked over the content card like the record panel
function FilterAside({ children, ...rest }) {
  const box = useContentBox();
  return <aside role="complementary" aria-label="Filters" data-filter-panel style={box} {...rest}
    className="nx-drawer absolute flex w-[380px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-xl border border-line bg-white shadow-[-8px_0_28px_rgba(16,24,40,0.14)]">{children}</aside>;
}
function ColumnPicker({ extra, shown, onApply, onClose }) {
  const box = useContentBox();
  const [draft, setDraft] = y.useState(shown);
  const on = (k) => draft.includes(k);
  const flip = (k) => setDraft((d) => (d.includes(k) ? d.filter((x) => x !== k) : [...d, k]));
  const sameAs = (list) => draft.length === list.length && draft.every((k) => list.includes(k));
  const changed = !sameAs(shown);
  const defaults = extra.filter((c) => c.default).map((c) => c.key);
  y.useEffect(() => { const esc = (e) => e.key === "Escape" && onClose(); document.addEventListener("keydown", esc); return () => document.removeEventListener("keydown", esc); }, []);
  return (
    <div className="fixed inset-0 z-[65]" onMouseDown={onClose}>
      <aside role="dialog" aria-label="Customize columns" onMouseDown={(e) => e.stopPropagation()} style={box}
        className="nx-drawer absolute flex w-[380px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-xl border border-line bg-white shadow-[-8px_0_28px_rgba(16,24,40,0.14)]">
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-soft text-brand">{h(Icon.sliders, { size: 15 })}</span>
          <h3 className="flex-1 text-[14.5px] font-semibold">Customize Columns <span data-tip="Show or hide extra columns in this list. Your choice is remembered on this browser." className="ml-1 inline-flex align-middle text-ink-mute">{h(Icon.info, { size: 13 })}</span></h3>
          <button type="button" aria-label="Close" className="rounded-md p-1 text-ink-mute hover:bg-gray-100" onClick={onClose}>{h(Icon.x, { size: 16 })}</button>
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100"><span className="block h-full rounded-full bg-brand transition-all" style={{ width: `${(100 * draft.length) / extra.length}%` }} /></span>
          <span className="num text-[12px] text-ink-mute">{draft.length}/{extra.length}</span>
          <button type="button" className="text-[12px] text-brand hover:underline" onClick={() => setDraft(draft.length === extra.length ? [] : extra.map((c) => c.key))}>{draft.length === extra.length ? "Hide all" : "Show all"}</button>
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-4">
          {extra.map((c) => (
            <button key={c.key} type="button" role="switch" aria-checked={on(c.key)} aria-label={c.label} onClick={() => flip(c.key)}
              className={cls("flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors", on(c.key) ? "border-brand/40 bg-brand-soft/40" : "border-line hover:bg-gray-50")}>
              {h(on(c.key) ? Icon.eye : Icon.eyeOff, { size: 16, className: cls("shrink-0", on(c.key) ? "text-brand" : "text-ink-faint") })}
              <span className="min-w-0 flex-1"><span className="block text-[13px] font-medium text-ink">{c.label}</span><span className="block truncate text-[11.5px] text-ink-mute">{c.desc}</span></span>
              <span className={cls("relative h-[18px] w-8 shrink-0 rounded-full transition-colors", on(c.key) ? "bg-brand" : "bg-gray-200")}>
                <span className={cls("absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow transition-all", on(c.key) ? "left-[16px]" : "left-[2px]")} />
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-line px-4 py-3">
          {/* Reset puts back the list's default columns; Apply saves it */}
          <button type="button" className="mr-auto flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] text-ink-soft hover:bg-gray-100 hover:text-ink disabled:opacity-40" disabled={sameAs(defaults)} onClick={() => setDraft(defaults)}>{h(Icon.refresh, { size: 14 })}Reset</button>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" disabled={!changed} onClick={() => { onApply(draft); onClose(); }}>Apply</Btn>
        </div>
      </aside>
    </div>
  );
}
const readCols = (id) => { try { const v = JSON.parse(localStorage.getItem("nxv-cols2:" + id)); return Array.isArray(v) ? v : null; } catch { return null; } };

const ListMode = y.createContext(false);
function DataTable({ columns: allColumns, extraColumns: extra0, columnsId: cid0, onClearFilters, exportName, rows, onRow, rowKey = (r) => r.id, empty, footer, dense, plain, filters, actions, noun = "records", summary, searchText = rowSearchText, placeholder = "Search…", calendar, defaultCols, asList: asList0 }) {
  // Inside a record panel that asks for it (ListMode), small tables show as label → value lists
  const asList = asList0 || (dense && y.useContext(ListMode));
  // asList: each row as a block of label → value lines (record panels), action column top-right
  if (asList) return (
    <div className="divide-y divide-line">
      {rows.length === 0 ? empty || <p className="p-4 text-[13px] text-ink-mute">None.</p> : rows.map((r, i) => {
        const acts = allColumns.filter((c) => !c.label).map((c) => <span key={c.key}>{c.render ? c.render(r, i) : r[c.key]}</span>);
        return (
          <div key={rowKey(r, i)} className="relative" onClick={onRow ? () => onRow(r) : undefined}>
            {acts.length > 0 && <div className="absolute right-4 top-2 z-[1] flex gap-1">{acts}</div>}
            <KV items={allColumns.filter((c) => c.label).map((c) => [c.label, c.render ? c.render(r, i) : r[c.key]])} />
          </div>
        );
      })}
    </div>
  );
  const list = !dense && !plain;
  // Columns marked opt start hidden; they can be switched on in Customize Columns
  // List pages show names, not codes: a record's own ID / code column (key id / seq, or labelled ID / Code) is left out - it shows in the record panel
  const isCode = (c) => list && (c.key === "id" || c.key === "seq" || /^(id|code)$/i.test(String(c.label || "")));
  // Every list shows 5 default data columns: the first column (the record's name) is fixed, the other four are
  // switched on by default; every other column (and the page's extra columns) can be switched on in Customize Columns.
  // Columns without a label (row checkbox, row actions) are not data columns and always show.
  const isAct = (c) => !c.label || /^actions?$/i.test(String(c.label));
  const dataCols = allColumns.filter((c) => !isAct(c) && !isCode(c));
  const optDefs = [...dataCols.filter((c) => !c.opt), ...dataCols.filter((c) => c.opt), ...(extra0 || [])];
  const autoDefaults = () => {
    const base = dataCols.filter((c) => !c.opt).map((c) => c.key), pick = base.slice(0, 5);
    // keep the record's status visible by default
    const stat = base.find((k) => { const c = dataCols.find((x) => x.key === k); return /^(status|stage|state|standing)$/i.test(String(c.label)) || k === "status"; });
    if (stat && !pick.includes(stat) && pick.length === 5) pick[4] = stat;
    return pick;
  };
  const defKeys = list ? (defaultCols || autoDefaults()).slice(0, 5) : [];
  const fixedKey = list ? defKeys[0] : null;
  const extraColumns = list && optDefs.length > 1 ? optDefs.filter((c) => c.key !== fixedKey).map((c) => ({ ...c, default: defKeys.includes(c.key), desc: c.desc || (typeof c.filterLabel === "string" ? c.filterLabel : "") })) : null;
  const columnsId = cid0 || `auto:${String(window.location.hash).split("?")[0].replace(/^#\/productivity\//, "")}:${noun}`;
  // Optional columns: shown when switched on in the Customize Columns panel ("+" at the end of the header)
  const [extraOn, setExtraOn] = y.useState(() => (extraColumns ? readCols(columnsId) || extraColumns.filter((c) => c.default).map((c) => c.key) : []));
  const [picker, setPicker] = y.useState(false);
  const applyCols = (keys) => { setExtraOn(keys); try { localStorage.setItem("nxv-cols2:" + columnsId, JSON.stringify(keys)); } catch {} };
  const known = extraColumns ? new Set(extraColumns.map((c) => c.key)) : new Set();
  const visibleData = !list ? allColumns.filter((c) => !c.opt && !isCode(c)) : allColumns.filter((c) => !isCode(c) && (isAct(c) || c.key === fixedKey || (known.has(c.key) && extraOn.includes(c.key)) || (!known.has(c.key) && !c.opt)));
  const visExtra = list && extra0 ? extra0.filter((c) => extraOn.includes(c.key)) : [];
  // trailing unlabeled columns (row actions) stay at the end
  const lastData = visibleData.reduce((n, c, i) => (!isAct(c) ? i : n), -1);
  const head = visibleData.slice(0, lastData + 1), tail = visibleData.slice(lastData + 1);
  const columns0 = !extraColumns || !list ? visibleData : [...head, ...visExtra, ...tail,
    { key: "__cols", label: "", width: 48, align: "right", head: <button type="button" aria-label="Customize columns" data-tip="Customize columns" onClick={() => setPicker(true)} className="grid h-7 w-7 place-items-center rounded-md text-ink-mute hover:bg-gray-100 hover:text-ink">{h(Icon.plus, { size: 15 })}</button>, render: () => null }];
  // A row-action column that is empty in every row (e.g. no actions on a locked record) is left out,
  // so it doesn't leave a blank column at the right edge of the table
  const blankNode = (n) => {
    if (n == null || n === false || n === true || n === "") return true;
    if (Array.isArray(n)) return n.every(blankNode);
    if (y.isValidElement(n) && (typeof n.type === "string" || n.type === y.Fragment)) return blankNode(n.props.children);
    return false;
  };
  const columns = columns0.filter((c) => !(isAct(c) && c.render && c.key !== "__cols" && c.key !== "sel" && !c.head && rows.length > 0 && rows.every((r, i) => { try { return blankNode(c.render(r, i)); } catch { return false; } })));
  // First column stays put while the rest scrolls sideways (a leading checkbox column sticks together with it)
  const lead = !dense && columns[0] && !columns[0].label && columns.length > 2 ? 1 : 0;
  const stick = (ci) => (dense || ci > lead ? null : cls("nx-stick", ci === lead && "nx-edge", ci === 1 && lead ? "left-[44px]" : "left-0"));
  // ?q= from a related-document button pre-fills the page's main list search
  const [q, setQ] = y.useState(() => (dense || plain ? "" : new URLSearchParams(String(window.location.hash).split("?")[1] || "").get("q") || ""));
  // Column filters: a column with `filter` (true = row[key], or a function returning a value / list of values) gets its own dropdown
  const [cf, setCf] = y.useState({});
  const [searchOpen, setSearchOpen] = y.useState(false), [filtersOpen, setFiltersOpen] = y.useState(false), [nActive, setNActive] = y.useState(0);
  const filterRow = y.useRef(null);
  y.useLayoutEffect(() => { const el = filterRow.current; const n = el ? el.querySelectorAll("button[aria-haspopup=listbox].bg-brand-soft").length : 0; if (n !== nActive) setNActive(n); });
  // Sorting: click a column header (asc → desc → off). Value = column.sort(row), else its filter value, else row[key]
  const [sort, setSort] = y.useState(null);
  const tableRef = y.useRef(null);
  // List / Board / Calendar layouts and paging
  const [view, setView] = y.useState("list");
  const [page, setPage] = y.useState(0), [pageSize, setPageSize] = y.useState(50), [exporting, setExporting] = y.useState(false);
  const [calMonth, setCalMonth] = y.useState(() => todayISO().slice(0, 7));
  const fcols = list ? [...allColumns.filter((c) => !isCode(c)), ...(extra0 || [])].filter((c) => c.filter) : [];
  const fval = (c, r) => { const v = typeof c.filter === "function" ? c.filter(r) : r[c.key]; return (Array.isArray(v) ? v : [v]).filter((x) => x !== undefined && x !== null && x !== "").map(String); };
  const colFiltered = fcols.length ? rows.filter((r) => fcols.every((c) => !(cf[c.key] || []).length || fval(c, r).some((v) => cf[c.key].includes(v)))) : rows;
  const prim = (x) => x != null && typeof x !== "object";
  const sortVal = (c, r) => { const v = c.sort ? c.sort(r) : prim(r[c.key]) ? r[c.key] : typeof c.filter === "function" ? c.filter(r) : null; return Array.isArray(v) ? v.join(", ") : v; };
  const canSort = (c) => list && c.label && c.sort !== false && c.key !== "__cols" && (c.sort || typeof c.filter === "function" || rows.some((r) => prim(r[c.key])));
  const searched = list && q.trim() ? colFiltered.filter((r) => { const t = searchText(r).toLowerCase(); return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => t.includes(w)); }) : colFiltered;
  const sortCol = sort && columns.find((c) => c.key === sort.key);
  const shown = !sortCol ? searched : [...searched].sort((a, b) => {
    const x = sortVal(sortCol, a), z = sortVal(sortCol, b);
    if (x == null || x === "") return 1; if (z == null || z === "") return -1;
    const d = typeof x === "number" && typeof z === "number" ? x - z : String(x).localeCompare(String(z), "en", { numeric: true });
    return sort.dir === "asc" ? d : -d;
  });
  y.useEffect(() => setPage(0), [q, JSON.stringify(cf), sort && sort.key, sort && sort.dir]);
  const pages = Math.max(1, Math.ceil(shown.length / pageSize)), pg = Math.min(page, pages - 1);
  const paged = !list || exporting ? shown : shown.slice(pg * pageSize, (pg + 1) * pageSize);
  const toggleSort = (c) => setSort((o) => (!o || o.key !== c.key ? { key: c.key, dir: "asc" } : o.dir === "asc" ? { key: c.key, dir: "desc" } : null));
  // Export exactly what is on screen (visible columns, filtered + sorted rows) as a CSV that opens in Excel
  const exportCsv = () => { setView("list"); setExporting(true); };
  y.useEffect(() => { if (exporting) { doExport(); setExporting(false); } }, [exporting]);
  const doExport = () => {
    const t = tableRef.current; if (!t) return;
    const heads = [...t.querySelectorAll("thead th")].map((th) => th.innerText.trim());
    const keep = heads.map((x, i) => (x ? i : -1)).filter((i) => i >= 0);
    const esc = (x) => { const v = String(x).replace(/\s+/g, " ").trim(); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };
    const lines = [keep.map((i) => esc(heads[i])).join(","), ...[...t.querySelectorAll("tbody tr")].map((tr) => { const tds = tr.querySelectorAll("td"); return keep.map((i) => esc(tds[i] ? tds[i].innerText : "")).join(","); })];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
    a.download = `${(exportName || noun).replace(/\s+/g, "-")}-${todayISO()}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(`Exported ${shown.length} ${noun}`);
  };
  const clearAll = () => { setQ(""); setCf({}); Object.values(regs.current || {}).forEach((x) => x.onChange(x.first)); onClearFilters && onClearFilters(); };
  const active = q.trim() || fcols.some((c) => (cf[c.key] || []).length);
  const colDefs = fcols.map((c) => {
    const name = c.filterLabel || (typeof c.label === "string" ? c.label : c.key);
    // Full list of possible values (filterOptions) plus anything else present in the data
    const dom = (typeof c.filterOptions === "function" ? c.filterOptions() : c.filterOptions || []).map((v) => (typeof v === "object" ? String(v.value) : String(v)));
    const extra = [...new Set(rows.flatMap((r) => fval(c, r)))].filter((v) => !dom.includes(v)).sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
    const opts = [...dom, ...extra].map((v) => ({ value: v, label: v }));
    opts.forEach((o) => (o.toneKey = optTone(o, opts)));
    return opts.length || (cf[c.key] || []).length ? { key: c.key, name, opts } : null;
  }).filter(Boolean);
  const hasFilters = !!filters || colDefs.length > 0;
  const colActive = fcols.filter((c) => (cf[c.key] || []).length).length;
  const nFilters = nActive + colActive;
  // Side panel: choices are staged (draft) and take effect on Apply Filters
  const [draft, setDraft] = y.useState({ cols: {}, page: {} });
  const regs = y.useRef({});
  const openPanel = () => { setDraft({ cols: { ...cf }, page: {} }); setFiltersOpen(true); };
  const panelCtx = { draft: draft.page, register: (label, r) => { regs.current[label] = r; }, stage: (label, value, onChange) => setDraft((d) => ({ ...d, page: { ...d.page, [label]: { value, onChange } } })) };
  const applyPanel = () => { Object.values(draft.page).forEach((x) => x.onChange(x.value)); setCf(draft.cols); setFiltersOpen(false); };
  const resetPanel = () => { Object.values(regs.current).forEach((x) => x.onChange(x.first)); setCf({}); setQ(""); onClearFilters && onClearFilters(); setDraft({ cols: {}, page: {} }); setFiltersOpen(false); };
  y.useEffect(() => { if (!filtersOpen) return; const k = (e) => e.key === "Escape" && setFiltersOpen(false); document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k); }, [filtersOpen]);
  // Column widths: each column as wide as its content (measured in a hidden copy of the table, kept between 96 and 360px),
  // then any leftover width is shared out equally - so the gap after the text is the same in every column
  const [colPx, setColPx] = y.useState(null);
  const [boxW, setBoxW] = y.useState(0);
  y.useEffect(() => { if (!list) return; const on = () => setBoxW(tableRef.current?.parentElement?.clientWidth || 0); on(); window.addEventListener("resize", on); return () => window.removeEventListener("resize", on); }, []);
  y.useLayoutEffect(() => {
    const t = tableRef.current; if (!list || !t || view !== "list") return;
    const clone = t.cloneNode(true);
    clone.style.cssText = "position:absolute;visibility:hidden;left:-99999px;top:0;width:max-content;min-width:0;table-layout:auto";
    clone.querySelectorAll("col").forEach((c) => (c.style.width = ""));
    [...clone.querySelectorAll("tbody tr")].slice(40).forEach((r) => r.remove());
    clone.querySelectorAll("td,th").forEach((c) => { c.style.maxWidth = "none"; });
    document.body.appendChild(clone);
    const nat = [...clone.querySelectorAll("thead th")].map((th) => Math.ceil(th.getBoundingClientRect().width));
    clone.remove();
    const fixedW = (c, i) => (c.key === "__cols" ? 48 : c.key === "sel" ? 44 : isAct(c) ? Math.min(nat[i] || 96, 320) : null);
    const w = columns.map((c, i) => fixedW(c, i) ?? Math.max(96, Math.min(360, nat[i] || 120)));
    const avail = t.parentElement?.clientWidth || 0, total = w.reduce((a, b) => a + b, 0);
    const dataIdx = columns.map((c, i) => (fixedW(c, i) == null ? i : -1)).filter((i) => i >= 0);
    if (avail > total && dataIdx.length) { const extra = Math.floor((avail - total) / dataIdx.length); dataIdx.forEach((i) => (w[i] += extra)); }
    if (JSON.stringify(w) !== JSON.stringify(colPx)) setColPx(w);
  });
  const rowEl = (r, i) => (
    <tr key={rowKey(r, i)} data-row-key={rowKey(r, i)} onClick={onRow ? () => onRow(r) : undefined} className={cls("group hover:bg-gray-50", onRow && "cursor-pointer")}>
      {columns.map((c, ci) => (
        <Td key={c.key} align={c.align} className={cls(c.num && "num", dense && "py-[5px]", c.className, stick(ci) || (ci === columns.length - 1 && "relative"))}>
          {c.render ? c.render(r, i) : r[c.key]}
          {/* record numbers are not shown on lists; kept here (screen readers, search, tests) */}
          {ci === columns.length - 1 && <span className="sr-only">{[...new Set([rowKey(r, i), r.id, r.c && r.c.id, r.contractId, r.woId, r.poId].filter((x) => typeof x === "string"))].join(" ")}</span>}
        </Td>
      ))}
    </tr>
  );
  const colName = (c) => c.filterLabel || (typeof c.label === "string" ? c.label : c.key);
  const groupOf = (c, r) => fval(c, r)[0] || "-";
  const orderGroups = (c, list0) => {
    const dom = (typeof c.filterOptions === "function" ? c.filterOptions() : c.filterOptions || []).map((v) => String(typeof v === "object" ? v.value : v));
    const m = new Map(); list0.forEach((r) => { const g = groupOf(c, r); if (!m.has(g)) m.set(g, []); m.get(g).push(r); });
    return [...m.entries()].sort((a, b) => { const ia = dom.indexOf(a[0]), ib = dom.indexOf(b[0]); return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a[0].localeCompare(b[0]); });
  };
  const boardCol = fcols.find((c) => /status|stage/i.test(colName(c))) || fcols[0];
  const labelled = columns.filter((c) => c.label && c.key !== "__cols");
  const cell = (c, r) => (c.render ? c.render(r) : r[c.key]);
  const board = boardCol && (
    <div data-board className="flex min-h-[320px] gap-3 overflow-x-auto bg-gray-50/60 p-4">
      {orderGroups(boardCol, shown).map(([g, rs]) => (
        <div key={g} className="flex w-[270px] shrink-0 flex-col rounded-lg bg-gray-100/80">
          <div className="flex items-center justify-between px-3 py-2 text-[12.5px] font-semibold">{g}<span className="rounded-full bg-white px-1.5 text-[11px] text-ink-soft ring-1 ring-line">{rs.length}</span></div>
          <div className="flex max-h-[560px] flex-col gap-2 overflow-y-auto px-2 pb-2">
            {rs.map((r, i) => (
              <div key={rowKey(r, i)} data-card onClick={onRow ? () => onRow(r) : undefined} className={cls("rounded-md border border-line bg-white p-2.5 text-[12.5px] shadow-sm", onRow && "cursor-pointer hover:border-brand")}>
                <div className="font-medium text-ink">{cell(labelled[0], r)}</div>
                {labelled.filter((c) => c !== labelled[0] && c !== boardCol).slice(0, 3).map((c) => <div key={c.key} className="mt-1 flex items-center justify-between gap-2 text-ink-soft"><span className="text-[11px] text-ink-mute">{c.label}</span><span className="min-w-0 truncate text-right">{cell(c, r)}</span></div>)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
  const cal = calendar && (() => {
    const [yy, mm] = calMonth.split("-").map(Number); const first = new Date(yy, mm - 1, 1); const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
    const days = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const byDay = {}; shown.forEach((r) => { const d = calendar.date(r); if (d) (byDay[String(d).slice(0, 10)] = byDay[String(d).slice(0, 10)] || []).push(r); });
    const move = (n) => { const d = new Date(yy, mm - 1 + n, 1); setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); };
    const inMonth = Object.keys(byDay).filter((k) => k.startsWith(calMonth)).reduce((t, k) => t + byDay[k].length, 0);
    return (
      <div data-calendar className="p-4">
        <div className="mb-2 flex items-center gap-2">
          <IconBtn icon={Icon.chevronDown} title="Previous month" className="rotate-90" onClick={() => move(-1)} />
          <b className="w-[150px] text-center text-[14px]">{first.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</b>
          <IconBtn icon={Icon.chevronDown} title="Next month" className="-rotate-90" onClick={() => move(1)} />
          <Btn size="sm" onClick={() => setCalMonth(todayISO().slice(0, 7))}>Today</Btn>
          <span className="ml-auto text-[12px] text-ink-mute">{calendar.label} · {inMonth} this month</span>
        </div>
        <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-line text-[12px]">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="border-b border-line bg-gray-50 px-2 py-1 font-medium text-ink-soft">{d}</div>)}
          {days.map((d) => { const k = iso(d), its = byDay[k] || [], out = d.getMonth() !== mm - 1, today = k === todayISO(); return (
            <div key={k} className={cls("min-h-[88px] border-b border-r border-line p-1", out && "bg-gray-50/70 text-ink-mute")}>
              <div className={cls("mb-0.5 text-right text-[11px]", today && "font-bold text-brand")}>{d.getDate()}</div>
              {its.slice(0, 3).map((r, i) => <button key={rowKey(r, i)} type="button" onClick={onRow ? () => onRow(r) : undefined} className="mb-0.5 block w-full truncate rounded bg-brand-soft px-1.5 py-0.5 text-left text-[11px] text-brand hover:bg-brand hover:text-white">{calendar.title ? calendar.title(r) : rowKey(r)}</button>)}
              {its.length > 3 && <span className="px-1 text-[10.5px] text-ink-mute">+{its.length - 3} more</span>}
            </div>); })}
        </div>
      </div>
    );
  })();
  const table = !shown.length
    ? (rows.length || onClearFilters ? <div className="pb-8"><EmptyState icon={Icon.search} title="No matches" text={q.trim() ? `Nothing matches “${q}”. Try another word or clear the search.` : "No records match these filters."} /><div className="-mt-2 flex justify-center"><Btn icon={Icon.x} onClick={clearAll}>Clear search &amp; filters</Btn></div></div> : empty || <EmptyState icon={Icon.folder} title="Nothing here yet" text="Records you add will appear in this list." />)
    : (
      <div className={cls("overflow-x-auto", list && "nx-fill")}>
        <table ref={tableRef} className={cls(!list && "w-full", !dense && "nx-list", list && "nx-eq")}
          style={list ? { tableLayout: "fixed", width: colPx && colPx.length === columns.length ? colPx.reduce((a, b) => a + b, 0) : "100%" } : undefined}>
          {list && <colgroup>{columns.map((c, i) => <col key={c.key} style={{ width: colPx && colPx.length === columns.length ? colPx[i] : c.key === "__cols" ? 48 : c.key === "sel" ? 44 : undefined }} />)}</colgroup>}
          <thead>
            <tr>
              {columns.map((c, ci) => (
                <Th key={c.key} align={c.align} className={cls(c.thClass, stick(ci))}>{c.head || (canSort(c) ? (
                  <button type="button" onClick={() => toggleSort(c)} aria-label={`Sort by ${c.label}`} className={cls("group/s inline-flex items-center gap-1 hover:text-ink", c.align === "right" && "flex-row-reverse", sort?.key === c.key && "text-ink")}>
                    {c.label}{h(Icon.chevronDown, { size: 12, className: cls("shrink-0 transition", sort?.key === c.key ? (sort.dir === "asc" ? "rotate-180 opacity-100" : "opacity-100") : "opacity-0 group-hover/s:opacity-40") })}
                  </button>) : c.label)}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map(rowEl)}
          </tbody>
          {footer}
        </table>
      </div>
    );
  if (!list) return table;
  const sum$ = typeof summary === "function" ? summary(shown) : summary || [];
  return (
    <>
      {/* Toolbar: layout pill + quick filters left; search, filters and ⋯ (export) right. Search opens across the whole bar. */}
      <div className="flex min-h-[44px] flex-wrap items-center justify-end gap-1.5 border-b border-line px-4 py-1.5">
        {searchOpen || q ? (
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-brand/40 bg-white px-2.5 ring-2 ring-brand/10" data-searchbar>
            {h(Icon.search, { size: 15, className: "shrink-0 text-ink-mute" })}
            <input autoFocus aria-label="Search" className="h-8 min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink-mute" placeholder={placeholder} value={q}
              onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setQ(""); setSearchOpen(false); } }} onBlur={() => !q && setSearchOpen(false)} />
            <button type="button" aria-label="Close search" className="grid h-6 w-6 place-items-center rounded text-ink-mute hover:bg-gray-100 hover:text-ink" onMouseDown={(e) => e.preventDefault()} onClick={() => { setQ(""); setSearchOpen(false); }}>{h(Icon.x, { size: 14 })}</button>
          </div>
        ) : (
        <div className="mr-auto flex items-center gap-2">
          {(boardCol || calendar) && (
            <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5" role="group" aria-label="Layout">
              {[["list", "List", Icon.listChecks], ...(boardCol ? [["board", "Board", Icon.grid]] : []), ...(calendar ? [["calendar", "Calendar", Icon.calendar]] : [])].map(([k, t, ic]) => (
                <button key={k} type="button" aria-label={`${t} layout`} aria-pressed={view === k} data-tip={view === k ? undefined : t} onClick={() => setView(k)}
                  className={cls("flex h-7 items-center gap-1.5 rounded-md text-[13px]", view === k ? "bg-white px-2.5 font-medium text-brand shadow-sm" : "w-8 justify-center text-ink-soft hover:text-ink")}>
                  {h(ic, { size: 15 })}{view === k && t}
                </button>
              ))}
            </div>)}
          {(boardCol || calendar) && (colDefs.length > 0 || filters) && <span className="mx-0.5 h-5 w-px bg-line" />}
          {(colDefs.length > 0 || filters) && (
            <div className="flex items-center gap-0.5" role="group" aria-label="Quick filters">
              {filters && <div ref={filterRow} className="nx-filters flex items-center gap-0.5">{filters}</div>}
              {colDefs.slice(0, filters ? 3 : 5).map((d) => <QuickColFilter key={d.key} def={d} value={cf[d.key]} onChange={(v) => setCf({ ...cf, [d.key]: v })} />)}
            </div>)}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>)}
        {!(searchOpen || q) && <button type="button" aria-label="Search" data-tip="Search" onClick={() => setSearchOpen(true)} className="grid h-8 w-8 place-items-center rounded-md text-ink-soft hover:bg-gray-100 hover:text-ink">{h(Icon.search, { size: 16 })}</button>}
        {hasFilters && (
          <button type="button" aria-label="Filters" aria-expanded={filtersOpen} data-tip="Filters" onClick={() => (filtersOpen ? setFiltersOpen(false) : openPanel())}
            className={cls("relative grid h-8 w-8 place-items-center rounded-md hover:bg-gray-100", filtersOpen || nFilters ? "text-brand" : "text-ink-soft hover:text-ink", filtersOpen && "bg-brand-soft/60")}>
            {h(Icon.filter, { size: 16 })}
            {nFilters > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">{nFilters}</span>}
          </button>
        )}
        <button type="button" aria-label="Export" data-tip="Export this view to Excel (CSV)" onClick={exportCsv} disabled={!shown.length} className="grid h-8 w-8 place-items-center rounded-md text-ink-soft hover:bg-gray-100 hover:text-ink disabled:opacity-40">{h(Icon.download, { size: 16 })}</button>
      </div>
      {nFilters > 0 && (
        <div className="flex items-center gap-2 border-b border-line bg-gray-50/50 px-4 py-1.5 text-[12.5px] text-ink-soft">
          {h(Icon.filter, { size: 13, className: "text-brand" })}<span>{nFilters} filter{nFilters === 1 ? "" : "s"} applied</span>
          <button type="button" className="text-brand hover:underline" onClick={openPanel}>Edit</button>
          <button type="button" className="text-brand hover:underline" onClick={clearAll}>Clear filters</button>
        </div>
      )}
      {filtersOpen && (
        <div className="fixed inset-0 z-[56]" onMouseDown={() => setFiltersOpen(false)}>
          <FilterAside onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <span className="flex items-center gap-2.5 text-[15px] font-semibold"><span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-soft text-brand">{h(Icon.filter, { size: 16 })}</span>Filters</span>
              <IconBtn icon={Icon.x} title="Close" onClick={() => setFiltersOpen(false)} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {colDefs.map((c) => {
                const sel = draft.cols[c.key] || [];
                return (
                  <FilterSection key={c.key} title={c.name} count={sel.length} defaultOpen={sel.length > 0 || c.opts.length <= 12}>
                    <ChipList opts={c.opts} isOn={(o) => sel.includes(o.value)} onToggle={(o) => setDraft((d) => ({ ...d, cols: { ...d.cols, [c.key]: sel.includes(o.value) ? sel.filter((v) => v !== o.value) : [...sel, o.value] } }))} />
                  </FilterSection>
                );
              })}
              {filters && <FilterPanelCtx.Provider value={panelCtx}><div className="nx-panel-filters [&>*:not(section)]:mx-5 [&>*:not(section)]:my-3">{filters}</div></FilterPanelCtx.Provider>}
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-line px-5 py-3.5">
              <Btn onClick={resetPanel}>Reset</Btn>
              <Btn variant="primary" onClick={applyPanel}>Apply Filters</Btn>
            </div>
          </FilterAside>
        </div>
      )}
      {view === "board" && shown.length ? board : view === "calendar" && cal ? cal : table}
      {view === "list" && shown.length > 25 && (
        <div data-pager className="flex items-center justify-end gap-3 border-t border-line px-4 py-1.5 text-[12.5px] text-ink-soft">
          <span>Rows per page</span>
          <span className="w-[76px]"><Select aria-label="Rows per page" value={String(pageSize)} onChange={(x) => { setPageSize(Number(x)); setPage(0); }} options={["25", "50", "100"]} /></span>
          <span className="num">{pg * pageSize + 1}–{Math.min(shown.length, (pg + 1) * pageSize)} of {shown.length}</span>
          <IconBtn icon={Icon.chevronDown} title="Previous page" className="rotate-90" disabled={pg === 0} onClick={() => setPage(pg - 1)} />
          <IconBtn icon={Icon.chevronDown} title="Next page" className="-rotate-90" disabled={pg >= pages - 1} onClick={() => setPage(pg + 1)} />
        </div>
      )}
      {picker && <ColumnPicker extra={extraColumns} shown={extraOn} onApply={applyCols} onClose={() => setPicker(false)} />}
    </>
  );
}

// Classes used by host patches in build.mjs (kept here so Tailwind generates them):
// mt-8 max-w-[680px] gap-4 rounded-xl px-4 py-4 h-9 w-9 rounded-lg mt-3 text-[15px] mt-2
// Summary card (original tinted style) - the host's card on every page renders this too
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

// Details as a one-column list: label on the left, value on the right, one row per field
function KV({ items }) {
  return (
    <dl className="nx-kv divide-y divide-line px-4 py-1">
      {items.filter(Boolean).map(([k, v]) => (
        <div key={k} className="grid grid-cols-[180px_minmax(0,1fr)] items-start gap-4 py-2.5 text-[13px]">
          <dt className="text-ink-mute">{k}</dt>
          <dd className="min-w-0 break-words leading-snug text-ink">{v === undefined || v === null || v === "" ? <span className="text-ink-faint">-</span> : v}</dd>
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

// Score in table cells - same bar + value style as the Progress columns
function ScoreBadge({ value }) {
  if (value == null) return <span className="text-[12px] text-ink-faint">-</span>;
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
    <button type="button" onClick={toggle} title={v.preferred ? "Preferred supplier - click to remove" : "Mark as preferred supplier"}
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
      <PageHeader title={title}
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

// ---------------------------------------------------------------- accessible names for unlabeled inputs
// Inputs in line-item grids (unit, qty, rate…) and inline filters have no label of their own: name them after their
// column header (table or grid header row), else their placeholder or the text just before them, so screen readers
// and keyboard users know what they are typing into.
(function nameInputs() {
  if (typeof document === "undefined" || window.__nxGridNames) return;
  window.__nxGridNames = true;
  const txt = (e) => (e && (e.innerText || e.textContent) || "").replace(/\s+/g, " ").trim();
  const nameOf = (el) => {
    const td = el.closest("td");
    if (td) {
      const tr = td.parentElement, table = tr.closest("table"), th = table && table.querySelectorAll("thead th")[[...tr.children].indexOf(td)];
      if (th && txt(th)) return `${txt(th)}${tr.parentElement.children.length > 1 ? ` (row ${[...tr.parentElement.children].indexOf(tr) + 1})` : ""}`;
    }
    // div grid: header row (first sibling) has one text cell per column
    for (let cell = el, row = el.parentElement; row && row.parentElement && cell !== document.body; cell = row, row = row.parentElement) {
      if (getComputedStyle(row).display !== "grid") continue;
      const head = row.parentElement.firstElementChild, k = [...row.children].indexOf(cell);
      if (head && head !== row && head.children.length === row.children.length && txt(head.children[k])) return `${txt(head.children[k])} (row ${[...row.parentElement.children].indexOf(row)})`;
      break;
    }
    if (el.placeholder) return el.placeholder;
    let w = el; while (w && !w.previousSibling && w.parentElement) w = w.parentElement;
    const prev = w && w.previousSibling; return prev ? (prev.textContent || "").trim().slice(0, 40) : "";
  };
  const name = (root) => root.querySelectorAll && root.querySelectorAll("input:not([aria-label]):not([type=hidden]):not([type=file]), textarea:not([aria-label]), select:not([aria-label])").forEach((el) => {
    if (el.closest("label") || (el.labels && el.labels.length)) return;
    const n = nameOf(el); if (n) el.setAttribute("aria-label", n); else el.setAttribute("aria-label", el.type === "checkbox" ? "Select" : "Value");
  });
  let queued = false;
  new MutationObserver(() => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; name(document.body); }); }).observe(document.documentElement, { childList: true, subtree: true });
})();

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
    // a cell that holds an open menu / dropdown / dialog is not "cut-off text" - never echo the whole menu
    if (el.querySelector('[role=menu],[role=listbox],[role=dialog],[aria-multiselectable]')) return false;
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
