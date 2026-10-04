// G7 - RFQ technical + commercial evaluation, clarifications, BAFO, recommendation, award gate
require('./lib')('rfqeval', async ({ fill, p, go, dlg, S, mut, T }) => {
  const RID = 'RFQ-001';
  const evalTab = async () => { await go(`vendor-management/rfq?open=${RID}`); await p.waitForTimeout(400); await p.locator('[data-drawer] [role=tab]:has-text("Evaluation")').click(); await p.waitForTimeout(200); return p.locator('[data-drawer]'); };
  const score = async (d, vendor, marks, remark) => {
    await d.locator(`tr:has-text("${vendor}") button:has-text("Score")`).click(); await p.waitForTimeout(150);
    const m = dlg(); const ins = m.locator('input[placeholder="0–10"]'); for (let i = 0; i < marks.length; i++) await ins.nth(i).fill(String(marks[i]));
    if (remark) await m.locator('label:has-text("fails") input, label:has-text("remark") input').first().fill(remark);
    await p.waitForTimeout(100); const t = await m.innerText(); await m.locator('button:has-text("Save")').click(); await p.waitForTimeout(200); return t;
  };
  await T('EV-01', 'Technical scoring: weighted score vs pass mark; a failing score needs a reason', async () => {
    const d = await evalTab();
    await d.locator('tr:has-text("Deccan Steel") button:has-text("Score")').click(); await p.waitForTimeout(150);
    const m = dlg(); const ins = m.locator('input[placeholder="0–10"]'); await ins.nth(0).fill('3'); await ins.nth(1).fill('4'); await ins.nth(2).fill('5'); await p.waitForTimeout(100);
    const dis = await m.locator('button:has-text("Save")').isDisabled(); const t = await m.innerText();
    await m.locator('label:has-text("fails") input').fill('Mill certificates missing for 16 mm'); await m.locator('button:has-text("Save")').click(); await p.waitForTimeout(200);
    await score(d, 'Konkan Steel', [8, 7, 9]);
    const r = (await S()).rfqs.find((x) => x.id === RID);
    return [`fail needs reason ${dis}; ${(t.match(/Technical score: \d+/) || [''])[0]}; saved ${Object.keys(r.techEval || {}).join(', ')}`, dis && /Fail/.test(t) && Object.keys(r.techEval || {}).length === 2];
  });
  await T('EV-02', 'Combined ranking: failed bidder not ranked; award modal blocks the failed bidder', async () => {
    const d = await evalTab(); const t = await d.innerText();
    await p.locator('[data-drawer] [role=tab]:has-text("Comparison")').click(); await p.waitForTimeout(150); await p.locator('[data-drawer] button:has-text("Award by line")').click(); await p.waitForTimeout(200);
    const m = await dlg().innerText(); const radio = dlg().locator('thead th').filter({ hasText: 'Deccan Steel' }); const blocked = /cannot receive PO/.test(await radio.innerText());
    await p.keyboard.press('Escape');
    return [`technical fail shown ${/Technical fail/.test(t)}; award column blocked ${blocked}`, /Technical fail/.test(t) && blocked];
  });
  await T('EV-03', 'Clarification asked and answered; open one blocks the recommendation', async () => {
    const d = await evalTab(); await d.locator('button:has-text("Ask a clarification")').click(); await p.waitForTimeout(150);
    const m = dlg(); await m.locator('[role=combobox]').click(); await p.locator('[role=option]:has-text("Konkan")').click(); await m.locator('textarea').fill('Confirm rates include unloading at site'); await m.locator('button:has-text("Send")').click(); await p.waitForTimeout(200);
    await d.locator('button:has-text("Recommend award")').click(); await p.waitForTimeout(150); const blocked = await dlg().locator('button:has-text("Save")').isDisabled(); await dlg().locator('button:has-text("Cancel")').click();
    await d.locator('button:has-text("Record answer")').click(); await p.waitForTimeout(150); await dlg().locator('textarea').fill('Yes, unloading included'); await dlg().locator('button:has-text("Save")').click(); await p.waitForTimeout(200);
    const c = (await S()).rfqs.find((x) => x.id === RID).clarifications[0];
    return [`blocked while open ${blocked}; answer "${c.answer}"`, blocked && c.answer === 'Yes, unloading included'];
  });
  await T('EV-04', 'BAFO: only qualified bidders asked; final offer can\'t go up; lower offer updates rates + price history', async () => {
    const d = await evalTab(); await d.locator('button:has-text("Request final offers")').click(); await p.waitForTimeout(150); const who = await dlg().innerText(); await dlg().locator('button:has-text("Send request")').click(); await p.waitForTimeout(200);
    const r0 = (await S()).rfqs.find((x) => x.id === RID); const q0 = r0.quotes.find((q) => q.vendorId === 'VEN-011'); const tot0 = 60 * q0.rates[0] + 60 * q0.rates[1];
    await d.locator('tr:has-text("Konkan") button:has-text("Record final offer")').click(); await p.waitForTimeout(150);
    await dlg().locator('input').fill(String(tot0 + 100000)); await p.waitForTimeout(80); const up = await dlg().locator('button:has-text("Save")').isDisabled();
    await dlg().locator('input').fill(String(Math.round(tot0 * 0.96))); await dlg().locator('button:has-text("Save")').click(); await p.waitForTimeout(250);
    const q1 = (await S()).rfqs.find((x) => x.id === RID).quotes.find((q) => q.vendorId === 'VEN-011');
    return [`asked: ${r0.bafo.vendors.join(',')}; higher refused ${up}; rate ${q0.rates[0]} → ${q1.rates[0]}; history ${q1.priceHistory.map((h) => h.label).join(' → ')}`, r0.bafo.vendors.length === 1 && r0.bafo.vendors[0] === 'VEN-011' && up && q1.rates[0] < q0.rates[0] && q1.priceHistory.length === 2];
  });
  await T('EV-05', 'Recommendation recorded with justification and audited', async () => {
    const d = await evalTab(); await d.locator('button:has-text("Recommend award")').click(); await p.waitForTimeout(150);
    await dlg().locator('textarea').fill('Best combined score; final offer 4% lower; mill certificates with each lot'); await dlg().locator('button:has-text("Save")').click(); await p.waitForTimeout(200);
    const s = await S(); const r = s.rfqs.find((x) => x.id === RID); const a = s.audit.find((x) => x.id === RID && /Award recommended/.test(x.action));
    return [`recommend ${r.recommend?.vendorId} top ${r.recommend?.topRanked}; audit ${!!a}`, r.recommend?.vendorId === 'VEN-011' && !!a];
  });
  await T('EV-06', 'Criteria weights must total 100%', async () => {
    const d = await evalTab(); await d.locator('button:has-text("Criteria & weights")').click(); await p.waitForTimeout(150);
    await dlg().locator('input').nth(1).fill('50'); await p.waitForTimeout(80); const t = await dlg().innerText(); const dis = await dlg().locator('button:has-text("Save")').isDisabled(); await dlg().locator('button:has-text("Cancel")').click();
    return [`${(t.match(/Weights add up to \d+%/) || ['no msg'])[0]}; save disabled ${dis}`, /must total 100%/.test(t) && dis];
  });
});
