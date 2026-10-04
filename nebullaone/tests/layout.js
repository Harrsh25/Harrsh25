// Layout check - every page header and every list's first record panel at 1920 / 1440 / 1280 px:
// title cut off, details squeezed into a narrow column, buttons pushed past the edge.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '../../NebullaOne-WFM.html');
const ROUTES = [...fs.readFileSync(path.resolve(__dirname, '../src/90-nav.jsx'), 'utf8').matchAll(/base: (\w+), path: "([^"]+)", label: "([^"]+)"/g)]
  .map((m) => ({ hash: `#${{ VM_BASE: '/productivity/vendor-management', CL_BASE: '/productivity/contract-labor', ADMIN_BASE: '/productivity/administration' }[m[1]]}/${m[2]}`, label: m[3] }));
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const bad = []; let n = 0;
  for (const W of [1920, 1440, 1280]) {
    const p = await b.newPage({ viewport: { width: W, height: 880 } });
    await p.goto(FILE + '#/productivity/'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('wfm-demo-user', JSON.stringify({ name: 'd', email: 'd@x' })); });
    const check = (scope) => p.evaluate((sel) => {
      const R = document.querySelector(sel); if (!R) return null; const out = [];
      const rr = R.getBoundingClientRect();
      const t = R.querySelector('h1,h2'); if (t && (t.scrollWidth > t.clientWidth + 1 || t.scrollHeight > t.clientHeight + 2)) out.push(`title cut: "${t.innerText.slice(0, 40)}" (${t.clientWidth}px of ${t.scrollWidth})`);
      const head = sel === 'main' ? R.querySelector('h1')?.closest('div')?.parentElement : R.querySelector('.nx-dhead');
      if (head) {
        const sub = head.querySelector('.mt-2, p'); if (sub && sub.getBoundingClientRect().height > 60 && sub.getBoundingClientRect().width < 300) out.push(`details squeezed: ${Math.round(sub.getBoundingClientRect().width)}px wide, ${Math.round(sub.getBoundingClientRect().height)}px tall`);
        head.querySelectorAll('button').forEach((x) => { const r = x.getBoundingClientRect(); if (r.width && (r.right > rr.right + 1 || x.scrollWidth > x.clientWidth + 2)) out.push(`button cut / outside: "${x.innerText.trim().slice(0, 30)}"`); });
      }
      return out;
    }, scope);
    for (const r of ROUTES) {
      await p.goto('about:blank'); await p.goto(FILE + r.hash); await p.waitForTimeout(350);
      const tabs = await p.locator('main [role=tab]').count();
      for (let t = 0; t < Math.max(1, tabs); t++) {
        if (t) { await p.goto('about:blank'); await p.goto(FILE + r.hash); await p.waitForTimeout(350); }
        if (tabs) { const tb = p.locator('main [role=tab]').nth(t); if (!(await tb.count())) continue; await tb.click({ timeout: 2000 }).catch(() => {}); await p.waitForTimeout(200); }
        const tn = tabs ? (await p.locator('main [role=tab]').nth(t).innerText().catch(() => '')).replace(/\s+\d+$/, '') : '';
        const m = await check('main'); n++; if (m && m.length) bad.push([W, r.label + ' page', ...m]);
        const row = p.locator('main table tbody tr.cursor-pointer').first();
        if (await row.count()) { await row.click().catch(() => {}); await p.waitForTimeout(350);
          if (await p.locator('[data-drawer]').count()) { const d = await check('[data-drawer]'); n++; if (d && d.length) bad.push([W, `${r.label}${tn ? ' / ' + tn : ''} › record`, ...d]); }
          await p.keyboard.press('Escape'); await p.waitForTimeout(120); }
      }
    }
    await p.close();
  }
  console.log(`layout: ${n} headers checked, ${bad.length} problems`); bad.forEach((x) => console.log(x.join(' | ')));
  fs.writeFileSync(path.join(__dirname, 'out/res-layout.json'), JSON.stringify(bad, null, 1));
  await b.close();
})();
