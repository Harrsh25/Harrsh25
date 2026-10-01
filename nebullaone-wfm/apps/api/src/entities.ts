/**
 * Registry of every stored entity: API name → table, id prefix and the columns
 * that mirror fields of `doc` (used for joins, filters and permissions).
 */
export type Role = 'admin' | 'procurement' | 'legal' | 'finance' | 'project' | 'qa_hse' | 'vendor';

type Doc = Record<string, any>;

export interface EntityDef {
  name: string;
  table: string;
  prefix: string;
  /** column → value extracted from doc */
  columns: Record<string, (d: Doc) => unknown>;
  /** Column holding the vendor id (used to scope vendor-portal reads). */
  vendorColumn?: string;
  /** Roles allowed to create/patch through the generic endpoints. Workflow changes go through action routes. */
  writeRoles: Role[];
  /** Roles allowed to read (vendor role is always additionally scoped to its own rows). */
  readRoles?: Role[];
}

const INTERNAL: Role[] = ['admin', 'procurement', 'legal', 'finance', 'project', 'qa_hse'];
const s = (k: string) => (d: Doc) => d[k] ?? null;

export const ENTITIES: EntityDef[] = [
  { name: 'vendors', table: 'vendors', prefix: 'VEN', columns: { name: s('name'), status: s('status') }, vendorColumn: 'id', writeRoles: ['admin', 'procurement'] },
  { name: 'invites', table: 'invites', prefix: 'INVT', columns: { vendor_id: s('vendorId'), status: s('status') }, writeRoles: ['admin', 'procurement'], readRoles: INTERNAL },
  { name: 'holds', table: 'holds', prefix: 'HLD', columns: { vendor_id: s('vendorId'), status: s('status'), scope: s('scope'), ref_id: s('refId') }, vendorColumn: 'vendor_id', writeRoles: [] },
  { name: 'contracts', table: 'contracts', prefix: 'CTR', columns: { vendor_id: s('vendorId'), status: s('status'), project: s('project') }, vendorColumn: 'vendor_id', writeRoles: ['admin', 'project'] },
  { name: 'workOrders', table: 'work_orders', prefix: 'WO', columns: { contract_id: s('contractId'), vendor_id: s('vendorId'), status: s('status') }, vendorColumn: 'vendor_id', writeRoles: ['admin', 'project'] },
  { name: 'measurements', table: 'measurements', prefix: 'MB', columns: { wo_id: s('woId'), status: (d) => d.jms?.status ?? null }, writeRoles: ['admin', 'project'] },
  { name: 'raBills', table: 'ra_bills', prefix: 'RA', columns: { wo_id: s('woId'), contract_id: s('contractId'), vendor_id: s('vendorId'), status: s('status') }, vendorColumn: 'vendor_id', writeRoles: [] },
  { name: 'claims', table: 'claims', prefix: 'CLM', columns: { wo_id: s('woId'), vendor_id: s('vendorId'), status: s('status') }, vendorColumn: 'vendor_id', writeRoles: [] },
  { name: 'retentionReleases', table: 'retention_releases', prefix: 'RR', columns: { contract_id: s('contractId'), status: s('status') }, writeRoles: [] },
  { name: 'invoices', table: 'invoices', prefix: 'INV', columns: { vendor_id: s('vendorId'), ra_bill_id: s('raBillId'), status: s('status') }, vendorColumn: 'vendor_id', writeRoles: [] },
  { name: 'vendorAdvances', table: 'vendor_advances', prefix: 'ADV', columns: { vendor_id: s('vendorId'), status: s('status') }, vendorColumn: 'vendor_id', writeRoles: ['admin', 'finance'] },
  { name: 'requisitions', table: 'requisitions', prefix: 'MR', columns: { status: s('status') }, writeRoles: ['admin', 'procurement', 'project'], readRoles: INTERNAL },
  { name: 'rfqs', table: 'rfqs', prefix: 'RFQ', columns: { status: s('status') }, writeRoles: ['admin', 'procurement'] },
  { name: 'blanketOrders', table: 'blanket_orders', prefix: 'BO', columns: { vendor_id: s('vendorId'), status: s('status') }, vendorColumn: 'vendor_id', writeRoles: ['admin', 'procurement'] },
  { name: 'purchaseOrders', table: 'purchase_orders', prefix: 'PO', columns: { vendor_id: s('vendorId'), rfq_id: s('rfqId'), blanket_id: s('blanketId'), status: s('status') }, vendorColumn: 'vendor_id', writeRoles: [] },
  { name: 'serviceReceipts', table: 'service_receipts', prefix: 'SES', columns: { vendor_id: s('vendorId'), po_id: s('poId'), status: s('status') }, vendorColumn: 'vendor_id', writeRoles: [] },
  { name: 'vendorPrices', table: 'vendor_prices', prefix: 'VP', columns: { vendor_id: s('vendorId'), status: s('status') }, vendorColumn: 'vendor_id', writeRoles: ['admin', 'procurement'] },
  { name: 'laborRates', table: 'labor_rates', prefix: 'LR', columns: { vendor_id: s('vendorId'), status: s('status') }, writeRoles: [], readRoles: INTERNAL },
  { name: 'ratings', table: 'ratings', prefix: 'RT', columns: { vendor_id: s('vendorId'), wo_id: s('woId'), status: s('status') }, writeRoles: ['admin', 'project', 'procurement', 'qa_hse'], readRoles: INTERNAL },
  { name: 'caps', table: 'caps', prefix: 'CAP', columns: { vendor_id: s('vendorId'), status: s('status') }, vendorColumn: 'vendor_id', writeRoles: ['admin', 'procurement', 'qa_hse', 'project'] },
  { name: 'tickets', table: 'tickets', prefix: 'TKT', columns: { vendor_id: s('vendorId'), status: s('status') }, vendorColumn: 'vendor_id', writeRoles: [] },
  { name: 'workers', table: 'workers', prefix: 'WK', columns: { vendor_id: s('vendorId'), wo_id: s('woId'), status: (d) => (d.active === false ? 'Inactive' : 'Active') }, vendorColumn: 'vendor_id', writeRoles: ['admin', 'project'] },
  { name: 'attendance', table: 'attendance', prefix: 'ATT', columns: { wo_id: s('woId'), worker_id: s('workerId'), date: s('date'), status: s('status') }, writeRoles: [], readRoles: INTERNAL },
  { name: 'ncrs', table: 'ncrs', prefix: 'NCR', columns: { wo_id: s('woId'), status: s('status') }, writeRoles: [] },
  { name: 'punchItems', table: 'punch_items', prefix: 'PL', columns: { contract_id: s('contractId'), status: s('status') }, writeRoles: [] },
  { name: 'inspections', table: 'inspections', prefix: 'FI', columns: { contract_id: s('contractId'), status: s('result') }, writeRoles: ['admin', 'project', 'qa_hse'] },
  { name: 'materialIssues', table: 'material_issues', prefix: 'MI', columns: { wo_id: s('woId'), status: (d) => (d.recoveredIn ? 'Recovered' : 'Open') }, writeRoles: ['admin', 'project'] },
  { name: 'dprs', table: 'dprs', prefix: 'DPR', columns: { wo_id: s('woId'), status: s('status') }, writeRoles: ['admin', 'project'] },
  { name: 'safetyIncidents', table: 'safety_incidents', prefix: 'SI', columns: { vendor_id: s('vendorId'), wo_id: s('woId'), status: s('status') }, vendorColumn: 'vendor_id', writeRoles: [] },
  { name: 'kickoffs', table: 'kickoffs', prefix: 'KO', columns: { contract_id: s('contractId'), status: s('status') }, writeRoles: [] },
  { name: 'finalSettlements', table: 'final_settlements', prefix: 'FSL', columns: { contract_id: s('contractId'), status: s('status') }, writeRoles: [] },
  { name: 'contractorReleases', table: 'contractor_releases', prefix: 'REL', columns: { contract_id: s('contractId'), status: s('status') }, writeRoles: [] },
];

export const entity = (name: string): EntityDef => {
  const e = ENTITIES.find((x) => x.name === name);
  if (!e) throw new Error(`Unknown entity ${name}`);
  return e;
};

export const INTERNAL_ROLES = INTERNAL;
