// Audit Log (ERPNext version history, Odoo chatter, Zoho audit trail): every recorded action,
// newest first; clicking an entry opens its record.

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
