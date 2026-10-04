// G3 - bank-account change control on an approved vendor:
// request → verify → Finance approval → cooling period (old account still paid) → new account becomes default
require('./lib')('bank', async ({ fill, p, go, dlg, S, mut, T }) => {
  const VID = 'VEN-003'; const ACC = '918020055501234';
  const bankTab = async () => { await go(`vendor-management/registry?open=${VID}&tab=bank`); await p.waitForTimeout(300); };
  const acc = async () => (await S()).vendors.find((x) => x.id === VID).bankAccounts;
  const old0 = (await S()).vendors.find((x) => x.id === VID).bankAccounts.find((b) => b.isDefault);
  await T('BK-01', 'Approved vendor: no free editing - "Request bank change" adds an Unverified account; no Make default / Settings / Remove', async () => {
    await bankTab(); const v = (await S()).vendors.find((x) => x.id === VID); const d = dlg();
    await d.locator('button:has-text("Request bank change")').click(); await p.waitForTimeout(100);
    await d.locator('label:has-text("Account holder name") input').fill(v.legalName); await d.locator('label:has(> span:text-is("Bank")) input').first().fill('Axis Bank');
    await d.locator('label:has-text("Account no.") input').first().fill(ACC); await d.locator('label:has-text("Re-enter account no.") input').fill(ACC); await d.locator('label:has-text("IFSC") input').fill('UTIB0000123');
    await d.locator('button:has-text("Add")').last().click(); await p.waitForTimeout(200);
    const a = (await acc()).find((b) => b.account === ACC);
    const extra = await d.locator('button:has-text("Make default"), button:has-text("Settings"), button:has-text("Remove")').count();
    return [`status ${a?.status}; change ${a?.change?.status}; edit buttons ${extra}`, a?.status === 'Unverified' && a?.change?.status === 'Requested' && extra === 0];
  });
  await T('BK-02', 'Finance approval appears only after verification', async () => {
    const d = dlg(); const before = await d.locator('button:has-text("Approve change")').count();
    await d.locator('tr:has-text("1234") button:has-text("Verify")').click(); await p.waitForTimeout(200);
    const after = await d.locator('tr:has-text("1234") button:has-text("Approve change")').count();
    return [`approve button before verify ${before}, after ${after}`, before === 0 && after === 1];
  });
  await T('BK-03', 'After Finance approval the OLD account stays default and keeps getting paid; new one waits for the cooling period', async () => {
    const d = dlg(); await d.locator('tr:has-text("1234") button:has-text("Approve change")').click(); await p.waitForTimeout(250);
    const a = (await acc()).find((b) => b.account === ACC), o = (await acc()).find((b) => b.id === old0.id);
    const t = await d.innerText();
    const s = await S(); const inv = s.invoices.find((i) => i.vendorId === VID && i.payments.length === 0);
    await go('vendor-management/invoices?open=' + inv.id); await p.waitForTimeout(300); const it = await dlg().textContent();
    return [`new ${a.change.status} switch ${a.change.switchOn}; old default ${o.isDefault}; badge ${/Becomes default/.test(t)}; bill payable (no bank stop) ${!/bank account/i.test((it.match(/Can't pay[^]*?$/) || [''])[0]) && !/not yet verified|cooling/.test(it)}`, a.change.status === 'Approved' && !a.isDefault && o.isDefault && /Becomes default/.test(t)];
  });
  await T('BK-04', 'Vendor told + every step in the bank change history', async () => {
    await bankTab(); const t = await dlg().innerText();
    const steps = ['Bank change requested', 'verified (penny drop)', 'approved by Finance', 'change confirmation sent to'].filter((k) => t.includes(k));
    return [steps.join(' | '), steps.length === 4];
  });
  await T('BK-05', 'Exception Center: change waiting / in cooling period', async () => {
    await go('administration/exceptions'); const n = await p.locator('main table tbody tr').filter({ hasText: 'Bank change in cooling period' }).count();
    return [`cooling rows ${n}`, n >= 1];
  });
  await T('BK-06', 'On the switch date the new account becomes default; old is kept as Replaced', async () => {
    await mut(`(s) => { const a = s.vendors.find((x) => x.id === '${VID}').bankAccounts.find((b) => b.account === '${ACC}'); a.change.switchOn = '2020-01-01'; }`);
    await bankTab(); const list = await acc(); const a = list.find((b) => b.account === ACC), o = list.find((b) => b.id === old0.id);
    const t = await dlg().innerText();
    return [`new default ${a.isDefault} (${a.change.status}); old default ${o.isDefault}, replacedOn ${o.replacedOn}; shown ${/Replaced/.test(t)}`, a.isDefault && !o.isDefault && !!o.replacedOn && /Replaced/.test(t) && /Bank change completed/.test(t)];
  });
  await T('BK-07', 'An unverified default account stops payment', async () => {
    await mut(`(s) => { const a = s.vendors.find((x) => x.id === '${VID}').bankAccounts.find((b) => b.isDefault); a.status = 'Unverified'; }`);
    const s = await S(); const inv = s.invoices.find((i) => i.vendorId === VID && i.payments.length === 0);
    await go('vendor-management/invoices?open=' + inv.id); await p.waitForTimeout(300); const t = await dlg().textContent();
    return [(t.match(/Default bank account not yet verified[^·.]*/) || ['no stop'])[0], /verify it before paying/.test(t)];
  });
});
