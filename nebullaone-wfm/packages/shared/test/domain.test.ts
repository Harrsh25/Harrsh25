import { describe, expect, it } from 'vitest';
import {
  addMonths, blockingHolds, bgCoverageIssues, computeRaBill, tdsRate, workOrderProgress, vendorMetrics, dlpEndDate, fsLedger, liquidatedDamages,
  revisedEnd, revisedValue, standingFor, threeWayMatch, validateLabourRate, vendorCompliance, vendorHoldFlag,
  weightedScore, findApplicableRate, fmtINRShort, type Contract, type Hold, type Standing,
} from '../src';

const baseContract: Contract = {
  id: 'CTR-001', vendorId: 'VEN-001', project: 'P', title: 'T', type: 'Item-Rate', value: 48_500_000,
  start: '2026-03-14', end: '2027-03-14', retentionPct: 5, advancePct: 10, advanceAmount: 4_850_000,
  advanceRecoveryPct: 10, cessPct: 1, gstPct: 18, dlpMonths: 12, ldPctPerWeek: 0.5, ldCapPct: 5, pbgPct: 5,
  status: 'Active',
  changeOrders: [
    { id: 'CO-001', desc: 'podium', amount: 1_850_000, days: 20, status: 'Approved', raisedOn: '2026-07-12' },
    { id: 'CO-002', desc: 'rebar', amount: 620_000, days: 0, status: 'Pending', raisedOn: '2026-09-24' },
  ],
  guarantees: [{ id: 'BG-1', type: 'Performance', bank: 'HDFC', number: 'BG/1', amount: 2_425_000, expiry: '2027-04-28', status: 'Active' }],
};

describe('dates', () => {
  it('adds calendar months and clamps month ends', () => {
    expect(addMonths('2026-03-19', 6)).toBe('2026-09-19');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2027-03-14', 12)).toBe('2028-03-14');
  });
});

describe('contract', () => {
  it('revised value and end include only approved change orders', () => {
    expect(revisedValue(baseContract)).toBe(50_350_000); // prototype shows ₹5.04 Cr
    expect(revisedEnd(baseContract)).toBe('2027-04-03');
  });

  it('B2/B3: DLP end uses handover when present, calendar months', () => {
    const ctr005: Contract = { ...baseContract, id: 'CTR-005', end: '2026-03-14', dlpMonths: 6, changeOrders: [], handover: { date: '2026-03-19' } };
    expect(dlpEndDate(ctr005)).toBe('2026-09-19');
    expect(dlpEndDate({ ...ctr005, handover: null })).toBe('2026-09-14');
  });

  it('B4: flags a PBG that expires before the DLP ends', () => {
    const issues = bgCoverageIssues(baseContract);
    expect(issues).toHaveLength(1);
    expect(issues[0].requiredUntil).toBe('2028-04-03');
    expect(issues[0].message).toMatch(/extend/);
    const ok = { ...baseContract, guarantees: [{ ...baseContract.guarantees![0], expiry: '2028-06-30' }] };
    expect(bgCoverageIssues(ok)).toHaveLength(0);
  });

  it('LD is capped', () => {
    expect(liquidatedDamages(baseContract, '2027-04-03')).toBe(0);
    expect(liquidatedDamages(baseContract, '2027-04-10')).toBeCloseTo(251_750); // 1 week × 0.5%
    expect(liquidatedDamages(baseContract, '2028-12-31')).toBe(2_517_500); // 5% cap
  });
});

describe('RA bill', () => {
  const wo = { id: 'WO-001', type: 'Item-Rate', start: '2026-03-24', end: '2027-01-28', items: [
    { id: 'A1', code: '2.1', desc: 'PCC', unit: 'cum', qty: 420, rate: 5850 },
    { id: 'A2', code: '3.4', desc: 'RCC', unit: 'cum', qty: 100, rate: 10_000 },
  ] };
  it('matches the prototype formula: net = gross + GST − deductions', () => {
    const r = computeRaBill({
      contract: baseContract, workOrder: wo, previousBills: [], advanceRecoveredSoFar: 0, tdsPct: 2,
      measurements: [{ id: 'MB-1', woId: 'WO-001', lineId: 'A1', qty: 221.4, pct: null, jms: { status: 'Signed' } }],
    });
    expect(r.gross).toBe(1_295_190);
    expect(r.gst).toBeCloseTo(233_134.2);
    expect(r.ded.retention).toBeCloseTo(64_759.5);
    expect(r.ded.tds).toBeCloseTo(25_903.8);
    expect(r.net).toBeCloseTo(r.gross + r.gst - r.totalDed);
    expect(r.warnings).toEqual([]);
  });

  it('caps advance recovery at the outstanding advance', () => {
    const r = computeRaBill({
      contract: baseContract, workOrder: wo, previousBills: [], advanceRecoveredSoFar: 4_800_000, tdsPct: 2,
      measurements: [{ id: 'MB-1', woId: 'WO-001', lineId: 'A1', qty: 221.4, pct: null }],
    });
    expect(r.ded.advance).toBe(50_000);
  });

  it('warns when cumulative quantity exceeds the WO quantity', () => {
    const r = computeRaBill({
      contract: baseContract, workOrder: wo, previousBills: [{ lines: [{ lineId: 'A2', thisQty: 90 }] }], advanceRecoveredSoFar: 0, tdsPct: 2,
      measurements: [{ id: 'MB-2', woId: 'WO-001', lineId: 'A2', qty: 20, pct: null }],
    });
    expect(r.warnings[0]).toMatch(/exceeds WO quantity/);
  });

  it('lump-sum bills milestones by cumulative % (prototype RA-005)', () => {
    const ls = { id: 'WO-003', type: 'Lump Sum', start: '2026-05-08', end: '2027-01-28', lumpSum: 18_500_000, milestones: [
      { id: 'M1', name: 'Mobilisation', weight: 5 }, { id: 'M2', name: 'Stubs', weight: 15 }, { id: 'M3', name: 'Erection', weight: 40 },
    ] };
    const r = computeRaBill({
      contract: { ...baseContract, advanceAmount: 1_600_000, advanceRecoveryPct: 5 }, workOrder: ls,
      previousBills: [{ lines: [{ lineId: 'M1', cumPct: 100 }, { lineId: 'M2', cumPct: 100 }] }],
      advanceRecoveredSoFar: 185_000, tdsPct: 2,
      measurements: [{ id: 'MB-21', woId: 'WO-003', lineId: 'M3', qty: null, pct: 40 }],
    });
    expect(r.gross).toBe(2_960_000);
    expect(r.ded.advance).toBe(148_000);
    expect(r.gst).toBe(532_800);
  });

  it('tds rate from vendor section', () => {
    expect(tdsRate('194C-2')).toBe(2);
    expect(tdsRate('194C-1')).toBe(1);
    expect(tdsRate('194Q')).toBe(0.1);
  });

  it('SPI is 1 until 5% of the schedule has elapsed', () => {
    expect(workOrderProgress(wo, [], [], '2026-03-25').spi).toBe(1);
    const p = workOrderProgress(wo, [{ id: 'm', woId: 'WO-001', lineId: 'A1', qty: 420, pct: null, jms: { status: 'Signed' } }], [], '2026-08-26');
    expect(p.physical).toBeCloseTo((420 * 5850 / (420 * 5850 + 1_000_000)) * 100);
  });
});

describe('financial security ledger', () => {
  it('builds running balances from advance, deductions and releases', () => {
    const s = fsLedger(
      baseContract,
      [
        { id: 'RA-001', contractId: 'CTR-001', date: '2026-05-13', status: 'Paid', ded: { retention: 442_608.5, advance: 885_217, securityDeposit: 100_000 } },
        { id: 'RA-009', contractId: 'CTR-001', date: '2026-06-13', status: 'Submitted', ded: { retention: 999, advance: 999 } },
      ],
      [{ id: 'RR-1', contractId: 'CTR-001', amount: 42_608.5, type: 'Part', status: 'Approved', requestedOn: '2026-07-01' }],
    );
    expect(s.advanceGiven).toBe(4_850_000);
    expect(s.advanceBalance).toBe(3_964_783);
    expect(s.retentionBalance).toBe(400_000);
    expect(s.sdBalance).toBe(100_000);
    expect(s.bgIssues).toHaveLength(1);
  });
});

describe('labour rates', () => {
  it('B1: rejects a rate below minimum wage', () => {
    const errs = validateLabourRate({ trade: 'Painter', region: 'Mumbai', minWage: 640, rate: 620, otMultiplier: 2, effectiveFrom: '2026-04-13' });
    expect(errs.join()).toMatch(/below the statutory minimum wage/);
    expect(validateLabourRate({ trade: 'Mason', region: 'Mumbai', minWage: 720, rate: 950, otMultiplier: 2, effectiveFrom: '2026-04-13' })).toEqual([]);
  });
  it('prefers vendor-specific active rate', () => {
    const rates = [
      { id: 'LR-2', trade: 'Mason', skill: 'S', region: 'Z1', minWage: 720, rate: 950, otMultiplier: 2, effectiveFrom: '2026-01-01', status: 'Active', vendorId: null },
      { id: 'LR-13', trade: 'Mason', skill: 'S', region: 'Z1', minWage: 720, rate: 990, otMultiplier: 2, effectiveFrom: '2026-01-01', status: 'Active', vendorId: 'VEN-5' },
    ];
    expect(findApplicableRate(rates, { trade: 'Mason', region: 'Z1', vendorId: 'VEN-5', date: '2026-05-01' })?.id).toBe('LR-13');
    expect(findApplicableRate(rates, { trade: 'Mason', region: 'Z1', vendorId: 'VEN-9', date: '2026-05-01' })?.id).toBe('LR-2');
  });
});

describe('scorecard', () => {
  const standings: Standing[] = [
    { name: 'Excellent', min: 80, max: 100, color: 'green', warnRfq: false, warnPo: false, preventRfq: false, preventPo: false },
    { name: 'Good', min: 65, max: 80, color: 'blue', warnRfq: false, warnPo: false, preventRfq: false, preventPo: false },
    { name: 'Average', min: 50, max: 65, color: 'amber', warnRfq: true, warnPo: true, preventRfq: false, preventPo: false },
    { name: 'Poor', min: 0, max: 50, color: 'red', warnRfq: true, warnPo: true, preventRfq: true, preventPo: true },
  ];
  it('B6: boundary scores fall into exactly one band', () => {
    expect(standingFor(80, standings)?.name).toBe('Excellent');
    expect(standingFor(79.9, standings)?.name).toBe('Good');
    expect(standingFor(65, standings)?.name).toBe('Good');
    expect(standingFor(100, standings)?.name).toBe('Excellent');
    expect(standingFor(0, standings)?.name).toBe('Poor');
  });
  it('weighted score skips missing metrics', () => {
    expect(weightedScore({ quality: 99, timeliness: 100, safety: null, compliance: 100 }, { quality: 30, timeliness: 30, safety: 20, compliance: 20 })).toBe(100);
  });
});

describe('holds', () => {
  const holds: Hold[] = [
    { id: 'H1', level: 'Vendor', vendorId: 'V6', scope: 'Payments', reason: 'Performance', detail: '', source: 'Scorecard', raisedBy: 'sys', raisedAt: '2026-09-20', status: 'Active' },
    { id: 'H2', level: 'Invoice', vendorId: 'V3', refId: 'INV-8', scope: 'Payments', reason: 'Manual', detail: 'price', source: 'Invoice', raisedBy: 'u', raisedAt: '2026-09-25', status: 'Active' },
    { id: 'H3', level: 'Vendor', vendorId: 'V9', scope: 'All', reason: 'Manual', detail: 'fraud', source: 'Registry', raisedBy: 'u', raisedAt: '2026-01-01', status: 'Active', permanent: true },
  ];
  it('scope decides which gates are blocked', () => {
    expect(blockingHolds(holds, 'payment', 'V6')).toHaveLength(1);
    expect(blockingHolds(holds, 'rfq', 'V6')).toHaveLength(0);
    expect(blockingHolds(holds, 'payment', 'V3', ['INV-8'])).toHaveLength(1);
    expect(blockingHolds(holds, 'payment', 'V3', ['INV-9'])).toHaveLength(0);
    expect(blockingHolds(holds, 'po', 'V9')).toHaveLength(1);
  });
  it('vendor flag is derived from holds', () => {
    expect(vendorHoldFlag(holds, 'V9')).toBe('Blacklisted');
    expect(vendorHoldFlag(holds, 'V6')).toBe('On Hold');
    expect(vendorHoldFlag(holds, 'V3')).toBeNull();
  });
});

describe('compliance', () => {
  const docReqs = [
    { name: 'PAN Card', applies: 'all', expires: false, blocks: true },
    { name: 'Workmen Compensation Policy', applies: 'contractor', expires: true, blocks: true },
  ];
  const insReqs = [{ type: 'Workmen Compensation', applies: 'contractor', min: 5_000_000, blocks: true }];
  it('expired contractor policy blocks', () => {
    const r = vendorCompliance(
      { id: 'V', type: 'Services', isContractor: true, docs: [{ name: 'PAN Card', status: 'Verified', expiry: null }, { name: 'Workmen Compensation Policy', status: 'Verified', expiry: '2026-09-24' }], insurance: [{ type: 'Workmen Compensation', policy: 'p', insurer: 'i', cover: 7_500_000, expiry: '2026-09-24' }] },
      docReqs, insReqs, '2026-09-30',
    );
    expect(r.status).toBe('Non-Compliant');
    expect(r.blocking).toHaveLength(2);
    expect(r.issues.every((i) => i.level === 2)).toBe(true);
  });
  it('goods vendor only needs PAN', () => {
    const r = vendorCompliance({ id: 'G', type: 'Goods', isContractor: false, docs: [{ name: 'PAN Card', status: 'Verified', expiry: null, file: 'x' }] }, docReqs, insReqs, '2026-09-30');
    expect(r.status).toBe('Compliant');
    expect(r.insuranceStatus).toBe('Not required');
  });
});

describe('3-way match', () => {
  const settings = { threeWayQty: 'Stop' as const, rateCheck: 'Warn' as const, rateTolerancePct: 1, receiptRequiredForBill: true };
  it('stops when billed quantity exceeds accepted', () => {
    const r = threeWayMatch([{ desc: 'TMT', unit: 'MT', qty: 40, rate: 58000 }], { 0: 30 }, { 0: 0 }, [{ line: 0, qty: 35, rate: 58000 }], settings);
    expect(r.status).toBe('Mismatch');
    expect(r.blocking).toBe(true);
  });
  it('warns on rate outside tolerance', () => {
    const r = threeWayMatch([{ desc: 'TMT', unit: 'MT', qty: 40, rate: 58000 }], { 0: 40 }, {}, [{ line: 0, qty: 40, rate: 59500 }], settings);
    expect(r.status).toBe('Warning');
  });
});

describe('vendor metrics', () => {
  it('uses ratings, SPI and receipts like the prototype', () => {
    const m = vendorMetrics({ ratings: [{ quality: 4, safety: 4.5 }], woSpis: [0.46], receipts: [], receivedQty: 0, acceptedQty: 0, complianceStatus: 'Compliant' });
    expect(m).toEqual({ quality: 80, timeliness: 46, safety: 90, compliance: 100 });
    // Kaveri in the prototype: unrounded parts give 75, not 76
    expect(weightedScore({ quality: 60, timeliness: 91.6, safety: 80, compliance: 70 }, { quality: 30, timeliness: 30, safety: 20, compliance: 20 })).toBe(75);
    const g = vendorMetrics({ ratings: [], woSpis: [], receipts: [{ date: '2026-08-09', deliveryDate: '2026-08-11' }, { date: '2026-08-20', deliveryDate: '2026-08-11' }], receivedQty: 100, acceptedQty: 99, complianceStatus: 'Compliant' });
    expect(g).toEqual({ quality: 99, timeliness: 77.5, safety: null, compliance: 100 });
    expect(vendorMetrics({ ratings: [], woSpis: [], receipts: [], receivedQty: 0, acceptedQty: 0, complianceStatus: 'Compliant' })).toBeNull();
  });
});

describe('money', () => {
  it('formats lakh / crore', () => {
    expect(fmtINRShort(8_852_170)).toBe('₹88.52 L');
    expect(fmtINRShort(20_600_000)).toBe('₹2.06 Cr');
  });
});
