// Inventory crawler — runs the built HTML in Chromium and records every screen, tab, list, field and button,
// plus console errors. Output: tests/out/inventory.json (read by tests/qa_workbook.py)
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '../../NebullaOne-WFM.html');
const ROUTES = [...fs.readFileSync(path.resolve(__dirname, '../src/90-nav.jsx'), 'utf8').matchAll(/base: (\w+), path: "([^"]+)", label: "([^"]+)"/g)]
  .map((m) => ({ base: { VM_BASE: '/productivity/vendor-management', CL_BASE: '/productivity/contract-labor', ADMIN_BASE: '/productivity/administration' }[m[1]], path: m[2], label: m[3] }))
  .map((r) => ({ hash: `#${r.base}/${r.path}`, label: r.label, group: r.base.split('/').pop() }))
  .concat([{ hash: '#/vendor-register', label: 'Vendor self-registration', group: 'public' }, { hash: '#/supplier/login', label: 'Supplier login', group: 'public' }]);

(async () => {
  const b = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); p.setDefaultTimeout(3000);
  let errs = []; p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message)); p.on('console', (m) => m.type() === 'error' && errs.push('CONSOLE ' + m.text()));
  await p.goto(FILE + '#/productivity/'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('wfm-demo-user', JSON.stringify({ name: 'demo', email: 'demo@x' })); });
  const go = async (hash) => { await p.goto('about:blank'); await p.goto(FILE + hash); await p.waitForTimeout(450); };
  // ---- extractors (run inside the page)
  const scan = (root) => p.evaluate((sel) => {
    const R = document.querySelector(sel) || document.body; const vis = (e) => !!(e.offsetWidth || e.offsetHeight);
    const txt = (e) => (e.getAttribute('aria-label') || e.innerText || e.title || e.getAttribute('data-tip') || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    const tables = [...R.querySelectorAll('table')].filter(vis).map((t) => ({
      dense: !!t.closest('[data-drawer],[role=dialog]') || t.className.includes('dense'),
      headers: [...t.querySelectorAll('thead th')].map((th) => th.innerText.trim() || (th.querySelector('[aria-label]')?.getAttribute('aria-label') || '')),
      rows: t.querySelectorAll('tbody tr').length,
      customize: !!t.querySelector('[aria-label="Customize columns"]'),
    }));
    const fields = [...R.querySelectorAll('input,select,textarea,button[aria-haspopup=listbox],[role=checkbox],[role=switch]')].filter(vis).filter((e) => !e.closest('thead,[data-quick-filter],[data-searchbar]')).map((e) => {
      const lab = e.closest('label')?.querySelector('span')?.innerText.replace(/\s*\*$/, '').trim() || e.getAttribute('aria-label') || e.placeholder || txt(e);
      return { label: (lab || '').slice(0, 60), name: e.name || '', id: e.id || '', type: e.tagName === 'BUTTON' ? (e.getAttribute('role') || 'select') : (e.type || e.tagName.toLowerCase()),
        required: !!(e.required || e.closest('label')?.querySelector('.text-red-500')), value: (e.value ?? e.innerText ?? '').toString().slice(0, 40), disabled: !!e.disabled };
    });
    const buttons = [...R.querySelectorAll('button,a[href]')].filter(vis).filter((e) => !e.closest('table tbody,[role=tablist],nav,aside:not([data-filter-panel])')).map(txt).filter(Boolean);
    const tabs = [...R.querySelectorAll('[role=tab]')].filter(vis).map((t) => t.innerText.replace(/\s+/g, ' ').trim());
    const ids = [...document.querySelectorAll('[id]')].map((e) => e.id); const dupIds = ids.filter((x, i) => x && ids.indexOf(x) !== i);
    const unlabeled = [...R.querySelectorAll('button')].filter(vis).filter((e) => !txt(e)).length;
    return { title: document.querySelector('main h1')?.innerText || '', tables, fields, buttons: [...new Set(buttons)], tabs, dupIds: [...new Set(dupIds)], unlabeled };
  }, root);
  const inv = { screens: [], drawers: [], modals: [], errors: [] };
  const take = (where) => { if (errs.length) inv.errors.push({ where, errs: [...new Set(errs)] }); errs = []; };
  await go(ROUTES[0].hash); // store seeds on first load
  for (const r of ROUTES) {
    await go(r.hash); take(r.label);
    const first = await scan('main');
    const tabs = first.tabs.length ? first.tabs : [''];
    for (const tab of tabs) {
      if (tab) { await p.locator('main [role=tab]').filter({ hasText: tab }).first().click().catch(() => {}); await p.waitForTimeout(250); }
      const s = await scan('main'); take(`${r.label} / ${tab}`);
      inv.screens.push({ route: r.hash, screen: r.label, group: r.group, tab, ...s });
      // open the first record of the list (drawer) and inventory it
      const row = p.locator('main table tbody tr.cursor-pointer').first();
      if (await row.count()) {
        await row.click().catch(() => {}); await p.waitForTimeout(350);
        if (await p.locator('[data-drawer]').count()) {
          const d = await scan('[data-drawer]'); const dtabs = d.tabs; const parts = [];
          for (const dt of dtabs.length ? dtabs : ['']) {
            if (dt) { await p.locator('[data-drawer] [role=tab]').filter({ hasText: dt }).first().click().catch(() => {}); await p.waitForTimeout(200); }
            parts.push({ tab: dt, ...(await scan('[data-drawer]')) });
          }
          inv.drawers.push({ screen: r.label, tab, title: await p.locator('[data-drawer] h2').first().innerText().catch(() => ''), parts });
          take(`${r.label} / ${tab} / record panel`);
          await p.keyboard.press('Escape'); await p.waitForTimeout(150);
        }
      }
    }
    // page-header actions that open a form (modal)
    await go(r.hash);
    const heads = await p.locator('main header button, main [data-page-actions] button, main > div > div:first-child button').evaluateAll((bs) => bs.filter((b) => b.offsetWidth && /new|add|create|register|invite|raise|record|issue|upload|log|request/i.test(b.innerText)).map((b) => b.innerText.trim())).catch(() => []);
    for (const label of [...new Set(heads)].slice(0, 6)) {
      await go(r.hash);
      await p.locator('main button').filter({ hasText: label }).first().click().catch(() => {}); await p.waitForTimeout(300);
      if (await p.locator('[role=dialog]').count()) {
        const m = await scan('[role=dialog]');
        inv.modals.push({ screen: r.label, opener: label, title: await p.locator('[role=dialog] h2,[role=dialog] h3').first().innerText().catch(() => ''), ...m });
      } else inv.modals.push({ screen: r.label, opener: label, title: '(no dialog — navigates or acts inline)', fields: [], buttons: [], tables: [], tabs: [] });
      take(`${r.label} / ${label} form`);
    }
    console.log(r.label, '✓');
  }
  fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'out/inventory.json'), JSON.stringify(inv, null, 1));
  const lists = inv.screens.flatMap((s) => s.tables.filter((t) => !t.dense && t.customize).map((t) => ({ s: s.screen + (s.tab ? ' / ' + s.tab : ''), n: t.headers.filter((x) => x && x !== 'Customize columns').length, h: t.headers })));
  console.log(`\nscreens ${inv.screens.length}, drawers ${inv.drawers.length}, forms ${inv.modals.length}, fields ${inv.screens.reduce((a, s) => a + s.fields.length, 0) + inv.modals.reduce((a, m) => a + m.fields.length, 0) + inv.drawers.reduce((a, d) => a + d.parts.reduce((x, q) => x + q.fields.length, 0), 0)}, error groups ${inv.errors.length}`);
  lists.forEach((l) => console.log(String(l.n).padStart(2), l.s, '|', l.h.join(' · ')));
  inv.errors.forEach((e) => console.log('ERR', e.where, e.errs.join(' | ').slice(0, 300)));
  await b.close();
})();
