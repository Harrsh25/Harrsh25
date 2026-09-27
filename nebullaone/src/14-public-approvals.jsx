// Public (no-login) vendor pages — self-registration and online quotation —
// plus the Approval Management page, which keeps the original module queues
// and adds vendor / contract approvals.

// Build a link that works for both hash routing (file://) and browser routing
function appUrl(path) {
  if (location.hash.startsWith("#/")) return location.href.split("#")[0] + "#" + path;
  return location.origin + path;
}

// Files are kept as data URLs only when small, so localStorage doesn't overflow
function readAttachment(file) {
  return new Promise((resolve) => {
    if (!file) return resolve(null);
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
  const [f, setF] = y.useState(() => ({ ...emptyVendor(), regTier: "Prospective", tier: "Transactional" }));
  const [errors, setErrors] = y.useState({});
  const [agree, setAgree] = y.useState(false);
  const [done, setDone] = y.useState(null);
  const mustUpload = ["PAN Card", "GST Certificate", "Cancelled Cheque / Bank Letter"];
  const submit = () => {
    const e = validateVendor(f);
    if (getState().vendors.some((v) => v.gstin === f.gstin.toUpperCase())) e.gstin = "This GSTIN is already registered with us — contact procurement.";
    const missing = mustUpload.filter((n) => !(f.uploads[n] && f.uploads[n].file));
    if (missing.length) e.docs = `Please upload: ${missing.join(", ")}`;
    if (!f.bank.account || !f.bank.ifsc) e.bank = "Bank details are required";
    setErrors(e);
    if (Object.keys(e).length) { toast("Please fix the highlighted fields", "red"); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    const id = createVendor({ ...f, tds: f.type === "Goods" ? "194Q" : "194C-2" }, true, "Self-registration");
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
            <Stepper steps={[{ label: "Submitted", status: "done", meta: "Today" }, ...APPROVAL_FLOW.map((d, i) => ({ label: `${d} review`, status: i === 0 ? "current" : "todo" })), { label: "Activated", status: "todo", meta: "Portal login issued" }]} />
          </div>
          <Note>If we need anything else (for example an expired certificate) we'll email you, and you can re-upload it from the supplier portal.</Note>
          <Btn onClick={() => { setDone(null); setF({ ...emptyVendor(), regTier: "Prospective", tier: "Transactional" }); setAgree(false); }}>Register another company</Btn>
        </div>
      </PublicShell>
    );
  }
  return (
    <PublicShell title="Supplier & contractor registration" subtitle="Register your company to receive RFQs, purchase orders and work orders. It takes about 10 minutes — keep your GST, PAN and bank documents handy.">
      <div className="p-6">
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

// ---------------------------------------------------------------- vendor quotation
function VendorQuoteForm({ rfq, vendorId, onDone }) {
  const prev = rfq.quotes.find((q) => q.vendorId === vendorId);
  const [f, setF] = y.useState(() => prev
    ? { rates: prev.rates.map(String), currency: prev.currency || "INR", fx: prev.fx || 1, deliveryDays: prev.deliveryDays, validUntil: prev.validUntil, note: prev.note || "", attachment: prev.attachment || null }
    : { rates: rfq.items.map(() => ""), currency: "INR", fx: 1, deliveryDays: 7, validUntil: shiftDays(30), note: "", attachment: null });
  const [agree, setAgree] = y.useState(false);
  const total = sum(rfq.items, (it, i) => (Number(it.qty) || 0) * (Number(f.rates[i]) || 0));
  const ok = f.rates.every((r) => Number(r) > 0) && Number(f.deliveryDays) > 0 && f.validUntil && agree;
  const submit = () => {
    const vName = vendorName(getState(), vendorId);
    setState((s) => {
      const r = byId(s.rfqs, rfq.id);
      r.quotes = r.quotes.filter((q) => q.vendorId !== vendorId);
      r.quotes.push({ vendorId, rates: f.rates.map(Number), currency: f.currency, fx: Number(f.fx) || 1, deliveryDays: Number(f.deliveryDays), validUntil: f.validUntil, note: f.note, attachment: f.attachment, submittedOn: todayISO(), via: onDone.via || "Vendor link" });
      r.status = "Quotes Received";
      r.negotiation.push({ at: new Date().toISOString(), by: vName, vendorId, text: `${prev ? "Revised" : "Submitted"} quotation online — ${f.currency} ${num(total)}${f.note ? ` · ${f.note}` : ""}` });
    }, { entity: "RFQ", id: rfq.id, action: `Quotation ${prev ? "revised" : "submitted"} by ${vName}` });
    toast(prev ? "Quotation revised" : "Quotation submitted");
    onDone();
  };
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full">
          <thead><tr><Th>#</Th><Th>Item</Th><Th align="right">Quantity</Th><Th align="right">Your rate ({f.currency})</Th><Th align="right">Amount</Th></tr></thead>
          <tbody>
            {rfq.items.map((it, i) => (
              <tr key={i}>
                <Td>{i + 1}</Td><Td className="whitespace-normal">{it.desc}</Td><Td align="right" className="num">{num(it.qty)} {it.unit}</Td>
                <Td align="right"><div className="ml-auto w-36"><NumInput value={f.rates[i]} onChange={(x) => setF({ ...f, rates: f.rates.map((r, j) => (j === i ? x : r)) })} placeholder={`per ${it.unit}`} /></div></Td>
                <Td align="right" className="num">{num((Number(it.qty) || 0) * (Number(f.rates[i]) || 0))}</Td>
              </tr>
            ))}
            <tr className="bg-gray-50"><Td /><Td className="font-semibold">Total (excl. GST)</Td><Td /><Td /><Td align="right" className="num font-semibold">{f.currency} {num(total)}</Td></tr>
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <Field label="Currency"><Select value={f.currency} onChange={(x) => setF({ ...f, currency: x, fx: x === "INR" ? 1 : x === "USD" ? 83.2 : x === "EUR" ? 90.4 : 22.6 })} options={["INR", "USD", "EUR", "AED"]} /></Field>
        <Field label="Delivery lead time (days)" required><NumInput value={f.deliveryDays} onChange={(x) => setF({ ...f, deliveryDays: x })} /></Field>
        <Field label="Quote valid until" required><DateInput value={f.validUntil} onChange={(x) => setF({ ...f, validUntil: x })} /></Field>
        <Field label="Quotation document">
          <label className={cls("flex h-[32px] cursor-pointer items-center gap-2 truncate rounded-md border border-dashed px-2.5 text-[12.5px]", f.attachment ? "border-green-300 bg-green-50 text-green-700" : "border-gray-300 text-ink-soft hover:border-brand hover:text-brand")}>
            <Icon.upload size={13} /><span className="truncate">{f.attachment ? f.attachment.name : "Attach PDF"}</span>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls" className="hidden" onChange={async (e) => { const a = await readAttachment(e.target.files[0]); a && setF((ff) => ({ ...ff, attachment: a })); }} />
          </label>
        </Field>
        <Field label="Terms, exclusions or remarks" span={4}><TextArea rows={2} value={f.note} onChange={(x) => setF({ ...f, note: x })} placeholder="e.g. Ex-works Chakan, freight extra; mill test certificate with each lot" /></Field>
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
        <Check checked={agree} onChange={setAgree} label="Prices are firm for the validity period and exclude GST." />
        <Btn variant="primary" icon={Icon.send} disabled={!ok} onClick={submit}>{prev ? "Submit revised quotation" : "Submit quotation"}</Btn>
      </div>
    </div>
  );
}

function VendorQuotePage() {
  const st = useStore();
  const [, , rfqId, vendorId] = Ht().pathname.split("/");
  const [sent, setSent] = y.useState(false);
  const rfq = byId(st.rfqs, rfqId), v = byId(st.vendors, vendorId);
  const shell = (title, body) => <PublicShell title={title} width={760}><div className="p-6">{body}</div></PublicShell>;
  if (!rfq || !v || !rfq.vendorIds.includes(vendorId)) return shell("Link not valid", <Note tone="red">This quotation link is not valid. Please use the link from the buyer's RFQ email or contact their procurement team.</Note>);
  if (rfq.status === "Draft") return shell("RFQ not open yet", <Note>This request for quotation hasn't been released yet.</Note>);
  if (["Awarded", "Closed"].includes(rfq.status)) return shell(`${rfq.id} is closed`, <Note>This RFQ has been {rfq.status.toLowerCase()}. Thank you for participating.</Note>);
  const overdue = daysUntil(rfq.dueDate) < 0;
  const mine = rfq.quotes.find((q) => q.vendorId === vendorId);
  return (
    <PublicShell width={980} title={`Request for quotation — ${rfq.title}`} subtitle={`${rfq.id} · for ${v.name} · project ${rfq.project}`}>
      <div className="space-y-4 p-6">
        <div className="grid grid-cols-4 gap-3">
          <StatTile tone="blue" label="Lines" value={rfq.items.length} icon={Icon.listChecks} />
          <StatTile tone={overdue ? "red" : "amber"} label="Quotes due" value={fmtDate(rfq.dueDate)} sub={overdue ? "closed" : `${daysUntil(rfq.dueDate)} days left`} icon={Icon.clock} />
          <StatTile tone="purple" label="Sourcing" value={rfq.mode === "Single Vendor" ? "Direct" : "Tender"} icon={Icon.scale} />
          <StatTile tone={mine ? "green" : "cyan"} label="Your response" value={mine ? "Submitted" : "Pending"} sub={mine ? fmtDate(mine.submittedOn) : ""} icon={Icon.send} />
        </div>
        {sent && <Note tone="green" icon={Icon.check}>Thank you — your quotation has been received. You can revise it until {fmtDate(rfq.dueDate)}.</Note>}
        {overdue ? <Note tone="amber">The submission window closed on {fmtDate(rfq.dueDate)}. Contact the buyer if you need an extension.</Note>
          : <VendorQuoteForm key={mine ? mine.submittedOn + (mine.rates || []).join() : "new"} rfq={rfq} vendorId={vendorId} onDone={Object.assign(() => setSent(true), { via: "Vendor link" })} />}
      </div>
    </PublicShell>
  );
}

// ---------------------------------------------------------------- approval management
const NXV_APPROVAL_MODULES = ["Vendor Registration", "RA Bills", "Change Orders", "Labour Rates", "Purchase Orders"];

function decideChangeOrder(contractId, coId, approve) {
  setState((s) => {
    const c = byId(s.contracts, contractId), o = c.changeOrders.find((x) => x.id === coId);
    o.status = approve ? "Approved" : "Rejected";
    if (approve && o.days) c.end = shiftDays(o.days, c.end);
  }, { entity: "Contract", id: contractId, action: `${coId} ${approve ? "approved" : "rejected"}` });
  toast(`${coId} ${approve ? "approved" : "rejected"}`, approve ? "green" : "red");
}

function approvalRows(st, module) {
  if (module === "Vendor Registration")
    return st.vendors.filter((v) => ["Pending Approval", "Rejected"].includes(v.status)).map((v) => {
      const i = v.approval.stages.findIndex((s) => s.status === "Pending" || s.status === "Rejected");
      const stage = v.approval.stages[i];
      return {
        ref: v.id, title: v.name, sub: `${v.type}${v.isContractor ? " · contractor" : ""} · ${v.source === "Self-registration" ? "self-registered" : "internal"}`,
        by: v.source === "Self-registration" ? v.contact.name : "Procurement", date: fmtDate(v.createdAt),
        level: `L${i + 1} / ${v.approval.stages.length} · ${stage?.dept || ""}`, status: v.status === "Rejected" ? "Rejected" : "Pending",
        extra: `${v.docs.filter((d) => d.status !== "Missing").length}/${requiredDocs(v).length} docs`,
        approve: (r) => { approvalAction(v, "Approved", r); toast(`${v.name} — ${stage.dept} approved`); },
        reject: (r) => { approvalAction(v, "Rejected", r); toast("Sent back to vendor", "red"); },
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
      ref: o.id, title: o.desc, sub: `${c.id} · ${vendorName(st, c.vendorId)}${o.days ? ` · +${o.days} days` : ""}`, by: c.owner, date: fmtDate(o.raisedOn),
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
      approve: () => { setState((s) => (byId(s.purchaseOrders, p.id).status = "Issued"), { entity: "PO", id: p.id, action: "Approved & issued" }); toast(`${p.id} approved & issued`); },
      reject: (r) => { setState((s) => (byId(s.purchaseOrders, p.id).status = "Cancelled"), { entity: "PO", id: p.id, action: `Rejected — ${r}` }); toast(`${p.id} rejected`, "red"); },
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
  const isNew = NXV_APPROVAL_MODULES.includes(module);
  const count = (m) => (NXV_APPROVAL_MODULES.includes(m) ? approvalRows(st, m).filter((r) => r.status === "Pending").length : p0.filter((i) => i.module === m && (local[i.ref] || i.status) === "Pending").length);
  const rows = isNew ? approvalRows(st, module)
    : p0.filter((i) => i.module === module).map((i) => ({ ...i, status: local[i.ref] || i.status, approve: () => setLocal({ ...local, [i.ref]: "Approved" }), reject: () => setLocal({ ...local, [i.ref]: "Rejected" }) }));
  const total = [...d0, ...NXV_APPROVAL_MODULES].reduce((n, m) => n + count(m), 0);
  return (
    <Card>
      <PageHeader title="Approval Management" subtitle={`${total} item(s) waiting across all modules`} actions={<>{h(tr)}{h(ve, { value: project, onChange: setProject })}</>} />
      <Toolbar left={<>
        <select value={module} onChange={(e) => setModule(e.target.value)} className="h-[28px] w-[230px] rounded-md border border-line bg-white px-2.5 text-[13px]">
          <option value="">Select module</option>
          <optgroup label="Vendor & contracts">{NXV_APPROVAL_MODULES.map((m) => <option key={m} value={m}>{m} ({count(m)})</option>)}</optgroup>
          <optgroup label="Projects & towers">{d0.map((m) => <option key={m} value={m}>{m} ({count(m)})</option>)}</optgroup>
        </select>
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
          <DataTable rows={rows} rowKey={(r) => r.ref} onRow={(r) => r.open && setOpen(r.open)} columns={[
            { key: "ref", label: "Reference", className: "mono text-[12px]" },
            { key: "title", label: "Title", render: (r) => <span className="flex flex-col"><span className="font-medium">{r.title}</span>{r.sub && <span className="text-[11.5px] text-ink-mute">{r.sub}</span>}</span> },
            ...(isNew ? [{ key: "extra", label: "Details", className: "text-[12px] text-ink-soft" }] : []),
            { key: "by", label: "Submitted By" },
            { key: "date", label: "Date" },
            { key: "level", label: "Level" },
            { key: "status", label: "Status", render: (r) => <Status>{r.status}</Status> },
            { key: "action", label: "Action", render: (r) => (r.status === "Pending" ? (
              <span className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button className="rounded bg-green-600 px-2 py-0.5 text-[12px] text-white hover:bg-green-700" onClick={() => r.approve("")}>Approve</button>
                <button className="rounded border border-red-200 px-2 py-0.5 text-[12px] text-red-600 hover:bg-red-50" onClick={() => (isNew ? setReject(r) : r.reject())}>Reject</button>
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
      {open?.kind === "vendor" && <VendorDrawer vendorId={open.id} initialTab="approval" onClose={() => setOpen(null)} />}
      {open?.kind === "ra" && <RaBillDrawer id={open.id} onClose={() => setOpen(null)} />}
      {open?.kind === "contract" && <ContractDrawer id={open.id} onClose={() => setOpen(null)} />}
      <Toaster />
    </Card>
  );
}
