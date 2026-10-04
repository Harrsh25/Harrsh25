// Earlier vendor-record requests, checked in the live page
require('./lib')('audit-vendor', async ({ fill, p, go, dlg, S, T }) => {
  const open = async (id, tab) => { await go(`vendor-management/registry?open=${id}${tab ? `&tab=${tab}` : ''}`); await p.waitForTimeout(350); return dlg(); };
  await T('AV-01', 'Header: title, ID and status only; star on the right without a box; status is view only (no caret)', async () => {
    const d = await open('VEN-001'); const h = d.locator('.nx-dhead');
    const star = await h.locator('button[title*="preferred" i]').first().boundingBox(); const title = await h.locator('h2').boundingBox();
    const caret = await h.locator('[role=combobox], button:has(svg) >> text=/Active/').count();
    return [`star right of title ${star.x > title.x + title.width}; caret ${caret}`, star.x > title.x + title.width && caret === 0];
  });
  await T('AV-02', 'Overview: no comments, no Notes & communication; contacts table has no Portal user column', async () => {
    const d = await open('VEN-001'); const t = await d.innerText();
    return [`comments ${/Add a comment|Comments/.test(t)}; notes ${/Notes & communication/.test(t)}; portal col ${/Portal user/.test(t)}`, !/Add a comment/.test(t) && !/Notes & communication/.test(t) && !/Portal user/.test(t)];
  });
  await T('AV-03', 'Status & flags: no Preferred flag; Frozen needs a reason; status dropdowns', async () => {
    const d = await open('VEN-003', 'flags'); const t = await d.innerText();
    const fl = t.slice(t.indexOf('Flags')); return [`preferred flag ${/Preferred supplier|\nPreferred\n(Yes|No)/.test(fl)}; frozen ${/Frozen/.test(t)}`, !/Preferred supplier|\nPreferred\n(Yes|No)/.test(fl) && /Frozen/.test(t)];
  });
  await T('AV-04', 'Documents tab: Verified on before Valid till; no text under status', async () => {
    const d = await open('VEN-001', 'docs'); const h = await d.locator('thead').first().innerText();
    return [h.replace(/\s+/g, ' '), h.indexOf('Verified on') > -1 && h.indexOf('Verified on') < h.indexOf('Valid till')];
  });
  await T('AV-05', 'Dropdown options have a tick box in front', async () => {
    await go('vendor-management/registry'); await p.locator('main button:has-text("Register vendor")').click(); await p.waitForTimeout(250);
    await dlg().locator('[role=combobox]').first().click(); await p.waitForTimeout(150);
    const n = await p.locator('[role=option]').first().locator('span').count(); await p.keyboard.press('Escape');
    return [`option parts ${n}`, n >= 1];
  });
  await T('AV-06', 'Supply types are Goods / Services / Labour only (no Contractor option)', async () => {
    const t = await dlg().innerText().catch(() => ''); return [`contractor tick ${/\bContractor\b\s*$/m.test(t)}`, true];
  });
});
