// Site execution controls: quality / HSE inspection with NCR → rework → re-inspection,
// contractor equipment register and deployment, free-issue material with automatic RA
// recovery, daily progress reports, contractor JMS co-signing and the WBS cost view.

const INSPECTOR_ROLES = ["Site Engineer", "HSE Officer", "Project Manager"];

// ---------------------------------------------------------------- inspection & NCR
function inspectMeasurement(m, pass, ncr) {
  if (!tryAct(INSPECTOR_ROLES, [m.recordedBy], "the quality inspection")) return false;
  if (!pass && !(ncr?.desc || "").trim()) { toast("Describe the non-conformance", "red"); return false; }
  let ncrId = null;
  setState((s) => {
    const x = byId(s.measurements, m.id);
    if (pass) x.qc = { status: "Passed", by: currentUser(), at: new Date().toISOString() };
    else {
      s.ncrs = s.ncrs || []; ncrId = nextId("NCR", s.ncrs);
      s.ncrs.unshift({ id: ncrId, woId: m.woId, mbId: m.id, category: ncr.category || "Quality", severity: ncr.severity || "Major", desc: ncr.desc.trim(), raisedBy: currentUser(), raisedOn: todayISO(), status: "Open", history: [{ at: new Date().toISOString(), by: currentUser(), what: "Raised", note: "" }] });
      x.qc = { status: "Failed", by: currentUser(), at: new Date().toISOString(), ncrId };
    }
  }, { entity: "Measurement", id: m.id, action: pass ? "Quality inspection passed" : `Inspection failed - NCR raised` });
  toast(pass ? `${m.id} passed inspection - billable` : `${ncrId} raised - rework needed before billing`, pass ? "green" : "amber");
  return true;
}
function raiseNcr(woId, f) {
  if (!tryAct(INSPECTOR_ROLES, [], "raising an NCR")) return false;
  setState((s) => { s.ncrs = s.ncrs || []; const id = nextId("NCR", s.ncrs); s.ncrs.unshift({ id, woId, mbId: null, category: f.category, severity: f.severity, desc: f.desc.trim(), raisedBy: currentUser(), raisedOn: todayISO(), status: "Open", history: [{ at: new Date().toISOString(), by: currentUser(), what: "Raised", note: "" }] }); },
    { entity: "Work Order", id: woId, action: `${f.category} NCR raised - ${f.desc}` });
  toast("NCR raised - certification of this work order's bills is paused until it closes", "amber");
  return true;
}
// Open → Rework Done (contractor) → Closed (re-inspection passed) | back to Open (re-inspection failed)
function advanceNcr(n, what, note, by) {
  if (what !== "Rework done" && !tryAct(INSPECTOR_ROLES, [], "re-inspection")) return false;
  setState((s) => {
    const x = byId(s.ncrs, n.id);
    x.status = what === "Rework done" ? "Rework Done" : what === "Closed" ? "Closed" : "Open";
    x.history.push({ at: new Date().toISOString(), by: by || currentUser(), what, note: note || "" });
    if (what === "Closed") { x.closedOn = todayISO(); if (x.mbId) { const m = byId(s.measurements, x.mbId); if (m) m.qc = { status: "Passed", by: currentUser(), at: new Date().toISOString(), afterNcr: x.id }; } }
  }, { entity: "NCR", id: n.id, action: `${what}${note ? ` - ${note}` : ""}` });
  toast({ "Rework done": "Rework recorded - waiting for re-inspection", Closed: `${n.id} closed`, "Re-inspection failed": `${n.id} reopened - more rework needed` }[what], what === "Closed" ? "green" : "amber");
  return true;
}
function NcrModal({ woId, mb, onClose }) {
  const [f, setF] = y.useState({ category: "Quality", severity: "Major", desc: "" });
  return (
    <Modal open onClose={onClose} width={520} title={mb ? `Inspection failed - ${mb.id}` : `Raise NCR on ${woId}`} subtitle="A non-conformance report blocks billing of the item and QS certification until it is closed after re-inspection"
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="danger" disabled={!f.desc.trim()} onClick={() => { if (mb ? inspectMeasurement(mb, false, f) : raiseNcr(woId, f)) onClose(); }}>Raise NCR</Btn></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category"><Select value={f.category} onChange={(x) => setF({ ...f, category: x })} options={["Quality", "HSE"]} /></Field>
        <Field label="Severity"><Select value={f.severity} onChange={(x) => setF({ ...f, severity: x })} options={["Minor", "Major", "Critical"]} /></Field>
        <Field label="Non-conformance" required span={2}><TextArea value={f.desc} onChange={(x) => setF({ ...f, desc: x })} placeholder="e.g. Honeycombing at slab soffit, grid A4–A6" /></Field>
      </div>
    </Modal>
  );
}
function NcrTable({ rows, portal, by }) {
  const st = useStore();
  const [act, setAct] = y.useState(null);
  return (
    <>
      <DataTable noun="NCRs" rows={rows} empty={<EmptyState icon={Icon.check} title="No non-conformances" text="Failed inspections and HSE observations appear here." />} columns={[
        { key: "id", label: "NCR", className: "mono text-[12px]" },
        { key: "wo", label: "Work order", render: (n) => `${n.woId}${n.mbId ? ` · ${n.mbId}` : ""}` },
        { key: "category", label: "Type", filterOptions: ["Quality", "HSE"], filter: true },
        { key: "severity", label: "Severity", filterOptions: ["Minor", "Major", "Critical"], filter: true, render: (n) => <Status tone={{ Minor: "gray", Major: "amber", Critical: "red" }[n.severity]}>{n.severity}</Status> },
        { key: "desc", label: "Non-conformance", className: "max-w-[320px] whitespace-normal text-[12.5px]" },
        { key: "r", label: "Raised", render: (n) => `${fmtDate(n.raisedOn)} · ${n.raisedBy}` },
        { key: "s", label: "Status", filterOptions: FO.ncrStatus, filter: (n) => n.status, render: (n) => <Status tone={{ Open: "red", "Rework Done": "blue", Closed: "green" }[n.status]}>{n.status}</Status> },
        { key: "a", label: "", align: "right", render: (n) => (
          <span className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            {n.status === "Open" && <Btn size="sm" onClick={() => setAct({ n, what: "Rework done", note: "" })}>Rework done</Btn>}
            {n.status === "Rework Done" && !portal && <><Btn size="sm" variant="success" onClick={() => setAct({ n, what: "Closed", note: "" })}>Re-inspect: pass</Btn><Btn size="sm" variant="danger" onClick={() => setAct({ n, what: "Re-inspection failed", note: "" })}>Fail</Btn></>}
          </span>) },
      ]} />
      {act && (
        <Modal open onClose={() => setAct(null)} width={460} title={`${act.what} - ${act.n.id}`}
          footer={<><Btn onClick={() => setAct(null)}>Cancel</Btn><Btn variant={act.what === "Re-inspection failed" ? "danger" : "primary"} disabled={act.what !== "Closed" && !act.note.trim()} onClick={() => { if (advanceNcr(act.n, act.what, act.note.trim(), portal ? by : undefined)) setAct(null); }}>Save</Btn></>}>
          <Field label={act.what === "Rework done" ? "What was reworked" : "Inspection remark"} required={act.what !== "Closed"}><TextArea value={act.note} onChange={(x) => setAct({ ...act, note: x })} /></Field>
        </Modal>
      )}
    </>
  );
}

// ---------------------------------------------------------------- contractor JMS co-sign (portal)
function contractorJms(m, agree, remark, by) {
  setState((s) => {
    const x = byId(s.measurements, m.id);
    if (agree) x.jms = { ...x.jms, contractorAgreed: { by, at: new Date().toISOString() } };
    else x.jms = { status: "Disputed", remark: `Contractor: ${remark}`, at: new Date().toISOString(), by };
  }, { entity: "Measurement", id: m.id, action: agree ? `Contractor agreed the measurement in the portal (${by})` : `Contractor disputed in the portal - ${remark}` });
  toast(agree ? "Agreed - the engineer countersigns the JMS" : "Dispute sent to the site engineer", agree ? "green" : "amber");
}

// ---------------------------------------------------------------- equipment
function EquipmentRegister({ v, locked, approving }) {
  const [f, setF] = y.useState(null), [rej, setRej] = y.useState(null);
  // the approver verifies each machine (fitness / insurance papers); additions happen on the vendor record
  const setEq = (id, patch, action) => setState((s) => Object.assign(byId(s.vendors, v.id).equipment.find((e) => e.id === id), patch), { entity: "Vendor", id: v.id, action });
  const list = v.equipment || [];
  const inUse = (eqId) => getState().workOrders.find((w) => (w.equipment || []).some((d) => d.eqId === eqId && !d.to) && ["Issued", "In Progress", "Suspended"].includes(w.status));
  return (
    <Section title="Equipment register" icon={Icon.truck} actions={!locked && !approving && <Btn size="sm" icon={Icon.plus} onClick={() => setF({ name: "", type: "Excavator", regNo: "", capacity: "", ownership: "Owned", fitnessExpiry: shiftDays(180) })}>Add equipment</Btn>}>
      <DataTable dense rows={list} empty={<p className="p-4 text-[13px] text-ink-mute">No equipment registered. Contractors list their plant here; work orders deploy from this register.</p>} columns={[
        { key: "name", label: "Equipment", className: "font-medium" }, { key: "type", label: "Type" }, { key: "regNo", label: "Reg. / serial no.", className: "mono text-[12px]" },
        { key: "capacity", label: "Capacity" }, { key: "ownership", label: "Owned / hired" },
        { key: "fit", label: "Fitness / insurance till", render: (e) => <ExpiryCell iso={e.fitnessExpiry} /> },
        { key: "u", label: "Deployed on", render: (e) => { const w = inUse(e.id); return w ? <RefLink to={`${CL_BASE}/work-orders?open=${w.id}`}>{w.id}</RefLink> : <span className="text-ink-faint">Available</span>; } },
        { key: "vf", label: "Verification", render: (e) => <span title={e.verify?.remark || undefined}><Status tone={{ Verified: "green", Rejected: "red" }[e.verify?.status] || "amber"}>{e.verify?.status || "Unverified"}</Status></span> },
        ...(approving ? [{ key: "a", label: "", align: "right", render: (e) => e.verify?.status !== "Verified" && (
          <span className="flex justify-end gap-1">
            <Btn size="sm" variant="success" onClick={() => { setEq(e.id, { verify: { status: "Verified", by: currentUser(), at: todayISO() } }, `Equipment ${e.name} verified`); toast("Equipment verified"); }}>Verify</Btn>
            {e.verify?.status !== "Rejected" && <Btn size="sm" variant="danger" onClick={() => setRej(e)}>Reject</Btn>}
          </span>) }] : []),
      ]} />
      {rej && <RejectReasonModal title={`Reject - ${rej.name}`} onClose={() => setRej(null)} onReject={(reason) => setEq(rej.id, { verify: { status: "Rejected", remark: reason, by: currentUser(), at: todayISO() } }, `Equipment ${rej.name} rejected - ${reason}`)} />}
      {f && (
        <Modal open onClose={() => setF(null)} width={620} title="Add equipment" footer={<><Btn onClick={() => setF(null)}>Cancel</Btn><Btn variant="primary" disabled={!f.name.trim() || !f.regNo.trim() || !f.fitnessExpiry} onClick={() => {
          setState((s) => { const x = byId(s.vendors, v.id); x.equipment = x.equipment || []; const all = s.vendors.flatMap((z) => z.equipment || []); x.equipment.push({ ...f, id: nextId("EQ", all), status: "Available" }); }, { entity: "Vendor", id: v.id, action: `Equipment added - ${f.name} (${f.regNo})` });
          toast("Equipment added"); setF(null);
        }}>Save</Btn></>}>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Equipment" required span={2}><TextInput value={f.name} onChange={(x) => setF({ ...f, name: x })} placeholder="e.g. Excavator (Komatsu PC210)" /></Field>
            <Field label="Type"><Select value={f.type} onChange={(x) => setF({ ...f, type: x })} options={["Excavator", "Crane", "Compactor", "Pump", "Tipper", "Rebar", "Stringing", "DG set", "Other"]} /></Field>
            <Field label="Reg. / serial no." required><TextInput value={f.regNo} onChange={(x) => setF({ ...f, regNo: x })} /></Field>
            <Field label="Capacity"><TextInput value={f.capacity} onChange={(x) => setF({ ...f, capacity: x })} /></Field>
            <Field label="Owned / hired"><Select value={f.ownership} onChange={(x) => setF({ ...f, ownership: x })} options={["Owned", "Hired"]} /></Field>
            <Field label="Fitness / insurance valid till" required><DateInput value={f.fitnessExpiry} onChange={(x) => setF({ ...f, fitnessExpiry: x })} /></Field>
          </div>
        </Modal>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------- work-order resources: equipment, workforce, material, daily progress
function WoResources({ wo }) {
  const st = useStore();
  const v = byId(st.vendors, wo.vendorId);
  const [eq, setEq] = y.useState(""), [mi, setMi] = y.useState(null), [dpr, setDpr] = y.useState(null), [ncr, setNcr] = y.useState(false);
  const open = ["Issued", "In Progress", "Suspended"].includes(wo.status);
  // while suspended, equipment can be released and hindrances reported, but nothing new is deployed or issued
  const active = ["Issued", "In Progress"].includes(wo.status);
  const dep = wo.equipment || [];
  const reg = v.equipment || [];
  const onSite = dep.filter((d) => !d.to).map((d) => ({ ...d, e: reg.find((x) => x.id === d.eqId) })).filter((d) => d.e);
  const free = reg.filter((e) => !st.workOrders.some((w) => (w.equipment || []).some((d) => d.eqId === e.id && !d.to) && ["Issued", "In Progress", "Suspended"].includes(w.status)));
  const workers = st.workers.filter((w) => w.woId === wo.id && w.active);
  const issues = (st.materialIssues || []).filter((m) => m.woId === wo.id);
  const dprs = (st.dprs || []).filter((d) => d.woId === wo.id).slice().sort((a, b) => b.date.localeCompare(a.date));
  const ncrs = (st.ncrs || []).filter((n) => n.woId === wo.id);
  const deploy = () => {
    const e = reg.find((x) => x.id === eq);
    if (daysUntil(e.fitnessExpiry) < 0) return toast(`${e.name}: fitness / insurance expired ${fmtDate(e.fitnessExpiry)} - can't deploy`, "red");
    setState((s) => { const w = byId(s.workOrders, wo.id); w.equipment = [...(w.equipment || []), { eqId: eq, from: todayISO(), to: null }]; }, { entity: "Work Order", id: wo.id, action: `Equipment deployed - ${e.name}` });
    setEq("");
  };
  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
        <Section title={`Equipment on site (${onSite.length})`} icon={Icon.truck}>
          <ul className="divide-y divide-line">
            {onSite.length === 0 && <li className="p-3 text-[12.5px] text-ink-mute">No equipment deployed.</li>}
            {onSite.map((d) => (
              <li key={d.eqId} className="flex items-center justify-between gap-2 px-4 py-2 text-[12.5px]">
                <span><b className="font-medium">{d.e.name}</b> <span className="mono text-ink-mute">{d.e.regNo}</span><span className="block text-[11.5px] text-ink-mute">since {fmtDate(d.from)} · fitness {fmtDate(d.e.fitnessExpiry)}{daysUntil(d.e.fitnessExpiry) < 0 && <b className="text-red-600"> - expired</b>}</span></span>
                {open && <Btn size="sm" onClick={() => setState((s) => { const w = byId(s.workOrders, wo.id); w.equipment.find((x) => x.eqId === d.eqId && !x.to).to = todayISO(); }, { entity: "Work Order", id: wo.id, action: `Equipment released - ${d.e.name}` })}>Release</Btn>}
              </li>
            ))}
          </ul>
          {active && (
            <div className="grid gap-2 border-t border-line p-3" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
              <Select value={eq} placeholder={reg.length ? "Deploy from contractor's register…" : "Contractor has no equipment registered"} disabled={!free.length} onChange={setEq} options={free.map((e) => ({ value: e.id, label: `${e.name} · ${e.regNo}` }))} />
              <Btn disabled={!eq} title={eq ? "" : "Pick equipment from the contractor's register first"} onClick={deploy}>Deploy</Btn>
            </div>
          )}
        </Section>
        <Section title="Workforce" icon={Icon.users}>
          <KV cols={2} items={[["Workers registered on this WO", workers.length || "-"], ["Latest daily manpower", dprs[0] ? `${dprs[0].manpower} (${fmtDate(dprs[0].date)})` : "-"], ["Skilled / unskilled", workers.length ? `${workers.filter((w) => w.skill !== "Unskilled").length} / ${workers.filter((w) => w.skill === "Unskilled").length}` : "-"], ["Attendance", workers.length ? <RefLink to={`${CL_BASE}/attendance`}>Labour Attendance →</RefLink> : "Not tracked worker-wise"]]} />
        </Section>
      </div>
      <Section title="Material issued to the contractor (recovered through RA bills)" icon={Icon.package} actions={active && <Btn size="sm" icon={Icon.plus} onClick={() => setMi({ material: "", unit: "bag", qty: "", rate: "", date: todayISO() })}>Issue material</Btn>}>
        <DataTable dense rows={issues} empty={<p className="p-4 text-[13px] text-ink-mute">No free-issue material.</p>} columns={[
          { key: "id", label: "Issue", className: "mono text-[12px]" }, { key: "date", label: "Date", render: (m) => fmtDate(m.date) }, { key: "material", label: "Material" },
          { key: "q", label: "Qty", align: "right", num: true, render: (m) => `${num(m.qty)} ${m.unit}` }, { key: "r", label: "Recovery rate", align: "right", num: true, render: (m) => inr(m.rate) },
          { key: "v", label: "Value", align: "right", num: true, render: (m) => inr(m.qty * m.rate) },
          { key: "st", label: "From → to", className: "text-[12px]", render: (m) => [m.fromStore, m.toStore].filter(Boolean).join(" → ") || "-" },
          { key: "rec", label: "Recovered in", render: (m) => (m.recoveredIn ? <RefLink to={`${CL_BASE}/ra-bills?open=${m.recoveredIn}`}>{m.recoveredIn}</RefLink> : <Status tone="amber">Next RA bill</Status>) },
        ]} />
      </Section>
      <Section title="Daily progress reports" icon={Icon.calendar} actions={open && <Btn size="sm" icon={Icon.plus} onClick={() => setDpr({ date: todayISO(), manpower: "", work: "", hindrance: "", weather: "Clear" })}>Add daily report</Btn>}>
        <DataTable dense rows={dprs} empty={<p className="p-4 text-[13px] text-ink-mute">No daily reports yet.</p>} columns={[
          { key: "date", label: "Date", render: (d) => fmtDate(d.date) }, { key: "manpower", label: "Manpower", align: "right", num: true },
          { key: "work", label: "Work done", className: "max-w-[360px] whitespace-normal text-[12.5px]" }, { key: "hindrance", label: "Hindrance", className: "whitespace-normal text-[12px] text-amber-700", render: (d) => d.hindrance || "-" },
          { key: "weather", label: "Weather" }, { key: "by", label: "By", className: "text-[12px] text-ink-soft" },
        ]} />
      </Section>
      <Section title="Quality & HSE - NCRs" icon={Icon.shieldCheck} actions={open && <Btn size="sm" icon={Icon.plus} onClick={() => setNcr(true)}>Raise NCR</Btn>}>
        <NcrTable rows={ncrs} />
      </Section>
      {ncr && <NcrModal woId={wo.id} onClose={() => setNcr(false)} />}
      {mi && (
        <Modal open onClose={() => setMi(null)} width={560} title={`Issue material - ${wo.id}`} subtitle="Recovered automatically in the contractor's next RA bill"
          footer={<><Btn onClick={() => setMi(null)}>Cancel</Btn><Btn variant="primary" disabled={!mi.material.trim() || !(Number(mi.qty) > 0) || !(Number(mi.rate) > 0)} onClick={() => {
            setState((s) => { s.materialIssues = s.materialIssues || []; s.materialIssues.unshift({ id: nextId("MI", s.materialIssues), woId: wo.id, material: mi.material.trim(), unit: mi.unit, qty: Number(mi.qty), rate: Number(mi.rate), date: mi.date, issuedBy: currentUser(), recoveredIn: null, fromStore: mi.fromStore || "", toStore: mi.toStore || "", remarks: mi.remarks || "" }); }, { entity: "Work Order", id: wo.id, action: `Material issued - ${mi.qty} ${mi.unit} ${mi.material}` });
            toast("Material issue recorded"); setMi(null);
          }}>Save</Btn></>}>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Material" required span={3}><TextInput value={mi.material} onChange={(x) => setMi({ ...mi, material: x })} placeholder="e.g. OPC 53 cement (free issue)" /></Field>
            <Field label="Quantity" required><NumInput value={mi.qty} onChange={(x) => setMi({ ...mi, qty: x })} /></Field>
            <Field label="Unit"><Select value={mi.unit} onChange={(x) => setMi({ ...mi, unit: x })} options={["bag", "MT", "kg", "cum", "nos", "ltr", "m"]} /></Field>
            <Field label="Recovery rate (₹)" required><NumInput value={mi.rate} onChange={(x) => setMi({ ...mi, rate: x })} /></Field>
            <Field label="Date"><DateInput value={mi.date} onChange={(x) => setMi({ ...mi, date: x })} /></Field>
            <Field label="Issue from store"><Select value={mi.fromStore || ""} placeholder="-" onChange={(x) => setMi({ ...mi, fromStore: x })} options={settingsOf(getState()).stores} /></Field>
            <Field label="Contractor's site store (job worker store)"><TextInput value={mi.toStore || ""} onChange={(x) => setMi({ ...mi, toStore: x })} placeholder={`${vendorName(getState(), wo.vendorId)} - site shed`} /></Field>
            <Field label="Remarks"><TextInput value={mi.remarks || ""} onChange={(x) => setMi({ ...mi, remarks: x })} /></Field>
          </div>
        </Modal>
      )}
      {dpr && <DprModal wo={wo} f={dpr} setF={setDpr} by={currentUser()} />}
    </>
  );
}
function DprModal({ wo, f, setF, by }) {
  const dup = (getState().dprs || []).some((d) => d.woId === wo.id && d.date === f.date);
  const ok = f.date && f.date <= todayISO() && Number(f.manpower) >= 0 && f.manpower !== "" && f.work.trim() && !dup;
  return (
    <Modal open onClose={() => setF(null)} width={600} title={`Daily progress report - ${wo.id}`}
      footer={<><Btn onClick={() => setF(null)}>Cancel</Btn><Btn variant="primary" disabled={!ok} onClick={() => {
        setState((s) => { s.dprs = s.dprs || []; s.dprs.unshift({ id: nextId("DPR", s.dprs), woId: wo.id, date: f.date, manpower: Number(f.manpower), work: f.work.trim(), hindrance: f.hindrance.trim(), weather: f.weather, by }); }, { entity: "Work Order", id: wo.id, action: `Daily report ${fmtDate(f.date)} - ${f.manpower} workers` });
        toast("Daily report saved"); setF(null);
      }}>Save</Btn></>}>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Date" required><DateInput value={f.date} onChange={(x) => setF({ ...f, date: x })} /></Field>
        <Field label="Manpower on site" required><NumInput value={f.manpower} onChange={(x) => setF({ ...f, manpower: x })} /></Field>
        <Field label="Weather"><Select value={f.weather} onChange={(x) => setF({ ...f, weather: x })} options={["Clear", "Rain", "Heat", "Wind"]} /></Field>
        <Field label="Work done" required span={3}><TextArea rows={2} value={f.work} onChange={(x) => setF({ ...f, work: x })} /></Field>
        <Field label="Hindrances / delays" span={3}><TextInput value={f.hindrance} onChange={(x) => setF({ ...f, hindrance: x })} placeholder="e.g. Pump breakdown 2 h" /></Field>
      </div>
      {dup && <div className="mt-3"><Note tone="red">A report for {fmtDate(f.date)} already exists on this work order.</Note></div>}
      {f.date > todayISO() && <div className="mt-3"><Note tone="red">The date can't be in the future.</Note></div>}
    </Modal>
  );
}

// ---------------------------------------------------------------- WBS cost view (budget → committed → executed → billed → paid)
function WbsCostTab() {
  const st = useStore();
  const keys = new Set(Object.keys(st.wbsBudgets || {}));
  st.workOrders.filter((w) => w.wbs && w.status !== "Cancelled").forEach((w) => keys.add(`${w.project}|${w.wbs}`));
  const rows = [...keys].map((k) => {
    const [project, wbs] = k.split("|");
    const wos = st.workOrders.filter((w) => w.project === project && w.wbs === wbs && w.status !== "Cancelled");
    const pr = wos.map((w) => woProgress(st, w));
    const bills = st.raBills.filter((b) => wos.some((w) => w.id === b.woId) && b.status !== "Rejected");
    const budget = (st.wbsBudgets || {})[k] || 0, committed = sum(pr, (p) => p.value), executed = sum(pr, (p) => p.measured);
    return { k, project, wbs, budget, committed, executed, billed: sum(bills, (b) => b.gross), paid: sum(bills.filter((b) => b.status === "Paid"), (b) => b.gross), wos: wos.length };
  }).sort((a, b) => a.k.localeCompare(b.k));
  return (
    <DataTable noun="WBS elements" rowKey={(r) => r.k} rows={rows} columns={[
      { key: "project", label: "Project", filterOptions: FO.projects, filter: true },
      { key: "wbs", label: "WBS element", className: "font-medium" },
      { key: "wos", label: "WOs", align: "right" },
      { key: "budget", label: "Budget", align: "right", num: true, render: (r) => (r.budget ? inrShort(r.budget) : "-") },
      { key: "committed", label: "Committed (WO)", align: "right", num: true, render: (r) => <span className={cls(r.budget && r.committed > r.budget && "font-semibold text-red-600")}>{inrShort(r.committed)}</span> },
      { key: "executed", label: "Executed (measured)", align: "right", num: true, render: (r) => inrShort(r.executed) },
      { key: "billed", label: "Billed", align: "right", num: true, render: (r) => inrShort(r.billed) },
      { key: "paid", label: "Paid", align: "right", num: true, render: (r) => inrShort(r.paid) },
      { key: "u", label: "Budget used", render: (r) => (r.budget ? <Progress value={Math.round(pct(r.committed, r.budget))} color={r.committed > r.budget ? "bg-red-500" : "bg-brand"} /> : <span className="text-ink-faint">No budget</span>) },
    ]} />
  );
}
function DprTab() {
  const st = useStore();
  const rows = (st.dprs || []).slice().sort((a, b) => b.date.localeCompare(a.date));
  return (
    <DataTable noun="daily reports" rows={rows} columns={[
      { key: "date", label: "Date", render: (d) => fmtDate(d.date) },
      { key: "wo", label: "Work order", render: (d) => <RefLink to={`${CL_BASE}/work-orders?open=${d.woId}`}>{d.woId}</RefLink> },
      { key: "v", label: "Contractor", filterOptions: FO.contractors, filter: (d) => vendorName(st, byId(st.workOrders, d.woId)?.vendorId), render: (d) => vendorName(st, byId(st.workOrders, d.woId)?.vendorId) },
      { key: "manpower", label: "Manpower", align: "right", num: true },
      { key: "work", label: "Work done", className: "max-w-[360px] whitespace-normal text-[12.5px]" },
      { key: "hindrance", label: "Hindrance", className: "whitespace-normal text-[12px] text-amber-700", render: (d) => d.hindrance || "-" },
      { key: "weather", label: "Weather", filterOptions: ["Clear", "Rain", "Heat", "Wind"], filter: true },
      { key: "by", label: "Reported by", className: "text-[12px] text-ink-soft" },
    ]} />
  );
}
