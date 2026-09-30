// BENCHMARK SUITE — fields added from Vendor_Module_Benchmark.xlsx: vendor master extras, contacts
// and addresses, bank settings, qualification limits and question library, requisitions, RFQ
// questions, vendor price lists, PO controls, receiving, bills / TDS, payments, scorecard
// criteria, contract terms, worker details and the supplier portal.
require('./lib')('bench', async ({ p, go, dlg, S, mut, T, pick, toastText }) => {
  const btn = (t) => p.locator(`button:has-text("${t}")`);
  const esc = () => p.keyboard.press('Escape');
  const V = async (id) => (await S()).vendors.find((v) => v.id === id);

  await T('BF-01', 'Vendor registration: Udyam number is checked; entity type, MSME and purchasing defaults are saved', async () => {
    await go('vendor-management/registry'); await btn('Register vendor').first().click(); await p.waitForTimeout(250); const d = dlg();
    await d.locator('input').nth(0).fill('Benchmark Cement Co'); await d.locator('button[aria-pressed]:has-text("Cement & Aggregates")').first().click();
    await d.locator('input[placeholder="27AAKCS4412M1Z3"]').fill('27BNCHM4411K1Z5'); await d.locator('input[placeholder="AAKCS4412M"]').fill('BNCHM4411K');
    await d.locator('label:has-text("Contact person") input').first().fill('Asha Rao'); await d.locator('input[type=email]').first().fill('asha@bench.in');
    const sp = async (lbl, v) => { const c = d.locator(`label:has-text("${lbl}") [role=combobox]`); await c.scrollIntoViewIfNeeded(); await p.waitForTimeout(200); await pick(c, v); };
    await sp('MSME type', 'Micro'); await d.locator('label:has-text("Udyam registration no.") input').fill('UDYAM-12');
    await sp('Entity type', 'LLP'); await d.locator('label:has-text("Credit limit") input').fill('2500000');
    await d.locator('button:has-text("Save draft")').click(); await p.waitForTimeout(250); const t = await d.textContent();
    await d.locator('label:has-text("Udyam registration no.") input').fill('UDYAM-MH-26-0012345'); await d.locator('button:has-text("Save draft")').click(); await p.waitForTimeout(300);
    const v = (await S()).vendors.find((x) => x.name === 'Benchmark Cement Co');
    return [`bad Udyam message: ${/Format UDYAM/.test(t)}; saved ${v?.id} ${v?.entityType} / ${v?.msmeType} ${v?.udyamNo} / credit ${v?.creditLimit}`, /Format UDYAM/.test(t) && v?.entityType === 'LLP' && v?.msmeType === 'Micro' && Number(v?.creditLimit) === 2500000];
  });
  await T('BF-02', 'Contacts & addresses tab: add a primary contact and a supplier site', async () => {
    await go('vendor-management/registry?open=VEN-009'); await p.waitForTimeout(300); await dlg().locator('[role=tab]:has-text("Contacts")').click(); await p.waitForTimeout(150);
    await btn('Add contact').click(); await p.waitForTimeout(150); let m = dlg();
    await m.locator('label:has-text("First name") input').fill('Vikas'); await m.locator('label:has-text("Last name") input').fill('Shetty'); await m.locator('label:has-text("Designation") input').fill('Sales head');
    await m.locator('label:has-text("E-mail") input').fill('vikas@nhm.in'); await m.locator('button:has-text("Save contact")').click(); await p.waitForTimeout(200);
    await btn('Add address').click(); await p.waitForTimeout(150); m = dlg();
    await m.locator('label:has-text("Address title") input').fill('Bhosari depot'); await m.locator('label:has-text("Address line 1") input').fill('Plot 9, Bhosari MIDC'); await m.locator('label:has-text("City") input').fill('Pune');
    await m.locator('button:has-text("Save address")').click(); await p.waitForTimeout(200);
    const v = await V('VEN-009');
    return [`contacts ${v.contacts?.length}, primary → ${v.contact.name}; addresses ${v.addresses?.length} (${v.addresses?.[0]?.purposes?.join('/')})`, v.contacts?.length === 1 && v.contact.name === 'Vikas Shetty' && v.addresses?.length === 1];
  });
  await T('BF-03', 'Bank account switched to "payments off" stops payment', async () => {
    await mut((s) => { const v = s.vendors.find((x) => x.id === 'VEN-003'); v.bankAccounts.find((b) => b.isDefault).paymentsEnabled = false; });
    const s = await S(); const inv = s.invoices.find((i) => i.vendorId === 'VEN-003' && i.payments.length === 0);
    await go('vendor-management/invoices?open=' + inv.id); await p.waitForTimeout(300); const t = await dlg().textContent();
    await mut((s2) => { s2.vendors.find((x) => x.id === 'VEN-003').bankAccounts.find((b) => b.isDefault).paymentsEnabled = true; });
    return [(t.match(/Payments are switched off[^·.]*/) || ['no stop'])[0], /Payments are switched off/.test(t)];
  });
  await T('BF-04', 'Frozen vendor is left out of new purchase orders (and returns when unfrozen)', async () => {
    await mut((s) => { s.vendors.find((x) => x.id === 'VEN-003').frozen = true; });
    await go('vendor-management/purchase-orders'); await btn('New PO').first().click(); await p.waitForTimeout(200);
    await dlg().locator('label:has-text("Vendor") [role=combobox]').first().click(); await p.waitForTimeout(150); const t = await p.textContent('body'); await esc(); await esc();
    await mut((s) => { s.vendors.find((x) => x.id === 'VEN-003').frozen = false; });
    await go('vendor-management/purchase-orders'); await btn('New PO').first().click(); await p.waitForTimeout(200);
    await dlg().locator('label:has-text("Vendor") [role=combobox]').first().click(); await p.waitForTimeout(150); const t2 = await p.locator('[role=listbox]').textContent(); await esc(); await esc();
    const t1 = t.slice(t.lastIndexOf('Select vendor'));
    return [`frozen: offered ${/Deccan Steel Traders/.test(t1)}; unfrozen: offered ${/Deccan Steel Traders/.test(t2)}`, !/Deccan Steel Traders/.test(t1) && /Deccan Steel Traders/.test(t2)];
  });
  await T('BF-05', 'Qualification outcome: single-project limit above the aggregate limit is refused', async () => {
    await go('vendor-management/approvals?open=VEN-001'); await p.waitForTimeout(300); await dlg().locator('[role=tab]:has-text("Qualification")').click(); await p.waitForTimeout(200);
    const d = dlg(); await d.locator('label:has-text("Aggregate project limit") input').fill('10000000'); await d.locator('label:has-text("Single project limit") input').fill('20000000'); await p.waitForTimeout(100);
    const t = await d.textContent(); const dis = await d.locator('button:has-text("Save outcome")').isDisabled(); await esc();
    return [`save disabled=${dis}; ${(t.match(/Single-project limit can't be above[^.]*/) || ['no msg'])[0]}`, dis && /can't be above the aggregate/.test(t)];
  });
  await T('BF-06', 'Critical library question answered "No" blocks final approval', async () => {
    await mut((s) => { const v = s.vendors.find((x) => x.id === 'VEN-007'); v.qualification = { ...(v.qualification || { score: 80, ruleSet: 'x', answers: {} }), libAnswers: { 'QL-1': 'No' } }; });
    await go('vendor-management/approvals?open=VEN-007'); await p.waitForTimeout(300); const t = await dlg().textContent();
    return [(t.match(/Critical question failed[^·]*/) || ['not shown'])[0].slice(0, 90), /Critical question failed/.test(t)];
  });
  await T('BF-07', 'Manpower requisition → approve → Create RFQ pre-fills lines and the contractor distribution list', async () => {
    await go('vendor-management/requisitions?open=MR-002'); await p.waitForTimeout(300); await btn('Approve').last().click(); await p.waitForTimeout(200);
    await btn('Create RFQ').click(); await p.waitForTimeout(500); const d = dlg(); const title = await d.locator('label:has-text("Title") input').first().inputValue(); const t = await d.textContent();
    await d.locator('button:has-text("Save & compose")').click(); await p.waitForTimeout(400); await esc();
    const s = await S(); const r = s.rfqs.find((x) => x.requisitionId === 'MR-002'); const q = s.requisitions.find((x) => x.id === 'MR-002');
    return [`RFQ ${r?.id} "${title}" vendors ${r?.vendorIds.join(',')}; requisition links ${q.rfqIds.join(',')}`, !!r && r.vendorIds.length === 2 && q.rfqIds.includes(r.id) && /Mason/.test(title)];
  });
  await T('BF-08', 'RFQ requirement question must be answered with the quote', async () => {
    await mut((s) => { const r = s.rfqs.find((x) => x.id === 'RFQ-001'); r.questions = [{ text: 'Mill test certificate with each lot?', type: 'Yes / No', options: '', required: true }]; });
    await go('vendor-management/rfq?open=RFQ-001'); await p.waitForTimeout(300); await btn("Record quote on vendor's behalf").click(); await p.waitForTimeout(300);
    const d = dlg(); const t = await d.textContent();
    return [`question shown: ${/Mill test certificate/.test(t)}; error: ${/Answer question 1/.test(t)}`, /Mill test certificate/.test(t) && /Answer question 1/.test(t)];
  });
  await T('BF-09', 'Vendor price list: a price is suggested on a new PO for that vendor and item', async () => {
    await esc(); await esc(); await go('vendor-management/purchase-orders'); await btn('New PO').first().click(); await p.waitForTimeout(200); const d = dlg();
    await pick(d.locator('label:has-text("Vendor") [role=combobox]').first(), 'UltraBuild'); await d.locator('input[placeholder="Description"]').first().fill('OPC 53 grade cement (50 kg bag)'); await d.locator('input[placeholder="Qty"]').first().fill('1200'); await p.waitForTimeout(150);
    const t = await d.textContent(); await esc();
    return [(t.match(/Price list [^:]*: ₹[\d,]+[^U]*/) || ['no suggestion'])[0].slice(0, 70), /Price list .*₹390/.test(t)];
  });
  await T('BF-10', 'PO below the approval minimum is issued directly', async () => {
    await go('vendor-management/purchase-orders'); await btn('New PO').first().click(); await p.waitForTimeout(200); const d = dlg();
    await pick(d.locator('label:has-text("Vendor") [role=combobox]').first(), 'Deccan Steel'); await d.locator('input[placeholder="Description"]').first().fill('Binding wire 18 SWG');
    await d.locator('input[placeholder="Qty"]').first().fill('100'); await d.locator('input[placeholder="Rate"]').first().fill('92'); await p.waitForTimeout(100);
    await d.locator('button:has-text("Create & issue")').click(); await p.waitForTimeout(300);
    const po = (await S()).purchaseOrders[0];
    return [`${po.id} ${po.status} — ${po.approval?.remark}`, po.status === 'Issued' && /threshold/.test(po.approval?.remark || '')];
  });
  await T('BF-11', 'Same item twice on a PO is blocked (setting off)', async () => {
    await go('vendor-management/purchase-orders'); await btn('New PO').first().click(); await p.waitForTimeout(200); const d = dlg();
    await pick(d.locator('label:has-text("Vendor") [role=combobox]').first(), 'Deccan Steel'); await d.locator('button:has-text("Add line")').click();
    for (const i of [0, 1]) { await d.locator('input[placeholder="Description"]').nth(i).fill('Nails assorted'); await d.locator('input[placeholder="Qty"]').nth(i).fill('10'); await d.locator('input[placeholder="Rate"]').nth(i).fill('80'); }
    await p.waitForTimeout(100); const t = await d.textContent(); const dis = await d.locator('button:has-text("Create & issue"), button:has-text("Create & send")').first().isDisabled(); await esc();
    return [`disabled=${dis}; message ${/same item appears twice/.test(t)}`, dis && /same item appears twice/.test(t)];
  });
  await T('BF-12', 'Blind receiving hides the ordered quantity on the goods receipt; inspection is recorded', async () => {
    await mut((s) => { s.settings = { ...(s.settings || {}), blindReceiving: true }; });
    await go('vendor-management/purchase-orders?open=PO-003'); await p.waitForTimeout(300); await btn('Receive goods').click(); await p.waitForTimeout(200); const d = dlg();
    const head = await d.locator('thead').first().textContent(); await d.locator('label:has-text("Batch / serial no.") input').fill('LOT-77'); await d.locator('label:has-text("Supplier delivery note") input').fill('CH-4411').catch(() => {});
    await d.locator('button:has-text("Post GRN")').click(); await p.waitForTimeout(300);
    await mut((s) => { s.settings.blindReceiving = false; });
    const g = (await S()).purchaseOrders.find((x) => x.id === 'PO-003').receipts.slice(-1)[0];
    return [`header "${head}"; ${g?.id} inspection batch ${g?.inspection?.batch}`, !/Ordered/.test(head) && g?.inspection?.batch === 'LOT-77'];
  });
  await T('BF-13', 'Cheque payment needs the cheque number', async () => {
    const s = await S(); const inv = s.invoices.find((i) => i.payments.length === 0 && i.review !== 'Pending' && i.posted !== false && i.vendorId !== 'VEN-012');
    await go('vendor-management/invoices?open=' + inv.id); await p.waitForTimeout(300); await btn('Record payment').first().click(); await p.waitForTimeout(200); const d = dlg();
    await pick(d.locator('label:has-text("Payment mode") [role=combobox]'), 'Cheque'); await p.waitForTimeout(100);
    const t = await d.textContent(); const dis = await d.locator('button:has-text("Release payment")').isDisabled(); await esc();
    return [`release disabled=${dis}; ${/Cheque no. is required/.test(t)}`, dis && /Cheque no. is required/.test(t)];
  });
  await T('BF-14', 'Bill paid at entry records the payment; manual TDS is kept', async () => {
    await mut((s) => { s.vendors.find((x) => x.id === 'VEN-013').allowBillWithoutPO = true; });
    await go('vendor-management/invoices'); await p.locator('button:has-text("Enter vendor bill"), button:has-text("New bill"), button:has-text("Enter bill")').first().click(); await p.waitForTimeout(200); const d = dlg();
    await d.locator('button:has-text("Without PO")').click(); await pick(d.locator('label:has-text("Vendor") [role=combobox]').first(), 'Hilti');
    await d.locator('label:has-text("Vendor invoice no.") input').fill('HLT/BF/14'); await d.locator('input[placeholder="Service / item"]').fill('Drill bits'); await d.locator('input[placeholder="Rate"]').fill('1000');
    await d.locator('text=Paid at entry').click(); await d.locator('label:has-text("Paid amount") input').fill('1180'); await pick(d.locator('label:has-text("Cash / bank account") [role=combobox]'), 'Petty cash');
    await d.locator('text=Edit tax withholding entries').click(); await d.locator('label:has-text("TDS amount") input').fill('0');
    await d.locator('button:has-text("Save bill")').click(); await p.waitForTimeout(300);
    const inv = (await S()).invoices.find((i) => i.number === 'HLT/BF/14');
    return [`${inv?.id} payments ${inv?.payments.length} (${inv?.payments[0]?.paidFrom}); TDS manual ${inv?.tdsSetup?.manual}`, inv?.payments.length === 1 && inv.tdsSetup?.edit === true];
  });
  await T('BF-15', 'Scorecard criterion with a bad formula is refused', async () => {
    await go('vendor-management/scorecard'); await p.waitForTimeout(300); await p.getByText('Metric model', { exact: true }).first().click(); await p.waitForTimeout(200);
    const f = p.locator('input[placeholder="e.g. 100 - {rejection_pct} * 2"]').first(); await f.fill('{quality} * abc'); await p.waitForTimeout(100);
    const t = await p.textContent('body'); const dis = await btn('Save model').isDisabled();
    return [`save disabled=${dis}; ${/is not valid/.test(t)}`, dis && /is not valid/.test(t)];
  });
  await T('BF-16', 'TDS category with a rate above 100% is refused in settings', async () => {
    await go('vendor-management/settings'); await p.waitForTimeout(300);
    const sec = p.locator('section:has(h3:has-text("Tax withholding (TDS) categories"))'); await sec.locator('tbody tr').first().locator('input[type=number]').first().fill('150');
    await btn('Save settings').click(); await p.waitForTimeout(200); const t = await toastText();
    return [`"${t.slice(0, 60)}"`, /rate must be 0–100/.test(t)];
  });
  await T('BF-17', 'Contract with "fulfilment required" needs a deadline', async () => {
    await go('contract-labor/contracts'); await p.locator('button:has-text("Create contract"), button:has-text("New contract")').first().click(); await p.waitForTimeout(250); const d = dlg();
    await d.locator('text=Fulfilment required').click(); await p.waitForTimeout(100); const t = await d.textContent(); await esc();
    return [`needed: ${(t.match(/Needed: [^C]*/) || [''])[0].slice(0, 80)}`, /fulfilment deadline/.test(t)];
  });
  await T('BF-18', 'Add worker: bill rate below pay rate is refused', async () => {
    await go('contract-labor/attendance'); await p.waitForTimeout(300); await btn('Add worker').first().click(); await p.waitForTimeout(200); const d = dlg();
    await d.locator('label:has-text("Full name") input').fill('Ramesh Pawar'); await d.locator('label:has-text("Date of birth") input').fill('1990-05-01');
    await d.locator('label:has-text("Pay rate") input').fill('900'); await d.locator('label:has-text("Bill rate") input').fill('800'); await pick(d.locator('label:has-text("Residential status") [role=combobox]'), 'Inter-state migrant');
    const t = await d.textContent(); const dis = await d.locator('button:has-text("Add")').last().isDisabled(); await esc();
    return [`disabled=${dis}; ${/Bill rate can't be below/.test(t)}`, dis && /Bill rate can't be below/.test(t)];
  });
  await T('BF-19', 'Supplier portal: vendor sees and maintains its own price list', async () => {
    await p.evaluate(() => localStorage.removeItem('nxv-vendor-session')); await go('#/supplier/login');
    const em = (await V('VEN-004')).contact.email; await p.locator('input[type=email]').fill(em); await p.click('text=Send one-time code');
    const code = (await p.locator('b.mono').textContent()).trim(); await p.locator('input[placeholder="••••••"]').fill(code); await p.click('button:has-text("Sign in")'); await p.waitForTimeout(400);
    await p.getByText('Pricelist', { exact: true }).click(); await p.waitForTimeout(200); const t = await p.textContent('body');
    return [`my price list shown: ${/My price list/.test(t)}; cement price: ${/OPC 53 grade cement/.test(t)}`, /My price list/.test(t) && /OPC 53 grade cement/.test(t)];
  });
});
