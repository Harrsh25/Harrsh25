// One payables flow for every bill type (PO bills, direct bills, RA bills, labour bills):
// bill → payment proposal (Draft → Approved → Sent to bank → Paid / Failed) → payments on each bill.
// Labour suppliers bill verified attendance × the labour rate card (with OT, holiday, night and statutory load).

// ---------------------------------------------------------------- post payments on bills (used by proposals)
function postPayments(s, invIds, o) {
  let n = s.invoices.flatMap((i) => i.payments).length;
  const out = [];
  for (const id of invIds) {
    const x = byId(s.invoices, id);
    if (!x) continue;
    const t = invoiceTotals(x), v = byId(s.vendors, x.vendorId), next = nextInstalment(x);
    const payNow = next ? Math.min(t.balance, next.amount - next.paid) : t.balance;
    if (payNow <= 0.5) continue;
    const tds = billTds(s, x, v, t.taxable, payNow / (t.payable || 1));
    x.payments.push({ id: `PAY-${String(++n).padStart(3, "0")}`, date: o.date, amount: round2(payNow - tds), tds, mode: o.mode, ref: o.ref, refDate: o.date, paidFrom: o.paidFrom, proposalId: o.proposalId, by: currentUser(), at: new Date().toISOString() });
    if (x.raBillId && invoiceTotals(x).balance <= 0.5) { const b = byId(s.raBills, x.raBillId); if (b && b.status !== "Paid") { b.status = "Paid"; b.history.push({ status: "Paid", by: currentUser(), at: new Date().toISOString(), remark: `Paid in ${o.proposalId}` }); } }
    out.push(id);
  }
  return out;
}

// ---------------------------------------------------------------- payment proposals
const PP_TONE = { Draft: "gray", Approved: "blue", "Sent to bank": "purple", Paid: "green", Failed: "red", Cancelled: "gray" };
const OPEN_PP = ["Draft", "Approved", "Sent to bank", "Failed"];
const openProposalOf = (st, invId) => (st.paymentProposals || []).find((p) => OPEN_PP.includes(p.status) && p.invIds.includes(invId));
function proposalLines(st, p) {
  return p.invIds.map((id) => {
    const inv = byId(st.invoices, id);
    if (!inv) return null;
    const t = invoiceTotals(inv), v = byId(st.vendors, inv.vendorId), next = nextInstalment(inv);
    const payNow = next ? Math.min(t.balance, next.amount - next.paid) : t.balance;
    const tds = billTds(st, inv, v, t.taxable, payNow / (t.payable || 1));
    return { inv, v, payNow, tds, net: round2(payNow - tds), gate: paymentGate(st, inv) };
  }).filter(Boolean);
}
function createProposal(st, invIds) {
  const ok = invIds.filter((id) => { const i = byId(st.invoices, id); return i && invoiceTotals(i).balance > 0.5 && !paymentGate(st, i).stops.length && !openProposalOf(st, id); });
  const skipped = invIds.length - ok.length;
  if (!ok.length) return toast("None of the ticked bills can be proposed - they are blocked, paid or already in a proposal", "red");
  const id = nextId("PP", st.paymentProposals || []);
  setState((s) => {
    s.paymentProposals = s.paymentProposals || [];
    s.paymentProposals.unshift({ id, invIds: ok, status: "Draft", by: currentUser(), at: new Date().toISOString(), history: [{ status: "Draft", by: currentUser(), at: new Date().toISOString(), remark: `${ok.length} bill(s)` }] });
  }, { entity: "Payment", id, action: `Payment proposal ${id} created - ${ok.length} bill(s)` });
  toast(`${id} created${skipped ? ` - ${skipped} bill(s) left out (blocked, paid or already proposed)` : ""}`);
  return id;
}
function moveProposal(p, to, extra = {}, remark = "") {
  if (!guardMove("Payment proposal", p.status, to)) return false;
  setState((s) => {
    const x = byId(s.paymentProposals, p.id);
    Object.assign(x, extra, { status: to });
    if (to === "Paid") x.paidBills = postPayments(s, x.invIds, { date: extra.paidOn || todayISO(), mode: x.mode, ref: extra.utr || x.bankRef, paidFrom: x.paidFrom, proposalId: x.id });
    x.history.push({ status: to, by: currentUser(), at: new Date().toISOString(), remark });
  }, { entity: "Payment", id: p.id, action: `${p.id} → ${to}${remark ? ` - ${remark}` : ""}` });
  toast(`${p.id} ${to.toLowerCase()}`, to === "Failed" || to === "Cancelled" ? "red" : "green");
  return true;
}
function ProposalDrawer({ id, onClose }) {
  const st = useStore(), p = byId(st.paymentProposals || [], id);
  const [ask, setAsk] = y.useState(null), [bank, setBank] = y.useState(null);
  if (!p) return null;
  const lines = proposalLines(st, p), blocked = lines.filter((l) => l.gate.stops.length);
  const net = sum(lines, (l) => l.net);
  const actions = <>
    {p.status === "Draft" && <Btn variant="primary" disabled={!!blocked.length} title={blocked.length ? `${blocked[0].inv.id}: ${blocked[0].gate.stops[0]}` : ""} onClick={() => moveProposal(p, "Approved", { approvedBy: currentUser(), approvedAt: new Date().toISOString() })}>Approve</Btn>}
    {["Approved", "Failed"].includes(p.status) && <Btn variant="primary" onClick={() => setBank({ mode: p.mode || "", paidFrom: p.paidFrom || "", ref: "" })}>Send to bank</Btn>}
    {p.status === "Sent to bank" && <Btn variant="success" onClick={() => setBank({ confirm: true, utr: "", paidOn: todayISO() })}>Confirm paid</Btn>}
    {p.status === "Sent to bank" && <Btn variant="danger" onClick={() => setAsk("fail")}>Mark failed</Btn>}
    {["Draft", "Approved", "Failed"].includes(p.status) && <Btn variant="danger" onClick={() => setAsk("cancel")}>Cancel proposal</Btn>}
  </>;
  const bErr = !bank ? "" : bank.confirm ? (!(bank.utr || "").trim() ? "Enter the bank reference (UTR)" : !bank.paidOn || bank.paidOn > todayISO() ? "Enter the payment date (not in the future)" : "")
    : !bank.mode ? "Select the payment mode" : !bank.paidFrom ? "Select the company bank account" : !(bank.ref || "").trim() ? "Enter the bank file / batch reference" : "";
  return (
    <Drawer open onClose={onClose} width={860} title={`Payment proposal ${p.id}`} recordId={p.id} status={<Status tone={PP_TONE[p.status]}>{p.status}</Status>} actions={actions}
      details={[["Bills", p.invIds.length], ["Net to pay", inr(net)], ["Created by", `${p.by} · ${fmtDate(p.at.slice(0, 10))}`], p.approvedBy && ["Approved by", p.approvedBy], p.mode && ["Mode", `${p.mode} from ${p.paidFrom}`], p.bankRef && ["Bank file", p.bankRef], p.utr && ["UTR", p.utr]].filter(Boolean)}>
      <div className="space-y-4 px-6 py-5">
        {blocked.length > 0 && p.status === "Draft" && <Note tone="red">{blocked.length} bill(s) now fail a payment check - remove them by cancelling and proposing again: {blocked.map((l) => `${l.inv.id} (${l.gate.stops[0]})`).join(" · ")}</Note>}
        <DataTable dense plain rows={lines} rowKey={(l) => l.inv.id} columns={[
          { key: "b", label: "Bill", render: (l) => <RefLink to={`${VM_BASE}/invoices?open=${l.inv.id}`}>{l.inv.id}</RefLink> },
          { key: "v", label: "Vendor", render: (l) => l.v?.name },
          { key: "s", label: "Type", render: (l) => l.inv.source },
          { key: "p", label: "Paying", align: "right", render: (l) => <span className="num">{inr(l.payNow)}</span> },
          { key: "t", label: "TDS", align: "right", render: (l) => <span className="num">{l.tds ? inr(l.tds) : "-"}</span> },
          { key: "n", label: "Net", align: "right", render: (l) => <b className="num">{inr(l.net)}</b> },
        ]} />
        <Section title="History" icon={Icon.clock}><ul className="divide-y divide-line">{p.history.slice().reverse().map((h, i) => <li key={i} className="px-4 py-2 text-[12.5px]"><b>{h.status}</b> · {h.by} · {fmtDateTime(h.at)}{h.remark ? ` - ${h.remark}` : ""}</li>)}</ul></Section>
      </div>
      {ask && <ReasonModal title={ask === "fail" ? `Bank rejected ${p.id}` : `Cancel ${p.id}`} text={ask === "fail" ? "The bills stay unpaid; send the proposal again after fixing the problem." : "The bills go back to the open list."} action={ask === "fail" ? "Mark failed" : "Cancel proposal"}
        onClose={() => setAsk(null)} onDone={(r) => moveProposal(p, ask === "fail" ? "Failed" : "Cancelled", {}, r)} />}
      {bank && (
        <Modal open onClose={() => setBank(null)} width={520} title={bank.confirm ? `Confirm payment - ${p.id}` : `Send ${p.id} to bank`}
          footer={<><Btn onClick={() => setBank(null)}>Cancel</Btn><Btn variant="primary" disabled={!!bErr} title={bErr} onClick={() => { const ok = bank.confirm ? moveProposal(p, "Paid", { utr: bank.utr.trim(), paidOn: bank.paidOn }, `UTR ${bank.utr.trim()}`) : moveProposal(p, "Sent to bank", { mode: bank.mode, paidFrom: bank.paidFrom, bankRef: bank.ref.trim(), sentAt: new Date().toISOString() }, `${bank.mode} batch ${bank.ref.trim()}`); if (ok) setBank(null); }}>{bank.confirm ? "Confirm paid" : "Send"}</Btn></>}>
          <div className="grid grid-cols-2 gap-3">
            {bank.confirm ? <>
              <Field label="Bank reference (UTR)" required><TextInput value={bank.utr} onChange={(x) => setBank({ ...bank, utr: x })} /></Field>
              <Field label="Payment date" required><DateInput value={bank.paidOn} onChange={(x) => setBank({ ...bank, paidOn: x })} /></Field>
            </> : <>
              <Field label="Payment mode" required><Select value={bank.mode} onChange={(x) => setBank({ ...bank, mode: x })} options={PAY_MODES.filter((m) => m !== "Cheque")} /></Field>
              <Field label="Company bank account" required><Select value={bank.paidFrom} onChange={(x) => setBank({ ...bank, paidFrom: x })} options={settingsOf(st).companyBanks} /></Field>
              <Field label="Bank file / batch reference" required span={2}><TextInput value={bank.ref} onChange={(x) => setBank({ ...bank, ref: x })} /></Field>
            </>}
          </div>
        </Modal>
      )}
    </Drawer>
  );
}
function ProposalsTab() {
  const st = useStore(), [open, setOpen] = y.useState(null);
  const rows = (st.paymentProposals || []).map((p) => ({ p, lines: proposalLines(st, p) }));
  return (
    <>
      <DataTable noun="payment proposals" rows={rows} rowKey={(r) => r.p.id} onRow={(r) => setOpen(r.p.id)}
        empty={<EmptyState icon={Icon.rupee} title="No payment proposals" text="Tick bills on the Bills tab and use Propose payment." />} columns={[
          { key: "id", label: "Proposal", render: (r) => r.p.id },
          { key: "n", label: "Bills", align: "right", render: (r) => r.p.invIds.length },
          { key: "v", label: "Vendors", className: "max-w-[240px] truncate", render: (r) => [...new Set(r.lines.map((l) => l.v?.name))].join(", ") },
          { key: "a", label: "Net", align: "right", render: (r) => <span className="num">{inr(sum(r.lines, (l) => l.net))}</span> },
          { key: "s", label: "Status", filterOptions: Object.keys(PP_TONE), filter: (r) => r.p.status, render: (r) => <Status tone={PP_TONE[r.p.status]}>{r.p.status}</Status> },
        ]} />
      {open && <ProposalDrawer id={open} onClose={() => setOpen(null)} />}
    </>
  );
}

// ---------------------------------------------------------------- labour bill (labour suppliers: attendance × rate card)
// Statutory load on top of the wage: PF and ESI % from the rate card
// Escalation: the rate grows by the yearly % for every full year since the card took effect
function escalatedRate(card, on = todayISO()) {
  const r = Number(card?.rate) || 0, e = Number(card?.escalationPct) || 0;
  if (!e || !card?.effectiveFrom) return r;
  const years = Math.floor((new Date(on) - new Date(card.effectiveFrom)) / (365 * DAY));
  return years > 0 ? round2(r * Math.pow(1 + e / 100, years)) : r;
}
const loadedRate = (card, on) => round2(escalatedRate(card, on) * (1 + ((Number(card?.pfPct) || 0) + (Number(card?.esiPct) || 0)) / 100));
function labourBillRows(st, vid, from, to) {
  const att = st.attendance.filter((a) => a.verified && !a.billedIn && !a.rolledInto && a.date >= from && a.date <= to && byId(st.workers, a.workerId)?.vendorId === vid);
  const by = {};
  for (const a of att) {
    const w = byId(st.workers, a.workerId), card = workerRateCard(st, w), key = `${w.trade}|${w.skill}`;
    const r = (by[key] = by[key] || { key, trade: w.trade, skill: w.skill, card, rate: loadedRate(card, to), days: 0, ot: 0, extra: 0, ids: [] });
    const d = manDays(a);
    r.days += d; r.ot += a.ot || 0; r.ids.push(a.id || `${a.date}|${a.workerId}|${a.woId}`);
    if (a.dayType === "Sunday / holiday") r.extra += d * ((Number(card?.holidayMultiplier) || 2) - 1);
    if (a.dayType === "Night shift") r.extra += d * (Number(card?.nightAllowancePct) || 0) / 100;
  }
  return Object.values(by).map((r) => { const otDays = (r.ot / 8) * (Number(r.card?.otMultiplier) || 2); const qty = round2(r.days + otDays + r.extra); return { ...r, otDays: round2(otDays), qty, amount: round2(qty * r.rate) }; });
}
const attKey = (a) => a.id || `${a.date}|${a.workerId}|${a.woId}`;
function LabourBillTab() {
  const st = useStore();
  const suppliers = st.vendors.filter((v) => hasType(v, "Labor") && st.workers.some((w) => w.vendorId === v.id));
  const [f, setF] = y.useState({ vendorId: "", from: shiftDays(-30), to: shiftDays(-1), number: "" });
  const rows = f.vendorId ? labourBillRows(st, f.vendorId, f.from, f.to) : [];
  const v = byId(st.vendors, f.vendorId);
  const unverified = f.vendorId ? st.attendance.filter((a) => !a.verified && a.date >= f.from && a.date <= f.to && byId(st.workers, a.workerId)?.vendorId === f.vendorId).length : 0;
  const noRate = rows.filter((r) => !r.card);
  const err = !f.vendorId ? "Select the labour supplier" : !f.from || !f.to || f.to < f.from ? "Enter a valid period" : f.to > todayISO() ? "Period can't end in the future"
    : !rows.length ? "No verified, unbilled attendance in this period" : noRate.length ? `No approved rate card for ${noRate.map((r) => `${r.trade} (${r.skill})`).join(", ")}`
    : !f.number.trim() ? "Enter the supplier's bill number" : st.invoices.some((i) => i.vendorId === f.vendorId && normNo(i.number) === normNo(f.number)) ? "This bill number is already recorded" : v && isBlockedFor(v, "Invoices") ? `${v.name} is on hold for invoices` : "";
  const create = () => {
    const id = nextId("INV", st.invoices), keys = new Set(rows.flatMap((r) => r.ids));
    setState((s) => {
      s.invoices.unshift({ id, vendorId: f.vendorId, source: "Labour bill", number: f.number.trim(), date: todayISO(), due: shiftDays(parseInt(String(v.paymentTerms || "").replace(/\D/g, ""), 10) || 30), gstPct: 18, hold: null, notes: [], payments: [],
        lines: rows.map((r) => ({ desc: `${r.trade} (${r.skill}) - ${num(r.days)} man-days${r.ot ? ` + ${num(r.ot)} OT h` : ""}${r.extra ? ` + ${num(r.extra)} holiday / night` : ""}`, qty: r.qty, rate: r.rate, unit: "man-day" })),
        period: { from: f.from, to: f.to }, enteredBy: currentUser() });
      for (const a of s.attendance) if (keys.has(attKey(a))) a.billedIn = id;
    }, { entity: "Invoice", id, action: `Labour bill ${f.number.trim()} for ${fmtDate(f.from)} – ${fmtDate(f.to)} - ${inr(sum(rows, (r) => r.amount))} + GST` });
    toast(`${id} raised - verified attendance billed`); setF({ ...f, number: "" });
  };
  return (
    <div className="space-y-3 p-4" data-labour-bill>
      <div className="grid grid-cols-4 gap-3">
        <Field label="Labour supplier" required><Select value={f.vendorId} onChange={(x) => setF({ ...f, vendorId: x })} options={suppliers.map((x) => ({ value: x.id, label: x.name }))} /></Field>
        <Field label="From" required><DateInput value={f.from} onChange={(x) => setF({ ...f, from: x })} /></Field>
        <Field label="To" required><DateInput value={f.to} onChange={(x) => setF({ ...f, to: x })} /></Field>
        <Field label="Supplier bill no." required><TextInput value={f.number} onChange={(x) => setF({ ...f, number: x })} /></Field>
      </div>
      {unverified > 0 && <Note tone="amber">{unverified} attendance record(s) in this period are not verified yet and are left out.</Note>}
      <DataTable dense rows={rows} rowKey={(r) => r.key} empty={<p className="p-4 text-[13px] text-ink-mute">{f.vendorId ? "No verified, unbilled attendance in this period." : "Select a labour supplier."}</p>} columns={[
        { key: "t", label: "Trade", render: (r) => `${r.trade} (${r.skill})` },
        { key: "d", label: "Man-days", align: "right", render: (r) => <span className="num">{num(r.days)}</span> },
        { key: "o", label: "OT → man-days", align: "right", render: (r) => <span className="num">{num(r.ot)} h → {num(r.otDays)}</span> },
        { key: "e", label: "Holiday / night", align: "right", render: (r) => <span className="num">{r.extra ? `+${num(round2(r.extra))}` : "-"}</span> },
        { key: "r", label: "Rate incl. PF / ESI", align: "right", render: (r) => <span className="num">{r.card ? inr(r.rate) : "No rate card"}</span> },
        { key: "a", label: "Amount", align: "right", render: (r) => <b className="num">{inr(r.amount)}</b> },
      ]} />
      <div className="flex items-center justify-end gap-3"><span className="text-[13px]">Total <b className="num">{inr(sum(rows, (r) => r.amount))}</b> + GST 18%</span><Btn variant="primary" disabled={!!err} title={err} onClick={create}>Raise labour bill</Btn></div>
    </div>
  );
}
