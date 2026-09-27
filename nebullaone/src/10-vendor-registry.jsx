// Vendor Registry (modules 1 & 3): registration, classification, vendor master,
// flags (preferred / hold / blacklist / disable), bank accounts, documents,
// qualification, approvals and audit trail — all in one vendor drawer.

const vendorName = (st, id) => (byId(st.vendors, id) || {}).name || id;
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function VendorTypeTag({ v }) {
  const c = { Goods: "bg-sky-50 text-sky-700 border-sky-200", Services: "bg-violet-50 text-violet-700 border-violet-200", Labor: "bg-orange-50 text-orange-700 border-orange-200" }[v.type];
  return <span className={cls("rounded border px-1.5 py-[1px] text-[11px] font-medium", c)}>{v.type}{v.isContractor ? " · Contractor" : ""}</span>;
}
function CategoryChips({ list, max = 2 }) {
  return (
    <span className="flex items-center gap-1">
      {list.slice(0, max).map((c) => <span key={c} className="rounded bg-gray-100 px-1.5 py-[1px] text-[11px] text-ink-soft">{c}</span>)}
      {list.length > max && <span className="text-[11px] text-ink-mute">+{list.length - max}</span>}
    </span>
  );
}

// ---------------------------------------------------------------- registration
const emptyVendor = () => ({
  name: "", legalName: "", type: "Goods", isContractor: false, categories: [], tier: "Approved", regTier: "Spend Authorized",
  gstin: "", pan: "", contact: { name: "", email: "", phone: "" }, address: "", city: "", state: "Maharashtra", currency: "INR",
  paymentTerms: "Net 30", tds: "194Q", group: "", parentCompany: "", bank: { bank: "", account: "", ifsc: "" },
  contractor: { labourLicence: "", licenceExpiry: "", pfCode: "", esiCode: "", workforce: "", experienceYrs: "", pastProjects: "" },
});

function validateVendor(f) {
  const e = {};
  if (!f.name.trim()) e.name = "Required";
  if (!GSTIN_RE.test(f.gstin.trim().toUpperCase())) e.gstin = "Enter a valid 15-character GSTIN";
  if (!PAN_RE.test(f.pan.trim().toUpperCase())) e.pan = "Enter a valid PAN (ABCDE1234F)";
  else if (GSTIN_RE.test(f.gstin.trim().toUpperCase()) && f.gstin.toUpperCase().slice(2, 12) !== f.pan.toUpperCase()) e.pan = "PAN doesn't match GSTIN";
  if (!f.contact.name.trim()) e.contactName = "Required";
  if (!EMAIL_RE.test(f.contact.email)) e.email = "Enter a valid email";
  if (!f.categories.length) e.categories = "Pick at least one category";
  return e;
}

function createVendor(f, submit) {
  const st = getState();
  const id = nextId("VEN", st.vendors);
  const v = {
    ...f, id, name: f.name.trim(), legalName: f.legalName.trim() || f.name.trim(), gstin: f.gstin.toUpperCase(), pan: f.pan.toUpperCase(),
    status: submit ? "Pending Approval" : "Draft", preferred: false, hold: null, notes: [], insurance: [],
    bankAccounts: f.bank.account ? [{ id: 1, ...f.bank, isDefault: true }] : [],
    approval: { stages: APPROVAL_FLOW.map((dept, i) => ({ dept, status: submit && i === 0 ? "Pending" : "Waiting", by: null, at: null, remark: "" })) },
    qualification: null, background: null, createdAt: todayISO(),
    contractor: f.isContractor || f.type === "Labor" ? { ...f.contractor } : null,
    onboarding: f.isContractor || f.type === "Labor" ? { checklist: ONBOARD_CHECKLIST.map((item) => ({ item, done: false })), startedAt: todayISO() } : null,
  };
  delete v.bank;
  v.docs = requiredDocs(v).map((name) => ({ name, status: "Missing", expiry: null }));
  setState((s) => s.vendors.unshift(v), { entity: "Vendor", id, action: submit ? "Registered & submitted for approval" : "Registered as draft" });
  return id;
}

function VendorForm({ f, set, errors, contractorMode }) {
  const upd = (k, val) => set({ ...f, [k]: val });
  const updC = (k, val) => set({ ...f, contact: { ...f.contact, [k]: val } });
  const updB = (k, val) => set({ ...f, bank: { ...f.bank, [k]: val } });
  const updK = (k, val) => set({ ...f, contractor: { ...f.contractor, [k]: val } });
  const err = (k) => errors[k] && <span className="mt-1 block text-[11px] text-red-600">{errors[k]}</span>;
  const showContractor = contractorMode || f.isContractor || f.type === "Labor";
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-mute">Company</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Company / trade name" required><TextInput value={f.name} onChange={(v) => upd("name", v)} placeholder="e.g. Shree Balaji Infra" />{err("name")}</Field>
          <Field label="Registered legal name"><TextInput value={f.legalName} onChange={(v) => upd("legalName", v)} placeholder="As on GST certificate" /></Field>
          <Field label="Vendor type" required hint="Drives PO type, TDS section and approval routing">
            <Select value={f.type} onChange={(v) => set({ ...f, type: v, tds: v === "Goods" ? "194Q" : "194C-2", isContractor: v === "Labor" ? true : f.isContractor })} options={VENDOR_TYPES} />
          </Field>
          <Field label="Registration tier" hint="Prospective vendors can quote but can't receive POs">
            <Select value={f.regTier} onChange={(v) => upd("regTier", v)} options={["Spend Authorized", "Prospective"]} />
          </Field>
          <Field label="Trades / categories" required span={2}>
            <ChipPicker options={TRADES} value={f.categories} onChange={(v) => upd("categories", v)} />{err("categories")}
          </Field>
          {!contractorMode && f.type !== "Labor" && (
            <div className="col-span-2"><Check checked={f.isContractor} onChange={(v) => upd("isContractor", v)} label="This vendor executes work on site (contractor / subcontractor)" /></div>
          )}
        </div>
      </div>
      <div>
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-mute">Tax & terms</p>
        <div className="grid grid-cols-3 gap-3">
          <Field label="GSTIN" required><TextInput value={f.gstin} onChange={(v) => upd("gstin", v.toUpperCase())} placeholder="27AAKCS4412M1Z3" maxLength={15} />{err("gstin")}</Field>
          <Field label="PAN" required><TextInput value={f.pan} onChange={(v) => upd("pan", v.toUpperCase())} placeholder="AAKCS4412M" maxLength={10} />{err("pan")}</Field>
          <Field label="Currency"><Select value={f.currency} onChange={(v) => upd("currency", v)} options={["INR", "USD", "EUR", "AED"]} /></Field>
          <Field label="Payment terms"><Select value={f.paymentTerms} onChange={(v) => upd("paymentTerms", v)} options={PAYMENT_TERMS} /></Field>
          <Field label="Withholding tax (TDS)" span={2}><Select value={f.tds} onChange={(v) => upd("tds", v)} options={TDS_SECTIONS} /></Field>
          <Field label="Supplier tier"><Select value={f.tier} onChange={(v) => upd("tier", v)} options={TIERS} /></Field>
          <Field label="Vendor group" hint="Parent › child, for roll-up reporting"><TextInput value={f.group} onChange={(v) => upd("group", v)} placeholder="Civil Contractors › Structural" /></Field>
          <Field label="Internal parent company" hint="Only for group companies"><TextInput value={f.parentCompany} onChange={(v) => upd("parentCompany", v)} placeholder="—" /></Field>
        </div>
      </div>
      <div>
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-mute">Contact & address</p>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Contact person" required><TextInput value={f.contact.name} onChange={(v) => updC("name", v)} />{err("contactName")}</Field>
          <Field label="Email" required><TextInput type="email" value={f.contact.email} onChange={(v) => updC("email", v)} />{err("email")}</Field>
          <Field label="Phone"><TextInput value={f.contact.phone} onChange={(v) => updC("phone", v)} placeholder="+91" /></Field>
          <Field label="Registered address" span={2}><TextInput value={f.address} onChange={(v) => upd("address", v)} /></Field>
          <Field label="City"><TextInput value={f.city} onChange={(v) => upd("city", v)} /></Field>
        </div>
      </div>
      {showContractor && (
        <div>
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-mute">Contractor statutory details</p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Labour licence no. (CLRA)"><TextInput value={f.contractor.labourLicence} onChange={(v) => updK("labourLicence", v)} /></Field>
            <Field label="Licence valid till"><DateInput value={f.contractor.licenceExpiry} onChange={(v) => updK("licenceExpiry", v)} /></Field>
            <Field label="Workforce strength"><NumInput value={f.contractor.workforce} onChange={(v) => updK("workforce", v)} /></Field>
            <Field label="PF establishment code"><TextInput value={f.contractor.pfCode} onChange={(v) => updK("pfCode", v)} /></Field>
            <Field label="ESI code"><TextInput value={f.contractor.esiCode} onChange={(v) => updK("esiCode", v)} /></Field>
            <Field label="Experience (years)"><NumInput value={f.contractor.experienceYrs} onChange={(v) => updK("experienceYrs", v)} /></Field>
            <Field label="Past projects" span={3}><TextInput value={f.contractor.pastProjects} onChange={(v) => updK("pastProjects", v)} placeholder="Comma-separated" /></Field>
          </div>
        </div>
      )}
      <div>
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-mute">Bank details</p>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Bank"><TextInput value={f.bank.bank} onChange={(v) => updB("bank", v)} /></Field>
          <Field label="Account no."><TextInput value={f.bank.account} onChange={(v) => updB("account", v)} /></Field>
          <Field label="IFSC"><TextInput value={f.bank.ifsc} onChange={(v) => updB("ifsc", v.toUpperCase())} maxLength={11} /></Field>
        </div>
      </div>
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
    const dupe = getState().vendors.find((v) => v.gstin === f.gstin.toUpperCase());
    if (dupe) e.gstin = `Already registered as ${dupe.id} — ${dupe.name}`;
    setErrors(e);
    if (Object.keys(e).length) return;
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
      <VendorForm f={f} set={setF} errors={errors} contractorMode={contractorMode} />
    </Modal>
  );
}

// ---------------------------------------------------------------- vendor drawer
function VendorDrawer({ vendorId, onClose, initialTab = "overview" }) {
  const st = useStore();
  const v = byId(st.vendors, vendorId);
  const [tab, setTab] = y.useState(initialTab);
  y.useEffect(() => setTab(initialTab), [vendorId]);
  if (!v) return null;
  const comp = complianceOf(v);
  const sc = vendorScore(st, v.id);
  const tabs = [
    { id: "overview", label: "Overview", icon: Icon.info },
    { id: "flags", label: "Status & flags", icon: Icon.flag },
    { id: "docs", label: `Documents (${v.docs.filter((d) => d.status === "Verified").length}/${requiredDocs(v).length})`, icon: Icon.folderCheck },
    { id: "bank", label: "Bank", icon: Icon.wallet },
    { id: "qual", label: "Qualification", icon: Icon.listChecks },
    { id: "approval", label: "Approvals", icon: Icon.clipboardCheck },
    { id: "activity", label: "Activity", icon: Icon.activity },
  ];
  return (
    <Drawer open onClose={onClose} width={880} title={<span className="flex items-center gap-2">{v.name}{v.preferred && <Icon.star size={14} className="text-amber-400" fill="currentColor" />}</span>}
      subtitle={<><span className="mono">{v.id}</span><VendorTypeTag v={v} /><Status>{v.status}</Status><Status>{v.regTier}</Status><Status>{comp.status}</Status></>}
      actions={<span className="flex items-center gap-2 pr-1 text-[12px] text-ink-soft">Score <ScoreRing value={sc.score} size={36} /></span>}>
      <TabBar tabs={tabs} active={tab} onChange={setTab} />
      <div className="space-y-4 p-5">
        {tab === "overview" && <VendorOverview v={v} comp={comp} />}
        {tab === "flags" && <VendorFlags v={v} />}
        {tab === "docs" && <VendorDocs v={v} />}
        {tab === "bank" && <VendorBanks v={v} />}
        {tab === "qual" && <Questionnaire v={v} />}
        {tab === "approval" && <VendorApproval v={v} />}
        {tab === "activity" && <VendorActivity v={v} />}
      </div>
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
          ["Legal name", v.legalName], ["Vendor ID", <span className="mono">{v.id}</span>], ["Tier", v.tier],
          ["GSTIN", <span className="mono">{v.gstin}</span>], ["PAN", <span className="mono">{v.pan}</span>], ["Currency", v.currency],
          ["Payment terms", v.paymentTerms], ["TDS", (TDS_SECTIONS.find((t) => t.value === v.tds) || {}).label], ["Vendor group", v.group || "—"],
          ["Internal parent", v.parentCompany || "—"], ["Registered", fmtDate(v.createdAt)], ["Categories", <CategoryChips list={v.categories} max={4} />],
        ]} />
      </Section>
      <Section title="Contact" icon={Icon.user}>
        <KV items={[["Contact person", v.contact.name], ["Email", v.contact.email], ["Phone", v.contact.phone], ["Address", [v.address, v.city, v.state].filter(Boolean).join(", ")]]} />
      </Section>
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
          <Field label="Supplier tier"><Select value={v.tier} onChange={(t) => edit("tier", t, `Tier changed to ${t}`)} options={TIERS} /></Field>
          <Field label="Registration tier">
            <Select value={v.regTier} onChange={(t) => edit("regTier", t, `Registration tier → ${t}`)} options={["Prospective", "Spend Authorized"]} />
          </Field>
          <Field label="Trades / categories (multi-trade)" span={3}>
            <ChipPicker options={TRADES} value={v.categories} onChange={(c) => edit("categories", c, "Categories updated")} />
          </Field>
        </div>
      </Section>
      <Section title="Flags" icon={Icon.flag}>
        <div className="flex flex-wrap items-center gap-6 p-4">
          <Check checked={v.preferred} onChange={(b) => edit("preferred", b, b ? "Marked preferred supplier" : "Preferred flag removed")} label="Preferred supplier" />
          <Check checked={v.status !== "Disabled"} onChange={(b) => edit("status", b ? "Active" : "Disabled", b ? "Vendor enabled" : "Vendor disabled")} label="Enabled for new transactions" />
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
              <Btn variant="primary" disabled={!hold.reason || v.status === "Blacklisted"} onClick={() => mut((x) => { x.status = "On Hold"; x.hold = { ...hold, placedAt: todayISO() }; }, `Placed on hold (${hold.scope})`)}>Place hold</Btn>
            </div>
          )}
        </div>
      </Section>
      <Section title="Blacklist" icon={Icon.ban}>
        <div className="flex items-end gap-3 p-4">
          {v.status === "Blacklisted" ? (
            <>
              <Note tone="red">Blacklisted — history is kept but the vendor can't be used on new RFQs, POs or contracts.</Note>
              <Btn onClick={() => mut((x) => (x.status = "Active"), "Removed from blacklist")}>Remove from blacklist</Btn>
            </>
          ) : (
            <>
              <div className="flex-1"><Field label="Reason (audit logged)"><TextInput value={reason} onChange={setReason} placeholder="e.g. Duplicate invoicing found in audit" /></Field></div>
              <Btn variant="danger" icon={Icon.ban} disabled={!reason} onClick={() => { mut((x) => { x.status = "Blacklisted"; x.hold = null; x.notes.unshift({ at: todayISO(), by: currentUser(), text: `Blacklisted — ${reason}` }); }, `Blacklisted: ${reason}`); setReason(""); }}>Blacklist vendor</Btn>
            </>
          )}
        </div>
      </Section>
    </>
  );
}

function VendorDocs({ v }) {
  const [up, setUp] = y.useState(null);
  const docs = requiredDocs(v).map((name) => v.docs.find((d) => d.name === name) || { name, status: "Missing" });
  const mut = (name, fn, action) =>
    setState((s) => {
      const x = byId(s.vendors, v.id);
      let d = x.docs.find((dd) => dd.name === name);
      if (!d) { d = { name, status: "Missing", expiry: null }; x.docs.push(d); }
      fn(d);
    }, { entity: "Vendor", id: v.id, action });
  return (
    <Section title="Document checklist" icon={Icon.folderCheck} actions={<span className="text-[12px] text-ink-mute">Each item is verified individually before activation</span>}>
      <DataTable dense rows={docs} rowKey={(d) => d.name} columns={[
        { key: "name", label: "Document", className: "font-medium" },
        { key: "file", label: "File", render: (d) => (d.file ? <span className="text-[12px] text-brand">{d.file}</span> : <span className="text-ink-mute">—</span>) },
        { key: "expiry", label: "Valid till", render: (d) => <ExpiryCell iso={d.expiry} /> },
        { key: "status", label: "Status", render: (d) => <Status>{docState(d)}</Status> },
        { key: "a", label: "", align: "right", render: (d) => (
          <span className="flex justify-end gap-1">
            <Btn size="sm" icon={Icon.upload} onClick={() => setUp({ name: d.name, expiry: d.expiry || "", file: "" })}>{d.status === "Missing" ? "Upload" : "Replace"}</Btn>
            {d.status === "Pending" && <>
              <Btn size="sm" variant="success" onClick={() => mut(d.name, (x) => (x.status = "Verified"), `${d.name} verified`)}>Verify</Btn>
              <Btn size="sm" variant="danger" onClick={() => mut(d.name, (x) => (x.status = "Rejected"), `${d.name} rejected`)}>Reject</Btn>
            </>}
          </span>
        ) },
      ]} />
      <Modal open={!!up} onClose={() => setUp(null)} title={`Upload — ${up?.name}`} width={480}
        footer={<><Btn onClick={() => setUp(null)}>Cancel</Btn><Btn variant="primary" disabled={!up?.file} onClick={() => {
          mut(up.name, (x) => Object.assign(x, { status: "Pending", file: up.file, expiry: up.expiry || null, uploadedAt: todayISO() }), `${up.name} uploaded`);
          toast("Document uploaded — awaiting verification"); setUp(null);
        }}>Upload</Btn></>}>
        {up && <div className="space-y-3">
          <Field label="File" required><input type="file" className="block w-full text-[13px]" onChange={(e) => setUp({ ...up, file: e.target.files[0]?.name || "" })} /></Field>
          <Field label="Valid till" hint="Leave empty for documents that don't expire"><DateInput value={up.expiry} onChange={(x) => setUp({ ...up, expiry: x })} /></Field>
        </div>}
      </Modal>
    </Section>
  );
}

function VendorBanks({ v }) {
  const [f, setF] = y.useState({ bank: "", account: "", ifsc: "" });
  const mut = (fn, action) => setState((s) => fn(byId(s.vendors, v.id)), { entity: "Vendor", id: v.id, action });
  return (
    <Section title="Bank accounts" icon={Icon.wallet}>
      <DataTable dense rows={v.bankAccounts} empty={<p className="p-4 text-[13px] text-ink-mute">No bank account on file — payments are blocked until one is added.</p>}
        columns={[
          { key: "bank", label: "Bank", className: "font-medium" }, { key: "account", label: "Account no.", className: "mono text-[12px]", render: (b) => "•••• " + b.account.slice(-4) },
          { key: "ifsc", label: "IFSC", className: "mono text-[12px]" },
          { key: "d", label: "", align: "right", render: (b) => b.isDefault ? <Status tone="green">Default</Status> : <Btn size="sm" onClick={() => mut((x) => x.bankAccounts.forEach((a) => (a.isDefault = a.id === b.id)), `Default bank set to ${b.bank}`)}>Make default</Btn> },
        ]} />
      <div className="grid grid-cols-[1fr_1fr_140px_auto] items-end gap-3 border-t border-line p-4">
        <Field label="Bank"><TextInput value={f.bank} onChange={(x) => setF({ ...f, bank: x })} /></Field>
        <Field label="Account no."><TextInput value={f.account} onChange={(x) => setF({ ...f, account: x })} /></Field>
        <Field label="IFSC"><TextInput value={f.ifsc} onChange={(x) => setF({ ...f, ifsc: x.toUpperCase() })} maxLength={11} /></Field>
        <Btn variant="primary" icon={Icon.plus} disabled={!f.bank || f.account.length < 6 || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(f.ifsc)}
          onClick={() => { mut((x) => x.bankAccounts.push({ id: Date.now(), ...f, isDefault: x.bankAccounts.length === 0 }), `Bank account added (${f.bank})`); setF({ bank: "", account: "", ifsc: "" }); }}>Add</Btn>
      </div>
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

// ---------------------------------------------------------------- registry page
function VendorRegistryPage() {
  const st = useStore();
  const [q, setQ] = y.useState(""), [type, setType] = y.useState("All"), [status, setStatus] = y.useState("All"), [tier, setTier] = y.useState("All");
  const [open, setOpen] = y.useState(null), [reg, setReg] = y.useState(false);
  const rows = st.vendors.filter((v) =>
    (type === "All" || v.type === type) && (status === "All" || v.status === status) && (tier === "All" || v.tier === tier) &&
    (!q || [v.name, v.id, v.gstin, v.city, ...v.categories].join(" ").toLowerCase().includes(q.toLowerCase())));
  const compIssues = st.vendors.filter((v) => v.status === "Active" && complianceOf(v).status !== "Compliant").length;
  return (
    <Page title="Vendor Registry" subtitle="Vendor master — registration, classification and status" icon={Icon.building}
      actions={<>
        <Btn icon={Icon.globe} onClick={() => { try { navigator.clipboard.writeText(location.origin + "/vendor-register"); } catch {} toast("Self-registration link copied"); }}>Self-registration link</Btn>
        <Btn variant="primary" icon={Icon.plus} onClick={() => setReg(true)}>Register vendor</Btn>
      </>}>
      <StatGrid cols={5}>
        <StatTile tone="blue" label="Total vendors" value={st.vendors.length} sub={`${st.vendors.filter((v) => v.isContractor).length} contractors`} icon={Icon.building} />
        <StatTile tone="green" label="Active" value={st.vendors.filter((v) => v.status === "Active").length} sub="Spend authorized" icon={Icon.check} />
        <StatTile tone="amber" label="Pending approval" value={st.vendors.filter((v) => v.status === "Pending Approval" || v.status === "Draft").length} sub="Incl. drafts" icon={Icon.clipboardCheck} />
        <StatTile tone="red" label="Held / blocked" value={st.vendors.filter((v) => ["On Hold", "Blacklisted", "Disabled"].includes(v.status)).length} icon={Icon.lock} />
        <StatTile tone="orange" label="Compliance issues" value={compIssues} sub="Active vendors" icon={Icon.warning} />
      </StatGrid>
      <Toolbar left={<>
        <SearchBox value={q} onChange={setQ} placeholder="Search name, ID, GSTIN, trade" />
        <FilterSelect label="Type" value={type} onChange={setType} options={[{ value: "All", label: "All types" }, ...VENDOR_TYPES]} />
        <FilterSelect label="Status" value={status} onChange={setStatus} options={[{ value: "All", label: "All status" }, "Active", "Pending Approval", "Draft", "On Hold", "Blacklisted", "Disabled", "Rejected"]} />
        <FilterSelect label="Tier" value={tier} onChange={setTier} options={[{ value: "All", label: "All tiers" }, ...TIERS]} />
      </>} right={<span className="text-[12px]">{rows.length} of {st.vendors.length}</span>} />
      <DataTable rows={rows} onRow={(v) => setOpen(v.id)} columns={[
        { key: "id", label: "Vendor ID", className: "mono text-[12px] text-ink-soft" },
        { key: "name", label: "Vendor", render: (v) => <span className="flex items-center gap-1.5 font-medium">{v.name}{v.preferred && <Icon.star size={12} className="text-amber-400" fill="currentColor" />}</span> },
        { key: "type", label: "Type", render: (v) => <VendorTypeTag v={v} /> },
        { key: "cat", label: "Trades", render: (v) => <CategoryChips list={v.categories} /> },
        { key: "tier", label: "Tier" },
        { key: "reg", label: "Registration", render: (v) => <Status>{v.regTier}</Status> },
        { key: "comp", label: "Compliance", render: (v) => <Status>{complianceOf(v).status}</Status> },
        { key: "score", label: "Score", align: "center", render: (v) => <ScoreRing value={vendorScore(st, v.id).score} size={30} /> },
        { key: "status", label: "Status", render: (v) => <Status>{v.status}</Status> },
      ]} />
      <PageFooter items={[{ value: rows.length, label: "vendors" }, { value: rows.filter((v) => v.preferred).length, label: "preferred", color: "text-amber-600" }]} />
      <RegisterVendorModal open={reg} onClose={() => setReg(false)} onCreated={(id) => setOpen(id)} />
      {open && <VendorDrawer vendorId={open} onClose={() => setOpen(null)} />}
    </Page>
  );
}
