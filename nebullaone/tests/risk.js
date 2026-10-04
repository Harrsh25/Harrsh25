// G4 - Supplier Risk 360: score + level with reasons, risk actions, registry column, exceptions
require('./lib')('risk', async ({ p, go, dlg, S, mut, T, pick }) => {
  const VID = 'VEN-003';
  await T('RK-01', 'Registry shows a Risk column (level + score) that can be switched on', async () => {
    await go('vendor-management/registry'); await p.waitForTimeout(300);
    let head = await p.locator('main table thead').innerText();
    if (!/Risk/.test(head)) { await p.locator('main [aria-label="Customize columns"]').first().click(); await p.waitForTimeout(150); const panel = p.locator('aside[aria-label="Customize columns"]'); await panel.locator('[role=switch][aria-label="Risk"]').click(); await panel.getByRole('button', { name: 'Apply' }).click(); await p.waitForTimeout(200); head = await p.locator('main table thead').innerText(); }
    const row = await p.locator('main table tbody tr').first().innerText();
    return [`column ${/Risk/.test(head)}; first row: ${row.replace(/\s+/g, ' ').slice(0, 100)}`, /Risk/.test(head) && /(Low|Medium|High|Critical)\s*\d+/.test(row)];
  });
  await T('RK-02', 'Problems raise the score: hold + blocking compliance + unverified bank → High/Critical with reasons listed', async () => {
    await mut(`(s) => { const v = s.vendors.find((x) => x.id === '${VID}'); v.hold = { scope: 'All', reason: 'Quality issue', by: 'demo', at: '2026-10-01' }; v.bankAccounts.find((b) => b.isDefault).status = 'Unverified'; (v.docs || []).forEach((d) => { if (/PAN|GST/i.test(d.name)) d.status = 'Missing'; }); }`);
    await go(`vendor-management/registry?open=${VID}&tab=risk`); await p.waitForTimeout(400);
    const t = await dlg().innerText();
    return [`${(t.match(/Risk level\s*(\w+)/) || [])[1]} · ${(t.match(/score \d+/) || [])[0]}; reasons: ${['On hold', 'bank account not verified', 'Compliance'].filter((k) => t.includes(k)).join(', ')}`, /Risk level\s*(High|Critical)/.test(t) && /On hold/.test(t) && /bank account not verified/.test(t)];
  });
  await T('RK-03', 'High risk with no action shows in the Exception Center', async () => {
    await go('administration/exceptions'); const r = await p.locator('main table tbody tr').filter({ hasText: /supplier risk - no action/ }).count();
    return [`rows ${r}`, r >= 1];
  });
  await T('RK-04', 'Add a risk action (owner + due) - logged; the "no action" exception goes away', async () => {
    await go(`vendor-management/registry?open=${VID}&tab=risk`); await p.waitForTimeout(300);
    await dlg().locator('button:has-text("Add risk action")').click(); await p.waitForTimeout(100);
    await dlg().locator('button:has-text("Add")').last().click(); await p.waitForTimeout(100);
    const errs = await dlg().innerText();
    await dlg().locator('label:has-text("Action") input').fill('Collect GST and PAN certificates'); await pick(dlg().locator('label:has-text("Owner") [role=combobox]'), 'Procurement Head');
    await dlg().locator('label:has-text("Due") input').fill('2026-10-20'); await dlg().locator('button:has-text("Add")').last().click(); await p.waitForTimeout(250);
    const s = await S(); const a = (s.vendors.find((x) => x.id === VID).riskActions || [])[0]; const log = s.audit.find((x) => x.id === VID && /Risk action added/.test(x.action));
    await go('administration/exceptions'); const r = await p.locator('main table tbody tr').filter({ hasText: /supplier risk - no action/ }).filter({ hasText: s.vendors.find((x) => x.id === VID).name }).count();
    return [`validation shown ${/Pick an owner/.test(errs)}; action ${a?.title} / ${a?.owner} / ${a?.due}; logged ${!!log}; no-action row left ${r}`, /Pick an owner/.test(errs) && a?.owner === 'Procurement Head' && !!log && r === 0];
  });
  await T('RK-05', 'Overdue action is an exception; Mark done closes it', async () => {
    await mut(`(s) => { s.vendors.find((x) => x.id === '${VID}').riskActions[0].due = '2026-09-01'; }`);
    await go('administration/exceptions'); const n1 = await p.locator('main table tbody tr').filter({ hasText: 'Risk action overdue' }).count();
    await go(`vendor-management/registry?open=${VID}&tab=risk`); await p.waitForTimeout(300); await dlg().locator('button:has-text("Mark done")').click(); await p.waitForTimeout(200);
    const a = (await S()).vendors.find((x) => x.id === VID).riskActions[0];
    return [`overdue rows ${n1}; after: ${a.status} by ${a.closedBy}`, n1 >= 1 && a.status === 'Done'];
  });
  await T('RK-06', 'Fixing the causes lowers the score', async () => {
    const before = await dlg().innerText();
    await mut(`(s) => { const v = s.vendors.find((x) => x.id === '${VID}'); v.hold = null; v.bankAccounts.find((b) => b.isDefault).status = 'Verified'; }`);
    await go(`vendor-management/registry?open=${VID}&tab=risk`); await p.waitForTimeout(300); const after = await dlg().innerText();
    const sc = (t) => Number((t.match(/score (\d+)/) || [])[1]);
    return [`score ${sc(before)} → ${sc(after)}`, sc(after) < sc(before)];
  });
  await T('RK-07', 'Residual risk shown; every action and review is kept in the risk history', async () => {
    await go(`vendor-management/registry?open=${VID}&tab=risk`); await p.waitForTimeout(300);
    await dlg().locator('button:has-text("Record review")').click(); await p.waitForTimeout(200);
    const t = await dlg().innerText(); const h = (await S()).vendors.find((x) => x.id === VID).riskHistory || [];
    return [`residual tile ${/Residual risk/.test(t)}; history ${h.map((x) => x.note).join(' | ')}`, /Residual risk/.test(t) && h.length >= 3 && /Periodic risk review/.test(h[0].note)];
  });
});
