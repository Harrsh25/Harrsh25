// Subcontractor management: a main contractor may sublet part of its scope to another approved contractor, only with
// our approval. Each subcontract carries its own scope, value, dates, checks (approval, compliance, qualification),
// workers on site and a closing rating that feeds the subcontractor's own scorecard.
// Demo subcontracts (also added to data saved before this feature existed)
function seedSubcontracts(s) {
  const c1 = (s.contracts || []).find((c) => c.id === "CTR-001");
  if (!c1 || c1.subcontracts) return false;
  const ago = (d) => new Date(Date.now() - d * DAY).toISOString();
  c1.subcontracts = [
    { id: "SUB-001", vendorId: "VEN-010", scope: "Excavation for footings F1–F40, Tower B", value: 4200000, start: c1.start, end: c1.end, status: "Approved", requestedBy: "Shree Balaji (portal)", requestedAt: ago(40), decidedBy: "Rohan Kulkarni", decidedAt: ago(38), remark: "" },
    { id: "SUB-002", vendorId: "VEN-006", scope: "Scaffolding erection - Tower B façade", value: 1800000, start: c1.start, end: c1.end, status: "Proposed", requestedBy: "Shree Balaji (portal)", requestedAt: ago(2) },
  ];
  return true;
}
// Bring data saved by an older version of the file up to date: new demo records and fields are added, user data is kept
function migrateState(s) {
  let changed = false;
  if ((s.workers || []).some((w) => w.idRef === undefined)) { seedWorkerDetails(s); changed = true; }
  if (seedSubcontracts(s)) changed = true;
  if (seedDispatches(s)) changed = true;
  return changed;
}
const SUB_STATUS_TONE = { Proposed: "blue", Approved: "green", Rejected: "red", Closed: "gray" };
const contractSubs = (c) => c?.subcontracts || [];
const allSubs = (st) => st.contracts.flatMap((c) => contractSubs(c).map((x) => ({ ...x, contract: c })));
const subLimitPct = (st) => Number(settingsOf(st || getState()).maxSubcontractPct) || 0;
// Reasons a subcontractor can't be approved (or keep working)
function subBlockers(st, c, sub) {
  const v = byId(st.vendors, sub.vendorId), out = [];
  if (!v) return ["Subcontractor not found"];
  if (v.id === c.vendorId) out.push("The main contractor can't be its own subcontractor");
  if (lifeStatus(v) !== "Active") out.push(`${v.name} is ${(lifeStatus(v) || approvalStatus(v)).toLowerCase()} - only approved, active vendors can be subcontractors`);
  if (isBlockedFor(v, "Orders")) out.push(`${v.name} is on hold for orders`);
  const comp = complianceOf(v); if (comp.blocking.length) out.push(`Compliance: ${comp.blocking.slice(0, 2).join("; ")}`);
  const q = qualStatus(v); if (["Not qualified", "Expired", "Requalification required"].includes(q.status)) out.push(`Qualification: ${q.status}`);
  const lim = subLimitPct(st), cv = contractValue(c);
  const total = sum(contractSubs(c).filter((x) => x.id !== sub.id && ["Proposed", "Approved"].includes(x.status)), (x) => Number(x.value) || 0) + (Number(sub.value) || 0);
  if (lim && total > cv * lim / 100) out.push(`Sublet value ${inrShort(total)} is over ${lim}% of the contract (${inrShort(cv * lim / 100)})`);
  return out;
}
const subWorkers = (st, sub) => st.workers.filter((w) => w.subcontractId === sub.id);

function decideSub(c, sub, approve, remark) {
  const st = getState();
  if (approve) { const b = subBlockers(st, c, sub); if (b.length) { toast(`Can't approve - ${b.join("; ")}`, "red"); return false; } }
  if (!approve && !(remark || "").trim()) { toast("A reason is required to reject", "red"); return false; }
  setState((s) => Object.assign(byId(s.contracts, c.id).subcontracts.find((x) => x.id === sub.id), { status: approve ? "Approved" : "Rejected", decidedBy: currentUser(), decidedAt: new Date().toISOString(), remark: remark || "" }),
    { entity: "Contract", id: c.id, action: `Subcontract ${sub.id} to ${vendorName(st, sub.vendorId)} ${approve ? "approved" : "rejected"}${remark ? ` - ${remark}` : ""}` });
  toast(approve ? "Subcontract approved" : "Subcontract rejected", approve ? "green" : "red");
  return true;
}

function SubcontractSection({ c }) {
  const st = useStore();
  const subs = contractSubs(c);
  const live = !["Draft", "Rejected", "Closed", "Terminated"].includes(c.status);
  const [f, setF] = y.useState(null), [tried, setTried] = y.useState(false), [dec, setDec] = y.useState(null), [closeIt, setCloseIt] = y.useState(null);
  const candidates = st.vendors.filter((v) => v.id !== c.vendorId && (v.isContractor || hasType(v, "Labor") || hasType(v, "Services")));
  const er = f ? {
    vendorId: f.vendorId ? "" : "Pick the subcontractor",
    scope: f.scope.trim().length < 5 ? "Describe the sublet scope" : "",
    value: !(Number(f.value) > 0) ? "Enter the sublet value" : "",
    dates: !f.start || !f.end ? "Enter start and end" : f.end <= f.start ? "End must be after start" : f.start < c.start || f.end > c.end ? `Must sit within the contract (${fmtDate(c.start)} – ${fmtDate(c.end)})` : "",
  } : {};
  const warn = f && f.vendorId ? subBlockers(st, c, { ...f, id: "new" }) : [];
  const save = () => {
    setTried(true); if (VX.any(er)) return;
    const n = allSubs(getState()).length + 1, id = `SUB-${String(n).padStart(3, "0")}`;
    setState((s) => { const x = byId(s.contracts, c.id); x.subcontracts = [...(x.subcontracts || []), { id, vendorId: f.vendorId, scope: f.scope.trim(), value: Number(f.value), start: f.start, end: f.end, status: "Proposed", requestedBy: currentUser(), requestedAt: new Date().toISOString() }]; },
      { entity: "Contract", id: c.id, action: `Subcontract ${id} proposed - ${vendorName(st, f.vendorId)} for ${f.scope.trim()} (${inrShort(Number(f.value))})` });
    toast("Subcontract proposed - waiting for approval"); setF(null); setTried(false);
  };
  return (
    <Section title="Subcontractors" icon={Icon.users} actions={live && !f && <Btn size="sm" icon={Icon.plus} onClick={() => setF({ vendorId: "", scope: "", value: "", start: c.start, end: c.end })}>Propose subcontractor</Btn>}>
      <DataTable dense plain rows={subs} empty={<p className="p-4 text-[13px] text-ink-mute">No part of this contract is sublet. The main contractor must get approval before any subcontractor works on site.</p>} columns={[
        { key: "vendorId", label: "Subcontractor", className: "font-medium", render: (x) => vendorName(st, x.vendorId) },
        { key: "scope", label: "Scope" },
        { key: "value", label: "Value", align: "right", render: (x) => <span className="num">{inrShort(x.value)}</span> },
        { key: "dates", label: "Period", render: (x) => `${fmtDate(x.start)} – ${fmtDate(x.end)}` },
        { key: "w", label: "Workers", align: "right", render: (x) => subWorkers(st, x).filter((w) => workerState(w) !== "Exited").length },
        { key: "status", label: "Status", render: (x) => <span className="flex flex-col"><Status tone={SUB_STATUS_TONE[x.status]}>{x.status}</Status>{x.rating && <span className="text-[11px] text-ink-mute">rated {x.rating.quality}/5 · {x.rating.safety}/5</span>}{x.status === "Approved" && subBlockers(st, c, x).length > 0 && <span className="text-[11px] text-red-600">{subBlockers(st, c, x)[0]}</span>}</span> },
        { key: "act", label: "", align: "right", render: (x) => (
          <span className="flex justify-end gap-1">
            {x.status === "Proposed" && <><Btn size="sm" variant="danger" onClick={() => setDec({ sub: x, approve: false, remark: "" })}>Reject</Btn><Btn size="sm" variant="success" disabled={subBlockers(st, c, x).length > 0} title={subBlockers(st, c, x).join(" · ")} onClick={() => decideSub(c, x, true, "")}>Approve</Btn></>}
            {x.status === "Approved" && <Btn size="sm" onClick={() => setCloseIt({ sub: x, quality: "4", safety: "4", remark: "" })}>Close & rate</Btn>}
          </span>) },
      ]} />
      {subLimitPct(st) > 0 && <p className="border-t border-line px-4 py-2 text-[12px] text-ink-mute">Sublet so far {inrShort(sum(subs.filter((x) => ["Proposed", "Approved"].includes(x.status)), (x) => Number(x.value) || 0))} of the {subLimitPct(st)}% allowed ({inrShort(contractValue(c) * subLimitPct(st) / 100)}). Subcontractor workers are added in Worker Master under the main contractor; their work is measured and billed through the main contractor.</p>}
      {f && (
        <div className="space-y-3 border-t border-line p-4">
          <div className="grid grid-cols-[1.2fr_1.6fr_130px_150px_150px] items-start gap-3">
            <Field label="Subcontractor" required><Select value={f.vendorId} placeholder="Select" onChange={(x) => setF({ ...f, vendorId: x })} options={candidates.map((v) => ({ value: v.id, label: v.name }))} />{tried && <FieldErr m={er.vendorId} />}</Field>
            <Field label="Scope sublet" required><TextInput value={f.scope} onChange={(x) => setF({ ...f, scope: x })} placeholder="e.g. Excavation for footings F1–F40" />{tried && <FieldErr m={er.scope} />}</Field>
            <Field label="Value (₹)" required><NumInput value={f.value} onChange={(x) => setF({ ...f, value: x })} />{tried && <FieldErr m={er.value} />}</Field>
            <Field label="Start"><DateInput value={f.start} onChange={(x) => setF({ ...f, start: x })} /></Field>
            <Field label="End"><DateInput value={f.end} onChange={(x) => setF({ ...f, end: x })} />{tried && <FieldErr m={er.dates} />}</Field>
          </div>
          {warn.length > 0 && <Note tone="amber">Approval will be refused until: {warn.join(" · ")}</Note>}
          <div className="flex justify-end gap-2"><Btn onClick={() => { setF(null); setTried(false); }}>Cancel</Btn><Btn variant="primary" onClick={save}>Propose</Btn></div>
        </div>
      )}
      {dec && (
        <Modal open width={460} onClose={() => setDec(null)} title={`Reject subcontract ${dec.sub.id}`} footer={<><Btn onClick={() => setDec(null)}>Cancel</Btn><Btn variant="danger" disabled={dec.remark.trim().length < 3} onClick={() => decideSub(c, dec.sub, false, dec.remark.trim()) && setDec(null)}>Reject</Btn></>}>
          <Field label="Reason" required><TextInput value={dec.remark} onChange={(x) => setDec({ ...dec, remark: x })} placeholder="e.g. Not qualified for deep excavation" /></Field>
        </Modal>
      )}
      {closeIt && (
        <Modal open width={480} onClose={() => setCloseIt(null)} title={`Close subcontract ${closeIt.sub.id}`} footer={<><Btn onClick={() => setCloseIt(null)}>Cancel</Btn><Btn variant="primary" onClick={() => {
          const r = { quality: Number(closeIt.quality), safety: Number(closeIt.safety), remark: closeIt.remark.trim() };
          setState((s) => {
            Object.assign(byId(s.contracts, c.id).subcontracts.find((x) => x.id === closeIt.sub.id), { status: "Closed", closedAt: new Date().toISOString(), closedBy: currentUser(), rating: r });
            s.ratings.push({ id: `RT-${Date.now().toString(36)}`, vendorId: closeIt.sub.vendorId, woId: null, contractId: c.id, period: `Subcontract ${closeIt.sub.id}`, quality: r.quality, safety: r.safety, manpower: r.quality, remarks: r.remark || `Subcontract under ${c.id}`, incidents: 0, by: currentUser(), date: todayISO() });
          }, { entity: "Contract", id: c.id, action: `Subcontract ${closeIt.sub.id} closed - rated quality ${r.quality}/5, safety ${r.safety}/5` });
          toast("Subcontract closed - rating added to the subcontractor's scorecard"); setCloseIt(null);
        }}>Close</Btn></>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quality (1–5)"><Select value={closeIt.quality} onChange={(x) => setCloseIt({ ...closeIt, quality: x })} options={["1", "2", "3", "4", "5"]} /></Field>
            <Field label="Safety (1–5)"><Select value={closeIt.safety} onChange={(x) => setCloseIt({ ...closeIt, safety: x })} options={["1", "2", "3", "4", "5"]} /></Field>
            <Field label="Remarks" span={2}><TextInput value={closeIt.remark} onChange={(x) => setCloseIt({ ...closeIt, remark: x })} /></Field>
          </div>
        </Modal>
      )}
    </Section>
  );
}

// All subcontracts across contracts
function SubcontractorsPage() {
  const st = useStore(), nav = useNavigate();
  const rows = allSubs(st);
  return (
    <Page title="Subcontractors" subtitle="Who each main contractor has sublet work to - scope, value, approval, checks and workers" icon={Icon.users}>
      <div className="grid grid-cols-4 gap-3 px-4 pt-4">
        <StatTile tone="blue" label="Waiting for approval" value={rows.filter((x) => x.status === "Proposed").length} sub="proposed by main contractors" icon={Icon.clock} />
        <StatTile tone="green" label="Approved" value={rows.filter((x) => x.status === "Approved").length} sub={inrShort(sum(rows.filter((x) => x.status === "Approved"), (x) => x.value))} icon={Icon.check} />
        <StatTile tone="red" label="Checks failing" value={rows.filter((x) => x.status === "Approved" && subBlockers(st, x.contract, x).length).length} sub="approved but now blocked" icon={Icon.alert} />
        <StatTile tone="purple" label="Workers on site" value={rows.reduce((n, x) => n + subWorkers(st, x).filter((w) => workerState(w) !== "Exited").length, 0)} sub="employed by subcontractors" icon={Icon.hardHat} />
      </div>
      <DataTable noun="subcontracts" rows={rows} onRow={(x) => nav(`${CL_BASE}/contracts?open=${x.contract.id}`)} columns={[
        { key: "vendorId", label: "Subcontractor", className: "font-medium", render: (x) => vendorName(st, x.vendorId) },
        { key: "main", label: "Main contractor", filterOptions: FO.contractors, filter: (x) => vendorName(st, x.contract.vendorId), render: (x) => vendorName(st, x.contract.vendorId) },
        { key: "scope", label: "Scope", render: (x) => <span className="flex flex-col"><span>{x.scope}</span><span className="text-[11.5px] text-ink-mute">{x.contract.title}</span></span> },
        { key: "value", label: "Value", align: "right", render: (x) => <span className="num">{inrShort(x.value)}</span> },
        { key: "status", label: "Status", filterOptions: Object.keys(SUB_STATUS_TONE), filter: (x) => x.status, render: (x) => <Status tone={SUB_STATUS_TONE[x.status]}>{x.status}</Status> },
        { key: "chk", label: "Checks", render: (x) => { const b = ["Proposed", "Approved"].includes(x.status) ? subBlockers(st, x.contract, x) : []; return b.length ? <span className="text-[12.5px] text-red-600">{b[0]}</span> : <span className="text-[12.5px] text-green-700">In order</span>; } },
        { key: "w", label: "Workers", align: "right", render: (x) => subWorkers(st, x).length },
      ]} />
    </Page>
  );
}
