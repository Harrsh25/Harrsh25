// Claims register: extension of time, price escalation, extra work and other contractual claims.
// Submitted → Under review → Settled (agreed amount / days) or Rejected. Settled EOT moves the completion date;
// settled money claims flow into the final settlement.
const CLAIM_TYPES = ["Extension of time", "Price escalation", "Extra work", "Variation", "Quantity variation", "Delay / disruption", "Idle resources", "Acceleration", "Weather", "Force majeure", "Other"];
const CLAIM_TONE = { Submitted: "blue", "Under review": "amber", Assessed: "purple", Settled: "green", Rejected: "red" };
const claimNoticeDays = (st) => Number(settingsOf(st || getState()).claimNoticeDays) || 0;
// notice given later than the contract allows after the event (time-bar risk)
const claimLate = (st, x) => { const n = claimNoticeDays(st); if (!n || !x.eventDate) return 0; const d = Math.round((new Date(x.submittedOn) - new Date(x.eventDate)) / DAY); return d > n ? d : 0; };
const OPEN_CLAIM = ["Submitted", "Under review", "Assessed"];
const contractClaims = (st, c) => (st.contractClaims || []).filter((x) => !c || x.contractId === c.id);
const isEot = (x) => x.type === "Extension of time";
const claimAgeDays = (x) => Math.max(0, -daysUntil(x.submittedOn));
// Settled money on a contract's claims, split for the final settlement
function claimsSettled(st, c) {
  const s = contractClaims(st, c).filter((x) => x.status === "Settled");
  return { escalation: round2(sum(s.filter((x) => x.type === "Price escalation"), (x) => x.settled.amount || 0)), other: round2(sum(s.filter((x) => !isEot(x) && x.type !== "Price escalation"), (x) => x.settled.amount || 0)), days: sum(s.filter(isEot), (x) => x.settled.days || 0) };
}

function ContractClaimModal({ contractId, onClose }) {
  const st = useStore();
  const live = st.contracts.filter((c) => !["Draft", "Pending Approval", "Rejected", "Closed"].includes(c.status));
  const [f, setF] = y.useState({ contractId: contractId || "", type: "", title: "", amount: "", days: "", basis: "", reference: "", submittedOn: todayISO(), eventDate: "", evidence: [] });
  const eot = f.type === "Extension of time";
  const err = {
    contractId: f.contractId ? "" : "Select the contract", type: f.type ? "" : "Select the claim type", title: f.title.trim().length >= 5 ? "" : "Describe the claim (at least 5 characters)",
    amount: eot ? (f.amount !== "" && !(Number(f.amount) >= 0) ? "Enter a valid amount" : "") : Number(f.amount) > 0 ? "" : "Enter the amount claimed",
    days: eot ? (Number.isInteger(Number(f.days)) && Number(f.days) > 0 && Number(f.days) <= 730 ? "" : "Enter the days claimed (1-730)") : "",
    basis: f.basis.trim().length >= 5 ? "" : "Give the basis of the claim",
    submittedOn: VX.req(f.submittedOn) || VX.notFuture(f.submittedOn, "Date can't be in the future"),
    eventDate: !f.eventDate ? "Enter when the event happened" : f.eventDate > f.submittedOn ? "The event can't be after the notice date" : "",
    dup: f.contractId && f.reference.trim() && contractClaims(st).some((q) => q.contractId === f.contractId && normNo(q.reference) === normNo(f.reference)) ? "A claim with this letter reference is already recorded" : "",
  };
  const ok = !Object.values(err).some(Boolean);
  const [tried, setTried] = y.useState(false);
  const save = () => {
    setTried(true); if (!ok) return;
    let id = "";
    setState((s) => {
      s.contractClaims = s.contractClaims || []; id = nextId("CLM", s.contractClaims);
      const c = byId(s.contracts, f.contractId);
      s.contractClaims.unshift({ id, contractId: c.id, vendorId: c.vendorId, type: f.type, title: f.title.trim(), amount: Number(f.amount) || 0, days: eot ? Number(f.days) : 0, basis: f.basis.trim(), reference: f.reference.trim(), submittedOn: f.submittedOn, eventDate: f.eventDate, evidence: f.evidence, status: "Submitted", recordedBy: currentUser(), history: [{ at: new Date().toISOString(), by: currentUser(), what: "Claim recorded" }] });
    }, { entity: "Contract", id: f.contractId, action: `Claim recorded - ${f.type}: ${f.title.trim()}${eot ? ` (${f.days} days)` : ` (${inr(Number(f.amount))})`}` });
    toast(`${id} recorded`); onClose(id);
  };
  const E = (k) => tried && err[k] ? <FieldErr m={err[k]} /> : null;
  return (
    <Modal open onClose={() => onClose()} width={620} title="Record claim" footer={<><Btn onClick={() => onClose()}>Cancel</Btn><Btn variant="primary" onClick={save}>Save claim</Btn></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Contract" required span={2}><Select value={f.contractId} disabled={!!contractId} onChange={(x) => setF({ ...f, contractId: x })} options={live.map((c) => ({ value: c.id, label: `${c.id} - ${c.title}` }))} />{E("contractId")}</Field>
        <Field label="Claim type" required><Select value={f.type} onChange={(x) => setF({ ...f, type: x })} options={CLAIM_TYPES} />{E("type")}</Field>
        <Field label="Event date" required><DateInput value={f.eventDate} onChange={(x) => setF({ ...f, eventDate: x })} />{E("eventDate")}</Field>
        <Field label="Notice received on" required><DateInput value={f.submittedOn} onChange={(x) => setF({ ...f, submittedOn: x })} />{E("submittedOn")}</Field>
        <Field label="Claim" required span={2}><TextInput value={f.title} onChange={(x) => setF({ ...f, title: x })} placeholder="e.g. Steel price rise Jul-Sep" />{E("title")}</Field>
        {eot && <Field label="Days claimed" required><NumInput value={f.days} onChange={(x) => setF({ ...f, days: x })} />{E("days")}</Field>}
        <Field label={eot ? "Cost claimed (₹)" : "Amount claimed (₹)"} required={!eot}><NumInput value={f.amount} onChange={(x) => setF({ ...f, amount: x })} />{E("amount")}</Field>
        <Field label="Contractor's letter ref."><TextInput value={f.reference} onChange={(x) => setF({ ...f, reference: x })} />{E("dup")}</Field>
        <Field label="Basis of claim" required span={2}><TextArea rows={2} value={f.basis} onChange={(x) => setF({ ...f, basis: x })} placeholder="e.g. Clause 47 price variation, WPI steel index" />{E("basis")}</Field>
        <Field label="Evidence" span={2}><EvidenceInput files={f.evidence} onChange={(ev) => setF({ ...f, evidence: ev })} /></Field>
        {f.eventDate && f.submittedOn && claimLate(st, f) > 0 && <div className="col-span-2"><Note tone="amber">Notice given {claimLate(st, f)} days after the event - the contract allows {claimNoticeDays(st)} days. The claim may be time-barred.</Note></div>}
      </div>
    </Modal>
  );
}

function decideClaim(x, what, data) {
  const by = currentUser(), at = new Date().toISOString();
  setState((s) => {
    const k = s.contractClaims.find((q) => q.id === x.id);
    if (what === "review") { k.status = "Under review"; k.reviewer = data.reviewer || by; k.history.push({ at, by, what: `Engineer review started${data.note ? ` - ${data.note}` : ""}` }); }
    if (what === "assess") { k.status = "Assessed"; k.assessment = { amount: Number(data.amount) || 0, days: Number(data.days) || 0, note: data.note, by, at }; k.history.push({ at, by, what: `Engineer assessment${isEot(k) ? ` - ${k.assessment.days} days` : ""}${k.assessment.amount ? ` - ${inr(k.assessment.amount)}` : ""} · ${data.note}` }); }
    if (what === "evidence") { k.evidence = [...(k.evidence || []), ...data.files]; k.history.push({ at, by, what: `Evidence added - ${data.files.map((f0) => f0.name).join(", ")}` }); }
    if (what === "settle") {
      k.status = "Settled"; k.settled = { amount: Number(data.amount) || 0, days: Number(data.days) || 0, note: data.note, by, at };
      k.history.push({ at, by, what: `Settled${isEot(k) ? ` - ${k.settled.days} days` : ""}${k.settled.amount ? ` - ${inr(k.settled.amount)}` : ""} · ${data.note}` });
      if (isEot(k) && k.settled.days) { const c = byId(s.contracts, k.contractId); k.settled.endBefore = c.end; c.end = shiftDays(k.settled.days, c.end); }
    }
    if (what === "reject") { k.status = "Rejected"; k.rejected = { reason: data.note, by, at }; k.history.push({ at, by, what: `Rejected - ${data.note}` }); }
  }, { entity: "Contract", id: x.contractId, action: `Claim ${x.id} ${what === "evidence" ? "evidence added" : what === "assess" ? "assessed by the engineer" : what === "review" ? "under review" : what === "settle" ? `settled${isEot(x) ? ` - ${data.days} days EOT` : ` at ${inr(Number(data.amount) || 0)}`}` : `rejected - ${data.note}`}` });
  toast(what === "evidence" ? "Evidence added" : what === "assess" ? `${x.id} assessed - ready for commercial settlement` : what === "review" ? `${x.id} under review` : what === "settle" ? `${x.id} settled` : `${x.id} rejected`, what === "reject" ? "red" : "green");
}

function SettleClaimModal({ x, onClose, mode = "settle" }) {
  const eot = isEot(x);
  const [f, setF] = y.useState({ amount: "", days: "", note: "" });
  const err = (eot ? (!(Number.isInteger(Number(f.days)) && Number(f.days) >= 0 && f.days !== "") ? "Enter the days agreed" : Number(f.days) > x.days ? `Can't exceed the ${x.days} days claimed` : "") : "")
    || (f.amount === "" && !eot ? "Enter the amount agreed" : f.amount !== "" && !(Number(f.amount) >= 0) ? "Enter a valid amount" : Number(f.amount) > x.amount + 0.5 ? `Can't exceed the ${inr(x.amount)} claimed` : "")
    || (f.note.trim().length < 5 ? "Record the basis (at least 5 characters)" : "");
  return (
    <Modal open onClose={onClose} width={520} title={mode === "assess" ? `Engineer assessment - ${x.id}` : `Settle ${x.id}`} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={!!err} onClick={() => { decideClaim(x, mode, f); onClose(); }}>{mode === "assess" ? "Save assessment" : "Settle claim"}</Btn></>}>
      {mode === "settle" && x.assessment && <div className="mb-3"><Note>Engineer assessed {isEot(x) ? `${x.assessment.days} days` : inr(x.assessment.amount)} - {x.assessment.note}</Note></div>}
      <div className="grid grid-cols-2 gap-3">
        {eot && <Field label={mode === "assess" ? "Days assessed" : "Days agreed"} required info={`Claimed ${x.days} days`}><NumInput value={f.days} onChange={(v) => setF({ ...f, days: v })} /></Field>}
        <Field label={mode === "assess" ? "Amount assessed (₹)" : "Amount agreed (₹)"} required={!eot} info={x.amount ? `Claimed ${inr(x.amount)}` : ""}><NumInput value={f.amount} onChange={(v) => setF({ ...f, amount: v })} /></Field>
        <Field label={mode === "assess" ? "Assessment note" : "Settlement note"} required span={2}><TextArea rows={2} value={f.note} onChange={(v) => setF({ ...f, note: v })} /></Field>
      </div>
      {err && (f.amount !== "" || f.days !== "" || f.note) && <div className="mt-3"><Note tone="red">{err}</Note></div>}
    </Modal>
  );
}

function ContractClaimDrawer({ id, onClose }) {
  const st = useStore();
  const x = (st.contractClaims || []).find((q) => q.id === id);
  const [settle, setSettle] = y.useState(false), [reject, setReject] = y.useState(false), [assess, setAssess] = y.useState(false), [ev, setEv] = y.useState(null);
  if (!x) return null;
  const c = byId(st.contracts, x.contractId), open = OPEN_CLAIM.includes(x.status), late = claimLate(st, x);
  return (
    <Drawer open onClose={onClose} width={760} title={x.title} recordId={x.id} status={<Status tone={CLAIM_TONE[x.status]}>{x.status}</Status>}
      actions={open && <>
        {x.status === "Submitted" && <Btn variant="primary" onClick={() => decideClaim(x, "review", {})}>Start engineer review</Btn>}
        {x.status === "Under review" && <Btn variant="primary" onClick={() => setAssess(true)}>Record assessment</Btn>}
        {x.status === "Assessed" && <Btn variant="primary" onClick={() => setSettle(true)}>Settle</Btn>}
        <Btn icon={Icon.upload} onClick={() => setEv([])}>Add evidence</Btn>
        <Btn variant="danger" onClick={() => setReject(true)}>Reject</Btn>
      </>}>
      <div className="space-y-4 px-6 py-5">
        {late > 0 && <Note tone="amber">Notice came {late} days after the event - the contract allows {claimNoticeDays(st)} days. Check whether the claim is time-barred before settling.</Note>}
        <div className="grid grid-cols-3 gap-3">
          <StatTile tone="blue" label={isEot(x) ? "Days claimed" : "Claimed"} value={isEot(x) ? `${x.days} days` : inrShort(x.amount)} icon={Icon.file} />
          <StatTile tone="green" label="Agreed" value={x.settled ? (isEot(x) ? `${x.settled.days} days` : inrShort(x.settled.amount)) : "-"} icon={Icon.check} />
          <StatTile tone="amber" label="Age" value={`${claimAgeDays(x)} days`} sub={open ? "waiting for decision" : x.status.toLowerCase()} icon={Icon.clock} />
        </div>
        <Section title="Claim" icon={Icon.file}>
          <KV items={[["Contract", <RefLink to={`${CL_BASE}/contracts?open=${x.contractId}`}>{x.contractId} - {c?.title}</RefLink>], ["Contractor", vendorName(st, x.vendorId)], ["Type", x.type], ["Event date", x.eventDate ? fmtDate(x.eventDate) : "-"], ["Notice received", fmtDate(x.submittedOn)], ["Letter ref.", x.reference || "-"], ["Basis", x.basis], x.reviewer && ["Reviewer", x.reviewer], x.assessment && ["Engineer assessment", `${isEot(x) ? `${x.assessment.days} days` : inr(x.assessment.amount)} - ${x.assessment.note} (${x.assessment.by})`],
            (x.evidence || []).length > 0 && ["Evidence", <span className="flex flex-col">{x.evidence.map((e, i) => <FileLink key={i} name={e.name} dataUrl={e.dataUrl} />)}</span>],
            x.settled && ["Settlement", `${x.settled.note} - ${x.settled.by}, ${fmtDate(x.settled.at.slice(0, 10))}`], x.settled?.endBefore && ["Completion date", `${fmtDate(x.settled.endBefore)} → ${fmtDate(shiftDays(x.settled.days, x.settled.endBefore))}`], x.rejected && ["Rejected", `${x.rejected.reason} - ${x.rejected.by}`]].filter(Boolean)} />
        </Section>
        <Section title="History" icon={Icon.fileClock}><AuditList items={x.history.slice().reverse().map((h) => ({ id: "", action: h.what, by: h.by, at: h.at }))} /></Section>
      </div>
      {settle && <SettleClaimModal x={x} onClose={() => setSettle(false)} />}
      {assess && <SettleClaimModal x={x} mode="assess" onClose={() => setAssess(false)} />}
      {ev && <Modal open onClose={() => setEv(null)} width={480} title={`Add evidence - ${x.id}`} footer={<><Btn onClick={() => setEv(null)}>Cancel</Btn><Btn variant="primary" disabled={!ev.length} onClick={() => { decideClaim(x, "evidence", { files: ev }); setEv(null); }}>Add</Btn></>}><EvidenceInput files={ev} onChange={setEv} /></Modal>}
      {reject && <ReasonModal title={`Reject ${x.id}`} action="Reject claim" onClose={() => setReject(false)} onDone={(r) => decideClaim(x, "reject", { note: r })} />}
    </Drawer>
  );
}

const CLAIM_COLUMNS = (st, withContract = true) => [
  { key: "title", label: "Claim", render: (x) => <span className="flex flex-col"><span className="font-medium">{x.title}</span><span className="text-[11px] text-ink-mute"><span className="mono">{x.id}</span>{claimLate(st, x) > 0 && <span className="ml-2 text-amber-700">notice late</span>}</span></span> },
  ...(withContract ? [{ key: "c", label: "Contract", filterOptions: () => [...new Set(contractClaims(st).map((q) => vendorName(st, q.vendorId)))], filter: (x) => vendorName(st, x.vendorId), filterLabel: "Contractor", render: (x) => <span className="flex flex-col"><span>{vendorName(st, x.vendorId)}</span><span className="text-[11.5px] text-ink-mute">{x.contractId}</span></span> }] : []),
  { key: "type", label: "Type", filterOptions: CLAIM_TYPES, filter: true },
  { key: "amt", label: "Claimed", align: "right", render: (x) => <span className="num">{isEot(x) ? `${x.days} days` : inrShort(x.amount)}</span> },
  { key: "agr", label: "Agreed", align: "right", render: (x) => <span className="num">{x.settled ? (isEot(x) ? `${x.settled.days} days` : inrShort(x.settled.amount)) : "-"}</span> },
  { key: "status", label: "Status", filterOptions: Object.keys(CLAIM_TONE), filter: true, render: (x) => <Status tone={CLAIM_TONE[x.status]}>{x.status}</Status> },
  { key: "age", label: "Received", render: (x) => <span className="flex flex-col"><span>{fmtDate(x.submittedOn)}</span>{OPEN_CLAIM.includes(x.status) && <span className={cls("text-[11.5px]", claimAgeDays(x) > 30 ? "text-red-600" : "text-ink-mute")}>{claimAgeDays(x)} days open</span>}</span> },
];

function ClaimsPage() {
  const st = useStore();
  const [open, setOpen] = useQueryOpen();
  const [add, setAdd] = y.useState(false);
  const rows = contractClaims(st), live = rows.filter((x) => OPEN_CLAIM.includes(x.status)), done = rows.filter((x) => x.status === "Settled");
  return (
    <Page title="Claims" subtitle="Contractor claims - extension of time, price escalation and extra work - from receipt to settlement" icon={Icon.scale}
      actions={<Btn variant="primary" icon={Icon.plus} onClick={() => setAdd(true)}>Record claim</Btn>}>
      <div className="grid grid-cols-4 gap-3 px-4 pt-4">
        <StatTile tone="blue" label="Open claims" value={live.length} sub={inrShort(sum(live, (x) => x.amount))} icon={Icon.clock} />
        <StatTile tone="red" label="Open over 30 days" value={live.filter((x) => claimAgeDays(x) > 30).length} icon={Icon.alert} />
        <StatTile tone="green" label="Settled" value={inrShort(sum(done, (x) => x.settled.amount || 0))} sub={`claimed ${inrShort(sum(done, (x) => x.amount))}`} icon={Icon.check} />
        <StatTile tone="purple" label="EOT granted" value={`${sum(done.filter(isEot), (x) => x.settled.days || 0)} days`} icon={Icon.calendar} />
      </div>
      <DataTable noun="claims" rows={rows} onRow={(x) => setOpen(x.id)} columns={CLAIM_COLUMNS(st)} />
      {add && <ContractClaimModal onClose={(id) => { setAdd(false); id && setOpen(id); }} />}
      {open && <ContractClaimDrawer id={open} onClose={() => setOpen(null)} />}
    </Page>
  );
}

// On the contract record
function ContractClaimsSection({ c }) {
  const st = useStore(), nav = useNavigate();
  const [add, setAdd] = y.useState(false);
  const rows = contractClaims(st, c);
  const live = !["Draft", "Pending Approval", "Rejected", "Closed"].includes(c.status);
  return (
    <Section title="Claims" icon={Icon.scale} actions={live && <Btn size="sm" icon={Icon.plus} onClick={() => setAdd(true)}>Record claim</Btn>}>
      <DataTable dense rows={rows} onRow={(x) => nav(`${CL_BASE}/claims?open=${x.id}`)} empty={<p className="p-4 text-[13px] text-ink-mute">No claims on this contract.</p>} columns={CLAIM_COLUMNS(st, false)} />
      {add && <ContractClaimModal contractId={c.id} onClose={(id) => { setAdd(false); id && nav(`${CL_BASE}/claims?open=${id}`); }} />}
    </Section>
  );
}

function claimExceptions(st, add) {
  for (const x of contractClaims(st)) if (claimLate(st, x) && OPEN_CLAIM.includes(x.status)) add("Claim notice late (time-bar risk)", "Low", "Contract", x.contractId, vendorName(st, x.vendorId), `${x.id} ${x.type} - notice ${claimLate(st, x)} days after the event (allowed ${claimNoticeDays(st)})`, x.submittedOn, `${CL_BASE}/claims?open=${x.id}`);
  for (const x of contractClaims(st)) if (OPEN_CLAIM.includes(x.status) && claimAgeDays(x) > 30)
    add("Claim waiting for decision", "Medium", "Contract", x.contractId, vendorName(st, x.vendorId), `${x.id} ${x.type} - ${x.title} (${isEot(x) ? `${x.days} days` : inrShort(x.amount)}), open ${claimAgeDays(x)} days`, x.submittedOn, `${CL_BASE}/claims?open=${x.id}`);
}

function seedClaims(s) {
  if (s.contractClaims) return false;
  const D = (n) => new Date(Date.now() + n * DAY).toISOString().slice(0, 10), T = (n) => new Date(Date.now() + n * DAY).toISOString();
  const has = (id) => (s.contracts || []).some((c) => c.id === id);
  s.contractClaims = [
    has("CTR-001") && { id: "CLM-001", contractId: "CTR-001", vendorId: "VEN-001", type: "Price escalation", title: "Reinforcement steel price rise Jul-Sep", amount: 620000, days: 0, basis: "Clause 47 price variation - WPI steel index up 8.4% over base", reference: "SBIC/CTR-001/PV/03", submittedOn: D(-12), eventDate: D(-30), status: "Submitted", recordedBy: "Arjun Mehta", history: [{ at: T(-12), by: "Arjun Mehta", what: "Claim recorded" }] },
    has("CTR-001") && { id: "CLM-002", contractId: "CTR-001", vendorId: "VEN-001", type: "Extension of time", title: "Monsoon stoppage and late drawings for Tower B", amount: 0, days: 30, basis: "Clause 44 - 19 rain days and GFC drawings issued 3 weeks late", reference: "SBIC/CTR-001/EOT/01", submittedOn: D(-41), eventDate: D(-50), status: "Under review", reviewer: "Project Manager", recordedBy: "Arjun Mehta", history: [{ at: T(-41), by: "Arjun Mehta", what: "Claim recorded" }, { at: T(-35), by: "Arjun Mehta", what: "Review started" }] },
    has("CTR-004") && { id: "CLM-003", contractId: "CTR-004", vendorId: "VEN-010", type: "Extra work", title: "Rock excavation beyond BOQ in Block C", amount: 350000, days: 0, basis: "Hard rock met at 1.8 m - not in BOQ; instructed by site engineer", reference: "SEM/RX/02", submittedOn: D(-50), eventDate: D(-55), status: "Settled", recordedBy: "Arjun Mehta",
      settled: { amount: 280000, days: 0, note: "Agreed at BOQ rock rate after joint survey", by: "Vikram Rao", at: T(-20) }, history: [{ at: T(-50), by: "Arjun Mehta", what: "Claim recorded" }, { at: T(-20), by: "Vikram Rao", what: "Settled - ₹2,80,000 · Agreed at BOQ rock rate after joint survey" }] },
  ].filter(Boolean);
  return true;
}

// Several evidence files (photos, letters, records) on a claim
function EvidenceInput({ files, onChange }) {
  return (
    <div className="space-y-1.5" data-evidence>
      {files.map((f, i) => <div key={i} className="flex items-center justify-between rounded-md border border-line px-2.5 py-1 text-[12.5px]"><span className="truncate">{f.name}</span><IconBtn icon={Icon.trash} title="Remove" onClick={() => onChange(files.filter((_, j) => j !== i))} /></div>)}
      <label className="flex h-[32px] cursor-pointer items-center gap-2 rounded-md border border-dashed border-gray-300 px-2.5 text-[12.5px] text-ink-mute">
        <Icon.upload size={13} /><span>Attach a photo, letter or record</span>
        <input type="file" className="hidden" onChange={async (e) => { const a = await readAttachment(e.target.files[0]); a && onChange([...files, a]); e.target.value = ""; }} />
      </label>
    </div>
  );
}
