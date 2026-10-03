// Table audit — on every list in the app: search (match + no-match empty state + Esc), sort, Filters panel
// (apply + reset), Export (CSV headers = visible headers), layouts, paging; console errors. Runs in Chromium.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '../../NebullaOne-WFM.html');
const ROUTES = [...fs.readFileSync(path.resolve(__dirname, '../src/90-nav.jsx'), 'utf8').matchAll(/base: (\w+), path: "([^"]+)", label: "([^"]+)"/g)]
  .map((m) => ({ hash: `#${{ VM_BASE: '/productivity/vendor-management', CL_BASE: '/productivity/contract-labor', ADMIN_BASE: '/productivity/administration' }[m[1]]}/${m[2]}`, label: m[3] }))
  .concat(['Spend Authorization', 'Change Orders', 'RA Bills'].map((m) => ({ hash: `#/productivity/approvals/approval-management?module=${encodeURIComponent(m)}`, label: 'Approval Management / ' + m })));
(async () => {
  const b = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true }); const p = await ctx.newPage(); p.setDefaultTimeout(3000);
  let errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto(FILE + '#/productivity/'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('wfm-demo-user', JSON.stringify({ name: 'demo', email: 'demo@x' })); });
  const go = async (hash) => { await p.goto('about:blank'); await p.goto(FILE + hash); await p.waitForTimeout(400); };
  const T = 'main table:has([aria-label="Customize columns"])';
  const rowsN = async () => ((await p.locator(T).count()) ? p.locator(T).first().locator('tbody tr').evaluateAll((rs) => rs.filter((r) => r.querySelectorAll('td').length > 1).length) : 0);
  const tabTo = async (tab) => { if (tab) { await p.locator('main [role=tab]').filter({ hasText: tab }).first().click(); await p.waitForTimeout(250); } };
  const R = []; let pass = 0, fail = 0;
  const rec = (list, id, ok, actual) => { R.push({ list, test: id, result: ok === null ? 'N/A' : ok ? 'PASS' : 'FAIL', actual }); if (ok === null) return; ok ? pass++ : fail++; if (!ok) console.log('FAIL', list, id, actual); };
  await go(ROUTES[0].hash);
  for (const r of ROUTES) {
    await go(r.hash);
    const tabs = (await p.locator('main [role=tab]').allInnerTexts()).map((t) => t.replace(/\s+\d+$/, '').trim());
    for (const tab of tabs.length ? tabs : ['']) {
      await go(r.hash); await tabTo(tab);
      if (!(await p.locator(T).count())) continue;
      const list = r.label + (tab ? ' / ' + tab : '');
      try {
        const n0 = await rowsN();
        // search: a word from the first row narrows the list; nonsense shows the empty state; Esc restores
        const word = n0 ? ((await p.locator(T).first().locator('tbody tr').first().locator('td').first().innerText()).match(/[A-Za-z][A-Za-z0-9&.-]{3,}/) || [''])[0] : '';
        await p.locator('main button[aria-label="Search"]').first().click(); await p.waitForTimeout(100);
        const inp = p.locator('[data-searchbar] input').first();
        if (word) { await inp.fill(word); await p.waitForTimeout(150); const n1 = await rowsN(); rec(list, 'search match', n1 >= 1 && n1 <= n0, `"${word}" → ${n1}/${n0}`); }
        await inp.fill('zzqqxx'); await p.waitForTimeout(150); const n2 = await rowsN(); const emptyTxt = ((await p.locator(T).count()) ? await p.locator(T).first().locator('tbody').innerText() : await p.locator('main .shadow-card').first().innerText()).replace(/\s+/g, ' ').match(/(No [^.]*|Nothing[^.]*|0 [a-z]+[^.]*)/i)?.[0] || '';
        rec(list, 'search no-match → empty state', n2 === 0 && emptyTxt.length > 0, `rows ${n2}; "${emptyTxt.slice(0, 50)}"`);
        await p.keyboard.press('Escape'); await p.waitForTimeout(150); rec(list, 'search Esc clears', (await rowsN()) === n0, `${await rowsN()}/${n0}`);
        // sort: first sortable header toggles asc → desc
        const th = p.locator(T).first().locator('thead th button[aria-label^="Sort by"]').first();
        if (n0 > 1 && (await th.count())) {
          const first = async () => (await p.locator(T).first().locator('tbody tr').first().innerText()).slice(0, 40);
          const a0 = await first(); await th.click(); await p.waitForTimeout(100); const a1 = await first(); await th.click(); await p.waitForTimeout(100); const a2 = await first();
          rec(list, 'sort asc/desc', (await rowsN()) === n0 && (a1 !== a2 || a0 === a1), `${a1.split('\n')[0]} ↔ ${a2.split('\n')[0]}`);
        } else rec(list, 'sort asc/desc', null, n0 > 1 ? 'no sortable column' : 'fewer than 2 rows');
        // filters panel
        const fb = p.locator('main button[aria-label="Filters"]').first();
        if (await fb.count()) {
          await fb.click(); await p.waitForTimeout(200); const panel = p.locator('[data-filter-panel]');
          const chip = panel.locator('button[aria-pressed="false"]').first();
          if (await chip.count()) {
            const label = (await chip.innerText()).trim(); await chip.click(); await panel.locator('button:has-text("Apply Filters")').click(); await p.waitForTimeout(150);
            const n3 = await rowsN(); rec(list, 'filter apply', n3 <= n0, `"${label}" → ${n3}/${n0}`);
            await fb.click(); await p.waitForTimeout(150); await p.locator('[data-filter-panel] button:has-text("Reset")').click(); await p.waitForTimeout(150);
            rec(list, 'filter reset', (await rowsN()) === n0, `${await rowsN()}/${n0}`);
          } else { rec(list, 'filter apply', null, 'no chip filters (dropdown/date only)'); await p.keyboard.press('Escape'); }
        } else rec(list, 'filter apply', null, 'no filters on this list');
        // export: CSV header row = visible headers
        const heads = await p.locator(T).first().evaluate((t) => [...t.querySelectorAll('thead th')].map((x) => x.innerText.trim()).filter(Boolean));
        const ex = p.locator('main button[aria-label="Export"]').first();
        if (await ex.count()) {
          const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 3000 }), ex.click()]);
          const csv = fs.readFileSync(await dl.path(), 'utf8').replace(/^﻿/, ''); const lines = csv.split(/\r\n/);
          const hdr = lines[0].split(',').map((x) => x.replace(/^"|"$/g, ''));
          rec(list, 'export CSV', JSON.stringify(hdr) === JSON.stringify(heads) && lines.length - 1 === n0, `${dl.suggestedFilename()}: ${hdr.length} cols, ${lines.length - 1} rows`);
        } else rec(list, 'export CSV', false, 'no Export button');
        // layouts
        const lay = p.locator('main [role=group][aria-label="Layout"] button');
        const nl = await lay.count(); let lok = true;
        for (let i = 1; i < nl; i++) { await lay.nth(i).click(); await p.waitForTimeout(150); } if (nl) { await lay.nth(0).click(); await p.waitForTimeout(150); lok = (await rowsN()) === n0; }
        rec(list, 'layouts (list/board/calendar)', nl ? lok && !errs.length : null, `${nl} layouts`);
      } catch (e) { rec(list, 'error', false, e.message.split('\n')[0]); await p.keyboard.press('Escape').catch(() => {}); }
      if (errs.length) { rec(list, 'console', false, errs.join(' | ')); errs = []; }
    }
  }
  // paging: a long list shows a pager and page size
  await go('#/productivity/vendor-management/registry'); const star = p.locator('tr:has-text("Konkan Steel") button[title*="preferred" i]'); await star.click(); await p.waitForTimeout(80); await star.click(); await p.waitForTimeout(80);
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('nxv-store-v1')); for (let i = 0; i < 80; i++) s.audit.push({ at: new Date(Date.now() - i * 6e4).toISOString(), by: 'Load test', entity: 'Vendor', id: 'VEN-001', action: 'Paging check ' + i }); localStorage.setItem('nxv-store-v1', JSON.stringify(s)); });
  await go('#/productivity/administration/audit-log'); const n = await rowsN(); const pager = await p.locator('main [aria-label="Rows per page"]').count();
  rec('Audit Log', 'paging (80+ rows)', n <= 50 && pager > 0, `${n} rows on page 1; pager ${pager > 0}`);
  fs.writeFileSync(path.join(__dirname, 'out/res-tables.json'), JSON.stringify(R, null, 1));
  console.log(`\ntables: ${new Set(R.map((x) => x.list)).size} lists, ${pass} passed, ${fail} failed, ${R.filter((x) => x.result === 'N/A').length} N/A`);
  await b.close();
})();
