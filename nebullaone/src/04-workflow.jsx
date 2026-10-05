// Workflow controls added after the end-to-end audit: approval preconditions,
// spend-authorization requests, sourcing gates, contract and work-order gates and
// the daily sweep that ends expired holds.
//
// Role-based permissions and segregation of duties were removed at the user's request:
// every signed-in user may perform every step. The helpers below keep their names so the
// call sites stay readable (they document which department owns a step), but never block.

// Department that owns each step - shown in labels only
const DEPT_ROLE = { Procurement: "Procurement Head", Legal: "Legal Counsel", Finance: "Finance Controller" };
const RA_ROLE = { Verified: "Site Engineer", Certified: "Quantity Surveyor", Approved: "Project Manager", Paid: "Accounts" };
const PAY_ROLES = ["Accounts", "Finance Controller"];

function hostUserName() {
  try { const u = at.user(); return (u && u.name) || "Demo User"; } catch { return "Demo User"; }
}
function actor() { return { name: hostUserName(), role: "User" }; }
const hasRole = () => true;
const actBlock = () => null;
const tryAct = () => true;
const ActNote = () => null;

// ---------------------------------------------------------------- vendor approval preconditions
// Documents that block payment must be verified, the qualification must pass, and a
// spend-authorized vendor needs a bank account - before the final (Finance) approval.
const QUAL_PASS = 70;
function approvalBlockers(v) {
  const out = [];
  for (const i of complianceItems(v)) {
    if (!i.rule.blocks) continue;
    if (i.kind === "Document" && !(i.doc && i.doc.status === "Verified" && i.level < 2)) out.push(`${i.name}: ${i.level === 1 ? "awaiting verification" : i.note.toLowerCase()}`);
    if (i.kind === "Insurance" && i.level === 2) out.push(`${i.name}: ${i.note.toLowerCase()}`);
  }
  for (const q of (settingsOf(getState()).questionLibrary || []).filter((x) => x.status === "Active" && x.critical && x.responseType === "Yes / No"))
    if (v.qualification?.libAnswers?.[q.id] === "No") out.push(`Critical question failed: ${q.question}`);
  if (!v.qualification) out.push("Qualification questionnaire not completed");
  else if (v.qualification.score < QUAL_PASS) out.push(`Qualification score ${v.qualification.score}/100 is below ${QUAL_PASS}`);
  if (v.regTier === "Spend Authorized" && !(v.bankAccounts || []).length) out.push("No bank account on file");
  return out;
}
// Required documents must be uploaded before a registration is submitted
function submitBlockers(v) {
  if (!currentSettings().requireDocsOnSubmit) return [];
  return requiredDocs(v).filter((n) => { const d = (v.docs || []).find((x) => x.name === n); return !d || d.status === "Missing" || (!d.file && d.status !== "Verified"); })
    .map((n) => `${n} not uploaded`);
}
// Everyone who already took part in the vendor's approval chain
const vendorApprovers = (v) => [v.submittedBy, ...(v.approval?.stages || []).filter((s) => s.status === "Approved").map((s) => s.by)];

// ---------------------------------------------------------------- spend authorization (Prospective → Spend Authorized)
function spendAuthBlockers(v) {
  const out = [];
  if (v.status !== "Active") out.push(`Vendor is ${v.status}`);
  if (!(v.bankAccounts || []).length) out.push("No bank account on file");
  for (const i of complianceItems(v)) if (i.rule.blocks && i.kind === "Document" && !(i.doc && i.doc.status === "Verified" && i.level < 2)) out.push(`${i.name} not verified`);
  if (!v.qualification) out.push("Qualification not completed");
  else if (v.qualification.score < QUAL_PASS) out.push(`Qualification ${v.qualification.score}/100 below ${QUAL_PASS}`);
  return out;
}
function requestSpendAuth(v, note) {
  const b = spendAuthBlockers(v);
  if (b.length) { toast(`Can't request yet - ${b.join("; ")}`, "red"); return false; }
  setState((s) => { byId(s.vendors, v.id).tierRequest = { status: "Pending", by: currentUser(), at: new Date().toISOString(), note: note || "" }; },
    { entity: "Vendor", id: v.id, action: "Spend authorization requested - waiting for Finance" });
  toast("Spend authorization requested - Finance approves it in Approval Management");
  return true;
}
function decideSpendAuth(v, approve, remark) {
  if (!v.tierRequest || v.tierRequest.status !== "Pending") return false;
  if (!tryAct("Finance Controller", [v.tierRequest.by], "spend authorization")) return false;
  if (approve) { const b = spendAuthBlockers(v); if (b.length) { toast(`Can't authorize - ${b.join("; ")}`, "red"); return false; } }
  setState((s) => {
    const x = byId(s.vendors, v.id);
    Object.assign(x.tierRequest, { status: approve ? "Approved" : "Rejected", decidedBy: currentUser(), decidedAt: new Date().toISOString(), remark: remark || "" });
    if (approve) x.regTier = "Spend Authorized";
  }, { entity: "Vendor", id: v.id, action: approve ? "Spend authorization approved - POs, contracts and payments allowed" : `Spend authorization rejected - ${remark}` });
  toast(approve ? `${v.name} is now spend-authorized` : "Spend authorization rejected", approve ? "green" : "red");
  return true;
}

// Request / decide panel shown on a Prospective vendor (vendor drawer → Approval tab and Flags)
function SpendAuthPanel({ v }) {
  const [note, setNote] = y.useState(""), [remark, setRemark] = y.useState("");
  const req = v.tierRequest, b = spendAuthBlockers(v);
  if (req && req.status === "Pending") return (
    <div className="space-y-3 border-t border-line p-4">
      <Note>Spend authorization requested by <b>{req.by}</b> on {fmtDate(req.at)}{req.note ? ` - ${req.note}` : ""}. Waiting for the Finance Controller.</Note>
      {b.length > 0 && <Note tone="amber">Open: {b.join(" · ")}</Note>}
      <ActNote roles="Finance Controller" involved={[req.by]} what="spend authorization" />
      <div className="grid grid-cols-[1fr_auto_auto] items-end gap-2">
        <Field label="Finance remark"><TextInput value={remark} onChange={setRemark} placeholder="Required to reject" /></Field>
        <Btn variant="danger" disabled={!remark.trim()} title={remark.trim() ? "" : "Write a remark first"} onClick={() => decideSpendAuth(v, false, remark.trim())}>Reject</Btn>
        <Btn variant="success" icon={Icon.check} disabled={b.length > 0} onClick={() => decideSpendAuth(v, true, remark.trim())}>Approve spend authorization</Btn>
      </div>
    </div>
  );
  return (
    <div className="space-y-3 border-t border-line p-4">
      <p className="text-[13px] text-ink-soft">Prospective vendors can take part in RFQs only. Spend authorization (Finance approval) allows POs, contracts and payments.</p>
      {req && req.status === "Rejected" && <Note tone="red">Last request rejected by {req.decidedBy}: {req.remark}</Note>}
      {b.length > 0 && <Note tone="amber">Before requesting: {b.join(" · ")}</Note>}
      <div className="grid items-end gap-2" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
        <Field label="Justification"><TextInput value={note} onChange={setNote} placeholder="e.g. L1 on RFQ-004; needed for Tower C package" /></Field>
        <Btn variant="primary" disabled={b.length > 0} onClick={() => requestSpendAuth(v, note.trim()) && setNote("")}>Request spend authorization</Btn>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- sourcing gates (RFQ invite / PO)
function requalDue(v) {
  if (!v.qualification?.at) return false;
  const sets = ruleSetsFor(v);
  return sets.length > 0 && daysUntil(shiftDays(Math.min(...sets.map((s) => s.requalifyDays)), v.qualification.at)) < 0;
}
// Qualification status with the project value it covers. The limit defaults from the
// score (≥85 → ₹50 Cr, ≥70 → ₹10 Cr) and can be set on the Qualification tab.
const QUAL_STATUSES = ["Qualified", "Qualified with exceptions", "Not qualified", "Expired", "Requalification required", "Not assessed"];
function qualStatus(v) {
  const q = v?.qualification;
  if (!q) return { status: "Not assessed", tone: "gray", limit: 0, exceptions: "" };
  // aggregate limit = all open work; single limit = one work order (Procore single / aggregate project limit)
  const limit = q.valueLimit != null && q.valueLimit !== "" ? Number(q.valueLimit) : q.score >= 85 ? 500000000 : q.score >= QUAL_PASS ? 100000000 : 0;
  const single = q.singleLimit != null && q.singleLimit !== "" ? Number(q.singleLimit) : 0;
  const exceptions = (q.exceptions || "").trim();
  const base = { limit, single, exceptions, expiry: q.expiryDate || null, risk: q.riskRating || "" };
  if (q.score < QUAL_PASS) return { ...base, status: "Not qualified", tone: "red", limit: 0, single: 0 };
  if (requalDue(v) || (q.expiryDate && q.expiryDate < todayISO())) return { ...base, status: "Expired", tone: "red" };
  if (v.requalRequired) return { ...base, status: "Requalification required", tone: "red" };
  return { ...base, status: exceptions ? "Qualified with exceptions" : "Qualified", tone: exceptions ? "amber" : "green" };
}
// Warning when a contractor's open work (plus a new order of `value`) goes over its qualification limit
function qualLimitWarn(st, v, value, exceptWoId) {
  const q = qualStatus(v);
  if (!v || !v.isContractor || !q.limit) return "";
  const open = sum(st.workOrders.filter((w) => w.vendorId === v.id && w.id !== exceptWoId && !["Draft", "Cancelled", "Closed", "Completed", "Short-closed"].includes(w.status)), (w) => woValue(w));
  const total = open + (Number(value) || 0);
  if (q.single && (Number(value) || 0) > q.single) return `Over the single-project limit - this work order ${inrShort(Number(value) || 0)} against ${inrShort(q.single)} (${q.status})`;
  return total > q.limit ? `Over the aggregate qualification limit - open work ${inrShort(open)} + this ${inrShort(Number(value) || 0)} = ${inrShort(total)} against ${inrShort(q.limit)} (${q.status})` : "";
}
// Background checks are no longer recorded in the vendor record, so they don't block mobilisation.
// The earlier rule (clear litigation and watchlist, checked within 12 months) is kept below, switched off.
const BACKGROUND_GATE = false;
function backgroundIssue(v) {
  if (!BACKGROUND_GATE) return "";
  const b = v?.background;
  if (!b || !b.checkedAt) return "Background check not done";
  if (b.litigation !== "Clear") return `Background check: litigation ${String(b.litigation).toLowerCase()}`;
  if (b.watchlist !== "Clear") return `Background check: watchlist / sanctions ${String(b.watchlist).toLowerCase()}`;
  if (daysUntil(shiftDays(365, b.checkedAt)) < 0) return `Background check older than 12 months (${fmtDate(b.checkedAt)})`;
  return "";
}
// "rfq" | "po" → { mode: Stop|Warn|Off, issues[] }
function sourcingGate(st, v, what) {
  const set0 = settingsOf(st);
  const mode = what === "rfq" ? set0.rfqComplianceGate : set0.poComplianceGate;
  const issues = [...complianceOf(v).blocking];
  if (requalDue(v)) issues.push("requalification overdue");
  // Close-out evaluation / termination feeds back into sourcing: requalify before the next award
  const rq = v.requalRequired && set0.requalGate !== "Off" ? `requalification required - ${v.requalRequired.reason}` : "";
  const hard = !!rq && set0.requalGate === "Stop";
  if (rq) issues.push(rq);
  return { mode: hard ? "Stop" : mode, issues, block: hard || (mode === "Stop" && issues.length > 0), warn: !hard && (mode === "Warn" || !!rq) && issues.length > 0 };
}

// ---------------------------------------------------------------- PO approval (one place for drawer + Approval Management)
// Approval limits (delegation of authority): each level approves up to its limit; a PO above it also needs the next level
const DEFAULT_PO_LIMITS = [{ level: "Procurement Head", upTo: 5000000 }, { level: "Finance Controller", upTo: 50000000 }, { level: "Managing Director", upTo: "" }];
function poLevels(value, st) {
  const L = (settingsOf(st || getState()).poApprovalLimits || DEFAULT_PO_LIMITS).filter((l) => l.level), out = [];
  for (const l of L) { out.push(l); if (l.upTo === "" || l.upTo == null || value <= Number(l.upTo)) break; }
  return out;
}
function poApprovalState(p, st) {
  const levels = poLevels(poValue(p), st), done = p.approvals || [];
  return { levels, done, next: levels[done.length] || null, i: done.length };
}
function decidePo(p, approve, remark) {
  if (p.status !== "Draft") return false;
  const a = poApprovalState(p), lvl = a.next?.level || "Procurement Head";
  if (!tryAct(lvl, [p.revisions?.[0]?.by, p.awardBy, ...a.done.map((d) => d.by)], "PO approval")) return false;
  if (!approve && !(remark || "").trim()) { toast("A reason is required to reject", "red"); return false; }
  if (approve) {
    const v = byId(getState().vendors, p.vendorId);
    if (!v || !eligibleForPo(v)) { toast(`${v ? v.name : p.vendorId} can't receive a PO (${v ? `${v.status}, ${v.regTier}` : "missing"})`, "red"); return false; }
  }
  const last = a.i + 1 >= a.levels.length, val = poValue(p);
  setState((s) => {
    const x = byId(s.purchaseOrders, p.id);
    if (approve) x.approvals = [...(x.approvals || []), { level: lvl, by: currentUser(), at: new Date().toISOString(), remark: remark || "" }];
    if (!approve) x.status = "Cancelled";
    else if (last) x.status = "Issued";
    if (!approve || last) x.approval = { by: currentUser(), at: new Date().toISOString(), decision: approve ? "Approved" : "Rejected", remark: remark || "", levels: a.levels.map((l) => l.level) };
  }, { entity: "PO", id: p.id, action: !approve ? `Rejected by ${lvl} - ${remark}` : last ? `Approved by ${lvl} & issued${a.levels.length > 1 ? ` (${a.levels.length} levels for ${inrShort(val)})` : ""}` : `Approved by ${lvl} (limit ${inrShort(Number(a.next.upTo))}) - ${a.levels[a.i + 1].level} approves next (PO ${inrShort(val)})` });
  toast(!approve ? `${p.id} rejected` : last ? `${p.id} approved & issued` : `${lvl} approved - above ${inrShort(Number(a.next.upTo))}, ${a.levels[a.i + 1].level} approves next`, approve ? "green" : "red");
  return true;
}

// ---------------------------------------------------------------- retention release: request → Finance approval → Accounts release
function decideRelease(r, approve, remark) {
  if (!["Due", "Pending Approval"].includes(r.status)) return false;
  if (!tryAct("Finance Controller", [r.requestedBy], "retention-release approval")) return false;
  if (!approve && !(remark || "").trim()) { toast("A reason is required to reject", "red"); return false; }
  setState((s) => Object.assign(byId(s.retentionReleases, r.id), { status: approve ? "Approved" : "Rejected", approvedBy: currentUser(), approvedAt: new Date().toISOString(), remark: remark || "" }),
    { entity: "Retention", id: r.id, action: approve ? `Release of ${inr(r.amount)} approved for ${r.contractId}` : `Release rejected - ${remark}` });
  toast(approve ? `${r.id} approved - Accounts can release it` : `${r.id} rejected`, approve ? "green" : "red");
  return true;
}
function releaseRetention(r) {
  if (r.status !== "Approved") return false;
  if (!tryAct(PAY_ROLES, [r.requestedBy, r.approvedBy], "releasing the retention payment")) return false;
  setState((s) => Object.assign(byId(s.retentionReleases, r.id), { status: "Released", releasedOn: todayISO(), releasedBy: currentUser() }),
    { entity: "Retention", id: r.id, action: `Released ${inr(r.amount)} for ${r.contractId}` });
  toast(`${r.id} released`);
  return true;
}

// ---------------------------------------------------------------- contracts: approval, signing, guarantees, termination, closure
const CONTRACT_FLOW = ["Legal Counsel", "Finance Controller"];
const CONTRACT_DEFAULTS = () => ({ project: PROJECTS[0], type: "Item-Rate", start: todayISO(), end: shiftDays(365), retentionPct: 5, advancePct: 10, advanceRecoveryPct: 10, cessPct: 1, gstPct: 18,
  dlpMonths: 12, ldPctPerWeek: 0.5, ldCapPct: 5, pbgPct: 5, bgNo: "", bgExpiry: "", owner: currentUser(), paymentDays: 30, noticeDays: 15 });
// Project → WBS elements (cost breakdown the work orders are booked against)
const PROJECT_WBS = {
  "Skyline Towers - Phase 1": ["1.1 Site enabling", "2.1 Tower A - substructure", "2.2 Tower A - superstructure", "2.3 Tower B - substructure", "2.4 Tower B - superstructure", "3.1 Finishes", "4.1 MEP services"],
  "Metro Line Extension": ["1.1 Station 3", "1.2 Station 4", "1.3 Station 5", "2.1 Viaduct", "3.1 Systems"],
  "400kV Transmission Line A": ["1.1 Survey & foundations", "1.2 Tower erection - Section 1", "1.3 Stringing - Section 1", "2.1 Section 2"],
  "Riverside Business Park": ["1.1 Earthworks - Block B", "1.2 Earthworks - Block C", "2.1 Block B structure", "2.2 Block C structure"],
  "Solar Farm Substation": ["1.1 Switchyard civil", "1.2 Inverter stations", "2.1 Electrical & commissioning"],
};
const wbsFor = (project) => PROJECT_WBS[project] || [];

// Why a contractor can't be contracted / given work right now
function contractorBlockers(st, v) {
  if (!v) return ["Contractor not found"];
  const out = [];
  if (v.status !== "Active" && !(v.status === "On Hold" && v.hold?.scope !== "All")) out.push(`Contractor is ${v.status}`);
  if (isBlockedFor(v, "All")) out.push(`Contractor is blocked (${v.hold ? `hold: ${v.hold.reason}` : v.status})`);
  if (v.regTier !== "Spend Authorized") out.push("Contractor is not spend-authorized");
  const sg = sourcingGate(st, v, "po");
  if (sg.block) out.push(...sg.issues);
  return [...new Set(out)];
}
const contractInvolved = (c) => [c.submittedBy, c.awardBy, ...((c.approval?.stages) || []).filter((s) => s.status === "Approved").map((s) => s.by)];
function submitContract(c) {
  const st = getState(), v = byId(st.vendors, c.vendorId);
  const errs = [];
  if (!(Number(c.value) > 0)) errs.push("contract value");
  if (!(c.end > c.start)) errs.push("completion after start");
  errs.push(...contractorBlockers(st, v));
  if (errs.length) { toast(`Can't submit - ${errs.join("; ")}`, "red"); return false; }
  const flow = contractFlowFor(contractValue(c), st);
  setState((s) => {
    const x = byId(s.contracts, c.id);
    x.status = "Pending Approval"; x.submittedBy = currentUser(); x.submittedAt = new Date().toISOString();
    x.approval = { stages: flow.map((role, i) => ({ role, status: i === 0 ? "Pending" : "Waiting", by: null, at: null, remark: "", since: i === 0 ? x.submittedAt : null })) };
  }, { entity: "Contract", id: c.id, action: `Submitted for approval (${flow.join(" → ")})` });
  toast(`${c.id} submitted - ${flow[0]} approves next`);
  return true;
}
function decideContract(c, approve, remark) {
  if (c.status !== "Pending Approval") return false;
  const i = c.approval.stages.findIndex((x) => x.status === "Pending"), stg = c.approval.stages[i];
  if (!tryAct(stg.role, contractInvolved(c), `the ${stg.role} contract approval`)) return false;
  if (!approve && !(remark || "").trim()) { toast("A reason is required to reject", "red"); return false; }
  if (approve && i === c.approval.stages.length - 1) {
    const b = contractorBlockers(getState(), byId(getState().vendors, c.vendorId));
    if (b.length) { toast(`Can't approve - ${b.join("; ")}`, "red"); return false; }
  }
  setState((s) => {
    const x = byId(s.contracts, c.id), sg = x.approval.stages[i];
    Object.assign(sg, { status: approve ? "Approved" : "Rejected", by: currentUser(), at: new Date().toISOString(), remark: remark || "" });
    if (!approve) x.status = "Rejected";
    else if (i + 1 < x.approval.stages.length) Object.assign(x.approval.stages[i + 1], { status: "Pending", since: sg.at });
    else { x.status = "Approved"; x.approvedOn = todayISO(); }
  }, { entity: "Contract", id: c.id, action: `${approve ? "Approved" : "Rejected"} by ${stg.role}${remark ? ` - ${remark}` : ""}` });
  toast(approve ? (i + 1 < c.approval.stages.length ? `${stg.role} approved - ${c.approval.stages[i + 1].role} next` : `${c.id} approved - ready to sign`) : `${c.id} rejected - back to the owner`, approve ? "green" : "red");
  return true;
}
// ---------------------------------------------------------------- approval deadlines (SLA) and escalation
// Each approval stage has a number of days to decide (Procurement Settings → Approval stages). The clock
// starts when the stage becomes the pending one; past the deadline the record can be escalated.
const SLA_DEFAULT = { vendor: 3, contract: 2 };
const ESCALATE_DEFAULT = { vendor: "Procurement Head", contract: "Finance Controller" };
function stageRule(kind, name, st) { return (settingsOf(st || getState())[kind === "vendor" ? "vendorFlow" : "contractFlow"] || []).find((x) => x.name === name) || {}; }
function approvalClock(rec, kind, st) {
  if (!rec || rec.status !== "Pending Approval") return null;
  const stages = rec.approval?.stages || [], i = stages.findIndex((s) => s.status === "Pending");
  if (i < 0) return null;
  const s = stages[i], name = kind === "vendor" ? s.dept : s.role, rule = stageRule(kind, name, st);
  const days = Number(rule.slaDays) > 0 ? Number(rule.slaDays) : SLA_DEFAULT[kind];
  const since = s.since || (i > 0 && stages[i - 1].at) || rec.submittedAt || rec.createdAt;
  const due = new Date(new Date(since).getTime() + days * DAY).toISOString().slice(0, 10);
  const left = daysUntil(due);
  return { i, stage: s, name, since, days, due, left, overdue: left < 0 ? -left : 0, state: left < 0 ? "Overdue" : left === 0 ? "Due today" : "On time", escalated: s.escalated || null, escalateTo: rule.escalateTo || ESCALATE_DEFAULT[kind] };
}
const slaTone = (c) => (!c ? undefined : c.state === "Overdue" ? "red" : c.state === "Due today" ? "amber" : "green");
const slaText = (c) => (!c ? "-" : c.state === "Overdue" ? `Overdue ${c.overdue} day${c.overdue === 1 ? "" : "s"}` : c.state === "Due today" ? "Due today" : `Due in ${c.left} day${c.left === 1 ? "" : "s"}`);
function escalateApproval(kind, rec, note) {
  const c = approvalClock(rec, kind);
  if (!c) return false;
  setState((s) => {
    const x = byId(kind === "vendor" ? s.vendors : s.contracts, rec.id);
    x.approval.stages[c.i].escalated = { to: c.escalateTo, by: currentUser(), at: new Date().toISOString(), note: note || "" };
  }, { entity: kind === "vendor" ? "Vendor" : "Contract", id: rec.id, action: `Approval escalated to ${c.escalateTo} - ${c.name} stage ${slaText(c).toLowerCase()} (deadline ${fmtDate(c.due)})${note ? ` - ${note}` : ""}` });
  toast(`Escalated to ${c.escalateTo}`);
  return true;
}
// Shown under the approval stepper: deadline, overdue state and the Escalate action
function ApprovalDeadline({ rec, kind }) {
  const st = useStore(), c = approvalClock(rec, kind, st);
  const [open, setOpen] = y.useState(false), [note, setNote] = y.useState("");
  if (!c) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-[13px]" data-sla>
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-ink-soft">{c.name} decision due <b className="font-medium text-ink">{fmtDate(c.due)}</b> ({c.days}-day deadline)</span>
        <Status tone={slaTone(c)}>{slaText(c)}</Status>
        {c.escalated && <span className="text-ink-soft">· Escalated to <b className="font-medium text-ink">{c.escalated.to}</b> by {c.escalated.by} on {fmtDate(c.escalated.at)}{c.escalated.note ? ` - ${c.escalated.note}` : ""}</span>}
      </span>
      {c.state === "Overdue" && !c.escalated && <Btn size="sm" icon={Icon.alert} onClick={() => setOpen(true)}>Escalate</Btn>}
      {open && (
        <Modal open width={480} title={`Escalate to ${c.escalateTo}`} onClose={() => setOpen(false)} footer={<><Btn onClick={() => setOpen(false)}>Cancel</Btn><Btn variant="primary" onClick={() => { if (escalateApproval(kind, rec, note.trim())) { setOpen(false); setNote(""); } }}>Escalate</Btn></>}>
          <p className="mb-3 text-[13px] text-ink-soft">{c.name} has not decided on {rec.id} - {slaText(c).toLowerCase()} (deadline {fmtDate(c.due)}). {c.escalateTo} is told and the escalation is kept in the audit log.</p>
          <Field label="Note (optional)"><TextArea rows={2} value={note} onChange={setNote} placeholder="e.g. Site mobilisation waits on this vendor" /></Field>
        </Modal>
      )}
    </div>
  );
}
// Guarantee status from its dates
function bgStatus(g) {
  if (g.status === "Returned" || g.status === "Encashed") return g.status;
  const d = daysUntil(g.expiry);
  return d !== null && d < 0 ? "Expired" : d !== null && d <= 30 ? "Expiring" : "Active";
}
const liveGuarantees = (c, type) => (c.guarantees || []).filter((g) => (!type || g.type === type) && ["Active", "Expiring"].includes(bgStatus(g)));
function signBlockers(st, c) {
  const out = [...contractorBlockers(st, byId(st.vendors, c.vendorId))];
  const need = round2(((Number(c.pbgPct) || 0) * (Number(c.value) || 0)) / 100);
  if (need > 0 && sum(liveGuarantees(c, "Performance"), (g) => g.amount) < need - 1) out.push(`Performance bank guarantee of ${inrShort(need)} (${c.pbgPct}%) not on file`);
  return out;
}
function activateContract(c) {
  if (c.status !== "Approved") return false;
  if (!tryAct(["Procurement Head", "Project Manager"], contractInvolved(c).slice(2), "signing the contract")) return false;
  const b = signBlockers(getState(), c);
  if (b.length) { toast(`Can't sign - ${b.join("; ")}`, "red"); return false; }
  setState((s) => { const x = byId(s.contracts, c.id); x.status = "Active"; x.signedOn = todayISO(); x.signedBy = currentUser(); x.signedReceivedOn = x.signedReceivedOn || todayISO(); }, { entity: "Contract", id: c.id, action: "Signed & activated" });
  toast(`${c.id} signed - work orders can now be issued`);
  return true;
}
function terminateContract(c, reason) {
  if (!tryAct("Procurement Head", [], "terminating a contract")) return false;
  setState((s) => {
    const x = byId(s.contracts, c.id);
    x.status = "Terminated"; x.terminated = { by: currentUser(), at: new Date().toISOString(), reason };
    if (x.defaultCase && x.defaultCase.status === "Open") { x.defaultCase.status = "Terminated"; x.defaultCase.history.push({ at: x.terminated.at, by: x.terminated.by, what: `Decision: terminate - ${reason}` }); }
    s.workOrders.filter((w) => w.contractId === c.id && ["Draft", "Issued", "In Progress", "Suspended"].includes(w.status)).forEach((w) => { w.status = w.status === "Draft" ? "Cancelled" : "Short-closed"; w.closedReason = `Contract terminated - ${reason}`; });
  }, { entity: "Contract", id: c.id, action: `Terminated - ${reason}` });
  toast(`${c.id} terminated; open work orders short-closed`, "red");
  return true;
}
// Everything that must be true before a contract closes
function closureChecklist(st, c) {
  const wos = st.workOrders.filter((w) => w.contractId === c.id);
  const woIds = new Set(wos.map((w) => w.id));
  const led = contractLedger(st, c);
  const pendingRel = st.retentionReleases.filter((r) => r.contractId === c.id && !["Released", "Rejected"].includes(r.status));
  const dlpEnd = shiftDays((c.dlpMonths || 0) * 30, c.handover?.date || c.end);
  const unpaid = st.raBills.filter((b) => b.contractId === c.id && !["Paid", "Rejected"].includes(b.status));
  const billedAny = st.raBills.some((b) => b.contractId === c.id && b.status !== "Rejected");
  const items = [
    ["All work orders completed, short-closed or cancelled", wos.every((w) => ["Completed", "Short-closed", "Cancelled", "Closed"].includes(w.status))],
    ["No measurements waiting for JMS sign-off", !st.measurements.some((m) => woIds.has(m.woId) && m.jms.status !== "Signed" && !m.voided)],
    ["No signed measurements left unbilled", !st.measurements.some((m) => woIds.has(m.woId) && m.jms.status === "Signed" && !m.billedIn && (m.qty > 0 || m.pct > 0))],
    ["No contractor claims waiting", !st.claims.some((x) => woIds.has(x.woId) && x.status === "Submitted")],
    ["No change orders pending", !(c.changeOrders || []).some((o) => o.status === "Pending")],
    ["All RA / final bills paid", unpaid.length === 0],
    ["No open punch-list items or NCRs", !(st.punchItems || []).some((p) => p.contractId === c.id && p.status !== "Closed") && !(st.ncrs || []).some((n) => woIds.has(n.woId) && n.status !== "Closed")],
  ];
  if (c.status !== "Terminated") {
    items.push(["Handover certificate issued", !!c.handover]);
    items.push(["Final bill paid", !billedAny || st.raBills.some((b) => b.contractId === c.id && b.final && b.status === "Paid")]);
    items.push([`Defect liability period ended (${fmtDate(dlpEnd)})`, daysUntil(dlpEnd) < 0]);
  }
  items.push(["Retention fully released", led.retentionBalance <= 0.5 && pendingRel.length === 0]);
  items.push(["Mobilisation advance fully recovered", led.advanceBalance <= 0.5]);
  items.push(["Bank guarantees returned or encashed", liveGuarantees(c).length === 0 && !(c.guarantees || []).some((g) => bgStatus(g) === "Expired")]);
  items.push(["Final settlement agreed with the contractor", c.settlement?.status === "Agreed"]);
  if (c.status === "Terminated") items.push(["Blacklist decision recorded", !!c.blacklistDecision]);
  else items.push(["Contractor release certificate issued", !!c.release]);
  return items.map(([label, ok]) => ({ label, ok }));
}
function closeContract(c) {
  const st = getState(), open = closureChecklist(st, c).filter((i) => !i.ok);
  if (open.length) { toast(`Can't close - ${open.map((i) => i.label.toLowerCase()).join("; ")}`, "red"); return false; }
  if (!tryAct(["Procurement Head", "Project Manager"], [], "closing a contract")) return false;
  setState((s) => {
    const x = byId(s.contracts, c.id); x.closedFrom = x.status; x.status = "Closed"; x.closedOn = todayISO(); x.closedBy = currentUser();
    s.workOrders.filter((w) => w.contractId === c.id).forEach((w) => { if (w.status === "Completed" || w.status === "Short-closed") w.status = "Closed"; });
  }, { entity: "Contract", id: c.id, action: "Contract closed - work orders and measurement book frozen" });
  toast(`${c.id} closed`);
  return true;
}

// ---------------------------------------------------------------- work orders: who can receive work
function woIssueBlockers(st, contractId) {
  const c = byId(st.contracts, contractId);
  if (!c) return ["Select a contract"];
  const out = [];
  const cs = contractStatus(c);
  if (!["Active", "Expiring"].includes(cs)) out.push(`Contract is ${cs}${cs === "Approved" ? " but not signed yet" : ""}`);
  const v = byId(st.vendors, c.vendorId);
  out.push(...contractorBlockers(st, v));
  if (v) {
    const bg = backgroundIssue(v); if (bg) out.push(`${bg} - mobilisation blocked until it is clear`);
    const q = qualStatus(v); if (v.isContractor && ["Not qualified", "Not assessed"].includes(q.status)) out.push(`Contractor qualification: ${q.status}`);
  }
  if (settingsOf(st).mobilisationBeforeWo && v && !st.workOrders.some((w) => w.vendorId === v.id && w.status !== "Draft" && w.status !== "Cancelled")) {
    const ck = v.onboarding?.checklist || [];
    const left = ck.filter((x) => !x.done).length;
    if (!ck.length || left) out.push(`Mobilisation checklist incomplete (${left || ONBOARD_CHECKLIST.length} item${(left || ONBOARD_CHECKLIST.length) === 1 ? "" : "s"} open) - Contractor Onboarding`);
  }
  return [...new Set(out)];
}
// Contract BOQ position: scope qty vs ordered (WO lines linked by boqRef) vs measured vs billed
function contractBoq(st, c) {
  const wos = st.workOrders.filter((w) => w.contractId === c.id && w.type !== "Lump Sum" && !["Cancelled"].includes(w.status));
  return (c.scope || []).map((l) => {
    const links = wos.flatMap((w) => (w.items || []).filter((i) => i.boqRef === l.id).map((i) => ({ w, i })));
    const ordered = sum(links, (x) => x.i.qty);
    const pos = links.map((x) => woPosition(st, x.w).find((p) => p.line.id === x.i.id)).filter(Boolean);
    return { ...l, ordered, measured: sum(pos, (p) => p.measured), billed: sum(pos, (p) => p.billed), balance: round2(l.qty - ordered) };
  });
}

// ---------------------------------------------------------------- daily sweep
// Holds with a release date in the past end automatically (the vendor returns to Active).
// Payment terms that come with a vendor group (a child group inherits its parent's)
const groupTerms = (st, g) => { const m = (settingsOf(st).vendorGroupTerms || {}); return !g ? "" : m[g] || m[String(g).split(" › ")[0]] || ""; };
// Odoo "Receipt reminder": N days before the expected delivery the vendor is reminded to confirm / ship
const reminderDays = (st, v) => (v && !VX.blank(v.receiptReminderDays) ? Number(v.receiptReminderDays) : Number(settingsOf(st).receiptReminderDays) || 0);
const receiptReminderDue = (st, po) => {
  const v = byId(st.vendors || [], po.vendorId), d = reminderDays(st, v);
  return d > 0 && ["Issued", "Partially Received"].includes(poStatus(po)) && daysUntil(po.deliveryDate) >= 0 && daysUntil(po.deliveryDate) <= d && !(po.reminders || []).some((r) => r.for === po.deliveryDate);
};
function sweepState(s) {
  let changed = applyBankSwitches(s) > 0;
  for (const po of s.purchaseOrders || []) {
    if (receiptReminderDue(s, po)) {
      po.reminders = [...(po.reminders || []), { at: new Date().toISOString(), for: po.deliveryDate, auto: true }];
      (s.audit = s.audit || []).unshift({ at: new Date().toISOString(), by: "System", entity: "PO", id: po.id, action: `Receipt reminder e-mailed to the vendor - delivery due ${fmtDate(po.deliveryDate)}` });
      changed = true;
    }
  }
  for (const v of s.vendors || []) {
    if (v.status === "On Hold" && v.hold && v.hold.until && daysUntil(v.hold.until) < 0) {
      v.holdHistory = [...(v.holdHistory || []), { ...v.hold, endedAt: todayISO(), ended: "Release date passed" }];
      v.status = "Active"; v.hold = null; changed = true;
      (s.audit = s.audit || []).unshift({ at: new Date().toISOString(), by: "System", entity: "Vendor", id: v.id, action: "Hold ended on its release date - vendor back to Active" });
    }
  }
  return changed;
}
