// UI features: visible search, saved views, paging, group-by, board, calendar
const run = require('./lib');
run('ui', async ({ p, go, T, pick }) => {
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
});
