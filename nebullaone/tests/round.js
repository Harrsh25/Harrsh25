// This round: no tick boxes in dropdowns, multi-select filters, no subtitle on Register vendor, slimmer requisition form, empty create forms
require('./lib')('round', async ({ p, go, dlg, S, T }) => {
  await T('RD-01', 'Dropdown options have no tick box; the chosen one shows a tick mark', async () => {
    await go('vendor-management/registry'); await p.waitForTimeout(300);
    await p.locator('main table tbody tr').first().locator('[role=combobox], button[aria-haspopup]').first().click().catch(() => {}); await p.waitForTimeout(150);
    let boxes = await p.locator('[role=option] span.rounded.border').count(); await p.keyboard.press('Escape');
    await p.locator('main button:has-text("Register vendor")').click(); await p.waitForTimeout(250);
    await dlg().locator('[role=combobox]').filter({ hasText: /Select country|Select/ }).first().click(); await p.waitForTimeout(150);
    boxes += await p.locator('[role=option] span.rounded.border').count(); await p.keyboard.press('Escape');
    return [`tick boxes in options: ${boxes}`, boxes === 0];
  });
  await T('RD-02', 'Register vendor: no explanatory text under the title; dropdowns start empty', async () => {
    const t = await dlg().locator('h2').locator('xpath=..').innerText(); const pre = await dlg().locator('[role=combobox][data-value]:not([data-value=""])').count();
    await p.keyboard.press('Escape');
    return [`header "${t.replace(/\s+/g, ' ')}"; pre-selected dropdowns ${pre}`, !/Saving creates a draft/.test(t) && pre === 0];
  });
  await T('RD-03', 'Page filter takes several values: Status = Active + On Hold shows both', async () => {
    await go('vendor-management/registry'); await p.waitForTimeout(300);
    const f = p.locator('main button[aria-label="Status"]').first(); await f.click(); await p.waitForTimeout(100);
    await p.locator('[role=listbox] [role=option]:has-text("Active")').first().click(); await p.waitForTimeout(80);
    await p.locator('[role=listbox] [role=option]:has-text("On Hold")').first().click(); await p.waitForTimeout(150);
    const open = await p.locator('[role=listbox]').count(); await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    const rows = await p.locator('main table tbody tr').allInnerTexts();
    const act = rows.filter((r) => /\bActive\b/.test(r)).length, hold = rows.filter((r) => /On Hold/.test(r)).length, other = rows.filter((r) => /Inactive|Blacklisted/.test(r)).length;
    return [`menu stayed open ${open > 0}; Active rows ${act}, On Hold rows ${hold}, others ${other}; label "${(await f.innerText()).trim()}"`, act > 0 && hold > 0 && other === 0];
  });
  await T('RD-04', 'Requisition form: price list, notes and the extra labour fields are gone; nothing pre-selected', async () => {
    await go('vendor-management/requisitions'); await p.locator('main button:has-text("New requisition")').click(); await p.waitForTimeout(250);
    const pre = await dlg().locator('[role=combobox][data-value]:not([data-value=""])').count();
    await dlg().locator('label:has-text("Request purpose") [role=combobox]').click(); await p.locator('[role=option]:has-text("Manpower (labour)")').click(); await p.waitForTimeout(150);
    const t = await dlg().innerText(); await p.keyboard.press('Escape');
    const gone = ['Price list', 'Notes', 'Contingent type', 'Business unit', 'Site / location', 'Distribution rule', 'Qualifications required'].filter((k) => t.includes(k));
    return [`pre-selected ${pre}; still shown: ${gone.join(', ') || 'none'}`, pre === 0 && !gone.length];
  });
});
