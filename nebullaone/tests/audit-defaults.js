// Every "create" form opened from a page header: which dropdowns open with a value already picked?
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '../../NebullaOne-WFM.html');
const ROUTES = [...fs.readFileSync(path.resolve(__dirname, '../src/90-nav.jsx'), 'utf8').matchAll(/base: (\w+), path: "([^"]+)", label: "([^"]+)"/g)]
  .map((m) => ({ hash: `#${{ VM_BASE: '/productivity/vendor-management', CL_BASE: '/productivity/contract-labor', ADMIN_BASE: '/productivity/administration' }[m[1]]}/${m[2]}`, label: m[3] }));
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); p.setDefaultTimeout(2500);
  await p.goto(FILE + '#/productivity/'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('wfm-demo-user', JSON.stringify({ name: 'demo', email: 'demo@x' })); });
  const found = []; let forms = 0;
  for (const r of ROUTES) {
    await p.goto('about:blank'); await p.goto(FILE + r.hash); await p.waitForTimeout(350);
    const btns = await p.locator('main button').evaluateAll((els) => els.map((e, i) => [i, e.innerText.trim()]).filter(([, t]) => /^(New|Add|Register|Create|Record|Raise|Propose|Invite|Onboard)\b/.test(t)));
    for (const [i, t] of btns) {
      await p.goto('about:blank'); await p.goto(FILE + r.hash); await p.waitForTimeout(300);
      await p.locator('main button').nth(i).click().catch(() => {}); await p.waitForTimeout(300);
      const d = p.locator('[role=dialog]').last(); if (!(await d.count())) continue; forms++;
      const pre = await d.locator('[role=combobox]').evaluateAll((els) => els.filter((e) => e.getAttribute('data-value') && !e.disabled).map((e) => `${e.getAttribute('aria-label') || '?'}=${e.getAttribute('data-value')}`));
      if (pre.length) found.push(`${r.label} › "${t}": ${pre.join(' | ')}`);
      const dash = await d.locator('[role=combobox]').evaluateAll((els) => els.map((e) => e.innerText.trim()).filter((x) => /^[-–—]|^Select$/.test(x)));
      if (dash.length) found.push(`${r.label} › "${t}": dash/bare placeholder ${dash.join(' | ')}`);
    }
    // forms opened from inside a record (first row's panel)
    await p.goto('about:blank'); await p.goto(FILE + r.hash); await p.waitForTimeout(300);
    const row = p.locator('main tbody tr').first(); if (!(await row.count())) continue;
    await row.click().catch(() => {}); await p.waitForTimeout(350);
    const dr = p.locator('[role=dialog]').last(); if (!(await dr.count())) continue;
    const inner = await dr.locator('button').evaluateAll((els) => els.map((e, i) => [i, e.innerText.trim()]).filter(([, t]) => /^(New|Add|Register|Create|Record|Raise|Propose|Invite|Onboard|Request|Place|Issue|Deploy|Log)\b/.test(t)));
    for (const [i, t] of inner) {
      await p.goto('about:blank'); await p.goto(FILE + r.hash); await p.waitForTimeout(300);
      await p.locator('main tbody tr').first().click().catch(() => {}); await p.waitForTimeout(350);
      const before = await p.locator('[role=dialog]').count();
      await p.locator('[role=dialog]').last().locator('button').nth(i).click().catch(() => {}); await p.waitForTimeout(300);
      if ((await p.locator('[role=dialog]').count()) <= before) continue;
      const d = p.locator('[role=dialog]').last(); forms++;
      const pre = await d.locator('[role=combobox]').evaluateAll((els) => els.filter((e) => e.getAttribute('data-value') && !e.disabled).map((e) => `${e.getAttribute('aria-label') || '?'}=${e.getAttribute('data-value')}`));
      if (pre.length) found.push(`${r.label} › record › "${t}": ${pre.join(' | ')}`);
      const dash = await d.locator('[role=combobox]').evaluateAll((els) => els.map((e) => e.innerText.trim()).filter((x) => /^[-–—]|^Select$/.test(x)));
      if (dash.length) found.push(`${r.label} › record › "${t}": dash/bare placeholder ${dash.join(' | ')}`);
    }
  }
  console.log(`audit-defaults: ${forms} create forms opened — ${found.length} with pre-selected dropdowns`); found.forEach((x) => console.log('PRE', x));
  await b.close();
})();
