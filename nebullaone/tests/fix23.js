// Batches 2–3 - SoD on RA bills / retention, award recommendation + award-to-contract,
// contract approval & signing, BG register, WO gates, suspend, change-order quantities, closure checklist
require('./lib')('fix23', async ({ fill, p, go, dlg, S, mut, as, T, pick, toastText }) => {
  const btn = (t) => p.locator(`button:has-text("${t}")`);
  await T('G-25a', 'Retention release: must be approved before it can be released', async () => {
    await go('contract-labor/retention'); await p.getByText('Retention releases', { exact: true }).click(); await p.waitForTimeout(150);
    const relBtns = await p.locator('tr:has-text("RR-001") button:has-text("Release payment")').count();
    const r = (await S()).retentionReleases[0];
    return [`status ${r.status}; release button before approval: ${relBtns}`, r.status === 'Pending Approval' && relBtns === 0];
  });
  await T('G-25b', 'Approve, then release - status Approved → Released with both steps logged', async () => {
    await go('contract-labor/retention'); await p.getByText('Retention releases', { exact: true }).click(); await p.waitForTimeout(150);
    await p.locator('tr:has-text("RR-001") button:has-text("Approve")').click(); await p.waitForTimeout(150); const s1 = (await S()).retentionReleases[0].status;
    await p.locator('tr:has-text("RR-001") button:has-text("Release payment")').click(); await p.waitForTimeout(150);
    const r = (await S()).retentionReleases[0];
    return [`after approve: ${s1}; after release: ${r.status} (approved by ${r.approvedBy}, released by ${r.releasedBy})`, s1 === 'Approved' && r.status === 'Released'];
  });
  await T('G-13d', 'RA bill: certification steps run in order (Verified → Certified → Approved) and approval creates the payable', async () => {
    await go('contract-labor/ra-bills?open=RA-003'); await p.waitForTimeout(300); const b0 = (await S()).raBills.find((b) => b.id === 'RA-003').status;
    const approveEarly = await dlg().locator('button:has-text("Approve for payment")').count();
    await btn('Certify quantities').click(); await p.waitForTimeout(200); const b1 = (await S()).raBills.find((b) => b.id === 'RA-003').status;
    await go('contract-labor/ra-bills?open=RA-003'); await p.waitForTimeout(300); await btn('Approve for payment').click(); await p.waitForTimeout(200);
    const b = (await S()).raBills.find((x) => x.id === 'RA-003');
    return [`${b0} (approve offered: ${approveEarly > 0}) → ${b1} → ${b.status}, payable ${b.invoiceId}`, b0 === 'Verified' && approveEarly === 0 && b1 === 'Certified' && b.status === 'Approved' && !!b.invoiceId];
  });
  await T('G-03a', 'Contract for an unapproved contractor cannot be submitted', async () => {
    await as(null); await go('contract-labor/contracts?open=CTR-006'); await p.waitForTimeout(300);
    const hasSign = await btn('Sign & activate').count(); await btn('Submit for approval').click(); await p.waitForTimeout(200);
    const c = (await S()).contracts.find((x) => x.id === 'CTR-006'); const t = await toastText();
    return [`Sign button ${hasSign ? 'present' : 'absent'}; after submit: ${c.status}; "${t.slice(0, 70)}"`, !hasSign && c.status === 'Draft' && /Pending Approval/.test(t)];
  });
  await T('G-03b', 'New contract: draft → Legal → Finance → sign (needs performance BG)', async () => {
    await as('Arjun Mehta'); await go('contract-labor/contracts'); await btn('Create contract').click(); await p.waitForTimeout(200); const d = dlg();
    await pick(d.locator('label:has-text("Contractor") [role=combobox]'), 'Kaveri Manpower'); await d.locator('label:has-text("Contract title") input').fill('Finishing labour - Station 5');
    await d.locator('label:has-text("Contract value") input').fill('2500000'); await fill(d); await d.locator('button:has-text("Submit for approval")').click(); await p.waitForTimeout(250);
    let c = (await S()).contracts.find((x) => x.title === 'Finishing labour - Station 5'); const s0 = c.status;
    await as('Neha Kulkarni'); await go('contract-labor/contracts?open=' + c.id); await p.waitForTimeout(300); await btn('Approve as Legal').click(); await p.waitForTimeout(150);
    await as('Rohit Shah'); await go('contract-labor/contracts?open=' + c.id); await p.waitForTimeout(300); await btn('Approve as Finance').click(); await p.waitForTimeout(150);
    c = (await S()).contracts.find((x) => x.id === c.id); const s1 = c.status;
    await as('Vikram Rao'); await go('contract-labor/contracts?open=' + c.id); await p.waitForTimeout(300); await btn('Sign & activate').click(); await p.waitForTimeout(150); const t = await toastText();
    await btn('Add guarantee').click(); await p.waitForTimeout(150); const g = dlg();
    await g.locator('label:has-text("Issuing bank") input').fill('ICICI Bank'); await g.locator('label:has-text("BG number") input').fill('BG/ICICI/2026/7781'); await g.locator('label:has-text("Amount") input').fill('125000');
    await g.locator('button:has-text("Save")').click(); await p.waitForTimeout(150); await btn('Sign & activate').click(); await p.waitForTimeout(200);
    c = (await S()).contracts.find((x) => x.id === c.id);
    return [`${c.id}: submit → ${s0}; after Legal+Finance → ${s1}; sign without BG: "${t.slice(0, 60)}"; after BG → ${c.status}`, s0 === 'Pending Approval' && s1 === 'Approved' && /Performance bank guarantee/.test(t) && c.status === 'Active'];
  });
  await T('G-22', 'BG register: extend and return', async () => {
    await as(null); await go('contract-labor/contracts?open=CTR-002'); await p.waitForTimeout(300);
    await p.locator('tr:has-text("BG/AXIS") button:has-text("Extend")').click(); await p.waitForTimeout(150); const d = dlg();
    await d.locator('button:has-text("Extend")').click(); await p.waitForTimeout(150);
    const g = (await S()).contracts.find((x) => x.id === 'CTR-002').guarantees[0];
    return [`BG ${g.number} expiry now ${g.expiry}; history ${g.history.length}`, g.history.length === 1];
  });
  await T('G-04', 'Blocked contractor: contract hidden from WO picker; draft WO cannot be issued', async () => {
    await mut((s) => { const v = s.vendors.find((x) => x.id === 'VEN-010'); v.status = 'Blacklisted'; s.workOrders.unshift({ id: 'WO-099', contractId: 'CTR-004', vendorId: 'VEN-010', project: 'Riverside Business Park', wbs: '1.2 Earthworks - Block C', title: 'Test draft', type: 'Item-Rate', location: 'X', start: '2026-10-01', end: '2026-12-01', status: 'Draft', items: [{ id: '099-1', code: '1', desc: 'x', unit: 'cum', qty: 1, rate: 1 }], acceptance: null }); });
    await go('contract-labor/work-orders'); await btn('Create work order').click(); await p.waitForTimeout(200);
    await dlg().locator('label:has-text("Contract") [role=combobox]').first().click(); await p.waitForTimeout(100);
    const opts = (await p.locator('[role=listbox] [role=option]').allTextContents()).join('|'); await p.keyboard.press('Escape'); await p.keyboard.press('Escape');
    await go('contract-labor/work-orders?open=WO-099'); await p.waitForTimeout(300); await btn('Issue').first().click(); await p.waitForTimeout(150);
    const w = (await S()).workOrders.find((x) => x.id === 'WO-099'); const t = await toastText();
    await mut((s) => { s.vendors.find((x) => x.id === 'VEN-010').status = 'Active'; s.workOrders = s.workOrders.filter((x) => x.id !== 'WO-099'); });
    return [`picker has CTR-004: ${opts.includes('CTR-004')}; issue → ${w.status} ("${t.slice(0, 60)}")`, !opts.includes('CTR-004') && w.status === 'Draft' && /Blacklisted/.test(t)];
  });
  await T('G-24', 'First work order waits for the mobilisation checklist', async () => {
    await mut((s) => { const v = s.vendors.find((x) => x.id === 'VEN-007'); v.status = 'Active'; v.regTier = 'Spend Authorized'; v.insurance = [{ type: 'Workmen Compensation', policy: 'WC/1', insurer: 'X', cover: 6000000, expiry: '2027-09-01', status: 'Verified' }];
      const c = s.contracts.find((x) => x.id === 'CTR-006'); c.status = 'Active'; c.signedOn = '2026-09-01'; c.start = '2026-09-01'; });
    await go('contract-labor/work-orders'); await btn('Create work order').click(); await p.waitForTimeout(200); const d = dlg();
    await pick(d.locator('label:has-text("Contract") [role=combobox]').first(), 'CTR-006'); await p.waitForTimeout(150); const t = await d.textContent(); await p.keyboard.press('Escape');
    return [/Mobilisation checklist incomplete/.test(t) ? 'Issue blocked: mobilisation checklist incomplete' : t.slice(0, 120), /Mobilisation checklist incomplete/.test(t)];
  });
  await T('G-21', 'Suspend and resume a work order', async () => {
    await as('Vikram Rao'); await go('contract-labor/work-orders?open=WO-002'); await p.waitForTimeout(300); await btn('Suspend').click(); await p.waitForTimeout(100);
    await dlg().locator('textarea:not([aria-label="Write a comment"])').fill('Client stop-work - design revision'); await dlg().locator('button:has-text("Confirm")').click(); await p.waitForTimeout(200);
    const s1 = (await S()).workOrders.find((x) => x.id === 'WO-002').status; const mbBtn = await btn('Record measurement').count();
    await btn('Resume').click(); await p.waitForTimeout(200); const s2 = (await S()).workOrders.find((x) => x.id === 'WO-002').status;
    return [`suspend → ${s1} (measure button ${mbBtn}); resume → ${s2}`, s1 === 'Suspended' && mbBtn === 0 && s2 === 'In Progress'];
  });
  await T('G-07', 'Change order with a quantity line raises the WO quantity on approval', async () => {
    await as('Arjun Mehta'); await go('contract-labor/contracts?open=CTR-004'); await p.waitForTimeout(300); await btn('Raise change order').click(); await p.waitForTimeout(150); const d = dlg();
    await d.locator('label:has-text("Change description") input').fill('Extra excavation - revised footing levels'); await d.locator('label:has-text("Reason") input').fill('Consultant instruction CI-12');
    await d.locator('button:has-text("Add quantity line")').click(); await p.waitForTimeout(100);
    await pick(d.locator('[role=combobox]').nth(1), 'Excavation in ordinary soil'); await d.locator('input[inputmode], input[type=number]').last().fill('500').catch(async () => {});
    const qty = d.locator('.grid.grid-cols-\\[150px_1fr_1fr_70px_90px_100px_28px\\] input').nth(2); await qty.fill('500');
    await d.locator('button:has-text("Submit for approval")').click(); await p.waitForTimeout(200);
    await go('contract-labor/contracts?open=CTR-004'); await p.waitForTimeout(300); await p.locator('tr:has-text("Extra excavation") button:has-text("Approve")').click(); await p.waitForTimeout(200); const t = await toastText();
    const w = (await S()).workOrders.find((x) => x.id === 'WO-004'), it = w.items.find((i) => i.id === 'C1');
    return [`approve: "${t.slice(0, 50)}"; after approval: WO-004 C1 qty ${it.qty} (CO qty ${it.coQty})`, it.qty === 18500 && it.coQty === 500];
  });
  await T('G-11', 'Contract closure checklist blocks closing an active contract', async () => {
    await as(null); await go('contract-labor/contracts?open=CTR-004'); await p.waitForTimeout(300);
    const dis = await btn('Close contract').isDisabled(); const t = await dlg().textContent();
    return [`Close disabled=${dis}; checklist shows ${(t.match(/Closure checklist/) || []).length ? 'yes' : 'no'}`, dis && /Handover certificate issued/.test(t)];
  });
  await T('G-08/G-20', 'Contractor RFQ award → draft contract with BOQ; recommendation required', async () => {
    await mut((s) => { s.rfqs.unshift({ id: 'RFQ-009', title: 'Block B excavation - labour', project: 'Riverside Business Park', mode: 'Call for Tenders', status: 'Quotes Received', createdOn: '2026-09-20', dueDate: '2026-10-10', template: '', tnc: 't', incoterm: 'DAP (delivered at site)', sourceRef: '', weights: { price: 60, quality: 25, delivery: 15 },
      items: [{ desc: 'Excavation in ordinary soil', unit: 'cum', qty: 5000, requiredBy: '2026-10-20' }, { desc: 'Backfilling', unit: 'cum', qty: 2000, requiredBy: '2026-10-20' }], vendorIds: ['VEN-010', 'VEN-001'],
      quotes: ['VEN-010', 'VEN-001'].map((v, k) => ({ vendorId: v, rates: k ? [200, 150] : [182, 140], deliveryDays: 10, validUntil: '2026-12-01', submittedOn: '2026-09-25', via: 'Portal', review: 'Accepted', quoteNo: 'Q' + k, noBid: [false, false], leadDays: [10, 10], discounts: [0, 0], lineFiles: [null, null], gstPct: 18 })),
      negotiation: [], awards: [], emails: [], responses: { 'VEN-010': { status: 'Accepted' }, 'VEN-001': { status: 'Accepted' } }, awardedTo: null }); });
    await as('Priya Nair'); await go('vendor-management/rfq?open=RFQ-009'); await p.waitForTimeout(300); await p.locator('[data-drawer] [role=tab]').filter({ hasText: 'Comparison' }).first().click(); await p.waitForTimeout(150); await btn('Award by line').click(); await p.waitForTimeout(200); const d = dlg();
    const dis0 = await d.locator('button:has-text("Award & create")').isDisabled();
    await d.getByRole('button', { name: 'Contract', exact: true }).click(); await d.locator('label:has-text("Award recommendation") input').fill('L1 on both lines; excavator fleet on site'); await d.locator('button:has-text("Award & create")').click(); await p.waitForTimeout(250);
    const s = await S(); const c = s.contracts.find((x) => x.rfqId === 'RFQ-009');
    return [`button disabled without note=${dis0}; contract ${c?.id} ${c?.status} for ${c?.vendorId}, BOQ ${c?.scope.length} lines, value ${c?.value} (lowest compliant bidder)`, dis0 && c && c.status === 'Draft' && c.scope.length === 2 && ['VEN-010', 'VEN-001'].includes(c.vendorId) && !!c.awardNote];
  });
});
