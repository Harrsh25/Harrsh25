// Requisitions: internal stock moves never become RFQs / POs; approval by estimated value
require('./lib')('reqflow', async ({ fill, p, go, dlg, S, mut, T }) => {
  const add = (r) => mut(`(s) => { s.requisitions.unshift(${JSON.stringify(r)}); }`);
  const base = { date: new Date().toISOString().slice(0, 10), requiredBy: '2026-12-31', project: 'Skyline Towers - Phase 1', company: 'NebullaOne Infra Pvt Ltd', requestedBy: 'Site A', rfqIds: [], terms: '', notes: '' };
  await add({ ...base, id: 'MR-801', purpose: 'Material transfer', sourceStore: 'Central Store', targetStore: 'Site Store - Skyline', status: 'Approved', items: [{ desc: 'Shuttering plywood 12 mm', unit: 'sheet', qty: 80, rate: 1450 }] });
  await add({ ...base, id: 'MR-802', purpose: 'Purchase', status: 'Submitted', items: [{ desc: 'TMT Fe500D 16 mm', unit: 'MT', qty: 120, rate: 58000 }] });
  await add({ ...base, id: 'MR-803', purpose: 'Purchase', status: 'Submitted', items: [{ desc: 'Binding wire', unit: 'kg', qty: 200, rate: 90 }] });
  await T('RQ-01', 'Material transfer: no Create RFQ / Create PO; a stock entry completes it', async () => {
    await go('vendor-management/requisitions?open=MR-801'); await p.waitForTimeout(350); const d = p.locator('[data-drawer]');
    const rfq = await d.locator('button:has-text("Create RFQ"), button:has-text("Create PO")').count();
    await d.locator('button:has-text("Create stock transfer")').click(); await p.waitForTimeout(250);
    const r = (await S()).requisitions.find((x) => x.id === 'MR-801'); const t = await d.innerText();
    return [`RFQ/PO buttons ${rfq}; stock entry ${r.stockEntry?.id} ${r.stockEntry?.type}; status shown ${(t.match(/Transferred/) || ['-'])[0]}`, rfq === 0 && r.stockEntry?.type === 'Material Transfer' && /Transferred/.test(t)];
  });
  await T('RQ-02', 'Opening the RFQ / PO link for an internal stock move is refused', async () => {
    await go('vendor-management/rfq?fromReq=MR-801'); await p.waitForTimeout(400); const m1 = await p.locator('[role=dialog]').count();
    await go('vendor-management/purchase-orders?fromReq=MR-801'); await p.waitForTimeout(400); const m2 = await p.locator('[role=dialog]:has-text("purchase order")').count();
    return [`RFQ form opened ${m1}; PO form opened ${m2}`, m1 === 0 && m2 === 0];
  });
  await T('RQ-03', 'High-value requisition (₹69.6 L) needs Procurement Head then Finance Controller', async () => {
    await go('vendor-management/requisitions?open=MR-802'); await p.waitForTimeout(350); const d = p.locator('[data-drawer]');
    const note = (await d.innerText()).match(/Approval by value[^\n]*/)?.[0] || '';
    await d.locator('button:has-text("Approve as Procurement Head")').click(); await p.waitForTimeout(250);
    const s1 = (await S()).requisitions.find((x) => x.id === 'MR-802').status;
    await d.locator('button:has-text("Approve as Finance Controller")').click(); await p.waitForTimeout(250);
    const r = (await S()).requisitions.find((x) => x.id === 'MR-802');
    return [`${note}; after L1 ${s1}; after L2 ${r.status} (${r.approvals.map((a) => a.level).join(' → ')})`, /Procurement Head - pending → Finance Controller/.test(note) && s1 === 'Submitted' && r.status === 'Approved' && r.approvals.length === 2];
  });
  await T('RQ-04', 'Small requisition needs one approval; then Create RFQ / Create PO appear', async () => {
    await go('vendor-management/requisitions?open=MR-803'); await p.waitForTimeout(350); const d = p.locator('[data-drawer]');
    await d.locator('button:has-text("Approve")').last().click(); await p.waitForTimeout(250);
    const r = (await S()).requisitions.find((x) => x.id === 'MR-803'); if (await d.locator('button[title="More actions"]').count()) { await d.locator('button[title="More actions"]').click(); await p.waitForTimeout(100); } const b = await d.locator('button:has-text("Create RFQ"), button:has-text("Create PO")').count();
    return [`${r.status}; RFQ/PO buttons ${b}`, r.status === 'Approved' && b === 2];
  });
});
