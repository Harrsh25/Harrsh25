// Gap round: quantity chain, claims, default notice → termination, vendor declarations, blanket schedule,
// overview insights, bill tax / retention / bank confirmation, subcontract terms, worker pay, earned value, settlement lines
require('./lib')('gaps', async ({ fill, p, go, dlg, S, mut, T, pick }) => {
  const drawer = () => p.locator('[data-drawer]').last();
  await T('GP-01', 'Contract shows one quantity chain per BOQ line: BOQ → WO → executed → measured → certified → billed → paid → balance', async () => {
    await go('contract-labor/contracts?open=CTR-001'); await p.waitForTimeout(400);
    const c = drawer().locator('[data-qty-chain]'); const rows = await c.locator('[data-chain-row]').count(); const t = await c.innerText();
    const want = ['BOQ', 'WO', 'EXECUTED', 'MEASURED', 'CERTIFIED', 'BILLED', 'PAID', 'BALANCE'].every((k) => t.toUpperCase().includes(k));
    return [`${rows} BOQ lines; all 8 stages ${want}; PCC BOQ 900 ${/PCC M15[\s\S]*900/.test(t)}`, rows === 5 && want && /PCC M15[\s\S]*900/.test(t)];
  });
  await T('GP-02', 'Claims register: record, review and settle; escalation flows into the final settlement and EOT moves the completion date', async () => {
    const end0 = (await S()).contracts.find((c) => c.id === 'CTR-001').end;
    await go('contract-labor/claims'); await p.locator('main button:has-text("Record claim")').click(); await p.waitForTimeout(200); const d = dlg();
    await pick(d.locator('label:has-text("Contract") [role=combobox]'), 'CTR-001 - Civil & structural works - Towers A & B'); await pick(d.locator('label:has-text("Claim type") [role=combobox]'), 'Extra work');
    await d.locator('input[placeholder="e.g. Steel price rise Jul-Sep"]').fill('Additional plinth protection works'); await d.locator('label:has-text("Amount claimed") input').fill('150000');
    await d.locator('label:has-text("Basis of claim") textarea').fill('Site instruction SI-14 from the architect'); await d.locator('button:has-text("Save claim")').click(); await p.waitForTimeout(300);
    const s1 = await S(); const nc = s1.contractClaims.find((x) => x.title === 'Additional plinth protection works');
    await go('contract-labor/claims?open=CLM-001'); await p.waitForTimeout(300); await drawer().locator('button:has-text("Settle")').click(); await p.waitForTimeout(200);
    await dlg().locator('label:has-text("Amount agreed") input').fill('500000'); await dlg().locator('label:has-text("Settlement note") textarea').fill('Agreed at 80% of the index rise'); await dlg().locator('button:has-text("Settle claim")').click(); await p.waitForTimeout(250);
    await go('contract-labor/claims?open=CLM-002'); await p.waitForTimeout(300); await drawer().locator('button:has-text("Settle")').click(); await p.waitForTimeout(200);
    await dlg().locator('label:has-text("Days agreed") input').fill('15'); await dlg().locator('label:has-text("Settlement note") textarea').fill('15 rain days accepted'); await dlg().locator('button:has-text("Settle claim")').click(); await p.waitForTimeout(250);
    const s2 = await S(); const c = s2.contracts.find((x) => x.id === 'CTR-001');
    await go('contract-labor/final-settlement?open=CTR-001'); await p.waitForTimeout(300); const t = await dlg().innerText();
    const esc = /Add price escalation admitted\s*₹5,00,000/.test(t);
    const moved = new Date(c.end) - new Date(end0) === 15 * 864e5;
    return [`new claim ${nc?.id} ${nc?.status}; CLM-001 ${s2.contractClaims.find((x) => x.id === 'CLM-001').status}; escalation line ${esc}; end ${end0} → ${c.end}`, nc?.status === 'Submitted' && esc && moved];
  });
  await T('GP-03', 'Termination needs notice → cure period → show-cause → decision', async () => {
    await go('contract-labor/contracts?open=CTR-003'); await p.waitForTimeout(300);
    const term0 = await drawer().locator('button:has-text("Terminate")').first().isDisabled();
    await drawer().locator('button:has-text("Issue default notice")').click(); await p.waitForTimeout(150);
    await dlg().locator('label:has-text("Breach") input').fill('Manpower below contract strength for 2 weeks'); await dlg().locator('label:has-text("Cure period") input').fill('10'); await dlg().locator('button:has-text("Save")').click(); await p.waitForTimeout(250);
    const t = await drawer().locator('[data-default-case]').innerText(); const term1 = await drawer().locator('[data-default-case] button:has-text("Terminate")').isDisabled();
    await go('contract-labor/contracts?open=CTR-004'); await p.waitForTimeout(300); const ready = !(await drawer().locator('[data-default-case] button:has-text("Terminate")').isDisabled());
    return [`no notice → terminate disabled ${term0}; after notice: ${/Cure period/.test(t)}, still disabled ${term1}; CTR-004 at decision → enabled ${ready}`, term0 && term1 && ready && /Cure period/.test(t)];
  });
  await T('GP-04', 'Vendor form asks MSME, turnover, years, beneficial owner, related party and conflict of interest; declarations drive risk', async () => {
    await go('vendor-management/registry'); await p.locator('main button:has-text("Register vendor")').click(); await p.waitForTimeout(250);
    const t = await dlg().locator('[data-ownership]').innerText();
    const has = ['MSME status', 'Annual turnover', 'Years in business', 'Beneficial owner', 'Related party', 'Conflict of interest'].every((k) => t.includes(k));
    await pick(dlg().locator('label:has-text("Related party") [role=combobox]'), 'Yes'); await p.waitForTimeout(100);
    const rel = await dlg().locator('label:has-text("Relationship")').count();
    await p.keyboard.press('Escape');
    await mut(`(s) => { const v = s.vendors.find((x) => x.id === 'VEN-003'); v.relatedParty = 'Yes'; v.relatedPartyNote = 'Director is a relative of a project manager'; }`);
    await go('vendor-management/registry?open=VEN-003&tab=risk'); await p.waitForTimeout(400); const r = await drawer().innerText();
    return [`fields ${has}; relationship asked when Yes ${rel > 0}; risk shows related party ${/Related party/.test(r)}`, has && rel > 0 && /Related party/.test(r)];
  });
  await T('GP-05', 'Blanket order: remaining value, release schedule with overdue release, contract link and Exception Center alert', async () => {
    await go('vendor-management/blanket-orders?open=BO-001'); await p.waitForTimeout(300); const t = await drawer().innerText();
    await go('administration/exceptions'); await p.waitForTimeout(300); const e = await p.locator('main').innerText();
    return [`remaining value ${/Remaining value/.test(t)}; schedule ${/Release schedule/.test(t)} overdue ${/Overdue/.test(t)}; exception ${/Blanket release overdue/.test(e)}`, /Remaining value/.test(t) && /Overdue/.test(t) && /Blanket release overdue/.test(e)];
  });
  await T('GP-06', 'Vendor overview: spend by category, top 10 vendors, guarantee & retention exposure, requisition-to-PO days', async () => {
    await go('vendor-management/overview'); await p.waitForTimeout(500); const t = await p.locator('main').innerText();
    const ok = ['Spend by category', 'Top 10 vendors by spend', 'Guarantee & retention exposure', 'Requisition to PO - days per step', 'RFQ → PO (award)'].every((k) => t.includes(k));
    return [`cards present ${ok}`, ok];
  });
  await T('GP-07', 'Bill: received date, CGST/SGST or IGST split, retention released, payment confirmed or failed at the bank', async () => {
    const s = await S(); const inv = s.invoices.find((i) => i.source === 'Purchase Order' && !i.cancelled);
    await mut(`(s) => { const i = s.invoices.find((x) => x.id === '${inv.id}'); i.receivedOn = i.date; i.retentionPct = 5; i.payments.push({ id: 'PAY-901', date: '${new Date().toISOString().slice(0, 10)}', amount: 1000, tds: 0, mode: 'NEFT', ref: 'NEFT00000901' }, { id: 'PAY-902', date: '${new Date().toISOString().slice(0, 10)}', amount: 500, tds: 0, mode: 'NEFT', ref: 'NEFT00000902' }); }`);
    await go(`vendor-management/invoices?open=${inv.id}`); await p.waitForTimeout(400);
    const tax = await drawer().locator('[data-bill-tax]').innerText();
    await drawer().locator('tr:has-text("PAY-901") button:has-text("Confirm")').click(); await p.waitForTimeout(150); await dlg().locator('label:has-text("UTR") input').fill('HDFCN52026100511'); await dlg().locator('button:has-text("Confirm")').last().click(); await p.waitForTimeout(200);
    await drawer().locator('tr:has-text("PAY-902") button:has-text("Failed")').click(); await p.waitForTimeout(150); await dlg().locator('label:has-text("Failure reason") input').fill('Beneficiary account closed'); await dlg().locator('button:has-text("Mark failed")').click(); await p.waitForTimeout(200);
    await drawer().locator('button:has-text("Release retention")').click(); await p.waitForTimeout(150); await dlg().locator('label:has-text("Reason") input').fill('Warranty period over, no defects'); await dlg().locator('button:has-text("Release")').last().click(); await p.waitForTimeout(200);
    const x = (await S()).invoices.find((i) => i.id === inv.id); const p1 = x.payments.find((q) => q.id === 'PAY-901'), p2 = x.payments.find((q) => q.id === 'PAY-902');
    return [`tax: ${tax.replace(/\s+/g, ' ').slice(0, 140)}; PAY-901 ${p1.bank?.status}; PAY-902 ${p2.bank?.status} reversed ${!!p2.reversed}; retention released ${!!x.retentionReleased}`, /(CGST|IGST)/.test(tax) && /Bill received on/.test(tax) && p1.bank?.status === 'Confirmed' && p2.bank?.status === 'Failed' && !!p2.reversed && !!x.retentionReleased];
  });
  await T('GP-08', 'Subcontract: terms, BOQ, guarantee and payments; above the approval limit it needs Project Manager then Finance Controller', async () => {
    await go('contract-labor/contracts?open=CTR-001'); await p.waitForTimeout(400);
    await drawer().locator('tr:has-text("Sai Earthmovers") button:has-text("Details")').click(); await p.waitForTimeout(200);
    const t = await dlg().locator('[data-sub-detail]').innerText(); await dlg().locator('button:has-text("Close")').last().click(); await p.waitForTimeout(150);
    await drawer().locator('button:has-text("Propose subcontractor")').click(); await p.waitForTimeout(150); const d = drawer();
    await pick(d.locator('label:has-text("Subcontractor") [role=combobox]').last(), 'Kaveri Manpower Services'); await d.locator('label:has-text("Scope sublet") input').fill('Shuttering labour - Tower A floors 5-10');
    await pick(d.locator('label:has-text("Terms") [role=combobox]').last(), 'Back-to-back with main contract'); await d.locator('label:has-text("Value") input').last().fill('6000000');
    await d.locator('button:has-text("Propose")').last().click(); await p.waitForTimeout(250);
    await drawer().locator('tr:has-text("Kaveri Manpower") button:has-text("Approve")').click(); await p.waitForTimeout(200);
    const mid = (await S()).contracts.find((c) => c.id === 'CTR-001').subcontracts.find((x) => x.vendorId === 'VEN-005');
    await drawer().locator('tr:has-text("Kaveri Manpower") button:has-text("Approve")').click(); await p.waitForTimeout(200);
    const fin = (await S()).contracts.find((c) => c.id === 'CTR-001').subcontracts.find((x) => x.vendorId === 'VEN-005');
    return [`detail BOQ ${/Excavation in hard rock/.test(t)}, BG ${/BG\/HDFC\/77120/.test(t)}, paid ${/12\.00 L/.test(t)}; after 1st approve ${mid?.status} (${(mid?.approvals || []).length}); after 2nd ${fin?.status} terms ${fin?.terms}`,
      /Excavation in hard rock/.test(t) && /BG\/HDFC\/77120/.test(t) && mid?.status === 'Proposed' && mid.approvals.length === 1 && fin?.status === 'Approved' && fin.terms === 'Back-to-back with main contract'];
  });
  await T('GP-09', 'Worker: supervisor, emergency contact, overtime eligibility and wage rate (not below the minimum wage)', async () => {
    await go('contract-labor/workers'); await p.locator('main button:has-text("Add worker")').click(); await p.waitForTimeout(200); const d = dlg();
    await pick(d.locator('label:has-text("Trade") [role=combobox]'), 'Mason'); await pick(d.locator('label:has-text("Skill") [role=combobox]'), 'Skilled');
    await d.locator('label:has-text("Wage rate") input').fill('500'); await p.waitForTimeout(100); const low = /Below the minimum wage/.test(await d.innerText());
    const has = ['Supervisor', 'Overtime eligible', 'Emergency contact', 'Emergency phone'].every(async (k) => (await d.locator(`label:has-text("${k}")`).count()) > 0);
    await p.keyboard.press('Escape'); const w = (await S()).workers[0];
    await go(`contract-labor/workers?open=${w.id}`); await p.waitForTimeout(300); const t = await drawer().innerText();
    return [`below-min error ${low}; fields ${has}; profile shows pay & emergency ${/Pay & emergency contact/.test(t)} OT ${/Overtime eligible/.test(t)}`, low && /Pay & emergency contact/.test(t) && /Overtime eligible/.test(t)];
  });
  await T('GP-10', 'Earned value & productivity: baseline vs forecast, PV/EV/AC, SPI/CPI, per-day rates, output per man-day, qty per day per item', async () => {
    await go('contract-labor/performance'); await p.waitForTimeout(300); await p.locator('button, [role=tab]').filter({ hasText: 'Earned value & productivity' }).first().click(); await p.waitForTimeout(250);
    const t = await p.locator('main').innerText();
    await go('contract-labor/work-orders?open=WO-001'); await p.waitForTimeout(400); const w = await drawer().locator('[data-wo-ev]').innerText();
    const ok = /SPI · CPI/i.test(t) && /per man-day/i.test(t) && /Baseline/.test(w) && /Forecast finish/.test(w) && /Qty per day/i.test(w);
    return [`spi ${/SPI · CPI/i.test(t)} out ${/per man-day/i.test(t)} base ${/Baseline/.test(w)} fc ${/Forecast finish/.test(w)}; tab ${/PV · EV · AC/i.test(t)}; WO section ${/Forecast finish/.test(w)} qty/day ${/Qty per day/i.test(w)}`, ok];
  });
  await T('GP-11', 'Final settlement shows LD and price escalation as their own lines', async () => {
    await go('contract-labor/final-settlement?open=CTR-001'); await p.waitForTimeout(300); const t = await dlg().innerText();
    return [`LD line ${/Less liquidated damages/.test(t)}; escalation line ${/Add price escalation admitted/.test(t)}; penalties separate ${/Less penalties deducted in RA bills/.test(t)}`, /Less liquidated damages/.test(t) && /Add price escalation admitted/.test(t) && /Less penalties deducted in RA bills/.test(t)];
  });
});
