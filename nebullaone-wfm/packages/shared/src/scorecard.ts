export interface Standing { name: string; min: number; max: number; color: string; warnRfq: boolean; warnPo: boolean; preventRfq: boolean; preventPo: boolean }

/**
 * Bands are min-inclusive / max-exclusive; the highest band also includes its max (fixes B6).
 */
export function standingFor(score: number, standings: Standing[]): Standing | undefined {
  const sorted = [...standings].sort((a, b) => b.max - a.max);
  const top = sorted[0];
  if (top && score >= top.min && score <= top.max) return top;
  return sorted.find((s) => score >= s.min && score < s.max);
}

export interface MetricScores { quality: number | null; timeliness: number | null; safety: number | null; compliance: number | null }

/** Weighted average that ignores metrics with no data (re-normalising the weights). */
export function weightedScore(m: MetricScores, weights: Record<keyof MetricScores, number>): number | null {
  let sum = 0; let w = 0;
  for (const k of Object.keys(weights) as (keyof MetricScores)[]) {
    const v = m[k];
    if (v == null) continue;
    sum += v * weights[k]; w += weights[k];
  }
  return w ? Math.round(sum / w) : null;
}

/** 1–5 star rating → 0–100. */
export const starsTo100 = (stars: number): number => Math.round(((stars - 1) / 4) * 100);

export interface MetricInputs {
  /** 1–5 star ratings */
  ratings: Array<{ quality: number; safety: number }>;
  /** SPI of each live work order */
  woSpis: number[];
  /** Each goods receipt vs its PO delivery date */
  receipts: Array<{ date: string; deliveryDate: string }>;
  /** Received vs accepted quantities across PO lines (used when there are no ratings) */
  receivedQty: number;
  acceptedQty: number;
  complianceStatus: 'Compliant' | 'Expiring' | 'Non-Compliant';
}

/** Metric scores 0–100, same rules as the prototype. Returns null when there is no performance data yet. */
export function vendorMetrics(i: MetricInputs): MetricScores | null {
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  let quality: number | null = null;
  let safety: number | null = null;
  if (i.ratings.length) {
    quality = (avg(i.ratings.map((r) => r.quality)) / 5) * 100;
    safety = (avg(i.ratings.map((r) => r.safety)) / 5) * 100;
  }
  const t = [...i.woSpis.map((s) => Math.min(1, s) * 100), ...i.receipts.map((r) => (r.date <= r.deliveryDate ? 100 : 55))];
  const timeliness = t.length ? avg(t) : null;
  if (!i.ratings.length && i.receivedQty > 0) quality = (i.acceptedQty / i.receivedQty) * 100;
  if (quality == null && safety == null && timeliness == null) return null;
  const compliance = i.complianceStatus === 'Compliant' ? 100 : i.complianceStatus === 'Expiring' ? 70 : 30;
  // Unrounded: only the final weighted score is rounded (prototype rule). Round for display.
  return { quality, timeliness, safety, compliance };
}
