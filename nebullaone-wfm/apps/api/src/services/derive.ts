/**
 * Calculated fields added to records when they are read (status that depends
 * on today's date, totals, progress…). Stored data stays the source of truth;
 * these are never written back.
 */
import {
  addDays, bgCoverageIssues, blockingHolds, dlpEndDate, fsLedger, invoiceMatch, invoiceStatus, invoiceTotals, isExpiring,
  poBillingStatus, poLineStatus, poReceiptStatus, poValue, revisedEnd, revisedValue, vendorHoldFlag, workOrderProgress,
  workOrderValue, type Hold,
} from '@nebulla/shared';
import type { Db } from '../db';
import { list } from '../repo';
import { complianceOf, settingsOf, today } from './rules';

type Doc = Record<string, any>;

export async function derive(name: string, rows: Doc[], db: Db): Promise<Doc[]> {
  const fn = DERIVERS[name];
  return fn ? fn(rows, db) : rows;
}

const woFlag = (spi: number, planned: number) => (planned < 5 ? 'On Track' : spi >= 0.95 ? 'On Track' : spi >= 0.8 ? 'At Risk' : 'Delayed');

const DERIVERS: Record<string, (rows: Doc[], db: Db) => Promise<Doc[]>> = {
  async vendors(rows, db) {
    const [settings, holds] = await Promise.all([settingsOf(db), list<Hold & Doc>('holds', { db, where: { status: 'Active' } })]);
    return rows.map((v) => {
      const c = complianceOf(v, settings);
      const vHolds = holds.filter((h) => h.vendorId === v.id);
      return {
        ...v,
        _compliance: { status: c.status, issues: c.issues, blocking: c.blocking, nextExpiry: c.nextExpiry, insuranceStatus: c.insuranceStatus, items: c.items },
        _holdFlag: vendorHoldFlag(holds, v.id),
        _holds: vHolds.map((h) => ({ id: h.id, scope: h.scope, reason: h.reason, detail: h.detail, level: h.level, refId: h.refId })),
        _paymentGate: blockingHolds(holds, 'payment', v.id, [], today()).length ? 'Blocked' : 'Open',
      };
    });
  },

  async invoices(rows, db) {
    const [settings, holds, pos, bills, ses] = await Promise.all([
      settingsOf(db), list<Hold & Doc>('holds', { db, where: { status: 'Active' } }), list('purchaseOrders', { db }),
      list('raBills', { db }), list('serviceReceipts', { db }),
    ]);
    const t = today();
    return rows.map((inv) => {
      const own = holds.filter((h) => h.level === 'Invoice' && h.refId === inv.id);
      const po = pos.find((p) => p.id === inv.poId) ?? null;
      const ra = bills.find((b) => b.id === inv.raBillId) ?? null;
      const blockers = blockingHolds(holds, 'payment', inv.vendorId, [inv.id, ra?.contractId].filter(Boolean) as string[], t);
      const totals = invoiceTotals(inv);
      const status = invoiceStatus(inv, t, own.length > 0);
      const match = invoiceMatch(inv, po, ra, ses, settings);
      return {
        ...inv,
        _totals: totals,
        _status: status,
        _match: match,
        _against: po ? po.lines.map((l: Doc) => l.desc).slice(0, 1).join('') + (po.lines.length > 1 ? ` +${po.lines.length - 1} more` : '') : ra ? ra.woTitle ?? ra.woId : '—',
        _blockedBy: blockers.map((h) => `${h.reason}: ${h.detail}`),
        _shouldPay: status !== 'Paid' && status !== 'On Hold' && !blockers.length && match.status.startsWith('Matched') && !!inv.due && inv.due <= addDays(t, 7),
      };
    });
  },

  async purchaseOrders(rows, db) {
    const [settings, invoices] = await Promise.all([settingsOf(db), list('invoices', { db })]);
    const t = today();
    return rows.map((po) => {
      const status = poReceiptStatus(po);
      const lines = poLineStatus(po);
      const ord = lines.reduce((s, l) => s + l.qty, 0);
      const rec = lines.reduce((s, l) => s + l.received, 0);
      return {
        ...po,
        _status: status,
        _lines: lines,
        _value: poValue(po),
        _receivedPct: ord ? Math.round((rec / ord) * 100) : 0,
        _billing: poBillingStatus(po, invoices, !!settings.billRejectedQty),
        _late: !['Received', 'Closed', 'Cancelled', 'Draft'].includes(status) && po.deliveryDate < t,
      };
    });
  },

  async contracts(rows, db) {
    const [bills, releases, vendors] = await Promise.all([list('raBills', { db }), list('retentionReleases', { db }), list('vendors', { db })]);
    const t = today();
    return rows.map((c) => {
      const rv = revisedValue(c as any);
      const billed = bills.filter((b) => b.contractId === c.id && !['Rejected', 'Draft'].includes(b.status)).reduce((s, b) => s + b.gross, 0);
      return {
        ...c,
        _vendorName: vendors.find((v) => v.id === c.vendorId)?.name,
        _revisedValue: rv,
        _revisedEnd: revisedEnd(c as any),
        _dlpEnd: dlpEndDate(c as any),
        _billed: billed,
        _billedPct: rv ? (billed / rv) * 100 : 0,
        _expiring: isExpiring(c as any, t),
        _bgIssues: bgCoverageIssues(c as any),
        _fs: fsLedger(c as any, bills as any, releases as any),
      };
    });
  },

  async workOrders(rows, db) {
    const [ms, bills, vendors] = await Promise.all([list('measurements', { db }), list('raBills', { db }), list('vendors', { db })]);
    const t = today();
    return rows.map((w) => {
      const p = workOrderProgress(w as any, ms as any, bills.filter((b) => b.woId === w.id) as any, t);
      return { ...w, _vendorName: vendors.find((v) => v.id === w.vendorId)?.name, _value: workOrderValue(w as any), _progress: p, _flag: w.status === 'Completed' ? 'Completed' : woFlag(p.spi, p.planned) };
    });
  },

  async raBills(rows, db) {
    const [wos, vendors] = await Promise.all([list('workOrders', { db }), list('vendors', { db })]);
    return rows.map((b) => ({ ...b, _woTitle: wos.find((w) => w.id === b.woId)?.title, _vendorName: vendors.find((v) => v.id === b.vendorId)?.name, _woType: wos.find((w) => w.id === b.woId)?.type }));
  },
};
