// Vendor verification & qualification (module 2) and the compliance gate
// (modules 11.2 / 12.1.5): approval routing, rule-set questionnaires,
// insurance validation, background checks and document expiry.

const RULE_SETS = [
  {
    id: "base", name: "Base - all vendors", applies: () => true, requalifyDays: 365,
    questions: [
      { key: "years", q: "Years in business", type: "number", score: (a) => Math.min(10, a), writeBack: ["contractor", "experienceYrs"] },
      { key: "turnover", q: "Average annual turnover, last 3 years (₹ Cr)", type: "number", score: (a) => Math.min(10, a / 3) },
      { key: "iso", q: "ISO 9001 certified?", type: "yesno", score: (a) => (a === "Yes" ? 10 : 4) },
      { key: "litigation", q: "Any ongoing litigation or arbitration?", type: "yesno", score: (a) => (a === "No" ? 10 : 2) },
    ],
  },
  {
    id: "contractor", name: "Contractor - labour & HSE", applies: (v) => v.isContractor || hasType(v, "Labor"), requalifyDays: 365,
    questions: [
      { key: "workforce", q: "Average deployable workforce", type: "number", score: (a) => Math.min(10, a / 20), writeBack: ["contractor", "workforce"] },
      { key: "clra", q: "Valid CLRA labour licence?", type: "yesno", score: (a) => (a === "Yes" ? 10 : 0) },
      { key: "lti", q: "Lost-time injuries in the last 3 years", type: "number", score: (a) => Math.max(0, 10 - a * 3) },
      { key: "hse", q: "Full-time HSE officer on payroll?", type: "yesno", score: (a) => (a === "Yes" ? 10 : 3) },
    ],
  },
  {
    id: "goods", name: "Material supplier", applies: (v) => hasType(v, "Goods"), requalifyDays: 730,
    questions: [
      { key: "mfr", q: "Manufacturer or trader?", type: "select", options: ["Manufacturer", "Authorised dealer", "Trader"], score: (a) => ({ Manufacturer: 10, "Authorised dealer": 8, Trader: 5 })[a] || 0 },
      { key: "capacity", q: "Maximum monthly supply capacity (₹ L)", type: "number", score: (a) => Math.min(10, a / 20) },
      { key: "mtc", q: "Test certificates supplied with every lot?", type: "yesno", score: (a) => (a === "Yes" ? 10 : 3) },
    ],
  },
  {
    id: "strategic", name: "Strategic / high value", applies: (v) => v.tier === "Strategic", requalifyDays: 365,
    questions: [
      { key: "solvency", q: "Bank solvency certificate (≤ 12 months old) available?", type: "yesno", score: (a) => (a === "Yes" ? 10 : 0) },
      { key: "bg", q: "Can furnish performance bank guarantee of 10%?", type: "yesno", score: (a) => (a === "Yes" ? 10 : 2) },
    ],
  },
];
const ruleSetsFor = (v) => RULE_SETS.filter((r) => r.applies(v));

// Insurance requirements come from Compliance Center → Requirements (settings.complianceIns)
function insuranceCheck(v) {
  return complianceItems(v).filter((i) => i.kind === "Insurance").map((i) => ({ rule: { ...i.rule, min: i.rule.min }, policy: i.policy, level: i.level,
    status: i.level === 0 ? "Compliant" : i.level === 1 ? (i.note === "Awaiting verification" ? "Pending" : "Expiring") : !i.policy ? "Missing" : i.note.startsWith("Expired") ? "Expired" : "Non-Compliant", note: i.note }));
}

function Questionnaire({ v }) {
  const sets = ruleSetsFor(v);
  const qs = sets.flatMap((s) => s.questions.map((q) => ({ ...q, set: s.name })));
  const [ans, setAns] = y.useState(() => ({ ...(v.qualification?.answers || {}) }));
  const lib = (settingsOf(getState()).questionLibrary || []).filter((q) => q.status === "Active" && (q.level !== "Contractor" || v.isContractor || hasType(v, "Labor")));
  const [la, setLa] = y.useState(() => ({ ...(v.qualification?.libAnswers || {}) }));
  const done = qs.every((q) => ans[q.key] !== undefined && ans[q.key] !== "") && lib.filter((q) => q.required && q.responder === "Supplier").every((q) => la[q.id] !== undefined && la[q.id] !== "");
  const submit = () => {
    const score = Math.round((sum(qs, (q) => q.score(ans[q.key])) / (qs.length * 10)) * 100);
    setState((s) => {
      const x = byId(s.vendors, v.id);
      x.qualification = { ...(x.qualification || {}), ruleSet: sets.map((r) => r.name).join(", "), score, answers: { ...ans }, libAnswers: { ...la }, at: todayISO() };
      if (x.requalRequired) { x.requalHistory = [...(x.requalHistory || []), { ...x.requalRequired, clearedAt: todayISO(), clearedBy: currentUser(), how: `Re-assessed - ${score}/100` }]; x.requalRequired = null; }
      for (const q of qs) if (q.writeBack && x[q.writeBack[0]]) x[q.writeBack[0]][q.writeBack[1]] = ans[q.key]; // response updates profile
    }, { entity: "Vendor", id: v.id, action: `Qualification questionnaire scored ${score}/100` });
    toast(`Qualification saved - ${score}/100`);
  };
  const qs0 = qualStatus(v);
  const due = v.qualification?.at && daysUntil(shiftDays(Math.min(...sets.map((s) => s.requalifyDays)), v.qualification.at)) < 0;
  return (
    <>
      <Note>Questions are generated from the rule sets that apply to this vendor: <b>{sets.map((s) => s.name).join(" · ")}</b>. Answers are written back to the vendor profile.</Note>
      {v.qualification && (
        <div className="flex items-center gap-3 rounded-lg border border-line p-3">
          <ScoreRing value={v.qualification.score} />
          <div className="text-[13px]">
            <p className="font-medium">Qualification score {v.qualification.score}/100 <Status tone={qs0.tone}>{qs0.status}</Status></p>
            <p className="text-ink-mute">Last assessed {fmtDate(v.qualification.at)} {due && <Status tone="amber">Requalification due</Status>}{qs0.limit > 0 && <> · aggregate limit <b className="num text-ink">{inrShort(qs0.limit)}</b></>}{qs0.single > 0 && <> · single project <b className="num text-ink">{inrShort(qs0.single)}</b></>}{qs0.expiry && <> · expires {fmtDate(qs0.expiry)}</>}{qs0.risk && <> · risk <b className="text-ink">{qs0.risk}</b></>}</p>
            {qs0.exceptions && <p className="text-amber-700">Exceptions: {qs0.exceptions}</p>}
          </div>
        </div>
      )}
      {v.qualification && v.qualification.score >= QUAL_PASS && <QualLimitForm v={v} />}
      <Section title="Questionnaire" icon={Icon.listChecks}>
        <div className="divide-y divide-line">
          {qs.map((q) => (
            <div key={q.key} className="grid grid-cols-[1fr_220px] items-center gap-4 px-4 py-2.5">
              <div><p className="text-[13px] text-ink">{q.q}</p><p className="text-[11px] text-ink-mute">{q.set}</p></div>
              {q.type === "number" ? <NumInput value={ans[q.key]} onChange={(x) => setAns({ ...ans, [q.key]: x })} />
                : <Select value={ans[q.key]} onChange={(x) => setAns({ ...ans, [q.key]: x })} placeholder="Select…" options={q.type === "yesno" ? ["Yes", "No"] : q.options} />}
            </div>
          ))}
        </div>
        {lib.length > 0 && (
          <div className="border-t border-line">
            <p className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-wide text-ink-mute">Question library</p>
            <div className="divide-y divide-line">
              {lib.map((q) => (
                <div key={q.id} className="grid grid-cols-[1fr_220px] items-center gap-4 px-4 py-2.5">
                  <div><p className="text-[13px] text-ink">{q.question}{q.required && <span className="text-red-500"> *</span>} {q.critical && <Status tone="red">Critical</Status>}</p>
                    <p className="text-[11px] text-ink-mute">{q.id} · owner {q.owner || "-"} · answered by {q.responder}{q.critical && la[q.id] === "No" ? " · failed - blocks final approval" : ""}</p></div>
                  {q.responseType === "Number" ? <NumInput value={la[q.id] ?? ""} onChange={(x) => setLa({ ...la, [q.id]: x })} />
                    : q.responseType === "Text" ? <TextInput value={la[q.id] || ""} onChange={(x) => setLa({ ...la, [q.id]: x })} />
                    : <Select value={la[q.id] || ""} placeholder="Select…" onChange={(x) => setLa({ ...la, [q.id]: x })} options={q.responseType === "Choice" ? String(q.options || "").split(",").map((o) => o.trim()).filter(Boolean) : ["Yes", "No"]} />}
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex justify-end border-t border-line p-3"><Btn variant="primary" disabled={!done} onClick={submit}>Save & score</Btn></div>
      </Section>
    </>
  );
}

// Background check result - litigation and watchlist must be Clear before mobilisation
function BackgroundModal({ v, onClose }) {
  const [f, setF] = y.useState(() => ({ credit: v.background?.credit || "A", litigation: "Clear", watchlist: "Clear", checkedAt: todayISO(), note: "" }));
  const adverse = f.litigation !== "Clear" || f.watchlist !== "Clear";
  const err = !f.checkedAt ? "Enter the check date" : VX.notFuture(f.checkedAt, "Check date can't be in the future") || (adverse && f.note.trim().length < 5 ? "Describe the finding (at least 5 characters)" : "");
  const save = () => {
    if (err) return toast(err, "red");
    setState((s) => { byId(s.vendors, v.id).background = { credit: f.credit, litigation: f.litigation, watchlist: f.watchlist, checkedAt: f.checkedAt, note: f.note.trim(), by: currentUser() }; },
      { entity: "Vendor", id: v.id, action: `Background check recorded - ${adverse ? `not clear (${f.note.trim()})` : "clear"}` });
    toast(adverse ? "Background check recorded - not clear, mobilisation blocked" : "Background check recorded - clear", adverse ? "amber" : "green"); onClose();
  };
  return (
    <Modal open onClose={onClose} width={560} title="Record background check" footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={!!err} onClick={save}>Save</Btn></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Credit rating"><Select value={f.credit} onChange={(x) => setF({ ...f, credit: x })} options={["A+", "A", "A-", "B+", "B", "C", "D"]} /></Field>
        <Field label="Checked on" required><DateInput value={f.checkedAt} onChange={(x) => setF({ ...f, checkedAt: x })} /></Field>
        <Field label="Litigation"><Select value={f.litigation} onChange={(x) => setF({ ...f, litigation: x })} options={["Clear", "Pending case", "Adverse"]} /></Field>
        <Field label="Watchlist / sanctions"><Select value={f.watchlist} onChange={(x) => setF({ ...f, watchlist: x })} options={["Clear", "Match found"]} /></Field>
        <Field label="Finding / note" span={2} required={adverse}><TextInput value={f.note} onChange={(x) => setF({ ...f, note: x })} placeholder={adverse ? "Required when not clear" : "Optional"} /></Field>
      </div>
      {err && <FieldErr m={err} />}
    </Modal>
  );
}

// Qualification outcome: project value limit and any exceptions (qualified with exceptions)
function QualLimitForm({ v }) {
  const q = v.qualification;
  const init = () => ({ lim: q.valueLimit != null && q.valueLimit !== "" ? q.valueLimit : qualStatus(v).limit, single: q.singleLimit ?? "", exc: q.exceptions || "", expiry: q.expiryDate || shiftDays(365, q.at || todayISO()),
    notes: q.notes || "", risk: q.riskRating || "Low", comments: { ...(q.reviewComments || {}) }, trades: [...(q.trades || [])], projects: [...(q.projects || [])], nextReview: q.nextReview || "" });
  const [f, setF] = y.useState(init);
  const lim = f.lim, exc = f.exc;
  const err = !(Number(lim) > 0) ? "Enter an aggregate project limit above zero"
    : f.single !== "" && !(Number(f.single) > 0) ? "Single-project limit must be above zero"
    : f.single !== "" && Number(f.single) > Number(lim) ? "Single-project limit can't be above the aggregate limit"
    : !f.expiry ? "Enter the qualification expiry date" : f.expiry <= todayISO() ? "Expiry date must be in the future"
    : f.nextReview && f.nextReview <= todayISO() ? "Next review date must be in the future" : f.nextReview && f.nextReview > f.expiry ? "Next review must fall before the expiry date"
    : exc.trim() && exc.trim().length < 5 ? "Describe the exception (at least 5 characters)"
    : exc.trim() && f.notes.trim().length < 5 ? "Add qualification notes when there are exceptions" : "";
  const dirty = JSON.stringify(f) !== JSON.stringify(init());
  const save = () => {
    if (err) return toast(err, "red");
    setState((s) => { const x = byId(s.vendors, v.id).qualification; Object.assign(x, { trades: f.trades, projects: f.projects, nextReview: f.nextReview || null, valueLimit: Number(lim), singleLimit: f.single === "" ? null : Number(f.single), exceptions: exc.trim(), expiryDate: f.expiry, notes: f.notes.trim(), riskRating: f.risk, reviewComments: f.comments }); },
      { entity: "Vendor", id: v.id, action: `Qualification outcome set - ${exc.trim() ? "qualified with exceptions" : "qualified"}, aggregate ${inrShort(Number(lim))}${f.single !== "" ? `, single ${inrShort(Number(f.single))}` : ""}, expires ${fmtDate(f.expiry)}, risk ${f.risk}` });
    toast("Qualification outcome saved");
  };
  const cats = ruleSetsFor(v).map((r) => r.name);
  return (
    <Section title="Qualification outcome" icon={Icon.shieldCheck}>
      <div className="grid grid-cols-4 items-start gap-3 p-4">
        <Field label="Aggregate project limit (₹)" hint="All open work together"><NumInput value={lim} onChange={(x) => setF({ ...f, lim: x })} /></Field>
        <Field label="Single project limit (₹)" hint="One work order; blank = no separate cap"><NumInput value={f.single} onChange={(x) => setF({ ...f, single: x })} /></Field>
        <Field label="Qualification expiry date"><DateInput value={f.expiry} onChange={(x) => setF({ ...f, expiry: x })} /></Field>
        <Field label="Risk rating"><Select value={f.risk} onChange={(x) => setF({ ...f, risk: x })} options={["Low", "Medium", "High", "Critical"]} /></Field>
        <Field label="Qualified trades" span={2}><TradePicker options={TRADES} value={f.trades} placeholder="Select trades" onChange={(x) => setF({ ...f, trades: x })} /></Field>
        <Field label="Qualified projects"><TradePicker options={PROJECTS} value={f.projects} placeholder="Select projects" onChange={(x) => setF({ ...f, projects: x })} /></Field>
        <Field label="Next review date"><DateInput value={f.nextReview} onChange={(x) => setF({ ...f, nextReview: x })} /></Field>
        <Field label="Exceptions (leave blank if none)" span={2} hint="Anything that makes this 'Qualified with exceptions'"><TextArea rows={2} value={exc} onChange={(x) => setF({ ...f, exc: x })} placeholder="e.g. ISO 45001 certificate pending" /></Field>
        <Field label="Qualification notes" span={2}><TextArea rows={2} value={f.notes} onChange={(x) => setF({ ...f, notes: x })} placeholder="Basis of the decision, conditions" /></Field>
        {cats.map((c) => <Field key={c} label={`Review comments - ${c}`} span={2}><TextInput value={f.comments[c] || ""} onChange={(x) => setF({ ...f, comments: { ...f.comments, [c]: x } })} /></Field>)}
        <div className="col-span-4 flex justify-end"><Btn variant="primary" disabled={!dirty || !!err} onClick={save}>Save outcome</Btn></div>
      </div>
      {err && <div className="px-4 pb-3"><FieldErr m={err} /></div>}
      <p className="border-t border-line px-4 py-2 text-[11.5px] text-ink-mute">A work order above the single-project limit, or one that takes open work above the aggregate limit, shows a warning. After the expiry date the status becomes Expired. Not-qualified contractors can't receive new work orders.</p>
    </Section>
  );
}

// Returns true when the decision was recorded. Each stage needs its department's role, one
// person can't decide two stages (or their own submission), and the last stage checks the
// approval preconditions unless a Finance Controller records an override with a reason.
function approvalAction(v, decision, remark, opts = {}) {
  const i = v.approval.stages.findIndex((st) => st.status === "Pending");
  if (i < 0 || v.status !== "Pending Approval") return false;
  const stg = v.approval.stages[i], last = approvalFinishes(v.approval.stages, i);
  if (decision === "Approved" && alreadyVoted(stg)) { toast(`You already approved ${stg.dept} - ${stg.need} different approvers are needed`, "red"); return false; }
  if (!tryAct(DEPT_ROLE[stg.dept], vendorApprovers(v), `the ${stg.dept} decision`)) return false;
  if (decision === "Rejected" && !(remark || "").trim()) { toast("A reason is required to reject", "red"); return false; }
  if (decision === "Approved" && last) {
    const b = approvalBlockers(v);
    if (b.length && !opts.override) { toast(`Can't approve yet - ${b.join("; ")}`, "red"); return false; }
    if (b.length && !(remark || "").trim()) { toast("An override needs a reason", "red"); return false; }
  }
  const ov = decision === "Approved" && last && opts.override ? approvalBlockers(v) : null;
  setState((s) => {
    const x = byId(s.vendors, v.id);
    const st0 = x.approval.stages[i];
    if (decision !== "Approved") { Object.assign(st0, { status: decision, by: currentUser(), at: new Date().toISOString(), remark }); if (decision === "Rejected") x.status = "Rejected"; return; }
    if (ov && ov.length) st0.override = ov;
    if (recordApproval(x.approval.stages, i, remark) === "done") { x.status = "Active"; x.approvedOn = todayISO(); }
  }, { entity: "Vendor", id: v.id, action: `${decision} at ${stg.dept}${decision === "Approved" && (stg.need || 1) > 1 ? ` (${(stg.votes || []).length + 1} of ${stg.need})` : ""}${ov && ov.length ? ` with override (${ov.join("; ")})` : ""}${remark ? ` - ${remark}` : ""}` });
  return true;
}
function resubmit(v) {
  const b = submitBlockers(v);
  if (b.length) { toast(`Upload the required documents first - ${b.join("; ")}`, "red"); return false; }
  setState((s) => {
    const x = byId(s.vendors, v.id);
    // a first submission picks up the current approval stages from Procurement Settings
    if (x.status === "Draft" && !x.approval.stages.some((st) => st.status === "Approved")) x.approval = { stages: vendorFlowRows(x, s).map(stageFrom("dept")) };
    // approvals already given are kept; routing resumes at the first stage not yet approved
    const i = Math.max(0, x.approval.stages.findIndex((st) => st.status !== "Approved"));
    x.approval.stages.forEach((st, j) => { if (j >= i) Object.assign(st, { status: "Waiting", by: null, at: null, remark: "", since: null, escalated: null, votes: [] }); });
    openStageGroup(x.approval.stages, i, new Date().toISOString());
    if (x.changeRequest && !x.changeRequest.resolvedAt) x.changeRequest = { ...x.changeRequest, resolvedAt: new Date().toISOString() };
    x.status = "Pending Approval";
    x.submittedBy = currentUser(); x.submittedAt = new Date().toISOString();
  }, { entity: "Vendor", id: v.id, action: v.status === "Draft" ? "Submitted for approval" : "Corrected and resubmitted" });
  return true;
}

function VendorApproval({ v, mode = "approval" }) {
  const decide = mode === "approval";
  const [remark, setRemark] = y.useState("");
  const [rc, setRc] = y.useState(false), [edit, setEdit] = y.useState(false);
  const stages = v.approval.stages;
  const pending = stages.find((s) => s.status === "Pending");
  const comp = complianceOf(v);
  return (
    <>
      <Section title="Approval routing" icon={Icon.clipboardCheck}>
        {/* possible duplicate supplier - shown to the approver before deciding */}
        {!lifeStatus(v) && <DuplicateReview v={v} canDecide={decide && v.status === "Pending Approval"} />}
        {v.noteToApprover && <div className="border-b border-line px-4 py-2"><Note icon={Icon.info}><b>Note to approver:</b> {v.noteToApprover}</Note></div>}
        <div className="p-5">
          <Stepper steps={stages.map((s) => ({
            label: s.dept,
            status: s.status === "Approved" ? "done" : s.status === "Rejected" ? "rejected" : s.status === "Pending" || s.status === "Changes Requested" ? "current" : "todo",
            meta: s.by ? `${s.by} · ${fmtDateTime(s.at)}${s.remark && s.remark !== "OK" ? ` - ${s.remark}` : ""}` : s.status === "Pending" ? `Awaiting decision${stageNeedText(s)}${s.parallel ? " · runs with the previous stage" : ""}` : "",
          }))} />
        </div>
        <ApprovalDeadline rec={v} kind="vendor" />
        {pending && !decide && v.status === "Pending Approval" && (
          <div className="flex items-center justify-between gap-3 border-t border-line p-4">
            <span className="text-[13px] text-ink-soft">Waiting for <b>{pending.dept}</b>. Approvers record their decision in Vendor Approvals or Approval Management - this view is read-only.</span>
            <span className="shrink-0 whitespace-nowrap text-[13px]"><RefLink to={`${VM_BASE}/approvals?open=${v.id}`}>Open in Vendor Approvals →</RefLink></span>
          </div>
        )}
        {pending && decide && v.status === "Pending Approval" && (() => {
          const blockers = approvalBlockers(v), last = approvalFinishes(stages, stages.indexOf(pending));
          const canOverride = last && blockers.length > 0 && hasRole("Finance Controller");
          return (
          <div className="space-y-3 border-t border-line p-4">
            <ActNote roles={DEPT_ROLE[pending.dept]} involved={vendorApprovers(v)} what={`the ${pending.dept} decision`} />
            <Field label={`${pending.dept} decision remark`}><TextArea rows={2} value={remark} onChange={setRemark} placeholder={canOverride ? "Required when rejecting or approving with override" : "Required when rejecting"} /></Field>
            <div className="flex justify-end gap-2">
              <Btn onClick={() => setRc(true)}>Request changes</Btn>
              <Btn variant="danger" disabled={!remark.trim()} title={remark.trim() ? "" : "Write a remark first"} onClick={() => { if (approvalAction(v, "Rejected", remark.trim())) { setRemark(""); toast("Registration rejected", "red"); } }}>Reject</Btn>
              {canOverride && <Btn disabled={!remark.trim()} title={remark.trim() ? "" : "Write a remark first"} onClick={() => { if (approvalAction(v, "Approved", remark.trim(), { override: true })) { setRemark(""); toast("Approved with override - logged"); } }}>Approve with override</Btn>}
              <Btn variant="success" icon={Icon.check} disabled={last && blockers.length > 0} title={last && blockers.length ? `Close first: ${blockers.join(" · ")}` : ""} onClick={() => { if (approvalAction(v, "Approved", remark.trim())) { setRemark(""); toast(`${pending.dept} approved`); } }}>Approve as {pending.dept}</Btn>
            </div>
          </div>
          );
        })()}
        {v.status === "Changes Requested" && v.changeRequest && (
          <div className="border-t border-line p-4"><Note tone="amber"><b>Waiting for the vendor</b> - {v.changeRequest.by} ({v.changeRequest.dept}) asked on {fmtDate(v.changeRequest.at)} for: {v.changeRequest.items.map((i) => `${i.label}${i.note ? ` (${i.note})` : ""}`).join("; ")}. The vendor fixes these in the supplier portal and resubmits; approval resumes at {v.changeRequest.dept}.</Note></div>
        )}
        {rc && <RequestChangesModal v={v} onClose={() => setRc(false)} />}
        {edit && <EditRegistrationModal v={v} onClose={() => setEdit(false)} />}
        {!decide && EDITABLE_STATUSES.includes(v.status) && (
          <div className="flex items-center justify-between gap-3 border-t border-line p-4">
            <span className="text-[13px] text-ink-soft">{v.status === "Draft" ? "Draft registration - use Edit details and upload documents, then submit. Details lock once submitted." : "Sent back by the approver - you can edit the details again (Edit details), then resubmit. Earlier approvals are kept."}</span>
            <Btn variant="primary" icon={Icon.send} onClick={() => { if (resubmit(v)) toast("Submitted for approval"); }}>{v.status === "Draft" ? "Submit for approval" : "Resubmit"}</Btn>
          </div>
        )}
        {v.status === "Active" && v.regTier === "Prospective" && <SpendAuthPanel v={v} />}
      </Section>
    </>
  );
}

// ---------------------------------------------------------------- approvals page
function VendorApprovalsPage() {
  const st = useStore();
  const [tab, setTab] = y.useState("queue");
  const [open, setOpen] = useQueryOpen();
  const queue = st.vendors.filter((v) => ["Pending Approval", "Draft", "Rejected", "Changes Requested"].includes(v.status));
  const byDept = [...new Set([...(settingsOf(st).vendorFlow || []).map((x) => x.name), ...st.vendors.flatMap((v) => (v.approval?.stages || []).filter((s) => s.status === "Pending").map((s) => s.dept))])].filter(Boolean).map((d) => ({ d, n: st.vendors.filter((v) => v.approval.stages.some((s) => s.dept === d && s.status === "Pending")).length }));
  return (
    <Page title="Vendor Approvals" subtitle="Multi-stage approval, qualification rule sets and requalification" icon={Icon.clipboardCheck}>
      <TabBar active={tab} onChange={setTab} tabs={[{ id: "queue", label: "Approval queue", icon: Icon.clipboardList }, { id: "scores", label: "Qualification results", icon: Icon.listChecks }]} />
      {tab === "queue" && (
        <DataTable noun="vendors" rows={queue} defaultCols={["name", "type", "stage", "sla", "status"]} onRow={(v) => setOpen(v.id)} empty={<EmptyState icon={Icon.check} title="Approval queue is clear" text="New registrations will show up here." />} columns={[
          { key: "name", label: "Vendor", className: "font-medium" },
          { key: "type", label: "Supplies", filterOptions: VENDOR_TYPES, filter: (v) => vTypes(v), render: (v) => <span className="text-ink-soft">{typeLabel(v)}</span> },
          { key: "stage", label: "Routing", filterOptions: FO.stage, filter: (v) => (v.approval?.stages || []).find((s) => s.status === "Pending")?.dept || "-", filterLabel: "Stage", render: (v) => (
            <span className="flex items-center gap-1">
              {v.approval.stages.map((s) => (
                <span key={s.dept} title={`${s.dept}: ${s.status}`} className={cls("rounded px-1.5 py-[1px] text-[11px] font-medium",
                  s.status === "Approved" ? "bg-green-100 text-green-700" : s.status === "Pending" ? "bg-blue-100 text-blue-700" : s.status === "Changes Requested" ? "bg-amber-100 text-amber-800" : s.status === "Rejected" ? "bg-red-100 text-red-700" : "bg-gray-100 text-ink-mute")}>{s.dept}</span>
              ))}
            </span>) },
          { key: "since", label: "Registered", render: (v) => fmtDate(v.createdAt) },
          { key: "sla", label: "Decision due", filterOptions: ["Overdue", "Due today", "On time"], filter: (v) => approvalClock(v, "vendor", st)?.state || "", sort: (v) => approvalClock(v, "vendor", st)?.due || "9999", render: (v) => { const c = approvalClock(v, "vendor", st); return c ? <span className="flex flex-col"><Status tone={slaTone(c)}>{slaText(c)}</Status><span className="text-[11px] text-ink-mute">{fmtDate(c.due)}{c.escalated ? " · escalated" : ""}</span></span> : "-"; } },
          { key: "status", label: "Status", filterOptions: FO.vendorStatus, filter: (v) => v.status, render: (v) => <Status>{v.status}</Status> },
        ]} />
      )}
      {tab === "rules" && (
        <div className="grid grid-cols-2 gap-4 p-4">
          {RULE_SETS.map((r) => (
            <Section key={r.id} title={r.name} icon={Icon.sliders} actions={<span className="text-[11.5px] text-ink-mute">Requalify every {r.requalifyDays} days</span>}>
              <ul className="divide-y divide-line">
                {r.questions.map((q) => <li key={q.key} className="flex items-center justify-between px-4 py-2 text-[13px]"><span>{q.q}</span><span className="text-[11px] text-ink-mute">{q.type === "yesno" ? "Yes / No" : q.type}{q.writeBack ? " · writes to profile" : ""}</span></li>)}
              </ul>
              <p className="border-t border-line px-4 py-2 text-[11.5px] text-ink-mute">Applies to {st.vendors.filter(r.applies).length} vendors</p>
            </Section>
          ))}
        </div>
      )}
      {tab === "scores" && (
        <DataTable noun="vendors" defaultCols={["name", "score", "res", "lim", "exp"]} rows={st.vendors.filter((v) => v.qualification)} onRow={(v) => setOpen(v.id)} columns={[
          { key: "name", label: "Vendor", className: "font-medium" },
          { key: "sets", label: "Rule sets", filterOptions: FO.ruleSets, filter: (v) => v.qualification.ruleSet, render: (v) => <span className="text-[12px] text-ink-soft">{v.qualification.ruleSet}</span> },
          { key: "score", label: "Score", render: (v) => <ScoreBadge value={v.qualification.score} /> },
          { key: "res", label: "Result", filterOptions: FO.qualResult, filter: (v) => qualStatus(v).status, render: (v) => { const q = qualStatus(v); return <Status tone={q.tone}>{q.status}</Status>; } },
          { key: "risk", label: "Risk", filterOptions: ["Low", "Medium", "High", "Critical"], filter: (v) => v.qualification.riskRating || "", render: (v) => v.qualification.riskRating ? <Status tone={{ Low: "green", Medium: "amber", High: "red", Critical: "red" }[v.qualification.riskRating]}>{v.qualification.riskRating}</Status> : "-" },
          { key: "exp", label: "Expires", render: (v) => (qualStatus(v).expiry ? <ExpiryCell iso={qualStatus(v).expiry} /> : "-") },
          { key: "lim", label: "Aggregate / single limit", align: "right", sort: (v) => qualStatus(v).limit, render: (v) => <span className="num">{qualStatus(v).limit ? inrShort(qualStatus(v).limit) : "-"}{qualStatus(v).single ? ` / ${inrShort(qualStatus(v).single)}` : ""}</span> },
          { key: "at", label: "Assessed", render: (v) => fmtDate(v.qualification.at || v.createdAt) },
        ]} />
      )}
      {open && <VendorDrawer vendorId={open} initialTab="approval" mode="approval" onClose={() => setOpen(null)} />}
    </Page>
  );
}

