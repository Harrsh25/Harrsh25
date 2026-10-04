// Every create form: list leftover explanatory text (paragraphs / notes that are not field labels, inputs, buttons or errors)
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '../../NebullaOne-WFM.html');
const ROUTES = [...fs.readFileSync(path.resolve(__dirname, '../src/90-nav.jsx'), 'utf8').matchAll(/base: (\w+), path: "([^"]+)", label: "([^"]+)"/g)]
  .map((m) => ({ hash: `#${{ VM_BASE: '/productivity/vendor-management', CL_BASE: '/productivity/contract-labor', ADMIN_BASE: '/productivity/administration' }[m[1]]}/${m[2]}`, label: m[3] }));
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); p.setDefaultTimeout(2500);
  await p.goto(FILE + '#/productivity/'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('wfm-demo-user', JSON.stringify({ name: 'demo', email: 'demo@x' })); });
  const out = []; let forms = 0;
  for (const r of ROUTES) {
    await p.goto('about:blank'); await p.goto(FILE + r.hash); await p.waitForTimeout(300);
    const btns = await p.locator('main button').evaluateAll((els) => els.map((e, i) => [i, e.innerText.trim()]).filter(([, t]) => /^(New|Add|Register|Create|Record|Raise|Propose|Invite|Onboard)\b/.test(t)));
    for (const [i, t] of btns) {
      await p.goto('about:blank'); await p.goto(FILE + r.hash); await p.waitForTimeout(300);
      await p.locator('main button').nth(i).click().catch(() => {}); await p.waitForTimeout(300);
      const d = p.locator('[role=dialog]').last(); if (!(await d.count())) continue; forms++;
      const texts = await d.locator('[data-modal-body]').evaluate((root) => {
        const res = [];
        for (const el of root.querySelectorAll('p, div, span')) {
          if (el.closest('label, button, [role=combobox], table, [role=listbox]')) continue;
          const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
          if (own.length > 25 && !/text-red/.test(el.className)) res.push(own.slice(0, 90));
        }
        return [...new Set(res)];
      });
      if (texts.length) out.push(`${r.label} › "${t}": ${texts.join(' || ')}`);
    }
  }
  console.log(`audit-formtext: ${forms} forms — ${out.length} with explanatory text`); out.forEach((x) => console.log('TXT', x));
  await b.close();
})();
