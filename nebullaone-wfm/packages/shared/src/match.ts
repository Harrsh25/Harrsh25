/**
 * 3-way match for PO-based bills: bill vs PO rate vs accepted receipt quantity.
 * Receipt = goods receipt (GRN) for goods, service receipt (SES) for services.
 */
export type GateMode = 'Stop' | 'Warn' | 'Off';

export interface PoLine { desc: string; unit: string; qty: number; rate: number }
export interface BillLine { line: number; qty: number; rate: number }

export interface MatchIssue { line: number; kind: 'Quantity' | 'Rate' | 'No receipt'; detail: string; mode: GateMode }
export interface MatchResult { status: 'Matched' | 'Mismatch' | 'Warning'; issues: MatchIssue[]; blocking: boolean }

export interface MatchSettings { threeWayQty: GateMode; rateCheck: GateMode; rateTolerancePct: number; receiptRequiredForBill: boolean }

export function threeWayMatch(
  poLines: PoLine[],
  acceptedQtyByLine: Record<number, number>,
  billedBeforeByLine: Record<number, number>,
  bill: BillLine[],
  s: MatchSettings,
): MatchResult {
  const issues: MatchIssue[] = [];
  for (const b of bill) {
    const po = poLines[b.line];
    if (!po) continue;
    const accepted = acceptedQtyByLine[b.line] ?? 0;
    const billedTotal = (billedBeforeByLine[b.line] ?? 0) + b.qty;
    if (s.receiptRequiredForBill && accepted === 0)
      issues.push({ line: b.line, kind: 'No receipt', detail: `${po.desc}: nothing received / accepted yet`, mode: s.threeWayQty === 'Off' ? 'Warn' : s.threeWayQty });
    else if (s.threeWayQty !== 'Off' && billedTotal > accepted + 1e-9)
      issues.push({ line: b.line, kind: 'Quantity', detail: `${po.desc}: billed ${billedTotal} ${po.unit} > accepted ${accepted} ${po.unit}`, mode: s.threeWayQty });
    if (s.rateCheck !== 'Off') {
      const diffPct = po.rate ? (Math.abs(b.rate - po.rate) / po.rate) * 100 : 0;
      if (diffPct > (s.rateTolerancePct || 0))
        issues.push({ line: b.line, kind: 'Rate', detail: `${po.desc}: billed rate ₹${b.rate} vs PO ₹${po.rate} (${diffPct.toFixed(1)}%)`, mode: s.rateCheck });
    }
  }
  const blocking = issues.some((i) => i.mode === 'Stop');
  return { status: blocking ? 'Mismatch' : issues.length ? 'Warning' : 'Matched', issues, blocking };
}
