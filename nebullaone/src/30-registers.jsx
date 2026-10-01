// Cross-record registers that the benchmark platforms have as list screens:
// Goods Receipts (ERPNext / Odoo / Oracle / Zoho / Procore), Holds Register (ERPNext, Oracle
// invoice holds), Change & Variations (VNDLY / Fieldglass change orders) and the Audit Log
// (ERPNext version history, Odoo chatter, Zoho audit trail). Each reads records the app already
// keeps and opens the source record on click.

// ---------------------------------------------------------------- goods receipts
function goodsReceiptRows(st) {
  return st.purchaseOrders.flatMap((po) => (po.receipts || []).map((g) => {
    const qty = sum(g.lines || [], (l) => l.qty), acc = sum(g.lines || [], (l) => l.accepted);
    const items = (g.lines || []).map((l) => po.lines[l.line]?.desc).filter(Boolean);
    return { id: g.id, g, po, vendorId: po.vendorId, date: g.date, qty, acc, rej: round2(qty - acc), items, onTime: !po.deliveryDate || g.date <= po.deliveryDate,
      returns: (po.returns || []).filter((r) => r.grnId === g.id) };
  })).sort((a, b) => b.date.localeCompare(a.date));
}
function GoodsReceiptsPage() {
  const st = useStore(), nav = useNavigate();
  const rows = goodsReceiptRows(st);
  return (
    <Page title="Goods Receipts" subtitle="Every receipt against every purchase order — open one to see its PO, inspection and returns" icon={Icon.truck}
      actions={<Btn variant="primary" icon={Icon.plus} onClick={() => nav(`${VM_BASE}/purchase-orders`)}>Receive against a PO</Btn>}>
      <div className="grid grid-cols-4 gap-3 px-4 pt-4">
        <StatTile tone="blue" label="Receipts" value={rows.length} sub={`${rows.filter((r) => daysUntil(r.date) >= -30).length} in the last 30 days`} icon={Icon.truck} />
        <StatTile tone="green" label="Accepted" value={num(sum(rows, (r) => r.acc))} sub="units" icon={Icon.check} />
        <StatTile tone="red" label="Rejected" value={num(sum(rows, (r) => r.rej))} sub={`${rows.filter((r) => r.rej > 0).length} receipts with returns`} icon={Icon.x} />
        <StatTile tone="amber" label="Late" value={rows.filter((r) => !r.onTime).length} sub="after the PO delivery date" icon={Icon.clock} />
      </div>
      <DataTable noun="receipts" rows={rows} onRow={(r) => nav(`${VM_BASE}/purchase-orders?open=${r.po.id}`)} empty={<EmptyState icon={Icon.truck} title="No goods received yet" text="Post a goods receipt from a purchase order (Receive goods)." />} columns={[
        { key: "id", label: "GRN", className: "mono text-[12px]" },
        { key: "date", label: "Date", sort: (r) => r.date, render: (r) => fmtDate(r.date) },
        { key: "po", label: "PO", filter: (r) => r.po.id, render: (r) => <span className="mono text-[12px]">{r.po.id}</span> },
        { key: "vendor", label: "Vendor", filterOptions: FO.vendors, filter: (r) => vendorName(st, r.vendorId), render: (r) => <span className="font-medium">{vendorName(st, r.vendorId)}</span> },
        { key: "project", label: "Project", filterOptions: FO.projects, filter: (r) => r.po.project, render: (r) => r.po.project },
        { key: "items", label: "Items", render: (r) => <span className="text-[12.5px]">{r.items[0] || "—"}{r.items.length > 1 ? ` +${r.items.length - 1}` : ""}</span> },
        { key: "qty", label: "Received", align: "right", num: true, sort: (r) => r.qty, render: (r) => num(r.qty) },
        { key: "acc", label: "Accepted", align: "right", num: true, sort: (r) => r.acc, render: (r) => num(r.acc) },
        { key: "rej", label: "Rejected", align: "right", num: true, sort: (r) => r.rej, render: (r) => (r.rej > 0 ? <span className="font-semibold text-red-600">{num(r.rej)}</span> : "0") },
        { key: "qc", label: "QC", filterOptions: ["Passed", "Passed with remarks", "Partially rejected", "Failed"], filter: (r) => r.g.qc, render: (r) => <Status tone={r.g.qc === "Passed" ? "green" : r.g.qc === "Failed" ? "red" : "amber"}>{r.g.qc || "—"}</Status> },
        { key: "ot", label: "On time", filterOptions: ["On time", "Late"], filter: (r) => (r.onTime ? "On time" : "Late"), render: (r) => <Status tone={r.onTime ? "green" : "amber"}>{r.onTime ? "On time" : "Late"}</Status> },
        { key: "store", label: "Accepted into", className: "text-[12px]", render: (r) => r.g.details?.store || r.g.acceptedLocation || "—" },
        { key: "rtv", label: "Returns", render: (r) => (r.returns.length ? r.returns.map((x) => x.id).join(", ") : "—") },
      ]} />
    </Page>
  );
}

// ---------------------------------------------------------------- holds register
// Every hold in one place: vendor holds (manual / scorecard), blacklists, bill holds and the
// automatic payment blocks from the compliance gate.
function holdRows(st) {
  const out = [], set0 = settingsOf(st);
  for (const v of st.vendors) {
    if (v.status === "On Hold" && v.hold) out.push({ key: `V-${v.id}`, vendorId: v.id, level: "Vendor", ref: v.id, scope: v.hold.scope, kind: v.hold.auto ? "Performance" : "Manual", reason: v.hold.reason, since: v.hold.placedAt || v.hold.at, until: v.hold.until || null, release: "vendor" });
    if (v.status === "Blacklisted") out.push({ key: `B-${v.id}`, vendorId: v.id, level: "Vendor", ref: v.id, scope: "All", kind: "Manual (blacklist)", reason: (v.notes || []).find((n) => /Blacklisted/.test(n.text))?.text || "Vendor blacklisted", since: (v.notes || []).find((n) => /Blacklisted/.test(n.text))?.at || null, until: null, release: "blacklist" });
    if (v.frozen) out.push({ key: `F-${v.id}`, vendorId: v.id, level: "Vendor", ref: v.id, scope: "All", kind: "Manual (frozen)", reason: "Vendor frozen — no new transactions", since: null, until: null, release: "frozen" });
    const blocking = ["Active", "On Hold"].includes(v.status) ? complianceOf(v).blocking : [];
    if (blocking.length && set0.complianceGate === "Stop") out.push({ key: `C-${v.id}`, vendorId: v.id, level: "Vendor", ref: v.id, scope: "Payments", kind: "Compliance (auto)", reason: blocking.join(" · "), since: null, until: null, release: "compliance" });
  }
  for (const i of st.invoices) if (i.hold && (!i.hold.until || daysUntil(i.hold.until) >= 0) && invoiceTotals(i).balance > 0.5)
    out.push({ key: `I-${i.id}`, vendorId: i.vendorId, level: "Bill", ref: i.id, scope: "Payments", kind: "Manual", reason: i.hold.reason, since: i.hold.at, until: i.hold.until || null, release: "invoice" });
  return out.map((r, n) => ({ ...r, id: `HLD-${String(n + 1).padStart(3, "0")}` }));
}
const HOLD_SCOPE_HELP = "All blocks RFQ invites, new POs / contracts / work orders, bills and payments · Invoices blocks bill entry · Payments blocks payment only.";
function HoldsRegisterPage() {
  const st = useStore(), nav = useNavigate();
  const [tab, setTab] = y.useState("active"), [place, setPlace] = y.useState(null), [rel, setRel] = y.useState(null);
  const rows = holdRows(st);
  const released = st.audit.filter((a) => /Hold released|Hold ended|hold released|Removed from blacklist|Vendor unfrozen/.test(a.action)).map((a, n) => ({ ...a, key: `R${n}` }));
  const release = (r, note) => {
    if (r.release === "vendor") setState((s) => { const x = byId(s.vendors, r.vendorId); x.status = "Active"; x.hold = null; }, { entity: "Vendor", id: r.vendorId, action: `Hold released — ${note}` });
    if (r.release === "invoice") setState((s) => { byId(s.invoices, r.ref).hold = null; }, { entity: "Invoice", id: r.ref, action: `Hold released — ${note}` });
    if (r.release === "frozen") setState((s) => { byId(s.vendors, r.vendorId).frozen = false; }, { entity: "Vendor", id: r.vendorId, action: `Vendor unfrozen — ${note}` });
    if (r.release === "blacklist") setState((s) => { byId(s.vendors, r.vendorId).status = "Active"; }, { entity: "Vendor", id: r.vendorId, action: `Removed from blacklist — ${note}` });
    toast(`${r.id} released`); setRel(null);
  };
  const open = (r) => (r.level === "Bill" ? nav(`${VM_BASE}/invoices?open=${r.ref}`) : nav(`${VM_BASE}/registry?open=${r.vendorId}`));
  return (
    <Page title="Holds Register" subtitle="Every hold on vendors and bills — manual, scorecard, compliance and blacklist" icon={Icon.lock}
      actions={<Btn variant="primary" icon={Icon.lock} onClick={() => setPlace({ level: "Vendor", vendorId: "", invoiceId: "", scope: "Payments", until: shiftDays(30), reason: "" })}>Place hold</Btn>}>
      <TabBar active={tab} onChange={setTab} tabs={[{ id: "active", label: "Active", icon: Icon.lock, count: rows.length }, { id: "released", label: "Released", icon: Icon.check, count: released.length }]} />
      <p className="px-4 pt-3 text-[12px] text-ink-mute">{HOLD_SCOPE_HELP}</p>
      {tab === "active" && (
        <DataTable noun="holds" rows={rows} rowKey={(r) => r.key} onRow={open} empty={<EmptyState icon={Icon.check} title="No active holds" text="Vendors and bills are all clear." />} columns={[
          { key: "id", label: "Hold", className: "mono text-[12px]" },
          { key: "vendor", label: "Vendor", filterOptions: FO.vendors, filter: (r) => vendorName(st, r.vendorId), render: (r) => <span className="font-medium">{vendorName(st, r.vendorId)}</span> },
          { key: "level", label: "Level", filterOptions: ["Vendor", "Bill"], filter: (r) => r.level, render: (r) => (r.level === "Bill" ? `Bill ${r.ref}` : "Vendor") },
          { key: "scope", label: "Scope", filterOptions: ["All", "Invoices", "Payments"], filter: (r) => r.scope, render: (r) => <Status tone={r.scope === "All" ? "red" : "amber"}>{r.scope}</Status> },
          { key: "kind", label: "Reason", filterOptions: ["Manual", "Performance", "Compliance (auto)", "Manual (blacklist)", "Manual (frozen)"], filter: (r) => r.kind },
          { key: "reason", label: "Detail", className: "max-w-[380px] whitespace-normal text-[12.5px]" },
          { key: "since", label: "Since", sort: (r) => r.since || "", render: (r) => (r.since ? fmtDate(r.since) : "—") },
          { key: "until", label: "Release date", render: (r) => (r.until ? fmtDate(r.until) : r.release === "compliance" ? "When compliant" : "Indefinite") },
          { key: "a", label: "", align: "right", render: (r) => <span onClick={(e) => e.stopPropagation()}>{r.release === "compliance"
            ? <Btn size="sm" onClick={() => nav(`${VM_BASE}/compliance`)}>Fix in Compliance</Btn>
            : <Btn size="sm" onClick={() => setRel({ r, note: "" })}>Release</Btn>}</span> },
        ]} />
      )}
      {tab === "released" && (
        <DataTable noun="released holds" rows={released} rowKey={(r) => r.key} empty={<EmptyState icon={Icon.lock} title="Nothing released yet" />} columns={[
          { key: "at", label: "Released", render: (r) => fmtDateTime(r.at) }, { key: "by", label: "By" },
          { key: "id", label: "Record", className: "mono text-[12px]" }, { key: "action", label: "Detail", className: "whitespace-normal text-[12.5px]" },
        ]} />
      )}
      {place && <PlaceHoldModal f={place} setF={setPlace} />}
      {rel && (
        <Modal open onClose={() => setRel(null)} width={480} title={`Release ${rel.r.id}`} subtitle={`${vendorName(st, rel.r.vendorId)} · ${rel.r.level === "Bill" ? rel.r.ref : rel.r.scope}`}
          footer={<><Btn onClick={() => setRel(null)}>Cancel</Btn><Btn variant="success" disabled={rel.note.trim().length < 5} onClick={() => release(rel.r, rel.note.trim())}>Release hold</Btn></>}>
          <Field label="Reason for release" required hint="At least 5 characters — recorded in the audit log"><TextInput value={rel.note} onChange={(x) => setRel({ ...rel, note: x })} placeholder="e.g. Reconciliation done, credit note received" /></Field>
        </Modal>
      )}
    </Page>
  );
}
function PlaceHoldModal({ f, setF }) {
  const st = useStore();
  const vendors = st.vendors.filter((v) => ["Active", "On Hold"].includes(v.status));
  const bills = st.invoices.filter((i) => !i.hold && invoiceTotals(i).balance > 0.5);
  const err = f.level === "Vendor" ? (!f.vendorId ? "Pick the vendor" : holdErr(f)) : (!f.invoiceId ? "Pick the bill" : !f.until ? "Enter the release date" : holdErr(f));
  const save = () => {
    if (err) return toast(err, "red");
    if (f.level === "Vendor") setState((s) => { const x = byId(s.vendors, f.vendorId); x.status = "On Hold"; x.hold = { scope: f.scope, until: f.until || null, reason: f.reason.trim(), placedAt: todayISO() }; }, { entity: "Vendor", id: f.vendorId, action: `Placed on hold (${f.scope}) — ${f.reason.trim()}` });
    else setState((s) => { byId(s.invoices, f.invoiceId).hold = { until: f.until, reason: f.reason.trim(), at: new Date().toISOString() }; }, { entity: "Invoice", id: f.invoiceId, action: `Put on hold — ${f.reason.trim()} until ${fmtDate(f.until)}` });
    toast("Hold placed"); setF(null);
  };
  return (
    <Modal open onClose={() => setF(null)} width={560} title="Place hold" subtitle={HOLD_SCOPE_HELP}
      footer={<>{err && <span className="mr-auto text-[12px] text-red-600">{err}</span>}<Btn onClick={() => setF(null)}>Cancel</Btn><Btn variant="primary" icon={Icon.lock} disabled={!!err} onClick={save}>Place hold</Btn></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Level"><Select value={f.level} onChange={(x) => setF({ ...f, level: x })} options={["Vendor", "Bill"]} /></Field>
        {f.level === "Vendor"
          ? <Field label="Vendor" required><Select value={f.vendorId} placeholder="Select…" onChange={(x) => setF({ ...f, vendorId: x })} options={vendors.map((v) => ({ value: v.id, label: v.name }))} /></Field>
          : <Field label="Bill" required><Select value={f.invoiceId} placeholder="Select…" onChange={(x) => setF({ ...f, invoiceId: x })} options={bills.map((i) => ({ value: i.id, label: `${i.id} · ${vendorName(st, i.vendorId)} · ${i.number}` }))} /></Field>}
        {f.level === "Vendor" ? <Field label="Scope"><Select value={f.scope} onChange={(x) => setF({ ...f, scope: x })} options={["Invoices", "Payments", "All"]} /></Field> : <Field label="Scope"><TextInput value="Payments" disabled /></Field>}
        <Field label="Release date" hint={f.level === "Vendor" ? "Blank = indefinite" : "Required for bill holds"}><DateInput value={f.until} onChange={(x) => setF({ ...f, until: x })} /></Field>
        <Field label="Reason" required span={2}><TextInput value={f.reason} onChange={(x) => setF({ ...f, reason: x })} placeholder="e.g. Pending reconciliation" /></Field>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- change & variations
function changeOrderRows(st) {
  return st.contracts.flatMap((c) => (c.changeOrders || []).map((o) => ({ key: `${c.id}-${o.id}`, c, o, vendorId: c.vendorId,
    type: o.days && !Number(o.amount) ? "Extension of time" : (o.lines || []).length ? "Quantity variation" : Number(o.amount) < 0 ? "Omission" : "Variation" })))
    .sort((a, b) => (b.o.raisedOn || "").localeCompare(a.o.raisedOn || ""));
}
function ChangeVariationsPage() {
  const st = useStore(), nav = useNavigate();
  const rows = changeOrderRows(st);
  const tot = (s) => sum(rows.filter((r) => r.o.status === s), (r) => Number(r.o.amount) || 0);
  return (
    <Page title="Change & Variations" subtitle="Change orders across all contracts — raise one from the contract; approved changes update the contract value and completion date" icon={Icon.layers}
      actions={<Btn variant="primary" icon={Icon.plus} onClick={() => nav(`${CL_BASE}/contracts`)}>Raise from a contract</Btn>}>
      <div className="grid grid-cols-4 gap-3 px-4 pt-4">
        <StatTile tone="blue" label="Change orders" value={rows.length} sub={`${new Set(rows.map((r) => r.c.id)).size} contracts`} icon={Icon.layers} />
        <StatTile tone="amber" label="Pending" value={inrShort(tot("Pending"))} sub={`${rows.filter((r) => r.o.status === "Pending").length} waiting for approval`} icon={Icon.clock} />
        <StatTile tone="green" label="Approved" value={inrShort(tot("Approved"))} sub={`${sum(rows.filter((r) => r.o.status === "Approved"), (r) => r.o.days || 0)} days of extension`} icon={Icon.check} />
        <StatTile tone="red" label="Rejected" value={rows.filter((r) => r.o.status === "Rejected").length} icon={Icon.x} />
      </div>
      <DataTable noun="change orders" rows={rows} rowKey={(r) => r.key} onRow={(r) => nav(`${CL_BASE}/contracts?open=${r.c.id}`)} empty={<EmptyState icon={Icon.layers} title="No change orders" text="Raise one from a contract (Contracts → open → Raise change order)." />} columns={[
        { key: "co", label: "CO", render: (r) => <span className="mono text-[12px]">{r.o.id}</span> },
        { key: "ctr", label: "Contract", filter: (r) => r.c.id, render: (r) => <span className="flex flex-col"><span className="mono text-[12px]">{r.c.id}</span><span className="text-[11.5px] text-ink-mute">{vendorName(st, r.vendorId)}</span></span> },
        { key: "type", label: "Type", filterOptions: ["Variation", "Quantity variation", "Omission", "Extension of time"], filter: (r) => r.type },
        { key: "desc", label: "Description", className: "max-w-[340px] whitespace-normal", render: (r) => <span className="flex flex-col"><span>{r.o.desc}</span>{r.o.reason && <span className="text-[11.5px] text-ink-mute">{r.o.reason}</span>}</span> },
        { key: "amt", label: "Cost impact", align: "right", num: true, sort: (r) => Number(r.o.amount) || 0, render: (r) => inr(r.o.amount) },
        { key: "days", label: "Days", align: "right", num: true, sort: (r) => r.o.days || 0, render: (r) => r.o.days || 0 },
        { key: "raised", label: "Raised", sort: (r) => r.o.raisedOn || "", render: (r) => `${fmtDate(r.o.raisedOn)}${r.o.raisedBy ? ` · ${r.o.raisedBy}` : ""}` },
        { key: "dec", label: "Decided", render: (r) => (r.o.decidedBy ? `${r.o.decidedBy} · ${fmtDate(r.o.decidedAt || r.o.approvedOn)}` : "—") },
        { key: "s", label: "Status", filterOptions: ["Pending", "Approved", "Rejected"], filter: (r) => r.o.status, render: (r) => <Status>{r.o.status}</Status> },
      ]} />
    </Page>
  );
}

// ---------------------------------------------------------------- audit log
function auditLink(a) {
  const id = String(a.id || "").split(",")[0].trim();
  const map = { Vendor: `${VM_BASE}/registry?open=`, PO: `${VM_BASE}/purchase-orders?open=`, Invoice: `${VM_BASE}/invoices?open=`, Payment: `${VM_BASE}/invoices?open=`, RFQ: `${VM_BASE}/rfq?open=`,
    Requisition: `${VM_BASE}/requisitions?open=`, "Blanket Order": `${VM_BASE}/blanket-orders?open=`, Contract: `${CL_BASE}/contracts?open=`, "Work Order": `${CL_BASE}/work-orders?open=`, "RA Bill": `${CL_BASE}/ra-bills?open=` };
  return map[a.entity] && /^[A-Z]+-\d+/.test(id) ? map[a.entity] + id : null;
}
function AuditLogPage() {
  const st = useStore(), nav = useNavigate();
  const [from, setFrom] = y.useState(""), [to, setTo] = y.useState("");
  const rows = st.audit.filter((a) => (!from || a.at.slice(0, 10) >= from) && (!to || a.at.slice(0, 10) <= to)).map((a, i) => ({ ...a, key: `${a.at}-${i}` })).sort((a, b) => b.at.localeCompare(a.at));
  return (
    <Page title="Audit Log" subtitle="Who did what, when — every recorded action across vendors, purchasing, contracts and payments (latest 400)" icon={Icon.fileClock}>
      <DataTable noun="entries" rows={rows} rowKey={(r) => r.key} onRow={(r) => { const l = auditLink(r); if (l) nav(l); }} exportName="audit-log"
        filters={<span className="flex items-center gap-2 text-[12.5px]">From <span className="w-[150px]"><DateInput value={from} onChange={setFrom} /></span> to <span className="w-[150px]"><DateInput value={to} onChange={setTo} /></span></span>}
        columns={[
          { key: "at", label: "When", sort: (r) => r.at, render: (r) => fmtDateTime(r.at) },
          { key: "by", label: "Who", filterOptions: () => uniqSorted(getState().audit.map((a) => a.by)), filter: (r) => r.by },
          { key: "entity", label: "Entity", filterOptions: () => uniqSorted(getState().audit.map((a) => a.entity)), filter: (r) => r.entity },
          { key: "id", label: "Record", render: (r) => <span className={cls("mono text-[12px]", auditLink(r) && "text-brand")}>{r.id}</span> },
          { key: "action", label: "Action", className: "max-w-[520px] whitespace-normal text-[12.5px]" },
        ]} />
    </Page>
  );
}
