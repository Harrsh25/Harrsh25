// Control layer: PO acknowledgment by the supplier, project budget check on requisitions and POs.

// ---------------------------------------------------------------- PO acknowledgment (supplier accepts or proposes a new date)
const ACK_TONE = { Accepted: "green", "Accepted (new date)": "green", "New date proposed": "amber", "Date rejected": "red", "Awaiting acknowledgment": "blue" };
function poAckState(po) {
  if (["Draft", "Cancelled"].includes(po.status)) return null;
  if (po.ack) return po.ack.status;
  return po.status === "Issued" && poStatus(po) === "Issued" ? "Awaiting acknowledgment" : null;
}
const PoAckChip = ({ po }) => { const s = poAckState(po); return s ? <Status tone={ACK_TONE[s]}>{s}</Status> : null; };
function PoAckModal({ po, by, onClose }) {
  const [f, setF] = y.useState({ response: "", date: "", note: "" });
  const propose = f.response === "Propose a new delivery date";
  const err = !f.response ? "Select your response" : propose && (!f.date || f.date <= todayISO()) ? "Enter a future delivery date" : propose && f.date === po.deliveryDate ? "That is the current delivery date" : propose && f.note.trim().length < 5 ? "Give the reason for the new date" : "";
  const save = () => {
    setState((s) => { const p = byId(s.purchaseOrders, po.id); p.ack = { status: propose ? "New date proposed" : "Accepted", proposedDate: propose ? f.date : null, note: f.note.trim(), by, at: new Date().toISOString() }; },
      { entity: "PO", id: po.id, action: propose ? `Supplier proposed a new delivery date ${fmtDate(f.date)} - ${f.note.trim()}` : "Supplier acknowledged the PO" });
    toast(propose ? "New date sent to the buyer" : "PO acknowledged"); onClose();
  };
  return (
    <Modal open onClose={onClose} width={520} title={`Acknowledge ${po.id}`} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={!!err} title={err} onClick={save}>Send</Btn></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Response" required span={2}><Select value={f.response} onChange={(x) => setF({ ...f, response: x })} options={["Accept as issued", "Propose a new delivery date"]} /></Field>
        {propose && <Field label="New delivery date" required info={`Current ${fmtDate(po.deliveryDate)}`}><DateInput value={f.date} onChange={(x) => setF({ ...f, date: x })} /></Field>}
        {propose && <Field label="Reason" required><TextInput value={f.note} onChange={(x) => setF({ ...f, note: x })} /></Field>}
      </div>
    </Modal>
  );
}
function decideAckDate(po, accept, reason) {
  setState((s) => {
    const p = byId(s.purchaseOrders, po.id), d = p.ack.proposedDate;
    if (accept) { p.revisions.push({ rev: p.revisions.length, at: new Date().toISOString(), by: currentUser(), note: `Delivery date ${fmtDate(p.deliveryDate)} → ${fmtDate(d)} (supplier request)` }); p.deliveryDate = d; p.ack.status = "Accepted (new date)"; }
    else p.ack.status = "Date rejected";
    p.ack.decidedBy = currentUser(); p.ack.decidedAt = new Date().toISOString(); p.ack.decision = reason || "";
  }, { entity: "PO", id: po.id, action: accept ? `Supplier's new delivery date ${fmtDate(po.ack.proposedDate)} accepted` : `Supplier's new delivery date rejected - ${reason}` });
  toast(accept ? "Delivery date updated" : "New date rejected - supplier informed", accept ? "green" : "red");
}
function ackExceptions(st, add) {
  const days = Number(settingsOf(st).poAckDays) || 0;
  for (const po of st.purchaseOrders) {
    const s = poAckState(po), to = `${VM_BASE}/purchase-orders?open=${po.id}`;
    if (s === "Awaiting acknowledgment" && days && -daysUntil(po.date) > days) add("PO not acknowledged by supplier", "Medium", "PO", po.id, vendorName(st, po.vendorId), `Issued ${fmtDate(po.date)} - no acknowledgment after ${days} days`, po.date, to);
    if (s === "New date proposed") add("Supplier proposed a new delivery date", "Medium", "PO", po.id, vendorName(st, po.vendorId), `${fmtDate(po.deliveryDate)} → ${fmtDate(po.ack.proposedDate)} - ${po.ack.note}`, po.ack.at.slice(0, 10), to);
  }
}

// ---------------------------------------------------------------- project budget check
// Committed = issued / draft purchase orders + live contracts on the project (cancelled and rejected ones don't count)
function projectCommitted(st, project, skip = {}) {
  const pos = st.purchaseOrders.filter((p) => p.project === project && !["Cancelled"].includes(p.status) && p.id !== skip.poId);
  const ctrs = st.contracts.filter((c) => c.project === project && !["Draft", "Rejected", "Pending Approval"].includes(c.status));
  return round2(sum(pos, poValue) + sum(ctrs, contractValue));
}
function budgetCheck(st, project, amount, skip) {
  const budget = Number((settingsOf(st).projectBudgets || {})[project]) || 0, mode = settingsOf(st).budgetCheck || "Off";
  if (!budget || mode === "Off") return { budget, mode, committed: 0, after: 0, over: false, text: "" };
  const committed = projectCommitted(st, project, skip), after = round2(committed + (Number(amount) || 0)), over = after > budget + 0.5;
  return { budget, mode, committed, after, over, left: round2(budget - after), text: over ? `Over the ${project} budget by ${inrShort(after - budget)} (budget ${inrShort(budget)}, committed ${inrShort(committed)}, this ${inrShort(amount)})` : "" };
}
function BudgetLine({ project, amount, skip }) {
  const st = useStore(), b = budgetCheck(st, project, amount, skip);
  if (!b.budget || b.mode === "Off") return null;
  return (
    <div data-budget className={cls("flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-4 py-2.5 text-[12.5px]", b.over ? "border-red-200 bg-red-50/50" : "border-line")}>
      <b>Project budget</b><span>Budget <b className="num">{inrShort(b.budget)}</b></span><span>Committed <b className="num">{inrShort(b.committed)}</b></span><span>This <b className="num">{inrShort(amount)}</b></span>
      <span className={b.over ? "font-semibold text-red-600" : "text-green-700"}>{b.over ? `Over by ${inrShort(b.after - b.budget)}${b.mode === "Stop" ? " - approval blocked" : ""}` : `${inrShort(b.left)} left after this`}</span>
    </div>
  );
}
function ProjectBudgetsEditor({ f, setF }) {
  const b = f.projectBudgets || {};
  return (
    <Section title="Project budgets" icon={Icon.wallet}>
      <div className="grid grid-cols-3 gap-3 p-4" data-budgets>
        <Field label="Budget check on approval"><Select value={f.budgetCheck || ""} onChange={(x) => setF({ ...f, budgetCheck: x })} options={["Stop", "Warn", "Off"]} /></Field>
        {PROJECTS.map((p) => <Field key={p} label={p}><NumInput value={b[p] ?? ""} onChange={(x) => setF({ ...f, projectBudgets: { ...b, [p]: x } })} placeholder="No budget" /></Field>)}
      </div>
    </Section>
  );
}
const budgetErr = (f) => Object.entries(f.projectBudgets || {}).filter(([, v]) => v !== "" && v != null && !(Number(v) >= 0)).map(([p]) => `Budget for ${p} must be a positive amount`)[0] || "";

// Demo: budgets per project (one is tight so the check shows), and the POs issued earlier are acknowledged
function seedControls(s) {
  if (s.controlsSeeded) return false;
  s.controlsSeeded = true;
  s.settings = s.settings || {};
  if (!s.settings.projectBudgets) {
    const b = {};
    for (const p of PROJECTS) { const c = projectCommitted({ purchaseOrders: s.purchaseOrders || [], contracts: s.contracts || [] }, p); b[p] = c ? Math.round((c * (p === "Metro Line Extension" ? 1.02 : 1.3)) / 100000) * 100000 : 5000000; }
    s.settings.projectBudgets = b;
  }
  if (!s.settings.budgetCheck) s.settings.budgetCheck = "Warn";
  for (const po of s.purchaseOrders || []) if (po.status === "Issued" && !po.ack && po.id !== "PO-003") po.ack = { status: "Accepted", proposedDate: null, note: "", by: "Supplier (portal)", at: new Date(new Date(po.date).getTime() + DAY).toISOString() };
  return true;
}
