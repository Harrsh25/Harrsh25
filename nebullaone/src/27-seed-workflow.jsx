// Seed data for the workflow controls added after the end-to-end audit:
// contract approvals and guarantees, WBS links, quality inspections / NCRs,
// equipment, material issues, daily progress, punch lists and handover.

function extendSeed2(s) {
  const D = (n) => shiftDays(n);
  const ts = (n) => new Date(Date.now() + n * DAY).toISOString();
  // Vendors: who submitted the pending registrations
  for (const v of s.vendors) {
    if (["Pending Approval", "Changes Requested"].includes(v.status)) v.submittedBy = v.source === "Self-registration" ? v.contact.name : "Priya Nair";
    if (v.status === "Active" && v.approval?.stages?.every((x) => x.status === "Approved")) v.approvedOn = (v.approval.stages[2].at || "").slice(0, 10);
  }
  // Contracts: approval trail, performance guarantees, WBS
  for (const c of s.contracts) {
    c.guarantees = [];
    c.pbgPct = c.bgNo ? 5 : c.status === "Draft" ? 5 : 0;
    if (c.bgNo) c.guarantees.push({ id: "BG-1", type: "Performance", bank: { HDFC: "HDFC Bank", AXIS: "Axis Bank" }[c.bgNo.split("/")[1]] || "Bank", number: c.bgNo, amount: round2(c.value * 0.05), expiry: c.bgExpiry, status: "Active", receivedOn: shiftDays(-3, c.signedOn), history: [] });
    if (c.status !== "Draft") {
      c.submittedBy = c.owner; c.submittedAt = new Date(new Date(c.signedOn).getTime() - 6 * DAY).toISOString();
      c.approval = { stages: CONTRACT_FLOW.map((role, i) => ({ role, status: "Approved", by: ["R. Deshpande (Legal)", "M. Iyer (Finance)"][i], at: new Date(new Date(c.signedOn).getTime() - (4 - i * 2) * DAY).toISOString(), remark: "" })) };
      c.signedBy = c.owner;
    }
  }
  const WBS = { "WO-001": "2.2 Tower A — superstructure", "WO-002": "2.3 Tower B — substructure", "WO-003": "1.2 Tower erection — Section 1", "WO-004": "1.2 Earthworks — Block C", "WO-005": "1.2 Station 4", "WO-006": "2.2 Tower A — superstructure" };
  for (const w of s.workOrders) { w.wbs = WBS[w.id] || ""; w.issuedBy = byId(s.contracts, w.contractId)?.owner || "Procurement"; }
  // Scaffolding contract (CTR-005): finished, inspected, handed over, final bill paid — only the retention release is open
  const c5 = byId(s.contracts, "CTR-005");
  if (c5) {
    c5.handover = { date: D(-195), by: "Arjun Mehta", takenOverBy: "Project team — Tower A", inspectionId: "FI-001", note: "Scaffold dismantled, area cleared" };
    const fb = s.raBills.find((b) => b.woId === "WO-006"); if (fb) fb.final = true;
  }
  s.retentionReleases.forEach((r) => { r.status = "Pending Approval"; r.requestedBy = "Arjun Mehta"; });
  // WBS budgets (₹) — the cost baseline work orders commit against
  s.wbsBudgets = {
    "Skyline Towers — Phase 1|2.2 Tower A — superstructure": 32000000, "Skyline Towers — Phase 1|2.3 Tower B — substructure": 16000000,
    "400kV Transmission Line A|1.2 Tower erection — Section 1": 19000000, "Riverside Business Park|1.2 Earthworks — Block C": 6500000, "Metro Line Extension|1.2 Station 4": 3000000,
  };
  // Measurements: signed entries carry a passed quality inspection; the rest wait for one
  for (const m of s.measurements) m.qc = m.jms.status === "Signed" ? { status: "Passed", by: "QA — S. Kale", at: m.jms.at } : { status: "Pending" };
  s.ncrs = [
    { id: "NCR-001", woId: "WO-004", mbId: "MB-027", category: "Quality", severity: "Major", desc: "Backfill compaction below 95% MDD at footings F7–F9 (field density test FDT-31)", raisedBy: "QA — S. Kale", raisedOn: D(-4), status: "Open", history: [{ at: ts(-4), by: "QA — S. Kale", what: "Raised", note: "" }] },
    { id: "NCR-002", woId: "WO-001", mbId: null, category: "HSE", severity: "Minor", desc: "Edge protection missing at slab L2 east side", raisedBy: "Rohan Singh", raisedOn: D(-40), status: "Closed", history: [{ at: ts(-40), by: "Rohan Singh", what: "Raised", note: "" }, { at: ts(-38), by: "Contractor", what: "Rework done", note: "Guard rails installed" }, { at: ts(-37), by: "Rohan Singh", what: "Closed", note: "Verified at site" }] },
  ];
  s.punchItems = [
    { id: "PL-001", contractId: "CTR-005", woId: "WO-006", desc: "Clear scaffold debris from Tower A core podium", location: "Podium L1", severity: "Minor", due: D(-200), status: "Closed", raisedBy: "Arjun Mehta", raisedOn: D(-205), history: [{ at: ts(-205), by: "Arjun Mehta", what: "Raised" }, { at: ts(-201), by: "Contractor", what: "Rectified" }, { at: ts(-200), by: "Arjun Mehta", what: "Closed" }] },
  ];
  s.inspections = [{ id: "FI-001", contractId: "CTR-005", date: D(-196), by: "Arjun Mehta", result: "Passed", note: "All punch items closed" }];
  // Contractor equipment register and deployment on work orders
  const eq = (id, name, type, regNo, capacity, ownership, fit) => ({ id, name, type, regNo, capacity, ownership, fitnessExpiry: D(fit), status: "Available" });
  const set = (vid, list) => { const v = byId(s.vendors, vid); if (v) v.equipment = list; };
  set("VEN-001", [eq("EQ-001", "Tower crane", "Crane", "TC-4410", "8 T at 50 m", "Owned", 140), eq("EQ-002", "Concrete pump", "Pump", "CP-2210", "60 cum/h", "Hired", 75), eq("EQ-003", "Bar bending machine", "Rebar", "BB-07", "32 mm", "Owned", 300)]);
  set("VEN-010", [eq("EQ-004", "Excavator (Komatsu PC210)", "Excavator", "MH12-KX-4410", "0.9 cum", "Owned", 20), eq("EQ-005", "Vibratory roller", "Compactor", "MH12-RL-1180", "10 T", "Owned", 190), eq("EQ-006", "Tipper 10 cum", "Tipper", "MH12-TP-8821", "10 cum", "Hired", -5)]);
  set("VEN-002", [eq("EQ-007", "Tension stringing machine", "Stringing", "TSM-04", "2 × 40 kN", "Owned", 210), eq("EQ-008", "Hydra crane 14 T", "Crane", "MH14-HC-2201", "14 T", "Hired", 60)]);
  const dep = (woId, eqIds, from) => { const w = byId(s.workOrders, woId); if (w) w.equipment = eqIds.map((eqId) => ({ eqId, from: D(from), to: null })); };
  dep("WO-001", ["EQ-001", "EQ-002"], -180); dep("WO-004", ["EQ-004", "EQ-005", "EQ-006"], -80); dep("WO-003", ["EQ-007"], -60);
  // Free-issue material to contractors (recovered through RA bills)
  s.materialIssues = [
    { id: "MI-001", woId: "WO-001", material: "OPC 53 cement (free issue)", unit: "bag", qty: 250, rate: 500, date: D(-95), issuedBy: "Stores — Skyline", recoveredIn: "RA-002" },
    { id: "MI-002", woId: "WO-001", material: "Binding wire 18 SWG", unit: "kg", qty: 400, rate: 92, date: D(-18), issuedBy: "Stores — Skyline", recoveredIn: null },
  ];
  // Daily progress reports
  s.dprs = [
    { id: "DPR-001", woId: "WO-001", date: D(-2), manpower: 86, work: "Slab L3 shuttering 70% complete; column rebar L3–L4 in progress", hindrance: "", weather: "Clear", by: "Sneha Iyer" },
    { id: "DPR-002", woId: "WO-001", date: D(-1), manpower: 91, work: "Slab L3 reinforcement started; masonry L2 east wall", hindrance: "Pump breakdown 2 hours", weather: "Clear", by: "Sneha Iyer" },
    { id: "DPR-003", woId: "WO-004", date: D(-1), manpower: 22, work: "Backfill F10–F18; re-compaction F7–F9 (NCR-001)", hindrance: "Rain from 3 pm", weather: "Rain", by: "S. Kale" },
  ];
  return s;
}
