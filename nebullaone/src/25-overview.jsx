// Overview dashboards — "Vendor & Contract Overview": one data model, two focuses
// (Vendor Management → vendors, compliance, procurement; Contract & Labor → delivery, cash, contracts).

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
    <button key={i.id} type="button" onClick={() => onChange(i.id)} className={cls("rounded-full px-2 py-0.5 text-[11.5px] font-medium", active === i.id ? "bg-ink text-white" : "bg-gray-100 text-ink-soft hover:bg-gray-200")}>{i.label}{i.n != null ? ` ${i.n}` : ""}</button>
  ))}</span>
);
const ageText = (iso) => { const d = daysUntil(iso); return d === null ? "—" : d < 0 ? `${-d} day${d === -1 ? "" : "s"} overdue` : d === 0 ? "today" : `in ${d} day${d === 1 ? "" : "s"}`; };

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

function buildOverview(st, f) {
  const inPeriod = (iso) => !iso || f.period === "all" || daysUntil(iso) >= -Number(f.period);
  const projOk = (p) => f.project === "All" || p === f.project;
  const vend = (id) => f.vendor === "All" || id === f.vendor;
  const contracts = st.contracts.filter((c) => vend(c.vendorId) && projOk(c.project));
  const wos = st.workOrders.filter((w) => vend(w.vendorId) && projOk(w.project) && w.status !== "Draft");
  const pos = st.purchaseOrders.filter((p) => vend(p.vendorId) && projOk(p.project));
  const woIds = new Set(wos.map((w) => w.id)), poIds = new Set(pos.map((p) => p.id));
  const raBills = st.raBills.filter((b) => woIds.has(b.woId));
  const invs = st.invoices.filter((i) => vend(i.vendorId) && (f.project === "All" || (i.poId ? poIds.has(i.poId) : i.raBillId ? raBills.some((b) => b.id === i.raBillId) : false)));
  const engaged = new Set([...contracts.map((c) => c.vendorId), ...pos.map((p) => p.vendorId), ...wos.map((w) => w.vendorId)]);
  const vendors = st.vendors.filter((v) => vend(v.id) && (f.project === "All" || engaged.has(v.id)));
  const open$ = invs.filter((i) => invoiceTotals(i).balance > 0.5);
  const blockedInv = open$.filter((i) => shouldBePaid(st, i) === "No" && paymentGate(st, i).stops.length);
  const livePOs = pos.filter((p) => !["Draft", "Closed", "Cancelled"].includes(p.status) && poStatus(p) !== "Received");
  const liveWOs = wos.filter((w) => ["Issued", "In Progress"].includes(w.status));
  const accrued = sum(st.measurements.filter((m) => woIds.has(m.woId) && m.jms.status === "Signed" && !m.billedIn), (m) => {
    const wo = byId(st.workOrders, m.woId); return wo.type === "Lump Sum" ? 0 : m.qty * (wo.items.find((i) => i.id === m.lineId)?.rate || 0);
  }) + sum(wos.filter((w) => w.type === "Lump Sum"), (wo) => Math.max(0, woProgress(st, wo).measured - woProgress(st, wo).billed));
  const health = contracts.map((c) => contractHealth(st, c));

  // ---- action centre
  const A = [], go = (to) => to;
  for (const i of blockedInv) {
    const v = byId(st.vendors, i.vendorId), g = paymentGate(st, i);
    A.push({ sev: "critical", scope: "both", title: "Payment blocked", detail: g.stops[0], who: v.name, ref: billAgainst(st, i)[0], amount: invoiceTotals(i).balance, due: i.due, act: "Resolve", to: go(`${VM_BASE}/invoices?open=${i.id}`) });
  }
  for (const i of open$.filter((x) => invoiceStatus(x) === "Overdue" && !blockedInv.includes(x)))
    A.push({ sev: "attention", scope: "both", title: "Payment overdue", detail: `Due ${fmtDate(i.due)} — ready to pay`, who: vendorName(st, i.vendorId), ref: billAgainst(st, i)[0], amount: invoiceTotals(i).balance, due: i.due, act: "Pay", to: `${VM_BASE}/invoices?open=${i.id}` });
  for (const w of liveWOs) {
    const hl = woHealth(st, w);
    if (hl.label === "Delayed" || hl.label === "At risk")
      A.push({ sev: hl.label === "Delayed" ? "critical" : "attention", scope: "c", title: hl.label === "Delayed" ? "Work order delayed" : "Work order at risk", detail: `${hl.pr.physical.toFixed(0)}% done vs ${hl.pr.planned.toFixed(0)}% planned (SPI ${hl.pr.spi.toFixed(2)})`, who: vendorName(st, w.vendorId), ref: w.title, amount: null, due: w.end, act: "View", to: `${CL_BASE}/work-orders?open=${w.id}` });
  }
  for (const r of st.laborRates.filter((x) => x.status === "Active" && x.rate < x.minWage && (!x.vendorId || vend(x.vendorId))))
    A.push({ sev: "critical", scope: "c", title: "Wage below minimum", detail: `${r.trade} (${r.skill}) ${inr(r.rate)}/day vs ${inr(r.minWage)} minimum`, who: r.vendorId ? vendorName(st, r.vendorId) : "Standard rate", ref: r.region, amount: null, due: null, act: "Review", to: `${CL_BASE}/labor-rates` });
  for (const v of vendors.filter((x) => x.status === "Active")) {
    const cp = complianceOf(v);
    if (cp.blocking.length) A.push({ sev: "critical", scope: "v", title: "Compliance gap — payments held", detail: cp.blocking[0], who: v.name, ref: `${cp.blocking.length} blocking item${cp.blocking.length > 1 ? "s" : ""}`, amount: null, due: null, act: "Review", to: `${VM_BASE}/compliance?open=${v.id}` });
  }
  for (const b of raBills.filter((x) => ["Submitted", "Verified", "Certified"].includes(x.status))) {
    const next = RA_FLOW[RA_FLOW.findIndex((f2) => f2.status === b.status) + 1];
    A.push({ sev: "pending", scope: "c", title: `RA bill awaiting ${next.label.toLowerCase()}`, detail: `RA-${b.seq} · ${byId(st.workOrders, b.woId).title}`, who: vendorName(st, b.vendorId), ref: next.role, amount: b.net, due: b.date, age: true, act: "Review", to: `${CL_BASE}/ra-bills?open=${b.id}` });
  }
  for (const c of st.claims.filter((x) => x.status === "Submitted" && woIds.has(x.woId)))
    A.push({ sev: "pending", scope: "c", title: "Contractor claim to verify", detail: `${byId(st.workOrders, c.woId).title}`, who: vendorName(st, c.vendorId), ref: "Site engineer", amount: claimValue(st, c), due: c.date, age: true, act: "Verify", to: `${CL_BASE}/ra-bills` });
  for (const v of vendors.filter((x) => x.status === "Pending Approval"))
    A.push({ sev: "pending", scope: "v", title: "Vendor approval pending", detail: `Waiting for ${(v.approval.stages.find((s2) => s2.status === "Pending") || {}).dept || "approver"}`, who: v.name, ref: v.type, amount: null, due: v.createdAt, age: true, act: "Review", to: `${VM_BASE}/approvals?open=${v.id}` });
  for (const c of contracts) for (const co of (c.changeOrders || []).filter((x) => x.status === "Pending"))
    A.push({ sev: "pending", scope: "c", title: "Change order approval", detail: co.desc, who: vendorName(st, c.vendorId), ref: c.title, amount: co.amount, due: co.raisedOn, age: true, act: "Review", to: `${CL_BASE}/contracts?open=${c.id}` });
  for (const w of wos.filter((x) => x.acceptance?.status === "Pending"))
    A.push({ sev: "pending", scope: "c", title: "Work order not yet accepted", detail: w.title, who: vendorName(st, w.vendorId), ref: "Contractor", amount: woValue(w), due: w.issuedOn, age: true, act: "View", to: `${CL_BASE}/work-orders?open=${w.id}` });
  for (const r of st.rfqs.filter((x) => x.status !== "Draft" && ["Sent", "Quotes Received"].includes(x.status) && projOk(x.project) && daysUntil(x.dueDate) < 0))
    A.push({ sev: "attention", scope: "v", title: "RFQ past due — not awarded", detail: `${r.quotes.length} quote(s) received`, who: r.title, ref: r.project, amount: null, due: r.dueDate, act: "Award", to: `${VM_BASE}/rfq?open=${r.id}` });
  const order = { critical: 0, attention: 1, pending: 2 };
  A.sort((a, b) => order[a.sev] - order[b.sev] || (b.amount || 0) - (a.amount || 0));

  // ---- expiring & due
  const E = [];
  for (const v of vendors.filter((x) => !["Blacklisted", "Disabled", "Rejected", "Draft"].includes(x.status)))
    for (const it of complianceItems(v).filter((x) => x.level > 0)) {
      const d = daysUntil(it.expiry);
      E.push({ scope: "v", name: it.name, who: v.name, date: it.expiry, text: it.expiry ? (d < 0 ? `Expired ${-d} days ago` : `Expires in ${d} days`) : it.note,
        state: it.level === 2 ? (it.expiry && d < 0 ? "Expired" : "Missing") : it.note === "Awaiting verification" ? "Pending" : "Due soon", to: `${VM_BASE}/compliance?open=${v.id}` });
    }
  for (const c of contracts) {
    if (c.bgExpiry && daysUntil(c.bgExpiry) <= 60) E.push({ scope: "c", name: `Bank guarantee ${c.bgNo || ""}`, who: `${vendorName(st, c.vendorId)} · ${c.title}`, date: c.bgExpiry, text: ageText(c.bgExpiry).replace("overdue", "ago"), state: daysUntil(c.bgExpiry) < 0 ? "Expired" : "Due soon", to: `${CL_BASE}/contracts?open=${c.id}` });
    if (contractStatus(c) === "Expiring") E.push({ scope: "c", name: "Contract end date", who: `${vendorName(st, c.vendorId)} · ${c.title}`, date: c.end, text: `Ends ${ageText(c.end)}`, state: "Due soon", to: `${CL_BASE}/contracts?open=${c.id}` });
  }
  for (const i of open$.filter((x) => { const d = daysUntil(x.due); return d !== null && d >= 0 && d <= 7; }))
    E.push({ scope: "both", name: "Vendor payment due", who: `${vendorName(st, i.vendorId)} · ${inrShort(invoiceTotals(i).balance)}`, date: i.due, text: `Due ${ageText(i.due)}`, state: "Due soon", to: `${VM_BASE}/invoices?open=${i.id}` });
  E.sort((a, b) => (a.date || "0000").localeCompare(b.date || "0000"));

  // ---- pipelines
  const certified = sum(raBills.filter((b) => ["Certified", "Approved", "Paid"].includes(b.status)), (b) => b.gross);
  const paidRA = sum(raBills.filter((b) => b.status === "Paid"), (b) => b.net);
  const cash = [
    { label: "Contract value", v: sum(contracts, contractValue), color: "bg-blue-900" },
    { label: "Work ordered", v: sum(wos, woValue), color: "bg-blue-600" },
    { label: "Executed", v: sum(wos, (w) => woProgress(st, w).measured), color: "bg-blue-400" },
    { label: "Certified", v: certified, color: "bg-sky-400" },
    { label: "Paid", v: paidRA, color: "bg-green-600" },
    { label: "Outstanding", v: sum(raBills.filter((b) => b.status === "Approved"), (b) => b.net), color: "bg-amber-500" },
  ];
  const rfqs = st.rfqs.filter((r) => r.status !== "Draft" && projOk(r.project) && (f.vendor === "All" || r.vendorIds.includes(f.vendor)) && inPeriod(r.createdOn));
  const rfqPOs = st.purchaseOrders.filter((p) => p.rfqId && rfqs.some((r) => r.id === p.rfqId));
  const proc = {
    steps: [
      { label: "RFQs", n: rfqs.length }, { label: "Quoted", n: rfqs.filter((r) => r.quotes.length).length },
      { label: "Evaluation", n: rfqs.filter((r) => r.status === "Quotes Received").length },
      { label: "Awarded", n: rfqs.filter((r) => ["Awarded", "Partially Awarded", "Closed"].includes(r.status)).length },
      { label: "PO issued", n: new Set(rfqPOs.map((p) => p.rfqId)).size },
    ],
    openPO: sum(livePOs, poValue), openPOn: livePOs.length,
    avgDays: rfqPOs.length ? Math.round(sum(rfqPOs, (p) => { const r = byId(st.rfqs, p.rfqId); return Math.max(0, (new Date(p.date) - new Date(r.createdOn)) / DAY); }) / rfqPOs.length) : null,
  };
  proc.conversion = rfqs.length ? Math.round((proc.steps[3].n / rfqs.length) * 100) : 0;

  const activity = st.audit.filter((a) => inPeriod(a.at?.slice(0, 10)) && (f.vendor === "All" || a.id === f.vendor || String(a.action).includes(vendorName(st, f.vendor)))).slice().sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12);
  const perf = vendors.map((v) => ({ v, ...vendorScore(st, v.id) })).filter((x) => x.score != null && (x.v.isContractor || x.v.type !== "Goods" || true)).sort((a, b) => b.score - a.score);

  return { vendors, contracts, wos, pos, invs, open$, blockedInv, livePOs, liveWOs, accrued, health, actions: A, expiring: E, cash, proc, activity, perf };
}

// ---------------------------------------------------------------- page
function OverviewPage({ focus }) {
  const st = useStore();
  const nav = useNavigate();
  const [f, setF] = y.useState({ period: "90", project: "All", vendor: "All" });
  const [sev, setSev] = y.useState("all"), [hf, setHf] = y.useState("all");
  const d = y.useMemo(() => buildOverview(st, f), [st, f]);
  const vendorFocus = focus === "vendor";
  const actions = d.actions.filter((a) => a.scope === "both" || a.scope === (vendorFocus ? "v" : "c"));
  const shownActions = actions.filter((a) => sev === "all" || a.sev === sev);
  const expiring = d.expiring.filter((e) => e.scope === "both" || e.scope === (vendorFocus ? "v" : "c") || (!vendorFocus && e.scope === "v"));
  const vs = d.vendors;
  const since = f.period === "all" ? "all time" : `since ${fmtDate(shiftDays(-Number(f.period)))}`;
  const comp = vs.filter((v) => !["Blacklisted", "Disabled", "Rejected", "Draft"].includes(v.status)).map((v) => complianceOf(v).status);
  const hcount = (s) => d.health.filter((x) => x.status === s).length;
  const act = d.health.filter((x) => x.status !== "Completed");
  const physical = sum(d.health, (x) => x.measured) / (sum(d.health, (x) => x.value) || 1) * 100;
  const billing = sum(d.health, (x) => x.billed) / (sum(d.health, (x) => x.value) || 1) * 100;
  const avgSpi = act.length ? sum(act, (x) => x.spi) / act.length : 1;
  const maxCash = Math.max(1, ...d.cash.map((c) => c.v));
  const signals = (x) => {
    const s = [];
    if ((x.c.changeOrders || []).some((o) => o.status === "Pending")) s.push(["Change pending", "blue"]);
    if (x.c.bgExpiry && daysUntil(x.c.bgExpiry) <= 60) s.push(["BG expiring", "amber"]);
    if (d.blockedInv.some((i) => i.vendorId === x.c.vendorId)) s.push(["Payment blocked", "red"]);
    const v = byId(st.vendors, x.c.vendorId); if (v && complianceOf(v).blocking.length) s.push(["Compliance", "red"]);
    if (x.status === "Delayed" || x.status === "At risk") s.push(["Behind plan", "amber"]);
    if (x.status === "Completed" && x.led.retentionBalance > 0.5) s.push(["Retention to release", "purple"]);
    if (x.cs === "Expiring") s.push(["Ends ≤ 90 days", "amber"]);
    return s;
  };
  const healthRows = d.health.filter((x) => hf === "all" || x.status === hf);

  const kpis = (
    <div className="grid grid-cols-6 gap-2.5">
      <StatTile tone="purple" label="Vendors" value={vs.length} sub={`${vs.filter((v) => v.status === "Active").length} active`} icon={Icon.building} />
      <StatTile tone="blue" label="Live commitments" value={inrShort(sum(d.livePOs, poValue) + sum(d.liveWOs, woValue))} sub={`${d.livePOs.length} POs · ${d.liveWOs.length} WOs`} icon={Icon.file} />
      <StatTile tone="red" label="Payments blocked" value={inrShort(sum(d.blockedInv, (i) => invoiceTotals(i).balance))} sub={`${d.blockedInv.length} bill${d.blockedInv.length === 1 ? "" : "s"}`} icon={Icon.lock} />
      <StatTile tone="cyan" label="Payables outstanding" value={inrShort(sum(d.open$, (i) => invoiceTotals(i).balance))} sub={`${d.open$.length} bills`} icon={Icon.wallet} />
      <StatTile tone="green" label="Work done, unbilled" value={inrShort(d.accrued)} sub="JMS-signed" icon={Icon.ruler} />
      <StatTile tone="gray" label="Open alerts" value={actions.length} sub={`${actions.filter((a) => a.sev === "critical").length} critical`} icon={Icon.warning} />
    </div>
  );
  const vendorStatus = (
    <DashCard title="Vendor status" icon={Icon.building} link={{ label: "Registry", to: `${VM_BASE}/registry` }}>
      <Donut center={vs.length} sub="vendors" onPick={() => nav(`${VM_BASE}/registry`)} data={[
        { label: "Active", value: vs.filter((v) => v.status === "Active").length, tone: "green" },
        { label: "Pending approval", value: vs.filter((v) => ["Pending Approval", "Draft", "Changes Requested"].includes(v.status)).length, tone: "amber" },
        { label: "On hold", value: vs.filter((v) => v.status === "On Hold").length, tone: "purple" },
        { label: "Blocked / blacklisted", value: vs.filter((v) => ["Blacklisted", "Disabled", "Rejected"].includes(v.status)).length, tone: "red" },
      ]} />
    </DashCard>
  );
  const compliance = (
    <DashCard title="Compliance status" icon={Icon.shieldCheck} link={{ label: "Compliance", to: `${VM_BASE}/compliance` }}>
      <Donut center={comp.length} sub="vendors" onPick={() => nav(`${VM_BASE}/compliance`)} data={[
        { label: "Compliant", value: comp.filter((x) => x === "Compliant").length, tone: "green" },
        { label: "Expiring soon / unverified", value: comp.filter((x) => x === "Expiring").length, tone: "amber" },
        { label: "Non-compliant", value: comp.filter((x) => x === "Non-Compliant").length, tone: "red" },
      ]} />
    </DashCard>
  );
  const delivery = (
    <DashCard title="Contract delivery" icon={Icon.trending} link={{ label: "Progress", to: `${CL_BASE}/performance` }}>
      <Donut center={d.health.length} sub="contracts" onPick={() => nav(`${CL_BASE}/contracts`)} data={[
        { label: "On track", value: hcount("On track"), tone: "green" }, { label: "At risk", value: hcount("At risk"), tone: "amber" },
        { label: "Delayed", value: hcount("Delayed"), tone: "red" }, { label: "Completed", value: hcount("Completed"), tone: "blue" },
      ]} />
      <div className="grid grid-cols-3 divide-x divide-line border-t border-line text-[11.5px]">
        <div className="px-4 py-2"><p className="text-ink-mute">Average SPI</p><b className={cls("num text-[16px]", avgSpi < 0.8 ? "text-red-600" : avgSpi < 0.95 ? "text-amber-600" : "text-green-700")}>{avgSpi.toFixed(2)}</b><p className="text-ink-faint">target 1.00</p></div>
        <div className="px-4 py-2"><p className="text-ink-mute">Physical progress</p><b className="num text-[16px] text-ink">{physical.toFixed(0)}%</b><p className="text-ink-faint">of contract value</p></div>
        <div className="px-4 py-2"><p className="text-ink-mute">Billing progress</p><b className="num text-[16px] text-ink">{billing.toFixed(0)}%</b><p className="text-ink-faint">RA bills raised</p></div>
      </div>
    </DashCard>
  );
  const actionCenter = (
    <DashCard title="Action center" icon={Icon.zap} right={<Chips active={sev} onChange={setSev} items={[{ id: "all", label: "All", n: actions.length }, { id: "critical", label: "Critical", n: actions.filter((a) => a.sev === "critical").length }, { id: "attention", label: "Attention", n: actions.filter((a) => a.sev === "attention").length }, { id: "pending", label: "Pending", n: actions.filter((a) => a.sev === "pending").length }]} />}>
      <div className="max-h-[300px] overflow-y-auto">
        <DataTable dense rows={shownActions} rowKey={(a, i) => a.title + a.who + a.ref + i} onRow={(a) => nav(a.to)} empty={<p className="p-6 text-center text-[13px] text-ink-mute">Nothing needs attention.</p>} columns={[
          { key: "t", label: "Action item", render: (a) => <span className="flex min-w-0 flex-col"><span className="flex items-center gap-1.5 font-medium"><span className={cls("h-1.5 w-1.5 shrink-0 rounded-full", DOT[SEV[a.sev].tone])} />{a.title}</span><span className="block max-w-[230px] truncate pl-3 text-[11.5px] text-ink-mute">{a.detail}</span></span> },
          { key: "w", label: "Vendor / contract", render: (a) => <span className="flex flex-col"><span className="block max-w-[160px] truncate">{a.who}</span><span className="block max-w-[160px] truncate text-[11.5px] text-ink-mute">{a.ref}</span></span> },
          { key: "a", label: "Amount", align: "right", num: true, render: (a) => (a.amount ? inrShort(a.amount) : "—") },
          { key: "d", label: "Due / age", render: (a) => (!a.due ? "—" : a.age ? <span className="text-ink-soft">{-daysUntil(a.due)}d old</span> : <span className={cls(daysUntil(a.due) < 0 && "font-medium text-red-600")}>{daysUntil(a.due) < 0 ? `${-daysUntil(a.due)}d overdue` : `in ${daysUntil(a.due)}d`}</span>) },
          { key: "x", label: "", align: "right", render: (a) => <span onClick={(e) => e.stopPropagation()}><Btn size="sm" onClick={() => nav(a.to)}>{a.act}</Btn></span> },
        ]} />
      </div>
    </DashCard>
  );
  const expiringCard = (
    <DashCard title="Expiring & due" icon={Icon.calendarClock} link={{ label: "Compliance", to: `${VM_BASE}/compliance` }}>
      <div className="max-h-[300px] overflow-y-auto">
        <DataTable dense rows={expiring} rowKey={(e, i) => e.name + e.who + i} onRow={(e) => nav(e.to)} empty={<p className="p-6 text-center text-[13px] text-ink-mute">Nothing expiring or due.</p>} columns={[
          { key: "n", label: "Document / obligation", render: (e) => <span className="flex flex-col"><span className="block max-w-[220px] truncate font-medium">{e.name}</span><span className="block max-w-[220px] truncate text-[11.5px] text-ink-mute">{e.who}</span></span> },
          { key: "d", label: "Due", render: (e) => <span className={cls(e.state === "Expired" || e.state === "Missing" ? "text-red-600" : "text-ink-soft")}>{e.text}</span> },
          { key: "s", label: "Status", render: (e) => <Status tone={{ Expired: "red", Missing: "red", Pending: "blue", "Due soon": "amber" }[e.state]}>{e.state}</Status> },
        ]} />
      </div>
    </DashCard>
  );
  const healthCard = (
    <DashCard title="Contract health" icon={Icon.file} link={{ label: "All contracts", to: `${CL_BASE}/contracts` }}
      right={<Chips active={hf} onChange={setHf} items={[{ id: "all", label: "All", n: d.health.length }, { id: "On track", label: "On track", n: hcount("On track") }, { id: "At risk", label: "At risk", n: hcount("At risk") }, { id: "Delayed", label: "Delayed", n: hcount("Delayed") }, { id: "Completed", label: "Completed", n: hcount("Completed") }]} />}>
      <DataTable dense rows={healthRows} rowKey={(x) => x.c.id} onRow={(x) => nav(`${CL_BASE}/contracts?open=${x.c.id}`)} empty={<p className="p-6 text-center text-[13px] text-ink-mute">No contracts match.</p>} columns={[
        { key: "v", label: "Vendor", render: (x) => <span className="flex flex-col"><span className="font-medium">{vendorName(st, x.c.vendorId)}</span><span className="block max-w-[260px] truncate text-[11.5px] text-ink-mute">{x.c.title}</span></span> },
        { key: "val", label: "Value", align: "right", num: true, render: (x) => inrShort(x.value) },
        { key: "p", label: "Physical", render: (x) => <Bar value={x.physical} /> },
        { key: "b", label: "Billing", render: (x) => <Bar value={x.billing} color="bg-violet-500" /> },
        { key: "pay", label: "Payment", render: (x) => <Bar value={x.payment} color="bg-green-600" /> },
        { key: "s", label: "Schedule", render: (x) => <Status tone={{ "On track": "green", "At risk": "amber", Delayed: "red", Completed: "blue" }[x.status]}>{x.status}</Status> },
        { key: "sig", label: "Signals", render: (x) => { const s = signals(x); return s.length ? <span className="flex flex-wrap gap-1">{s.slice(0, 3).map(([t, tone]) => <Status key={t} tone={tone}>{t}</Status>)}{s.length > 3 && <span data-tip={s.slice(3).map((z) => z[0]).join("\n")} className="text-[11px] text-ink-mute">+{s.length - 3}</span>}</span> : <span className="text-ink-faint">—</span>; } },
      ]} />
    </DashCard>
  );
  const cashCard = (
    <DashCard title="Commercial / cash pipeline" icon={Icon.rupee} link={{ label: "Retention & payments", to: `${CL_BASE}/retention` }} className={vendorFocus ? "" : "col-span-2"}>
      <div className="flex h-[190px] items-end gap-3 px-5 pb-2 pt-4">
        {d.cash.map((c) => (
          <div key={c.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span className="num text-[11.5px] font-semibold text-ink">{inrShort(c.v)}</span>
            <span className={cls("w-full rounded-t", c.color)} style={{ height: `${Math.max(3, (c.v / maxCash) * 130)}px` }} />
            <span className="w-full truncate text-center text-[11px] text-ink-mute">{c.label}</span>
          </div>
        ))}
      </div>
      <p className="border-t border-line px-4 py-2 text-[11.5px] text-ink-mute">Executed = JMS-measured value · {inrShort(Math.max(0, d.cash[2].v - d.cash[3].v))} executed but not yet certified · outstanding = approved RA bills not yet paid.</p>
    </DashCard>
  );
  const procCard = (
    <DashCard title="Procurement pipeline" icon={Icon.scale} link={{ label: "RFQs", to: `${VM_BASE}/rfq` }}>
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
      <div className="grid grid-cols-3 divide-x divide-line border-t border-line text-[11.5px]">
        <div className="px-4 py-2"><p className="text-ink-mute">Open PO value</p><b className="num text-[15px] text-ink">{inrShort(d.proc.openPO)}</b><p className="text-ink-faint">{d.proc.openPOn} POs</p></div>
        <div className="px-4 py-2"><p className="text-ink-mute">Avg RFQ → PO</p><b className="num text-[15px] text-ink">{d.proc.avgDays == null ? "—" : `${d.proc.avgDays} days`}</b></div>
        <div className="px-4 py-2"><p className="text-ink-mute">Conversion</p><b className="num text-[15px] text-ink">{d.proc.conversion}%</b><p className="text-ink-faint">RFQ → award</p></div>
      </div>
    </DashCard>
  );
  const activityCard = (
    <DashCard title="Recent activity" icon={Icon.activity}>
      <ul className="max-h-[300px] divide-y divide-line overflow-y-auto">
        {d.activity.length === 0 && <li className="p-6 text-center text-[13px] text-ink-mute">No activity in this period.</li>}
        {d.activity.map((a, i) => (
          <li key={i} className="flex gap-2.5 px-4 py-2 text-[12.5px]">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
            <span className="min-w-0"><span className="block truncate text-ink">{a.action}</span><span className="text-[11px] text-ink-mute">{fmtDateTime(a.at)} · {a.entity} {a.id} · {a.by}</span></span>
          </li>
        ))}
      </ul>
    </DashCard>
  );
  const pc = (x) => (x == null ? <span className="text-ink-faint">—</span> : <span className={cls("num", x >= 80 ? "text-green-700" : x >= 60 ? "text-amber-700" : "text-red-600")}>{Math.round(x)}%</span>);
  const perfCard = (
    <DashCard title="Vendor performance (top 5)" icon={Icon.star} link={{ label: "Scorecard", to: `${VM_BASE}/scorecard` }}>
      <DataTable dense rows={d.perf.slice(0, 5)} rowKey={(x) => x.v.id} onRow={(x) => nav(`${VM_BASE}/scorecard`)} empty={<p className="p-6 text-center text-[13px] text-ink-mute">No scored vendors.</p>} columns={[
        { key: "v", label: "Vendor", render: (x) => <span className="block max-w-[200px] truncate font-medium">{x.v.name}</span> },
        { key: "d", label: "Delivery", align: "right", render: (x) => pc(x.parts.timeliness) }, { key: "q", label: "Quality", align: "right", render: (x) => pc(x.parts.quality) },
        { key: "s", label: "Safety", align: "right", render: (x) => pc(x.parts.safety) }, { key: "c", label: "Compliance", align: "right", render: (x) => pc(x.parts.compliance) },
        { key: "o", label: "Overall", align: "right", render: (x) => <span className={cls("num rounded-full px-2 py-0.5 text-[12px] font-semibold", x.score >= 80 ? "bg-green-100 text-green-700" : x.score >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>{Math.round(x.score)}</span> },
      ]} />
    </DashCard>
  );
  const woCard = (
    <DashCard title="Work order progress" icon={Icon.clipboardList} link={{ label: "Work orders", to: `${CL_BASE}/work-orders` }}>
      <DataTable dense rows={d.liveWOs.map((w) => ({ w, hl: woHealth(st, w) })).sort((a, b) => a.hl.pr.spi - b.hl.pr.spi).slice(0, 6)} rowKey={(x) => x.w.id} onRow={(x) => nav(`${CL_BASE}/work-orders?open=${x.w.id}`)} empty={<p className="p-6 text-center text-[13px] text-ink-mute">No live work orders.</p>} columns={[
        { key: "s", label: "Scope", render: (x) => <span className="flex flex-col"><span className="block max-w-[240px] truncate font-medium">{x.w.title}</span><span className="block max-w-[240px] truncate text-[11.5px] text-ink-mute">{vendorName(st, x.w.vendorId)}</span></span> },
        { key: "p", label: "Physical", render: (x) => <Bar value={x.hl.pr.physical} /> },
        { key: "st", label: "Status", render: (x) => <Status tone={x.hl.tone}>{x.hl.label}</Status> },
        { key: "f", label: "Finish", render: (x) => <span className={cls(daysUntil(x.w.end) < 0 && "text-red-600")}>{fmtDate(x.w.end)}</span> },
      ]} />
    </DashCard>
  );

  return (
    <Page title={vendorFocus ? "Vendor Overview" : "Contract & Labour Overview"} subtitle={vendorFocus ? "Vendor base, compliance, procurement pipeline and payments at a glance" : "Contract delivery, commitments, cash flow and site progress at a glance"} icon={Icon.grid}
      actions={<>
        <FilterSelect label="Period" value={f.period} onChange={(x) => setF({ ...f, period: x })} options={[{ value: "30", label: "Last 30 days" }, { value: "90", label: `Last 90 days` }, { value: "180", label: "Last 180 days" }, { value: "365", label: "Last 12 months" }, { value: "all", label: "All time" }]} />
        <FilterSelect label="Project" value={f.project} onChange={(x) => setF({ ...f, project: x })} options={[{ value: "All", label: "All projects" }, ...PROJECTS]} />
        <FilterSelect label="Vendor" value={f.vendor} onChange={(x) => setF({ ...f, vendor: x })} options={[{ value: "All", label: "All vendors" }, ...st.vendors.map((v) => ({ value: v.id, label: v.name, tone: "gray" }))]} />
      </>}>
      <div className="space-y-3 bg-gray-50/70 p-3">
        <p className="text-[11.5px] text-ink-mute">Showing {f.project === "All" ? "all projects" : f.project} · {f.vendor === "All" ? "all vendors" : vendorName(st, f.vendor)} · activity {since}</p>
        {kpis}
        {vendorFocus ? <>
          <div className="grid grid-cols-3 gap-3">{vendorStatus}{compliance}{procCard}</div>
          <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3">{actionCenter}{expiringCard}</div>
          <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3">{perfCard}{activityCard}</div>
        </> : <>
          <div className="grid grid-cols-3 gap-3">{delivery}{cashCard}</div>
          <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3">{actionCenter}{expiringCard}</div>
          {healthCard}
          <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3">{woCard}{activityCard}</div>
        </>}
      </div>
    </Page>
  );
}
const VendorOverviewPage = () => <OverviewPage focus="vendor" />;
const ContractOverviewPage = () => <OverviewPage focus="contract" />;
