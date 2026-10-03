// MERGE SUITE — checks for the validations and features merged from the other build:
// vendor master formats and bank verification, bills & payments, purchasing, contractor side,
// qualification status and limits, background-check mobilisation, remaining forms,
// configurable approval stages, and the removal of roles.
require('./lib')('merge', async ({ p, go, dlg, S, mut, T, pick, toastText }) => {
  const btn = (t) => p.locator(`button:has-text("${t}")`);
  const body = () => p.textContent('body');
  const esc = () => p.keyboard.press('Escape');

  // ---------------------------------------------------------------- roles removed
  await T('R-01', 'No "Acting as" switcher on any page', async () => {
    let seen = 0; for (const pg of ['vendor-management/registry', 'approvals/approval-management', 'contract-labor/ra-bills', 'vendor-management/invoices']) { await go(pg); if (/Acting as/.test(await body())) seen++; }
    return [`pages showing the switcher: ${seen}`, seen === 0];
  });

  // ---------------------------------------------------------------- vendor master
  // approved vendors are read-only: edit tests run on a Draft vendor
  await mut(`(s) => { s.vendors.find((y) => y.id === 'VEN-011').status = 'Draft'; }`);
  await T('M-01', 'Bank account added from the Bank tab starts Unverified; Verify stamps who and when', async () => {
    await go('vendor-management/registry?open=VEN-011'); await p.waitForTimeout(300); await dlg().locator('[role=tab]:has-text("Bank")').click(); await p.waitForTimeout(150);
    const d = dlg(); await d.locator('button:has-text("Add bank account")').click(); await p.waitForTimeout(100); await d.locator('label:has-text("Account holder name") input').fill((await S()).vendors.find((x) => x.id === 'VEN-011').legalName); await d.locator('label:has-text("Bank") input').nth(1).fill('Axis Bank');
    await d.locator('label:has-text("Account no.") input').first().fill('918020012345678'); await d.locator('label:has-text("Re-enter account no.") input').fill('918020012345678'); await d.locator('label:has-text("IFSC") input').fill('UTIB0000123'); await d.locator('button:has-text("Add")').last().click(); await p.waitForTimeout(200);
    let v = (await S()).vendors.find((x) => x.id === 'VEN-011'); const a = v.bankAccounts.find((b) => b.account === '918020012345678'); const st0 = a?.status;
    await d.locator(`tr:has-text("5678") button:has-text("Verify")`).click(); await p.waitForTimeout(200);
    v = (await S()).vendors.find((x) => x.id === 'VEN-011'); const a2 = v.bankAccounts.find((b) => b.account === '918020012345678');
    return [`added ${st0}; after verify ${a2?.status} by ${a2?.verifiedBy}`, st0 === 'Unverified' && a2?.status === 'Verified' && !!a2.verifiedAt];
  });
  await T('M-02', 'Bank form rejects a bad IFSC', async () => {
    const d = dlg(); await d.locator('button:has-text("Add bank account")').click(); await p.waitForTimeout(100); await d.locator('label:has-text("Account holder name") input').fill('Konkan Steel'); await d.locator('label:has-text("Bank") input').nth(1).fill('HDFC');
    await d.locator('label:has-text("Account no.") input').first().fill('50200099887766'); await d.locator('label:has-text("Re-enter account no.") input').fill('50200099887766'); await d.locator('label:has-text("IFSC") input').fill('HDFC123'); await d.locator('button:has-text("Add")').last().click(); await p.waitForTimeout(150);
    const t = await d.textContent(); const n = (await S()).vendors.find((x) => x.id === 'VEN-011').bankAccounts.filter((b) => b.account === '50200099887766').length; await esc();
    return [`IFSC error shown: ${/IFSC/i.test(t) && /11|format|valid/i.test(t)}; saved ${n}`, n === 0];
  });
  await T('M-03', 'Upload limit: a file above 5 MB is refused', async () => {
    await go('vendor-management/registry?open=VEN-011'); await p.waitForTimeout(300); await dlg().locator('[role=tab]:has-text("Documents")').click(); await p.waitForTimeout(150);
    const before = JSON.stringify((await S()).vendors.find((x) => x.id === 'VEN-011').docs);
    const big = { name: 'big.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(5 * 1024 * 1024 + 10, 65) };
    await btn('Upload document').first().click(); await p.waitForTimeout(150); await dlg().locator('input[type=file]').setInputFiles(big); await p.waitForTimeout(300); const t = await toastText();
    const after = JSON.stringify((await S()).vendors.find((x) => x.id === 'VEN-011').docs); await esc(); await esc();
    return [`toast: "${t.slice(0, 70)}"; docs unchanged: ${before === after}`, /over the 5 MB limit/.test(t) && before === after];
  });

  // ---------------------------------------------------------------- bills & payments
  await mut(`(s) => { s.vendors.find((y) => y.id === 'VEN-011').status = 'Active'; }`);
  await T('B-01', 'Duplicate bill number blocked ignoring case and spaces', async () => {
    const s = await S(); const inv = s.invoices.find((i) => i.source === 'Purchase Order');
    await go('vendor-management/invoices'); await p.locator('button:has-text("Enter vendor bill"), button:has-text("New bill"), button:has-text("Enter bill")').first().click(); await p.waitForTimeout(200);
    const d = dlg(); await pick(d.locator('label:has-text("Purchase order") [role=combobox]'), inv.poId);
    await d.locator('label:has-text("Vendor invoice no.") input').fill(' ' + inv.number.toLowerCase().replace(/\//g, ' / ') + ' '); await p.waitForTimeout(100);
    const t = await d.textContent(); const dis = await d.locator('button:has-text("Save bill")').isDisabled(); await esc();
    return [`"${inv.number.toLowerCase()}" with spaces → save disabled=${dis}`, dis && /already recorded/.test(t)];
  });
  await T('B-02', 'Payment date in the future is refused', async () => {
    const s = await S(); const inv = s.invoices.find((i) => i.payments.length === 0 && i.review !== 'Pending' && i.status !== 'Draft');
    await go('vendor-management/invoices?open=' + inv.id); await p.waitForTimeout(300); await btn('Record payment').first().click(); await p.waitForTimeout(200);
    const d = dlg(); const f = new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10);
    await d.locator('label:has-text("Value date") input').fill(f); await p.waitForTimeout(100);
    const t = await d.textContent(); const dis = await d.locator('button:has-text("Release payment")').isDisabled(); await esc();
    return [`value date ${f} → message ${/can't be in the future/.test(t)}; release disabled=${dis}`, /can't be in the future/.test(t) && dis];
  });
  await T('B-03', 'Select payable and Accruals are available on Vendor Bills', async () => {
    await go('vendor-management/invoices'); const t = await body();
    await p.getByText('Accruals', { exact: true }).first().click(); await p.waitForTimeout(250); const t2 = await body();
    return [`select payable: ${/Select payable/.test(t)}; accruals view: ${/received|accru/i.test(t2)}`, /Select payable/.test(t) && /accru/i.test(t2)];
  });

  // ---------------------------------------------------------------- purchasing
  await T('P-01', 'RFQ: one vendor only is refused (≥ 2 vendors needed)', async () => {
    await go('vendor-management/rfq'); await btn('New RFQ').click(); await p.waitForTimeout(200); const d = dlg();
    await d.locator('label:has-text("Title") input').first().fill('Test single vendor'); await d.locator('input[placeholder="Description"]').fill('Binding wire'); await d.locator('input[type=number]').first().fill('10');
    await d.locator('button:has-text("Konkan Steel")').click(); await p.waitForTimeout(100);
    const t = await d.textContent(); const dis = await d.locator('button:has-text("Save & compose")').isDisabled(); await esc();
    return [`message: ${(t.match(/at least (2|two) vendors[^.]*/i) || ['none'])[0]}; disabled=${dis}`, /at least (2|two) vendors/i.test(t) && dis];
  });

  // ---------------------------------------------------------------- contractor side
  await T('C-01', 'Labour rate below the statutory minimum wage is refused', async () => {
    await go('contract-labor/labor-rates'); await p.waitForTimeout(300); await btn('New rate').first().click(); await p.waitForTimeout(200);
    const d = dlg(); await d.locator('label:has-text("Statutory minimum wage") input').fill('700'); await d.locator('label:has-text("Billing rate") input').fill('650'); await p.waitForTimeout(100);
    const t = await d.textContent(); await esc();
    return [`message shown: ${/minimum wage/i.test(t) && /below|less|at least/i.test(t)}`, /below|less than|at least/i.test(t)];
  });
  await T('C-02', 'Add worker: under-18 date of birth is refused', async () => {
    await go('contract-labor/attendance'); await p.waitForTimeout(300); await btn('Add worker').first().click(); await p.waitForTimeout(200); const d = dlg();
    const dob = new Date(Date.now() - 16 * 365 * 864e5).toISOString().slice(0, 10);
    await d.locator('label:has-text("Name") input').first().fill('Test Minor'); await d.locator('label:has-text("Date of birth") input').fill(dob); await p.waitForTimeout(100);
    const t = await d.textContent(); await esc();
    return [`DOB ${dob} → 18+ message: ${/18/.test(t)}`, /18/.test(t)];
  });

  // ---------------------------------------------------------------- qualification & background
  await T('Q-01', 'Qualification results show status and value limit (incl. "Qualified with exceptions")', async () => {
    await go('vendor-management/approvals'); await p.getByText('Qualification results', { exact: true }).click(); await p.waitForTimeout(250); const t = await body();
    return [`with exceptions: ${/Qualified with exceptions/.test(t)}; limit column: ${/Aggregate \/ single limit/.test(t)}`, /Qualified with exceptions/.test(t) && /Aggregate \/ single limit/.test(t)];
  });
  await T('Q-02', 'Work order above the contractor\'s qualification limit shows a warning', async () => {
    await mut((s) => { s.vendors.find((v) => v.id === 'VEN-001').qualification.valueLimit = 1000000; });
    await go('contract-labor/work-orders'); await p.click('text=Create work order'); await p.waitForTimeout(200); const d = dlg();
    await pick(d.locator('[role=combobox]').first(), 'CTR-001'); await p.waitForTimeout(150);
    await d.locator('input[placeholder="Rate"], input[placeholder="Qty"]').first().fill('100').catch(() => {});
    const t = await d.textContent(); await esc();
    await mut((s) => { delete s.vendors.find((v) => v.id === 'VEN-001').qualification.valueLimit; });
    return [(t.match(/Over the (aggregate qualification|single-project) limit[^.]*/) || ['no warning'])[0].slice(0, 110), /Over the (aggregate qualification|single-project) limit/.test(t)];
  });
  await T('Q-03', 'Background check not clear → work order cannot be issued (mobilisation blocked)', async () => {
    await mut((s) => { s.vendors.find((v) => v.id === 'VEN-001').background.litigation = 'Pending case'; });
    await go('contract-labor/work-orders'); await p.click('text=Create work order'); await p.waitForTimeout(200); const d = dlg();
    await pick(d.locator('[role=combobox]').first(), 'CTR-001'); await p.waitForTimeout(150);
    const t = await d.textContent(); const dis = await d.locator('button:has-text("Issue work order")').isDisabled(); await esc();
    await mut((s) => { s.vendors.find((v) => v.id === 'VEN-001').background.litigation = 'Clear'; });
    return [`note: ${/mobilisation blocked/.test(t)}; issue disabled=${dis}`, /litigation pending case — mobilisation blocked/.test(t) && dis];
  });
  await T('Q-04', 'Recording an adverse background check needs a finding', async () => {
    await go('vendor-management/approvals?open=VEN-010'); await p.waitForTimeout(300); await btn('Record check').click(); await p.waitForTimeout(150); const d = dlg();
    await pick(d.locator('label:has-text("Watchlist") [role=combobox]'), 'Match found'); await p.waitForTimeout(100);
    const dis = await d.locator('button:has-text("Save")').isDisabled(); const t = await d.textContent(); await esc();
    return [`save disabled=${dis}; message ${/Describe the finding/.test(t)}`, dis && /Describe the finding/.test(t)];
  });

  // ---------------------------------------------------------------- remaining forms
  await mut(`(s) => { s.vendors.find((y) => y.id === 'VEN-011').status = 'Active'; }`);
  await T('F-01', 'Hold: short reason and past release date are refused', async () => {
    // hold is placed from the status badge (approved vendors' tabs are read-only)
    await go('vendor-management/registry?open=VEN-011'); await p.waitForTimeout(300); await p.locator('[data-drawer] button[aria-label^="Change status of"]').first().click(); await p.waitForTimeout(150);
    await p.locator('[role=menu] [role=menuitem]').filter({ hasText: 'On Hold' }).click(); await p.waitForTimeout(200);
    const d = dlg(); await d.locator('label:has-text("Reason") input').first().fill('abc'); await p.waitForTimeout(80);
    const dis1 = await d.locator('button:has-text("Place hold")').isDisabled();
    await d.locator('label:has-text("Reason") input').first().fill('Pending reconciliation'); await d.locator('label:has-text("Release date") input').fill('2020-01-01'); await p.waitForTimeout(80);
    const dis2 = await d.locator('button:has-text("Place hold")').isDisabled(); const t = await d.textContent(); await esc();
    return [`short reason disabled=${dis1}; past date disabled=${dis2} (${/must be in the future/.test(t)})`, dis1 && dis2 && /must be in the future/.test(t)];
  });
  await mut(`(s) => { s.vendors.find((y) => y.id === 'VEN-001').status = 'Draft'; }`);
  await T('F-02', 'Insurance: an already-expired policy is refused', async () => {
    await go('vendor-management/registry?open=VEN-001'); await p.waitForTimeout(300); await dlg().locator('[role=tab]:has-text("Documents")').click(); await p.waitForTimeout(150);
    await btn('Add policy').first().click(); await p.waitForTimeout(150); const m = dlg();
    await m.locator('label:has-text("Policy number") input').fill('WC/2020/1111'); await m.locator('label:has-text("Insurer") input').fill('ICICI Lombard'); await m.locator('label:has-text("Sum insured") input').fill('6000000');
    await m.locator('label:has-text("Valid from") input').fill('2020-01-01'); await m.locator('label:has-text("Valid till") input').fill('2021-01-01'); await p.waitForTimeout(80);
    const dis = await m.locator('button:has-text("Save policy")').isDisabled(); const t = await m.textContent(); await esc();
    return [`save disabled=${dis}; ${(t.match(/Policy has already expired[^—]*/) || ['no msg'])[0]}`, dis && /already expired/.test(t)];
  });
  await mut(`(s) => { s.vendors.find((y) => y.id === 'VEN-001').status = 'Active'; }`);
  await T('F-03', 'Performance rating of 2 or below needs remarks', async () => {
    await go('vendor-management/scorecard'); await p.waitForTimeout(300); await p.locator('button:has-text("Rate performance"), button:has-text("Rate contractor"), button:has-text("Add rating")').first().click(); await p.waitForTimeout(200); const d = dlg();
    await pick(d.locator('label:has-text("Contractor / vendor") [role=combobox]'), 'Shree Balaji'); await d.locator('label:has-text("Period") input').fill('Test 2026');
    await d.locator('label:has-text("Quality of work") button').nth(0).click(); await p.waitForTimeout(80);
    const dis = await d.locator('button:has-text("Save rating")').isDisabled(); const t = await d.textContent(); await esc();
    return [`save disabled=${dis}; remarks message ${/Remarks are required/.test(t)}`, dis && /Remarks are required/.test(t)];
  });

  // ---------------------------------------------------------------- configurable approval stages
  await T('S-01', 'Approval stages are configurable: a new Compliance stage is used by the next registration', async () => {
    await go('vendor-management/settings'); await p.waitForTimeout(300); await p.getByText('Gates & approvals', { exact: true }).first().click(); await p.waitForTimeout(150);
    const sec = p.locator('section, div').filter({ hasText: /^Vendor approval stages/ }).first();
    await p.locator('text=Vendor approval stages').scrollIntoViewIfNeeded(); await p.locator(':text("Vendor approval stages") >> xpath=ancestor::*[.//button[contains(., "Add stage")]][1]').locator('button:has-text("Add stage")').click(); await p.waitForTimeout(100);
    await p.locator('input[placeholder="Stage name (e.g. Legal)"]').nth(3).fill('Compliance'); await btn('Save settings').click(); await p.waitForTimeout(200);
    const st = await S(); const flow = (st.settings.vendorFlow || []).map((x) => x.name);
    await go('vendor-management/registry'); await btn('Register vendor').first().click(); await p.waitForTimeout(250); const d = dlg();
    await d.locator('button:has-text("Fill all details now")').click().catch(() => {}); await p.waitForTimeout(150); await d.locator('input').nth(0).fill('Stage Test Traders'); await d.locator('[role=combobox][aria-haspopup=listbox]:has-text("Select trades")').first().click(); await p.locator('[role=option]').filter({ hasText: 'Steel' }).first().click(); await d.locator('h2,h3').first().click();
    await d.locator('input[placeholder="27AAKCS4412M1Z3"]').fill('27STGTE4411K1Z5'); await d.locator('input[placeholder="AAKCS4412M"]').fill('STGTE4411K');
    await d.locator('label:has-text("Contact person") input').fill('Ravi Test'); await d.locator('input[type=email]').fill('ravi@stagetest.in');
    await d.locator('label:has-text("Account holder name") input').fill('Stage Test Traders'); await d.locator('input[placeholder="e.g. HDFC Bank"]').fill('HDFC Bank'); await d.locator('label:has-text("Account no.") input').first().fill('50200011229988'); await d.locator('label:has-text("IFSC") input').fill('HDFC0000123');
    await d.locator('button:has-text("Save draft")').first().click(); await p.waitForTimeout(300);
    const v = (await S()).vendors.find((x) => x.name === 'Stage Test Traders');
    return [`settings: ${flow.join(' → ')}; new vendor stages: ${v?.approval.stages.map((x) => x.dept).join(' → ')}`, flow.length === 4 && v?.approval.stages.length === 4 && v.approval.stages[3].dept === 'Compliance'];
  });
  await T('S-02', 'Existing records keep their stages; an empty stage name is refused', async () => {
    const v = (await S()).vendors.find((x) => x.id === 'VEN-007');
    await go('vendor-management/settings'); await p.waitForTimeout(300); await p.getByText('Gates & approvals', { exact: true }).first().click(); await p.waitForTimeout(150); await p.locator('input[placeholder="Stage name (e.g. Legal)"]').first().fill(''); await btn('Save settings').click(); await p.waitForTimeout(200); const t = await toastText();
    const flow = ((await S()).settings.vendorFlow || []).map((x) => x.name);
    return [`VEN-007 stages ${v.approval.stages.length}; empty name → "${t.slice(0, 60)}"; saved flow ${flow.join(' → ')}`, v.approval.stages.length === 3 && /needs a name/.test(t) && flow[0] === 'Procurement'];
  });
});
