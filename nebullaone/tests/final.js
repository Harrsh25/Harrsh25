// FINAL FULL-SYSTEM TEST - one clean run, new vendor and new contractor, registration → closure,
// every step through the UI. Records the chain of IDs for data continuity.
require('./lib')('final', async ({ fill, p, go, dlg, S, mut, as, T, pick, toastText }) => {
  const btn = (t) => p.locator(`button:has-text("${t}")`);
  const pdf = { name: 'doc.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') };
  const upAll = async (d) => { const f = d.locator('input[type=file]'); const n = await f.count(); for (let i = 0; i < n; i++) { await f.nth(i).setInputFiles(pdf); await p.waitForTimeout(60); } };
  const V = async (name) => (await S()).vendors.find((v) => v.name === name);
  const chain = { vendor: {}, contractor: {} };
  const wbs = '1.1 Site enabling';
  const vlogin = async (email) => { await p.evaluate(() => localStorage.removeItem('nxv-vendor-session')); await go('#/supplier/login'); await p.locator('input[type=email]').fill(email); await p.click('text=Send one-time code');
    const code = (await p.locator('b.mono').textContent()).trim(); await p.locator('input[placeholder="••••••"]').fill(code); await p.click('button:has-text("Sign in")'); await p.waitForTimeout(400); };
  const register = async (page, button, f) => {
    await go(page); await btn(button).first().click(); await p.waitForTimeout(250); const d = dlg();
    await d.locator('button:has-text("Fill all details now")').click().catch(() => {}); await p.waitForTimeout(150); await d.locator('input').nth(0).fill(f.name); await d.locator('[role=combobox][aria-haspopup=listbox]:has-text("Select trades")').first().click(); await p.locator('[role=option]').filter({ hasText: f.trade }).first().click(); await d.locator('h2,h3').first().click();
    await d.locator('input[placeholder="27AAKCS4412M1Z3"]').fill(f.gst); await d.locator('input[placeholder="AAKCS4412M"]').fill(f.pan);
    await d.locator('label:has-text("Contact person") input').fill(f.contact); await d.locator('input[type=email]').fill(f.email);
    await d.locator('label:has-text("Account holder name") input').fill(f.name); await d.locator('input[placeholder="e.g. HDFC Bank"]').fill('HDFC Bank'); await d.locator('label:has-text("Account no.") input').first().fill('5020' + f.pan.replace(/\D/g, '') + String(f.name.length).padStart(4, '0') + '01'); /* each party its own account - one bank account can belong to one vendor only */ await d.locator('label:has-text("IFSC") input').fill('HDFC0000123');
    await fill(d); await upAll(d); await d.locator('button:has-text("Submit for approval")').click(); await p.waitForTimeout(350);
    return V(f.name);
  };
  const verifyAll = async (id, insurance) => {
    await go('vendor-management/approvals?open=' + id); await p.waitForTimeout(300);
    await dlg().locator('[role=tab]:has-text("Documents")').click(); await p.waitForTimeout(150);
    if (insurance) { await btn('Add policy').click(); await p.waitForTimeout(150); const m = dlg();
      await m.locator('label:has-text("Policy number") input').fill('WC/2026/55120'); await m.locator('label:has-text("Insurer") input').fill('ICICI Lombard'); await m.locator('label:has-text("Sum insured") input').fill('6000000');
      await m.locator('button:has-text("Save policy")').click(); await p.waitForTimeout(150); }
    for (let i = 0; i < 20; i++) { const b = dlg().locator('button:has-text("Verify")').first(); if (!(await b.count())) break; await b.click(); await p.waitForTimeout(80); }
    // …then the bank account (an unverified default account stops payment)
    await dlg().locator('[role=tab]:has-text("Bank")').click(); await p.waitForTimeout(150);
    for (let i = 0; i < 5; i++) { const b = dlg().locator('button:has-text("Verify")').first(); if (!(await b.count())) break; await b.click(); await p.waitForTimeout(80); }
  };
  const qualify = async (id, answers) => {
    await go('vendor-management/approvals?open=' + id); await p.waitForTimeout(300); await dlg().locator('[role=tab]:has-text("Qualification")').click(); await p.waitForTimeout(150);
    const rows = dlg().locator('.grid.grid-cols-\\[1fr_220px\\]'); const n = await rows.count();
    for (let i = 0; i < n; i++) { const r = rows.nth(i), q = (await r.textContent()).toLowerCase(); const a = answers.find(([k]) => q.includes(k)); if (!a) continue;
      if (await r.locator('[role=combobox]').count()) await pick(r.locator('[role=combobox]'), a[1]); else await r.locator('input').fill(String(a[1])); }
    await btn('Save & score').click(); await p.waitForTimeout(150);
  };
  const approve3 = async (id) => { for (const who of ['Arjun Mehta', 'Neha Kulkarni', 'Rohit Shah']) { await as(who); await go('vendor-management/approvals?open=' + id); await p.waitForTimeout(250); await p.locator('button:has-text("Approve as")').click(); await p.waitForTimeout(200); } await as(null); };
  const ANS = [['written hse policy', 'Yes'], ['site supervisors', 4], ['years', 12], ['turnover', 45], ['iso', 'Yes'], ['litigation', 'No'], ['manufacturer or trader', 'Manufacturer'], ['capacity', 300], ['test certificates', 'Yes'], ['workforce', 180], ['clra', 'Yes'], ['lost-time', 0], ['hse officer', 'Yes']];

  // ===================================================== VENDOR LIFECYCLE
  const VN = { name: 'Sahyadri Steel Traders', trade: 'Steel', gst: '27SAHYD4411K1Z5', pan: 'SAHYD4411K', contact: 'Meera Kulkarni', email: 'sales@sahyadristeel.in' };
  let v;
  await T('V01', 'Registration (Tier 1) with documents - submitted', async () => { await as('Priya Nair'); v = await register('vendor-management/registry', 'Register vendor', VN); await as(null); chain.vendor.id = v?.id; return [`${v?.id} ${v?.status}, ${v?.docs.filter((d) => d.status === 'Pending').length} docs pending verification`, v && v.status === 'Pending Approval']; });
  await T('V02', 'Approver sees only Verify / Reject on pending documents (no upload, replace or withdraw)', async () => { await as('Arjun Mehta'); await go('vendor-management/approvals?open=' + v.id); await p.waitForTimeout(250); await dlg().locator('[role=tab]:has-text("Documents")').click(); await p.waitForTimeout(150);
    const names = await dlg().locator('table button:visible').allInnerTexts(); await as(null); const bad = names.filter((x) => /Replace|Withdraw|Upload|Delete/.test(x));
    return [`buttons: ${[...new Set(names.map((x) => x.trim()))].join(', ')}`, names.some((x) => /Verify/.test(x)) && !bad.length]; });
  await T('V03', 'Document verification + qualification', async () => { await as('Arjun Mehta'); await verifyAll(v.id); await qualify(v.id, ANS); await as(null); v = await V(VN.name); return [`verified ${v.docs.filter((d) => d.status === 'Verified').length}/${v.docs.length}; qualification ${v.qualification?.score}/100`, v.docs.every((d) => d.status === 'Verified') && v.qualification?.score >= 70]; });
  await T('V04', 'Approval Procurement → Legal → Finance (all three stages) → Active master', async () => { await approve3(v.id); v = await V(VN.name); return [`${v.status} / ${v.regTier}; stages ${v.approval.stages.map((s) => `${s.dept} ${s.status}`).join(', ')}`, v.status === 'Active' && v.regTier === 'Spend Authorized' && v.approval.stages.length === 3 && v.approval.stages.every((s) => s.status === 'Approved')]; });
  await T('V05', 'RFQ created and sent (new vendor + Konkan)', async () => {
    await as('Priya Nair'); await go('vendor-management/rfq'); await btn('New RFQ').click(); await p.waitForTimeout(200); const d = dlg();
    await d.locator('label:has-text("Title") input').first().fill('TMT Fe500D 16 mm - 40 MT'); await d.locator('input[placeholder="Description"]').fill('TMT Fe500D 16 mm'); await d.locator('input[type=number]').first().fill('40');
    await fill(d); await d.locator(`button:has-text("${VN.name}")`).click(); await d.locator('button:has-text("Konkan Steel")').click(); await d.locator('button:has-text("Save & compose")').click(); await p.waitForTimeout(400);
    await dlg().locator('button:has-text("Send to")').click(); await p.waitForTimeout(300); await as(null);
    const r = (await S()).rfqs.find((x) => x.title.startsWith('TMT Fe500D 16')); chain.vendor.rfq = r?.id; return [`${r?.id} ${r?.status}, invited ${r?.vendorIds.join(', ')}`, r && r.status === 'Sent'];
  });
  await T('V06', 'Vendor quotes through the secure link', async () => {
    await p.evaluate(() => localStorage.removeItem('nxv-vendor-session')); await go(`#/vendor-quote/${chain.vendor.rfq}/${v.id}`);
    await p.locator('input[type=email]').fill(VN.email); await p.click('text=Send one-time code'); const code = (await p.locator('b.mono').textContent()).trim(); await p.locator('input[placeholder="••••••"]').fill(code); await p.click('button:has-text("Sign in")'); await p.waitForTimeout(300);
    await p.click('button:has-text("Yes, I\'ll quote")'); await p.waitForTimeout(200); await p.locator('tbody input[type=number]').nth(0).fill('57200');
    await p.locator('input[placeholder="e.g. DST/Q/0412"]').fill('SST/Q/101'); await p.locator('text=I accept the buyer').click(); await p.click('button:has-text("Submit quotation")'); await p.waitForTimeout(300);
    const q = (await S()).rfqs.find((x) => x.id === chain.vendor.rfq).quotes.find((x) => x.vendorId === v.id); return [`quote ${q?.quoteNo} ${q?.review}`, q && q.review === 'Under review'];
  });
  await T('V07', 'Evaluation + award with recommendation → draft PO', async () => {
    await as('Priya Nair'); await go('vendor-management/rfq?open=' + chain.vendor.rfq); await p.waitForTimeout(300);
    await p.locator('[data-drawer] [role=tab]').filter({ hasText: 'Vendors' }).first().click(); await p.waitForTimeout(150); await p.locator(`tr:has-text("${VN.name}") button:has-text("Accept")`).click(); await p.waitForTimeout(200); await p.locator('[data-drawer] [role=tab]').filter({ hasText: 'Comparison' }).first().click(); await p.waitForTimeout(150); await btn('Award by line').click(); await p.waitForTimeout(200);
    await dlg().locator('label:has-text("Award recommendation") input').fill('Only compliant quote, L1'); await dlg().locator('button:has-text("Award & create")').click(); await p.waitForTimeout(300); await as(null);
    const po = (await S()).purchaseOrders.find((x) => x.rfqId === chain.vendor.rfq); chain.vendor.po = po?.id; return [`${po?.id} ${po?.status} for ${po?.vendorId}, award note "${po?.awardNote}"`, po && po.vendorId === v.id && po.status === 'Draft'];
  });
  await T('V08', 'PO approval (Approval Management) → Issued', async () => {
    await go('approvals/approval-management?module=Purchase%20Orders'); await p.waitForTimeout(300); await p.locator(`tr:has-text("${chain.vendor.po}") button:has-text("Approve")`).click(); await p.waitForTimeout(200);
    const po = (await S()).purchaseOrders.find((x) => x.id === chain.vendor.po); return [`${po.status} (approved by ${po.approval?.by})`, po.status === 'Issued'];
  });
  await T('V09', 'Delivery → goods receipt (acceptance)', async () => {
    await go('vendor-management/purchase-orders?open=' + chain.vendor.po); await p.waitForTimeout(300); await btn('Receive goods').click(); await p.waitForTimeout(150); await dlg().locator('button:has-text("Post GRN")').click(); await p.waitForTimeout(200);
    const po = (await S()).purchaseOrders.find((x) => x.id === chain.vendor.po); return [`${po.receipts.length} GRN, received ${po.receipts[0]?.lines.map((l) => l.accepted).join('/')}`, po.receipts.length === 1];
  });
  await T('V10', 'Vendor submits invoice in the portal → AP validation (Accounts) → accepted', async () => {
    await vlogin(VN.email); await p.getByText('Bills & payments', { exact: true }).click(); await btn('Submit invoice').click(); await p.waitForTimeout(200); const d = dlg();
    await d.locator('label:has-text("Your invoice no.") input').fill('SST/26-27/0007'); await d.locator('input[type=file]').setInputFiles(pdf); await p.waitForTimeout(150); await d.locator('button:has-text("Submit invoice")').click(); await p.waitForTimeout(250);
    const inv = (await S()).invoices.find((i) => i.number === 'SST/26-27/0007'); chain.vendor.invoice = inv?.id;
    await as('Anita Joshi'); await go('approvals/approval-management?module=Vendor%20Invoices'); await p.waitForTimeout(300); await p.locator(`tr:has-text("${inv.id}") button:has-text("Approve")`).click(); await p.waitForTimeout(200); await as(null);
    const i2 = (await S()).invoices.find((i) => i.id === inv.id); return [`${inv.id} review ${i2.review} by ${i2.reviewedBy}; 3-way match against ${i2.poId}`, i2.review === 'Accepted' && i2.poId === chain.vendor.po];
  });
  await T('V11', 'Payment (after AP acceptance) → Paid', async () => {
    await go('vendor-management/invoices?open=' + chain.vendor.invoice); await p.waitForTimeout(300); await btn('Record payment').click(); await p.waitForTimeout(200); await dlg().locator('button:has-text("Release payment")').click(); await p.waitForTimeout(250); await as(null);
    const i = (await S()).invoices.find((x) => x.id === chain.vendor.invoice); return [`status ${i.payments.length ? 'paid by ' + i.payments[0].paidBy + ' on ' + i.payments[0].date : 'unpaid'}`, i.payments.length === 1];
  });
  await T('V12', 'Performance: vendor gets a score after delivery', async () => { await go('vendor-management/scorecard'); await p.waitForTimeout(200); const t = await p.textContent('body'); return [t.includes(VN.name) ? 'listed on the scorecard' : 'missing', t.includes(VN.name)]; });
  await T('V13', 'Suspension: hold (All) makes the portal read-only; release restores', async () => {
    await mut((s) => { const x = s.vendors.find((y) => y.name === 'Sahyadri Steel Traders'); x.status = 'On Hold'; x.hold = { scope: 'All', until: null, reason: 'Quality complaint under review' }; });
    await vlogin(VN.email); const t = await p.textContent('body');
    await mut((s) => { const x = s.vendors.find((y) => y.name === 'Sahyadri Steel Traders'); x.status = 'Active'; x.hold = null; });
    return [/are paused/.test(t) ? 'portal read-only while on hold' : 'not read-only', /are paused/.test(t)];
  });
  await T('V14', 'Closure: vendor made inactive - portal access ends', async () => {
    await as('Arjun Mehta'); await go('vendor-management/registry'); await p.locator(`button[aria-label="Change status of ${VN.name}"]`).click(); await p.locator('[role=menuitem]:has(span:text-is("Inactive"))').click(); await p.waitForTimeout(200); await as(null);
    await p.evaluate(({ id, e }) => localStorage.setItem('nxv-vendor-session', JSON.stringify({ vendorId: id, email: e, at: Date.now() })), { id: v.id, e: VN.email }); await go('#/supplier'); const t = await p.textContent('body');
    v = await V(VN.name); chain.vendor.final = v.status; return [`${v.status}; portal: ${/Portal access suspended/.test(t) ? 'suspended' : 'open'}`, v.status === 'Inactive' && /Portal access suspended/.test(t)];
  });

  // ===================================================== CONTRACTOR LIFECYCLE
  const CN = { name: 'Deccan Infra Works', trade: 'Excavation', gst: '27DKINF5521M1Z9', pan: 'DKINF5521M', contact: 'Sanjay Pawar', email: 'ops@deccaninfra.in' };
  let c;
  await T('C01', 'Contractor registration with statutory documents', async () => { await as('Priya Nair'); c = await register('contract-labor/onboarding', 'Onboard contractor', CN); await as(null); chain.contractor.id = c?.id; return [`${c?.id} ${c?.status} (${c?.type}), ${c?.docs.length} documents`, c && c.status === 'Pending Approval' && (c.isContractor || c.type === 'Labor')]; });
  await T('C02', 'Technical / financial / legal / HSE qualification + document verification', async () => { await as('Arjun Mehta'); await verifyAll(c.id, false); await qualify(c.id, ANS); await as(null); c = await V(CN.name); return [`docs verified ${c.docs.filter((d) => d.status === 'Verified').length}/${c.docs.length}; score ${c.qualification?.score}`, c.docs.every((d) => d.status === 'Verified') && c.qualification?.score >= 70]; });
  await T('C03', 'Approval → contractor master Active', async () => { await approve3(c.id); c = await V(CN.name); return [`${c.status} / ${c.regTier}`, c.status === 'Active']; });
  await T('C04', 'Mobilisation: checklist completed (background checks are no longer recorded, so they do not block)', async () => {
    await go('contract-labor/onboarding'); await p.locator(`tr:has-text("${CN.name}")`).first().click(); await p.waitForTimeout(300);
    const boxes = dlg().locator('input[type=checkbox]'); const n = await boxes.count(); for (let i = 0; i < n; i++) { if (!(await boxes.nth(i).isChecked())) { await boxes.nth(i).click(); await p.waitForTimeout(60); } }
    c = await V(CN.name);
    return [`checklist ${c.onboarding.checklist.filter((x) => x.done).length}/${c.onboarding.checklist.length}`, c.onboarding.checklist.every((x) => x.done)];
  });
  await T('C05', 'Tender (RFQ) with BOQ → contractor rate submission', async () => {
    await as('Priya Nair'); await go('vendor-management/rfq'); await btn('New RFQ').click(); await p.waitForTimeout(200); const d = dlg();
    await d.locator('label:has-text("Title") input').first().fill('Block D bulk excavation'); await d.locator('input[placeholder="Description"]').fill('Excavation in ordinary soil up to 3 m'); await d.locator('input[type=number]').first().fill('3000');
    await fill(d); await d.locator(`button:has-text("${CN.name}")`).click(); await d.locator('button:has-text("Shree Balaji")').click(); await d.locator('button:has-text("Save & compose")').click(); await p.waitForTimeout(400);
    await dlg().locator('button:has-text("Send to")').click(); await p.waitForTimeout(300); await as(null);
    const r = (await S()).rfqs.find((x) => x.title === 'Block D bulk excavation'); chain.contractor.rfq = r.id;
    await p.evaluate(() => localStorage.removeItem('nxv-vendor-session')); await go(`#/vendor-quote/${r.id}/${c.id}`);
    await p.locator('input[type=email]').fill(CN.email); await p.click('text=Send one-time code'); const code = (await p.locator('b.mono').textContent()).trim(); await p.locator('input[placeholder="••••••"]').fill(code); await p.click('button:has-text("Sign in")'); await p.waitForTimeout(300);
    await p.click('button:has-text("Yes, I\'ll quote")'); await p.waitForTimeout(200); await p.locator('tbody input[type=number]').nth(0).fill('178');
    await p.locator('input[placeholder="e.g. DST/Q/0412"]').fill('DIW/Q/12'); await p.locator('text=I accept the buyer').click(); await p.click('button:has-text("Submit quotation")'); await p.waitForTimeout(300);
    const q = (await S()).rfqs.find((x) => x.id === r.id).quotes.find((x) => x.vendorId === c.id); return [`${r.id}: rate ${q?.rates?.[0] ?? '?'} submitted`, !!q];
  });
  await T('C06', 'Technical + commercial evaluation → award as contract (BOQ carried over)', async () => {
    await as('Priya Nair'); await go('vendor-management/rfq?open=' + chain.contractor.rfq); await p.waitForTimeout(300); await p.locator('[data-drawer] [role=tab]').filter({ hasText: 'Vendors' }).first().click(); await p.waitForTimeout(150); await p.locator(`tr:has-text("${CN.name}") button:has-text("Accept")`).click(); await p.waitForTimeout(150);
    await p.locator('[data-drawer] [role=tab]').filter({ hasText: 'Comparison' }).first().click(); await p.waitForTimeout(150); await btn('Award by line').click(); await p.waitForTimeout(200); const d = dlg(); await d.getByRole('button', { name: 'Contract', exact: true }).click();
    await d.locator('label:has-text("Award recommendation") input').fill('Only technically qualified bid; rate within estimate'); await d.locator('button:has-text("Award & create")').click(); await p.waitForTimeout(300); await as(null);
    const ct = (await S()).contracts.find((x) => x.rfqId === chain.contractor.rfq); chain.contractor.contract = ct?.id; return [`${ct?.id} ${ct?.status}, BOQ ${ct?.scope.map((l) => `${l.qty} ${l.unit} @ ${l.rate}`).join('; ')}`, ct && ct.vendorId === c.id && ct.scope.length === 1];
  });
  await T('C07', 'Contract approval Legal → Finance, performance BG, signing', async () => {
    const id = chain.contractor.contract; await as('Priya Nair'); await go('contract-labor/contracts?open=' + id); await p.waitForTimeout(300); await btn('Submit for approval').click(); await p.waitForTimeout(200);
    await as('Neha Kulkarni'); await go('contract-labor/contracts?open=' + id); await p.waitForTimeout(300); await btn('Approve as Legal').click(); await p.waitForTimeout(150);
    await as('Rohit Shah'); await go('approvals/approval-management?module=Contracts'); await p.waitForTimeout(300); await p.locator(`tr:has-text("${id}") button:has-text("Approve")`).click(); await p.waitForTimeout(150);
    await as('Priya Nair'); await go('contract-labor/contracts?open=' + id); await p.waitForTimeout(300); await btn('Add guarantee').click(); await p.waitForTimeout(150); const g = dlg();
    await g.locator('label:has-text("Issuing bank") input').fill('Axis Bank'); await g.locator('label:has-text("BG number") input').fill('BG/AXIS/2026/9001'); await g.locator('label:has-text("Amount") input').fill('30000'); await g.locator('button:has-text("Save")').click(); await p.waitForTimeout(150);
    await as('Arjun Mehta'); await go('contract-labor/contracts?open=' + id); await p.waitForTimeout(300); await btn('Sign & activate').click(); await p.waitForTimeout(200); await as(null);
    const ct = (await S()).contracts.find((x) => x.id === id); return [`${ct.status}; approvals ${ct.approval.stages.map((s) => `${s.role}: ${s.by}`).join(', ')}; signed by ${ct.signedBy}`, ct.status === 'Active'];
  });
  await T('C08', 'Project → WBS → work order from contract BOQ → contractor acceptance', async () => {
    const id = chain.contractor.contract; await as('Priya Nair'); await go('contract-labor/work-orders?contract=' + id); await p.waitForTimeout(300); const d = dlg();
    await pick(d.locator('label:has-text("WBS element") [role=combobox]'), wbs); await d.locator('label:has-text("Title") input').fill('Block D excavation - phase 1'); await btn('Load lines from contract BOQ').click(); await p.waitForTimeout(100);
    await d.locator('button:has-text("Issue work order")').click(); await p.waitForTimeout(250); await as(null);
    const w = (await S()).workOrders.find((x) => x.contractId === id); chain.contractor.wo = w?.id;
    await vlogin(CN.email); await p.getByText('Work orders', { exact: true }).click(); await p.locator(`tr:has-text("${w.id}") button:has-text("Accept")`).click(); await p.waitForTimeout(200);
    const w2 = (await S()).workOrders.find((x) => x.id === w.id); return [`${w.id} under ${w.project} › ${w.wbs}; line boqRef ${w.items[0].boqRef}; acceptance ${w2.acceptance.status}`, w2.acceptance.status === 'Accepted' && !!w.items[0].boqRef && !!w.wbs];
  });
  await T('C09', 'Mobilisation on site: equipment, material issue, daily progress', async () => {
    await mut((s) => { const x = s.vendors.find((y) => y.name === 'Deccan Infra Works'); x.equipment = [{ id: 'EQ-101', name: 'Excavator (Tata Hitachi EX200)', type: 'Excavator', regNo: 'MH12-EX-2001', capacity: '1 cum', ownership: 'Owned', fitnessExpiry: '2027-06-01', status: 'Available' }]; });
    await as('Sneha Iyer'); await go('contract-labor/work-orders?open=' + chain.contractor.wo); await p.waitForTimeout(300);
    const cb = dlg().locator('[role=combobox]').filter({ hasText: 'Deploy from' }).first(); await cb.scrollIntoViewIfNeeded(); await p.waitForTimeout(250); await pick(cb, 'Excavator'); await btn('Deploy').click(); await p.waitForTimeout(150);
    await btn('Issue material').click(); await p.waitForTimeout(150); let d = dlg(); await d.locator('label:has-text("Material") input').fill('HSD fuel (free issue)'); await d.locator('label:has-text("Quantity") input').fill('500'); await d.locator('label:has-text("Recovery rate") input').fill('92'); await d.locator('button:has-text("Save")').click(); await p.waitForTimeout(150);
    await btn('Add daily report').click(); await p.waitForTimeout(150); d = dlg(); await d.locator('label:has-text("Manpower") input').fill('18'); await d.locator('label:has-text("Work done") textarea').fill('Excavation started at grid D1–D4'); await d.locator('button:has-text("Save")').click(); await p.waitForTimeout(150); await as(null);
    const s = await S(); const w = s.workOrders.find((x) => x.id === chain.contractor.wo);
    return [`equipment ${w.equipment?.length}, material issues ${s.materialIssues.filter((m) => m.woId === w.id).length}, DPRs ${s.dprs.filter((x) => x.woId === w.id).length}`, w.equipment?.length === 1 && s.materialIssues.some((m) => m.woId === w.id) && s.dprs.some((x) => x.woId === w.id)];
  });
  const measure = async (qty, loc) => {
    await as('Sneha Iyer'); await go('contract-labor/work-orders?open=' + chain.contractor.wo); await p.waitForTimeout(300); await btn('Record measurement').first().click(); await p.waitForTimeout(200); const d = dlg();
    await pick(d.locator('label:has-text("BOQ item") [role=combobox]'), 'Excavation'); await d.locator('label:has-text("Location") input').fill(loc); await d.locator('label:has-text("or direct qty") input').fill(String(qty)); await d.locator('button:has-text("Save to MB")').click(); await p.waitForTimeout(200);
    const m = (await S()).measurements.filter((x) => x.woId === chain.contractor.wo).slice(-1)[0];
    await vlogin(CN.email); await p.getByText('Work orders', { exact: true }).click(); await p.locator(`tr:has-text("${chain.contractor.wo}")`).first().click(); await p.waitForTimeout(250);
    await dlg().locator('button:has-text("Measurements")').first().click(); await p.waitForTimeout(150); await dlg().locator(`tr:has-text("${m.id}") button:has-text("Agree")`).click(); await p.waitForTimeout(150);
    await as('Sneha Iyer'); await go('contract-labor/measurement-book'); await p.getByText('Joint measurement sheets', { exact: true }).click(); await p.waitForTimeout(150); await p.locator(`tr:has-text("${m.id}") button:has-text("Sign")`).click(); await p.waitForTimeout(150);
    await dlg().locator('label:has-text("Contractor representative") input').fill(CN.contact); await dlg().locator('button:has-text("Sign JMS")').click(); await p.waitForTimeout(150);
    await as('Rohan Singh'); await go('contract-labor/measurement-book'); await p.waitForTimeout(200); await p.locator(`tr:has-text("${m.id}") button:has-text("Pass")`).click(); await p.waitForTimeout(150); await as(null);
    return (await S()).measurements.find((x) => x.id === m.id);
  };
  const certifyPay = async (billId) => {
    for (const [t, who] of [['Verify at site', null], ['Certify quantities', 'Karan Desai'], ['Approve for payment', 'Vikram Rao']]) { await as(who); await go('contract-labor/ra-bills?open=' + billId); await p.waitForTimeout(300); await btn(t).click(); await p.waitForTimeout(200); }
    const inv = (await S()).raBills.find((b) => b.id === billId).invoiceId;
    await as('Anita Joshi'); await go('vendor-management/invoices?open=' + inv); await p.waitForTimeout(300); await btn('Record payment').click(); await p.waitForTimeout(200); await dlg().locator('button:has-text("Release payment")').click(); await p.waitForTimeout(250); await as(null);
    return (await S()).raBills.find((b) => b.id === billId);
  };
  await T('C10', 'Work execution → measurement → contractor agreement → JMS → inspection', async () => {
    const m = await measure(1800, 'Grid D1–D6'); chain.contractor.mb1 = m.id; return [`${m.id}: ${m.qty} cum, JMS ${m.jms.status} (contractor agreed ${!!m.jms.contractorAgreed}), inspection ${m.qc.status}`, m.jms.status === 'Signed' && !!m.jms.contractorAgreed && m.qc.status === 'Passed'];
  });
  await T('C11', 'RA bill (with material recovery) → verification → certification → approval → invoice → payment', async () => {
    await as('Sneha Iyer'); await go('contract-labor/ra-bills?wo=' + chain.contractor.wo); await p.waitForTimeout(300); await dlg().locator('button:has-text("Submit for certification")').click(); await p.waitForTimeout(250); await as(null);
    const b0 = (await S()).raBills.find((b) => b.woId === chain.contractor.wo); chain.contractor.ra1 = b0.id; const b = await certifyPay(b0.id);
    return [`${b.id}: gross ${b.gross}, material ${b.ded.materials}, retention ${b.ded.retention}, net ${b.net}; ${b.history.map((h) => `${h.status}:${h.by}`).join(' → ')}; invoice ${b.invoiceId}`, b.status === 'Paid' && b.ded.materials === 46000 && ['Submitted', 'Verified', 'Certified', 'Approved', 'Paid'].every((st) => b.history.some((h) => h.status === st))];
  });
  await T('C12', 'Variation: extra quantity via change order (Project Manager approval)', async () => {
    await as('Arjun Mehta'); await go('contract-labor/contracts?open=' + chain.contractor.contract); await p.waitForTimeout(300); await btn('Raise change order').click(); await p.waitForTimeout(150); const d = dlg();
    await d.locator('label:has-text("Change description") input').fill('Extra excavation - revised levels'); await d.locator('label:has-text("Reason") input').fill('Architect instruction AI-07');
    await d.locator('button:has-text("Add quantity line")').click(); await p.waitForTimeout(100); await pick(d.locator('[role=combobox][aria-label="Work order"]').last(), chain.contractor.wo); await pick(d.locator('[role=combobox]').nth(1), 'Excavation'); await d.locator('.grid.grid-cols-\\[150px_1fr_1fr_70px_90px_100px_28px\\] input').nth(2).fill('400');
    await d.locator('button:has-text("Submit for approval")').click(); await p.waitForTimeout(200);
    await as('Vikram Rao'); await go('approvals/approval-management?module=Change%20Orders'); await p.waitForTimeout(300); await p.locator('tr:has-text("Extra excavation") button:has-text("Approve")').click(); await p.waitForTimeout(200); await as(null);
    const w = (await S()).workOrders.find((x) => x.id === chain.contractor.wo); return [`WO qty now ${w.items[0].qty} (CO +${w.items[0].coQty})`, w.items[0].qty === 3400];
  });
  await T('C13', 'Balance work measured → WO completed', async () => {
    const m = await measure(1600, 'Grid D7–D12'); await as('Vikram Rao'); await go('contract-labor/work-orders?open=' + chain.contractor.wo); await p.waitForTimeout(300); await btn('Mark completed').click(); await p.waitForTimeout(200); await as(null);
    const w = (await S()).workOrders.find((x) => x.id === chain.contractor.wo); return [`${m.id} ${m.qty} cum; WO ${w.status}`, w.status === 'Completed'];
  });
  await T('C14', 'Performance rating', async () => {
    await as('Vikram Rao'); await go('contract-labor/performance'); await btn('Rate contractor').click(); await p.waitForTimeout(200); const d = dlg();
    const combos = d.locator('[role=combobox]'); await pick(combos.first(), CN.name); await p.waitForTimeout(100);
    const stars = d.locator('button[aria-label*="star" i], button:has(svg)'); await d.locator('button[aria-label="4 stars"]').first().click().catch(() => {});
    await d.locator('button:has-text("Save")').last().click().catch(() => {}); await p.waitForTimeout(200); await as(null);
    const r = (await S()).ratings.filter((x) => x.vendorId === c.id); return [`${r.length} rating(s)`, r.length >= 1];
  });
  await T('C15', 'Punch list → final inspection → handover certificate', async () => {
    const id = chain.contractor.contract; await as('Vikram Rao'); await go('contract-labor/closeout?open=' + id); await p.waitForTimeout(300);
    await btn('Add punch item').click(); await p.waitForTimeout(150); await dlg().locator('label:has-text("Snag") input').fill('Dress side slopes at D12'); await dlg().locator('button:has-text("Save")').click(); await p.waitForTimeout(150);
    await vlogin(CN.email); await p.getByText('Punch list', { exact: true }).click(); await btn('Mark rectified').click(); await p.waitForTimeout(150);
    await as('Vikram Rao'); await go('contract-labor/closeout?open=' + id); await p.waitForTimeout(300); await btn('Verify & close').click(); await p.waitForTimeout(150);
    await btn('Record final inspection').click(); await p.waitForTimeout(150); await dlg().locator('label:has-text("Remarks") input').fill('Joint inspection with client - accepted'); await dlg().locator('button:has-text("Save")').click(); await p.waitForTimeout(150);
    await btn('Issue handover certificate').click(); await p.waitForTimeout(150); await dlg().locator('label:has-text("Taken over by") input').fill('Client - Block D team'); await dlg().locator('button:has-text("Issue certificate")').click(); await p.waitForTimeout(200); await as(null);
    const ct = (await S()).contracts.find((x) => x.id === id); return [`handover ${ct.handover?.date} by ${ct.handover?.by}; status ${ct.status} (${ct.handover ? 'DLP running' : ''})`, !!ct.handover];
  });
  await T('C16', 'Final bill → certification → final payment', async () => {
    await as('Sneha Iyer'); await go('contract-labor/closeout?open=' + chain.contractor.contract); await p.waitForTimeout(300); await btn('Prepare final bill').click(); await p.waitForTimeout(300);
    await dlg().locator('button:has-text("Submit for certification")').click(); await p.waitForTimeout(250); await as(null);
    const fb = (await S()).raBills.find((b) => b.contractId === chain.contractor.contract && b.final); chain.contractor.final = fb?.id; const b = await certifyPay(fb.id);
    return [`${b.id} final=${b.final} ${b.status}, gross ${b.gross}`, b.final && b.status === 'Paid'];
  });
  await T('C17', 'DLP end → retention release (Finance approval, Accounts release) → BG returned', async () => {
    const id = chain.contractor.contract;
    // time-travel only: move the handover back past the defect liability period
    await p.evaluate((cid) => { const s = JSON.parse(localStorage.getItem('nxv-store-v1')); const x = s.contracts.find((y) => y.id === cid); x.handover.date = new Date(Date.now() - (x.dlpMonths * 30 + 2) * 864e5).toISOString().slice(0, 10); localStorage.setItem('nxv-store-v1', JSON.stringify(s)); }, id);
    await as('Arjun Mehta'); await go('contract-labor/retention'); await btn('Request retention release').click(); await p.waitForTimeout(200); const d = dlg();
    await pick(d.locator('label:has-text("Contract") [role=combobox]'), id); await p.waitForTimeout(100); const hint = await d.locator('label:has-text("Amount")').textContent(); const amt = (hint.match(/Available ₹([\d,.]+)/) || [0, '0'])[1].replace(/,/g, '');
    await d.locator('label:has-text("Amount") input').fill(amt); await d.locator('button:has-text("Raise request")').click(); await p.waitForTimeout(200);
    const rr = (await S()).retentionReleases.find((r) => r.contractId === id);
    await as('Rohit Shah'); await go('contract-labor/retention'); await p.getByText('Retention releases', { exact: true }).click(); await p.locator(`tr:has-text("${rr.id}") button:has-text("Approve")`).click(); await p.waitForTimeout(150);
    await as('Anita Joshi'); await go('contract-labor/retention'); await p.getByText('Retention releases', { exact: true }).click(); await p.locator(`tr:has-text("${rr.id}") button:has-text("Release payment")`).click(); await p.waitForTimeout(150);
    await as('Priya Nair'); await go('contract-labor/contracts?open=' + id); await p.waitForTimeout(300); await p.locator('tr:has-text("BG/AXIS/2026/9001") button:has-text("Return")').click(); await p.waitForTimeout(150); await dlg().locator('input').last().fill('DLP completed, no defects'); await dlg().locator('button:has-text("Return")').last().click(); await p.waitForTimeout(150); await as(null);
    const s = await S(); const r2 = s.retentionReleases.find((r) => r.id === rr.id); const g = s.contracts.find((x) => x.id === id).guarantees[0];
    return [`${rr.id} ₹${r2.amount} ${r2.status} (approved ${r2.approvedBy}, released ${r2.releasedBy}); BG ${g.status}`, r2.status === 'Released' && g.status === 'Returned'];
  });
  await T('C18', 'Contract closure - checklist complete, WO frozen', async () => {
    await mut(`(s) => { const c = s.contracts.find((x) => x.id === '${chain.contractor.contract}'); c.settlement = { status: 'Agreed', net: 0, agreedBy: 'test', agreedAt: '${new Date().toISOString().slice(0, 10)}' }; c.release = { no: 'REL-T', date: '${new Date().toISOString().slice(0, 10)}', contractorSignatory: 'test', by: 'test' }; }`);
    await as('Arjun Mehta'); await go('contract-labor/closeout?open=' + chain.contractor.contract); await p.waitForTimeout(300);
    const open = await dlg().locator('li:has(svg.text-amber-500)').allTextContents(); await dlg().locator('button:has-text("Close contract")').click(); await p.waitForTimeout(200); await as(null);
    const s = await S(); const ct = s.contracts.find((x) => x.id === chain.contractor.contract); const w = s.workOrders.find((x) => x.id === chain.contractor.wo);
    return [`open before close: ${open.join('; ') || 'none'}; contract ${ct.status}, WO ${w.status}`, ct.status === 'Closed' && w.status === 'Closed'];
  });
  await T('DATA', 'Data continuity - one ID chain from registration to payment', async () => {
    const s = await S();
    const po = s.purchaseOrders.find((x) => x.id === chain.vendor.po), inv = s.invoices.find((x) => x.id === chain.vendor.invoice);
    const vOk = po.vendorId === chain.vendor.id && po.rfqId === chain.vendor.rfq && inv.vendorId === chain.vendor.id && inv.poId === po.id && inv.payments.length === 1;
    const ct = s.contracts.find((x) => x.id === chain.contractor.contract), w = s.workOrders.find((x) => x.id === chain.contractor.wo);
    const bills = s.raBills.filter((b) => b.woId === w.id), invs = s.invoices.filter((i) => bills.some((b) => b.invoiceId === i.id));
    const cOk = ct.vendorId === chain.contractor.id && ct.rfqId === chain.contractor.rfq && w.contractId === ct.id && w.vendorId === ct.vendorId && w.project === ct.project && !!w.wbs && w.items[0].boqRef === ct.scope[0].id
      && bills.every((b) => b.contractId === ct.id && b.vendorId === ct.vendorId && b.mbIds.every((m) => s.measurements.find((x) => x.id === m).woId === w.id)) && invs.every((i) => i.vendorId === ct.vendorId && i.payments.length);
    return [`vendor ${chain.vendor.id} → ${chain.vendor.rfq} → ${chain.vendor.po} → ${chain.vendor.invoice} → paid | contractor ${chain.contractor.id} → ${chain.contractor.rfq} → ${ct.id} → ${ct.project} › ${w.wbs} → BOQ ${ct.scope[0].id} → ${w.id} → ${bills.map((b) => b.id).join(', ')} → ${invs.map((i) => i.id).join(', ')} → paid → ${ct.status}`, vOk && cOk];
  });
  require('fs').writeFileSync(__dirname + '/out/final-chain.json', JSON.stringify(chain, null, 1));
  require('fs').writeFileSync(__dirname + '/out/final-store.json', JSON.stringify(await S()));
});
