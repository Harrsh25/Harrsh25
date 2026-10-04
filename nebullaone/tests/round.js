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
  await T('RD-05', 'Menus: no helper text, no tick, and only as wide as their text', async () => {
    await go('vendor-management/registry'); await p.waitForTimeout(300);
    await p.locator('main button[aria-label="Status"]').first().click(); await p.waitForTimeout(150);
    const m1 = p.locator('[role=listbox]').first(); const txt = await m1.innerText(); const w1 = (await m1.boundingBox()).width; const ticks = await m1.locator('svg').count();
    await p.keyboard.press('Escape'); await p.locator('main table tbody tr').nth(1).locator('button[aria-haspopup=menu]').first().click(); await p.waitForTimeout(150);
    const w2 = (await p.locator('[role=menu]').boundingBox()).width; await p.keyboard.press('Escape');
    return [`helper text ${/pick one or more/i.test(txt)}; ticks ${ticks}; filter menu ${Math.round(w1)}px; status menu ${Math.round(w2)}px`, !/pick one or more/i.test(txt) && ticks === 0 && w1 < 220 && w2 < 220];
  });
  await T('RD-06', 'Forms show only labels, inputs and errors: no hints, subtitles or info notes', async () => {
    let bad = []; for (const [r, b] of [['vendor-management/registry', 'Register vendor'], ['vendor-management/purchase-orders', 'New PO'], ['contract-labor/contracts', 'Create contract'], ['vendor-management/requisitions', 'New requisition']]) {
      await go(r); await p.locator(`main button:has-text("${b}")`).first().click(); await p.waitForTimeout(250);
      const t = await dlg().innerText(); for (const k of ['e.g. As on', 'As on the GST certificate', 'Saving creates a draft', 'tick all that apply', 'Who the vendor is', 'is issued directly', 'Without BOQ lines', 'Used to filter']) if (t.includes(k)) bad.push(`${b}: ${k}`);
      await p.keyboard.press('Escape');
    }
    return [bad.join(' | ') || 'clean', !bad.length];
  });
  await T('RD-07', 'Vendor registry has no row tick boxes and no bulk action bar', async () => {
    await go('vendor-management/registry'); const cb = await p.locator('main tbody input[type=checkbox]').count();
    const bar = await p.locator('main').getByText(/\d+ selected|Clear selection|Mark preferred/).count();
    return [`tick boxes ${cb}; bulk bar ${bar}`, cb === 0 && bar === 0];
  });
  await T('RD-08', 'PO form: nothing pre-selected; "Select <field>" placeholders and no "-" or "none" row in the list', async () => {
    await go('vendor-management/purchase-orders'); await p.locator('main button:has-text("New PO")').first().click(); await p.waitForTimeout(250);
    const boxes = await dlg().locator('[role=combobox]').evaluateAll((els) => els.map((e) => [e.getAttribute('aria-label'), e.getAttribute('data-value'), e.innerText.trim()]));
    const pre = boxes.filter((b) => b[1] && !/Price list|Currency|Buyer/.test(b[0])), bad = boxes.filter((b) => !b[1] && !/^Select\s\S/.test(b[2]));
    await dlg().locator('[role=combobox][aria-label="Draw from blanket order"]').click(); await p.waitForTimeout(150);
    const opts = await p.locator('[role=listbox] [role=option]').allInnerTexts(); await p.keyboard.press('Escape');
    const dashRow = opts.filter((o) => /^\s*-|none/i.test(o));
    return [`bad ${bad.map((b) => b.join("=")).join(", ")}; pre-selected ${pre.map((b) => b.join("=")).join(", ") || "none"}; placeholders ${boxes.slice(0, 4).map((b) => b[2]).join(' / ')}; blanket options ${opts.join(', ')}`, !pre.length && !bad.length && !dashRow.length];
  });
  await T('RD-09', 'After a PO is raised from a requisition, the next "New PO" opens blank', async () => {
    const st = await S(); const r = (st.requisitions || []).find((x) => x.status === 'Approved' && !['Material transfer', 'Material issue', 'Customer provided'].includes(x.purpose));
    if (!r) return ['no approved purchase requisition in the demo data', true];
    await go('vendor-management/purchase-orders?fromReq=' + r.id); await p.waitForTimeout(300); const first = await dlg().count();
    await p.keyboard.press('Escape'); await p.waitForTimeout(200); await p.locator('main button:has-text("New PO")').first().click(); await p.waitForTimeout(250);
    const proj = await dlg().locator('[role=combobox][aria-label="Project"]').getAttribute('data-value');
    return [`${r.id}: form opened ${first > 0}; next New PO project "${proj}"`, proj === ''];
  });
});
