// Dispatch notice: vendor says what it sent, site checks it at goods receipt, differences are flagged to both sides
const run = require('./lib');
run('dispatch', async ({ p, go, dlg, S, mut, T, pick }) => {
  const portalAs = async (name) => { await go('vendor-management/portal'); await pick(p.locator('label:has-text("Viewing as") [role=combobox]'), name); await p.waitForTimeout(200); };
  const portalPo = async (id) => { await portalAs('Pioneer Cement'); await p.getByText('Purchase orders', { exact: true }).first().click(); await p.waitForTimeout(150); await p.locator(`tr:has-text("${id}")`).first().click(); await p.waitForTimeout(250); };
  await T('DS-01', 'A notice on the way shows on the buyer\'s PO list and record', async () => {
    await go('vendor-management/purchase-orders'); const row = await p.locator('tr:has-text("PO-003")').first().innerText();
    await p.locator('tr:has-text("PO-003")').first().click(); await p.waitForTimeout(250); const d = await p.locator('[data-drawer]').last().innerText();
    return [`list: ${/Dispatched - awaiting receipt/.test(row)}; record: notice ${/DSP-002/.test(d)}, section ${/Dispatch notices from the vendor/.test(d)}`, /Dispatched - awaiting receipt/.test(row) && /DSP-002/.test(d)];
  });
  await T('DS-02', 'Vendor sends a dispatch notice from the portal; more than pending is refused', async () => {
    await portalPo('PO-003'); await p.locator('button:has-text("Send dispatch notice")').click(); await p.waitForTimeout(200); const d = dlg();
    await d.locator('input[aria-label^="Sending now - Manufactured"]').fill('350'); await p.waitForTimeout(100);
    const tooMuch = /Only 300 pending/.test(await d.innerText()), blocked = await d.locator('button:has-text("Send notice")').isDisabled();
    await d.locator('input[aria-label^="Sending now - Manufactured"]').fill(''); await d.locator('input[aria-label^="Sending now - 20 mm"]').fill('400');
    await d.locator('label:has-text("Expected arrival") input').fill(new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10));
    await d.locator('label:has-text("Challan no.") input').fill('KA/MS/0533'); await d.locator('label:has-text("Vehicle no.") input').fill('MH14 KQ 9001');
    await d.locator('button:has-text("Send notice")').click(); await p.waitForTimeout(250);
    const x = (await S()).purchaseOrders.find((q) => q.id === 'PO-003').dispatches.find((q) => q.challan === 'KA/MS/0533');
    return [`over-pending message ${tooMuch}, blocked ${blocked}; saved ${x?.id} ${JSON.stringify(x?.lines)}`, tooMuch && blocked && x && x.lines.length === 1 && x.lines[0].qty === 400];
  });
  await T('DS-03', 'Receive goods opens with the vendor\'s quantities and challan; site enters what arrived', async () => {
    await go('vendor-management/purchase-orders?open=PO-003'); await p.waitForTimeout(250); await p.locator('[data-drawer] button:has-text("Receive goods")').click(); await p.waitForTimeout(250); const d = dlg();
    const id = (await S()).purchaseOrders.find((q) => q.id === 'PO-003').dispatches.find((q) => q.challan === 'KA/MS/0533').id;
    await pick(d.locator('label:has-text("Dispatch notice") [role=combobox]'), `${id} - challan KA/MS/0533`); await p.waitForTimeout(150);
    const qty = d.locator('tbody input'); const pre = [await qty.nth(0).inputValue(), await qty.nth(2).inputValue()];
    await qty.nth(2).fill('380'); await p.waitForTimeout(100); const warn = /differs from the vendor's dispatch notice/.test(await d.innerText());
    await d.locator('label:has-text("Received by") input').fill('Ravi (stores)');
    await d.locator('button:has-text("Post GRN")').click(); await p.waitForTimeout(300);
    const po = (await S()).purchaseOrders.find((q) => q.id === 'PO-003'), x = po.dispatches.find((q) => q.id === id), g = po.receipts.find((r) => r.id === x.grnId), challan = g?.details?.deliveryNote, vehicle = g?.details?.vehicleNo;
    return [`prefilled ${pre.join('/')}, challan "${challan}", vehicle "${vehicle}"; warning ${warn}; GRN ${g?.id} against ${g?.dispatchId}, received by ${g?.receivedBy}`, pre[0] === '0' && pre[1] === '400' && challan === 'KA/MS/0533' && vehicle === 'MH14 KQ 9001' && warn && g && g.dispatchId === id && g.receivedBy === 'Ravi (stores)'];
  });
  await T('DS-04', 'The difference shows on the PO and in the Exception Center', async () => {
    await go('vendor-management/purchase-orders?open=PO-003'); await p.waitForTimeout(250); const d = await p.locator('[data-drawer]').last().innerText();
    await go('administration/exceptions'); await p.waitForTimeout(300); const t = await p.locator('main').innerText();
    return [`PO: ${/Short by 20 cum/.test(d)}; exceptions: PO-003 ${/Short receipt against dispatch[\s\S]*PO-003|PO-003[\s\S]*Short receipt against dispatch/.test(t)}, seeded PO-001 ${/DSP-001/.test(t)}`, /Short by 20 cum/.test(d) && /Short receipt against dispatch/.test(t) && /DSP-001/.test(t)];
  });
  await T('DS-05', 'The vendor sees sent vs received in the portal', async () => {
    await portalPo('PO-003'); await p.locator('[data-drawer] [role=tab]').filter({ hasText: 'Dispatch notices' }).first().click(); await p.waitForTimeout(150);
    const t = await p.locator('[data-drawer]').last().innerText();
    return [/you sent 400 cum, buyer received 380 cum/.test(t) && /Short by 20 cum/.test(t) ? 'you sent 400 cum, buyer received 380 cum - Short by 20 cum' : t.slice(0, 300), /you sent 400 cum, buyer received 380 cum/.test(t) && /Short by 20 cum/.test(t)];
  });
  await T('DS-06', 'A notice not received in time is flagged "Dispatched, not received"', async () => {
    await mut((s) => { const x = s.purchaseOrders.find((q) => q.id === 'PO-003').dispatches.find((q) => q.id === 'DSP-002'); x.eta = new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10); });
    await go('vendor-management/purchase-orders'); const row = await p.locator('tr:has-text("PO-003")').first().innerText();
    await go('administration/exceptions'); await p.waitForTimeout(300); const t = await p.locator('main').innerText();
    return [`list chip: ${/Dispatched, not received/.test(row)}; exception: ${/Dispatched, not received/.test(t)}`, /Dispatched, not received/.test(row) && /Dispatched, not received/.test(t)];
  });
});
