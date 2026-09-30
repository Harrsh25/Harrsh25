// Vendor verification & qualification (module 2) and the compliance gate
// (modules 11.2 / 12.1.5): approval routing, rule-set questionnaires,
// insurance validation, background checks and document expiry.

const RULE_SETS = [
  {
    id: "base", name: "Base — all vendors", applies: () => true, requalifyDays: 365,
    questions: [
      { key: "years", q: "Years in business", type: "number", score: (a) => Math.min(10, a), writeBack: ["contractor", "experienceYrs"] },
      { key: "turnover", q: "Average annual turnover, last 3 years (₹ Cr)", type: "number", score: (a) => Math.min(10, a / 3) },
      { key: "iso", q: "ISO 9001 certified?", type: "yesno", score: (a) => (a === "Yes" ? 10 : 4) },
      { key: "litigation", q: "Any ongoing litigation or arbitration?", type: "yesno", score: (a) => (a === "No" ? 10 : 2) },
    ],
  },
  {
    id: "contractor", name: "Contractor — labour & HSE", applies: (v) => v.isContractor || v.type === "Labor", requalifyDays: 365,
    questions: [
      { key: "workforce", q: "Average deployable workforce", type: "number", score: (a) => Math.min(10, a / 20), writeBack: ["contractor", "workforce"] },
      { key: "clra", q: "Valid CLRA labour licence?", type: "yesno", score: (a) => (a === "Yes" ? 10 : 0) },
      { key: "lti", q: "Lost-time injuries in the last 3 years", type: "number", score: (a) => Math.max(0, 10 - a * 3) },
      { key: "hse", q: "Full-time HSE officer on payroll?", type: "yesno", score: (a) => (a === "Yes" ? 10 : 3) },
    ],
  },
  {
    id: "goods", name: "Material supplier", applies: (v) => v.type === "Goods", requalifyDays: 730,
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
  const done = qs.every((q) => ans[q.key] !== undefined && ans[q.key] !== "");
  const submit = () => {
    const score = Math.round((sum(qs, (q) => q.score(ans[q.key])) / (qs.length * 10)) * 100);
    setState((s) => {
      const x = byId(s.vendors, v.id);
      x.qualification = { ruleSet: sets.map((r) => r.name).join(", "), score, answers: { ...ans }, at: todayISO() };
      for (const q of qs) if (q.writeBack && x[q.writeBack[0]]) x[q.writeBack[0]][q.writeBack[1]] = ans[q.key]; // response updates profile
    }, { entity: "Vendor", id: v.id, action: `Qualification questionnaire scored ${score}/100` });
    toast(`Qualification saved — ${score}/100`);
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
            <p className="text-ink-mute">Last assessed {fmtDate(v.qualification.at)} {due && <Status tone="amber">Requalification due</Status>}{qs0.limit > 0 && <> · project value limit <b className="num text-ink">{inrShort(qs0.limit)}</b></>}</p>
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
        <div className="flex justify-end border-t border-line p-3"><Btn variant="primary" disabled={!done} onClick={submit}>Save & score</Btn></div>
      </Section>
    </>
  );
}

// Background check result — litigation and watchlist must be Clear before mobilisation
function BackgroundModal({ v, onClose }) {
  const [f, setF] = y.useState(() => ({ credit: v.background?.credit || "A", litigation: "Clear", watchlist: "Clear", checkedAt: todayISO(), note: "" }));
  const adverse = f.litigation !== "Clear" || f.watchlist !== "Clear";
  const err = !f.checkedAt ? "Enter the check date" : VX.notFuture(f.checkedAt, "Check date can't be in the future") || (adverse && f.note.trim().length < 5 ? "Describe the finding (at least 5 characters)" : "");
  const save = () => {
    if (err) return toast(err, "red");
    setState((s) => { byId(s.vendors, v.id).background = { credit: f.credit, litigation: f.litigation, watchlist: f.watchlist, checkedAt: f.checkedAt, note: f.note.trim(), by: currentUser() }; },
      { entity: "Vendor", id: v.id, action: `Background check recorded — ${adverse ? `not clear (${f.note.trim()})` : "clear"}` });
    toast(adverse ? "Background check recorded — not clear, mobilisation blocked" : "Background check recorded — clear", adverse ? "amber" : "green"); onClose();
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
  const [lim, setLim] = y.useState(q.valueLimit != null && q.valueLimit !== "" ? q.valueLimit : qualStatus(v).limit);
  const [exc, setExc] = y.useState(q.exceptions || "");
  const err = !(Number(lim) > 0) ? "Enter a project value limit above zero" : exc.trim() && exc.trim().length < 5 ? "Describe the exception (at least 5 characters)" : "";
  const dirty = Number(lim) !== qualStatus(v).limit || exc.trim() !== (q.exceptions || "").trim();
  const save = () => {
    if (err) return toast(err, "red");
    setState((s) => { const x = byId(s.vendors, v.id).qualification; x.valueLimit = Number(lim); x.exceptions = exc.trim(); },
      { entity: "Vendor", id: v.id, action: `Qualification outcome set — ${exc.trim() ? "qualified with exceptions" : "qualified"}, limit ${inrShort(Number(lim))}` });
    toast("Qualification outcome saved");
  };
  return (
    <Section title="Qualification outcome" icon={Icon.shieldCheck}>
      <div className="grid grid-cols-[200px_1fr_auto] items-start gap-3 p-4">
        <Field label="Project value limit (₹)"><NumInput value={lim} onChange={setLim} /></Field>
        <Field label="Exceptions (leave blank if none)" hint="Anything that makes this 'Qualified with exceptions'"><TextInput value={exc} onChange={setExc} placeholder="e.g. ISO 45001 certificate pending" /></Field>
        <div className="pt-6"><Btn variant="primary" disabled={!dirty || !!err} onClick={save}>Save outcome</Btn></div>
      </div>
      {err && <div className="px-4 pb-3"><FieldErr m={err} /></div>}
      <p className="border-t border-line px-4 py-2 text-[11.5px] text-ink-mute">Work orders that take the contractor's open work above this limit show a warning. Expired or not-qualified contractors can't receive new work orders.</p>
    </Section>
  );
}

// Returns true when the decision was recorded. Each stage needs its department's role, one
// person can't decide two stages (or their own submission), and the last stage checks the
// approval preconditions unless a Finance Controller records an override with a reason.
function approvalAction(v, decision, remark, opts = {}) {
  const i = v.approval.stages.findIndex((st) => st.status === "Pending");
  if (i < 0 || v.status !== "Pending Approval") return false;
  const stg = v.approval.stages[i], last = i === v.approval.stages.length - 1;
  if (!tryAct(DEPT_ROLE[stg.dept], vendorApprovers(v), `the ${stg.dept} decision`)) return false;
  if (decision === "Rejected" && !(remark || "").trim()) { toast("A reason is required to reject", "red"); return false; }
  if (decision === "Approved" && last) {
    const b = approvalBlockers(v);
    if (b.length && !opts.override) { toast(`Can't approve yet — ${b.join("; ")}`, "red"); return false; }
    if (b.length && !(remark || "").trim()) { toast("An override needs a reason", "red"); return false; }
  }
  const ov = decision === "Approved" && last && opts.override ? approvalBlockers(v) : null;
  setState((s) => {
    const x = byId(s.vendors, v.id);
    const st0 = x.approval.stages[i];
    Object.assign(st0, { status: decision, by: currentUser(), at: new Date().toISOString(), remark, ...(ov && ov.length ? { override: ov } : {}) });
    if (decision === "Rejected") x.status = "Rejected";
    else if (i + 1 < x.approval.stages.length) x.approval.stages[i + 1].status = "Pending";
    else { x.status = "Active"; x.approvedOn = todayISO(); }
  }, { entity: "Vendor", id: v.id, action: `${decision} at ${stg.dept}${ov && ov.length ? ` with override (${ov.join("; ")})` : ""}${remark ? ` — ${remark}` : ""}` });
  return true;
}
function resubmit(v) {
  const b = submitBlockers(v);
  if (b.length) { toast(`Upload the required documents first — ${b.join("; ")}`, "red"); return false; }
  setState((s) => {
    const x = byId(s.vendors, v.id);
    // approvals already given are kept; routing resumes at the first stage not yet approved
    const i = Math.max(0, x.approval.stages.findIndex((st) => st.status !== "Approved"));
    x.approval.stages.forEach((st, j) => { if (j >= i) Object.assign(st, { status: j === i ? "Pending" : "Waiting", by: null, at: null, remark: "" }); });
    if (x.changeRequest && !x.changeRequest.resolvedAt) x.changeRequest = { ...x.changeRequest, resolvedAt: new Date().toISOString() };
    x.status = "Pending Approval";
    x.submittedBy = currentUser();
  }, { entity: "Vendor", id: v.id, action: v.status === "Draft" ? "Submitted for approval" : "Corrected and resubmitted" });
  return true;
}

function VendorApproval({ v, mode = "approval" }) {
  const decide = mode === "approval";
  const [remark, setRemark] = y.useState("");
  const [rc, setRc] = y.useState(false), [edit, setEdit] = y.useState(false); const [bg, setBg] = y.useState(false);
  const stages = v.approval.stages;
  const pending = stages.find((s) => s.status === "Pending");
  const comp = complianceOf(v);
  return (
    <>
      <Section title="Approval routing" icon={Icon.clipboardCheck}>
        <div className="p-5">
          <Stepper steps={stages.map((s) => ({
            label: s.dept,
            status: s.status === "Approved" ? "done" : s.status === "Rejected" ? "rejected" : s.status === "Pending" || s.status === "Changes Requested" ? "current" : "todo",
            meta: s.by ? `${s.by} · ${fmtDateTime(s.at)}${s.remark && s.remark !== "OK" ? ` — ${s.remark}` : ""}` : s.status === "Pending" ? "Awaiting decision" : "",
          }))} />
        </div>
        {pending && !decide && v.status === "Pending Approval" && (
          <div className="flex items-center justify-between gap-3 border-t border-line p-4">
            <span className="text-[13px] text-ink-soft">Waiting for <b>{pending.dept}</b>. Approvers record their decision in Vendor Approvals or Approval Management — this view is read-only.</span>
            <span className="shrink-0 whitespace-nowrap text-[13px]"><RefLink to={`${VM_BASE}/approvals?open=${v.id}`}>Open in Vendor Approvals →</RefLink></span>
          </div>
        )}
        {pending && v.status === "Pending Approval" && (() => {
          const blockers = approvalBlockers(v), last = pending === stages[stages.length - 1];
          return (
            <div className="border-t border-line p-4">
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-mute">Approval checklist {last ? "(checked at the final approval)" : ""}</p>
              {blockers.length === 0 ? <Note tone="green" icon={Icon.check}>Documents verified, qualification passed{v.regTier === "Spend Authorized" ? ", bank account on file" : ""} — ready for final approval.</Note>
                : <Note tone={last ? "red" : "amber"}>Open before final approval: {blockers.join(" · ")}.</Note>}
            </div>
          );
        })()}
        {pending && decide && v.status === "Pending Approval" && (() => {
          const blockers = approvalBlockers(v), last = pending === stages[stages.length - 1];
          const canOverride = last && blockers.length > 0 && hasRole("Finance Controller");
          return (
          <div className="space-y-3 border-t border-line p-4">
            <ActNote roles={DEPT_ROLE[pending.dept]} involved={vendorApprovers(v)} what={`the ${pending.dept} decision`} />
            {comp.status === "Non-Compliant" && !last && <Note tone="amber">Compliance gaps: {comp.issues.join(" · ")}. These must close (or be overridden) before the Finance approval.</Note>}
            <Field label={`${pending.dept} decision remark`}><TextArea rows={2} value={remark} onChange={setRemark} placeholder={canOverride ? "Required when rejecting or approving with override" : "Required when rejecting"} /></Field>
            <div className="flex justify-end gap-2">
              <Btn icon={Icon.pencil} onClick={() => setEdit(true)}>Edit details</Btn>
              <Btn onClick={() => setRc(true)}>Request changes</Btn>
              <Btn variant="danger" disabled={!remark.trim()} onClick={() => { if (approvalAction(v, "Rejected", remark.trim())) { setRemark(""); toast("Registration rejected", "red"); } }}>Reject</Btn>
              {canOverride && <Btn disabled={!remark.trim()} onClick={() => { if (approvalAction(v, "Approved", remark.trim(), { override: true })) { setRemark(""); toast("Approved with override — logged"); } }}>Approve with override</Btn>}
              <Btn variant="success" icon={Icon.check} disabled={last && blockers.length > 0} title={last && blockers.length ? "Close the checklist items first" : ""} onClick={() => { if (approvalAction(v, "Approved", remark.trim())) { setRemark(""); toast(`${pending.dept} approved`); } }}>Approve as {pending.dept}</Btn>
            </div>
          </div>
          );
        })()}
        {v.status === "Changes Requested" && v.changeRequest && (
          <div className="border-t border-line p-4"><Note tone="amber"><b>Waiting for the vendor</b> — {v.changeRequest.by} ({v.changeRequest.dept}) asked on {fmtDate(v.changeRequest.at)} for: {v.changeRequest.items.map((i) => `${i.label}${i.note ? ` (${i.note})` : ""}`).join("; ")}. The vendor fixes these in the supplier portal and resubmits; approval resumes at {v.changeRequest.dept}.</Note></div>
        )}
        {rc && <RequestChangesModal v={v} onClose={() => setRc(false)} />}
        {edit && <EditRegistrationModal v={v} onClose={() => setEdit(false)} />}
        {!decide && EDITABLE_STATUSES.includes(v.status) && (
          <div className="flex items-center justify-between gap-3 border-t border-line p-4">
            <span className="text-[13px] text-ink-soft">{v.status === "Draft" ? "Draft registration — use Edit details and upload documents, then submit. Details lock once submitted." : "Sent back by the approver — you can edit the details again (Edit details), then resubmit. Earlier approvals are kept."}</span>
            <Btn variant="primary" icon={Icon.send} onClick={() => { if (resubmit(v)) toast("Submitted for approval"); }}>{v.status === "Draft" ? "Submit for approval" : "Resubmit"}</Btn>
          </div>
        )}
        {v.status === "Active" && v.regTier === "Prospective" && <SpendAuthPanel v={v} />}
      </Section>
      <Section title="Background & financial checks" icon={Icon.shieldCheck}
        actions={<Btn size="sm" icon={Icon.refresh} onClick={() => setBg(true)}>Record check</Btn>}>
        {v.background ? <KV cols={4} items={[["Credit rating", v.background.credit], ["Litigation", v.background.litigation], ["Watchlist / sanctions", v.background.watchlist], ["Checked on", fmtDate(v.background.checkedAt)]]} />
          : <p className="p-4 text-[13px] text-ink-mute">Not run yet.</p>}
        {v.isContractor && backgroundIssue(v) && <div className="border-t border-line p-3"><Note tone="red" icon={Icon.lock}>{backgroundIssue(v)} — work orders (mobilisation) are blocked until it is clear.</Note></div>}
      </Section>
      {bg && <BackgroundModal v={v} onClose={() => setBg(false)} />}
    </>
  );
}

// ---------------------------------------------------------------- approvals page
function VendorApprovalsPage() {
  const st = useStore();
  const [tab, setTab] = y.useState("queue");
  const [open, setOpen] = useQueryOpen();
  const queue = st.vendors.filter((v) => ["Pending Approval", "Draft", "Rejected", "Changes Requested"].includes(v.status));
  const byDept = APPROVAL_FLOW.map((d) => ({ d, n: st.vendors.filter((v) => v.approval.stages.some((s) => s.dept === d && s.status === "Pending")).length }));
  return (
    <Page title="Vendor Approvals" subtitle="Multi-stage approval, qualification rule sets and requalification" icon={Icon.clipboardCheck}>
      <TabBar active={tab} onChange={setTab} tabs={[{ id: "queue", label: "Approval queue", icon: Icon.clipboardList }, { id: "scores", label: "Qualification results", icon: Icon.listChecks }]} />
      {tab === "queue" && (
        <DataTable noun="vendors" rows={queue} onRow={(v) => setOpen(v.id)} empty={<EmptyState icon={Icon.check} title="Approval queue is clear" text="New registrations will show up here." />} columns={[
          { key: "name", label: "Vendor", className: "font-medium" },
          { key: "type", label: "Type", filterOptions: VENDOR_TYPES, filter: (v) => v.type, render: (v) => <span className="text-ink-soft">{v.type}</span> },
          { key: "stage", label: "Routing", filterOptions: FO.stage, filter: (v) => (v.approval?.stages || []).find((s) => s.status === "Pending")?.dept || "—", filterLabel: "Stage", render: (v) => (
            <span className="flex items-center gap-1">
              {v.approval.stages.map((s) => (
                <span key={s.dept} title={`${s.dept}: ${s.status}`} className={cls("rounded px-1.5 py-[1px] text-[11px] font-medium",
                  s.status === "Approved" ? "bg-green-100 text-green-700" : s.status === "Pending" ? "bg-blue-100 text-blue-700" : s.status === "Changes Requested" ? "bg-amber-100 text-amber-800" : s.status === "Rejected" ? "bg-red-100 text-red-700" : "bg-gray-100 text-ink-mute")}>{s.dept}</span>
              ))}
            </span>) },
          { key: "since", label: "Registered", render: (v) => fmtDate(v.createdAt) },
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
        <DataTable noun="vendors" rows={st.vendors.filter((v) => v.qualification)} onRow={(v) => setOpen(v.id)} columns={[
          { key: "name", label: "Vendor", className: "font-medium" },
          { key: "sets", label: "Rule sets", filterOptions: FO.ruleSets, filter: (v) => v.qualification.ruleSet, render: (v) => <span className="text-[12px] text-ink-soft">{v.qualification.ruleSet}</span> },
          { key: "score", label: "Score", render: (v) => <ScoreBadge value={v.qualification.score} /> },
          { key: "res", label: "Result", filterOptions: FO.qualResult, filter: (v) => qualStatus(v).status, render: (v) => { const q = qualStatus(v); return <Status tone={q.tone}>{q.status}</Status>; } },
          { key: "lim", label: "Value limit", align: "right", sort: (v) => qualStatus(v).limit, render: (v) => <span className="num">{qualStatus(v).limit ? inrShort(qualStatus(v).limit) : "—"}</span> },
          { key: "at", label: "Assessed", render: (v) => fmtDate(v.qualification.at || v.createdAt) },
        ]} />
      )}
      {open && <VendorDrawer vendorId={open} initialTab="approval" mode="approval" onClose={() => setOpen(null)} />}
    </Page>
  );
}

