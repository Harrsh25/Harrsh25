// Worker Master: every worker a contractor (or its subcontractor) brings to site — identity, trade and skill,
// statutory registrations (PF / ESI), safety induction, medical fitness, certificates, site / work order, joining and exit.
// A worker who is not eligible (induction or medical lapsed, exited) can't be marked present in the daily muster.
const WORKER_CERTS = ["Electrical wireman licence", "Welder certification", "Scaffolding competency", "Working at height", "Crane / rigging operator", "First aid", "Confined space entry"];
const ID_TYPES = ["Aadhaar", "Voter ID", "Driving licence", "Passport", "e-Shram card"];
const INDUCTION_VALID_DAYS = 365;
const inductionValidTill = (w) => (w.inductionOn ? new Date(new Date(w.inductionOn).getTime() + INDUCTION_VALID_DAYS * DAY).toISOString().slice(0, 10) : null);
// Issues on a worker: block = can't work on site; warn = fix soon
function workerIssues(w, on = todayISO()) {
  const block = [], warn = [];
  if (w.exitOn && w.exitOn <= on) block.push(`Exited ${fmtDate(w.exitOn)}`);
  const ind = inductionValidTill(w);
  if (!w.inductionOn) block.push("No safety induction");
  else if (ind < on) block.push(`Safety induction lapsed ${fmtDate(ind)}`);
  else if (daysUntil(ind) <= 15) warn.push(`Induction due ${fmtDate(ind)}`);
  if (w.medicalValidTill && w.medicalValidTill < on) block.push(`Medical fitness expired ${fmtDate(w.medicalValidTill)}`);
  else if (!w.medicalValidTill) warn.push("Medical fitness not recorded");
  else if (daysUntil(w.medicalValidTill) <= 15) warn.push(`Medical due ${fmtDate(w.medicalValidTill)}`);
  for (const c of w.certificates || []) {
    if (c.validTill && c.validTill < on) block.push(`${c.name} expired ${fmtDate(c.validTill)}`);
    else if (c.validTill && daysUntil(c.validTill) <= 15) warn.push(`${c.name} due ${fmtDate(c.validTill)}`);
  }
  if (w.subcontractId) { const sc = allSubs(getState()).find((x) => x.id === w.subcontractId); if (!sc || sc.status !== "Approved") block.push(`Subcontract ${w.subcontractId} is ${sc ? sc.status.toLowerCase() : "missing"}`); }
  if (!w.uan) warn.push("PF (UAN) not recorded");
  if (!w.esic) warn.push("ESI number not recorded");
  if (!w.idRef) warn.push("ID proof not recorded");
  return { block, warn, eligible: !block.length };
}
const workerState = (w) => (w.exitOn && w.exitOn <= todayISO() ? "Exited" : w.active === false ? "Inactive" : workerIssues(w).block.length ? "Not eligible" : "Active");
const workerTone = { Active: "green", "Not eligible": "red", Exited: "gray", Inactive: "gray" };

// Seed: give the demo workers their statutory, medical and certificate details (a few lapsed, to show the checks)
function seedWorkerDetails(s) {
  (s.workers || []).forEach((w, i) => {
    const n = i + 1;
    Object.assign(w, {
      idType: w.idType || "Aadhaar", idRef: w.idRef || `XXXX-XXXX-${String(4100 + n * 37).slice(-4)}`,
      uan: w.uan ?? (n % 9 === 0 ? "" : `1009${String(48210000 + n * 113)}`), esic: w.esic ?? (n % 7 === 0 ? "" : `31000${String(5512000 + n * 71)}`),
      medicalValidTill: w.medicalValidTill || shiftDays(n === 4 ? -6 : 90 + n * 9), joiningOn: w.joiningOn || shiftDays(-120 + n), shift: w.shift || (n % 4 === 0 ? "Night" : "Day"),
      site: w.site || "Skyline Towers — Phase 1", certificates: w.certificates || (w.trade.startsWith("Carpenter") ? [{ name: "Working at height", no: `WAH-${700 + n}`, validTill: shiftDays(n % 2 ? 9 : 200) }] : []),
    });
  });
}

function WorkerForm({ w0, onClose }) {
  const st = useStore();
  const contractors = st.vendors.filter((v) => (v.isContractor || hasType(v, "Labor")) && lifeStatus(v));
  const [f, setF] = y.useState(() => w0 ? { ...w0, certificates: [...(w0.certificates || [])] } : { name: "", vendorId: contractors[0]?.id || "", trade: "Mason", skill: "Skilled", dob: "", mobile: "", idType: "Aadhaar", idRef: "", uan: "", esic: "", inductionOn: todayISO(), medicalValidTill: "", joiningOn: todayISO(), site: "", woId: "", shift: "Day", gatePass: "", certificates: [] });
  const [tried, setTried] = y.useState(false);
  const age = f.dob ? Math.floor((Date.now() - new Date(f.dob).getTime()) / (365.25 * DAY)) : null;
  const e = {
    name: f.name.trim().length < 3 ? "Enter the full name" : "",
    vendorId: f.vendorId ? "" : "Pick the contractor",
    dob: !f.dob ? "Required" : f.dob > todayISO() ? "Date can't be in the future" : age < 18 ? "Worker must be at least 18" : "",
    mobile: f.mobile ? VX.mobile(f.mobile) : "",
    idRef: f.idRef.trim().length < 4 ? "Enter the ID number (last 4 digits at least)" : "",
    uan: f.uan && !/^\d{12}$/.test(String(f.uan).replace(/\s/g, "")) ? "UAN is 12 digits" : "",
    esic: f.esic && !/^\d{10,17}$/.test(String(f.esic).replace(/\s/g, "")) ? "ESI number is 10–17 digits" : "",
    gatePass: f.gatePass && st.workers.some((x) => x.id !== w0?.id && normNo(x.gatePass) === normNo(f.gatePass)) ? "Gate pass already issued to another worker" : "",
    medical: f.medicalValidTill && f.medicalValidTill < todayISO() && !w0 ? "Medical fitness has expired — get a fresh certificate" : "",
    certs: (f.certificates || []).some((c) => !c.name || !c.validTill) ? "Each certificate needs a name and a valid-till date" : "",
  };
  const wos = st.workOrders.filter((x) => x.vendorId === f.vendorId && ["Issued", "In Progress"].includes(x.status));
  const save = () => {
    setTried(true); if (VX.any(e)) return;
    const id = w0 ? w0.id : nextId("WK", st.workers);
    const rec = { ...f, name: f.name.trim(), uan: String(f.uan || "").replace(/\s/g, ""), esic: String(f.esic || "").replace(/\s/g, ""), gatePass: f.gatePass || `GP-${4300 + st.workers.length + 1}`, active: f.active !== false };
    setState((s) => { if (w0) Object.assign(byId(s.workers, id), rec); else s.workers.push({ id, ...rec }); }, { entity: "Worker", id, action: w0 ? "Worker details updated" : `Worker added to ${vendorName(st, f.vendorId)} — ${f.trade}` });
    toast(w0 ? "Worker updated" : "Worker added"); onClose(id);
  };
  const setC = (i, patch) => setF({ ...f, certificates: f.certificates.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  return (
    <Modal open onClose={() => onClose()} width={720} title={w0 ? `Edit ${w0.name}` : "Add worker"} footer={<><Btn onClick={() => onClose()}>Cancel</Btn><Btn variant="primary" onClick={save}>{w0 ? "Save" : "Add worker"}</Btn></>}>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Full name" required span={2}><TextInput value={f.name} onChange={(x) => setF({ ...f, name: x })} />{tried && <FieldErr m={e.name} />}</Field>
        <Field label="Date of birth" required><DateInput value={f.dob || ""} onChange={(x) => setF({ ...f, dob: x })} />{(tried || f.dob) && <FieldErr m={e.dob} />}</Field>
        <Field label="Contractor" required><Select value={f.vendorId} onChange={(x) => setF({ ...f, vendorId: x, woId: "" })} options={contractors.map((v) => ({ value: v.id, label: v.name }))} />{tried && <FieldErr m={e.vendorId} />}</Field>
        <Field label="Trade"><Select value={f.trade} onChange={(x) => setF({ ...f, trade: x })} options={[...new Set([...st.laborRates.map((r) => r.trade), f.trade])]} /></Field>
        <Field label="Skill"><Select value={f.skill} onChange={(x) => setF({ ...f, skill: x })} options={SKILLS} /></Field>
        <Field label="Mobile"><TextInput value={f.mobile || ""} onChange={(x) => setF({ ...f, mobile: x })} placeholder="98xxxxxxxx" /><FieldErr m={e.mobile} /></Field>
        <Field label="ID proof"><Select value={f.idType} onChange={(x) => setF({ ...f, idType: x })} options={ID_TYPES} /></Field>
        <Field label="ID number" required hint="Store only the last 4 digits of Aadhaar"><TextInput value={f.idRef} onChange={(x) => setF({ ...f, idRef: x })} placeholder="XXXX-XXXX-1234" />{tried && <FieldErr m={e.idRef} />}</Field>
        <Field label="PF — UAN"><TextInput value={f.uan || ""} onChange={(x) => setF({ ...f, uan: x })} placeholder="12 digits" className={cls(inputCls, "mono")} /><FieldErr m={e.uan} /></Field>
        <Field label="ESI number"><TextInput value={f.esic || ""} onChange={(x) => setF({ ...f, esic: x })} className={cls(inputCls, "mono")} /><FieldErr m={e.esic} /></Field>
        <Field label="Gate pass no."><TextInput value={f.gatePass || ""} onChange={(x) => setF({ ...f, gatePass: x })} placeholder="Auto" /><FieldErr m={e.gatePass} /></Field>
        <Field label="Safety induction on"><DateInput value={f.inductionOn || ""} onChange={(x) => setF({ ...f, inductionOn: x })} /></Field>
        <Field label="Medical fit till"><DateInput value={f.medicalValidTill || ""} onChange={(x) => setF({ ...f, medicalValidTill: x })} /><FieldErr m={e.medical} /></Field>
        <Field label="Joining date"><DateInput value={f.joiningOn || ""} onChange={(x) => setF({ ...f, joiningOn: x })} /></Field>
        <Field label="Site / project"><TextInput value={f.site || ""} onChange={(x) => setF({ ...f, site: x })} placeholder="e.g. Skyline Towers — Phase 1" /></Field>
        <Field label="Work order"><Select value={f.woId || ""} placeholder="—" onChange={(x) => setF({ ...f, woId: x })} options={wos.map((x) => ({ value: x.id, label: `${x.id} — ${x.title}` }))} /></Field>
        {(() => { const subs = st.contracts.filter((k) => k.vendorId === f.vendorId).flatMap(contractSubs).filter((x) => x.status === "Approved");
          return <Field label="Employed by" hint="Subcontractor workers need an approved subcontract"><Select value={f.subcontractId || ""} onChange={(x) => setF({ ...f, subcontractId: x })} options={[{ value: "", label: "Main contractor" }, ...subs.map((x) => ({ value: x.id, label: `${vendorName(st, x.vendorId)} (${x.id})` }))]} /></Field>; })()}
        <Field label="Shift"><Select value={f.shift || "Day"} onChange={(x) => setF({ ...f, shift: x })} options={["Day", "Night", "General"]} /></Field>
      </div>
      <div className="mt-4 rounded-lg border border-line">
        <div className="flex items-center justify-between border-b border-line px-3 py-2"><span className="text-[13px] font-medium">Certificates & licences</span><Btn size="sm" icon={Icon.plus} onClick={() => setF({ ...f, certificates: [...f.certificates, { name: WORKER_CERTS[0], no: "", validTill: "" }] })}>Add certificate</Btn></div>
        {f.certificates.length === 0 ? <p className="px-3 py-2 text-[12.5px] text-ink-mute">None — add trade licences or competency cards the work needs.</p> : f.certificates.map((c, i) => (
          <div key={i} className="grid grid-cols-[1.4fr_1fr_150px_auto] items-center gap-2 px-3 py-2">
            <Select value={c.name} onChange={(x) => setC(i, { name: x })} options={WORKER_CERTS} />
            <TextInput value={c.no || ""} onChange={(x) => setC(i, { no: x })} placeholder="Certificate no." />
            <DateInput value={c.validTill || ""} onChange={(x) => setC(i, { validTill: x })} />
            <IconBtn icon={Icon.trash} title="Remove" onClick={() => setF({ ...f, certificates: f.certificates.filter((_, j) => j !== i) })} />
          </div>
        ))}
        {tried && e.certs && <p className="px-3 pb-2"><FieldErr m={e.certs} /></p>}
      </div>
    </Modal>
  );
}

function WorkerDrawer({ id, onClose }) {
  const st = useStore(), w = byId(st.workers, id);
  const [edit, setEdit] = y.useState(false), [exit, setExit] = y.useState(null), [tab, setTab] = y.useState("profile");
  if (!w) return null;
  const iss = workerIssues(w), state = workerState(w);
  const att = st.attendance.filter((a) => a.workerId === w.id).sort((a, b) => b.date.localeCompare(a.date));
  const last30 = att.filter((a) => a.date >= shiftDays(-30));
  const wo = byId(st.workOrders, w.woId);
  return (
    <Drawer open onClose={onClose} width={860} title={w.name} recordId={w.id} status={<Status tone={workerTone[state]}>{state}</Status>}
      details={[["Contractor", vendorName(st, w.vendorId)], w.subcontractId && ["Employed by", `${vendorName(st, allSubs(st).find((x) => x.id === w.subcontractId)?.vendorId)} (${w.subcontractId})`], ["Trade", `${w.trade} · ${w.skill}`], ["Site / project", w.site || "—"], ["Work order", wo ? `${wo.id} — ${wo.title}` : "—"], ["Shift", w.shift || "—"], ["Gate pass", w.gatePass], ["Joining", fmtDate(w.joiningOn)], w.exitOn && ["Exit", `${fmtDate(w.exitOn)} — ${w.exitReason || ""}`]]}
      actions={state !== "Exited" && <><Btn icon={Icon.pencil} onClick={() => setEdit(true)}>Edit</Btn><Btn variant="danger" onClick={() => setExit({ on: todayISO(), reason: "" })}>Record exit</Btn></>}
      tabs={{ tabs: [{ id: "profile", label: "Profile" }, { id: "att", label: "Attendance" }], active: tab, onChange: setTab }}>
      <div className="space-y-4 px-6 py-4">
        {tab === "profile" && <>
          {iss.block.length > 0 && <Note tone="red" icon={Icon.alert}><b>Can't work on site:</b> {iss.block.join(" · ")}. The daily muster won't mark this worker present until it is fixed.</Note>}
          {iss.warn.length > 0 && <Note tone="amber">{iss.warn.join(" · ")}</Note>}
          <Section title="Identity & statutory" icon={Icon.idCard || Icon.user}>
            <KV items={[["Date of birth", w.dob ? fmtDate(w.dob) : "—"], ["Mobile", w.mobile || "—"], ["ID proof", w.idRef ? `${w.idType || "ID"} · ${w.idRef}` : "—"], ["PF — UAN", w.uan || "Not recorded"], ["ESI number", w.esic || "Not recorded"], ["Residential status", w.residential || "Local"]]} />
          </Section>
          <Section title="Safety & medical" icon={Icon.shieldCheck}>
            <KV items={[["Safety induction", w.inductionOn ? `${fmtDate(w.inductionOn)} — valid till ${fmtDate(inductionValidTill(w))}` : "Not done"], ["Medical fit till", w.medicalValidTill ? fmtDate(w.medicalValidTill) : "Not recorded"]]} />
          </Section>
          <Section title="Certificates & licences" icon={Icon.file}>
            <DataTable dense plain rows={(w.certificates || []).map((c, i) => ({ ...c, id: i }))} empty={<p className="p-4 text-[13px] text-ink-mute">No certificates recorded.</p>} columns={[
              { key: "name", label: "Certificate", className: "font-medium" }, { key: "no", label: "Number", className: "mono text-[12px]" },
              { key: "validTill", label: "Valid till", render: (c) => <ExpiryCell iso={c.validTill} /> },
            ]} />
          </Section>
        </>}
        {tab === "att" && <>
          <div className="grid grid-cols-3 gap-3">
            <StatTile tone="green" label="Man-days (30 days)" value={num(sum(last30, manDays))} sub={`${last30.filter((a) => a.status === "A").length} absent`} icon={Icon.users} />
            <StatTile tone="blue" label="Overtime (30 days)" value={`${num(sum(last30, (a) => a.ot || 0))} h`} sub="from the muster" icon={Icon.clock} />
            <StatTile tone="purple" label="Billed in measurement" value={num(sum(att.filter((a) => a.rolledInto), manDays))} sub="man-days posted" icon={Icon.ruler} />
          </div>
          <Section title="Daily attendance" icon={Icon.calendar}>
            <DataTable dense plain rows={att.slice(0, 60).map((a, i) => ({ ...a, id: i }))} empty={<p className="p-4 text-[13px] text-ink-mute">No attendance recorded.</p>} columns={[
              { key: "date", label: "Date", render: (a) => fmtDate(a.date) }, { key: "woId", label: "Work order", className: "mono text-[12px]" },
              { key: "status", label: "Attendance", render: (a) => <Status tone={a.status === "P" ? "green" : a.status === "H" ? "amber" : "red"}>{(ATT_STATUS.find((x) => x.v === a.status) || {}).l}</Status> },
              { key: "ot", label: "OT h", align: "right" }, { key: "v", label: "Status", render: (a) => (a.rolledInto ? `In ${a.rolledInto}` : a.verified ? "Verified" : "Submitted") },
            ]} />
          </Section>
        </>}
      </div>
      {edit && <WorkerForm w0={w} onClose={() => setEdit(false)} />}
      {exit && (
        <Modal open width={460} onClose={() => setExit(null)} title={`Record exit — ${w.name}`} footer={<><Btn onClick={() => setExit(null)}>Cancel</Btn><Btn variant="danger" disabled={exit.reason.trim().length < 3 || !exit.on} onClick={() => {
          setState((s) => Object.assign(byId(s.workers, w.id), { exitOn: exit.on, exitReason: exit.reason.trim(), active: false }), { entity: "Worker", id: w.id, action: `Exit recorded ${fmtDate(exit.on)} — ${exit.reason.trim()}` });
          toast("Exit recorded — gate pass cancelled"); setExit(null);
        }}>Record exit</Btn></>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Exit date" required><DateInput value={exit.on} onChange={(x) => setExit({ ...exit, on: x })} /></Field>
            <Field label="Reason" required><Select value={exit.reason} placeholder="Select" onChange={(x) => setExit({ ...exit, reason: x })} options={["Resigned", "Work order completed", "Transferred to another site", "Terminated — misconduct", "Medically unfit", "Absconding"]} /></Field>
          </div>
          <p className="mt-3 text-[12.5px] text-ink-soft">The gate pass is cancelled and the worker no longer appears in the daily muster. Full and final settlement of wages stays with the contractor.</p>
        </Modal>
      )}
    </Drawer>
  );
}

function WorkerMasterPage() {
  const st = useStore();
  const [open, setOpen] = useQueryOpen(), [add, setAdd] = y.useState(false);
  const rows = st.workers;
  const cnt = (s) => rows.filter((w) => workerState(w) === s).length;
  const expiring = rows.filter((w) => workerState(w) === "Active" && workerIssues(w).warn.some((x) => /due/.test(x))).length;
  return (
    <Page title="Worker Master" subtitle="Every worker on site — identity, PF / ESI, safety induction, medical, certificates, site and work order" icon={Icon.users}
      actions={<Btn variant="primary" icon={Icon.userPlus} onClick={() => setAdd(true)}>Add worker</Btn>}>
      <div className="grid grid-cols-4 gap-3 px-4 pt-4">
        <StatTile tone="green" label="Active" value={cnt("Active")} sub="eligible for site" icon={Icon.users} />
        <StatTile tone="red" label="Not eligible" value={cnt("Not eligible")} sub="induction / medical / certificate lapsed" icon={Icon.alert} />
        <StatTile tone="amber" label="Expiring in 15 days" value={expiring} sub="induction, medical or certificate" icon={Icon.clock} />
        <StatTile tone="gray" label="Exited" value={cnt("Exited")} sub="gate pass cancelled" icon={Icon.ban} />
      </div>
      <DataTable noun="workers" rows={rows} onRow={(w) => setOpen(w.id)} defaultCols={["name", "v", "trade", "chk", "s"]} columns={[
        { key: "name", label: "Worker", className: "font-medium" },
        { key: "v", label: "Contractor", filterOptions: FO.contractors, filter: (w) => vendorName(st, w.vendorId), render: (w) => vendorName(st, w.vendorId) },
        { key: "trade", label: "Trade", filterOptions: FO.labourTrades, filter: true, render: (w) => <span>{w.trade} <span className="text-ink-mute">· {w.skill}</span></span> },
        { key: "chk", label: "Checks", render: (w) => { const i = workerIssues(w); return i.block.length ? <span className="text-[12.5px] text-red-600">{i.block[0]}</span> : i.warn.length ? <span className="text-[12.5px] text-amber-700">{i.warn[0]}</span> : <span className="text-[12.5px] text-green-700">All in order</span>; } },
        { key: "s", label: "Status", filterOptions: ["Active", "Not eligible", "Exited", "Inactive"], filter: (w) => workerState(w), render: (w) => <Status tone={workerTone[workerState(w)]}>{workerState(w)}</Status> },
        { key: "wo", label: "Work order", render: (w) => w.woId || "—" },
        { key: "site", label: "Site / project", render: (w) => w.site || "—" },
        { key: "uan", label: "PF — UAN", render: (w) => w.uan || "—" },
        { key: "med", label: "Medical fit till", render: (w) => (w.medicalValidTill ? <ExpiryCell iso={w.medicalValidTill} /> : "—") },
        { key: "ind", label: "Induction valid till", render: (w) => (w.inductionOn ? <ExpiryCell iso={inductionValidTill(w)} /> : "—") },
        { key: "gate", label: "Gate pass", render: (w) => w.gatePass },
      ]} />
      {add && <WorkerForm onClose={(id) => { setAdd(false); if (id) setOpen(id); }} />}
      {open && <WorkerDrawer id={open} onClose={() => setOpen(null)} />}
    </Page>
  );
}
