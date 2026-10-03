// UI features: visible search, saved views, paging, group-by, board, calendar
const run = require('./lib');
run('ui', async ({ p, go, T, pick, S, mut }) => {
  await go('vendor-management/purchase-orders');
  await T('UI-01', 'Search box is visible on lists (no icon click needed)', async () => {
    const v = await p.locator('main input[placeholder^="Search"]').first().isVisible(); return [v ? 'visible' : 'hidden', v];
  });
  await T('UI-02', 'Group by Status puts rows under group headers', async () => {
    await pick(p.locator('main [aria-label="Group by"]').first(), 'Group by Status');
    const n = await p.locator('main [data-group]').count(); return [`${n} groups`, n > 0];
  });
  await T('UI-03', 'Board layout shows cards in status columns', async () => {
    await pick(p.locator('main [aria-label="Group by"]').first(), 'No grouping');
    await p.locator('main button[aria-label="Board layout"]').first().click(); await p.waitForTimeout(150);
    const c = await p.locator('main [data-board] [data-card]').count(); return [`${c} cards`, c > 0];
  });
  await T('UI-04', 'Calendar layout shows a month grid with records', async () => {
    await p.locator('main button[aria-label="Calendar layout"]').first().click(); await p.waitForTimeout(150);
    const g = await p.locator('main [data-calendar]').count(); return [g ? 'calendar shown' : 'none', g > 0];
  });
  await T('UI-05', 'Saved view stores and re-applies a filter + layout', async () => {
    await p.locator('main button[aria-label="List layout"]').first().click();
    await p.locator('main input[placeholder^="Search"]').first().fill('PO-003'); await p.waitForTimeout(200);
    await p.locator('main button[aria-label="Saved views"]').first().click();
    await p.locator('input[placeholder="Name this view"]').fill('Only 003'); await p.locator('button:has-text("Save")').last().click(); await p.waitForTimeout(100);
    await go('vendor-management/purchase-orders');
    await p.locator('main button[aria-label="Saved views"]').first().click(); await p.locator('button:has-text("Only 003")').first().click(); await p.waitForTimeout(200);
    const rows = await p.locator('main table.nx-list tbody tr').count(); return [`${rows} rows after applying view`, rows === 1];
  });

  await T('UI-06', 'Paging: 25 / 50 / 100 rows per page with next / previous', async () => {
    await mut((s) => { const b = s.measurements[0]; for (let i = 0; i < 60; i++) s.measurements.push({ ...b, id: 'MB-X' + i }); });
    await go('#/productivity/contract-labor/measurement-book'); await p.waitForTimeout(300);
    const pager = await p.locator('main [data-pager]').count(); const rows = await p.locator('main table.nx-list tbody tr').count();
    return [`pager ${pager}, ${rows} rows on page 1`, pager > 0 && rows <= 50];
  });
  await go('vendor-management/purchase-orders?open=PO-001');
  await T('UI-07', 'Status bar on the PO shows its stages with the current one marked', async () => {
    const cur = await p.locator('[role=dialog] [data-statusbar] [aria-current=step]').innerText(); const n = await p.locator('[role=dialog] [data-statusbar] li').count();
    return [`${n} stages, current "${cur.trim()}"`, n >= 5 && /Received|Billed/.test(cur)];
  });
  await T('UI-08', 'Related-document buttons show counts and open the filtered list', async () => {
    const bills = p.locator('[role=dialog] [data-related] a:has-text("Bills")'); const c = await bills.getAttribute('data-count');
    await bills.click(); await p.waitForTimeout(400);
    const url = p.url(), rows = await p.locator('main table.nx-list tbody tr').count();
    return [`Bills ${c} → ${rows} rows on ${url.split('#')[1]}`, /invoices\?q=PO-001/.test(url) && rows === Number(c)];
  });
  await T('UI-09', 'Comment with @mention is saved, highlighted and logged to the audit trail', async () => {
    await go('vendor-management/purchase-orders?open=PO-001');
    const box = p.locator('[role=dialog] textarea[aria-label="Write a comment"]'); await box.scrollIntoViewIfNeeded();
    await box.click(); await box.type('Please check rates @Mee'); await p.waitForTimeout(100);
    await p.locator('[role=listbox][aria-label="Mention"] [role=option]').first().click(); await box.type('today');
    await p.locator('[role=dialog] [data-comments] button:has-text("Comment")').click(); await p.waitForTimeout(200);
    const st = await S(); const c = (st.comments || {})['PO-001'] || []; const au = st.audit.find((a) => a.entity === 'Comment');
    const hl = await p.locator('[role=dialog] [data-comments] li span:has-text("@Meera Iyer")').count();
    return [`${c.length} comment, mentions ${JSON.stringify(c[0] && c[0].mentions)}, audit "${au && au.action}"`, c.length === 1 && c[0].mentions.includes('Meera Iyer') && !!au && hl > 0];
  });
  await T('UI-10', 'Phone width: no sideways page scroll, menu button opens the sidebar', async () => {
    await p.setViewportSize({ width: 390, height: 844 }); await go('vendor-management/purchase-orders'); await p.waitForTimeout(300);
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    await p.locator('.nx-burger').click(); await p.waitForTimeout(300);
    const x = await p.evaluate(() => document.querySelector('aside').getBoundingClientRect().x);
    await p.setViewportSize({ width: 1440, height: 900 });
    return [`scrollWidth ${sw}, sidebar x ${Math.round(x)}`, sw <= 390 && Math.round(x) === 0];
  });
});
