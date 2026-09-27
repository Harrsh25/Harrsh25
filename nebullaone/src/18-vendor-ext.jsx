// Vendor onboarding extensions: invitations (Zoho "Invite Vendor", Procore
// "Prequalify Here"), portal users (ERPNext), request-changes instead of
// reject (ServiceNow / Procore "Revise & Resubmit"), approver edits with bank
// details locked (Oracle).

function PortalUsersAdmin({ v }) {
  const st = useStore();
  const [nu, setNu] = y.useState({ name: "", email: "" });
  const mut = (fn, action) => setState((s) => fn(byId(s.vendors, v.id)), { entity: "Vendor", id: v.id, action });
  return (
    <Section title="Supplier portal users" icon={Icon.users} actions={<Btn size="sm" icon={Icon.globe} onClick={() => window.open(appUrl("/supplier/login"), "_blank")}>Open portal sign-in</Btn>}>
      <DataTable dense rows={v.portalUsers || []} rowKey={(u) => u.email} empty={<p className="p-4 text-[13px] text-ink-mute">No portal users — the vendor can't sign in.</p>} columns={[
        { key: "name", label: "Name", className: "font-medium" }, { key: "email", label: "E-mail" }, { key: "role", label: "Role" },
        { key: "l", label: "Last sign-in", render: (u) => (u.lastLogin ? fmtDateTime(u.lastLogin) : "Never") },
        { key: "s", label: "Status", render: (u) => <Status tone={u.active ? "green" : "gray"}>{u.active ? "Active" : "Disabled"}</Status> },
        { key: "a", label: "", align: "right", render: (u) => <Btn size="sm" onClick={() => mut((x) => { const p = x.portalUsers.find((q) => q.email === u.email); p.active = !p.active; }, `Portal user ${u.email} ${u.active ? "disabled" : "enabled"}`)}>{u.active ? "Disable" : "Enable"}</Btn> },
      ]} />
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 border-t border-line p-3">
        <TextInput value={nu.name} onChange={(x) => setNu({ ...nu, name: x })} placeholder="Name" />
        <TextInput value={nu.email} onChange={(x) => setNu({ ...nu, email: x })} placeholder="user@vendor.com" />
        <Btn variant="primary" icon={Icon.userPlus} disabled={!nu.name || !EMAIL_RE.test(nu.email) || !!findPortalUser(st, nu.email)} onClick={() => { mut((x) => (x.portalUsers = [...(x.portalUsers || []), { ...nu, email: nu.email.toLowerCase(), active: true, role: "User", lastLogin: null }]), `Portal user added: ${nu.email}`); setNu({ name: "", email: "" }); }}>Add user</Btn>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------- invitations
function InviteVendorModal({ onClose }) {
  const st = useStore();
  const [f, setF] = y.useState({ name: "", email: "", contact: "", category: "", message: "We'd like to add you to our approved vendor list. Please register using the link below — it takes about 10 minutes." });
  const dupe = f.email && (st.vendors.some((v) => v.contact.email.toLowerCase() === f.email.toLowerCase()) || st.invites.some((i) => i.email.toLowerCase() === f.email.toLowerCase() && i.status === "Invited"));
  const [sent, setSent] = y.useState(null);
  if (sent) return <ShareLinkModal title={`Invitation sent to ${sent.name}`} url={appUrl(`/vendor-register?invite=${sent.id}`)} onClose={onClose}
    text={`An e-mail with this personal link was sent to ${sent.email}. The form opens pre-filled with the company name and e-mail; once they submit, the invitation moves to "Registered".`} />;
  return (
    <Modal open onClose={onClose} width={620} title="Invite vendor to register"
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" icon={Icon.send} disabled={!f.name || !EMAIL_RE.test(f.email) || dupe} onClick={() => {
        const id = nextId("INVT", st.invites);
        const inv = { id, name: f.name, email: f.email.toLowerCase(), contact: f.contact, category: f.category, message: f.message, sentOn: todayISO(), status: "Invited", vendorId: null, by: currentUser() };
        setState((s) => s.invites.unshift(inv), { entity: "Invite", id, action: `Invitation e-mailed to ${f.email}` });
        setSent(inv);
      }}>Send invitation</Btn></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Company name" required><TextInput value={f.name} onChange={(x) => setF({ ...f, name: x })} /></Field>
        <Field label="Contact person"><TextInput value={f.contact} onChange={(x) => setF({ ...f, contact: x })} /></Field>
        <Field label="E-mail" required>{<TextInput type="email" value={f.email} onChange={(x) => setF({ ...f, email: x })} />}{dupe && <span className="mt-1 block text-[11px] text-red-600">Already registered or invited</span>}</Field>
        <Field label="Trade / category"><Select value={f.category} placeholder="Any" onChange={(x) => setF({ ...f, category: x })} options={TRADES} /></Field>
        <Field label="Message" span={2}><TextArea rows={3} value={f.message} onChange={(x) => setF({ ...f, message: x })} /></Field>
      </div>
    </Modal>
  );
}

function InvitesTable({ onOpenVendor }) {
  const st = useStore();
  const [share, setShare] = y.useState(null);
  return (
    <>
      <DataTable rows={st.invites} empty={<EmptyState icon={Icon.mail} title="No invitations yet" text="Use “Invite vendor” to send a personal registration link." />} columns={[
        { key: "id", label: "Invite", className: "mono text-[12px]" },
        { key: "name", label: "Company", className: "font-medium" },
        { key: "email", label: "E-mail" },
        { key: "category", label: "Trade", render: (i) => i.category || "—" },
        { key: "sent", label: "Sent", render: (i) => `${fmtDate(i.sentOn)} · ${i.by}` },
        { key: "s", label: "Status", render: (i) => <Status>{i.status}</Status> },
        { key: "a", label: "", align: "right", render: (i) => i.vendorId ? <Btn size="sm" onClick={() => onOpenVendor(i.vendorId)}>Open {i.vendorId}</Btn> : (
          <span className="flex justify-end gap-1">
            <Btn size="sm" icon={Icon.globe} onClick={() => setShare(i)}>Link</Btn>
            <Btn size="sm" icon={Icon.mail} onClick={() => { setState((s) => (byId(s.invites, i.id).sentOn = todayISO()), { entity: "Invite", id: i.id, action: `Reminder sent to ${i.email}` }); toast(`Reminder sent to ${i.email}`); }}>Remind</Btn>
            <Btn size="sm" variant="ghost" onClick={() => setState((s) => (byId(s.invites, i.id).status = "Cancelled"), { entity: "Invite", id: i.id, action: "Cancelled" })}>Cancel</Btn>
          </span>) },
      ]} />
      {share && <ShareLinkModal title={`Registration link — ${share.name}`} url={appUrl(`/vendor-register?invite=${share.id}`)} onClose={() => setShare(null)} text="Personal link; the form opens pre-filled for this company." />}
    </>
  );
}

// ---------------------------------------------------------------- request changes / approver edit
const CHANGE_FIELDS = ["Company / legal name", "GSTIN", "PAN", "Contact details", "Registered address", "Bank details", "Trades / categories", "Contractor statutory details (licence, PF, ESI)"];

function requestChanges(v, cr) {
  setState((s) => {
    const x = byId(s.vendors, v.id);
    const stg = x.approval.stages.find((a) => a.status === "Pending");
    if (stg) Object.assign(stg, { status: "Changes Requested", by: currentUser(), at: new Date().toISOString(), remark: cr.message || cr.items.map((i) => i.label).join(", ") });
    x.status = "Changes Requested";
    x.changeRequest = { ...cr, by: currentUser(), dept: stg?.dept || "Procurement", at: new Date().toISOString(), resolvedAt: null };
    for (const it of cr.items) if (it.doc) { const d = x.docs.find((dd) => dd.name === it.label); if (d && d.status !== "Missing") d.status = "Rejected"; }
  }, { entity: "Vendor", id: v.id, action: `Changes requested — ${cr.items.map((i) => i.label).join(", ")}` });
  toast("Change request e-mailed to the vendor");
}

function RequestChangesModal({ v, onClose }) {
  const docs = requiredDocs(v);
  const [sel, setSel] = y.useState({});
  const [msg, setMsg] = y.useState("");
  const items = Object.entries(sel).filter(([, x]) => x.on).map(([label, x]) => ({ label, note: x.note, doc: docs.includes(label) }));
  const row = (label, hint) => (
    <div key={label} className="grid grid-cols-[260px_1fr] items-center gap-3 py-1">
      <Check checked={!!sel[label]?.on} onChange={(b) => setSel({ ...sel, [label]: { ...(sel[label] || {}), on: b } })} label={<span>{label}{hint && <span className="ml-1 text-[11px] text-ink-mute">{hint}</span>}</span>} />
      {sel[label]?.on && <TextInput value={sel[label].note || ""} onChange={(x) => setSel({ ...sel, [label]: { ...sel[label], note: x } })} placeholder="What exactly needs fixing?" />}
    </div>
  );
  return (
    <Modal open onClose={onClose} width={760} title={`Request changes — ${v.name}`} subtitle="The vendor gets an e-mail listing exactly these items and fixes them in the supplier portal; approvals resume at the same stage"
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" icon={Icon.send} disabled={!items.length} onClick={() => { requestChanges(v, { items, message: msg }); onClose(); }}>Send request ({items.length})</Btn></>}>
      <div className="grid grid-cols-2 gap-6">
        <div><p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-ink-mute">Details</p>{CHANGE_FIELDS.map((fld) => row(fld))}</div>
        <div><p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-ink-mute">Documents</p>{docs.map((d) => { const x = v.docs.find((z) => z.name === d); return row(d, x ? `(${docState(x)})` : "(missing)"); })}</div>
      </div>
      <div className="mt-3"><Field label="Message to vendor"><TextArea rows={2} value={msg} onChange={setMsg} placeholder="Optional overall note" /></Field></div>
    </Modal>
  );
}

function EditRegistrationModal({ v, onClose }) {
  const [f, setF] = y.useState(() => vendorToForm(v));
  const [reason, setReason] = y.useState("");
  return (
    <Modal open onClose={onClose} width={880} title={`Edit registration — ${v.name}`} subtitle="Approvers may correct details during review. Bank details are locked; only the vendor can change them."
      footer={<><Field label=""><TextInput value={reason} onChange={setReason} placeholder="Reason for edit (logged)" /></Field><span className="flex-1" /><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={!reason} onClick={() => {
        setState((s) => applyForm(byId(s.vendors, v.id), f, { lockBank: true }), { entity: "Vendor", id: v.id, action: `Registration edited by approver — ${reason}` });
        toast("Registration updated"); onClose();
      }}>Save changes</Btn></>}>
      <VendorForm f={f} set={setF} errors={{}} lockBank />
    </Modal>
  );
}
