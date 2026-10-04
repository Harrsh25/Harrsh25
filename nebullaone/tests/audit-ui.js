// Frontend audit of every earlier request, on every page and the first record panel of each list.
// Runs on OLD-style saved data (long dashes, no worker details / subcontracts) to prove migration works.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '../../NebullaOne-WFM.html');
const ROUTES = [...fs.readFileSync(path.resolve(__dirname, '../src/90-nav.jsx'), 'utf8').matchAll(/base: (\w+), path: "([^"]+)", label: "([^"]+)"/g)]
  .map((m) => ({ hash: `#${{ VM_BASE: '/productivity/vendor-management', CL_BASE: '/productivity/contract-labor', ADMIN_BASE: '/productivity/administration' }[m[1]]}/${m[2]}`, label: m[3] }));
const BANNED = [[/—/, 'long dash —'], [/\binsurance\b/i, 'insurance'], [/Acting as/, '"Acting as" switcher'], [/Background check/i, 'background check'], [/Save & send to vendor/, '"Save & send to vendor"'], [/Quick regist/i, 'quick register'], [/Notes & communication/, 'Notes & communication card'], [/Approval checklist/i, 'approval checklist'], [/Saved views?/i, 'saved views'], [/Group by/i, 'group-by']];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); p.setDefaultTimeout(3000);
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(FILE + '#/productivity/'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('wfm-demo-user', JSON.stringify({ name: 'demo', email: 'demo@x' })); });
  await p.goto(FILE + '#/productivity/vendor-management/registry'); await p.waitForTimeout(600);
  await p.locator('tr:has-text("Konkan Steel") button[title*="preferred" i]').click(); await p.waitForTimeout(100);
  // make it look like data saved by an older file
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('nxv-store-v1')); let t = JSON.stringify(s).replace(/ - /g, ' — ');
    const o = JSON.parse(t); o.workers.forEach((w) => { delete w.idRef; delete w.uan; delete w.esic; delete w.medicalValidTill; delete w.certificates; }); o.contracts.forEach((c) => delete c.subcontracts); localStorage.setItem('nxv-store-v1', JSON.stringify(o)); });
  const out = [];
  // a column whose cells hold text or buttons must have a header
  const headless = async (scope) => p.locator(scope).evaluate((root) => {
    const out = [];
    for (const t of root.querySelectorAll('table')) {
      const ths = [...t.querySelectorAll('thead tr:first-child th')]; const rows = [...t.querySelectorAll('tbody tr')];
      ths.forEach((th, i) => {
        if (th.innerText.trim() || th.querySelector('input,button,svg')) return;
        const filled = rows.some((r) => { const td = r.children[i]; return td && (td.innerText.trim() || td.querySelector('button')) && !td.querySelector('input[type=checkbox]'); });
        if (filled) out.push(`column ${i + 1} of "${(ths[0]?.innerText || '').trim()}" table`);
      });
    }
    return out;
  }).catch(() => []);
  const check = async (where) => {
    const t = await p.locator('body').innerText();
    for (const [re, name] of BANNED) if (re.test(t)) out.push(`${where}: ${name} — "${(t.match(new RegExp(`.{0,30}${re.source}.{0,20}`, re.flags)) || [''])[0].replace(/\n/g, ' ')}"`);
  };
  for (const r of ROUTES) {
    await p.goto('about:blank'); await p.goto(FILE + r.hash); await p.waitForTimeout(350);
    await check(r.label);
    for (const x of await headless('main')) out.push(`${r.label}: no header on ${x}`);
    const head = await p.locator('main table thead').first().innerText().catch(() => '');
    if (/(^|\n|\t)\s*ID\s*($|\n|\t)/.test(head)) out.push(`${r.label}: ID column on list`);
    if (await p.locator('main table tbody tr button[aria-label*="More" i], main table tbody tr button:has-text("⋯")').count()) out.push(`${r.label}: ⋯ menu on list rows`);
    const row = p.locator('main table tbody tr.cursor-pointer').first();
    if (await row.count()) {
      await row.click().catch(() => {}); await p.waitForTimeout(350);
      const d = p.locator('[data-drawer]');
      if (await d.count()) {
        await check(`${r.label} › panel`);
        for (const x of await headless('[data-drawer]')) out.push(`${r.label} › panel: no header on ${x}`);
        const tabs = await d.locator('[role=tab]').allInnerTexts();
        const counted = tabs.filter((x) => /\s\d+\s*$/.test(x.trim()) && !/360$/.test(x.trim()));
        if (counted.length) out.push(`${r.label} › panel: tab counts ${counted.join(', ')}`);
        if (await d.locator('button:has-text("More")').count()) out.push(`${r.label} › panel: "More" tab menu`);
        // header: only title, ID, status (and action buttons)
        const h = d.locator('.nx-dhead').first(); const all = (await h.innerText()).split('\n').map((x) => x.trim()).filter(Boolean);
        const btns = (await h.locator('button').allInnerTexts()).map((x) => x.trim()).filter(Boolean);
        const title = (await h.locator('h2').innerText()).trim(); const extra = all.filter((x) => x !== title && !btns.includes(x) && !/^[A-Z]{2,4}-[\w-]+$/.test(x));
        if (extra.length > 1) out.push(`${r.label} › panel header has extra text: ${extra.join(' | ')}`);
        // previous / next cycle
        const rows = await p.locator('main table tbody tr.cursor-pointer').count();
        if (rows > 1 && (await d.locator('button[title="Previous record"]').isDisabled().catch(() => true))) out.push(`${r.label} › panel: previous arrow disabled on first row (no cycle)`);
      }
    }
  }
  const s = await p.evaluate(() => JSON.parse(localStorage.getItem('nxv-store-v1')));
  if (JSON.stringify(s).includes('—')) out.push('saved data still has long dashes');
  if (!s.workers.every((w) => w.idRef)) out.push('old saved workers not migrated');
  if (!s.contracts.find((c) => c.id === 'CTR-001').subcontracts) out.push('old saved contracts missing subcontracts');
  console.log(`audit-ui: ${ROUTES.length} pages checked — ${out.length} finding(s)`); out.forEach((x) => console.log('FIND', x));
  if (errs.length) console.log('PAGEERR', [...new Set(errs)].join(' | '));
  await b.close();
})();
