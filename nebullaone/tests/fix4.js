// Batch 4 — quantity & execution chain: inspection/NCR, over-quantity, material recovery, equipment, DPR, JMS co-sign, WBS cost
require('./lib')('fix4', async ({ p, go, dlg, S, mut, as, T, pick, toastText }) => {
  const btn = (t) => p.locator(`button:has-text("${t}")`);
  const mb = async (id) => (await S()).measurements.find((m) => m.id === id);
  await T('G-23', 'Contractor agrees a measurement in the portal; engineer countersigns without a paper sheet', async () => {
    await go('vendor-management/portal'); await pick(p.locator('label:has-text("Viewing as") [role=combobox]'), 'Shree Balaji'); await p.waitForTimeout(200);
    await p.getByText('Work orders', { exact: true }).click(); await p.locator('tr:has-text("WO-001")').first().click(); await p.waitForTimeout(250);
    await dlg().locator('[role=tab]:has-text("Measurements"), button:has-text("Measurements")').first().click(); await p.waitForTimeout(150);
    await dlg().locator('tr:has-text("MB-016") button:has-text("Agree")').click(); await p.waitForTimeout(150);
    const a = (await mb('MB-016')).jms.contractorAgreed;
    await as('Sneha Iyer'); await go('contract-labor/measurement-book'); await p.getByText('Joint measurement sheets', { exact: true }).click(); await p.waitForTimeout(150);
    await p.locator('tr:has-text("MB-016") button:has-text("Sign")').click(); await p.waitForTimeout(150); const t = await dlg().textContent(); const paperBox = /Paper JMS signed/.test(t);
    await dlg().locator('label:has-text("Contractor representative") input').fill('R. Patil'); await dlg().locator('button:has-text("Sign JMS")').click(); await p.waitForTimeout(150);
    const m = await mb('MB-016');
    return [`agreed by ${a?.by}; paper checkbox asked=${paperBox}; JMS ${m.jms.status}, inspection ${m.qc.status}`, !!a && !paperBox && m.jms.status === 'Signed' && m.qc.status === 'Pending'];
  });
  await T('G-12a', 'Signed but uninspected measurement is not billable', async () => {
    await go('contract-labor/ra-bills'); await btn('Prepare RA bill').click(); await p.waitForTimeout(200); const t = await dlg().textContent(); await p.keyboard.press('Escape');
    return [/WO-001/.test(t) ? 'WO-001 offered (unexpected)' : 'WO-001 not offered — MB-016 waits for inspection', !/WO-001 —/.test(t)];
  });
  await T('G-12b', 'Inspection fails → NCR → QS certification of WO-001 blocked', async () => {
    await as('Rohan Singh'); await go('contract-labor/measurement-book'); await p.waitForTimeout(200);
    await p.locator('tr:has-text("MB-016") button:has-text("Fail")').click(); await p.waitForTimeout(150);
    await dlg().locator('textarea:not([aria-label="Write a comment"])').fill('Honeycombing at slab L3 soffit, grid A4–A6'); await dlg().locator('button:has-text("Raise NCR")').click(); await p.waitForTimeout(200);
    const n = (await S()).ncrs.find((x) => x.mbId === 'MB-016');
    await as('Karan Desai'); await go('contract-labor/ra-bills?open=RA-003'); await p.waitForTimeout(300); const t = await dlg().textContent();
    return [`${n?.id} ${n?.status}; RA-003 note: ${(t.match(/Open NCR on WO-001[^.]*/) || ['none'])[0]}`, n && n.status === 'Open' && /Open NCR on WO-001/.test(t)];
  });
  await T('G-12c', 'Rework → re-inspection pass closes the NCR and makes the entry billable', async () => {
    const n = (await S()).ncrs.find((x) => x.mbId === 'MB-016');
    await go('vendor-management/portal'); await pick(p.locator('label:has-text("Viewing as") [role=combobox]'), 'Shree Balaji'); await p.waitForTimeout(200);
    await p.getByText('Work orders', { exact: true }).click(); await p.locator('tr:has-text("WO-001")').first().click(); await p.waitForTimeout(250);
    await dlg().locator('button:has-text("NCRs")').first().click(); await p.waitForTimeout(150); await dlg().locator(`tr:has-text("${n.id}") button:has-text("Rework done")`).click(); await p.waitForTimeout(100);
    await p.locator('[role=dialog]').last().locator('textarea:not([aria-label="Write a comment"])').fill('Patch repaired with micro-concrete'); await p.locator('[role=dialog]').last().locator('button:has-text("Save")').click(); await p.waitForTimeout(150);
    const s1 = (await S()).ncrs.find((x) => x.id === n.id).status;
    await as('Rohan Singh'); await go('contract-labor/measurement-book'); await p.getByText('Inspections & NCRs').click(); await p.waitForTimeout(150);
    await p.locator(`tr:has-text("${n.id}") button:has-text("Re-inspect: pass")`).click(); await p.waitForTimeout(100); await dlg().locator('button:has-text("Save")').click(); await p.waitForTimeout(150);
    const x = (await S()).ncrs.find((y) => y.id === n.id), m = await mb('MB-016');
    return [`after portal rework: ${s1}; after re-inspection: ${x.status}; MB-016 inspection ${m.qc.status}`, s1 === 'Rework Done' && x.status === 'Closed' && m.qc.status === 'Passed'];
  });
  await T('G-06', 'Quantity above the WO blocks the RA bill until a change order raises it', async () => {
    await mut((s) => { s.measurements.find((m) => m.id === 'MB-016').qty = 400; });
    await as('Sneha Iyer'); await go('contract-labor/ra-bills?wo=WO-001'); await p.waitForTimeout(300); const d = dlg();
    const t = await d.textContent(); const dis = await d.locator('button:has-text("Submit for certification")').isDisabled(); await p.keyboard.press('Escape');
    await mut((s) => { const c = s.contracts.find((x) => x.id === 'CTR-001'); c.changeOrders.push({ id: 'CO-009', desc: 'Extra RCC', reason: 'x', amount: 7450 * 500, days: 0, status: 'Pending', raisedOn: '2026-09-29', raisedBy: 'Arjun Mehta', lines: [{ woId: 'WO-001', lineId: 'A2', code: '3.4', desc: 'RCC', unit: 'cum', qty: 500, rate: 7450 }] }); });
    await as('Vikram Rao'); await go('contract-labor/contracts?open=CTR-001'); await p.waitForTimeout(300); await p.locator('tr:has-text("CO-009") button:has-text("Approve")').click(); await p.waitForTimeout(150);
    await as('Sneha Iyer'); await go('contract-labor/ra-bills?wo=WO-001'); await p.waitForTimeout(300); const dis2 = await dlg().locator('button:has-text("Submit for certification")').isDisabled();
    return [`before CO: submit disabled=${dis} (${/Quantity above the work order/.test(t) ? 'over-quantity note' : 'no note'}); after CO-009 approved: disabled=${dis2}`, dis && /Quantity above the work order/.test(t) && !dis2];
  });
  await T('G-16', 'Unrecovered free-issue material is deducted automatically and linked to the bill', async () => {
    const d = dlg(); const t = await d.textContent(); await d.locator('button:has-text("Submit for certification")').click(); await p.waitForTimeout(250);
    const s = await S(); const mi = s.materialIssues.find((m) => m.id === 'MI-002'); const b = s.raBills.find((x) => x.id === mi.recoveredIn);
    return [`note: ${/Material recovery of ₹36,800/.test(t)}; MI-002 recovered in ${mi.recoveredIn}; bill material deduction ${b?.ded.materials}`, mi.recoveredIn && b && b.ded.materials === 36800];
  });
  await T('G-16b', 'Rejecting that bill puts the material back for the next bill', async () => {
    const s = await S(); const id = s.materialIssues.find((m) => m.id === 'MI-002').recoveredIn;
    await as(null); await go('contract-labor/ra-bills?open=' + id); await p.waitForTimeout(300);
    await dlg().locator('label:has-text("remark") input').fill('Wrong period'); await btn('Reject').click(); await p.waitForTimeout(200);
    const s2 = await S();
    return [`${id} rejected; after reject MI-002 recoveredIn=${s2.materialIssues.find((m) => m.id === 'MI-002').recoveredIn}`, s2.materialIssues.find((m) => m.id === 'MI-002').recoveredIn === null];
  });
  await T('G-15', 'Equipment register and deployment on a work order', async () => {
    await as(null); await go('vendor-management/registry?open=VEN-001'); await p.waitForTimeout(300); await dlg().locator('[role=tab]:has-text("Equipment")').first().click(); await p.waitForTimeout(150);
    const rows = await dlg().locator('tbody tr').count();
    await go('contract-labor/work-orders?open=WO-001'); await p.waitForTimeout(300);
    const cb = dlg().locator('[role=combobox]').filter({ hasText: 'Deploy from' }).first(); await cb.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
    await pick(cb, 'Bar bending machine'); await btn('Deploy').click(); await p.waitForTimeout(150);
    const w = (await S()).workOrders.find((x) => x.id === 'WO-001');
    return [`VEN-001 register rows ${rows}; WO-001 deployments ${w.equipment.length}`, rows === 3 && w.equipment.length === 3];
  });
  await T('G-15b', 'Equipment with expired fitness cannot be deployed', async () => {
    await mut((s) => { const w = s.workOrders.find((x) => x.id === 'WO-004'); w.equipment = w.equipment.filter((d) => d.eqId !== 'EQ-006'); });
    await go('contract-labor/work-orders?open=WO-004'); await p.waitForTimeout(300);
    const dep = dlg().locator('[role=combobox]').filter({ hasText: 'Deploy from' }).first(); await dep.scrollIntoViewIfNeeded(); await p.waitForTimeout(100);
    await pick(dep, 'Tipper'); await btn('Deploy').click(); await p.waitForTimeout(150); const t = await toastText();
    const w = (await S()).workOrders.find((x) => x.id === 'WO-004');
    return [`"${t.slice(0, 70)}"; deployed=${w.equipment.some((d) => d.eqId === 'EQ-006')}`, /expired/.test(t) && !w.equipment.some((d) => d.eqId === 'EQ-006')];
  });
  await T('G-17', 'Daily progress report: add, duplicate date blocked', async () => {
    await go('contract-labor/work-orders?open=WO-002'); await p.waitForTimeout(300); await btn('Add daily report').click(); await p.waitForTimeout(150); const d = dlg();
    await d.locator('label:has-text("Manpower") input').fill('34'); await d.locator('label:has-text("Work done") textarea').fill('Excavation for pile caps P1–P6'); await d.locator('button:has-text("Save")').click(); await p.waitForTimeout(150);
    await btn('Add daily report').click(); await p.waitForTimeout(150); const d2 = dlg(); await d2.locator('label:has-text("Manpower") input').fill('30'); await d2.locator('label:has-text("Work done") textarea').fill('x');
    const dis = await d2.locator('button:has-text("Save")').isDisabled(); await p.keyboard.press('Escape');
    const n = (await S()).dprs.filter((x) => x.woId === 'WO-002').length;
    return [`WO-002 reports ${n}; second report same day blocked=${dis}`, n === 1 && dis];
  });
  await T('G-09', 'Cost by WBS: budget → committed → executed → billed', async () => {
    await go('contract-labor/performance'); await p.getByText('Cost by WBS', { exact: true }).click(); await p.waitForTimeout(200);
    const t = await p.locator('tbody').first().textContent();
    return [/2.2 Tower A — superstructure/.test(t) && /₹/.test(t) ? 'WBS rows with budget/committed/executed shown' : t.slice(0, 80), /2.2 Tower A — superstructure/.test(t)];
  });
  await T('G-09b', 'Work order needs a WBS element', async () => {
    await go('contract-labor/work-orders'); await btn('Create work order').click(); await p.waitForTimeout(200); const d = dlg();
    await pick(d.locator('label:has-text("Contract") [role=combobox]').first(), 'CTR-001'); await d.locator('label:has-text("Title") input').fill('Tower B superstructure');
    const items = d.locator('.grid.grid-cols-\\[70px_1fr_80px_100px_110px_110px_28px\\].items-center input'); await items.nth(1).fill('RCC'); await items.nth(2).fill('10'); await items.nth(3).fill('7450');
    const dis1 = await d.locator('button:has-text("Save draft")').isDisabled();
    await pick(d.locator('label:has-text("WBS element") [role=combobox]'), '2.4 Tower B — superstructure'); const dis2 = await d.locator('button:has-text("Save draft")').isDisabled(); await p.keyboard.press('Escape');
    return [`save disabled without WBS=${dis1}, with WBS=${dis2}`, dis1 && !dis2];
  });
});
