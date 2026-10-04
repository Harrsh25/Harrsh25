// Duplicate supplier review: candidate matches with a confidence % and the matched fields, and the reviewer's
// decision - Different supplier (dismiss), Same supplier (registration rejected as a duplicate) or Merge (the new
// registration's extra documents, contacts and bank accounts move to the existing vendor). Every decision is audited.
const NAME_NOISE = /\b(pvt|private|ltd|limited|llp|co|company|and|the|inc|corp|corporation|enterprises?|services?|india)\b/g;
const nameTokens = (s) => new Set(String(s || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(NAME_NOISE, " ").split(/\s+/).filter((x) => x.length > 1));
function nameSimilarity(a, b) { const A = nameTokens(a), B = nameTokens(b); if (!A.size || !B.size) return 0; const inter = [...A].filter((x) => B.has(x)).length; return inter / new Set([...A, ...B]).size; }
const FREE_MAIL = /@(gmail|yahoo|hotmail|outlook|rediffmail|live|icloud)\./i;
function duplicateMatches(st, v) {
  const out = [];
  const g = (v.gstin || "").toUpperCase(), pn = (v.pan || "").toUpperCase(), em = String(v.contact?.email || "").toLowerCase(), ph = digits10(v.contact?.phone);
  const accts = (v.bankAccounts || []).map(acctKey).filter((k) => k.length > 6);
  for (const o of st.vendors) {
    if (o.id === v.id || o.mergedInto) continue;
    const f = [];
    if (g.length === 15 && (o.gstin || "").toUpperCase() === g) f.push(["GSTIN", 45]);
    if (pn.length === 10 && (o.pan || "").toUpperCase() === pn) f.push(["PAN", 35]);
    if (accts.length && (o.bankAccounts || []).some((b) => accts.includes(acctKey(b)))) f.push(["Bank account", 45]);
    const ns = Math.max(nameSimilarity(v.name, o.name), nameSimilarity(v.legalName, o.legalName));
    if (ns >= 0.6) f.push([`Legal name (${Math.round(ns * 100)}% alike)`, Math.round(20 * ns)]);
    if (em && String(o.contact?.email || "").toLowerCase() === em) f.push(["E-mail", 15]);
    else if (em && !FREE_MAIL.test(em) && em.split("@")[1] && String(o.contact?.email || "").toLowerCase().endsWith("@" + em.split("@")[1])) f.push(["E-mail domain", 5]);
    if (ph.length === 10 && (digits10(o.contact?.phone) === ph || digits10(o.contact?.mobile) === ph)) f.push(["Phone", 15]);
    if (v.address && o.address && v.city && v.city === o.city && nameSimilarity(v.address, o.address) >= 0.5) f.push(["Address", 10]);
    const conf = Math.min(100, sum(f, (x) => x[1]));
    if (conf >= 15) out.push({ other: o, fields: f.map((x) => x[0]), confidence: conf, decision: (v.dupDecisions || {})[o.id] || null });
  }
  return out.sort((a, b) => b.confidence - a.confidence);
}
const openDuplicates = (st, v) => duplicateMatches(st, v).filter((m) => !m.decision);

function decideDuplicate(v, m, decision, note) {
  const st = getState(), o = m.other;
  if (!(note || "").trim() || note.trim().length < 5) { toast("Write a short note for the decision", "red"); return false; }
  setState((s) => {
    const x = byId(s.vendors, v.id), t = byId(s.vendors, o.id);
    x.dupDecisions = { ...(x.dupDecisions || {}), [o.id]: { decision, note: note.trim(), by: currentUser(), at: new Date().toISOString(), confidence: m.confidence, fields: m.fields } };
    if (decision === "Same supplier" || decision === "Merge") {
      const pend = (x.approval?.stages || []).find((a) => ["Pending", "Waiting", "Changes Requested"].includes(a.status));
      if (pend) Object.assign(pend, { status: "Rejected", by: currentUser(), at: new Date().toISOString(), remark: `Duplicate of ${t.name} (${t.id})` });
      x.status = "Rejected"; x.duplicateOf = t.id;
    }
    if (decision === "Merge") {
      x.mergedInto = t.id;
      const haveDoc = new Set((t.docs || []).filter((d) => d.status !== "Missing").map((d) => d.name));
      for (const d of x.docs || []) if (d.status !== "Missing" && !haveDoc.has(d.name)) { t.docs = (t.docs || []).filter((z) => z.name !== d.name); t.docs.push({ ...d, status: d.status === "Verified" ? "Verified" : "Pending", note: `From merged ${x.id}` }); }
      const haveAcc = new Set((t.bankAccounts || []).map(acctKey));
      for (const b of x.bankAccounts || []) if (b.account && !haveAcc.has(acctKey(b))) t.bankAccounts.push({ ...b, id: Date.now() + Math.random(), isDefault: false, status: "Unverified", change: lifeStatus(t) ? { status: "Requested", requestedBy: currentUser(), requestedAt: new Date().toISOString() } : undefined, note: `From merged ${x.id}` });
      x.bankAccounts = [];
      t.contacts = [...(t.contacts || []), ...(x.contacts || []).filter((c) => !(t.contacts || []).some((z) => z.email && z.email === c.email))];
      t.addresses = [...(t.addresses || []), ...(x.addresses || []).filter((a) => !(t.addresses || []).some((z) => z.line1 === a.line1))];
      t.mergedFrom = [...(t.mergedFrom || []), { id: x.id, at: new Date().toISOString(), by: currentUser() }];
    }
  }, { entity: "Vendor", id: v.id, action: `Duplicate review vs ${o.name} (${o.id}, ${m.confidence}% - ${m.fields.join(", ")}): ${decision}${decision === "Merge" ? ` - documents, contacts and bank accounts moved to ${o.id}` : ""} - ${note.trim()}` });
  if (decision === "Merge") setState(() => {}, { entity: "Vendor", id: o.id, action: `Merged duplicate registration ${v.id} (${v.name}) into this vendor - new bank accounts need verification` });
  toast(decision === "Different supplier" ? "Marked as a different supplier" : decision === "Merge" ? `Merged into ${o.id}` : "Rejected as a duplicate", decision === "Different supplier" ? "green" : "red");
  return true;
}

function DuplicateReview({ v, canDecide }) {
  const st = useStore(), ms = duplicateMatches(st, v);
  const [d, setD] = y.useState(null);
  if (!ms.length) return null;
  const tone = (c) => (c >= 70 ? "red" : c >= 40 ? "amber" : "blue");
  return (
    <div className="border-b border-line" data-dup>
      <div className="px-4 pt-3 text-[13px] font-medium">Possible duplicate supplier{ms.some((m) => !m.decision) ? " - check before approving" : ""}</div>
      <ListMode.Provider value={false}><DataTable dense plain rows={ms.map((m) => ({ ...m, id: m.other.id }))} columns={[
        { key: "o", label: "Existing vendor", className: "font-medium", render: (m) => <span>{m.other.name} <span className="mono text-[11.5px] text-ink-mute">{m.other.id}</span></span> },
        { key: "c", label: "Match", render: (m) => <Status tone={tone(m.confidence)}>{`${m.confidence}%`}</Status> },
        { key: "f", label: "Matched fields", render: (m) => <span className="flex flex-wrap gap-1">{m.fields.map((x) => <span key={x} className="rounded bg-gray-100 px-1.5 py-[1px] text-[11px]">{x}</span>)}</span> },
        { key: "d", label: "Decision", align: "right", render: (m) => (m.decision ? <span className="flex flex-col items-end"><Status tone={m.decision.decision === "Different supplier" ? "green" : "red"}>{m.decision.decision}</Status><span className="text-[11px] text-ink-mute">{m.decision.by} · {fmtDate(m.decision.at)}</span></span>
          : canDecide ? <span className="flex justify-end gap-1"><Btn size="sm" onClick={() => setD({ m, decision: "Different supplier", note: "" })}>Different</Btn><Btn size="sm" variant="danger" onClick={() => setD({ m, decision: "Same supplier", note: "" })}>Same</Btn><Btn size="sm" variant="primary" onClick={() => setD({ m, decision: "Merge", note: "" })}>Merge</Btn></span> : <Status tone="amber">To review</Status>) },
      ]} /></ListMode.Provider>
      {d && (
        <Modal open width={520} onClose={() => setD(null)} title={`${d.decision} - ${d.m.other.name}`} footer={<><Btn onClick={() => setD(null)}>Cancel</Btn><Btn variant={d.decision === "Different supplier" ? "primary" : "danger"} disabled={d.note.trim().length < 5} onClick={() => decideDuplicate(v, d.m, d.decision, d.note) && setD(null)}>Confirm</Btn></>}>
          <p className="mb-3 text-[13px] text-ink-soft">{d.decision === "Different supplier" ? "The warning is dismissed for this pair; the registration continues through approval." : d.decision === "Same supplier" ? `This registration is rejected as a duplicate of ${d.m.other.id}.` : `This registration is rejected and its extra documents, contacts and bank accounts move to ${d.m.other.id} (bank accounts arrive unverified).`}</p>
          <Field label="Note" required><TextInput value={d.note} onChange={(x) => setD({ ...d, note: x })} placeholder={d.decision === "Different supplier" ? "e.g. Sister company - separate GSTIN and bank" : "e.g. Same PAN and bank - re-registration"} /></Field>
        </Modal>
      )}
    </div>
  );
}
