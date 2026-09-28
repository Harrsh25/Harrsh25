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

// Minimum insurance cover required, by vendor type
const INSURANCE_RULES = [
  { type: "Workmen Compensation", appliesTo: (v) => v.isContractor || v.type === "Labor", min: 5000000 },
  { type: "Contractor's All Risk", appliesTo: (v) => v.isContractor && v.tier === "Strategic", min: 25000000 },
];
function insuranceCheck(v) {
  return INSURANCE_RULES.filter((r) => r.appliesTo(v)).map((r) => {
    const p = v.insurance.find((i) => i.type === r.type);
    let status = "Compliant", note = "";
    if (!p) { status = "Missing"; note = "No policy on file"; }
    else if (daysUntil(p.expiry) < 0) { status = "Expired"; note = `Expired ${fmtDate(p.expiry)}`; }
    else if (p.cover < r.min) { status = "Non-Compliant"; note = `Cover ${inrShort(p.cover)} below minimum ${inrShort(r.min)}`; }
    else if (daysUntil(p.expiry) <= 30) { status = "Expiring"; note = `${daysUntil(p.expiry)} days left`; }
    return { rule: r, policy: p, status, note };
  });
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
  const due = v.qualification?.at && daysUntil(shiftDays(Math.min(...sets.map((s) => s.requalifyDays)), v.qualification.at)) < 0;
  return (
    <>
      <Note>Questions are generated from the rule sets that apply to this vendor: <b>{sets.map((s) => s.name).join(" · ")}</b>. Answers are written back to the vendor profile.</Note>
      {v.qualification && (
        <div className="flex items-center gap-3 rounded-lg border border-line p-3">
          <ScoreRing value={v.qualification.score} />
          <div className="text-[13px]">
            <p className="font-medium">Qualification score {v.qualification.score}/100 {v.qualification.score >= 70 ? <Status tone="green">Qualified</Status> : <Status tone="red">Below 70 — not qualified</Status>}</p>
            <p className="text-ink-mute">Last assessed {fmtDate(v.qualification.at)} {due && <Status tone="amber">Requalification due</Status>}</p>
          </div>
        </div>
      )}
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

function approvalAction(v, decision, remark) {
  setState((s) => {
    const x = byId(s.vendors, v.id);
    const i = x.approval.stages.findIndex((st) => st.status === "Pending");
    if (i < 0) return;
    const stg = x.approval.stages[i];
    Object.assign(stg, { status: decision, by: currentUser(), at: new Date().toISOString(), remark });
    if (decision === "Rejected") x.status = "Rejected";
    else if (i + 1 < x.approval.stages.length) x.approval.stages[i + 1].status = "Pending";
    else x.status = "Active";
  }, { entity: "Vendor", id: v.id, action: `${decision} at ${v.approval.stages.find((s) => s.status === "Pending")?.dept}${remark ? ` — ${remark}` : ""}` });
}
function resubmit(v) {
  setState((s) => {
    const x = byId(s.vendors, v.id);
    // approvals already given are kept; routing resumes at the first stage not yet approved
    const i = Math.max(0, x.approval.stages.findIndex((st) => st.status !== "Approved"));
    x.approval.stages.forEach((st, j) => { if (j >= i) Object.assign(st, { status: j === i ? "Pending" : "Waiting", by: null, at: null, remark: "" }); });
    if (x.changeRequest && !x.changeRequest.resolvedAt) x.changeRequest = { ...x.changeRequest, resolvedAt: new Date().toISOString() };
    x.status = "Pending Approval";
  }, { entity: "Vendor", id: v.id, action: v.status === "Draft" ? "Submitted for approval" : "Corrected and resubmitted" });
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
        {pending && decide && v.status === "Pending Approval" && (
          <div className="space-y-3 border-t border-line p-4">
            {comp.status === "Non-Compliant" && <Note tone="amber">Compliance gaps: {comp.issues.join(" · ")}. Approvers can still decide, but the vendor can't be paid until these close.</Note>}
            <Field label={`${pending.dept} decision remark`}><TextArea rows={2} value={remark} onChange={setRemark} placeholder="Required when rejecting" /></Field>
            <div className="flex justify-end gap-2">
              <Btn icon={Icon.pencil} onClick={() => setEdit(true)}>Edit details</Btn>
              <Btn onClick={() => setRc(true)}>Request changes</Btn>
              <Btn variant="danger" disabled={!remark.trim()} onClick={() => { approvalAction(v, "Rejected", remark.trim()); setRemark(""); toast("Registration rejected", "red"); }}>Reject</Btn>
              <Btn variant="success" icon={Icon.check} onClick={() => { approvalAction(v, "Approved", remark.trim()); setRemark(""); toast(`${pending.dept} approved`); }}>Approve as {pending.dept}</Btn>
            </div>
          </div>
        )}
        {v.status === "Changes Requested" && v.changeRequest && (
          <div className="border-t border-line p-4"><Note tone="amber"><b>Waiting for the vendor</b> — {v.changeRequest.by} ({v.changeRequest.dept}) asked on {fmtDate(v.changeRequest.at)} for: {v.changeRequest.items.map((i) => `${i.label}${i.note ? ` (${i.note})` : ""}`).join("; ")}. The vendor fixes these in the supplier portal and resubmits; approval resumes at {v.changeRequest.dept}.</Note></div>
        )}
        {rc && <RequestChangesModal v={v} onClose={() => setRc(false)} />}
        {edit && <EditRegistrationModal v={v} onClose={() => setEdit(false)} />}
        {!decide && EDITABLE_STATUSES.includes(v.status) && (
          <div className="flex items-center justify-between gap-3 border-t border-line p-4">
            <span className="text-[13px] text-ink-soft">{v.status === "Draft" ? "Draft registration — use Edit details and upload documents, then submit. Details lock once submitted." : "Sent back by the approver — you can edit the details again (Edit details), then resubmit. Earlier approvals are kept."}</span>
            <Btn variant="primary" icon={Icon.send} onClick={() => { resubmit(v); toast("Submitted for approval"); }}>{v.status === "Draft" ? "Submit for approval" : "Resubmit"}</Btn>
          </div>
        )}
        {decide && v.status === "Active" && v.regTier === "Prospective" && (
          <div className="flex items-center justify-between gap-3 border-t border-line p-4">
            <span className="text-[13px] text-ink-soft">Prospective vendors can take part in RFQs only. Authorize to allow POs, contracts and payments.</span>
            <Btn variant="primary" disabled={!v.bankAccounts.length || comp.status === "Non-Compliant"}
              onClick={() => setState((s) => (byId(s.vendors, v.id).regTier = "Spend Authorized"), { entity: "Vendor", id: v.id, action: "Promoted to spend authorized" })}>Authorize for spend</Btn>
          </div>
        )}
      </Section>
      <Section title="Background & financial checks" icon={Icon.shieldCheck}
        actions={decide && <Btn size="sm" icon={Icon.refresh} onClick={() => setState((s) => (byId(s.vendors, v.id).background = { credit: ["A", "A-", "B+"][Math.floor(Math.random() * 3)], litigation: "Clear", watchlist: "Clear", checkedAt: todayISO() }), { entity: "Vendor", id: v.id, action: "Background check refreshed" })}>Run check</Btn>}>
        {v.background ? <KV cols={4} items={[["Credit rating", v.background.credit], ["Litigation", v.background.litigation], ["Watchlist / sanctions", v.background.watchlist], ["Checked on", fmtDate(v.background.checkedAt)]]} />
          : <p className="p-4 text-[13px] text-ink-mute">Not run yet.</p>}
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
  const byDept = APPROVAL_FLOW.map((d) => ({ d, n: st.vendors.filter((v) => v.approval.stages.some((s) => s.dept === d && s.status === "Pending")).length }));
  return (
    <Page title="Vendor Approvals" subtitle="Multi-stage approval, qualification rule sets and requalification" icon={Icon.clipboardCheck}>
      <StatGrid>
        {byDept.map(({ d, n }, i) => <StatTile key={d} tone={["blue", "purple", "cyan"][i]} label={`Pending — ${d}`} value={n} icon={Icon.clipboardCheck} />)}
        <StatTile tone="red" label="Sent back" value={st.vendors.filter((v) => v.status === "Rejected").length} sub="Awaiting resubmission" icon={Icon.refresh} />
      </StatGrid>
      <TabBar active={tab} onChange={setTab} tabs={[{ id: "queue", label: `Approval queue (${queue.length})`, icon: Icon.clipboardList }, { id: "rules", label: "Qualification rule sets", icon: Icon.sliders }, { id: "scores", label: "Qualification results", icon: Icon.listChecks }]} />
      {tab === "queue" && (
        <DataTable rows={queue} onRow={(v) => setOpen(v.id)} empty={<EmptyState icon={Icon.check} title="Approval queue is clear" text="New registrations will show up here." />} columns={[
          { key: "id", label: "Vendor ID", className: "mono text-[12px] text-ink-soft" },
          { key: "name", label: "Vendor", className: "font-medium" },
          { key: "type", label: "Type", render: (v) => <VendorTypeTag v={v} /> },
          { key: "stage", label: "Routing", render: (v) => (
            <span className="flex items-center gap-1">
              {v.approval.stages.map((s) => (
                <span key={s.dept} title={`${s.dept}: ${s.status}`} className={cls("rounded px-1.5 py-[1px] text-[11px] font-medium",
                  s.status === "Approved" ? "bg-green-100 text-green-700" : s.status === "Pending" ? "bg-blue-100 text-blue-700" : s.status === "Changes Requested" ? "bg-amber-100 text-amber-800" : s.status === "Rejected" ? "bg-red-100 text-red-700" : "bg-gray-100 text-ink-mute")}>{s.dept}</span>
              ))}
            </span>) },
          { key: "docs", label: "Documents", render: (v) => { const n = requiredDocs(v).length, ok = v.docs.filter((d) => d.status === "Verified").length; return <Progress value={Math.round((ok / n) * 100)} color={ok === n ? "bg-green-500" : "bg-amber-500"} />; } },
          { key: "q", label: "Qualification", align: "center", render: (v) => (v.qualification ? <ScoreRing value={v.qualification.score} size={30} /> : <span className="text-ink-mute">—</span>) },
          { key: "since", label: "Registered", render: (v) => fmtDate(v.createdAt) },
          { key: "status", label: "Status", render: (v) => <Status>{v.status}</Status> },
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
        <DataTable rows={st.vendors.filter((v) => v.qualification)} onRow={(v) => setOpen(v.id)} columns={[
          { key: "name", label: "Vendor", className: "font-medium" },
          { key: "sets", label: "Rule sets", render: (v) => <span className="text-[12px] text-ink-soft">{v.qualification.ruleSet}</span> },
          { key: "score", label: "Score", align: "center", render: (v) => <ScoreRing value={v.qualification.score} size={30} /> },
          { key: "res", label: "Result", render: (v) => <Status tone={v.qualification.score >= 70 ? "green" : "red"}>{v.qualification.score >= 70 ? "Qualified" : "Not qualified"}</Status> },
          { key: "at", label: "Assessed", render: (v) => fmtDate(v.qualification.at || v.createdAt) },
        ]} />
      )}
      {open && <VendorDrawer vendorId={open} initialTab="approval" mode="approval" onClose={() => setOpen(null)} />}
    </Page>
  );
}

// ---------------------------------------------------------------- compliance centre
function CompliancePage() {
  const st = useStore();
  const [tab, setTab] = y.useState("docs");
  const [open, setOpen] = y.useState(null);
  const live = st.vendors.filter((v) => !["Blacklisted", "Disabled", "Rejected"].includes(v.status));
  const docRows = live.flatMap((v) => v.docs.filter((d) => d.expiry || d.status !== "Verified").map((d) => ({ v, d, s: docState(d), key: v.id + d.name })))
    .filter((r) => r.s !== "Verified" || daysUntil(r.d.expiry) <= 90)
    .sort((a, b) => (daysUntil(a.d.expiry) ?? -999) - (daysUntil(b.d.expiry) ?? -999));
  const ins = live.flatMap((v) => insuranceCheck(v).map((c) => ({ v, ...c, key: v.id + c.rule.type })));
  const counts = { Compliant: 0, Expiring: 0, "Non-Compliant": 0 };
  live.forEach((v) => counts[complianceOf(v).status]++);
  return (
    <Page title="Compliance Center" subtitle="Document expiry, insurance validation and the payment compliance gate" icon={Icon.shieldCheck}>
      <StatGrid>
        <StatTile tone="green" label="Compliant" value={counts.Compliant} icon={Icon.shieldCheck} />
        <StatTile tone="amber" label="Expiring ≤ 30 days" value={counts.Expiring} icon={Icon.clock} />
        <StatTile tone="red" label="Non-compliant" value={counts["Non-Compliant"]} sub="Payments gated" icon={Icon.warning} />
        <StatTile tone="purple" label="Insurance exceptions" value={ins.filter((i) => i.status !== "Compliant").length} icon={Icon.shield} />
      </StatGrid>
      <TabBar active={tab} onChange={setTab} tabs={[{ id: "docs", label: "Document expiry", icon: Icon.fileClock }, { id: "ins", label: "Insurance compliance report", icon: Icon.shield }, { id: "status", label: "Compliance status by vendor", icon: Icon.shieldCheck }]} />
      {tab === "docs" && (
        <DataTable rows={docRows} rowKey={(r) => r.key} onRow={(r) => setOpen(r.v.id)} columns={[
          { key: "v", label: "Vendor", render: (r) => <span className="font-medium">{r.v.name}</span> },
          { key: "d", label: "Document", render: (r) => r.d.name },
          { key: "e", label: "Valid till", render: (r) => <ExpiryCell iso={r.d.expiry} /> },
          { key: "s", label: "State", render: (r) => <Status>{r.s}</Status> },
          { key: "a", label: "", align: "right", render: (r) => <Btn size="sm" icon={Icon.mail} onClick={(e) => { e.stopPropagation(); setState((s) => byId(s.vendors, r.v.id).notes.unshift({ at: new Date().toISOString(), by: "System", text: `Renewal reminder sent for ${r.d.name}` }), { entity: "Vendor", id: r.v.id, action: `Renewal reminder sent (${r.d.name})` }); toast(`Reminder sent to ${r.v.contact.email}`); }}>Remind vendor</Btn> },
        ]} />
      )}
      {tab === "ins" && (
        <DataTable rows={ins} rowKey={(r) => r.key} onRow={(r) => setOpen(r.v.id)} columns={[
          { key: "v", label: "Vendor", render: (r) => <span className="font-medium">{r.v.name}</span> },
          { key: "t", label: "Required coverage", render: (r) => r.rule.type },
          { key: "m", label: "Minimum", align: "right", num: true, render: (r) => inrShort(r.rule.min) },
          { key: "c", label: "On file", align: "right", num: true, render: (r) => (r.policy ? inrShort(r.policy.cover) : "—") },
          { key: "e", label: "Expiry", render: (r) => <ExpiryCell iso={r.policy?.expiry} /> },
          { key: "s", label: "Status", render: (r) => <Status tone={r.status === "Compliant" ? "green" : r.status === "Expiring" ? "amber" : "red"}>{r.status}</Status> },
          { key: "n", label: "Note", render: (r) => <span className="text-[12px] text-ink-soft">{r.note}</span> },
        ]} />
      )}
      {tab === "status" && (
        <DataTable rows={live} onRow={(v) => setOpen(v.id)} columns={[
          { key: "name", label: "Vendor", className: "font-medium" },
          { key: "s", label: "Overall", render: (v) => <Status>{complianceOf(v).status}</Status> },
          { key: "i", label: "Open items", render: (v) => <span className="whitespace-normal text-[12px] text-ink-soft">{complianceOf(v).issues.join(" · ") || "—"}</span> },
          { key: "g", label: "Payment gate", render: (v) => (complianceOf(v).status === "Non-Compliant" || isBlockedFor(v, "Payments") ? <Status tone="red">Blocked</Status> : <Status tone="green">Open</Status>) },
        ]} />
      )}
      {open && <VendorDrawer vendorId={open} initialTab="docs" mode="approval" onClose={() => setOpen(null)} />}
    </Page>
  );
}
