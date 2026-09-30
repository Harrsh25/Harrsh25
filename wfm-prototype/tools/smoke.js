// Smoke test: load built app, log in, visit every Vendor/Contractor route, fail on any page error.
const { chromium } = require('playwright-core');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../dist/NebullaOne-WFM.html');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(URL); await p.waitForTimeout(700);
  const i = await p.$$('input:not([type=checkbox])'); if (i.length >= 2) { await i[0].fill('demo'); await i[1].fill('demo'); await p.click('text=Sign In'); await p.waitForTimeout(700); }
  const o = await p.$$('text=Open'); if (o.length) { await o[0].click(); await p.waitForTimeout(700); }
  const routes = ['overview','registry','approvals','compliance','rfq','blanket-orders','purchase-orders','invoices','scorecard','portal','settings'].map(r=>'/productivity/vendor-management/'+r)
    .concat(['overview','onboarding','contracts','work-orders','attendance','measurement-book','ra-bills','retention','labor-rates','performance'].map(r=>'/productivity/contract-labor/'+r));
  for (const r of routes) { await p.evaluate(h => location.hash = h, r); await p.waitForTimeout(350);
    const t = await p.evaluate(() => (document.querySelector('main h1') || {}).innerText || 'NO H1'); console.log(r, '->', t); }
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO ERRORS');
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
