// Action audit — clicks every enabled button on every page header / toolbar and in the first record panel of each
// list, from a fresh copy of the demo data each time, and records what happened: dialog opened, page changed,
// data changed (store), toast, download, or on-screen change. A button with no effect = FUNCTIONAL GAP.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '../../NebullaOne-WFM.html');
const ROUTES = [...fs.readFileSync(path.resolve(__dirname, '../src/90-nav.jsx'), 'utf8').matchAll(/base: (\w+), path: "([^"]+)", label: "([^"]+)"/g)]
  .map((m) => ({ hash: `#${{ VM_BASE: '/productivity/vendor-management', CL_BASE: '/productivity/contract-labor', ADMIN_BASE: '/productivity/administration' }[m[1]]}/${m[2]}`, label: m[3] }));
(async () => {
  const b = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true }); const p = await ctx.newPage(); p.setDefaultTimeout(2500);
  let errs = []; p.on('pageerror', (e) => errs.push(e.message));
  let pops = 0; ctx.on('page', (pg) => { if (pg !== p) { pops++; pg.close().catch(() => {}); } });
  // print dialogs would block the page for the rest of the run: record them instead
  await ctx.addInitScript(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1; }; });
  await p.goto(FILE + '#/productivity/'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('wfm-demo-user', JSON.stringify({ name: 'demo', email: 'demo@x' })); });
  await p.goto(FILE + '#/productivity/vendor-management/registry'); await p.waitForTimeout(500);
  const star = p.locator('tr:has-text("Konkan Steel") button[title*="preferred" i]'); await star.click(); await p.waitForTimeout(80); await star.click(); await p.waitForTimeout(80);
  const SNAP = await p.evaluate(() => localStorage.getItem('nxv-store-v1'));
  const fresh = async (hash) => { await p.goto('about:blank'); await p.goto(FILE + '#/productivity/'); await p.evaluate((s) => { localStorage.clear(); localStorage.setItem('wfm-demo-user', JSON.stringify({ name: 'demo', email: 'demo@x' })); localStorage.setItem('nxv-store-v1', s); }, SNAP); await p.goto('about:blank'); await p.goto(FILE + hash); await p.waitForTimeout(350); };
  const state = () => p.evaluate(() => ({ url: location.hash, store: localStorage.getItem('nxv-store-v1'), dlg: document.querySelectorAll('[role=dialog],[data-drawer],[data-filter-panel],[data-searchbar],[role=listbox],[role=menu]').length, html: (() => { let h = 0; const t = document.body.innerHTML; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return h; })(), toast: (document.querySelector('.pointer-events-none.fixed') || {}).innerText || '', printed: window.__printed || 0 }));
  const R = [];
  const audit = async (where, hash, scope, opener) => {
    await fresh(hash); if (opener) await opener();
    const NAME = (x) => (x.getAttribute('aria-label') || x.innerText || x.title || x.getAttribute('data-tip') || '').replace(/\s+/g, ' ').trim().slice(0, 50);
    const btns = await p.locator(scope).locator('button:visible').evaluateAll((bs, nm) => { const NAME = new Function('x', 'return (' + nm + ')(x)'); return bs.map((x, i) => ({ i, skip: !!x.closest('tbody,[role=tablist],nav,aside[aria-label]'), name: NAME(x), disabled: x.disabled, on: x.getAttribute('aria-pressed') === 'true' || x.getAttribute('aria-selected') === 'true' || x.getAttribute('aria-current') === 'true', why: x.title || x.getAttribute('data-tip') || '' })).filter((x) => !x.skip); }, NAME.toString());
    const seen = new Set();
    for (const bt of btns) {
      if (!bt.name || seen.has(bt.name) || /^Close$|^Remove /.test(bt.name)) continue; seen.add(bt.name);
      if (bt.disabled) { R.push({ where, button: bt.name, result: 'DISABLED', effect: bt.why ? 'disabled — ' + bt.why : 'disabled (no reason shown)' }); continue; }
      await fresh(hash); if (opener) await opener();
      const target = p.locator(scope).locator('button:visible').nth(bt.i);
      const nm = await target.evaluate((x, nm) => new Function('x', 'return (' + nm + ')(x)')(x), NAME.toString()).catch(() => '');
      if (nm !== bt.name) { R.push({ where, button: bt.name, result: 'ERROR', effect: 'button moved after reload (found "' + nm + '")' }); continue; }
      const s0 = await state(); pops = 0; let dl = false; const dlw = p.waitForEvent('download', { timeout: 700 }).then(() => (dl = true)).catch(() => {});
      errs = [];
      try { await target.scrollIntoViewIfNeeded({ timeout: 1500 }); await p.waitForTimeout(150); await target.click({ timeout: 1500 }); } catch (e) { if (process.env.ONLY) await p.screenshot({ path: __dirname + '/out/act-err.png' }); R.push({ where, button: bt.name, result: 'ERROR', effect: 'could not click: ' + e.message.split('\n')[0] }); continue; }
      await p.waitForTimeout(350); await dlw; const s1 = await state();
      const fx = [s1.url !== s0.url && 'navigates to ' + s1.url.split('/').slice(-1)[0], s1.dlg > s0.dlg && 'opens a panel / dialog', s1.dlg < s0.dlg && 'closes the panel', s1.store !== s0.store && 'saves data', s1.toast && s1.toast !== s0.toast && 'message: ' + s1.toast.slice(0, 60), dl && 'downloads a file', (pops || s1.printed > s0.printed) && 'opens a print / new window', !(s1.url !== s0.url || s1.dlg !== s0.dlg || s1.store !== s0.store) && s1.html !== s0.html && 'updates the screen'].filter(Boolean);
      R.push({ where, button: bt.name, result: errs.length ? 'ERROR' : fx.length ? 'WORKS' : bt.on ? 'N/A' : 'NO EFFECT', effect: errs.length ? errs.join(' | ') : fx.join('; ') || (bt.on ? 'already the selected option' : 'nothing happened') });
    }
  };
  for (const r of ROUTES.filter((x) => !process.env.ONLY || x.label === process.env.ONLY)) {
    await audit(r.label, r.hash, 'main');
    await fresh(r.hash);
    if (await p.locator('main table tbody tr.cursor-pointer').count()) {
      const openRec = async () => { await p.locator('main table tbody tr.cursor-pointer').first().click(); await p.waitForTimeout(350); };
      await openRec(); if (await p.locator('[data-drawer]').count()) await audit(r.label + ' › record', r.hash, '[data-drawer]', openRec);
    }
    console.log(r.label, R.filter((x) => x.where.startsWith(r.label)).length);
  }
  fs.writeFileSync(path.join(__dirname, 'out/res-actions.json'), JSON.stringify(R, null, 1));
  const c = (k) => R.filter((x) => x.result === k).length;
  console.log(`\nactions: ${R.length} buttons — ${c('WORKS')} work, ${c('DISABLED')} disabled, ${c('NO EFFECT')} no effect, ${c('ERROR')} error`);
  R.filter((x) => x.result === 'NO EFFECT' || x.result === 'ERROR' || /no reason/.test(x.effect)).forEach((x) => console.log(x.result, '|', x.where, '|', x.button, '|', x.effect));
  await b.close();
})();
