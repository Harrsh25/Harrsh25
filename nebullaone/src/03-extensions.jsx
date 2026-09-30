// Extensions after the Odoo / ERPNext screen-by-screen review:
// vendor login, invites, request-changes, procurement settings (Stop / Warn),
// richer quotations with split award, blanket orders, returns, instalments,
// scorecard standings, WO acceptance, contractor claims and labour attendance.

// ---------------------------------------------------------------- settings
const DEFAULT_SETTINGS = {
  poRequiredForBill: true,        // ERPNext: "Is Purchase Order required for Purchase Invoice"
  receiptRequiredForBill: true,   // ERPNext: "Is Purchase Receipt required for Purchase Invoice"
  threeWayQty: "Stop",            // Stop | Warn | Off
  rateCheck: "Stop",              // ERPNext "Maintain same rate" → Stop | Warn | Off
  rateTolerancePct: 0,
  complianceGate: "Stop",         // Procore Pay: insurance compliance on payments
  billRejectedQty: false,         // ERPNext: "Bill for rejected quantity in Purchase Invoice"
  overOrderPct: 5,                // ERPNext: "Over Order Allowance (%)"
  blanketAllowancePct: 5,         // ERPNext: "Blanket Order Allowance (%)"
  overrideRole: "Finance Controller",
  myRole: "Finance Controller",   // demo: role of the signed-in buyer
  quoteLogin: true,               // vendors must sign in (one-time code) to quote
  requireDocsOnSubmit: true,      // registration can't be submitted with required documents missing
  rfqComplianceGate: "Warn",      // blocking compliance failures / overdue requalification at RFQ invite
  poComplianceGate: "Stop",       // …and at PO / contract creation
  mobilisationBeforeWo: true,     // contractor's mobilisation checklist complete before the first work order is issued
  qcBeforeBilling: true,          // measurements need a passed quality inspection before an RA bill
  // Vendor groups ("Parent › Child") for filtering and spend roll-up
  vendorGroups: [
    "Material Suppliers › Steel", "Material Suppliers › Cement", "Material Suppliers › Electrical", "Material Suppliers › General",
    "Civil Contractors › Structural", "Civil Contractors › Finishing", "EPC Contractors › Transmission", "EPC Contractors › Solar",
    "Labour Contractors", "Specialist Subcontractors", "Equipment & Services",
  ],
  // Our own group companies — vendors linked to one are inter-company suppliers
  groupCompanies: ["NebullaOne Equipment Pvt Ltd", "NebullaOne Precast Ltd", "NebullaOne Realty Ltd"],
  // Compliance requirements (Procore-style insurance requirements + Ariba/Oracle-style document rules).
  // applies: all | goods | services (non-contractor) | contractor | strategic-contractor
  complianceDocs: [
    { name: "PAN Card", applies: "all", expires: false, blocks: true },
    { name: "GST Certificate", applies: "all", expires: false, blocks: true },
    { name: "Cancelled Cheque / Bank Letter", applies: "all", expires: false, blocks: true },
    { name: "Company Registration / MSME", applies: "all", expires: false, blocks: false },
    { name: "ISO / Quality Certificate", applies: "goods", expires: true, blocks: false },
    { name: "Professional Indemnity / CAR Policy", applies: "services", expires: true, blocks: false },
    { name: "Labour Licence (CLRA)", applies: "contractor", expires: true, blocks: true },
    { name: "PF Registration", applies: "contractor", expires: false, blocks: true },
    { name: "ESI Registration", applies: "contractor", expires: false, blocks: true },
    { name: "Workmen Compensation Policy", applies: "contractor", expires: true, blocks: true },
    { name: "HSE / Safety Plan", applies: "contractor", expires: false, blocks: false },
  ],
  complianceIns: [
    { type: "Workmen Compensation", applies: "contractor", min: 5000000, blocks: true },
    { type: "Contractor's All Risk", applies: "strategic-contractor", min: 25000000, blocks: true },
  ],
  expiryWarnDays: 30,          // "Expiring" window
  reminderDays: [30, 15, 7],   // renewal reminders before expiry (and weekly once expired / missing)
};
const APPLIES = [
  { value: "all", label: "All vendors" }, { value: "goods", label: "Goods suppliers" }, { value: "services", label: "Service vendors (not on site)" },
  { value: "contractor", label: "Contractors & labour" }, { value: "strategic-contractor", label: "Strategic contractors" },
];
const appliesTo = (rule, v) => {
  const con = v.type === "Labor" || !!v.isContractor;
  return { all: true, goods: v.type === "Goods", services: v.type === "Services" && !con, contractor: con, "strategic-contractor": con && v.tier === "Strategic" }[rule.applies] ?? false;
};
const ROLES = ["Procurement Executive", "Procurement Head", "Legal Counsel", "Project Manager", "Finance Controller", "Accounts"];
const settingsOf = (st) => ({ ...DEFAULT_SETTINGS, ...(st.settings || {}) });
// Readable descriptions used in list views instead of document codes
const itemsSummary = (lines) => (lines && lines.length ? `${lines[0].desc}${lines.length > 1 ? ` +${lines.length - 1} more` : ""}` : "—");
const modeLabel = (m) => (m === "Call for Tenders" ? "Multiple Vendors" : m);
function poSourceText(st, p) {
  if (p.rfqId) { const r = byId(st.rfqs, p.rfqId); return ["From RFQ", r ? r.title : ""]; }
  if (p.blanketId) { const b = byId(st.blanketOrders, p.blanketId); return ["Blanket call-off", b ? b.title : ""]; }
  return ["Direct", ""];
}
function billAgainst(st, i) {
  if (i.source === "RA Bill") { const b = byId(st.raBills, i.raBillId), w = b && byId(st.workOrders, b.woId); return [w ? w.title : "RA bill", b ? `RA bill no. ${b.seq} · work order` : "RA bill"]; }
  if (i.source === "Direct") return ["Direct bill", "No purchase order"];
  const p = byId(st.purchaseOrders, i.poId); return [p ? itemsSummary(p.lines) : "Purchase order", p ? `Purchase order · ${p.project}` : "Purchase order"];
}
// List cells stay single-line (Project Center style); the secondary detail is shown on hover
const TwoLine = ({ a }) => <span className="block max-w-[300px] truncate">{a}</span>;
const groupRoot = (g) => (g || "").split(" › ")[0];
const inGroup = (v, g) => !!v.group && (v.group === g || v.group.startsWith(g + " › "));
const isGroupCompany = (v) => !!(v && v.parentCompany);
// options that always include the vendor's current value, even if it was removed from settings
const withCurrent = (list, cur) => (cur && !list.includes(cur) ? [...list, cur] : list);
function GroupCoTag({ v }) {
  if (!isGroupCompany(v)) return null;
  return <span className="rounded border border-teal-200 bg-teal-50 px-1.5 py-[1px] text-[11px] font-medium text-teal-700">Group co.</span>;
}

const DEFAULT_STANDINGS = [
  { name: "Excellent", min: 80, max: 100, color: "green", warnRfq: false, warnPo: false, preventRfq: false, preventPo: false },
  { name: "Good", min: 65, max: 80, color: "blue", warnRfq: false, warnPo: false, preventRfq: false, preventPo: false },
  { name: "Average", min: 50, max: 65, color: "amber", warnRfq: true, warnPo: true, preventRfq: false, preventPo: false },
  { name: "Poor", min: 0, max: 50, color: "red", warnRfq: true, warnPo: true, preventRfq: true, preventPo: true },
];
function standingOf(st, vendorId) {
  const s = vendorScore(st, vendorId).score;
  if (s == null) return null;
  const list = st.scoreConfig.standings || DEFAULT_STANDINGS;
  return list.find((b) => s >= b.min && (s < b.max || (b.max >= 100 && s <= 100))) || list[list.length - 1];
}
// "rfq" | "po" → { block, warn, standing }
function scorecardGate(st, vendorId, what) {
  const b = standingOf(st, vendorId);
  if (!b) return { block: false, warn: false, standing: null };
  return { block: what === "rfq" ? b.preventRfq : b.preventPo, warn: what === "rfq" ? b.warnRfq : b.warnPo, standing: b };
}

// ---------------------------------------------------------------- vendor session (portal login)
const VSESSION_KEY = "nxv-vendor-session";
function getVendorSession() {
  try { return JSON.parse(localStorage.getItem(VSESSION_KEY) || "null"); } catch { return null; }
}
function setVendorSession(s) {
  try { s ? localStorage.setItem(VSESSION_KEY, JSON.stringify(s)) : localStorage.removeItem(VSESSION_KEY); } catch {}
  listeners.forEach((l) => l());
}
const PORTAL_STATUSES = ["Active", "On Hold", "Pending Approval", "Changes Requested", "Draft"];
function findPortalUser(st, email) {
  const e = String(email || "").trim().toLowerCase();
  for (const v of st.vendors) {
    const u = (v.portalUsers || []).find((p) => p.active && p.email.toLowerCase() === e);
    if (u && PORTAL_STATUSES.includes(v.status)) return { vendor: v, user: u };
  }
  return null;
}
// One-time codes are kept locally; with a mail server they'd be emailed
const OTP_KEY = "nxv-otp";
function issueOtp(email) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  try { localStorage.setItem(OTP_KEY, JSON.stringify({ email: email.toLowerCase(), code, exp: Date.now() + 10 * 60000 })); } catch {}
  return code;
}
function checkOtp(email, code) {
  try {
    const o = JSON.parse(localStorage.getItem(OTP_KEY) || "null");
    return o && o.email === email.toLowerCase() && o.code === String(code).trim() && o.exp > Date.now();
  } catch { return false; }
}

// ---------------------------------------------------------------- quotations (partial bids, discounts, GST)
const lineRate = (q, i) => {
  const r = q.rates[i];
  if (r == null || r === "" || (q.noBid && q.noBid[i])) return null;
  return Number(r) * (1 - (Number(q.discounts?.[i]) || 0) / 100) * (Number(q.fx) || 1);
};
const quotedLines = (rfq, q) => rfq.items.map((_, i) => i).filter((i) => lineRate(q, i) != null);
const quoteStatus = (rfq, q) => {
  const won = (rfq.awards || []).filter((a) => a.vendorId === q.vendorId).length;
  if (won) return won === quotedLines(rfq, q).length ? "Ordered" : "Partially Ordered";
  if (daysUntil(q.validUntil) < 0) return "Expired";
  return q.review || "Accepted";
};

// ---------------------------------------------------------------- PO billing status & blanket orders
function poBillingStatus(st, po) {
  if (po.status === "Draft" || po.status === "Cancelled") return "—";
  const rec = poReceived(po);
  const billed = (i) => sum(st.invoices.filter((x) => x.poId === po.id).flatMap((x) => x.lines.filter((l) => l.line === i)), (l) => l.qty);
  const billable = (l) => (po.billingPolicy === "On ordered quantity" ? l.qty : l.accepted + (settingsOf(st).billRejectedQty ? l.rejected : 0));
  const toBill = sum(rec, (l, i) => Math.max(0, billable(l) - billed(i)));
  const anyBilled = rec.some((_, i) => billed(i) > 0);
  if (toBill <= 0.0001 && anyBilled) return "Fully Billed";
  if (toBill <= 0.0001) return "Nothing to Bill";
  return anyBilled ? "Partially Billed" : "Waiting Bills";
}
function blanketUsage(st, bo) {
  const pos = st.purchaseOrders.filter((p) => p.blanketId === bo.id && p.status !== "Cancelled");
  return bo.lines.map((l, i) => {
    const ordered = sum(pos.flatMap((p) => p.lines.filter((x) => x.blanketLine === i)), (x) => x.qty);
    return { ...l, ordered, remaining: l.qty - ordered };
  });
}
const blanketStatus = (st, bo) => {
  if (bo.status === "Draft" || bo.status === "Closed") return bo.status;
  if (bo.deadline && daysUntil(bo.deadline) < 0) return "Expired";
  return blanketUsage(st, bo).every((l) => l.remaining <= 0) ? "Fully Consumed" : "Active";
};

// ---------------------------------------------------------------- work orders & claims
const woAccepted = (wo) => wo.acceptance && wo.acceptance.status === "Accepted";

// ---------------------------------------------------------------- seed extension
function extendSeed(s) {
  const D = (n) => shiftDays(n);
  const ts = (n) => new Date(Date.now() + n * DAY).toISOString();
  s.settings = { ...DEFAULT_SETTINGS };
  s.scoreConfig.standings = DEFAULT_STANDINGS.map((b) => ({ ...b }));
  for (const v of s.vendors) {
    v.supplierType = v.tds === "194C-1" ? "Individual" : /LLP|Company|& Co|Mart$/.test(v.legalName || "") && !/Pvt|Ltd/.test(v.legalName) ? "Partnership" : "Company";
    v.allowBillWithoutPO = false;
    v.allowBillWithoutReceipt = v.type === "Services";
    v.portalUsers = v.contact && v.contact.email ? [{ name: v.contact.name, email: v.contact.email, active: v.status !== "Blacklisted", role: "Admin", lastLogin: null }] : [];
    v.changeRequest = null;
  }
  s.invites = [
    { id: "INVT-001", name: "Bharat Formwork Systems", email: "info@bharatformwork.in", category: "Formwork", sentOn: D(-4), status: "Invited", vendorId: null, by: "Procurement" },
    { id: "INVT-002", name: "Greenline Solar EPC", email: "kavya@greenlinesolar.in", category: "Solar EPC", sentOn: D(-12), status: "Registered", vendorId: "VEN-007", by: "Procurement" },
  ];
  // RFQs: responses, terms, per-line dates, emails
  for (const r of s.rfqs) {
    r.tnc = r.tnc || "Prices firm for the validity period. Delivery to site, unloading by vendor. Payment as per vendor's terms after GRN and bill.";
    r.incoterm = r.incoterm || "DAP (delivered at site)";
    r.sourceRef = r.sourceRef || (r.id === "RFQ-001" ? "BOQ-2026-002 · Structural steel" : "");
    r.items = r.items.map((it) => ({ requiredBy: shiftDays(10, r.createdOn), ...it }));
    r.responses = {};
    for (const vid of r.vendorIds) r.responses[vid] = r.status === "Draft" ? { status: "Not sent" } : r.quotes.some((q) => q.vendorId === vid) ? { status: "Accepted", at: ts(-5) } : { status: "Invited", at: ts(-10) };
    r.emails = r.status === "Draft" ? [] : r.vendorIds.map((vid) => ({ to: vid, subject: `Request for Quotation ${r.id} — ${r.title}`, at: r.createdOn }));
    r.awards = r.awardedTo ? r.items.map((_, i) => ({ line: i, vendorId: r.awardedTo, poId: r.poId })) : [];
    r.quotes = r.quotes.map((q) => ({ quoteNo: `${q.vendorId.slice(-3)}/Q/${r.id.slice(-3)}`, noBid: r.items.map(() => false), leadDays: r.items.map(() => q.deliveryDays), discounts: r.items.map(() => 0), lineFiles: r.items.map(() => null), gstPct: 18, review: "Accepted", ...q }));
  }
  // Blanket order + call-off
  s.blanketOrders = [
    { id: "BO-001", vendorId: "VEN-004", project: "", title: "OPC 53 cement — annual rate agreement FY 26-27", start: D(-60), deadline: D(300), status: "Active", currency: "INR",
      lines: [{ desc: "OPC 53 grade cement (50 kg bag)", unit: "bag", qty: 40000, rate: 378 }, { desc: "PPC cement (50 kg bag)", unit: "bag", qty: 15000, rate: 362 }], terms: "Price firm till deadline; delivery within 3 days of call-off." },
  ];
  const cement = s.purchaseOrders.find((p) => p.id === "PO-002");
  if (cement) { cement.blanketId = null; }
  for (const p of s.purchaseOrders) { p.returns = []; p.blanketId = p.blanketId || null; }
  const po1 = s.purchaseOrders.find((p) => p.id === "PO-001");
  if (po1) { po1.returns = [{ id: "RTV-002", grnId: "GRN-002", line: 1, qty: 1, reason: "Bent bars", location: "Return bay — Skyline", date: shiftDays(-41), debitNote: null }]; po1.receipts[1].rejectedLocation = "Return bay — Skyline"; }
  const po2 = s.purchaseOrders.find((p) => p.id === "PO-002");
  if (po2) { po2.returns = [{ id: "RTV-001", grnId: "GRN-003", line: 0, qty: 40, reason: "Lumps / moisture", location: "Return bay — Riverside", date: D(-29), debitNote: "DN-001" }]; po2.receipts[0].rejectedLocation = "Return bay — Riverside"; }
  // Invoices: instalments + hold release date; vendor advances
  for (const inv of s.invoices) { inv.schedule = null; if (inv.hold) inv.hold.until = D(7); }
  s.vendorAdvances = [{ id: "ADV-001", vendorId: "VEN-003", amount: 250000, date: D(-80), ref: "UTR0098123", note: "Advance against PO-001", allocated: [] }];
  // Work order acceptance
  for (const w of s.workOrders) {
    w.acceptance = w.status === "Issued" ? { status: "Pending" } : w.status === "Draft" ? null : { status: "Accepted", by: byId(s.vendors, w.vendorId).contact.name, at: shiftDays(1, w.issuedOn), note: "" };
  }
  // Contractor claims (progress claims submitted from the portal)
  s.claims = [
    { id: "CLM-001", woId: "WO-004", vendorId: "VEN-010", date: D(-3), periodFrom: D(-20), periodTo: D(-3), status: "Submitted", note: "Backfill around footings F1–F24 completed.",
      lines: [{ lineId: "C3", qty: 2880, location: "Footings F1–F24" }, { lineId: "C4", qty: 1500, location: "Surplus earth to Wagholi dump" }], history: [{ status: "Submitted", by: "Sachin Jadhav", at: ts(-3), remark: "" }] },
  ];
  // Labour: workers and daily attendance for Kaveri Manpower on WO-005
  const trades = [["Mason", "Skilled", 6], ["Helper / Unskilled", "Unskilled", 8], ["Carpenter / Shuttering", "Skilled", 2]];
  const first = ["Ramesh", "Suresh", "Ganesh", "Mahesh", "Dinesh", "Raju", "Sanjay", "Anil", "Vijay", "Ravi", "Kishor", "Sunil", "Ajay", "Deepak", "Manoj", "Prakash"];
  const last = ["Pawar", "Jadhav", "Shinde", "Kamble", "More", "Gaikwad", "Salunkhe", "Bhosale"];
  s.workers = [];
  let n = 0;
  for (const [trade, skill, count] of trades) for (let i = 0; i < count; i++) {
    s.workers.push({ id: `WK-${String(++n).padStart(3, "0")}`, vendorId: "VEN-005", name: `${first[n % first.length]} ${last[n % last.length]}`, trade, skill, gatePass: `GP-${4200 + n}`, inductionOn: D(-100 + n), active: true, woId: "WO-005" });
  }
  s.attendance = [];
  for (let d = -14; d <= -1; d++) {
    const date = D(d), dow = new Date(date).getDay();
    if (dow === 0) continue;
    for (const w of s.workers) {
      const absent = (w.id.charCodeAt(5) + d * 7) % 11 === 0;
      s.attendance.push({ date, woId: "WO-005", workerId: w.id, status: absent ? "A" : "P", hours: absent ? 0 : 8, ot: !absent && (w.id.charCodeAt(5) + d) % 5 === 0 ? 2 : 0, rolledInto: null, source: d >= -2 ? "Contractor" : "Site", verified: d < -2 });
    }
  }
  // the old lump "September to date" muster entry is replaced by worker-wise attendance
  s.measurements = s.measurements.filter((m) => m.id !== "MB-031");
  return s;
}

// Period-wise score (ERPNext scorecard periods): ratings and deliveries in the month
function periodScore(st, vendorId, monthStart) {
  const d0 = new Date(monthStart), d1 = new Date(d0.getFullYear(), d0.getMonth() + 1, 1);
  const label = d0.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const w = st.scoreConfig.weights, parts = {};
  const rt = st.ratings.filter((r) => r.vendorId === vendorId && r.period === label);
  if (rt.length) { parts.quality = (sum(rt, (r) => r.quality) / rt.length / 5) * 100; parts.safety = (sum(rt, (r) => r.safety) / rt.length / 5) * 100; }
  const grns = st.purchaseOrders.filter((p) => p.vendorId === vendorId).flatMap((p) => p.receipts.filter((r) => new Date(r.date) >= d0 && new Date(r.date) < d1).map((r) => ({ r, p })));
  if (grns.length) {
    parts.timeliness = (grns.filter(({ r, p }) => new Date(r.date) <= new Date(p.deliveryDate)).length / grns.length) * 100;
    if (!rt.length) { const q = sum(grns, ({ r }) => sum(r.lines, (l) => l.qty)); parts.quality = q ? (sum(grns, ({ r }) => sum(r.lines, (l) => l.accepted)) / q) * 100 : undefined; }
  }
  const keys = Object.keys(parts).filter((k) => parts[k] != null);
  if (!keys.length) return null;
  return round2(sum(keys, (k) => (w[k] || 0) * parts[k]) / sum(keys, (k) => w[k] || 0));
}
const lastMonths = (n) => Array.from({ length: n }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (n - 1 - i)); return d.toISOString().slice(0, 10); });

// Full option lists for the list filters: every possible value, not just the ones on screen
const uniqSorted = (a) => [...new Set(a.filter(Boolean))].sort((x, y) => x.localeCompare(y));
const FO = {
  vendors: () => uniqSorted(getState().vendors.map((v) => v.name)),
  contractors: () => uniqSorted(getState().vendors.filter((v) => v.isContractor || v.type === "Labor").map((v) => v.name)),
  projects: () => PROJECTS,
  trades: () => TRADES,
  labourTrades: () => uniqSorted([...getState().laborRates.map((r) => r.trade), ...getState().workers.map((w) => w.trade)]),
  skills: () => SKILLS,
  regions: () => REGIONS,
  owners: () => uniqSorted(getState().caps.map((c) => c.owner)),
  raters: () => uniqSorted(getState().ratings.map((r) => r.by)),
  periods: () => uniqSorted(getState().ratings.map((r) => r.period)).reverse(),
  ruleSets: () => uniqSorted(getState().vendors.map((v) => v.qualification?.ruleSet)),
  standings: () => (getState().scoreConfig.standings || DEFAULT_STANDINGS).map((b) => b.name),
  coverage: () => INS_TYPES,
  vendorStatus: ["Active", "Pending Approval", "Changes Requested", "Draft", "On Hold", "Blacklisted", "Inactive", "Rejected"],
  compliance: ["Compliant", "Expiring", "Non-Compliant"],
  regTier: ["Prospective", "Spend Authorized"],
  vendorType: ["Goods", "Services", "Services · Contractor", "Labor · Contractor"],
  stage: ["Procurement", "Legal", "Finance", "—"],
  qualResult: ["Qualified", "Not qualified"],
  preferred: ["Preferred", "Not preferred"],
  poStatus: ["Draft", "Issued", "Partially Received", "Received", "Closed", "Cancelled"],
  poBilling: ["Nothing to Bill", "Waiting Bills", "Partially Billed", "Fully Billed", "On ordered quantity", "Draft", "Cancelled"],
  poSource: ["From RFQ", "Blanket call-off", "Direct"],
  blanket: ["Draft", "Active", "Accepted", "Fully Consumed", "Expired", "Closed"],
  billType: ["Purchase order", "RA bill", "Direct bill"],
  match: ["Matched", "Matched (debit note)", "Variance — note raised", "Mismatch", "Awaiting certification", "Direct bill", "No PO"],
  shouldPay: ["Yes", "No", "Exception"],
  rfqStatus: ["Draft", "Sent", "Quotes Received", "Partially Awarded", "Awarded", "Closed"],
  rfqMode: ["Multiple Vendors", "Single Vendor"],
  invitation: ["Invited", "Accepted", "Quoted", "Declined"],
  capStatus: ["Open", "Overdue", "Closed"],
  approvalStatus: ["Pending", "Approved", "Rejected"],
  claimStatus: ["Submitted", "Verified", "Returned"],
  workerStatus: ["Active", "Inactive"],
  woStatus: ["Draft", "Issued", "In Progress", "Suspended", "Completed", "Short-closed", "Cancelled", "Closed"],
  woType: ["Item-Rate", "Lump Sum"],
  contractType: ["Item-Rate", "Lump Sum", "Rate Contract"],
  contractStatus: ["Draft", "Pending Approval", "Approved", "Rejected", "Active", "Expiring", "Completed", "Handed Over", "In DLP", "Closed", "Terminated"],
  punchStatus: ["Open", "Rectified", "Closed"],
  ncrStatus: ["Open", "Rework Done", "Closed"],
  bgStatus: ["Active", "Expiring", "Expired", "Returned", "Encashed"],
  invReview: ["Pending", "Accepted", "Rejected"],
  acceptance: ["Pending", "Accepted", "Declined", "—"],
  jms: ["Pending", "Signed", "Disputed"],
  billed: ["Billed", "Not billed"],
  release: ["Pending Approval", "Approved", "Released", "Rejected"],
  progress: ["On Track", "At Risk", "Delayed"],
  insurance: ["Met", "Expiring", "Failing", "Not required"],
  gate: ["Open", "Flagged", "Blocked", "Open (gate off)"],
  kind: ["Document", "Insurance"],
  yesNo: ["Yes", "No"],
  docState: ["Verified", "Pending", "Expiring", "Expired", "Missing", "Rejected"],
  insStatus: ["Compliant", "Pending", "Expiring", "Missing", "Expired", "Non-Compliant"],
};
