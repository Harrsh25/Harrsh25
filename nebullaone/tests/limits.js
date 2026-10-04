// G11 — PO approval limits (delegation of authority)
require('./lib')('limits', async ({ p, go, dlg, S, mut, T }) => {
  // a draft PO worth ₹70 L (above the ₹50 L Procurement Head limit)
  await mut(`(s) => { s.purchaseOrders.unshift({ id: 'PO-900', vendorId: 'VEN-003', project: s.purchaseOrders[0].project, date: '2026-10-01', deliveryDate: '2026-10-20', status: 'Draft', billingPolicy: 'On received quantity', tolerance: 2, rfqId: null, blanketId: null, returns: [], receipts: [], lines: [{ desc: 'TMT Fe500D 16 mm', unit: 'MT', qty: 120, rate: 58000 }], revisions: [{ rev: 0, at: '2026-10-01T10:00:00Z', by: 'Buyer A', note: 'PO created' }] }); }`);
  await T('LIM-01', 'PO drawer shows the approval chain by value', async () => {
    await go('vendor-management/purchase-orders?open=PO-900'); await p.waitForTimeout(400); const t = await p.locator('[data-drawer]').innerText();
    return [(t.match(/Approval by value[^\n]*/) || ['—'])[0], /Procurement Head — pending → Finance Controller/.test(t) && /Approve as Procurement Head/.test(t)];
  });
  await T('LIM-02', 'First approval (Procurement Head) keeps it Draft; second (Finance Controller) issues it', async () => {
    await p.locator('[data-drawer] button:has-text("Approve as Procurement Head")').click(); await p.waitForTimeout(250);
    const a1 = (await S()).purchaseOrders.find((x) => x.id === 'PO-900');
    await go('approvals/approval-management?module=Purchase%20Orders'); await p.waitForTimeout(300); const row = await p.locator('main tr:has-text("PO-900")').innerText();
    await p.locator('main tr:has-text("PO-900") button:has-text("Approve")').click(); await p.waitForTimeout(250);
    const d = dlg(); if (await d.count()) { const b = d.locator('button:has-text("Approve")').last(); if (await b.count()) { await b.click(); await p.waitForTimeout(250); } }
    const a2 = (await S()).purchaseOrders.find((x) => x.id === 'PO-900'); const log = (await S()).audit.filter((x) => x.id === 'PO-900').map((x) => x.action);
    return [`after L1: ${a1.status} (${a1.approvals.map((x) => x.level)}); list level "${(row.match(/L2 \/ 2[^\n\t]*/) || [''])[0]}"; after L2: ${a2.status}`, a1.status === 'Draft' && /L2 \/ 2 · Finance Controller/.test(row) && a2.status === 'Issued' && a2.approvals.length === 2 && log.some((x) => /Finance Controller approves next/.test(x))];
  });
  await T('LIM-03', 'A small PO needs only the first level', async () => {
    await mut(`(s) => { const x = JSON.parse(JSON.stringify(s.purchaseOrders.find((y) => y.id === 'PO-900'))); Object.assign(x, { id: 'PO-901', status: 'Draft', approvals: [], approval: null, lines: [{ desc: 'Binding wire', unit: 'kg', qty: 100, rate: 90 }] }); s.purchaseOrders.unshift(x); }`);
    await go('vendor-management/purchase-orders?open=PO-901'); await p.waitForTimeout(400); await p.locator('[data-drawer] button:has-text("Approve & issue")').click(); await p.waitForTimeout(250);
    return [(await S()).purchaseOrders.find((x) => x.id === 'PO-901').status, (await S()).purchaseOrders.find((x) => x.id === 'PO-901').status === 'Issued'];
  });
  await T('LIM-04', 'Settings: limits are edited per level; limits must rise level by level', async () => {
    await go('vendor-management/settings'); await p.locator('main [role=tab]:has-text("Gates")').first().click(); await p.waitForTimeout(200);
    const inp = p.locator('main input[aria-label="Approval limit"]'); await inp.nth(1).fill('100'); await p.waitForTimeout(100); const t = await p.locator('main').innerText();
    return [`${(t.match(/Approval limits must go up level by level/) || ['no error'])[0]}`, /PO approval limits/.test(t) && /must go up level by level/.test(t)];
  });
});
