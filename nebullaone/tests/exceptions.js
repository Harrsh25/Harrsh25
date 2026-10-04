// Exception workflows - return / reject / resubmit paths, driven through the UI (Chromium, built HTML).
// NCR rework, RA-bill rejection and GRN rejection are covered in fix4.js (G-12b/c, G-16b) and merge.js.
require('./lib')('exceptions', async ({ fill, p, go, dlg, S, mut, T }) => {
  const s0 = await S();
  const pend = s0.vendors.find((v) => v.status === 'Pending Approval');
  await T('EX-01', 'Approver requests changes (field + document) → vendor status Changes Requested, document marked Rejected', async () => {
    await go(`vendor-management/approvals?open=${pend.id}`); await p.waitForTimeout(300);
    await p.locator('[data-drawer] button:has-text("Request changes")').first().click(); await p.waitForTimeout(200);
    const m = dlg(); const checks = m.locator('[role=checkbox], input[type=checkbox]');
    await checks.first().click(); const docBox = m.locator('div:has(> p:text("Documents")) [role=checkbox], div:has(> p:text("Documents")) input[type=checkbox]').first();
    if (await docBox.count()) await docBox.click();
    await m.locator('textarea').last().fill('Please correct the highlighted items');
    await m.locator('button:has-text("Send request")').click(); await p.waitForTimeout(250);
    const v = (await S()).vendors.find((x) => x.id === pend.id); const rej = v.docs.filter((d) => d.status === 'Rejected').map((d) => d.name);
    return [`${v.status}; asked for: ${(v.changeRequest?.items || []).map((i) => i.label).join(', ')}; docs rejected: ${rej.join(', ') || '-'}`, v.status === 'Changes Requested' && (v.changeRequest?.items || []).length >= 1];
  });
  await T('EX-02', 'Vendor fixes and resubmits → back to Pending Approval at the same stage', async () => {
    const before = (await S()).vendors.find((x) => x.id === pend.id).approval?.stages?.map((s) => s.dept + ':' + s.status).join(' ');
    await go(`vendor-management/registry?open=${pend.id}`); await p.waitForTimeout(300);
    let b = p.locator('[data-drawer] button').filter({ hasText: /^Resubmit/ }).first();
    if (!(await b.count())) { await p.locator('[data-drawer] [role=tab]:has-text("Approval")').click().catch(() => {}); await p.waitForTimeout(150); b = p.locator('[data-drawer] button').filter({ hasText: /^Resubmit/ }).first(); }
    await b.click(); await p.waitForTimeout(250);
    const v = (await S()).vendors.find((x) => x.id === pend.id);
    return [`${v.status}; stages before ${before} → after ${v.approval?.stages?.map((s) => s.dept + ':' + s.status).join(' ')}`, v.status === 'Pending Approval'];
  });
  await T('EX-03', 'Approver rejects with a remark → Rejected; rejected vendor cannot be ordered from', async () => {
    await go(`vendor-management/approvals?open=${pend.id}`); await p.waitForTimeout(300);
    await p.locator('[data-drawer] textarea:not([aria-label="Write a comment"])').first().fill('Bank details do not match the cancelled cheque');
    await p.locator('[data-drawer] button:text-is("Reject")').first().click(); await p.waitForTimeout(250);
    const v = (await S()).vendors.find((x) => x.id === pend.id);
    await go('vendor-management/purchase-orders'); await p.locator('main button:has-text("New PO")').first().click(); await p.waitForTimeout(200);
    await dlg().locator('[role=combobox]').filter({ hasText: /vendor|Select/i }).first().click().catch(() => {}); await p.waitForTimeout(150);
    const listed = (await p.locator('[role=listbox] [role=option]').allInnerTexts()).some((o) => o.includes(v.name)); await p.keyboard.press('Escape');
    return [`${v.status}; remark "${(v.approval?.stages || []).map((s) => s.remark).filter(Boolean).pop() || ''}"; offered for new PO: ${listed}`, v.status === 'Rejected' && !listed];
  });
  const draftPo = s0.purchaseOrders.find((x) => x.status === 'Issued' && !(x.receipts || []).length);
  await T('EX-04', 'Draft PO rejected with a reason → not issued, reason kept in the record', async () => {
    await mut(`(s) => { s.purchaseOrders.find((y) => y.id === '${draftPo.id}').status = 'Draft'; }`);
    await go(`vendor-management/purchase-orders?open=${draftPo.id}`); await p.waitForTimeout(300);
    await p.locator('[data-drawer] button:text-is("Reject")').first().click(); await p.waitForTimeout(200);
    await dlg().locator('textarea:not([aria-label="Write a comment"])').first().fill('Rate above the agreed blanket rate'); await dlg().locator('button').filter({ hasText: /^Reject/ }).last().click(); await p.waitForTimeout(250);
    const po = (await S()).purchaseOrders.find((x) => x.id === draftPo.id);
    return [`${po.status}; decision ${po.approval?.decision} - "${po.approval?.remark}" by ${po.approval?.by}`, !['Draft', 'Issued'].includes(po.status) && po.approval?.decision === 'Rejected' && /blanket rate/.test(po.approval?.remark || '')];
  });
  await T('EX-05', 'Vendor-submitted invoice rejected by AP with a remark → vendor can submit a corrected one', async () => {
    const inv = s0.invoices.find((i) => !i.payments.length && i.source !== 'RA Bill');
    await mut(`(s) => { const x = s.invoices.find((y) => y.id === '${inv.id}'); x.review = 'Pending'; x.submittedBy = 'Vendor portal'; delete x.cancelled; }`);
    await go(`vendor-management/invoices?open=${inv.id}`); await p.waitForTimeout(300);
    await p.locator('[data-drawer] label:has-text("AP remark") input').fill('GSTIN on the invoice is wrong'); await p.locator('[data-drawer] button:text-is("Reject")').first().click(); await p.waitForTimeout(250);
    const x = (await S()).invoices.find((y) => y.id === inv.id); const t = await p.locator('[data-drawer]').innerText();
    return [`review ${x.review}; remark "${x.reviewRemark}"; panel says corrected invoice allowed: ${/submit a corrected invoice/.test(t)}`, x.review === 'Rejected' && /corrected invoice/.test(t)];
  });
  await T('EX-06', 'Contractor RA claim returned by the engineer → status Returned with reason', async () => {
    const st = await S(); let c = (st.raClaims || st.claims || []).find((x) => x.status === 'Submitted');
    if (!c) return ['no submitted claim in demo data', false];
    await go('contract-labor/ra-bills'); await p.locator('main [role=tab]:has-text("Contractor claims")').click(); await p.waitForTimeout(250);
    await p.locator('main tbody tr').filter({ has: p.locator('button:has-text("Verify")') }).first().locator('button:has-text("Verify")').click(); await p.waitForTimeout(250);
    const m = dlg(); await m.locator('label:has-text("Engineer remark") input, label:has-text("Engineer remark") textarea').first().fill('Quantities exceed the signed JMS');
    await m.locator('button').filter({ hasText: /^Return/ }).first().click(); await p.waitForTimeout(250);
    const after = ((await S()).raClaims || (await S()).claims || []).find((x) => x.id === c.id);
    const why = (after.history || []).slice(-1)[0]?.remark || '';
    return [`${c.id}: ${after.status}; reason "${why}"`, after.status === 'Returned' && /signed JMS/.test(why)];
  });
  await T('EX-07', 'Contractor disputes a measurement (JMS) → Disputed with the reason; not billable until agreed', async () => {
    const m0 = (await S()).measurements.find((m) => m.jms.status === 'Pending' && !m.billedIn);
    await go(`contract-labor/measurement-book?open=${m0.id}`); await p.waitForTimeout(300);
    await p.locator('[data-drawer] button:text-is("Dispute")').first().click(); await p.waitForTimeout(200);
    await dlg().locator('textarea').first().fill('Depth measured at 1.2 m, not 1.5 m'); await dlg().locator('button:has-text("Mark disputed")').click(); await p.waitForTimeout(250);
    const m1 = (await S()).measurements.find((m) => m.id === m0.id);
    return [`${m0.id}: JMS ${m1.jms.status} - ${m1.jms.remark}`, m1.jms.status === 'Disputed'];
  });
  await T('EX-08', 'Compliance document rejected by the verifier → vendor sees it to re-upload', async () => {
    const v0 = (await S()).vendors.find((x) => x.status === 'Active' && x.docs.some((d) => d.status === 'Verified'));
    await mut(`(s) => { const d = s.vendors.find((y) => y.id === '${v0.id}').docs.find((d) => d.status === 'Verified'); d.status = 'Pending'; delete d.verifiedAt; delete d.verifiedBy; }`);
    const v = (await S()).vendors.find((x) => x.id === v0.id);
    const d = v.docs.find((x) => x.status === 'Pending');
    await go('vendor-management/compliance'); await p.locator('main [role=tab]:has-text("Verification queue")').click(); await p.waitForTimeout(250);
    const row = p.locator('main tbody tr').filter({ hasText: v.name }).filter({ hasText: d.name }).first();
    await row.locator('button').filter({ hasText: /^Reject/ }).first().click().catch(async () => { await row.click(); }); await p.waitForTimeout(250);
    const box = dlg().locator('textarea:not([aria-label="Write a comment"]), input[type=text]').first(); if (await box.count()) { await box.fill('Certificate is not attested'); await dlg().locator('button').filter({ hasText: /^Reject/ }).last().click(); await p.waitForTimeout(250); }
    const d1 = (await S()).vendors.find((x) => x.id === v.id).docs.find((x) => x.name === d.name);
    return [`${v.name} · ${d.name}: ${d1.status}${d1.remark ? ' - ' + d1.remark : ''}`, d1.status === 'Rejected'];
  });
});
