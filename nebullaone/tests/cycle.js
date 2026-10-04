// Record panel previous / next arrows run in a cycle
require('./lib')('cycle', async ({ p, go, S, T }) => {
  await T('CY-01', 'On the last row, Next goes to the first; on the first row, Previous goes to the last', async () => {
    await go('vendor-management/requisitions'); await p.waitForTimeout(300);
    const rows = p.locator('main table tbody tr.cursor-pointer'); const n = await rows.count();
    const key = async (i) => rows.nth(i).getAttribute('data-row-key');
    await rows.nth(n - 1).click(); await p.waitForTimeout(300);
    await p.locator('[data-drawer] button[title="Next record"]').click(); await p.waitForTimeout(300);
    const afterNext = await p.locator('[data-drawer] .mono').first().innerText();
    await p.locator('[data-drawer] button[title="Previous record"]').click(); await p.waitForTimeout(300);
    const afterPrev = await p.locator('[data-drawer] .mono').first().innerText();
    const first = await key(0), last = await key(n - 1);
    return [`${n} rows; last → next = ${afterNext} (first ${first}); then previous = ${afterPrev} (last ${last})`, n > 1 && afterNext === first && afterPrev === last];
  });
  await T('CY-02', 'No long dash (—) left anywhere on the page', async () => {
    let bad = 0; for (const r of ['vendor-management/requisitions', 'vendor-management/registry?open=VEN-001', 'contract-labor/contracts?open=CTR-001', 'administration/exceptions']) { await go(r); await p.waitForTimeout(300); if ((await p.locator('body').innerText()).includes('—')) bad++; }
    return [`pages with — : ${bad}`, bad === 0];
  });
});
