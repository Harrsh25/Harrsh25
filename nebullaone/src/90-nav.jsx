// Sidebar groups (appended after "Reports" in the Productivity orbit) and routes.
const VM_BASE = "/productivity/vendor-management";
const CL_BASE = "/productivity/contract-labor";
const ADMIN_BASE = "/productivity/administration";

// Sidebar groups follow the lifecycle: A Onboarding → B Sourcing → C Commitment → D Execution →
// E Bill & Pay → F Closure, with the cross-cutting services (always on) last. Route paths stay
// under their original bases so links and bookmarks keep working.
const NXP = (stage, group, base, path, label, icon, el) => ({ stage, group, base, path, label, icon, el });
const NXV_PAGES = [
  NXP("O", "Lifecycle", ADMIN_BASE, "lifecycle", "Lifecycle Map", Icon.branch, LifecycleMapPage),
  NXP("O", "Lifecycle", VM_BASE, "overview", "Vendor Overview", Icon.grid, VendorOverviewPage),
  NXP("O", "Lifecycle", CL_BASE, "overview", "Contract Overview", Icon.grid, ContractOverviewPage),
  NXP("A", "A · Onboarding", VM_BASE, "registry", "Vendor Registry", Icon.building, VendorRegistryPage),
  NXP("A", "A · Onboarding", CL_BASE, "onboarding", "Contractor Onboarding", Icon.userPlus, OnboardingPage),
  NXP("A", "A · Onboarding", VM_BASE, "approvals", "Vendor Approvals", Icon.clipboardCheck, VendorApprovalsPage),
  NXP("A", "A · Onboarding", VM_BASE, "category-master", "Category & Rate Master", Icon.layers, CategoryRateMasterPage),
  NXP("A", "A · Onboarding", CL_BASE, "labor-rates", "Labor Rate Management", Icon.hardHat, LaborRatesPage),
  NXP("B", "B · Sourcing", VM_BASE, "requisitions", "Purchase Requisitions", Icon.clipboardList, RequisitionsPage),
  NXP("B", "B · Sourcing", VM_BASE, "rfq", "RFQ & Quotations", Icon.scale, RfqPage),
  NXP("B", "B · Sourcing", VM_BASE, "direct-awards", "Direct Awards", Icon.target, DirectAwardsPage),
  NXP("B", "B · Sourcing", VM_BASE, "blanket-orders", "Blanket Orders", Icon.layers, BlanketOrdersPage),
  NXP("B", "B · Sourcing", VM_BASE, "price-lists", "Vendor Price Lists", Icon.receipt, VendorPriceListsPage),
  NXP("C", "C · Commitment", VM_BASE, "purchase-orders", "Purchase Orders", Icon.package, PurchaseOrdersPage),
  NXP("C", "C · Commitment", CL_BASE, "contracts", "Contracts", Icon.file, ContractsPage),
  NXP("C", "C · Commitment", CL_BASE, "work-orders", "Work Orders", Icon.clipboardList, WorkOrdersPage),
  NXP("D", "D · Execution", VM_BASE, "goods-receipts", "Goods Receipts", Icon.truck, GoodsReceiptsPage),
  NXP("D", "D · Execution", CL_BASE, "attendance", "Labour Attendance", Icon.users, LabourAttendancePage),
  NXP("D", "D · Execution", CL_BASE, "measurement-book", "Measurement Book", Icon.ruler, MeasurementBookPage),
  NXP("D", "D · Execution", CL_BASE, "change-orders", "Change & Variations", Icon.layers, ChangeVariationsPage),
  NXP("D", "D · Execution", CL_BASE, "performance", "Performance & Progress", Icon.trending, PerformancePage),
  NXP("E", "E · Bill & Pay", VM_BASE, "invoices", "Invoices & Payments", Icon.receipt, InvoicesPage),
  NXP("E", "E · Bill & Pay", CL_BASE, "ra-bills", "RA Bills & Certification", Icon.receipt, RaBillsPage),
  NXP("E", "E · Bill & Pay", CL_BASE, "retention", "Retention & Deductions", Icon.lock, RetentionPage),
  NXP("E", "E · Bill & Pay", VM_BASE, "holds", "Holds Register", Icon.lock, HoldsRegisterPage),
  NXP("F", "F · Closure", CL_BASE, "closeout", "Close-out & Handover", Icon.folderCheck, CloseoutPage),
  NXP("F", "F · Closure", CL_BASE, "final-settlement", "Final Settlement", Icon.scale, FinalSettlementPage),
  NXP("F", "F · Closure", CL_BASE, "dlp-warranty", "DLP & Warranty", Icon.shieldCheck, DlpWarrantyPage),
  NXP("F", "F · Closure", CL_BASE, "contractor-release", "Contractor Release", Icon.handshake, ContractorReleasePage),
  NXP("F", "F · Closure", CL_BASE, "terminations", "Termination & Final Account", Icon.ban, TerminationsPage),
  NXP("F", "F · Closure", VM_BASE, "requalification", "Requalification", Icon.refresh, RequalificationPage),
  NXP("X", "Cross-cutting", VM_BASE, "settings", "Procurement Settings", Icon.settings, ProcurementSettingsPage),
  NXP("X", "Cross-cutting", ADMIN_BASE, "state-machines", "State Machines", Icon.branch, StateMachinesPage),
  NXP("X", "Cross-cutting", VM_BASE, "compliance", "Compliance Center", Icon.shieldCheck, CompliancePage),
  NXP("X", "Cross-cutting", VM_BASE, "scorecard", "Vendor Scorecard", Icon.gauge, ScorecardPage),
  NXP("X", "Cross-cutting", ADMIN_BASE, "notifications", "Notifications", Icon.alert, NotificationsPage),
  NXP("X", "Cross-cutting", VM_BASE, "portal", "Vendor Portal", Icon.globe, VendorPortalPage),
  NXP("X", "Cross-cutting", ADMIN_BASE, "integrations", "Integrations", Icon.network, IntegrationsPage),
  NXP("X", "Cross-cutting", ADMIN_BASE, "audit-log", "Audit Log", Icon.fileClock, AuditLogPage),
];
const NXV_GROUPS = ["Lifecycle", ...LIFECYCLE.map((s) => s.label), "Cross-cutting"];

// Routes are children of the "/productivity" route, so paths are relative to it
const NXV_ROUTES = NXV_PAGES.map((p) => ({ path: `${p.base.replace("/productivity/", "")}/${p.path}`, el: p.el }));
const NXV_NAV = NXV_GROUPS.map((label) => ({
  label,
  items: NXV_PAGES.filter((p) => p.group === label).map((p) => ({ label: p.label, to: `${p.base}/${p.path}`, icon: p.icon })),
}));

// Public (no-login) pages, mounted as top-level routes next to /login
const NXV_PUBLIC = [
  { path: "/vendor-register", el: SelfRegisterPage },
  { path: "/vendor-quote/:rfqId/:vendorId", el: VendorQuotePage },
  { path: "/supplier/login", el: SupplierLoginPage },
  { path: "/supplier", el: SupplierPortalPage },
];
