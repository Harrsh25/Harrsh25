// FLOW WIRING — the new registers are wired into the real flows: a requisition becomes an RFQ, an
// awarded PO and a goods receipt; a hold placed in the register stops POs and payments and its
// release restores them; a change order raised on a contract shows in the register and its
// approval changes the contract value; every step lands in the audit log with a working link.
require('./lib')('flow', async ({ p, go, dlg, S, mut, T, pick, toastText }) => {
  const btn = (t) => p.locator(`button:has-text("${t}")`);
  const esc = () => p.keyboard.press('Escape');
  let rfqId, poId;

  await T('W-01', 'Requisition MR-001 → Create RFQ: lines, project and the link back to the requisition', async () => {
    await go('vendor-management/requisitions?open=MR-001'); await p.waitForTimeout(300); await btn('Create RFQ').click(); await p.waitForTimeout(500); const d = dlg();
    await d.locator('button:has-text("Konkan Steel")').click(); await d.locator('button:has-text("Deccan Steel")').click();
    await d.locator('button:has-text("Save & compose")').click(); await p.waitForTimeout(400); await esc();
    const s = await S(); const r = s.rfqs.find((x) => x.requisitionId === 'MR-001'); rfqId = r?.id; const q = s.requisitions.find((x) => x.id === 'MR-001');
    return [`${r?.id} · ${r?.items.length} lines · ${r?.project} · requisition rfqIds ${q.rfqIds.join(',')}`, !!r && r.items.length === 2 && q.rfqIds.includes(r.id) && r.project === q.project];
  });
  await T('W-02', 'RFQ award → PO carries the RFQ and the requisition shows "% ordered"', async () => {
    await mut((s) => { const r = s.rfqs.find((x) => x.id === s.rfqs.find((y) => y.requisitionId === 'MR-001').id); r.status = 'Quotes Received'; r.sentOn = new Date().toISOString().slice(0, 10);
      r.quotes = [{ vendorId: 'VEN-011', rates: [395, 56900], currency: 'INR', fx: 1, gstPct: 18, deliveryDays: 7, leadDays: [7, 7], noBid: [false, false], discounts: [0, 0], validUntil: '2027-01-31', submittedOn: new Date().toISOString().slice(0, 10), review: 'Accepted', note: '' },
        { vendorId: 'VEN-003', rates: [399, 56500], currency: 'INR', fx: 1, gstPct: 18, deliveryDays: 9, leadDays: [9, 9], noBid: [false, false], discounts: [0, 0], validUntil: '2027-01-31', submittedOn: new Date().toISOString().slice(0, 10), review: 'Accepted', note: '' }]; });
    await go('vendor-management/rfq?open=' + rfqId); await p.waitForTimeout(300); await btn('Award by line').click(); await p.waitForTimeout(250);
    await dlg().locator('label:has-text("Award recommendation") input').fill('L1 per line from requisition'); await dlg().locator('button:has-text("Award & create")').click(); await p.waitForTimeout(400);
    const s = await S(); const pos = s.purchaseOrders.filter((x) => x.rfqId === rfqId); poId = pos[0]?.id;
    await go('vendor-management/requisitions'); await p.waitForTimeout(300); const t = await p.locator('tr:has-text("MR-001")').textContent();
    return [`POs ${pos.map((x) => x.id + ':' + x.vendorId).join(', ')}; requisition row "${t.replace(/\s+/g, ' ').slice(0, 110)}"`, pos.length >= 1 && /\d+% \/ 0%/.test(t) && !/^0% /.test(t.match(/\d+% \/ \d+%/)?.[0] || '')];
  });
  await T('W-03', 'Goods receipt on that PO shows in the Goods Receipts register and opens the PO', async () => {
    await mut((s) => { const po = s.purchaseOrders.find((x) => x.id === s.purchaseOrders.find((y) => y.rfqId === s.rfqs.find((z) => z.requisitionId === 'MR-001').id).id); po.status = 'Issued'; po.approval = { by: 'test', at: new Date().toISOString(), decision: 'Approved' }; });
    await go('vendor-management/purchase-orders?open=' + poId); await p.waitForTimeout(300); await btn('Receive goods').click(); await p.waitForTimeout(200); await dlg().locator('button:has-text("Post GRN")').click(); await p.waitForTimeout(300);
    const g = (await S()).purchaseOrders.find((x) => x.id === poId).receipts.slice(-1)[0];
    await go('vendor-management/goods-receipts'); await p.waitForTimeout(300); await p.locator(`tr:has-text("${g.id}")`).click(); await p.waitForTimeout(500);
    const ok = (await dlg().textContent()).includes(poId);
    await go('vendor-management/requisitions'); const t = await p.locator('tr:has-text("MR-001")').textContent();
    return [`${g.id} listed → opened ${poId}: ${ok}; requisition "${(t.match(/\d+% \/ \d+%/) || [''])[0]}"`, ok && /\/ [1-9]\d*%/.test(t)];
  });
  await T('W-04', 'Hold placed in the Holds Register stops new POs and payments; release restores them', async () => {
    await go('vendor-management/holds'); await btn('Place hold').first().click(); await p.waitForTimeout(200); const d = dlg();
    await pick(d.locator('label:has-text("Vendor") [role=combobox]').last(), 'Deccan Steel'); await pick(d.locator('label:has-text("Scope") [role=combobox]'), 'All');
    await d.locator('label:has-text("Reason") input').fill('Quality dispute under review'); await d.locator('button:has-text("Place hold")').click(); await p.waitForTimeout(300);
    const listed = (await p.textContent('main')).includes('Quality dispute under review');
    await go('vendor-management/purchase-orders'); await btn('New PO').first().click(); await p.waitForTimeout(200); await dlg().locator('label:has-text("Vendor") [role=combobox]').first().click(); await p.waitForTimeout(150);
    const offered = /Deccan Steel/.test(await p.locator('[role=listbox]').textContent()); await esc(); await esc();
    const inv = (await S()).invoices.find((i) => i.vendorId === 'VEN-003' && i.payments.length === 0);
    let stop = 'no unpaid bill';
    if (inv) { await go('vendor-management/invoices?open=' + inv.id); await p.waitForTimeout(300); stop = /Vendor on hold/i.test(await dlg().textContent()) ? 'payment stopped' : 'NOT stopped'; }
    await go('vendor-management/holds'); await p.locator('tr:has-text("Quality dispute") button:has-text("Release")').click(); await p.waitForTimeout(150);
    await dlg().locator('input').last().fill('Dispute settled with credit note'); await dlg().locator('button:has-text("Release hold")').click(); await p.waitForTimeout(300);
    const v = (await S()).vendors.find((x) => x.id === 'VEN-003');
    return [`listed ${listed}; offered on new PO while held: ${offered}; ${stop}; after release ${v.status}`, listed && !offered && stop !== 'NOT stopped' && v.status === 'Active'];
  });
  await T('W-05', 'Change order raised on a contract shows in Change & Variations; approval raises the contract value', async () => {
    const before = (await S()).contracts.find((c) => c.id === 'CTR-004');
    await go('contract-labor/contracts?open=CTR-004'); await p.waitForTimeout(300); await btn('Raise change order').click(); await p.waitForTimeout(200); const d = dlg();
    await d.locator('label:has-text("Change description") input').fill('Extra dewatering — Block C'); await d.locator('label:has-text("Reason") input').fill('Ground water at 2.1 m');
    await d.locator('label:has-text("Value") input').fill('250000'); await d.locator('button:has-text("Submit for approval")').click(); await p.waitForTimeout(300);
    await go('contract-labor/change-orders'); await p.waitForTimeout(300); const listed = (await p.textContent('main')).includes('Extra dewatering');
    await go('contract-labor/contracts?open=CTR-004'); await p.waitForTimeout(300); await p.locator('tr:has-text("Extra dewatering") button:has-text("Approve")').click(); await p.waitForTimeout(300);
    const s = await S(); const c = s.contracts.find((x) => x.id === 'CTR-004'); const co = c.changeOrders.find((o) => o.desc === 'Extra dewatering — Block C');
    await go('contract-labor/change-orders'); const row = await p.locator('tr:has-text("Extra dewatering")').textContent();
    const val = (x) => (Number(x.value) || 0) + (x.changeOrders || []).filter((o) => o.status === 'Approved').reduce((a, o) => a + (Number(o.amount) || 0), 0);
    return [`listed ${listed}; ${co?.id} ${co?.status}; contract value ${val(before)} → ${val(c)}; register shows "${/Approved/.test(row) ? 'Approved' : row.slice(-20)}"`, listed && co?.status === 'Approved' && val(c) === val(before) + 250000 && /Approved/.test(row)];
  });
  await T('W-06', 'Audit log has each step, and its record links open the right record', async () => {
    await go('administration/audit-log'); await p.waitForTimeout(300); const t = await p.textContent('main');
    const steps = ['Created from MR-001', 'Hold released', 'Extra dewatering'].map((x) => [x, t.includes(x) || (x === 'Extra dewatering' && /CO-\d+ (raised|approved)/i.test(t))]);
    await p.locator(`tr:has-text("${poId}")`).first().click().catch(() => {}); await p.waitForTimeout(500);
    const opened = (await p.locator('[role=dialog]').count()) && (await dlg().textContent()).includes(poId);
    return [`${steps.map(([k, v]) => `${k}: ${v}`).join('; ')}; ${poId} link opens it: ${!!opened}`, steps.every((x) => x[1]) && !!opened];
  });
});
