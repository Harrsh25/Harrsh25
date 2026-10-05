// Batch 5 - close-out (punch → final inspection → handover → final bill → retention → closure) and portal invoices
require('./lib')('fix5', async ({ fill, p, go, dlg, S, mut, as, T, pick, toastText }) => {
  const btn = (t) => p.locator(`button:has-text("${t}")`);
  const portalAs = async (name) => { await go('vendor-management/portal'); await pick(p.locator('label:has-text("Viewing as") [role=combobox]'), name); await p.waitForTimeout(200); };
  await mut((s) => { const po = s.purchaseOrders.find((x) => x.id === 'PO-003'); po.receipts.push({ id: 'GRN-091', date: new Date().toISOString().slice(0, 10), lines: po.lines.map((l, i) => ({ line: i, qty: 10, accepted: 10 })) }); });
  await T('G-18a', 'Vendor submits an invoice in the portal → waits for AP review, not payable', async () => {
    await portalAs('Pioneer Cement'); await p.getByText('Bills & payments', { exact: true }).click(); await p.waitForTimeout(150);
    await btn('Submit invoice').click(); await p.waitForTimeout(200); const d = dlg();
    await d.locator('label:has-text("Your invoice no.") input').fill('PCA/26-27/118');
    await d.locator('input[type=file]').setInputFiles({ name: 'inv.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 x') }); await p.waitForTimeout(200);
    await d.locator('button:has-text("Submit invoice")').click(); await p.waitForTimeout(250);
    const inv = (await S()).invoices.find((i) => i.number === 'PCA/26-27/118');
    await go('vendor-management/invoices?open=' + inv.id); await p.waitForTimeout(300); const t = await dlg().textContent(); const payBtn = await btn('Record payment').count();
    return [`${inv.id} review=${inv.review}; drawer shows AP review=${/AP review/.test(t)}; payment button ${payBtn ? 'shown' : 'hidden'}`, inv.review === 'Pending' && /AP review/.test(t) && payBtn === 0];
  });
  await T('G-18b', 'Duplicate invoice number rejected in the portal', async () => {
    await mut((s) => { const po = s.purchaseOrders.find((x) => x.id === 'PO-003'); po.receipts.push({ id: 'GRN-093', date: new Date().toISOString().slice(0, 10), lines: po.lines.map((l, i) => ({ line: i, qty: 1, accepted: 1 })) }); });
    await portalAs('Pioneer Cement'); await p.getByText('Bills & payments', { exact: true }).click(); await btn('Submit invoice').click(); await p.waitForTimeout(200); const d = dlg();
    await d.locator('label:has-text("Your invoice no.") input').fill('PCA/26-27/118'); await p.waitForTimeout(100); const t = await d.textContent(); await p.keyboard.press('Escape');
    return [/already been submitted/.test(t) ? 'duplicate blocked' : 'not blocked', /already been submitted/.test(t)];
  });
  await T('G-18c', 'AP review: invoice can\'t be paid until accepted; accepting makes it payable', async () => {
    const inv = (await S()).invoices.find((i) => i.number === 'PCA/26-27/118');
    await go('vendor-management/invoices?open=' + inv.id); await p.waitForTimeout(300); const pay0 = await btn('Record payment').count();
    await btn('Accept invoice').click(); await p.waitForTimeout(150);
    const r2 = (await S()).invoices.find((i) => i.id === inv.id);
    await go('vendor-management/invoices?open=' + inv.id); await p.waitForTimeout(300); const pay = await btn('Record payment').count();
    return [`before review: payment button ${pay0 ? 'shown' : 'hidden'}; after accept: ${r2.review} (by ${r2.reviewedBy}); payment button ${pay ? 'shown' : 'hidden'}`, pay0 === 0 && r2.review === 'Accepted' && pay > 0];
  });
  await T('G-18d', 'Rejected invoice returns to the vendor; corrected invoice can be resubmitted', async () => {
    await mut((s) => { const po = s.purchaseOrders.find((x) => x.id === 'PO-003'); po.receipts.push({ id: 'GRN-092', date: new Date().toISOString().slice(0, 10), lines: po.lines.map((l, i) => ({ line: i, qty: 5, accepted: 5 })) }); });
    await as(null); await portalAs('Pioneer Cement'); await p.getByText('Bills & payments', { exact: true }).click(); await btn('Submit invoice').click(); await p.waitForTimeout(200); let d = dlg();
    await d.locator('label:has-text("Your invoice no.") input').fill('PCA/26-27/119'); await d.locator('input[type=file]').setInputFiles({ name: 'inv.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF') }); await p.waitForTimeout(150);
    await d.locator('button:has-text("Submit invoice")').click(); await p.waitForTimeout(200);
    const inv = (await S()).invoices.find((i) => i.number === 'PCA/26-27/119');
    await as('Anita Joshi'); await go('vendor-management/invoices?open=' + inv.id); await p.waitForTimeout(300); await dlg().locator('label:has-text("AP remark") input').fill('GST number missing on invoice'); await btn('Reject').click(); await p.waitForTimeout(150);
    await as(null); await portalAs('Pioneer Cement'); await p.getByText('Bills & payments', { exact: true }).click(); await p.waitForTimeout(150); const t = await p.locator('tbody').first().textContent();
    await btn('Submit invoice').click(); await p.waitForTimeout(200); d = dlg(); await d.locator('label:has-text("Your invoice no.") input').fill('PCA/26-27/119'); await p.waitForTimeout(100); const t2 = await d.textContent(); await p.keyboard.press('Escape');
    return [`portal row shows Rejected=${/Rejected/.test(t)}; same number allowed again=${!/already been submitted/.test(t2)}`, /Rejected/.test(t) && !/already been submitted/.test(t2)];
  });
  await T('G-10a', 'Retention after DLP needs a handover certificate', async () => {
    await as(null); await go('contract-labor/retention'); await btn('Request retention release').click(); await p.waitForTimeout(200); const d = dlg();
    await pick(d.locator('label:has-text("Contract") [role=combobox]'), 'CTR-004'); await pick(d.locator('label:has-text("Basis") [role=combobox]'), 'After DLP'); await d.locator('label:has-text("Amount") input').fill('1000'); await p.waitForTimeout(100);
    const t = await d.textContent(); const dis = await d.locator('button:has-text("Raise request")').isDisabled(); await p.keyboard.press('Escape');
    return [`raise disabled=${dis}; "${(t.match(/No handover certificate yet[^.]*/) || [''])[0]}"`, dis && /No handover certificate yet/.test(t)];
  });
  await mut((s) => { const w = s.workOrders.find((x) => x.id === 'WO-004'); w.status = 'Short-closed'; w.closedReason = 'Block C scope complete'; const m = s.measurements.find((x) => x.id === 'MB-027'); m.voided = true; m.jms = { status: 'Disputed', remark: 'void' }; s.claims.forEach((c) => { if (c.woId === 'WO-004') c.status = 'Returned'; }); s.ncrs.forEach((n) => { if (n.woId === 'WO-004') n.status = 'Closed'; }); });
  await T('G-10b', 'Punch item blocks the final inspection until closed', async () => {
    await as('Vikram Rao'); await go('contract-labor/closeout?open=CTR-004'); await p.waitForTimeout(300);
    await btn('Add punch item').click(); await p.waitForTimeout(150); await dlg().locator('label:has-text("Snag") input').fill('Level the spoil heap at Block C north'); await dlg().locator('button:has-text("Save")').click(); await p.waitForTimeout(150);
    const dis = await btn('Record final inspection').isDisabled();
    await portalAs('Sai Earthmovers'); await p.getByText('Punch list', { exact: true }).click(); await p.waitForTimeout(150); await btn('Mark rectified').click(); await p.waitForTimeout(150);
    await as('Vikram Rao'); await go('contract-labor/closeout?open=CTR-004'); await p.waitForTimeout(300); await btn('Verify & close').click(); await p.waitForTimeout(150);
    const dis2 = await btn('Record final inspection').isDisabled();
    return [`inspection disabled with open snag=${dis}; after contractor rectified + verified: disabled=${dis2}`, dis && !dis2];
  });
  await T('G-10c', 'Failed final inspection → snags to punch list; pass → handover certificate', async () => {
    await btn('Record final inspection').click(); await p.waitForTimeout(150); let d = dlg();
    await d.getByRole('button', { name: 'Failed', exact: true }).click(); await d.locator('label:has-text("Remarks") input').fill('Walk-through with client'); await d.locator('textarea:not([aria-label="Write a comment"])').fill('Drain outlet at C-7 blocked'); await d.locator('button:has-text("Save")').click(); await p.waitForTimeout(200);
    const open1 = (await S()).punchItems.filter((x) => x.contractId === 'CTR-004' && x.status === 'Open').length;
    await p.locator('tr:has-text("Drain outlet") button:has-text("Mark rectified")').click(); await p.waitForTimeout(100); await p.locator('tr:has-text("Drain outlet") button:has-text("Verify & close")').click(); await p.waitForTimeout(150);
    await btn('Record final inspection').click(); await p.waitForTimeout(150); d = dlg(); await d.locator('label:has-text("Remarks") input').fill('All clear'); await d.locator('button:has-text("Save")').click(); await p.waitForTimeout(150);
    await btn('Issue handover certificate').click(); await p.waitForTimeout(150); d = dlg(); await d.locator('label:has-text("Taken over by") input').fill('Client civil team'); await d.locator('button:has-text("Issue certificate")').click(); await p.waitForTimeout(200);
    const c = (await S()).contracts.find((x) => x.id === 'CTR-004');
    return [`snags after failed inspection ${open1}; handover ${c.handover?.date} by ${c.handover?.by}; status ${c.status}`, open1 === 1 && !!c.handover];
  });
  await T('G-10d', 'Final bill settles remaining work and stops further billing', async () => {
    await as('Sneha Iyer'); await go('contract-labor/closeout?open=CTR-004'); await p.waitForTimeout(300); await btn('Prepare final bill').click(); await p.waitForTimeout(300); const d = dlg();
    const checked = await d.locator('label:has-text("Final bill for") input[type=checkbox]').isChecked().catch(() => false);
    await d.locator('button:has-text("Submit for certification")').click(); await p.waitForTimeout(250);
    const s = await S(); const b = s.raBills.find((x) => x.contractId === 'CTR-004' && x.final);
    await go('contract-labor/ra-bills'); await btn('Prepare RA bill').click(); await p.waitForTimeout(200); const t = await dlg().textContent(); await p.keyboard.press('Escape');
    return [`final checkbox preset=${checked}; final bill ${b?.id} ${b?.status}; WO-004 offered again=${/WO-004 -/.test(t)}`, !!b && !/WO-004 -/.test(t)];
  });
  await T('G-10e', 'Stage tracker on the close-out list', async () => {
    await go('contract-labor/closeout'); await p.waitForTimeout(200); const t = await p.locator('tbody').first().textContent();
    return [`CTR-004 row: ${(t.match(/CTR-004.*?(Final payment|Final bill|Defect liability|Handover)/) || ['?', '?'])[1]}`, /Final payment/.test(t)];
  });
  await T('G-11b', 'Fully settled contract (CTR-005) closes after retention release', async () => {
    await as('Rohit Shah'); await go('contract-labor/retention'); await p.getByText('Retention releases', { exact: true }).click(); await p.locator('tr:has-text("RR-001") button:has-text("Approve")').click(); await p.waitForTimeout(150);
    await as('Anita Joshi'); await go('contract-labor/retention'); await p.getByText('Retention releases', { exact: true }).click(); await p.locator('tr:has-text("RR-001") button:has-text("Release payment")').click(); await p.waitForTimeout(150);
    // final settlement and contractor release (Lifecycle F) are covered in lifecycle.js - recorded directly here
    await mut((s) => { const c = s.contracts.find((x) => x.id === 'CTR-005'); c.settlement = { status: 'Agreed', net: 0, agreedBy: 'test', agreedAt: new Date().toISOString().slice(0, 10) }; c.release = { no: 'REL-T', date: new Date().toISOString().slice(0, 10), contractorSignatory: 'test', by: 'test' }; });
    await as('Arjun Mehta'); await go('contract-labor/closeout?open=CTR-005'); await p.waitForTimeout(300);
    const open = await dlg().locator('li:has(svg.text-amber-500)').allTextContents();
    await dlg().locator('button:has-text("Close contract")').click(); await p.waitForTimeout(200);
    const s = await S(); const c = s.contracts.find((x) => x.id === 'CTR-005'), w = s.workOrders.find((x) => x.id === 'WO-006');
    return [`open items before close: ${open.length ? open.join('; ') : 'none'}; CTR-005 ${c.status}, WO-006 ${w.status}`, c.status === 'Closed' && w.status === 'Closed'];
  });
  await T('G-11c', 'Closed contract: measurement book frozen', async () => {
    await go('contract-labor/measurement-book'); await btn('Record measurement').first().click(); await p.waitForTimeout(200);
    await dlg().locator('label:has-text("Work order") [role=combobox]').click(); await p.waitForTimeout(100); const opts = (await p.locator('[role=listbox] [role=option]').allTextContents()).join('|'); await p.keyboard.press('Escape'); await p.keyboard.press('Escape');
    return [`WO-006 in measurement picker: ${opts.includes('WO-006')}`, !opts.includes('WO-006')];
  });
});
