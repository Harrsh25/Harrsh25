// Shared test harness for the fix-loop suites
const pick = require('./pick'); const { chromium } = require('playwright');
module.exports = async function run(name, body) {
  require('fs').mkdirSync(__dirname + '/out', { recursive: true });
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : require('fs').existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); p.setDefaultTimeout(4000);
  const errs = []; p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message));
  const file = 'file://' + require('path').resolve(__dirname, '../../NebullaOne-WFM.html'); const base = file + '#/productivity/';
  await p.goto(base); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('wfm-demo-user', JSON.stringify({ name: 'demo', email: 'demo@x' })); });
  const go = async (x) => { await p.goto('about:blank'); await p.goto(x.startsWith('#') ? file + x : base + x); await p.waitForTimeout(400); };
  const dlg = () => p.locator('[role=dialog]').last();
  const S = () => p.evaluate(() => JSON.parse(localStorage.getItem('nxv-store-v1')));
  const mut = async (fn) => { await p.evaluate(`(()=>{const s=JSON.parse(localStorage.getItem('nxv-store-v1'));(${fn})(s);localStorage.setItem('nxv-store-v1',JSON.stringify(s));})()`); };
  const as = async (who) => { await p.evaluate((n) => { n ? localStorage.setItem('nxv-actor', n) : localStorage.removeItem('nxv-actor'); }, who); };
  const toastText = async () => (await p.locator('.pointer-events-none.fixed').last().textContent().catch(() => '')) || '';
  const R = []; let pass = 0, fail = 0;
  const T = async (id, scn, fn) => {
    try { const [actual, ok] = await fn(); R.push({ id, scn, actual, result: ok ? 'PASS' : 'FAIL' }); ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + id, scn, '→', actual); }
    catch (e) { R.push({ id, scn, actual: 'Test error: ' + e.message.split('\n')[0], result: 'ERROR' }); fail++; console.log('ERROR', id, scn, '→', e.message.split('\n')[0]); await p.screenshot({ path: `${__dirname}/out/err-${id}.png` }).catch(() => {}); }
  };
  // make the store persist (it only saves after a mutation)
  await go('vendor-management/registry'); const s = p.locator('tr:has-text("Konkan Steel") button[title*="preferred" i]'); await s.click(); await p.waitForTimeout(80); await s.click(); await p.waitForTimeout(80);
  await body({ p, go, dlg, S, mut, as, T, pick: (c, v) => pick(p, c, v), toastText });
  console.log(`\n${name}: ${pass} passed, ${fail} failed${errs.length ? '\n' + errs.join('\n') : ''}`);
  require('fs').writeFileSync(`${__dirname}/out/res-${name}.json`, JSON.stringify({ R, errs }, null, 1));
  await b.close();
};
