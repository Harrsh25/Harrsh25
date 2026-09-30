// RA (running account) bills with certification workflow, plus the retention,
// deduction and advance-recovery ledger.

function BillAbstract({ bill, wo }) {
  const ls = wo.type === "Lump Sum";
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead><tr>
          {ls ? <><Th>Milestone</Th><Th align="right">Value</Th><Th align="right">Previous %</Th><Th align="right">This bill %</Th><Th align="right">Cumulative %</Th><Th align="right">Amount</Th></>
            : <><Th>Code</Th><Th>Item</Th><Th align="right">WO qty</Th><Th align="right">Previous</Th><Th align="right">This bill</Th><Th align="right">Up to date</Th><Th align="right">Rate</Th><Th align="right">Amount</Th></>}
        </tr></thead>
        <tbody>
          {bill.lines.map((l) => ls ? (
            <tr key={l.lineId}><Td>{l.desc}</Td><Td align="right" className="num">{inr(l.base)}</Td><Td align="right" className="num">{l.prevPct}%</Td><Td align="right" className="num font-semibold">{l.thisPct}%</Td><Td align="right" className="num">{l.cumPct}%</Td><Td align="right" className="num">{inr(l.amount)}</Td></tr>
          ) : (
            <tr key={l.lineId}><Td className="mono text-[12px]">{l.code}</Td><Td className="max-w-[260px] truncate">{l.desc}</Td><Td align="right" className="num">{num(l.woQty)} {l.unit}</Td><Td align="right" className="num">{num(l.prevQty, 3)}</Td>
              <Td align="right" className="num font-semibold">{num(l.thisQty, 3)}</Td><Td align="right" className={cls("num", l.cumQty > l.woQty && "text-red-600")}>{num(l.cumQty, 3)}</Td><Td align="right" className="num">{inr(l.rate)}</Td><Td align="right" className="num">{inr(l.amount)}</Td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BillSummary({ calc, contract, vendor }) {
  const row = (label, val, rowCls, sub) => (
    <div className={cls("flex items-center justify-between px-4 py-1.5 text-[13px]", rowCls)}>
      <span>{label}{sub && <span className="ml-1 text-[11.5px] text-ink-mute">{sub}</span>}</span><span className="num">{val}</span>
    </div>
  );
  const d = calc.ded;
  return (
    <div className="divide-y divide-line">
      {row("Gross value of work done (this bill)", inr(calc.gross), "font-semibold")}
      {row(`Add: GST @ ${contract.gstPct}%`, inr(calc.gst))}
      <div className="bg-gray-50/60 py-1">
        {row("Less: Retention", `− ${inr(d.retention)}`, "", `${contract.retentionPct}%`)}
        {row("Less: Mobilisation advance recovery", `− ${inr(d.advance)}`, "", `${contract.advanceRecoveryPct || 0}%`)}
        {row("Less: TDS", `− ${inr(d.tds)}`, "", `${String(vendor.tds).replace(/-\d$/, "")} · ${tdsRate(vendor.tds)}%`)}
        {row("Less: Labour welfare cess", `− ${inr(d.cess)}`, "", `${contract.cessPct}%`)}
        {d.materials > 0 && row("Less: Material issued / recovery", `− ${inr(d.materials)}`)}
        {d.penalty > 0 && row("Less: Penalty / LD", `− ${inr(d.penalty)}`, "", calc.otherNote)}
        {d.other > 0 && row("Less: Other deductions", `− ${inr(d.other)}`)}
      </div>
      {row("Net payable", inr(calc.net), "bg-brand-soft/60 text-[14px] font-bold text-brand")}
    </div>
  );
}

function PrepareBillModal({ woId: presetWo, onClose, onCreated }) {
  const st = useStore();
  const qcOn = settingsOf(st).qcBeforeBilling;
  // Billable = JMS-signed, not yet billed, inspection passed, on a work order that is still open for billing
  const billable = (m) => m.jms.status === "Signed" && !m.billedIn && (!qcOn || m.qc?.status === "Passed");
  const woOpen = (w) => !["Draft", "Cancelled", "Closed", "Suspended"].includes(w.status) && !["Closed"].includes(byId(st.contracts, w.contractId)?.status);
  const eligibleWos = st.workOrders.filter((w) => woOpen(w) && st.measurements.some((m) => m.woId === w.id && billable(m)));
  const [woId, setWoId] = y.useState(presetWo && eligibleWos.some((w) => w.id === presetWo) ? presetWo : eligibleWos[0]?.id || "");
  const [ids, setIds] = y.useState([]);
  const [manual, setManual] = y.useState({ materials: 0, penalty: 0, other: 0, otherNote: "" });
  const [period, setPeriod] = y.useState({ from: shiftDays(-30), to: todayISO() });
  const wo = byId(st.workOrders, woId);
  const avail = st.measurements.filter((m) => m.woId === woId && billable(m));
  const unsigned = st.measurements.filter((m) => m.woId === woId && m.jms.status !== "Signed").length;
  const waitingQc = st.measurements.filter((m) => m.woId === woId && m.jms.status === "Signed" && !m.billedIn && qcOn && m.qc?.status !== "Passed");
  // Free-issue material not yet recovered is deducted automatically
  const issues = (st.materialIssues || []).filter((m) => m.woId === woId && !m.recoveredIn);
  const matAuto = round2(sum(issues, (m) => m.qty * m.rate));
  y.useEffect(() => { setIds(avail.map((m) => m.id)); setManual((x) => ({ ...x, materials: matAuto })); }, [woId]);
  if (!eligibleWos.length) return (
    <Modal open onClose={onClose} title="Prepare RA bill" width={520} footer={<Btn onClick={onClose}>Close</Btn>}>
      <EmptyState icon={Icon.ruler} title="Nothing to bill" text="RA bills are prepared from JMS-signed measurements. Record measurements and get them jointly signed first." className="py-6" />
    </Modal>
  );
  const c = wo && byId(st.contracts, wo.contractId), v = wo && byId(st.vendors, wo.vendorId);
  const calc = wo ? computeRABill(st, woId, ids, manual) : null;
  const seq = wo ? st.raBills.filter((b) => b.woId === woId && b.status !== "Rejected").length + 1 : 1;
  // Quantity control: cumulative billed may not exceed the WO quantity (which approved change orders raise)
  const over = calc ? calc.lines.filter((l) => l.woQty !== undefined && l.cumQty > l.woQty + 0.001) : [];
  const create = () => {
    if (over.length) return toast("Quantity above the work order — raise a change order first", "red");
    const id = nextId("RA", st.raBills);
    setState((s) => {
      const fresh = computeRABill(s, woId, ids, manual);
      s.raBills.unshift({ id, woId, contractId: wo.contractId, vendorId: wo.vendorId, seq, date: todayISO(), periodFrom: period.from, periodTo: period.to, mbIds: ids, manual, materialIssueIds: issues.map((m) => m.id), ...fresh, status: "Submitted", history: [{ status: "Submitted", by: currentUser(), at: new Date().toISOString(), remark: "" }] });
      ids.forEach((m) => (byId(s.measurements, m).billedIn = id));
      issues.forEach((m) => (byId(s.materialIssues, m.id).recoveredIn = id));
    }, { entity: "RA Bill", id, action: `RA-${seq} submitted for ${woId} — net ${inr(calc.net)}` });
    toast(`${id} submitted for verification`); onClose(); onCreated && onCreated(id);
  };
  return (
    <Modal open onClose={onClose} width={980} title={`Prepare RA bill${wo ? ` — ${wo.id} · RA-${seq}` : ""}`} subtitle="Built from JMS-signed, unbilled measurement book entries; deductions follow the contract terms"
      footer={<><span className="mr-auto text-[13px]">Net payable <b className="num">{calc ? inr(calc.net) : "—"}</b></span><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" icon={Icon.send} disabled={!ids.length || !calc || calc.gross <= 0 || over.length > 0} onClick={create}>Submit for certification</Btn></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Work order"><Select value={woId} onChange={(x) => setWoId(x)} options={eligibleWos.map((w) => ({ value: w.id, label: `${w.id} — ${vendorName(st, w.vendorId)}` }))} /></Field>
          <Field label="Period from"><DateInput value={period.from} onChange={(x) => setPeriod({ ...period, from: x })} /></Field>
          <Field label="Period to"><DateInput value={period.to} onChange={(x) => setPeriod({ ...period, to: x })} /></Field>
        </div>
        {unsigned > 0 && <Note tone="amber">{unsigned} measurement(s) on this WO are still pending/disputed in JMS and are not included.</Note>}
        {waitingQc.length > 0 && <Note tone="amber">{waitingQc.length} signed measurement(s) are waiting for a passed quality inspection ({waitingQc.map((m) => m.id).join(", ")}) and are not included.</Note>}
        {over.length > 0 && <Note tone="red">Quantity above the work order on {over.map((l) => `${l.code} ${l.desc} (${num(l.cumQty, 3)} of ${num(l.woQty)} ${l.unit})`).join("; ")}. Untick the excess measurements, or raise a change order with a quantity line on the contract — once approved the WO quantity rises and the bill can go through.</Note>}
        {issues.length > 0 && <Note icon={Icon.package}>Material recovery of {inr(matAuto)} applied automatically for {issues.map((m) => `${m.id} (${num(m.qty)} ${m.unit} ${m.material})`).join(", ")}.</Note>}
        {isBlockedFor(v, "Invoices") && <Note tone="red">{v.name} is blocked for invoices — the bill can be prepared but won't be payable until the hold is lifted.</Note>}
        <Section title={`Measurements included (${ids.length}/${avail.length})`} icon={Icon.ruler}>
          <DataTable dense rows={avail} columns={[
            { key: "s", label: "", render: (m) => <input type="checkbox" className="h-4 w-4 accent-[#0b5ed7]" checked={ids.includes(m.id)} onChange={(e) => setIds(e.target.checked ? [...ids, m.id] : ids.filter((x) => x !== m.id))} /> },
            { key: "id", label: "MB", className: "mono text-[12px]" }, { key: "date", label: "Date", render: (m) => fmtDate(m.date) },
            { key: "l", label: "Item", className: "max-w-[300px] truncate", render: (m) => wo.type === "Lump Sum" ? wo.milestones.find((x) => x.id === m.lineId)?.name : wo.items.find((x) => x.id === m.lineId)?.desc },
            { key: "loc", label: "Location", className: "max-w-[220px] truncate", render: (m) => m.location },
            { key: "q", label: "Qty", align: "right", num: true, render: (m) => (m.pct !== null ? `${m.pct}% cum.` : num(m.qty, 3)) },
          ]} />
        </Section>
        {calc && calc.lines.length > 0 && (
          <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-4">
            <Section title="Bill abstract" icon={Icon.sheet}><BillAbstract bill={calc} wo={wo} /></Section>
            <div className="space-y-3">
              <Section title="Manual deductions" icon={Icon.percent}>
                <div className="grid grid-cols-2 gap-3 p-3">
                  <Field label="Material recovery (₹)" hint={issues.length ? "From material issues" : ""}>{issues.length ? <span className="flex h-[32px] items-center num font-medium">{inr(matAuto)}</span> : <NumInput value={manual.materials} onChange={(x) => setManual({ ...manual, materials: x })} />}</Field>
                  <Field label="Penalty / LD (₹)"><NumInput value={manual.penalty} onChange={(x) => setManual({ ...manual, penalty: x })} /></Field>
                  <Field label="Other (₹)"><NumInput value={manual.other} onChange={(x) => setManual({ ...manual, other: x })} /></Field>
                  <Field label="Note"><TextInput value={manual.otherNote} onChange={(x) => setManual({ ...manual, otherNote: x })} /></Field>
                </div>
              </Section>
              <Section title="Summary" icon={Icon.receipt}><BillSummary calc={calc} contract={c} vendor={v} /></Section>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// People who already acted on a bill (submitter + each stage) — none of them may take the next step
const billActors = (b) => (b.history || []).map((x) => x.by);
function raStepBlock(bill, st) {
  const i = RA_FLOW.findIndex((f) => f.status === bill.status), next = RA_FLOW[i + 1];
  if (!next || next.status === "Paid") return null;
  const who = actBlock(RA_ROLE[next.status], billActors(bill), `${next.label.toLowerCase()}`);
  if (who) return who;
  // Quality / HSE: an open NCR on the work order stops certification
  if (next.status === "Certified") {
    const open = (st.ncrs || []).filter((n) => n.woId === bill.woId && n.status !== "Closed");
    if (open.length) return `Open NCR on ${bill.woId} (${open.map((n) => n.id).join(", ")}) — close it before certifying.`;
  }
  return null;
}
function advanceBill(bill, remark, st) {
  const i = RA_FLOW.findIndex((f) => f.status === bill.status);
  const next = RA_FLOW[i + 1];
  if (!next || next.status === "Paid") return false;
  const why = raStepBlock(bill, st || getState());
  if (why) { toast(why, "red"); return false; }
  setState((s) => {
    const b = byId(s.raBills, bill.id);
    b.status = next.status;
    b.history.push({ status: next.status, by: currentUser(), at: new Date().toISOString(), remark });
    if (next.status === "Approved" && !b.invoiceId) {
      // Approved RA bill becomes a payable in Invoices & Payments
      const v = byId(s.vendors, b.vendorId);
      const id = nextId("INV", s.invoices);
      s.invoices.unshift({ id, vendorId: b.vendorId, source: "RA Bill", raBillId: b.id, number: `${b.id}/${b.woId}`, date: todayISO(), due: shiftDays(parseInt(v.paymentTerms.replace(/\D/g, ""), 10) || 30), lines: [], amount: b.net, gstPct: 0, hold: null, notes: [], payments: [] });
      b.invoiceId = id;
    }
  }, { entity: "RA Bill", id: bill.id, action: `${next.label} done${remark ? ` — ${remark}` : ""}` });
  toast(next.status === "Approved" ? `${bill.id} approved — payable raised` : `${bill.id} ${next.status.toLowerCase()}`);
  return true;
}

function rejectBill(id, remark) {
  const b0 = byId(getState().raBills, id);
  if (!b0 || !["Submitted", "Verified", "Certified"].includes(b0.status)) return false;
  const next = RA_FLOW[RA_FLOW.findIndex((f) => f.status === b0.status) + 1];
  if (!tryAct(RA_ROLE[next.status], billActors(b0), "rejecting this bill")) return false;
  if (!(remark || "").trim()) { toast("A reason is required to reject", "red"); return false; }
  setState((s) => {
    const b = byId(s.raBills, id);
    b.status = "Rejected";
    b.history.push({ status: "Rejected", by: currentUser(), at: new Date().toISOString(), remark });
    b.mbIds.forEach((m) => (byId(s.measurements, m).billedIn = null)); // measurements return to the unbilled pool
    (b.materialIssueIds || []).forEach((mid) => { const mi = byId(s.materialIssues || [], mid); if (mi) mi.recoveredIn = null; }); // …and material recovery to the next bill
    // A bill raised from a contractor claim goes back to the contractor: its claim-generated measurements are voided
    // (marked disputed) so the revised claim doesn't double-count them
    if (b.claimId) b.mbIds.forEach((m) => { const x = byId(s.measurements, m); x.jms = { status: "Disputed", remark: `Bill ${b.id} rejected — claim returned for revision`, at: new Date().toISOString() }; x.voided = true; });
    if (b.claimId) { const cl = byId(s.claims, b.claimId); if (cl) { cl.status = "Returned"; cl.history.push({ status: "Returned", by: currentUser(), at: new Date().toISOString(), remark: `RA bill ${b.id} rejected — ${remark}` }); } }
  }, { entity: "RA Bill", id, action: `Rejected — ${remark}` });
  toast(`${id} rejected`, "red");
  return true;
}

function RaBillDrawer({ id, onClose }) {
  const st = useStore();
  const bill = byId(st.raBills, id);
  const [remark, setRemark] = y.useState("");
  const [pay, setPay] = y.useState(false);
  if (!bill) return null;
  const wo = byId(st.workOrders, bill.woId), c = byId(st.contracts, bill.contractId), v = byId(st.vendors, bill.vendorId);
  const idx = RA_FLOW.findIndex((f) => f.status === bill.status);
  const next = bill.status === "Rejected" ? null : RA_FLOW[idx + 1];
  const reject = () => { rejectBill(id, remark); setRemark(""); };
  return (
    <Drawer open onClose={onClose} width={1000} title={`${bill.id} · RA-${bill.seq} · ${wo.title}`}
      subtitle={<><Status>{bill.status}</Status><span>{v.name}</span><span>· {wo.id} ({wo.type})</span><span>· {c.id}</span><span>· period {fmtDate(bill.periodFrom)} – {fmtDate(bill.periodTo)}</span></>}
      actions={<Btn icon={Icon.download} onClick={() => window.print()}>Print certificate</Btn>}>
      <div className="space-y-4 px-6 py-5">
        <Section title="Certification workflow" icon={Icon.clipboardCheck}>
          <div className="p-5">
            <Stepper steps={RA_FLOW.map((f, i) => {
              const h1 = [...bill.history].reverse().find((x) => x.status === f.status);
              const hl = bill.history.length;
              const status = bill.status === "Rejected"
                ? (i < hl - 1 ? "done" : i === hl - 1 ? "rejected" : "todo")
                : i <= idx ? "done" : i === idx + 1 ? "current" : "todo";
              return { label: f.label, status, meta: h1 ? `${h1.by} · ${fmtDateTime(h1.at)}` : f.role };
            })} />
          </div>
          {next && next.status !== "Paid" && raStepBlock(bill, st) && <div className="border-t border-line px-4 pt-3"><Note tone="amber" icon={Icon.lock}>{raStepBlock(bill, st)}</Note></div>}
          {next && next.status !== "Paid" && (
            <div className="grid grid-cols-[1fr_auto_auto] items-end gap-2 border-t border-line p-4">
              <Field label={`${next.role} remark`}><TextInput value={remark} onChange={setRemark} placeholder="Optional for approval, required to reject" /></Field>
              <Btn variant="danger" disabled={!remark} onClick={reject}>Reject</Btn>
              <Btn variant="success" icon={Icon.check} onClick={() => { advanceBill(bill, remark, st); setRemark(""); }}>{next.status === "Verified" ? "Verify at site" : next.status === "Certified" ? "Certify quantities" : "Approve for payment"}</Btn>
            </div>
          )}
          {bill.status === "Approved" && (
            <div className="flex items-center justify-between gap-3 border-t border-line p-4">
              <span className="text-[13px] text-ink-soft">Payable <RefLink to={`${VM_BASE}/invoices?open=${bill.invoiceId}`}>{bill.invoiceId}</RefLink> raised in Invoices & Payments.</span>
              <Btn variant="primary" icon={Icon.rupee} onClick={() => setPay(true)}>Release payment</Btn>
            </div>
          )}
          {bill.status === "Rejected" && <div className="border-t border-line p-4"><Note tone="red">Rejected — {bill.history[bill.history.length - 1].remark}. Its measurements are back in the unbilled pool for a corrected bill.</Note></div>}
        </Section>
        {bill.claimId && <Note>Raised from contractor claim <b>{bill.claimId}</b> — claimed {inr(bill.claimedValue)}, certified {inr(bill.gross)}{bill.claimedValue > bill.gross + 1 ? ` (reduced by ${inr(bill.claimedValue - bill.gross)} at verification)` : ""}.</Note>}
        <Section title="Bill abstract" icon={Icon.sheet}><BillAbstract bill={bill} wo={wo} /></Section>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
          <Section title="Deductions & net payable" icon={Icon.percent}><BillSummary calc={bill} contract={c} vendor={v} /></Section>
          <Section title="History" icon={Icon.fileClock}>
            <AuditList items={bill.history.slice().reverse().map((h1) => ({ id: h1.status, action: h1.remark || "—", by: h1.by, at: h1.at }))} />
          </Section>
        </div>
      </div>
      {pay && <PayModal invIds={[bill.invoiceId]} onClose={() => setPay(false)} />}
    </Drawer>
  );
}

function RaBillsPage() {
  const st = useStore();
  const loc = Ht();
  const presetWo = new URLSearchParams(loc.search).get("wo");
  const [open, setOpen] = useQueryOpen();
  const [prep, setPrep] = y.useState(!!presetWo), [status, setStatus] = y.useState("All");
  const [tab, setTab] = y.useState(new URLSearchParams(loc.search).get("tab") || "bills");
  const newClaims = st.claims.filter((c) => c.status === "Submitted").length;
  const rows = st.raBills.filter((b) => status === "All" || b.status === status);
  const inCert = st.raBills.filter((b) => ["Submitted", "Verified", "Certified"].includes(b.status));
  return (
    <Page title="RA Bills & Certification" subtitle="Running account bills from the measurement book — verify, certify, approve, pay" icon={Icon.receipt}
      actions={<Btn variant="primary" icon={Icon.plus} onClick={() => setPrep(true)}>Prepare RA bill</Btn>}>
      <TabBar active={tab} onChange={setTab} tabs={[{ id: "bills", label: "RA bills", icon: Icon.receipt }, { id: "claims", label: "Contractor claims", icon: Icon.hardHat }]} />
      {tab === "claims" && <ClaimsTab onBill={(id) => { setTab("bills"); setOpen(id); }} />}
      {tab === "bills" && <>
      <DataTable noun="bills" summary={(r) => [{ value: inrShort(sum(r.filter((b) => b.status !== "Rejected"), (b) => b.gross)), label: "gross" }, { value: inrShort(sum(r.filter((b) => b.status !== "Rejected"), (b) => b.net)), label: "net" }]} filters={<FilterSelect label="Status" value={status} onChange={setStatus} options={[{ value: "All", label: "All status" }, "Submitted", "Verified", "Certified", "Approved", "Paid", "Rejected"]} />} rows={rows} onRow={(b) => setOpen(b.id)} columns={[
        { key: "id", label: "Bill", className: "mono text-[12px] text-ink-soft" },
        { key: "seq", label: "RA no.", render: (b) => <span>RA-{b.seq}{b.claimId && <span className="ml-1 text-[11px] text-ink-mute">from {b.claimId}</span>}</span> },
        { key: "wo", label: "Work order", filterOptions: FO.contractors, filter: (b) => vendorName(st, b.vendorId), filterLabel: "Contractor", render: (b) => <span><span className="mono text-[12px]">{b.woId}</span> · {vendorName(st, b.vendorId)}</span> },
        { key: "t", label: "Type", filterOptions: FO.woType, filter: (b) => byId(st.workOrders, b.woId).type, render: (b) => byId(st.workOrders, b.woId).type },
        { key: "d", label: "Bill date", render: (b) => fmtDate(b.date) },
        { key: "g", label: "Gross", align: "right", num: true, render: (b) => inr(b.gross) },
        { key: "ded", label: "Deductions", align: "right", num: true, render: (b) => <span className="text-red-600">− {inr(b.totalDed)}</span> },
        { key: "n", label: "Net payable", align: "right", num: true, render: (b) => <b>{inr(b.net)}</b> },
        { key: "s", label: "Status", render: (b) => <Status>{b.status}</Status> },
      ]} />
      </>}
      {prep && <PrepareBillModal woId={presetWo} onClose={() => setPrep(false)} onCreated={setOpen} />}
      {open && <RaBillDrawer id={open} onClose={() => setOpen(null)} />}
    </Page>
  );
}

// ---------------------------------------------------------------- retention & deductions
function RetentionPage() {
  const st = useStore();
  const [tab, setTab] = y.useState("ledger");
  const [rel, setRel] = y.useState(null), [adv, setAdv] = y.useState(null), [rejRel, setRejRel] = y.useState(null);
  const contracts = st.contracts.filter((c) => c.status !== "Draft");
  const ledgers = contracts.map((c) => ({ c, ...contractLedger(st, c) }));
  const T = (k) => sum(ledgers, (l) => l[k]);
  const dedRows = st.raBills.filter((b) => b.status !== "Rejected" && b.status !== "Draft");
  return (
    <Page title="Retention, Deductions & Advances" subtitle="Retention held and released, advance recovery and every statutory / contractual deduction" icon={Icon.scale}
      actions={<><Btn icon={Icon.plus} onClick={() => setAdv({ contractId: contracts[0]?.id, amount: "", type: "Mobilisation advance", date: todayISO(), ref: "" })}>Record advance</Btn>
        <Btn variant="primary" icon={Icon.lock} onClick={() => setRel({ contractId: contracts.find((c) => contractLedger(st, c).retentionBalance > 0)?.id || "", type: "After DLP", amount: "", note: "" })}>Request retention release</Btn></>}>
      <TabBar active={tab} onChange={setTab} tabs={[{ id: "ledger", label: "Contract ledger", icon: Icon.book }, { id: "rel", label: "Retention releases", icon: Icon.lock }, { id: "ded", label: "Deduction register", icon: Icon.listChecks }]} />
      {tab === "ledger" && (
        <DataTable noun="contracts" rows={ledgers} rowKey={(l) => l.c.id} columns={[
          { key: "c", label: "Contract", render: (l) => <span><span className="mono text-[12px]">{l.c.id}</span> · {vendorName(st, l.c.vendorId)}</span> },
          { key: "s", label: "Status", filterOptions: FO.contractStatus, filter: (l) => contractStatus(l.c), render: (l) => <Status>{contractStatus(l.c)}</Status> },
          { key: "g", label: "Gross billed", align: "right", num: true, render: (l) => inrShort(l.gross) },
          { key: "rh", label: "Retention held", align: "right", num: true, render: (l) => inrShort(l.retentionHeld) },
          { key: "rr", label: "Released", align: "right", num: true, render: (l) => inrShort(l.released) },
          { key: "rb", label: "Retention bal.", align: "right", num: true, render: (l) => <b>{inrShort(l.retentionBalance)}</b> },
          { key: "ag", label: "Advance given", align: "right", num: true, render: (l) => inrShort(l.advanceGiven) },
          { key: "ar", label: "Recovered", align: "right", num: true, render: (l) => <span title={`${pct(l.recovered, l.advanceGiven)}% recovered`}>{inrShort(l.recovered)}</span> },
          { key: "ab", label: "Advance bal.", align: "right", num: true, render: (l) => <b>{inrShort(l.advanceBalance)}</b> },
          { key: "dlp", label: "DLP ends", render: (l) => fmtDate(shiftDays((l.c.dlpMonths || 0) * 30, l.c.end)) },
        ]} footer={<tfoot><tr className="bg-gray-50 font-semibold"><Td>Total</Td><Td /><Td align="right" className="num">{inrShort(T("gross"))}</Td><Td align="right" className="num">{inrShort(T("retentionHeld"))}</Td><Td align="right" className="num">{inrShort(T("released"))}</Td><Td align="right" className="num">{inrShort(T("retentionBalance"))}</Td><Td align="right" className="num">{inrShort(T("advanceGiven"))}</Td><Td align="right" className="num">{inrShort(T("recovered"))}</Td><Td align="right" className="num">{inrShort(T("advanceBalance"))}</Td><Td /></tr></tfoot>} />
      )}
      {tab === "rel" && (
        <DataTable noun="releases" rows={st.retentionReleases} empty={<EmptyState icon={Icon.lock} title="No release requests" text="Retention can be released after the defect liability period, or earlier against a bank guarantee." />} columns={[
          { key: "id", label: "Request", className: "mono text-[12px]" },
          { key: "c", label: "Contract", render: (r) => `${r.contractId} · ${vendorName(st, byId(st.contracts, r.contractId).vendorId)}` },
          { key: "type", label: "Basis", filter: true }, { key: "note", label: "Note", className: "whitespace-normal text-[12px] text-ink-soft" },
          { key: "amount", label: "Amount", align: "right", num: true, render: (r) => inr(r.amount) },
          { key: "d", label: "Requested", render: (r) => fmtDate(r.requestedOn) },
          { key: "by", label: "Requested / approved by", className: "text-[12px] text-ink-soft", render: (r) => [r.requestedBy, r.approvedBy].filter(Boolean).join(" → ") || "—" },
          { key: "s", label: "Status", filterOptions: FO.release, filter: (r) => (r.status === "Due" ? "Pending Approval" : r.status), render: (r) => <span title={r.remark || ""}><Status tone={{ Released: "green", Approved: "blue", Rejected: "red" }[r.status] || "amber"}>{r.status === "Due" ? "Pending Approval" : r.status}</Status></span> },
          { key: "a", label: "", align: "right", render: (r) => (
            <span className="flex justify-end gap-1">
              {["Due", "Pending Approval"].includes(r.status) && <><Btn size="sm" variant="success" onClick={() => decideRelease(r, true, "")}>Approve</Btn><Btn size="sm" variant="danger" onClick={() => setRejRel({ r, reason: "" })}>Reject</Btn></>}
              {r.status === "Approved" && <Btn size="sm" variant="primary" onClick={() => releaseRetention(r)}>Release payment</Btn>}
            </span>) },
        ]} />
      )}
      {tab === "ded" && (
        <DataTable noun="deductions" rows={dedRows} columns={[
          { key: "id", label: "Bill", className: "mono text-[12px]" }, { key: "c", label: "Contract", className: "mono text-[12px]", render: (b) => b.contractId },
          { key: "v", label: "Contractor", filterOptions: FO.contractors, filter: (x) => vendorName(st, x.vendorId), render: (b) => vendorName(st, b.vendorId) },
          { key: "g", label: "Gross", align: "right", num: true, render: (b) => inrShort(b.gross) },
          { key: "r", label: "Retention", align: "right", num: true, render: (b) => inr(b.ded.retention) },
          { key: "a", label: "Advance", align: "right", num: true, render: (b) => inr(b.ded.advance) },
          { key: "t", label: "TDS", align: "right", num: true, render: (b) => inr(b.ded.tds) },
          { key: "cs", label: "Cess", align: "right", num: true, render: (b) => inr(b.ded.cess) },
          { key: "m", label: "Material", align: "right", num: true, render: (b) => (b.ded.materials ? inr(b.ded.materials) : "—") },
          { key: "p", label: "Penalty", align: "right", num: true, render: (b) => (b.ded.penalty ? <span title={b.otherNote}>{inr(b.ded.penalty)}</span> : "—") },
          { key: "tot", label: "Total", align: "right", num: true, render: (b) => <b>{inr(b.totalDed)}</b> },
        ]} />
      )}
      {rejRel && (
        <Modal open onClose={() => setRejRel(null)} width={460} title={`Reject ${rejRel.r.id}`}
          footer={<><Btn onClick={() => setRejRel(null)}>Cancel</Btn><Btn variant="danger" disabled={!rejRel.reason.trim()} onClick={() => { if (decideRelease(rejRel.r, false, rejRel.reason.trim())) setRejRel(null); }}>Reject</Btn></>}>
          <Field label="Reason" required><TextArea value={rejRel.reason} onChange={(x) => setRejRel({ ...rejRel, reason: x })} placeholder="e.g. Snag list for Tower A not closed" /></Field>
        </Modal>
      )}
      {rel && (() => {
        const c = byId(st.contracts, rel.contractId), led = c && contractLedger(st, c);
        const dlpEnd = c && shiftDays((c.dlpMonths || 0) * 30, c.end);
        const early = rel.type === "After DLP" && c && daysUntil(dlpEnd) > 0;
        const max = led ? led.retentionBalance - sum(st.retentionReleases.filter((r) => r.contractId === c.id && r.status !== "Released"), (r) => r.amount) : 0;
        return (
          <Modal open onClose={() => setRel(null)} width={560} title="Request retention release"
            footer={<><Btn onClick={() => setRel(null)}>Cancel</Btn><Btn variant="primary" disabled={!c || !(rel.amount > 0) || rel.amount > max + 0.5 || early} onClick={() => {
              const id = nextId("RR", st.retentionReleases);
              setState((s) => s.retentionReleases.unshift({ id, contractId: c.id, amount: Number(rel.amount), type: rel.type, status: "Pending Approval", requestedOn: todayISO(), requestedBy: currentUser(), note: rel.note }), { entity: "Retention", id, action: `Release requested for ${c.id} — waiting for Finance approval` });
              toast(`${id} raised`); setRel(null); setTab("rel");
            }}>Raise request</Btn></>}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Contract" span={2}><Select value={rel.contractId} placeholder="Select…" onChange={(x) => setRel({ ...rel, contractId: x })} options={contracts.map((x) => ({ value: x.id, label: `${x.id} — ${vendorName(st, x.vendorId)} (${inrShort(contractLedger(st, x).retentionBalance)} held)` }))} /></Field>
              <Field label="Basis"><Select value={rel.type} onChange={(x) => setRel({ ...rel, type: x })} options={["After DLP", "Against bank guarantee", "50% on completion"]} /></Field>
              <Field label="Amount (₹)" hint={c ? `Available ${inr(max)}` : ""}><NumInput value={rel.amount} onChange={(x) => setRel({ ...rel, amount: x })} /></Field>
              <Field label="Note" span={2}><TextInput value={rel.note} onChange={(x) => setRel({ ...rel, note: x })} placeholder="e.g. BG/ICICI/2026/551 received" /></Field>
            </div>
            {early && <div className="mt-3"><Note tone="amber">DLP runs until {fmtDate(dlpEnd)}. Release now only against a bank guarantee.</Note></div>}
          </Modal>
        );
      })()}
      {adv && (
        <Modal open onClose={() => setAdv(null)} width={520} title="Record advance paid to contractor" subtitle="Recovered automatically from RA bills at the contract's recovery %"
          footer={<><Btn onClick={() => setAdv(null)}>Cancel</Btn><Btn variant="primary" disabled={!adv.contractId || !(adv.amount > 0)} onClick={() => {
            setState((s) => { const c = byId(s.contracts, adv.contractId); c.advanceAmount = round2((c.advanceAmount || 0) + Number(adv.amount)); if (!c.advanceRecoveryPct) c.advanceRecoveryPct = 10; }, { entity: "Contract", id: adv.contractId, action: `${adv.type} of ${inr(adv.amount)} recorded (${adv.ref || "no ref"})` });
            toast("Advance recorded"); setAdv(null);
          }}>Save</Btn></>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contract" span={2}><Select value={adv.contractId} onChange={(x) => setAdv({ ...adv, contractId: x })} options={contracts.map((x) => ({ value: x.id, label: `${x.id} — ${vendorName(st, x.vendorId)}` }))} /></Field>
            <Field label="Type"><Select value={adv.type} onChange={(x) => setAdv({ ...adv, type: x })} options={["Mobilisation advance", "Secured advance (materials)", "Machinery advance"]} /></Field>
            <Field label="Amount (₹)"><NumInput value={adv.amount} onChange={(x) => setAdv({ ...adv, amount: x })} /></Field>
            <Field label="Date"><DateInput value={adv.date} onChange={(x) => setAdv({ ...adv, date: x })} /></Field>
            <Field label="Payment ref / BG no."><TextInput value={adv.ref} onChange={(x) => setAdv({ ...adv, ref: x })} /></Field>
          </div>
        </Modal>
      )}
    </Page>
  );
}
