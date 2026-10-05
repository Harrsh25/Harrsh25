// Scorecard depth: invoice accuracy, responsiveness (RFQ replies, PO acknowledgment) and claims,
// plus the supplier's own "My performance" view in the portal.

const KPI_LABEL = { quality: "Quality", timeliness: "Timeliness", safety: "Safety", compliance: "Compliance", invoiceAccuracy: "Invoice accuracy", responsiveness: "Responsiveness" };

function vendorKpis(st, vid) {
  // Invoice accuracy: bills that matched the PO and receipt first time (rejected bills count as wrong)
  const invs = st.invoices.filter((i) => i.vendorId === vid && !i.cancelled);
  const inv = invs.map((i) => (i.review === "Rejected" ? 0 : i.poId && byId(st.purchaseOrders, i.poId) ? ({ Matched: 100, "Matched (debit note)": 70 }[threeWay(st, i).status] ?? 30) : 100));
  // Responsiveness: RFQ replies by the due date and PO acknowledgment within the allowed days
  const ackDays = Number(settingsOf(st).poAckDays) || 3, resp = [];
  for (const r of st.rfqs.filter((x) => x.vendorIds.includes(vid) && x.status !== "Draft")) {
    const q = r.quotes.find((x) => x.vendorId === vid), declined = r.responses?.[vid]?.status === "Declined";
    if (q) resp.push(!r.dueDate || !q.submittedOn || q.submittedOn <= r.dueDate ? 100 : 60);
    else if (declined) resp.push(80);
    else if (r.dueDate && daysUntil(r.dueDate) < 0) resp.push(0);
  }
  for (const po of st.purchaseOrders.filter((p) => p.vendorId === vid && !["Draft", "Cancelled"].includes(p.status))) {
    if (po.ack?.at) resp.push(Math.round((new Date(po.ack.at) - new Date(po.date)) / DAY) <= ackDays ? 100 : 60);
    else if (poAckState(po) === "Awaiting acknowledgment" && -daysUntil(po.date) > ackDays) resp.push(0);
  }
  const cl = (st.contractClaims || []).filter((c) => c.vendorId === vid);
  return {
    invoiceAccuracy: inv.length ? sum(inv) / inv.length : null, invoices: invs.length,
    responsiveness: resp.length ? sum(resp) / resp.length : null, responses: resp.length,
    claims: { count: cl.length, open: cl.filter((c) => OPEN_CLAIM.includes(c.status)).length, rejected: cl.filter((c) => c.status === "Rejected").length, claimed: sum(cl, (c) => c.amount || 0), settled: sum(cl.filter((c) => c.status === "Settled"), (c) => c.settled?.amount ?? c.amount ?? 0) },
  };
}
// The two new measures join the metric weights (existing models keep their own weights; new ones start at 0)
function seedScoreKpis(s) {
  const w = s.scoreConfig?.weights;
  if (!w || "invoiceAccuracy" in w) return false;
  const dflt = w.quality === 30 && w.timeliness === 30 && w.safety === 20 && w.compliance === 20;
  s.scoreConfig.weights = dflt ? { quality: 25, timeliness: 25, safety: 15, compliance: 15, invoiceAccuracy: 10, responsiveness: 10 } : { ...w, invoiceAccuracy: 0, responsiveness: 0 };
  return true;
}

// Demo: Deccan Steel also supplies from a Karnataka depot (own GSTIN, Net 30, paid to its Kotak account)
function seedSites(s) {
  if (s.sitesSeeded) return false;
  s.sitesSeeded = true;
  const v = (s.vendors || []).find((x) => x.id === "VEN-003");
  if (v && !(v.addresses || []).some((a) => a.title === "Hosur depot")) {
    v.addresses = v.addresses || [];
    v.addresses.push({ id: "AD-HOSUR", title: "Hosur depot", type: "Warehouse", line1: "SIPCOT Phase II", line2: "", city: "Hosur", district: "Krishnagiri", state: "Tamil Nadu", pin: "635109", country: "India", purposes: ["Purchasing", "Pay"], bu: (s.settings || {}).ourCompany || "", gstin: "33AAMFD2231Q1ZR", paymentTerms: "Net 30", remitBank: "1", preferredBilling: false, preferredShipping: false, disabled: false });
  }
  return true;
}
// Supplier portal: the supplier sees its own score, measures, ratings and corrective actions
function MyPerformance({ vid }) {
  const st = useStore(), sc = vendorScore(st, vid), k = vendorKpis(st, vid), b = standingOf(st, vid);
  const ratings = st.ratings.filter((r) => r.vendorId === vid), caps = st.caps.filter((c) => c.vendorId === vid);
  const w = st.scoreConfig.weights || {};
  const parts = Object.keys(KPI_LABEL).map((key) => ({ key, label: KPI_LABEL[key], value: sc.parts?.[key], weight: w[key] || 0 }));
  return (
    <div className="space-y-4 p-4" data-my-performance>
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-line bg-white px-4 py-3">
        <span className="text-[13px] text-ink-soft">Overall score</span><ScoreBadge value={sc.score} />
        {b && <Status tone={b.color === "blue" ? "blue" : b.color}>{b.name}</Status>}
        {sc.score == null && <span className="text-[12.5px] text-ink-mute">No score yet - it starts with your first order, delivery or rating.</span>}
        {b && (b.preventRfq || b.preventPo) && <span className="text-[12.5px] text-red-600">{[b.preventRfq && "new RFQ invitations", b.preventPo && "new purchase orders"].filter(Boolean).join(" and ")} are paused at this standing</span>}
      </div>
      <Section title="How your score is made" icon={Icon.gauge}>
        <DataTable dense plain rows={parts} rowKey={(x) => x.key} columns={[
          { key: "l", label: "Measure", render: (x) => x.label },
          { key: "w", label: "Weight", align: "right", render: (x) => <span className="num">{x.weight}%</span> },
          { key: "v", label: "Your score", align: "right", render: (x) => (x.value == null ? <span className="text-ink-faint">No data</span> : <span className={cls("num font-semibold", x.value < 60 && "text-red-600")}>{Math.round(x.value)}</span>) },
        ]} />
      </Section>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile tone="blue" label="Bills matched first time" value={k.invoiceAccuracy == null ? "-" : `${Math.round(k.invoiceAccuracy)}%`} icon={Icon.receipt} />
        <StatTile tone="purple" label="On-time replies" value={k.responsiveness == null ? "-" : `${Math.round(k.responsiveness)}%`} icon={Icon.clock} />
        <StatTile tone="amber" label="Claims (open)" value={`${k.claims.count} (${k.claims.open})`} icon={Icon.scale} />
        <StatTile tone="red" label="Open corrective actions" value={caps.filter((c) => c.status === "Open").length} icon={Icon.clipboardList} />
      </div>
      <Section title="Ratings received" icon={Icon.star}>
        <DataTable dense plain rows={ratings.slice().reverse()} rowKey={(r) => r.id} empty={<p className="p-4 text-[13px] text-ink-mute">No ratings yet.</p>} columns={[
          { key: "p", label: "Period", render: (r) => r.period }, { key: "wo", label: "Work order", render: (r) => r.woId || "-" },
          { key: "q", label: "Quality · safety · manpower", render: (r) => `${r.quality} · ${r.safety} · ${r.manpower ?? "-"} / 5` },
          { key: "r", label: "Remarks", className: "whitespace-normal", render: (r) => r.remarks || "-" },
        ]} />
      </Section>
      {caps.length > 0 && <Section title="Corrective actions" icon={Icon.clipboardList}>
        <DataTable dense plain rows={caps} rowKey={(c) => c.id} columns={[
          { key: "id", label: "CAP", render: (c) => c.id }, { key: "i", label: "Issue", className: "whitespace-normal", render: (c) => c.issue },
          { key: "a", label: "Required actions", className: "whitespace-normal", render: (c) => c.actions }, { key: "d", label: "Due", render: (c) => fmtDate(c.dueDate) },
          { key: "s", label: "Status", render: (c) => <Status tone={c.status === "Open" ? (daysUntil(c.dueDate) < 0 ? "red" : "amber") : "gray"}>{c.status === "Open" && daysUntil(c.dueDate) < 0 ? "Overdue" : c.status}</Status> },
        ]} />
      </Section>}
    </div>
  );
}

// ---------------------------------------------------------------- vendor account statement (reconciliation)
// Amount owed to the vendor: bills (+), credit notes (+), debit notes (-), retention held (-) and released (+),
// payments incl. TDS (-), advances paid (-). An advance set off against a bill moves nothing (the advance already counted).
function vendorStatement(st, vid) {
  const rows = [];
  const add = (date, doc, kind, desc, amt, link) => rows.push({ date: (date || "").slice(0, 10), doc, kind, desc, debit: amt < 0 ? -amt : 0, credit: amt > 0 ? amt : 0, amt, link });
  for (const inv of st.invoices.filter((i) => i.vendorId === vid && !i.cancelled && i.review !== "Rejected" && i.review !== "Pending")) {
    const t = invoiceTotals(inv), to = `${VM_BASE}/invoices?open=${inv.id}`;
    add(inv.date, inv.id, "Bill", `${inv.number || "Bill"}${inv.poId ? ` · ${inv.poId}` : inv.raBillId ? ` · ${inv.raBillId}` : ""}`, t.gross, to);
    for (const n of inv.notes || []) add(n.date || inv.date, n.id || inv.id, n.type, n.reason || n.note || n.type, n.type === "Debit Note" ? -n.amount : n.amount, to);
    if (t.retention) add(inv.date, inv.id, "Retention held", `${inv.retentionPct}% retention`, -t.retention, to);
    if (t.retention && inv.retentionReleased?.amount) add(inv.retentionReleased.at || inv.date, inv.id, "Retention released", "Retention released", Math.min(t.retention, Number(inv.retentionReleased.amount) || 0), to);
    for (const p of inv.payments.filter((p) => !p.reversed && p.mode !== "Advance adjustment")) add(p.date, p.id, "Payment", `${p.mode || "Payment"}${p.ref ? ` ${p.ref}` : ""} against ${inv.id}${p.tds ? ` (TDS ${inr(p.tds)})` : ""}`, -(p.amount + (p.tds || 0)), to);
  }
  for (const a of st.vendorAdvances.filter((x) => x.vendorId === vid)) add(a.date, a.id, "Advance", `Advance paid${a.ref ? ` ${a.ref}` : ""}${a.allocated.length ? ` - ${inr(sum(a.allocated, (x) => x.amount))} set off` : ""}`, -a.amount, `${VM_BASE}/invoices`);
  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.kind === "Bill" ? -1 : 1));
  let bal = 0;
  rows.forEach((r) => { bal = round2(bal + r.amt); r.balance = bal; });
  const billBal = round2(sum(st.invoices.filter((i) => i.vendorId === vid), (i) => invoiceTotals(i).balance));
  const advLeft = round2(sum(st.vendorAdvances.filter((x) => x.vendorId === vid), (a) => a.amount - sum(a.allocated, (x) => x.amount)));
  return { rows, closing: bal, billBal, advLeft, ties: Math.abs(bal - (billBal - advLeft)) < 1 };
}
const STMT_PERIODS = ["All", "This financial year", "Last 90 days", "Last 30 days"];
function VendorStatement({ v }) {
  const st = useStore(), s = vendorStatement(st, v.id);
  const [per, setPer] = y.useState("All");
  const fy = `${new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1}-04-01`;
  const from = per === "This financial year" ? fy : per === "Last 90 days" ? shiftDays(-90) : per === "Last 30 days" ? shiftDays(-30) : "";
  const before = s.rows.filter((r) => from && r.date < from), shown = s.rows.filter((r) => !from || r.date >= from);
  const opening = before.length ? before[before.length - 1].balance : 0;
  const rows = [...(from ? [{ date: from, doc: "", kind: "Opening balance", desc: "Brought forward", debit: 0, credit: 0, balance: opening }] : []), ...shown];
  const bal = (x) => <span className={cls("num", x < 0 && "text-red-600")}>{inr(Math.abs(x))} {x < 0 ? "Dr" : x > 0 ? "Cr" : ""}</span>;
  return (
    <div className="space-y-3" data-statement>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile tone="blue" label="Billed" value={inrShort(sum(s.rows.filter((r) => r.kind === "Bill"), (r) => r.credit))} icon={Icon.receipt} />
        <StatTile tone="green" label="Paid (incl. TDS)" value={inrShort(sum(s.rows.filter((r) => r.kind === "Payment"), (r) => r.debit))} icon={Icon.check} />
        <StatTile tone="purple" label="Advance not set off" value={inrShort(s.advLeft)} icon={Icon.wallet} />
        <StatTile tone={s.closing > 0 ? "amber" : "green"} label="Closing balance" value={`${inrShort(Math.abs(s.closing))} ${s.closing < 0 ? "Dr" : "Cr"}`} icon={Icon.rupee} />
      </div>
      {!s.ties && <Note tone="red">The statement does not agree with the open bills ({inr(s.billBal)}) less unadjusted advances ({inr(s.advLeft)}) - check the bills.</Note>}
      <DataTable noun="entries" exportName={`statement-${v.id}`} rows={rows} rowKey={(r, i) => `${r.doc}-${r.kind}-${i}`}
        actions={<div className="w-[190px]"><Select value={per} onChange={(x) => setPer(x || "All")} options={STMT_PERIODS} /></div>}
        empty={<EmptyState icon={Icon.receipt} title="No transactions" text="Bills, payments and advances for this vendor appear here." />} columns={[
          { key: "d", label: "Date", render: (r) => fmtDate(r.date) },
          { key: "doc", label: "Document", render: (r) => (r.doc ? r.link ? <RefLink to={r.link}>{r.doc}</RefLink> : r.doc : "-") },
          { key: "k", label: "Type", filterOptions: ["Opening balance", "Bill", "Credit Note", "Debit Note", "Retention held", "Retention released", "Payment", "Advance"], filter: (r) => r.kind, render: (r) => r.kind },
          { key: "x", label: "Description", className: "whitespace-normal", render: (r) => r.desc },
          { key: "dr", label: "Debit", align: "right", render: (r) => (r.debit ? <span className="num">{inr(r.debit)}</span> : "") },
          { key: "cr", label: "Credit", align: "right", render: (r) => (r.credit ? <span className="num">{inr(r.credit)}</span> : "") },
          { key: "b", label: "Balance", align: "right", render: (r) => bal(r.balance) },
        ]} />
    </div>
  );
}
