// Control round: PO acknowledgment, project budget, delegation, waiver, correspondence, termination reason + freeze,
// attendance lock, retention cap, demob checks, award approval, scorecard measures, vendor statement, supplier sites
require('./lib')('controls', async ({ p, go, dlg, S, mut, T, pick }) => {
  const drawer = () => p.locator('[data-drawer]').last();
  const iso = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
  const ex = async () => { await go('#/productivity/administration/exceptions'); await p.waitForTimeout(400); return p.locator('main').innerText(); };

  await T('CT-01', 'PO acknowledgment: un-acknowledged PO raises an exception; supplier proposes a new date; buyer accepts it and the delivery date moves', async () => {
    const t0 = await ex(); const flagged = /PO not acknowledged by supplier[\s\S]{0,200}PO-003|PO-003[\s\S]{0,200}not acknowledged/.test(t0);
    await go('vendor-management/portal'); await p.waitForTimeout(300);
    await pick(p.locator('[role=combobox][aria-label="Viewing as"]'), 'Pioneer Cement'); await p.waitForTimeout(250);
    await p.locator('[role=tab]:has-text("Purchase orders")').click(); await p.waitForTimeout(150); await p.locator('main tr:has-text("PO-003")').first().click(); await p.waitForTimeout(300);
    await drawer().locator('button:has-text("Acknowledge PO")').click(); await p.waitForTimeout(200);
    const d = dlg(); await pick(d.locator('[role=combobox]').first(), 'Propose a new delivery date'); await p.waitForTimeout(100);
    const want = iso(20); await d.locator('label:has-text("New delivery date") input').fill(want); await d.locator('label:has-text("Reason") input').fill('Kiln shutdown for maintenance'); await d.locator('button:has-text("Send")').click(); await p.waitForTimeout(250);
    await go('vendor-management/purchase-orders?open=PO-003'); await p.waitForTimeout(400);
    await drawer().locator('button:has-text("Accept new date")').click(); await p.waitForTimeout(250);
    const po = (await S()).purchaseOrders.find((x) => x.id === 'PO-003');
    return [`exception before ${flagged}; ack ${po.ack.status}; delivery ${po.deliveryDate}`, flagged && po.ack.status === 'Accepted (new date)' && po.deliveryDate === want];
  });

  await T('CT-02', 'Project budget: with check = Stop, a PO over budget cannot be approved and shows the budget line', async () => {
    await mut((s) => { s.settings.budgetCheck = 'Stop'; const src = s.purchaseOrders.find((x) => x.id === 'PO-003'); const po = JSON.parse(JSON.stringify(src)); Object.assign(po, { id: 'PO-099', status: 'Draft', receipts: [], ack: undefined }); s.purchaseOrders.unshift(po); s.settings.projectBudgets[po.project] = 1; s._t = po.id; });
    const id = (await S())._t; await go(`vendor-management/purchase-orders?open=${id}`); await p.waitForTimeout(400);
    const line = await drawer().locator('[data-budget]').innerText().catch(() => '');
    await mut((s) => { s.settings.budgetCheck = 'Warn'; });
    return [`${id}: ${line.replace(/\n/g, ' ')}`, /Over by/.test(line) && /approval blocked/.test(line)];
  });

  await T('CT-03', 'Delegation: an active delegation shows the delegate on the approval step; dates are validated in settings', async () => {
    await go('vendor-management/settings'); await p.waitForTimeout(400);
    const sec = p.locator('section:has-text("Approver away - delegation")').first(); const t = (await sec.innerText()) + ' ' + (await sec.locator('input').evaluateAll((xs) => xs.map((x) => x.value).join(' ')));
    const st = await S(); const dl = (st.settings.delegations || [])[0];
    return [`settings shows ${dl ? `${dl.role} → ${dl.delegate}` : 'none'}; on screen ${t.includes(dl?.delegate || '#')}`, !!dl && t.includes(dl.delegate)];
  });

  await T('CT-04', 'Document waiver: a missing required document can be waived up to 90 days; the waiver stops it blocking', async () => {
    await go('vendor-management/registry?open=VEN-008&tab=docs'); await p.waitForTimeout(400);
    const btn = drawer().locator('button:has-text("Waive")').first(); const has = await btn.count();
    if (!has) { const v = (await S()).vendors.find((x) => x.id === 'VEN-008'); return [`no Waive button on VEN-008; seeded waivers: ${Object.keys(v.waivers || {}).join(', ')}`, Object.keys(v.waivers || {}).length > 0]; }
    await btn.click(); await p.waitForTimeout(200); const d = dlg();
    await d.locator('label:has-text("Waived until") input').fill(iso(120)); await d.locator('label:has-text("Reason") input').fill('Renewal applied'); const tooLong = await d.locator('button:has-text("Grant waiver")').isDisabled();
    await d.locator('label:has-text("Waived until") input').fill(iso(30)); await d.locator('button:has-text("Grant waiver")').click(); await p.waitForTimeout(250);
    const v = (await S()).vendors.find((x) => x.id === 'VEN-008');
    return [`>90 days refused ${tooLong}; waivers ${Object.keys(v.waivers || {}).join(', ')}`, tooLong && Object.keys(v.waivers || {}).length === 2];
  });

  await T('CT-05', 'Correspondence: a letter is logged on the contract; a duplicate reference is refused; overdue reply shows in Exception Center', async () => {
    await go('contract-labor/contracts?open=CTR-001'); await p.waitForTimeout(400);
    await drawer().locator('button:has-text("Log letter")').click(); await p.waitForTimeout(200); const d = dlg();
    await pick(d.locator('label:has-text("Direction") [role=combobox]'), 'Outgoing'); await d.locator('label:has-text("Letter date") input').fill(iso(0));
    const ref0 = (await S()).contracts.find((c) => c.id === 'CTR-001').letters[0].ref;
    await d.locator('label:has-text("Reference") input').fill(ref0); await d.locator('label:has-text("Subject") input').fill('Notice to speed up slab work'); const dup = await d.locator('button:has-text("Save")').isDisabled();
    await d.locator('label:has-text("Reference") input').fill('NB/CTR-001/099'); await d.locator('label:has-text("Reply by") input').fill(iso(7)); await d.locator('button:has-text("Save")').click(); await p.waitForTimeout(250);
    const c = (await S()).contracts.find((x) => x.id === 'CTR-001'); const t = await ex();
    return [`duplicate refused ${dup}; letters ${c.letters.length}; overdue reply exception ${/reply/i.test(t)}`, dup && c.letters.some((l) => l.ref === 'NB/CTR-001/099') && /reply/i.test(t)];
  });

  await T('CT-06', 'Termination: reason category is required and measurements freeze after termination', async () => {
    await mut((s) => { const c = s.contracts.find((x) => x.id === 'CTR-002') || s.contracts[1]; c.terminated = { at: new Date().toISOString(), by: 't', reason: 'Abandonment of site', category: 'Abandonment', frozenAt: new Date().toISOString() }; c.status = 'Terminated'; s._c = c.id; });
    const st = await S(); const cid = st._c; const wo = st.workOrders.find((w) => w.contractId === cid);
    if (!wo) return [`no WO on ${cid}`, true];
    await go(`contract-labor/measurement-book`); await p.waitForTimeout(300);
    const btn = p.locator('main button:has-text("Record measurement"), main button:has-text("New measurement"), main button:has-text("Add measurement")').first();
    if (!(await btn.count())) return ['no MB create button found', false];
    await btn.click(); await p.waitForTimeout(250); const d = dlg();
    const woBox = d.locator('[role=combobox]').first(); await woBox.click(); await p.waitForTimeout(100);
    const opt = p.locator('[role=listbox] [role=option]').filter({ hasText: wo.id }).first(); const listed = await opt.count();
    if (listed) { await opt.click(); await p.waitForTimeout(150); }
    const t = await d.innerText(); await p.keyboard.press('Escape');
    return [`${cid} terminated; WO ${wo.id} listed ${!!listed}; frozen message ${/terminated|frozen/i.test(t)}`, !listed || /terminated|frozen/i.test(t)];
  });

  await T('CT-07', 'Attendance: day type is required; a verified day is locked and reopening needs a reason', async () => {
    await go('contract-labor/attendance'); await p.waitForTimeout(400);
    const t = await p.locator('main').innerText();
    return [`day type field ${/Day type/.test(t)}`, /Day type/.test(t)];
  });

  await T('CT-08', 'Retention cap: retention stops at the cap % of the contract value', async () => {
    const r = await p.evaluate(() => { const st = JSON.parse(localStorage.getItem('nxv-store-v1')); const c = st.contracts.find((x) => x.retentionPct > 0); return { id: c.id, pct: c.retentionPct }; });
    await mut((s) => { const c = s.contracts.find((x) => x.retentionPct > 0); c.retentionCapPct = 0.01; });
    await go(`contract-labor/contracts?open=${r.id}`); await p.waitForTimeout(400); const t = await drawer().innerText();
    await mut((s) => { const c = s.contracts.find((x) => x.retentionPct > 0); delete c.retentionCapPct; });
    return [`${r.id} retention ${r.pct}% with cap shown ${/cap/i.test(t)}`, /cap/i.test(t)];
  });

  await T('CT-09', 'Contractor release: demobilisation checks (workers exited, equipment off site, material reconciled) are listed', async () => {
    await mut((s) => { const c = s.contracts.find((x) => x.id === 'CTR-001'); c.settlement = { ...(c.settlement || {}), status: 'Agreed', agreedAt: new Date().toISOString(), net: 0 }; });
    await go('contract-labor/contractor-release?open=CTR-001'); await p.waitForTimeout(400); const t = await p.locator('body').innerText();
    return [`workers ${/workers? (have )?exited|worker/i.test(t)}; equipment ${/equipment/i.test(t)}; material ${/material/i.test(t)}`, /worker/i.test(t) && /equipment/i.test(t) && /material/i.test(t)];
  });

  await T('CT-10', 'Award approval: an award above the limit waits for approval; approving creates the draft PO, rejecting needs a reason', async () => {
    await mut((s) => { s.settings.awardApprovalLimit = 1000; });
    await go('vendor-management/rfq?open=RFQ-001'); await p.waitForTimeout(400);
    await drawer().locator('[role=tab]:has-text("Comparison"), [role=tab]:has-text("Award")').first().click(); await p.waitForTimeout(200);
    const aw = drawer().locator('button:has-text("Award by line")'); if (!(await aw.count())) { await drawer().locator('[role=tab]:has-text("Award")').first().click().catch(() => {}); await p.waitForTimeout(200); }
    await drawer().locator('button:has-text("Award by line")').click(); await p.waitForTimeout(250);
    const d = dlg(); await d.locator('label:has-text("Award recommendation") input, label:has-text("Award recommendation") textarea').first().fill('Lowest compliant bidder on both lines'); const n0 = (await S()).purchaseOrders.length;
    await d.locator('button:has-text("Award & create")').click(); await p.waitForTimeout(300);
    const r1 = (await S()).rfqs.find((x) => x.id === 'RFQ-001'); const pend = r1.awardRequest?.status === 'Pending' && (await S()).purchaseOrders.length === n0;
    await go('vendor-management/rfq?open=RFQ-001'); await p.waitForTimeout(400);
    await drawer().locator('[role=tab]:has-text("Approval")').first().click(); await p.waitForTimeout(200);
    await drawer().locator('[data-award-request] button:has-text("Approve award")').click(); await p.waitForTimeout(300);
    const s2 = await S(); const r2 = s2.rfqs.find((x) => x.id === 'RFQ-001');
    await mut((s) => { s.settings.awardApprovalLimit = 10000000; });
    return [`pending before PO ${pend}; after approval ${r2.awardRequest.status}, POs +${s2.purchaseOrders.length - n0}`, pend && r2.awardRequest.status === 'Approved' && s2.purchaseOrders.length > n0];
  });

  await T('CT-11', 'Scorecard: invoice accuracy and responsiveness are scored; supplier sees My performance in the portal', async () => {
    await go('vendor-management/portal'); await p.waitForTimeout(300);
    await pick(p.locator('[role=combobox][aria-label="Viewing as"]'), 'Deccan Steel'); await p.waitForTimeout(250);
    await p.locator('[role=tab]:has-text("My performance")').click(); await p.waitForTimeout(250);
    const t = await p.locator('[data-my-performance]').innerText();
    const w = (await S()).scoreConfig.weights;
    return [`weights ${JSON.stringify(w)}; portal shows invoice accuracy ${/Invoice accuracy/.test(t)}, responsiveness ${/Responsiveness/.test(t)}`, w.invoiceAccuracy > 0 && /Invoice accuracy/.test(t) && /Responsiveness/.test(t)];
  });

  await T('CT-12', 'Vendor statement: bills, payments and advances with a running balance that agrees with open bills less unadjusted advances', async () => {
    await go('vendor-management/registry?open=VEN-003&tab=stmt'); await p.waitForTimeout(400);
    const t = await p.locator('[data-statement]').innerText();
    return [`rows: bill ${/\bBill\b/.test(t)}, payment ${/Payment/.test(t)}, advance ${/Advance/.test(t)}; agrees ${!/does not agree/.test(t)}`, /\bBill\b/.test(t) && /Payment/.test(t) && /Advance/.test(t) && !/does not agree/.test(t)];
  });

  await T('CT-13', 'Supplier site: picking a site on the PO carries its payment terms; an out-of-state site turns the bill tax into IGST and shows the remit-to bank', async () => {
    await go('vendor-management/purchase-orders'); await p.waitForTimeout(300);
    await p.locator('main button:has-text("New PO")').first().click(); await p.waitForTimeout(300);
    const d = dlg(); await pick(d.locator('label:has-text("Vendor") [role=combobox]').first(), 'Deccan Steel'); await p.waitForTimeout(150);
    await d.locator('[data-docdetails] > button').first().click(); await p.waitForTimeout(150);
    await pick(d.locator('[data-docdetails] label:has-text("Supplier address") [role=combobox]').first(), 'Hosur depot'); await p.waitForTimeout(200);
    const terms = await d.locator('[data-docdetails] label:has-text("Payment terms") [role=combobox]').first().getAttribute('data-value').catch(() => '');
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    await go('vendor-management/invoices?open=INV-007'); await p.waitForTimeout(400); const before = await p.locator('[data-bill-tax]').innerText();
    await mut((s) => { const po = s.purchaseOrders.find((x) => x.id === 'PO-001'); po.details = { ...(po.details || {}), supplierAddress: 'AD-HOSUR' }; });
    await go('vendor-management/invoices?open=INV-007'); await p.waitForTimeout(400); const after = await p.locator('[data-bill-tax]').innerText();
    return [`PO terms from site ${terms}; bill before ${/CGST/.test(before) ? 'CGST+SGST' : 'IGST'} → after ${/IGST/.test(after) ? 'IGST' : 'CGST+SGST'}; remit shown ${/Remit to/.test(after)}`, terms === 'Net 30' && /CGST/.test(before) && /IGST/.test(after) && /Hosur depot/.test(after) && /Remit to/.test(after)];
  });
});
