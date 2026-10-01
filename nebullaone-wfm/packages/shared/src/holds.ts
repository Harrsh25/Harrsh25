/**
 * Unified Hold record (fixes B7). Every gate — RFQ invite, PO/contract, bill
 * posting, payment — asks the same question: is there an active hold whose
 * scope covers this action for this vendor / document?
 */
export type HoldScope = 'All' | 'RFQ/PO' | 'Invoices' | 'Payments';
export type HoldReason = 'Compliance' | 'Performance' | 'Manual';
export type HoldLevel = 'Vendor' | 'Contract' | 'Invoice' | 'Payment';
export type GateAction = 'rfq' | 'po' | 'invoice' | 'payment';

export interface Hold {
  id: string;
  level: HoldLevel;
  vendorId: string;
  refId?: string | null;
  scope: HoldScope;
  reason: HoldReason;
  detail: string;
  source: string;
  raisedBy: string;
  raisedAt: string;
  releaseDate?: string | null;
  autoRelease?: string | null;
  status: 'Active' | 'Released';
  releasedBy?: string | null;
  releasedAt?: string | null;
  permanent?: boolean;
}

const SCOPE_COVERS: Record<HoldScope, GateAction[]> = {
  All: ['rfq', 'po', 'invoice', 'payment'],
  'RFQ/PO': ['rfq', 'po'],
  Invoices: ['invoice'],
  Payments: ['payment'],
};

export const scopeCovers = (scope: HoldScope, action: GateAction): boolean => SCOPE_COVERS[scope].includes(action);

/**
 * Holds blocking an action for a vendor. Vendor-level holds always apply;
 * document-level holds (contract / invoice) apply only when that document is
 * one of `refIds` (e.g. the invoice being paid and its contract).
 */
export function blockingHolds(holds: Hold[], action: GateAction, vendorId: string, refIds: string[] = [], today?: string): Hold[] {
  return holds.filter(
    (h) =>
      h.status === 'Active' &&
      h.vendorId === vendorId &&
      (!h.releaseDate || !today || h.releaseDate > today) &&
      scopeCovers(h.scope, action) &&
      (h.level === 'Vendor' || (!!h.refId && refIds.includes(h.refId))),
  );
}

/** Status overlay shown on the vendor (calculated, never set by hand). */
export function vendorHoldFlag(holds: Hold[], vendorId: string): 'Blacklisted' | 'Blocked' | 'On Hold' | null {
  // Automatic compliance holds are shown through the vendor's compliance status instead.
  const act = holds.filter((h) => h.status === 'Active' && h.vendorId === vendorId && h.level === 'Vendor' && !(h.reason === 'Compliance' && (h as Hold & { auto?: boolean }).auto));
  if (act.some((h) => h.permanent && h.scope === 'All')) return 'Blacklisted';
  if (act.some((h) => h.scope === 'All')) return 'Blocked';
  if (act.length) return 'On Hold';
  return null;
}
