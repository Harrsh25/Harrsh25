// Exception Center: one list of everything that is wrong right now, across vendors, purchasing and contracts.
// Each row says what is wrong, on which record, how serious it is and since when; clicking opens the record.
function exceptionRows(st) {
  const out = [], today = todayISO();
  const add = (type, sev, entity, id, name, detail, since, to) => out.push({ key: `${type}|${id}|${out.length}`, type, sev, entity, id, name, detail, since, to });
  const age = (d) => (d ? Math.max(0, -daysUntil(d)) : null);
  for (const v of st.vendors) {
    if (!lifeStatus(v)) continue;
    const c = complianceOf(v);
    if (c.status === "Non-Compliant") add("Compliance failing", c.blocking.length ? "High" : "Medium", "Vendor", v.id, v.name, c.issues.join(" · "), null, `${VM_BASE}/registry?open=${v.id}`);
    for (const b of v.bankAccounts || []) if (b.isDefault && bankStatus(b) !== "Verified") add("Default bank account not verified", "High", "Vendor", v.id, v.name, `${b.bank || "Bank"} ••${String(b.account).slice(-4)} — ${bankStatus(b)}`, b.addedAt, `${VM_BASE}/registry?open=${v.id}`);
    for (const b of v.bankAccounts || []) if (b.change?.status === "Requested") add("Bank change waiting", "Medium", "Vendor", v.id, v.name, `${b.bank || "Bank"} ••${String(b.account).slice(-4)} — ${bankStatus(b) === "Verified" ? "verified, waiting for Finance approval" : "waiting for penny-drop verification"}`, (b.change.requestedAt || "").slice(0, 10), `${VM_BASE}/registry?open=${v.id}&tab=bank`);
      else if (bankCooling(b)) add("Bank change in cooling period", "Low", "Vendor", v.id, v.name, `${b.bank || "Bank"} ••${String(b.account).slice(-4)} becomes the default on ${fmtDate(b.change.switchOn)} — current account paid until then`, null, `${VM_BASE}/registry?open=${v.id}&tab=bank`);
  }
  for (const v of st.vendors) {
    if (!lifeStatus(v)) continue;
    const r = vendorRisk(st, v), to = `${VM_BASE}/registry?open=${v.id}&tab=risk`;
    if (["High", "Critical"].includes(r.level.name) && !r.open.length) add(`${r.level.name} supplier risk — no action`, "High", "Vendor", v.id, v.name, `Score ${r.score}: ${r.drivers.slice(0, 2).map((d) => d.why).join(" · ")}`, null, to);
    for (const a of r.overdue) add("Risk action overdue", "Medium", "Vendor", v.id, v.name, `${a.title} — ${a.owner}, due ${fmtDate(a.due)}`, a.due, to);
  }
  for (const v of st.vendors.filter((x) => x.status === "Pending Approval")) {
    const hints = duplicateHints(v); if (hints.length) add("Possible duplicate supplier", "High", "Vendor", v.id, v.name, hints.join(" · "), v.createdAt, `${VM_BASE}/approvals?open=${v.id}`);
  }
  // workers: not eligible for site, papers expiring, or marked present while not eligible
  for (const w of st.workers || []) {
    if (workerState(w) === "Exited" || w.active === false) continue;
    const i = workerIssues(w), to = `${CL_BASE}/workers?open=${w.id}`;
    if (i.block.length) add("Worker not eligible for site", "High", "Worker", w.id, `${w.name} · ${vendorName(st, w.vendorId)}`, i.block.join(" · "), null, to);
    else if (i.warn.some((x) => /due/.test(x))) add("Worker papers expiring", "Low", "Worker", w.id, `${w.name} · ${vendorName(st, w.vendorId)}`, i.warn.filter((x) => /due/.test(x)).join(" · "), null, to);
    const bad = st.attendance.filter((a) => a.workerId === w.id && a.status !== "A" && !workerIssues(w, a.date).eligible);
    if (bad.length) add("Worker attended while not eligible", "Medium", "Worker", w.id, `${w.name} · ${vendorName(st, w.vendorId)}`, `${bad.length} day(s) present from ${fmtDate(bad.map((a) => a.date).sort()[0])} — ${workerIssues(w, bad[0].date).block[0]}`, bad.map((a) => a.date).sort()[0], to);
  }
  for (const r of st.rfqs) if (r.status === "Sent" && r.dueDate && r.dueDate < today) add("RFQ quotes overdue", "Medium", "RFQ", r.id, r.title, `Quotes were due ${fmtDate(r.dueDate)} — none received`, r.dueDate, `${VM_BASE}/rfq?open=${r.id}`);
  for (const po of st.purchaseOrders) {
    const s = poStatus(po);
    if (["Issued", "Partially Received"].includes(s) && po.deliveryDate && po.deliveryDate < today) add("PO delivery overdue", "Medium", "PO", po.id, vendorName(st, po.vendorId), `${s} — delivery was due ${fmtDate(po.deliveryDate)}`, po.deliveryDate, `${VM_BASE}/purchase-orders?open=${po.id}`);
  }
  for (const inv of st.invoices) {
    if (inv.cancelled) continue;
    const s = invoiceStatus(inv), m = threeWay(st, inv).status;
    if (m === "Mismatch" && s !== "Paid") add("Invoice mismatch (3-way)", "High", "Invoice", inv.id, vendorName(st, inv.vendorId), `Bill ${inv.number} does not match the PO / goods receipt`, inv.date, `${VM_BASE}/invoices?open=${inv.id}`);
    if (s === "Overdue") add("Payment overdue", "Medium", "Invoice", inv.id, vendorName(st, inv.vendorId), `Bill ${inv.number} — balance ${inr(invoiceTotals(inv).balance)} was due ${fmtDate(inv.due)}`, inv.due, `${VM_BASE}/invoices?open=${inv.id}`);
  }
  for (const c of st.contracts) {
    const s = contractStatus(c);
    if (s === "Expiring" && daysUntil(c.end) <= 30) add("Contract ending soon", "Medium", "Contract", c.id, c.title, `Ends ${fmtDate(c.end)} (${daysUntil(c.end)} days)`, null, `${CL_BASE}/contracts?open=${c.id}`);
    if (c.bgExpiry && !["Closed", "Terminated", "Draft", "Rejected"].includes(c.status) && daysUntil(c.bgExpiry) <= 30) add(daysUntil(c.bgExpiry) < 0 ? "Bank guarantee expired" : "Bank guarantee expiring", daysUntil(c.bgExpiry) < 0 ? "High" : "Medium", "Contract", c.id, c.title, `${c.bgNo || "BG"} ${daysUntil(c.bgExpiry) < 0 ? "expired" : "expires"} ${fmtDate(c.bgExpiry)}`, daysUntil(c.bgExpiry) < 0 ? c.bgExpiry : null, `${CL_BASE}/contracts?open=${c.id}`);
  }
  for (const w of st.workOrders) if (["Issued", "In Progress"].includes(w.status) && w.end && w.end < today) add("Work order overdue", "Medium", "Work Order", w.id, w.title, `Should have finished ${fmtDate(w.end)}`, w.end, `${CL_BASE}/work-orders?open=${w.id}`);
  for (const m of st.measurements) if (m.jms?.status === "Disputed") { const w = byId(st.workOrders, m.woId); add("Measurement disputed", "High", "Measurement", m.id, w ? w.title : m.woId, m.jms.remark || "Contractor and engineer don't agree on the quantity", m.date, `${CL_BASE}/measurement-book?open=${m.id}`); }
  for (const b of st.raBills) if (b.status === "Rejected") { const w = byId(st.workOrders, b.woId); add("RA bill rejected", "Medium", "RA Bill", b.id, w ? w.title : b.woId, b.rejection?.reason || b.remark || "Returned to the contractor", b.periodTo, `${CL_BASE}/ra-bills?open=${b.id}`); }
  // approvals past their stage deadline (Procurement Settings → Approval stages)
  for (const [kind, list, ent, to] of [["vendor", st.vendors, "Vendor", (x) => `${VM_BASE}/approvals?open=${x.id}`], ["contract", st.contracts, "Contract", (x) => `${CL_BASE}/contracts?open=${x.id}`]])
    for (const x of list) { const c = approvalClock(x, kind, st); if (c && c.state === "Overdue") add("Approval overdue", c.escalated ? "High" : "Medium", ent, x.id, kind === "vendor" ? x.name : x.title, `${c.name} — decision was due ${fmtDate(c.due)} (${c.days}-day deadline)${c.escalated ? ` · escalated to ${c.escalated.to}` : ""}`, c.due, to(x)); }
  // Everything the Vendor and Contract & Labor overviews raise as an alert is an exception too (one place for all of it):
  // payment blocked, delayed / declined work orders, wage below minimum, joint measurements waiting > 7 days,
  // muster to verify, onboarding incomplete, retention due for release, approvals and documents waiting…
  const seen = new Set(out.map((r) => `${r.type}|${r.name}`));
  const sevOf = { critical: "High", attention: "Medium", pending: "Low" };
  const all = { project: "All", vendor: "All" };
  const area = (to) => (/contract-labor/.test(to || "") ? "Contract & Labor" : "Vendor");
  for (const a of [...buildVendorOverview(st, all).actions, ...buildContractOverview(st, all).actions]) {
    const name = a.who || a.ref || "—";
    const twin = { "Delivery late": "PO delivery overdue", "Payment overdue": "Payment overdue", "Measurement disputed": "Measurement disputed", "RFQ past due — not awarded": "RFQ quotes overdue", "Compliance gap — payments held": "Compliance failing" }[a.title];
    if (twin && [...seen].some((k) => k.startsWith(twin + "|"))) continue;
    if (/approval pending/i.test(a.title) && seen.has(`Approval overdue|${name}`)) continue;
    const key = `${a.title}|${name}|${a.detail}`; if (seen.has(key)) continue; seen.add(key);
    out.push({ key: `${key}|${out.length}`, type: a.title, sev: sevOf[a.sev] || "Low", entity: area(a.to), id: a.ref || name, name, detail: [a.detail, a.ref && a.ref !== name ? a.ref : ""].filter(Boolean).join(" · "), since: a.due && daysUntil(a.due) < 0 ? a.due : null, to: a.to });
  }
  const rank = { High: 0, Medium: 1, Low: 2 };
  return out.map((r) => ({ ...r, age: age(r.since) })).sort((a, b) => rank[a.sev] - rank[b.sev] || (b.age || 0) - (a.age || 0));
}
function ExceptionCenterPage() {
  const st = useStore(), nav = useNavigate();
  const rows = exceptionRows(st);
  const high = rows.filter((r) => r.sev === "High").length, med = rows.filter((r) => r.sev === "Medium").length;
  return (
    <Page title="Exception Center" subtitle="Everything that needs attention right now — across vendors, purchasing and contracts" icon={Icon.alert}>
      <div className="grid grid-cols-4 gap-3 px-4 pt-4">
        <StatTile tone="red" label="High" value={high} sub="act now" icon={Icon.alert} />
        <StatTile tone="amber" label="Medium" value={med} sub="plan this week" icon={Icon.clock} />
        <StatTile tone="blue" label="Low — waiting on someone" value={rows.length - high - med} sub="approvals, verifications, sign-offs" icon={Icon.listChecks} />
        <StatTile tone="purple" label="Records affected" value={new Set(rows.map((r) => r.id)).size} sub={`${new Set(rows.map((r) => r.type)).size} kinds of exception`} icon={Icon.layers} />
      </div>
      <DataTable noun="exceptions" rows={rows} rowKey={(r) => r.key} onRow={(r) => r.to && nav(r.to)} exportName="exceptions"
        defaultCols={["type", "rec", "detail", "sev", "age"]}
        empty={<p className="p-6 text-center text-[13px] text-ink-mute">No open exceptions.</p>}
        columns={[
          { key: "type", label: "Exception", className: "font-medium", filterOptions: () => uniqSorted(exceptionRows(getState()).map((r) => r.type)), filter: (r) => r.type },
          { key: "rec", label: "Record", sort: (r) => r.name, render: (r) => <span className="text-brand">{r.name}</span> },
          { key: "detail", label: "What's wrong", className: "max-w-[420px] whitespace-normal text-[12.5px]", render: (r) => r.detail },
          { key: "sev", label: "Severity", filterOptions: () => ["High", "Medium", "Low"], filter: (r) => r.sev, render: (r) => <Status tone={r.sev === "High" ? "red" : r.sev === "Medium" ? "amber" : "blue"}>{r.sev}</Status> },
          { key: "age", label: "Open for", sort: (r) => r.age ?? -1, render: (r) => (r.age == null ? <span className="text-ink-mute">—</span> : `${r.age} day${r.age === 1 ? "" : "s"}`) },
          { key: "entity", label: "Area", filterOptions: () => uniqSorted(exceptionRows(getState()).map((r) => r.entity)), filter: (r) => r.entity },
        ]} />
    </Page>
  );
}
