// Domain logic shared by the Vendor Management and Contract & Labor pages.

const VENDOR_TYPES = ["Goods", "Services", "Labor"];
const TRADES = [
  "Civil", "RCC / Structural", "Formwork", "Masonry", "Electrical", "Tower Erection", "Stringing", "Plumbing",
  "Waterproofing", "Scaffolding", "Excavation", "Equipment Hire", "Manpower Supply", "Steel", "Cement & Aggregates",
  "Hardware", "Solar EPC", "Painting & Finishing",
];
const TIERS = ["Strategic", "Preferred", "Approved", "Transactional"];
const PAYMENT_TERMS = ["Advance", "Net 15", "Net 30", "Net 45", "Net 60"];
const TDS_SECTIONS = [
  { value: "194C-1", label: "194C — Contractor (Individual/HUF) · 1%", rate: 1 },
  { value: "194C-2", label: "194C — Contractor (Company/Firm) · 2%", rate: 2 },
  { value: "194J", label: "194J — Professional / Technical · 10%", rate: 10 },
  { value: "194Q", label: "194Q — Purchase of goods · 0.1%", rate: 0.1 },
  { value: "NONE", label: "No withholding", rate: 0 },
];
// TDS categories are editable in Procurement Settings; the built-in list is the fallback
const tdsOptions = () => { try { const c = settingsOf(getState()).tdsCategories || []; if (c.length) return [...c.map((t) => ({ value: t.code, label: `${t.name} · ${t.rate}%`, rate: Number(t.rate) || 0 })), ...TDS_SECTIONS.filter((t) => !c.some((x) => x.code === t.value))]; } catch {} return TDS_SECTIONS; };
const tdsRate = (code) => (tdsOptions().find((t) => t.value === code) || { rate: 0 }).rate;
const tdsLabel = (code) => (tdsOptions().find((t) => t.value === code) || {}).label;
const APPROVAL_FLOW = ["Procurement", "Legal", "Finance"];
const RA_FLOW = [
  { status: "Submitted", label: "Submitted", role: "Contractor / Site team" },
  { status: "Verified", label: "Site Verification", role: "Site Engineer" },
  { status: "Certified", label: "QS Certification", role: "Quantity Surveyor" },
  { status: "Approved", label: "PM Approval", role: "Project Manager" },
  { status: "Paid", label: "Payment", role: "Accounts" },
];
const HOLD_REASONS = ["Price mismatch", "Quantity mismatch", "Missing GRN / receipt", "Quality issue", "Missing approval", "Compliance document expired"];
const PAY_MODES = ["NEFT", "RTGS", "Cheque", "UPI", "Wire (SWIFT)"];

function requiredDocs(v) {
  return currentSettings().complianceDocs.filter((r) => appliesTo(r, v)).map((r) => r.name);
}

// Compliance status engine: rolls every document + insurance check into one status
// One engine for documents + insurance. Each item: level 0 ok, 1 attention (expiring / awaiting verification), 2 failing.
// "blocking" = failing items whose requirement is set to block payments.
function complianceItems(v) {
  const set = currentSettings(), warn = set.expiryWarnDays;
  const items = [];
  for (const r of set.complianceDocs.filter((x) => appliesTo(x, v))) {
    const d = (v.docs || []).find((x) => x.name === r.name);
    const left = d ? daysUntil(d.expiry) : null;
    let level = 0, note = "Verified";
    if (!d || d.status === "Missing" || !d.file && d.status !== "Verified") { level = 2; note = "Missing"; }
    else if (d.status === "Rejected") { level = 2; note = `Rejected${d.remark ? ` — ${d.remark}` : ""}`; }
    else if (left !== null && left < 0) { level = 2; note = `Expired ${fmtDate(d.expiry)}`; }
    else if (d.status === "Pending") { level = 1; note = "Awaiting verification"; }
    else if (r.expires && !d.expiry) { level = 1; note = "No expiry date recorded"; }
    else if (left !== null && left <= warn) { level = 1; note = `Expires in ${left} day${left === 1 ? "" : "s"}`; }
    items.push({ kind: "Document", key: "doc:" + r.name, name: r.name, level, note, blocks: r.blocks, expiry: d?.expiry || null, doc: d, rule: r });
  }
  for (const r of set.complianceIns.filter((x) => appliesTo(x, v))) {
    const ps = (v.insurance || []).filter((p) => p.type === r.type && p.status !== "Rejected").sort((a, b) => (b.expiry || "").localeCompare(a.expiry || ""));
    const p = ps[0], left = p ? daysUntil(p.expiry) : null;
    let level = 0, note = `${inrShort(p?.cover)} cover`;
    if (!p) { level = 2; note = "No policy on file"; }
    else if (left !== null && left < 0) { level = 2; note = `Expired ${fmtDate(p.expiry)}`; }
    else if (Number(p.cover) < r.min) { level = 2; note = `Cover ${inrShort(p.cover)} below minimum ${inrShort(r.min)}`; }
    else if (p.status === "Pending") { level = 1; note = "Awaiting verification"; }
    else if (left !== null && left <= warn) { level = 1; note = `Expires in ${left} day${left === 1 ? "" : "s"}`; }
    items.push({ kind: "Insurance", key: "ins:" + r.type, name: `${r.type} insurance`, level, note, blocks: r.blocks, expiry: p?.expiry || null, policy: p, rule: r });
  }
  return items;
}
function complianceOf(v) {
  const items = complianceItems(v);
  const worst = Math.max(0, ...items.map((i) => i.level));
  return { status: ["Compliant", "Expiring", "Non-Compliant"][worst], items,
    issues: items.filter((i) => i.level > 0).map((i) => `${i.name}: ${i.note.toLowerCase()}`),
    blocking: items.filter((i) => i.level === 2 && i.blocks).map((i) => `${i.name} — ${i.note.toLowerCase()}`) };
}

const docState = (d) => {
  if (!d || d.status === "Missing") return "Missing";
  const left = daysUntil(d.expiry);
  if (d.status === "Verified" && left !== null && left < 0) return "Expired";
  if (d.status === "Verified" && left !== null && left <= 30) return "Expiring";
  return d.status;
};

const isBlockedFor = (v, what) =>
  v.status === "Blacklisted" || v.status === "Inactive" ||
  (v.status === "On Hold" && v.hold && (v.hold.scope === "All" || v.hold.scope === what) && (!v.hold.until || daysUntil(v.hold.until) >= 0));

// ---- Contracts & work orders
const woValue = (wo) =>
  wo.type === "Lump Sum" ? Number(wo.lumpSum) || 0 : sum(wo.items || [], (i) => (Number(i.qty) || 0) * (Number(i.rate) || 0));
const msAmount = (wo, m) => ((Number(wo.lumpSum) || 0) * (Number(m.weight) || 0)) / 100;

function contractStatus(c) {
  if (["Draft", "Pending Approval", "Approved", "Rejected", "Closed", "Terminated"].includes(c.status)) return c.status;
  // Defect liability runs from the handover certificate (or the completion date when there is none)
  if (c.handover) return daysUntil(shiftDays((c.dlpMonths || 0) * 30, c.handover.date)) >= 0 ? "In DLP" : "Completed";
  const left = daysUntil(c.end);
  if (left < 0) {
    const dlpEnd = shiftDays((c.dlpMonths || 0) * 30, c.end);
    return daysUntil(dlpEnd) >= 0 ? "In DLP" : "Completed";
  }
  if (left <= 90) return "Expiring";
  return "Active";
}
const contractValue = (c) => (Number(c.value) || 0) + sum((c.changeOrders || []).filter((o) => o.status === "Approved"), (o) => o.amount);

// Expected physical progress (%) from elapsed time, linear
function plannedPct(start, end) {
  const s = new Date(start).getTime(), e = new Date(end).getTime(), n = Date.now();
  if (!start || !end || e <= s) return 0;
  return Math.max(0, Math.min(100, ((n - s) / (e - s)) * 100));
}

// Measured (JMS-signed) and billed position per WO line
function woPosition(st, wo) {
  const mbs = st.measurements.filter((m) => m.woId === wo.id);
  const bills = st.raBills.filter((b) => b.woId === wo.id && b.status !== "Rejected");
  if (wo.type === "Lump Sum") {
    return (wo.milestones || []).map((ms) => {
      const signed = mbs.filter((m) => m.lineId === ms.id && m.jms.status === "Signed");
      const measuredPct = Math.max(0, ...signed.map((m) => m.pct));
      const billedPct = Math.max(0, ...bills.flatMap((b) => b.lines.filter((l) => l.lineId === ms.id).map((l) => l.cumPct)));
      const amt = msAmount(wo, ms);
      return {
        line: ms, measured: measuredPct, billed: billedPct, total: 100, unit: "%",
        measuredValue: (amt * measuredPct) / 100, billedValue: (amt * billedPct) / 100, value: amt,
      };
    });
  }
  return (wo.items || []).map((it) => {
    const signed = mbs.filter((m) => m.lineId === it.id && m.jms.status === "Signed");
    const measured = sum(signed, (m) => m.qty);
    const billed = sum(bills.flatMap((b) => b.lines.filter((l) => l.lineId === it.id)), (l) => l.thisQty);
    return {
      line: it, measured, billed, total: it.qty, unit: it.unit,
      measuredValue: measured * it.rate, billedValue: billed * it.rate, value: it.qty * it.rate,
    };
  });
}
function woProgress(st, wo) {
  const pos = woPosition(st, wo), val = woValue(wo) || 1;
  const measured = sum(pos, (p) => p.measuredValue), billed = sum(pos, (p) => p.billedValue);
  const planned = plannedPct(wo.start, wo.end);
  const physical = (measured / val) * 100;
  return { measured, billed, value: woValue(wo), physical, financial: (billed / val) * 100, planned, spi: planned < 5 ? 1 : physical / planned };  // no verdict in the first 5% of the schedule
}

// Advance outstanding on a contract before a given bill (bills ordered by date/id)
function advanceOutstanding(st, contract, excludeBillId) {
  const recovered = sum(
    st.raBills.filter((b) => b.contractId === contract.id && b.id !== excludeBillId && b.status !== "Rejected"),
    (b) => b.ded.advance
  );
  return Math.max(0, (Number(contract.advanceAmount) || 0) - recovered);
}

// Build an RA bill from selected measurement-book entries
function computeRABill(st, woId, mbIds, manual = {}, billId) {
  const wo = byId(st.workOrders, woId), c = byId(st.contracts, wo.contractId), v = byId(st.vendors, wo.vendorId);
  const earlier = st.raBills.filter((b) => b.woId === woId && b.id !== billId && b.status !== "Rejected");
  const picked = st.measurements.filter((m) => mbIds.includes(m.id));
  let lines;
  if (wo.type === "Lump Sum") {
    lines = wo.milestones.map((ms) => {
      const prevPct = Math.max(0, ...earlier.flatMap((b) => b.lines.filter((l) => l.lineId === ms.id).map((l) => l.cumPct)));
      const sel = picked.filter((m) => m.lineId === ms.id);
      const cumPct = Math.max(prevPct, ...sel.map((m) => m.pct));
      const amt = msAmount(wo, ms);
      return { lineId: ms.id, desc: ms.name, prevPct, cumPct, thisPct: cumPct - prevPct, base: amt, amount: round2(((cumPct - prevPct) / 100) * amt) };
    }).filter((l) => l.thisPct > 0 || l.prevPct > 0);
  } else {
    lines = wo.items.map((it) => {
      const prevQty = sum(earlier.flatMap((b) => b.lines.filter((l) => l.lineId === it.id)), (l) => l.thisQty);
      const thisQty = round2(sum(picked.filter((m) => m.lineId === it.id), (m) => m.qty));
      return { lineId: it.id, code: it.code, desc: it.desc, unit: it.unit, rate: it.rate, woQty: it.qty, prevQty, thisQty, cumQty: round2(prevQty + thisQty), amount: round2(thisQty * it.rate) };
    }).filter((l) => l.thisQty > 0 || l.prevQty > 0);
  }
  const gross = round2(sum(lines, (l) => l.amount));
  const ded = {
    retention: round2((gross * (c.retentionPct || 0)) / 100),
    advance: round2(Math.min((gross * (c.advanceRecoveryPct || 0)) / 100, advanceOutstanding(st, c, billId))),
    tds: round2((gross * tdsRate(v.tds)) / 100),
    cess: round2((gross * (c.cessPct || 0)) / 100),
    materials: Number(manual.materials) || 0,
    penalty: Number(manual.penalty) || 0,
    other: Number(manual.other) || 0,
  };
  const gst = round2((gross * (c.gstPct || 0)) / 100);
  const totalDed = round2(sum(Object.values(ded)));
  return { lines, gross, gst, ded, totalDed, net: round2(gross + gst - totalDed), otherNote: manual.otherNote || "" };
}

// Retention / advance ledger for a contract
function contractLedger(st, c) {
  const bills = st.raBills.filter((b) => b.contractId === c.id && b.status !== "Rejected" && b.status !== "Draft");
  const releases = st.retentionReleases.filter((r) => r.contractId === c.id);
  const retentionHeld = sum(bills, (b) => b.ded.retention);
  const released = sum(releases.filter((r) => r.status === "Released"), (r) => r.amount);
  const recovered = sum(bills, (b) => b.ded.advance);
  return {
    bills, releases,
    gross: sum(bills, (b) => b.gross),
    paid: sum(bills.filter((b) => b.status === "Paid"), (b) => b.net),
    retentionHeld, released, retentionBalance: retentionHeld - released,
    advanceGiven: Number(c.advanceAmount) || 0, recovered, advanceBalance: (Number(c.advanceAmount) || 0) - recovered,
    tds: sum(bills, (b) => b.ded.tds), cess: sum(bills, (b) => b.ded.cess),
    materials: sum(bills, (b) => b.ded.materials), penalty: sum(bills, (b) => b.ded.penalty), other: sum(bills, (b) => b.ded.other),
  };
}

// ---- Procurement
function quoteTotal(rfq, q) {
  return sum(rfq.items, (it, i) => (Number(it.qty) || 0) * (lineRate(q, i) || 0));
}
// Weighted ranking. Partial bids are scored on the lines they priced and
// scaled by coverage, so a vendor quoting 1 of 3 lines can't win outright.
function rankQuotes(st, rfq) {
  const valid = rfq.quotes.filter((q) => q.review !== "Returned" && quotedLines(rfq, q).length > 0);
  if (!valid.length) return [];
  const minRate = rfq.items.map((_, i) => Math.min(...valid.map((q) => lineRate(q, i) ?? Infinity)));
  const avgLead = (q) => { const l = quotedLines(rfq, q).map((i) => Number(q.leadDays?.[i] ?? q.deliveryDays) || 1); return sum(l) / l.length; };
  const minLead = Math.min(...valid.map(avgLead));
  const w = rfq.weights;
  return valid
    .map((q) => {
      const lines = quotedLines(rfq, q);
      const coverage = lines.length / rfq.items.length;
      const priceScore = (sum(lines, (i) => minRate[i] / lineRate(q, i)) / lines.length) * 100 * coverage;
      const deliveryScore = (minLead / avgLead(q)) * 100;
      const qualityScore = vendorScore(st, q.vendorId).score ?? 70;
      const total = (priceScore * w.price + qualityScore * w.quality + deliveryScore * w.delivery) / (w.price + w.quality + w.delivery);
      return { q, total: round2(total), priceScore, deliveryScore, qualityScore, coverage, amount: quoteTotal(rfq, q), expired: daysUntil(q.validUntil) < 0 };
    })
    .sort((a, b) => b.total - a.total);
}

const poValue = (po) => sum(po.lines, (l) => l.qty * l.rate);
function poReceived(po) {
  return po.lines.map((l, i) => {
    const rec = po.receipts.flatMap((r) => r.lines.filter((x) => x.line === i));
    return { ...l, received: sum(rec, (x) => x.qty), accepted: sum(rec, (x) => x.accepted), rejected: sum(rec, (x) => x.qty - x.accepted) };
  });
}
function poStatus(po) {
  if (po.status === "Draft" || po.status === "Closed" || po.status === "Cancelled") return po.status;
  const r = poReceived(po), rec = sum(r, (x) => x.received), ord = sum(r, (x) => x.qty);
  if (!rec) return "Issued";
  return rec >= ord * (1 - (po.tolerance || 0) / 100) ? "Received" : "Partially Received";
}

// Invoices: amount, paid, status, 3-way match
function invoiceTotals(inv) {
  const taxable = sum(inv.lines, (l) => l.qty * l.rate);
  const gst = round2((taxable * (inv.gstPct || 0)) / 100);
  const gross = inv.source === "RA Bill" ? inv.amount : round2(taxable + gst);
  const paid = sum(inv.payments, (p) => p.amount + (p.tds || 0));
  const notes = sum(inv.notes || [], (n) => (n.type === "Debit Note" ? -n.amount : n.amount));
  // A vendor invoice rejected by AP is not payable
  const payable = inv.review === "Rejected" ? 0 : round2(gross + notes);
  return { taxable, gst, gross, paid, notes, payable, balance: round2(payable - paid) };
}
function invoiceStatus(inv) {
  if (inv.review === "Pending") return "Awaiting Review";
  if (inv.review === "Rejected") return "Rejected";
  const t = invoiceTotals(inv);
  if (t.balance <= 0.5) return "Paid";
  if (inv.hold && (!inv.hold.until || daysUntil(inv.hold.until) >= 0)) return "On Hold";
  // with instalments, "overdue" means an instalment past its due date is unpaid
  const due = inv.schedule && inv.schedule.length > 1 ? (instalments(inv).find((x) => x.status !== "Paid") || {}).due : inv.due;
  if (t.paid > 0) return daysUntil(due) < 0 ? "Overdue" : "Partially Paid";
  return daysUntil(due) < 0 ? "Overdue" : "Unpaid";
}
function threeWay(st, inv) {
  if (inv.source === "RA Bill") {
    const b = byId(st.raBills, inv.raBillId);
    return { status: b && ["Approved", "Paid"].includes(b.status) ? "Matched" : "Awaiting certification", rows: [] };
  }
  if (inv.source === "Direct") return { status: "Direct bill", rows: [] };
  const po = byId(st.purchaseOrders, inv.poId);
  if (!po) return { status: "No PO", rows: [] };
  const tol = ((st.settings && st.settings.rateTolerancePct) || 0) / 100;
  const rec = poReceived(po);
  const rows = inv.lines.map((l) => {
    const p = rec[l.line];
    const qtyOk = l.qty <= p.accepted + (st.settings && st.settings.billRejectedQty ? p.rejected : 0) + 0.001, rateOk = Math.abs(l.rate - p.rate) <= p.rate * tol + 0.01;
    return { desc: p.desc, poQty: p.qty, poRate: p.rate, grnQty: p.accepted, invQty: l.qty, invRate: l.rate, qtyOk, rateOk };
  });
  const ok = rows.every((r) => r.qtyOk && r.rateOk);
  // A debit note that covers the excess quantity resolves the quantity variance
  const excess = sum(rows, (r) => Math.max(0, r.invQty - r.grnQty) * r.invRate) * (1 + (inv.gstPct || 0) / 100);
  const dn = sum((inv.notes || []).filter((n) => n.type === "Debit Note"), (n) => n.amount);
  const qtyCovered = excess > 0 && dn >= excess - 1;
  const rateOkAll = rows.every((r) => r.rateOk);
  const status = ok ? "Matched" : qtyCovered && rateOkAll ? "Matched (debit note)" : (inv.notes || []).length ? "Variance — note raised" : "Mismatch";
  return { status, rows, qtyCovered };
}

// ---- Performance scorecard (0-100)
function vendorScore(st, vendorId) {
  const v = byId(st.vendors, vendorId);
  if (!v) return { score: null, parts: {} };
  const w = st.scoreConfig.weights;
  const parts = {};
  const ratings = st.ratings.filter((r) => r.vendorId === vendorId);
  if (ratings.length) {
    parts.quality = (sum(ratings, (r) => r.quality) / ratings.length / 5) * 100;
    parts.safety = (sum(ratings, (r) => r.safety) / ratings.length / 5) * 100;
  }
  // Timeliness: labour/services via WO schedule index, goods via on-time receipts
  const wos = st.workOrders.filter((x) => x.vendorId === vendorId && x.status !== "Draft");
  const pos = st.purchaseOrders.filter((p) => p.vendorId === vendorId && p.receipts.length);
  const t = [];
  wos.forEach((wo) => t.push(Math.min(1, woProgress(st, wo).spi) * 100));
  pos.forEach((p) => p.receipts.forEach((r) => t.push(new Date(r.date) <= new Date(p.deliveryDate) ? 100 : 55)));
  if (t.length) parts.timeliness = sum(t) / t.length;
  // Goods quality from acceptance rate when no manual ratings exist
  if (!ratings.length && pos.length) {
    const rec = pos.flatMap(poReceived);
    const r = sum(rec, (x) => x.received);
    if (r) parts.quality = (sum(rec, (x) => x.accepted) / r) * 100;
  }
  // No orders, work orders or ratings yet → no score (a new vendor is "New", not a failing 30)
  if (!Object.keys(parts).length) return { score: null, parts: {}, isNew: true };
  const comp = complianceOf(v).status;
  parts.compliance = comp === "Compliant" ? 100 : comp === "Expiring" ? 70 : 30;
  let tw = 0, ts = 0;
  for (const k of Object.keys(parts)) {
    tw += w[k] || 0;
    ts += (w[k] || 0) * parts[k];
  }
  return { score: tw ? round2(ts / tw) : null, parts };
}

// Onboarding stage for a contractor
function onboardingStage(v) {
  if (v.status === "Rejected") return "Rejected";
  if (v.status === "Active" || v.status === "On Hold") {
    const done = (v.onboarding?.checklist || []).every((c) => c.done);
    return done ? "Onboarded" : "Mobilising";
  }
  if (v.status === "Pending Approval" || v.status === "Changes Requested") return "Under Review";
  return "Documents";
}
const ONBOARD_STAGES = ["Documents", "Under Review", "Mobilising", "Onboarded"];
const ONBOARD_CHECKLIST = [
  "KYC & statutory documents verified",
  "Labour licence & PF/ESI codes validated",
  "Workmen compensation policy on file",
  "Bank account verified (penny drop)",
  "Contract agreement signed",
  "Safety induction completed",
  "Site gate passes / ID badges issued",
];
