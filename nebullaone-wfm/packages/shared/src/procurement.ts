/** Purchase order, receipt and invoice derivations (ported from the prototype, same rules). */
import { round2 } from './money';

type Doc = Record<string, any>;

export interface PoLineStatus { desc: string; unit: string; qty: number; rate: number; received: number; accepted: number; rejected: number }

export function poLineStatus(po: Doc): PoLineStatus[] {
  return (po.lines ?? []).map((l: Doc, i: number) => {
    const rs = (po.receipts ?? []).flatMap((r: Doc) => (r.lines ?? []).filter((x: Doc) => x.line === i));
    const received = rs.reduce((s: number, r: Doc) => s + (Number(r.qty) || 0), 0);
    const accepted = rs.reduce((s: number, r: Doc) => s + (Number(r.accepted) || 0), 0);
    return { ...l, received, accepted, rejected: received - accepted };
  });
}

export const poValue = (po: Doc): number => (po.lines ?? []).reduce((s: number, l: Doc) => s + l.qty * l.rate, 0);

export function poReceiptStatus(po: Doc): string {
  if (['Draft', 'Closed', 'Cancelled'].includes(po.status)) return po.status;
  const ls = poLineStatus(po);
  const rec = ls.reduce((s, l) => s + l.received, 0);
  const ord = ls.reduce((s, l) => s + l.qty, 0);
  if (!rec) return 'Issued';
  return rec >= ord * (1 - (po.tolerance || 0) / 100) ? 'Received' : 'Partially Received';
}

export function poBillingStatus(po: Doc, invoices: Doc[], billRejectedQty: boolean): string {
  if (po.status === 'Draft' || po.status === 'Cancelled') return '—';
  const ls = poLineStatus(po);
  const billed = (i: number) => invoices.filter((d) => d.poId === po.id).flatMap((d) => (d.lines ?? []).filter((m: Doc) => m.line === i)).reduce((s, d) => s + (Number(d.qty) || 0), 0);
  const billable = (l: PoLineStatus) => (po.billingPolicy === 'On ordered quantity' ? l.qty : l.accepted + (billRejectedQty ? l.rejected : 0));
  const left = ls.reduce((s, l, i) => s + Math.max(0, billable(l) - billed(i)), 0);
  const any = ls.some((_, i) => billed(i) > 0);
  if (left <= 1e-4 && any) return 'Fully Billed';
  if (left <= 1e-4) return 'Nothing to Bill';
  return any ? 'Partially Billed' : 'Waiting Bills';
}

export interface InvoiceTotals { taxable: number; gst: number; gross: number; paid: number; notes: number; payable: number; balance: number }

export function invoiceTotals(inv: Doc): InvoiceTotals {
  const taxable = (inv.lines ?? []).reduce((s: number, l: Doc) => s + l.qty * l.rate, 0);
  const gst = round2((taxable * (inv.gstPct || 0)) / 100);
  // RA-bill and retention-release invoices carry a single amount and no lines.
  const gross = (inv.lines ?? []).length ? round2(taxable + gst) : Number(inv.amount) || 0;
  const paid = (inv.payments ?? []).reduce((s: number, p: Doc) => s + (Number(p.amount) || 0) + (Number(p.tds) || 0), 0);
  const notes = (inv.notes ?? []).reduce((s: number, n: Doc) => s + (n.type === 'Debit Note' ? -n.amount : n.amount), 0);
  const payable = inv.review === 'Rejected' ? 0 : round2(gross + notes);
  return { taxable, gst, gross, paid, notes, payable, balance: round2(payable - paid) };
}

/** Invoice status. `onHold` = an active invoice-level hold exists (from the unified Hold register). */
export function invoiceStatus(inv: Doc, today: string, onHold: boolean): string {
  if (inv.review === 'Pending') return 'Awaiting Review';
  if (inv.review === 'Rejected') return 'Rejected';
  const t = invoiceTotals(inv);
  if (t.balance <= 0.5) return 'Paid';
  if (onHold) return 'On Hold';
  const overdue = inv.due && inv.due < today;
  if (t.paid > 0) return overdue ? 'Overdue' : 'Partially Paid';
  return overdue ? 'Overdue' : 'Unpaid';
}

export interface MatchRow { desc: string; poQty: number; poRate: number; receivedQty: number; invQty: number; invRate: number; qtyOk: boolean; rateOk: boolean }
export interface InvoiceMatch { status: string; rows: MatchRow[] }

/**
 * 3-way match. Goods: PO × GRN accepted qty × invoice. Services: PO × accepted service receipts × invoice.
 */
export function invoiceMatch(inv: Doc, po: Doc | null, raBill: Doc | null, serviceReceipts: Doc[], settings: Doc): InvoiceMatch {
  if (inv.source === 'RA Bill') return { status: raBill && ['Approved', 'Paid'].includes(raBill.status) ? 'Matched' : 'Awaiting certification', rows: [] };
  if (inv.source === 'Direct') return { status: 'Direct bill', rows: [] };
  if (!po) return { status: 'No PO', rows: [] };
  const rateTol = (settings.rateTolerancePct || 0) / 100;
  const qtyTol = (settings.invoiceQtyTolPct || 0) / 100;
  const ls = poLineStatus(po);
  const sesQty = (i: number) => serviceReceipts.filter((s) => s.poId === po.id && s.status === 'Accepted').flatMap((s) => (s.lines ?? []).filter((l: Doc) => l.line === i)).reduce((a, l) => a + (Number(l.qty) || 0), 0);
  const isService = po.kind === 'Service';
  const rows: MatchRow[] = (inv.lines ?? []).map((v: Doc) => {
    const p = ls[v.line];
    const receivedQty = isService ? sesQty(v.line) : p.accepted + (settings.billRejectedQty ? p.rejected : 0);
    const qtyOk = v.qty <= receivedQty * (1 + qtyTol) + 0.001;
    const rateOk = Math.abs(v.rate - p.rate) <= p.rate * rateTol + 0.01;
    return { desc: p.desc, poQty: p.qty, poRate: p.rate, receivedQty, invQty: v.qty, invRate: v.rate, qtyOk, rateOk };
  });
  const allOk = rows.every((r) => r.qtyOk && r.rateOk);
  const excess = rows.reduce((s, r) => s + Math.max(0, r.invQty - r.receivedQty) * r.invRate, 0) * (1 + (inv.gstPct || 0) / 100);
  const debit = (inv.notes ?? []).filter((n: Doc) => n.type === 'Debit Note').reduce((s: number, n: Doc) => s + n.amount, 0);
  const coveredByDebit = excess > 0 && debit >= excess - 1;
  const ratesOk = rows.every((r) => r.rateOk);
  const status = allOk ? 'Matched' : coveredByDebit && ratesOk ? 'Matched (debit note)' : (inv.notes ?? []).length ? 'Variance — note raised' : 'Mismatch';
  return { status, rows };
}
