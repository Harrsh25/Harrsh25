import { daysBetween } from './dates';

export interface DocRequirement { name: string; applies: string; expires: boolean; blocks: boolean }
export interface InsRequirement { type: string; applies: string; min: number; blocks: boolean }
export interface VendorDoc { name: string; status: string; expiry: string | null; file?: string | null; remark?: string }
export interface VendorInsurance { type: string; policy: string; insurer: string; cover: number; expiry: string; status?: string }
export interface VendorLite {
  id: string; type: string; isContractor: boolean; tier?: string;
  docs?: VendorDoc[]; insurance?: VendorInsurance[];
}

export type ComplianceStatus = 'Compliant' | 'Expiring' | 'Non-Compliant';

/** level 0 = OK, 1 = attention (expiring / unverified), 2 = failing */
export interface ComplianceItem { kind: 'Document' | 'Insurance'; name: string; level: 0 | 1 | 2; note: string; blocks: boolean; expiry: string | null }

export interface ComplianceResult {
  status: ComplianceStatus;
  items: ComplianceItem[];
  issues: ComplianceItem[];
  blocking: ComplianceItem[];
  nextExpiry: string | null;
  insuranceStatus: 'Met' | 'Not required' | 'Failing' | 'Expiring';
}

/** Labour suppliers and anyone working on site count as contractors (prototype rule). */
export const isContractorLike = (v: VendorLite): boolean => v.type === 'Labor' || !!v.isContractor;

export function applies(rule: string, v: VendorLite): boolean {
  const c = isContractorLike(v);
  switch (rule) {
    case 'all': return true;
    case 'goods': return v.type === 'Goods';
    case 'services': return v.type === 'Services' && !c;
    case 'contractor': return c;
    case 'strategic-contractor': return c && v.tier === 'Strategic';
    default: return false;
  }
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/** Compliance for one vendor as of `today`, using the configured requirements (same rules as the prototype). */
export function vendorCompliance(
  v: VendorLite,
  docReqs: DocRequirement[],
  insReqs: InsRequirement[],
  today: string,
  warnDays = 30,
): ComplianceResult {
  const items: ComplianceItem[] = [];

  for (const r of docReqs.filter((r) => applies(r.applies, v))) {
    const d = (v.docs ?? []).find((x) => x.name === r.name);
    const left = d?.expiry ? daysBetween(today, d.expiry) : null;
    let level: 0 | 1 | 2 = 0;
    let note = 'Verified';
    if (!d || d.status === 'Missing' || (!d.file && d.status !== 'Verified')) { level = 2; note = 'Missing'; }
    else if (d.status === 'Rejected') { level = 2; note = `Rejected${d.remark ? ` — ${d.remark}` : ''}`; }
    else if (left !== null && left < 0) { level = 2; note = `Expired ${-left} days ago`; }
    else if (d.status === 'Pending') { level = 1; note = 'Awaiting verification'; }
    else if (r.expires && !d.expiry) { level = 1; note = 'No expiry date recorded'; }
    else if (left !== null && left <= warnDays) { level = 1; note = `Expires in ${left} day${left === 1 ? '' : 's'}`; }
    items.push({ kind: 'Document', name: r.name, level, note, blocks: r.blocks, expiry: d?.expiry ?? null });
  }

  const insRules = insReqs.filter((r) => applies(r.applies, v));
  for (const r of insRules) {
    const p = (v.insurance ?? []).filter((x) => x.type === r.type && x.status !== 'Rejected').sort((a, b) => (b.expiry ?? '').localeCompare(a.expiry ?? ''))[0];
    const left = p?.expiry ? daysBetween(today, p.expiry) : null;
    let level: 0 | 1 | 2 = 0;
    let note = p ? `${inr(p.cover)} cover` : '';
    if (!p) { level = 2; note = 'No policy on file'; }
    else if (left !== null && left < 0) { level = 2; note = `Expired ${-left} days ago`; }
    else if (Number(p.cover) < r.min) { level = 2; note = `Cover ${inr(p.cover)} below minimum ${inr(r.min)}`; }
    else if (p.status === 'Pending') { level = 1; note = 'Awaiting verification'; }
    else if (left !== null && left <= warnDays) { level = 1; note = `Expires in ${left} day${left === 1 ? '' : 's'}`; }
    items.push({ kind: 'Insurance', name: `${r.type} insurance`, level, note, blocks: r.blocks, expiry: p?.expiry ?? null });
  }

  const max = Math.max(0, ...items.map((i) => i.level));
  const status = (['Compliant', 'Expiring', 'Non-Compliant'] as const)[max];
  const insItems = items.filter((i) => i.kind === 'Insurance');
  const insMax = Math.max(0, ...insItems.map((i) => i.level));
  const insuranceStatus = !insRules.length ? 'Not required' : insMax === 2 ? 'Failing' : insMax === 1 ? 'Expiring' : 'Met';
  const future = items.map((i) => i.expiry).filter((e): e is string => !!e && e >= today).sort();
  return {
    status,
    items,
    issues: items.filter((i) => i.level > 0),
    blocking: items.filter((i) => i.level === 2 && i.blocks),
    nextExpiry: future[0] ?? null,
    insuranceStatus,
  };
}
