// Governance: approver-away delegation, document waivers, contract correspondence & key dates, termination reasons.

// ---------------------------------------------------------------- delegation while an approver is away
const delegationRoles = (st) => [...new Set([...ROLES, ...((settingsOf(st).vendorFlow || []).map((x) => x.name)), ...((settingsOf(st).contractFlow || []).map((x) => x.name || x.role))].filter(Boolean))];
function activeDelegation(st, role, on = todayISO()) {
  return (settingsOf(st || getState()).delegations || []).find((d) => d.role && role && String(role).toLowerCase().includes(String(d.role).toLowerCase()) && d.from <= on && d.to >= on) || null;
}
const DelegateNote = ({ role }) => { const st = useStore(), d = activeDelegation(st, role); return d ? <span className="text-[12px] text-amber-700" data-delegate>· {d.role} away - {d.delegate} decides until {fmtDate(d.to)}</span> : null; };
function delegationErr(f) {
  for (const [i, d] of (f.delegations || []).entries()) {
    if (!d.role || !String(d.delegate || "").trim() || !d.from || !d.to) return `Delegation ${i + 1}: role, delegate and both dates are needed`;
    if (d.to < d.from) return `Delegation ${i + 1}: end date is before the start`;
    if (String(d.delegate).trim().toLowerCase() === String(d.role).toLowerCase()) return `Delegation ${i + 1}: delegate must be someone else`;
    if ((f.delegations || []).some((o, j) => j !== i && o.role === d.role && o.from <= d.to && o.to >= d.from)) return `Delegation ${i + 1}: overlaps another delegation for ${d.role}`;
  }
  return "";
}
function DelegationsEditor({ f, setF }) {
  const st = useStore(), rows = f.delegations || [];
  const set = (i, k, v) => setF({ ...f, delegations: rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)) });
  return (
    <Section title="Approver away - delegation" icon={Icon.users} actions={<Btn size="sm" icon={Icon.plus} onClick={() => setF({ ...f, delegations: [...rows, { role: "", delegate: "", from: "", to: "", reason: "" }] })}>Add delegation</Btn>}>
      <div className="space-y-2 p-4" data-delegations>
        {!rows.length && <p className="text-[13px] text-ink-mute">No one is away.</p>}
        {rows.map((d, i) => (
          <div key={i} className="grid grid-cols-[1.2fr_1.2fr_140px_140px_1fr_28px] items-end gap-2">
            <Field label="Approver (role / stage)"><Select value={d.role} onChange={(x) => set(i, "role", x)} options={delegationRoles(st)} /></Field>
            <Field label="Delegate"><TextInput value={d.delegate} onChange={(x) => set(i, "delegate", x)} /></Field>
            <Field label="From"><DateInput value={d.from} onChange={(x) => set(i, "from", x)} /></Field>
            <Field label="To"><DateInput value={d.to} onChange={(x) => set(i, "to", x)} /></Field>
            <Field label="Reason"><TextInput value={d.reason} onChange={(x) => set(i, "reason", x)} /></Field>
            <IconBtn icon={Icon.trash} title="Remove" onClick={() => setF({ ...f, delegations: rows.filter((_, j) => j !== i) })} />
          </div>
        ))}
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------- document waivers (accept a missing / expired document for a limited time)
const waiverOf = (v, name) => { const w = (v.waivers || {})[name]; return w && w.until >= todayISO() ? w : null; };
function WaiverModal({ v, name, onClose }) {
  const [f, setF] = y.useState({ until: "", reason: "" });
  const err = !f.until || f.until <= todayISO() ? "Pick a future end date" : f.until > shiftDays(90) ? "A waiver can last at most 90 days" : f.reason.trim().length < 5 ? "Give the reason" : "";
  return (
    <Modal open onClose={onClose} width={480} title={`Waive ${name}`} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={!!err} title={err} onClick={() => {
      setState((s) => { const x = byId(s.vendors, v.id); x.waivers = { ...(x.waivers || {}), [name]: { until: f.until, reason: f.reason.trim(), by: currentUser(), at: new Date().toISOString() } }; }, { entity: "Vendor", id: v.id, action: `${name} waived until ${fmtDate(f.until)} - ${f.reason.trim()}` });
      toast("Waiver recorded"); onClose();
    }}>Grant waiver</Btn></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Waived until" required><DateInput value={f.until} onChange={(x) => setF({ ...f, until: x })} /></Field>
        <Field label="Reason" required><TextInput value={f.reason} onChange={(x) => setF({ ...f, reason: x })} /></Field>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- contract correspondence and key dates
const LETTER_DIRS = ["Incoming", "Outgoing"];
function LetterModal({ c, onClose }) {
  const [f, setF] = y.useState({ dir: "", date: todayISO(), ref: "", subject: "", replyBy: "", file: null });
  const dupe = f.ref.trim() && (c.letters || []).some((l) => normNo(l.ref) === normNo(f.ref));
  const err = !f.dir ? "Select incoming or outgoing" : !f.date || f.date > todayISO() ? "Enter a date that is not in the future" : f.ref.trim().length < 3 ? "Enter the letter reference" : dupe ? "That reference is already logged" : f.subject.trim().length < 5 ? "Enter the subject" : f.replyBy && f.replyBy < f.date ? "Reply-by can't be before the letter date" : "";
  return (
    <Modal open onClose={onClose} width={600} title={`Log letter - ${c.id}`} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={!!err} title={err} onClick={() => {
      let id = "";
      setState((s) => { const x = byId(s.contracts, c.id); x.letters = x.letters || []; id = `L-${String(x.letters.length + 1).padStart(3, "0")}`; x.letters.unshift({ id, dir: f.dir, date: f.date, ref: f.ref.trim(), subject: f.subject.trim(), replyBy: f.replyBy || null, file: f.file, repliedOn: null, by: currentUser() }); },
        { entity: "Contract", id: c.id, action: `${f.dir} letter ${f.ref.trim()} logged - ${f.subject.trim()}` });
      toast(`Letter logged`); onClose();
    }}>Save</Btn></>}>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Direction" required><Select value={f.dir} onChange={(x) => setF({ ...f, dir: x })} options={LETTER_DIRS} /></Field>
        <Field label="Letter date" required><DateInput value={f.date} onChange={(x) => setF({ ...f, date: x })} /></Field>
        <Field label="Reference" required><TextInput value={f.ref} onChange={(x) => setF({ ...f, ref: x })} /></Field>
        <Field label="Subject" required span={2}><TextInput value={f.subject} onChange={(x) => setF({ ...f, subject: x })} /></Field>
        <Field label="Reply by"><DateInput value={f.replyBy} onChange={(x) => setF({ ...f, replyBy: x })} /></Field>
        <Field label="Letter copy" span={3}>
          <label className={cls("flex h-[32px] cursor-pointer items-center gap-2 truncate rounded-md border border-dashed px-2.5 text-[12.5px]", f.file ? "border-green-300 bg-green-50 text-green-700" : "border-gray-300 text-ink-mute")}>
            <Icon.upload size={13} /><span className="truncate">{f.file?.name || "Attach PDF or image"}</span>
            <input type="file" className="hidden" onChange={async (e) => { const a = await readAttachment(e.target.files[0]); a && setF((ff) => ({ ...ff, file: a })); }} />
          </label>
        </Field>
      </div>
    </Modal>
  );
}
function contractKeyDates(st, c) {
  const out = [], add = (date, what, kind) => date && out.push({ date, what, kind });
  add(c.start, "Contract start", "Contract"); add(c.end, "Completion date", "Contract");
  for (const g of c.guarantees || []) if (["Active", undefined].includes(g.status)) add(g.expiry, `${g.type} guarantee ${g.number} expires`, "Guarantee");
  if (c.handover?.date) add(shiftDays((c.dlpMonths || 0) * 30, c.handover.date), "Defect liability period ends", "DLP");
  const k = c.defaultCase && c.defaultCase.status === "Open" ? c.defaultCase : null;
  if (k) { add(k.cureUntil, "Cure period ends", "Default"); if (k.showCause) add(k.showCause.replyBy, "Show-cause reply due", "Default"); }
  for (const l of c.letters || []) if (l.replyBy && !l.repliedOn) add(l.replyBy, `Reply due - ${l.ref}`, "Letter");
  for (const x of contractClaims(st, c).filter((q) => ["Submitted", "Under review", "Assessed"].includes(q.status))) add(shiftDays(Number(settingsOf(st).claimDecisionDays) || 30, x.submittedOn), `Decision due - claim ${x.id}`, "Claim");
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
function ContractCorrespondence({ c }) {
  const st = useStore();
  const [add, setAdd] = y.useState(false);
  const letters = c.letters || [], dates = contractKeyDates(st, c).filter((d) => d.date >= shiftDays(-30));
  return (
    <>
      <Section title="Correspondence" icon={Icon.mail} actions={<Btn size="sm" icon={Icon.plus} onClick={() => setAdd(true)}>Log letter</Btn>}>
        <DataTable dense plain rows={letters} empty={<p className="p-4 text-[13px] text-ink-mute">No letters logged.</p>} columns={[
          { key: "date", label: "Date", render: (l) => fmtDate(l.date) }, { key: "dir", label: "Direction", render: (l) => <Status tone={l.dir === "Incoming" ? "blue" : "purple"}>{l.dir}</Status> },
          { key: "ref", label: "Reference · subject", className: "whitespace-normal", render: (l) => <span className="flex flex-col"><span className="mono text-[12px]">{l.ref}</span><span>{l.subject}</span>{l.file && <FileLink name={l.file.name} dataUrl={l.file.dataUrl} />}</span> },
          { key: "r", label: "Reply", render: (l) => (l.repliedOn ? <span className="text-green-700">Replied {fmtDate(l.repliedOn)}</span> : l.replyBy ? <span className="flex flex-col items-start gap-1"><span className={l.replyBy < todayISO() ? "text-red-600" : ""}>Due {fmtDate(l.replyBy)}</span><Btn size="sm" onClick={() => {
            setState((s) => { const x = byId(s.contracts, c.id).letters.find((q) => q.id === l.id); x.repliedOn = todayISO(); }, { entity: "Contract", id: c.id, action: `Letter ${l.ref} replied` }); toast("Marked replied");
          }}>Mark replied</Btn></span> : "-") },
        ]} />
      </Section>
      <Section title="Key dates" icon={Icon.calendarClock}>
        <DataTable dense plain rows={dates} rowKey={(d, i) => `${d.date}-${i}`} empty={<p className="p-4 text-[13px] text-ink-mute">No dates coming up.</p>} columns={[
          { key: "date", label: "Date", render: (d) => <span className={cls(d.date < todayISO() ? "text-ink-mute" : daysUntil(d.date) <= 14 ? "font-semibold text-amber-700" : "")}>{fmtDate(d.date)}</span> },
          { key: "what", label: "What" }, { key: "kind", label: "Type", render: (d) => <Status>{d.kind}</Status> },
          { key: "in", label: "When", align: "right", render: (d) => (d.date < todayISO() ? `${-daysUntil(d.date)} days ago` : daysUntil(d.date) === 0 ? "Today" : `in ${daysUntil(d.date)} days`) },
        ]} />
      </Section>
      {add && <LetterModal c={c} onClose={() => setAdd(false)} />}
    </>
  );
}
function letterExceptions(st, add) {
  for (const c of st.contracts) for (const l of c.letters || []) if (l.dir === "Incoming" && l.replyBy && !l.repliedOn && l.replyBy < todayISO())
    add("Letter reply overdue", "Medium", "Contract", c.id, c.title, `${l.ref} - ${l.subject}; reply was due ${fmtDate(l.replyBy)}`, l.replyBy, `${CL_BASE}/contracts?open=${c.id}`);
}

// ---------------------------------------------------------------- termination reasons
const TERM_REASONS = ["Contractor default", "Poor performance", "HSE violation", "Repeated delay", "Abandonment", "Insolvency", "Breach of contract", "Mutual termination", "Force majeure", "Termination for convenience"];

function seedGovernance(s) {
  if (s.governanceSeeded) return false;
  s.governanceSeeded = true;
  const T = (n) => new Date(Date.now() + n * DAY).toISOString().slice(0, 10);
  s.settings = s.settings || {};
  if (!s.settings.delegations) s.settings.delegations = [{ role: "Finance Controller", delegate: "K. Rao (Deputy Finance)", from: T(-2), to: T(8), reason: "Annual leave" }];
  const c1 = (s.contracts || []).find((c) => c.id === "CTR-001");
  if (c1 && !c1.letters) c1.letters = [
    { id: "L-002", dir: "Incoming", date: T(-9), ref: "SBIC/CTR-001/L-118", subject: "Request for revised drawings - Tower B raft", replyBy: T(-2), file: null, repliedOn: null, by: "Arjun Mehta" },
    { id: "L-001", dir: "Outgoing", date: T(-20), ref: "NBO/SKY/CTR-001/044", subject: "Notice - slow progress on Tower A slab L3", replyBy: null, file: null, repliedOn: null, by: "Arjun Mehta" },
  ];
  const v = (s.vendors || []).find((x) => x.id === "VEN-008");
  if (v && !v.waivers) { const today = new Date().toISOString().slice(0, 10);
    let miss = (v.docs || []).find((d) => ["Missing", "Rejected"].includes(d.status) || (d.expiry && d.expiry < today));
    if (!miss) { try { const n = requiredDocs(v).find((x) => !(v.docs || []).some((d) => d.name === x)); if (n) miss = { name: n }; } catch (e) {} }
    if (miss) v.waivers = { [miss.name]: { until: T(20), reason: "Renewal applied - acknowledgment on file", by: "Compliance", at: new Date().toISOString() } }; }
  return true;
}
