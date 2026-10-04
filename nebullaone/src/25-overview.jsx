// Overview dashboards - one per module: Vendor Management (vendors, compliance, sourcing, POs, payables)
// and Contract & Labor (contracts, work orders, measurement, RA billing, retention, labour). Each reads only its own module.

const DONUT_HEX = { green: "#16a34a", blue: "#2563eb", amber: "#f59e0b", red: "#dc2626", purple: "#7c3aed", gray: "#9ca3af", cyan: "#0891b2" };
const SEV = { critical: { label: "Critical", tone: "red" }, attention: { label: "Attention", tone: "amber" }, pending: { label: "Pending", tone: "blue" } };

function DashCard({ title, icon, link, right, className, children }) {
  return (
    <section className={cls("flex min-w-0 flex-col rounded-xl border border-line bg-white", className)}>
      <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <h3 className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">{icon && h(icon, { size: 14, className: "text-brand" })}{title}</h3>
        <span className="flex items-center gap-2">{right}{link && <RouterLink to={link.to} className="text-[12px] font-medium text-brand hover:underline">{link.label} →</RouterLink>}</span>
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

function Donut({ data, center, sub, onPick }) {
  const total = sum(data, (d) => d.value), r = 38, c = 2 * Math.PI * r;
  let off = 0;
  return (
    <div className="flex items-center gap-5 px-4 py-3">
      <div className="relative h-[104px] w-[104px] shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#eef0f4" strokeWidth="13" />
          {total > 0 && data.filter((d) => d.value > 0).map((d) => {
            const len = (d.value / total) * c, el = <circle key={d.label} cx="50" cy="50" r={r} fill="none" stroke={DONUT_HEX[d.tone]} strokeWidth="13" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-off} />;
            off += len; return el;
          })}
        </svg>
        <span className="absolute inset-0 grid place-items-center text-center"><span><b className="block text-[20px] leading-none">{center}</b><span className="text-[10.5px] text-ink-mute">{sub}</span></span></span>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {data.map((d) => (
          <li key={d.label}>
            <button type="button" onClick={() => onPick && onPick(d)} className="flex w-full items-center gap-2 rounded px-1 text-left text-[12.5px] hover:bg-gray-50">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: DONUT_HEX[d.tone] }} />
              <span className="flex-1 truncate text-ink-soft">{d.label}</span>
              <b className="num w-6 text-right">{d.value}</b>
              <span className="num w-10 rounded bg-gray-100 px-1 text-right text-[11px] text-ink-soft">{total ? Math.round((d.value / total) * 100) : 0}%</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const Bar = ({ value, color = "bg-brand" }) => (
  <span className="flex items-center gap-2"><span className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-200"><span className={cls("block h-full rounded-full", color)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></span><span className="num w-9 text-right text-[12px] text-ink-soft">{Math.round(value)}%</span></span>
);
const Chips = ({ items, active, onChange }) => (
  <span className="flex gap-1">{items.map((i) => (
    <button key={i.id} type="button" aria-pressed={active === i.id} onClick={() => onChange(i.id)} className={cls("rounded-full px-2 py-0.5 text-[11.5px] font-medium", active === i.id ? "bg-ink text-white" : "bg-gray-100 text-ink-soft hover:bg-gray-200")}>{i.label}{i.n != null ? ` ${i.n}` : ""}</button>
  ))}</span>
);
const ageText = (iso) => { const d = daysUntil(iso); return d === null ? "-" : d < 0 ? `${-d} day${d === -1 ? "" : "s"} overdue` : d === 0 ? "today" : `in ${d} day${d === 1 ? "" : "s"}`; };

// ---------------------------------------------------------------- data model
function woHealth(st, wo) {
  const pr = woProgress(st, wo);
  if (wo.status === "Completed" || pr.physical >= 99.5) return { label: "Completed", tone: "blue", pr };
  if (pr.spi < 0.8) return { label: "Delayed", tone: "red", pr };
  if (pr.spi < 0.95) return { label: "At risk", tone: "amber", pr };
  return { label: "On track", tone: "green", pr };
}
function contractHealth(st, c) {
  const wos = st.workOrders.filter((w) => w.contractId === c.id && w.status !== "Draft");
  const cs = contractStatus(c);
  const value = contractValue(c) || 1;
  const measured = sum(wos, (w) => woProgress(st, w).measured), billed = sum(wos, (w) => woProgress(st, w).billed);
  const led = contractLedger(st, c);
  const hs = wos.map((w) => woHealth(st, w).label);
  const status = ["Completed", "In DLP", "Closed"].includes(cs) || (wos.length && hs.every((x) => x === "Completed")) ? "Completed"
    : hs.includes("Delayed") ? "Delayed" : hs.includes("At risk") ? "At risk" : "On track";
  const act = wos.filter((w) => ["Issued", "In Progress"].includes(w.status));
  const spi = act.length ? sum(act, (w) => Math.min(1.5, woProgress(st, w).spi)) / act.length : 1;
  return { c, cs, status, value: contractValue(c), physical: (measured / value) * 100, billing: (billed / value) * 100, payment: (led.paid / value) * 100, measured, billed, led, spi, wos };
}

// ---------------------------------------------------------------- shared helpers
const SEV_ORDER = { critical: 0, attention: 1, pending: 2 };
const sortActions = (A) => A.sort((a, b) => SEV_ORDER[a.sev] - SEV_ORDER[b.sev] || (b.amount || 0) - (a.amount || 0));
const V_ENTITIES = ["Vendor", "RFQ", "PO", "Invoice", "Invite", "Ticket", "Settings", "CAP", "Blanket Order", "Scorecard", "Payment", "Compliance", "Advance"];
const C_ENTITIES = ["Work Order", "RA Bill", "Measurement", "Contract", "RA Claim", "Retention", "Labour Rate", "Attendance", "Worker"];
const periodOk = (f, iso) => !iso || f.period === "all" || daysUntil(String(iso).slice(0, 10)) >= -Number(f.period);
function recentActivity(st, f, entities) {
  const vName = f.vendor !== "All" ? vendorName(st, f.vendor) : null;
  return st.audit.filter((a) => entities.includes(a.entity) && periodOk(f, a.at) && (!vName || a.id === f.vendor || String(a.action).includes(vName) || String(a.action).includes(f.vendor)))
    .slice().sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12);
}

// ---------------------------------------------------------------- Vendor Management data
// Registry · Approvals · Compliance · RFQ · Blanket orders · Purchase orders · Invoices & payments · Scorecard · Portal
function buildVendorOverview(st, f) {
  const projOk = (p) => f.project === "All" || p === f.project;
  const vend = (id) => f.vendor === "All" || id === f.vendor;
  const pos = st.purchaseOrders.filter((p) => vend(p.vendorId) && projOk(p.project));
  const poIds = new Set(pos.map((p) => p.id));
  const invs = st.invoices.filter((i) => vend(i.vendorId) && (f.project === "All" || (i.poId ? poIds.has(i.poId) : i.raBillId ? projOk(byId(st.workOrders, byId(st.raBills, i.raBillId)?.woId)?.project) : false)));
  const rfqs = st.rfqs.filter((r) => projOk(r.project) && (f.vendor === "All" || r.vendorIds.includes(f.vendor)));
  const engaged = new Set([...pos.map((p) => p.vendorId), ...rfqs.flatMap((r) => r.vendorIds), ...invs.map((i) => i.vendorId)]);
  const vendors = st.vendors.filter((v) => vend(v.id) && (f.project === "All" || engaged.has(v.id)));
  const live = vendors.filter((v) => !["Blacklisted", "Inactive", "Rejected", "Draft"].includes(v.status));
  const open$ = invs.filter((i) => invoiceTotals(i).balance > 0.5);
  const blocked = open$.filter((i) => shouldBePaid(st, i) === "No" && paymentGate(st, i).stops.length);
  const livePOs = pos.filter((p) => !["Draft", "Closed", "Cancelled"].includes(p.status) && poStatus(p) !== "Received");
  const latePOs = livePOs.filter((p) => daysUntil(p.deliveryDate) < 0);
  const openRfqs = rfqs.filter((r) => ["Sent", "Quotes Received", "Partially Awarded"].includes(r.status));
  const bos = st.blanketOrders.filter((b) => vend(b.vendorId) && (f.project === "All" || !b.project || b.project === f.project));

  const A = [];
  for (const i of blocked) A.push({ sev: "critical", title: "Payment blocked", detail: paymentGate(st, i).stops[0], who: vendorName(st, i.vendorId), ref: billAgainst(st, i)[0], amount: invoiceTotals(i).balance, due: i.due, act: "Resolve", to: `${VM_BASE}/invoices?open=${i.id}` });
  for (const i of open$.filter((x) => invoiceStatus(x) === "Overdue" && !blocked.includes(x)))
    A.push({ sev: "attention", title: "Payment overdue", detail: `Due ${fmtDate(i.due)} - ready to pay`, who: vendorName(st, i.vendorId), ref: billAgainst(st, i)[0], amount: invoiceTotals(i).balance, due: i.due, act: "Pay", to: `${VM_BASE}/invoices?open=${i.id}` });
  for (const v of live) {
    const cp = complianceOf(v);
    if (cp.blocking.length) A.push({ sev: "critical", title: "Compliance gap - payments held", detail: cp.blocking[0], who: v.name, ref: `${cp.blocking.length} blocking item${cp.blocking.length > 1 ? "s" : ""}`, amount: null, due: null, act: "Review", to: `${VM_BASE}/compliance?open=${v.id}` });
    const pend = v.docs.filter((d) => d.status === "Pending").length + (v.insurance || []).filter((p) => p.status === "Pending").length;
    if (pend) A.push({ sev: "pending", title: "Documents to verify", detail: `${pend} upload${pend > 1 ? "s" : ""} waiting in the verification queue`, who: v.name, ref: "Compliance", amount: null, due: null, act: "Verify", to: `${VM_BASE}/compliance?open=${v.id}` });
  }
  for (const v of vendors.filter((x) => x.status === "Pending Approval"))
    A.push({ sev: "pending", title: "Vendor approval pending", detail: `Waiting for ${(v.approval.stages.find((s2) => s2.status === "Pending") || {}).dept || "approver"}`, who: v.name, ref: v.type, amount: null, due: v.createdAt, age: true, act: "Review", to: `${VM_BASE}/approvals?open=${v.id}` });
  for (const v of vendors.filter((x) => x.status === "Changes Requested"))
    A.push({ sev: "pending", title: "Waiting for vendor to fix registration", detail: (v.changeRequest?.items || []).map((i) => i.label).join(", ") || "Changes requested", who: v.name, ref: v.changeRequest?.dept || "", amount: null, due: v.changeRequest?.at?.slice(0, 10), age: true, act: "View", to: `${VM_BASE}/approvals?open=${v.id}` });
  if (f.vendor === "All") for (const i of st.invites.filter((x) => x.status === "Invited" && daysUntil(x.sentOn) <= -7))
    A.push({ sev: "attention", title: "Invitation not answered", detail: `Sent to ${i.email}`, who: i.name, ref: i.category || "Invitation", amount: null, due: i.sentOn, age: true, act: "Remind", to: `${VM_BASE}/registry` });
  for (const r of rfqs.filter((x) => x.status === "Draft"))
    A.push({ sev: "pending", title: "RFQ not sent yet", detail: `${r.vendorIds.length} vendor(s) selected`, who: r.title, ref: r.project, amount: null, due: r.createdOn, age: true, act: "Send", to: `${VM_BASE}/rfq?open=${r.id}` });
  for (const r of openRfqs.filter((x) => daysUntil(x.dueDate) < 0))
    A.push({ sev: "attention", title: "RFQ past due - not awarded", detail: `${r.quotes.length} quote(s) received`, who: r.title, ref: r.project, amount: null, due: r.dueDate, act: "Award", to: `${VM_BASE}/rfq?open=${r.id}` });
  for (const p of pos.filter((x) => x.status === "Draft"))
    A.push({ sev: "pending", title: "PO awaiting approval", detail: itemsSummary(p.lines), who: vendorName(st, p.vendorId), ref: p.project, amount: poValue(p), due: p.date, age: true, act: "Review", to: `${VM_BASE}/purchase-orders?open=${p.id}` });
  for (const p of latePOs)
    A.push({ sev: "attention", title: "Delivery late", detail: `${itemsSummary(p.lines)} · ${poStatus(p).toLowerCase()}`, who: vendorName(st, p.vendorId), ref: p.project, amount: poValue(p), due: p.deliveryDate, act: "View", to: `${VM_BASE}/purchase-orders?open=${p.id}` });
  for (const c of st.caps.filter((x) => x.status === "Open" && vend(x.vendorId)))
    A.push({ sev: daysUntil(c.dueDate) < 0 ? "attention" : "pending", title: "Corrective action open", detail: c.issue, who: vendorName(st, c.vendorId), ref: c.owner, amount: null, due: c.dueDate, act: "View", to: `${VM_BASE}/scorecard` });
  for (const t of st.tickets.filter((x) => x.status !== "Closed" && x.status !== "Resolved" && vend(x.vendorId)))
    A.push({ sev: "pending", title: "Supplier query open", detail: t.subject, who: vendorName(st, t.vendorId), ref: "Supplier portal", amount: null, due: t.raisedOn, age: true, act: "View", to: `${VM_BASE}/portal` });
  sortActions(A);

  const E = [];
  for (const v of live) for (const it of complianceItems(v).filter((x) => x.level > 0)) {
    const d = daysUntil(it.expiry);
    E.push({ name: it.name, who: v.name, date: it.expiry, text: it.expiry ? (d < 0 ? `Expired ${-d} days ago` : `Expires in ${d} days`) : it.note,
      state: it.level === 2 ? (it.expiry && d < 0 ? "Expired" : "Missing") : it.note === "Awaiting verification" ? "Pending" : "Due soon", to: `${VM_BASE}/compliance?open=${v.id}` });
  }
  for (const i of open$.filter((x) => { const d = daysUntil(x.due); return d !== null && d >= 0 && d <= 7; }))
    E.push({ name: "Vendor payment due", who: `${vendorName(st, i.vendorId)} · ${inrShort(invoiceTotals(i).balance)}`, date: i.due, text: `Due ${ageText(i.due)}`, state: "Due soon", to: `${VM_BASE}/invoices?open=${i.id}` });
  for (const p of livePOs.filter((x) => { const d = daysUntil(x.deliveryDate); return d >= 0 && d <= 7; }))
    E.push({ name: "PO delivery due", who: `${vendorName(st, p.vendorId)} · ${itemsSummary(p.lines)}`, date: p.deliveryDate, text: `Due ${ageText(p.deliveryDate)}`, state: "Due soon", to: `${VM_BASE}/purchase-orders?open=${p.id}` });
  for (const r of openRfqs.filter((x) => { const d = daysUntil(x.dueDate); return d >= 0 && d <= 5; }))
    E.push({ name: "RFQ quotes due", who: r.title, date: r.dueDate, text: `Closes ${ageText(r.dueDate)}`, state: "Due soon", to: `${VM_BASE}/rfq?open=${r.id}` });
  for (const b of bos.filter((x) => blanketStatus(st, x) === "Active" && daysUntil(x.deadline) <= 60))
    E.push({ name: "Blanket agreement ends", who: `${vendorName(st, b.vendorId)} · ${b.title}`, date: b.deadline, text: `Ends ${ageText(b.deadline)}`, state: "Due soon", to: `${VM_BASE}/blanket-orders?open=${b.id}` });
  E.sort((a, b) => (a.date || "0000").localeCompare(b.date || "0000"));

  const rfqsP = rfqs.filter((r) => r.status !== "Draft" && periodOk(f, r.createdOn));
  const rfqPOs = st.purchaseOrders.filter((p) => p.rfqId && rfqsP.some((r) => r.id === p.rfqId));
  const proc = {
    steps: [{ label: "RFQs", n: rfqsP.length }, { label: "Quoted", n: rfqsP.filter((r) => r.quotes.length).length }, { label: "Evaluation", n: rfqsP.filter((r) => r.status === "Quotes Received").length },
      { label: "Awarded", n: rfqsP.filter((r) => ["Awarded", "Partially Awarded", "Closed"].includes(r.status)).length }, { label: "PO issued", n: new Set(rfqPOs.map((p) => p.rfqId)).size }],
    avgDays: rfqPOs.length ? Math.round(sum(rfqPOs, (p) => Math.max(0, (new Date(p.date) - new Date(byId(st.rfqs, p.rfqId).createdOn)) / DAY)) / rfqPOs.length) : null,
  };
  proc.conversion = rfqsP.length ? Math.round((proc.steps[3].n / rfqsP.length) * 100) : 0;

  const issued = pos.filter((p) => !["Draft", "Cancelled"].includes(p.status));
  const delivery = {
    awaiting: issued.filter((p) => poStatus(p) === "Issued" && daysUntil(p.deliveryDate) >= 0).length,
    partial: issued.filter((p) => poStatus(p) === "Partially Received" && daysUntil(p.deliveryDate) >= 0).length,
    late: latePOs.length, received: issued.filter((p) => ["Received", "Closed"].includes(poStatus(p))).length,
    returns: sum(pos, (p) => (p.returns || []).length),
    boActive: bos.filter((b) => blanketStatus(st, b) === "Active").length,
    boUse: (() => { const a = bos.filter((b) => blanketStatus(st, b) === "Active"); const u = a.map((b) => blanketUsage(st, b)); const val = sum(u, (x) => sum(x, (l) => l.qty * l.rate)), used = sum(u, (x) => sum(x, (l) => l.ordered * l.rate)); return val ? (used / val) * 100 : 0; })(),
  };
  const aging = [
    { label: "Not yet due", tone: "bg-blue-500", v: sum(open$.filter((i) => daysUntil(i.due) >= 0), (i) => invoiceTotals(i).balance) },
    { label: "1–30 days overdue", tone: "bg-amber-400", v: sum(open$.filter((i) => daysUntil(i.due) < 0 && daysUntil(i.due) >= -30), (i) => invoiceTotals(i).balance) },
    { label: "31–60 days", tone: "bg-orange-500", v: sum(open$.filter((i) => daysUntil(i.due) < -30 && daysUntil(i.due) >= -60), (i) => invoiceTotals(i).balance) },
    { label: "Over 60 days", tone: "bg-red-600", v: sum(open$.filter((i) => daysUntil(i.due) < -60), (i) => invoiceTotals(i).balance) },
  ];
  const paidInPeriod = sum(invs.flatMap((i) => i.payments).filter((p) => periodOk(f, p.date)), (p) => p.amount);
  const perf = vendors.map((v) => ({ v, ...vendorScore(st, v.id) })).filter((x) => x.score != null).sort((a, b) => b.score - a.score);
  return { vendors, live, open$, blocked, livePOs, latePOs, openRfqs, actions: A, expiring: E, proc, delivery, aging, paidInPeriod, invs,
    activity: recentActivity(st, f, V_ENTITIES), perf };
}

// ---------------------------------------------------------------- Contract & Labor data
// Onboarding · Contracts · Work orders · Labour attendance · Measurement book · RA bills · Retention · Labour rates · Performance
function buildContractOverview(st, f) {
  const projOk = (p) => f.project === "All" || p === f.project;
  const vend = (id) => f.vendor === "All" || id === f.vendor;
  const contracts = st.contracts.filter((c) => vend(c.vendorId) && projOk(c.project));
  const wos = st.workOrders.filter((w) => vend(w.vendorId) && projOk(w.project) && w.status !== "Draft");
  const woIds = new Set(wos.map((w) => w.id));
  const raBills = st.raBills.filter((b) => woIds.has(b.woId));
  const mbs = st.measurements.filter((m) => woIds.has(m.woId));
  const liveWOs = wos.filter((w) => ["Issued", "In Progress"].includes(w.status));
  const health = contracts.map((c) => contractHealth(st, c));
  const accrued = sum(mbs.filter((m) => m.jms.status === "Signed" && !m.billedIn), (m) => {
    const wo = byId(st.workOrders, m.woId); return wo.type === "Lump Sum" ? 0 : m.qty * (wo.items.find((i) => i.id === m.lineId)?.rate || 0);
  }) + sum(wos.filter((w) => w.type === "Lump Sum"), (wo) => Math.max(0, woProgress(st, wo).measured - woProgress(st, wo).billed));
  const inCert = raBills.filter((b) => ["Submitted", "Verified", "Certified"].includes(b.status));
  const contractors = st.vendors.filter((v) => (v.isContractor || hasType(v, "Labor")) && vend(v.id) && (f.project === "All" || contracts.some((c) => c.vendorId === v.id) || wos.some((w) => w.vendorId === v.id)));

  const A = [];
  for (const w of liveWOs) {
    const hl = woHealth(st, w);
    if (hl.label === "Delayed" || hl.label === "At risk")
      A.push({ sev: hl.label === "Delayed" ? "critical" : "attention", title: hl.label === "Delayed" ? "Work order delayed" : "Work order at risk", detail: `${hl.pr.physical.toFixed(0)}% done vs ${hl.pr.planned.toFixed(0)}% planned (SPI ${hl.pr.spi.toFixed(2)})`, who: vendorName(st, w.vendorId), ref: w.title, amount: null, due: w.end, act: "View", to: `${CL_BASE}/work-orders?open=${w.id}` });
    if (w.acceptance?.status === "Pending") A.push({ sev: "pending", title: "Work order not yet accepted", detail: w.title, who: vendorName(st, w.vendorId), ref: "Contractor", amount: woValue(w), due: w.issuedOn, age: true, act: "View", to: `${CL_BASE}/work-orders?open=${w.id}` });
    if (w.acceptance?.status === "Declined") A.push({ sev: "critical", title: "Work order declined", detail: w.acceptance.reason || "Declined by contractor", who: vendorName(st, w.vendorId), ref: w.title, amount: woValue(w), due: null, act: "Revise", to: `${CL_BASE}/work-orders?open=${w.id}` });
  }
  for (const r of st.laborRates.filter((x) => x.status === "Active" && x.rate < x.minWage && (!x.vendorId || vend(x.vendorId))))
    A.push({ sev: "critical", title: "Wage below minimum", detail: `${r.trade} (${r.skill}) ${inr(r.rate)}/day vs ${inr(r.minWage)} minimum`, who: r.vendorId ? vendorName(st, r.vendorId) : "Standard rate", ref: r.region, amount: null, due: null, act: "Review", to: `${CL_BASE}/labor-rates` });
  for (const r of st.laborRates.filter((x) => x.status === "Pending Approval" && (!x.vendorId || vend(x.vendorId))))
    A.push({ sev: "pending", title: "Labour rate revision to approve", detail: `${r.trade} (${r.skill}) → ${inr(r.rate)}/day`, who: r.vendorId ? vendorName(st, r.vendorId) : "Standard rate", ref: r.region, amount: null, due: r.effectiveFrom, act: "Review", to: `${CL_BASE}/labor-rates` });
  for (const b of inCert) {
    const next = RA_FLOW[RA_FLOW.findIndex((x) => x.status === b.status) + 1];
    A.push({ sev: "pending", title: `RA bill awaiting ${next.label.toLowerCase()}`, detail: `RA-${b.seq} · ${byId(st.workOrders, b.woId).title}`, who: vendorName(st, b.vendorId), ref: next.role, amount: b.net, due: b.date, age: true, act: "Review", to: `${CL_BASE}/ra-bills?open=${b.id}` });
  }
  for (const b of raBills.filter((x) => x.status === "Approved"))
    A.push({ sev: "attention", title: "RA bill approved - payment pending", detail: `RA-${b.seq} · ${byId(st.workOrders, b.woId).title}`, who: vendorName(st, b.vendorId), ref: "Finance", amount: b.net, due: b.date, age: true, act: "View", to: `${CL_BASE}/ra-bills?open=${b.id}` });
  for (const c of st.claims.filter((x) => x.status === "Submitted" && woIds.has(x.woId)))
    A.push({ sev: "pending", title: "Contractor claim to verify", detail: byId(st.workOrders, c.woId).title, who: vendorName(st, c.vendorId), ref: "Site engineer", amount: claimValue(st, c), due: c.date, age: true, act: "Verify", to: `${CL_BASE}/ra-bills` });
  for (const c of contracts) for (const co of (c.changeOrders || []).filter((x) => x.status === "Pending"))
    A.push({ sev: "pending", title: "Change order approval", detail: co.desc, who: vendorName(st, c.vendorId), ref: c.title, amount: co.amount, due: co.raisedOn, age: true, act: "Review", to: `${CL_BASE}/contracts?open=${c.id}` });
  for (const m of mbs.filter((x) => x.jms.status === "Disputed"))
    A.push({ sev: "attention", title: "Measurement disputed", detail: m.jms.remark || m.location, who: vendorName(st, byId(st.workOrders, m.woId).vendorId), ref: byId(st.workOrders, m.woId).title, amount: null, due: m.date, age: true, act: "Resolve", to: `${CL_BASE}/measurement-book` });
  const oldJms = mbs.filter((x) => x.jms.status === "Pending" && daysUntil(x.date) <= -7);
  if (oldJms.length) A.push({ sev: "pending", title: "Joint measurements waiting > 7 days", detail: `${oldJms.length} entr${oldJms.length > 1 ? "ies" : "y"} not signed by contractor & engineer`, who: [...new Set(oldJms.map((m) => vendorName(st, byId(st.workOrders, m.woId).vendorId)))].join(", "), ref: "Measurement book", amount: null, due: oldJms[0].date, age: true, act: "Sign", to: `${CL_BASE}/measurement-book` });
  const musters = st.attendance.filter((a) => woIds.has(a.woId) && a.source === "Contractor" && !a.verified);
  if (musters.length) { const days = [...new Set(musters.map((a) => a.date))]; A.push({ sev: "pending", title: "Daily muster to verify", detail: `${days.length} day${days.length > 1 ? "s" : ""} submitted by contractor`, who: [...new Set(musters.map((a) => vendorName(st, byId(st.workOrders, a.woId).vendorId)))].join(", "), ref: "Labour attendance", amount: null, due: days.sort()[0], age: true, act: "Verify", to: `${CL_BASE}/attendance` }); }
  for (const v of contractors.filter((x) => onboardingStage(x) === "Mobilising"))
    A.push({ sev: "pending", title: "Contractor onboarding incomplete", detail: `${(v.onboarding?.checklist || []).filter((c) => !c.done).length} checklist item(s) open`, who: v.name, ref: "Mobilising", amount: null, due: v.onboarding?.startedAt, age: true, act: "View", to: `${CL_BASE}/onboarding` });
  for (const x of health.filter((h2) => h2.status === "Completed" && h2.led.retentionBalance > 0.5 && daysUntil(shiftDays((h2.c.dlpMonths || 0) * 30, h2.c.end)) < 0))
    A.push({ sev: "attention", title: "Retention due for release", detail: `DLP ended ${fmtDate(shiftDays((x.c.dlpMonths || 0) * 30, x.c.end))}`, who: vendorName(st, x.c.vendorId), ref: x.c.title, amount: x.led.retentionBalance, due: null, act: "Release", to: `${CL_BASE}/retention` });
  sortActions(A);

  const E = [];
  for (const c of contracts) {
    if (c.bgExpiry && daysUntil(c.bgExpiry) <= 60) E.push({ name: `Bank guarantee ${c.bgNo || ""}`, who: `${vendorName(st, c.vendorId)} · ${c.title}`, date: c.bgExpiry, text: daysUntil(c.bgExpiry) < 0 ? `Expired ${-daysUntil(c.bgExpiry)} days ago` : `Expires ${ageText(c.bgExpiry)}`, state: daysUntil(c.bgExpiry) < 0 ? "Expired" : "Due soon", to: `${CL_BASE}/contracts?open=${c.id}` });
    const cs = contractStatus(c);
    if (cs === "Expiring") E.push({ name: "Contract end date", who: `${vendorName(st, c.vendorId)} · ${c.title}`, date: c.end, text: `Ends ${ageText(c.end)}`, state: "Due soon", to: `${CL_BASE}/contracts?open=${c.id}` });
    if (cs === "In DLP") { const dl = shiftDays((c.dlpMonths || 0) * 30, c.end); if (daysUntil(dl) <= 60) E.push({ name: "Defect liability period ends", who: `${vendorName(st, c.vendorId)} · ${c.title}`, date: dl, text: `Ends ${ageText(dl)} - release retention`, state: "Due soon", to: `${CL_BASE}/retention` }); }
  }
  for (const w of liveWOs.filter((x) => { const d = daysUntil(x.end); return d <= 14; }))
    E.push({ name: "Work order finish date", who: `${vendorName(st, w.vendorId)} · ${w.title}`, date: w.end, text: daysUntil(w.end) < 0 ? `Overran by ${-daysUntil(w.end)} days` : `Finishes ${ageText(w.end)}`, state: daysUntil(w.end) < 0 ? "Expired" : "Due soon", to: `${CL_BASE}/work-orders?open=${w.id}` });
  for (const r of st.laborRates.filter((x) => x.status === "Active" && x.effectiveTo && daysUntil(x.effectiveTo) <= 30 && (!x.vendorId || vend(x.vendorId))))
    E.push({ name: `Rate card ${r.trade}`, who: `${r.vendorId ? vendorName(st, r.vendorId) : "Standard"} · ${r.region}`, date: r.effectiveTo, text: `Valid ${ageText(r.effectiveTo)}`, state: "Due soon", to: `${CL_BASE}/labor-rates` });
  E.sort((a, b) => (a.date || "0000").localeCompare(b.date || "0000"));

  const cash = [
    { label: "Contract value", v: sum(contracts, contractValue), color: "bg-blue-900" },
    { label: "Work ordered", v: sum(wos, woValue), color: "bg-blue-600" },
    { label: "Executed", v: sum(wos, (w) => woProgress(st, w).measured), color: "bg-blue-400" },
    { label: "Certified", v: sum(raBills.filter((b) => ["Certified", "Approved", "Paid"].includes(b.status)), (b) => b.gross), color: "bg-sky-400" },
    { label: "Paid", v: sum(raBills.filter((b) => b.status === "Paid"), (b) => b.net), color: "bg-green-600" },
    { label: "Outstanding", v: sum(raBills.filter((b) => b.status === "Approved"), (b) => b.net), color: "bg-amber-500" },
  ];
  const att = st.attendance.filter((a) => woIds.has(a.woId));
  const days7 = Array.from({ length: 7 }, (_, i) => shiftDays(i - 7));
  const labour = {
    workers: st.workers.filter((w) => contractors.some((v) => v.id === w.vendorId) && w.active !== false).length,
    days: days7.map((d) => { const r = att.filter((a) => a.date === d); return { d, present: sum(r, (a) => (a.status === "P" ? 1 : a.status === "H" ? 0.5 : 0)), total: r.length }; }),
    ot: sum(att.filter((a) => daysUntil(a.date) >= -7), (a) => a.ot || 0),
    manDays: sum(att.filter((a) => daysUntil(a.date) >= -7), (a) => (a.status === "P" ? 1 : a.status === "H" ? 0.5 : 0)),
    toVerify: musters.length,
  };
  const site = {
    jmsPending: mbs.filter((m) => m.jms.status === "Pending").length, disputed: mbs.filter((m) => m.jms.status === "Disputed").length,
    signedUnbilled: mbs.filter((m) => m.jms.status === "Signed" && !m.billedIn).length, accrued,
    mobilising: contractors.filter((v) => onboardingStage(v) === "Mobilising").length, underReview: contractors.filter((v) => onboardingStage(v) === "Under Review").length,
    onboarded: contractors.filter((v) => onboardingStage(v) === "Onboarded").length,
  };
  return { contracts, wos, liveWOs, health, accrued, inCert, contractors, actions: A, expiring: E, cash, labour, site,
    retention: sum(health, (x) => x.led.retentionBalance), advance: sum(health, (x) => Math.max(0, x.led.advanceBalance)),
    activity: recentActivity(st, f, C_ENTITIES) };
}

// ---------------------------------------------------------------- shared cards
function ActionCenter({ actions, nav }) {
  const [sev, setSev] = y.useState("all");
  const rows = actions.filter((a) => sev === "all" || a.sev === sev);
  const n = (s) => actions.filter((a) => a.sev === s).length;
  return (
    <DashCard title="Action center" icon={Icon.zap} right={<Chips active={sev} onChange={setSev} items={[{ id: "all", label: "All", n: actions.length }, { id: "critical", label: "Critical", n: n("critical") }, { id: "attention", label: "Attention", n: n("attention") }, { id: "pending", label: "Pending", n: n("pending") }]} />}>
      <div className="max-h-[300px] overflow-y-auto">
        <DataTable dense rows={rows} rowKey={(a, i) => a.title + a.who + a.ref + i} onRow={(a) => nav(a.to)} empty={<p className="p-6 text-center text-[13px] text-ink-mute">Nothing needs attention.</p>} columns={[
          { key: "t", label: "Action item", render: (a) => <span className="flex min-w-0 flex-col"><span className="flex items-center gap-1.5 font-medium"><span className={cls("h-1.5 w-1.5 shrink-0 rounded-full", DOT[SEV[a.sev].tone])} />{a.title}</span><span className="block max-w-[230px] truncate pl-3 text-[11.5px] text-ink-mute">{a.detail}</span></span> },
          { key: "w", label: "Vendor / reference", render: (a) => <span className="flex flex-col"><span className="block max-w-[160px] truncate">{a.who}</span><span className="block max-w-[160px] truncate text-[11.5px] text-ink-mute">{a.ref}</span></span> },
          { key: "a", label: "Amount", align: "right", num: true, render: (a) => (a.amount ? inrShort(a.amount) : "-") },
          { key: "d", label: "Due / age", render: (a) => (!a.due ? "-" : a.age ? <span className="text-ink-soft">{Math.max(0, -daysUntil(a.due))}d old</span> : <span className={cls(daysUntil(a.due) < 0 && "font-medium text-red-600")}>{daysUntil(a.due) < 0 ? `${-daysUntil(a.due)}d overdue` : `in ${daysUntil(a.due)}d`}</span>) },
          { key: "x", label: "", align: "right", render: (a) => <span onClick={(e) => e.stopPropagation()}><Btn size="sm" onClick={() => nav(a.to)}>{a.act}</Btn></span> },
        ]} />
      </div>
    </DashCard>
  );
}
function ExpiringCard({ rows, nav, link }) {
  return (
    <DashCard title="Expiring & due" icon={Icon.calendarClock} link={link}>
      <div className="max-h-[300px] overflow-y-auto">
        <DataTable dense rows={rows} rowKey={(e, i) => e.name + e.who + i} onRow={(e) => nav(e.to)} empty={<p className="p-6 text-center text-[13px] text-ink-mute">Nothing expiring or due.</p>} columns={[
          { key: "n", label: "Item", render: (e) => <span className="flex flex-col"><span className="block max-w-[220px] truncate font-medium">{e.name}</span><span className="block max-w-[220px] truncate text-[11.5px] text-ink-mute">{e.who}</span></span> },
          { key: "d", label: "Due", render: (e) => <span className={cls(e.state === "Expired" || e.state === "Missing" ? "text-red-600" : "text-ink-soft")}>{e.text}</span> },
          { key: "s", label: "Status", render: (e) => <Status tone={{ Expired: "red", Missing: "red", Pending: "blue", "Due soon": "amber" }[e.state]}>{e.state}</Status> },
        ]} />
      </div>
    </DashCard>
  );
}
function ActivityCard({ items }) {
  return (
    <DashCard title="Recent activity" icon={Icon.activity}>
      <ul className="max-h-[300px] divide-y divide-line overflow-y-auto">
        {items.length === 0 && <li className="p-6 text-center text-[13px] text-ink-mute">No activity in this period.</li>}
        {items.map((a, i) => (
          <li key={i} className="flex gap-2.5 px-4 py-2 text-[12.5px]">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
            <span className="min-w-0"><span className="block truncate text-ink">{a.action}</span><span className="text-[11px] text-ink-mute">{fmtDateTime(a.at)} · {a.entity} · {a.by}</span></span>
          </li>
        ))}
      </ul>
    </DashCard>
  );
}
const Metric = ({ label, value, sub, tone }) => (
  <div className="px-4 py-2"><p className="text-[11.5px] text-ink-mute">{label}</p><b className={cls("num text-[15px]", tone || "text-ink")}>{value}</b>{sub && <p className="text-[11px] text-ink-faint">{sub}</p>}</div>
);
function OverviewFilters({ f, setF, st, contractorsOnly }) {
  const vs = st.vendors.filter((v) => !contractorsOnly || v.isContractor || hasType(v, "Labor"));
  return (<>
    <FilterSelect single label="Period" value={f.period} onChange={(x) => setF({ ...f, period: x })} options={[{ value: "30", label: "Last 30 days" }, { value: "90", label: "Last 90 days" }, { value: "180", label: "Last 180 days" }, { value: "365", label: "Last 12 months" }, { value: "all", label: "All time" }]} />
    <FilterSelect single label="Project" value={f.project} onChange={(x) => setF({ ...f, project: x })} options={[{ value: "All", label: "All projects" }, ...PROJECTS]} />
    <FilterSelect single label={contractorsOnly ? "Contractor" : "Vendor"} value={f.vendor} onChange={(x) => setF({ ...f, vendor: x })} options={[{ value: "All", label: contractorsOnly ? "All contractors" : "All vendors" }, ...vs.map((v) => ({ value: v.id, label: v.name, tone: "gray" }))]} />
  </>);
}

// ---------------------------------------------------------------- Vendor Management overview
function VendorOverviewPage() {
  const st = useStore(), nav = useNavigate();
  const [f, setF] = y.useState({ period: "90", project: "All", vendor: "All" });
  const d = y.useMemo(() => buildVendorOverview(st, f), [st, f]);
  const comp = d.vendors.map((v) => complianceOf(v).status);
  const maxAge = Math.max(1, ...d.aging.map((a) => a.v));
  const pc = (x) => (x == null ? <span className="text-ink-faint">-</span> : <span className={cls("num", x >= 80 ? "text-green-700" : x >= 60 ? "text-amber-700" : "text-red-600")}>{Math.round(x)}%</span>);
  return (
    <Page title="Vendor Overview" subtitle="Vendors, compliance, sourcing, purchase orders and payables at a glance" icon={Icon.grid} actions={<OverviewFilters f={f} setF={setF} st={st} />}>
      <div className="space-y-3 bg-gray-50/70 p-3">
        <div className="grid grid-cols-6 gap-2.5">
          <StatTile tone="purple" label="Vendors" value={d.vendors.length} sub={`${d.vendors.filter((v) => v.status === "Active").length} active`} icon={Icon.building} />
          <StatTile tone="red" label="Compliance issues" value={comp.filter((x) => x === "Non-Compliant").length} sub={`${d.live.filter((v) => complianceOf(v).blocking.length).length} payments held`} icon={Icon.shieldCheck} />
          <StatTile tone="blue" label="Open RFQs" value={d.openRfqs.length} sub={`${d.openRfqs.filter((r) => daysUntil(r.dueDate) < 0).length} past due`} icon={Icon.scale} />
          <StatTile tone="cyan" label="Open PO value" value={inrShort(sum(d.livePOs, poValue))} sub={`${d.livePOs.length} POs · ${d.latePOs.length} late`} icon={Icon.package} />
          <StatTile tone="amber" label="Payables outstanding" value={inrShort(sum(d.open$, (i) => invoiceTotals(i).balance))} sub={`${d.open$.length} bills`} icon={Icon.wallet} />
          <StatTile tone="red" label="Payments blocked" value={inrShort(sum(d.blocked, (i) => invoiceTotals(i).balance))} sub={`${d.blocked.length} bill${d.blocked.length === 1 ? "" : "s"}`} icon={Icon.lock} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <DashCard title="Vendor status" icon={Icon.building} link={{ label: "Registry", to: `${VM_BASE}/registry` }}>
            <Donut center={d.vendors.length} sub="vendors" onPick={() => nav(`${VM_BASE}/registry`)} data={[
              { label: "Active", value: d.vendors.filter((v) => v.status === "Active").length, tone: "green" },
              { label: "Pending approval", value: d.vendors.filter((v) => ["Pending Approval", "Draft", "Changes Requested"].includes(v.status)).length, tone: "amber" },
              { label: "On hold", value: d.vendors.filter((v) => v.status === "On Hold").length, tone: "purple" },
              { label: "Blocked / blacklisted", value: d.vendors.filter((v) => ["Blacklisted", "Inactive", "Rejected"].includes(v.status)).length, tone: "red" },
            ]} />
          </DashCard>
          <DashCard title="Compliance status" icon={Icon.shieldCheck} link={{ label: "Compliance", to: `${VM_BASE}/compliance` }}>
            <Donut center={comp.length} sub="vendors" onPick={() => nav(`${VM_BASE}/compliance`)} data={[
              { label: "Compliant", value: comp.filter((x) => x === "Compliant").length, tone: "green" },
              { label: "Expiring / unverified", value: comp.filter((x) => x === "Expiring").length, tone: "amber" },
              { label: "Non-compliant", value: comp.filter((x) => x === "Non-Compliant").length, tone: "red" },
            ]} />
          </DashCard>
          <DashCard title="Sourcing pipeline" icon={Icon.scale} link={{ label: "RFQs", to: `${VM_BASE}/rfq` }}>
            <div className="flex items-start justify-between px-4 pb-2 pt-4">
              {d.proc.steps.map((s, i) => (
                <y.Fragment key={s.label}>
                  <div className="flex w-16 flex-col items-center gap-1 text-center">
                    <span className={cls("grid h-9 w-9 place-items-center rounded-full border-2 text-[13px] font-bold", ["border-blue-400 text-blue-700", "border-violet-400 text-violet-700", "border-amber-400 text-amber-700", "border-green-500 text-green-700", "border-teal-500 text-teal-700"][i])}>{s.n}</span>
                    <span className="text-[11px] text-ink-soft">{s.label}</span>
                  </div>
                  {i < d.proc.steps.length - 1 && <span className="mt-4 h-px flex-1 bg-line" />}
                </y.Fragment>
              ))}
            </div>
            <div className="grid grid-cols-2 divide-x divide-line border-t border-line">
              <Metric label="Avg RFQ → PO" value={d.proc.avgDays == null ? "-" : `${d.proc.avgDays} days`} />
              <Metric label="Conversion" value={`${d.proc.conversion}%`} sub="RFQ → award" />
            </div>
          </DashCard>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DashCard title="Purchase orders & deliveries" icon={Icon.truck} link={{ label: "Purchase orders", to: `${VM_BASE}/purchase-orders` }}>
            <Donut center={d.delivery.awaiting + d.delivery.partial + d.delivery.late + d.delivery.received} sub="POs" onPick={() => nav(`${VM_BASE}/purchase-orders`)} data={[
              { label: "Awaiting delivery", value: d.delivery.awaiting, tone: "blue" }, { label: "Partially received", value: d.delivery.partial, tone: "purple" },
              { label: "Late", value: d.delivery.late, tone: "red" }, { label: "Fully received", value: d.delivery.received, tone: "green" },
            ]} />
            <div className="grid grid-cols-3 divide-x divide-line border-t border-line">
              <Metric label="Returns to vendor" value={d.delivery.returns} sub="rejected at GRN" />
              <Metric label="Blanket agreements" value={d.delivery.boActive} sub="active" />
              <Metric label="Blanket consumed" value={`${d.delivery.boUse.toFixed(0)}%`} sub="of agreed value" />
            </div>
          </DashCard>
          <DashCard title="Payables ageing" icon={Icon.receipt} link={{ label: "Invoices & payments", to: `${VM_BASE}/invoices` }}>
            <div className="space-y-2.5 px-4 py-3">
              {d.aging.map((a) => (
                <div key={a.label} className="grid grid-cols-[130px_1fr_70px] items-center gap-3 text-[12.5px]">
                  <span className="text-ink-soft">{a.label}</span>
                  <span className="h-2.5 overflow-hidden rounded-full bg-gray-100"><span className={cls("block h-full rounded-full", a.tone)} style={{ width: `${(a.v / maxAge) * 100}%` }} /></span>
                  <b className="num text-right">{inrShort(a.v)}</b>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 divide-x divide-line border-t border-line">
              <Metric label="On hold" value={d.invs.filter((i) => invoiceStatus(i) === "On Hold").length} sub="bills" />
              <Metric label="Exceptions" value={d.invs.filter((i) => shouldBePaid(st, i) === "Exception").length} sub="payable with warning" />
              <Metric label="Paid in period" value={inrShort(d.paidInPeriod)} tone="text-green-700" />
            </div>
          </DashCard>
        </div>
        <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3">
          <ActionCenter actions={d.actions} nav={nav} />
          <ExpiringCard rows={d.expiring} nav={nav} link={{ label: "Compliance", to: `${VM_BASE}/compliance` }} />
        </div>
        <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3">
          <DashCard title="Vendor performance (top 5)" icon={Icon.star} link={{ label: "Scorecard", to: `${VM_BASE}/scorecard` }}>
            <DataTable dense rows={d.perf.slice(0, 5)} rowKey={(x) => x.v.id} onRow={() => nav(`${VM_BASE}/scorecard`)} empty={<p className="p-6 text-center text-[13px] text-ink-mute">No scored vendors.</p>} columns={[
              { key: "v", label: "Vendor", render: (x) => <span className="block max-w-[200px] truncate font-medium">{x.v.name}</span> },
              { key: "d", label: "Delivery", align: "right", render: (x) => pc(x.parts.timeliness) }, { key: "q", label: "Quality", align: "right", render: (x) => pc(x.parts.quality) },
              { key: "s", label: "Safety", align: "right", render: (x) => pc(x.parts.safety) }, { key: "c", label: "Compliance", align: "right", render: (x) => pc(x.parts.compliance) },
              { key: "o", label: "Overall", align: "right", render: (x) => <span className={cls("num rounded-full px-2 py-0.5 text-[12px] font-semibold", x.score >= 80 ? "bg-green-100 text-green-700" : x.score >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>{Math.round(x.score)}</span> },
            ]} />
          </DashCard>
          <ActivityCard items={d.activity} />
        </div>
      </div>
    </Page>
  );
}

// ---------------------------------------------------------------- Contract & Labor overview
function ContractOverviewPage() {
  const st = useStore(), nav = useNavigate();
  const [f, setF] = y.useState({ period: "90", project: "All", vendor: "All" });
  const [hf, setHf] = y.useState("all");
  const d = y.useMemo(() => buildContractOverview(st, f), [st, f]);
  const hcount = (s) => d.health.filter((x) => x.status === s).length;
  const act = d.health.filter((x) => x.status !== "Completed");
  const tv = sum(d.health, (x) => x.value) || 1;
  const physical = (sum(d.health, (x) => x.measured) / tv) * 100, billing = (sum(d.health, (x) => x.billed) / tv) * 100;
  const avgSpi = act.length ? sum(act, (x) => x.spi) / act.length : 1;
  const maxCash = Math.max(1, ...d.cash.map((c) => c.v));
  const signals = (x) => {
    const s = [];
    if ((x.c.changeOrders || []).some((o) => o.status === "Pending")) s.push(["Change pending", "blue"]);
    if (x.c.bgExpiry && daysUntil(x.c.bgExpiry) <= 60) s.push(["BG expiring", "amber"]);
    if (x.status === "Delayed" || x.status === "At risk") s.push(["Behind plan", "amber"]);
    if (x.wos.some((w) => w.acceptance?.status === "Pending")) s.push(["WO not accepted", "amber"]);
    if (st.raBills.some((b) => b.contractId === x.c.id && ["Submitted", "Verified", "Certified"].includes(b.status))) s.push(["RA bill in certification", "blue"]);
    if (x.status === "Completed" && x.led.retentionBalance > 0.5) s.push(["Retention to release", "purple"]);
    if (x.cs === "Expiring") s.push(["Ends ≤ 90 days", "amber"]);
    return s;
  };
  const rows = d.health.filter((x) => hf === "all" || x.status === hf);
  const maxDay = Math.max(1, ...d.labour.days.map((x) => x.total));
  return (
    <Page title="Contract & Labour Overview" subtitle="Contracts, work orders, measurement, RA billing, retention and site labour at a glance" icon={Icon.grid} actions={<OverviewFilters f={f} setF={setF} st={st} contractorsOnly />}>
      <div className="space-y-3 bg-gray-50/70 p-3">
        <div className="grid grid-cols-6 gap-2.5">
          <StatTile tone="purple" label="Contracts" value={d.contracts.filter((c) => ["Active", "Expiring"].includes(contractStatus(c))).length} sub={`${inrShort(sum(d.contracts, contractValue))} value`} icon={Icon.file} />
          <StatTile tone="blue" label="Live work orders" value={inrShort(sum(d.liveWOs, woValue))} sub={`${d.liveWOs.length} WOs`} icon={Icon.clipboardList} />
          <StatTile tone="green" label="Work done, unbilled" value={inrShort(d.accrued)} sub="JMS-signed" icon={Icon.ruler} />
          <StatTile tone="amber" label="RA bills in certification" value={inrShort(sum(d.inCert, (b) => b.net))} sub={`${d.inCert.length} bill${d.inCert.length === 1 ? "" : "s"}`} icon={Icon.receipt} />
          <StatTile tone="cyan" label="Retention held" value={inrShort(d.retention)} sub={`${inrShort(d.advance)} advance to recover`} icon={Icon.lock} />
          <StatTile tone="red" label="Open alerts" value={d.actions.length} sub={`${d.actions.filter((a) => a.sev === "critical").length} critical`} icon={Icon.warning} />
        </div>
        <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3">
          <ActionCenter actions={d.actions} nav={nav} />
          <ExpiringCard rows={d.expiring} nav={nav} link={{ label: "Contracts", to: `${CL_BASE}/contracts` }} />
        </div>
        <DashCard title="Contract health" icon={Icon.file} link={{ label: "All contracts", to: `${CL_BASE}/contracts` }}
          right={<Chips active={hf} onChange={setHf} items={[{ id: "all", label: "All", n: d.health.length }, { id: "On track", label: "On track", n: hcount("On track") }, { id: "At risk", label: "At risk", n: hcount("At risk") }, { id: "Delayed", label: "Delayed", n: hcount("Delayed") }, { id: "Completed", label: "Completed", n: hcount("Completed") }]} />}>
          <DataTable dense rows={rows} rowKey={(x) => x.c.id} onRow={(x) => nav(`${CL_BASE}/contracts?open=${x.c.id}`)} empty={<p className="p-6 text-center text-[13px] text-ink-mute">No contracts match.</p>} columns={[
            { key: "v", label: "Contractor", render: (x) => <span className="flex flex-col"><span className="font-medium">{vendorName(st, x.c.vendorId)}</span><span className="block max-w-[260px] truncate text-[11.5px] text-ink-mute">{x.c.title}</span></span> },
            { key: "val", label: "Value", align: "right", num: true, render: (x) => inrShort(x.value) },
            { key: "p", label: "Physical", render: (x) => <Bar value={x.physical} /> },
            { key: "b", label: "Billed", render: (x) => <Bar value={x.billing} color="bg-violet-500" /> },
            { key: "pay", label: "Paid", render: (x) => <Bar value={x.payment} color="bg-green-600" /> },
            { key: "r", label: "Retention held", align: "right", num: true, render: (x) => inrShort(x.led.retentionBalance) },
            { key: "s", label: "Schedule", render: (x) => <Status tone={{ "On track": "green", "At risk": "amber", Delayed: "red", Completed: "blue" }[x.status]}>{x.status}</Status> },
            { key: "sig", label: "Signals", render: (x) => { const s = signals(x); return s.length ? <span className="flex flex-wrap gap-1">{s.slice(0, 3).map(([t, tone]) => <Status key={t} tone={tone}>{t}</Status>)}{s.length > 3 && <span data-tip={s.slice(3).map((z) => z[0]).join("\n")} className="text-[11px] text-ink-mute">+{s.length - 3}</span>}</span> : <span className="text-ink-faint">-</span>; } },
          ]} />
        </DashCard>
        <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3">
          <DashCard title="Work order progress" icon={Icon.clipboardList} link={{ label: "Work orders", to: `${CL_BASE}/work-orders` }}>
            <DataTable dense rows={d.liveWOs.map((w) => ({ w, hl: woHealth(st, w) })).sort((a, b) => a.hl.pr.spi - b.hl.pr.spi).slice(0, 6)} rowKey={(x) => x.w.id} onRow={(x) => nav(`${CL_BASE}/work-orders?open=${x.w.id}`)} empty={<p className="p-6 text-center text-[13px] text-ink-mute">No live work orders.</p>} columns={[
              { key: "s", label: "Scope", render: (x) => <span className="flex flex-col"><span className="block max-w-[240px] truncate font-medium">{x.w.title}</span><span className="block max-w-[240px] truncate text-[11.5px] text-ink-mute">{vendorName(st, x.w.vendorId)}</span></span> },
              { key: "p", label: "Physical vs plan", render: (x) => <span className="flex flex-col gap-0.5"><Bar value={x.hl.pr.physical} /><span className="text-[11px] text-ink-mute">plan {x.hl.pr.planned.toFixed(0)}%</span></span> },
              { key: "st", label: "Status", render: (x) => <Status tone={x.hl.tone}>{x.hl.label}</Status> },
              { key: "f", label: "Finish", render: (x) => <span className={cls(daysUntil(x.w.end) < 0 && "text-red-600")}>{fmtDate(x.w.end)}</span> },
            ]} />
          </DashCard>
          <DashCard title="Labour on site" icon={Icon.users} link={{ label: "Attendance", to: `${CL_BASE}/attendance` }}>
            <div className="flex h-[120px] items-end gap-2 px-4 pb-1 pt-3">
              {d.labour.days.map((x) => (
                <div key={x.d} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <span className="num text-[10.5px] text-ink-soft">{x.total ? x.present : ""}</span>
                  <span className="w-full rounded-t bg-teal-500/80" style={{ height: `${x.total ? Math.max(4, (x.present / maxDay) * 80) : 2}px` }} />
                  <span className="text-[10.5px] text-ink-mute">{new Date(x.d).toLocaleDateString("en-IN", { weekday: "short" })}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 divide-x divide-line border-t border-line">
              <Metric label="Workers" value={d.labour.workers} sub="registered" />
              <Metric label="Man-days (7d)" value={num(d.labour.manDays, 1)} sub={`${d.labour.ot} OT hours`} />
              <Metric label="Muster to verify" value={d.labour.toVerify} sub="entries" tone={d.labour.toVerify ? "text-amber-600" : "text-ink"} />
            </div>
          </DashCard>
        </div>
        <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3">
          <DashCard title="Measurement & onboarding" icon={Icon.ruler} link={{ label: "Measurement book", to: `${CL_BASE}/measurement-book` }}>
            <div className="grid grid-cols-4 divide-x divide-line">
              <Metric label="JMS pending" value={d.site.jmsPending} sub="to sign" tone={d.site.jmsPending ? "text-amber-600" : "text-ink"} />
              <Metric label="Disputed" value={d.site.disputed} sub="measurements" tone={d.site.disputed ? "text-red-600" : "text-ink"} />
              <Metric label="Signed, not billed" value={d.site.signedUnbilled} sub={inrShort(d.site.accrued)} />
              <Metric label="Contractors" value={d.contractors.length} sub="in scope" />
            </div>
            <div className="grid grid-cols-3 divide-x divide-line border-t border-line">
              <Metric label="Under review" value={d.site.underReview} sub="registration" />
              <Metric label="Mobilising" value={d.site.mobilising} sub="checklist open" tone={d.site.mobilising ? "text-amber-600" : "text-ink"} />
              <Metric label="Onboarded" value={d.site.onboarded} sub="ready on site" tone="text-green-700" />
            </div>
          </DashCard>
          <ActivityCard items={d.activity} />
        </div>
      </div>
    </Page>
  );
}
