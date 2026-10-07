// One register of every document in the system - vendor compliance documents, worker certificates,
// contract letters, claim evidence, dispatch challans, supplier bills, RA claim and quotation attachments -
// with the record it belongs to, type, version, who added it, validity and status.

const fileName = (x) => (!x ? "" : typeof x === "string" ? x : x.name || "");
const validity = (expiry) => (!expiry ? "No expiry" : expiry < todayISO() ? "Expired" : daysUntil(expiry) <= 30 ? "Expiring" : "Valid");
function documentRegister(st) {
  const out = [];
  const add = (r) => out.push({ version: 1, by: "", at: "", expiry: "", status: "", ...r, key: `${r.entity}|${r.ref}|${r.type}|${r.name}|${out.length}` });
  for (const v of st.vendors) for (const d of v.docs || []) {
    if (!d.file && d.status === "Missing") continue;
    const ds = docState(d);
    add({ entity: "Vendor", ref: v.id, owner: v.name, type: d.name, name: fileName(d.file), dataUrl: d.dataUrl || d.file?.dataUrl, version: (d.versions || []).length + 1, by: d.uploadedBy || d.verifiedBy || "", at: d.uploadedAt || d.verifiedAt || "", expiry: d.expiry || "", status: waiverOf(v, d.name) ? "Waived" : ds, link: `${VM_BASE}/registry?open=${v.id}&tab=docs` });
  }
  for (const w of st.workers || []) for (const c of w.certificates || []) add({ entity: "Worker", ref: w.id, owner: `${w.name} · ${vendorName(st, w.vendorId)}`, type: c.name, name: c.no || "", expiry: c.validTill || "", status: validity(c.validTill), link: `${CL_BASE}/workers?open=${w.id}` });
  for (const c of st.contracts) for (const l of c.letters || []) add({ entity: "Contract", ref: c.id, owner: c.title, type: `Letter (${l.dir})`, name: fileName(l.file) || l.ref, dataUrl: l.file?.dataUrl, by: l.by, at: l.date, status: l.replyBy && !l.repliedOn ? (l.replyBy < todayISO() ? "Reply overdue" : "Reply due") : "Filed", link: `${CL_BASE}/contracts?open=${c.id}` });
  for (const k of st.contractClaims || []) for (const e of k.evidence || []) add({ entity: "Claim", ref: k.id, owner: k.title, type: "Claim evidence", name: fileName(e), dataUrl: e.dataUrl, by: e.by || k.recordedBy, at: e.at || k.submittedOn, status: "Filed", link: `${CL_BASE}/claims?open=${k.id}` });
  for (const p of st.purchaseOrders) for (const d of p.dispatches || []) if (d.file) add({ entity: "PO", ref: p.id, owner: vendorName(st, p.vendorId), type: "Delivery challan", name: fileName(d.file), dataUrl: d.file.dataUrl, by: d.by, at: d.date, status: "Filed", link: `${VM_BASE}/purchase-orders?open=${p.id}` });
  for (const i of st.invoices) { const f = i.file || i.attachment; if (f) add({ entity: "Bill", ref: i.id, owner: vendorName(st, i.vendorId), type: "Supplier bill", name: fileName(f), dataUrl: f.dataUrl, by: i.enteredBy || "Supplier", at: i.date, status: "Filed", link: `${VM_BASE}/invoices?open=${i.id}` }); }
  for (const c of st.claims || []) if (c.attachment) add({ entity: "RA claim", ref: c.id, owner: vendorName(st, c.vendorId), type: "Contractor claim", name: fileName(c.attachment), dataUrl: c.attachment.dataUrl, by: "Contractor", at: c.date, status: "Filed", link: `${CL_BASE}/ra-bills` });
  for (const r of st.rfqs) for (const q of r.quotes || []) if (q.attachment) add({ entity: "RFQ", ref: r.id, owner: vendorName(st, q.vendorId), type: "Quotation", name: fileName(q.attachment), dataUrl: q.attachment.dataUrl, by: vendorName(st, q.vendorId), at: q.submittedOn, status: "Filed", link: `${VM_BASE}/rfq?open=${r.id}` });
  return out;
}
const DOC_TONE = { Valid: "green", Verified: "green", Filed: "gray", "No expiry": "gray", Expiring: "amber", "Reply due": "amber", Pending: "blue", Waived: "purple", Expired: "red", Rejected: "red", Missing: "red", "Reply overdue": "red" };
function DocumentRegister() {
  const st = useStore(), rows = documentRegister(st);
  return (
    <DataTable noun="documents" exportName="document-register" rows={rows} rowKey={(r) => r.key} columns={[
      { key: "t", label: "Document", render: (r) => <span className="flex flex-col"><span className="font-medium">{r.type}</span>{r.name && (r.dataUrl ? <FileLink name={r.name} dataUrl={r.dataUrl} /> : <span className="text-[11.5px] text-ink-mute">{r.name}</span>)}</span> },
      { key: "e", label: "Belongs to", filterOptions: ["Vendor", "Worker", "Contract", "Claim", "PO", "Bill", "RA claim", "RFQ"], filter: (r) => r.entity, render: (r) => <span className="flex flex-col"><RefLink to={r.link}>{r.entity} {r.ref}</RefLink><span className="max-w-[220px] truncate text-[11.5px] text-ink-mute" title={r.owner}>{r.owner}</span></span> },
      { key: "x", label: "Valid till", render: (r) => (r.expiry ? <ExpiryCell iso={r.expiry} /> : "-") },
      { key: "s", label: "Status", filterOptions: Object.keys(DOC_TONE), filter: (r) => r.status, render: (r) => <Status tone={DOC_TONE[r.status]}>{r.status}</Status> },
      { key: "v", label: "Version", opt: true, align: "right", render: (r) => `v${r.version}` },
      { key: "b", label: "Added by", render: (r) => [r.by, r.at && fmtDate(String(r.at).slice(0, 10))].filter(Boolean).join(" · ") || "-" },
    ]} />
  );
}
