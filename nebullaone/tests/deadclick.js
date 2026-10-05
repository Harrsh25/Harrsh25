// Click audit: every page, its first record drawer, every drawer tab, every header / ⋯ action and every page button.
// Flags page errors, console errors, buttons that change nothing on screen (dead), and disabled buttons with no reason.
// Output: tests/out/deadclick.json
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '../../NebullaOne-WFM.html');
const ROUTES = [...fs.readFileSync(path.resolve(__dirname, '../src/90-nav.jsx'), 'utf8').matchAll(/base: (\w+), path: "([^"]+)", label: "([^"]+)"/g)]
  .map((m) => ({ hash: `#${{ VM_BASE: '/productivity/vendor-management', CL_BASE: '/productivity/contract-labor', ADMIN_BASE: '/productivity/administration' }[m[1]]}/${m[2]}`, label: m[3] }));
const ONLY = process.argv[2] ? new RegExp(process.argv[2], 'i') : null;
const SKIP = /^(Close|Cancel|×|)$/;

(async () => {
  const b = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage(); p.setDefaultTimeout(2500);
  ctx.on('page', (np) => np.close().catch(() => {}));
  let errs = []; p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); p.on('console', (m) => m.type() === 'error' && !/favicon|ERR_FILE_NOT_FOUND|net::/.test(m.text()) && errs.push('CONSOLE ' + m.text()));
  await p.goto(FILE + '#/productivity/'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('wfm-demo-user', JSON.stringify({ name: 'demo', email: 'demo@x' })); });
  const go = async (hash) => { await p.goto('about:blank'); await p.goto(FILE + hash); await p.waitForTimeout(350); };
  const snap = () => p.evaluate(() => document.body.innerHTML.length + ':' + document.body.innerText.length + ':' + document.querySelectorAll('[role=dialog],[data-drawer],[role=menu],[role=listbox]').length + ':' + document.querySelectorAll('.pointer-events-none.fixed *').length);
  let tried = 0; const tally = {}; const F = []; const add = (route, where, what, kind, detail) => F.push({ route, where, what, kind, detail });
  const tryClick = async (route, where, loc, label, reopen) => {
    tried++; tally[where] = (tally[where] || 0) + 1;
    try {
      if (await loc.isDisabled()) { const t = await loc.getAttribute('title'); if (!t) add(route, where, label, 'disabled-no-reason', ''); return; }
      const e0 = errs.length, s0 = await snap(); const u0 = p.url();
      await loc.click({ timeout: 2000 }); await p.waitForTimeout(260);
      const s1 = await snap();
      if (errs.length > e0) add(route, where, label, 'error', errs.slice(e0).join(' | ').slice(0, 300));
      else if (s0 === s1 && p.url() === u0) add(route, where, label, 'dead', 'no visible change');
    } catch (e) { add(route, where, label, 'click-failed', e.message.split('\n')[0].slice(0, 160)); }
    await p.keyboard.press('Escape').catch(() => {}); await p.waitForTimeout(80);
    if (reopen) await reopen();
  };
  const rowsOf = () => p.locator('main table tbody tr').filter({ hasNot: p.locator('td[colspan]') });

  for (const r of ROUTES) {
    if (ONLY && !ONLY.test(r.label)) continue;
    errs = []; await go(r.hash);
    const txt = await p.locator('body').innerText();
    if (/doesn't exist|404/.test(txt.slice(0, 200))) { add(r.label, 'page', '', 'broken-route', r.hash); continue; }
    if (errs.length) add(r.label, 'page', 'load', 'error', errs.join(' | ').slice(0, 300));
    // page tabs
    const ptabs = await p.locator('main [role=tab]').allInnerTexts();
    for (const t of ptabs) await tryClick(r.label, 'page tab', p.locator('main [role=tab]').filter({ hasText: t }).first(), t, null);
    // page buttons (toolbar and header, not rows / table chrome)
    await go(r.hash);
    const pbtn = await p.locator('main > * button:visible').evaluateAll((xs) => xs.filter((x) => !x.closest('table,[role=tablist],[data-quick-filter],[data-searchbar],thead')).map((x) => { const t = (x.innerText || '').trim(); return t ? { t, sel: null } : x.title ? { t: x.title, sel: `main button[title="${x.title}"]` } : x.getAttribute('aria-label') ? { t: x.getAttribute('aria-label'), sel: `main button[aria-label="${x.getAttribute('aria-label')}"]` } : null; }).filter(Boolean));
    const seen = new Set();
    for (const x of pbtn.filter((x) => !SKIP.test(x.t) && !/^(List|Search)$/.test(x.t) && !seen.has(x.t) && seen.add(x.t)).slice(0, 16)) await tryClick(r.label, 'page button', x.sel ? p.locator(x.sel).first() : p.locator('main button:visible').filter({ hasText: x.t }).first(), x.t, () => go(r.hash));
    // first record drawer
    await go(r.hash);
    const n = await rowsOf().count(); if (!n) continue;
    const openRow = async () => { await go(r.hash); await rowsOf().first().click({ timeout: 2000 }).catch(() => {}); await p.waitForTimeout(350); };
    await openRow(); const dr = p.locator('[data-drawer]').last();
    if (!(await dr.count())) continue;
    const dtabs = await dr.locator('[role=tab]').allInnerTexts();
    for (const t of dtabs) { const e0 = errs.length; await dr.locator('[role=tab]').filter({ hasText: t }).first().click().catch(() => {}); await p.waitForTimeout(200); if (errs.length > e0) add(r.label, 'drawer tab', t, 'error', errs.slice(e0).join(' | ').slice(0, 300)); }
    // header actions: inline ones and those under ⋯
    await openRow();
    const head = p.locator('[data-drawer]').last().locator('[data-drawer-actions]').first();
    const hb = (await head.count()) ? await head.locator('button:visible').evaluateAll((xs) => xs.map((x) => (x.innerText || x.title || '').trim())) : [];
    for (const t of hb.filter((t) => t && !SKIP.test(t) && t !== 'More actions' && !/^(Previous|Next)/.test(t))) await tryClick(r.label, 'drawer action', p.locator('[data-drawer]').last().locator('button:visible').filter({ hasText: t }).first(), t, openRow);
    await openRow();
    const more = p.locator('[data-drawer] button[title="More actions"]').last();
    if (await more.count()) {
      await more.click(); await p.waitForTimeout(120);
      const items = await p.locator('[data-actions-menu] [role=menuitem]').allInnerTexts();
      for (const t of items) {
        await openRow(); await p.locator('[data-drawer] button[title="More actions"]').last().click().catch(() => {}); await p.waitForTimeout(120);
        await tryClick(r.label, '⋯ menu', p.locator('[data-actions-menu] [role=menuitem]').filter({ hasText: t }).first(), t.trim(), null);
      }
    }
  }
  fs.mkdirSync(__dirname + '/out', { recursive: true }); fs.writeFileSync(__dirname + '/out/deadclick.json', JSON.stringify(F, null, 1));
  const by = {}; F.forEach((f) => (by[f.kind] = (by[f.kind] || 0) + 1));
  console.log('actions tried', tried, JSON.stringify(tally), 'findings', JSON.stringify(by)); F.filter((f) => f.kind !== 'disabled-no-reason').forEach((f) => console.log(f.kind.padEnd(14), f.route, '›', f.where, '›', f.what, '-', f.detail));
  await b.close();
})();
