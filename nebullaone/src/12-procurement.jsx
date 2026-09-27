// RFQ → quotation → comparison → award → PO → goods receipt → invoice → payment
// (modules 4, 5, 6, 7.2, 9.1, 10, 11)

const eligibleForRfq = (v) => v.status === "Active" || (v.status === "On Hold" && v.hold?.scope !== "All");
const eligibleForPo = (v) => eligibleForRfq(v) && v.regTier === "Spend Authorized" && !isBlockedFor(v, "All");

// ---------------------------------------------------------------- RFQs
function NewRfqModal({ open, onClose, onCreated }) {
  const st = useStore();
  const blank = { title: "", project: PROJECTS[0], mode: "Call for Tenders", template: "", dueDate: shiftDays(7), items: [{ desc: "", unit: "nos", qty: "" }], vendorIds: [], weights: { price: 60, quality: 25, delivery: 15 } };
  const [f, setF] = y.useState(blank);
  y.useEffect(() => { if (open) setF(blank); }, [open]);
  const vendors = st.vendors.filter(eligibleForRfq);
  const setItem = (i, k, v) => setF({ ...f, items: f.items.map((x, j) => (j === i ? { ...x, [k]: v } : x)) });
  const ok = f.title && f.items.every((i) => i.desc && Number(i.qty) > 0) && f.vendorIds.length >= (f.mode === "Single Vendor" ? 1 : 2) && (f.mode !== "Single Vendor" || f.vendorIds.length === 1);
  const save = (send) => {
    const id = nextId("RFQ", st.rfqs);
    setState((s) => s.rfqs.unshift({ ...f, id, status: send ? "Sent" : "Draft", createdOn: todayISO(), quotes: [], negotiation: [], awardedTo: null, items: f.items.map((i) => ({ ...i, qty: Number(i.qty) })) }),
      { entity: "RFQ", id, action: send ? `Sent to ${f.vendorIds.length} vendor(s)` : "Created as draft" });
    toast(send ? `${id} sent to vendors` : `${id} saved`);
    onClose(); onCreated && onCreated(id);
  };
  return (
    <Modal open={open} onClose={onClose} width={820} title="New request for quotation"
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn disabled={!ok} onClick={() => save(false)}>Save draft</Btn><Btn variant="primary" icon={Icon.send} disabled={!ok} onClick={() => save(true)}>Send RFQ</Btn></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Title" required span={2}><TextInput value={f.title} onChange={(x) => setF({ ...f, title: x })} placeholder="e.g. TMT steel Fe500D — 120 MT" /></Field>
          <Field label="Template"><Select value={f.template} placeholder="Blank" onChange={(x) => setF({ ...f, template: x, items: x === "Steel supply" ? [{ desc: "TMT Fe500D 12 mm", unit: "MT", qty: "" }, { desc: "TMT Fe500D 16 mm", unit: "MT", qty: "" }] : x === "Cement supply" ? [{ desc: "OPC 53 grade cement (50 kg bag)", unit: "bag", qty: "" }] : f.items })} options={st.rfqTemplates} /></Field>
          <Field label="Project"><Select value={f.project} onChange={(x) => setF({ ...f, project: x })} options={PROJECTS} /></Field>
          <Field label="Sourcing mode"><Select value={f.mode} onChange={(x) => setF({ ...f, mode: x, vendorIds: x === "Single Vendor" ? f.vendorIds.slice(0, 1) : f.vendorIds })} options={["Call for Tenders", "Single Vendor"]} /></Field>
          <Field label="Quotes due"><DateInput value={f.dueDate} onChange={(x) => setF({ ...f, dueDate: x })} /></Field>
        </div>
        <Section title="Line items" actions={<Btn size="sm" icon={Icon.plus} onClick={() => setF({ ...f, items: [...f.items, { desc: "", unit: "nos", qty: "" }] })}>Add line</Btn>}>
          <div className="space-y-2 p-3">
            {f.items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_100px_120px_28px] gap-2">
                <TextInput value={it.desc} onChange={(x) => setItem(i, "desc", x)} placeholder="Description" />
                <TextInput value={it.unit} onChange={(x) => setItem(i, "unit", x)} placeholder="Unit" />
                <NumInput value={it.qty} onChange={(x) => setItem(i, "qty", x)} placeholder="Qty" />
                <IconBtn icon={Icon.trash} title="Remove line" onClick={() => f.items.length > 1 && setF({ ...f, items: f.items.filter((_, j) => j !== i) })} />
              </div>
            ))}
          </div>
        </Section>
        <Field label={f.mode === "Single Vendor" ? "Vendor (exactly one)" : "Invite vendors (at least two)"}>
          <ChipPicker options={vendors.map((v) => v.name)} value={f.vendorIds.map((id) => vendorName(st, id))}
            onChange={(names) => { let ids = names.map((n) => vendors.find((v) => v.name === n).id); if (f.mode === "Single Vendor") ids = ids.slice(-1); setF({ ...f, vendorIds: ids }); }} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          {["price", "quality", "delivery"].map((k) => <Field key={k} label={`Weight — ${k} (%)`}><NumInput value={f.weights[k]} onChange={(x) => setF({ ...f, weights: { ...f.weights, [k]: x } })} /></Field>)}
        </div>
      </div>
    </Modal>
  );
}

function QuoteModal({ rfq, onClose }) {
  const st = useStore();
  const pending = rfq.vendorIds.filter((id) => !rfq.quotes.some((q) => q.vendorId === id));
  const [f, setF] = y.useState({ vendorId: pending[0] || rfq.vendorIds[0], rates: rfq.items.map(() => ""), currency: "INR", fx: 1, deliveryDays: 7, validUntil: shiftDays(15), note: "" });
  const ok = f.rates.every((r) => Number(r) > 0) && f.deliveryDays > 0;
  return (
    <Modal open onClose={onClose} width={680} title={`Record quotation — ${rfq.id}`} subtitle="Vendor price / RFQ response"
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={!ok} onClick={() => {
        setState((s) => { const r = byId(s.rfqs, rfq.id); r.quotes = r.quotes.filter((q) => q.vendorId !== f.vendorId); r.quotes.push({ ...f, rates: f.rates.map(Number), submittedOn: todayISO() }); r.status = "Quotes Received"; },
          { entity: "RFQ", id: rfq.id, action: `Quote recorded from ${vendorName(st, f.vendorId)}` });
        toast("Quotation recorded"); onClose();
      }}>Save quotation</Btn></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Vendor"><Select value={f.vendorId} onChange={(x) => setF({ ...f, vendorId: x })} options={rfq.vendorIds.map((id) => ({ value: id, label: vendorName(st, id) }))} /></Field>
          <Field label="Currency"><Select value={f.currency} onChange={(x) => setF({ ...f, currency: x, fx: x === "INR" ? 1 : x === "USD" ? 83.2 : x === "EUR" ? 90.4 : 22.6 })} options={["INR", "USD", "EUR", "AED"]} /></Field>
          <Field label="FX rate to INR"><NumInput value={f.fx} onChange={(x) => setF({ ...f, fx: x })} disabled={f.currency === "INR"} /></Field>
        </div>
        <Section title="Rates">
          <div className="space-y-2 p-3">
            {rfq.items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_160px] items-center gap-3 text-[13px]">
                <span>{it.desc} <span className="text-ink-mute">· {num(it.qty)} {it.unit}</span></span>
                <NumInput value={f.rates[i]} onChange={(x) => setF({ ...f, rates: f.rates.map((r, j) => (j === i ? x : r)) })} placeholder={`Rate / ${it.unit}`} />
              </div>
            ))}
          </div>
        </Section>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Delivery (days)"><NumInput value={f.deliveryDays} onChange={(x) => setF({ ...f, deliveryDays: x })} /></Field>
          <Field label="Valid until"><DateInput value={f.validUntil} onChange={(x) => setF({ ...f, validUntil: x })} /></Field>
          <Field label="Terms / note"><TextInput value={f.note} onChange={(x) => setF({ ...f, note: x })} /></Field>
        </div>
      </div>
    </Modal>
  );
}

function awardRfq(rfq, vendorId, acceptLines) {
  const st = getState();
  const q = rfq.quotes.find((x) => x.vendorId === vendorId);
  const poId = nextId("PO", st.purchaseOrders);
  setState((s) => {
    const r = byId(s.rfqs, rfq.id);
    Object.assign(r, { status: "Awarded", awardedTo: vendorId, poId });
    s.purchaseOrders.unshift({
      id: poId, vendorId, project: rfq.project, date: todayISO(), deliveryDate: shiftDays(q.deliveryDays), status: "Draft", billingPolicy: "On received quantity", tolerance: 2, rfqId: rfq.id,
      lines: rfq.items.map((it, i) => ({ desc: it.desc, unit: it.unit, qty: it.qty, rate: round2(q.rates[i] * (q.fx || 1)) })).filter((_, i) => acceptLines[i]),
      receipts: [], revisions: [{ rev: 0, at: new Date().toISOString(), by: currentUser(), note: `Created from ${rfq.id} award` }],
    });
  }, { entity: "RFQ", id: rfq.id, action: `Awarded to ${vendorName(st, vendorId)} → ${poId}` });
  return poId;
}

function RfqDrawer({ id, onClose }) {
  const st = useStore();
  const rfq = byId(st.rfqs, id);
  const [quote, setQuote] = y.useState(false);
  const [msg, setMsg] = y.useState({ vendorId: "", text: "" });
  const [award, setAward] = y.useState(null);
  if (!rfq) return null;
  const ranked = rankQuotes(st, rfq);
  const best = ranked.find((r) => !r.expired);
  const minRate = rfq.items.map((_, i) => Math.min(...rfq.quotes.map((q) => q.rates[i] * (q.fx || 1))));
  return (
    <Drawer open onClose={onClose} width={960} title={rfq.title} subtitle={<><span className="mono">{rfq.id}</span><Status>{rfq.status}</Status><span>{rfq.mode}</span><span>· {rfq.project}</span><span>· due {fmtDate(rfq.dueDate)}</span></>}
      actions={<>
        {rfq.status === "Draft" && <Btn variant="primary" icon={Icon.send} onClick={() => setState((s) => (byId(s.rfqs, id).status = "Sent"), { entity: "RFQ", id, action: "Sent to vendors" })}>Send</Btn>}
        {!["Awarded", "Closed", "Draft"].includes(rfq.status) && <Btn icon={Icon.plus} onClick={() => setQuote(true)}>Record quote</Btn>}
      </>}>
      <div className="space-y-4 p-5">
        <Section title="Vendor comparison sheet" icon={Icon.scale} actions={best && rfq.status !== "Awarded" && <Btn size="sm" variant="primary" icon={Icon.sparkles} onClick={() => setAward({ vendorId: best.q.vendorId, lines: rfq.items.map(() => true) })}>Auto-select best ({vendorName(st, best.q.vendorId)})</Btn>}>
          {rfq.quotes.length === 0 ? <p className="p-4 text-[13px] text-ink-mute">No quotations yet. {rfq.vendorIds.length} vendor(s) invited: {rfq.vendorIds.map((v) => vendorName(st, v)).join(", ")}.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr><Th>Item</Th><Th align="right">Qty</Th>{rfq.quotes.map((q) => <Th key={q.vendorId} align="right">{vendorName(st, q.vendorId)}{q.currency !== "INR" ? ` (${q.currency})` : ""}</Th>)}</tr></thead>
                <tbody>
                  {rfq.items.map((it, i) => (
                    <tr key={i}>
                      <Td>{it.desc}</Td><Td align="right" className="num">{num(it.qty)} {it.unit}</Td>
                      {rfq.quotes.map((q) => { const inrRate = q.rates[i] * (q.fx || 1); return <Td key={q.vendorId} align="right" className={cls("num", inrRate === minRate[i] && "bg-green-50 font-semibold text-green-700")}>{inr(inrRate)}{inrRate === minRate[i] && <span className="ml-1 text-[10px]">L1</span>}</Td>; })}
                    </tr>
                  ))}
                  <tr className="bg-gray-50/70"><Td className="font-semibold">Total (INR)</Td><Td />{rfq.quotes.map((q) => <Td key={q.vendorId} align="right" className="num font-semibold">{inrShort(quoteTotal(rfq, q))}</Td>)}</tr>
                  <tr><Td>Delivery</Td><Td />{rfq.quotes.map((q) => <Td key={q.vendorId} align="right">{q.deliveryDays} days</Td>)}</tr>
                  <tr><Td>Valid until</Td><Td />{rfq.quotes.map((q) => <Td key={q.vendorId} align="right">{daysUntil(q.validUntil) < 0 ? <Status tone="red">Expired</Status> : fmtDate(q.validUntil)}</Td>)}</tr>
                  <tr><Td>Terms</Td><Td />{rfq.quotes.map((q) => <Td key={q.vendorId} align="right" className="text-[12px] text-ink-soft">{q.note || "—"}</Td>)}</tr>
                </tbody>
              </table>
            </div>
          )}
        </Section>
        {ranked.length > 0 && (
          <Section title={`Weighted scoring — price ${rfq.weights.price}% · quality ${rfq.weights.quality}% · delivery ${rfq.weights.delivery}%`} icon={Icon.target}>
            <DataTable dense rows={ranked} rowKey={(r) => r.q.vendorId} columns={[
              { key: "rank", label: "#", render: (_, i) => i + 1 },
              { key: "v", label: "Vendor", render: (r) => <span className="font-medium">{vendorName(st, r.q.vendorId)}</span> },
              { key: "a", label: "Quote value", align: "right", num: true, render: (r) => inrShort(r.amount) },
              { key: "p", label: "Price", align: "right", num: true, render: (r) => r.priceScore.toFixed(0) },
              { key: "ql", label: "Quality", align: "right", num: true, render: (r) => r.qualityScore.toFixed(0) },
              { key: "d", label: "Delivery", align: "right", num: true, render: (r) => r.deliveryScore.toFixed(0) },
              { key: "t", label: "Weighted", align: "right", render: (r) => <b className="num">{r.total.toFixed(1)}</b> },
              { key: "x", label: "", align: "right", render: (r) => rfq.status === "Awarded" ? (rfq.awardedTo === r.q.vendorId ? <Status tone="green">Awarded</Status> : null)
                : r.expired ? <Status tone="red">Quote expired</Status> : <Btn size="sm" onClick={() => setAward({ vendorId: r.q.vendorId, lines: rfq.items.map(() => true) })}>Award</Btn> },
            ]} />
          </Section>
        )}
        {rfq.status === "Awarded" && <Note tone="green" icon={Icon.check}>Awarded to <b>{vendorName(st, rfq.awardedTo)}</b> — purchase order <RefLink to={`${VM_BASE}/purchase-orders?open=${rfq.poId}`}>{rfq.poId}</RefLink>.</Note>}
        <Section title="Negotiation log" icon={Icon.message}>
          <ul className="divide-y divide-line">
            {rfq.negotiation.length === 0 && <li className="p-3 text-[13px] text-ink-mute">No negotiation recorded.</li>}
            {rfq.negotiation.map((n, i) => <li key={i} className="px-4 py-2 text-[13px]"><span className="font-medium">{n.by}</span> <span className="text-ink-mute">→ {vendorName(st, n.vendorId)} · {fmtDateTime(n.at)}</span><p className="text-ink-soft">{n.text}</p></li>)}
          </ul>
          {rfq.status !== "Awarded" && rfq.vendorIds.length > 0 && (
            <div className="grid grid-cols-[200px_1fr_auto] gap-2 border-t border-line p-3">
              <Select value={msg.vendorId} placeholder="Vendor…" onChange={(x) => setMsg({ ...msg, vendorId: x })} options={rfq.vendorIds.map((v) => ({ value: v, label: vendorName(st, v) }))} />
              <TextInput value={msg.text} onChange={(x) => setMsg({ ...msg, text: x })} placeholder="Offer / counter-offer / clarification" />
              <Btn variant="primary" disabled={!msg.vendorId || !msg.text} onClick={() => { setState((s) => byId(s.rfqs, id).negotiation.push({ at: new Date().toISOString(), by: currentUser(), vendorId: msg.vendorId, text: msg.text }), { entity: "RFQ", id, action: "Negotiation note added" }); setMsg({ vendorId: "", text: "" }); }}>Log</Btn>
            </div>
          )}
        </Section>
      </div>
      {quote && <QuoteModal rfq={rfq} onClose={() => setQuote(false)} />}
      {award && (
        <Modal open onClose={() => setAward(null)} width={560} title={`Award to ${vendorName(st, award.vendorId)}`} subtitle="Select the lines to accept (partial award is allowed). A draft PO is created for approval."
          footer={<><Btn onClick={() => setAward(null)}>Cancel</Btn><Btn variant="primary" disabled={!award.lines.some(Boolean) || !eligibleForPo(byId(st.vendors, award.vendorId))}
            onClick={() => { const po = awardRfq(rfq, award.vendorId, award.lines); toast(`Awarded — ${po} created`); setAward(null); }}>Approve award & create PO</Btn></>}>
          <div className="space-y-2">
            {!eligibleForPo(byId(st.vendors, award.vendorId)) && <Note tone="red">This vendor isn't spend-authorized or is blocked — authorize them before awarding.</Note>}
            {rfq.items.map((it, i) => <div key={i}><Check checked={award.lines[i]} onChange={(b) => setAward({ ...award, lines: award.lines.map((x, j) => (j === i ? b : x)) })} label={`${it.desc} — ${num(it.qty)} ${it.unit}`} /></div>)}
          </div>
        </Modal>
      )}
    </Drawer>
  );
}

function RfqPage() {
  const st = useStore();
  const [open, setOpen] = useQueryOpen();
  const [create, setCreate] = y.useState(false);
  const [status, setStatus] = y.useState("All");
  const rows = st.rfqs.filter((r) => status === "All" || r.status === status);
  return (
    <Page title="RFQ & Quotations" subtitle="Requests for quotation, vendor responses, comparison and award" icon={Icon.scale}
      actions={<Btn variant="primary" icon={Icon.plus} onClick={() => setCreate(true)}>New RFQ</Btn>}>
      <StatGrid>
        <StatTile tone="blue" label="Open RFQs" value={st.rfqs.filter((r) => ["Sent", "Quotes Received"].includes(r.status)).length} icon={Icon.send} />
        <StatTile tone="purple" label="Quotes received" value={sum(st.rfqs, (r) => r.quotes.length)} icon={Icon.receipt} />
        <StatTile tone="amber" label="Quotes expiring ≤ 5 days" value={sum(st.rfqs.filter((r) => r.status !== "Awarded"), (r) => r.quotes.filter((q) => { const d = daysUntil(q.validUntil); return d >= 0 && d <= 5; }).length)} icon={Icon.clock} />
        <StatTile tone="green" label="Awarded" value={st.rfqs.filter((r) => r.status === "Awarded").length} icon={Icon.check} />
      </StatGrid>
      <Toolbar left={<FilterSelect label="Status" value={status} onChange={setStatus} options={[{ value: "All", label: "All status" }, "Draft", "Sent", "Quotes Received", "Awarded", "Closed"]} />} right={<span className="text-[12px]">{rows.length} RFQs</span>} />
      <DataTable rows={rows} onRow={(r) => setOpen(r.id)} columns={[
        { key: "id", label: "RFQ", className: "mono text-[12px] text-ink-soft" },
        { key: "title", label: "Title", className: "font-medium" },
        { key: "project", label: "Project" },
        { key: "mode", label: "Mode" },
        { key: "v", label: "Invited", align: "center", render: (r) => r.vendorIds.length },
        { key: "q", label: "Quotes", align: "center", render: (r) => `${r.quotes.length}/${r.vendorIds.length}` },
        { key: "best", label: "Best quote", align: "right", num: true, render: (r) => { const b = rankQuotes(st, r)[0]; return b ? inrShort(Math.min(...r.quotes.map((q) => quoteTotal(r, q)))) : "—"; } },
        { key: "due", label: "Due", render: (r) => fmtDate(r.dueDate) },
        { key: "s", label: "Status", render: (r) => <Status>{r.status}</Status> },
      ]} />
      <NewRfqModal open={create} onClose={() => setCreate(false)} onCreated={setOpen} />
      {open && <RfqDrawer id={open} onClose={() => setOpen(null)} />}
    </Page>
  );
}

// ?open=ID deep links between pages
function useQueryOpen() {
  const loc = Ht();
  const initial = new URLSearchParams(loc.search).get("open");
  const [open, setOpen] = y.useState(initial);
  y.useEffect(() => { if (initial) setOpen(initial); }, [initial]);
  return [open, setOpen];
}

// ---------------------------------------------------------------- purchase orders
function NewPoModal({ open, onClose, onCreated }) {
  const st = useStore();
  const blank = { vendorId: "", project: PROJECTS[0], deliveryDate: shiftDays(14), billingPolicy: "On received quantity", tolerance: 2, lines: [{ desc: "", unit: "nos", qty: "", rate: "" }] };
  const [f, setF] = y.useState(blank);
  y.useEffect(() => { if (open) setF(blank); }, [open]);
  const vendors = st.vendors.filter(eligibleForPo);
  const v = byId(st.vendors, f.vendorId);
  const setLine = (i, k, val) => setF({ ...f, lines: f.lines.map((x, j) => (j === i ? { ...x, [k]: val } : x)) });
  const total = sum(f.lines, (l) => (Number(l.qty) || 0) * (Number(l.rate) || 0));
  const ok = f.vendorId && f.lines.every((l) => l.desc && l.qty > 0 && l.rate > 0);
  return (
    <Modal open={open} onClose={onClose} width={820} title="New purchase order"
      footer={<><span className="mr-auto text-[13px]">Total <b className="num">{inr(total)}</b> + GST</span><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={!ok} onClick={() => {
        const id = nextId("PO", st.purchaseOrders);
        setState((s) => s.purchaseOrders.unshift({ ...f, id, date: todayISO(), status: "Issued", rfqId: null, receipts: [], lines: f.lines.map((l) => ({ ...l, qty: Number(l.qty), rate: Number(l.rate) })), revisions: [{ rev: 0, at: new Date().toISOString(), by: currentUser(), note: "PO issued" }] }), { entity: "PO", id, action: `Issued to ${v.name}` });
        toast(`${id} issued`); onClose(); onCreated && onCreated(id);
      }}>Issue PO</Btn></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Vendor" required hint="Only spend-authorized, unblocked vendors"><Select value={f.vendorId} placeholder="Select vendor…" onChange={(x) => setF({ ...f, vendorId: x })} options={vendors.map((x) => ({ value: x.id, label: x.name }))} /></Field>
          <Field label="Project"><Select value={f.project} onChange={(x) => setF({ ...f, project: x })} options={PROJECTS} /></Field>
          <Field label="Delivery by"><DateInput value={f.deliveryDate} onChange={(x) => setF({ ...f, deliveryDate: x })} /></Field>
          <Field label="Billing policy"><Select value={f.billingPolicy} onChange={(x) => setF({ ...f, billingPolicy: x })} options={["On received quantity", "On ordered quantity"]} /></Field>
          <Field label="Over / under receipt tolerance (%)"><NumInput value={f.tolerance} onChange={(x) => setF({ ...f, tolerance: x })} /></Field>
        </div>
        {v && v.preferred && <Note tone="green" icon={Icon.star}>Preferred supplier — pricelist rates from earlier POs are suggested below.</Note>}
        <Section title="Lines" actions={<Btn size="sm" icon={Icon.plus} onClick={() => setF({ ...f, lines: [...f.lines, { desc: "", unit: "nos", qty: "", rate: "" }] })}>Add line</Btn>}>
          <div className="space-y-2 p-3">
            {f.lines.map((l, i) => {
              const last = st.purchaseOrders.filter((p) => p.vendorId === f.vendorId).flatMap((p) => p.lines).find((x) => l.desc && x.desc.toLowerCase().includes(l.desc.toLowerCase()));
              return (
                <div key={i} className="grid grid-cols-[1fr_90px_110px_130px_28px] items-start gap-2">
                  <div><TextInput value={l.desc} onChange={(x) => setLine(i, "desc", x)} placeholder="Description" />{last && !l.rate && <button className="mt-1 text-[11px] text-brand" onClick={() => setF({ ...f, lines: f.lines.map((x, j) => (j === i ? { ...x, desc: last.desc, unit: last.unit, rate: last.rate } : x)) })}>Use pricelist: {last.desc} @ {inr(last.rate)}</button>}</div>
                  <TextInput value={l.unit} onChange={(x) => setLine(i, "unit", x)} placeholder="Unit" />
                  <NumInput value={l.qty} onChange={(x) => setLine(i, "qty", x)} placeholder="Qty" />
                  <NumInput value={l.rate} onChange={(x) => setLine(i, "rate", x)} placeholder="Rate" />
                  <IconBtn icon={Icon.trash} title="Remove line" onClick={() => f.lines.length > 1 && setF({ ...f, lines: f.lines.filter((_, j) => j !== i) })} />
                </div>
              );
            })}
          </div>
        </Section>
      </div>
    </Modal>
  );
}

function GrnModal({ po, onClose }) {
  const rec = poReceived(po);
  const [f, setF] = y.useState({ date: todayISO(), qc: "Passed", lines: rec.map((l) => ({ qty: Math.max(0, l.qty - l.received), accepted: Math.max(0, l.qty - l.received) })) });
  const over = rec.some((l, i) => l.received + (Number(f.lines[i].qty) || 0) > l.qty * (1 + (po.tolerance || 0) / 100));
  const bad = f.lines.some((l) => Number(l.accepted) > Number(l.qty) || Number(l.qty) < 0);
  const rejected = sum(f.lines, (l) => (Number(l.qty) || 0) - (Number(l.accepted) || 0));
  return (
    <Modal open onClose={onClose} width={760} title={`Goods receipt — ${po.id}`} subtitle={`Tolerance ±${po.tolerance || 0}% · quality inspection gates acceptance`}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={over || bad || !f.lines.some((l) => l.qty > 0)} onClick={() => {
        const st = getState();
        const grnId = nextId("GRN", st.purchaseOrders.flatMap((p) => p.receipts));
        setState((s) => {
          const p = byId(s.purchaseOrders, po.id);
          p.receipts.push({ id: grnId, date: f.date, qc: f.qc, lines: f.lines.map((l, i) => ({ line: i, qty: Number(l.qty) || 0, accepted: Number(l.accepted) || 0 })).filter((l) => l.qty > 0) });
          p.status = "Issued";
        }, { entity: "PO", id: po.id, action: `${grnId} received${rejected ? ` — ${num(rejected)} rejected (RTV)` : ""}` });
        toast(`${grnId} posted`); onClose();
      }}>Post GRN</Btn></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Receipt date"><DateInput value={f.date} onChange={(x) => setF({ ...f, date: x })} /></Field>
          <Field label="Quality inspection"><Select value={f.qc} onChange={(x) => setF({ ...f, qc: x })} options={["Passed", "Passed with remarks", "Partially rejected", "Failed"]} /></Field>
        </div>
        <table className="w-full">
          <thead><tr><Th>Item</Th><Th align="right">Ordered</Th><Th align="right">Received so far</Th><Th align="right">Receiving now</Th><Th align="right">Accepted</Th></tr></thead>
          <tbody>
            {rec.map((l, i) => (
              <tr key={i}>
                <Td>{l.desc}</Td><Td align="right" className="num">{num(l.qty)} {l.unit}</Td><Td align="right" className="num">{num(l.received)}</Td>
                <Td align="right"><NumInput value={f.lines[i].qty} onChange={(x) => setF({ ...f, lines: f.lines.map((z, j) => (j === i ? { qty: x, accepted: x } : z)) })} /></Td>
                <Td align="right"><NumInput value={f.lines[i].accepted} onChange={(x) => setF({ ...f, lines: f.lines.map((z, j) => (j === i ? { ...z, accepted: x } : z)) })} /></Td>
              </tr>
            ))}
          </tbody>
        </table>
        {over && <Note tone="red">Receipt exceeds the ordered quantity plus {po.tolerance || 0}% tolerance.</Note>}
        {bad && <Note tone="red">Accepted quantity can't exceed received quantity.</Note>}
        {rejected > 0 && !bad && <Note tone="amber">{num(rejected)} units will be marked rejected and returned to vendor; a debit note should be raised on the invoice.</Note>}
      </div>
    </Modal>
  );
}

function PoDrawer({ id, onClose }) {
  const st = useStore();
  const po = byId(st.purchaseOrders, id);
  const [grn, setGrn] = y.useState(false);
  const [amend, setAmend] = y.useState(null);
  if (!po) return null;
  const v = byId(st.vendors, po.vendorId);
  const rec = poReceived(po);
  const status = poStatus(po);
  const invs = st.invoices.filter((i) => i.poId === po.id);
  return (
    <Drawer open onClose={onClose} width={900} title={`${po.id} · ${v.name}`} subtitle={<><Status>{status}</Status><span>{po.project}</span><span>· delivery by {fmtDate(po.deliveryDate)}</span>{po.rfqId && <span>· from {po.rfqId}</span>}</>}
      actions={<>
        {po.status === "Draft" && <Btn variant="primary" onClick={() => setState((s) => (byId(s.purchaseOrders, id).status = "Issued"), { entity: "PO", id, action: "Approved & issued" })}>Approve & issue</Btn>}
        {!["Draft", "Closed"].includes(po.status) && status !== "Received" && <Btn variant="primary" icon={Icon.truck} disabled={isBlockedFor(v, "All")} onClick={() => setGrn(true)}>Receive goods</Btn>}
        {po.status !== "Closed" && <Btn icon={Icon.pencil} onClick={() => setAmend({ deliveryDate: po.deliveryDate, lines: po.lines.map((l) => ({ ...l })), note: "" })}>Amend</Btn>}
      </>}>
      <div className="space-y-4 p-5">
        <div className="grid grid-cols-4 gap-3">
          <StatTile tone="blue" label="PO value" value={inrShort(poValue(po))} sub="excl. GST" icon={Icon.package} />
          <StatTile tone="green" label="Accepted" value={`${pct(sum(rec, (l) => l.accepted), sum(rec, (l) => l.qty))}%`} icon={Icon.check} />
          <StatTile tone="red" label="Rejected" value={num(sum(rec, (l) => l.rejected))} sub="units (RTV)" icon={Icon.fileX} />
          <StatTile tone="purple" label="Invoiced" value={inrShort(sum(invs, (i) => invoiceTotals(i).taxable))} icon={Icon.receipt} />
        </div>
        <Section title="Lines — ordered vs received" icon={Icon.boxes}>
          <DataTable dense rows={rec} rowKey={(_, i) => i} columns={[
            { key: "desc", label: "Item", className: "font-medium" },
            { key: "qty", label: "Ordered", align: "right", num: true, render: (l) => `${num(l.qty)} ${l.unit}` },
            { key: "rate", label: "Rate", align: "right", num: true, render: (l) => inr(l.rate) },
            { key: "received", label: "Received", align: "right", num: true, render: (l) => num(l.received) },
            { key: "accepted", label: "Accepted", align: "right", num: true, render: (l) => num(l.accepted) },
            { key: "rejected", label: "Rejected", align: "right", num: true, render: (l) => (l.rejected ? <span className="text-red-600">{num(l.rejected)}</span> : "0") },
            { key: "p", label: "Pending", align: "right", num: true, render: (l) => num(Math.max(0, l.qty - l.received)) },
          ]} />
        </Section>
        <Section title="Goods receipts" icon={Icon.truck}>
          <DataTable dense rows={po.receipts} empty={<p className="p-4 text-[13px] text-ink-mute">Nothing received yet.</p>} columns={[
            { key: "id", label: "GRN", className: "mono text-[12px]" }, { key: "date", label: "Date", render: (r) => fmtDate(r.date) },
            { key: "qc", label: "Quality inspection", render: (r) => <Status tone={r.qc === "Passed" ? "green" : r.qc === "Failed" ? "red" : "amber"}>{r.qc}</Status> },
            { key: "q", label: "Qty received / accepted", render: (r) => `${num(sum(r.lines, (l) => l.qty))} / ${num(sum(r.lines, (l) => l.accepted))}` },
            { key: "ot", label: "On time", render: (r) => (new Date(r.date) <= new Date(po.deliveryDate) ? <Status tone="green">On time</Status> : <Status tone="amber">Late</Status>) },
          ]} />
        </Section>
        <Section title="Amendment / revision history" icon={Icon.branch}>
          <AuditList items={po.revisions.slice().reverse().map((r) => ({ id: `Rev ${r.rev}`, action: r.note, by: r.by, at: r.at }))} />
        </Section>
      </div>
      {grn && <GrnModal po={po} onClose={() => setGrn(false)} />}
      {amend && (
        <Modal open onClose={() => setAmend(null)} width={720} title={`Amend ${po.id} — revision ${po.revisions.length}`} subtitle="The original is kept; each change is versioned."
          footer={<><Btn onClick={() => setAmend(null)}>Cancel</Btn><Btn variant="primary" disabled={!amend.note} onClick={() => {
            setState((s) => { const p = byId(s.purchaseOrders, id); p.deliveryDate = amend.deliveryDate; p.lines = amend.lines.map((l) => ({ ...l, qty: Number(l.qty), rate: Number(l.rate) })); p.revisions.push({ rev: p.revisions.length, at: new Date().toISOString(), by: currentUser(), note: amend.note }); }, { entity: "PO", id, action: `Amended — ${amend.note}` });
            toast("PO amended"); setAmend(null);
          }}>Save revision</Btn></>}>
          <div className="space-y-3">
            <Field label="Delivery by"><DateInput value={amend.deliveryDate} onChange={(x) => setAmend({ ...amend, deliveryDate: x })} /></Field>
            {amend.lines.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_120px_140px] items-center gap-2 text-[13px]"><span>{l.desc}</span>
                <NumInput value={l.qty} onChange={(x) => setAmend({ ...amend, lines: amend.lines.map((z, j) => (j === i ? { ...z, qty: x } : z)) })} />
                <NumInput value={l.rate} onChange={(x) => setAmend({ ...amend, lines: amend.lines.map((z, j) => (j === i ? { ...z, rate: x } : z)) })} /></div>
            ))}
            <Field label="Reason for change" required><TextInput value={amend.note} onChange={(x) => setAmend({ ...amend, note: x })} /></Field>
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
  return (
    <Page title="Purchase Orders" subtitle="PO generation, partial deliveries, goods receipt & quality inspection" icon={Icon.package}
      actions={<Btn variant="primary" icon={Icon.plus} onClick={() => setCreate(true)}>New PO</Btn>}>
      <StatGrid>
        <StatTile tone="blue" label="Open POs" value={st.purchaseOrders.filter((p) => !["Received", "Closed"].includes(poStatus(p))).length} sub={inrShort(sum(st.purchaseOrders.filter((p) => poStatus(p) !== "Received"), poValue))} icon={Icon.package} />
        <StatTile tone="amber" label="Partially received" value={st.purchaseOrders.filter((p) => poStatus(p) === "Partially Received").length} icon={Icon.truck} />
        <StatTile tone="red" label="Late deliveries" value={st.purchaseOrders.filter((p) => poStatus(p) !== "Received" && daysUntil(p.deliveryDate) < 0).length} icon={Icon.clock} />
        <StatTile tone="green" label="Fully received" value={st.purchaseOrders.filter((p) => poStatus(p) === "Received").length} icon={Icon.check} />
      </StatGrid>
      <DataTable rows={st.purchaseOrders} onRow={(p) => setOpen(p.id)} columns={[
        { key: "id", label: "PO", className: "mono text-[12px] text-ink-soft" },
        { key: "v", label: "Vendor", render: (p) => <span className="font-medium">{vendorName(st, p.vendorId)}</span> },
        { key: "project", label: "Project" },
        { key: "d", label: "PO date", render: (p) => fmtDate(p.date) },
        { key: "val", label: "Value", align: "right", num: true, render: (p) => inrShort(poValue(p)) },
        { key: "rec", label: "Received", render: (p) => { const r = poReceived(p); return <Progress value={Math.round(pct(sum(r, (x) => x.received), sum(r, (x) => x.qty)))} />; } },
        { key: "dd", label: "Delivery by", render: (p) => <span className={cls(poStatus(p) !== "Received" && daysUntil(p.deliveryDate) < 0 && "text-red-600")}>{fmtDate(p.deliveryDate)}</span> },
        { key: "rev", label: "Rev", align: "center", render: (p) => p.revisions.length - 1 },
        { key: "s", label: "Status", render: (p) => <Status>{poStatus(p)}</Status> },
      ]} />
      <NewPoModal open={create} onClose={() => setCreate(false)} onCreated={setOpen} />
      {open && <PoDrawer id={open} onClose={() => setOpen(null)} />}
    </Page>
  );
}

// ---------------------------------------------------------------- invoices & payments
function paymentGate(st, inv) {
  const v = byId(st.vendors, inv.vendorId);
  const reasons = [];
  if (isBlockedFor(v, "Payments")) reasons.push(`Vendor ${v.status.toLowerCase()}${v.hold ? ` (${v.hold.scope})` : ""}`);
  if (complianceOf(v).status === "Non-Compliant") reasons.push("Vendor non-compliant (insurance / documents)");
  if (inv.hold) reasons.push(`Invoice on hold — ${inv.hold.reason}`);
  if (!v.bankAccounts.some((b) => b.isDefault)) reasons.push("No default bank account");
  if (inv.source !== "RA Bill" && threeWay(st, inv).status === "Mismatch") reasons.push("3-way match failed");
  return reasons;
}

function PayModal({ invIds, onClose }) {
  const st = useStore();
  const invs = invIds.map((i) => byId(st.invoices, i));
  const [mode, setMode] = y.useState("NEFT"), [date, setDate] = y.useState(todayISO());
  const rows = invs.map((inv) => {
    const t = invoiceTotals(inv), v = byId(st.vendors, inv.vendorId), gate = paymentGate(st, inv);
    const tds = inv.source === "RA Bill" ? 0 : round2((t.taxable * tdsRate(v.tds)) / 100 * (t.balance / (t.payable || 1)));
    return { inv, v, t, gate, tds, net: round2(t.balance - tds) };
  });
  const ok = rows.filter((r) => !r.gate.length);
  return (
    <Modal open onClose={onClose} width={820} title={invIds.length > 1 ? `Payment run — ${invIds.length} bills` : `Record payment — ${invs[0].id}`}
      subtitle="TDS is withheld at payment for PO bills; RA bills already carry TDS as a deduction."
      footer={<><span className="mr-auto text-[13px]">Paying <b>{ok.length}</b> · net <b className="num">{inr(sum(ok, (r) => r.net))}</b></span><Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" disabled={!ok.length} onClick={() => {
          setState((s) => {
            let n = s.invoices.flatMap((i) => i.payments).length;
            for (const r of ok) byId(s.invoices, r.inv.id).payments.push({ id: `PAY-${String(++n).padStart(3, "0")}`, date, amount: r.net, tds: r.tds, mode, ref: `${mode}${Date.now().toString().slice(-8)}` });
            for (const r of ok) if (r.inv.raBillId) { const b = byId(s.raBills, r.inv.raBillId); b.status = "Paid"; b.history.push({ status: "Paid", by: currentUser(), at: new Date().toISOString(), remark: `${mode} payment` }); }
          }, { entity: "Payment", id: ok.map((r) => r.inv.id).join(", "), action: `Paid via ${mode}` });
          toast(`${ok.length} payment(s) recorded`); onClose();
        }}>Release payment</Btn></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Payment mode"><Select value={mode} onChange={setMode} options={PAY_MODES} /></Field>
          <Field label="Value date"><DateInput value={date} onChange={setDate} /></Field>
        </div>
        <table className="w-full">
          <thead><tr><Th>Bill</Th><Th>Vendor</Th><Th align="right">Balance</Th><Th align="right">TDS</Th><Th align="right">Net pay</Th><Th>Gate</Th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.inv.id}>
              <Td className="mono text-[12px]">{r.inv.id}</Td><Td>{r.v.name}</Td><Td align="right" className="num">{inr(r.t.balance)}</Td>
              <Td align="right" className="num">{r.tds ? inr(r.tds) : "—"}</Td><Td align="right" className="num font-semibold">{inr(r.net)}</Td>
              <Td className="whitespace-normal">{r.gate.length ? <span className="text-[12px] text-red-600">Blocked: {r.gate.join("; ")}</span> : <Status tone="green">Clear</Status>}</Td>
            </tr>))}</tbody>
        </table>
      </div>
    </Modal>
  );
}

function NewBillModal({ open, onClose }) {
  const st = useStore();
  const [poId, setPoId] = y.useState(""), [f, setF] = y.useState({ number: "", date: todayISO(), gstPct: 18, lines: [] });
  const po = byId(st.purchaseOrders, poId);
  y.useEffect(() => {
    if (!po) return;
    const rec = poReceived(po);
    const billed = (i) => sum(st.invoices.filter((x) => x.poId === po.id).flatMap((x) => x.lines.filter((l) => l.line === i)), (l) => l.qty);
    setF((ff) => ({ ...ff, lines: rec.map((l, i) => ({ line: i, desc: l.desc, qty: Math.max(0, (po.billingPolicy === "On ordered quantity" ? l.qty : l.accepted) - billed(i)), rate: l.rate })) }));
  }, [poId]);
  y.useEffect(() => { if (open) { setPoId(""); setF({ number: "", date: todayISO(), gstPct: 18, lines: [] }); } }, [open]);
  const v = po && byId(st.vendors, po.vendorId);
  const ok = po && f.number && f.lines.some((l) => l.qty > 0) && !isBlockedFor(v, "Invoices");
  return (
    <Modal open={open} onClose={onClose} width={760} title="Enter vendor bill" subtitle="Against a purchase order — quantities default to accepted, not-yet-billed"
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={!ok} onClick={() => {
        const id = nextId("INV", st.invoices);
        const days = parseInt(v.paymentTerms.replace(/\D/g, ""), 10) || 0;
        setState((s) => s.invoices.unshift({ id, vendorId: po.vendorId, source: "Purchase Order", poId, number: f.number, date: f.date, due: shiftDays(days, f.date), gstPct: Number(f.gstPct), hold: null, notes: [], payments: [], lines: f.lines.filter((l) => l.qty > 0).map((l) => ({ line: l.line, qty: Number(l.qty), rate: Number(l.rate) })) }), { entity: "Invoice", id, action: `Bill ${f.number} entered against ${poId}` });
        toast(`${id} created`); onClose();
      }}>Save bill</Btn></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-3">
          <Field label="Purchase order" span={2}><Select value={poId} placeholder="Select PO…" onChange={setPoId} options={st.purchaseOrders.filter((p) => p.status !== "Draft").map((p) => ({ value: p.id, label: `${p.id} — ${vendorName(st, p.vendorId)}` }))} /></Field>
          <Field label="Vendor invoice no."><TextInput value={f.number} onChange={(x) => setF({ ...f, number: x })} /></Field>
          <Field label="Invoice date"><DateInput value={f.date} onChange={(x) => setF({ ...f, date: x })} /></Field>
        </div>
        {v && isBlockedFor(v, "Invoices") && <Note tone="red">{v.name} is blocked for invoices.</Note>}
        {po && (
          <table className="w-full"><thead><tr><Th>Item</Th><Th align="right">Qty billed</Th><Th align="right">Rate billed</Th></tr></thead>
            <tbody>{f.lines.map((l, i) => <tr key={i}><Td>{l.desc}</Td>
              <Td align="right"><NumInput value={l.qty} onChange={(x) => setF({ ...f, lines: f.lines.map((z, j) => (j === i ? { ...z, qty: x } : z)) })} /></Td>
              <Td align="right"><NumInput value={l.rate} onChange={(x) => setF({ ...f, lines: f.lines.map((z, j) => (j === i ? { ...z, rate: x } : z)) })} /></Td></tr>)}</tbody></table>
        )}
      </div>
    </Modal>
  );
}

function InvoiceDrawer({ id, onClose }) {
  const st = useStore();
  const inv = byId(st.invoices, id);
  const [pay, setPay] = y.useState(false), [hold, setHold] = y.useState({ reason: HOLD_REASONS[0], note: "" }), [note, setNote] = y.useState(null);
  if (!inv) return null;
  const t = invoiceTotals(inv), m = threeWay(st, inv), gate = paymentGate(st, inv), status = invoiceStatus(inv);
  const mut = (fn, action) => setState((s) => fn(byId(s.invoices, id)), { entity: "Invoice", id, action });
  return (
    <Drawer open onClose={onClose} width={880} title={`${inv.id} · ${vendorName(st, inv.vendorId)}`}
      subtitle={<><Status>{status}</Status><span>{inv.source}{inv.poId ? ` ${inv.poId}` : inv.raBillId ? ` ${inv.raBillId}` : ""}</span><span>· vendor ref {inv.number}</span><span>· due {fmtDate(inv.due)}</span></>}
      actions={t.balance > 0.5 && <Btn variant="primary" icon={Icon.rupee} onClick={() => setPay(true)}>Record payment</Btn>}>
      <div className="space-y-4 p-5">
        <div className="grid grid-cols-4 gap-3">
          <StatTile tone="blue" label="Bill amount" value={inr(t.gross)} sub={inv.source === "RA Bill" ? "net of deductions" : `incl. GST ${inv.gstPct}%`} icon={Icon.receipt} />
          <StatTile tone="purple" label="Credit / debit notes" value={inr(t.notes)} icon={Icon.file} />
          <StatTile tone="green" label="Paid (incl. TDS)" value={inr(t.paid)} icon={Icon.check} />
          <StatTile tone={t.balance > 0 ? "amber" : "green"} label="Balance" value={inr(t.balance)} icon={Icon.wallet} />
        </div>
        {gate.length > 0 && t.balance > 0.5 && <Note tone="red" icon={Icon.lock}><b>Payment gate:</b> {gate.join(" · ")}</Note>}
        {inv.source !== "RA Bill" && (
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
        <Section title="Hold" icon={Icon.lock}>
          {inv.hold ? (
            <div className="flex items-center justify-between gap-3 p-4">
              <span className="text-[13px]"><Status tone="amber">{inv.hold.reason}</Status> <span className="ml-2 text-ink-soft">{inv.hold.note}</span></span>
              <Btn variant="success" onClick={() => mut((x) => (x.hold = null), "Hold released")}>Release hold</Btn>
            </div>
          ) : (
            <div className="grid grid-cols-[220px_1fr_auto] items-end gap-3 p-4">
              <Field label="Reason code"><Select value={hold.reason} onChange={(x) => setHold({ ...hold, reason: x })} options={HOLD_REASONS} /></Field>
              <Field label="Note"><TextInput value={hold.note} onChange={(x) => setHold({ ...hold, note: x })} /></Field>
              <Btn onClick={() => mut((x) => (x.hold = { ...hold, at: new Date().toISOString() }), `Put on hold — ${hold.reason}`)}>Put on hold</Btn>
            </div>
          )}
        </Section>
        <Section title="Credit / debit notes" icon={Icon.file} actions={<Btn size="sm" icon={Icon.plus} onClick={() => setNote({ type: "Debit Note", amount: "", reason: "" })}>Add note</Btn>}>
          <DataTable dense rows={inv.notes} empty={<p className="p-4 text-[13px] text-ink-mute">None.</p>} columns={[
            { key: "id", label: "No.", className: "mono text-[12px]" }, { key: "type", label: "Type" }, { key: "reason", label: "Reason", className: "whitespace-normal" },
            { key: "amount", label: "Amount", align: "right", num: true, render: (n) => inr(n.amount) },
          ]} />
        </Section>
        <Section title="Payments" icon={Icon.rupee}>
          <DataTable dense rows={inv.payments} empty={<p className="p-4 text-[13px] text-ink-mute">No payments yet.</p>} columns={[
            { key: "id", label: "Payment", className: "mono text-[12px]" }, { key: "date", label: "Date", render: (p) => fmtDate(p.date) }, { key: "mode", label: "Mode" },
            { key: "ref", label: "Reference", className: "mono text-[12px]" },
            { key: "tds", label: "TDS withheld", align: "right", num: true, render: (p) => (p.tds ? inr(p.tds) : "—") },
            { key: "amount", label: "Paid", align: "right", num: true, render: (p) => inr(p.amount) },
          ]} />
        </Section>
      </div>
      {pay && <PayModal invIds={[id]} onClose={() => setPay(false)} />}
      {note && (
        <Modal open onClose={() => setNote(null)} width={520} title="Credit / debit note" footer={<><Btn onClick={() => setNote(null)}>Cancel</Btn><Btn variant="primary" disabled={!(note.amount > 0) || !note.reason} onClick={() => {
          mut((x) => x.notes.push({ id: `${note.type === "Debit Note" ? "DN" : "CN"}-${String(st.invoices.flatMap((i) => i.notes).length + 1).padStart(3, "0")}`, ...note, amount: Number(note.amount), date: todayISO() }), `${note.type} added`);
          setNote(null);
        }}>Save</Btn></>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type"><Select value={note.type} onChange={(x) => setNote({ ...note, type: x })} options={["Debit Note", "Credit Note"]} /></Field>
            <Field label="Amount (₹, incl. GST)"><NumInput value={note.amount} onChange={(x) => setNote({ ...note, amount: x })} /></Field>
            <Field label="Reason" span={2}><TextInput value={note.reason} onChange={(x) => setNote({ ...note, reason: x })} placeholder="e.g. 40 bags rejected — RTV-002" /></Field>
          </div>
        </Modal>
      )}
    </Drawer>
  );
}

function InvoicesPage() {
  const st = useStore();
  const [open, setOpen] = useQueryOpen();
  const [sel, setSel] = y.useState([]), [run, setRun] = y.useState(false), [bill, setBill] = y.useState(false), [status, setStatus] = y.useState("All");
  const rows = st.invoices.filter((i) => status === "All" || invoiceStatus(i) === status);
  const open$ = st.invoices.filter((i) => invoiceStatus(i) !== "Paid");
  // Accrual: JMS-signed measurement not yet in any RA bill
  const accrued = sum(st.measurements.filter((m) => m.jms.status === "Signed" && !m.billedIn), (m) => {
    const wo = byId(st.workOrders, m.woId);
    if (wo.type === "Lump Sum") return 0;
    return m.qty * (wo.items.find((i) => i.id === m.lineId)?.rate || 0);
  }) + sum(st.workOrders.filter((w) => w.type === "Lump Sum"), (wo) => woProgress(st, wo).measured - woProgress(st, wo).billed);
  const tdsFY = sum(st.invoices.flatMap((i) => i.payments), (p) => p.tds) + sum(st.raBills.filter((b) => ["Approved", "Paid"].includes(b.status)), (b) => b.ded.tds);
  return (
    <Page title="Invoices & Payments" subtitle="Vendor bills, 3-way matching, holds, TDS and payment runs" icon={Icon.receipt}
      actions={<>
        <Btn icon={Icon.plus} onClick={() => setBill(true)}>Enter vendor bill</Btn>
        <Btn variant="primary" icon={Icon.rupee} disabled={!sel.length} onClick={() => setRun(true)}>Payment run{sel.length ? ` (${sel.length})` : ""}</Btn>
      </>}>
      <StatGrid cols={5}>
        <StatTile tone="blue" label="Payable" value={inrShort(sum(open$, (i) => invoiceTotals(i).balance))} sub={`${open$.length} bills`} icon={Icon.wallet} />
        <StatTile tone="red" label="Overdue" value={inrShort(sum(open$.filter((i) => invoiceStatus(i) === "Overdue"), (i) => invoiceTotals(i).balance))} sub={`${open$.filter((i) => invoiceStatus(i) === "Overdue").length} bills`} icon={Icon.clock} />
        <StatTile tone="amber" label="On hold" value={st.invoices.filter((i) => i.hold).length} icon={Icon.lock} />
        <StatTile tone="purple" label="Accrued, not billed" value={inrShort(accrued)} sub="JMS-signed work" icon={Icon.fileClock} />
        <StatTile tone="cyan" label="TDS deducted" value={inrShort(tdsFY)} sub="194C / 194Q" icon={Icon.percent} />
      </StatGrid>
      <Toolbar left={<FilterSelect label="Status" value={status} onChange={setStatus} options={[{ value: "All", label: "All status" }, "Unpaid", "Partially Paid", "Overdue", "On Hold", "Paid"]} />}
        right={<span className="text-[12px]">Tick unpaid bills to include them in a payment run</span>} />
      <DataTable rows={rows} onRow={(i) => setOpen(i.id)} columns={[
        { key: "sel", label: "", render: (i) => invoiceStatus(i) !== "Paid" && <input type="checkbox" className="h-4 w-4 accent-[#0b5ed7]" checked={sel.includes(i.id)} onClick={(e) => e.stopPropagation()} onChange={(e) => setSel(e.target.checked ? [...sel, i.id] : sel.filter((x) => x !== i.id))} /> },
        { key: "id", label: "Bill", className: "mono text-[12px] text-ink-soft" },
        { key: "v", label: "Vendor", render: (i) => <span className="font-medium">{vendorName(st, i.vendorId)}</span> },
        { key: "src", label: "Against", render: (i) => <span className="text-[12px]">{i.source === "RA Bill" ? `RA · ${i.raBillId}` : `PO · ${i.poId}`}</span> },
        { key: "num", label: "Vendor ref", className: "text-[12px]" },
        { key: "amt", label: "Amount", align: "right", num: true, render: (i) => inr(invoiceTotals(i).payable) },
        { key: "bal", label: "Balance", align: "right", num: true, render: (i) => inr(invoiceTotals(i).balance) },
        { key: "due", label: "Due", render: (i) => fmtDate(i.due) },
        { key: "m", label: "Match", render: (i) => { const s = threeWay(st, i).status; return <Status tone={s === "Matched" ? "green" : s === "Mismatch" ? "red" : "amber"}>{s}</Status>; } },
        { key: "s", label: "Status", render: (i) => <Status>{invoiceStatus(i)}</Status> },
      ]} />
      <PageFooter items={[{ value: rows.length, label: "bills" }, { value: inrShort(sum(rows, (i) => invoiceTotals(i).balance)), label: "outstanding" }]} />
      {run && <PayModal invIds={sel} onClose={() => { setRun(false); setSel([]); }} />}
      <NewBillModal open={bill} onClose={() => setBill(false)} />
      {open && <InvoiceDrawer id={open} onClose={() => setOpen(null)} />}
    </Page>
  );
}
