// WIRING CHECK — every page loads; clicking a row opens its record; every record link inside a
// drawer lands on a page that opens that same record; ?open= deep links work for each page.
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); p.setDefaultTimeout(3000);
  let errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const file = 'file://' + require('path').resolve(__dirname, '../../NebullaOne-WFM.html') + '#/productivity/';
  await p.goto(file); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('wfm-demo-user', JSON.stringify({ name: 'demo', email: 'demo@x' })); });
  const go = async (x) => { await p.goto('about:blank'); await p.goto(file + x); await p.waitForTimeout(600); };
  const R = []; const rec = (area, check, ok, detail) => { R.push({ area, check, result: ok ? 'PASS' : 'FAIL', detail }); console.log((ok ? 'PASS ' : 'FAIL ') + area + ' — ' + check + (ok ? '' : ' → ' + detail)); };
  const S = () => p.evaluate(() => JSON.parse(localStorage.getItem('nxv-store-v1') || '{}'));
  // 1. every page in the menu
  // make the store persist (it is only written after the first change)
  await go('vendor-management/registry'); const star = p.locator('tr:has-text("Konkan Steel") button[title*="preferred" i]'); await star.click(); await p.waitForTimeout(80); await star.click(); await p.waitForTimeout(80);
  const links = ['vendor-management/overview', 'vendor-management/registry', 'vendor-management/approvals', 'vendor-management/compliance', 'vendor-management/requisitions', 'vendor-management/rfq', 'vendor-management/blanket-orders', 'vendor-management/purchase-orders', 'vendor-management/invoices', 'vendor-management/scorecard', 'vendor-management/portal', 'vendor-management/settings', 'contract-labor/overview', 'contract-labor/onboarding', 'contract-labor/contracts', 'contract-labor/work-orders', 'contract-labor/attendance', 'contract-labor/measurement-book', 'contract-labor/ra-bills', 'contract-labor/retention', 'contract-labor/labor-rates', 'contract-labor/performance', 'contract-labor/closeout', 'administration/audit-log', 'approvals/approval-management',
    'vendor-management/requalification', 'contract-labor/final-settlement', 'contract-labor/dlp-warranty', 'contract-labor/contractor-release', 'contract-labor/terminations'];
  const NO_ROWS = ['settings', 'audit-log', 'portal', 'overview', 'approval-management', 'attendance']; // attendance is a muster grid for data entry, not a record list
  for (const h of links) {
    errs = []; await go(h.replace(/^#?\/?productivity\//, '').replace(/^#\//, ''));
    const title = await p.locator('h1').first().textContent().catch(() => '');
    rec('Page', h.split('/').slice(-1)[0], !!title && !errs.length, errs.join(' / ') || 'no title');
    // 2. first row opens its record (drawer or another page)
    const row = p.locator('main tbody tr').first();
    if (!NO_ROWS.includes(h.split('/').slice(-1)[0]) && await row.count() && !/No |Nothing/.test(await row.textContent())) {
      const before = p.url(); errs = [];
      await row.click({ position: { x: 30, y: 10 } }).catch(() => {}); await p.waitForTimeout(500);
      const opened = (await p.locator('[role=dialog]').count()) > 0 || p.url() !== before;
      rec('Row click', h.split('/').slice(-1)[0], opened && !errs.length, errs.join(' / ') || 'nothing opened');
      // 3. record links inside the drawer
      if (await p.locator('[role=dialog]').count()) {
        const refs = await p.$$eval('[role=dialog] a[href*="?open="]', (as) => [...new Set(as.map((a) => a.getAttribute('href')))].slice(0, 6));
        for (const r of refs) {
          errs = []; const id = r.split('open=')[1];
          await p.goto(file.split('#')[0] + (r.startsWith('#') ? r : '#' + r)); await p.waitForTimeout(700);
          const dlg = p.locator('[role=dialog]');
          const ok = (await dlg.count()) > 0 && (await dlg.last().textContent()).includes(id);
          rec('Record link', `${h.split('/').slice(-1)[0]} → ${r.replace(/.*productivity\//, '')}`, ok && !errs.length, errs.join(' / ') || 'target record not opened');
          await go(h.replace(/^#?\/?productivity\//, '').replace(/^#\//, ''));
          await p.locator('main tbody tr').first().click({ position: { x: 30, y: 10 } }).catch(() => {}); await p.waitForTimeout(400);
        }
      }
    }
  }
  // 4. deep links with real IDs
  const st = await S();
  const deep = [['vendor-management/registry', st.vendors[0].id], ['vendor-management/approvals', st.vendors.find((v) => v.status === 'Pending Approval')?.id], ['vendor-management/compliance', st.vendors[0].id],
    ['vendor-management/requisitions', (st.requisitions || [])[0]?.id], ['vendor-management/rfq', st.rfqs[0].id], ['vendor-management/blanket-orders', st.blanketOrders[0]?.id],
    ['vendor-management/purchase-orders', st.purchaseOrders[0].id], ['vendor-management/invoices', st.invoices[0].id], ['contract-labor/contracts', st.contracts[0].id],
    ['contract-labor/work-orders', st.workOrders[0].id], ['contract-labor/ra-bills', st.raBills[0].id], ['contract-labor/closeout', st.contracts[0].id], ['contract-labor/final-settlement', 'CTR-005']];
  for (const [pg, id] of deep) {
    if (!id) { rec('Deep link', pg, false, 'no sample record'); continue; }
    errs = []; await go(`${pg}?open=${id}`);
    const dlg = p.locator('[role=dialog]'); const ok = (await dlg.count()) > 0 && (await dlg.last().textContent()).includes(id);
    rec('Deep link', `${pg}?open=${id}`, ok && !errs.length, errs.join(' / ') || 'record not opened');
  }
  // 5. other parameters
  errs = []; await go(`contract-labor/work-orders?contract=${st.contracts[0].id}`); rec('Deep link', 'work-orders?contract= opens a new WO for that contract', (await p.locator('[role=dialog]').count()) > 0 && !errs.length, errs.join(' / ') || 'no dialog');
  errs = []; await go(`contract-labor/ra-bills?wo=${st.workOrders[0].id}`); rec('Deep link', 'ra-bills?wo= opens bill preparation for that WO', (await p.locator('[role=dialog]').count()) > 0 && !errs.length, errs.join(' / ') || 'no dialog');
  errs = []; await go(`vendor-management/rfq?fromReq=MR-001`); const vals = await p.$$eval('[role=dialog] input', (is) => is.map((i) => i.value).join(' ')); rec('Deep link', 'rfq?fromReq= opens an RFQ pre-filled from the requisition', /MR-001/.test(vals) && !errs.length, errs.join(' / ') || 'not pre-filled: ' + vals.slice(0, 80));
  for (const m of ['Vendors', 'Purchase Orders', 'Contracts', 'Vendor Invoices', 'Spend Authorization']) {
    errs = []; await go(`approvals/approval-management?module=${encodeURIComponent(m)}`); rec('Deep link', `approval-management?module=${m}`, !errs.length && (await p.textContent('body')).includes(m), errs.join(' / ') || 'module not selected');
  }
  // 7. Filters side panel: chips staged, applied, page filter included, reset clears
  {
    errs = []; await go('vendor-management/registry'); const all = await p.locator('main tbody tr').count();
    await p.locator('button[aria-label="Filters"]').click(); await p.waitForTimeout(250); const panel = p.locator('[data-filter-panel]');
    const before = await p.locator('main tbody tr').count();
    await panel.locator('button[aria-pressed]').filter({ hasText: /^\s*(Labou?r)/ }).first().click(); await panel.locator('button:has-text("Apply Filters")').click(); await p.waitForTimeout(250);
    const after = await p.locator('main tbody tr').count(); const badge = await p.locator('button[aria-label="Filters"]').textContent();
    rec('Filters panel', `registry: chip staged (${before} rows) → applied (${after} rows), badge ${badge.trim()}`, !errs.length && before === all && after < all && badge.trim() === '1', errs.join(' / ') || 'not applied');
    await p.locator('button[aria-label="Filters"]').click(); await p.waitForTimeout(200); await p.locator('[data-filter-panel] button:has-text("Reset")').click(); await p.waitForTimeout(250);
    rec('Filters panel', 'Reset clears every filter', (await p.locator('main tbody tr').count()) === all, 'rows not restored');
    errs = []; await go('contract-labor/closeout'); await p.locator('button[aria-label="Filters"]').click(); await p.waitForTimeout(250);
    await p.locator('[data-filter-panel] button[aria-pressed]:has-text("Execution")').first().click(); await p.locator('[data-filter-panel] button:has-text("Apply Filters")').click(); await p.waitForTimeout(250);
    const t = await p.textContent('main');
    rec('Filters panel', 'page-level filter (Close-out stage) works from the panel', !errs.length && /1 filter applied/.test(t) && !/Ready to close|Final settlement/.test((await p.locator('main tbody').textContent())), errs.join(' / ') || 'stage filter not applied');
  }
  // 6. supplier portal and public pages
  for (const h of ['#/supplier/login', '#/vendor-register', `#/vendor-quote/${st.rfqs[0].id}/${st.rfqs[0].vendorIds[0]}`]) {
    errs = []; await p.goto('about:blank'); await p.goto(file.split('#')[0] + h); await p.waitForTimeout(600);
    rec('Public page', h, !errs.length && (await p.textContent('body')).length > 100, errs.join(' / ') || 'blank');
  }
  fs.mkdirSync(__dirname + '/out', { recursive: true });
  fs.writeFileSync(__dirname + '/out/res-wire.json', JSON.stringify({ R }, null, 1));
  console.log(`\nwire: ${R.filter((r) => r.result === 'PASS').length} passed, ${R.filter((r) => r.result === 'FAIL').length} failed`);
  await b.close();
})();
