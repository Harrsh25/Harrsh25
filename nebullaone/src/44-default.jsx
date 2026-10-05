// Default proceedings before termination: default notice → cure period → show-cause → decision.
// Terminate is allowed only once a show-cause has been issued and answered (or its reply window has passed).
const DEFAULT_STEPS = ["Notice", "Cure period", "Show-cause", "Decision"];
const openCase = (c) => (c?.defaultCase && c.defaultCase.status === "Open" ? c.defaultCase : null);
function defaultStage(c) {
  const k = openCase(c);
  if (!k) return -1;
  if (!k.showCause) return k.cureUntil >= todayISO() ? 1 : 2;   // cure running → 1; cure over → time for show-cause
  return k.reply || k.showCause.replyBy < todayISO() ? 3 : 2;
}
const canTerminate = (c) => defaultStage(c) === 3;
const terminateBlock = (c) => (canTerminate(c) ? "" : !openCase(c) ? "Issue a default notice first - termination follows notice, cure period and show-cause" : defaultStage(c) === 1 ? `Cure period runs until ${fmtDate(openCase(c).cureUntil)}` : !openCase(c).showCause ? "Issue the show-cause notice first" : `Waiting for the contractor's reply (due ${fmtDate(openCase(c).showCause.replyBy)})`);

function caseAct(c, patch, action, tone) {
  setState((s) => { const x = byId(s.contracts, c.id); patch(x); }, { entity: "Contract", id: c.id, action });
  toast(action, tone);
}

function DefaultCaseSection({ c, onTerminate }) {
  const [m, setM] = y.useState(null);
  const k = c.defaultCase, stage = defaultStage(c);
  const live = !["Draft", "Pending Approval", "Approved", "Rejected", "Closed", "Terminated"].includes(c.status);
  if (!k && !live) return null;
  const close = () => setM(null);
  const at = () => new Date().toISOString(), by = () => currentUser();
  const forms = {
    notice: { title: "Issue default notice", fields: [["breach", "Breach / default", "text"], ["cureDays", "Cure period (days)", "num"]], ok: (f) => f.breach?.trim().length >= 5 && Number.isInteger(Number(f.cureDays)) && Number(f.cureDays) >= 1 && Number(f.cureDays) <= 90,
      save: (f) => caseAct(c, (x) => { x.defaultCase = { status: "Open", notice: { breach: f.breach.trim(), at: at(), by: by() }, cureDays: Number(f.cureDays), cureUntil: shiftDays(Number(f.cureDays)), history: [{ at: at(), by: by(), what: `Default notice - ${f.breach.trim()}; cure within ${f.cureDays} days` }] }; }, `Default notice issued - cure within ${f.cureDays} days`, "amber") },
    showCause: { title: "Issue show-cause notice", fields: [["grounds", "Grounds", "text"], ["replyDays", "Reply within (days)", "num"]], ok: (f) => f.grounds?.trim().length >= 5 && Number.isInteger(Number(f.replyDays)) && Number(f.replyDays) >= 1 && Number(f.replyDays) <= 30,
      save: (f) => caseAct(c, (x) => { x.defaultCase.showCause = { grounds: f.grounds.trim(), at: at(), by: by(), replyBy: shiftDays(Number(f.replyDays)) }; x.defaultCase.history.push({ at: at(), by: by(), what: `Show-cause issued - reply within ${f.replyDays} days` }); }, "Show-cause notice issued", "amber") },
    reply: { title: "Record contractor's reply", fields: [["text", "Reply", "text"], ["date", "Received on", "date"]], ok: (f) => f.text?.trim().length >= 5 && f.date && f.date <= todayISO(),
      save: (f) => caseAct(c, (x) => { x.defaultCase.reply = { text: f.text.trim(), date: f.date, by: by() }; x.defaultCase.history.push({ at: at(), by: by(), what: `Reply received - ${f.text.trim()}` }); }, "Reply recorded") },
    extend: { title: "Extend the cure period", fields: [["days", "Further days", "num"], ["note", "Reason", "text"]], ok: (f) => Number.isInteger(Number(f.days)) && Number(f.days) >= 1 && Number(f.days) <= 60 && f.note?.trim().length >= 5,
      save: (f) => caseAct(c, (x) => { const d = x.defaultCase; d.cureUntil = shiftDays(Number(f.days)); d.showCause = null; d.reply = null; d.history.push({ at: at(), by: by(), what: `Cure period extended ${f.days} days - ${f.note.trim()}` }); }, "Cure period extended") },
    cured: { title: "Default cured - close the notice", fields: [["note", "How it was cured", "text"]], ok: (f) => f.note?.trim().length >= 5,
      save: (f) => caseAct(c, (x) => { const d = x.defaultCase; d.status = "Cured"; d.closed = { note: f.note.trim(), at: at(), by: by() }; d.history.push({ at: at(), by: by(), what: `Cured - ${f.note.trim()}` }); }, "Default cured - notice closed", "green") },
  };
  const F = m && forms[m.kind];
  return (
    <Section title="Default notice & termination" icon={Icon.ban} actions={live && !openCase(c) && <Btn size="sm" variant="danger" onClick={() => setM({ kind: "notice" })}>Issue default notice</Btn>}>
      <div data-default-case>
        {!k ? <p className="p-4 text-[13px] text-ink-mute">No default notice. Termination needs a notice, a cure period and a show-cause first.</p> : (
          <>
            {k.status === "Open" && <div className="overflow-x-auto px-5 py-4"><Stepper steps={DEFAULT_STEPS.map((x, i) => ({ label: x, status: i < stage || (i === 0) ? "done" : i === stage ? "current" : "todo" }))} /></div>}
            <KV items={[["Status", k.status === "Open" ? DEFAULT_STEPS[stage] : k.status], ["Default", `${k.notice.breach} - ${k.notice.by}, ${fmtDate(k.notice.at.slice(0, 10))}`], ["Cure by", `${fmtDate(k.cureUntil)} (${k.cureDays} days)`],
              k.showCause && ["Show-cause", `${k.showCause.grounds} - reply by ${fmtDate(k.showCause.replyBy)}`], k.reply && ["Contractor's reply", `${k.reply.text} (${fmtDate(k.reply.date)})`], k.closed && ["Closed", `${k.closed.note} - ${k.closed.by}`]].filter(Boolean)} />
            {k.status === "Open" && live && (
              <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
                <Btn size="sm" onClick={() => setM({ kind: "cured" })}>Default cured</Btn>
                {stage >= 2 && <Btn size="sm" onClick={() => setM({ kind: "extend" })}>Extend cure period</Btn>}
                {stage === 2 && !k.showCause && <Btn size="sm" variant="primary" onClick={() => setM({ kind: "showCause" })}>Issue show-cause</Btn>}
                {k.showCause && !k.reply && <Btn size="sm" onClick={() => setM({ kind: "reply" })}>Record reply</Btn>}
                <Btn size="sm" variant="danger" disabled={!canTerminate(c)} title={terminateBlock(c)} onClick={onTerminate}>Terminate</Btn>
              </div>
            )}
          </>
        )}
      </div>
      {F && <CaseForm key={m.kind} F={F} onClose={close} />}
    </Section>
  );
}
function CaseForm({ F, onClose }) {
  const [f, setF] = y.useState({});
  return (
    <Modal open onClose={onClose} width={520} title={F.title} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={!F.ok(f)} onClick={() => { F.save(f); onClose(); }}>Save</Btn></>}>
      <div className="grid gap-3">
        {F.fields.map(([k, l, t]) => <Field key={k} label={l} required>{t === "num" ? <NumInput value={f[k] ?? ""} onChange={(x) => setF({ ...f, [k]: x })} /> : t === "date" ? <DateInput value={f[k] || ""} onChange={(x) => setF({ ...f, [k]: x })} /> : <TextInput value={f[k] || ""} onChange={(x) => setF({ ...f, [k]: x })} />}</Field>)}
      </div>
    </Modal>
  );
}

function defaultExceptions(st, add) {
  for (const c of st.contracts) {
    const k = openCase(c); if (!k || ["Closed", "Terminated"].includes(c.status)) continue;
    const to = `${CL_BASE}/contracts?open=${c.id}`;
    if (!k.showCause && k.cureUntil < todayISO()) add("Cure period over - no show-cause", "Medium", "Contract", c.id, c.title, `Default: ${k.notice.breach}; cure period ended ${fmtDate(k.cureUntil)}`, k.cureUntil, to);
    if (k.showCause && !k.reply && k.showCause.replyBy < todayISO()) add("Show-cause reply overdue - decide", "High", "Contract", c.id, c.title, `Reply was due ${fmtDate(k.showCause.replyBy)} - terminate or extend the cure period`, k.showCause.replyBy, to);
  }
}

// Demo: CTR-004 is at the decision step (show-cause unanswered), CTR-002 has a notice in its cure period
function seedDefaults(s) {
  if (s.defaultSeeded) return false;
  s.defaultSeeded = true;
  const T = (n) => new Date(Date.now() + n * DAY).toISOString();
  const c4 = (s.contracts || []).find((c) => c.id === "CTR-004"), c2 = (s.contracts || []).find((c) => c.id === "CTR-002");
  if (c4 && !c4.defaultCase && !["Closed", "Terminated"].includes(c4.status)) c4.defaultCase = { status: "Open", notice: { breach: "Excavation stopped for 21 days - no machines on site", at: T(-30), by: "Arjun Mehta" }, cureDays: 14, cureUntil: shiftDays(-16), showCause: { grounds: "Default not cured within the cure period", at: T(-15), by: "Vikram Rao", replyBy: shiftDays(-8) }, reply: null,
    history: [{ at: T(-30), by: "Arjun Mehta", what: "Default notice - Excavation stopped for 21 days - no machines on site; cure within 14 days" }, { at: T(-15), by: "Vikram Rao", what: "Show-cause issued - reply within 7 days" }] };
  if (c2 && !c2.defaultCase && !["Closed", "Terminated"].includes(c2.status)) c2.defaultCase = { status: "Open", notice: { breach: "Stringing gang short of manpower for 3 weeks", at: T(-4), by: "Arjun Mehta" }, cureDays: 15, cureUntil: shiftDays(11), history: [{ at: T(-4), by: "Arjun Mehta", what: "Default notice - Stringing gang short of manpower for 3 weeks; cure within 15 days" }] };
  return true;
}
