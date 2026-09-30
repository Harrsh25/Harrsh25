// RFQ & quotations — rebuilt after the Odoo / ERPNext review.
// Buyer: create (T&C, Incoterm, required-by per line, BOQ ref), compose & send
// e-mail with preview, print PDF, review quotes (accept / return), compare,
// split-award per line → one PO per vendor.
// Vendor: accept / decline invitation, quote per line (no-bid, discount, lead
// time, line attachment), GST, own quotation no., CSV download / upload.

const INCOTERMS = ["DAP (delivered at site)", "EXW (ex-works)", "FOR destination", "FCA (free carrier)", "CIF", "DDP (delivered duty paid)"];
const GST_RATES = [0, 5, 12, 18, 28];

function vendorRfqBadge(st, vid, what) {
  const g = scorecardGate(st, vid, what);
  if (!g.standing) return null;
  if (g.block) return <Status tone="red">{`${g.standing.name} — blocked`}</Status>;
  if (g.warn) return <Status tone="amber">{`${g.standing.name} standing`}</Status>;
  return null;
}

// RFQ templates: picking one fills the title (if empty) and the full line-item list
const RFQ_TEMPLATES = [
  { name: "Steel supply", days: 14, items: [["TMT Fe500D 8 mm", "MT"], ["TMT Fe500D 10 mm", "MT"], ["TMT Fe500D 12 mm", "MT"], ["TMT Fe500D 16 mm", "MT"], ["TMT Fe500D 20 mm", "MT"], ["TMT Fe500D 25 mm", "MT"], ["TMT Fe500D 32 mm", "MT"], ["Binding wire 18 SWG", "kg"]] },
  { name: "Cement supply", days: 7, items: [["OPC 53 grade cement (50 kg bag)", "bag"], ["OPC 43 grade cement (50 kg bag)", "bag"], ["PPC cement (50 kg bag)", "bag"], ["PSC cement (50 kg bag)", "bag"], ["White cement (40 kg bag)", "bag"], ["Wall putty (40 kg bag)", "bag"]] },
  { name: "Aggregates & sand", days: 7, items: [["Coarse aggregate 20 mm", "cum"], ["Coarse aggregate 10 mm", "cum"], ["Manufactured sand (M-sand) — concrete", "cum"], ["Plaster sand (P-sand)", "cum"], ["Granular sub-base (GSB)", "cum"], ["Wet mix macadam (WMM)", "cum"]] },
  { name: "Ready-mix concrete", days: 5, items: [["RMC M20 grade", "cum"], ["RMC M25 grade", "cum"], ["RMC M30 grade", "cum"], ["RMC M35 grade", "cum"], ["RMC M40 grade", "cum"], ["Concrete pumping charges (boom / line)", "cum"]] },
  { name: "Blocks & bricks", days: 10, items: [["AAC block 600×200×100 mm", "cum"], ["AAC block 600×200×150 mm", "cum"], ["AAC block 600×200×200 mm", "cum"], ["Red clay bricks (first class)", "nos"], ["Fly ash bricks", "nos"], ["Block jointing adhesive (40 kg)", "bag"]] },
  { name: "Hardware", days: 7, items: [["Anchor fasteners M12", "nos"], ["Chemical anchors M16", "nos"], ["Nails assorted", "kg"], ["MS binding wire", "kg"], ["Cutting discs 4\"", "nos"], ["Grinding discs 4\"", "nos"], ["Welding electrodes 3.15 mm", "pkt"], ["PVC cover blocks 25 mm", "nos"]] },
  { name: "Electrical materials", days: 14, items: [["FR copper wire 1.5 sq mm (90 m coil)", "coil"], ["FR copper wire 2.5 sq mm (90 m coil)", "coil"], ["FR copper wire 4 sq mm (90 m coil)", "coil"], ["Armoured cable 4C × 25 sq mm Al", "m"], ["PVC conduit 25 mm", "nos"], ["MCB SP 16 A", "nos"], ["8-way SPN distribution board", "nos"], ["LED panel 2×2 36 W", "nos"], ["Modular switches & sockets", "nos"]] },
  { name: "Plumbing & sanitary", days: 14, items: [["CPVC pipe 25 mm (3 m)", "nos"], ["CPVC pipe 20 mm (3 m)", "nos"], ["CPVC fittings assorted", "lot"], ["UPVC pipe 110 mm SWR", "m"], ["UPVC pipe 75 mm SWR", "m"], ["Ball valve 25 mm", "nos"], ["Floor trap 100 mm", "nos"], ["EWC with seat cover", "nos"], ["Wash basin with pedestal", "nos"]] },
  { name: "Waterproofing & chemicals", days: 10, items: [["Integral waterproofing compound", "kg"], ["Polymer-modified cementitious coating", "kg"], ["APP membrane 3 mm", "sqm"], ["Crystalline waterproofing slurry", "kg"], ["PU sealant (600 ml)", "nos"], ["Concrete admixture (superplasticiser)", "ltr"], ["Curing compound", "ltr"]] },
  { name: "Formwork & shuttering", days: 10, items: [["Shuttering plywood 12 mm (8×4)", "nos"], ["Film-faced plywood 18 mm (8×4)", "nos"], ["Telescopic props 3.2 m", "nos"], ["MS channel 75 mm", "m"], ["H-frame scaffolding set", "set"], ["Tie rods & wing nuts", "set"], ["Shuttering oil", "ltr"]] },
  { name: "Labour — item rate", days: 21, items: [["Earthwork excavation in soil up to 3 m", "cum"], ["PCC M15 in foundations", "cum"], ["RCC M25 in columns, beams & slabs (labour)", "cum"], ["Reinforcement — cut, bend & place", "MT"], ["Shuttering for slabs & beams", "sqm"], ["Brick / block masonry 230 mm", "cum"], ["Internal plaster 12 mm", "sqm"], ["External plaster 20 mm", "sqm"]] },
  { name: "Equipment hire", days: 3, items: [["Backhoe loader (JCB 3DX) with operator", "hr"], ["Hydra crane 14 T", "day"], ["Transit mixer 6 cum", "trip"], ["Concrete pump (stationary)", "day"], ["DG set 125 kVA with fuel", "day"], ["Tower crane (monthly hire)", "month"], ["Tipper 10 cum", "trip"]] },
  { name: "Safety & PPE", days: 7, items: [["Safety helmet with chin strap", "nos"], ["Safety shoes (steel toe)", "pair"], ["Full-body harness with lanyard", "nos"], ["Reflective safety jacket", "nos"], ["Cotton hand gloves", "pair"], ["Safety goggles", "nos"], ["Safety net 3×6 m", "nos"], ["Barricading tape (300 m)", "roll"]] },
];
const templateItems = (name) => { const t = RFQ_TEMPLATES.find((x) => x.name === name); return t && t.items.map(([desc, unit]) => ({ desc, unit, qty: "", requiredBy: shiftDays(t.days) })); };

// ---------------------------------------------------------------- create RFQ
function NewRfqModal({ open, onClose, onCreated, preset }) {
  const st = useStore();
  const blank = () => ({ questions: [], ranking: "Hidden", multiResponse: true, attachments: [], details: docDefaults("rfq", st), requisitionId: "", ...(preset || {}), title: preset?.title || "", project: preset?.project || PROJECTS[0], mode: "Multiple Vendors", template: "", sourceRef: "", dueDate: shiftDays(7), incoterm: INCOTERMS[0],
    tnc: "Prices firm for the validity period. Delivery to site, unloading by vendor. Payment as per agreed terms after GRN and bill.",
    items: [{ desc: "", unit: "nos", qty: "", requiredBy: shiftDays(14) }], vendorIds: [], weights: { price: 60, quality: 25, delivery: 15 }, ...(preset || {}) });
  const [f, setF] = y.useState(blank);
  y.useEffect(() => { if (open) setF(blank()); }, [open]);
  const vendors = st.vendors.filter(eligibleForRfq);
  const setItem = (i, k, v) => setF({ ...f, items: f.items.map((x, j) => (j === i ? { ...x, [k]: v } : x)) });
  // lines left without a quantity are skipped, so a template can be trimmed just by leaving qty empty
  const lines = f.items.filter((i) => i.desc && Number(i.qty) > 0);
  const wsum = Number(f.weights.price || 0) + Number(f.weights.quality || 0) + Number(f.weights.delivery || 0);
  const errs = [
    !f.title.trim() && "Title required",
    (VX.req(f.dueDate, "Quotes due date required") || (f.dueDate <= todayISO() ? "Quotes due date must be in the future" : "")),
    ["price", "quality", "delivery"].some((k) => VX.pct(f.weights[k])) ? "Each weight must be 0–100" : wsum !== 100 ? `Weights total ${wsum}% — must be 100%` : "",
    !lines.length && "Add at least one line with a quantity",
    ...f.items.map((it, i) => (!it.desc && !it.qty ? "" : !String(it.desc).trim() ? `Line ${i + 1}: description required` : !String(it.unit || "").trim() ? `Line ${i + 1}: unit required` : it.qty !== "" && Number(it.qty) < 0 ? `Line ${i + 1}: quantity can't be negative` : Number(it.qty) > 0 && !it.requiredBy ? `Line ${i + 1}: required-by date missing` : Number(it.qty) > 0 && it.requiredBy < f.dueDate ? `Line ${i + 1}: required by ${fmtDate(it.requiredBy)} is before quotes are due` : "")),
    f.mode === "Single Vendor" ? (f.vendorIds.length !== 1 && "Pick exactly one vendor") : f.vendorIds.length < 2 && "Invite at least two vendors",
    ...(f.questions || []).map((q, i) => (!String(q.text || "").trim() ? `Question ${i + 1}: enter the question` : q.type === "Choice" && !String(q.options || "").trim() ? `Question ${i + 1}: list the choices` : "")),
    ...Object.values(docDetailErrors("rfq", f.details || {})),
  ].filter(Boolean);
  const ok = errs.length === 0;
  const save = () => {
    const id = nextId("RFQ", st.rfqs);
    setState((s) => { if (f.requisitionId) { const q = (s.requisitions || []).find((x) => x.id === f.requisitionId); if (q) q.rfqIds = [...(q.rfqIds || []), id]; } s.rfqs.unshift({ ...f, id, status: "Draft", createdOn: todayISO(), createdAt: new Date().toISOString(), quotes: [], negotiation: [], awards: [], emails: [], awardedTo: null,
      responses: Object.fromEntries(f.vendorIds.map((v) => [v, { status: "Not sent" }])), items: lines.map((i) => ({ ...i, qty: Number(i.qty) })) }); },
      { entity: "RFQ", id, action: `Created${f.requisitionId ? ` from ${f.requisitionId}` : ""}` });
    toast(`${id} created — compose the e-mail to send it`);
    onClose(); onCreated && onCreated(id, true);
  };
  const toggleVendor = (v) => {
    const g = scorecardGate(st, v.id, "rfq");
    if (g.block) return toast(`${v.name} is in "${g.standing.name}" standing — RFQs are prevented`, "red");
    const sg = sourcingGate(st, v, "rfq");
    if (sg.block && !f.vendorIds.includes(v.id)) return toast(`${v.name} can't be invited — ${sg.issues.join("; ")}`, "red");
    if (sg.warn && !f.vendorIds.includes(v.id)) toast(`Check before inviting ${v.name}: ${sg.issues.join("; ")}`, "amber");
    let ids = f.vendorIds.includes(v.id) ? f.vendorIds.filter((x) => x !== v.id) : [...f.vendorIds, v.id];
    if (f.mode === "Single Vendor") ids = ids.slice(-1);
    setF({ ...f, vendorIds: ids });
  };
  return (
    <Modal open={open} onClose={onClose} width={900} title="New request for quotation"
      footer={<><span className="mr-auto max-w-[520px] truncate text-[12px] text-red-600" title={errs.join("\n")}>{errs[0] || ""}{errs.length > 1 ? ` (+${errs.length - 1} more)` : ""}</span><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={!ok} onClick={save}>Save & compose e-mail</Btn></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Title" required span={2}><TextInput value={f.title} onChange={(x) => setF({ ...f, title: x })} placeholder="e.g. TMT steel Fe500D — 120 MT" /></Field>
          <Field label="Template" hint={f.template ? `${f.items.length} line items loaded — edit or remove as needed` : "Loads a ready list of line items"}><Select value={f.template} placeholder="Blank" onChange={(x) => setF({ ...f, template: x, title: f.title || (x ? `${x} — ${f.project}` : ""), items: templateItems(x) || [{ desc: "", unit: "nos", qty: "", requiredBy: shiftDays(14) }] })} options={RFQ_TEMPLATES.map((t) => ({ value: t.name, label: `${t.name} (${t.items.length} items)` }))} /></Field>
          <Field label="Project"><Select value={f.project} onChange={(x) => setF({ ...f, project: x })} options={PROJECTS} /></Field>
          <Field label="Source (BOQ / material request)"><TextInput value={f.sourceRef} onChange={(x) => setF({ ...f, sourceRef: x })} placeholder="e.g. BOQ-2026-002 · Structural steel" /></Field>
          <Field label="Sourcing mode"><Select value={f.mode} onChange={(x) => setF({ ...f, mode: x, vendorIds: x === "Single Vendor" ? f.vendorIds.slice(0, 1) : f.vendorIds })} options={["Multiple Vendors", "Single Vendor"]} /></Field>
          <Field label="Quotes due (order deadline)"><DateInput value={f.dueDate} onChange={(x) => setF({ ...f, dueDate: x })} /></Field>
          <Field label="Incoterm"><Select value={f.incoterm} onChange={(x) => setF({ ...f, incoterm: x })} options={INCOTERMS} /></Field>
        </div>
        <Section title={`Line items — ${lines.length} of ${f.items.length} with quantity`} actions={<Btn size="sm" icon={Icon.plus} onClick={() => setF({ ...f, items: [...f.items, { desc: "", unit: "nos", qty: "", requiredBy: shiftDays(14) }] })}>Add line</Btn>}>
          <div className="space-y-2 p-3">
            <div className="grid grid-cols-[1fr_90px_110px_150px_28px] gap-2 text-[11.5px] font-medium text-ink-mute"><span>Description</span><span>Unit</span><span>Quantity</span><span>Required by</span><span /></div>
            {f.items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_90px_110px_150px_28px] gap-2">
                <TextInput value={it.desc} onChange={(x) => setItem(i, "desc", x)} placeholder="Description" />
                <TextInput value={it.unit} onChange={(x) => setItem(i, "unit", x)} />
                <NumInput value={it.qty} onChange={(x) => setItem(i, "qty", x)} />
                <DateInput value={it.requiredBy} onChange={(x) => setItem(i, "requiredBy", x)} />
                <IconBtn icon={Icon.trash} title="Remove line" onClick={() => f.items.length > 1 && setF({ ...f, items: f.items.filter((_, j) => j !== i) })} />
              </div>
            ))}
          </div>
        </Section>
        <Field label={f.mode === "Single Vendor" ? "Vendor (exactly one)" : "Invite vendors (at least two)"} hint="Scorecard standing is shown; vendors in a 'prevent RFQ' standing can't be invited">
          <div className="flex flex-wrap gap-1.5">
            {vendors.map((v) => {
              const on = f.vendorIds.includes(v.id), g0 = scorecardGate(st, v.id, "rfq"), sg = sourcingGate(st, v, "rfq");
              const g = { ...g0, block: g0.block || sg.block, warn: g0.warn || sg.warn };
              const tip = [g0.standing ? `Standing: ${g0.standing.name}` : "", ...sg.issues].filter(Boolean).join("\n");
              return (
                <button key={v.id} type="button" onClick={() => toggleVendor(v)} data-tip={tip || undefined}
                  className={cls("flex items-center gap-1 rounded-full border px-2.5 py-[3px] text-[12px]", g.block ? "cursor-not-allowed border-red-200 bg-red-50 text-red-400 line-through" : on ? "border-brand bg-brand-soft font-medium text-brand" : g.warn ? "border-amber-300 bg-amber-50 text-amber-800" : "border-line bg-white text-ink-soft hover:bg-gray-50")}>
                  {v.name}{g.warn && !g.block && <Icon.warning size={11} />}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Terms & conditions (sent to vendors)"><TextArea rows={2} value={f.tnc} onChange={(x) => setF({ ...f, tnc: x })} /></Field>
        <RfqExtras f={f} setF={setF} />
        <div className="grid grid-cols-3 gap-3">
          {["price", "quality", "delivery"].map((k) => <Field key={k} label={`Weight — ${k} (%)`}><NumInput value={f.weights[k]} onChange={(x) => setF({ ...f, weights: { ...f.weights, [k]: x } })} /></Field>)}
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- e-mail compose & PDF
const rfqEmailBody = (rfq, v) =>
  `Dear ${v.contact.name},\n\nWe invite ${v.name} to quote for "${rfq.title}" (${rfq.id}) for project ${rfq.project}.\n\nPlease sign in to our supplier portal with this e-mail address, accept the invitation and submit your quotation by ${fmtDate(rfq.dueDate)}. You may quote for some lines only and attach your own quotation.\n\nIncoterm: ${rfq.incoterm}\nTerms: ${rfq.tnc}\n\nRegards,\n${currentUser()}\nProcurement`;

function SendRfqModal({ rfq, onClose, resendTo }) {
  const st = useStore();
  const targets = resendTo ? [resendTo] : rfq.vendorIds;
  const [subject, setSubject] = y.useState(`Request for Quotation ${rfq.id} — ${rfq.title}`);
  const [custom, setCustom] = y.useState(null); // null = use per-vendor template
  const [attachPdf, setAttachPdf] = y.useState(true);
  const [attachFiles, setAttachFiles] = y.useState((rfq.attachments || []).length > 0);
  const tpls = settingsOf(st).emailTemplates.filter((t) => /rfq/i.test(t.name));
  const useTpl = (name) => { const t = tpls.find((x) => x.name === name); if (!t) return; const v0 = byId(st.vendors, targets[0]); const fill = (x) => x.replace(/\{rfq\}/g, rfq.id).replace(/\{vendor\}/g, v0.contact.name).replace(/\{due\}/g, fmtDate(rfq.dueDate)); setSubject(fill(t.subject)); setCustom(fill(t.body)); };
  const [preview, setPreview] = y.useState(targets[0]);
  const pv = byId(st.vendors, preview);
  const body = (v) => (custom ?? rfqEmailBody(rfq, byId(st.vendors, targets[0]))).replace(byId(st.vendors, targets[0]).contact.name, v.contact.name).replace(byId(st.vendors, targets[0]).name, v.name);
  const send = () => {
    setState((s) => {
      const r = byId(s.rfqs, rfq.id);
      r.status = r.status === "Draft" ? "Sent" : r.status;
      r.sentOn = r.sentOn || todayISO();
      for (const vid of targets) {
        const v = byId(s.vendors, vid);
        r.emails = r.emails || [];
        r.emails.push({ to: vid, email: v.contact.email, from: settingsOf(s).rfqSenderEmail, subject, body: body(v), link: appUrl(`/vendor-quote/${rfq.id}/${vid}`), pdf: attachPdf, files: attachFiles ? (rfq.attachments || []).map((a) => a.name) : [], at: new Date().toISOString() });
        r.responses = r.responses || {};
        if (!r.responses[vid] || r.responses[vid].status === "Not sent") r.responses[vid] = { status: "Invited", at: new Date().toISOString() };
      }
    }, { entity: "RFQ", id: rfq.id, action: `${resendTo ? "Reminder" : "Invitation"} e-mailed to ${targets.length} vendor(s)` });
    toast(`E-mail sent to ${targets.length} vendor(s)`);
    onClose();
  };
  return (
    <Modal open onClose={onClose} width={900} title={resendTo ? "Send reminder" : "Send RFQ by e-mail"} subtitle="Each vendor gets a personal link; they sign in with a one-time code sent to their registered e-mail"
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" icon={Icon.send} onClick={send}>Send to {targets.length} vendor(s)</Btn></>}>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
        <div className="space-y-3">
          <Field label="To">
            <div className="flex flex-wrap gap-1.5">{targets.map((vid) => { const v = byId(st.vendors, vid); return <span key={vid} className="rounded-full bg-gray-100 px-2 py-[2px] text-[12px]">{v.name} &lt;{v.contact.email}&gt;</span>; })}</div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="From (fixed outgoing account)"><TextInput value={settingsOf(st).rfqSenderEmail} disabled /></Field>
            <Field label="E-mail template"><Select value="" placeholder="Choose…" onChange={useTpl} options={tpls.map((t) => t.name)} /></Field>
          </div>
          <Field label="Subject"><TextInput value={subject} onChange={setSubject} /></Field>
          <Field label="Message" hint="Vendor name is personalised for each recipient"><TextArea rows={12} value={custom ?? rfqEmailBody(rfq, byId(st.vendors, targets[0]))} onChange={setCustom} /></Field>
          <Check checked={attachPdf} onChange={setAttachPdf} label="Attach RFQ as PDF" />
          <Check checked={attachFiles} onChange={setAttachFiles} label={`Send attached files (${(rfq.attachments || []).length})`} />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between"><span className="text-[12px] font-medium text-ink-soft">Preview</span>
            <div className="w-[220px]"><Select label="Preview as" value={preview} onChange={setPreview} options={targets.map((vid) => ({ value: vid, label: vendorName(st, vid) }))} className="h-[28px]" /></div></div>
          <div className="rounded-lg border border-line bg-gray-50 p-3 text-[12.5px]">
            <p><b>To:</b> {pv.contact.email}</p><p><b>Subject:</b> {subject}</p>
            <hr className="my-2 border-line" />
            <pre className="whitespace-pre-wrap font-sans text-ink">{body(pv)}</pre>
            <div className="mt-3 rounded-md bg-brand px-3 py-2 text-center text-[12.5px] font-semibold text-white">Open RFQ & submit quotation</div>
            <p className="mt-1 break-all text-[10.5px] text-ink-mute">{appUrl(`/vendor-quote/${rfq.id}/${preview}`)}</p>
            {attachPdf && <p className="mt-2 flex items-center gap-1 text-[12px] text-ink-soft"><Icon.file size={13} /> {rfq.id}.pdf</p>}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function printRfq(rfq, vendor) {
  const w = window.open("", "_blank");
  if (!w) return toast("Allow pop-ups to print the RFQ", "red");
  const esc = (x) => String(x ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${rfq.id}</title><style>
    body{font:13px/1.45 Inter,system-ui,sans-serif;color:#111;margin:32px}h1{font-size:20px;margin:0}table{width:100%;border-collapse:collapse;margin-top:14px}
    th,td{border:1px solid #d1d5db;padding:6px 8px;text-align:left}th{background:#f3f4f6}.r{text-align:right}.muted{color:#6b7280}.grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;margin-top:12px}</style></head><body>
    <h1>Request for Quotation — ${esc(rfq.id)}</h1><p class="muted">${esc(rfq.title)}</p>
    <div class="grid"><div><b>Project:</b> ${esc(rfq.project)}</div><div><b>Quotes due:</b> ${esc(fmtDate(rfq.dueDate))}</div>
    <div><b>Incoterm:</b> ${esc(rfq.incoterm)}</div><div><b>Reference:</b> ${esc(rfq.sourceRef || "—")}</div>
    ${vendor ? `<div><b>To:</b> ${esc(vendor.name)}</div>` : ""}<div><b>Issued:</b> ${esc(fmtDate(rfq.sentOn || rfq.createdOn))}</div></div>
    <table><thead><tr><th>#</th><th>Description</th><th class="r">Quantity</th><th>Unit</th><th>Required by</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead><tbody>
    ${rfq.items.map((it, i) => `<tr><td>${i + 1}</td><td>${esc(it.desc)}</td><td class="r">${esc(num(it.qty))}</td><td>${esc(it.unit)}</td><td>${esc(fmtDate(it.requiredBy))}</td><td></td><td></td></tr>`).join("")}
    </tbody></table><p><b>Terms & conditions</b><br>${esc(rfq.tnc)}</p><p class="muted">Generated from NebullaOne</p>
    <script>setTimeout(()=>print(),300)<\/script></body></html>`);
  w.document.close();
}

// ---------------------------------------------------------------- quotation form (vendor & buyer)
function csvDownload(rfq, q) {
  const rows = [["Line", "Description", "Unit", "Quantity", "Rate", "Discount %", "Lead days", "No bid (Y/N)"],
    ...rfq.items.map((it, i) => [i + 1, it.desc, it.unit, it.qty, q?.rates?.[i] ?? "", q?.discounts?.[i] ?? 0, q?.leadDays?.[i] ?? "", q?.noBid?.[i] ? "Y" : "N"])];
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `${rfq.id}-quotation.csv`;
  document.body.appendChild(a); a.click(); a.remove();
}
function parseCsv(text) {
  const out = [];
  for (const line of text.split(/\r?\n/).filter((l) => l.trim())) {
    const cells = []; let cur = "", q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q && c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = !q;
      else if (c === "," && !q) { cells.push(cur); cur = ""; }
      else cur += c;
    }
    cells.push(cur); out.push(cells);
  }
  return out;
}

function QuoteForm({ rfq, vendorId, mode = "vendor", onDone }) {
  const prev = rfq.quotes.find((q) => q.vendorId === vendorId);
  const n = rfq.items.length;
  const init = () => ({
    quoteNo: prev?.quoteNo || "", currency: prev?.currency || "INR", fx: prev?.fx || 1, gstPct: prev?.gstPct ?? 18,
    rates: prev ? prev.rates.map((r) => (r == null ? "" : String(r))) : Array(n).fill(""),
    noBid: prev?.noBid ? [...prev.noBid] : Array(n).fill(false), discounts: prev?.discounts ? [...prev.discounts] : Array(n).fill(0),
    leadDays: prev?.leadDays ? [...prev.leadDays] : Array(n).fill(prev?.deliveryDays || 7), lineFiles: prev?.lineFiles ? [...prev.lineFiles] : Array(n).fill(null),
    validUntil: prev?.validUntil || shiftDays(30), note: prev?.note || "", attachment: prev?.attachment || null,
    answers: prev?.answers ? { ...prev.answers } : {}, details: prev?.details ? { ...prev.details } : docDefaults("quote", getState(), byId(getState().vendors, vendorId)),
  });
  const [f, setF] = y.useState(init);
  y.useEffect(() => setF(init()), [vendorId]);
  const [agree, setAgree] = y.useState(mode === "buyer");
  const set = (k, i, v) => setF((ff) => ({ ...ff, [k]: ff[k].map((x, j) => (j === i ? v : x)) }));
  const net = (i) => (f.noBid[i] || f.rates[i] === "" ? 0 : Number(f.rates[i]) * (1 - (Number(f.discounts[i]) || 0) / 100));
  const taxable = sum(rfq.items, (it, i) => it.qty * net(i));
  const priced = rfq.items.filter((_, i) => !f.noBid[i] && Number(f.rates[i]) > 0).length;
  const qErr = [
    ...rfq.items.map((_, i) => f.noBid[i] ? "" : !(Number(f.rates[i]) > 0) ? `Line ${i + 1}: rate must be greater than 0` : VX.pct(f.discounts[i]) ? `Line ${i + 1}: discount must be 0–100%` : VX.num(f.leadDays[i], { min: 0, max: 365, int: true }) ? `Line ${i + 1}: lead days must be a whole number 0–365` : ""),
    !f.validUntil ? "Validity date required" : f.validUntil < todayISO() ? "Validity date is in the past" : f.validUntil < rfq.dueDate ? `Must be valid at least until the RFQ closes (${fmtDate(rfq.dueDate)})` : "",
    f.currency !== "INR" && !(Number(f.fx) > 0) ? "Enter the exchange rate" : "",
    rfqAnswerErr(rfq, f.answers),
    ...Object.values(docDetailErrors("quote", f.details || {})),
    mode === "vendor" && prev && rfq.multiResponse === false ? "This RFQ accepts one response only — contact the buyer to revise" : "",
  ].filter(Boolean);
  const ok = priced > 0 && !qErr.length && agree;
  const upload = async (file) => {
    if (!file) return;
    const rows = parseCsv(await file.text()).slice(1);
    setF((ff) => {
      const g = { ...ff, rates: [...ff.rates], discounts: [...ff.discounts], leadDays: [...ff.leadDays], noBid: [...ff.noBid] };
      for (const r of rows) {
        const i = Number(r[0]) - 1;
        if (i < 0 || i >= n) continue;
        g.rates[i] = r[4] ?? ""; g.discounts[i] = Number(r[5]) || 0; g.leadDays[i] = Number(r[6]) || g.leadDays[i]; g.noBid[i] = /^y/i.test(r[7] || "");
      }
      return g;
    });
    toast(`Loaded ${rows.length} line(s) from ${file.name}`);
  };
  const submit = () => {
    const vName = vendorName(getState(), vendorId);
    const quote = {
      vendorId, quoteNo: f.quoteNo, currency: f.currency, fx: Number(f.fx) || 1, gstPct: Number(f.gstPct),
      rates: f.rates.map((r, i) => (f.noBid[i] || r === "" ? null : Number(r))), noBid: f.noBid, discounts: f.discounts.map(Number), leadDays: f.leadDays.map(Number), lineFiles: f.lineFiles,
      deliveryDays: Math.max(...f.leadDays.filter((_, i) => !f.noBid[i]).map(Number)), validUntil: f.validUntil, note: f.note, attachment: f.attachment, answers: f.answers, details: f.details,
      submittedOn: todayISO(), via: mode === "buyer" ? "Recorded by buyer" : "Vendor portal", review: mode === "buyer" ? "Accepted" : "Under review",
    };
    setState((s) => {
      const r = byId(s.rfqs, rfq.id);
      r.quotes = r.quotes.filter((q) => q.vendorId !== vendorId);
      r.quotes.push(quote);
      r.status = r.status === "Sent" ? "Quotes Received" : r.status;
      r.responses = r.responses || {};
      r.responses[vendorId] = { status: "Quoted", at: new Date().toISOString() };
      r.negotiation.push({ at: new Date().toISOString(), by: mode === "buyer" ? currentUser() : vName, vendorId, text: `${prev ? "Revised" : "Submitted"} quotation${f.quoteNo ? ` ${f.quoteNo}` : ""} — ${priced}/${n} lines, ${f.currency} ${num(taxable)} + GST ${f.gstPct}%` });
    }, { entity: "RFQ", id: rfq.id, action: `Quotation ${prev ? "revised" : "submitted"} by ${vName}${mode === "buyer" ? " (recorded by buyer)" : ""}` });
    toast(prev ? "Quotation revised" : "Quotation submitted");
    onDone && onDone();
  };
  return (
    <div className="space-y-4">
      {prev && mode === "vendor" && (rfq.ranking || "Hidden") !== "Hidden" && (() => { const all = rfq.quotes.map((q) => ({ v: q.vendorId, t: quoteTotal(rfq, q) })).sort((a, b) => a.t - b.t); const i = all.findIndex((x) => x.v === vendorId);
        return i >= 0 ? <Note icon={Icon.trending}>Your current rank: <b>{i + 1} of {all.length}</b>{rfq.ranking === "Show rank and best price" ? <> · best price {inrShort(all[0].t)}</> : null}</Note> : null; })()}
      {prev?.review === "Returned" && mode === "vendor" && <Note tone="amber">The buyer returned your quotation: <b>{prev.returnReason}</b>. Please revise and resubmit.</Note>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[12.5px] text-ink-soft">Price the lines you can supply — tick <b>No bid</b> for the rest.</span>
        <span className="flex gap-2">
          <Btn size="sm" icon={Icon.download} onClick={() => csvDownload(rfq, { ...f, rates: f.rates })}>Download sheet (CSV)</Btn>
          <label className="inline-flex h-[26px] cursor-pointer items-center gap-1.5 rounded-md border border-line bg-white px-2 text-[12px] font-medium hover:bg-gray-50">
            <Icon.upload size={13} /> Upload filled sheet<input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => upload(e.target.files[0])} />
          </label>
        </span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full">
          <thead><tr><Th>#</Th><Th>Item</Th><Th align="right">Qty</Th><Th>Needed by</Th><Th align="right">Rate ({f.currency})</Th><Th align="right">Disc %</Th><Th align="right">Lead days</Th><Th align="right">Amount</Th><Th>File</Th><Th>No bid</Th></tr></thead>
          <tbody>
            {rfq.items.map((it, i) => (
              <tr key={i} className={cls(f.noBid[i] && "bg-gray-50 text-ink-mute")}>
                <Td>{i + 1}</Td><Td className="whitespace-normal">{it.desc}</Td><Td align="right" className="num">{num(it.qty)} {it.unit}</Td><Td className="text-[12px]">{fmtDate(it.requiredBy)}</Td>
                <Td align="right"><div className="ml-auto w-28"><NumInput value={f.rates[i]} disabled={f.noBid[i]} onChange={(x) => set("rates", i, x)} /></div></Td>
                <Td align="right"><div className="ml-auto w-16"><NumInput value={f.discounts[i]} disabled={f.noBid[i]} onChange={(x) => set("discounts", i, x)} /></div></Td>
                <Td align="right"><div className="ml-auto w-16"><NumInput value={f.leadDays[i]} disabled={f.noBid[i]} onChange={(x) => set("leadDays", i, x)} /></div></Td>
                <Td align="right" className="num">{f.noBid[i] ? "—" : num(it.qty * net(i))}</Td>
                <Td>
                  <label title={f.lineFiles[i]?.name || "Attach datasheet / test certificate"} className={cls("grid h-7 w-7 cursor-pointer place-items-center rounded-md border", f.lineFiles[i] ? "border-green-300 bg-green-50 text-green-700" : "border-dashed border-gray-300 text-ink-mute hover:text-brand")}>
                    <Icon.upload size={12} /><input type="file" className="hidden" onChange={async (e) => { const a = await readAttachment(e.target.files[0], VX.SHEET_TYPES); a && set("lineFiles", i, a); }} />
                  </label>
                </Td>
                <Td><input type="checkbox" className="h-4 w-4 accent-[#0b5ed7]" checked={f.noBid[i]} onChange={(e) => set("noBid", i, e.target.checked)} /></Td>
              </tr>
            ))}
            <tr className="bg-gray-50"><Td /><Td className="font-semibold">Taxable value</Td><Td /><Td /><Td /><Td /><Td /><Td align="right" className="num font-semibold">{num(taxable)}</Td><Td /><Td /></tr>
            <tr className="bg-gray-50"><Td /><Td>GST @ {f.gstPct}%</Td><Td /><Td /><Td /><Td /><Td /><Td align="right" className="num">{num((taxable * f.gstPct) / 100)}</Td><Td /><Td /></tr>
            <tr className="bg-gray-50"><Td /><Td className="font-semibold">Total ({priced}/{n} lines)</Td><Td /><Td /><Td /><Td /><Td /><Td align="right" className="num font-bold">{f.currency} {num(taxable * (1 + f.gstPct / 100))}{f.currency !== "INR" && <span className="block text-[11px] font-normal text-ink-mute">≈ {inr(taxable * (1 + f.gstPct / 100) * (Number(f.fx) || 0))} @ {f.fx}</span>}</Td><Td /><Td /></tr>
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-6 gap-3">
        <Field label="Your quotation no."><TextInput value={f.quoteNo} onChange={(x) => setF({ ...f, quoteNo: x })} placeholder="e.g. DST/Q/0412" /></Field>
        <Field label="Currency"><Select value={f.currency} onChange={(x) => setF({ ...f, currency: x, fx: DEFAULT_FX[x] || 1 })} options={CURRENCIES} /></Field>
        {f.currency !== "INR" && <Field label={`Exchange rate (₹ per ${f.currency})`} hint="Used to compare and award in INR"><NumInput value={f.fx} onChange={(x) => setF({ ...f, fx: x })} /></Field>}
        <Field label="GST %"><Select value={String(f.gstPct)} onChange={(x) => setF({ ...f, gstPct: Number(x) })} options={GST_RATES.map(String)} /></Field>
        <Field label="Valid until" required><DateInput value={f.validUntil} onChange={(x) => setF({ ...f, validUntil: x })} /></Field>
        <Field label="Quotation document">
          <label className={cls("flex h-[32px] cursor-pointer items-center gap-2 truncate rounded-md border border-dashed px-2.5 text-[12.5px]", f.attachment ? "border-green-300 bg-green-50 text-green-700" : "border-gray-300 text-ink-soft hover:border-brand hover:text-brand")}>
            <Icon.upload size={13} /><span className="truncate">{f.attachment ? f.attachment.name : "Attach PDF"}</span>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls" className="hidden" onChange={async (e) => { const a = await readAttachment(e.target.files[0], VX.SHEET_TYPES); a && setF((ff) => ({ ...ff, attachment: a })); }} />
          </label>
        </Field>
        <Field label="Terms, exclusions or remarks" span={6}><TextArea rows={2} value={f.note} onChange={(x) => setF({ ...f, note: x })} placeholder="e.g. Freight extra beyond 50 km; mill test certificate with each lot" /></Field>
        <div className="col-span-6 space-y-3">
          <RfqAnswers rfq={rfq} value={f.answers} onChange={(a) => setF({ ...f, answers: a })} />
          <DocDetails kind="quote" value={f.details} onChange={(d) => setF({ ...f, details: d })} vendor={byId(getState().vendors, vendorId)} subtotal={taxable} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
        {qErr.length > 0 && <span className="mr-auto text-[12px] text-red-600">{qErr[0]}{qErr.length > 1 ? ` (+${qErr.length - 1} more)` : ""}</span>}
        {mode === "vendor" ? <Check checked={agree} onChange={setAgree} label={`I accept the buyer's terms (${rfq.incoterm}); prices are firm until the validity date.`} /> : <span />}
        <Btn variant="primary" icon={Icon.send} disabled={!ok} onClick={submit}>{mode === "buyer" ? "Save quotation" : prev ? "Submit revised quotation" : "Submit quotation"}</Btn>
      </div>
    </div>
  );
}

// Accept / decline participation (Zoho, Odoo)
function RespondToInvite({ rfq, vendorId }) {
  const [reason, setReason] = y.useState("");
  const [declining, setDeclining] = y.useState(false);
  const respond = (status) => {
    setState((s) => { const r = byId(s.rfqs, rfq.id); r.responses = r.responses || {}; r.responses[vendorId] = { status, reason: status === "Declined" ? reason : "", at: new Date().toISOString() }; },
      { entity: "RFQ", id: rfq.id, action: `${vendorName(getState(), vendorId)} ${status.toLowerCase()} the invitation${reason ? ` — ${reason}` : ""}` });
    toast(status === "Accepted" ? "Thanks — you can now submit your quotation" : "Response sent to the buyer", status === "Accepted" ? "green" : "red");
  };
  return (
    <div className="rounded-xl border border-brand/30 bg-brand-soft/40 p-4">
      <p className="text-[14px] font-semibold">Will you submit a quotation for this RFQ?</p>
      <p className="mt-0.5 text-[12.5px] text-ink-soft">Let the buyer know early — declining helps them invite someone else.</p>
      {declining ? (
        <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-2">
          <TextInput value={reason} onChange={setReason} placeholder="Reason (e.g. capacity full this month)" />
          <Btn onClick={() => setDeclining(false)}>Back</Btn><Btn variant="danger" disabled={!reason} onClick={() => respond("Declined")}>Decline</Btn>
        </div>
      ) : (
        <div className="mt-3 flex gap-2"><Btn variant="primary" icon={Icon.check} onClick={() => respond("Accepted")}>Yes, I'll quote</Btn><Btn variant="danger" onClick={() => setDeclining(true)}>Decline</Btn></div>
      )}
    </div>
  );
}

function VendorRfqView({ rfq, vendorId, onDone }) {
  const resp = (rfq.responses || {})[vendorId] || { status: "Invited" };
  const overdue = daysUntil(rfq.dueDate) < 0;
  const mine = rfq.quotes.find((q) => q.vendorId === vendorId);
  if (["Awarded", "Closed", "Cancelled"].includes(rfq.status) || (rfq.status === "Partially Awarded" && !mine))
    return <Note>This RFQ is {rfq.status.toLowerCase()}. {mine ? `Your quotation status: ${quoteStatus(rfq, mine)}.` : ""}</Note>;
  const vend = byId(getState().vendors, vendorId);
  if (vend && (isBlockedFor(vend, "All") || !["Active", "On Hold"].includes(vend.status)))
    return <Note tone="red" icon={Icon.lock}>Your account is {vend.status === "On Hold" ? "on hold" : vend.status.toLowerCase()}, so new quotations can't be submitted.{mine ? ` Your earlier quotation (${quoteStatus(rfq, mine)}) stays with the buyer.` : ""}</Note>;
  if (overdue) return <Note tone="amber">The submission window closed on {fmtDate(rfq.dueDate)}. {mine ? `Your quotation (${quoteStatus(rfq, mine)}) is with the buyer.` : "Contact the buyer if you need an extension."}</Note>;
  if (resp.status === "Declined") return <Note tone="amber">You declined this RFQ ({resp.reason}). <button className="font-medium text-brand" onClick={() => setState((s) => (byId(s.rfqs, rfq.id).responses[vendorId] = { status: "Accepted", at: new Date().toISOString() }))}>Changed your mind? Quote now</button></Note>;
  if (!mine && resp.status !== "Accepted") return <RespondToInvite rfq={rfq} vendorId={vendorId} />;
  return <QuoteForm key={mine ? mine.submittedOn + mine.review : "new"} rfq={rfq} vendorId={vendorId} onDone={onDone} />;
}

// ---------------------------------------------------------------- split award
function SplitAwardModal({ rfq, onClose, preset }) {
  const st = useStore();
  const eligible = rfq.quotes.filter((q) => q.review !== "Returned" && q.review !== "Under review" && daysUntil(q.validUntil) >= 0);
  const already = new Set((rfq.awards || []).map((a) => a.line));
  const best = (i) => { const c = eligible.filter((q) => lineRate(q, i) != null && canPo(q.vendorId)); c.sort((a, b) => lineRate(a, i) - lineRate(b, i)); return c[0]?.vendorId || ""; };
  function canPo(vid) { const v = byId(st.vendors, vid); return v && eligibleForPo(v) && !scorecardGate(st, vid, "po").block && !sourcingGate(st, v, "po").block; }
  const [pick, setPick] = y.useState(() => rfq.items.map((_, i) => (already.has(i) ? "" : preset ? (eligible.find((q) => q.vendorId === preset && lineRate(q, i) != null) ? preset : "") : best(i))));
  const [keepOpen, setKeepOpen] = y.useState(false);
  const [note, setNote] = y.useState("");
  const groups = {};
  pick.forEach((vid, i) => { if (vid) (groups[vid] = groups[vid] || []).push(i); });
  const isCon = (vid) => { const v = byId(st.vendors, vid); return v && (v.isContractor || v.type === "Labor"); };
  const allCon = Object.keys(groups).length > 0 && Object.keys(groups).every(isCon);
  const [as, setAs] = y.useState("po");
  const target = allCon ? as : "po";
  // Not the lowest rate on some line → the recommendation must say why
  const notL1 = pick.some((vid, i) => vid && eligible.some((q) => lineRate(q, i) != null && lineRate(q, i) < lineRate(eligible.find((x) => x.vendorId === vid), i)));
  const confirm = () => {
    if (!note.trim()) return toast("Write the award recommendation first", "red");
    if (target === "contract") return confirmContract();
    const created = [];
    setState((s) => {
      const r = byId(s.rfqs, rfq.id);
      r.awards = r.awards || [];
      r.awardNotes = [...(r.awardNotes || []), { at: new Date().toISOString(), by: currentUser(), note: note.trim(), target: "PO" }];
      for (const [vid, lines] of Object.entries(groups)) {
        const q = r.quotes.find((x) => x.vendorId === vid);
        const poId = nextId("PO", s.purchaseOrders);
        s.purchaseOrders.unshift({
          id: poId, vendorId: vid, project: rfq.project, date: todayISO(), deliveryDate: shiftDays(Math.max(...lines.map((i) => Number(q.leadDays?.[i] ?? q.deliveryDays) || 7))), status: "Draft",
          billingPolicy: "On received quantity", tolerance: 2, rfqId: rfq.id, blanketId: null, returns: [], quoteNo: q.quoteNo, gstPct: q.gstPct,
          lines: lines.map((i) => ({ desc: rfq.items[i].desc, unit: rfq.items[i].unit, qty: rfq.items[i].qty, rate: round2(lineRate(q, i)) })),
          receipts: [], revisions: [{ rev: 0, at: new Date().toISOString(), by: currentUser(), note: `Created from ${rfq.id} award (lines ${lines.map((i) => i + 1).join(", ")})` }],
          awardNote: note.trim(), awardBy: currentUser(),
        });
        lines.forEach((i) => r.awards.push({ line: i, vendorId: vid, poId }));
        created.push(poId);
      }
      const allDone = rfq.items.every((_, i) => r.awards.some((a) => a.line === i));
      r.status = allDone || !keepOpen ? "Awarded" : "Partially Awarded";
      r.awardedTo = Object.keys(groups).length === 1 ? Object.keys(groups)[0] : "Split";
      r.poId = created[0];
    }, { entity: "RFQ", id: rfq.id, action: `Awarded — ${Object.entries(groups).map(([v, l]) => `${vendorName(st, v)}: lines ${l.map((i) => i + 1).join(",")}`).join("; ")}` });
    toast(`${Object.keys(groups).length} draft PO(s) created — approve them in Approval Management`);
    onClose();
  };
  // Contractor awards become draft contracts carrying the awarded lines as the contract BOQ;
  // the contract then goes through Legal → Finance approval before it can be signed.
  const confirmContract = () => {
    const created = [];
    setState((s) => {
      const r = byId(s.rfqs, rfq.id);
      r.awards = r.awards || [];
      r.awardNotes = [...(r.awardNotes || []), { at: new Date().toISOString(), by: currentUser(), note: note.trim(), target: "Contract" }];
      for (const [vid, lines] of Object.entries(groups)) {
        const q = r.quotes.find((x) => x.vendorId === vid);
        const id = nextId("CTR", s.contracts);
        const scope = lines.map((i, k) => ({ id: `S${k + 1}`, code: String(i + 1), desc: rfq.items[i].desc, unit: rfq.items[i].unit, qty: rfq.items[i].qty, rate: round2(lineRate(q, i)) }));
        const value = round2(sum(scope, (l) => l.qty * l.rate));
        s.contracts.unshift({ ...CONTRACT_DEFAULTS(), id, vendorId: vid, project: rfq.project, title: rfq.title, type: "Item-Rate", value, advanceAmount: round2(value * 0.1),
          status: "Draft", rfqId: rfq.id, quoteNo: q.quoteNo, scope, awardNote: note.trim(), awardBy: currentUser(), owner: currentUser(), changeOrders: [], guarantees: [] });
        lines.forEach((i) => r.awards.push({ line: i, vendorId: vid, contractId: id }));
        created.push(id);
      }
      const allDone = rfq.items.every((_, i) => r.awards.some((a) => a.line === i));
      r.status = allDone || !keepOpen ? "Awarded" : "Partially Awarded";
      r.awardedTo = Object.keys(groups).length === 1 ? Object.keys(groups)[0] : "Split";
      r.contractId = created[0];
    }, { entity: "RFQ", id: rfq.id, action: `Awarded as contract — ${Object.entries(groups).map(([v, l]) => `${vendorName(st, v)}: lines ${l.map((i) => i + 1).join(",")}`).join("; ")}` });
    toast(`${created.length} draft contract(s) created — submit for approval from Contracts`);
    onClose();
  };
  return (
    <Modal open onClose={onClose} width={960} title={`Award ${rfq.id} — choose a vendor per line`} subtitle="Like Odoo's 'Compare product lines': pick the winning quote for each line. One draft PO is created per vendor."
      footer={<><Check checked={keepOpen} onChange={setKeepOpen} label="Keep RFQ open for unawarded lines" /><span className="flex-1" /><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={!Object.keys(groups).length || !note.trim()} onClick={confirm}>Award & create {Object.keys(groups).length} {target === "contract" ? "contract" : "PO"}(s)</Btn></>}>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[12.5px]">
        <span className="text-ink-soft">Quick pick:</span>
        <Btn size="sm" onClick={() => setPick(rfq.items.map((_, i) => (already.has(i) ? "" : best(i))))}>Lowest rate per line</Btn>
        {eligible.map((q) => <Btn key={q.vendorId} size="sm" onClick={() => setPick(rfq.items.map((_, i) => (already.has(i) || lineRate(q, i) == null ? "" : q.vendorId)))}>All to {vendorName(st, q.vendorId)}</Btn>)}
      </div>
      {rfq.quotes.some((q) => q.review === "Under review") && <div className="mb-3"><Note tone="amber">Quotes still under review are not selectable — accept them first.</Note></div>}
      <div className="mb-3 grid grid-cols-[1fr_260px] gap-3">
        <Field label="Award recommendation (sent with the approval)" required hint={notL1 ? "Not the lowest rate on every line — say why" : "e.g. L1 on all lines, technically compliant"}>
          <TextInput value={note} onChange={setNote} placeholder={notL1 ? "e.g. L1 vendor's lead time 45 days vs 12 required" : "e.g. L1, technically compliant, quote valid 30 days"} />
        </Field>
        {allCon && <Field label="Award as" hint={as === "contract" ? "Draft contract with these lines as its BOQ" : "Draft purchase order"}>
          <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5">{[["po", "Purchase order"], ["contract", "Contract"]].map(([k, l]) => <button key={k} type="button" onClick={() => setAs(k)} className={cls("h-[28px] flex-1 rounded-md text-[13px]", as === k ? "bg-white font-medium text-brand shadow-sm" : "text-ink-soft")}>{l}</button>)}</div>
        </Field>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr><Th>Line</Th><Th align="right">Qty</Th>{eligible.map((q) => <Th key={q.vendorId} align="center">{vendorName(st, q.vendorId)}{!canPo(q.vendorId) && <span className="block text-[10px] font-normal text-red-600">cannot receive PO</span>}</Th>)}<Th align="center">None</Th></tr></thead>
          <tbody>
            {rfq.items.map((it, i) => (
              <tr key={i}>
                <Td className="whitespace-normal">{i + 1}. {it.desc}{already.has(i) && <span className="ml-1"><Status tone="green">Awarded</Status></span>}</Td>
                <Td align="right" className="num">{num(it.qty)} {it.unit}</Td>
                {eligible.map((q) => {
                  const r = lineRate(q, i), low = r != null && r === Math.min(...eligible.map((x) => lineRate(x, i) ?? Infinity));
                  return (
                    <Td key={q.vendorId} align="center" className={cls(pick[i] === q.vendorId && "bg-brand-soft")}>
                      {r == null ? <span className="text-[12px] text-ink-faint">no bid</span> : (
                        <label className="flex cursor-pointer items-center justify-center gap-1.5">
                          <input type="radio" name={`l${i}`} disabled={already.has(i) || !canPo(q.vendorId)} checked={pick[i] === q.vendorId} onChange={() => setPick(pick.map((x, j) => (j === i ? q.vendorId : x)))} />
                          <span className={cls("num text-[13px]", low && "font-semibold text-green-700")}>{inr(r)}</span>
                        </label>
                      )}
                    </Td>
                  );
                })}
                <Td align="center"><input type="radio" name={`l${i}`} disabled={already.has(i)} checked={!pick[i]} onChange={() => setPick(pick.map((x, j) => (j === i ? "" : x)))} /></Td>
              </tr>
            ))}
            <tr className="bg-gray-50"><Td className="font-semibold">Award value</Td><Td />{eligible.map((q) => <Td key={q.vendorId} align="center" className="num font-semibold">{groups[q.vendorId] ? inrShort(sum(groups[q.vendorId], (i) => rfq.items[i].qty * lineRate(q, i))) : "—"}</Td>)}<Td /></tr>
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- buyer drawer
function RfqDrawer({ id, onClose, compose }) {
  const st = useStore();
  const rfq = byId(st.rfqs, id);
  const [send, setSend] = y.useState(compose ? { all: true } : null);
  const [record, setRecord] = y.useState(null);
  const [award, setAward] = y.useState(null);
  const [share, setShare] = y.useState(null);
  const [ret, setRet] = y.useState(null);
  const [msg, setMsg] = y.useState({ vendorId: "", text: "" });
  const [alt, setAlt] = y.useState(false);
  if (!rfq) return null;
  const ranked = rankQuotes(st, rfq);
  const reviewed = ranked.filter((r) => r.q.review !== "Under review" && !r.expired);
  const minRate = rfq.items.map((_, i) => Math.min(...rfq.quotes.map((q) => lineRate(q, i) ?? Infinity)));
  const open = !["Awarded", "Closed", "Cancelled"].includes(rfq.status);
  const resp = rfq.responses || {};
  const review = (vid, status, reason) => setState((s) => { const q = byId(s.rfqs, id).quotes.find((x) => x.vendorId === vid); q.review = status; q.returnReason = reason || ""; },
    { entity: "RFQ", id, action: `Quotation from ${vendorName(st, vid)} ${status === "Accepted" ? "accepted for evaluation" : `returned — ${reason}`}` });
  return (
    <Drawer open onClose={onClose} width={1040} title={rfq.title}
      subtitle={<><span className="mono">{rfq.id}</span><Status>{rfq.status}</Status><span>{modeLabel(rfq.mode)}</span><span>· {rfq.project}</span><span>· due {fmtDate(rfq.dueDate)}</span>{rfq.sourceRef && <span>· {rfq.sourceRef}</span>}</>}
      actions={<>
        <Btn icon={Icon.download} onClick={() => printRfq(rfq)}>Print / PDF</Btn>
        {open && <Btn icon={Icon.layers} onClick={() => setAlt(true)}>Alternative RFQ</Btn>}
        {rfq.status === "Draft" && <Btn variant="primary" icon={Icon.send} onClick={() => setSend({ all: true })}>Compose & send</Btn>}
        {open && rfq.status !== "Draft" && <Btn icon={Icon.plus} onClick={() => setRecord(rfq.vendorIds.find((v) => !rfq.quotes.some((q) => q.vendorId === v)) || rfq.vendorIds[0])}>Record quote on vendor's behalf</Btn>}
      </>}>
      <div className="space-y-4 px-6 py-5">
        {alt && <NewRfqModal open preset={{ ...JSON.parse(JSON.stringify({ project: rfq.project, items: rfq.items, tnc: rfq.tnc, incoterm: rfq.incoterm, weights: rfq.weights, questions: rfq.questions || [], ranking: rfq.ranking || "Hidden", details: rfq.details || {}, attachments: rfq.attachments || [] })), title: `${rfq.title} — alternative`, vendorIds: [], sourceRef: `Alternative to ${rfq.id}`, altOf: rfq.id, dueDate: shiftDays(7) }} onClose={() => setAlt(false)} onCreated={() => setAlt(false)} />}
        {(rfq.questions || []).length > 0 && <Note icon={Icon.listChecks}>{rfq.questions.length} requirement question(s) · ranking shown to vendors: <b>{rfq.ranking || "Hidden"}</b>{rfq.multiResponse === false ? " · one response only" : ""}</Note>}
        {(rfq.attachments || []).length > 0 && <div className="flex flex-wrap items-center gap-2 text-[12.5px]"><span className="text-ink-mute">Attachments:</span>{rfq.attachments.map((a) => <FileLink key={a.name} name={a.name} dataUrl={a.dataUrl} />)}</div>}
        {rfq.status === "Draft" && <Note>Draft — press <b>Compose & send</b> to e-mail the invitation. Vendors sign in to the supplier portal with a one-time code to respond.</Note>}
        <Section title="Invited vendors" icon={Icon.send}>
          <DataTable dense rows={rfq.vendorIds.map((vid) => ({ id: vid, q: rfq.quotes.find((x) => x.vendorId === vid), r: resp[vid] || { status: "Not sent" }, mails: (rfq.emails || []).filter((m) => m.to === vid) }))} columns={[
            { key: "v", label: "Vendor", render: (r) => <span className="flex flex-col"><span className="font-medium">{vendorName(st, r.id)}</span><span className="text-[11.5px] text-ink-mute">{byId(st.vendors, r.id)?.contact.email}</span></span> },
            { key: "std", label: "Standing", render: (r) => vendorRfqBadge(st, r.id, "rfq") || <span className="text-ink-faint">—</span> },
            { key: "m", label: "E-mail", render: (r) => (r.mails.length ? <span className="text-[12px]">Sent {fmtDate(r.mails[r.mails.length - 1].at)}{r.mails.length > 1 ? ` (${r.mails.length}×)` : ""}</span> : <span className="text-ink-faint">Not sent</span>) },
            { key: "i", label: "Invitation", render: (r) => <span title={r.r.reason || ""}><Status tone={{ Accepted: "green", Quoted: "green", Declined: "red", Invited: "amber" }[r.r.status] || "gray"}>{r.r.status}{r.r.reason ? ` — ${r.r.reason}` : ""}</Status></span> },
            { key: "q", label: "Quotation", render: (r) => (r.q ? <span className="flex flex-col"><Status tone={{ "Under review": "blue", Accepted: "green", Returned: "red", Expired: "red", Ordered: "green", "Partially Ordered": "purple" }[quoteStatus(rfq, r.q)]}>{quoteStatus(rfq, r.q)}</Status><span className="text-[11px] text-ink-mute">{r.q.quoteNo || "—"} · {fmtDate(r.q.submittedOn)} · {r.q.via}</span></span> : <span className="text-ink-faint">—</span>) },
            { key: "att", label: "Files", render: (r) => (r.q ? <span className="flex flex-col gap-0.5">{r.q.attachment && <FileLink name={r.q.attachment.name} dataUrl={r.q.attachment.dataUrl} />}{(r.q.lineFiles || []).filter(Boolean).map((a, k) => <FileLink key={k} name={a.name} dataUrl={a.dataUrl} />)}</span> : null) },
            { key: "a", label: "", align: "right", render: (r) => (
              <span className="flex justify-end gap-1">
                {r.q?.review === "Under review" && <><Btn size="sm" variant="success" onClick={() => review(r.id, "Accepted")}>Accept</Btn><Btn size="sm" variant="danger" onClick={() => setRet({ vid: r.id, reason: "" })}>Return</Btn></>}
                {open && rfq.status !== "Draft" && <Btn size="sm" icon={Icon.globe} onClick={() => setShare(r.id)}>Link</Btn>}
                {open && rfq.status !== "Draft" && !r.q && <Btn size="sm" icon={Icon.mail} onClick={() => setSend({ to: r.id })}>Remind</Btn>}
              </span>) },
          ]} />
        </Section>
        <Section title="Comparison sheet (net of discount, in INR)" icon={Icon.scale}
          actions={open && reviewed.length > 0 && <Btn size="sm" variant="primary" icon={Icon.sparkles} onClick={() => setAward({})}>Award by line…</Btn>}>
          {rfq.quotes.length === 0 ? <p className="p-4 text-[13px] text-ink-mute">No quotations yet.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr><Th>Item</Th><Th align="right">Qty</Th><Th>Needed by</Th>{rfq.quotes.map((q) => <Th key={q.vendorId} align="right">{vendorName(st, q.vendorId)}{q.review === "Under review" && <span className="block text-[10px] font-normal text-blue-600">under review</span>}</Th>)}</tr></thead>
                <tbody>
                  {rfq.items.map((it, i) => (
                    <tr key={i}>
                      <Td className="whitespace-normal">{it.desc}{(rfq.awards || []).filter((a) => a.line === i).map((a) => <span key={a.poId} className="ml-1 text-[11px] text-green-700">→ {vendorName(st, a.vendorId)} ({a.poId})</span>)}</Td>
                      <Td align="right" className="num">{num(it.qty)} {it.unit}</Td><Td className="text-[12px]">{fmtDate(it.requiredBy)}</Td>
                      {rfq.quotes.map((q) => { const r = lineRate(q, i); return <Td key={q.vendorId} align="right" className={cls("num", r != null && r === minRate[i] && "bg-green-50 font-semibold text-green-700")}>{r == null ? <span className="text-ink-faint">no bid</span> : <>{inr(r)}{r === minRate[i] && <span className="ml-1 text-[10px]">L1</span>}<span className="block text-[10.5px] font-normal text-ink-mute">{q.discounts?.[i] ? `${q.discounts[i]}% disc · ` : ""}{q.leadDays?.[i] ?? q.deliveryDays}d</span></>}</Td>; })}
                    </tr>
                  ))}
                  <tr className="bg-gray-50/70"><Td className="font-semibold">Taxable total</Td><Td /><Td />{rfq.quotes.map((q) => <Td key={q.vendorId} align="right" className="num font-semibold">{inrShort(quoteTotal(rfq, q))}<span className="block text-[10.5px] font-normal text-ink-mute">{quotedLines(rfq, q).length}/{rfq.items.length} lines</span></Td>)}</tr>
                  <tr><Td>GST</Td><Td /><Td />{rfq.quotes.map((q) => <Td key={q.vendorId} align="right">{q.gstPct ?? 18}%</Td>)}</tr>
                  <tr><Td>Valid until</Td><Td /><Td />{rfq.quotes.map((q) => <Td key={q.vendorId} align="right">{daysUntil(q.validUntil) < 0 ? <Status tone="red">Expired</Status> : fmtDate(q.validUntil)}</Td>)}</tr>
                  <tr><Td>Terms</Td><Td /><Td />{rfq.quotes.map((q) => <Td key={q.vendorId} align="right" className="whitespace-normal text-[12px] text-ink-soft">{q.note || "—"}</Td>)}</tr>
                </tbody>
              </table>
            </div>
          )}
        </Section>
        {ranked.length > 0 && (
          <Section title={`Weighted scoring — price ${rfq.weights.price}% · quality ${rfq.weights.quality}% · delivery ${rfq.weights.delivery}% (partial bids scaled by coverage)`} icon={Icon.target}>
            <DataTable dense rows={ranked} rowKey={(r) => r.q.vendorId} columns={[
              { key: "rank", label: "#", render: (_, i) => i + 1 },
              { key: "v", label: "Vendor", render: (r) => <span className="font-medium">{vendorName(st, r.q.vendorId)}</span> },
              { key: "c", label: "Lines", align: "center", render: (r) => `${Math.round(r.coverage * rfq.items.length)}/${rfq.items.length}` },
              { key: "a", label: "Quote value", align: "right", num: true, render: (r) => inrShort(r.amount) },
              { key: "p", label: "Price", align: "right", num: true, render: (r) => r.priceScore.toFixed(0) },
              { key: "ql", label: "Quality", align: "right", num: true, render: (r) => r.qualityScore.toFixed(0) },
              { key: "d", label: "Delivery", align: "right", num: true, render: (r) => r.deliveryScore.toFixed(0) },
              { key: "t", label: "Weighted", align: "right", render: (r) => <b className="num">{r.total.toFixed(1)}</b> },
              { key: "x", label: "", align: "right", render: (r) => <Status tone={{ "Under review": "blue", Accepted: "gray", Ordered: "green", "Partially Ordered": "purple", Expired: "red" }[quoteStatus(rfq, r.q)]}>{quoteStatus(rfq, r.q)}</Status> },
            ]} />
          </Section>
        )}
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
          <Section title="Terms sent to vendors" icon={Icon.file}><KV cols={2} items={[["Incoterm", rfq.incoterm], ["Source", rfq.sourceRef || "—"], ["Terms", <span className="whitespace-normal">{rfq.tnc}</span>]]} /></Section>
          <Section title={`E-mails (${(rfq.emails || []).length})`} icon={Icon.mail}>
            <ul className="max-h-[220px] divide-y divide-line overflow-y-auto">
              {(rfq.emails || []).length === 0 && <li className="p-3 text-[13px] text-ink-mute">Nothing sent yet.</li>}
              {(rfq.emails || []).slice().reverse().map((m, i) => <li key={i} className="px-4 py-2 text-[12.5px]"><b>{vendorName(st, m.to)}</b> <span className="text-ink-mute">· {fmtDateTime(m.at)}</span><p className="truncate text-ink-soft">{m.subject}</p></li>)}
            </ul>
          </Section>
        </div>
        <DocDetailsView kind="rfq" value={rfq.details} />
        {(rfq.questions || []).length > 0 && rfq.quotes.length > 0 && (
          <Section title="Answers to requirement questions" icon={Icon.listChecks}>
            <DataTable dense rows={rfq.questions.map((q, i) => ({ q, i }))} rowKey={(r) => r.i} columns={[{ key: "q", label: "Question", render: (r) => r.q.text },
              ...rfq.quotes.map((q) => ({ key: q.vendorId, label: vendorName(st, q.vendorId), render: (r) => q.answers?.[r.i] ?? "—" }))]} />
          </Section>
        )}
        <Section title="Negotiation log" icon={Icon.message}>
          <ul className="divide-y divide-line">
            {rfq.negotiation.length === 0 && <li className="p-3 text-[13px] text-ink-mute">No negotiation recorded.</li>}
            {rfq.negotiation.map((n, i) => <li key={i} className="px-4 py-2 text-[13px]"><span className="font-medium">{n.by}</span> <span className="text-ink-mute">→ {n.from === "vendor" || n.by === vendorName(st, n.vendorId) ? "Procurement" : vendorName(st, n.vendorId)} · {fmtDateTime(n.at)}</span><p className="text-ink-soft">{n.text}</p></li>)}
          </ul>
          {open && (
            <div className="grid grid-cols-[200px_1fr_auto] gap-2 border-t border-line p-3">
              <Select value={msg.vendorId} placeholder="Vendor…" onChange={(x) => setMsg({ ...msg, vendorId: x })} options={rfq.vendorIds.map((v) => ({ value: v, label: vendorName(st, v) }))} />
              <TextInput value={msg.text} onChange={(x) => setMsg({ ...msg, text: x })} placeholder="Offer / counter-offer / clarification" />
              <Btn variant="primary" disabled={!msg.vendorId || !msg.text} onClick={() => { setState((s) => byId(s.rfqs, id).negotiation.push({ at: new Date().toISOString(), by: currentUser(), vendorId: msg.vendorId, text: msg.text }), { entity: "RFQ", id, action: "Negotiation note added" }); setMsg({ vendorId: "", text: "" }); }}>Log</Btn>
            </div>
          )}
        </Section>
      </div>
      {send && <SendRfqModal rfq={rfq} resendTo={send.to} onClose={() => setSend(null)} />}
      {record && (
        <Modal open onClose={() => setRecord(null)} width={1000} title={`Record quotation on vendor's behalf — ${rfq.id}`} subtitle="For quotes received by e-mail or on paper (Zoho 'surrogate bid')">
          <div className="mb-3 w-72"><Field label="Vendor"><Select value={record} onChange={setRecord} options={rfq.vendorIds.map((v) => ({ value: v, label: vendorName(st, v) }))} /></Field></div>
          <QuoteForm key={record} rfq={rfq} vendorId={record} mode="buyer" onDone={() => setRecord(null)} />
        </Modal>
      )}
      {award && <SplitAwardModal rfq={rfq} onClose={() => setAward(null)} />}
      {share && <ShareLinkModal title={`Quotation link — ${vendorName(st, share)}`} url={appUrl(`/vendor-quote/${rfq.id}/${share}`)} onClose={() => setShare(null)}
        text="Personal link for this vendor. Opening it asks them to sign in with a one-time code sent to their registered e-mail, then accept the invitation and quote." />}
      {ret && (
        <Modal open onClose={() => setRet(null)} width={480} title={`Return quotation — ${vendorName(st, ret.vid)}`} footer={<><Btn onClick={() => setRet(null)}>Cancel</Btn><Btn variant="danger" disabled={!ret.reason} onClick={() => { review(ret.vid, "Returned", ret.reason); setRet(null); }}>Return to vendor</Btn></>}>
          <Field label="What should the vendor correct?"><TextArea value={ret.reason} onChange={(x) => setRet({ ...ret, reason: x })} placeholder="e.g. Rates must include loading; attach mill test certificate" /></Field>
        </Modal>
      )}
    </Drawer>
  );
}

// ---------------------------------------------------------------- RFQ list
function RfqPage() {
  const st = useStore();
  const [open, setOpen] = useQueryOpen();
  const [compose, setCompose] = y.useState(false);
  const [create, setCreate] = y.useState(false);
  const [filter, setFilter] = y.useState("All");
  const loc = Ht();
  const fromReq = new URLSearchParams(loc.search).get("fromReq");
  const [preset, setPreset] = y.useState(null);
  y.useEffect(() => {
    const q = fromReq && (st.requisitions || []).find((x) => x.id === fromReq);
    if (!q) return;
    const man = q.purpose === "Manpower (labour)";
    // quotes must be in before the site needs the material: due 2 days before required-by, at the latest in 7 days, at least tomorrow
    const due = [shiftDays(7), shiftDays(-2, q.requiredBy)].sort()[0];
    setPreset({ title: `${man ? q.labour.category + " — manpower" : itemsSummary(q.items)} (${q.id})`, project: q.project, sourceRef: q.id, requisitionId: q.id, mode: "Multiple Vendors", dueDate: due > todayISO() ? due : shiftDays(1),
      items: q.items.map((i) => ({ desc: i.desc, unit: i.unit, qty: i.qty, requiredBy: q.requiredBy })), vendorIds: man ? (q.labour.distribution || []) : [],
      tnc: q.terms || undefined, details: { ...docDefaults("rfq", st), company: q.company, shipTo: `Site — ${q.project}` } });
    setCreate(true);
  }, [fromReq]);
  const bucket = (r) => {
    if (r.status === "Draft") return "To Send";
    if (["Awarded", "Closed", "Cancelled"].includes(r.status)) return "Done";
    if (daysUntil(r.dueDate) < 0) return "Late";
    return "Waiting";
  };
  const rows = st.rfqs.filter((r) => filter === "All" || bucket(r) === filter);
  const tile = (key, tone, icon, sub) => (
    <button onClick={() => setFilter(filter === key ? "All" : key)} className={cls("rounded-xl text-left", filter === key && "ring-2 ring-brand")}>
      <StatTile tone={tone} label={key === "Done" ? "Awarded / closed" : key} value={st.rfqs.filter((r) => bucket(r) === key).length} sub={sub} icon={icon} />
    </button>
  );
  return (
    <Page title="RFQ & Quotations" subtitle="Requests for quotation, vendor responses, comparison and award" icon={Icon.scale}
      actions={<Btn variant="primary" icon={Icon.plus} onClick={() => setCreate(true)}>New RFQ</Btn>}>
      <DataTable noun="RFQs" filters={<FilterSelect label="Stage" value={filter} onChange={setFilter} options={[{ value: "All", label: "All stages" }, { value: "To Send", label: "To send", tone: "blue" }, { value: "Waiting", label: "Waiting", tone: "amber" }, { value: "Late", label: "Late", tone: "red" }, { value: "Done", label: "Awarded / closed", tone: "green" }]} />} rows={rows} onRow={(r) => { setCompose(false); setOpen(r.id); }} columns={[
        { key: "title", label: "Requirement", className: "font-medium" },
        { key: "project", label: "Project", filterOptions: FO.projects, filter: true },
        { key: "mode", label: "Mode", filterOptions: FO.rfqMode, filter: (r) => modeLabel(r.mode), render: (r) => modeLabel(r.mode) },
        { key: "resp", label: "Responses", render: (r) => { const R = Object.values(r.responses || {}); return <span className="text-[12px]">{r.quotes.length} quoted · {R.filter((x) => x.status === "Declined").length} declined · {r.vendorIds.length} invited</span>; } },
        { key: "best", label: "Lowest total", align: "right", num: true, render: (r) => (r.quotes.length ? inrShort(Math.min(...r.quotes.map((q) => quoteTotal(r, q)))) : "—") },
        { key: "due", label: "Due", render: (r) => <span className={cls(bucket(r) === "Late" && "font-medium text-red-600")}>{fmtDate(r.dueDate)}</span> },
        { key: "s", label: "Status", filterOptions: FO.rfqStatus, filter: (r) => r.status, render: (r) => <Status>{r.status}</Status> },
      ]} />
      <NewRfqModal open={create} preset={preset} onClose={() => { setCreate(false); setPreset(null); }} onCreated={(id) => { setCompose(true); setOpen(id); }} />
      {open && <RfqDrawer key={open} id={open} compose={compose} onClose={() => { setOpen(null); setCompose(false); }} />}
    </Page>
  );
}
