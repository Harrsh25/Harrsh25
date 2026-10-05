// Vendor Overview additions: spend by category, top 10 vendors, guarantee & retention exposure,
// and how long each step from requisition to purchase order takes.
function spendRows(st, f) {
  const projOk = (p) => !f || f.project === "All" || p === f.project, vend = (id) => !f || f.vendor === "All" || id === f.vendor;
  const by = {};
  const add = (vid, amt) => { if (amt > 0) by[vid] = (by[vid] || 0) + amt; };
  for (const p of st.purchaseOrders) if (!["Draft", "Cancelled"].includes(p.status) && vend(p.vendorId) && projOk(p.project)) add(p.vendorId, poValue(p));
  for (const b of st.raBills) if (b.status !== "Rejected" && vend(b.vendorId) && projOk(byId(st.workOrders, b.woId)?.project)) add(b.vendorId, b.gross || 0);
  return Object.entries(by).map(([vid, amt]) => ({ v: byId(st.vendors, vid), amt })).filter((x) => x.v).sort((a, b) => b.amt - a.amt);
}
function exposure(st) {
  const live = st.contracts.filter((c) => !["Draft", "Rejected", "Closed"].includes(c.status));
  const gs = live.flatMap((c) => liveGuarantees(c).map((g) => ({ g, c })));
  const ret = live.map((c) => ({ c, led: contractLedger(st, c) }));
  return {
    bg: sum(gs, (x) => x.g.amount), bgN: gs.length, bgExp: sum(gs.filter((x) => daysUntil(x.g.expiry) <= 30), (x) => x.g.amount), bgExpN: gs.filter((x) => daysUntil(x.g.expiry) <= 30).length,
    ret: sum(ret, (x) => x.led.retentionBalance), adv: sum(ret, (x) => Math.max(0, x.led.advanceBalance)),
  };
}
// Average days per step: requisition approved, RFQ raised, RFQ awarded to PO, requisition to PO
function cycleTimes(st) {
  const day = (a, b) => (a && b ? Math.max(0, Math.round((new Date(String(b).slice(0, 10)) - new Date(String(a).slice(0, 10))) / DAY)) : null);
  const avg = (xs) => { const v = xs.filter((x) => x != null); return v.length ? { d: Math.round(sum(v) / v.length), n: v.length } : { d: null, n: 0 }; };
  const reqs = st.requisitions || [];
  const approve = reqs.map((r) => (r.decidedAt && !/Reject/.test(r.status) ? day(r.createdAt || r.date, r.decidedAt) : null));
  const toRfq = reqs.flatMap((r) => (r.rfqIds || []).map((id) => { const q = byId(st.rfqs, id); return q ? day(r.decidedAt || r.createdAt, q.createdOn || q.createdAt) : null; }));
  const rfqPo = st.purchaseOrders.filter((p) => p.rfqId).map((p) => { const q = byId(st.rfqs, p.rfqId); return q ? day(q.createdOn || q.createdAt, p.date) : null; });
  const prPo = st.purchaseOrders.map((p) => { const rid = p.requisitionId || (p.rfqId && byId(st.rfqs, p.rfqId)?.requisitionId); const r = rid && reqs.find((x) => x.id === rid); return r ? day(r.createdAt || r.date, p.date) : null; });
  return [["Requisition → approved", avg(approve)], ["Approved → RFQ raised", avg(toRfq)], ["RFQ → PO (award)", avg(rfqPo)], ["Requisition → PO", avg(prPo)]];
}

function VendorInsights({ st, f, nav }) {
  const rows = spendRows(st, f), total = sum(rows, (x) => x.amt) || 1;
  const cats = {};
  for (const x of rows) { const k = primaryCategory(x.v) || "Other"; cats[k] = (cats[k] || 0) + x.amt; }
  const catRows = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 8), maxCat = Math.max(1, ...catRows.map((c) => c[1]));
  const ex = exposure(st), cyc = cycleTimes(st);
  return (
    <>
      <div className="grid grid-cols-2 gap-3" data-insights>
        <DashCard title="Spend by category" icon={Icon.layers} link={{ label: "Purchase orders", to: `${VM_BASE}/purchase-orders` }}>
          <div className="space-y-2.5 px-4 py-3">
            {catRows.length ? catRows.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[140px_1fr_110px] items-center gap-3 text-[12.5px]">
                <span className="truncate text-ink-soft">{k}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-gray-100"><span className="block h-full rounded-full bg-brand" style={{ width: `${(v / maxCat) * 100}%` }} /></span>
                <b className="num text-right">{inrShort(v)} <span className="font-normal text-ink-mute">{Math.round((v / total) * 100)}%</span></b>
              </div>
            )) : <p className="py-4 text-center text-[13px] text-ink-mute">No spend yet.</p>}
          </div>
          <p className="border-t border-line px-4 py-2 text-[12px] text-ink-mute">PO value plus RA bills - total {inrShort(sum(rows, (x) => x.amt))}</p>
        </DashCard>
        <DashCard title="Top 10 vendors by spend" icon={Icon.trending} link={{ label: "Registry", to: `${VM_BASE}/registry` }}>
          <DataTable dense plain rows={rows.slice(0, 10)} rowKey={(x) => x.v.id} onRow={(x) => nav(`${VM_BASE}/registry?open=${x.v.id}`)} empty={<p className="p-6 text-center text-[13px] text-ink-mute">No spend yet.</p>} columns={[
            { key: "v", label: "Vendor", render: (x) => <span className="block max-w-[220px] truncate font-medium">{x.v.name}</span> },
            { key: "c", label: "Category", className: "text-[12px] text-ink-soft", render: (x) => primaryCategory(x.v) },
            { key: "a", label: "Spend", align: "right", render: (x) => <span className="num">{inrShort(x.amt)}</span> },
            { key: "s", label: "Share", align: "right", render: (x) => <span className="num">{Math.round((x.amt / total) * 100)}%</span> },
          ]} />
        </DashCard>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <DashCard title="Guarantee & retention exposure" icon={Icon.lock} link={{ label: "Retention", to: `${CL_BASE}/retention` }}>
          <div className="grid grid-cols-2 divide-x divide-line">
            <Metric label="Bank guarantees held" value={inrShort(ex.bg)} sub={`${ex.bgN} live guarantee(s)`} />
            <Metric label="Guarantees expiring in 30 days" value={inrShort(ex.bgExp)} sub={`${ex.bgExpN} to extend`} tone={ex.bgExpN ? "text-red-600" : ""} />
          </div>
          <div className="grid grid-cols-2 divide-x divide-line border-t border-line">
            <Metric label="Retention held" value={inrShort(ex.ret)} sub="owed back to contractors" />
            <Metric label="Advance not yet recovered" value={inrShort(ex.adv)} sub="mobilisation advances" />
          </div>
        </DashCard>
        <DashCard title="Requisition to PO - days per step" icon={Icon.clock} link={{ label: "Requisitions", to: `${VM_BASE}/requisitions` }}>
          <div className="grid grid-cols-2 divide-x divide-line">
            {cyc.slice(0, 2).map(([l, a]) => <Metric key={l} label={l} value={a.d == null ? "-" : `${a.d} days`} sub={a.n ? `avg of ${a.n}` : "no data yet"} />)}
          </div>
          <div className="grid grid-cols-2 divide-x divide-line border-t border-line">
            {cyc.slice(2).map(([l, a]) => <Metric key={l} label={l} value={a.d == null ? "-" : `${a.d} days`} sub={a.n ? `avg of ${a.n}` : "no data yet"} />)}
          </div>
        </DashCard>
      </div>
    </>
  );
}
