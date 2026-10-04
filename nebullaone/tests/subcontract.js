// G8 - subcontractor management under a main contractor
require('./lib')('subcontract', async ({ p, go, dlg, S, mut, T, pick }) => {
  const open = async () => { await go('contract-labor/contracts?open=CTR-001'); await p.waitForTimeout(400); return p.locator('[data-drawer]'); };
  await T('SC-01', 'Contract shows its subcontractors; the on-hold one can\'t be approved (reason shown)', async () => {
    const d = await open(); const sec = d.locator('section, div').filter({ has: p.locator('text=Subcontractors') }).last();
    const t = await d.innerText(); const btn = d.locator('tr:has-text("Rapid Scaffolding") button:has-text("Approve")');
    return [`listed ${/Sai Earthmovers/.test(t) && /Rapid Scaffolding/.test(t)}; approve disabled ${await btn.isDisabled()} (${(await btn.getAttribute('title') || '').slice(0, 80)})`, /Sai Earthmovers/.test(t) && (await btn.isDisabled()) && /hold|on hold/i.test(await btn.getAttribute('title') || '')];
  });
  await T('SC-02', 'Propose a subcontractor: validates scope / value / dates and the sublet limit', async () => {
    const d = await open(); await d.locator('button:has-text("Propose subcontractor")').click(); await p.waitForTimeout(150);
    await d.locator('button:has-text("Propose")').last().click(); await p.waitForTimeout(100); const t1 = await d.innerText();
    await pick(d.locator('label:has-text("Subcontractor") [role=combobox]').last(), 'Kaveri Manpower Services');
    await d.locator('label:has-text("Scope sublet") input').fill('Shuttering labour - Tower A floors 5–10'); await d.locator('label:has-text("Value") input').last().fill('90000000'); await p.waitForTimeout(100);
    const t2 = await d.innerText();
    await d.locator('label:has-text("Value") input').last().fill('2500000'); await d.locator('button:has-text("Propose")').last().click(); await p.waitForTimeout(250);
    const c = (await S()).contracts.find((x) => x.id === 'CTR-001'); const sub = c.subcontracts.find((x) => x.vendorId === 'VEN-005');
    return [`errors ${/Describe the sublet scope/.test(t1)}; limit warning ${/over 40% of the contract/.test(t2)}; saved ${sub?.id} ${sub?.status}`, /Describe the sublet scope/.test(t1) && /over 40% of the contract/.test(t2) && sub?.status === 'Proposed'];
  });
  await T('SC-03', 'Approve the eligible proposal; reject the other with a reason - both audited', async () => {
    const d = await open(); await d.locator('tr:has-text("Kaveri Manpower") button:has-text("Approve")').click(); await p.waitForTimeout(200);
    await d.locator('tr:has-text("Rapid Scaffolding") button:has-text("Reject")').click(); await p.waitForTimeout(150);
    await dlg().locator('input').fill('Vendor is on hold'); await dlg().locator('button:has-text("Reject")').last().click(); await p.waitForTimeout(200);
    const s = await S(); const subs = s.contracts.find((x) => x.id === 'CTR-001').subcontracts;
    const logs = s.audit.filter((a) => a.id === 'CTR-001' && /Subcontract SUB-\d+ to .* (approved|rejected)/.test(a.action)).length;
    return [subs.map((x) => `${x.id} ${x.status}`).join(', ') + `; audit ${logs}`, subs.find((x) => x.vendorId === 'VEN-005').status === 'Approved' && subs.find((x) => x.vendorId === 'VEN-006').status === 'Rejected' && logs >= 2];
  });
  await T('SC-04', 'Subcontractor worker: employed by the subcontract; blocked on site if the subcontract is not approved', async () => {
    const s = await S(); const sub = s.contracts.find((x) => x.id === 'CTR-001').subcontracts.find((x) => x.vendorId === 'VEN-006');
    await mut(`(s) => { s.workers.push({ id: 'WK-090', vendorId: 'VEN-001', subcontractId: '${sub.id}', name: 'Sub Worker Test', trade: 'Mason', skill: 'Skilled', gatePass: 'GP-9090', inductionOn: '${new Date().toISOString().slice(0, 10)}', medicalValidTill: '2027-06-30', active: true, idRef: 'XXXX-1111', uan: '100900000001', esic: '3100000000' }); }`);
    await go('contract-labor/workers?open=WK-090'); await p.waitForTimeout(300); const t = await dlg().innerText();
    return [(t.match(/Can't work on site:[^.]*/) || ['-'])[0], /Employed by/.test(t) && /Subcontract SUB-\d+ is rejected/.test(t)];
  });
  await T('SC-05', 'Close & rate the subcontract → rating lands on the subcontractor\'s scorecard', async () => {
    const d = await open(); await d.locator('tr:has-text("Sai Earthmovers") button:has-text("Close & rate")').click(); await p.waitForTimeout(150);
    await dlg().locator('button:has-text("Close")').last().click(); await p.waitForTimeout(250);
    const s = await S(); const r = s.ratings.find((x) => x.vendorId === 'VEN-010' && /Subcontract SUB-001/.test(x.period));
    return [`rating ${r ? `${r.quality}/${r.safety}` : 'none'}; status ${s.contracts.find((x) => x.id === 'CTR-001').subcontracts.find((x) => x.id === 'SUB-001').status}`, !!r];
  });
  await T('SC-06', 'Subcontractors page lists all subcontracts with checks; Exception Center shows the blocked worker', async () => {
    await go('contract-labor/subcontractors'); await p.waitForTimeout(300); const n = await p.locator('main table tbody tr').count(); const t = await p.locator('main').innerText();
    await go('administration/exceptions'); const ex = await p.locator('main table tbody tr').filter({ hasText: 'Sub Worker Test' }).count();
    return [`${n} subcontracts; worker exception ${ex}`, n >= 3 && /Main contractor/.test(t) && ex >= 1];
  });
});
