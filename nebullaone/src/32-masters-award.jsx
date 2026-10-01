// A · Onboarding masters — Category master (type, requalification cycle, mandatory documents), the
// standard Rate master that purchase orders are checked against, and the qualification Question
// library. B · Sourcing — Direct award (no RFQ) with a justification and approval, then a PO; the
// requisition shows the three sourcing routes: RFQ, direct award or a call-off on a rate contract.

// ---------------------------------------------------------------- category master
const CATEGORY_TYPES = ["Goods", "Services", "Works", "Labour"];
const tradeType = (t) => (/Manpower|Masonry/.test(t) ? "Labour" : /Steel|Cement|Hardware/.test(t) ? "Goods" : /Hire|Scaffolding/.test(t) ? "Services" : "Works");
const CATEGORY_DEFAULTS = () => TRADES.map((t, i) => ({ code: `CAT-${String(i + 1).padStart(2, "0")}`, name: t, type: tradeType(t), group: tradeType(t) === "Goods" ? "Material Suppliers" : tradeType(t) === "Labour" ? "Labour Contractors" : "Contractors",
  requalMonths: tradeType(t) === "Goods" ? 24 : 12, docs: tradeType(t) === "Goods" ? "GST, PAN" : "GST, PAN, Labour licence, WC policy", owner: "Procurement", status: "Active" }));
const categoryMaster = (st) => (st && st.categoryMaster) || CATEGORY_DEFAULTS();
// Trades offered on vendor forms: the built-in list plus active categories from the master, less inactive ones
function tradeList() {
  const cm = (state && state.categoryMaster) || null;
  if (!cm) return TRADES;
  const off = new Set(cm.filter((c) => c.status === "Inactive").map((c) => c.name));
  return [...new Set([...TRADES, ...cm.filter((c) => c.status !== "Inactive" && String(c.name || "").trim()).map((c) => c.name.trim())])].filter((t) => !off.has(t));
}

// ---------------------------------------------------------------- standard rate master
const rateActive = (r, on = todayISO()) => (!r.validFrom || r.validFrom <= on) && (!r.validTo || r.validTo >= on) && r.status !== "Inactive";
function standardRateFor(st, desc) {
  const d = String(desc || "").trim().toLowerCase();
  if (d.length < 3) return null;
  return (st.rateMaster || []).filter((r) => rateActive(r)).find((r) => { const it = String(r.item || "").trim().toLowerCase(); return it && (d.includes(it) || it.includes(d)); }) || null;
}
// { std, tol, pct, over } when the rate is above the standard rate + tolerance
function rateVariance(st, desc, rate) {
  const r = standardRateFor(st, desc);
  if (!r || !(Number(rate) > 0)) return null;
  const pctOver = round2(((Number(rate) - Number(r.rate)) / Number(r.rate)) * 100);
  return { std: r, pct: pctOver, over: pctOver > (Number(r.tolerancePct) || 0) };
}
function lastPoRate(st, item) {
  const it = String(item || "").toLowerCase();
  const hits = st.purchaseOrders.filter((p) => p.status !== "Cancelled").flatMap((p) => p.lines.map((l) => ({ ...l, date: p.date }))).filter((l) => it && l.desc.toLowerCase().includes(it)).sort((a, b) => b.date.localeCompare(a.date));
  return hits[0] || null;
}
const rateErr = (rows) => {
  for (const r of rows) {
    if (!String(r.item || "").trim()) return "Every standard rate needs an item";
    if (!(Number(r.rate) > 0)) return `${r.item}: rate must be above zero`;
    if (r.validFrom && r.validTo && r.validTo < r.validFrom) return `${r.item}: valid-to is before valid-from`;
    if (r.tolerancePct !== "" && r.tolerancePct != null && (Number(r.tolerancePct) < 0 || Number(r.tolerancePct) > 50)) return `${r.item}: tolerance must be 0–50%`;
  }
  return "";
};
const catErr = (rows) => {
  const names = rows.map((r) => String(r.name || "").trim().toLowerCase());
  if (names.some((n) => !n)) return "Every category needs a name";
  if (new Set(names).size !== names.length) return "Category names must be unique";
  if (rows.some((r) => !(Number(r.requalMonths) > 0))) return "Requalification cycle must be at least 1 month";
  return "";
};

function CategoryRateMasterPage() {
  const st = useStore(), nav = useNavigate(), loc = Ht();
  const [tab, setTab] = y.useState(() => (/tab=rates/.test(loc.search) ? "rates" : /tab=questions/.test(loc.search) ? "questions" : "categories"));
  const [edit, setEdit] = y.useState(null);
  const cats = categoryMaster(st);
  const catRows = cats.map((c) => {
    const vs = st.vendors.filter((v) => (v.categories || []).includes(c.name));
    return { ...c, id: c.code, vendors: vs.length, approved: vs.filter((v) => v.status === "Active").length, requal: vs.filter((v) => v.requalRequired || requalDue(v)).length };
  });
  const rates = (st.rateMaster || []).map((r) => { const lp = lastPoRate(st, r.item); return { ...r, last: lp, varPct: lp ? round2(((lp.rate - r.rate) / r.rate) * 100) : null }; });
  const q = settingsOf(st).questionLibrary || [];
  return (
    <Page title="Category & Rate Master" subtitle="Categories vendors are approved for, standard rates purchase orders are checked against, and the qualification question library" icon={Icon.layers}
      actions={tab === "categories" ? <Btn variant="primary" icon={Icon.pencil} onClick={() => setEdit({ kind: "cat", rows: cats.map((c) => ({ ...c })) })}>Edit categories</Btn>
        : tab === "rates" ? <Btn variant="primary" icon={Icon.pencil} onClick={() => setEdit({ kind: "rate", rows: (st.rateMaster || []).map((r) => ({ ...r })) })}>Edit standard rates</Btn> : null}>
      <TabBar active={tab} onChange={setTab} tabs={[{ id: "categories", label: "Categories", icon: Icon.shapes, count: cats.length }, { id: "rates", label: "Standard rates", icon: Icon.rupee, count: rates.length }, { id: "questions", label: "Question library", icon: Icon.listChecks, count: q.length }]} />
      {tab === "categories" && (
        <DataTable noun="categories" rows={catRows} onRow={(c) => nav(`${VM_BASE}/registry`)} columns={[
          { key: "code", label: "Code", className: "mono text-[12px]" }, { key: "name", label: "Category", className: "font-medium" },
          { key: "type", label: "Type", filterOptions: CATEGORY_TYPES, filter: true }, { key: "group", label: "Supplier group", className: "text-[12px]" },
          { key: "requalMonths", label: "Requalify every", render: (c) => `${c.requalMonths} months` }, { key: "docs", label: "Mandatory documents", className: "max-w-[220px] truncate text-[12px]" },
          { key: "vendors", label: "Vendors", align: "right", num: true }, { key: "approved", label: "Active", align: "right", num: true },
          { key: "requal", label: "To requalify", align: "right", render: (c) => (c.requal ? <span className="font-semibold text-red-600">{c.requal}</span> : "0") },
          { key: "status", label: "Status", filterOptions: ["Active", "Inactive"], filter: true, render: (c) => <Status tone={c.status === "Active" ? "green" : "gray"}>{c.status}</Status> },
        ]} />
      )}
      {tab === "rates" && (
        <>
          <div className="px-4 pt-3"><Note>A purchase order line whose rate is above the standard rate plus tolerance is flagged on the PO and on direct awards (Procurement Settings → rate above standard: <b>{settingsOf(st).rateVarianceAction}</b>). Labour day-rates live in <RefLink to={`${CL_BASE}/labor-rates`}>Labor Rate Management</RefLink>.</Note></div>
          <DataTable noun="rates" rows={rates} rowKey={(r) => r.id} empty={<EmptyState icon={Icon.rupee} title="No standard rates" text="Add the agreed or budgeted rate for common items." />} columns={[
            { key: "id", label: "ID", className: "mono text-[12px]" }, { key: "item", label: "Item", className: "font-medium" }, { key: "unit", label: "Unit" },
            { key: "category", label: "Category", filterOptions: () => cats.map((c) => c.name), filter: true },
            { key: "rate", label: "Standard rate", align: "right", num: true, render: (r) => inr(r.rate) }, { key: "tolerancePct", label: "Tolerance", align: "right", render: (r) => `${r.tolerancePct || 0}%` },
            { key: "valid", label: "Valid", render: (r) => `${r.validFrom ? fmtDate(r.validFrom) : "—"} → ${r.validTo ? fmtDate(r.validTo) : "open"}` },
            { key: "source", label: "Source", className: "text-[12px]" },
            { key: "last", label: "Last PO rate", align: "right", render: (r) => (r.last ? inr(r.last.rate) : "—") },
            { key: "varPct", label: "Variance", align: "right", render: (r) => (r.varPct == null ? "—" : <span className={cls("num", r.varPct > (Number(r.tolerancePct) || 0) ? "font-semibold text-red-600" : "text-green-700")}>{r.varPct > 0 ? "+" : ""}{r.varPct}%</span>) },
            { key: "s", label: "Status", render: (r) => <Status tone={rateActive(r) ? "green" : "gray"}>{rateActive(r) ? "Active" : r.status === "Inactive" ? "Inactive" : "Out of validity"}</Status> },
          ]} />
        </>
      )}
      {tab === "questions" && (
        <div className="p-4">
          <TableEditor title="Qualification question library" icon={Icon.listChecks} rows={q} onChange={(rows) => setState((s) => { s.settings = { ...(s.settings || {}), questionLibrary: rows }; })}
            blank={() => ({ id: `QL-${Date.now().toString(36).slice(-4).toUpperCase()}`, question: "", status: "Active", owner: "", level: "Supplier", responder: "Supplier", required: false, critical: false, attribute: "", responseType: "Yes / No", options: "" })}
            hint="Asked on every vendor's Qualification tab after the rule-set questions. A critical Yes / No question answered No blocks final approval. Changes save immediately."
            cols={[{ key: "question", label: "Question", width: 300 }, { key: "status", label: "Status", type: "select", options: ["Active", "Inactive"] }, { key: "level", label: "Level", type: "select", options: ["Supplier", "Contractor"] },
              { key: "responder", label: "Responder", type: "select", options: ["Supplier", "Internal"] }, { key: "required", label: "Required", type: "check", width: 60 }, { key: "critical", label: "Critical", type: "check", width: 60 },
              { key: "responseType", label: "Response type", type: "select", options: ["Yes / No", "Number", "Text", "Choice"], width: 110 }]} />
        </div>
      )}
      {edit && (() => {
        const err = edit.kind === "cat" ? catErr(edit.rows) : rateErr(edit.rows);
        return (
          <Modal open onClose={() => setEdit(null)} width={1080} title={edit.kind === "cat" ? "Edit categories" : "Edit standard rates"}
            footer={<>{err && <span className="mr-auto text-[12px] text-red-600">{err}</span>}<Btn onClick={() => setEdit(null)}>Cancel</Btn><Btn variant="primary" disabled={!!err} onClick={() => {
              setState((s) => { if (edit.kind === "cat") s.categoryMaster = edit.rows.map((r) => ({ ...r, name: String(r.name).trim(), requalMonths: Number(r.requalMonths) })); else s.rateMaster = edit.rows.map((r, i) => ({ ...r, id: r.id || `SR-${String(i + 1).padStart(3, "0")}`, item: String(r.item).trim(), rate: Number(r.rate), tolerancePct: Number(r.tolerancePct) || 0 })); },
                { entity: "Master", id: edit.kind === "cat" ? "Categories" : "Standard rates", action: `${edit.rows.length} ${edit.kind === "cat" ? "categories" : "standard rates"} saved` });
              toast("Saved"); setEdit(null);
            }}>Save</Btn></>}>
            {edit.kind === "cat" ? (
              <TableEditor title="Categories" rows={edit.rows} onChange={(rows) => setEdit({ ...edit, rows })} blank={() => ({ code: `CAT-${String(edit.rows.length + 1).padStart(2, "0")}`, name: "", type: "Works", group: "", requalMonths: 12, docs: "", owner: "Procurement", status: "Active" })}
                cols={[{ key: "code", label: "Code", width: 80 }, { key: "name", label: "Category", width: 180 }, { key: "type", label: "Type", type: "select", options: CATEGORY_TYPES, width: 100 }, { key: "group", label: "Supplier group", width: 150 },
                  { key: "requalMonths", label: "Requalify (months)", type: "number", width: 90 }, { key: "docs", label: "Mandatory documents", width: 200 }, { key: "owner", label: "Owner", width: 110 }, { key: "status", label: "Status", type: "select", options: ["Active", "Inactive"], width: 100 }]} />
            ) : (
              <TableEditor title="Standard rates" rows={edit.rows} onChange={(rows) => setEdit({ ...edit, rows })} blank={() => ({ id: "", item: "", unit: "nos", category: "", rate: "", tolerancePct: 5, validFrom: todayISO(), validTo: shiftDays(365), source: "Budget", status: "Active" })}
                cols={[{ key: "item", label: "Item", width: 190 }, { key: "unit", label: "Unit", width: 60 }, { key: "category", label: "Category", type: "select", options: cats.map((c) => c.name), width: 150 }, { key: "rate", label: "Rate (₹)", type: "number", width: 100 },
                  { key: "tolerancePct", label: "Tol. %", type: "number", width: 70 }, { key: "validFrom", label: "Valid from", width: 105 }, { key: "validTo", label: "Valid to", width: 105 }, { key: "source", label: "Source", type: "select", options: ["Budget", "Rate contract", "Last purchase", "Market survey"], width: 120 }, { key: "status", label: "Status", type: "select", options: ["Active", "Inactive"], width: 90 }]} />
            )}
          </Modal>
        );
      })()}
    </Page>
  );
}

// ---------------------------------------------------------------- direct award (no RFQ)
const DA_REASONS = ["Single source", "Proprietary item", "Emergency", "Repeat order at agreed rate", "Below competitive threshold", "Group company"];
const DA_STRONG = ["Single source", "Proprietary item", "Emergency", "Group company"];
const daValue = (d) => sum(d.items || [], (i) => (Number(i.qty) || 0) * (Number(i.rate) || 0));
function daErrors(st, f) {
  const e = {}, set0 = settingsOf(st), v = byId(st.vendors, f.vendorId);
  if (!f.vendorId) e.vendor = "Select the vendor";
  else if (!eligibleForPo(v)) e.vendor = `${v.name} can't receive a PO (${v.status}${v.regTier !== "Spend Authorized" ? `, ${v.regTier}` : ""}${v.frozen ? ", frozen" : ""})`;
  else { const g = sourcingGate(st, v, "po"); if (g.block) e.vendor = `${v.name}: ${g.issues.join(" · ")}`; }
  if (!f.justification) e.justification = "Choose the justification";
  if (String(f.reason || "").trim().length < 10) e.reason = "Explain why there is no RFQ (min 10 characters)";
  if (!(f.items || []).length || f.items.some((i) => !String(i.desc).trim() || !(Number(i.qty) > 0) || !(Number(i.rate) > 0))) e.items = "Every line needs an item, quantity and rate";
  const val = daValue(f);
  if (val > (Number(set0.directAwardLimit) || 0) && !DA_STRONG.includes(f.justification)) e.justification = `Above ${inrShort(set0.directAwardLimit)} — only single source, proprietary, emergency or group company can skip the RFQ`;
  if (f.justification === "Group company" && v && !isGroupCompany(v)) e.justification = `${v.name} is not a group company`;
  if (set0.rateVarianceAction === "Stop") { const over = (f.items || []).map((i) => rateVariance(st, i.desc, i.rate)).find((x) => x && x.over); if (over) e.items = `${over.std.item}: ${over.pct}% above the standard rate ${inr(over.std.rate)} (Stop)`; }
  return e;
}
function DirectAwardModal({ preset, onClose }) {
  const st = useStore();
  const [f, setF] = y.useState(() => ({ requisitionId: "", vendorId: "", project: PROJECTS[0], justification: "", reason: "", quoteRef: "", deliveryDate: shiftDays(14), items: [{ desc: "", unit: "nos", qty: "", rate: "" }], ...(preset || {}) }));
  const e = daErrors(st, f), val = daValue(f), set0 = settingsOf(st);
  const reqs = (st.requisitions || []).filter((r) => r.status === "Approved" && r.purpose !== "Manpower (labour)");
  const fromReq = (id) => { const r = byId(st.requisitions, id); setF({ ...f, requisitionId: id, ...(r ? { project: r.project, items: r.items.map((i) => ({ desc: i.desc, unit: i.unit, qty: i.qty, rate: i.rate || "" })) } : {}) }); };
  const setI = (i, k, x) => setF({ ...f, items: f.items.map((l, j) => (j === i ? { ...l, [k]: x } : l)) });
  const save = () => {
    setState((s) => { s.directAwards = s.directAwards || []; const id = nextId("DA", s.directAwards);
      s.directAwards.unshift({ ...f, id, reason: f.reason.trim(), value: val, date: todayISO(), raisedBy: currentUser(), status: "Pending Approval", items: f.items.map((i) => ({ desc: i.desc.trim(), unit: i.unit, qty: Number(i.qty), rate: Number(i.rate) })) });
      if (f.requisitionId) { const r = byId(s.requisitions, f.requisitionId); r.directAwardIds = [...(r.directAwardIds || []), id]; } },
      { entity: "Direct award", id: nextId("DA", st.directAwards || []), action: `Raised for ${vendorName(st, f.vendorId)} — ${f.justification}: ${f.reason.trim()}${f.requisitionId ? ` (from ${f.requisitionId})` : ""}` });
    toast("Direct award sent for approval"); onClose();
  };
  const errs = Object.values(e).filter(Boolean);
  return (
    <Modal open onClose={onClose} width={880} title="New direct award" subtitle="Award without an RFQ — the justification is approved before a PO can be raised"
      footer={<>{errs[0] && <span className="mr-auto max-w-[480px] truncate text-[12px] text-red-600" title={errs.join("\n")}>{errs[0]}</span>}<span className="text-[13px]">Value <b className="num">{inr(val)}</b></span><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={errs.length > 0} onClick={save}>Submit for approval</Btn></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <Field label="From requisition"><Select value={f.requisitionId} placeholder="— none —" onChange={fromReq} options={reqs.map((r) => ({ value: r.id, label: `${r.id} — ${itemsSummary(r.items)}` }))} /></Field>
          <Field label="Vendor" required><Select value={f.vendorId} placeholder="Select vendor…" onChange={(x) => setF({ ...f, vendorId: x })} options={st.vendors.filter(eligibleForPo).map((v) => ({ value: v.id, label: v.name }))} /><FieldErr m={e.vendor} /></Field>
          <Field label="Project"><Select value={f.project} onChange={(x) => setF({ ...f, project: x })} options={PROJECTS} /></Field>
          <Field label="Justification" required><Select value={f.justification} placeholder="Select…" onChange={(x) => setF({ ...f, justification: x })} options={DA_REASONS} /><FieldErr m={e.justification} /></Field>
          <Field label="Vendor quote / reference"><TextInput value={f.quoteRef} onChange={(x) => setF({ ...f, quoteRef: x })} placeholder="e.g. Q-2231 dated 28 Sep" /></Field>
          <Field label="Delivery by"><DateInput value={f.deliveryDate} onChange={(x) => setF({ ...f, deliveryDate: x })} /></Field>
          <Field label="Why no RFQ" required span={3}><TextInput value={f.reason} onChange={(x) => setF({ ...f, reason: x })} placeholder="e.g. OEM spares — only the OEM distributor can supply" /><FieldErr m={e.reason} /></Field>
        </div>
        <p className="text-[12px] text-ink-mute">Direct awards up to {inrShort(set0.directAwardLimit)} can use any justification; above it only single source, proprietary, emergency or group company (Procurement Settings → direct award limit).</p>
        <Section title="Lines" actions={<Btn size="sm" icon={Icon.plus} onClick={() => setF({ ...f, items: [...f.items, { desc: "", unit: "nos", qty: "", rate: "" }] })}>Add line</Btn>}>
          <div className="space-y-2 p-3">
            {f.items.map((l, i) => { const rv = rateVariance(st, l.desc, l.rate); return (
              <div key={i} className="grid grid-cols-[1fr_90px_110px_130px_28px] items-start gap-2">
                <div><TextInput value={l.desc} onChange={(x) => setI(i, "desc", x)} placeholder="Item" />{rv && <span className={cls("mt-1 block text-[11px]", rv.over ? "text-red-600" : "text-green-700")}>Standard rate {inr(rv.std.rate)} ({rv.pct > 0 ? "+" : ""}{rv.pct}%{rv.over ? `, above the ${rv.std.tolerancePct || 0}% tolerance` : ""})</span>}</div>
                <TextInput value={l.unit} onChange={(x) => setI(i, "unit", x)} /><NumInput value={l.qty} onChange={(x) => setI(i, "qty", x)} placeholder="Qty" /><NumInput value={l.rate} onChange={(x) => setI(i, "rate", x)} placeholder="Rate" />
                <IconBtn icon={Icon.trash} title="Remove line" onClick={() => f.items.length > 1 && setF({ ...f, items: f.items.filter((_, j) => j !== i) })} />
              </div>); })}
            <FieldErr m={e.items} />
          </div>
        </Section>
      </div>
    </Modal>
  );
}
function decideDirectAward(d, approve, remark) {
  if (d.status !== "Pending Approval") return false;
  if (!approve && String(remark || "").trim().length < 5) { toast("Give a reason to reject (min 5 characters)", "red"); return false; }
  if (approve) { const e = daErrors(getState(), d); if (e.vendor) { toast(`Can't approve — ${e.vendor}`, "red"); return false; } }
  setState((s) => Object.assign(byId(s.directAwards, d.id), { status: approve ? "Approved" : "Rejected", decidedBy: currentUser(), decidedAt: new Date().toISOString(), remark: remark || "" }),
    { entity: "Direct award", id: d.id, action: approve ? "Approved — PO can be raised" : `Rejected — ${remark}` });
  toast(approve ? `${d.id} approved — raise the PO` : `${d.id} rejected`, approve ? "green" : "red");
  return true;
}
function DirectAwardsPage() {
  const st = useStore(), nav = useNavigate(), loc = Ht();
  const [open, setOpen] = useQueryOpen();
  const [create, setCreate] = y.useState(() => { const m = loc.search.match(/fromReq=([\w-]+)/); if (!m) return null; const r = byId(st.requisitions || [], m[1]); return r ? { requisitionId: r.id, project: r.project, items: r.items.map((i) => ({ desc: i.desc, unit: i.unit, qty: i.qty, rate: i.rate || "" })) } : {}; });
  const [po, setPo] = y.useState(null), [rej, setRej] = y.useState(null);
  const rows = st.directAwards || [];
  const d = open && byId(rows, open);
  return (
    <Page title="Direct Awards" subtitle="Awards without an RFQ — single source, proprietary, emergency or below the competitive threshold — approved before the PO" icon={Icon.target}
      actions={<Btn variant="primary" icon={Icon.plus} onClick={() => setCreate({})}>New direct award</Btn>}>
      <div className="grid grid-cols-4 gap-3 px-4 pt-4">
        <StatTile tone="amber" label="Awaiting approval" value={rows.filter((x) => x.status === "Pending Approval").length} icon={Icon.clock} />
        <StatTile tone="blue" label="Approved — PO to raise" value={rows.filter((x) => x.status === "Approved").length} icon={Icon.package} />
        <StatTile tone="green" label="Ordered" value={rows.filter((x) => x.status === "Ordered").length} sub={inrShort(sum(rows.filter((x) => x.status === "Ordered"), (x) => x.value))} icon={Icon.check} />
        <StatTile tone="purple" label="Share of spend" value={`${pct(sum(rows.filter((x) => x.status === "Ordered"), (x) => x.value), sum(st.purchaseOrders.filter((p) => p.status !== "Cancelled"), poValue))}%`} sub="of PO value without an RFQ" icon={Icon.percent} />
      </div>
      <DataTable noun="direct awards" rows={rows} onRow={(x) => setOpen(x.id)} empty={<EmptyState icon={Icon.target} title="No direct awards" text="Raise one from an approved requisition or here." />} columns={[
        { key: "id", label: "ID", className: "mono text-[12px]" }, { key: "date", label: "Date", render: (x) => fmtDate(x.date) },
        { key: "vendor", label: "Vendor", filterOptions: FO.vendors, filter: (x) => vendorName(st, x.vendorId), render: (x) => <span className="font-medium">{vendorName(st, x.vendorId)}</span> },
        { key: "what", label: "Items", render: (x) => <span className="text-[12.5px]">{itemsSummary(x.items)}</span> },
        { key: "justification", label: "Justification", filterOptions: DA_REASONS, filter: true },
        { key: "value", label: "Value", align: "right", num: true, sort: (x) => x.value, render: (x) => inrShort(x.value) },
        { key: "req", label: "Requisition", render: (x) => x.requisitionId || "—" }, { key: "po", label: "PO", render: (x) => (x.poId ? <RefLink to={`${VM_BASE}/purchase-orders?open=${x.poId}`}>{x.poId}</RefLink> : "—") },
        { key: "status", label: "Status", filterOptions: ["Pending Approval", "Approved", "Ordered", "Rejected"], filter: true, render: (x) => <Status>{x.status}</Status> },
      ]} />
      {d && (
        <Drawer open onClose={() => setOpen(null)} width={760} title={`${d.id} — direct award`} subtitle={<><Status>{d.status}</Status><span>{vendorName(st, d.vendorId)}</span><span>· {inr(d.value)}</span></>}
          actions={<>
            {d.status === "Pending Approval" && <><Btn variant="danger" onClick={() => setRej({ remark: "" })}>Reject</Btn><Btn variant="success" onClick={() => decideDirectAward(d, true)}>Approve</Btn></>}
            {d.status === "Approved" && <Btn variant="primary" icon={Icon.package} onClick={() => setPo({ vendorId: d.vendorId, project: d.project, deliveryDate: d.deliveryDate, requisitionId: d.requisitionId || null, directAwardId: d.id, lines: d.items.map((i) => ({ ...i })) })}>Create PO</Btn>}
          </>}>
          <div className="space-y-4 px-6 py-5">
            <Section title="Award" icon={Icon.info}>
              <KV items={[["Vendor", vendorName(st, d.vendorId)], ["Project", d.project], ["Justification", d.justification], ["Why no RFQ", d.reason], ["Quote reference", d.quoteRef || "—"], ["Delivery by", fmtDate(d.deliveryDate)],
                ["Requisition", d.requisitionId ? <RefLink to={`${VM_BASE}/requisitions?open=${d.requisitionId}`}>{d.requisitionId}</RefLink> : "—"], ["Raised", `${d.raisedBy} · ${fmtDate(d.date)}`],
                ["Decision", d.decidedBy ? `${d.status === "Rejected" ? "Rejected" : "Approved"} by ${d.decidedBy} · ${fmtDate(d.decidedAt)}${d.remark ? ` — ${d.remark}` : ""}` : "Pending"], ["PO", d.poId ? <RefLink to={`${VM_BASE}/purchase-orders?open=${d.poId}`}>{d.poId}</RefLink> : "—"]]} />
            </Section>
            <Section title="Lines" icon={Icon.boxes}>
              <DataTable dense rows={d.items} rowKey={(x) => x.desc} columns={[{ key: "desc", label: "Item" }, { key: "unit", label: "Unit" }, { key: "qty", label: "Qty", align: "right", num: true }, { key: "rate", label: "Rate", align: "right", render: (x) => inr(x.rate) },
                { key: "std", label: "Standard rate", align: "right", render: (x) => { const rv = rateVariance(st, x.desc, x.rate); return rv ? <span className={rv.over ? "text-red-600" : ""}>{inr(rv.std.rate)} ({rv.pct > 0 ? "+" : ""}{rv.pct}%)</span> : "—"; } }]} />
            </Section>
          </div>
        </Drawer>
      )}
      {rej && (
        <Modal open onClose={() => setRej(null)} width={480} title={`Reject ${d.id}`} footer={<><Btn onClick={() => setRej(null)}>Cancel</Btn><Btn variant="danger" disabled={rej.remark.trim().length < 5} onClick={() => decideDirectAward(d, false, rej.remark.trim()) && setRej(null)}>Reject</Btn></>}>
          <Field label="Reason" required><TextInput value={rej.remark} onChange={(x) => setRej({ remark: x })} placeholder="e.g. Run an RFQ — two other approved suppliers" /></Field>
        </Modal>
      )}
      {create && <DirectAwardModal preset={create} onClose={() => setCreate(null)} />}
      <NewPoModal open={!!po} preset={po} onClose={() => setPo(null)} onCreated={(id) => { setPo(null); nav(`${VM_BASE}/purchase-orders?open=${id}`); }} />
    </Page>
  );
}

// Sourcing routes on an approved requisition: RFQ, direct award, or a call-off on an active rate contract
function reqRateContracts(st, r) {
  const descs = (r.items || []).map((i) => String(i.desc).toLowerCase()).filter(Boolean);
  return st.blanketOrders.filter((b) => blanketStatus(st, b) === "Active").map((b) => ({ b, hits: blanketUsage(st, b).filter((l) => l.remaining > 0 && descs.some((d) => d.includes(l.desc.toLowerCase()) || l.desc.toLowerCase().includes(d))) })).filter((x) => x.hits.length);
}
