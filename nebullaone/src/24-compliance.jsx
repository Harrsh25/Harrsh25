// Compliance Center - modelled on Procore (insurance requirements & compliance that gates payments),
// SAP Ariba / Oracle Supplier Qualification (requirement rules, verification queue, expiry reminders)
// and ERPNext / Odoo (document expiry tracking).

const INS_TYPES = ["Workmen Compensation", "Contractor's All Risk", "Public / Third-party Liability", "Professional Indemnity", "Motor / Equipment", "Other"];

// ---------------------------------------------------------------- reminders
const lastReminder = (v, key) => (v.reminders || []).filter((r) => r.key === key).sort((a, b) => b.at.localeCompare(a.at))[0] || null;
// Due when: an expiry threshold (30/15/7 days) was crossed since the last reminder, or the item is failing and wasn't chased in 7 days
function reminderDue(v, item) {
  if (item.level === 0) return false;
  const last = lastReminder(v, item.key), days = currentSettings().reminderDays;
  const sinceLast = last ? -daysUntil(last.at.slice(0, 10)) : Infinity;
  if (item.level === 2) return sinceLast >= 7;
  const left = daysUntil(item.expiry);
  if (left === null) return sinceLast >= 7;
  const crossed = days.filter((t) => left <= t).sort((a, b) => a - b)[0];
  if (crossed === undefined) return false;
  return !last || last.at.slice(0, 10) < shiftDays(-crossed, item.expiry);
}
function sendReminders(pairs, auto) {
  if (!pairs.length) return;
  setState((s) => pairs.forEach(({ v, item }) => {
    const x = byId(s.vendors, v.id);
    x.reminders = [...(x.reminders || []), { key: item.key, item: item.name, at: new Date().toISOString(), by: auto ? "System (schedule)" : currentUser(), note: item.note }];
  }), { entity: "Compliance", id: pairs.map((p) => p.v.id).filter((x, i, a) => a.indexOf(x) === i).join(", "), action: `Renewal reminder e-mailed - ${pairs.map((p) => `${p.v.name}: ${p.item.name}`).join("; ")}` });
  toast(`${pairs.length} reminder${pairs.length > 1 ? "s" : ""} e-mailed`);
}

// ---------------------------------------------------------------- reject with reason (documents & policies)
function RejectReasonModal({ title, onReject, onClose }) {
  const [r, setR] = y.useState("");
  const quick = ["Document unreadable", "Expired copy", "Name / GSTIN mismatch", "Cover below required minimum", "Wrong document uploaded"];
  return (
    <Modal open onClose={onClose} width={480} title={title} subtitle="The vendor sees this reason in the supplier portal"
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="danger" disabled={!r.trim()} onClick={() => { onReject(r.trim()); onClose(); }}>Reject</Btn></>}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">{quick.map((q) => <button key={q} type="button" onClick={() => setR(q)} className="rounded-full border border-line px-2.5 py-1 text-[12px] hover:border-brand hover:text-brand">{q}</button>)}</div>
        <Field label="Reason" required><TextArea value={r} onChange={setR} /></Field>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- insurance policies (vendor Documents tab, compliance drawer, supplier portal)
function InsurancePolicies({ v, mode = "registry", locked, portal }) {
  const [edit, setEdit] = y.useState(null), [rej, setRej] = y.useState(null);
  const items = complianceItems(v).filter((i) => i.kind === "Insurance");
  const mut = (fn, action) => setState((s) => fn(byId(s.vendors, v.id)), { entity: "Vendor", id: v.id, action });
  const blank = (type) => ({ type: type || items.find((i) => i.level > 0)?.rule.type || INS_TYPES[0], policy: "", insurer: "", cover: "", start: todayISO(), expiry: shiftDays(365), file: "", dataUrl: null });
  const policies = (v.insurance || []).slice().sort((a, b) => (b.expiry || "").localeCompare(a.expiry || ""));
  // Policy form checks: number format, unique per insurer, cover > 0, dates in order, not already expired
  const insErr = !edit ? "" : !edit.policy.trim() ? "Enter the policy number"
    : !/^[A-Za-z0-9/\-. ]{4,40}$/.test(edit.policy.trim()) ? "Policy number: 4–40 letters, digits, / - ."
    : (v.insurance || []).some((p) => p.id !== edit.id && normNo(p.policy) === normNo(edit.policy) && (p.insurer || "").trim().toLowerCase() === edit.insurer.trim().toLowerCase() && p.expiry === edit.expiry) ? "This policy is already on file"
    : edit.insurer.trim().length < 3 ? "Enter the insurer"
    : !(Number(edit.cover) > 0) ? "Sum insured must be more than zero"
    : !edit.start || !edit.expiry ? "Enter valid-from and valid-till dates"
    : edit.expiry <= edit.start ? "Valid till must be after valid from"
    : edit.expiry < todayISO() ? "Policy has already expired - upload the current policy"
    : edit.start > shiftDays(90) ? "Valid from can't be more than 90 days ahead"
    : portal && !edit.file ? "Attach the policy copy" : "";
  const save = () => {
    if (insErr) return toast(insErr, "red");
    const p = { ...edit, policy: edit.policy.trim(), insurer: edit.insurer.trim(), cover: Number(edit.cover), status: "Pending", uploadedAt: todayISO(), id: edit.id || `POL-${Date.now()}` };
    mut((x) => { x.insurance = [...(x.insurance || []).filter((i) => i.id !== p.id), p]; }, `${p.type} policy ${p.policy} ${edit.id ? "updated" : "added"} - awaiting verification`);
    toast("Policy saved - awaiting verification"); setEdit(null);
  };
  const pStatus = (p) => (p.status === "Rejected" ? "Rejected" : daysUntil(p.expiry) < 0 ? "Expired" : p.status === "Pending" ? "Pending" : daysUntil(p.expiry) <= currentSettings().expiryWarnDays ? "Expiring" : "Verified");
  return (
    <Section title="Insurance" icon={Icon.shield} actions={!locked && <Btn size="sm" variant={portal ? "primary" : "secondary"} icon={Icon.plus} onClick={() => setEdit(blank())}>{portal ? "Upload policy" : "Add policy"}</Btn>}>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b border-line px-4 py-3">
          {items.map((i) => (
            <span key={i.key} className={cls("flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12.5px]", i.level === 2 ? "border-red-200 bg-red-50" : i.level === 1 ? "border-amber-200 bg-amber-50" : "border-green-200 bg-green-50")}>
              <b className="font-medium">{i.rule.type}</b><span className="text-ink-soft">min {inrShort(i.rule.min)}</span>
              <Status tone={i.level === 2 ? "red" : i.level === 1 ? "amber" : "green"}>{i.level === 0 ? "Met" : i.note}</Status>
            </span>
          ))}
        </div>
      )}
      <DataTable dense rows={policies} rowKey={(p) => p.id || p.policy} empty={<p className="p-4 text-[13px] text-ink-mute">{items.length ? "No policy on file yet - required cover is listed above." : "No insurance is required for this vendor type."}</p>} columns={[
        { key: "type", label: "Coverage", className: "font-medium" },
        { key: "policy", label: "Policy no." }, { key: "insurer", label: "Insurer" },
        { key: "cover", label: "Sum insured", align: "right", num: true, render: (p) => inrShort(p.cover) },
        { key: "exp", label: "Valid till", render: (p) => <ExpiryCell iso={p.expiry} /> },
        { key: "f", label: "Policy copy", render: (p) => (p.file ? <FileLink name={p.file} dataUrl={p.dataUrl} /> : <span className="text-ink-faint">-</span>) },
        { key: "s", label: "Status", render: (p) => <span className="flex flex-col"><Status>{pStatus(p)}</Status>{p.status === "Rejected" && p.remark && <span className="max-w-[200px] whitespace-normal text-[11px] text-red-600">{p.remark}</span>}</span> },
        { key: "a", label: "", align: "right", render: (p) => (
          <span className="flex justify-end gap-1">
            {mode === "approval" && p.status === "Pending" && <>
              <Btn size="sm" variant="success" onClick={() => mut((x) => { const q = x.insurance.find((i) => i === p || i.id === p.id); q.status = "Verified"; q.verifiedBy = currentUser(); q.verifiedAt = new Date().toISOString(); }, `${p.type} policy ${p.policy} verified`)}>Verify</Btn>
              <Btn size="sm" variant="danger" onClick={() => setRej(p)}>Reject</Btn></>}
            {!locked && <Btn size="sm" icon={Icon.refresh} onClick={() => setEdit({ ...blank(p.type), insurer: p.insurer, cover: p.cover })}>Renew</Btn>}
          </span>) },
      ]} />
      {edit && (
        <Modal open onClose={() => setEdit(null)} width={620} title={edit.id ? "Edit policy" : portal ? "Upload insurance policy" : "Add insurance policy"} subtitle="Saved as Pending until verified against the policy copy"
          footer={<>{insErr && <span className="mr-auto text-[12px] text-red-600">{insErr}</span>}<Btn onClick={() => setEdit(null)}>Cancel</Btn><Btn variant="primary" disabled={!!insErr} onClick={save}>Save policy</Btn></>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Coverage type" required><Select value={edit.type} onChange={(x) => setEdit({ ...edit, type: x })} options={withCurrent(INS_TYPES, edit.type)} /></Field>
            <Field label="Policy number" required><TextInput value={edit.policy} onChange={(x) => setEdit({ ...edit, policy: x })} placeholder="e.g. WC/2026/88121" /></Field>
            <Field label="Insurer" required><TextInput value={edit.insurer} onChange={(x) => setEdit({ ...edit, insurer: x })} placeholder="e.g. ICICI Lombard" /></Field>
            <Field label="Sum insured (₹)" required hint={(() => { const r = items.find((i) => i.rule.type === edit.type); return r ? `Required minimum ${inrShort(r.rule.min)}` : ""; })()}><NumInput value={edit.cover} onChange={(x) => setEdit({ ...edit, cover: x })} /></Field>
            <Field label="Valid from"><DateInput value={edit.start} onChange={(x) => setEdit({ ...edit, start: x })} /></Field>
            <Field label="Valid till" required><DateInput value={edit.expiry} onChange={(x) => setEdit({ ...edit, expiry: x })} /></Field>
            <Field label="Policy copy" required={portal} span={2}><input type="file" accept=".pdf,.jpg,.jpeg,.png" className="block w-full text-[13px]" onChange={async (e) => { const f0 = e.target.files[0]; if (f0) { const a = await readAttachment(f0); if (!a) { e.target.value = ""; return; } setEdit((x) => ({ ...x, file: a.name, dataUrl: a.dataUrl })); } }} /></Field>
          </div>
          {(() => { const r = items.find((i) => i.rule.type === edit.type); return r && Number(edit.cover) > 0 && Number(edit.cover) < r.rule.min ? <div className="mt-3"><Note tone="amber">Cover is below the required {inrShort(r.rule.min)} - the vendor will stay non-compliant.</Note></div> : null; })()}
        </Modal>
      )}
      {rej && <RejectReasonModal title={`Reject ${rej.type} policy ${rej.policy}`} onClose={() => setRej(null)}
        onReject={(reason) => mut((x) => { const q = x.insurance.find((i) => i === rej || i.id === rej.id); q.status = "Rejected"; q.remark = reason; }, `${rej.type} policy ${rej.policy} rejected - ${reason}`)} />}
    </Section>
  );
}

// ---------------------------------------------------------------- vendor compliance drawer
function ComplianceDrawer({ vendorId, onClose }) {
  const st = useStore();
  const v = byId(st.vendors, vendorId);
  const [tab, setTab] = y.useState("check");
  if (!v) return null;
  const c = complianceOf(v);
  const gate = c.blocking.length ? settingsOf(st).complianceGate : "Off";
  const hist = [...(v.reminders || []).map((r) => ({ id: "Reminder", action: `${r.item} - ${r.note}`, by: r.by, at: r.at })),
    ...st.audit.filter((a) => a.id === v.id && /upload|verif|reject|policy|document|insurance|licence|certificate/i.test(a.action))].sort((a, b) => b.at.localeCompare(a.at));
  const due = c.items.filter((i) => reminderDue(v, i));
  return (
    <Drawer open onClose={onClose} width={980} title={v.name} recordId={v.id} status={<Status>{c.status}</Status>} details={[["Supplies", <VendorTypeTag v={v} />], ["Payment gate", c.blocking.length ? <Status tone={gate === "Stop" ? "red" : "amber"}>{gate === "Stop" ? "Payments blocked" : gate === "Warn" ? "Payments flagged" : "Gate off"}</Status> : <Status tone="green">Payments open</Status>]]}
     
      actions={<Btn icon={Icon.mail} disabled={!c.items.some((i) => i.level > 0)} title={c.items.some((i) => i.level > 0) ? "" : "Nothing is expired or expiring - no reminder needed"} onClick={() => sendReminders(c.items.filter((i) => i.level > 0).map((item) => ({ v, item })))}>Send reminder{due.length ? ` (${due.length} due)` : ""}</Btn>}
      tabs={{ tabs: [{ id: "check", label: "Checklist" }, { id: "docs", label: "Documents" }, { id: "hist", label: "Reminders & history", count: hist.length || null }], active: tab, onChange: setTab }}>
      <div className="space-y-4 px-6 py-5">
        {c.blocking.length > 0 && <Note tone="red" icon={Icon.lock}><b>Blocking payments:</b> {c.blocking.join(" · ")}</Note>}
        {tab === "check" && (
          <Section title="Requirement checklist" icon={Icon.listChecks} actions={<span className="text-[12px] text-ink-mute">{c.items.filter((i) => i.level === 0).length} of {c.items.length} met</span>}>
            <DataTable dense rows={c.items} rowKey={(i) => i.key} columns={[
              { key: "n", label: "Requirement", className: "font-medium", render: (i) => i.name },
              { key: "k", label: "Type", render: (i) => i.kind },
              { key: "e", label: "Valid till", render: (i) => <ExpiryCell iso={i.expiry} /> },
              { key: "s", label: "Status", render: (i) => <Status tone={i.level === 2 ? "red" : i.level === 1 ? "amber" : "green"}>{i.level === 0 ? "Met" : i.note}</Status> },
              { key: "b", label: "Blocks payment", render: (i) => (i.blocks ? "Yes" : "No") },
              { key: "r", label: "Last reminder", render: (i) => { const r = lastReminder(v, i.key); return r ? fmtDate(r.at) : <span className="text-ink-faint">-</span>; } },
              { key: "a", label: "", align: "right", render: (i) => i.level > 0 && <Btn size="sm" icon={Icon.mail} onClick={() => sendReminders([{ v, item: i }])}>Remind</Btn> },
            ]} />
          </Section>
        )}
        {tab === "docs" && <VendorDocs v={v} mode="approval" />}
        {tab === "hist" && <Section title="Reminders & compliance history" icon={Icon.fileClock}><AuditList items={hist} /></Section>}
      </div>
    </Drawer>
  );
}

// ---------------------------------------------------------------- requirements editor
function RequirementsEditor() {
  const st = useStore();
  const s0 = settingsOf(st);
  const [docs, setDocs] = y.useState(() => s0.complianceDocs.filter((d) => !INSURANCE_DOC.test(d.name)).map((d) => ({ ...d })));
  const [ins, setIns] = y.useState(() => s0.complianceIns.map((d) => ({ ...d })));
  const [warn, setWarn] = y.useState(s0.expiryWarnDays), [rem, setRem] = y.useState(s0.reminderDays.join(", "));
  const upd = (list, set, i, k, val) => set(list.map((x, j) => (j === i ? { ...x, [k]: val } : x)));
  const affected = (r) => st.vendors.filter((v) => appliesTo(r, v)).length;
  const save = () => {
    setState((s) => { s.settings = { ...settingsOf(s), complianceDocs: docs.filter((d) => d.name.trim()), complianceIns: ins.filter((d) => d.type.trim()).map((d) => ({ ...d, min: Number(d.min) || 0 })),
      expiryWarnDays: Number(warn) || 30, reminderDays: rem.split(/[,\s]+/).map(Number).filter((n) => n > 0).sort((a, b) => b - a) }; }, { entity: "Settings", id: "COMPLIANCE", action: "Compliance requirements updated" });
    toast("Requirements saved - every vendor re-evaluated");
  };
  const Chk = ({ on, onChange }) => <input type="checkbox" className="h-4 w-4 accent-[#0b5ed7]" checked={!!on} onChange={(e) => onChange(e.target.checked)} />;
  return (
    <div className="space-y-4 p-4">
      <Note>Requirements decide what every vendor must hold. Changes apply immediately to all vendors - statuses, the payment gate and reminders are recalculated.</Note>
      <Section title="Document requirements" icon={Icon.folderCheck} actions={<Btn size="sm" icon={Icon.plus} onClick={() => setDocs([...docs, { name: "", applies: "all", expires: false, blocks: false }])}>Add document</Btn>}>
        <table className="w-full"><thead><tr><Th>Document</Th><Th>Required for</Th><Th align="center">Has expiry</Th><Th align="center">Blocks payment</Th><Th align="right">Vendors</Th><Th align="right">Actions</Th></tr></thead>
          <tbody>{docs.map((d, i) => (
            <tr key={i}><Td className="w-[38%]"><TextInput value={d.name} onChange={(x) => upd(docs, setDocs, i, "name", x)} /></Td>
              <Td className="w-[26%]"><Select value={d.applies} onChange={(x) => upd(docs, setDocs, i, "applies", x)} options={APPLIES} /></Td>
              <Td align="center"><Chk on={d.expires} onChange={(x) => upd(docs, setDocs, i, "expires", x)} /></Td>
              <Td align="center"><Chk on={d.blocks} onChange={(x) => upd(docs, setDocs, i, "blocks", x)} /></Td>
              <Td align="right" className="num text-ink-soft">{affected(d)}</Td>
              <Td align="right"><IconBtn icon={Icon.trash} title="Remove requirement" onClick={() => setDocs(docs.filter((_, j) => j !== i))} /></Td></tr>
          ))}</tbody></table>
      </Section>
      <Section title="Expiry & reminders" icon={Icon.clock}>
        <div className="grid grid-cols-3 gap-4 p-4">
          <Field label="Mark as “Expiring” within (days)"><NumInput value={warn} onChange={setWarn} /></Field>
          <Field label="Renewal reminders - days before expiry" hint="Missing / expired items are chased weekly"><TextInput value={rem} onChange={setRem} placeholder="30, 15, 7" /></Field>
          <Field label="Payment gate" hint="Stop / Warn / Off - set in Procurement Settings"><div className="flex h-[34px] items-center text-[13px]"><Status tone={s0.complianceGate === "Stop" ? "red" : s0.complianceGate === "Warn" ? "amber" : "gray"}>{s0.complianceGate}</Status></div></Field>
        </div>
      </Section>
      <div className="flex justify-end"><Btn variant="primary" icon={Icon.save} onClick={save}>Save requirements</Btn></div>
    </div>
  );
}

// ---------------------------------------------------------------- page
function CompliancePage() {
  const st = useStore();
  const [tab, setTab] = y.useState("vendors");
  const [open, setOpen] = useQueryOpen();
  const [flt, setFlt] = y.useState("All"), [bucket, setBucket] = y.useState("All");
  const [rej, setRej] = y.useState(null);
  const set0 = settingsOf(st);
  // Every vendor in the registry is listed (same count as the Registry); reminders only go to vendors we still work with
  const isLive = (v) => !["Blacklisted", "Inactive", "Rejected", "Draft"].includes(v.status);
  const rows = st.vendors.map((v) => { const c = complianceOf(v); return { v, c, next: c.items.map((i) => i.expiry).filter(Boolean).sort()[0] || null, due: isLive(v) ? c.items.filter((i) => reminderDue(v, i)) : [] }; });
  const allItems = rows.flatMap((r) => r.c.items.map((item) => ({ ...r, item, key: r.v.id + item.key })));
  const dueAll = allItems.filter((x) => isLive(x.v) && reminderDue(x.v, x.item));
  const bucketOf = (d) => (d === null ? null : d < 0 ? "Expired" : d <= 30 ? "≤ 30 days" : d <= 60 ? "31–60 days" : d <= 90 ? "61–90 days" : null);
  const expRows = allItems.filter((x) => x.item.expiry && bucketOf(daysUntil(x.item.expiry)) && (bucket === "All" || bucketOf(daysUntil(x.item.expiry)) === bucket))
    .sort((a, b) => a.item.expiry.localeCompare(b.item.expiry));
  const pendDocs = st.vendors.flatMap((v) => v.docs.filter((d) => d.status === "Pending").map((d) => ({ v, kind: "Document", name: d.name, d, key: v.id + d.name })));
  const queue = pendDocs;
  const counts = { Compliant: 0, Expiring: 0, "Non-Compliant": 0 };
  rows.forEach((r) => counts[r.c.status]++);
  const blocked = rows.filter((r) => r.c.blocking.length).length;
  const vendorRows = rows.filter((r) => selAny(flt, (x) => (x === "Blocked" ? r.c.blocking.length > 0 : r.c.status === x)));
  const mutDoc = (v, name, fn, action) => setState((s) => fn(byId(s.vendors, v.id).docs.find((d) => d.name === name)), { entity: "Vendor", id: v.id, action });
  const mutPol = (v, p, fn, action) => setState((s) => fn(byId(s.vendors, v.id).insurance.find((i) => i === p || (i.id && i.id === p.id) || i.policy === p.policy)), { entity: "Vendor", id: v.id, action });
  const gateTag = (r) => (r.c.blocking.length ? <Status tone={set0.complianceGate === "Stop" ? "red" : set0.complianceGate === "Warn" ? "amber" : "gray"}>{set0.complianceGate === "Stop" ? "Blocked" : set0.complianceGate === "Warn" ? "Flagged" : "Open (gate off)"}</Status> : <Status tone="green">Open</Status>);
  return (
    <Page title="Compliance Center" subtitle="Vendor documents, expiry reminders and the payment compliance gate" icon={Icon.shieldCheck}
      actions={<Btn variant="primary" icon={Icon.mail} disabled={!dueAll.length} onClick={() => sendReminders(dueAll.map((x) => ({ v: x.v, item: x.item })), true)}>Send due reminders</Btn>}>
      <TabBar active={tab} onChange={setTab} tabs={[{ id: "vendors", label: "Vendors", icon: Icon.building }, { id: "exp", label: "Expiring & expired", icon: Icon.fileClock },
        { id: "verify", label: "Verification queue", icon: Icon.clipboardCheck }, { id: "req", label: "Requirements", icon: Icon.sliders }]} />
      {tab === "vendors" && <>
        <DataTable noun="vendors" filters={<FilterSelect label="Status" value={flt} onChange={setFlt} options={[{ value: "All", label: "All statuses" }, "Compliant", { value: "Expiring", label: "Attention needed" }, "Non-Compliant", { value: "Blocked", label: "Payments blocked" }]} />} rows={vendorRows} rowKey={(r) => r.v.id} onRow={(r) => setOpen(r.v.id)} columns={[
          { key: "n", label: "Vendor", className: "font-medium", render: (r) => r.v.name },
          { key: "s", label: "Status", render: (r) => <Status>{r.c.status}</Status> },
          { key: "o", label: "Open items", render: (r) => <span className="block max-w-[240px] truncate">{r.c.issues.join(" · ") || "-"}</span> },
          { key: "x", label: "Next expiry", render: (r) => <ExpiryCell iso={r.next} /> },
          { key: "g", label: "Payment gate", filterOptions: FO.gate, filter: (r) => (r.c.blocking.length ? (set0.complianceGate === "Stop" ? "Blocked" : set0.complianceGate === "Warn" ? "Flagged" : "Open (gate off)") : "Open"), render: gateTag },
          { key: "a", label: "", align: "right", render: (r) => r.due.length > 0 && <span onClick={(e) => e.stopPropagation()}><Btn size="sm" icon={Icon.mail} onClick={() => sendReminders(r.due.map((item) => ({ v: r.v, item })))}>Remind ({r.due.length})</Btn></span> },
        ]} />
      </>}
      {tab === "exp" && <>
        <DataTable noun="items" filters={<div className="flex gap-1.5">{["All", "Expired", "≤ 30 days", "31–60 days", "61–90 days"].map((b) => {
          const n = b === "All" ? null : allItems.filter((x) => x.item.expiry && bucketOf(daysUntil(x.item.expiry)) === b).length;
          return <button key={b} onClick={() => setBucket(b)} className={cls("rounded-full border px-3 py-1 text-[12.5px]", bucket === b ? "border-brand bg-brand-soft text-brand" : "border-line text-ink-soft hover:border-gray-300")}>{b}{n !== null ? ` · ${n}` : ""}</button>; })}</div>} rows={expRows} rowKey={(x) => x.key} onRow={(x) => setOpen(x.v.id)} empty={<EmptyState icon={Icon.check} title="Nothing expiring in this window" />} columns={[
          { key: "v", label: "Vendor", filterOptions: FO.vendors, filter: (x) => x.v.name, className: "font-medium", render: (x) => x.v.name },
          { key: "n", label: "Document / policy", render: (x) => x.item.name },
          { key: "k", label: "Type", filterOptions: FO.kind, filter: (x) => x.item.kind, render: (x) => x.item.kind },
          { key: "e", label: "Valid till", render: (x) => fmtDate(x.item.expiry) },
          { key: "d", label: "Days left", align: "right", render: (x) => { const d = daysUntil(x.item.expiry); return <span className={cls("num", d < 0 ? "text-red-600" : d <= 30 ? "text-amber-700" : "")}>{d < 0 ? `${-d} overdue` : d}</span>; } },
          { key: "b", label: "Blocks payment", filterOptions: FO.yesNo, filterAll: "Blocks payment: any", filter: (x) => (x.item.blocks ? "Yes" : "No"), render: (x) => (x.item.blocks ? "Yes" : "No") },
          { key: "r", label: "Last reminder", render: (x) => { const r = lastReminder(x.v, x.item.key); return r ? fmtDate(r.at) : <span className="text-ink-faint">Not sent</span>; } },
          { key: "a", label: "", align: "right", render: (x) => <span onClick={(e) => e.stopPropagation()}><Btn size="sm" icon={Icon.mail} onClick={() => sendReminders([{ v: x.v, item: x.item }])}>Remind</Btn></span> },
        ]} />
      </>}
      {tab === "verify" && (
        <DataTable noun="uploads" rows={queue} rowKey={(x) => x.key} onRow={(x) => setOpen(x.v.id)} empty={<EmptyState icon={Icon.check} title="Nothing waiting for verification" text="New uploads from vendors and your team appear here." />} columns={[
          { key: "v", label: "Vendor", filterOptions: FO.vendors, filter: (x) => x.v.name, className: "font-medium", render: (x) => x.v.name },
          { key: "n", label: "Document / policy", render: (x) => x.name },
          { key: "k", label: "Type", filterOptions: FO.kind, filter: (x) => x.kind, render: (x) => x.kind },
          { key: "det", label: "Details", render: (x) => (x.p ? `${x.p.insurer} · ${inrShort(x.p.cover)}` : "-") },
          { key: "e", label: "Valid till", render: (x) => <ExpiryCell iso={x.d ? x.d.expiry : x.p.expiry} /> },
          { key: "u", label: "Uploaded", render: (x) => fmtDate((x.d || x.p).uploadedAt) },
          { key: "f", label: "File", render: (x) => { const o = x.d || x.p; return o.file ? <FileLink name={o.file} dataUrl={o.dataUrl} /> : "-"; } },
          { key: "a", label: "", align: "right", render: (x) => (
            <span className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
              <Btn size="sm" variant="success" onClick={() => (x.d ? mutDoc(x.v, x.name, (d) => { Object.assign(d, { status: "Verified", remark: "", verifiedBy: currentUser(), verifiedAt: new Date().toISOString() }); }, `${x.name} verified`) : mutPol(x.v, x.p, (p) => { p.status = "Verified"; }, `${x.name} policy verified`))}>Verify</Btn>
              <Btn size="sm" variant="danger" onClick={() => setRej(x)}>Reject</Btn>
            </span>) },
        ]} />
      )}
      {tab === "req" && <RequirementsEditor />}
      {open && <ComplianceDrawer vendorId={open} onClose={() => setOpen(null)} />}
      {rej && <RejectReasonModal title={`Reject - ${rej.name} (${rej.v.name})`} onClose={() => setRej(null)}
        onReject={(reason) => (rej.d ? mutDoc(rej.v, rej.name, (d) => { d.status = "Rejected"; d.remark = reason; }, `${rej.name} rejected - ${reason}`) : mutPol(rej.v, rej.p, (p) => { p.status = "Rejected"; p.remark = reason; }, `${rej.name} policy rejected - ${reason}`))} />}
    </Page>
  );
}
