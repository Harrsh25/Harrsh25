// Demo seed data. Dates are relative to "today" so expiry / renewal alerts
// always have something to show. Bump SEED_VERSION when the shape changes.
const SEED_VERSION = 12;

function buildSeed() {
  const D = (n) => shiftDays(n);
  const ts = (n) => new Date(Date.now() + n * DAY).toISOString();
  const doc = (name, status = "Verified", expiry = null, uploaded = -200) => ({ name, status, expiry: expiry === null ? null : D(expiry), uploadedAt: D(uploaded), file: name.replace(/[^A-Za-z]+/g, "_") + ".pdf" });
  const allDocs = (v, over = {}) =>
    requiredDocs(v).map((n) => over[n] || doc(n, "Verified", /Policy|Licence|ISO|CAR/.test(n) ? 240 : null));
  const stages = (upto, rejectAt) =>
    APPROVAL_FLOW.map((dept, i) => ({
      dept,
      status: rejectAt === i ? "Rejected" : i < upto ? "Approved" : i === upto ? "Pending" : "Waiting",
      by: i < upto || rejectAt === i ? ["R. Kulkarni", "A. Deshpande", "M. Iyer"][i] : null,
      at: i < upto || rejectAt === i ? ts(-40 + i * 2) : null,
      remark: rejectAt === i ? "Solvency certificate older than 12 months" : i < upto ? "OK" : "",
    }));
  const checklist = (n) => ONBOARD_CHECKLIST.map((item, i) => ({ item, done: i < n }));

  const V = (o) => {
    const v = {
      type: "Goods", isContractor: false, categories: [], tier: "Approved", regTier: "Spend Authorized", status: "Active",
      preferred: false, currency: "INR", paymentTerms: "Net 30", tds: "194C-2", group: "", parentCompany: "",
      hold: null, bankAccounts: [], insurance: [], approval: { stages: stages(3) }, qualification: null,
      background: { credit: "A", litigation: "Clear", watchlist: "Clear", checkedAt: D(-60) }, contractor: null,
      onboarding: null, createdAt: D(-300), notes: [], ...o,
    };
    v.docs = o.docs || allDocs(v, o.docOver || {});
    delete v.docOver;
    return v;
  };

  const vendors = [
    V({
      id: "VEN-001", name: "Shree Balaji Infra Contractors", legalName: "Shree Balaji Infra Contractors Pvt Ltd", type: "Labor", isContractor: true,
      categories: ["Civil", "RCC / Structural", "Formwork", "Masonry"], tier: "Strategic", preferred: true, group: "Civil Contractors › Structural",
      gstin: "27AAKCS4412M1Z3", pan: "AAKCS4412M", contact: { name: "Ramesh Patil", email: "ramesh@shreebalaji.in", phone: "+91 98220 41152" },
      address: "Plot 14, MIDC Bhosari", city: "Pune", state: "Maharashtra", paymentTerms: "Net 30", tds: "194C-2",
      bankAccounts: [{ id: 1, bank: "HDFC Bank", account: "50200041187723", ifsc: "HDFC0000123", isDefault: true }, { id: 2, bank: "State Bank of India", account: "38844120551", ifsc: "SBIN0001187", isDefault: false }],
      insurance: [{ type: "Workmen Compensation", policy: "WC/2026/88121", insurer: "ICICI Lombard", cover: 25000000, expiry: D(210) }, { type: "Contractor's All Risk", policy: "CAR/2026/1142", insurer: "New India Assurance", cover: 50000000, expiry: D(180) }],
      contractor: { labourLicence: "CLRA/PUN/2025/0412", licenceExpiry: D(160), pfCode: "PUPUN1123344000", esiCode: "33000412210001001", workforce: 240, experienceYrs: 14, pastProjects: "Amanora Towers, Magarpatta Phase 3" },
      onboarding: { checklist: checklist(7), startedAt: D(-310) }, createdAt: D(-320),
      qualification: { ruleSet: "Contractor — High value", score: 88, answers: { years: 14, turnover: 42, iso: "Yes", litigation: "No", workforce: 240, clra: "Yes", lti: 1, hse: "Yes" } },
    }),
    V({
      id: "VEN-002", name: "Apex Electricals & Power", legalName: "Apex Electricals & Power Projects Pvt Ltd", type: "Services", isContractor: true,
      categories: ["Electrical", "Tower Erection", "Stringing"], tier: "Strategic", preferred: true, group: "EPC Contractors › Transmission",
      gstin: "27AADCA7781K1Z9", pan: "AADCA7781K", contact: { name: "Sunil Menon", email: "sunil.menon@apexpower.co.in", phone: "+91 99870 11245" },
      address: "Unit 402, Lodha Supremus, Thane", city: "Thane", state: "Maharashtra", tds: "194C-2",
      bankAccounts: [{ id: 1, bank: "Axis Bank", account: "918020044512210", ifsc: "UTIB0000456", isDefault: true }],
      insurance: [{ type: "Workmen Compensation", policy: "WC/2026/55102", insurer: "Bajaj Allianz", cover: 20000000, expiry: D(95) }],
      contractor: { labourLicence: "CLRA/THN/2024/1180", licenceExpiry: D(75), pfCode: "MHBAN0098712000", esiCode: "31000988120001002", workforce: 165, experienceYrs: 11, pastProjects: "765kV Aurangabad–Padghe (Pkg 3)" },
      onboarding: { checklist: checklist(7), startedAt: D(-280) }, createdAt: D(-290),
      qualification: { ruleSet: "Contractor — High value", score: 84, answers: { years: 11, turnover: 65, iso: "Yes", litigation: "No", workforce: 165, clra: "Yes", lti: 0, hse: "Yes" } },
    }),
    V({
      id: "VEN-003", name: "Deccan Steel Traders", legalName: "Deccan Steel Traders LLP", type: "Goods", categories: ["Steel"], tier: "Preferred", preferred: true, group: "Material Suppliers › Steel",
      gstin: "27AAMFD2231Q1ZT", pan: "AAMFD2231Q", contact: { name: "Imran Shaikh", email: "sales@deccansteel.in", phone: "+91 98501 77623" },
      address: "Gat No. 212, Chakan", city: "Pune", state: "Maharashtra", tds: "194Q", paymentTerms: "Net 45",
      bankAccounts: [{ id: 1, bank: "Kotak Mahindra Bank", account: "6512339087", ifsc: "KKBK0001763", isDefault: true }],
    }),
    V({
      id: "VEN-004", name: "UltraBuild Cement Distributors", legalName: "UltraBuild Distributors Pvt Ltd", type: "Goods", categories: ["Cement & Aggregates"], tier: "Approved", group: "Material Suppliers › Cement",
      gstin: "27AACCU1180B1Z2", pan: "AACCU1180B", contact: { name: "Neha Joshi", email: "neha@ultrabuild.in", phone: "+91 97633 20018" },
      address: "Hadapsar Industrial Estate", city: "Pune", state: "Maharashtra", tds: "194Q",
      bankAccounts: [{ id: 1, bank: "ICICI Bank", account: "001205018833", ifsc: "ICIC0000012", isDefault: true }],
    }),
    V({
      id: "VEN-005", name: "Kaveri Manpower Services", legalName: "Kaveri Manpower Services", type: "Labor", isContractor: true, categories: ["Manpower Supply", "Masonry"], tier: "Approved", group: "Labour Contractors",
      gstin: "27ABZPK6621H1Z8", pan: "ABZPK6621H", contact: { name: "Vijay Kaveri", email: "vijay@kaverimanpower.com", phone: "+91 90110 44781" },
      address: "Sector 21, Nerul", city: "Navi Mumbai", state: "Maharashtra", tds: "194C-1", paymentTerms: "Net 15",
      bankAccounts: [{ id: 1, bank: "Bank of Baroda", account: "29880100012245", ifsc: "BARB0NERULX", isDefault: true }],
      insurance: [{ type: "Workmen Compensation", policy: "WC/2025/31190", insurer: "United India", cover: 10000000, expiry: D(18) }],
      docOver: { "Workmen Compensation Policy": doc("Workmen Compensation Policy", "Verified", 18) },
      contractor: { labourLicence: "CLRA/NMB/2025/2210", licenceExpiry: D(210), pfCode: "THVSH0021870000", esiCode: "34000219870001003", workforce: 120, experienceYrs: 7, pastProjects: "Metro Line 3 station finishing" },
      onboarding: { checklist: checklist(7), startedAt: D(-340) }, createdAt: D(-350),
    }),
    V({
      id: "VEN-006", name: "Rapid Scaffolding Solutions", legalName: "Rapid Scaffolding Solutions", type: "Services", isContractor: true, categories: ["Scaffolding", "Equipment Hire"], tier: "Transactional", status: "On Hold", group: "Specialist Subcontractors",
      gstin: "27AAPFR8812C1Z0", pan: "AAPFR8812C", contact: { name: "Deepak Rao", email: "ops@rapidscaffold.in", phone: "+91 98193 55120" },
      address: "Bhiwandi Logistics Park", city: "Bhiwandi", state: "Maharashtra", tds: "194C-2",
      hold: { scope: "Payments", until: D(20), reason: "Scorecard below threshold — safety CAP open", placedAt: D(-10), auto: true },
      bankAccounts: [{ id: 1, bank: "Yes Bank", account: "019863300001221", ifsc: "YESB0000198", isDefault: true }],
      insurance: [{ type: "Workmen Compensation", policy: "WC/2025/77110", insurer: "Tata AIG", cover: 5000000, expiry: D(120) }],
      contractor: { labourLicence: "CLRA/BHW/2024/0990", licenceExpiry: D(40), pfCode: "MHBHW0044551000", esiCode: "31000445510001009", workforce: 45, experienceYrs: 6, pastProjects: "" },
      onboarding: { checklist: checklist(7), startedAt: D(-520) }, createdAt: D(-520),
    }),
    V({
      id: "VEN-007", name: "Greenline Solar EPC", legalName: "Greenline Solar EPC Pvt Ltd", type: "Services", isContractor: true, categories: ["Solar EPC", "Electrical"], tier: "Preferred", status: "Pending Approval", regTier: "Prospective", group: "EPC Contractors › Solar",
      gstin: "29AAHCG5521L1ZQ", pan: "AAHCG5521L", contact: { name: "Kavya Reddy", email: "kavya@greenlinesolar.in", phone: "+91 96860 22314" },
      address: "Whitefield Main Road", city: "Bengaluru", state: "Karnataka", tds: "194C-2",
      approval: { stages: stages(1) }, background: { credit: "B+", litigation: "Clear", watchlist: "Clear", checkedAt: D(-6) },
      docOver: { "HSE / Safety Plan": doc("HSE / Safety Plan", "Pending", null, -5) },
      bankAccounts: [{ id: 1, bank: "HDFC Bank", account: "50200077120045", ifsc: "HDFC0000521", isDefault: true }],
      contractor: { labourLicence: "CLRA/BLR/2026/0311", licenceExpiry: D(330), pfCode: "KNBNG0077210000", esiCode: "53000772100001001", workforce: 80, experienceYrs: 5, pastProjects: "20 MW Pavagada block" },
      onboarding: { checklist: checklist(0), startedAt: D(-9) }, createdAt: D(-9),
      qualification: { ruleSet: "Contractor — High value", score: 72, answers: { years: 5, turnover: 18, iso: "Yes", litigation: "No", workforce: 80, clra: "Yes", lti: 2, hse: "Yes" } },
    }),
    V({
      id: "VEN-008", name: "Metro Waterproofing Co.", legalName: "Metro Waterproofing Company", type: "Labor", isContractor: true, categories: ["Waterproofing"], tier: "Transactional", status: "Draft", regTier: "Prospective", group: "Specialist Subcontractors",
      gstin: "27AAEFM3345P1Z6", pan: "AAEFM3345P", contact: { name: "Anil Gupta", email: "anil@metrowp.in", phone: "+91 98670 88142" },
      address: "Andheri East", city: "Mumbai", state: "Maharashtra", tds: "194C-2", approval: { stages: stages(0) },
      docOver: {
        "Labour Licence (CLRA)": { name: "Labour Licence (CLRA)", status: "Missing", expiry: null },
        "ESI Registration": { name: "ESI Registration", status: "Missing", expiry: null },
        "Workmen Compensation Policy": doc("Workmen Compensation Policy", "Pending", 300, -2),
      },
      contractor: { labourLicence: "", licenceExpiry: "", pfCode: "MHBAN0112340000", esiCode: "", workforce: 30, experienceYrs: 9, pastProjects: "Oberoi Esquire basement" },
      onboarding: { checklist: checklist(0), startedAt: D(-3) }, createdAt: D(-3),
    }),
    V({
      id: "VEN-009", name: "National Hardware Mart", legalName: "National Hardware Mart", type: "Goods", categories: ["Hardware"], tier: "Transactional", status: "Blacklisted", group: "Material Suppliers › General",
      gstin: "27AAIFN2201E1ZK", pan: "AAIFN2201E", contact: { name: "P. Shah", email: "nhm@gmail.com", phone: "+91 90040 11223" },
      address: "Lohar Chawl", city: "Mumbai", state: "Maharashtra", tds: "194Q", notes: [{ at: D(-120), by: "M. Iyer", text: "Blacklisted — duplicate invoicing on PO-2025-118 (audit ref AUD/25/14)." }],
    }),
    V({
      id: "VEN-010", name: "Sai Earthmovers", legalName: "Sai Earthmovers & Infra", type: "Services", isContractor: true, categories: ["Excavation", "Equipment Hire"], tier: "Approved", group: "Specialist Subcontractors",
      gstin: "27AAQFS9981D1Z1", pan: "AAQFS9981D", contact: { name: "Sachin Jadhav", email: "sachin@saiearth.in", phone: "+91 97300 66512" },
      address: "Wagholi", city: "Pune", state: "Maharashtra", tds: "194C-2",
      bankAccounts: [{ id: 1, bank: "Canara Bank", account: "2211101044587", ifsc: "CNRB0002211", isDefault: true }],
      docOver: { "Workmen Compensation Policy": doc("Workmen Compensation Policy", "Verified", -6) },
      insurance: [{ type: "Workmen Compensation", policy: "WC/2025/12009", insurer: "Oriental Insurance", cover: 7500000, expiry: D(-6) }],
      contractor: { labourLicence: "CLRA/PUN/2025/1702", licenceExpiry: D(190), pfCode: "PUPUN2211870000", esiCode: "33002218700001004", workforce: 55, experienceYrs: 9, pastProjects: "Hinjewadi Phase 3 roads" },
      onboarding: { checklist: checklist(7), startedAt: D(-150) }, createdAt: D(-150),
    }),
    V({
      id: "VEN-011", name: "Konkan Steel & Alloys", legalName: "Konkan Steel & Alloys Pvt Ltd", type: "Goods", categories: ["Steel"], tier: "Approved", group: "Material Suppliers › Steel",
      gstin: "27AAECK5510G1ZB", pan: "AAECK5510G", contact: { name: "Rahul Sawant", email: "rahul@konkansteel.com", phone: "+91 98905 30011" },
      address: "Taloja MIDC", city: "Navi Mumbai", state: "Maharashtra", tds: "194Q",
      bankAccounts: [{ id: 1, bank: "IDFC First Bank", account: "10033488122", ifsc: "IDFB0040101", isDefault: true }],
    }),
    V({
      id: "VEN-012", name: "Pioneer Cement & Aggregates", legalName: "Pioneer Cement & Aggregates", type: "Goods", categories: ["Cement & Aggregates"], tier: "Approved", group: "Material Suppliers › Cement",
      gstin: "27AAJFP7760M1Z4", pan: "AAJFP7760M", contact: { name: "Farhan Khan", email: "farhan@pioneeragg.in", phone: "+91 99201 44870" },
      address: "Panvel", city: "Raigad", state: "Maharashtra", tds: "194Q",
      bankAccounts: [{ id: 1, bank: "Union Bank of India", account: "560101000912", ifsc: "UBIN0556017", isDefault: true }],
    }),
    V({
      id: "VEN-013", name: "Hilti Tools India", legalName: "Hilti India Pvt Ltd", type: "Goods", categories: ["Hardware", "Equipment Hire"], tier: "Preferred", currency: "INR", group: "Material Suppliers › General",
      parentCompany: "", gstin: "07AAACH2241F1ZX", pan: "AAACH2241F", contact: { name: "Key Accounts", email: "keyaccounts@hilti.in", phone: "+91 11 4270 1111" },
      address: "Mathura Road", city: "New Delhi", state: "Delhi", tds: "194Q", paymentTerms: "Net 45",
      bankAccounts: [{ id: 1, bank: "Citibank", account: "0102441180", ifsc: "CITI0000002", isDefault: true }],
    }),
  ];
  // Keep every vendor's timeline realistic: approvals happen after registration (1–2 days apart, never in the future)
  // and each qualification carries the date it was assessed.
  vendors.forEach((v) => {
    const created = new Date(v.createdAt).getTime(), now = Date.now();
    let prev = created;
    (v.approval?.stages || []).forEach((s) => {
      if (!s.at) return;
      let t = new Date(s.at).getTime();
      if (t <= prev) { const day = new Date(prev + (1 + (v.id.charCodeAt(v.id.length - 1) % 2)) * DAY); day.setHours(10 + (s.dept || "").length % 6, 30, 0, 0); t = day.getTime(); }
      if (t > now) t = now - 3600 * 1000;
      s.at = new Date(t).toISOString(); prev = t;
    });
    if (v.qualification && !v.qualification.at) {
      const first = (v.approval?.stages || []).find((s) => s.at);
      v.qualification.at = (first ? first.at : new Date(Math.min(now, created + 2 * DAY)).toISOString()).slice(0, 10);
    }
  });
  vendors.find((v) => v.id === "VEN-009").docs = vendors.find((v) => v.id === "VEN-009").docs.map((d, i) => (i === 1 ? { ...d, status: "Rejected" } : d));

  // ---------------------------------------------------- contracts
  const contracts = [
    { id: "CTR-001", vendorId: "VEN-001", project: PROJECTS[0], title: "Civil & structural works — Towers A & B", type: "Item-Rate", value: 48500000, start: D(-200), end: D(165), retentionPct: 5, advancePct: 10, advanceAmount: 4850000, advanceRecoveryPct: 10, cessPct: 1, gstPct: 18, dlpMonths: 12, ldPctPerWeek: 0.5, ldCapPct: 5, status: "Active", owner: "Arjun Mehta", signedOn: D(-205), bgNo: "BG/HDFC/2026/1182", bgExpiry: D(210),
      changeOrders: [
        { id: "CO-001", desc: "Additional podium slab area (Tower A)", amount: 1850000, days: 20, status: "Approved", raisedOn: D(-80), reason: "Client revision R3 to podium layout" },
        { id: "CO-002", desc: "Rebar grade change Fe500 → Fe500D", amount: 620000, days: 0, status: "Pending", raisedOn: D(-6), reason: "Structural consultant instruction SCI-044" },
      ] },
    { id: "CTR-002", vendorId: "VEN-002", project: PROJECTS[2], title: "Tower erection & stringing — Package 2", type: "Lump Sum", value: 32000000, start: D(-150), end: D(130), retentionPct: 5, advancePct: 5, advanceAmount: 1600000, advanceRecoveryPct: 5, cessPct: 1, gstPct: 18, dlpMonths: 12, ldPctPerWeek: 0.5, ldCapPct: 10, status: "Active", owner: "Rahul Verma", signedOn: D(-155), bgNo: "BG/AXIS/2026/0421", bgExpiry: D(70), changeOrders: [] },
    { id: "CTR-003", vendorId: "VEN-005", project: PROJECTS[1], title: "Manpower supply — rate contract (Stations 3–5)", type: "Rate Contract", value: 6000000, start: D(-330), end: D(60), retentionPct: 0, advancePct: 0, advanceAmount: 0, advanceRecoveryPct: 0, cessPct: 1, gstPct: 18, dlpMonths: 0, ldPctPerWeek: 0, ldCapPct: 0, status: "Active", owner: "Priya Nair", signedOn: D(-332), changeOrders: [] },
    { id: "CTR-004", vendorId: "VEN-010", project: PROJECTS[3], title: "Bulk excavation & backfilling — Blocks B/C", type: "Item-Rate", value: 9500000, start: D(-90), end: D(120), retentionPct: 5, advancePct: 0, advanceAmount: 0, advanceRecoveryPct: 0, cessPct: 1, gstPct: 18, dlpMonths: 6, ldPctPerWeek: 0.5, ldCapPct: 5, status: "Active", owner: "Sneha Iyer", signedOn: D(-92), changeOrders: [] },
    { id: "CTR-005", vendorId: "VEN-006", project: PROJECTS[0], title: "Scaffolding hire & erection — Tower A", type: "Item-Rate", value: 3800000, start: D(-500), end: D(-200), retentionPct: 5, advancePct: 0, advanceAmount: 0, advanceRecoveryPct: 0, cessPct: 1, gstPct: 18, dlpMonths: 6, ldPctPerWeek: 0, ldCapPct: 0, status: "Active", owner: "Arjun Mehta", signedOn: D(-505), changeOrders: [] },
    { id: "CTR-006", vendorId: "VEN-007", project: PROJECTS[4], title: "33kV switchyard & inverter station EPC", type: "Lump Sum", value: 21000000, start: D(20), end: D(260), retentionPct: 5, advancePct: 10, advanceAmount: 2100000, advanceRecoveryPct: 10, cessPct: 1, gstPct: 18, dlpMonths: 12, ldPctPerWeek: 0.5, ldCapPct: 10, status: "Draft", owner: "Karan Shah", changeOrders: [] },
  ];

  // ---------------------------------------------------- work orders
  const it = (id, code, desc, unit, qty, rate) => ({ id, code, desc, unit, qty, rate });
  const workOrders = [
    { id: "WO-001", contractId: "CTR-001", vendorId: "VEN-001", project: PROJECTS[0], title: "Tower A — substructure & superstructure up to L5", type: "Item-Rate", location: "Tower A", start: D(-190), end: D(120), status: "In Progress", issuedOn: D(-192),
      items: [it("A1", "2.1", "PCC M15 in foundations", "cum", 420, 5850), it("A2", "3.4", "RCC M30 in raft, columns & slabs", "cum", 1650, 7450), it("A3", "4.1", "Reinforcement Fe500D — cut, bend & place (labour only)", "MT", 210, 9800), it("A4", "5.2", "Formwork / shuttering for slabs, beams & columns", "sqm", 9800, 610), it("A5", "6.1", "Brick masonry 230 mm in CM 1:6", "cum", 780, 6150)] },
    { id: "WO-002", contractId: "CTR-001", vendorId: "VEN-001", project: PROJECTS[0], title: "Tower B — foundations", type: "Item-Rate", location: "Tower B", start: D(-25), end: D(95), status: "Issued", issuedOn: D(-28),
      items: [it("B1", "2.1", "PCC M15 in foundations", "cum", 300, 5850), it("B2", "3.4", "RCC M30 in raft & pedestals", "cum", 900, 7450), it("B3", "4.1", "Reinforcement Fe500D — cut, bend & place (labour only)", "MT", 110, 9800)] },
    { id: "WO-003", contractId: "CTR-002", vendorId: "VEN-002", project: PROJECTS[2], title: "Erection & stringing — Section 1 (AP 1–18)", type: "Lump Sum", location: "AP 1 – AP 18", start: D(-145), end: D(120), status: "In Progress", issuedOn: D(-147), lumpSum: 18500000,
      milestones: [
        { id: "M1", name: "Mobilisation & check survey", weight: 5 },
        { id: "M2", name: "Stub setting & foundation handover", weight: 15 },
        { id: "M3", name: "Tower erection (18 towers)", weight: 40 },
        { id: "M4", name: "Stringing & sagging", weight: 30 },
        { id: "M5", name: "Testing & commissioning", weight: 10 },
      ] },
    { id: "WO-004", contractId: "CTR-004", vendorId: "VEN-010", project: PROJECTS[3], title: "Bulk excavation & backfill — Block C", type: "Item-Rate", location: "Block C", start: D(-85), end: D(110), status: "In Progress", issuedOn: D(-86),
      items: [it("C1", "1.1", "Excavation in ordinary soil up to 3 m", "cum", 18000, 185), it("C2", "1.3", "Excavation in hard rock (controlled blasting)", "cum", 2400, 640), it("C3", "1.6", "Backfilling with approved excavated earth", "cum", 9500, 145), it("C4", "1.8", "Disposal of surplus earth within 5 km lead", "cum", 8000, 120)] },
    { id: "WO-005", contractId: "CTR-003", vendorId: "VEN-005", project: PROJECTS[1], title: "Manpower supply — Station 4 finishing", type: "Item-Rate", location: "Station 4", start: D(-120), end: D(60), status: "In Progress", issuedOn: D(-121),
      items: [it("L1", "MP-1", "Skilled mason (8-hr man-day)", "man-day", 1100, 950), it("L2", "MP-2", "Helper / unskilled (8-hr man-day)", "man-day", 1500, 640), it("L3", "MP-3", "Carpenter (8-hr man-day)", "man-day", 350, 980)] },
    { id: "WO-006", contractId: "CTR-005", vendorId: "VEN-006", project: PROJECTS[0], title: "Scaffolding hire & erection — Tower A core", type: "Item-Rate", location: "Tower A", start: D(-495), end: D(-205), status: "Completed", issuedOn: D(-497),
      items: [it("S1", "SC-1", "Erection & dismantling of cuplock scaffold", "sqm", 12000, 95), it("S2", "SC-2", "Scaffold hire charges", "sqm-month", 36000, 22)] },
  ];

  // ---------------------------------------------------- measurement book
  let mbN = 0;
  const MB = (woId, lineId, date, location, dims, jms = "Signed", extra = {}) => {
    mbN += 1;
    const [nos, l, b, d] = dims.qty === undefined ? dims : [null, null, null, null];
    const qty = dims.qty !== undefined ? dims.qty : round2((nos || 1) * (l || 1) * (b || 1) * (d || 1));
    return {
      id: `MB-${String(mbN).padStart(3, "0")}`, woId, lineId, date: D(date), location, nos: nos ?? null, l: l ?? null, b: b ?? null, d: d ?? null, qty, pct: dims.pct ?? null,
      recordedBy: "Site Engineer — " + (woId === "WO-003" ? "V. Pillai" : woId === "WO-004" ? "S. Kale" : woId === "WO-005" ? "N. Bhat" : "A. Joshi"),
      jms: jms === "Signed" ? { status: "Signed", contractorRep: "Contractor rep.", engineer: "Site Engineer", at: ts(date + 1) } : jms === "Disputed" ? { status: "Disputed", remark: extra.remark || "", at: ts(date + 1) } : { status: "Pending" },
      remarks: extra.remarks || "",
    };
  };
  const P = (pct) => ({ qty: 0, pct });
  const Q = (qty) => ({ qty });
  const measurements = [
    // WO-001 · RA-1
    MB("WO-001", "A1", -170, "Raft PCC grid A1–A6", [1, 42, 18, 0.15]),
    MB("WO-001", "A1", -165, "Raft PCC grid B1–B6", [1, 40, 18, 0.15]),
    MB("WO-001", "A2", -150, "Raft pour 1", [1, 42, 18, 1.2]),
    MB("WO-001", "A3", -150, "Raft reinforcement (as per BBS-01)", Q(72.5)),
    MB("WO-001", "A4", -148, "Raft edge shuttering", [1, 120, 1.2, null]),
    // RA-2
    MB("WO-001", "A2", -110, "Columns L0–L2 (48 nos 600×600)", [48, 0.6, 0.6, 7.2]),
    MB("WO-001", "A2", -95, "Slab L1", [1, 42, 18, 0.2]),
    MB("WO-001", "A3", -95, "Reinforcement L0–L2 (BBS-04/05)", Q(38.6)),
    MB("WO-001", "A4", -95, "Slab L1 shuttering", [1, 42, 18, null]),
    MB("WO-001", "A4", -110, "Column shuttering L0–L2", [48, 2.4, 7.2, null]),
    // RA-3
    MB("WO-001", "A2", -60, "Slab L2", [1, 42, 18, 0.2]),
    MB("WO-001", "A2", -55, "Columns L2–L4", [48, 0.6, 0.6, 7.2]),
    MB("WO-001", "A3", -55, "Reinforcement L2–L4 (BBS-07)", Q(41.2)),
    MB("WO-001", "A4", -55, "Slab L2 shuttering", [1, 42, 18, null]),
    MB("WO-001", "A5", -40, "Masonry L1 external walls", [1, 110, 0.23, 3.0]),
    // unbilled
    MB("WO-001", "A2", -12, "Slab L3", [1, 42, 18, 0.2], "Pending"),
    MB("WO-001", "A5", -8, "Masonry L2 external walls", [1, 110, 0.23, 3.0], "Pending"),
    MB("WO-001", "A4", -12, "Slab L3 shuttering", [1, 42, 18, null], "Disputed", { remark: "Contractor claims 790 sqm incl. drop beams; engineer measured 756 sqm." }),
    // WO-003 (lump sum, cumulative % per milestone)
    MB("WO-003", "M1", -140, "Mobilisation complete, survey report accepted", P(100)),
    MB("WO-003", "M2", -100, "All 18 stubs set & handed over", P(100)),
    MB("WO-003", "M3", -60, "7 of 18 towers erected", P(40)),
    MB("WO-003", "M3", -15, "12 of 18 towers erected", P(65)),
    MB("WO-003", "M4", -7, "Stringing AP 1–4 (conductor)", P(10), "Pending"),
    // WO-004
    MB("WO-004", "C1", -60, "Block C grid 1–6", [1, 60, 40, 2.5]),
    MB("WO-004", "C2", -55, "Block C rock zone R1", [1, 20, 15, 2]),
    MB("WO-004", "C1", -20, "Block C grid 7–12", [1, 55, 40, 2.5]),
    MB("WO-004", "C3", -6, "Backfill around footings F1–F24", [1, 60, 40, 1.2], "Pending"),
    // WO-005 (man-days from approved muster rolls)
    MB("WO-005", "L1", -35, "Muster roll — August", Q(640)),
    MB("WO-005", "L2", -35, "Muster roll — August", Q(980)),
    MB("WO-005", "L3", -35, "Muster roll — August", Q(210)),
    MB("WO-005", "L1", -4, "Muster roll — September (to date)", Q(560), "Pending"),
    // WO-006
    MB("WO-006", "S1", -300, "Core wall scaffold — full height", Q(12000)),
    MB("WO-006", "S2", -210, "Hire Feb–Jul (6 months × 6,000 sqm)", Q(36000)),
  ];
  for (const m of measurements) if (m.pct !== null) m.qty = 0;

  // ---------------------------------------------------- RA bills (computed)
  const st = { vendors, contracts, workOrders, measurements, raBills: [], retentionReleases: [] };
  const hist = (upto, dayStart) =>
    RA_FLOW.slice(0, upto).map((f, i) => ({ status: f.status, by: ["Site team", "A. Joshi", "K. Rao (QS)", "Arjun Mehta", "Accounts"][i], at: ts(dayStart + i * 3), remark: "" }));
  const mkBill = (woId, seq, mbIds, date, status, manual = {}) => {
    const wo = byId(workOrders, woId);
    const calc = computeRABill(st, woId, mbIds, manual);
    const upto = RA_FLOW.findIndex((f) => f.status === status) + 1;
    const bill = {
      id: `RA-${String(st.raBills.length + 1).padStart(3, "0")}`, woId, contractId: wo.contractId, vendorId: wo.vendorId, seq, date: D(date),
      periodFrom: D(date - 30), periodTo: D(date), mbIds, manual, ...calc, status, history: hist(upto, date),
    };
    st.raBills.push(bill);
    return bill;
  };
  const ids = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => `MB-${String(from + i).padStart(3, "0")}`);
  mkBill("WO-001", 1, ids(1, 5), -140, "Paid");
  mkBill("WO-001", 2, ids(6, 10), -88, "Paid", { materials: 125000 });
  mkBill("WO-001", 3, ids(11, 15), -30, "Verified", { penalty: 15000, otherNote: "Housekeeping / PPE non-compliance (SNC-12)" });
  mkBill("WO-003", 1, ids(19, 20), -95, "Paid");
  mkBill("WO-003", 2, ids(21, 21), -50, "Approved");
  mkBill("WO-004", 1, ids(24, 25), -45, "Paid");
  mkBill("WO-005", 1, ids(28, 30), -30, "Certified");
  mkBill("WO-006", 1, ids(32, 33), -200, "Paid");
  for (const b of st.raBills) for (const id of b.mbIds) byId(measurements, id).billedIn = b.id;

  // ---------------------------------------------------- retention releases
  const retentionReleases = [
    { id: "RR-001", contractId: "CTR-005", amount: round2(st.raBills.find((b) => b.woId === "WO-006").ded.retention), type: "After DLP", status: "Due", requestedOn: D(-2), note: "DLP ended — no defects reported" },
  ];

  // ---------------------------------------------------- invoices from RA bills
  const invoices = [];
  let invN = 0, payN = 0;
  const pay = (amount, date, mode = "NEFT", tds = 0) => ({ id: `PAY-${String(++payN).padStart(3, "0")}`, date: D(date), amount: round2(amount), tds: round2(tds), mode, ref: "UTR" + (Math.abs(date) * 7919 + payN * 131).toString().padStart(10, "0") });
  for (const b of st.raBills.filter((x) => ["Approved", "Paid"].includes(x.status))) {
    const v = byId(vendors, b.vendorId);
    const due = shiftDays(parseInt(v.paymentTerms.replace(/\D/g, ""), 10) || 30, b.date);
    const inv = {
      id: `INV-${String(++invN).padStart(3, "0")}`, vendorId: b.vendorId, source: "RA Bill", raBillId: b.id, number: `${b.id}/${b.woId}`, date: b.date, due: b.status === "Approved" ? D(-3) : due,
      lines: [], amount: b.net, gstPct: 0, hold: null, notes: [], payments: b.status === "Paid" ? [pay(b.net, (new Date(b.date) - Date.now()) / DAY + 20 | 0, "RTGS")] : [],
    };
    b.invoiceId = inv.id;
    invoices.push(inv);
  }

  // ---------------------------------------------------- RFQs
  const rfqs = [
    { id: "RFQ-001", title: "TMT steel Fe500D — 120 MT", project: PROJECTS[0], mode: "Call for Tenders", status: "Quotes Received", createdOn: D(-12), dueDate: D(4), template: "Steel supply",
      items: [{ desc: "TMT Fe500D 12 mm", unit: "MT", qty: 60 }, { desc: "TMT Fe500D 16 mm", unit: "MT", qty: 60 }],
      vendorIds: ["VEN-003", "VEN-011"], weights: { price: 60, quality: 25, delivery: 15 },
      quotes: [
        { vendorId: "VEN-003", rates: [58400, 57900], currency: "INR", fx: 1, deliveryDays: 7, validUntil: D(9), submittedOn: D(-4), note: "Ex-Chakan, incl. loading" },
        { vendorId: "VEN-011", rates: [57800, 57300], currency: "INR", fx: 1, deliveryDays: 12, validUntil: D(21), submittedOn: D(-3), note: "Mill test certificates with each lot" },
      ],
      negotiation: [
        { at: ts(-3), vendorId: "VEN-003", by: "Procurement", text: "Requested ₹500/MT reduction to match L1.", amount: null },
        { at: ts(-2), vendorId: "VEN-003", by: "Deccan Steel Traders", from: "vendor", text: "Counter-offer: ₹58,100 / ₹57,600 with 7-day delivery.", amount: null },
      ], awardedTo: null },
    { id: "RFQ-002", title: "OPC 53 grade cement — 4,000 bags", project: PROJECTS[3], mode: "Call for Tenders", status: "Awarded", createdOn: D(-45), dueDate: D(-38), template: "Cement supply",
      items: [{ desc: "OPC 53 grade cement (50 kg bag)", unit: "bag", qty: 4000 }], vendorIds: ["VEN-004", "VEN-012"], weights: { price: 50, quality: 30, delivery: 20 },
      quotes: [
        { vendorId: "VEN-004", rates: [385], currency: "INR", fx: 1, deliveryDays: 5, validUntil: D(-20), submittedOn: D(-40), note: "" },
        { vendorId: "VEN-012", rates: [372], currency: "INR", fx: 1, deliveryDays: 11, validUntil: D(-20), submittedOn: D(-39), note: "Part deliveries only" },
      ], negotiation: [], awardedTo: "VEN-004", poId: "PO-002" },
    { id: "RFQ-003", title: "Anchor fasteners & chemical anchors", project: PROJECTS[1], mode: "Single Vendor", status: "Draft", createdOn: D(-1), dueDate: D(6), template: "Hardware",
      items: [{ desc: "Chemical anchor HIT-RE 500 (500 ml)", unit: "nos", qty: 240 }, { desc: "Wedge anchor M12×110", unit: "nos", qty: 3000 }],
      vendorIds: ["VEN-013"], weights: { price: 60, quality: 25, delivery: 15 }, quotes: [], negotiation: [], awardedTo: null },
  ];

  // ---------------------------------------------------- purchase orders
  const purchaseOrders = [
    { id: "PO-001", vendorId: "VEN-003", project: PROJECTS[0], date: D(-70), deliveryDate: D(-50), status: "Issued", billingPolicy: "On received quantity", tolerance: 2, rfqId: null,
      lines: [{ desc: "TMT Fe500D 12 mm", unit: "MT", qty: 40, rate: 58000 }, { desc: "TMT Fe500D 16 mm", unit: "MT", qty: 40, rate: 57500 }],
      receipts: [
        { id: "GRN-001", date: D(-52), qc: "Passed", lines: [{ line: 0, qty: 40, accepted: 40 }, { line: 1, qty: 20, accepted: 20 }] },
        { id: "GRN-002", date: D(-41), qc: "Passed with remarks", lines: [{ line: 1, qty: 8, accepted: 7 }] },
      ],
      revisions: [{ rev: 0, at: ts(-70), by: "Procurement", note: "PO issued" }, { rev: 1, at: ts(-48), by: "Procurement", note: "Delivery date for 16 mm extended by 15 days (vendor request)" }] },
    { id: "PO-002", vendorId: "VEN-004", project: PROJECTS[3], date: D(-36), deliveryDate: D(-28), status: "Issued", billingPolicy: "On received quantity", tolerance: 0, rfqId: "RFQ-002",
      lines: [{ desc: "OPC 53 grade cement (50 kg bag)", unit: "bag", qty: 4000, rate: 385 }],
      receipts: [{ id: "GRN-003", date: D(-30), qc: "Partially rejected", lines: [{ line: 0, qty: 4000, accepted: 3960 }] }],
      revisions: [{ rev: 0, at: ts(-36), by: "Procurement", note: "PO issued from RFQ-002 award" }] },
    { id: "PO-003", vendorId: "VEN-012", project: PROJECTS[1], date: D(-5), deliveryDate: D(10), status: "Issued", billingPolicy: "On received quantity", tolerance: 3, rfqId: null,
      lines: [{ desc: "Manufactured sand (M-sand)", unit: "cum", qty: 600, rate: 1450 }, { desc: "20 mm coarse aggregate", unit: "cum", qty: 800, rate: 1380 }],
      receipts: [], revisions: [{ rev: 0, at: ts(-5), by: "Procurement", note: "PO issued" }] },
  ];

  invoices.push(
    { id: `INV-${String(++invN).padStart(3, "0")}`, vendorId: "VEN-003", source: "Purchase Order", poId: "PO-001", number: "DST/26-27/0412", date: D(-50), due: D(-5), gstPct: 18, hold: null, notes: [],
      lines: [{ line: 0, qty: 40, rate: 58000 }], payments: [] },
    { id: `INV-${String(++invN).padStart(3, "0")}`, vendorId: "VEN-003", source: "Purchase Order", poId: "PO-001", number: "DST/26-27/0498", date: D(-40), due: D(5), gstPct: 18, hold: { reason: "Price mismatch", note: "Invoiced ₹57,900/MT vs PO ₹57,500/MT", at: ts(-38) }, notes: [],
      lines: [{ line: 1, qty: 27, rate: 57900 }], payments: [] },
    { id: `INV-${String(++invN).padStart(3, "0")}`, vendorId: "VEN-004", source: "Purchase Order", poId: "PO-002", number: "UBD/1187", date: D(-29), due: D(1), gstPct: 18, hold: null,
      notes: [{ id: "DN-001", type: "Debit Note", amount: round2(40 * 385 * 1.18), reason: "40 bags rejected (lumps / moisture) — returned to vendor (RTV-001)", date: D(-28) }],
      lines: [{ line: 0, qty: 4000, rate: 385 }], payments: [] }
  );
  // first steel invoice was paid in full with 194Q TDS
  {
    const inv = invoices.find((i) => i.number === "DST/26-27/0412");
    const t = invoiceTotals(inv), tds = round2((40 * 58000 * tdsRate("194Q")) / 100);
    inv.payments.push(pay(t.payable - tds, -8, "NEFT", tds));
  }

  // ---------------------------------------------------- labour rate cards
  const LR = (id, trade, skill, region, minWage, rate, vendorId = null, status = "Active", from = -170, version = 1, extra = {}) => ({
    id, trade, skill, region, minWage, rate, otMultiplier: 2, basis: "Per 8-hr man-day", vendorId, effectiveFrom: D(from), effectiveTo: null, status, version, ...extra,
  });
  const laborRates = [
    LR("LR-001", "Helper / Unskilled", "Unskilled", "Mumbai (Zone I)", 560, 640),
    LR("LR-002", "Mason", "Skilled", "Mumbai (Zone I)", 720, 950),
    LR("LR-003", "Carpenter / Shuttering", "Skilled", "Mumbai (Zone I)", 720, 980),
    LR("LR-004", "Bar Bender", "Skilled", "Mumbai (Zone I)", 720, 960),
    LR("LR-005", "Electrician", "Highly Skilled", "Mumbai (Zone I)", 810, 1180),
    LR("LR-006", "Welder", "Skilled", "Mumbai (Zone I)", 720, 1050),
    LR("LR-007", "Scaffolder", "Semi-skilled", "Mumbai (Zone I)", 640, 820),
    LR("LR-008", "Machine Operator", "Highly Skilled", "Pune (Zone II)", 770, 1250),
    LR("LR-009", "Helper / Unskilled", "Unskilled", "Pune (Zone II)", 530, 600),
    LR("LR-010", "Mason", "Skilled", "Pune (Zone II)", 690, 900),
    LR("LR-011", "Rigger / Lineman", "Semi-skilled", "Nashik (Zone III)", 600, 780),
    LR("LR-012", "Tower Fitter", "Skilled", "Nashik (Zone III)", 660, 920),
    // Vendor-specific (Kaveri Manpower) — one below minimum wage to trigger the compliance flag
    LR("LR-013", "Mason", "Skilled", "Mumbai (Zone I)", 720, 950, "VEN-005"),
    LR("LR-014", "Helper / Unskilled", "Unskilled", "Mumbai (Zone I)", 560, 640, "VEN-005"),
    LR("LR-015", "Carpenter / Shuttering", "Skilled", "Mumbai (Zone I)", 720, 980, "VEN-005"),
    LR("LR-016", "Painter", "Semi-skilled", "Mumbai (Zone I)", 640, 620, "VEN-005"),
    // Superseded history + pending VDA revision
    LR("LR-017", "Helper / Unskilled", "Unskilled", "Mumbai (Zone I)", 525, 600, null, "Superseded", -540, 0, { effectiveTo: D(-171) }),
    LR("LR-018", "Mason", "Skilled", "Mumbai (Zone I)", 680, 900, null, "Superseded", -540, 0, { effectiveTo: D(-171) }),
    LR("LR-019", "Helper / Unskilled", "Unskilled", "Mumbai (Zone I)", 590, 675, null, "Pending Approval", 4, 2, { reason: "VDA revision notified w.e.f. 1 Oct" }),
    LR("LR-020", "Mason", "Skilled", "Mumbai (Zone I)", 755, 995, null, "Pending Approval", 4, 2, { reason: "VDA revision notified w.e.f. 1 Oct" }),
  ];

  // ---------------------------------------------------- performance ratings, CAPs
  const RT = (vendorId, woId, period, quality, safety, manpower, remarks, incidents = 0) => ({ id: `RT-${Math.random().toString(36).slice(2, 7)}`, vendorId, woId, period, quality, safety, manpower, incidents, remarks, by: "Project Manager", at: D(-10) });
  const ratings = [
    RT("VEN-001", "WO-001", "Jul 2026", 4, 4, 5, "Good concrete finish; cube results all passing."),
    RT("VEN-001", "WO-001", "Aug 2026", 4, 5, 4, "Slab cycle at 9 days vs 8 planned."),
    RT("VEN-002", "WO-003", "Aug 2026", 4, 4, 4, "Erection gangs adequate; stringing mobilisation slow."),
    RT("VEN-005", "WO-005", "Aug 2026", 3, 4, 3, "Attendance shortfall of ~12% on weekends."),
    RT("VEN-006", "WO-006", "Jun 2026", 3, 2, 3, "Missing toe boards; 2 near-miss reports.", 2),
    RT("VEN-006", "WO-006", "Jul 2026", 2, 2, 3, "Scaffold tag system not followed.", 1),
    RT("VEN-010", "WO-004", "Aug 2026", 4, 3, 4, "Dust suppression inadequate on dry days."),
  ];
  const caps = [
    { id: "CAP-001", vendorId: "VEN-006", issue: "Repeated scaffold safety violations (toe boards, guard rails, tagging)", actions: "Re-train scaffold crew; appoint certified scaffold inspector; weekly tag audit.", issuedOn: D(-10), dueDate: D(11), status: "Open", owner: "HSE — Rohit S." },
    { id: "CAP-002", vendorId: "VEN-005", issue: "Weekend manpower shortfall against deployment plan", actions: "Maintain 10% buffer pool; share daily deployment by 9 AM.", issuedOn: D(-40), dueDate: D(-10), status: "Closed", owner: "Priya Nair" },
  ];

  const tickets = [
    { id: "TKT-001", vendorId: "VEN-003", subject: "Payment held on invoice DST/26-27/0498", body: "Rate revision was agreed over phone on 12 Aug; please release.", status: "Open", raisedOn: D(-6), replies: [] },
    { id: "TKT-002", vendorId: "VEN-001", subject: "RA-3 measurement dispute — Slab L3 shuttering", body: "Drop beam sides not captured in MB-018.", status: "In Review", raisedOn: D(-9), replies: [{ at: ts(-7), by: "A. Joshi", text: "Joint re-measurement scheduled." }] },
  ];

  const audit = [
    { at: ts(-2), by: "A. Joshi", entity: "Measurement", id: "MB-018", action: "JMS disputed by contractor" },
    { at: ts(-10), by: "System", entity: "Vendor", id: "VEN-006", action: "Auto-hold (payments) — score below threshold" },
    { at: ts(-30), by: "A. Joshi", entity: "RA Bill", id: "RA-003", action: "Verified at site" },
    { at: ts(-9), by: "Procurement", entity: "Vendor", id: "VEN-007", action: "Registration submitted for approval" },
  ];

  return extendSeed3(extendSeed2(extendSeed({
    version: SEED_VERSION, vendors, contracts, workOrders, measurements, raBills: st.raBills, retentionReleases, invoices, rfqs, purchaseOrders,
    laborRates, ratings, caps, tickets, audit,
    scoreConfig: { weights: { quality: 30, timeliness: 30, safety: 20, compliance: 20 }, blockThreshold: 55, capThreshold: 70, autoBlock: true, weighting: "Weighted average", period: { length: "Monthly", start: `${new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1}-04-01` },
      criteria: [{ name: "Quality", formula: "{quality}", maxScore: 100, weight: 30 }, { name: "On-time delivery", formula: "{timeliness}", maxScore: 100, weight: 30 }, { name: "Safety", formula: "{safety}", maxScore: 100, weight: 20 }, { name: "Compliance", formula: "{compliance}", maxScore: 100, weight: 20 }] },
    rfqTemplates: ["Steel supply", "Cement supply", "Hardware", "Labour — item rate", "Equipment hire"],
  })));
}
