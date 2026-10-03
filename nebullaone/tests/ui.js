// UI features: visible search, saved views, paging, group-by, board, calendar
const run = require('./lib');
run('ui', async ({ p, go, T, pick, S, mut }) => {
  await go('vendor-management/purchase-orders');
  await T('UI-01', 'Search icon opens a full-width search box; Esc closes it', async () => {
    await go('vendor-management/registry'); await p.waitForTimeout(200);
    await p.locator('main button[aria-label="Search"]').first().click(); await p.waitForTimeout(150);
    const bar = p.locator('[data-searchbar]').first(); const box = await bar.boundingBox(), card = await p.locator('main .shadow-card').first().boundingBox();
    await bar.locator('input').fill('Konkan'); await p.waitForTimeout(150); const rows = await p.locator('main tbody tr').count();
    await p.keyboard.press('Escape'); await p.waitForTimeout(150); const closed = !(await p.locator('[data-searchbar]').count());
    return [`bar width ${Math.round(box.width)} of ${Math.round(card.width)}; rows for "Konkan" ${rows}; closed on Esc ${closed}`, box.width > card.width * 0.8 && rows >= 1 && closed];
  });
  await T('UI-02', 'Layout buttons sit on the left of the toolbar; no Views or Group by', async () => {
    await go('vendor-management/registry'); await p.waitForTimeout(200);
    const lay = await p.locator('main [role=group][aria-label="Layout"]').first().boundingBox(), srch = await p.locator('main button[aria-label="Search"]').first().boundingBox();
    const views = await p.locator('main button[aria-label="Saved views"]').count(), grp = await p.locator('main [aria-label="Group by"]').count();
    return [`layout x ${Math.round(lay.x)} < search x ${Math.round(srch.x)}; Views ${views}, Group by ${grp}`, lay.x < srch.x && !views && !grp];
  });
  await T('UI-05', 'Vendor status menu lists every status, approval ones greyed, no note text', async () => {
    await go('vendor-management/registry'); await p.locator('main button[aria-label^="Change status of"]').first().click(); await p.waitForTimeout(150);
    const items = await p.locator('[role=menu] [role=menuitem]').allInnerTexts(); const dis = await p.locator('[role=menu] [role=menuitem]:disabled').count();
    const note = /set by the approval flow/i.test(await p.locator('[role=menu]').innerText()); await p.keyboard.press('Escape');
    return [`${items.length} statuses (${items.join(', ')}), ${dis} not pickable, note ${note}`, items.length === 8 && dis === 5 && !note];
  });
  await T('UI-03', 'Board layout shows cards in status columns', async () => {
    await go('vendor-management/purchase-orders');
    await p.locator('main button[aria-label="Board layout"]').first().click(); await p.waitForTimeout(150);
    const c = await p.locator('main [data-board] [data-card]').count(); return [`${c} cards`, c > 0];
  });
  await T('UI-04', 'Calendar layout shows a month grid with records', async () => {
    await p.locator('main button[aria-label="Calendar layout"]').first().click(); await p.waitForTimeout(150);
    const g = await p.locator('main [data-calendar]').count(); return [g ? 'calendar shown' : 'none', g > 0];
  });

  await T('UI-06', 'Paging: 25 / 50 / 100 rows per page with next / previous', async () => {
    await mut((s) => { const b = s.measurements[0]; for (let i = 0; i < 60; i++) s.measurements.push({ ...b, id: 'MB-X' + i }); });
    await go('#/productivity/contract-labor/measurement-book'); await p.waitForTimeout(300);
    const pager = await p.locator('main [data-pager]').count(); const rows = await p.locator('main table.nx-list tbody tr').count();
    return [`pager ${pager}, ${rows} rows on page 1`, pager > 0 && rows <= 50];
  });
  await go('vendor-management/purchase-orders?open=PO-001');
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

  await T('UI-11', 'PO line HSN/SAC, GST % and need-by are saved and shown; bad HSN blocks the PO', async () => {
    await go('vendor-management/purchase-orders'); await p.locator('main button:has-text("New PO")').click(); await p.waitForTimeout(200);
    const d = p.locator('[role=dialog]').last();
    await pick(d.locator('label:has-text("Vendor") [role=combobox]').first(), 'Deccan Steel Traders');
    await d.locator('input[placeholder="Description"]').fill('Binding wire'); await d.locator('input[placeholder="Qty"]').fill('10'); await d.locator('input[placeholder="Rate"]').fill('100');
    await d.locator('input[aria-label="Line 1 HSN/SAC"]').fill('72');
    const create = d.locator('button:has-text("Create")').last(); const blocked = await create.isDisabled();
    await d.locator('input[aria-label="Line 1 HSN/SAC"]').fill('7217');
    await pick(d.locator('[aria-label="Line 1 GST %"]'), 'GST 18%');
    await d.locator('input[aria-label="Line 1 need-by date"]').fill(new Date(Date.now() + 864e6).toISOString().slice(0, 10));
    const foot = await d.innerText(); await create.click(); await p.waitForTimeout(300);
    const st = await S(); const po = st.purchaseOrders[0]; const l = po.lines[0];
    return [`blocked with "72": ${blocked}; saved ${JSON.stringify({ hsn: l.hsn, gst: l.gstPct, needBy: l.needBy })}; footer GST ${/GST ₹180/.test(foot)}`, blocked && l.hsn === '7217' && l.gstPct === 18 && !!l.needBy && /GST ₹180/.test(foot)];
  });
});
