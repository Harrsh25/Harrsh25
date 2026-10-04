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
  // forms open with nothing pre-selected: pick the first option in every empty required dropdown (and tick a supply type)
  const fill = async (scope, skip = [], noTypes = false) => {
    const sc = scope || dlg();
    const types = sc.locator('button[role=checkbox]'); if (!noTypes && (await types.count()) && !(await sc.locator('button[role=checkbox][aria-checked=true]').count())) await types.first().click().catch(() => {});
    for (let n = 0; n < 25; n++) {
      const boxes = sc.locator('label:has(> span > span.text-red-500) [role=combobox][data-value=""]:not([disabled])');
      let i = 0, c = await boxes.count(); while (i < c && skip.includes(await boxes.nth(i).getAttribute('aria-label'))) i++;
      if (i >= c) break;
      const boxEl = boxes.nth(i); await boxEl.click(); await p.waitForTimeout(60);
      const PREF = { Country: 'India', Currency: 'INR', 'Supplier type': 'Company', 'Payment terms': 'Net 30', 'Supplier tier': 'Approved', 'Registration tier': 'Spend Authorized', Project: 'Skyline Towers', 'Sourcing mode': 'Multiple Vendors', 'Bill control': 'On received quantity', 'Contract type': 'Item-Rate', 'GST (%)': '18', Trade: 'Mason', Skill: 'Skilled', 'Labour type': 'Skilled', 'ID proof': 'Aadhaar', Company: 'NebullaOne Infra', 'Request purpose / type': 'Purchase', Type: 'Mobilisation advance', 'Skill category': 'Skilled', 'GST %': '18', 'Payment mode': 'NEFT', Severity: 'Major', 'Guarantee type': 'Performance', Category: 'Quality' };
      const lab = await boxEl.getAttribute('aria-label'); const want = PREF[lab];
      let opt = want ? p.locator('[role=listbox] [role=option]').filter({ hasText: want }).first() : null;
      if (!opt || !(await opt.count())) opt = p.locator('[role=listbox] [role=option]').filter({ hasNotText: /^(Select|Select…|-|Unit)$/ }).first();
      if (await opt.count()) await opt.click(); else await p.keyboard.press('Escape');
      await p.waitForTimeout(60);
    }
  };
  // a save button that is disabled only because a required dropdown is still empty: pick it first, as a user would
  const LP = Object.getPrototypeOf(p.locator('body')), lclick = LP.click;
  LP.click = async function (opts) {
    try {
      if ((await this.count()) === 1 && (await this.evaluate((el) => el.tagName === 'BUTTON' && el.disabled))) {
        const inDlg = await this.evaluate((el) => !!el.closest('[role=dialog]'));
        await fill(inDlg ? dlg() : p.locator('main, body').first(), [], !inDlg);
      }
    } catch (e) {}
    return lclick.call(this, opts);
  };
  const pclick = p.click.bind(p); p.click = (sel, opts) => p.locator(sel).first().click(opts);
  await body({ p, go, dlg, S, mut, as, T, pick: (c, v) => pick(p, c, v), toastText, fill });
  console.log(`\n${name}: ${pass} passed, ${fail} failed${errs.length ? '\n' + errs.join('\n') : ''}`);
  require('fs').writeFileSync(`${__dirname}/out/res-${name}.json`, JSON.stringify({ R, errs }, null, 1));
  await b.close();
};
