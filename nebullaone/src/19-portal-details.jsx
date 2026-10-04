// Supplier-portal detail pages: what a vendor sees when they open a PO, work
// order, RA claim, RA bill, bill/payment, document or query from the portal.
// Read-only views of the buyer's records, with the actions a vendor may take.

const lineName = (p) => p.line.name || `${p.line.code} · ${p.line.desc}`;
const EmptyRow = ({ text }) => <p className="p-4 text-[13px] text-ink-mute">{text}</p>;

// ---------------------------------------------------------------- purchase order
function PortalPoDrawer({ id, onClose, open }) {
  const st = useStore();
  const po = byId(st.purchaseOrders, id);
  const [tab, setTab] = y.useState("lines"), [send, setSend] = y.useState(false);
  if (!po) return null;
  const rec = poReceived(po), v = byId(st.vendors, po.vendorId);
  const canSend = !["Draft", "Closed", "Cancelled"].includes(po.status) && !isBlockedFor(v, "All") && rec.some((_, i) => dispatchRoom(po, i) > 0);
  const invs = st.invoices.filter((i) => i.poId === po.id);
  const billedQty = (i) => sum(invs.flatMap((x) => x.lines.filter((z) => z.line === i)), (z) => z.qty);
  const gst = sum(invs, (i) => invoiceTotals(i).gst);
  const tabs = [
    { id: "lines", label: "Items" },
    { id: "dsp", label: "Dispatch notices" },
    { id: "grn", label: "Deliveries", count: po.receipts.length },
    ...((po.returns || []).length ? [{ id: "ret", label: "Returns", count: po.returns.length }] : []),
    { id: "bills", label: "Bills", count: invs.length },
    { id: "terms", label: "Terms" },
    { id: "rev", label: "Revisions", count: po.revisions.length },
  ];
  return (
    <Drawer open onClose={onClose} width={920} title={po.project} recordId={po.id} status={<Status>{poStatus(po)}</Status>} details={[poDispatchState(st, po) && ["Delivery", <PoDispatchChip st={st} po={po} />], ["Billing", <Status tone="blue">{poBillingStatus(st, po)}</Status>], ["Deliver to", po.project], ["Delivery by", fmtDate(po.deliveryDate)], ["Issued", fmtDate(po.date)]]} tabs={{ tabs, active: tab, onChange: setTab }}
      actions={canSend && <Btn variant="primary" icon={Icon.truck} onClick={() => setSend(true)}>Send dispatch notice</Btn>}>
      <div className="space-y-4 px-6 py-5">
        <div className="grid grid-cols-4 gap-3">
          <StatTile tone="blue" label="Order value" value={inrShort(poValue(po))} sub="excl. GST" icon={Icon.package} />
          <StatTile tone="green" label="Delivered" value={`${pct(sum(rec, (l) => l.received), sum(rec, (l) => l.qty))}%`} icon={Icon.truck} />
          <StatTile tone="red" label="Rejected" value={num(sum(rec, (l) => l.rejected))} sub="units" icon={Icon.fileX} />
          <StatTile tone="purple" label="Billed" value={inrShort(sum(invs, (i) => invoiceTotals(i).taxable))} sub={gst ? `+ GST ${inrShort(gst)}` : "excl. GST"} icon={Icon.receipt} />
        </div>
        {tab === "lines" && (
          <Section title="Ordered vs delivered vs billed" icon={Icon.boxes}>
            <DataTable dense rows={rec} rowKey={(_, i) => i} columns={[
              { key: "desc", label: "Item", className: "font-medium" },
              { key: "qty", label: "Ordered", align: "right", num: true, render: (l) => `${num(l.qty)} ${l.unit}` },
              { key: "rate", label: "Rate", align: "right", num: true, render: (l) => inr(l.rate) },
              { key: "amt", label: "Amount", align: "right", num: true, render: (l) => inr(l.qty * l.rate) },
              { key: "received", label: "Delivered", align: "right", num: true, render: (l) => num(l.received) },
              { key: "accepted", label: "Accepted", align: "right", num: true, render: (l) => num(l.accepted) },
              { key: "rejected", label: "Rejected", align: "right", num: true, render: (l) => (l.rejected ? <span className="text-red-600">{num(l.rejected)}</span> : "0") },
              { key: "b", label: "Billed", align: "right", num: true, render: (l, i) => num(billedQty(i)) },
              { key: "p", label: "To deliver", align: "right", num: true, render: (l) => num(Math.max(0, l.qty - l.received)) },
            ]} />
          </Section>
        )}
        {tab === "dsp" && <DispatchSection po={po} portal />}
        {tab === "grn" && (
          <Section title="Goods receipts at site" icon={Icon.truck}>
            <DataTable dense rows={po.receipts} empty={<EmptyRow text="Nothing delivered yet." />} columns={[
              { key: "id", label: "GRN", className: "mono text-[12px]" }, { key: "date", label: "Received on", render: (r) => fmtDate(r.date) },
              { key: "i", label: "Items", className: "whitespace-normal text-[12.5px]", render: (r) => r.lines.map((l) => `${po.lines[l.line].desc}: ${num(l.qty)} (${num(l.accepted)} accepted)`).join(" · ") },
              { key: "qc", label: "Quality check", render: (r) => <Status tone={r.qc === "Passed" ? "green" : r.qc === "Failed" ? "red" : "amber"}>{r.qc}</Status> },
              { key: "ot", label: "On time", render: (r) => (new Date(r.date) <= new Date(po.deliveryDate) ? <Status tone="green">On time</Status> : <Status tone="amber">Late</Status>) },
            ]} />
          </Section>
        )}
        {tab === "ret" && (
          <Section title="Returned to you" icon={Icon.fileX}>
            <DataTable dense rows={po.returns} columns={[
              { key: "id", label: "Return", className: "mono text-[12px]" }, { key: "g", label: "GRN", className: "mono text-[12px]", render: (r) => r.grnId },
              { key: "i", label: "Item", render: (r) => po.lines[r.line].desc }, { key: "q", label: "Qty", align: "right", num: true, render: (r) => `${num(r.qty)} ${po.lines[r.line].unit}` },
              { key: "r", label: "Reason", className: "whitespace-normal text-[12px]", render: (r) => r.reason }, { key: "l", label: "Collect from", className: "text-[12px]", render: (r) => r.location },
              { key: "dn", label: "Debit note", render: (r) => (r.debitNote ? <Status tone="purple">{r.debitNote}</Status> : <span className="text-[12px] text-ink-mute">Adjusted at billing</span>) },
            ]} />
          </Section>
        )}
        {tab === "bills" && (
          <Section title="Your bills against this PO" icon={Icon.receipt}>
            <DataTable dense rows={invs} onRow={(i) => open("inv", i.id)} empty={<EmptyRow text="No bills submitted yet." />} columns={[
              { key: "number", label: "Your bill no.", className: "mono text-[12px]" }, { key: "d", label: "Date", render: (i) => fmtDate(i.date) },
              { key: "a", label: "Amount", align: "right", num: true, render: (i) => inr(invoiceTotals(i).payable) },
              { key: "b", label: "Balance", align: "right", num: true, render: (i) => inr(invoiceTotals(i).balance) },
              { key: "s", label: "Status", render: (i) => <Status>{invoiceStatus(i)}</Status> },
            ]} />
          </Section>
        )}
        {tab === "terms" && (
          <Section title="Order terms" icon={Icon.file}>
            <KV items={[
              ["PO number", po.id], ["Issued on", fmtDate(po.date)], ["Deliver to", po.project], ["Delivery by", fmtDate(po.deliveryDate)],
              ["Billing", po.billingPolicy || "On received quantity"], ["Receipt tolerance", `${po.tolerance || 0}%`],
              ["Source", po.rfqId ? `RFQ ${po.rfqId}` : po.blanketId ? `Blanket order ${po.blanketId}` : "Direct"], ["Your quote ref", po.quoteNo || "-"],
              ["Payment terms", byId(st.vendors, po.vendorId).paymentTerms || "-"],
            ]} />
          </Section>
        )}
        {tab === "rev" && (
          <Section title="Revision history" icon={Icon.branch}>
            <AuditList items={po.revisions.slice().reverse().map((r) => ({ id: `Rev ${r.rev}`, action: r.note, by: r.by, at: r.at }))} />
          </Section>
        )}
      </div>
      {send && <DispatchModal po={po} by={`${v.name} (portal)`} onClose={() => { setSend(false); setTab("dsp"); }} />}
    </Drawer>
  );
}

// ---------------------------------------------------------------- work order
function PortalWoDrawer({ id, onClose, open, onAccept, onDecline, onClaim }) {
  const st = useStore();
  const wo = byId(st.workOrders, id);
  const [tab, setTab] = y.useState("scope");
  const [dis, setDis] = y.useState(null), [dpr, setDpr] = y.useState(null);
  if (!wo) return null;
  const pos = woPosition(st, wo), pr = woProgress(st, wo);
  const c = byId(st.contracts, wo.contractId);
  const mbs = st.measurements.filter((m) => m.woId === id).slice().sort((a, b) => b.date.localeCompare(a.date));
  const bills = st.raBills.filter((b) => b.woId === id);
  const claims = st.claims.filter((x) => x.woId === id);
  const ls = wo.type === "Lump Sum";
  const lineOf = (lineId) => pos.find((p) => p.line.id === lineId);
  const ncrs = (st.ncrs || []).filter((n) => n.woId === id);
  const dprs = (st.dprs || []).filter((d) => d.woId === id).slice().sort((a, b) => b.date.localeCompare(a.date));
  const me = getVendorSession()?.email || byId(st.vendors, wo.vendorId)?.contact.name || "Contractor";
  const canWork = woAccepted(wo) && ["Issued", "In Progress"].includes(wo.status) && !isBlockedFor(byId(st.vendors, wo.vendorId), "All");
  const tabs = [
    { id: "scope", label: ls ? "Milestones" : "BOQ items" },
    { id: "mb", label: "Measurements", count: mbs.filter((m) => m.jms.status === "Pending" && !m.jms.contractorAgreed).length ? `${mbs.filter((m) => m.jms.status === "Pending" && !m.jms.contractorAgreed).length} to agree` : mbs.length },
    { id: "ncr", label: "NCRs", count: ncrs.filter((n) => n.status === "Open").length || null },
    { id: "dpr", label: "Daily reports", count: dprs.length || null },
    { id: "claims", label: "Claims", count: claims.length },
    { id: "bills", label: "RA bills", count: bills.length },
    { id: "terms", label: "Contract terms" },
  ];
  return (
    <Drawer open onClose={onClose} width={980} title={wo.title} recordId={wo.id} status={<Status>{wo.status}</Status>} details={[["Type", wo.type], ["Location", wo.location], ["Period", `${fmtDate(wo.start)} → ${fmtDate(wo.end)}`]]} tabs={{ tabs, active: tab, onChange: setTab }}
     
      actions={wo.acceptance?.status === "Pending" ? <><Btn variant="danger" onClick={() => onDecline(wo)}>Decline</Btn><Btn variant="success" icon={Icon.check} onClick={() => onAccept(wo)}>Accept work order</Btn></>
        : woAccepted(wo) && ["Issued", "In Progress"].includes(wo.status) ? <Btn variant="primary" icon={Icon.receipt} onClick={() => onClaim(wo.id)}>Submit RA claim</Btn> : null}>
      <div className="space-y-4 px-6 py-5">
        {wo.acceptance?.status === "Pending" && <Note tone="amber">Please review the scope, rates and terms and accept this work order. Measurements and claims open once you accept.</Note>}
        {wo.acceptance?.status === "Declined" && <Note tone="red">You declined this work order: {wo.acceptance.reason}</Note>}
        {woAccepted(wo) && <Note tone="green" icon={Icon.check}>Accepted by {wo.acceptance.by} on {fmtDate(wo.acceptance.at)}.</Note>}
        <div className="grid grid-cols-4 gap-3">
          <StatTile tone="blue" label="Work order value" value={inrShort(pr.value)} sub="excl. GST" icon={Icon.file} />
          <StatTile tone="purple" label="Planned progress" value={`${pr.planned.toFixed(0)}%`} icon={Icon.calendar} />
          <StatTile tone={pr.spi >= 0.95 ? "green" : pr.spi >= 0.8 ? "amber" : "red"} label="Work measured" value={`${pr.physical.toFixed(1)}%`} sub={`SPI ${pr.spi.toFixed(2)}`} icon={Icon.ruler} />
          <StatTile tone="cyan" label="Billed" value={`${pr.financial.toFixed(1)}%`} sub={inrShort(pr.billed)} icon={Icon.receipt} />
        </div>
        {tab === "scope" && (
          <Section title={ls ? `Milestones - lump sum ${inr(wo.lumpSum)}` : "Items - quantity, rate, measured and billed"} icon={Icon.listChecks}>
            <DataTable dense rows={pos} rowKey={(p) => p.line.id} columns={ls ? [
              { key: "n", label: "Milestone", className: "whitespace-normal", render: (p) => p.line.name },
              { key: "w", label: "Weight", align: "right", render: (p) => `${p.line.weight}%` },
              { key: "a", label: "Amount", align: "right", num: true, render: (p) => inr(p.value) },
              { key: "m", label: "Measured", render: (p) => <Progress value={p.measured} color="bg-violet-500" /> },
              { key: "b", label: "Billed", render: (p) => <Progress value={p.billed} /> },
            ] : [
              { key: "c", label: "Code", render: (p) => <span className="mono text-[12px]">{p.line.code}</span> },
              { key: "d", label: "Item", className: "whitespace-normal", render: (p) => p.line.desc },
              { key: "q", label: "WO qty", align: "right", num: true, render: (p) => `${num(p.total)} ${p.unit}` },
              { key: "r", label: "Rate", align: "right", num: true, render: (p) => inr(p.line.rate) },
              { key: "a", label: "Amount", align: "right", num: true, render: (p) => inr(p.total * p.line.rate) },
              { key: "m", label: "Measured", align: "right", num: true, render: (p) => num(p.measured) },
              { key: "b", label: "Billed", align: "right", num: true, render: (p) => num(p.billed) },
              { key: "p", label: "Progress", render: (p) => <Progress value={Math.round(pct(p.measured, p.total))} /> },
            ]} />
          </Section>
        )}
        {tab === "mb" && (
          <Section title="Measurement book - joint measurement status" icon={Icon.ruler}>
            <DataTable dense rows={mbs} empty={<EmptyRow text="No measurements recorded yet." />} columns={[
              { key: "id", label: "MB", className: "mono text-[12px]" }, { key: "date", label: "Date", render: (m) => fmtDate(m.date) },
              { key: "i", label: ls ? "Milestone" : "Item", className: "max-w-[240px] whitespace-normal", render: (m) => (lineOf(m.lineId) ? lineName(lineOf(m.lineId)) : m.lineId) },
              { key: "loc", label: "Location", className: "text-[12px]" },
              { key: "q", label: "Qty", align: "right", num: true, render: (m) => (ls ? `${m.pct}%` : `${num(m.qty, 3)} ${lineOf(m.lineId)?.unit || ""}`) },
              { key: "j", label: "JMS", render: (m) => <span className="flex flex-col"><Status tone={{ Signed: "green", Pending: "amber", Disputed: "red" }[m.jms.status]}>{m.jms.status}</Status>{m.jms.status === "Disputed" && <span className="text-[11px] text-red-600">{m.jms.remark}</span>}</span> },
              { key: "b", label: "Billed in", render: (m) => (m.billedIn ? <button className="mono text-[12px] font-medium text-brand hover:underline" onClick={() => open("bill", m.billedIn)}>{m.billedIn}</button> : <span className="text-[12px] text-ink-mute">Not billed</span>) },
              { key: "a", label: "Your JMS sign-off", align: "right", render: (m) => m.jms.status !== "Pending" ? (m.jms.contractorAgreed ? <span className="text-[12px] text-green-700">Agreed</span> : null)
                : m.jms.contractorAgreed ? <span className="text-[12px] text-green-700">Agreed {fmtDate(m.jms.contractorAgreed.at)} - engineer to countersign</span>
                : <span className="flex justify-end gap-1"><Btn size="sm" variant="success" onClick={() => contractorJms(m, true, "", me)}>Agree</Btn><Btn size="sm" variant="danger" onClick={() => setDis({ m, reason: "" })}>Dispute</Btn></span> },
            ]} />
          </Section>
        )}
        {tab === "ncr" && <Section title="Non-conformance reports" icon={Icon.shieldCheck}><NcrTable rows={ncrs} portal by={me} /></Section>}
        {tab === "dpr" && (
          <Section title="Daily progress reports" icon={Icon.calendar} actions={canWork && <Btn size="sm" icon={Icon.plus} onClick={() => setDpr({ date: todayISO(), manpower: "", work: "", hindrance: "", weather: "" })}>Submit daily report</Btn>}>
            <DataTable dense rows={dprs} empty={<EmptyRow text="No daily reports yet." />} columns={[
              { key: "date", label: "Date", render: (d) => fmtDate(d.date) }, { key: "manpower", label: "Manpower", align: "right", num: true },
              { key: "work", label: "Work done", className: "max-w-[380px] whitespace-normal text-[12.5px]" }, { key: "hindrance", label: "Hindrance", className: "text-[12px]", render: (d) => d.hindrance || "-" }, { key: "by", label: "By", className: "text-[12px] text-ink-soft" },
            ]} />
          </Section>
        )}
        {dis && (
          <Modal open onClose={() => setDis(null)} width={460} title={`Dispute ${dis.m.id}`} footer={<><Btn onClick={() => setDis(null)}>Cancel</Btn><Btn variant="danger" disabled={!dis.reason.trim()} onClick={() => { contractorJms(dis.m, false, dis.reason.trim(), me); setDis(null); }}>Send dispute</Btn></>}>
            <Field label="What is wrong with the measurement?" required><TextArea value={dis.reason} onChange={(x) => setDis({ ...dis, reason: x })} placeholder="e.g. Drop beam sides not included - 790 sqm, not 756" /></Field>
          </Modal>
        )}
        {dpr && <DprModal wo={wo} f={dpr} setF={setDpr} by={me} />}
        {tab === "claims" && (
          <Section title="Your RA claims" icon={Icon.receipt}>
            <DataTable dense rows={claims.slice().reverse()} onRow={(x) => open("claim", x.id)} empty={<EmptyRow text="No claims submitted for this work order." />} columns={[
              { key: "id", label: "Claim", className: "mono text-[12px]" }, { key: "p", label: "Period", render: (x) => `${fmtDate(x.periodFrom)} – ${fmtDate(x.periodTo)}` },
              { key: "v", label: "Claimed", align: "right", num: true, render: (x) => inr(claimValue(st, x)) },
              { key: "s", label: "Status", render: (x) => <Status tone={{ Submitted: "blue", Verified: "green", Returned: "red" }[x.status]}>{x.status}</Status> },
              { key: "b", label: "RA bill", render: (x) => x.raBillId || "-" },
            ]} />
          </Section>
        )}
        {tab === "bills" && (
          <Section title="RA bills" icon={Icon.receipt}>
            <DataTable dense rows={bills} onRow={(b) => open("bill", b.id)} empty={<EmptyRow text="No RA bills yet." />} columns={[
              { key: "id", label: "Bill", className: "mono text-[12px]" }, { key: "seq", label: "RA no.", render: (b) => `RA-${b.seq}` },
              { key: "d", label: "Date", render: (b) => fmtDate(b.date) }, { key: "g", label: "Gross", align: "right", num: true, render: (b) => inr(b.gross) },
              { key: "n", label: "Net payable", align: "right", num: true, render: (b) => inr(b.net) }, { key: "s", label: "Status", render: (b) => <Status>{b.status}</Status> },
            ]} />
          </Section>
        )}
        {tab === "terms" && c && (
          <Section title={`Contract ${c.id}`} icon={Icon.file}>
            <KV items={[
              ["Contract", c.title], ["Project", c.project], ["Work order type", wo.type],
              ["Retention", `${c.retentionPct}%`], ["Advance recovery", `${c.advanceRecoveryPct || 0}% per bill`], ["GST", `${c.gstPct}%`],
              ["Labour welfare cess", `${c.cessPct}%`], ["Liquidated damages", `${c.ldPctPerWeek}% per week, max ${c.ldCapPct}%`], ["Defect liability", `${c.dlpMonths} months`], ["Contract period", `${fmtDate(c.start)} → ${fmtDate(c.end)}`], ["Issued on", fmtDate(wo.issuedOn)],
            ]} />
          </Section>
        )}
      </div>
    </Drawer>
  );
}

// ---------------------------------------------------------------- RA claim
function PortalClaimDrawer({ id, onClose, open, onRevise }) {
  const st = useStore();
  const c = byId(st.claims, id);
  if (!c) return null;
  const wo = byId(st.workOrders, c.woId);
  const pos = woPosition(st, wo);
  const ls = wo.type === "Lump Sum";
  const last = c.history[c.history.length - 1];
  return (
    <Drawer open onClose={onClose} width={900} title={wo.title} recordId={c.id} status={<Status tone={{ Submitted: "blue", Verified: "green", Returned: "red" }[c.status]}>{c.status}</Status>} details={[["Work order", wo.id], ["Period", `${fmtDate(c.periodFrom)} – ${fmtDate(c.periodTo)}`]]}
     
      actions={c.status === "Returned" ? <Btn variant="primary" onClick={() => onRevise(c)}>Revise & resubmit</Btn> : c.raBillId ? <Btn icon={Icon.eye} onClick={() => open("bill", c.raBillId)}>View RA bill {c.raBillId}</Btn> : null}>
      <div className="space-y-4 px-6 py-5">
        {c.status === "Returned" && <Note tone="red">Returned by {last.by}: {last.remark}</Note>}
        {c.status === "Submitted" && <Note>Waiting for joint verification at site by the engineer.</Note>}
        {c.status === "Verified" && c.raBillId && <Note tone="green" icon={Icon.check}>Verified - RA bill {c.raBillId} is now {byId(st.raBills, c.raBillId)?.status}.</Note>}
        <div className="grid grid-cols-3 gap-3">
          <StatTile tone="blue" label="Claimed value" value={inr(claimValue(st, c))} sub="excl. GST" icon={Icon.receipt} />
          <StatTile tone="green" label="Certified value" value={c.raBillId ? inr(byId(st.raBills, c.raBillId)?.gross) : "-"} icon={Icon.check} />
          <StatTile tone="purple" label="Lines claimed" value={c.lines.length} icon={Icon.listChecks} />
        </div>
        <Section title="Claimed work" icon={Icon.ruler}>
          <DataTable dense rows={c.lines} rowKey={(l) => l.lineId} columns={[
            { key: "i", label: ls ? "Milestone" : "Item", className: "whitespace-normal", render: (l) => { const p = pos.find((x) => x.line.id === l.lineId); return p ? lineName(p) : l.lineId; } },
            { key: "loc", label: "Location", className: "text-[12px]", render: (l) => l.location || "-" },
            { key: "q", label: "Claimed", align: "right", num: true, render: (l) => (ls ? `${l.pct}%` : `${num(l.qty, 3)} ${pos.find((x) => x.line.id === l.lineId)?.unit || ""}`) },
            { key: "r", label: "Rate", align: "right", num: true, render: (l) => (ls ? "-" : inr(pos.find((x) => x.line.id === l.lineId)?.line.rate)) },
            { key: "a", label: "Amount", align: "right", num: true, render: (l) => inr(claimValue(st, { ...c, lines: [l] })) },
          ]} />
        </Section>
        {(c.note || c.attachment) && (
          <Section title="Your note & attachment" icon={Icon.file}>
            <div className="space-y-2 p-4 text-[13px]">{c.note && <p>{c.note}</p>}{c.attachment && <p>Supporting sheet: <FileLink name={c.attachment.name} dataUrl={c.attachment.dataUrl} /></p>}</div>
          </Section>
        )}
        <Section title="History" icon={Icon.fileClock}>
          <AuditList items={c.history.slice().reverse().map((x) => ({ id: x.status, action: x.remark || "-", by: x.by, at: x.at }))} />
        </Section>
      </div>
    </Drawer>
  );
}

// ---------------------------------------------------------------- RA bill (certificate)
function PortalRaBillDrawer({ id, onClose, open }) {
  const st = useStore();
  const bill = byId(st.raBills, id);
  if (!bill) return null;
  const wo = byId(st.workOrders, bill.woId), c = byId(st.contracts, bill.contractId), v = byId(st.vendors, bill.vendorId);
  const idx = RA_FLOW.findIndex((f) => f.status === bill.status);
  return (
    <Drawer open onClose={onClose} width={1000} title={wo.title} recordId={`${bill.id} · RA-${bill.seq}`} rowId={bill.id} status={<Status>{bill.status}</Status>} details={[["Work order", wo.id], ["Period", `${fmtDate(bill.periodFrom)} – ${fmtDate(bill.periodTo)}`]]}
     
      actions={<>{bill.invoiceId && <Btn icon={Icon.rupee} onClick={() => open("inv", bill.invoiceId)}>Payment status</Btn>}<Btn icon={Icon.download} onClick={() => window.print()}>Print</Btn></>}>
      <div className="space-y-4 px-6 py-5">
        <Section title="Certification progress" icon={Icon.clipboardCheck}>
          <div className="p-5">
            <Stepper steps={RA_FLOW.map((f, i) => {
              const hx = [...bill.history].reverse().find((x) => x.status === f.status);
              const hl = bill.history.length;
              const status = bill.status === "Rejected" ? (i < hl - 1 ? "done" : i === hl - 1 ? "rejected" : "todo") : i <= idx ? "done" : i === idx + 1 ? "current" : "todo";
              return { label: f.label, status, meta: hx ? fmtDateTime(hx.at) : f.role };
            })} />
          </div>
          {bill.status === "Rejected" && <div className="border-t border-line p-4"><Note tone="red">Rejected - {bill.history[bill.history.length - 1].remark}</Note></div>}
        </Section>
        {bill.claimId && <Note>From your claim <b>{bill.claimId}</b> - claimed {inr(bill.claimedValue)}, certified {inr(bill.gross)}.</Note>}
        <Section title="Bill abstract" icon={Icon.sheet}><BillAbstract bill={bill} wo={wo} /></Section>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
          <Section title="Deductions & net payable" icon={Icon.percent}><BillSummary calc={bill} contract={c} vendor={v} /></Section>
          <Section title="History" icon={Icon.fileClock}>
            <AuditList items={bill.history.slice().reverse().map((x) => ({ id: x.status, action: x.remark || "-", by: x.by, at: x.at }))} />
          </Section>
        </div>
      </div>
    </Drawer>
  );
}

// ---------------------------------------------------------------- bill & payments
function PortalInvoiceDrawer({ id, onClose, open }) {
  const st = useStore();
  const inv = byId(st.invoices, id);
  if (!inv) return null;
  const t = invoiceTotals(inv), status = invoiceStatus(inv);
  const po = inv.poId && byId(st.purchaseOrders, inv.poId);
  const holdActive = inv.hold && (!inv.hold.until || daysUntil(inv.hold.until) >= 0);
  return (
    <Drawer open onClose={onClose} width={900} title={`Bill ${inv.number}`} recordId={inv.id} status={<Status>{status}</Status>} details={[["Source", <span className="flex items-center gap-1.5">{inv.source}{inv.poId && <button className="font-medium text-brand hover:underline" onClick={() => open("po", inv.poId)}>{inv.poId}</button>}{inv.raBillId && <button className="font-medium text-brand hover:underline" onClick={() => open("bill", inv.raBillId)}>{inv.raBillId}</button>}</span>], ["Billed", fmtDate(inv.date)], ["Due", fmtDate(inv.due)]]}
     >
      <div className="space-y-4 px-6 py-5">
        <div className="grid grid-cols-4 gap-3">
          <StatTile tone="blue" label="Bill amount" value={inr(t.gross)} sub={inv.source === "RA Bill" ? "net of deductions" : `incl. GST ${inv.gstPct}%`} icon={Icon.receipt} />
          <StatTile tone="purple" label="Credit / debit notes" value={inr(t.notes)} icon={Icon.file} />
          <StatTile tone="green" label="Received" value={inr(t.paid)} sub="incl. TDS withheld" icon={Icon.check} />
          <StatTile tone={t.balance > 0.5 ? "amber" : "green"} label="Balance due" value={inr(t.balance)} icon={Icon.wallet} />
        </div>
        {holdActive && t.balance > 0.5 && <Note tone="amber" icon={Icon.lock}>Payment on hold - {inv.hold.reason}{inv.hold.note ? `: ${inv.hold.note}` : ""}{inv.hold.until ? ` (review by ${fmtDate(inv.hold.until)})` : ""}. Raise a query if you need to discuss it.</Note>}
        {inv.lines.length > 0 && inv.source !== "RA Bill" && (
          <Section title="Bill lines" icon={Icon.listChecks}>
            <DataTable dense rows={inv.lines} rowKey={(_, i) => i} columns={[
              { key: "d", label: "Item", className: "whitespace-normal", render: (l) => l.desc || (po && po.lines[l.line]?.desc) || "-" },
              { key: "q", label: "Qty", align: "right", num: true, render: (l) => `${num(l.qty)} ${l.unit || (po && po.lines[l.line]?.unit) || ""}` },
              { key: "r", label: "Rate", align: "right", num: true, render: (l) => inr(l.rate) },
              { key: "a", label: "Amount", align: "right", num: true, render: (l) => inr(l.qty * l.rate) },
            ]} footer={<tfoot className="border-t border-line text-[13px]"><tr><td colSpan={3} className="px-4 py-2 text-right text-ink-soft">Taxable {inr(t.taxable)} + GST {inv.gstPct}% {inr(t.gst)}</td><td className="num px-4 py-2 text-right font-semibold">{inr(t.taxable + t.gst)}</td></tr></tfoot>} />
          </Section>
        )}
        {inv.source === "RA Bill" && <Note>This payable was raised from your certified RA bill {inv.raBillId}. Retention, advance recovery, TDS and cess are already deducted.</Note>}
        <Section title="Payment schedule" icon={Icon.calendar}>
          <DataTable dense rows={instalments(inv)} rowKey={(r) => r.n} columns={[
            { key: "n", label: "#" }, { key: "due", label: "Due", render: (r) => fmtDate(r.due) }, { key: "pct", label: "Share", align: "right", render: (r) => `${r.pct}%` },
            { key: "amount", label: "Amount", align: "right", num: true, render: (r) => inr(r.amount) }, { key: "paid", label: "Received", align: "right", num: true, render: (r) => inr(r.paid) },
            { key: "s", label: "Status", render: (r) => <Status>{r.status}</Status> },
          ]} />
        </Section>
        {(inv.notes || []).length > 0 && (
          <Section title="Credit / debit notes" icon={Icon.file}>
            <DataTable dense rows={inv.notes} columns={[
              { key: "id", label: "No.", className: "mono text-[12px]" }, { key: "type", label: "Type" }, { key: "reason", label: "Reason", className: "whitespace-normal" },
              { key: "amount", label: "Amount", align: "right", num: true, render: (n) => inr(n.amount) },
            ]} />
          </Section>
        )}
        <Section title="Payments received" icon={Icon.rupee}>
          <DataTable dense rows={inv.payments} empty={<EmptyRow text="No payments yet." />} columns={[
            { key: "date", label: "Date", render: (p) => fmtDate(p.date) }, { key: "mode", label: "Mode" },
            { key: "ref", label: "UTR / reference", className: "mono text-[12px]" },
            { key: "amount", label: "Amount paid", align: "right", num: true, render: (p) => inr(p.amount) },
            { key: "tds", label: "TDS withheld", align: "right", num: true, render: (p) => (p.tds ? inr(p.tds) : "-") },
          ]} />
        </Section>
      </div>
    </Drawer>
  );
}

// ---------------------------------------------------------------- document
function PortalDocDrawer({ vid, name, onClose, onUpload }) {
  const st = useStore();
  const v = byId(st.vendors, vid);
  const d = v.docs.find((x) => x.name === name) || { name, status: "Missing" };
  const state = docState(d);
  const needs = ["Missing", "Expired", "Expiring", "Rejected"].includes(state);
  const hist = st.audit.filter((a) => a.id === vid && a.action.includes(name));
  return (
    <Drawer open onClose={onClose} width={640} title={name} status={<Status>{state}</Status>} details={[d.expiry && ["Valid till", fmtDate(d.expiry)]]}
      actions={<Btn variant={needs ? "primary" : "secondary"} icon={Icon.upload} onClick={() => onUpload(d)}>{d.file ? "Upload new version" : "Upload"}</Btn>}>
      <div className="space-y-4 px-6 py-5">
        {state === "Rejected" && <Note tone="red">The buyer rejected this document{d.remark ? `: ${d.remark}` : ""}. Please upload a corrected copy.</Note>}
        {state === "Expired" && <Note tone="red">This document has expired. Upload the renewed copy to avoid a hold on POs and payments.</Note>}
        {state === "Expiring" && <Note tone="amber">Expires in {daysUntil(d.expiry)} days - upload the renewal in advance.</Note>}
        {state === "Pending" && <Note>Uploaded - waiting for the buyer to verify.</Note>}
        <Section title="Details" icon={Icon.file}>
          <KV cols={2} items={[
            ["Document", name], ["Status", state], ["File", d.file ? <FileLink name={d.file} dataUrl={d.dataUrl} /> : "Not uploaded"],
            ["Number", d.number || "-"], ["Valid till", d.expiry ? fmtDate(d.expiry) : "No expiry"], ["Uploaded on", d.uploadedAt ? fmtDate(d.uploadedAt) : "-"],
          ]} />
        </Section>
        <Section title="History" icon={Icon.fileClock}><AuditList items={hist.map((a) => ({ id: a.entity, action: a.action, by: a.by, at: a.at }))} /></Section>
      </div>
    </Drawer>
  );
}

// ---------------------------------------------------------------- query / dispute thread
function PortalTicketDrawer({ id, author, onClose }) {
  const st = useStore();
  const t = byId(st.tickets, id);
  const [text, setText] = y.useState("");
  if (!t) return null;
  const closed = ["Closed", "Resolved"].includes(t.status);
  const send = () => {
    setState((s) => { const x = byId(s.tickets, id); x.replies.push({ at: new Date().toISOString(), by: author, text, vendor: true }); if (closed) x.status = "Open"; }, { entity: "Ticket", id, action: `Vendor replied` });
    setText(""); toast("Reply sent");
  };
  return (
    <Drawer open onClose={onClose} width={640} title={t.subject} recordId={t.id} status={<Status>{t.status}</Status>} details={[["Raised", fmtDate(t.raisedOn)]]}>
      <div className="space-y-3 px-6 py-5">
        <div className="rounded-lg border border-line bg-brand-soft/40 p-3 text-[13px]"><p className="mb-1 text-[11.5px] text-ink-mute">You · {fmtDate(t.raisedOn)}</p>{t.body}</div>
        {t.replies.map((r, i) => (
          <div key={i} className={cls("rounded-lg border border-line p-3 text-[13px]", r.vendor ? "ml-10 bg-brand-soft/40" : "mr-10 bg-gray-50")}>
            <p className="mb-1 text-[11.5px] text-ink-mute">{r.vendor ? "You" : `${r.by} (buyer)`} · {fmtDateTime(r.at)}</p>{r.text}
          </div>
        ))}
        {t.replies.length === 0 && <p className="text-[12.5px] text-ink-mute">No reply from the buyer yet.</p>}
        <div className="space-y-2 border-t border-line pt-3">
          <Field label={closed ? "Reply (re-opens the query)" : "Reply"}><TextArea value={text} onChange={setText} /></Field>
          <div className="flex justify-end"><Btn variant="primary" icon={Icon.send} disabled={!text.trim()} onClick={send}>Send reply</Btn></div>
        </div>
      </div>
    </Drawer>
  );
}
