// Seed data for the lifecycle additions: category and standard-rate masters, a direct award
// waiting for approval, integration connectors with a short sync log.

function extendSeed3(s) {
  const D = (n) => shiftDays(n);
  const ts = (n) => new Date(Date.now() + n * DAY).toISOString();
  s.categoryMaster = CATEGORY_DEFAULTS();
  s.rateMaster = [
    { id: "SR-001", item: "TMT Fe500D 12 mm", unit: "MT", category: "Steel", rate: 57000, tolerancePct: 3, validFrom: D(-120), validTo: D(245), source: "Budget", status: "Active" },
    { id: "SR-002", item: "TMT Fe500D 16 mm", unit: "MT", category: "Steel", rate: 56500, tolerancePct: 3, validFrom: D(-120), validTo: D(245), source: "Budget", status: "Active" },
    { id: "SR-003", item: "OPC 53 grade cement (50 kg bag)", unit: "bag", category: "Cement & Aggregates", rate: 380, tolerancePct: 2, validFrom: D(-90), validTo: D(275), source: "Rate contract", status: "Active" },
    { id: "SR-004", item: "Manufactured sand (M-sand)", unit: "cum", category: "Cement & Aggregates", rate: 1400, tolerancePct: 5, validFrom: D(-90), validTo: D(275), source: "Market survey", status: "Active" },
    { id: "SR-005", item: "20 mm coarse aggregate", unit: "cum", category: "Cement & Aggregates", rate: 1350, tolerancePct: 5, validFrom: D(-90), validTo: D(275), source: "Market survey", status: "Active" },
    { id: "SR-006", item: "Binding wire 18 SWG", unit: "MT", category: "Steel", rate: 70000, tolerancePct: 5, validFrom: D(-60), validTo: D(300), source: "Last purchase", status: "Active" },
  ];
  s.directAwards = [
    { id: "DA-001", requisitionId: "", vendorId: "VEN-003", project: PROJECTS[0], justification: "Repeat order at agreed rate", reason: "Same binding wire as PO-001 batch; rate held by the vendor for 60 days", quoteRef: "DST/Q/2291",
      deliveryDate: D(10), items: [{ desc: "Binding wire 18 SWG", unit: "MT", qty: 2, rate: 72000 }], value: 144000, date: D(-1), raisedBy: "Priya Nair", status: "Pending Approval" },
  ];
  s.integrations = INTEGRATION_DEFAULTS().map((c) => (c.enabled ? { ...c, lastSync: ts(-1) } : c));
  s.integrationLog = [
    { id: "INT-002", at: ts(-1), conn: "ERP", dir: "Out", what: "Synced 10 vendors, 3 POs, 4 bills as purchase vouchers", records: 17, status: "Success" },
    { id: "INT-001", at: ts(-2), conn: "GST", dir: "In", what: "Checked 10 GSTINs — 0 invalid, 0 not on file", records: 10, status: "Success" },
  ];
  s.warranties = [];
  s.notifRead = {};
  return s;
}
