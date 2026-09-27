// Demo data so every screen has something to show. Replace with real API calls later.

export type Category = "Concrete" | "Steel" | "Electrical" | "Masonry";

export const projects = [
  { id: "PRJ-001", name: "Skyline Towers — Phase 1", client: "Skyline Realty", manager: "Arjun Mehta", start: "01 Apr 2026", end: "31 Mar 2027", progress: 62, status: "On Track", health: "good" },
  { id: "PRJ-002", name: "Metro Line Extension", client: "City Metro Corp", manager: "Priya Nair", start: "15 Jan 2026", end: "30 Jun 2027", progress: 41, status: "At Risk", health: "warn" },
  { id: "PRJ-003", name: "400kV Transmission Line A", client: "State Power Grid", manager: "Rahul Verma", start: "10 Feb 2026", end: "10 Dec 2026", progress: 78, status: "On Track", health: "good" },
  { id: "PRJ-004", name: "Riverside Business Park", client: "Riverside Dev", manager: "Sneha Iyer", start: "01 Jun 2026", end: "31 Jan 2028", progress: 18, status: "Delayed", health: "bad" },
  { id: "PRJ-005", name: "Solar Farm Substation", client: "GreenGen Energy", manager: "Karan Shah", start: "20 Mar 2026", end: "20 Nov 2026", progress: 55, status: "On Track", health: "good" },
];

export const assignments = [
  { wbs: "CW-01 > PCC", type: "Activity", project: "Skyline Towers — Phase 1", due: "30 Sep 2026", progress: 80, status: "In Progress" },
  { wbs: "CW-01 > Reinforcement", type: "Task", project: "Skyline Towers — Phase 1", due: "05 Oct 2026", progress: 45, status: "In Progress" },
  { wbs: "EW-03 > Cable Trench", type: "Task", project: "400kV Transmission Line A", due: "25 Sep 2026", progress: 100, status: "Completed" },
  { wbs: "EW-04 > Earthing", type: "Sub-task", project: "400kV Transmission Line A", due: "22 Sep 2026", progress: 60, status: "Overdue" },
  { wbs: "CW-06 > Masonry", type: "Activity", project: "Riverside Business Park", due: "15 Oct 2026", progress: 10, status: "Not Started" },
];

export const goals = [
  { name: "Complete superstructure up to level 10", owner: "Arjun Mehta", due: "31 Dec 2026", progress: 58, milestones: 4 },
  { name: "Energise 400kV line section A-12", owner: "Rahul Verma", due: "15 Nov 2026", progress: 76, milestones: 3 },
  { name: "Handover Block B to client", owner: "Sneha Iyer", due: "28 Feb 2027", progress: 22, milestones: 5 },
];

export const milestones = [
  { name: "Foundation complete", goal: "Complete superstructure up to level 10", date: "15 Jul 2026", status: "Achieved" },
  { name: "Level 5 slab cast", goal: "Complete superstructure up to level 10", date: "20 Oct 2026", status: "Upcoming" },
  { name: "Tower erection 1–40", goal: "Energise 400kV line section A-12", date: "30 Sep 2026", status: "At Risk" },
];

export const timesheets = [
  { date: "22 Sep 2026", wbs: "CW-01 > PCC", hours: 8, note: "Pour supervision", status: "Approved" },
  { date: "23 Sep 2026", wbs: "CW-01 > Reinforcement", hours: 7.5, note: "Bar bending check", status: "Approved" },
  { date: "24 Sep 2026", wbs: "CW-02 > Aggregate Filling", hours: 6, note: "Site inspection", status: "Submitted" },
  { date: "25 Sep 2026", wbs: "CW-04 > Pour Cycle", hours: 8, note: "RMC coordination", status: "Draft" },
];

export const approvals = [
  { item: "CW-01 > PCC", type: "Activity", by: "Arjun Mehta", submitted: "24 Sep 2026", progress: 100, status: "Pending" },
  { item: "EW-03 > Cable Trench", type: "Task", by: "Rahul Verma", submitted: "23 Sep 2026", progress: 100, status: "Approved" },
  { item: "CW-02 > Aggregate Filling", type: "Task", by: "Priya Nair", submitted: "21 Sep 2026", progress: 100, status: "Rejected" },
];

export const assignedVsCompleted = [
  { wbs: "CW-01 > PCC", resource: "Arjun Mehta", assigned: "01 Sep 2026", due: "30 Sep 2026", aTasks: 12, cDate: "26 Sep 2026", cTasks: 10, delay: 0 },
  { wbs: "CW-01 > Reinforcement", resource: "Vikram Rao", assigned: "05 Sep 2026", due: "25 Sep 2026", aTasks: 8, cDate: "—", cTasks: 5, delay: 2 },
  { wbs: "EW-03 > Cable Trench", resource: "Rahul Verma", assigned: "10 Aug 2026", due: "20 Sep 2026", aTasks: 15, cDate: "19 Sep 2026", cTasks: 15, delay: 0 },
  { wbs: "EW-04 > Earthing", resource: "Neha Gupta", assigned: "01 Sep 2026", due: "22 Sep 2026", aTasks: 6, cDate: "—", cTasks: 3, delay: 5 },
  { wbs: "CW-06 > Masonry", resource: "Sneha Iyer", assigned: "15 Sep 2026", due: "15 Oct 2026", aTasks: 20, cDate: "—", cTasks: 4, delay: 0 },
];

export const quantityRows: { cat: Category; wbs: string; material: string; unit: string; planned: number; executed: number }[] = [
  { cat: "Concrete", wbs: "CW-01 > PCC", material: "Cement OPC 53", unit: "Bags", planned: 1800, executed: 1360 },
  { cat: "Concrete", wbs: "CW-02 > Aggregate Filling", material: "Aggregates 20mm", unit: "Cum", planned: 950, executed: 880 },
  { cat: "Concrete", wbs: "CW-04 > Pour Cycle", material: "RMC M25", unit: "Cum", planned: 640, executed: 560 },
  { cat: "Steel", wbs: "CW-01 > Reinforcement", material: "TMT Steel Fe500", unit: "MT", planned: 240, executed: 210 },
  { cat: "Steel", wbs: "CW-03 > Binding", material: "Binding Wire", unit: "Kg", planned: 1800, executed: 1600 },
  { cat: "Electrical", wbs: "EW-03 > Cable Trench", material: "Armoured Cable 3.5C", unit: "Mtr", planned: 5200, executed: 4300 },
  { cat: "Electrical", wbs: "EW-04 > Earthing", material: "GI Earthing Strip", unit: "Mtr", planned: 3000, executed: 2850 },
  { cat: "Electrical", wbs: "EW-05 > Conduit", material: "PVC Conduit", unit: "Mtr", planned: 7800, executed: 7600 },
  { cat: "Masonry", wbs: "CW-06 > Masonry", material: "Red Bricks", unit: "Nos", planned: 25000, executed: 21800 },
];

export const costRows: { cat: Category; wbs: string; budget: number; material: string; rate: number; qty: number; qtyAssigned: number; qtyUsed: number }[] = [
  { cat: "Concrete", wbs: "CW-01 > PCC", budget: 1250000, material: "Cement OPC 53", rate: 410, qty: 1800, qtyAssigned: 1500, qtyUsed: 1360 },
  { cat: "Concrete", wbs: "CW-02 > Aggregate Filling", budget: 760000, material: "Aggregates 20mm", rate: 800, qty: 950, qtyAssigned: 900, qtyUsed: 880 },
  { cat: "Concrete", wbs: "CW-04 > Pour Cycle", budget: 352000, material: "RMC M25", rate: 5500, qty: 64, qtyAssigned: 61, qtyUsed: 56 },
  { cat: "Steel", wbs: "CW-01 > Reinforcement", budget: 1680000, material: "TMT Steel Fe500", rate: 70000, qty: 24, qtyAssigned: 22, qtyUsed: 21 },
  { cat: "Electrical", wbs: "EW-03 > Cable Trench", budget: 2240000, material: "Armoured Cable 3.5C", rate: 430, qty: 5200, qtyAssigned: 4800, qtyUsed: 4300 },
  { cat: "Electrical", wbs: "EW-04 > Earthing", budget: 990000, material: "GI Earthing Strip", rate: 330, qty: 3000, qtyAssigned: 2900, qtyUsed: 2850 },
  { cat: "Electrical", wbs: "EW-05 > Conduit", budget: 780000, material: "PVC Conduit", rate: 100, qty: 7800, qtyAssigned: 7800, qtyUsed: 7600 },
  { cat: "Masonry", wbs: "CW-06 > Masonry", budget: 1125000, material: "Red Bricks", rate: 45, qty: 25000, qtyAssigned: 23000, qtyUsed: 21800 },
];

export const boqs = [
  { code: "BOQ-2026-001", name: "Civil Works — Tower Block A", project: "Skyline Towers — Phase 1", items: 48, value: 18450000, version: "v3", status: "Approved" },
  { code: "BOQ-2026-002", name: "Electrical Works — Line A", project: "400kV Transmission Line A", items: 32, value: 9870000, version: "v2", status: "In Review" },
  { code: "BOQ-2026-003", name: "Finishing Works — Block B", project: "Riverside Business Park", items: 61, value: 12300000, version: "v1", status: "Draft" },
];

export const boqTemplates = [
  { name: "Standard Civil — High Rise", items: 52, updated: "12 Aug 2026" },
  { name: "Transmission Tower — 400kV", items: 36, updated: "03 Sep 2026" },
];

export const boqItems = [
  { desc: "Excavation in all types of soil", unit: "Cum", qty: 1200, rate: 350, gst: 18, tsQty: 1180, status: "Approved" },
  { desc: "PCC 1:4:8 in foundation", unit: "Cum", qty: 320, rate: 5200, gst: 18, tsQty: 330, status: "Approved" },
  { desc: "RCC M25 for footings", unit: "Cum", qty: 640, rate: 7800, gst: 18, tsQty: 610, status: "In Draft" },
  { desc: "TMT reinforcement Fe500", unit: "MT", qty: 24, rate: 70000, gst: 18, tsQty: 25, status: "In Draft" },
  { desc: "Brick masonry 230mm", unit: "Sqm", qty: 2100, rate: 1150, gst: 12, tsQty: 2050, status: "Rejected" },
];

export const materials = [
  { name: "Cement OPC 53", unit: "Bags", type: "Civil", boq: 1800, ordered: 1600, received: 1450, consumed: 1360 },
  { name: "TMT Steel Fe500", unit: "MT", type: "Civil", boq: 240, ordered: 240, received: 225, consumed: 210 },
  { name: "Armoured Cable 3.5C", unit: "Mtr", type: "Electrical", boq: 5200, ordered: 5500, received: 5000, consumed: 4300 },
  { name: "Red Bricks", unit: "Nos", type: "Civil", boq: 25000, ordered: 22000, received: 22000, consumed: 21800 },
];

export const documents = [
  { name: "Foundation drawing rev C.pdf", parent: "CW-01 > PCC", type: "Drawing", desc: "Approved foundation layout", created: "12 Sep 2026", status: "Active" },
  { name: "Cube test report — Batch 14.pdf", parent: "CW-04 > Pour Cycle", type: "Test Report", desc: "28-day compressive strength", created: "18 Sep 2026", status: "Active" },
  { name: "Cable routing plan.dwg", parent: "EW-03 > Cable Trench", type: "Drawing", desc: "Revised trench alignment", created: "20 Sep 2026", status: "Draft" },
];

export const approvalModules = ["BOQ", "Tower Schedule", "Foundation Matrix", "Timesheets"];
export const moduleApprovals = [
  { ref: "BOQ-2026-002", title: "Electrical Works — Line A", module: "BOQ", by: "Rahul Verma", date: "24 Sep 2026", level: "L2 / 3", status: "Pending" },
  { ref: "BOQ-2026-003", title: "Finishing Works — Block B", module: "BOQ", by: "Sneha Iyer", date: "22 Sep 2026", level: "L1 / 3", status: "Pending" },
  { ref: "TS-0142", title: "Tower schedule — Section A", module: "Tower Schedule", by: "Neha Gupta", date: "20 Sep 2026", level: "L1 / 2", status: "Approved" },
];

export const organizations = [
  { name: "Acme Corporation", code: "ACME", industry: "Technology & Software", country: "United States", branches: 3, status: "Active" },
  { name: "Acme Infra Pvt Ltd", code: "ACIN", industry: "Construction", country: "India", branches: 2, status: "Active" },
];
export const branches = [
  { name: "Head Office", org: "Acme Corporation", city: "New York", manager: "John Carter", status: "Active" },
  { name: "Pune Site Office", org: "Acme Infra Pvt Ltd", city: "Pune", manager: "Arjun Mehta", status: "Active" },
  { name: "Delhi Regional Office", org: "Acme Infra Pvt Ltd", city: "Delhi", manager: "Priya Nair", status: "Active" },
];
export const departments = [
  { name: "Engineering", head: "Rahul Verma", branch: "Pune Site Office", people: 42, status: "Active" },
  { name: "Procurement", head: "Karan Shah", branch: "Head Office", people: 9, status: "Active" },
  { name: "Quality & Safety", head: "Neha Gupta", branch: "Delhi Regional Office", people: 14, status: "Active" },
];
export const locations = [
  { name: "Skyline Site", address: "Baner Road, Pune", state: "Maharashtra", country: "India", status: "Active" },
  { name: "Line A — Section 12", address: "NH-48, Near Rewari", state: "Haryana", country: "India", status: "Active" },
];
export const clients = [
  { name: "Skyline Realty", contact: "Rohit Malhotra", email: "rohit@skyline.example", projects: 2, status: "Active" },
  { name: "State Power Grid", contact: "A. Srinivasan", email: "projects@spg.example", projects: 1, status: "Active" },
  { name: "GreenGen Energy", contact: "Meera Joshi", email: "meera@greengen.example", projects: 1, status: "Active" },
];
export const industries = [
  { name: "Construction", code: "IND-CON", orgs: 1, status: "Active" },
  { name: "Power & Utilities", code: "IND-PWR", orgs: 0, status: "Active" },
  { name: "Technology & Software", code: "IND-TEC", orgs: 1, status: "Active" },
];
export const legalEntities = [
  { org: "Acme Corporation", name: "Acme Corporation LLC", country: "United States", reg: "LLC-2024-001234", currency: "USD", status: "active" },
];
export const businessUnits = [
  { name: "Infrastructure", code: "BU-INF", head: "Arjun Mehta", entity: "Acme Corporation LLC", status: "active" },
  { name: "Power Transmission", code: "BU-PWR", head: "Rahul Verma", entity: "Acme Corporation LLC", status: "active" },
];

export const towers = Array.from({ length: 10 }, (_, i) => {
  const span = [312, 298, 345, 305, 330, 288, 350, 320, 301, 315][i];
  return {
    ap: `AP-${String(i + 1).padStart(2, "0")}`,
    angle: i % 3 === 0 ? `${(i * 2.5 + 5).toFixed(1)}° L` : "0°",
    loc: `L-${101 + i}`,
    type: ["DA+0", "DB+3", "DA+0", "DC+6", "DA+3", "DB+0", "DD+9", "DA+0", "DB+3", "DA+0"][i],
    span,
    wcL: Math.round(span * 0.52), wcR: Math.round(span * 0.48),
    whL: Math.round(span * 0.55), whR: Math.round(span * 0.5),
    x: (7421.3 + i * 1.8).toFixed(1), y: (3312.6 + i * 2.1).toFixed(1),
    status: i < 6 ? "Approved" : i < 8 ? "Gantry Filled" : "Draft",
    foundation: [100, 100, 100, 100, 80, 60, 30, 0, 0, 0][i],
    erection: [100, 100, 100, 70, 40, 0, 0, 0, 0, 0][i],
    stringing: [100, 60, 20, 0, 0, 0, 0, 0, 0, 0][i],
  };
});

export const foundationRows = towers.map((t, i) => ({
  tower: t.ap, loc: t.loc, type: t.type.split("+")[0], leg: `+${t.type.split("+")[1]}`,
  soil: ["Normal Dry", "Wet", "Normal Dry", "Hard Rock", "Fissured Rock", "Wet", "Normal Dry", "Sandy", "Normal Dry", "Wet"][i],
  excavation: 42 + i * 3, m10: 2.1 + i * 0.1, m20: 18 + i, steel: 1.2 + i * 0.05, stubHt: 0.225, stubWt: 310 + i * 5,
}));

export const l2Activities = [
  { name: "Tower Material Supply", uom: "MT", qty: 1250, start: 0, len: 5, status: "In Progress" },
  { name: "Conductor Supply", uom: "Km", qty: 84, start: 1, len: 4, status: "Planned" },
  { name: "Insulator Supply", uom: "Nos", qty: 3600, start: 2, len: 3, status: "Planned" },
  { name: "Hardware Fittings", uom: "Sets", qty: 420, start: 0, len: 3, status: "Completed" },
  { name: "OPGW Supply", uom: "Km", qty: 42, start: 3, len: 3, status: "Delayed" },
];
export const l2Construction = [
  { name: "Foundation", uom: "Nos", qty: 120, start: 0, len: 4, status: "In Progress" },
  { name: "Tower Erection", uom: "Nos", qty: 120, start: 2, len: 4, status: "In Progress" },
  { name: "Stringing", uom: "Km", qty: 42, start: 4, len: 2, status: "Planned" },
  { name: "Testing & Commissioning", uom: "Lot", qty: 1, start: 5, len: 1, status: "Planned" },
];

export const attendance = [
  { date: "01 Sep 2026", day: "Tue", checkIn: "09:02", checkOut: "18:11", hours: 9.1, status: "Present" },
  { date: "02 Sep 2026", day: "Wed", checkIn: "09:15", checkOut: "18:05", hours: 8.8, status: "Present" },
  { date: "03 Sep 2026", day: "Thu", checkIn: "—", checkOut: "—", hours: 0, status: "Leave" },
  { date: "04 Sep 2026", day: "Fri", checkIn: "09:40", checkOut: "17:30", hours: 7.8, status: "Late" },
  { date: "07 Sep 2026", day: "Mon", checkIn: "08:55", checkOut: "18:20", hours: 9.4, status: "Present" },
  { date: "08 Sep 2026", day: "Tue", checkIn: "09:05", checkOut: "18:00", hours: 8.9, status: "Present" },
];

export const inr = (n: number) => (n < 0 ? "-₹" : "₹") + Math.abs(n).toLocaleString("en-IN");
export const num = (n: number) => n.toLocaleString("en-IN");
