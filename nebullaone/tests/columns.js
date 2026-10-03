// Customize Columns — dynamic tests 1–7 on every list in the app (run in Chromium)
// 1 exactly 5 default data columns · 2 open the panel · 3 enable a column (header + cells appear, header↔data aligned)
// 4 disable a default column · 5 Cancel discards changes · 6 choice persists after reload · 7 Reset restores the 5 defaults
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '../../NebullaOne-WFM.html');
const ROUTES = [...fs.readFileSync(path.resolve(__dirname, '../src/90-nav.jsx'), 'utf8').matchAll(/base: (\w+), path: "([^"]+)", label: "([^"]+)"/g)]
  .map((m) => ({ hash: `#${{ VM_BASE: '/productivity/vendor-management', CL_BASE: '/productivity/contract-labor', ADMIN_BASE: '/productivity/administration' }[m[1]]}/${m[2]}`, label: m[3] }))
  .concat(['Spend Authorization', 'Change Orders', 'RA Bills', 'Retention Releases', 'Labour Rates'].map((m) => ({ hash: `#/productivity/approvals/approval-management?module=${encodeURIComponent(m)}`, label: 'Approval Management / ' + m })));
(async () => {
  const b = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); p.setDefaultTimeout(3000);
  let errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto(FILE + '#/productivity/'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('wfm-demo-user', JSON.stringify({ name: 'demo', email: 'demo@x' })); });
  const go = async (hash) => { await p.goto('about:blank'); await p.goto(FILE + hash); await p.waitForTimeout(400); };
  const T = 'main table:has([aria-label="Customize columns"])';
  const heads = () => p.locator(T).first().evaluate((t) => [...t.querySelectorAll('thead th')].map((th) => th.innerText.trim()).filter((x) => x && !/^actions?$/i.test(x)));
  const aligned = () => p.locator(T).first().evaluate((t) => { const n = t.querySelectorAll('thead th').length; const rows = [...t.querySelectorAll('tbody tr')].filter((r) => r.querySelectorAll('td').length > 1); return rows.every((r) => r.querySelectorAll('td').length === n); });
  const panel = () => p.locator('aside[aria-label="Customize columns"]');
  const tabTo = async (tab) => { if (tab) { await p.locator('main [role=tab]').filter({ hasText: tab }).first().click(); await p.waitForTimeout(250); } };
  const R = []; let pass = 0, fail = 0;
  const rec = (list, id, ok, actual) => { R.push({ list, test: id, result: ok ? 'PASS' : 'FAIL', actual }); ok ? pass++ : fail++; if (!ok) console.log('FAIL', list, id, actual); };
  await go(ROUTES[0].hash);
  for (const r of ROUTES.filter((x) => !process.env.ONLY || x.label.includes(process.env.ONLY))) {
    await go(r.hash);
    const tabs = await p.locator('main [role=tab]').allInnerTexts();
    for (const tab of tabs.length ? tabs.map((t) => t.replace(/\s+\d+$/, '').trim()) : ['']) {
      await go(r.hash); await tabTo(tab);
      if (!(await p.locator(T).count())) continue;
      const list = r.label + (tab ? ' / ' + tab : '');
      await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('nxv-cols2:')).forEach((k) => localStorage.removeItem(k)));
      await go(r.hash); await tabTo(tab);
      try {
        const d = await heads(); rec(list, '1 five defaults', d.length === 5, d.join(' · '));
        await p.locator(T).first().locator('[aria-label="Customize columns"]').click();
        const open = await panel().isVisible(); rec(list, '2 open panel', open, open ? 'panel open' : 'no panel');
        const sw = panel().locator('[role=switch]'); const n = await sw.count();
        let enabled = null; const offIdx = (await sw.evaluateAll((e) => e.map((x) => x.getAttribute('aria-checked')))).indexOf('false');
        if (offIdx < 0) { rec(list, '3 enable', true, 'every column is already a default (exactly 5 data columns)'); await panel().getByRole('button', { name: 'Cancel' }).click(); await p.waitForTimeout(100); }
        else {
          enabled = await sw.nth(offIdx).getAttribute('aria-label'); await sw.nth(offIdx).click(); await panel().getByRole('button', { name: 'Apply' }).click(); await p.waitForTimeout(150);
          const h2 = await heads(); rec(list, '3 enable + header↔data', h2.includes(enabled) && (await aligned()), `${enabled} → ${h2.length} cols, aligned ${await aligned()}`);
        }
        // 4 disable a default column (second switch that is on)
        await p.locator(T).first().locator('[aria-label="Customize columns"]').click();
        const onIdx = (await sw.evaluateAll((e) => e.map((x) => [x.getAttribute('aria-checked'), x.getAttribute('aria-label')]))).findIndex(([c, l]) => c === 'true' && l !== enabled);
        const offName = await sw.nth(onIdx).getAttribute('aria-label'); await sw.nth(onIdx).click(); await panel().getByRole('button', { name: 'Apply' }).click(); await p.waitForTimeout(150);
        const h3 = await heads(); rec(list, '4 disable', !h3.includes(offName) && (await aligned()), `${offName} hidden → ${h3.join(' · ')}`);
        // 5 cancel
        await p.locator(T).first().locator('[aria-label="Customize columns"]').click(); await sw.nth(0).click(); await panel().getByRole('button', { name: 'Cancel' }).click(); await p.waitForTimeout(100);
        const h4 = await heads(); rec(list, '5 cancel', JSON.stringify(h4) === JSON.stringify(h3), h4.join(' · '));
        // 6 persistence
        await go(r.hash); await tabTo(tab); const h5 = await heads(); rec(list, '6 persists after reload', JSON.stringify(h5) === JSON.stringify(h3), h5.join(' · '));
        // 7 reset
        await p.locator(T).first().locator('[aria-label="Customize columns"]').click(); await panel().getByRole('button', { name: 'Reset' }).click(); await panel().getByRole('button', { name: 'Apply' }).click(); await p.waitForTimeout(150);
        const h6 = await heads(); rec(list, '7 reset to defaults', JSON.stringify(h6) === JSON.stringify(d), h6.join(' · '));
        rec(list, '8 panel lists every column', n + 1 >= d.length, `${n} switchable + 1 fixed`);
      } catch (e) { rec(list, 'error', false, e.message.split('\n')[0] + ' @ ' + (R.filter((x) => x.list === list).pop() || {}).test); await p.screenshot({ path: __dirname + '/out/col-err.png' }); await p.keyboard.press('Escape').catch(() => {}); }
      if (errs.length) { rec(list, 'console', false, errs.join(' | ')); errs = []; }
    }
  }
  fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true }); fs.writeFileSync(path.join(__dirname, 'out/res-columns.json'), JSON.stringify(R, null, 1));
  const lists = [...new Set(R.map((x) => x.list))]; console.log(`\ncolumns: ${lists.length} lists, ${pass} passed, ${fail} failed`);
  R.filter((x) => x.test === '1 five defaults').forEach((x) => console.log(x.result, x.list, '|', x.actual));
  await b.close();
})();
