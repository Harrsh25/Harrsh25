// ---------------------------------------------------------------- optional list columns (Customize Columns)
// Hidden until switched on with the "+" at the end of each list's header - the same idea as ERPNext list
// settings, Odoo optional columns, Zoho custom views, Oracle / SAP table personalisation.
const xDash = (v) => (v === undefined || v === null || v === "" ? <span className="text-ink-faint">-</span> : v);
const xDate = (v) => xDash(v ? fmtDate(v) : "");
const xMoney = (v) => xDash(v || v === 0 ? inrShort(v) : "");
const xCount = (n) => xDash(n ? String(n) : "");
const lastHist = (b, status) => [...(b.history || [])].reverse().find((h0) => h0.status === status);

const LIST_EXTRA = {
  requisitions: (st) => [
    { key: "xReqBy", label: "Requested by", desc: "Who raised the requisition", render: (r) => xDash(r.requestedBy) },
    { key: "xReqDate", label: "Request date", desc: "Date of the requisition", render: (r) => xDate(r.date) },
    { key: "xCC", label: "Cost centre", desc: "Charged to", render: (r) => xDash(r.costCentre) },
    { key: "xItems", label: "Items", desc: "Number of lines", align: "right", render: (r) => xCount((r.items || []).length) },
    { key: "xEst", label: "Estimated value", desc: "Σ qty × rate on the lines", align: "right", render: (r) => xMoney(sum(r.items || [], (i) => (Number(i.qty) || 0) * (Number(i.rate) || 0)) || "") },
    { key: "xDecBy", label: "Approved / rejected by", desc: "Who decided", render: (r) => xDash(r.decidedBy) },
    { key: "xDecOn", label: "Decided on", desc: "Approval date", render: (r) => xDate(r.decidedAt) },
    { key: "xStores", label: "From → to store", desc: "For material transfers", render: (r) => xDash(r.sourceStore || r.targetStore ? `${r.sourceStore || "-"} → ${r.targetStore || "-"}` : "") },
  ],
  rfqs: (st) => [
    { key: "xCreated", label: "Created on", desc: "RFQ date", render: (r) => xDate(r.createdOn) },
    { key: "xInvited", label: "Vendors invited", desc: "Number of vendors sent the RFQ", align: "right", render: (r) => xCount((r.vendorIds || []).length) },
    { key: "xQuotes", label: "Quotes received", desc: "Quotations in", align: "right", render: (r) => xCount((r.quotes || []).length) },
    { key: "xLines", label: "Lines", desc: "Items asked", align: "right", render: (r) => xCount((r.items || []).length) },
    { key: "xInco", label: "Incoterm", desc: "Delivery terms", render: (r) => xDash(r.incoterm) },
    { key: "xSrc", label: "Source", desc: "BOQ / material request it came from", render: (r) => xDash(r.sourceRef) },
    { key: "xAward", label: "Awarded to", desc: "Winning vendor(s)", render: (r) => xDash([...new Set((r.awards || []).map((a) => vendorName(st, a.vendorId)))].join(", ") || (r.awardedTo ? vendorName(st, r.awardedTo) : "")) },
  ],
  blanket: (st) => [
    { key: "xProj", label: "Project", desc: "Site", render: (b) => xDash(b.project) },
    { key: "xStart", label: "Start", desc: "Agreement start", render: (b) => xDate(b.start) },
    { key: "xLines", label: "Lines", desc: "Agreed items", align: "right", render: (b) => xCount((b.lines || []).length) },
    { key: "xCur", label: "Currency", desc: "Agreement currency", render: (b) => xDash(b.currency || "INR") },
    { key: "xTerms", label: "Terms", desc: "Agreement terms", render: (b) => <span className="block max-w-[220px] truncate">{xDash(b.terms)}</span> },
  ],
  po: (st) => [
    { key: "xDate", label: "PO date", desc: "Order date", render: (p) => xDate(p.date) },
    { key: "xBy", label: "Created by", desc: "Who raised the PO", render: (p) => xDash((p.revisions || [])[0]?.by) },
    { key: "xBuyer", label: "Buyer", desc: "Responsible buyer", render: (p) => xDash(p.details?.buyer) },
    { key: "xTerms", label: "Payment terms", desc: "From the PO or the vendor", render: (p) => xDash(p.details?.paymentTerms || byId(st.vendors, p.vendorId)?.paymentTerms) },
    { key: "xGst", label: "GST", desc: "Tax on the lines", align: "right", render: (p) => xMoney(round2(sum(p.lines, (l) => l.qty * l.rate * (Number(l.gstPct) || 0) / 100)) || "") },
    { key: "xLines", label: "Lines", desc: "Items ordered", align: "right", render: (p) => xCount(p.lines.length) },
    { key: "xLastRec", label: "Last received", desc: "Latest goods receipt", render: (p) => xDate((p.receipts || []).map((g) => g.date).sort().pop()) },
    { key: "xReturns", label: "Returns", desc: "Returns to vendor", align: "right", render: (p) => xCount((p.returns || []).length) },
    { key: "xBilled", label: "Billed value", desc: "Bills booked against the PO", align: "right", render: (p) => xMoney(sum(st.invoices.filter((i) => i.poId === p.id && !i.cancelled), (i) => invoiceTotals(i).taxable) || "") },
    { key: "xPolicy", label: "Bill control", desc: "Bill on ordered or received qty", render: (p) => xDash(p.billingPolicy) },
  ],
  bills: (st) => [
    { key: "xDate", label: "Bill date", desc: "Vendor invoice date", render: (i) => xDate(i.date) },
    { key: "xSrc", label: "Source", desc: "PO, RA bill or direct", render: (i) => xDash(i.source) },
    { key: "xTaxable", label: "Taxable", desc: "Before GST", align: "right", render: (i) => xMoney(invoiceTotals(i).taxable) },
    { key: "xGst", label: "GST", desc: "Tax amount", align: "right", render: (i) => xMoney(invoiceTotals(i).gst) },
    { key: "xTds", label: "TDS withheld", desc: "On payments made", align: "right", render: (i) => xMoney(sum(i.payments.filter((p) => !p.reversed), (p) => p.tds || 0) || "") },
    { key: "xPaid", label: "Paid", desc: "Settled so far", align: "right", render: (i) => xMoney(invoiceTotals(i).paid || "") },
    { key: "xPays", label: "Payments", desc: "Number of payments", align: "right", render: (i) => xCount(i.payments.filter((p) => !p.reversed).length) },
    { key: "xHold", label: "Hold reason", desc: "Why payment is held", render: (i) => xDash(i.hold?.reason) },
    { key: "xPos", label: "Place of supply", desc: "GST state", render: (i) => xDash(i.details?.placeOfSupply) },
  ],
  contracts: (st) => [
    { key: "xProj", label: "Project", desc: "Site", render: (c) => xDash(c.project) },
    { key: "xStart", label: "Start", desc: "Contract start", render: (c) => xDate(c.start) },
    { key: "xRev", label: "Revised value", desc: "Value + approved change orders", align: "right", render: (c) => xMoney(contractValue(c)) },
    { key: "xCO", label: "Change orders", desc: "Number raised", align: "right", render: (c) => xCount((c.changeOrders || []).length) },
    { key: "xRet", label: "Retention %", desc: "Held on each RA bill", align: "right", render: (c) => xDash(c.retentionPct ? `${c.retentionPct}%` : "") },
    { key: "xAdv", label: "Advance", desc: "Mobilisation advance", align: "right", render: (c) => xMoney(c.advanceAmount || "") },
    { key: "xDlp", label: "DLP", desc: "Defect liability period", render: (c) => xDash(c.dlpMonths ? `${c.dlpMonths} months` : "") },
    { key: "xLd", label: "LD", desc: "Liquidated damages per week / cap", render: (c) => xDash(c.ldPctPerWeek ? `${c.ldPctPerWeek}% / wk, cap ${c.ldCapPct}%` : "") },
    { key: "xBg", label: "BG valid till", desc: "Performance guarantee expiry", render: (c) => xDate(c.bgExpiry) },
    { key: "xOwner", label: "Owner", desc: "Contract owner", render: (c) => xDash(c.owner) },
    { key: "xSigned", label: "Signed on", desc: "Date signed", render: (c) => xDate(c.signedOn) },
    { key: "xPayDays", label: "Payment due", desc: "Days after certification", render: (c) => xDash(c.paymentDays ? `${c.paymentDays} days` : "") },
  ],
  wo: (st) => [
    { key: "xProj", label: "Project", desc: "Site", render: (w) => xDash(w.project) },
    { key: "xContract", label: "Contract", desc: "Parent contract", render: (w) => xDash(byId(st.contracts, w.contractId)?.title) },
    { key: "xLoc", label: "Location", desc: "Work front / block", render: (w) => xDash(w.location) },
    { key: "xWbs", label: "WBS", desc: "Cost breakdown element", render: (w) => xDash(w.wbs) },
    { key: "xIssued", label: "Issued on", desc: "Date issued", render: (w) => xDate(w.issuedOn) },
    { key: "xIssuedBy", label: "Issued by", desc: "Who issued it", render: (w) => xDash(w.issuedBy) },
    { key: "xStart", label: "Start", desc: "Planned start", render: (w) => xDate(w.start) },
    { key: "xAccOn", label: "Accepted on", desc: "Contractor acceptance", render: (w) => xDate(w.acceptance?.at) },
    { key: "xBilled", label: "Billed %", desc: "Financial progress", align: "right", render: (w) => { const p = woProgress(st, w); return xDash(p && p.financial !== undefined ? `${Math.round(p.financial)}%` : ""); } },
  ],
  mb: (st) => [
    { key: "xBy", label: "Recorded by", desc: "Site engineer who entered it", render: (m) => xDash(m.recordedBy) },
    { key: "xContractor", label: "Contractor", desc: "Contractor on the work order", render: (m) => xDash(vendorName(st, byId(st.workOrders, m.woId)?.vendorId)) },
    { key: "xSignedBy", label: "JMS signed by", desc: "Contractor representative", render: (m) => xDash(m.jms?.rep || m.jms?.by) },
    { key: "xSignedOn", label: "JMS signed on", desc: "Joint measurement date", render: (m) => xDate(m.jms?.at) },
    { key: "xRemarks", label: "Remarks", desc: "Notes on the entry", render: (m) => <span className="block max-w-[220px] truncate">{xDash(m.remarks)}</span> },
  ],
  ra: (st) => [
    { key: "xPeriod", label: "Period", desc: "Work period billed", render: (b) => xDash(b.periodFrom ? `${fmtDate(b.periodFrom)} – ${fmtDate(b.periodTo)}` : "") },
    { key: "xContract", label: "Contract", desc: "Parent contract", render: (b) => xDash(byId(st.contracts, b.contractId)?.title) },
    { key: "xContractor", label: "Contractor", desc: "Who is paid", render: (b) => xDash(vendorName(st, b.vendorId)) },
    { key: "xRet", label: "Retention", desc: "Held this bill", align: "right", render: (b) => xMoney(b.ded?.retention || "") },
    { key: "xAdv", label: "Advance recovered", desc: "Recovered this bill", align: "right", render: (b) => xMoney(b.ded?.advance || "") },
    { key: "xTds", label: "TDS", desc: "Deducted this bill", align: "right", render: (b) => xMoney(b.ded?.tds || "") },
    { key: "xGst", label: "GST", desc: "Tax on the bill", align: "right", render: (b) => xMoney(b.gst || "") },
    { key: "xCert", label: "Certified on", desc: "Approval date", render: (b) => xDate(lastHist(b, "Approved")?.at) },
    { key: "xCertBy", label: "Certified by", desc: "Who approved", render: (b) => xDash(lastHist(b, "Approved")?.by) },
  ],
};
