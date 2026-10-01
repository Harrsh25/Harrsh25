// Sidebar groups (appended after "Reports" in the Productivity orbit) and routes.
const VM_BASE = "/productivity/vendor-management";
const CL_BASE = "/productivity/contract-labor";
const ADMIN_BASE = "/productivity/administration";

const NXV_PAGES = [
  { group: "Vendor Management", base: VM_BASE, path: "overview", label: "Overview", icon: Icon.grid, el: VendorOverviewPage },
  { group: "Vendor Management", base: VM_BASE, path: "registry", label: "Vendor Registry", icon: Icon.building, el: VendorRegistryPage },
  { group: "Vendor Management", base: VM_BASE, path: "approvals", label: "Vendor Approvals", icon: Icon.clipboardCheck, el: VendorApprovalsPage },
  { group: "Vendor Management", base: VM_BASE, path: "compliance", label: "Compliance Center", icon: Icon.shieldCheck, el: CompliancePage },
  { group: "Vendor Management", base: VM_BASE, path: "requisitions", label: "Purchase Requisitions", icon: Icon.clipboardList, el: RequisitionsPage },
  { group: "Vendor Management", base: VM_BASE, path: "rfq", label: "RFQ & Quotations", icon: Icon.scale, el: RfqPage },
  { group: "Vendor Management", base: VM_BASE, path: "blanket-orders", label: "Blanket Orders", icon: Icon.layers, el: BlanketOrdersPage },
  { group: "Vendor Management", base: VM_BASE, path: "price-lists", label: "Vendor Price Lists", icon: Icon.receipt, el: VendorPriceListsPage },
  { group: "Vendor Management", base: VM_BASE, path: "purchase-orders", label: "Purchase Orders", icon: Icon.package, el: PurchaseOrdersPage },
  { group: "Vendor Management", base: VM_BASE, path: "goods-receipts", label: "Goods Receipts", icon: Icon.truck, el: GoodsReceiptsPage },
  { group: "Vendor Management", base: VM_BASE, path: "holds", label: "Holds Register", icon: Icon.lock, el: HoldsRegisterPage },
  { group: "Vendor Management", base: VM_BASE, path: "invoices", label: "Invoices & Payments", icon: Icon.receipt, el: InvoicesPage },
  { group: "Vendor Management", base: VM_BASE, path: "scorecard", label: "Vendor Scorecard", icon: Icon.gauge, el: ScorecardPage },
  { group: "Vendor Management", base: VM_BASE, path: "portal", label: "Vendor Portal", icon: Icon.globe, el: VendorPortalPage },
  { group: "Vendor Management", base: VM_BASE, path: "settings", label: "Procurement Settings", icon: Icon.settings, el: ProcurementSettingsPage },
  { group: "Contract & Labor", base: CL_BASE, path: "overview", label: "Overview", icon: Icon.grid, el: ContractOverviewPage },
  { group: "Contract & Labor", base: CL_BASE, path: "onboarding", label: "Contractor Onboarding", icon: Icon.userPlus, el: OnboardingPage },
  { group: "Contract & Labor", base: CL_BASE, path: "contracts", label: "Contracts", icon: Icon.file, el: ContractsPage },
  { group: "Contract & Labor", base: CL_BASE, path: "work-orders", label: "Work Orders", icon: Icon.clipboardList, el: WorkOrdersPage },
  { group: "Contract & Labor", base: CL_BASE, path: "change-orders", label: "Change & Variations", icon: Icon.layers, el: ChangeVariationsPage },
  { group: "Contract & Labor", base: CL_BASE, path: "attendance", label: "Labour Attendance", icon: Icon.users, el: LabourAttendancePage },
  { group: "Contract & Labor", base: CL_BASE, path: "measurement-book", label: "Measurement Book", icon: Icon.ruler, el: MeasurementBookPage },
  { group: "Contract & Labor", base: CL_BASE, path: "ra-bills", label: "RA Bills & Certification", icon: Icon.receipt, el: RaBillsPage },
  { group: "Contract & Labor", base: CL_BASE, path: "retention", label: "Retention & Deductions", icon: Icon.lock, el: RetentionPage },
  { group: "Contract & Labor", base: CL_BASE, path: "labor-rates", label: "Labor Rate Management", icon: Icon.hardHat, el: LaborRatesPage },
  { group: "Contract & Labor", base: CL_BASE, path: "performance", label: "Performance & Progress", icon: Icon.trending, el: PerformancePage },
  { group: "Contract & Labor", base: CL_BASE, path: "closeout", label: "Close-out & Handover", icon: Icon.folderCheck, el: CloseoutPage },
  { group: "Administration", base: ADMIN_BASE, path: "audit-log", label: "Audit Log", icon: Icon.fileClock, el: AuditLogPage },
];

// Routes are children of the "/productivity" route, so paths are relative to it
const NXV_ROUTES = NXV_PAGES.map((p) => ({ path: `${p.base.replace("/productivity/", "")}/${p.path}`, el: p.el }));
const NXV_NAV = ["Vendor Management", "Contract & Labor", "Administration"].map((label) => ({
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
