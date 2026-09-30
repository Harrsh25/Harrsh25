// PO → goods receipt → returns → vendor bill → payment, blanket orders and
// procurement settings. Reworked after the Odoo / ERPNext review:
// billing status + Create Bill on PO (Odoo), blanket orders (Odoo), accepted /
// rejected location + return & debit note (ERPNext), Stop / Warn / override
// checks (ERPNext Buying Settings), payment schedule, advances, write-off.

const eligibleForRfq = (v) => !v.frozen && (v.status === "Active" || (v.status === "On Hold" && v.hold?.scope !== "All"));
const eligibleForPo = (v) => eligibleForRfq(v) && !v.frozen && v.regTier === "Spend Authorized" && !isBlockedFor(v, "All");

// ?open=ID deep links between pages
function useQueryOpen() {
  const loc = Ht();
  const initial = new URLSearchParams(loc.search).get("open");
  const [open, setOpen] = y.useState(initial);
  y.useEffect(() => { if (initial) setOpen(initial); }, [initial]);
  return [open, setOpen];
}

// ---------------------------------------------------------------- purchase orders
function NewPoModal({ open, onClose, onCreated, blanketId: presetBlanket }) {
  const st = useStore();
  const set0 = settingsOf(st);
  const blank = () => ({ vendorId: "", blanketId: presetBlanket || "", project: PROJECTS[0], deliveryDate: shiftDays(14), billingPolicy: "On received quantity", tolerance: 2, lines: [{ desc: "", unit: "nos", qty: "", rate: "" }] });
  const [f, setF] = y.useState(blank);
  y.useEffect(() => { if (open) { const b = blank(); if (presetBlanket) Object.assign(b, fromBlanket(presetBlanket)); setF(b); } }, [open]);
  function fromBlanket(boId) {
    const bo = byId(st.blanketOrders, boId);
    if (!bo) return { blanketId: "" };
    return { blanketId: boId, vendorId: bo.vendorId, lines: blanketUsage(st, bo).map((l, i) => ({ desc: l.desc, unit: l.unit, qty: "", rate: l.rate, blanketLine: i, remaining: l.remaining })) };
  }
  const vendors = st.vendors.filter(eligibleForPo);
  const v = byId(st.vendors, f.vendorId);
  const gate0 = f.vendorId ? scorecardGate(st, f.vendorId, "po") : {};
  const sg = v ? sourcingGate(st, v, "po") : { issues: [] };
  const gate = { ...gate0, block: gate0.block || sg.block };
  const bo = f.blanketId && byId(st.blanketOrders, f.blanketId);
  const setLine = (i, k, val) => setF({ ...f, lines: f.lines.map((x, j) => (j === i ? { ...x, [k]: val } : x)) });
  const lines = bo ? f.lines.filter((l) => Number(l.qty) > 0) : f.lines;
  const total = sum(lines, (l) => (Number(l.qty) || 0) * (Number(l.rate) || 0));
  const overBlanket = bo && f.lines.some((l) => Number(l.qty) > l.remaining + (bo.lines[l.blanketLine].qty * set0.blanketAllowancePct) / 100);
  const poErr = { delivery: VX.req(f.deliveryDate) || VX.notPast(f.deliveryDate, "Delivery date can't be in the past"), tol: VX.num(f.tolerance, { min: 0, max: 20, label: "Tolerance" }) };
  const ok = f.vendorId && lines.length && lines.every((l) => String(l.desc).trim() && String(l.unit || "").trim() && l.qty > 0 && l.rate > 0) && !gate.block && !overBlanket && !VX.any(poErr);
  const activeBlankets = st.blanketOrders.filter((b) => blanketStatus(st, b) === "Active");
  return (
    <Modal open={open} onClose={onClose} width={860} title={bo ? `Call-off PO against ${bo.id}` : "New purchase order"}
      footer={<><span className="mr-auto text-[13px]">Total <b className="num">{inr(total)}</b> + GST</span><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={!ok} onClick={() => {
        const id = nextId("PO", st.purchaseOrders);
        setState((s) => s.purchaseOrders.unshift({ ...f, id, date: todayISO(), status: "Draft", rfqId: null, receipts: [], returns: [], blanketId: f.blanketId || null,
          lines: lines.map((l) => ({ desc: l.desc, unit: l.unit, qty: Number(l.qty), rate: Number(l.rate), ...(l.blanketLine !== undefined ? { blanketLine: l.blanketLine } : {}) })),
          revisions: [{ rev: 0, at: new Date().toISOString(), by: currentUser(), note: bo ? `Call-off against ${bo.id}` : "PO created" }] }), { entity: "PO", id, action: `Created for ${v.name}${bo ? ` (call-off ${bo.id})` : ""} — sent for approval` });
        toast(`${id} created — approve it in Approval Management`); onClose(); onCreated && onCreated(id);
      }}>Create & send for approval</Btn></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Draw from blanket order" hint="Uses the agreed rates"><Select value={f.blanketId} placeholder="— none (standalone PO) —" onChange={(x) => setF({ ...blank(), ...(x ? fromBlanket(x) : {}), project: f.project })} options={activeBlankets.map((b) => ({ value: b.id, label: `${b.id} — ${vendorName(st, b.vendorId)}` }))} /></Field>
          <Field label="Vendor" required hint="Only spend-authorized, unblocked vendors"><Select value={f.vendorId} disabled={!!bo} placeholder="Select vendor…" onChange={(x) => setF({ ...f, vendorId: x })} options={vendors.map((x) => ({ value: x.id, label: x.name }))} /></Field>
          <Field label="Project"><Select value={f.project} onChange={(x) => setF({ ...f, project: x })} options={PROJECTS} /></Field>
          <Field label="Delivery by"><DateInput value={f.deliveryDate} onChange={(x) => setF({ ...f, deliveryDate: x })} /><FieldErr m={poErr.delivery} /></Field>
          <Field label="Bill control"><Select value={f.billingPolicy} onChange={(x) => setF({ ...f, billingPolicy: x })} options={["On received quantity", "On ordered quantity"]} /></Field>
          <Field label="Receipt tolerance (%)" hint="0–20%"><NumInput value={f.tolerance} onChange={(x) => setF({ ...f, tolerance: x })} /><FieldErr m={poErr.tol} /></Field>
        </div>
        {sg.issues.length > 0 && <Note tone={sg.block ? "red" : "amber"}>{v.name}: {sg.issues.join(" · ")}.{sg.block ? " New POs are stopped until this is fixed (Procurement Settings → PO compliance gate)." : ""}</Note>}
        {gate0.block && <Note tone="red">{v.name} is in the <b>{gate0.standing.name}</b> scorecard standing — new POs are prevented.</Note>}
        {!gate.block && gate.warn && <Note tone="amber">{v.name} is in the <b>{gate.standing.name}</b> scorecard standing — check performance before ordering.</Note>}
        {v && complianceOf(v).blocking.length > 0 && <Note tone={settingsOf(st).complianceGate === "Stop" ? "red" : "amber"} icon={Icon.shieldCheck}><b>Compliance:</b> {complianceOf(v).blocking.join(" · ")} — the PO can be issued, but payments {settingsOf(st).complianceGate === "Stop" ? "will be blocked" : "will be flagged"} until this is fixed.</Note>}
        {isGroupCompany(v) && <Note tone="blue" icon={Icon.building}><b>Group company</b> ({v.parentCompany}) — inter-company purchase: no RFQ or competitive quotes needed. Spend is reported separately under Vendor Scorecard → Spend by group.</Note>}
        {v && v.preferred && !bo && <Note tone="green" icon={Icon.star}>Preferred supplier — pricelist rates from earlier POs are suggested below.</Note>}
        <Section title={bo ? `Lines from ${bo.id} (allowance ${set0.blanketAllowancePct}%)` : "Lines"} actions={!bo && <Btn size="sm" icon={Icon.plus} onClick={() => setF({ ...f, lines: [...f.lines, { desc: "", unit: "nos", qty: "", rate: "" }] })}>Add line</Btn>}>
          <div className="space-y-2 p-3">
            {f.lines.map((l, i) => {
              const last = !bo && st.purchaseOrders.filter((p) => p.vendorId === f.vendorId).flatMap((p) => p.lines).find((x) => l.desc && x.desc.toLowerCase().includes(l.desc.toLowerCase()));
              return (
                <div key={i} className="grid grid-cols-[1fr_90px_120px_130px_28px] items-start gap-2">
                  <div><TextInput value={l.desc} disabled={!!bo} onChange={(x) => setLine(i, "desc", x)} placeholder="Description" />
                    {bo && <span className="mt-1 block text-[11px] text-ink-mute">Remaining on agreement: {num(l.remaining)} {l.unit}</span>}
                    {last && !l.rate && <button className="mt-1 text-[11px] text-brand" onClick={() => setF({ ...f, lines: f.lines.map((x, j) => (j === i ? { ...x, desc: last.desc, unit: last.unit, rate: last.rate } : x)) })}>Use pricelist: {last.desc} @ {inr(last.rate)}</button>}</div>
                  <TextInput value={l.unit} disabled={!!bo} onChange={(x) => setLine(i, "unit", x)} placeholder="Unit" />
                  <NumInput value={l.qty} onChange={(x) => setLine(i, "qty", x)} placeholder="Qty" />
                  <NumInput value={l.rate} disabled={!!bo} onChange={(x) => setLine(i, "rate", x)} placeholder="Rate" />
                  {!bo ? <IconBtn icon={Icon.trash} title="Remove line" onClick={() => f.lines.length > 1 && setF({ ...f, lines: f.lines.filter((_, j) => j !== i) })} /> : <span />}
                </div>
              );
            })}
          </div>
        </Section>
        {overBlanket && <Note tone="red">Quantity exceeds what's left on the blanket order plus the {set0.blanketAllowancePct}% allowance.</Note>}
      </div>
    </Modal>
  );
}

// Posting a GRN with rejections creates a return-to-vendor and, if the goods were
// already billed, a debit note on that bill (ERPNext "Is Return (Debit Note)").
function GrnModal({ po, onClose }) {
  const st = useStore();
  const rec = poReceived(po);
  const [f, setF] = y.useState({ date: todayISO(), qc: "Passed", acceptedLocation: `Main store — ${po.project.split(" ")[0]}`, rejectedLocation: `Return bay — ${po.project.split(" ")[0]}`, reason: "", lines: rec.map((l) => ({ qty: Math.max(0, l.qty - l.received), accepted: Math.max(0, l.qty - l.received) })) });
  const over = rec.some((l, i) => l.received + (Number(f.lines[i].qty) || 0) > l.qty * (1 + (po.tolerance || 0) / 100));
  const bad = f.lines.some((l) => Number(l.accepted) > Number(l.qty) || Number(l.qty) < 0 || Number(l.accepted) < 0);
  const rejected = sum(f.lines, (l) => (Number(l.qty) || 0) - (Number(l.accepted) || 0));
  const accepted = sum(f.lines, (l) => Number(l.accepted) || 0);
  // The inspection result has to agree with the quantities, and rejected goods need a reason
  const grnErr = VX.req(f.date, "Receipt date required") || VX.notFuture(f.date, "Receipt date can't be in the future") || (f.date < po.date ? `Before the PO date (${fmtDate(po.date)})` : "")
    || (f.qc === "Failed" && accepted > 0 ? "Inspection Failed — accepted quantity must be 0" : "")
    || (["Passed", "Passed with remarks"].includes(f.qc) && rejected > 0 ? `Inspection says Passed but ${num(rejected)} units are rejected — choose “Partially rejected”` : "")
    || (f.qc === "Partially rejected" && rejected <= 0 ? "Enter the rejected quantity (accepted < received)" : "")
    || (rejected > 0 && VX.reason(f.reason) ? "Give the rejection reason (min 5 characters)" : "");
  const post = () => {
    const grnId = nextId("GRN", st.purchaseOrders.flatMap((p) => p.receipts));
    let dnInfo = "";
    setState((s) => {
      const p = byId(s.purchaseOrders, po.id);
      p.receipts.push({ id: grnId, date: f.date, qc: f.qc, acceptedLocation: f.acceptedLocation, rejectedLocation: rejected ? f.rejectedLocation : "", lines: f.lines.map((l, i) => ({ line: i, qty: Number(l.qty) || 0, accepted: Number(l.accepted) || 0 })).filter((l) => l.qty > 0) });
      p.returns = p.returns || [];
      f.lines.forEach((l, i) => {
        const rj = (Number(l.qty) || 0) - (Number(l.accepted) || 0);
        if (rj <= 0) return;
        const rtv = { id: nextId("RTV", s.purchaseOrders.flatMap((x) => x.returns || [])), grnId, line: i, qty: rj, reason: f.reason || f.qc, location: f.rejectedLocation, date: f.date, debitNote: null };
        // auto debit note if this line was billed beyond what's now accepted
        const inv = s.invoices.filter((x) => x.poId === po.id && x.lines.some((z) => z.line === i)).slice(-1)[0];
        if (inv && !settingsOf(s).billRejectedQty) {
          const acceptedTotal = poReceived(p)[i].accepted, billedQty = sum(s.invoices.filter((x) => x.poId === po.id).flatMap((x) => x.lines.filter((z) => z.line === i)), (z) => z.qty);
          const excess = Math.min(rj, Math.max(0, billedQty - acceptedTotal));
          if (excess > 0) {
            const dnId = `DN-${String(s.invoices.flatMap((x) => x.notes || []).filter((n) => n.type === "Debit Note").length + 1).padStart(3, "0")}`;
            inv.notes.push({ id: dnId, type: "Debit Note", amount: round2(excess * p.lines[i].rate * (1 + (inv.gstPct || 0) / 100)), reason: `${num(excess)} ${p.lines[i].unit} rejected at ${grnId} — ${rtv.id}`, date: f.date, auto: true });
            rtv.debitNote = dnId; dnInfo = ` · ${dnId} on ${inv.id}`;
          }
        }
        p.returns.push(rtv);
      });
    }, { entity: "PO", id: po.id, action: `${grnId} received${rejected ? ` — ${num(rejected)} rejected, return raised${dnInfo}` : ""}` });
    toast(`${grnId} posted${rejected ? " — return to vendor raised" : ""}${dnInfo}`); onClose();
  };
  return (
    <Modal open onClose={onClose} width={820} title={`Goods receipt — ${po.id}`} subtitle={`Tolerance ±${po.tolerance || 0}% · quality inspection splits accepted and rejected quantity`}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={over || bad || !!grnErr || !f.lines.some((l) => l.qty > 0)} onClick={post}>Post GRN</Btn></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Receipt date"><DateInput value={f.date} onChange={(x) => setF({ ...f, date: x })} /></Field>
          <Field label="Quality inspection"><Select value={f.qc} onChange={(x) => setF({ ...f, qc: x })} options={["Passed", "Passed with remarks", "Partially rejected", "Failed"]} /></Field>
          <Field label="Accepted into"><TextInput value={f.acceptedLocation} onChange={(x) => setF({ ...f, acceptedLocation: x })} /></Field>
        </div>
        <table className="w-full">
          <thead><tr><Th>Item</Th><Th align="right">Ordered</Th><Th align="right">Received so far</Th><Th align="right">Receiving now</Th><Th align="right">Accepted</Th><Th align="right">Rejected</Th></tr></thead>
          <tbody>
            {rec.map((l, i) => (
              <tr key={i}>
                <Td>{l.desc}</Td><Td align="right" className="num">{num(l.qty)} {l.unit}</Td><Td align="right" className="num">{num(l.received)}</Td>
                <Td align="right"><NumInput value={f.lines[i].qty} onChange={(x) => setF({ ...f, lines: f.lines.map((z, j) => (j === i ? { qty: x, accepted: x } : z)) })} /></Td>
                <Td align="right"><NumInput value={f.lines[i].accepted} onChange={(x) => setF({ ...f, lines: f.lines.map((z, j) => (j === i ? { ...z, accepted: x } : z)) })} /></Td>
                <Td align="right" className={cls("num", (f.lines[i].qty - f.lines[i].accepted) > 0 && "font-semibold text-red-600")}>{num((Number(f.lines[i].qty) || 0) - (Number(f.lines[i].accepted) || 0))}</Td>
              </tr>
            ))}
          </tbody>
        </table>
        {rejected > 0 && !bad && (
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-red-200 bg-red-50/40 p-3">
            <Field label="Rejected goods kept at"><TextInput value={f.rejectedLocation} onChange={(x) => setF({ ...f, rejectedLocation: x })} /></Field>
            <Field label="Rejection reason" required><TextInput value={f.reason} onChange={(x) => setF({ ...f, reason: x })} placeholder="e.g. Lumps / moisture, failed cube test" /></Field>
            <p className="col-span-2 text-[12px] text-red-700">{num(rejected)} units will go on a return-to-vendor. If they were already billed, a debit note is added to the bill automatically.</p>
          </div>
        )}
        {over && <Note tone="red">Receipt exceeds the ordered quantity plus {po.tolerance || 0}% tolerance.</Note>}
        {bad && <Note tone="red">Accepted quantity can't be negative or exceed the received quantity.</Note>}
        {!bad && grnErr && <Note tone="red">{grnErr}</Note>}
      </div>
    </Modal>
  );
}

function PoDrawer({ id, onClose }) {
  const st = useStore();
  const po = byId(st.purchaseOrders, id);
  const [grn, setGrn] = y.useState(false);
  const [amend, setAmend] = y.useState(null);
  const [bill, setBill] = y.useState(false);
  if (!po) return null;
  const v = byId(st.vendors, po.vendorId);
  const rec = poReceived(po);
  const status = poStatus(po);
  const bstatus = poBillingStatus(st, po);
  const invs = st.invoices.filter((i) => i.poId === po.id);
  // Over-order allowance: RFQ-sourced lines can't exceed the RFQ quantity by more than the allowed %
  const overOrder = (am) => {
    const rfq = po.rfqId && byId(st.rfqs, po.rfqId);
    if (!rfq) return false;
    const allow = 1 + settingsOf(st).overOrderPct / 100;
    return am.lines.some((l) => { const it = rfq.items.find((x) => x.desc === l.desc); return it && Number(l.qty) > it.qty * allow + 1e-6; });
  };
  return (
    <Drawer open onClose={onClose} width={940} title={`${po.id} · ${v.name}`} subtitle={<><Status>{status}</Status><Status tone="blue">{bstatus}</Status><span>{po.project}</span><span>· delivery by {fmtDate(po.deliveryDate)}</span>{po.rfqId && <span>· from {po.rfqId}</span>}{po.blanketId && <span>· call-off {po.blanketId}</span>}{po.quoteNo && <span>· vendor quote {po.quoteNo}</span>}</>}
      actions={<>
        {po.status === "Draft" && <Btn variant="primary" onClick={() => decidePo(po, true)}>Approve & issue</Btn>}
        {!["Draft", "Closed", "Cancelled"].includes(po.status) && status !== "Received" && <Btn variant="primary" icon={Icon.truck} disabled={isBlockedFor(v, "All")} onClick={() => setGrn(true)}>Receive goods</Btn>}
        {["Waiting Bills", "Partially Billed"].includes(bstatus) && <Btn icon={Icon.receipt} onClick={() => setBill(true)}>Create bill</Btn>}
        {!["Closed", "Cancelled"].includes(po.status) && <Btn icon={Icon.pencil} onClick={() => setAmend({ deliveryDate: po.deliveryDate, lines: po.lines.map((l) => ({ ...l })), note: "" })}>Edit</Btn>}
      </>}>
      <div className="space-y-4 px-6 py-5">
        <div className="grid grid-cols-4 gap-3">
          <StatTile tone="blue" label="PO value" value={inrShort(poValue(po))} sub="excl. GST" icon={Icon.package} />
          <StatTile tone="green" label="Accepted" value={`${pct(sum(rec, (l) => l.accepted), sum(rec, (l) => l.qty))}%`} icon={Icon.check} />
          <StatTile tone="red" label="Rejected / returned" value={num(sum(rec, (l) => l.rejected))} sub={`${(po.returns || []).length} return(s)`} icon={Icon.fileX} />
          <StatTile tone="purple" label="Billed" value={inrShort(sum(invs, (i) => invoiceTotals(i).taxable))} sub={bstatus} icon={Icon.receipt} />
        </div>
        <Section title="Lines — ordered vs received vs billed" icon={Icon.boxes}>
          <DataTable dense rows={rec.map((l, i) => ({ ...l, billed: sum(invs.flatMap((x) => x.lines.filter((z) => z.line === i)), (z) => z.qty) }))} rowKey={(_, i) => i} columns={[
            { key: "desc", label: "Item", className: "font-medium" },
            { key: "qty", label: "Ordered", align: "right", num: true, render: (l) => `${num(l.qty)} ${l.unit}` },
            { key: "rate", label: "Rate", align: "right", num: true, render: (l) => inr(l.rate) },
            { key: "received", label: "Received", align: "right", num: true, render: (l) => num(l.received) },
            { key: "accepted", label: "Accepted", align: "right", num: true, render: (l) => num(l.accepted) },
            { key: "rejected", label: "Rejected", align: "right", num: true, render: (l) => (l.rejected ? <span className="text-red-600">{num(l.rejected)}</span> : "0") },
            { key: "billed", label: "Billed", align: "right", num: true, render: (l) => num(l.billed) },
            { key: "p", label: "Pending", align: "right", num: true, render: (l) => num(Math.max(0, l.qty - l.received)) },
          ]} />
        </Section>
        <Section title="Goods receipts" icon={Icon.truck}>
          <DataTable dense rows={po.receipts} empty={<p className="p-4 text-[13px] text-ink-mute">Nothing received yet.</p>} columns={[
            { key: "id", label: "GRN", className: "mono text-[12px]" }, { key: "date", label: "Date", render: (r) => fmtDate(r.date) },
            { key: "qc", label: "Quality inspection", render: (r) => <Status tone={r.qc === "Passed" ? "green" : r.qc === "Failed" ? "red" : "amber"}>{r.qc}</Status> },
            { key: "q", label: "Received / accepted", render: (r) => `${num(sum(r.lines, (l) => l.qty))} / ${num(sum(r.lines, (l) => l.accepted))}` },
            { key: "loc", label: "Accepted → / rejected →", className: "text-[12px]", render: (r) => <span className="flex flex-col"><span>{r.acceptedLocation || "Main store"}</span>{r.rejectedLocation && <span className="text-red-600">{r.rejectedLocation}</span>}</span> },
            { key: "ot", label: "On time", render: (r) => (new Date(r.date) <= new Date(po.deliveryDate) ? <Status tone="green">On time</Status> : <Status tone="amber">Late</Status>) },
          ]} />
        </Section>
        {(po.returns || []).length > 0 && (
          <Section title="Returns to vendor" icon={Icon.fileX}>
            <DataTable dense rows={po.returns} columns={[
              { key: "id", label: "Return", className: "mono text-[12px]" }, { key: "g", label: "GRN", className: "mono text-[12px]", render: (r) => r.grnId },
              { key: "i", label: "Item", render: (r) => po.lines[r.line].desc }, { key: "q", label: "Qty", align: "right", num: true, render: (r) => `${num(r.qty)} ${po.lines[r.line].unit}` },
              { key: "r", label: "Reason", className: "text-[12px]", render: (r) => r.reason }, { key: "l", label: "Held at", className: "text-[12px]", render: (r) => r.location },
              { key: "dn", label: "Debit note", render: (r) => (r.debitNote ? <Status tone="purple">{r.debitNote}</Status> : <span className="text-[12px] text-ink-mute">Deducted at billing</span>) },
            ]} />
          </Section>
        )}
        <Section title="Bills against this PO" icon={Icon.receipt}>
          <DataTable dense rows={invs} empty={<p className="p-4 text-[13px] text-ink-mute">No bills yet.</p>} columns={[
            { key: "id", label: "Bill", render: (i) => <RefLink to={`${VM_BASE}/invoices?open=${i.id}`}>{i.id}</RefLink> }, { key: "number", label: "Vendor ref" },
            { key: "a", label: "Amount", align: "right", num: true, render: (i) => inr(invoiceTotals(i).payable) }, { key: "s", label: "Status", render: (i) => <Status>{invoiceStatus(i)}</Status> },
          ]} />
        </Section>
        <Section title="Edit / revision history" icon={Icon.branch}>
          <AuditList items={po.revisions.slice().reverse().map((r) => ({ id: `Rev ${r.rev}`, action: r.note, by: r.by, at: r.at }))} />
        </Section>
      </div>
      {grn && <GrnModal po={po} onClose={() => setGrn(false)} />}
      {bill && <NewBillModal open presetPoId={po.id} onClose={() => setBill(false)} />}
      {amend && (
        <Modal open onClose={() => setAmend(null)} width={720} title={`Edit ${po.id} — revision ${po.revisions.length}`} subtitle="The original is kept; each change is versioned."
          footer={<><Btn onClick={() => setAmend(null)}>Cancel</Btn><Btn variant="primary" disabled={!amend.note || overOrder(amend)} onClick={() => {
            setState((s) => { const p = byId(s.purchaseOrders, id); p.deliveryDate = amend.deliveryDate; p.lines = amend.lines.map((l) => ({ ...l, qty: Number(l.qty), rate: Number(l.rate) })); p.revisions.push({ rev: p.revisions.length, at: new Date().toISOString(), by: currentUser(), note: amend.note }); }, { entity: "PO", id, action: `Edited — ${amend.note}` });
            toast("PO updated"); setAmend(null);
          }}>Save revision</Btn></>}>
          <div className="space-y-3">
            <Field label="Delivery by"><DateInput value={amend.deliveryDate} onChange={(x) => setAmend({ ...amend, deliveryDate: x })} /></Field>
            {amend.lines.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_120px_140px] items-center gap-2 text-[13px]"><span>{l.desc}</span>
                <NumInput value={l.qty} onChange={(x) => setAmend({ ...amend, lines: amend.lines.map((z, j) => (j === i ? { ...z, qty: x } : z)) })} />
                <NumInput value={l.rate} onChange={(x) => setAmend({ ...amend, lines: amend.lines.map((z, j) => (j === i ? { ...z, rate: x } : z)) })} /></div>
            ))}
            <Field label="Reason for change" required><TextInput value={amend.note} onChange={(x) => setAmend({ ...amend, note: x })} /></Field>
            {overOrder(amend) && <Note tone="red">Quantity exceeds the RFQ / agreement quantity plus the {settingsOf(st).overOrderPct}% over-order allowance (Procurement Settings).</Note>}
          </div>
        </Modal>
      )}
    </Drawer>
  );
}

function PurchaseOrdersPage() {
  const st = useStore();
  const [open, setOpen] = useQueryOpen();
  const [create, setCreate] = y.useState(false);
  const live = st.purchaseOrders.filter((p) => !["Cancelled"].includes(p.status));
  return (
    <Page title="Purchase Orders" subtitle="PO generation, partial deliveries, goods receipt, returns & billing status" icon={Icon.package}
      actions={<Btn variant="primary" icon={Icon.plus} onClick={() => setCreate(true)}>New PO</Btn>}>
      <DataTable noun="purchase orders" rows={st.purchaseOrders} onRow={(p) => setOpen(p.id)} columns={[
        { key: "v", label: "Vendor", filterOptions: FO.vendors, filter: (x) => vendorName(st, x.vendorId), render: (p) => <span className="font-medium">{vendorName(st, p.vendorId)}</span> },
        { key: "items", label: "Items · project", filterOptions: FO.projects, filter: (p) => p.project, filterLabel: "Project", render: (p) => <TwoLine a={itemsSummary(p.lines)} b={p.project} /> },
        { key: "src", label: "Source", filterOptions: FO.poSource, filter: (p) => poSourceText(st, p)[0], render: (p) => { const [a, b] = poSourceText(st, p); return <TwoLine a={a} b={b} />; } },
        { key: "val", label: "Value", align: "right", num: true, render: (p) => inrShort(poValue(p)) },
        { key: "rec", label: "Received", render: (p) => { const r = poReceived(p); return <Progress value={Math.round(pct(sum(r, (x) => x.received), sum(r, (x) => x.qty)))} />; } },
        { key: "dd", label: "Delivery by", render: (p) => <span className={cls(poStatus(p) !== "Received" && daysUntil(p.deliveryDate) < 0 && "text-red-600")}>{fmtDate(p.deliveryDate)}</span> },
        { key: "b", label: "Billing", filterOptions: FO.poBilling, filter: (p) => poBillingStatus(st, p), render: (p) => <Status>{poBillingStatus(st, p)}</Status> },
        { key: "s", label: "Status", filterOptions: FO.poStatus, filter: (p) => poStatus(p), render: (p) => <Status>{poStatus(p)}</Status> },
      ]} />
      <NewPoModal open={create} onClose={() => setCreate(false)} onCreated={setOpen} />
      {open && <PoDrawer id={open} onClose={() => setOpen(null)} />}
    </Page>
  );
}

// ---------------------------------------------------------------- blanket orders
function BlanketOrdersPage() {
  const st = useStore();
  const [open, setOpen] = useQueryOpen();
  const [create, setCreate] = y.useState(false);
  const [calloff, setCalloff] = y.useState(null);
  const blank = { vendorId: "", title: "", start: todayISO(), deadline: shiftDays(365), terms: "", lines: [{ desc: "", unit: "nos", qty: "", rate: "" }] };
  const [f, setF] = y.useState(blank);
  const bo = open && byId(st.blanketOrders, open);
  const setL = (i, k, v) => setF({ ...f, lines: f.lines.map((x, j) => (j === i ? { ...x, [k]: v } : x)) });
  const bErr = [
    !f.vendorId && "Vendor required", !String(f.title).trim() && "Title required",
    !f.start || !f.deadline ? "Enter start and finish dates" : f.deadline <= f.start ? "Finish must be after start" : f.deadline < todayISO() ? "Agreement has already ended" : "",
    ...f.lines.map((l, i) => !String(l.desc).trim() ? `Line ${i + 1}: item required` : !String(l.unit || "").trim() ? `Line ${i + 1}: unit required` : !(Number(l.qty) > 0) ? `Line ${i + 1}: agreed qty must be greater than 0` : !(Number(l.rate) > 0) ? `Line ${i + 1}: rate must be greater than 0` : ""),
    f.lines.some((l, i) => l.desc && f.lines.findIndex((x) => normNo(x.desc) === normNo(l.desc)) !== i) && "The same item appears twice — merge the lines",
  ].filter(Boolean);
  const ok = bErr.length === 0;
  const value = (b) => sum(b.lines, (l) => l.qty * l.rate);
  const used = (b) => sum(blanketUsage(st, b), (l) => l.ordered * l.rate);
  return (
    <Page title="Blanket Orders" subtitle="Long-term rate agreements — call-off POs draw down the agreed quantity at the agreed rate" icon={Icon.layers}
      actions={<Btn variant="primary" icon={Icon.plus} onClick={() => { setF(blank); setCreate(true); }}>New blanket order</Btn>}>
      <DataTable noun="agreements" rows={st.blanketOrders} onRow={(b) => setOpen(b.id)} empty={<EmptyState icon={Icon.layers} title="No blanket orders" text="Create one for materials you buy repeatedly from the same vendor." />} columns={[
        { key: "title", label: "Agreement", className: "font-medium" },
        { key: "v", label: "Vendor", filterOptions: FO.vendors, filter: (x) => vendorName(st, x.vendorId), render: (b) => vendorName(st, b.vendorId) },
        { key: "val", label: "Value", align: "right", num: true, render: (b) => inrShort(value(b)) },
        { key: "u", label: "Consumed", render: (b) => <Progress value={Math.round(pct(used(b), value(b)))} /> },
        { key: "pos", label: "Call-offs", align: "center", render: (b) => st.purchaseOrders.filter((p) => p.blanketId === b.id).length },
        { key: "d", label: "Valid till", render: (b) => <ExpiryCell iso={b.deadline} /> },
        { key: "s", label: "Status", filterOptions: FO.blanket, filter: (b) => blanketStatus(st, b), render: (b) => <Status>{blanketStatus(st, b)}</Status> },
      ]} />
      {bo && (
        <Drawer open onClose={() => setOpen(null)} width={880} title={bo.title} subtitle={<><span className="mono">{bo.id}</span><Status>{blanketStatus(st, bo)}</Status><span>{vendorName(st, bo.vendorId)}</span><span>· {fmtDate(bo.start)} → {fmtDate(bo.deadline)}</span></>}
          actions={<>{blanketStatus(st, bo) === "Active" && <Btn variant="primary" icon={Icon.plus} onClick={() => setCalloff(bo.id)}>Create call-off PO</Btn>}
            {bo.status !== "Closed" && <Btn onClick={() => setState((s) => (byId(s.blanketOrders, bo.id).status = "Closed"), { entity: "Blanket Order", id: bo.id, action: "Closed" })}>Close agreement</Btn>}</>}>
          <div className="space-y-4 px-6 py-5">
            <Section title="Agreed lines" icon={Icon.listChecks}>
              <DataTable dense rows={blanketUsage(st, bo)} rowKey={(_, i) => i} columns={[
                { key: "desc", label: "Item", className: "font-medium" }, { key: "rate", label: "Agreed rate", align: "right", num: true, render: (l) => inr(l.rate) },
                { key: "qty", label: "Agreed qty", align: "right", num: true, render: (l) => `${num(l.qty)} ${l.unit}` },
                { key: "o", label: "Ordered", align: "right", num: true, render: (l) => num(l.ordered) },
                { key: "r", label: "Remaining", align: "right", num: true, render: (l) => <b>{num(l.remaining)}</b> },
                { key: "p", label: "Used", render: (l) => <Progress value={Math.round(pct(l.ordered, l.qty))} /> },
              ]} />
            </Section>
            <Section title="Call-off purchase orders" icon={Icon.package}>
              <DataTable dense rows={st.purchaseOrders.filter((p) => p.blanketId === bo.id)} empty={<p className="p-4 text-[13px] text-ink-mute">No call-offs yet.</p>} columns={[
                { key: "id", label: "PO", render: (p) => <RefLink to={`${VM_BASE}/purchase-orders?open=${p.id}`}>{p.id}</RefLink> }, { key: "d", label: "Date", render: (p) => fmtDate(p.date) },
                { key: "v", label: "Value", align: "right", num: true, render: (p) => inr(poValue(p)) }, { key: "s", label: "Status", render: (p) => <Status>{poStatus(p)}</Status> },
              ]} />
            </Section>
            {bo.terms && <Note icon={Icon.file}>{bo.terms}</Note>}
          </div>
        </Drawer>
      )}
      <NewPoModal open={!!calloff} blanketId={calloff} onClose={() => setCalloff(null)} />
      <Modal open={create} onClose={() => setCreate(false)} width={820} title="New blanket order" subtitle="Rates are fixed for the agreement period; POs are drawn against it"
        footer={<><span className="mr-auto text-[12px] text-red-600">{bErr[0] || ""}{bErr.length > 1 ? ` (+${bErr.length - 1} more)` : ""}</span><Btn onClick={() => setCreate(false)}>Cancel</Btn><Btn variant="primary" disabled={!ok} onClick={() => {
          const id = nextId("BO", st.blanketOrders);
          setState((s) => s.blanketOrders.unshift({ ...f, id, status: "Active", currency: "INR", lines: f.lines.map((l) => ({ ...l, qty: Number(l.qty), rate: Number(l.rate) })) }), { entity: "Blanket Order", id, action: `Created with ${vendorName(st, f.vendorId)}` });
          setCreate(false); setOpen(id);
        }}>Save agreement</Btn></>}>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Vendor" required><Select value={f.vendorId} placeholder="Select…" onChange={(x) => setF({ ...f, vendorId: x })} options={st.vendors.filter(eligibleForPo).map((v) => ({ value: v.id, label: v.name }))} /></Field>
            <Field label="Title" required span={2}><TextInput value={f.title} onChange={(x) => setF({ ...f, title: x })} placeholder="e.g. TMT steel — annual rate agreement" /></Field>
            <Field label="Start"><DateInput value={f.start} onChange={(x) => setF({ ...f, start: x })} /></Field>
            <Field label="Agreement deadline"><DateInput value={f.deadline} onChange={(x) => setF({ ...f, deadline: x })} /></Field>
          </div>
          {f.lines.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_90px_120px_130px_28px] gap-2">
              <TextInput value={l.desc} onChange={(x) => setL(i, "desc", x)} placeholder="Item" /><TextInput value={l.unit} onChange={(x) => setL(i, "unit", x)} />
              <NumInput value={l.qty} onChange={(x) => setL(i, "qty", x)} placeholder="Agreed qty" /><NumInput value={l.rate} onChange={(x) => setL(i, "rate", x)} placeholder="Rate" />
              <IconBtn icon={Icon.trash} title="Remove" onClick={() => f.lines.length > 1 && setF({ ...f, lines: f.lines.filter((_, j) => j !== i) })} />
            </div>
          ))}
          <Btn size="sm" icon={Icon.plus} onClick={() => setF({ ...f, lines: [...f.lines, { desc: "", unit: "nos", qty: "", rate: "" }] })}>Add line</Btn>
          <Field label="Terms"><TextArea rows={2} value={f.terms} onChange={(x) => setF({ ...f, terms: x })} /></Field>
        </div>
      </Modal>
    </Page>
  );
}

// ---------------------------------------------------------------- payment gate (Stop / Warn / override)
function paymentGate(st, inv) {
  const set0 = settingsOf(st);
  const v = byId(st.vendors, inv.vendorId);
  const stops = [], warns = [];
  const add = (mode, text) => (mode === "Stop" ? stops : mode === "Warn" ? warns : null)?.push(text);
  if (isBlockedFor(v, "Payments")) stops.push(`Vendor ${v.status.toLowerCase()}${v.hold ? ` (${v.hold.scope})` : ""}`);
  const comp = complianceOf(v);
  if (comp.blocking.length) add(set0.complianceGate, `Compliance: ${comp.blocking.slice(0, 2).join("; ")}${comp.blocking.length > 2 ? ` +${comp.blocking.length - 2} more` : ""}`);
  if (inv.hold && (!inv.hold.until || daysUntil(inv.hold.until) >= 0)) stops.push(`Invoice on hold — ${inv.hold.reason}${inv.hold.until ? ` until ${fmtDate(inv.hold.until)}` : ""}`);
  const defB = v.bankAccounts.find((b) => b.isDefault);
  if (!defB) stops.push("No default bank account");
  else if (bankStatus(defB) === "Rejected") stops.push("Default bank account failed verification");
  else if (bankStatus(defB) !== "Verified") warns.push("Default bank account not yet verified");
  if (defB && defB.disabled) stops.push("Default bank account is disabled");
  else if (defB && defB.paymentsEnabled === false) stops.push("Payments are switched off for the default bank account");
  if (defB && isForeign(v) && !defB.allowIntl) warns.push("International payments not enabled on the default bank account");
  if (v.frozen) stops.push("Vendor is frozen");
  if (inv.review === "Pending") stops.push("Vendor invoice on hold — waiting for AP review");
  if (inv.review === "Rejected") stops.push("Vendor invoice on hold — rejected by AP");
  if (inv.source === "Purchase Order") {
    const m = threeWay(st, inv);
    if (m.rows.some((r) => !r.qtyOk) && !m.qtyCovered) add(set0.threeWayQty, "Billed quantity exceeds accepted quantity");
    if (m.rows.some((r) => !r.rateOk)) add(set0.rateCheck, "Billed rate differs from PO rate");
  }
  return { stops, warns, all: [...stops, ...warns] };
}
// Odoo "Should Be Paid": Yes / No / Exception
function shouldBePaid(st, inv) {
  if (invoiceStatus(inv) === "Paid") return "No";
  const g = paymentGate(st, inv);
  return g.stops.length ? "No" : g.warns.length ? "Exception" : "Yes";
}
// Stops that no role may override
const hardStop = (x) => /hold|bank|^Vendor (on hold|blacklisted|disabled)/i.test(x);

function PayModal({ invIds, onClose }) {
  const st = useStore();
  const set0 = settingsOf(st);
  const canOverride = hasRole(set0.overrideRole);
  const invs = invIds.map((i) => byId(st.invoices, i));
  // Payment is released by Accounts / Finance, never by whoever entered or approved the bill
  const payBlock = (inv) => actBlock(PAY_ROLES, [inv.enteredBy, inv.review === "Accepted" ? inv.reviewedBy : null, inv.raBillId ? (byId(st.raBills, inv.raBillId)?.history || []).find((x) => x.status === "Approved")?.by : null], "releasing payment");
  const [mode, setMode] = y.useState("NEFT"), [date, setDate] = y.useState(todayISO());
  const [override, setOverride] = y.useState({});
  const rows = invs.map((inv) => {
    const t = invoiceTotals(inv), v = byId(st.vendors, inv.vendorId), gate = paymentGate(st, inv);
    const next = nextInstalment(inv);
    const payNow = next ? Math.min(t.balance, next.amount - next.paid) : t.balance;
    const tds = inv.source === "RA Bill" ? 0 : round2(((t.taxable * tdsRate(v.tds)) / 100) * (payNow / (t.payable || 1)));
    const hard = gate.stops.some(hardStop);
    const who = payBlock(inv);
    const blocked = !!who || (gate.stops.length > 0 && !(override[inv.id] && !hard));
    return { inv, v, t, gate, tds, payNow, net: round2(payNow - tds), blocked, hard, next, who };
  });
  const dateErr = VX.req(date) || VX.notFuture(date, "Payment date can't be in the future") || (invs.some((i) => date < i.date) ? `Payment date is before the bill date (${fmtDate(invs.map((i) => i.date).sort().pop())})` : "");
  const ok = dateErr ? [] : rows.filter((r) => !r.blocked && r.payNow > 0);
  return (
    <Modal open onClose={onClose} width={920} title={invIds.length > 1 ? `Payment run — ${invIds.length} bills` : `Record payment — ${invs[0].id}`}
      subtitle="TDS is withheld at payment for PO bills; RA bills already carry TDS. Pays the next due instalment where a schedule exists."
      footer={<><span className="mr-auto text-[13px]">Paying <b>{ok.length}</b> · net <b className="num">{inr(sum(ok, (r) => r.net))}</b></span><Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" disabled={!ok.length} onClick={() => {
          setState((s) => {
            let n = s.invoices.flatMap((i) => i.payments).length;
            for (const r of ok) {
              const x = byId(s.invoices, r.inv.id);
              x.payments.push({ id: `PAY-${String(++n).padStart(3, "0")}`, date, amount: r.net, tds: r.tds, mode, ref: `${mode}${Date.now().toString().slice(-8)}`, paidBy: currentUser(), ...(override[r.inv.id] ? { override: { by: currentUser(),  reason: override[r.inv.id], stops: r.gate.stops } } : {}) });
              if (x.raBillId && invoiceTotals(x).balance <= 0.5) { const b = byId(s.raBills, x.raBillId); b.status = "Paid"; b.history.push({ status: "Paid", by: currentUser(), at: new Date().toISOString(), remark: `${mode} payment` }); }
            }
          }, { entity: "Payment", id: ok.map((r) => r.inv.id).join(", "), action: `Paid via ${mode}${Object.keys(override).length ? ` (override by ${actor().name})` : ""}` });
          toast(`${ok.length} payment(s) recorded`); onClose();
        }}>Release payment</Btn></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Payment mode"><Select value={mode} onChange={setMode} options={PAY_MODES} /></Field>
          <Field label="Value date"><DateInput value={date} onChange={setDate} /><FieldErr m={dateErr} /></Field>
          <Field label="Released by"><span className="flex h-[32px] items-center text-[13px]">{actor().name}{canOverride && <span className="ml-2"><Status tone="purple">Can override</Status></span>}</span></Field>
        </div>
        <table className="w-full">
          <thead><tr><Th>Bill</Th><Th>Vendor</Th><Th align="right">Paying now</Th><Th align="right">TDS</Th><Th align="right">Net</Th><Th>Checks</Th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.inv.id}>
              <Td className="mono text-[12px]">{r.inv.id}{r.next && <span className="block text-[10.5px] text-ink-mute">instalment {r.next.n}</span>}</Td><Td>{r.v.name}</Td><Td align="right" className="num">{inr(r.payNow)}</Td>
              <Td align="right" className="num">{r.tds ? inr(r.tds) : "—"}</Td><Td align="right" className="num font-semibold">{inr(r.net)}</Td>
              <Td className="max-w-[340px] whitespace-normal">
                {r.who && <span className="block text-[12px] text-red-600">Stop: {r.who}</span>}
                {r.gate.all.length === 0 ? (!r.who && <Status tone="green">Clear</Status>) : <>
                  {r.gate.stops.map((x) => <span key={x} className="block text-[12px] text-red-600">Stop: {x}</span>)}
                  {r.gate.warns.map((x) => <span key={x} className="block text-[12px] text-amber-700">Warn: {x}</span>)}
                  {r.gate.stops.length > 0 && !r.hard && canOverride && (override[r.inv.id] !== undefined
                    ? <TextInput value={override[r.inv.id]} onChange={(x) => setOverride({ ...override, [r.inv.id]: x })} placeholder="Override reason (logged)" />
                    : <button className="mt-1 text-[12px] font-medium text-brand" onClick={() => setOverride({ ...override, [r.inv.id]: "" })}>Override with reason</button>)}
                  
                </>}
              </Td>
            </tr>))}</tbody>
        </table>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- vendor bills
function NewBillModal({ open, onClose, presetPoId }) {
  const st = useStore();
  const set0 = settingsOf(st);
  const [mode, setMode] = y.useState("po");
  const [poId, setPoId] = y.useState(presetPoId || "");
  const [vendorId, setVendorId] = y.useState("");
  const [f, setF] = y.useState({ number: "", date: todayISO(), gstPct: 18, lines: [] });
  const po = byId(st.purchaseOrders, poId);
  // Default lines = billable (accepted or ordered) minus already billed
  const linesFor = (id) => {
    const p0 = byId(getState().purchaseOrders, id);
    if (!p0) return { gstPct: 18, lines: [] };
    const all = getState().invoices;
    const billed = (i) => sum(all.filter((x) => x.poId === id).flatMap((x) => x.lines.filter((l) => l.line === i)), (l) => l.qty);
    const base = (l) => (p0.billingPolicy === "On ordered quantity" ? l.qty : l.accepted + (set0.billRejectedQty ? l.rejected : 0));
    return { gstPct: p0.gstPct ?? 18, lines: poReceived(p0).map((l, i) => ({ line: i, desc: l.desc, qty: Math.max(0, base(l) - billed(i)), rate: l.rate })) };
  };
  const pickPo = (id) => { setPoId(id); setF((ff) => ({ ...ff, ...linesFor(id) })); };
  y.useEffect(() => { if (open) { setMode("po"); setPoId(presetPoId || ""); setVendorId(""); setF({ number: "", date: todayISO(), ...linesFor(presetPoId) }); } }, [open]);
  const v = byId(st.vendors, mode === "po" ? po?.vendorId : vendorId);
  const directAllowed = !set0.poRequiredForBill || (v && v.allowBillWithoutPO);
  const noReceipt = po && po.billingPolicy !== "On ordered quantity" && po.receipts.length === 0;
  const receiptBlock = noReceipt && set0.receiptRequiredForBill && !(v && v.allowBillWithoutReceipt);
  const dup = v && f.number.trim() && st.invoices.find((i) => i.vendorId === v.id && i.review !== "Rejected" && normNo(i.number) === normNo(f.number));
  // Billable = what's left of the received (or ordered) quantity; the rate is checked against the PO
  const maxOf = (l) => (po ? Math.max(0, linesFor(po.id).lines.find((x) => x.line === l.line)?.qty ?? 0) : Infinity);
  const days = v ? parseInt(v.paymentTerms.replace(/\D/g, ""), 10) || 0 : 0;
  const autoDue = shiftDays(days, f.date || todayISO());
  const due = f.due || autoDue;
  const lineErr = f.lines.map((l, i) => mode === "po" ? (Number(l.qty) < 0 ? `Line ${i + 1}: quantity can't be negative` : Number(l.qty) > maxOf(l) + 0.001 ? `Line ${i + 1}: ${num(l.qty)} is more than the ${num(maxOf(l))} received and not yet billed` : Number(l.qty) > 0 && !(Number(l.rate) > 0) ? `Line ${i + 1}: rate must be greater than 0` : "")
    : !String(l.desc || "").trim() ? `Line ${i + 1}: description required` : !(Number(l.qty) > 0) ? `Line ${i + 1}: quantity must be greater than 0` : !(Number(l.rate) > 0) ? `Line ${i + 1}: rate must be greater than 0` : "");
  const rateWarn = po ? f.lines.filter((l) => Number(l.qty) > 0 && po.lines[l.line] && Number(l.rate) > po.lines[l.line].rate + 0.001).map((l) => `${l.desc}: billed rate ${inr(l.rate)} is above the PO rate ${inr(po.lines[l.line].rate)} — will fail 3-way match`) : [];
  const dateErr = VX.req(f.date) || VX.notFuture(f.date, "Invoice date can't be in the future") || (po && f.date < po.date ? `Invoice date is before the PO date (${fmtDate(po.date)})` : "") || VX.dateOrder(f.date, due, "Due date can't be before the invoice date");
  const ok = f.number.trim() && !dup && !dateErr && !lineErr.some(Boolean) && v && !isBlockedFor(v, "Invoices") && (mode === "po" ? po && f.lines.some((l) => l.qty > 0) && !receiptBlock : directAllowed && f.lines.some((l) => l.desc && l.qty > 0 && l.rate > 0));
  const save = () => {
    const id = nextId("INV", st.invoices);
    setState((s) => s.invoices.unshift({ id, vendorId: v.id, source: mode === "po" ? "Purchase Order" : "Direct", poId: mode === "po" ? poId : null, number: f.number.trim(), date: f.date, due, dueOverridden: !!f.due, gstPct: Number(f.gstPct), hold: null, notes: [], payments: [], schedule: null, enteredBy: currentUser(),
      lines: f.lines.filter((l) => l.qty > 0).map((l) => ({ line: l.line ?? null, desc: l.desc, qty: Number(l.qty), rate: Number(l.rate) })) }), { entity: "Invoice", id, action: `Bill ${f.number} entered${mode === "po" ? ` against ${poId}` : " without PO"}` });
    toast(`${id} created`); onClose();
  };
  return (
    <Modal open={open} onClose={onClose} width={780} title="Enter vendor bill" subtitle={set0.poRequiredForBill ? "PO required for bills (Procurement Settings) unless the vendor is exempt" : "Bills can be entered with or without a PO"}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={!ok} onClick={save}>Save bill</Btn></>}>
      <div className="space-y-3">
        {!presetPoId && (
          <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5">
            {[["po", "Against purchase order"], ["direct", "Without PO"]].map(([k, l]) => <button key={k} onClick={() => setMode(k)} className={cls("h-[28px] flex-1 rounded-md text-[13px]", mode === k ? "bg-white font-medium text-brand shadow-sm" : "text-ink-soft")}>{l}</button>)}
          </div>
        )}
        <div className="grid grid-cols-4 gap-3">
          {mode === "po"
            ? <Field label="Purchase order" span={2}><Select value={poId} disabled={!!presetPoId} placeholder="Select PO…" onChange={pickPo} options={st.purchaseOrders.filter((p) => !["Draft", "Cancelled"].includes(p.status)).map((p) => ({ value: p.id, label: `${p.id} — ${vendorName(st, p.vendorId)} (${poBillingStatus(st, p)})` }))} /></Field>
            : <Field label="Vendor" span={2}><Select value={vendorId} placeholder="Select vendor…" onChange={(x) => { setVendorId(x); setF({ ...f, lines: [{ desc: "", qty: 1, rate: "" }] }); }} options={st.vendors.filter((x) => x.status !== "Blacklisted").map((x) => ({ value: x.id, label: x.name }))} /></Field>}
          <Field label="Vendor invoice no." required><TextInput value={f.number} onChange={(x) => setF({ ...f, number: x })} /></Field>
          <Field label="Invoice date"><DateInput value={f.date} onChange={(x) => setF({ ...f, date: x })} /></Field>
          <Field label="Due date" hint={f.due ? `Overridden (terms give ${fmtDate(autoDue)})` : v ? `${v.paymentTerms} from invoice date` : ""}><DateInput value={due} onChange={(x) => setF({ ...f, due: x === autoDue ? "" : x })} /></Field>
        </div>
        {dateErr && <Note tone="red">{dateErr}</Note>}
        {lineErr.some(Boolean) && <Note tone="red">{lineErr.filter(Boolean).join(" · ")}</Note>}
        {rateWarn.length > 0 && <Note tone="amber">{rateWarn.join(" · ")}</Note>}
        {v && isBlockedFor(v, "Invoices") && <Note tone="red">{v.name} is blocked for invoices.</Note>}
        {dup && <Note tone="red">Invoice no. {f.number} from {v.name} is already recorded as {dup.id} ({fmtDate(dup.date)}). Duplicate bills can't be entered.</Note>}
        {mode === "direct" && v && !directAllowed && <Note tone="red">A PO is required for bills. Tick “Allow bills without PO” on this vendor, or change Procurement Settings.</Note>}
        {receiptBlock && <Note tone="red">Nothing received yet — Procurement Settings require a goods receipt before billing (vendor isn't exempt).</Note>}
        {noReceipt && !receiptBlock && <Note tone="amber">Billing before receipt is allowed for this vendor.</Note>}
        {mode === "po" && po && (
          <table className="w-full"><thead><tr><Th>Item</Th><Th align="right">Qty billed</Th><Th align="right">Rate billed</Th></tr></thead>
            <tbody>{f.lines.map((l, i) => <tr key={i}><Td>{l.desc}</Td>
              <Td align="right"><NumInput value={l.qty} onChange={(x) => setF({ ...f, lines: f.lines.map((z, j) => (j === i ? { ...z, qty: x } : z)) })} /></Td>
              <Td align="right"><NumInput value={l.rate} onChange={(x) => setF({ ...f, lines: f.lines.map((z, j) => (j === i ? { ...z, rate: x } : z)) })} /></Td></tr>)}</tbody></table>
        )}
        {mode === "direct" && v && directAllowed && (
          <div className="space-y-2">
            {f.lines.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_110px_140px] gap-2">
                <TextInput value={l.desc} onChange={(x) => setF({ ...f, lines: f.lines.map((z, j) => (j === i ? { ...z, desc: x } : z)) })} placeholder="Service / item" />
                <NumInput value={l.qty} onChange={(x) => setF({ ...f, lines: f.lines.map((z, j) => (j === i ? { ...z, qty: x } : z)) })} />
                <NumInput value={l.rate} onChange={(x) => setF({ ...f, lines: f.lines.map((z, j) => (j === i ? { ...z, rate: x } : z)) })} placeholder="Rate" />
              </div>
            ))}
            <Btn size="sm" icon={Icon.plus} onClick={() => setF({ ...f, lines: [...f.lines, { desc: "", qty: 1, rate: "" }] })}>Add line</Btn>
          </div>
        )}
        <div className="w-40"><Field label="GST %"><Select value={String(f.gstPct)} onChange={(x) => setF({ ...f, gstPct: Number(x) })} options={["0", "5", "12", "18", "28"]} /></Field></div>
      </div>
    </Modal>
  );
}

// Instalments: allocate payments FIFO across the schedule
function instalments(inv) {
  const t = invoiceTotals(inv);
  const sched = inv.schedule && inv.schedule.length ? inv.schedule : [{ due: inv.due, pct: 100 }];
  let paid = t.paid;
  return sched.map((s, i) => {
    const amount = round2((t.payable * s.pct) / 100);
    const p = Math.min(amount, Math.max(0, paid)); paid -= p;
    return { n: i + 1, due: s.due, pct: s.pct, amount, paid: p, status: p >= amount - 0.5 ? "Paid" : p > 0 ? "Partially Paid" : daysUntil(s.due) < 0 ? "Overdue" : "Unpaid" };
  });
}
const nextInstalment = (inv) => (inv.schedule && inv.schedule.length > 1 ? instalments(inv).find((x) => x.status !== "Paid") : null);

function InvoiceDrawer({ id, onClose }) {
  const st = useStore();
  const inv = byId(st.invoices, id);
  const [pay, setPay] = y.useState(false), [hold, setHold] = y.useState({ reason: HOLD_REASONS[0], note: "", until: shiftDays(14) }), [note, setNote] = y.useState(null);
  const [sched, setSched] = y.useState(null), [adv, setAdv] = y.useState(null), [wo, setWo] = y.useState(null);
  if (!inv) return null;
  const t = invoiceTotals(inv), m = threeWay(st, inv), gate = paymentGate(st, inv), status = invoiceStatus(inv), sbp = shouldBePaid(st, inv);
  const mut = (fn, action) => setState((s) => fn(byId(s.invoices, id)), { entity: "Invoice", id, action });
  const advances = st.vendorAdvances.filter((a) => a.vendorId === inv.vendorId).map((a) => ({ ...a, left: a.amount - sum(a.allocated, (x) => x.amount) })).filter((a) => a.left > 0.5);
  const holdActive = inv.hold && (!inv.hold.until || daysUntil(inv.hold.until) >= 0);
  const schedErr = (sc) => sc.map((z, i) => !z.due ? `#${i + 1}: due date required` : z.due < inv.date ? `#${i + 1}: due before the bill date (${fmtDate(inv.date)})` : i > 0 && sc[i - 1].due && z.due <= sc[i - 1].due ? `#${i + 1}: must fall after instalment #${i}` : !(Number(z.pct) > 0) ? `#${i + 1}: share must be greater than 0` : "");
  return (
    <Drawer open onClose={onClose} width={920} title={`${inv.id} · ${vendorName(st, inv.vendorId)}`}
      subtitle={<><Status>{status}</Status><span>{inv.source}{inv.poId ? ` ${inv.poId}` : inv.raBillId ? ` ${inv.raBillId}` : ""}</span><span>· vendor ref {inv.number}</span><span>· due {fmtDate(inv.due)}</span><span>· should be paid: <b className={cls(sbp === "No" ? "text-red-600" : sbp === "Exception" ? "text-amber-700" : "text-green-700")}>{sbp}</b></span></>}
      actions={t.balance > 0.5 && inv.review !== "Pending" && <Btn variant="primary" icon={Icon.rupee} onClick={() => setPay(true)}>Record payment</Btn>}>
      <div className="space-y-4 px-6 py-5">
        {inv.review && <VendorInvoiceReview inv={inv} />}
        <div className="grid grid-cols-4 gap-3">
          <StatTile tone="blue" label="Bill amount" value={inr(t.gross)} sub={inv.source === "RA Bill" ? "net of deductions" : `incl. GST ${inv.gstPct}%`} icon={Icon.receipt} />
          <StatTile tone="purple" label="Credit / debit notes" value={inr(t.notes)} icon={Icon.file} />
          <StatTile tone="green" label="Settled" value={inr(t.paid)} sub="payments + TDS + advances" icon={Icon.check} />
          <StatTile tone={t.balance > 0 ? "amber" : "green"} label="Balance" value={inr(t.balance)} icon={Icon.wallet} />
        </div>
        {gate.stops.length > 0 && t.balance > 0.5 && <Note tone="red" icon={Icon.lock}><b>Stop:</b> {gate.stops.join(" · ")}</Note>}
        {gate.warns.length > 0 && t.balance > 0.5 && <Note tone="amber"><b>Exception (warn):</b> {gate.warns.join(" · ")} — payment is allowed per Procurement Settings.</Note>}
        {inv.source === "Purchase Order" && (
          <Section title={`3-way match — ${m.status}`} icon={Icon.scale}>
            <DataTable dense rows={m.rows} rowKey={(_, i) => i} columns={[
              { key: "desc", label: "Item" },
              { key: "po", label: "PO qty × rate", align: "right", num: true, render: (r) => `${num(r.poQty)} × ${inr(r.poRate)}` },
              { key: "grn", label: "GRN accepted", align: "right", num: true, render: (r) => num(r.grnQty) },
              { key: "inv", label: "Invoice qty × rate", align: "right", num: true, render: (r) => <span className={cls((!r.qtyOk || !r.rateOk) && "font-semibold text-red-600")}>{num(r.invQty)} × {inr(r.invRate)}</span> },
              { key: "res", label: "Result", render: (r) => (r.qtyOk && r.rateOk ? <Status tone="green">Match</Status> : <Status tone="red">{!r.rateOk ? "Rate variance" : "Qty > accepted"}</Status>) },
            ]} />
          </Section>
        )}
        {inv.source === "RA Bill" && <Note>Raised automatically from certified RA bill <RefLink to={`${CL_BASE}/ra-bills?open=${inv.raBillId}`}>{inv.raBillId}</RefLink> — retention, advance recovery, TDS and cess are already deducted.</Note>}
        {inv.source === "Direct" && <Note>Direct bill without PO — allowed by settings / vendor exemption.</Note>}
        <Section title="Payment schedule" icon={Icon.calendar} actions={t.paid === 0 && <Btn size="sm" onClick={() => setSched((inv.schedule && inv.schedule.length ? inv.schedule : [{ due: inv.due, pct: 100 }]).map((x) => ({ ...x })))}>Split into instalments</Btn>}>
          <DataTable dense rows={instalments(inv)} rowKey={(r) => r.n} columns={[
            { key: "n", label: "#" }, { key: "due", label: "Due", render: (r) => fmtDate(r.due) }, { key: "pct", label: "Share", align: "right", render: (r) => `${r.pct}%` },
            { key: "amount", label: "Amount", align: "right", num: true, render: (r) => inr(r.amount) }, { key: "paid", label: "Settled", align: "right", num: true, render: (r) => inr(r.paid) },
            { key: "s", label: "Status", render: (r) => <Status>{r.status}</Status> },
          ]} />
        </Section>
        <Section title="Hold" icon={Icon.lock}>
          {holdActive ? (
            <div className="flex items-center justify-between gap-3 p-4">
              <span className="text-[13px]"><Status tone="amber">{inv.hold.reason}</Status> <span className="ml-2 text-ink-soft">{inv.hold.note}{inv.hold.until ? ` · auto-releases ${fmtDate(inv.hold.until)}` : ""}</span></span>
              <Btn variant="success" onClick={() => mut((x) => (x.hold = null), "Hold released")}>Release now</Btn>
            </div>
          ) : (
            <div className="grid grid-cols-[200px_1fr_160px_auto] items-end gap-3 p-4">
              <Field label="Reason code"><Select value={hold.reason} onChange={(x) => setHold({ ...hold, reason: x })} options={HOLD_REASONS} /></Field>
              <Field label="Note"><TextInput value={hold.note} onChange={(x) => setHold({ ...hold, note: x })} /></Field>
              <Field label="Release date"><DateInput value={hold.until} onChange={(x) => setHold({ ...hold, until: x })} /></Field>
              <Btn disabled={!hold.until || hold.until <= todayISO()} title={!hold.until || hold.until <= todayISO() ? "Release date must be in the future" : ""} onClick={() => mut((x) => (x.hold = { ...hold, at: new Date().toISOString() }), `Put on hold — ${hold.reason} until ${fmtDate(hold.until)}`)}>Put on hold</Btn>
            </div>
          )}
        </Section>
        <Section title="Credit / debit notes" icon={Icon.file} actions={<Btn size="sm" icon={Icon.plus} onClick={() => setNote({ type: "Debit Note", amount: "", reason: "" })}>Add note</Btn>}>
          <DataTable dense rows={inv.notes} empty={<p className="p-4 text-[13px] text-ink-mute">None.</p>} columns={[
            { key: "id", label: "No.", className: "mono text-[12px]" }, { key: "type", label: "Type", render: (n) => <span>{n.type}{n.auto && <span className="ml-1 text-[11px] text-ink-mute">(auto from return)</span>}</span> }, { key: "reason", label: "Reason", className: "whitespace-normal" },
            { key: "amount", label: "Amount", align: "right", num: true, render: (n) => inr(n.amount) },
          ]} />
        </Section>
        <Section title="Payments & adjustments" icon={Icon.rupee} actions={t.balance > 0.5 && <span className="flex gap-1">
          {advances.length > 0 && <Btn size="sm" onClick={() => setAdv({ advId: advances[0].id, amount: Math.min(advances[0].left, t.balance) })}>Adjust advance ({inrShort(sum(advances, (a) => a.left))})</Btn>}
          {t.balance <= 1000 && <Btn size="sm" onClick={() => setWo({ reason: "Round-off / small balance" })}>Write off {inr(t.balance)}</Btn>}
        </span>}>
          <DataTable dense rows={inv.payments} empty={<p className="p-4 text-[13px] text-ink-mute">No payments yet.</p>} columns={[
            { key: "id", label: "Ref", className: "mono text-[12px]" }, { key: "date", label: "Date", render: (p) => fmtDate(p.date) }, { key: "mode", label: "Mode" },
            { key: "ref", label: "Reference", className: "mono text-[12px]" },
            { key: "tds", label: "TDS withheld", align: "right", num: true, render: (p) => (p.tds ? inr(p.tds) : "—") },
            { key: "amount", label: "Amount", align: "right", num: true, render: (p) => inr(p.amount) },
            { key: "o", label: "", render: (p) => (p.override ? <span title={p.override.reason}><Status tone="purple">Override</Status></span> : null) },
          ]} />
        </Section>
      </div>
      {pay && <PayModal invIds={[id]} onClose={() => setPay(false)} />}
      {note && (
        <Modal open onClose={() => setNote(null)} width={520} title="Credit / debit note" footer={<><Btn onClick={() => setNote(null)}>Cancel</Btn><Btn variant="primary" disabled={!(note.amount > 0) || !!VX.reason(note.reason) || (note.type === "Debit Note" && Number(note.amount) > t.balance + 0.5)} onClick={() => {
          mut((x) => x.notes.push({ id: `${note.type === "Debit Note" ? "DN" : "CN"}-${String(st.invoices.flatMap((i) => i.notes).length + 1).padStart(3, "0")}`, ...note, amount: Number(note.amount), date: todayISO() }), `${note.type} added`);
          setNote(null);
        }}>Save</Btn></>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type"><Select value={note.type} onChange={(x) => setNote({ ...note, type: x })} options={["Debit Note", "Credit Note"]} /></Field>
            <Field label="Amount (₹, incl. GST)" required><NumInput value={note.amount} onChange={(x) => setNote({ ...note, amount: x })} /><FieldErr m={note.type === "Debit Note" && Number(note.amount) > t.balance + 0.5 ? `Debit note can't exceed the outstanding ${inr(t.balance)}` : note.amount !== "" && !(note.amount > 0) ? "Enter a non-zero value" : ""} /></Field>
            <Field label="Reason" span={2} required><TextInput value={note.reason} onChange={(x) => setNote({ ...note, reason: x })} /><FieldErr m={note.reason && VX.reason(note.reason)} /></Field>
          </div>
        </Modal>
      )}
      {sched && (
        <Modal open onClose={() => setSched(null)} width={560} title="Payment schedule (instalments)" subtitle="Shares must total 100%"
          footer={<><Btn onClick={() => setSched(null)}>Cancel</Btn><Btn variant="primary" disabled={sum(sched, (x) => x.pct) !== 100 || schedErr(sched).some(Boolean)} onClick={() => { mut((x) => (x.schedule = sched.map((z) => ({ due: z.due, pct: Number(z.pct) }))), `Split into ${sched.length} instalment(s)`); setSched(null); }}>Save schedule</Btn></>}>
          <div className="space-y-2">
            {sched.map((z, i) => (
              <div key={i} className="grid grid-cols-[40px_1fr_120px_28px] items-center gap-2 text-[13px]"><span>#{i + 1}</span>
                <DateInput value={z.due} onChange={(x) => setSched(sched.map((q, j) => (j === i ? { ...q, due: x } : q)))} />
                <NumInput value={z.pct} onChange={(x) => setSched(sched.map((q, j) => (j === i ? { ...q, pct: x } : q)))} />
                <IconBtn icon={Icon.trash} title="Remove" onClick={() => sched.length > 1 && setSched(sched.filter((_, j) => j !== i))} /></div>
            ))}
            <Btn size="sm" icon={Icon.plus} onClick={() => setSched([...sched, { due: shiftDays(30, sched[sched.length - 1].due), pct: 0 }])}>Add instalment</Btn>
            <p className={cls("text-[12px]", sum(sched, (x) => x.pct) === 100 ? "text-green-700" : "text-red-600")}>Shares total {sum(sched, (x) => x.pct)}%{sum(sched, (x) => x.pct) !== 100 ? " — must be 100%" : ""}</p>
            {schedErr(sched).some(Boolean) && <Note tone="red">{schedErr(sched).filter(Boolean).join(" · ")}</Note>}
          </div>
        </Modal>
      )}
      {adv && (
        <Modal open onClose={() => setAdv(null)} width={520} title="Adjust vendor advance against this bill" footer={<><Btn onClick={() => setAdv(null)}>Cancel</Btn><Btn variant="primary" disabled={!(adv.amount > 0) || Number(adv.amount) > (advances.find((a) => a.id === adv.advId)?.left || 0) + 0.5 || Number(adv.amount) > t.balance + 0.5} onClick={() => {
          setState((s) => { const a = byId(s.vendorAdvances, adv.advId); a.allocated.push({ invoiceId: id, amount: Number(adv.amount), date: todayISO() }); const x = byId(s.invoices, id); x.payments.push({ id: `ADJ-${a.id}`, date: todayISO(), amount: Number(adv.amount), tds: 0, mode: "Advance adjustment", ref: a.ref }); }, { entity: "Invoice", id, action: `Advance ${adv.advId} adjusted ${inr(adv.amount)}` });
          setAdv(null);
        }}>Adjust</Btn></>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Advance"><Select value={adv.advId} onChange={(x) => setAdv({ ...adv, advId: x })} options={advances.map((a) => ({ value: a.id, label: `${a.id} · ${inr(a.left)} left` }))} /></Field>
            <Field label="Amount to adjust"><NumInput value={adv.amount} onChange={(x) => setAdv({ ...adv, amount: x })} /><FieldErr m={Number(adv.amount) > (advances.find((a) => a.id === adv.advId)?.left || 0) + 0.5 ? `Only ${inr(advances.find((a) => a.id === adv.advId)?.left || 0)} is left on this advance` : Number(adv.amount) > t.balance + 0.5 ? `Exceeds the bill balance ${inr(t.balance)}` : ""} /></Field>
          </div>
        </Modal>
      )}
      {wo && (
        <Modal open onClose={() => setWo(null)} width={460} title={`Write off ${inr(t.balance)}`} footer={<><Btn onClick={() => setWo(null)}>Cancel</Btn><Btn variant="danger" disabled={!!VX.reason(wo.reason)} onClick={() => { mut((x) => x.payments.push({ id: `WO-${x.id}`, date: todayISO(), amount: t.balance, tds: 0, mode: "Write-off", ref: wo.reason }), `Balance ${inr(t.balance)} written off — ${wo.reason}`); setWo(null); }}>Write off</Btn></>}>
          <Field label="Reason"><TextInput value={wo.reason} onChange={(x) => setWo({ reason: x })} /></Field>
        </Modal>
      )}
    </Drawer>
  );
}

function InvoicesPage() {
  const st = useStore();
  const [open, setOpen] = useQueryOpen();
  const [sel, setSel] = y.useState([]), [run, setRun] = y.useState(false), [bill, setBill] = y.useState(false), [status, setStatus] = y.useState("All"), [adv, setAdv] = y.useState(null), [tab, setTab] = y.useState("bills");
  // Bills due within 7 days that pass every payment check (no stops, not waiting for AP review)
  const payable = st.invoices.filter((i) => !["Paid", "Awaiting Review", "Rejected"].includes(invoiceStatus(i)) && invoiceTotals(i).balance > 0.5 && daysUntil((nextInstalment(i) || {}).due || i.due) <= 7 && !paymentGate(st, i).stops.length);
  const advErr = adv ? { vendorId: VX.req(adv.vendorId), amount: VX.num(adv.amount, { gt: 0, label: "Amount" }), date: VX.req(adv.date) || VX.notFuture(adv.date, "Payment date can't be in the future"), ref: VX.req(adv.ref, "Enter the payment reference (UTR / cheque no.)") } : {};
  const rows = st.invoices.filter((i) => status === "All" || invoiceStatus(i) === status);
  const open$ = st.invoices.filter((i) => invoiceStatus(i) !== "Paid");
  const accrued = sum(st.measurements.filter((m) => m.jms.status === "Signed" && !m.billedIn), (m) => {
    const wo = byId(st.workOrders, m.woId);
    if (wo.type === "Lump Sum") return 0;
    return m.qty * (wo.items.find((i) => i.id === m.lineId)?.rate || 0);
  }) + sum(st.workOrders.filter((w) => w.type === "Lump Sum"), (wo) => woProgress(st, wo).measured - woProgress(st, wo).billed);
  const tdsFY = sum(st.invoices.flatMap((i) => i.payments), (p) => p.tds) + sum(st.raBills.filter((b) => ["Approved", "Paid"].includes(b.status)), (b) => b.ded.tds);
  return (
    <Page title="Invoices & Payments" subtitle="Vendor bills, 3-way matching, holds, instalments, advances, TDS and payment runs" icon={Icon.receipt}
      actions={<>
        <Btn icon={Icon.wallet} onClick={() => setAdv({ vendorId: "", amount: "", ref: "", note: "", date: todayISO() })}>Record advance</Btn>
        <Btn icon={Icon.plus} onClick={() => setBill(true)}>Enter vendor bill</Btn>
        <Btn icon={Icon.check} onClick={() => { if (sel.length) return setSel([]); const ids = payable.map((i) => i.id); setSel(ids); setTab("bills"); toast(ids.length ? `${ids.length} bill(s) due within 7 days and clear of payment checks selected` : "No bills are due and clear to pay", ids.length ? "green" : "amber"); }}>{sel.length ? "Clear selection" : "Select payable"}</Btn>
        <Btn variant="primary" icon={Icon.rupee} disabled={!sel.length} onClick={() => setRun(true)}>Payment run{sel.length ? ` (${sel.length})` : ""}</Btn>
      </>}>
      <TabBar active={tab} onChange={setTab} tabs={[{ id: "bills", label: "Bills", icon: Icon.receipt }, { id: "accruals", label: "Accruals", icon: Icon.book }]} />
      {tab === "accruals" && <AccrualsTab />}
      {tab === "bills" && <DataTable noun="bills" summary={(r) => [{ value: inrShort(sum(r, (i) => invoiceTotals(i).balance)), label: "outstanding" }, { value: inrShort(sum(st.vendorAdvances, (a) => a.amount - sum(a.allocated, (x) => x.amount))), label: "unadjusted advances" }]} filters={<><FilterSelect label="Status" value={status} onChange={setStatus} options={[{ value: "All", label: "All status" }, "Awaiting Review", "Unpaid", "Partially Paid", "Overdue", "On Hold", "Paid", "Rejected"]} /></>} rows={rows} onRow={(i) => setOpen(i.id)} columns={[
        { key: "sel", label: "", render: (i) => invoiceStatus(i) !== "Paid" && <input type="checkbox" className="h-4 w-4 accent-[#0b5ed7]" checked={sel.includes(i.id)} onClick={(e) => e.stopPropagation()} onChange={(e) => setSel(e.target.checked ? [...sel, i.id] : sel.filter((x) => x !== i.id))} /> },
        { key: "v", label: "Vendor", filterOptions: FO.vendors, filter: (x) => vendorName(st, x.vendorId), render: (i) => <span className="font-medium">{vendorName(st, i.vendorId)}</span> },
        { key: "src", label: "Against", filterOptions: FO.billType, filterLabel: "Bill type", filter: (i) => (i.source === "RA Bill" ? "RA bill" : i.source === "Direct" ? "Direct bill" : "Purchase order"), render: (i) => { const [a, b] = billAgainst(st, i); return <TwoLine a={a} b={b} />; } },
        { key: "number", label: "Vendor bill no.", className: "text-[12px]", render: (i) => (i.source === "RA Bill" ? <span className="text-ink-mute">Auto (from RA bill)</span> : i.number || <span className="text-ink-faint">—</span>) },
        { key: "amt", label: "Amount", align: "right", num: true, render: (i) => inr(invoiceTotals(i).payable) },
        { key: "bal", label: "Balance", align: "right", num: true, render: (i) => inr(invoiceTotals(i).balance) },
        { key: "due", label: "Next due", render: (i) => fmtDate((nextInstalment(i) || {}).due || i.due) },
        { key: "m", label: "Match", filterOptions: FO.match, filter: (i) => threeWay(st, i).status, render: (i) => { const s = threeWay(st, i).status; return <Status tone={s.startsWith("Matched") ? "green" : s === "Mismatch" ? "red" : "amber"}>{s}</Status>; } },
        { key: "sbp", label: "Should pay", filterOptions: FO.shouldPay, filterAll: "Should pay: any", filter: (i) => shouldBePaid(st, i), render: (i) => <Status tone={{ Yes: "green", No: "gray", Exception: "amber" }[shouldBePaid(st, i)]}>{shouldBePaid(st, i)}</Status> },
        { key: "s", label: "Status", render: (i) => <Status>{invoiceStatus(i)}</Status> },
      ]} />}
      {run && <PayModal invIds={sel} onClose={() => { setRun(false); setSel([]); }} />}
      <NewBillModal open={bill} onClose={() => setBill(false)} />
      {open && <InvoiceDrawer id={open} onClose={() => setOpen(null)} />}
      {adv && (
        <Modal open onClose={() => setAdv(null)} width={520} title="Record advance paid to vendor" subtitle="Adjust it later against the vendor's bills"
          footer={<><Btn onClick={() => setAdv(null)}>Cancel</Btn><Btn variant="primary" disabled={VX.any(advErr)} onClick={() => {
            const id = nextId("ADV", st.vendorAdvances);
            setState((s) => s.vendorAdvances.push({ id, ...adv, amount: Number(adv.amount), date: adv.date, allocated: [] }), { entity: "Advance", id, action: `${inr(adv.amount)} advance to ${vendorName(st, adv.vendorId)}` });
            setAdv(null); toast(`${id} recorded`);
          }}>Save</Btn></>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vendor" span={2}><Select value={adv.vendorId} placeholder="Select…" onChange={(x) => setAdv({ ...adv, vendorId: x })} options={st.vendors.filter((v) => v.status === "Active").map((v) => ({ value: v.id, label: v.name }))} /></Field>
            <Field label="Amount" required><NumInput value={adv.amount} onChange={(x) => setAdv({ ...adv, amount: x })} /><FieldErr m={adv.amount !== "" && advErr.amount} /></Field>
            <Field label="Payment date" required><DateInput value={adv.date} onChange={(x) => setAdv({ ...adv, date: x })} /><FieldErr m={advErr.date} /></Field>
            <Field label="Payment reference" required span={2}><TextInput value={adv.ref} onChange={(x) => setAdv({ ...adv, ref: x })} placeholder="UTR / cheque no." /></Field>
            <Field label="Note" span={2}><TextInput value={adv.note} onChange={(x) => setAdv({ ...adv, note: x })} /></Field>
          </div>
        </Modal>
      )}
    </Page>
  );
}

// ---------------------------------------------------------------- procurement settings
function ProcurementSettingsPage() {
  const st = useStore();
  const [f, setF] = y.useState(settingsOf(st));
  y.useEffect(() => setF(settingsOf(st)), [st.settings]);
  const set = (k) => (v) => setF({ ...f, [k]: v });
  const mode = (k, label, hint) => (
    <div className="grid grid-cols-[1fr_260px] items-center gap-4 border-b border-line px-4 py-3 last:border-0">
      <div><p className="text-[13px] font-medium">{label}</p><p className="text-[12px] text-ink-mute">{hint}</p></div>
      <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5">{["Stop", "Warn", "Off"].map((m) => <button key={m} onClick={() => setF({ ...f, [k]: m })} className={cls("h-[28px] flex-1 rounded-md text-[13px]", f[k] === m ? cls("bg-white font-medium shadow-sm", m === "Stop" ? "text-red-600" : m === "Warn" ? "text-amber-700" : "text-ink") : "text-ink-soft")}>{m}</button>)}</div>
    </div>
  );
  const yesNo = (k, label, hint) => (
    <div className="grid grid-cols-[1fr_260px] items-center gap-4 border-b border-line px-4 py-3 last:border-0">
      <div><p className="text-[13px] font-medium">{label}</p><p className="text-[12px] text-ink-mute">{hint}</p></div>
      <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5">{[[true, "Yes"], [false, "No"]].map(([v, l]) => <button key={l} onClick={() => setF({ ...f, [k]: v })} className={cls("h-[28px] flex-1 rounded-md text-[13px]", f[k] === v ? "bg-white font-medium text-brand shadow-sm" : "text-ink-soft")}>{l}</button>)}</div>
    </div>
  );
  return (
    <Page title="Procurement Settings" subtitle="Which checks stop a transaction, which only warn, and who may override — like ERPNext Buying Settings" icon={Icon.settings}
      actions={<Btn variant="primary" icon={Icon.save} onClick={() => { const e = flowErr(f.vendorFlow, "Vendor") || flowErr(f.contractFlow, "Contract") || benchSettingsErr(f); if (e) return toast(e, "red"); setState((s) => (s.settings = { ...f }), { entity: "Settings", id: "PROCUREMENT", action: `Procurement settings updated — vendor stages ${f.vendorFlow.map((x) => x.name).join(" → ")}; contract stages ${f.contractFlow.map((x) => x.name).join(" → ")}` }); toast("Settings saved"); }}>Save settings</Btn>}>
      <div className="grid grid-cols-2 gap-4 p-4">
        <Section title="Billing rules" icon={Icon.receipt}>
          {yesNo("poRequiredForBill", "Purchase order required for vendor bills", "Vendors can be exempted individually (Status & flags tab)")}
          {yesNo("receiptRequiredForBill", "Goods receipt required before billing", "Applies to POs billed on received quantity")}
          {yesNo("billRejectedQty", "Bill for rejected quantity", "If No, rejected quantity already billed gets an automatic debit note")}
        </Section>
        <Section title="Payment checks" icon={Icon.shieldCheck}>
          {mode("threeWayQty", "3-way match — quantity", "Billed quantity above accepted (GRN) quantity")}
          {mode("rateCheck", "Maintain same rate (PO → bill)", "Billed rate differs from PO rate")}
          {mode("complianceGate", "Vendor compliance gate", "Expired insurance / missing statutory documents")}
          <div className="grid grid-cols-[1fr_260px] items-center gap-4 px-4 py-3"><div><p className="text-[13px] font-medium">Rate tolerance (%)</p><p className="text-[12px] text-ink-mute">Differences within this % count as a match</p></div><NumInput value={f.rateTolerancePct} onChange={set("rateTolerancePct")} /></div>
        </Section>
        <Section title="Workflow gates" icon={Icon.clipboardCheck}>
          {mode("rfqComplianceGate", "Compliance at RFQ invite", "Blocking compliance failures or overdue requalification")}
          {mode("poComplianceGate", "Compliance at PO / contract", "Same checks when ordering or contracting")}
          {yesNo("requireDocsOnSubmit", "Required documents before submitting a registration", "Approvers never receive an empty record")}
          {yesNo("mobilisationBeforeWo", "Mobilisation checklist before the first work order", "Contractor Onboarding → mobilisation checklist must be complete")}
          {yesNo("qcBeforeBilling", "Quality inspection before RA billing", "Only measurements with a passed inspection can be billed")}
        </Section>
        <FlowEditor title="Vendor approval stages" hint="Each registration is routed through these stages in order. Records already in approval keep their stages."
          rows={f.vendorFlow} onChange={set("vendorFlow")} extra={{ key: "scope", label: "Applies to", options: ["All", "Contractors", "Non-contractors"], blank: "All" }} />
        <FlowEditor title="Contract approval stages" hint="A stage with a minimum value only applies to contracts at or above it. The last stage also checks the contractor gates."
          rows={f.contractFlow} onChange={set("contractFlow")} extra={{ key: "minValue", label: "Min value (₹)", num: true, blank: 0 }} />
        <Section title="Ordering & vendor access" icon={Icon.package}>
          <div className="grid grid-cols-2 gap-3 p-4">
            <Field label="Over-order allowance (%)" hint="Above RFQ / requisition quantity"><NumInput value={f.overOrderPct} onChange={set("overOrderPct")} /></Field>
            <Field label="Blanket order allowance (%)" hint="Call-offs above the agreed quantity"><NumInput value={f.blanketAllowancePct} onChange={set("blanketAllowancePct")} /></Field>
            <div className="col-span-2"><Check checked={f.quoteLogin} onChange={set("quoteLogin")} label="Vendors must sign in (one-time code) to open quote links" /></div>
          </div>
        </Section>
        <BenchmarkSettings f={f} setF={setF} mode={mode} yesNo={yesNo} />
        <ListEditor title="Vendor groups" icon={Icon.layers} hint={'Use "Parent › Child" (e.g. Material Suppliers › Steel). Picking a parent in filters includes all its children.'}
          items={f.vendorGroups} onChange={set("vendorGroups")} placeholder="Material Suppliers › Aluminium" usage={(g) => getState().vendors.filter((v) => inGroup(v, g)).length} />
        <ListEditor title="Our group companies" icon={Icon.building} hint="Vendors linked to one of these are inter-company suppliers: no RFQ needed, spend reported separately."
          items={f.groupCompanies} onChange={set("groupCompanies")} placeholder="NebullaOne Infra Ltd" usage={(g) => getState().vendors.filter((v) => v.parentCompany === g).length} />
      </div>
    </Page>
  );
}

// Approval stage list: add, rename, reorder, remove — at least one stage, names unique
function flowErr(rows, what) {
  if (!rows || !rows.length) return `${what} approval needs at least one stage`;
  if (rows.some((r) => !(r.name || "").trim())) return `${what} approval: every stage needs a name`;
  const n = rows.map((r) => r.name.trim().toLowerCase());
  if (new Set(n).size !== n.length) return `${what} approval: stage names must be unique`;
  if (rows.some((r) => r.minValue != null && r.minValue !== "" && !(Number(r.minValue) >= 0))) return `${what} approval: minimum value can't be negative`;
  if (what === "Vendor" && !rows.some((r) => (r.scope || "All") === "All") && !(rows.some((r) => r.scope === "Contractors") && rows.some((r) => r.scope === "Non-contractors"))) return "Vendor approval: every vendor must get at least one stage";
  if (what === "Contract" && !rows.some((r) => !(Number(r.minValue) > 0))) return "Contract approval: at least one stage must apply to every contract (minimum value 0)";
  return "";
}
function FlowEditor({ title, hint, rows, onChange, extra }) {
  const upd = (i, patch) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const move = (i, d) => { const a = rows.slice(); const [x] = a.splice(i, 1); a.splice(i + d, 0, x); onChange(a); };
  const err = flowErr(rows, title.startsWith("Vendor") ? "Vendor" : "Contract");
  return (
    <Section title={title} icon={Icon.clipboardCheck} actions={<Btn size="sm" icon={Icon.plus} onClick={() => onChange([...rows, { name: "", [extra.key]: extra.blank }])}>Add stage</Btn>}>
      <p className="border-b border-line px-4 py-2 text-[12px] text-ink-mute">{hint}</p>
      <div className="divide-y divide-line">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[28px_1fr_170px_auto] items-center gap-2 px-4 py-2">
            <span className="num text-[12px] text-ink-mute">L{i + 1}</span>
            <TextInput value={r.name} onChange={(x) => upd(i, { name: x })} placeholder="Stage name (e.g. Legal)" />
            {extra.num ? <NumInput value={r[extra.key]} onChange={(x) => upd(i, { [extra.key]: x })} placeholder={extra.label} />
              : <Select value={r[extra.key] || extra.blank} onChange={(x) => upd(i, { [extra.key]: x })} options={extra.options} />}
            <span className="flex gap-1">
              <Btn size="sm" disabled={i === 0} onClick={() => move(i, -1)} title="Move up">↑</Btn>
              <Btn size="sm" disabled={i === rows.length - 1} onClick={() => move(i, 1)} title="Move down">↓</Btn>
              <Btn size="sm" variant="danger" disabled={rows.length <= 1} onClick={() => onChange(rows.filter((_, j) => j !== i))}>Remove</Btn>
            </span>
          </div>
        ))}
      </div>
      <p className="border-t border-line px-4 py-2 text-[12px]">{err ? <span className="text-red-600">{err}</span> : <span className="text-ink-soft">Route: {rows.map((r) => r.name).join(" → ")}</span>}</p>
    </Section>
  );
}

function ListEditor({ title, icon, hint, items, onChange, placeholder, usage }) {
  const [nv, setNv] = y.useState("");
  const add = () => { const x = nv.trim().replace(/\s*>\s*/g, " › "); if (x && !items.includes(x)) onChange([...items, x].sort()); setNv(""); };
  return (
    <Section title={title} icon={icon}>
      <p className="border-b border-line px-4 py-2 text-[12px] text-ink-mute">{hint}</p>
      <ul className="max-h-[260px] divide-y divide-line overflow-y-auto">
        {items.map((g) => (
          <li key={g} className="flex items-center justify-between gap-2 px-4 py-1.5 text-[13px]">
            <span>{g}</span>
            <span className="flex items-center gap-2"><span className="text-[11.5px] text-ink-mute">{usage(g)} vendor(s)</span>
              <IconBtn icon={Icon.trash} title={usage(g) ? "In use — vendors keep their value" : "Remove"} onClick={() => onChange(items.filter((x) => x !== g))} /></span>
          </li>
        ))}
      </ul>
      <div className="flex gap-2 border-t border-line p-3"><TextInput value={nv} onChange={setNv} placeholder={placeholder} onKeyDown={(e) => e.key === "Enter" && add()} /><Btn icon={Icon.plus} disabled={!nv.trim()} onClick={add}>Add</Btn></div>
      <p className="px-4 pb-3 text-[11.5px] text-ink-mute">Click “Save settings” at the top to keep changes.</p>
    </Section>
  );
}

// Spend roll-up by vendor group, with group companies (inter-company) reported separately
function spendOf(st, vs) {
  const ids = new Set(vs.map((v) => v.id));
  const pos = st.purchaseOrders.filter((p) => ids.has(p.vendorId) && !["Draft", "Cancelled"].includes(p.status));
  const wos = st.workOrders.filter((w) => ids.has(w.vendorId) && w.status !== "Draft");
  const invs = st.invoices.filter((i) => ids.has(i.vendorId));
  const scores = vs.map((v) => vendorScore(st, v.id).score).filter((x) => x != null);
  return { vendors: vs.length, committed: sum(pos, poValue) + sum(wos, woValue), billed: sum(invs, (i) => invoiceTotals(i).payable), paid: sum(invs, (i) => invoiceTotals(i).paid),
    outstanding: sum(invs, (i) => invoiceTotals(i).balance), score: scores.length ? sum(scores, (x) => x) / scores.length : null };
}
function SpendByGroup({ onOpenVendor }) {
  const st = useStore();
  const [openG, setOpenG] = y.useState(null);
  const ext = st.vendors.filter((v) => !isGroupCompany(v)), intra = st.vendors.filter(isGroupCompany);
  const groups = [...new Set([...settingsOf(st).vendorGroups, ...ext.map((v) => v.group).filter(Boolean)])];
  const roots = [...new Set(groups.map(groupRoot))];
  const rows = [];
  for (const r of roots) {
    const kids = groups.filter((g) => g.startsWith(r + " › "));
    rows.push({ key: r, label: r, level: 0, vs: ext.filter((v) => inGroup(v, r)) });
    for (const k of kids) rows.push({ key: k, label: k.split(" › ")[1], level: 1, vs: ext.filter((v) => v.group === k) });
  }
  rows.push({ key: "__none", label: "Not grouped", level: 0, vs: ext.filter((v) => !v.group) });
  const data = rows.map((r) => ({ ...r, ...spendOf(st, r.vs) })).filter((r) => r.vendors > 0 || r.level === 0);
  const extTotal = spendOf(st, ext), intraTotal = spendOf(st, intra);
  const sel = openG && data.find((r) => r.key === openG);
  const cols = [
    { key: "label", label: "Vendor group", render: (r) => <span className={cls(r.level ? "pl-5 text-ink-soft" : "font-semibold")}>{r.level ? "└ " : ""}{r.label}</span> },
    { key: "vendors", label: "Vendors", align: "right" },
    { key: "c", label: "Committed (PO + WO)", align: "right", num: true, render: (r) => inrShort(r.committed) },
    { key: "b", label: "Billed", align: "right", num: true, render: (r) => inrShort(r.billed) },
    { key: "p", label: "Paid", align: "right", num: true, render: (r) => inrShort(r.paid) },
    { key: "o", label: "Outstanding", align: "right", num: true, render: (r) => inrShort(r.outstanding) },
    { key: "sh", label: "Share of external spend", render: (r) => <Progress value={Math.round(pct(r.committed, extTotal.committed))} /> },
    { key: "s", label: "Avg score", render: (r) => <ScoreBadge value={r.score} /> },
  ];
  return (
    <div className="space-y-4 p-4">
      <Section title="Spend by vendor group — external vendors" icon={Icon.layers} actions={<span className="text-[12px] text-ink-mute">Click a group to see its vendors · groups are managed in Procurement Settings</span>}>
        <DataTable plain rows={data} rowKey={(r) => r.key} onRow={(r) => setOpenG(r.key)} columns={cols}
          footer={<tfoot className="border-t border-line bg-gray-50/60 text-[13px] font-semibold"><tr><td className="px-4 py-2">Total external</td><td className="px-4 py-2 text-right">{extTotal.vendors}</td><td className="num px-4 py-2 text-right">{inrShort(extTotal.committed)}</td><td className="num px-4 py-2 text-right">{inrShort(extTotal.billed)}</td><td className="num px-4 py-2 text-right">{inrShort(extTotal.paid)}</td><td className="num px-4 py-2 text-right">{inrShort(extTotal.outstanding)}</td><td /><td /></tr></tfoot>} />
      </Section>
      <Section title="Inter-company — group companies (reported separately)" icon={Icon.building}>
        <DataTable plain rows={intra.map((v) => ({ v, ...spendOf(st, [v]) }))} rowKey={(r) => r.v.id} onRow={(r) => onOpenVendor(r.v.id)}
          empty={<p className="p-4 text-[13px] text-ink-mute">No group-company vendors. Set “Internal parent company” on a vendor (Edit details) to mark it as one of ours.</p>} columns={[
          { key: "n", label: "Vendor", render: (r) => <span className="font-medium">{r.v.name}</span> }, { key: "p", label: "Parent (our company)", render: (r) => r.v.parentCompany },
          { key: "c", label: "Committed", align: "right", num: true, render: (r) => inrShort(r.committed) }, { key: "b", label: "Billed", align: "right", num: true, render: (r) => inrShort(r.billed) },
          { key: "o", label: "Outstanding", align: "right", num: true, render: (r) => inrShort(r.outstanding) },
        ]} />
      </Section>
      {sel && (
        <Modal open onClose={() => setOpenG(null)} width={760} title={sel.key === "__none" ? "Vendors not grouped" : sel.key} subtitle={`${sel.vendors} vendor(s) · committed ${inrShort(sel.committed)}`}>
          <DataTable dense rows={sel.vs.map((v) => ({ v, ...spendOf(st, [v]) }))} rowKey={(r) => r.v.id} onRow={(r) => { setOpenG(null); onOpenVendor(r.v.id); }}
            empty={<p className="p-4 text-[13px] text-ink-mute">No vendors in this group yet.</p>} columns={[
            { key: "n", label: "Vendor", render: (r) => <span className="font-medium">{r.v.name}</span> }, { key: "g", label: "Group", className: "text-[12px]", render: (r) => r.v.group || "—" },
            { key: "c", label: "Committed", align: "right", num: true, render: (r) => inrShort(r.committed) }, { key: "o", label: "Outstanding", align: "right", num: true, render: (r) => inrShort(r.outstanding) },
            { key: "s", label: "Score", render: (r) => <ScoreBadge value={r.score} /> },
          ]} />
        </Modal>
      )}
    </div>
  );
}

// AP review of an invoice the vendor submitted in the portal
function VendorInvoiceReview({ inv }) {
  const [remark, setRemark] = y.useState("");
  if (inv.review === "Accepted") return <Note tone="green" icon={Icon.check}>Submitted by the vendor in the portal ({inv.submittedBy}); accepted by {inv.reviewedBy} on {fmtDate(inv.reviewedAt)}.{inv.attachment && <> <FileLink name={inv.attachment.name} dataUrl={inv.attachment.dataUrl} /></>}</Note>;
  if (inv.review === "Rejected") return <Note tone="red">Rejected by {inv.reviewedBy}: {inv.reviewRemark}. The vendor can submit a corrected invoice.</Note>;
  return (
    <Section title="Vendor-submitted invoice — AP review" icon={Icon.clipboardCheck}>
      <div className="space-y-3 p-4">
        <p className="text-[13px] text-ink-soft">Submitted in the portal by <b>{inv.submittedBy}</b> on {fmtDate(inv.date)}.{inv.attachment && <> Copy: <FileLink name={inv.attachment.name} dataUrl={inv.attachment.dataUrl} /></>} Check it against the PO and goods receipt (3-way match below), then accept or reject.</p>
        <ActNote roles={["Accounts", "Finance Controller"]} involved={[]} what="reviewing vendor invoices" />
        <div className="grid grid-cols-[1fr_auto_auto] items-end gap-2">
          <Field label="AP remark"><TextInput value={remark} onChange={setRemark} placeholder="Required to reject" /></Field>
          <Btn variant="danger" disabled={!remark.trim()} onClick={() => reviewVendorInvoice(inv, false, remark.trim())}>Reject</Btn>
          <Btn variant="success" icon={Icon.check} onClick={() => reviewVendorInvoice(inv, true, remark.trim())}>Accept invoice</Btn>
        </div>
      </div>
    </Section>
  );
}

// Month-end accruals: goods received but not billed + work measured (JMS signed) but not billed
function accrualRows(st) {
  const out = [];
  for (const p of st.purchaseOrders.filter((x) => !["Draft", "Cancelled"].includes(x.status))) poReceived(p).forEach((l, i) => {
    const billed = sum(st.invoices.filter((q) => q.poId === p.id && q.review !== "Rejected").flatMap((q) => q.lines.filter((e) => e.line === i)), (e) => e.qty);
    const un = Math.max(0, l.accepted - billed);
    if (un > 1e-9) out.push({ id: `${p.id}-${i}`, src: "Goods received, not billed", ref: p.id, vendorId: p.vendorId, project: p.project, desc: l.desc, qty: un, unit: l.unit, rate: l.rate, amount: round2(un * l.rate), since: p.receipts.filter((r) => r.lines.some((e) => e.line === i)).map((r) => r.date).sort()[0] });
  });
  for (const m of st.measurements.filter((x) => x.jms.status === "Signed" && !x.billedIn && !x.voided)) {
    const w = byId(st.workOrders, m.woId); if (!w) continue;
    if (w.type === "Lump Sum") continue;
    const it = w.items.find((c) => c.id === m.lineId); if (!it) continue;
    out.push({ id: m.id, src: "Work measured (JMS signed), not billed", ref: `${m.id} / ${w.id}`, vendorId: w.vendorId, project: w.project, desc: it.desc, qty: m.qty, unit: it.unit, rate: it.rate, amount: round2(m.qty * it.rate), since: m.date });
  }
  for (const w of st.workOrders.filter((x) => x.type === "Lump Sum" && x.status !== "Draft")) {
    const pr = woProgress(st, w), amt = round2(pr.measured - pr.billed);
    if (amt > 0.5) out.push({ id: w.id + "-ls", src: "Work measured (JMS signed), not billed", ref: w.id, vendorId: w.vendorId, project: w.project, desc: `${w.title} — milestones measured, not billed`, qty: null, unit: "", rate: null, amount: amt, since: null });
  }
  return out;
}
function AccrualsTab() {
  const st = useStore();
  const rows = accrualRows(st);
  return (
    <>
      <div className="px-4 pt-3"><Note icon={Icon.book}>Month-end liability to accrue: <b>{inr(sum(rows, (r) => r.amount))}</b> ({inr(sum(rows.filter((r) => r.src.startsWith("Goods")), (r) => r.amount))} goods received, {inr(sum(rows.filter((r) => r.src.startsWith("Work")), (r) => r.amount))} work measured). Clears automatically when the vendor bill or RA bill is entered.</Note></div>
      <DataTable noun="accrual lines" exportName="accruals" rows={rows} empty={<EmptyState icon={Icon.check} title="Nothing to accrue" text="Every receipt and signed measurement has been billed." />}
        summary={(r) => [{ value: inrShort(sum(r, (x) => x.amount)), label: "to accrue" }]} columns={[
        { key: "src", label: "Source", filterOptions: ["Goods received, not billed", "Work measured (JMS signed), not billed"], filter: true, filterLabel: "Source" },
        { key: "ref", label: "Reference", className: "mono text-[12px]" },
        { key: "v", label: "Vendor", filterOptions: FO.vendors, filter: (r) => vendorName(st, r.vendorId), render: (r) => vendorName(st, r.vendorId) },
        { key: "project", label: "Project", filterOptions: FO.projects, filter: true },
        { key: "desc", label: "Item", className: "max-w-[280px] truncate" },
        { key: "q", label: "Unbilled qty", align: "right", num: true, render: (r) => (r.qty == null ? "—" : `${num(r.qty, 3)} ${r.unit}`) },
        { key: "r", label: "Rate", align: "right", num: true, render: (r) => (r.rate == null ? "—" : inr(r.rate)) },
        { key: "amount", label: "Amount", align: "right", num: true, render: (r) => <b>{inr(r.amount)}</b> },
        { key: "since", label: "Since", render: (r) => fmtDate(r.since) },
      ]} />
    </>
  );
}
