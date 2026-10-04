// G10 - Vendor 360: all transactions with one vendor, totals, rows open their records
require('./lib')('v360', async ({ fill, p, go, dlg, S, T }) => {
  await T('V360-01', 'Vendor 360 tab shows totals and every transaction type for a supplier', async () => {
    await go('vendor-management/registry?open=VEN-003&tab=v360'); await p.waitForTimeout(400); const t = await dlg().innerText();
    const s = await S(); const nPo = s.purchaseOrders.filter((x) => x.vendorId === 'VEN-003').length;
    const ok = ['Ordered', 'Billed', 'Paid', 'Balance due', 'RFQs (', `Purchase orders (${nPo})`, 'Bills & payments ('].every((k) => t.includes(k));
    return [`${(t.match(/Purchase orders \(\d+\)/) || [''])[0]} · ${(t.match(/Bills & payments \(\d+\)/) || [''])[0]} · ${(t.match(/win rate[^)]*\)?/) || ['no RFQ line'])[0]}`, ok];
  });
  await T('V360-02', 'For a contractor it also shows contracts, work orders and subcontracts', async () => {
    await go('vendor-management/registry?open=VEN-001&tab=v360'); await p.waitForTimeout(400); const t = await dlg().innerText();
    return [['Contracts (', 'Work orders (', 'Subcontracts ('].filter((k) => t.includes(k)).join(', '), /Contracts \(\d+\)/.test(t) && /Work orders \(\d+\)/.test(t) && /Subcontracts \(\d+\)/.test(t)];
  });
  await T('V360-03', 'A row opens its record', async () => {
    await dlg().locator('tbody tr').filter({ hasText: 'Civil & structural works' }).first().click(); await p.waitForTimeout(400);
    return [p.url().split('#')[1], /contracts\?open=CTR-/.test(p.url())];
  });
});
