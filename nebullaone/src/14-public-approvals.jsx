// Public (no-login) vendor pages — self-registration and online quotation —
// plus the Approval Management page, which keeps the original module queues
// and adds vendor / contract approvals.

// Build a link that works for both hash routing (file://) and browser routing
function appUrl(path) {
  if (location.hash.startsWith("#/")) return location.href.split("#")[0] + "#" + path;
  return location.origin + path;
}

// Files are kept as data URLs only when small, so localStorage doesn't overflow
// Every upload dialog goes through here: 5 MB limit and allowed file types
function readAttachment(file, types) {
  return new Promise((resolve) => {
    if (!file) return resolve(null);
    const bad = VX.file(file, types);
    if (bad) { toast(bad, "red"); return resolve(null); }
    if (file.size > 400 * 1024) return resolve({ name: file.name, dataUrl: null, size: file.size });
    const r = new FileReader();
    r.onload = () => resolve({ name: file.name, dataUrl: r.result, size: file.size });
    r.onerror = () => resolve({ name: file.name, dataUrl: null, size: file.size });
    r.readAsDataURL(file);
  });
}

function FileLink({ name, dataUrl }) {
  if (!dataUrl) return <span className="text-[12px] text-brand" title="Stored as a reference only (file over 400 KB)">{name}</span>;
  return <a href={dataUrl} download={name} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-[12px] font-medium text-brand hover:underline">{name}</a>;
}

function ShareLinkModal({ title, url, text, onClose }) {
  const [copied, setCopied] = y.useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); } catch {
      const t = document.getElementById("nxv-share-url"); t && t.select(); try { document.execCommand("copy"); } catch {}
    }
    setCopied(true); toast("Link copied");
  };
  return (
    <Modal open onClose={onClose} width={620} title={title}
      footer={<><Btn onClick={onClose}>Close</Btn><Btn icon={Icon.eye} onClick={() => window.open(url, "_blank")}>Open form</Btn><Btn variant="primary" icon={copied ? Icon.check : Icon.sheet} onClick={copy}>{copied ? "Copied" : "Copy link"}</Btn></>}>
      <p className="mb-3 text-[13px] leading-5 text-ink-soft">{text}</p>
      <input id="nxv-share-url" readOnly value={url} onFocus={(e) => e.target.select()} className={cls(inputCls, "mono text-[12px]")} />
    </Modal>
  );
}

// ---------------------------------------------------------------- public shell
function PublicShell({ title, subtitle, children, width = 920 }) {
  return (
    <div className="min-h-full bg-gradient-to-br from-[#f7f8fc] via-[#eef1fc] to-[#f8f0fc] px-4 py-8">
      <div className="mx-auto" style={{ maxWidth: width }}>
        <div className="mb-5 flex items-center justify-between">
          <Ix />
          <span className="rounded-full border border-line bg-white px-3 py-1 text-[12px] text-ink-soft">Supplier portal</span>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white bg-white shadow-card">
          <div className="border-b border-line px-6 py-4">
            <h1 className="text-[18px] font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1 text-[13px] text-ink-soft">{subtitle}</p>}
          </div>
          {children}
        </div>
        <p className="mt-4 text-center text-[11.5px] text-ink-faint">Your information is shared only with the buyer's procurement, legal and finance teams.</p>
      </div>
      <Toaster />
    </div>
  );
}

// ---------------------------------------------------------------- self-registration
function SelfRegisterPage() {
  const inviteId = new URLSearchParams(Ht().search).get("invite");
  const invite = inviteId && byId(getState().invites, inviteId);
  // An invite linked to a draft (your team started it with Quick register): show that vendor's details and complete the same record
  const draft = invite && invite.status === "Invited" && invite.vendorId && byId(getState().vendors, invite.vendorId);
  const [f, setF] = y.useState(() => draft ? { ...emptyVendor(), ...draft, types: vTypes(draft), contact: { ...emptyVendor().contact, ...draft.contact }, bank: { ...emptyVendor().bank }, uploads: {}, existingId: draft.id, inviteId } : ({ ...emptyVendor(), regTier: "Prospective", tier: "Transactional", ...(invite && invite.status === "Invited" ? { inviteId, name: invite.name, legalName: invite.name, categories: invite.category ? [invite.category] : [], contact: { name: invite.contact || "", email: invite.email, phone: "" } } : {}) }));
  const [errors, setErrors] = y.useState({});
  const [agree, setAgree] = y.useState(false);
  const [done, setDone] = y.useState(null);
  const mustUpload = ["PAN Card", "GST Certificate", "Cancelled Cheque / Bank Letter"];
  const submit = () => {
    const e = validateVendor(f);
    if (getState().vendors.some((v) => v.id !== f.existingId && v.gstin === f.gstin.toUpperCase())) e.gstin = "This GSTIN is already registered with us — contact procurement.";
    const missing = mustUpload.filter((n) => !(f.uploads[n] && f.uploads[n].file));
    if (missing.length) e.docs = `Please upload: ${missing.join(", ")}`;
    if (!f.bank.account || !f.bank.ifsc) e.bank = "Bank details are required";
    setErrors(e);
    if (Object.keys(e).length) { toast("Please fix the highlighted fields", "red"); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    const id = createVendor({ ...f, tds: autoTds(vTypes(f), f.supplierType) }, true, "Self-registration");
    setDone(id);
    window.scrollTo({ top: 0 });
  };
  if (done) {
    const v = byId(getState().vendors, done);
    return (
      <PublicShell title="Registration submitted" subtitle="Thank you — your application is now with our procurement team.">
        <div className="space-y-5 p-6">
          <div className="flex items-center gap-4 rounded-xl border border-green-200 bg-green-50 p-4">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-green-600 text-white"><Icon.check size={22} /></span>
            <div>
              <p className="text-[15px] font-semibold text-green-800">Reference {done}</p>
              <p className="text-[13px] text-green-700">A confirmation has been sent to {v?.contact.email}.</p>
            </div>
          </div>
          <div>
            <p className="mb-3 text-[13px] font-semibold">What happens next</p>
            <Stepper steps={[{ label: "Submitted", status: "done", meta: "Today" }, ...vendorFlowFor(null).map((d, i) => ({ label: `${d} review`, status: i === 0 ? "current" : "todo" })), { label: "Activated", status: "todo", meta: "Portal login issued" }]} />
          </div>
          <Note>If we need anything else we'll e-mail you. Sign in to the <a className="font-medium text-brand" href={appUrl("/supplier/login")}>supplier portal</a> with <b>{v?.contact.email}</b> (one-time code) to track approval and fix anything we ask for.</Note>
          <Btn onClick={() => { setDone(null); setF({ ...emptyVendor(), regTier: "Prospective", tier: "Transactional" }); setAgree(false); }}>Register another company</Btn>
        </div>
      </PublicShell>
    );
  }
  return (
    <PublicShell title="Supplier & contractor registration" subtitle="Register your company to receive RFQs, purchase orders and work orders. It takes about 10 minutes — keep your GST, PAN and bank documents handy.">
      <div className="p-6">
        {invite && invite.status === "Invited" && <div className="mb-4"><Note tone="green" icon={Icon.mail}>You were invited by {invite.by} on {fmtDate(invite.sentOn)}. {invite.message}</Note></div>}
        {invite && invite.status === "Registered" && <div className="mb-4"><Note>This invitation has already been used ({invite.vendorId}). <a className="font-medium text-brand" href={appUrl("/supplier/login")}>Sign in to the supplier portal</a> to check your status.</Note></div>}
        {Object.keys(errors).length > 0 && <div className="mb-4"><Note tone="red">Some details need attention: {Object.values(errors).join(" · ")}</Note></div>}
        <VendorForm f={f} set={setF} errors={errors} publicMode />
        <div className="mt-5 flex items-center justify-between gap-4 border-t border-line pt-4">
          <Check checked={agree} onChange={setAgree} label="I confirm the information and documents provided are true and valid." />
          <Btn variant="primary" icon={Icon.send} disabled={!agree} onClick={submit}>Submit registration</Btn>
        </div>
      </div>
    </PublicShell>
  );
}

// ---------------------------------------------------------------- approval management
const NXV_APPROVAL_MODULES = ["Vendor Registration", "Spend Authorization", "Purchase Orders", "Vendor Invoices", "Contracts", "Change Orders", "RA Bills", "Retention Releases", "Labour Rates"];

function decideChangeOrder(contractId, coId, approve) {
  const c0 = byId(getState().contracts, contractId), o0 = c0 && c0.changeOrders.find((x) => x.id === coId);
  if (!o0 || o0.status !== "Pending") return false;
  if (!tryAct("Project Manager", [o0.raisedBy], "change-order approval")) return false;
  setState((s) => {
    const c = byId(s.contracts, contractId), o = c.changeOrders.find((x) => x.id === coId);
    o.status = approve ? "Approved" : "Rejected";
    o.decidedBy = currentUser(); o.decidedAt = new Date().toISOString();
    if (approve && o.days) c.end = shiftDays(o.days, c.end);
    // CO lines raise the work-order quantity (existing line) or add a new item, so the extra work can be measured and billed
    if (approve) (o.lines || []).forEach((l) => {
      const w = byId(s.workOrders, l.woId);
      if (!w || w.type === "Lump Sum") return;
      const it = l.lineId && w.items.find((i) => i.id === l.lineId);
      if (it) { it.qty = round2(it.qty + Number(l.qty)); it.coQty = round2((it.coQty || 0) + Number(l.qty)); }
      else w.items.push({ id: `${w.id.slice(-3)}-${w.items.length + 1}`, code: l.code || coId, desc: l.desc, unit: l.unit, qty: Number(l.qty), rate: Number(l.rate), fromCo: coId });
    });
  }, { entity: "Contract", id: contractId, action: `${coId} ${approve ? "approved" : "rejected"}` });
  toast(`${coId} ${approve ? "approved" : "rejected"}`, approve ? "green" : "red");
  return true;
}

function approvalRows(st, module) {
  if (module === "Vendor Registration")
    return st.vendors.filter((v) => ["Pending Approval", "Rejected", "Changes Requested"].includes(v.status)).map((v) => {
      const i = v.approval.stages.findIndex((s) => ["Pending", "Rejected", "Changes Requested"].includes(s.status));
      const stage = v.approval.stages[i];
      return {
        ref: v.id, title: v.name, sub: `${typeLabel(v)}${v.isContractor ? " · contractor" : ""} · ${v.source === "Self-registration" ? "self-registered" : "internal"}`,
        by: v.source === "Self-registration" ? v.contact.name : "Procurement", date: fmtDate(v.createdAt),
        level: `L${i + 1} / ${v.approval.stages.length} · ${stage?.dept || ""}`, status: v.status === "Rejected" ? "Rejected" : v.status === "Changes Requested" ? "Changes Requested" : "Pending", vendor: v,
        extra: `${v.docs.filter((d) => d.status !== "Missing").length}/${requiredDocs(v).length} docs`,
        approve: (r) => { if (approvalAction(v, "Approved", r)) toast(`${v.name} — ${stage.dept} approved`); },
        reject: (r) => { if (approvalAction(v, "Rejected", r)) toast("Sent back to vendor", "red"); },
        open: { kind: "vendor", id: v.id },
      };
    });
  if (module === "RA Bills")
    return st.raBills.filter((b) => ["Submitted", "Verified", "Certified"].includes(b.status)).map((b) => {
      const i = RA_FLOW.findIndex((f) => f.status === b.status);
      return {
        ref: b.id, title: `RA-${b.seq} · ${byId(st.workOrders, b.woId).title}`, sub: `${vendorName(st, b.vendorId)} · net ${inr(b.net)}`,
        by: b.history[0].by, date: fmtDate(b.date), level: `L${i + 1} / 3 · ${RA_FLOW[i + 1].label}`, status: "Pending", extra: inrShort(b.gross) + " gross",
        approve: (r) => advanceBill(b, r, st), reject: (r) => rejectBill(b.id, r), open: { kind: "ra", id: b.id },
      };
    });
  if (module === "Change Orders")
    return st.contracts.flatMap((c) => c.changeOrders.filter((o) => o.status === "Pending").map((o) => ({
      ref: o.id, title: o.desc, sub: `${c.id} · ${vendorName(st, c.vendorId)}${o.days ? ` · +${o.days} days` : ""}${(o.lines || []).length ? ` · ${o.lines.length} quantity line(s)` : ""}`, by: o.raisedBy || c.owner, date: fmtDate(o.raisedOn),
      level: "L1 / 1 · Project Manager", status: "Pending", extra: inrShort(o.amount),
      approve: () => decideChangeOrder(c.id, o.id, true), reject: () => decideChangeOrder(c.id, o.id, false), open: { kind: "contract", id: c.id },
    })));
  if (module === "Labour Rates")
    return st.laborRates.filter((r) => r.status === "Pending Approval").map((r) => ({
      ref: r.id, title: `${r.trade} — ${r.region}`, sub: `${inr(r.rate)}/day from ${fmtDate(r.effectiveFrom)}${r.reason ? ` · ${r.reason}` : ""}`, by: "HR / Commercial", date: fmtDate(r.effectiveFrom),
      level: "L1 / 1 · Commercial head", status: "Pending", extra: r.rate < r.minWage ? "below min. wage" : `+${margin(r).toFixed(0)}% over min.`,
      approve: () => approveRate(r, true), reject: () => approveRate(r, false),
    }));
  if (module === "Purchase Orders")
    return st.purchaseOrders.filter((p) => p.status === "Draft").map((p) => ({
      ref: p.id, title: `${vendorName(st, p.vendorId)} — ${p.lines.length} line(s)`, sub: `${p.project}${p.rfqId ? ` · from ${p.rfqId}` : ""}`, by: "Procurement", date: fmtDate(p.date),
      level: "L1 / 1 · Procurement head", status: "Pending", extra: inrShort(poValue(p)),
      approve: (r) => decidePo(p, true, r), reject: (r) => decidePo(p, false, r), note: p.awardNote,
    }));
  if (module === "Spend Authorization")
    return st.vendors.filter((v) => v.tierRequest?.status === "Pending").map((v) => ({
      ref: v.id, title: v.name, sub: `Prospective → Spend Authorized${v.tierRequest.note ? ` · ${v.tierRequest.note}` : ""}`, by: v.tierRequest.by, date: fmtDate(v.tierRequest.at),
      level: "L1 / 1 · Finance Controller", status: "Pending", extra: spendAuthBlockers(v).length ? `${spendAuthBlockers(v).length} check(s) open` : "checks passed",
      approve: (r) => decideSpendAuth(v, true, r), reject: (r) => decideSpendAuth(v, false, r), open: { kind: "vendor", id: v.id },
    }));
  if (module === "Vendor Invoices")
    return st.invoices.filter((i) => i.review === "Pending").map((i) => ({
      ref: i.id, title: `${vendorName(st, i.vendorId)} — ${i.number}`, sub: `Submitted in the portal${i.poId ? ` against ${i.poId}` : ""}`, by: i.submittedBy || "Vendor", date: fmtDate(i.date),
      level: "L1 / 1 · Accounts", status: "Pending", extra: inrShort(invoiceTotals(i).payable),
      approve: (r) => reviewVendorInvoice(i, true, r), reject: (r) => reviewVendorInvoice(i, false, r), open: { kind: "invoice", id: i.id },
    }));
  if (module === "Contracts")
    return st.contracts.filter((c) => c.status === "Pending Approval").map((c) => {
      const i = c.approval.stages.findIndex((x) => x.status === "Pending"), stg = c.approval.stages[i];
      return {
        ref: c.id, title: c.title, sub: `${vendorName(st, c.vendorId)} · ${c.project}${c.rfqId ? ` · from ${c.rfqId}` : ""}`, by: c.submittedBy || c.owner, date: fmtDate(c.submittedAt || c.start),
        level: `L${i + 1} / ${c.approval.stages.length} · ${stg.role}`, status: "Pending", extra: inrShort(c.value),
        approve: (r) => decideContract(c, true, r), reject: (r) => decideContract(c, false, r), open: { kind: "contract", id: c.id },
      };
    });
  if (module === "Retention Releases")
    return st.retentionReleases.filter((r) => r.status === "Due" || r.status === "Pending Approval").map((r) => ({
      ref: r.id, title: `${r.contractId} · ${vendorName(st, byId(st.contracts, r.contractId).vendorId)}`, sub: `${r.type}${r.note ? ` · ${r.note}` : ""}`, by: r.requestedBy || "Commercial", date: fmtDate(r.requestedOn),
      level: "L1 / 1 · Finance Controller", status: "Pending", extra: inrShort(r.amount),
      approve: (x) => decideRelease(r, true, x), reject: (x) => decideRelease(r, false, x), open: { kind: "contract", id: r.contractId },
    }));
  return [];
}

function ApprovalManagementPage() {
  const st = useStore();
  const loc = Ht();
  const [project, setProject] = y.useState();
  const [module, setModule] = y.useState(new URLSearchParams(loc.search).get("module") || "Vendor Registration");
  const [local, setLocal] = y.useState({}); // decisions on the original demo queues
  const [reject, setReject] = y.useState(null);
  const [open, setOpen] = y.useState(null);
  const [rc, setRc] = y.useState(null);
  const isNew = NXV_APPROVAL_MODULES.includes(module);
  const count = (m) => (NXV_APPROVAL_MODULES.includes(m) ? approvalRows(st, m).filter((r) => r.status === "Pending").length : p0.filter((i) => i.module === m && (local[i.ref] || i.status) === "Pending").length);
  const rows = isNew ? approvalRows(st, module)
    : p0.filter((i) => i.module === module).map((i) => ({ ...i, status: local[i.ref] || i.status, approve: () => setLocal({ ...local, [i.ref]: "Approved" }), reject: () => setLocal({ ...local, [i.ref]: "Rejected" }) }));
  const total = [...d0, ...NXV_APPROVAL_MODULES].reduce((n, m) => n + count(m), 0);
  return (
    <Card>
      <PageHeader title="Approval Management" actions={<>{h(tr)}{h(ve, { value: project, onChange: setProject })}</>} />
      <Toolbar left={<>
        <div className="w-[260px]"><Select label="Module" value={module} onChange={setModule} placeholder="Select module" options={[
          { header: true, value: "__h1", label: "Vendor & contracts" }, ...NXV_APPROVAL_MODULES.map((m) => ({ value: m, label: `${m} (${count(m)})` })),
          { header: true, value: "__h2", label: "Projects & towers" }, ...d0.map((m) => ({ value: m, label: `${m} (${count(m)})` }))]} className="h-[28px]" /></div>
        <span className="mx-1 h-5 w-px bg-line" />
        <div className="flex flex-wrap gap-1.5">
          {NXV_APPROVAL_MODULES.filter((m) => count(m) > 0 && m !== module).map((m) => (
            <button key={m} onClick={() => setModule(m)} className="rounded-full border border-line bg-white px-2.5 py-[2px] text-[12px] text-ink-soft hover:border-brand hover:text-brand">{m} <b className="text-brand">{count(m)}</b></button>
          ))}
        </div>
      </>} />
      {!module ? <EmptyState icon={Icon.shieldCheck} title="Select a module" text="Approvals are grouped by the module they come from. Pick one from the selector above to load its queue." />
        : rows.length === 0 ? <EmptyState icon={Icon.folderCheck} title="Nothing to approve" text={`There are no ${module} items waiting in your queue.`} />
        : (
          <DataTable noun="items" rows={rows} rowKey={(r) => r.ref} onRow={(r) => r.open && setOpen(r.open)} columns={[
            { key: "ref", label: "Reference", className: "mono text-[12px]" },
            { key: "title", label: "Title", render: (r) => <span className="flex flex-col"><span className="font-medium">{r.title}</span>{r.sub && <span className="text-[11.5px] text-ink-mute">{r.sub}</span>}</span> },
            ...(isNew ? [{ key: "extra", label: "Details", className: "text-[12px] text-ink-soft" }] : []),
            { key: "by", label: "Submitted By", filterAll: "Anyone", filter: true },
            { key: "date", label: "Date" },
            { key: "level", label: "Level", filter: true },
            { key: "status", label: "Status", filterOptions: FO.approvalStatus, filter: true, render: (r) => <Status>{r.status}</Status> },
            { key: "action", label: "Action", render: (r) => (r.status === "Pending" ? (
              <span className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button className="rounded bg-green-600 px-2 py-0.5 text-[12px] text-white hover:bg-green-700" onClick={() => r.approve("")}>Approve</button>
                <button className="rounded border border-red-200 px-2 py-0.5 text-[12px] text-red-600 hover:bg-red-50" onClick={() => (isNew ? setReject(r) : r.reject())}>Reject</button>
                {r.vendor && <button className="rounded border border-amber-300 px-2 py-0.5 text-[12px] text-amber-800 hover:bg-amber-50" onClick={() => setRc(r.vendor)}>Request changes</button>}
                {r.open && <button className="rounded border border-line px-2 py-0.5 text-[12px] text-ink-soft hover:bg-gray-50" onClick={() => setOpen(r.open)}>Review</button>}
              </span>
            ) : r.open ? <button className="text-[12px] font-medium text-brand" onClick={(e) => { e.stopPropagation(); setOpen(r.open); }}>Open</button> : "—") },
          ]} />
        )}
      {h(qp)}
      {reject && (
        <Modal open onClose={() => setReject(null)} width={480} title={`Reject ${reject.ref}`} subtitle="The reason is sent back to the submitter"
          footer={<><Btn onClick={() => setReject(null)}>Cancel</Btn><Btn variant="danger" disabled={!reject.reason} onClick={() => { reject.reject(reject.reason); setReject(null); }}>Reject</Btn></>}>
          <Field label="Reason" required><TextArea value={reject.reason || ""} onChange={(x) => setReject({ ...reject, reason: x })} placeholder="e.g. GST certificate is not legible — please re-upload" /></Field>
        </Modal>
      )}
      {rc && <RequestChangesModal v={rc} onClose={() => setRc(null)} />}
      {open?.kind === "vendor" && <VendorDrawer vendorId={open.id} initialTab="approval" mode="approval" onClose={() => setOpen(null)} />}
      {open?.kind === "ra" && <RaBillDrawer id={open.id} onClose={() => setOpen(null)} />}
      {open?.kind === "contract" && <ContractDrawer id={open.id} onClose={() => setOpen(null)} />}
      {open?.kind === "invoice" && <InvoiceDrawer id={open.id} onClose={() => setOpen(null)} />}
      <Toaster />
    </Card>
  );
}
