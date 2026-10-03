// Vendor Registry (modules 1 & 3): registration, classification, vendor master,
// flags (preferred / hold / blacklist / disable), bank accounts, documents,
// qualification, approvals and audit trail — all in one vendor drawer.

const vendorName = (st, id) => (byId(st.vendors, id) || {}).name || id;
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const openOrdersText = (v) => {
  const s = getState(), pos = s.purchaseOrders.filter((p) => p.vendorId === v.id && !["Received", "Closed", "Cancelled", "Draft"].includes(poStatus(p)));
  const wos = s.workOrders.filter((w) => w.vendorId === v.id && ["Issued", "In Progress"].includes(w.status));
  const n = pos.length + wos.length, val = sum(pos, poValue) + sum(wos, woValue);
  return n ? `${n} open · ${inrShort(val)}` : "None";
};
// Optional columns for the vendor master list (switched on from the "+" Customize Columns panel)
const approvedOn = (v) => { const st = v.approval?.stages || []; return st.length && st.every((x) => x.status === "Approved") ? st.map((x) => x.at).filter(Boolean).sort().pop() || null : null; };
const muted = (x) => x || <span className="text-ink-faint">—</span>;
const VENDOR_EXTRA_COLUMNS = (st) => [
  { key: "xContact", label: "Contact person", desc: "Main contact at the vendor", render: (v) => muted(v.contact?.name) },
  { key: "xEmail", label: "Email", desc: "Contact e-mail address", render: (v) => muted(v.contact?.email) },
  { key: "xPhone", label: "Phone", desc: "Contact phone number", render: (v) => muted(v.contact?.phone) },
  { key: "xCity", label: "City / State", desc: "Registered city and state", sort: (v) => v.state, render: (v) => muted([v.city, v.state].filter(Boolean).join(", ")) },
  { key: "xGstin", label: "GSTIN", desc: "GST registration number", render: (v) => muted(v.gstin) },
  { key: "xPan", label: "PAN", desc: "Permanent account number", render: (v) => muted(v.pan) },
  { key: "xSupType", label: "Supplier type", desc: "Company, LLP, individual — decides TDS rate", sort: (v) => v.supplierType || "Company", render: (v) => v.supplierType || "Company" },
  { key: "xGroup", label: "Vendor group", desc: "Group used for filters and spend reports", sort: (v) => v.group, render: (v) => muted(v.group) },
  { key: "xParent", label: "Internal parent company", desc: "Set only for our own group companies", render: (v) => muted(v.parentCompany) },
  { key: "xStanding", label: "Scorecard standing", desc: "Excellent / Good / Average / Poor", filterLabel: "Standing", filterOptions: FO.standings, filter: (v) => standingOf(st, v.id)?.name, render: (v) => { const b = standingOf(st, v.id); return b ? <Status tone={b.color === "blue" ? "blue" : b.color}>{b.name}</Status> : muted(null); } },
  { key: "xRegOn", label: "Registered on", desc: "Date the vendor record was created", render: (v) => fmtDate(v.createdAt) },
  { key: "xApprOn", label: "Approved on", desc: "Date the last approval stage signed off", render: (v) => muted(approvedOn(v) && fmtDate(approvedOn(v))) },
  { key: "xHold", label: "Hold reason", desc: "Why the vendor is on hold", render: (v) => muted(v.status === "On Hold" && v.hold?.reason) },
  { key: "xRelease", label: "Hold release date", desc: "When the hold lifts automatically", render: (v) => muted(v.status === "On Hold" && v.hold ? (v.hold.until ? fmtDate(v.hold.until) : "Indefinite") : null) },
];

function VendorTypeTag({ v }) {
  const c = { Goods: "bg-sky-50 text-sky-700 border-sky-200", Services: "bg-violet-50 text-violet-700 border-violet-200", Labor: "bg-orange-50 text-orange-700 border-orange-200" }[v.type];
  return <span className={cls("rounded border px-1.5 py-[1px] text-[11px] font-medium", c)}>{v.type}{v.isContractor ? " · Contractor" : ""}</span>;
}
function CategoryChips({ list, max = 2, wrap }) {
  return (
    <span className={cls("flex items-center gap-1", wrap && "flex-wrap")}>
      {list.slice(0, max).map((c) => <span key={c} className="rounded bg-gray-100 px-1.5 py-[1px] text-[11px] text-ink-soft">{c}</span>)}
      {list.length > max && <span data-tip={list.slice(max).join("\n")} className="cursor-default rounded px-1 text-[11px] text-ink-mute hover:bg-gray-100">+{list.length - max}</span>}
    </span>
  );
}

// ---------------------------------------------------------------- registration
const SUPPLIER_TYPES = ["Company", "Partnership / LLP", "Individual / HUF", "Proprietorship"];
const autoTds = (type, st) => (type === "Goods" ? "194Q" : /Individual|Proprietor/.test(st || "") ? "194C-1" : "194C-2");
const emptyVendor = () => ({
  supplierType: "Company", allowBillWithoutPO: false, allowBillWithoutReceipt: false, portalUsers: [], changeRequest: null,
  uploads: {}, name: "", legalName: "", type: "Goods", isContractor: false, categories: [], tier: "Approved", regTier: "Spend Authorized",
  gstin: "", pan: "", contact: { name: "", email: "", phone: "" }, address: "", city: "", state: "Maharashtra", country: "India", pin: "", website: "", taxId: "", currency: "INR",
  paymentTerms: "Net 30", tds: "194Q", group: currentSettings().defaultSupplierGroup || "", parentCompany: "", bank: { holder: "", bank: "", account: "", accountConfirm: "", ifsc: "", swift: "", iban: "", accountType: "Current", currency: "", branch: "" },
  ...vendorExtraDefaults(),
  contractor: { labourLicence: "", licenceExpiry: "", pfCode: "", esiCode: "", workforce: "", experienceYrs: "", pastProjects: "" },
});

// Another vendor with the same GSTIN (same registration → blocked) or the same PAN (same company, maybe another state → warning)
function findDuplicate(f) {
  const g = (f.gstin || "").trim().toUpperCase(), pn = (f.pan || "").trim().toUpperCase();
  const others = getState().vendors.filter((v) => v.id !== f.id);
  return { gstin: g.length === 15 ? others.find((v) => (v.gstin || "").toUpperCase() === g) : null,
    pan: pn.length === 10 ? others.find((v) => (v.pan || "").toUpperCase() === pn && (v.gstin || "").toUpperCase() !== g) : null };
}
function validateVendor(f) {
  const e = {};
  const foreign = isForeign(f);
  if (!f.name.trim()) e.name = "Required";
  if (!foreign) {
    if (!GSTIN_RE.test(f.gstin.trim().toUpperCase())) e.gstin = "Enter a valid 15-character GSTIN";
    if (!PAN_RE.test(f.pan.trim().toUpperCase())) e.pan = "Enter a valid PAN (ABCDE1234F)";
    else if (GSTIN_RE.test(f.gstin.trim().toUpperCase()) && f.gstin.toUpperCase().slice(2, 12) !== f.pan.toUpperCase()) e.pan = "PAN doesn't match GSTIN";
    const dupe = findDuplicate(f).gstin;
    if (dupe) e.gstin = `Already registered as ${dupe.id} — ${dupe.name}`;
  } else {
    if (!String(f.taxId || "").trim()) e.taxId = "Enter the tax / VAT registration no.";
    else if (getState().vendors.some((v) => v.id !== f.id && normNo(v.taxId) === normNo(f.taxId))) e.taxId = "Already registered with this tax number";
  }
  if (!f.contact.name.trim()) e.contactName = "Required";
  if (!EMAIL_RE.test(f.contact.email)) e.email = "Enter a valid email";
  const ph = VX.phone(f.contact.phone); if (ph) e.phone = ph;
  const pn = VX.pin(f.pin, f.country || "India"); if (pn) e.pin = pn;
  const w = VX.url(f.website); if (w) e.website = w;
  if (!f.categories.length) e.categories = "Pick at least one category";
  // Bank details are optional at registration, but if any is entered the set must be complete and valid
  const b = f.bank || {};
  if (["holder", "bank", "account", "ifsc", "swift"].some((k) => !VX.blank(b[k]))) {
    const be = bankErrors(b, f);
    for (const k of Object.keys(be)) if (be[k]) e["bank_" + k] = be[k];
  }
  Object.assign(e, vendorExtraErrors(f));
  // Contractor statutory formats
  if (f.isContractor || f.type === "Labor") {
    const k = f.contractor || {};
    const c1 = VX.clra(k.labourLicence); if (c1) e.labourLicence = c1;
    if (k.labourLicence && !k.licenceExpiry) e.licenceExpiry = "Enter the licence expiry date";
    else if (k.licenceExpiry && k.licenceExpiry < todayISO()) e.licenceExpiry = "Licence has already expired";
    const c2 = VX.pf(k.pfCode); if (c2) e.pfCode = c2;
    const c3 = VX.esi(k.esiCode); if (c3) e.esiCode = c3;
    if (!VX.blank(k.workforce)) { const c4 = VX.num(k.workforce, { min: 1, int: true, label: "Workforce" }); if (c4) e.workforce = c4; }
    if (!VX.blank(k.experienceYrs)) { const c5 = VX.num(k.experienceYrs, { min: 0, max: 100, label: "Experience" }); if (c5) e.experienceYrs = c5; }
  }
  return e;
}

function createVendor(f, submit, source = "Internal") {
  const st = getState();
  const id = nextId("VEN", st.vendors);
  const v = {
    ...f, id, name: f.name.trim(), legalName: f.legalName.trim() || f.name.trim(), gstin: isForeign(f) ? "" : f.gstin.toUpperCase(), pan: isForeign(f) ? "" : f.pan.toUpperCase(),
    status: submit ? "Pending Approval" : "Draft", preferred: false, hold: null, notes: f.notesText && f.notesText.trim() ? [{ at: todayISO(), by: currentUser(), text: f.notesText.trim() }] : [], insurance: [],
    bankAccounts: f.bank.account ? [{ id: 1, ...f.bank, accountConfirm: undefined, iban: (f.bank.iban || "").replace(/\s/g, "").toUpperCase(), currency: f.bank.currency || f.currency, account: String(f.bank.account).replace(/\s/g, ""), ifsc: (f.bank.ifsc || "").toUpperCase(), status: "Unverified", addedAt: todayISO(), isDefault: true }] : [],
    approval: { stages: vendorFlowFor(f).map((dept, i) => ({ dept, status: submit && i === 0 ? "Pending" : "Waiting", by: null, at: null, remark: "" })) },
    qualification: null, background: null, createdAt: todayISO(),
    contractor: f.isContractor || f.type === "Labor" ? { ...f.contractor } : null,
    onboarding: f.isContractor || f.type === "Labor" ? { checklist: ONBOARD_CHECKLIST.map((item) => ({ item, done: false })), startedAt: todayISO() } : null,
  };
  delete v.bank;
  delete v.uploads;
  delete v.notesText;
  v.source = source;
  if (submit) v.submittedBy = source === "Internal" ? currentUser() : f.contact.name;
  v.portalUsers = v.contact.email ? [{ name: v.contact.name, email: v.contact.email.toLowerCase(), active: true, role: "Admin", lastLogin: null }] : [];
  v.changeRequest = null;
  v.docs = requiredDocs(v).map((name) => {
    const u = (f.uploads || {})[name];
    return u && u.file ? { name, status: "Pending", file: u.file, dataUrl: u.dataUrl || null, expiry: u.expiry || null, uploadedAt: todayISO() } : { name, status: "Missing", expiry: null };
  });
  setState((s) => {
    s.vendors.unshift(v);
    const inv = f.inviteId && byId(s.invites, f.inviteId);
    if (inv) Object.assign(inv, { status: "Registered", vendorId: id, registeredOn: todayISO() });
  }, { entity: "Vendor", id, action: `${source === "Self-registration" ? "Self-registered via portal" : "Registered"}${f.inviteId ? ` (invite ${f.inviteId})` : ""}${submit ? " & submitted for approval" : " as draft"}` });
  return id;
}

const GST_STATES = { "01": "Jammu & Kashmir", "03": "Punjab", "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh", "10": "Bihar", "19": "West Bengal",
  "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat", "27": "Maharashtra", "29": "Karnataka", "30": "Goa", "32": "Kerala", "33": "Tamil Nadu", "36": "Telangana", "37": "Andhra Pradesh" };
const STATES = [...new Set(Object.values(GST_STATES))].sort();
const TYPE_INFO = {
  Goods: { icon: Icon.package, text: "Supplies material — cement, steel, hardware, electricals" },
  Services: { icon: Icon.wrench, text: "Provides a service — hire, installation, testing, EPC" },
  Labor: { icon: Icon.hardHat, text: "Supplies workers / manpower for site work" },
};

function FormSection({ n, title, desc, done, right, children }) {
  return (
    <section data-vf={title} data-done={done ? "1" : ""} className="scroll-mt-16 rounded-xl border border-line bg-white">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <span className={cls("grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-semibold", done ? "bg-green-100 text-green-700" : "bg-brand-soft text-brand")}>{done ? h(Icon.check, { size: 13 }) : n}</span>
        <div className="min-w-0 flex-1"><p className="text-[14px] font-semibold text-ink">{title}</p>{desc && <p className="text-[12px] text-ink-mute">{desc}</p>}</div>
        {right}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

// Sticky jump bar for the long vendor form: one chip per section, ticked when that section is complete
function FormJumpBar({ root }) {
  const [secs, setSecs] = y.useState([]);
  y.useLayoutEffect(() => {
    const el = root.current; if (!el) return;
    const next = [...el.querySelectorAll("section[data-vf]")].map((x, i) => ({ i, title: x.dataset.vf, done: !!x.dataset.done }));
    if (JSON.stringify(next) !== JSON.stringify(secs)) setSecs(next);
  });
  const go = (i) => root.current?.querySelectorAll("section[data-vf]")[i]?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <nav aria-label="Form sections" style={{ top: -40 }} className="sticky z-10 -mx-5 -mt-4 mb-1 flex flex-wrap gap-1.5 border-b border-line bg-white px-5 py-2 shadow-[0_1px_0_#e5e7eb]">
      {secs.map((x) => (
        <button key={x.title} type="button" onClick={() => go(x.i)} className={cls("flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px]", x.done ? "border-green-200 bg-green-50 text-green-700" : "border-line text-ink-soft hover:bg-gray-50")}>
          <span className={cls("grid h-4 w-4 place-items-center rounded-full text-[10px] font-semibold", x.done ? "bg-green-600 text-white" : "bg-gray-100 text-ink-mute")}>{x.done ? h(Icon.check, { size: 10 }) : x.i + 1}</span>{x.title}
        </button>))}
    </nav>
  );
}
function VendorForm({ f, set, errors, contractorMode, publicMode, lockBank }) {
  const formRoot = y.useRef(null);
  const upd = (k, val) => set({ ...f, [k]: val });
  const updC = (k, val) => set({ ...f, contact: { ...f.contact, [k]: val } });
  const updB = (k, val) => set({ ...f, bank: { ...f.bank, [k]: val } });
  const updK = (k, val) => set({ ...f, contractor: { ...f.contractor, [k]: val } });
  const err = (k) => errors[k] && <span className="mt-1 block text-[11px] text-red-600">{errors[k]}</span>;
  const ok = (cond, text) => cond && <span className="mt-1 flex items-center gap-1 text-[11px] text-green-700">{h(Icon.check, { size: 11 })}{text}</span>;
  const isLabour = f.type === "Labor";
  const foreign = isForeign(f);
  const onSite = isLabour || f.isContractor;
  const showContractor = contractorMode || onSite;
  const gstOk = GSTIN_RE.test((f.gstin || "").toUpperCase()), panOk = PAN_RE.test((f.pan || "").toUpperCase());
  const ifscOk = /^[A-Z]{4}0[A-Z0-9]{6}$/.test(f.bank.ifsc || "");
  // GSTIN carries the state code (chars 1–2) and the PAN (chars 3–12): fill both automatically
  const setGstin = (raw) => {
    const g = raw.toUpperCase().replace(/\s/g, "");
    const next = { ...f, gstin: g };
    if (g.length >= 12 && (!f.pan || f.pan === (f.gstin || "").slice(2, 12))) next.pan = g.slice(2, 12);
    if (GST_STATES[g.slice(0, 2)]) next.state = GST_STATES[g.slice(0, 2)];
    set(next);
  };
  const setType = (t) => set({ ...f, type: t, tds: autoTds(t, f.supplierType), isContractor: t === "Labor" ? true : t === "Goods" ? false : f.isContractor });
  const docsDone = requiredDocs(f).every((d) => (f.uploads || {})[d]?.file);
  const dup = publicMode ? {} : findDuplicate(f);
  const dupNote = (v, text) => v && <span className="mt-1 block text-[11px] text-red-600">{text} <b>{v.name}</b> ({v.id}, {v.status})</span>;
  const errCount = Object.keys(errors).length;
  let n = 0;
  return (
    <div ref={formRoot} className="space-y-4">
      {!publicMode && <FormJumpBar root={formRoot} />}
      {errCount > 0 && <Note tone="red">Please fix {errCount} field{errCount > 1 ? "s" : ""} marked in red below.</Note>}

      <FormSection n={++n} title="Company & what they supply" desc={publicMode ? "Your company and the work you do" : "Who the vendor is and what they do for you"} done={!!(f.name && f.categories.length)}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Company / trade name" required><TextInput value={f.name} onChange={(v) => upd("name", v)} placeholder="e.g. Shree Balaji Infra" />{err("name")}</Field>
          <Field label="Registered legal name" hint="As on the GST certificate — leave empty if same"><TextInput value={f.legalName} onChange={(v) => upd("legalName", v)} placeholder={f.name || "Legal name"} /></Field>
        </div>
        <p className="mb-2 mt-4 text-[12.5px] font-medium text-ink">Vendor type <span className="text-red-500">*</span></p>
        <div className="grid grid-cols-3 gap-3">
          {VENDOR_TYPES.map((t) => {
            const on = f.type === t, I = TYPE_INFO[t];
            return (
              <button key={t} type="button" onClick={() => setType(t)} className={cls("flex items-start gap-3 rounded-lg border p-3 text-left transition-colors", on ? "border-brand bg-brand-soft/60 ring-1 ring-brand" : "border-line hover:border-gray-300 hover:bg-gray-50")}>
                <span className={cls("grid h-8 w-8 shrink-0 place-items-center rounded-md", on ? "bg-brand text-white" : "bg-gray-100 text-ink-soft")}>{h(I.icon, { size: 16 })}</span>
                <span><span className={cls("block text-[13.5px] font-semibold", on ? "text-brand" : "text-ink")}>{t === "Labor" ? "Labour" : t}</span><span className="block text-[11.5px] leading-snug text-ink-mute">{I.text}</span></span>
              </button>
            );
          })}
        </div>
        <label className={cls("mt-3 flex items-start gap-3 rounded-lg border p-3", onSite ? "border-orange-200 bg-orange-50/60" : "border-line", isLabour || f.type === "Goods" ? "cursor-default" : "cursor-pointer hover:bg-gray-50")}>
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#0b5ed7]" checked={onSite} disabled={isLabour || f.type === "Goods"} onChange={(e) => upd("isContractor", e.target.checked)} />
          <span className="min-w-0">
            <span className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">{h(Icon.hardHat, { size: 15, className: onSite ? "text-orange-600" : "text-ink-faint" })}This vendor executes work on site (contractor / subcontractor)</span>
            <span className="mt-0.5 block text-[12px] leading-snug text-ink-soft">
              {isLabour ? "Always on for Labour vendors — supplying workers means working on your site." : f.type === "Goods" ? "Not applicable — material suppliers only deliver goods. Choose Services or Labour if they also do site work."
                : "Tick for scaffolding, excavation, EPC, installation and similar work done on your site."}
              {" "}Contractors get the <b>“· Contractor”</b> tag, statutory details (labour licence, PF, ESI) and are managed in <b>Contract &amp; Labor</b> — contracts, work orders, measurement book, RA bills, retention and attendance.
            </span>
          </span>
        </label>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Field label="Trades / categories" required span={2}><TradePicker options={TRADES} value={f.categories} onChange={(v) => upd("categories", v)} />{err("categories")}</Field>
        </div>
      </FormSection>

      <FormSection n={++n} title="Tax & payment" desc={foreign ? "Foreign vendor — GSTIN and PAN are not required" : "GSTIN fills the PAN and state automatically"} done={foreign ? !!f.taxId : gstOk && panOk}>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Country" required><Select value={f.country || "India"} onChange={(v) => set({ ...f, country: v, currency: COUNTRY_CURRENCY[v] || f.currency, tds: v === "India" ? autoTds(f.type, f.supplierType) : "NONE" })} options={COUNTRIES} /></Field>
          {foreign && <Field label="Tax / VAT registration no." required span={2}><TextInput value={f.taxId || ""} onChange={(v) => upd("taxId", v.toUpperCase())} placeholder="e.g. TRN 100234567800003" className={cls(inputCls, "mono")} />{err("taxId")}</Field>}
          {!foreign && <Field label="GSTIN" required><TextInput value={f.gstin} onChange={setGstin} placeholder="27AAKCS4412M1Z3" maxLength={15} className={cls(inputCls, "mono")} />{err("gstin") || dupNote(dup.gstin, "Already registered:") || ok(gstOk, `Valid · ${GST_STATES[f.gstin.slice(0, 2)] || "state code " + f.gstin.slice(0, 2)}`)}</Field>}
          {!foreign && <Field label="PAN" required><TextInput value={f.pan} onChange={(v) => upd("pan", v.toUpperCase())} placeholder="AAKCS4412M" maxLength={10} className={cls(inputCls, "mono")} />{err("pan") || (dup.pan && <span className="mt-1 block text-[11px] text-amber-700">Same PAN as <b>{dup.pan.name}</b> ({dup.pan.id}) — another branch of the same company?</span>) || ok(panOk && gstOk && f.gstin.slice(2, 12) === f.pan, "Matches GSTIN")}</Field>}
          <Field label="Supplier type" hint="Individual / HUF: 1% TDS, others 2%"><Select value={f.supplierType || "Company"} onChange={(v) => set({ ...f, supplierType: v, tds: autoTds(f.type, v) })} options={SUPPLIER_TYPES} /></Field>
          <Field label={publicMode ? "Preferred payment terms" : "Payment terms"}><Select value={f.paymentTerms} onChange={(v) => upd("paymentTerms", v)} options={PAYMENT_TERMS} /></Field>
          <Field label="Currency"><Select value={f.currency} onChange={(v) => upd("currency", v)} options={withCurrent(CURRENCIES, f.currency)} /></Field>
          {!publicMode && <Field label="Withholding tax (TDS)" hint="Set automatically from vendor & supplier type"><Select value={f.tds} onChange={(v) => upd("tds", v)} options={TDS_SECTIONS} /></Field>}
        </div>
      </FormSection>

      <FormSection n={++n} title="Contact & address" desc={publicMode ? "We send RFQs, POs and payment advice here" : "The contact also becomes the vendor's portal admin"} done={!!(f.contact.name && EMAIL_RE.test(f.contact.email))}>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Contact person" required><TextInput value={f.contact.name} onChange={(v) => updC("name", v)} />{err("contactName")}</Field>
          <Field label="Email" required><TextInput type="email" value={f.contact.email} onChange={(v) => updC("email", v)} placeholder="name@company.com" />{err("email")}</Field>
          <Field label="Phone"><TextInput value={f.contact.phone} onChange={(v) => updC("phone", v)} placeholder="+91 98xxx xxxxx" />{err("phone")}</Field>
          <Field label="Registered address" span={2}><TextInput value={f.address} onChange={(v) => upd("address", v)} placeholder="Building, street, area" /></Field>
          <Field label="Website"><TextInput value={f.website || ""} onChange={(v) => upd("website", v)} placeholder="www.example.com" />{err("website")}</Field>
          <Field label="City"><TextInput value={f.city} onChange={(v) => upd("city", v)} /></Field>
          {!foreign ? <Field label="State" hint={GST_STATES[(f.gstin || "").slice(0, 2)] ? "From GSTIN" : ""}><Select value={f.state} onChange={(v) => upd("state", v)} options={withCurrent(STATES, f.state)} /></Field>
            : <Field label="State / province"><TextInput value={f.state === "Maharashtra" ? "" : f.state} onChange={(v) => upd("state", v)} /></Field>}
          <Field label={foreign ? "Postal code" : "PIN code"}><TextInput value={f.pin || ""} onChange={(v) => upd("pin", v)} placeholder={foreign ? "" : "411026"} maxLength={10} />{err("pin")}</Field>
        </div>
      </FormSection>

      <FormSection n={++n} title="More details" desc="Contact details, tax & statutory, purchasing defaults, tags, notes" done>
        <VendorMoreFields f={f} set={set} errors={errors} publicMode={publicMode} foreign={foreign} />
      </FormSection>

      {showContractor && (
        <FormSection n={++n} title="Contractor statutory details" desc="Required before a contractor can be mobilised to site" done={!!f.contractor.labourLicence}>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Labour licence no. (CLRA)"><TextInput value={f.contractor.labourLicence} onChange={(v) => updK("labourLicence", v)} placeholder="CLRA/PUN/2025/0412" />{err("labourLicence")}</Field>
            <Field label="Licence valid till"><DateInput value={f.contractor.licenceExpiry} onChange={(v) => updK("licenceExpiry", v)} />{err("licenceExpiry")}</Field>
            <Field label="Workforce strength"><NumInput value={f.contractor.workforce} onChange={(v) => updK("workforce", v)} placeholder="Workers" />{err("workforce")}</Field>
            <Field label="PF establishment code"><TextInput value={f.contractor.pfCode} onChange={(v) => updK("pfCode", v)} placeholder="PUPUN1123344000" />{err("pfCode")}</Field>
            <Field label="ESI code"><TextInput value={f.contractor.esiCode} onChange={(v) => updK("esiCode", v)} placeholder="17 digits" />{err("esiCode")}</Field>
            <Field label="Experience (years)"><NumInput value={f.contractor.experienceYrs} onChange={(v) => updK("experienceYrs", v)} />{err("experienceYrs")}</Field>
            <Field label="Past projects" span={3}><TextInput value={f.contractor.pastProjects} onChange={(v) => updK("pastProjects", v)} placeholder="Comma-separated, e.g. Lodha Park T3, Metro Line 2A depot" /></Field>
          </div>
        </FormSection>
      )}

      <FormSection n={++n} title="Bank details" desc={lockBank ? "Locked — only the vendor can change bank details" : "Payments are blocked until a bank account is on file"} done={!!(f.bank.account && ifscOk)}
        right={lockBank && <span className="flex items-center gap-1 text-[12px] text-ink-mute">{h(Icon.lock, { size: 13 })}Locked</span>}>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Account holder name" hint="Exactly as in bank records — used for penny-drop verification"><TextInput value={f.bank.holder || ""} disabled={lockBank} onChange={(v) => updB("holder", v)} placeholder={f.legalName || f.name || "Legal name"} />{err("bank_holder")}</Field>
          <Field label="Bank"><TextInput value={f.bank.bank} disabled={lockBank} onChange={(v) => updB("bank", v)} placeholder="e.g. HDFC Bank" />{err("bank_bank")}</Field>
          <Field label={foreign ? "Account no. / IBAN" : "Account no."}><TextInput value={f.bank.account} disabled={lockBank} onChange={(v) => updB("account", v.replace(/\s/g, ""))} className={cls(inputCls, "mono")} />{err("bank_account")}</Field>
          {foreign ? <Field label="SWIFT / BIC"><TextInput value={f.bank.swift || ""} disabled={lockBank} onChange={(v) => updB("swift", v.toUpperCase())} maxLength={11} className={cls(inputCls, "mono")} />{err("bank_ifsc")}</Field>
            : <Field label="IFSC"><TextInput value={f.bank.ifsc} disabled={lockBank} onChange={(v) => updB("ifsc", v.toUpperCase())} maxLength={11} placeholder="HDFC0001234" className={cls(inputCls, "mono")} />
            {err("bank_ifsc") || (f.bank.ifsc && !ifscOk ? <span className="mt-1 block text-[11px] text-amber-700">Format: 4 letters, 0, then 6 characters</span> : ok(ifscOk, "Valid IFSC"))}</Field>}
          <Field label="Re-enter account no."><TextInput value={f.bank.accountConfirm || ""} disabled={lockBank} onChange={(v) => updB("accountConfirm", v.replace(/\s/g, ""))} className={cls(inputCls, "mono")} onPaste={(e) => e.preventDefault()} />{err("bank_confirm") || ok(f.bank.account && f.bank.accountConfirm === f.bank.account, "Matches")}</Field>
          <Field label="Account type"><Select value={f.bank.accountType || "Current"} disabled={lockBank} onChange={(v) => updB("accountType", v)} options={ACCOUNT_TYPES} /></Field>
          <Field label="Account currency"><Select value={f.bank.currency || f.currency} disabled={lockBank} onChange={(v) => updB("currency", v)} options={withCurrent(CURRENCIES, f.bank.currency || f.currency)} /></Field>
          <Field label="Branch"><TextInput value={f.bank.branch || ""} disabled={lockBank} onChange={(v) => updB("branch", v)} /></Field>
          {foreign && <Field label="IBAN"><TextInput value={f.bank.iban || ""} disabled={lockBank} onChange={(v) => updB("iban", v.toUpperCase())} className={cls(inputCls, "mono")} />{err("bank_iban")}</Field>}
        </div>
      </FormSection>

      <FormSection n={++n} title="Documents" desc="PDF / JPG / PNG — each is verified by the approver" done={docsDone}
        right={<span className="rounded-full bg-gray-100 px-2 py-0.5 text-[12px] font-medium text-ink-soft">{Object.values(f.uploads || {}).filter((u) => u.file).length} / {requiredDocs(f).length}</span>}>
        <DocUploadList docs={requiredDocs(f)} uploads={f.uploads || {}} onChange={(u) => set({ ...f, uploads: u })} />
        {errors.docs && <span className="mt-1 block text-[11px] text-red-600">{errors.docs}</span>}
      </FormSection>

      {!publicMode && (
        <FormSection n={++n} title="Internal classification" desc="Only visible to your team — not shown to the vendor" done>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Supplier tier"><Select value={f.tier} onChange={(v) => upd("tier", v)} options={TIERS} /></Field>
            <Field label="Registration tier" hint="Prospective vendors can quote but can't receive POs"><Select value={f.regTier} onChange={(v) => upd("regTier", v)} options={["Spend Authorized", "Prospective"]} /></Field>
            <Field label="Vendor group" hint="Used for filters and spend-by-group reports"><Select value={f.group} placeholder="— not grouped —" onChange={(v) => upd("group", v)} options={withCurrent(settingsOf(getState()).vendorGroups, f.group)} /></Field>
            <Field label="Internal parent company" hint="Only if this vendor is one of our group companies"><Select value={f.parentCompany} placeholder="— external vendor —" onChange={(v) => upd("parentCompany", v)} options={withCurrent(settingsOf(getState()).groupCompanies, f.parentCompany)} /></Field>
          </div>
        </FormSection>
      )}
    </div>
  );
}

// Per-document file picker used by internal registration and vendor self-registration
function DocUploadList({ docs, uploads, onChange }) {
  const [busy, setBusy] = y.useState(null);
  const pick = async (name, file) => {
    if (!file) return;
    setBusy(name);
    const att = await readAttachment(file);
    setBusy(null);
    if (!att) return;
    onChange({ ...uploads, [name]: { ...(uploads[name] || {}), file: att.name, dataUrl: att.dataUrl } });
  };
  return (
    <div className="divide-y divide-line rounded-lg border border-line">
      {docs.map((name) => {
        const u = uploads[name] || {};
        const expires = /Policy|Licence|ISO|CAR|Certificate/.test(name) && !/GST|Registration/.test(name);
        return (
          <div key={name} className="grid grid-cols-[1fr_230px_150px] items-center gap-3 px-3 py-2">
            <span className="flex items-center gap-2 text-[13px]">
              {u.file ? <Icon.check size={15} className="text-green-600" /> : <Icon.file size={15} className="text-ink-faint" />}
              {name}
            </span>
            <label className={cls("flex h-[30px] cursor-pointer items-center gap-2 truncate rounded-md border border-dashed px-2.5 text-[12.5px]", u.file ? "border-green-300 bg-green-50 text-green-700" : "border-gray-300 text-ink-soft hover:border-brand hover:text-brand")}>
              <Icon.upload size={13} />
              <span className="truncate">{busy === name ? "Reading…" : u.file || "Choose file"}</span>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => pick(name, e.target.files[0])} />
            </label>
            {expires ? <DateInput value={u.expiry || ""} onChange={(x) => onChange({ ...uploads, [name]: { ...u, expiry: x } })} title="Valid till" />
              : <span className="text-[11.5px] text-ink-faint">No expiry</span>}
          </div>
        );
      })}
    </div>
  );
}

function RegisterVendorModal({ open, onClose, onCreated, contractorMode }) {
  const [f, setF] = y.useState(emptyVendor);
  const [errors, setErrors] = y.useState({});
  y.useEffect(() => {
    if (open) { setF(contractorMode ? { ...emptyVendor(), type: "Labor", isContractor: true, tds: "194C-2" } : emptyVendor()); setErrors({}); }
  }, [open]);
  const save = (submit) => {
    const e = validateVendor(f);
    setErrors(e);
    if (Object.keys(e).length) return;
    if (submit && currentSettings().requireDocsOnSubmit) {
      const tmp = { ...f, isContractor: f.isContractor || f.type === "Labor" };
      const missing = requiredDocs(tmp).filter((n) => !(f.uploads || {})[n]?.file);
      if (missing.length) { setErrors({ docs: `Upload before submitting: ${missing.join(", ")}` }); toast(`Upload the required documents first — ${missing.join(", ")}. Or save as draft.`, "red"); return; }
    }
    const id = createVendor(f, submit);
    toast(submit ? `${id} submitted for approval` : `${id} saved as draft`);
    onClose();
    onCreated && onCreated(id);
  };
  return (
    <Modal open={open} onClose={onClose} width={820}
      title={contractorMode ? "Onboard contractor" : "Register vendor"}
      subtitle="Saving creates a vendor ID and a draft record; submitting routes it through Procurement → Legal → Finance."
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn onClick={() => save(false)}>Save draft</Btn><Btn variant="primary" icon={Icon.send} onClick={() => save(true)}>Submit for approval</Btn></>}>
      {errors.docs && <div className="mb-3"><Note tone="red">{errors.docs}</Note></div>}
      <VendorForm f={f} set={setF} errors={errors} contractorMode={contractorMode} />
    </Modal>
  );
}

// ---------------------------------------------------------------- vendor drawer
// mode "registry": the requester's view — edit while Draft / Rejected / Changes Requested,
// read-only while Pending Approval, no approval decisions.
// mode "approval": opened from Vendor Approvals / Approval Management — decisions allowed.
const EDITABLE_STATUSES = ["Draft", "Rejected", "Changes Requested"];
function VendorDrawer({ vendorId, onClose, initialTab = "overview", mode = "registry" }) {
  const st = useStore();
  const v = byId(st.vendors, vendorId);
  // Contacts & addresses live on Overview, the activity trail on Approvals
  const tabOf = (t) => (t === "contacts" ? "overview" : t === "activity" ? "approval" : t);
  const [tab, setTab0] = y.useState(tabOf(initialTab));
  const setTab = (t) => setTab0(tabOf(t));
  const [edit, setEdit] = y.useState(false);
  y.useEffect(() => setTab(initialTab), [vendorId]);
  if (!v) return null;
  const comp = complianceOf(v);
  const locked = mode === "registry" && v.status === "Pending Approval";
  const canEdit = mode === "registry" && EDITABLE_STATUSES.includes(v.status);
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "flags", label: "Status & flags" },
    { id: "docs", label: "Documents", count: `${v.docs.filter((d) => d.status === "Verified").length}/${requiredDocs(v).length}` },
    { id: "bank", label: "Bank", count: v.bankAccounts.length || null },
    { id: "qual", label: "Qualification" },
    ...(v.isContractor || v.type === "Labor" ? [{ id: "equip", label: "Equipment", count: (v.equipment || []).length || null }] : []),
    { id: "approval", label: "Approvals" },
  ];
  return (
    <Drawer open related={relatedFor(st, "vendor", v)} comments={v.id} onClose={onClose} width={880} title={<span className="flex items-center gap-2">{v.name}<PreferredStar v={v} size={16} always /></span>}
      subtitle={<><span className="mono text-[12px] text-ink-mute">{v.id}</span><span className="text-ink-faint">·</span><VendorTypeTag v={v} /><GroupCoTag v={v} /><VendorStatusMenu v={v} /><Status>{v.regTier}</Status><Status>{comp.status}</Status></>}
      actions={<>{canEdit && <Btn icon={Icon.pencil} onClick={() => setEdit(true)}>Edit details</Btn>}</>}
      tabs={{ tabs, active: tab, onChange: setTab }}>
      <div className="space-y-4 px-6 py-5">
        {locked && tab !== "approval" && <Note tone="amber" icon={Icon.lock}>Submitted for approval — details are locked until the approvers decide. {v.status === "Pending Approval" ? "If it is rejected or sent back, you can edit and resubmit." : ""}</Note>}
        {tab === "overview" && <VendorOverview v={v} comp={comp} />}
        <fieldset disabled={locked} className="contents">
          {tab === "overview" && <VendorContactsAddresses v={v} locked={locked} />}
          {tab === "flags" && <VendorFlags v={v} />}
          {tab === "docs" && <><VendorDocs v={v} mode={mode} locked={locked} /><InsurancePolicies v={v} mode={mode} locked={locked} /></>}
          {tab === "bank" && <VendorBanks v={v} />}
          {tab === "qual" && <Questionnaire v={v} />}
          {tab === "equip" && <EquipmentRegister v={v} />}
        </fieldset>
        {tab === "approval" && <><VendorApproval v={v} mode={mode} /><VendorActivity v={v} /></>}
      </div>
      {edit && <EditRegistrationModal v={v} owner onClose={() => setEdit(false)} />}
    </Drawer>
  );
}

function VendorOverview({ v, comp }) {
  return (
    <>
      {comp.issues.length > 0 && (
        <Note tone={comp.status === "Non-Compliant" ? "red" : "amber"}>
          <b>{comp.status}:</b> {comp.issues.join(" · ")}
        </Note>
      )}
      {v.hold && v.status === "On Hold" && <Note tone="amber" icon={Icon.lock}><b>On hold ({v.hold.scope}):</b> {v.hold.reason}{v.hold.until ? ` — until ${fmtDate(v.hold.until)}` : ""}</Note>}
      <Section title="Vendor master" icon={Icon.building}>
        <KV items={[
          ["Legal name", v.legalName], ["Vendor ID", <span className="mono">{v.id}</span>], ["Tier", v.tier], ["Supplier type", v.supplierType || "Company"], ["Open orders", openOrdersText(v)], ["Outstanding", inrShort(sum(getState().invoices.filter((i) => i.vendorId === v.id), (i) => invoiceTotals(i).balance))],
          ["GSTIN", <span className="mono">{v.gstin}</span>], ["PAN", <span className="mono">{v.pan}</span>], ["Currency", v.currency],
          ["Payment terms", v.paymentTerms], ["TDS", tdsLabel(v.tds)], ["Vendor group", v.group || "Not grouped"],
          ["Internal parent", v.parentCompany ? <span className="flex items-center gap-1.5">{v.parentCompany}<GroupCoTag v={v} /></span> : "External vendor"], ["Registered", fmtDate(v.createdAt)], ["Categories", <CategoryChips list={v.categories} max={99} wrap />],
        ]} />
      </Section>
      <Section title="Contact" icon={Icon.user}>
        <KV items={[["Contact person", [v.contact.salutation, v.contact.name].filter(Boolean).join(" ") + (v.contact.designation ? ` (${v.contact.designation})` : "")], ["Email", v.contact.email], ["Phone", [v.contact.phone, v.contact.mobile].filter(Boolean).join(" · ")],
          ["Address", [v.address, v.addressLine2, v.city, v.district, v.state, v.pin, v.country].filter(Boolean).join(", ")], ["Other contacts", (v.contacts || []).length || null], ["Other addresses / sites", (v.addresses || []).length || null]]} />
      </Section>
      <VendorMoreView v={v} />
      {v.contractor && (
        <Section title="Contractor profile" icon={Icon.hardHat}>
          <KV items={[
            ["Labour licence (CLRA)", v.contractor.labourLicence || "—"], ["Licence valid till", fmtDate(v.contractor.licenceExpiry)], ["Workforce", v.contractor.workforce ? `${v.contractor.workforce} workers` : "—"],
            ["PF code", v.contractor.pfCode || "—"], ["ESI code", v.contractor.esiCode || "—"], ["Experience", v.contractor.experienceYrs ? `${v.contractor.experienceYrs} yrs` : "—"],
            ["Past projects", v.contractor.pastProjects || "—"],
          ]} />
        </Section>
      )}
      {v.insurance.length > 0 && (
        <Section title="Insurance" icon={Icon.shield}>
          <DataTable dense rows={v.insurance} rowKey={(r) => r.policy} columns={[
            { key: "type", label: "Coverage" }, { key: "policy", label: "Policy no.", className: "mono text-[12px]" }, { key: "insurer", label: "Insurer" },
            { key: "cover", label: "Sum insured", align: "right", num: true, render: (r) => inrShort(r.cover) },
            { key: "expiry", label: "Expiry", render: (r) => <ExpiryCell iso={r.expiry} /> },
          ]} />
        </Section>
      )}
    </>
  );
}

function ExpiryCell({ iso }) {
  if (!iso) return <span className="text-ink-mute">—</span>;
  const d = daysUntil(iso);
  return (
    <span className="flex items-center gap-2">
      {fmtDate(iso)}
      {d < 0 ? <Status tone="red">Expired</Status> : d <= 30 ? <Status tone="amber">{`${d}d left`}</Status> : d <= 90 ? <span className="text-[11px] text-ink-mute">{d}d</span> : null}
    </span>
  );
}

function VendorFlags({ v }) {
  const [hold, setHold] = y.useState({ scope: "Payments", until: shiftDays(30), reason: "" });
  const [reason, setReason] = y.useState("");
  const mut = (fn, action) => setState((s) => fn(byId(s.vendors, v.id)), { entity: "Vendor", id: v.id, action });
  const edit = (k, val, label) => mut((x) => (x[k] = val), `${label}`);
  return (
    <>
      <Section title="Classification" icon={Icon.shapes}>
        <div className="grid grid-cols-3 gap-4 p-4">
          <Field label="Vendor type"><Select value={v.type} onChange={(t) => edit("type", t, `Type changed to ${t}`)} options={VENDOR_TYPES} /></Field>
          <Field label="Supplier type" hint={`TDS ${tdsLabel(v.tds) || ""}`}><Select value={v.supplierType || "Company"} onChange={(t) => mut((x) => { x.supplierType = t; x.tds = autoTds(x.type, t); }, `Supplier type → ${t}`)} options={SUPPLIER_TYPES} /></Field>
          <Field label="Supplier tier"><Select value={v.tier} onChange={(t) => edit("tier", t, `Tier changed to ${t}`)} options={TIERS} /></Field>
          <Field label="Registration tier" hint={v.regTier === "Prospective" ? "Upgrade needs Finance approval (Approval tab)" : "Downgrade is immediate"}>
            <span className="flex h-[32px] items-center gap-2 text-[13px]"><Status>{v.regTier}</Status>
              {v.tierRequest?.status === "Pending" && <Status tone="amber">Upgrade requested</Status>}
              {v.regTier === "Spend Authorized" && <button className="text-[12px] font-medium text-brand" onClick={() => tryAct("Procurement Head", [], "downgrading a vendor") && edit("regTier", "Prospective", "Registration tier → Prospective (downgraded)")}>Downgrade</button>}
            </span>
          </Field>
          <Field label="Vendor group" hint="Filters & spend-by-group report"><Select value={v.group || ""} placeholder="— not grouped —" onChange={(g) => edit("group", g, g ? `Vendor group → ${g}` : "Removed from vendor group")} options={withCurrent(settingsOf(getState()).vendorGroups, v.group)} /></Field>
          <Field label="Internal parent company" hint="Only if this vendor is one of our group companies" span={2}><Select value={v.parentCompany || ""} placeholder="— external vendor —" onChange={(g) => edit("parentCompany", g, g ? `Marked as group company of ${g}` : "Marked as external vendor")} options={withCurrent(settingsOf(getState()).groupCompanies, v.parentCompany)} /></Field>
          <Field label="Trades / categories (multi-trade)" span={3}>
            <TradePicker options={TRADES} value={v.categories} onChange={(c) => edit("categories", c, "Categories updated")} />
          </Field>
        </div>
      </Section>
      <Section title="Flags" icon={Icon.flag}>
        <div className="flex flex-wrap items-center gap-6 p-4">
          <Check checked={v.preferred} onChange={(b) => edit("preferred", b, b ? "Marked preferred supplier" : "Preferred flag removed")} label="Preferred supplier" />
          {!APPROVAL_STATES.includes(v.status) && v.status !== "Blacklisted" && <Check checked={v.status !== "Inactive"} onChange={(b) => edit("status", b ? "Active" : "Inactive", b ? "Vendor enabled" : "Vendor disabled")} label="Enabled for new transactions" />}
          <Check checked={!!v.allowBillWithoutPO} onChange={(b) => edit("allowBillWithoutPO", b, b ? "Allowed bills without PO" : "PO required for bills")} label="Allow bills without PO" />
          <Check checked={!!v.allowBillWithoutReceipt} onChange={(b) => edit("allowBillWithoutReceipt", b, b ? "Allowed bills before receipt" : "Receipt required before billing")} label="Allow bills before goods receipt" />
          <Check checked={!!v.frozen} onChange={(b) => edit("frozen", b, b ? "Vendor frozen — no new RFQs, POs or bills" : "Vendor unfrozen")} label="Freeze vendor (no new transactions)" />
        </div>
      </Section>
      <Section title="Hold / block" icon={Icon.lock}>
        <div className="space-y-3 p-4">
          {v.status === "On Hold" && v.hold ? (
            <div className="flex items-center justify-between gap-3">
              <Note tone="amber" icon={Icon.lock}>Blocking <b>{v.hold.scope.toLowerCase()}</b> {v.hold.until ? `until ${fmtDate(v.hold.until)}` : "indefinitely"} — {v.hold.reason}{v.hold.auto ? " (auto-hold from scorecard)" : ""}</Note>
              <Btn variant="success" onClick={() => mut((x) => { x.status = "Active"; x.hold = null; }, "Hold released")}>Release hold</Btn>
            </div>
          ) : (
            <div className="grid grid-cols-[160px_160px_1fr_auto] items-end gap-3">
              <Field label="Block"><Select value={hold.scope} onChange={(s) => setHold({ ...hold, scope: s })} options={["Invoices", "Payments", "All"]} /></Field>
              <Field label="Release date"><DateInput value={hold.until} onChange={(s) => setHold({ ...hold, until: s })} /></Field>
              <Field label="Reason"><TextInput value={hold.reason} onChange={(s) => setHold({ ...hold, reason: s })} placeholder="e.g. Pending reconciliation" /></Field>
              <Btn variant="primary" disabled={!!holdErr(hold) || v.status === "Blacklisted"} onClick={() => mut((x) => { x.status = "On Hold"; x.hold = { ...hold, reason: hold.reason.trim(), until: hold.until || null, placedAt: todayISO() }; }, `Placed on hold (${hold.scope}) — ${hold.reason.trim()}`)}>Place hold</Btn>
              {(hold.reason || hold.until !== shiftDays(30)) && holdErr(hold) && <div className="col-span-full"><FieldErr m={holdErr(hold)} /></div>}
            </div>
          )}
        </div>
      </Section>
      <Section title="Blacklist" icon={Icon.ban}>
        <div className="flex items-end gap-3 p-4">
          {v.status === "Blacklisted" ? (
            <>
              <Note tone="red">Blacklisted — history is kept but the vendor can't be used on new RFQs, POs or contracts.</Note>
              <Btn onClick={() => tryAct("Procurement Head", [], "removing a vendor from the blacklist") && mut((x) => (x.status = "Active"), "Removed from blacklist")}>Remove from blacklist</Btn>
            </>
          ) : (
            <>
              <div className="flex-1"><Field label="Reason (audit logged)"><TextInput value={reason} onChange={setReason} placeholder="e.g. Duplicate invoicing found in audit" /></Field></div>
              <Btn variant="danger" icon={Icon.ban} disabled={reason.trim().length < 5} onClick={() => { mut((x) => { x.status = "Blacklisted"; x.hold = null; x.notes.unshift({ at: todayISO(), by: currentUser(), text: `Blacklisted — ${reason}` }); }, `Blacklisted: ${reason}`); setReason(""); }}>Blacklist vendor</Btn>
            </>
          )}
        </div>
      </Section>
    </>
  );
}

function VendorDocs({ v, mode = "registry", locked }) {
  const [up, setUp] = y.useState(null), [rej, setRej] = y.useState(null), [hist, setHist] = y.useState(null), [del, setDel] = y.useState(null);
  const other = up && up.other;
  const docs = requiredDocs(v).map((name) => v.docs.find((d) => d.name === name) || { name, status: "Missing" });
  const extra = v.docs.filter((d) => !requiredDocs(v).includes(d.name));
  const mut = (name, fn, action) =>
    setState((s) => {
      const x = byId(s.vendors, v.id);
      let d = x.docs.find((dd) => dd.name === name);
      if (!d) { d = { name, status: "Missing", expiry: null }; x.docs.push(d); }
      fn(d);
    }, { entity: "Vendor", id: v.id, action });
  return (
    <Section title="Document checklist" icon={Icon.folderCheck} actions={!locked && <Btn size="sm" variant="primary" icon={Icon.upload} onClick={() => setUp({ name: docs.find((d) => docState(d) !== "Verified")?.name || docs[0].name, expiry: "", file: "", pick: true })}>Upload document</Btn>}>
      <DataTable dense rows={extra.length ? [...docs, ...extra] : docs} rowKey={(d) => d.name} columns={[
        { key: "name", label: "Document", className: "font-medium" },
        { key: "file", label: "File", render: (d) => (d.file ? <FileLink name={d.file} dataUrl={d.dataUrl} /> : <span className="text-ink-mute">—</span>) },
        { key: "expiry", label: "Valid till", render: (d) => <ExpiryCell iso={d.expiry} /> },
        { key: "status", label: "Status", render: (d) => <span className="flex flex-col"><Status>{docState(d)}</Status>
          {d.verifiedAt && d.status !== "Pending" && <span className="text-[11px] text-ink-mute">{d.status === "Rejected" ? "Rejected" : "Verified"} by {d.verifiedBy} · {fmtDate(d.verifiedAt)}</span>}
          {d.status === "Rejected" && d.remark && <span className="max-w-[220px] whitespace-normal text-[11px] text-red-600">{d.remark}</span>}</span> },
        { key: "ver", label: "Versions", render: (d) => ((d.versions || []).length ? <button className="text-[12px] font-medium text-brand hover:underline" onClick={() => setHist(d)}>v{(d.versions || []).length + 1} · history</button> : d.file ? <span className="text-[12px] text-ink-mute">v1</span> : "—") },
        { key: "a", label: "", align: "right", render: (d) => (
          <span className="flex justify-end gap-1">
            {!locked && <Btn size="sm" icon={Icon.upload} onClick={() => setUp({ name: d.name, expiry: d.expiry || "", file: "" })}>{d.status === "Missing" ? "Upload" : "Replace"}</Btn>}
            {!locked && d.status === "Pending" && d.file && <Btn size="sm" onClick={() => setDel({ d, withdraw: true })}>Withdraw</Btn>}
            {!locked && !requiredDocs(v).includes(d.name) && <Btn size="sm" onClick={() => setDel({ d })}>Delete</Btn>}
            {mode === "approval" && d.status === "Pending" && <>
              <Btn size="sm" variant="success" onClick={() => mut(d.name, (x) => { Object.assign(x, { status: "Verified", remark: "", verifiedBy: currentUser(), verifiedAt: new Date().toISOString() }); }, `${d.name} verified`)}>Verify</Btn>
              <Btn size="sm" variant="danger" onClick={() => setRej(d.name)}>Reject</Btn>
            </>}
          </span>
        ) },
      ]} />
      {rej && <RejectReasonModal title={`Reject — ${rej}`} onClose={() => setRej(null)} onReject={(reason) => mut(rej, (x) => { Object.assign(x, { status: "Rejected", remark: reason, verifiedBy: currentUser(), verifiedAt: new Date().toISOString() }); }, `${rej} rejected — ${reason}`)} />}
      {hist && (
        <Modal open onClose={() => setHist(null)} width={640} title={`${hist.name} — version history`} footer={<Btn onClick={() => setHist(null)}>Close</Btn>}>
          <DataTable dense rows={[{ ...hist, current: true }, ...(hist.versions || []).slice().reverse()]} rowKey={(x, i) => (x.current ? "cur" : x.replacedAt || i)} columns={[
            { key: "v", label: "Version", render: (x) => (x.current ? <b>Current</b> : `Replaced ${fmtDate(x.replacedAt)}`) },
            { key: "file", label: "File", render: (x) => (x.file ? <FileLink name={x.file} dataUrl={x.dataUrl} /> : "—") },
            { key: "up", label: "Uploaded", render: (x) => fmtDate(x.uploadedAt) }, { key: "exp", label: "Valid till", render: (x) => fmtDate(x.expiry) },
            { key: "st", label: "Status then", render: (x) => <Status>{x.status}</Status> }, { key: "by", label: "Verified by", render: (x) => (x.verifiedBy ? `${x.verifiedBy} · ${fmtDate(x.verifiedAt)}` : "—") },
            { key: "rb", label: "Replaced by", render: (x) => x.replacedBy || "—" },
          ]} />
        </Modal>
      )}
      {del && (
        <Modal open onClose={() => setDel(null)} width={460} title={del.withdraw ? `Withdraw ${del.d.name}?` : `Delete ${del.d.name}?`}
          subtitle={del.withdraw ? ((del.d.versions || []).length ? "The previous version is restored" : "The document goes back to Missing") : "The document and its history are removed from this vendor"}
          footer={<><Btn onClick={() => setDel(null)}>Cancel</Btn><Btn variant="danger" onClick={() => {
            setState((s) => {
              const x = byId(s.vendors, v.id);
              if (del.withdraw) { const d = x.docs.find((q) => q.name === del.d.name); const prev = (d.versions || []).pop();
                if (prev) Object.assign(d, { file: prev.file, dataUrl: prev.dataUrl, expiry: prev.expiry, status: prev.status, uploadedAt: prev.uploadedAt, verifiedBy: prev.verifiedBy, verifiedAt: prev.verifiedAt, remark: "" });
                else Object.assign(d, { status: "Missing", file: null, dataUrl: null, expiry: null, uploadedAt: null }); }
              else x.docs = x.docs.filter((q) => q.name !== del.d.name);
            }, { entity: "Vendor", id: v.id, action: `${del.d.name} ${del.withdraw ? "upload withdrawn" : "deleted"}` });
            toast(del.withdraw ? "Upload withdrawn" : "Document deleted"); setDel(null);
          }}>{del.withdraw ? "Withdraw" : "Delete"}</Btn></>}>
          <p className="text-[13px] text-ink-soft">{del.d.file}</p>
        </Modal>
      )}
      <Modal open={!!up} onClose={() => setUp(null)} title={`Upload — ${up?.name}`} width={480}
        footer={<><Btn onClick={() => setUp(null)}>Cancel</Btn><Btn variant="primary" disabled={!up?.file || !up?.name?.trim()} onClick={() => {
          if (up.expiry && up.expiry < todayISO()) return toast("Valid-till date is in the past — upload a current document", "red");
          mut(up.name, (x) => withVersion(x, { status: "Pending", file: up.file, dataUrl: up.dataUrl || null, expiry: up.expiry || null, uploadedAt: todayISO() }, currentUser()), `${up.name} ${up.replace ? "replaced" : "uploaded"}`);
          toast("Document uploaded — awaiting verification"); setUp(null);
        }}>Upload</Btn></>}>
        {up && <div className="space-y-3">
          {up.pick && <Field label="Document" required><Select value={other ? "__other" : up.name} onChange={(x) => setUp({ ...up, name: x === "__other" ? "" : x, other: x === "__other" })} options={[...docs.map((d) => ({ value: d.name, label: `${d.name} — ${docState(d)}` })), { value: "__other", label: "Other document…" }]} /></Field>}
          {other && <Field label="Document name" required><TextInput value={up.name} onChange={(x) => setUp({ ...up, name: x })} placeholder="e.g. ISO 9001 certificate" /></Field>}
          <Field label="File" required><input type="file" accept=".pdf,.jpg,.jpeg,.png" className="block w-full text-[13px]" onChange={async (e) => { const f0 = e.target.files[0]; if (f0) { const att = await readAttachment(f0); if (att) setUp((u) => ({ ...u, file: att.name, dataUrl: att.dataUrl })); else e.target.value = ""; } }} /></Field>
          <Field label="Valid till" hint="Leave empty for documents that don't expire"><DateInput value={up.expiry} onChange={(x) => setUp({ ...up, expiry: x })} /></Field>
        </div>}
      </Modal>
    </Section>
  );
}

function VendorBanks({ v }) {
  const blank = { holder: "", bank: "", account: "", accountConfirm: "", ifsc: "", swift: "", iban: "", accountType: "Current", currency: v.currency || "INR", branch: "", allowIntl: isForeign(v), paymentsEnabled: true, notes: "" };
  const [f, setF] = y.useState(blank), [tried, setTried] = y.useState(false), [rej, setRej] = y.useState(null), [del, setDel] = y.useState(null);
  const mut = (fn, action) => setState((s) => fn(byId(s.vendors, v.id)), { entity: "Vendor", id: v.id, action });
  const foreign = isForeign(v);
  const er = { ...bankErrors(f, v, v.bankAccounts) };
  { const x = vendorExtraErrors({ bank: f }); if (f.accountConfirm !== f.account) er.confirm = "Account numbers don't match"; if (x.bank_iban) er.iban = x.bank_iban; }
  const [ed, setEd] = y.useState(null);
  const tail = (a) => "••" + String(a.account).slice(-4);
  const verify = (a) => {
    const ok = nameMatch(a.holder || v.legalName, v);
    mut((x) => Object.assign(x.bankAccounts.find((o) => o.id === a.id), ok
      ? { status: "Verified", remark: "", verifiedBy: currentUser(), verifiedAt: new Date().toISOString(), method: "Penny drop — name matched" }
      : { status: "Rejected", remark: `Penny drop: beneficiary name does not match “${v.legalName || v.name}”`, verifiedBy: currentUser(), verifiedAt: new Date().toISOString(), method: "Penny drop" }),
      ok ? `Bank account ${tail(a)} verified (penny drop)` : `Bank account ${tail(a)} failed verification — name mismatch`);
    toast(ok ? "Bank account verified" : "Verification failed — holder name mismatch", ok ? "green" : "red");
  };
  return (
    <Section title="Bank accounts" icon={Icon.wallet}>
      <DataTable dense rows={v.bankAccounts} empty={<p className="p-4 text-[13px] text-ink-mute">No bank account on file — payments are blocked until one is added.</p>}
        columns={[
          { key: "holder", label: "Account holder", render: (a) => a.holder || <span className="text-ink-mute">—</span> },
          { key: "bank", label: "Bank", className: "font-medium" }, { key: "account", label: "Account no.", className: "mono text-[12px]", render: (a) => "•••• " + String(a.account).slice(-4) },
          { key: "ifsc", label: foreign ? "SWIFT" : "IFSC", className: "mono text-[12px]", render: (a) => a.ifsc || a.swift || "—" },
          { key: "ty", label: "Type · currency", render: (a) => <span className="flex flex-col text-[12px]"><span>{a.accountType || "Current"} · {a.currency || v.currency || "INR"}</span>{a.iban && <span className="mono text-ink-mute">IBAN {a.iban}</span>}{a.branch && <span className="text-ink-mute">{a.branch}</span>}</span> },
          { key: "fl", label: "Settings", render: (a) => <span className="flex flex-wrap gap-1">{a.disabled ? <Status tone="gray">Disabled</Status> : a.paymentsEnabled === false ? <Status tone="amber">Payments off</Status> : <Status tone="green">Payments on</Status>}{a.allowIntl && <Status tone="blue">International</Status>}</span> },
          { key: "st", label: "Verification", render: (a) => <span className="flex flex-col"><Status tone={{ Verified: "green", Rejected: "red" }[bankStatus(a)] || "amber"}>{bankStatus(a)}</Status>
            {a.verifiedAt && <span className="text-[11px] text-ink-mute">{a.verifiedBy} · {fmtDate(a.verifiedAt)}{a.method ? ` · ${a.method}` : ""}</span>}
            {a.remark && <span className="max-w-[220px] whitespace-normal text-[11px] text-red-600">{a.remark}</span>}</span> },
          { key: "d", label: "", align: "right", render: (a) => (
            <span className="flex justify-end gap-1">
              {bankStatus(a) !== "Verified" && <Btn size="sm" variant="success" onClick={() => verify(a)}>Verify</Btn>}
              {bankStatus(a) === "Unverified" && <Btn size="sm" variant="danger" onClick={() => setRej({ a, reason: "" })}>Reject</Btn>}
              {a.isDefault ? <Status tone="green">Default</Status> : <Btn size="sm" disabled={bankStatus(a) === "Rejected"} title={bankStatus(a) === "Rejected" ? "A rejected account can't be the default" : ""} onClick={() => mut((x) => x.bankAccounts.forEach((o) => (o.isDefault = o.id === a.id)), `Default bank set to ${a.bank} ${tail(a)}`)}>Make default</Btn>}
              <Btn size="sm" icon={Icon.sliders} onClick={() => setEd({ ...a })}>Settings</Btn>
              <Btn size="sm" onClick={() => setDel(a)}>Remove</Btn>
            </span>) },
        ]} />
      {v.bankAccounts.some((a) => a.isDefault && bankStatus(a) !== "Verified") && <div className="border-t border-line px-4 py-2"><Note tone="amber">The default account is not verified — payments show a warning until it is verified.</Note></div>}
      <div className="grid grid-cols-[1.2fr_1fr_1fr_140px_auto] items-start gap-3 border-t border-line p-4">
        <Field label="Account holder name" hint="Exactly as in bank records"><TextInput value={f.holder} onChange={(x) => setF({ ...f, holder: x })} placeholder={v.legalName} />{tried && <FieldErr m={er.holder} />}</Field>
        <Field label="Bank"><TextInput value={f.bank} onChange={(x) => setF({ ...f, bank: x })} />{tried && <FieldErr m={er.bank} />}</Field>
        <Field label={foreign ? "Account no. / IBAN" : "Account no."}><TextInput value={f.account} onChange={(x) => setF({ ...f, account: x.replace(/\s/g, "") })} className={cls(inputCls, "mono")} />{(tried || f.account) && <FieldErr m={er.account} />}</Field>
        {foreign ? <Field label="SWIFT / BIC"><TextInput value={f.swift} onChange={(x) => setF({ ...f, swift: x.toUpperCase() })} maxLength={11} />{(tried || f.swift) && <FieldErr m={er.ifsc} />}</Field>
          : <Field label="IFSC"><TextInput value={f.ifsc} onChange={(x) => setF({ ...f, ifsc: x.toUpperCase() })} maxLength={11} />{(tried || f.ifsc) && <FieldErr m={er.ifsc} />}</Field>}
        <div className="pt-[22px]"><Btn variant="primary" icon={Icon.plus} onClick={() => {
          setTried(true); if (VX.any(er)) return;
          mut((x) => x.bankAccounts.push({ id: Date.now(), ...f, account: f.account.replace(/\s/g, ""), status: "Unverified", addedAt: todayISO(), isDefault: x.bankAccounts.length === 0 }), `Bank account added (${f.bank} ••${f.account.slice(-4)}) — pending verification`);
          toast("Bank account added — verify it before payments"); setF(blank); setTried(false);
        }}>Add</Btn></div>
      </div>
      <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr] items-start gap-3 px-4 pb-4">
        <Field label="Re-enter account no."><TextInput value={f.accountConfirm} onChange={(x) => setF({ ...f, accountConfirm: x.replace(/\s/g, "") })} onPaste={(e) => e.preventDefault()} className={cls(inputCls, "mono")} />{(tried || f.accountConfirm) && <FieldErr m={er.confirm} />}</Field>
        <Field label="Account type"><Select value={f.accountType} onChange={(x) => setF({ ...f, accountType: x })} options={ACCOUNT_TYPES} /></Field>
        <Field label="Account currency"><Select value={f.currency} onChange={(x) => setF({ ...f, currency: x })} options={withCurrent(CURRENCIES, f.currency)} /></Field>
        <Field label="Branch"><TextInput value={f.branch} onChange={(x) => setF({ ...f, branch: x })} /></Field>
        {foreign && <Field label="IBAN"><TextInput value={f.iban} onChange={(x) => setF({ ...f, iban: x.toUpperCase() })} className={cls(inputCls, "mono")} />{(tried || f.iban) && <FieldErr m={er.iban} />}</Field>}
        <Field label="Bank notes" span={foreign ? 2 : 3}><TextInput value={f.notes} onChange={(x) => setF({ ...f, notes: x })} placeholder="e.g. Use for project payments only" /></Field>
        <div className="col-span-full flex flex-wrap gap-6"><Check checked={!!f.allowIntl} onChange={(b) => setF({ ...f, allowIntl: b })} label="Allow international payments" /><Check checked={f.paymentsEnabled !== false} onChange={(b) => setF({ ...f, paymentsEnabled: b })} label="Send money (payments enabled)" /></div>
      </div>
      {ed && (
        <Modal open onClose={() => setEd(null)} width={560} title={`Bank account ${tail(ed)} — settings`}
          footer={<><Btn onClick={() => setEd(null)}>Cancel</Btn><Btn variant="primary" onClick={() => {
            if (ed.disabled && ed.isDefault && v.bankAccounts.length > 1) return toast("Make another account the default before disabling this one", "red");
            mut((x) => Object.assign(x.bankAccounts.find((o) => o.id === ed.id), { accountType: ed.accountType, currency: ed.currency, branch: ed.branch, notes: ed.notes, allowIntl: !!ed.allowIntl, paymentsEnabled: ed.paymentsEnabled !== false, disabled: !!ed.disabled }),
              `Bank account ${tail(ed)} settings updated${ed.disabled ? " — disabled" : ""}`); toast("Bank account updated"); setEd(null); }}>Save</Btn></>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Account type"><Select value={ed.accountType || "Current"} onChange={(x) => setEd({ ...ed, accountType: x })} options={ACCOUNT_TYPES} /></Field>
            <Field label="Account currency"><Select value={ed.currency || v.currency || "INR"} onChange={(x) => setEd({ ...ed, currency: x })} options={withCurrent(CURRENCIES, ed.currency)} /></Field>
            <Field label="Branch"><TextInput value={ed.branch || ""} onChange={(x) => setEd({ ...ed, branch: x })} /></Field>
            <Field label="Bank notes"><TextInput value={ed.notes || ""} onChange={(x) => setEd({ ...ed, notes: x })} /></Field>
            <div className="col-span-2 flex flex-col gap-2">
              <Check checked={!!ed.allowIntl} onChange={(b) => setEd({ ...ed, allowIntl: b })} label="Allow international payments" />
              <Check checked={ed.paymentsEnabled !== false} onChange={(b) => setEd({ ...ed, paymentsEnabled: b })} label="Send money (payments enabled)" />
              <Check checked={!!ed.disabled} onChange={(b) => setEd({ ...ed, disabled: b })} label="Disable this bank account" />
            </div>
          </div>
        </Modal>
      )}
      {rej && (
        <Modal open onClose={() => setRej(null)} width={460} title={`Reject bank account ${tail(rej.a)}`}
          footer={<><Btn onClick={() => setRej(null)}>Cancel</Btn><Btn variant="danger" disabled={!!VX.reason(rej.reason)} onClick={() => { mut((x) => Object.assign(x.bankAccounts.find((o) => o.id === rej.a.id), { status: "Rejected", remark: rej.reason.trim(), verifiedBy: currentUser(), verifiedAt: new Date().toISOString(), isDefault: false }), `Bank account ${tail(rej.a)} rejected — ${rej.reason.trim()}`); toast("Bank account rejected", "red"); setRej(null); }}>Reject</Btn></>}>
          <Field label="Reason" required><TextInput value={rej.reason} onChange={(x) => setRej({ ...rej, reason: x })} placeholder="e.g. Cancelled cheque shows a different account" /><FieldErr m={rej.reason && VX.reason(rej.reason)} /></Field>
        </Modal>
      )}
      {del && (
        <Modal open onClose={() => setDel(null)} width={440} title={`Remove ${del.bank} ${tail(del)}?`} subtitle={del.isDefault && v.bankAccounts.length > 1 ? "Another account becomes the default" : ""}
          footer={<><Btn onClick={() => setDel(null)}>Cancel</Btn><Btn variant="danger" onClick={() => { mut((x) => { x.bankAccounts = x.bankAccounts.filter((o) => o.id !== del.id); if (del.isDefault) { const nx = x.bankAccounts.find((o) => bankStatus(o) === "Verified") || x.bankAccounts[0]; if (nx) nx.isDefault = true; } }, `Bank account ${del.bank} ${tail(del)} removed`); toast("Bank account removed"); setDel(null); }}>Remove</Btn></>}>
          <p className="text-[13px] text-ink-soft">Past payments keep their reference to this account.</p>
        </Modal>
      )}
    </Section>
  );
}

function VendorActivity({ v }) {
  const st = useStore();
  const [note, setNote] = y.useState("");
  const contracts = st.contracts.filter((c) => c.vendorId === v.id);
  const pos = st.purchaseOrders.filter((p) => p.vendorId === v.id);
  const invs = st.invoices.filter((i) => i.vendorId === v.id);
  const trail = st.audit.filter((a) => a.id === v.id || (a.entity !== "Vendor" && a.action.includes(v.id)));
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <StatTile tone="blue" label="Contracts" value={contracts.length} sub={inrShort(sum(contracts, contractValue))} icon={Icon.file} />
        <StatTile tone="purple" label="Purchase orders" value={pos.length} sub={inrShort(sum(pos, poValue))} icon={Icon.package} />
        <StatTile tone="amber" label="Outstanding" value={inrShort(sum(invs, (i) => invoiceTotals(i).balance))} sub={`${invs.length} bills`} icon={Icon.rupee} />
      </div>
      <Section title="Notes & communication" icon={Icon.message}>
        <div className="flex gap-2 border-b border-line p-3">
          <TextInput value={note} onChange={setNote} placeholder="Add a note for the team (logged against this vendor)" />
          <Btn variant="primary" disabled={!note.trim()} onClick={() => { setState((s) => byId(s.vendors, v.id).notes.unshift({ at: new Date().toISOString(), by: currentUser(), text: note.trim() }), { entity: "Vendor", id: v.id, action: "Note added" }); setNote(""); }}>Post</Btn>
        </div>
        <ul className="divide-y divide-line">
          {v.notes.length === 0 && <li className="p-3 text-[13px] text-ink-mute">No notes yet.</li>}
          {v.notes.map((n, i) => <li key={i} className="p-3 text-[13px]"><span className="font-medium">{n.by}</span> <span className="text-ink-mute">· {fmtDateTime(n.at)}</span><p className="mt-0.5 text-ink-soft">{n.text}</p></li>)}
        </ul>
      </Section>
      <Section title="Audit trail" icon={Icon.fileClock}>
        <AuditList items={trail} />
      </Section>
    </>
  );
}

function AuditList({ items }) {
  if (!items.length) return <p className="p-4 text-[13px] text-ink-mute">No changes recorded yet.</p>;
  return (
    <ul className="divide-y divide-line">
      {items.slice(0, 40).map((a, i) => (
        <li key={i} className="flex items-center justify-between gap-3 px-4 py-2 text-[13px]">
          <span><span className="mono mr-2 text-[11.5px] text-ink-mute">{a.id}</span>{a.action}</span>
          <span className="shrink-0 text-[12px] text-ink-mute">{a.by} · {fmtDateTime(a.at)}</span>
        </li>
      ))}
    </ul>
  );
}

// Calm list colours: normal states are plain text with a small dot; only exceptions get a coloured badge
const CALM = { Active: "bg-green-500", "Spend Authorized": "bg-green-500", Compliant: "bg-green-500" };
function CalmStatus({ children }) {
  const d = CALM[children];
  return d ? <span className="inline-flex items-center gap-1.5 text-ink-soft"><span className={cls("h-1.5 w-1.5 rounded-full", d)} />{children}</span> : <Status>{children}</Status>;
}
// Bulk actions for ticked vendors
function BulkBar({ sel, onClear, onHold }) {
  const st = useStore(), vs = sel.map((id) => byId(st.vendors, id)).filter(Boolean);
  const bulk = (fn, action) => { setState((s) => sel.forEach((id) => fn(byId(s.vendors, id))), { entity: "Vendor", id: sel.join(", "), action }); toast(`${action} — ${sel.length} vendor${sel.length > 1 ? "s" : ""}`); };
  const due = vs.flatMap((v) => complianceItems(v).filter((i) => i.level > 0).map((item) => ({ v, item })));
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-brand/20 bg-brand-soft/50 px-4 py-2 text-[13px]">
      <b className="text-brand">{sel.length} selected</b><span className="mx-1 h-4 w-px bg-brand/20" />
      <Btn size="sm" icon={Icon.star} onClick={() => bulk((v) => (v.preferred = true), "Marked preferred")}>Mark preferred</Btn>
      <Btn size="sm" onClick={() => bulk((v) => (v.preferred = false), "Preferred removed")}>Remove preferred</Btn>
      <div className="w-[170px]"><Select label="Change tier" value="" placeholder="Change tier…" options={TIERS} onChange={(t) => t && bulk((v) => (v.tier = t), `Tier changed to ${t}`)} className="h-[28px]" /></div>
      <Btn size="sm" icon={Icon.mail} disabled={!due.length} onClick={() => sendReminders(due)}>Send compliance reminders{due.length ? ` (${due.length})` : ""}</Btn>
      <Btn size="sm" icon={Icon.lock} onClick={onHold}>Put on hold</Btn>
      <button type="button" className="ml-auto text-[12.5px] text-brand hover:underline" onClick={onClear}>Clear selection</button>
    </div>
  );
}
// Placing a hold: a real reason, and a release date (if given) in the future, at most a year out
function holdErr(h) {
  if ((h.reason || "").trim().length < 5) return "Enter a reason (at least 5 characters)";
  if (h.until && h.until <= todayISO()) return "Release date must be in the future";
  if (h.until && daysUntil(h.until) > 365) return "Release date must be within a year — leave it blank for an indefinite hold";
  return "";
}
function BulkHoldModal({ ids, onClose, onDone }) {
  const [hold, setHold] = y.useState({ scope: "Payments", until: shiftDays(30), reason: "" });
  const go = () => {
    setState((s) => ids.forEach((id) => { const x = byId(s.vendors, id); if (x.status === "Blacklisted") return; x.status = "On Hold"; x.hold = { ...hold, reason: hold.reason.trim(), until: hold.until || null, placedAt: todayISO() }; }), { entity: "Vendor", id: ids.join(", "), action: `Placed on hold (${hold.scope}) — ${hold.reason}` });
    toast(`${ids.length} vendor${ids.length > 1 ? "s" : ""} put on hold`); onDone();
  };
  return (
    <Modal open onClose={onClose} width={520} title={`Put ${ids.length} vendor${ids.length > 1 ? "s" : ""} on hold`} subtitle="Blacklisted vendors are skipped"
      footer={<>{holdErr(hold) && <span className="mr-auto text-[12px] text-red-600">{holdErr(hold)}</span>}<Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" icon={Icon.lock} disabled={!!holdErr(hold)} onClick={go}>Place hold</Btn></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Block"><Select value={hold.scope} onChange={(x) => setHold({ ...hold, scope: x })} options={["Invoices", "Payments", "All"]} /></Field>
        <Field label="Release date"><DateInput value={hold.until} onChange={(x) => setHold({ ...hold, until: x })} /></Field>
        <Field label="Reason" required span={2}><TextInput value={hold.reason} onChange={(x) => setHold({ ...hold, reason: x })} placeholder="e.g. Pending reconciliation" /></Field>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- vendor status (click to change)
// Operational statuses are set by hand; approval statuses come from the approval flow.
const VSTATUS = ["Active", "Inactive", "On Hold", "Blacklisted"];
const APPROVAL_STATES = ["Draft", "Pending Approval", "Changes Requested", "Rejected"];
function vendorStatusOptions(v) {
  if (APPROVAL_STATES.includes(v.status)) return v.status === "Pending Approval" ? [] : ["Pending Approval"];
  return VSTATUS;
}
function setVendorStatus(v, to, extra = {}) {
  if (to === "Pending Approval") { if (resubmit(v)) toast(`${v.name} submitted for approval`); return; }
  // Taking a vendor off the blacklist needs the Procurement Head
  if (v.status === "Blacklisted" && !tryAct("Procurement Head", [], "removing a vendor from the blacklist")) return;
  setState((s) => {
    const x = byId(s.vendors, v.id); const from = x.status; x.status = to;
    if (to === "On Hold") x.hold = { ...extra.hold, placedAt: todayISO() }; else if (from === "On Hold") x.hold = null;
    if (to === "Blacklisted") { x.hold = null; x.notes.unshift({ at: todayISO(), by: currentUser(), text: `Blacklisted — ${extra.reason}` }); }
  }, { entity: "Vendor", id: v.id, action: `Status ${v.status} → ${to}${extra.reason ? ` — ${extra.reason}` : extra.hold ? ` (${extra.hold.scope}) — ${extra.hold.reason}` : ""}` });
  toast(`${v.name}: ${v.status} → ${to}`);
}
function VendorStatusMenu({ v }) {
  const [open, setOpen] = y.useState(false), [pos, setPos] = y.useState(null), [ask, setAsk] = y.useState(null);
  const btn = y.useRef(null), menu = y.useRef(null);
  const opts = vendorStatusOptions(v);
  y.useEffect(() => {
    if (!open) return;
    const r = btn.current.getBoundingClientRect(); setPos({ left: Math.min(r.left, window.innerWidth - 270), top: r.bottom + 4 > window.innerHeight - 260 ? undefined : r.bottom + 4, bottom: r.bottom + 4 > window.innerHeight - 260 ? window.innerHeight - r.top + 4 : undefined });
    const off = (e) => { if (!btn.current?.contains(e.target) && !menu.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === "Escape" && setOpen(false);
    const scr = (e) => { if (!menu.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", off); document.addEventListener("keydown", esc); document.addEventListener("scroll", scr, true);
    return () => { document.removeEventListener("mousedown", off); document.removeEventListener("keydown", esc); document.removeEventListener("scroll", scr, true); };
  }, [open]);
  const pick = (o) => { setOpen(false); if (o === "On Hold") setAsk("hold"); else if (o === "Blacklisted") setAsk("black"); else setVendorStatus(v, o); };
  return (
    <span onClick={(e) => e.stopPropagation()} className="inline-flex">
      <button ref={btn} type="button" aria-label={`Change status of ${v.name}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className={cls("group/st inline-flex items-center gap-1 rounded-md px-1 py-0.5 -mx-1 hover:bg-gray-100", open && "bg-gray-100")}>
        <CalmStatus>{v.status}</CalmStatus>{h(Icon.chevronDown, { size: 12, className: "text-ink-faint opacity-0 group-hover/st:opacity-100" })}
      </button>
      {open && pos && (
        <div ref={menu} role="menu" className="fixed z-[80] w-[260px] overflow-hidden whitespace-normal rounded-lg border border-line bg-white py-1 shadow-lg" style={{ left: pos.left, top: pos.top, bottom: pos.bottom }}>
          <p className="px-3 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-mute">Status</p>
          {[...new Set([...VSTATUS, ...APPROVAL_STATES, v.status])].map((o) => {
            const cur = o === v.status, can = opts.includes(o);
            const label = can && o === "Pending Approval" ? (v.status === "Draft" ? "Submit for approval" : "Resubmit for approval") : o;
            return (
              <button key={o} type="button" role="menuitem" aria-current={cur || undefined} disabled={cur || !can} onClick={() => pick(o)} data-tip={!cur && !can ? "Set by the approval flow" : undefined}
                className={cls("flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px]", cur ? "bg-brand-soft/60 font-medium text-brand" : can ? "text-ink hover:bg-gray-50" : "cursor-default text-ink-mute")}>
                <span className={cls("h-2 w-2 shrink-0 rounded-full", DOT[TONE[o.toLowerCase()] || "gray"])} /><span className="flex-1">{label}</span>{cur && h(Icon.check, { size: 14, className: "text-brand" })}
              </button>
            );
          })}
        </div>
      )}
      {ask === "hold" && <BulkHoldModal ids={[v.id]} onClose={() => setAsk(null)} onDone={() => setAsk(null)} />}
      {ask === "black" && <BlacklistModal v={v} onClose={() => setAsk(null)} />}
    </span>
  );
}
function BlacklistModal({ v, onClose }) {
  const [reason, setReason] = y.useState("");
  return (
    <Modal open onClose={onClose} width={480} title={`Blacklist ${v.name}?`} subtitle="History is kept, but the vendor can't be used on new RFQs, POs or contracts"
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="danger" icon={Icon.ban} disabled={!reason.trim()} onClick={() => { setVendorStatus(v, "Blacklisted", { reason }); onClose(); }}>Blacklist vendor</Btn></>}>
      <Field label="Reason (audit logged)" required><TextInput value={reason} onChange={setReason} placeholder="e.g. Duplicate invoicing found in audit" autoFocus /></Field>
    </Modal>
  );
}

// ---------------------------------------------------------------- registry page
function VendorRegistryPage() {
  const st = useStore();
  const [type, setType] = y.useState("All"), [status, setStatus] = y.useState("All"), [tier, setTier] = y.useState("All"), [grp, setGrp] = y.useState("All");
  const [open, setOpen] = useQueryOpen(), [reg, setReg] = y.useState(false), [share, setShare] = y.useState(false), [invite, setInvite] = y.useState(false), [view, setView] = y.useState("vendors");
  const [sel, setSel] = y.useState([]), [holdFor, setHoldFor] = y.useState(null);
  const rows = st.vendors.filter((v) =>
    (type === "All" || v.type === type) && (status === "All" || v.status === status) && (tier === "All" || v.tier === tier) &&
    (grp === "All" || (grp === "__intra" ? isGroupCompany(v) : grp === "__none" ? !v.group : inGroup(v, grp))) &&
    true);
  const compIssues = st.vendors.filter((v) => v.status === "Active" && complianceOf(v).status !== "Compliant").length;
  return (
    <Page title="Vendor Registry" subtitle="Vendor master — registration, classification and status" icon={Icon.building}
      actions={<>
        
        <Btn icon={Icon.mail} onClick={() => setInvite(true)}>Invite vendor</Btn>
        <Btn variant="primary" icon={Icon.plus} onClick={() => setReg(true)}>Register vendor</Btn>
      </>}>
      <TabBar active={view} onChange={setView} tabs={[{ id: "vendors", label: "Vendors", icon: Icon.building }, { id: "invites", label: "Invitations", icon: Icon.mail }]} />
      {view === "invites" && <InvitesTable onOpenVendor={setOpen} />}
      {view === "vendors" && <>
      {sel.length > 0 && <BulkBar sel={sel} onClear={() => setSel([])} onHold={() => setHoldFor(sel)} />}
      <DataTable columnsId="vendor-registry" extraColumns={VENDOR_EXTRA_COLUMNS(st)} noun="vendors" exportName="vendor-master" placeholder="Search vendors…"
        onClearFilters={() => { setType("All"); setStatus("All"); setTier("All"); }}
        summary={(r) => [{ value: r.filter((v) => v.preferred).length, label: "preferred", color: "text-amber-600" }]}
        filters={<>
        <FilterSelect label="Type" value={type} onChange={setType} options={[{ value: "All", label: "All types" }, ...VENDOR_TYPES]} />
        <FilterSelect label="Status" value={status} onChange={setStatus} options={[{ value: "All", label: "All status" }, "Active", "Pending Approval", "Changes Requested", "Draft", "On Hold", "Blacklisted", "Inactive", "Rejected"]} />
        <FilterSelect label="Tier" value={tier} onChange={setTier} options={[{ value: "All", label: "All tiers" }, ...TIERS]} />
      </>}
        rows={rows} onRow={(v) => setOpen(v.id)} columns={[
        { key: "sel", label: "", render: (v) => <input type="checkbox" aria-label={`Select ${v.name}`} className="h-4 w-4 accent-[#0b5ed7]" checked={sel.includes(v.id)} onClick={(e) => e.stopPropagation()} onChange={(e) => setSel(e.target.checked ? [...sel, v.id] : sel.filter((x) => x !== v.id))} /> },
        { key: "name", label: "Vendor", filterOptions: FO.preferred, filterLabel: "Preferred", filterAll: "All vendors", filter: (v) => (v.preferred ? "Preferred" : "Not preferred"), render: (v) => <span className="flex items-center justify-between gap-3 font-medium"><span className="truncate">{v.name}</span><PreferredStar v={v} size={14} /></span> },
        { key: "status", label: "Status", sort: (v) => v.status, render: (v) => <VendorStatusMenu v={v} /> },
        { key: "type", label: "Type", render: (v) => <span className="flex flex-wrap items-center gap-1.5 text-ink-soft">{v.type}<GroupCoTag v={v} /></span> },
        { key: "cat", label: "Trades", sort: (v) => v.categories[0] || "", render: (v) => <CategoryChips list={v.categories} /> },
        { key: "tier", label: "Tier", sort: (v) => TIERS.indexOf(v.tier) },
        { key: "reg", label: "Registration", sort: (v) => v.regTier, render: (v) => <CalmStatus>{v.regTier}</CalmStatus> },
        { key: "comp", label: "Compliance", sort: (v) => complianceOf(v).status, render: (v) => <CalmStatus>{complianceOf(v).status}</CalmStatus> },
        { key: "score", label: "Score", sort: (v) => vendorScore(st, v.id).score ?? -1, render: (v) => { const sc = vendorScore(st, v.id).score; return sc == null ? <span data-tip="No orders, work orders or ratings yet" className="text-[12.5px] text-ink-faint">New</span> : <ScoreBadge value={sc} />; } },
      ]} />
      </>}
      {invite && <InviteVendorModal onClose={() => setInvite(false)} />}
      <RegisterVendorModal open={reg} onClose={() => setReg(false)} onCreated={(id) => setOpen(id)} />
      {share && <ShareLinkModal title="Vendor self-registration link" url={appUrl("/vendor-register")} onClose={() => setShare(false)}
        text="Send this link to prospective vendors. They fill in their company, tax and bank details and upload documents themselves — no login needed. Submissions arrive in Approval Management under “Vendor Registration”." />}
      {open && <VendorDrawer vendorId={open} onClose={() => setOpen(null)} />}
      {holdFor && <BulkHoldModal ids={holdFor} onClose={() => setHoldFor(null)} onDone={() => { setHoldFor(null); setSel([]); }} />}
    </Page>
  );
}
