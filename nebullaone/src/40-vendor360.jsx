// Vendor 360: everything we do with one vendor in one place — sourcing, orders, bills and payments, contracts,
// work orders, subcontracts, workers — with totals; each row opens its own record.
function Vendor360({ v }) {
  const st = useStore(), nav = useNavigate();
  const rfqs = st.rfqs.filter((r) => r.vendorIds.includes(v.id));
  const pos = st.purchaseOrders.filter((p) => p.vendorId === v.id);
  const invs = st.invoices.filter((i) => i.vendorId === v.id && !i.cancelled);
  const pays = invs.flatMap((i) => i.payments.map((p) => ({ ...p, inv: i })));
  const ctrs = st.contracts.filter((c) => c.vendorId === v.id);
  const wos = st.workOrders.filter((w) => w.vendorId === v.id);
  const subs = allSubs(st).filter((x) => x.vendorId === v.id || x.contract.vendorId === v.id);
  const workers = st.workers.filter((w) => w.vendorId === v.id && workerState(w) !== "Exited");
  const ordered = sum(pos.filter((p) => poStatus(p) !== "Cancelled"), poValue);
  const billed = sum(invs, (i) => invoiceTotals(i).payable), paid = sum(invs, (i) => invoiceTotals(i).paid), due = sum(invs, (i) => Math.max(0, invoiceTotals(i).balance));
  const overdue = sum(invs.filter((i) => invoiceStatus(i) === "Overdue"), (i) => invoiceTotals(i).balance);
  const won = rfqs.filter((r) => (r.awards || []).some((a) => a.vendorId === v.id)).length, quoted = rfqs.filter((r) => r.quotes.some((q) => q.vendorId === v.id)).length;
  const go = (to) => nav(to);
  const T = ({ title, icon, rows, cols, to, empty }) => (
    <Section title={`${title} (${rows.length})`} icon={icon}>
      <DataTable dense plain rows={rows} onRow={to ? (r) => go(to(r)) : undefined} empty={<p className="p-4 text-[13px] text-ink-mute">{empty}</p>} columns={cols} />
    </Section>
  );
  return (
    <ListMode.Provider value={false}>
      <div className="grid grid-cols-4 gap-3" data-v360>
        <StatTile tone="blue" label="Ordered" value={inrShort(ordered + sum(ctrs.filter((c) => !["Draft", "Rejected"].includes(c.status)), contractValue))} sub={`${pos.length} PO · ${ctrs.length} contract`} icon={Icon.package} />
        <StatTile tone="purple" label="Billed" value={inrShort(billed)} sub={`${invs.length} bill(s)`} icon={Icon.receipt} />
        <StatTile tone="green" label="Paid" value={inrShort(paid)} sub={`${pays.filter((p) => !p.reversed).length} payment(s)`} icon={Icon.wallet} />
        <StatTile tone={overdue > 0 ? "red" : "amber"} label="Balance due" value={inrShort(due)} sub={overdue > 0 ? `${inrShort(overdue)} overdue` : "none overdue"} icon={Icon.clock} />
      </div>
      <p className="text-[12.5px] text-ink-soft">RFQs: invited {rfqs.length} · quoted {quoted} · won {won}{quoted ? ` (${Math.round((won / quoted) * 100)}% win rate)` : ""}{workers.length ? ` · ${workers.length} worker(s) on site` : ""}{subs.length ? ` · ${subs.length} subcontract(s)` : ""}</p>
      <T title="RFQs" icon={Icon.scale} rows={rfqs} to={(r) => `${VM_BASE}/rfq?open=${r.id}`} empty="Not invited to any RFQ." cols={[
        { key: "title", label: "RFQ", className: "font-medium", render: (r) => <span>{r.title} <span className="mono text-[11px] text-ink-mute">{r.id}</span></span> },
        { key: "q", label: "Quote", render: (r) => { const q = r.quotes.find((x) => x.vendorId === v.id); return q ? inrShort(quoteTotal(r, q)) : <span className="text-ink-faint">no quote</span>; } },
        { key: "s", label: "Result", render: (r) => ((r.awards || []).some((a) => a.vendorId === v.id) ? <Status tone="green">Won</Status> : <Status>{r.status}</Status>) },
      ]} />
      <T title="Purchase orders" icon={Icon.package} rows={pos} to={(p) => `${VM_BASE}/purchase-orders?open=${p.id}`} empty="No purchase orders." cols={[
        { key: "id", label: "PO", className: "mono text-[12px]" }, { key: "date", label: "Date", render: (p) => fmtDate(p.date) },
        { key: "val", label: "Value", align: "right", render: (p) => <span className="num">{inrShort(poValue(p))}</span> }, { key: "s", label: "Status", render: (p) => <Status>{poStatus(p)}</Status> },
      ]} />
      <T title="Bills & payments" icon={Icon.receipt} rows={invs} to={(i) => `${VM_BASE}/invoices?open=${i.id}`} empty="No bills." cols={[
        { key: "number", label: "Bill", className: "font-medium" }, { key: "date", label: "Date", render: (i) => fmtDate(i.date) },
        { key: "p", label: "Payable", align: "right", render: (i) => <span className="num">{inrShort(invoiceTotals(i).payable)}</span> },
        { key: "pd", label: "Paid", align: "right", render: (i) => <span className="num">{inrShort(invoiceTotals(i).paid)}</span> },
        { key: "s", label: "Status", render: (i) => <Status>{invoiceStatus(i)}</Status> },
      ]} />
      {(ctrs.length > 0 || wos.length > 0 || subs.length > 0) && <>
        <T title="Contracts" icon={Icon.file} rows={ctrs} to={(c) => `${CL_BASE}/contracts?open=${c.id}`} empty="No contracts." cols={[
          { key: "title", label: "Contract", className: "font-medium" }, { key: "v", label: "Value", align: "right", render: (c) => <span className="num">{inrShort(contractValue(c))}</span> },
          { key: "e", label: "Ends", render: (c) => fmtDate(c.end) }, { key: "s", label: "Status", render: (c) => <Status>{contractStatus(c)}</Status> },
        ]} />
        <T title="Work orders" icon={Icon.clipboardList} rows={wos} to={(w) => `${CL_BASE}/work-orders?open=${w.id}`} empty="No work orders." cols={[
          { key: "title", label: "Work order", className: "font-medium" }, { key: "v", label: "Value", align: "right", render: (w) => <span className="num">{inrShort(woValue(w))}</span> },
          { key: "pr", label: "Progress", align: "right", render: (w) => (["Issued", "In Progress", "Completed"].includes(w.status) ? `${woProgress(st, w).physical.toFixed(0)}%` : "—") }, { key: "s", label: "Status", render: (w) => <Status>{w.status}</Status> },
        ]} />
        {subs.length > 0 && <T title="Subcontracts" icon={Icon.users} rows={subs} to={(x) => `${CL_BASE}/contracts?open=${x.contract.id}`} empty="" cols={[
          { key: "r", label: "Role", render: (x) => (x.vendorId === v.id ? `Subcontractor to ${vendorName(st, x.contract.vendorId)}` : `Main contractor — sublet to ${vendorName(st, x.vendorId)}`) },
          { key: "scope", label: "Scope" }, { key: "value", label: "Value", align: "right", render: (x) => <span className="num">{inrShort(x.value)}</span> }, { key: "s", label: "Status", render: (x) => <Status tone={SUB_STATUS_TONE[x.status]}>{x.status}</Status> },
        ]} />}
      </>}
    </ListMode.Provider>
  );
}
