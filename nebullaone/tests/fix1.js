// Batch 1 — vendor gates, roles, SoD
require('./lib')('fix1', async ({ p, go, dlg, S, mut, as, T, pick, toastText }) => {
  const reg = async (name, gst, pan, submit) => {
    await go('vendor-management/registry'); await p.click('text=Register vendor'); const d = dlg();
    await d.locator('button:has-text("Fill all details now")').click().catch(() => {}); await p.waitForTimeout(150);
    await d.locator('input').nth(0).fill(name);
    await d.locator('[role=combobox][aria-haspopup=listbox]:has-text("Select trades")').first().click(); await p.locator('[role=option]:has-text("Hardware")').first().click(); await p.keyboard.press('Escape');
    await d.locator('input[placeholder="27AAKCS4412M1Z3"]').fill(gst); await d.locator('input[placeholder="AAKCS4412M"]').fill(pan);
    await d.locator('label:has-text("Contact person") input').fill('Aud'); await d.locator('input[type=email]').fill('aud@' + pan.toLowerCase() + '.in');
    await d.locator(`button:has-text("${submit ? 'Submit for approval' : 'Save draft'}")`).click(); await p.waitForTimeout(300);
    return (await S()).vendors.find((x) => x.name === name);
  };
  await T('G-27', 'Submit registration with no documents', async () => {
    const v = await reg('Gate Hardware Co', '27GATEH1234A1Z5', 'GATEH1234A', true);
    const txt = await dlg().textContent().catch(() => ''); await p.keyboard.press('Escape');
    return [`${v ? 'created ' + v.status : 'not created'}; form says "${/Upload before submitting/.test(txt) ? 'Upload before submitting…' : txt.slice(0, 60)}"`, !v && /Upload before submitting/.test(txt)];
  });
  await T('G-27b', 'Save as draft still allowed without documents; submit from drawer blocked', async () => {
    const v = await reg('Gate Hardware Co', '27GATEH1234A1Z5', 'GATEH1234A', false);
    await go('vendor-management/registry?open=' + v.id); await p.waitForTimeout(300);
    await dlg().locator('[role=tab]:has-text("Approval")').click().catch(() => {}); await p.waitForTimeout(150);
    await dlg().locator('button:has-text("Submit for approval")').click(); await p.waitForTimeout(200);
    const v2 = (await S()).vendors.find((x) => x.id === v.id); const t = await toastText();
    return [`draft ${v.id}; after submit click status ${v2.status}; toast "${t.slice(0, 70)}"`, v2.status === 'Draft' && /required documents/.test(t)];
  });
  await T('G-13a', 'Roles removed: no "Acting as" switcher; the pending stage can be decided by the signed-in user', async () => {
    await go('vendor-management/approvals?open=VEN-007'); await p.waitForTimeout(300);
    const body = await p.textContent('body'); await p.locator('button:has-text("Approve as Legal")').click(); await p.waitForTimeout(200);
    const v = (await S()).vendors.find((x) => x.id === 'VEN-007');
    return [`switcher shown: ${/Acting as/.test(body)}; Legal ${v.approval.stages[1].status} by ${v.approval.stages[1].by}`, !/Acting as/.test(body) && v.approval.stages[1].status === 'Approved'];
  });
  await T('G-13b', 'Stages still run in order: Finance opens only after Legal', async () => {
    const v = (await S()).vendors.find((x) => x.id === 'VEN-007');
    return [v.approval.stages.map((x) => `${x.dept} ${x.status}`).join(' → '), v.approval.stages[1].status === 'Approved' && v.approval.stages[2].status === 'Pending'];
  });
  await T('G-01', 'Final approval blocked by open checklist (no WC insurance)', async () => {
    await as('Rohit Shah'); await go('vendor-management/approvals?open=VEN-007'); await p.waitForTimeout(250);
    const btn = p.locator('button:has-text("Approve as Finance")'); const dis = await btn.isDisabled(); const t = await dlg().textContent();
    return [`Approve disabled=${dis}; checklist: ${(t.match(/Open before final approval:[^.]*/) || [''])[0].slice(0, 90)}`, dis && /Workmen Compensation/.test(t)];
  });
  await T('G-01b', 'Finance Controller approves with override + reason (logged)', async () => {
    await dlg().locator('textarea:not([aria-label="Write a comment"])').fill('WC policy renewal in progress — cover note seen'); await p.locator('button:has-text("Approve with override")').click(); await p.waitForTimeout(250);
    const v = (await S()).vendors.find((x) => x.id === 'VEN-007');
    return [`status ${v.status}; override recorded: ${JSON.stringify(v.approval.stages[2].override || null).slice(0, 80)}`, v.status === 'Active' && (v.approval.stages[2].override || []).length > 0];
  });
  await T('G-02', 'Registration tier cannot be switched directly; request → Finance approval', async () => {
    await go('vendor-management/registry?open=VEN-007'); await p.waitForTimeout(300);
    await dlg().locator('[role=tab]:has-text("Status & flags")').click(); await p.waitForTimeout(150);
    const combo = await dlg().locator('label:has-text("Registration tier") [role=combobox]').count();
    await dlg().locator('[role=tab]:has-text("Approval")').click(); await p.waitForTimeout(150);
    await dlg().locator('button:has-text("Request spend authorization")').click(); await p.waitForTimeout(200);
    let v = (await S()).vendors.find((x) => x.id === 'VEN-007'); const r1 = v.tierRequest?.status, t1 = v.regTier;
    await go('approvals/approval-management?module=Spend%20Authorization'); await p.waitForTimeout(300);
    await p.locator('tr:has-text("Greenline") button:has-text("Approve")').click(); await p.waitForTimeout(200);
    v = (await S()).vendors.find((x) => x.id === 'VEN-007');
    return [`tier dropdown present=${combo > 0}; request ${r1} (tier still ${t1}); after approval: ${v.regTier}`, combo === 0 && r1 === 'Pending' && t1 === 'Prospective' && v.regTier === 'Spend Authorized'];
  });
  await T('G-28', 'Hold past its release date ends automatically', async () => {
    await mut((s) => { const v = s.vendors.find((x) => x.id === 'VEN-006'); v.hold.until = new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10); });
    await go('vendor-management/registry'); const v = (await S()).vendors.find((x) => x.id === 'VEN-006');
    return [`VEN-006 status ${v.status}; audit: ${(await S()).audit[0].action}`, v.status === 'Active' && !v.hold];
  });
  await T('G-19', 'Duplicate vendor bill number blocked', async () => {
    await as(null); const s = await S(); const inv = s.invoices.find((i) => i.source === 'Purchase Order');
    await go('vendor-management/invoices'); await p.locator('button:has-text("Enter vendor bill"), button:has-text("New bill"), button:has-text("Enter bill")').first().click(); await p.waitForTimeout(200);
    const d = dlg(); await pick(d.locator('label:has-text("Purchase order") [role=combobox]'), inv.poId); await d.locator('label:has-text("Vendor invoice no.") input').fill(inv.number); await p.waitForTimeout(100);
    const t = await d.textContent(); const dis = await d.locator('button:has-text("Save bill")').isDisabled(); await p.keyboard.press('Escape');
    return [`bill no. ${inv.number} again → save disabled=${dis}; message ${/already recorded/.test(t)}`, dis && /already recorded/.test(t)];
  });
  await T('G-14', 'Non-compliant vendor stopped at PO', async () => {
    await mut((s) => { const v = s.vendors.find((x) => x.id === 'VEN-012'); v.docs.find((d) => d.name === 'GST Certificate').status = 'Rejected'; });
    await go('vendor-management/purchase-orders'); await p.click('button:has-text("New PO")'); await p.waitForTimeout(200); const d = dlg();
    await pick(d.locator('label:has-text("Vendor") [role=combobox]').first(), 'Pioneer Cement'); await p.waitForTimeout(100); const t = await d.textContent(); await p.keyboard.press('Escape');
    return [/New POs are stopped/.test(t) ? 'Stop note shown for Pioneer (GST certificate rejected)' : 'no stop: ' + t.slice(0, 80), /New POs are stopped/.test(t)];
  });
  await T('G-05', 'On-hold (All) contractor: portal read-only', async () => {
    await mut((s) => { const v = s.vendors.find((x) => x.id === 'VEN-010'); v.status = 'On Hold'; v.hold = { scope: 'All', until: null, reason: 'Safety stand-down' }; });
    await go('vendor-management/portal'); await pick(p.locator('label:has-text("Viewing as") [role=combobox]'), 'Sai Earthmovers'); await p.waitForTimeout(200);
    const t = await p.textContent('body'); await p.getByText('Work orders', { exact: true }).click(); await p.waitForTimeout(150);
    const claimBtns = await p.locator('button:has-text("Submit RA claim")').count();
    await mut((s) => { const v = s.vendors.find((x) => x.id === 'VEN-010'); v.status = 'Active'; v.hold = null; });
    return [`banner ${/new quotations, work-order acceptance, claims and attendance are paused/.test(t)}; claim buttons ${claimBtns}`, /are paused/.test(t) && claimBtns === 0];
  });
  await T('G-26', 'Inactive vendor loses an open portal session', async () => {
    await p.evaluate(() => localStorage.setItem('nxv-vendor-session', JSON.stringify({ vendorId: 'VEN-011', email: 'sales@konkansteel.in', at: Date.now() })));
    await mut((s) => { const v = s.vendors.find((x) => x.id === 'VEN-011'); v.status = 'Inactive'; if (v.portalUsers[0]) v.portalUsers[0].email = 'sales@konkansteel.in'; });
    await go('#/supplier'); const t = await p.textContent('body');
    await mut((s) => { s.vendors.find((x) => x.id === 'VEN-011').status = 'Active'; });
    return [/Portal access suspended/.test(t) ? 'Access suspended page shown' : 'portal still open', /Portal access suspended/.test(t)];
  });
  await T('G-13c', 'Payment dialog has no role check (roles removed) but keeps the payment gates', async () => {
    await go('vendor-management/invoices'); await p.waitForTimeout(200);
    const s0 = await S(); const inv = s0.invoices.find((i) => i.payments.length === 0);
    await go('vendor-management/invoices?open=' + inv.id); await p.waitForTimeout(300);
    const b = dlg().locator('button:has-text("Record payment"), button:has-text("Release payment"), button:has-text("Pay")').first(); await b.click(); await p.waitForTimeout(200);
    const t = await dlg().textContent(); await p.keyboard.press('Escape');
    return [`role note: ${/role/i.test(t) && /needs the/.test(t)}; dialog: ${t.slice(0, 80)}`, !/needs the Accounts or Finance Controller role/.test(t) && /payment/i.test(t)];
  });
});
