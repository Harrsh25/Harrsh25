// Sidebar groups (appended after "Reports" in the Productivity orbit) and routes.
const VM_BASE = "/productivity/vendor-management";
const CL_BASE = "/productivity/contract-labor";

const NXV_PAGES = [
  { group: "Vendor Management", base: VM_BASE, path: "registry", label: "Vendor Registry", icon: Icon.building, el: VendorRegistryPage },
  { group: "Vendor Management", base: VM_BASE, path: "approvals", label: "Vendor Approvals", icon: Icon.clipboardCheck, el: VendorApprovalsPage },
  { group: "Vendor Management", base: VM_BASE, path: "compliance", label: "Compliance Center", icon: Icon.shieldCheck, el: CompliancePage },
  { group: "Vendor Management", base: VM_BASE, path: "rfq", label: "RFQ & Quotations", icon: Icon.scale, el: RfqPage },
  { group: "Vendor Management", base: VM_BASE, path: "purchase-orders", label: "Purchase Orders", icon: Icon.package, el: PurchaseOrdersPage },
  { group: "Vendor Management", base: VM_BASE, path: "invoices", label: "Invoices & Payments", icon: Icon.receipt, el: InvoicesPage },
  { group: "Vendor Management", base: VM_BASE, path: "scorecard", label: "Vendor Scorecard", icon: Icon.gauge, el: ScorecardPage },
  { group: "Vendor Management", base: VM_BASE, path: "portal", label: "Vendor Portal", icon: Icon.globe, el: VendorPortalPage },
  { group: "Contract & Labor", base: CL_BASE, path: "onboarding", label: "Contractor Onboarding", icon: Icon.userPlus, el: OnboardingPage },
  { group: "Contract & Labor", base: CL_BASE, path: "contracts", label: "Contracts", icon: Icon.file, el: ContractsPage },
  { group: "Contract & Labor", base: CL_BASE, path: "work-orders", label: "Work Orders", icon: Icon.clipboardList, el: WorkOrdersPage },
  { group: "Contract & Labor", base: CL_BASE, path: "measurement-book", label: "Measurement Book", icon: Icon.ruler, el: MeasurementBookPage },
  { group: "Contract & Labor", base: CL_BASE, path: "ra-bills", label: "RA Bills & Certification", icon: Icon.receipt, el: RaBillsPage },
  { group: "Contract & Labor", base: CL_BASE, path: "retention", label: "Retention & Deductions", icon: Icon.lock, el: RetentionPage },
  { group: "Contract & Labor", base: CL_BASE, path: "labor-rates", label: "Labor Rate Management", icon: Icon.hardHat, el: LaborRatesPage },
  { group: "Contract & Labor", base: CL_BASE, path: "performance", label: "Performance & Progress", icon: Icon.trending, el: PerformancePage },
];

// Routes are children of the "/productivity" route, so paths are relative to it
const NXV_ROUTES = NXV_PAGES.map((p) => ({ path: `${p.base.replace("/productivity/", "")}/${p.path}`, el: p.el }));
const NXV_NAV = ["Vendor Management", "Contract & Labor"].map((label) => ({
  label,
  items: NXV_PAGES.filter((p) => p.group === label).map((p) => ({ label: p.label, to: `${p.base}/${p.path}`, icon: p.icon })),
}));
