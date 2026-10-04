// G5 - Worker Master: profiles, statutory + safety checks, eligibility gate on the daily muster, exit, exceptions
require('./lib')('workers', async ({ fill, p, go, dlg, S, mut, T, pick }) => {
  await T('WK-01', 'Worker Master lists workers with contractor, trade, checks and status; tiles count them', async () => {
    await go('contract-labor/workers'); await p.waitForTimeout(300);
    const head = await p.locator('main table thead').innerText(); const n = await p.locator('main table tbody tr').count(); const t = await p.locator('main').innerText();
    return [`${n} rows; headers ${head.replace(/\s+/g, ' ')}; not-eligible tile ${/Not eligible\s*\d+/.test(t)}`, n >= 10 && /Checks/.test(head) && /Status/.test(head) && /Not eligible/.test(t)];
  });
  await T('WK-02', 'Worker with expired medical is "Not eligible" and the profile says why', async () => {
    const w = (await S()).workers.find((x) => x.medicalValidTill < new Date().toISOString().slice(0, 10));
    await go(`contract-labor/workers?open=${w.id}`); await p.waitForTimeout(300); const t = await dlg().innerText();
    return [`${w.name}: ${(t.match(/Can't work on site:[^.]*/) || ['-'])[0]}`, /Not eligible/.test(t) && /Medical fitness expired/.test(t)];
  });
  await T('WK-03', 'Add worker validates (age, ID, UAN) and saves full profile with a certificate', async () => {
    await go('contract-labor/workers'); await p.locator('main button:has-text("Add worker")').click(); await p.waitForTimeout(200);
    const d = dlg(); await d.locator('button:has-text("Add worker")').last().click(); await p.waitForTimeout(100); const t1 = await d.innerText();
    await d.locator('label:has-text("Full name") input').fill('Test Worker Pawar'); await d.locator('label:has-text("Date of birth") input').fill('1990-05-10');
    await d.locator('label:has-text("ID number") input').fill('XXXX-XXXX-9911'); await d.locator('label:has-text("PF - UAN") input').fill('123'); await p.waitForTimeout(100);
    const t2 = await d.innerText(); await d.locator('label:has-text("PF - UAN") input').fill('100912345678');
    await d.locator('label:has-text("Medical fit till") input').fill('2027-03-31');
    await d.locator('button:has-text("Add certificate")').click(); await d.locator('input[placeholder="Certificate no."]').fill('WAH-9001'); await d.locator('.grid-cols-\\[1\\.4fr_1fr_150px_auto\\] input[type=date]').fill('2027-01-31');
    await fill(d); await d.locator('button:has-text("Add worker")').last().click(); await p.waitForTimeout(300);
    const w = (await S()).workers.find((x) => x.name === 'Test Worker Pawar');
    return [`errors ${/Enter the full name/.test(t1)} / UAN ${/UAN is 12 digits/.test(t2)}; saved ${w?.id} uan ${w?.uan} certs ${w?.certificates?.length}`, /Enter the full name/.test(t1) && /UAN is 12 digits/.test(t2) && w?.uan === '100912345678' && w.certificates.length === 1];
  });
  await T('WK-04', 'Daily muster: a not-eligible worker can\'t be marked present (P disabled, reason shown)', async () => {
    const w = (await S()).workers.find((x) => x.medicalValidTill < new Date().toISOString().slice(0, 10));
    await go('contract-labor/attendance'); await p.waitForTimeout(400);
    const vn = (await S()).vendors.find((v) => v.id === w.vendorId).name; await pick(p.locator('main label:has-text("Contractor") [role=combobox]'), vn); await p.waitForTimeout(150);
    const wo = (await S()).workOrders.find((x) => x.id === w.woId); await pick(p.locator('main label:has-text("Work order") [role=combobox]'), wo.id); await p.waitForTimeout(200);
    const row = p.locator('main table tbody tr').filter({ hasText: w.name }).first();
    const t = await row.innerText(); const dis = await row.locator('button[title="Present"]').isDisabled();
    return [`${t.replace(/\s+/g, ' ').slice(0, 90)}; P disabled ${dis}`, /Not allowed on site/.test(t) && dis];
  });
  await T('WK-05', 'Exception Center: not eligible, attended while not eligible, papers expiring', async () => {
    await go('administration/exceptions'); const rows = await p.locator('main table tbody tr').allInnerTexts();
    const k = ['Worker not eligible for site', 'Worker attended while not eligible', 'Worker papers expiring'].filter((x) => rows.some((r) => r.includes(x)));
    return [k.join(', '), k.length === 3];
  });
  await T('WK-06', 'Recording an exit removes the worker from the muster and logs it', async () => {
    const w = (await S()).workers.find((x) => x.name === 'Test Worker Pawar') || (await S()).workers[0];
    await go(`contract-labor/workers?open=${w.id}`); await p.waitForTimeout(300); await dlg().locator('button:has-text("Record exit")').click(); await p.waitForTimeout(150);
    await pick(dlg().locator('label:has-text("Reason") [role=combobox]'), 'Resigned'); await dlg().locator('button:has-text("Record exit")').last().click(); await p.waitForTimeout(250);
    const x = (await S()).workers.find((y) => y.id === w.id); const log = (await S()).audit.find((a) => a.id === w.id && /Exit recorded/.test(a.action));
    return [`exitOn ${x.exitOn}, active ${x.active}; logged ${!!log}`, !!x.exitOn && x.active === false && !!log];
  });
});
