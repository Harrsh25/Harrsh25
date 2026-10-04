// G3 — bank-account change control on an approved vendor
require('./lib')('bank', async ({ p, go, dlg, S, mut, T }) => {
  const VID = 'VEN-003'; const ACC = '918020055501234';
  const bankTab = async () => { await go(`vendor-management/registry?open=${VID}`); await p.waitForTimeout(300); await dlg().locator('[role=tab]:has-text("Bank")').click(); await p.waitForTimeout(150); };
  await T('BK-01', 'New account on an approved vendor starts Unverified and cannot be made default until verified', async () => {
    await bankTab(); const v = (await S()).vendors.find((x) => x.id === VID); const d = dlg();
    await d.locator('button:has-text("Request bank change")').click(); await p.waitForTimeout(100);
    await d.locator('label:has-text("Account holder name") input').fill(v.legalName); await d.locator('label:has-text("Bank") input').nth(1).fill('Axis Bank');
    await d.locator('label:has-text("Account no.") input').first().fill(ACC); await d.locator('label:has-text("Re-enter account no.") input').fill(ACC); await d.locator('label:has-text("IFSC") input').fill('UTIB0000123');
    await d.locator('button:has-text("Add")').last().click(); await p.waitForTimeout(200);
    const a = (await S()).vendors.find((x) => x.id === VID).bankAccounts.find((b) => b.account === ACC);
    const md = d.locator('tr:has-text("1234") button:has-text("Make default")');
    return [`status ${a?.status}; Make default disabled: ${await md.isDisabled()}`, a?.status === 'Unverified' && (await md.isDisabled())];
  });
  await T('BK-02', 'Verified + made default → payments held for the cooling period; vendor told; change in history', async () => {
    const d = dlg(); await d.locator('tr:has-text("1234") button:has-text("Verify")').click(); await p.waitForTimeout(200);
    await d.locator('tr:has-text("1234") button:has-text("Make default")').click(); await p.waitForTimeout(250);
    const a = (await S()).vendors.find((x) => x.id === VID).bankAccounts.find((b) => b.account === ACC);
    const t = await d.textContent();
    return [`default ${a.isDefault}; coolingUntil ${a.coolingUntil}; badge ${/Held till/.test(t)}; history has confirmation: ${/change confirmation sent to/.test(t)}`, a.isDefault && !!a.coolingUntil && /Held till/.test(t) && /Bank change history/.test(t) && /change confirmation sent to/.test(t)];
  });
  await T('BK-03', 'Paying the vendor is stopped during the cooling period (no override)', async () => {
    const s = await S(); const inv = s.invoices.find((i) => i.vendorId === VID && i.payments.length === 0);
    await go('vendor-management/invoices?open=' + inv.id); await p.waitForTimeout(300); const t = await dlg().textContent();
    return [(t.match(/Bank account changed on[^·]*cooling period\)/) || ['no stop'])[0], /cooling period/.test(t)];
  });
  await T('BK-04', 'Exception Center shows the held payments', async () => {
    await go('administration/exceptions'); const n = await p.locator('main table tbody tr').filter({ hasText: 'Bank account changed' }).count();
    return [`rows ${n}`, n >= 1];
  });
  await T('BK-05', 'After the cooling period the account can be paid', async () => {
    await mut(`(s) => { const a = s.vendors.find((x) => x.id === '${VID}').bankAccounts.find((b) => b.account === '${ACC}'); a.coolingUntil = '2020-01-01'; }`);
    const s = await S(); const inv = s.invoices.find((i) => i.vendorId === VID && i.payments.length === 0);
    await go('vendor-management/invoices?open=' + inv.id); await p.waitForTimeout(300); const t = await dlg().textContent();
    return [`cooling stop gone: ${!/cooling period/.test(t)}`, !/cooling period/.test(t)];
  });
  await T('BK-06', 'An unverified default account stops payment (was only a warning)', async () => {
    await mut(`(s) => { const a = s.vendors.find((x) => x.id === '${VID}').bankAccounts.find((b) => b.isDefault); a.status = 'Unverified'; }`);
    const s = await S(); const inv = s.invoices.find((i) => i.vendorId === VID && i.payments.length === 0);
    await go('vendor-management/invoices?open=' + inv.id); await p.waitForTimeout(300); const t = await dlg().textContent();
    return [(t.match(/Default bank account not yet verified[^·.]*/) || ['no stop'])[0], /verify it before paying/.test(t)];
  });
});
