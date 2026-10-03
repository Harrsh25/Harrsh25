// UAT — walks every page of both modules plus the supplier portal and public pages, and checks the
// small things: page loads without script errors, no "undefined / NaN / Invalid Date / [object Object]"
// on screen, no sideways page scroll, sidebar label = page title, every page tab, every list (sort on
// every column, search hit + no-match state, Filters panel apply / reset, export, column picker, footer
// count = rows shown), every header button (modal opens, Save state on an empty form, Esc closes),
// the first record of every list (drawer opens, every drawer tab, every drawer button) and the
// supplier portal tabs for a contractor and a goods supplier. Writes out/res-uat.json.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const file = 'file://' + path.resolve(__dirname, '../../NebullaOne-WFM.html');
const base = file + '#/productivity/';
const BAD = /\bundefined\b|\bNaN\b|\[object Object\]|Invalid Date|₹-?NaN|\bnull\b/;

const PAGES = [
  ['Vendor Management', 'vendor-management/overview', 'Overview'], ['Vendor Management', 'vendor-management/registry', 'Vendor Registry'],
  ['Vendor Management', 'vendor-management/approvals', 'Vendor Approvals'], ['Vendor Management', 'vendor-management/compliance', 'Compliance Center'],
  ['Vendor Management', 'vendor-management/requisitions', 'Purchase Requisitions'], ['Vendor Management', 'vendor-management/rfq', 'RFQ & Quotations'],
  ['Vendor Management', 'vendor-management/blanket-orders', 'Blanket Orders'], ['Vendor Management', 'vendor-management/purchase-orders', 'Purchase Orders'],
  ['Vendor Management', 'vendor-management/invoices', 'Invoices & Payments'], ['Vendor Management', 'vendor-management/requalification', 'Requalification'],
  ['Vendor Management', 'vendor-management/scorecard', 'Vendor Scorecard'], ['Vendor Management', 'vendor-management/portal', 'Vendor Portal'],
  ['Vendor Management', 'vendor-management/settings', 'Procurement Settings'],
  ['Contract & Labor', 'contract-labor/overview', 'Overview'], ['Contract & Labor', 'contract-labor/onboarding', 'Contractor Onboarding'],
  ['Contract & Labor', 'contract-labor/contracts', 'Contracts'], ['Contract & Labor', 'contract-labor/work-orders', 'Work Orders'],
  ['Contract & Labor', 'contract-labor/attendance', 'Labour Attendance'], ['Contract & Labor', 'contract-labor/measurement-book', 'Measurement Book'],
  ['Contract & Labor', 'contract-labor/ra-bills', 'RA Bills & Certification'], ['Contract & Labor', 'contract-labor/retention', 'Retention & Deductions'],
  ['Contract & Labor', 'contract-labor/labor-rates', 'Labor Rate Management'], ['Contract & Labor', 'contract-labor/performance', 'Performance & Progress'],
  ['Contract & Labor', 'contract-labor/closeout', 'Close-out & Handover'], ['Contract & Labor', 'contract-labor/final-settlement', 'Final Settlement'],
  ['Contract & Labor', 'contract-labor/dlp-warranty', 'DLP & Warranty'], ['Contract & Labor', 'contract-labor/contractor-release', 'Contractor Release'],
  ['Contract & Labor', 'contract-labor/terminations', 'Termination & Final Account'],
  ['Administration', 'administration/audit-log', 'Audit Log'], ['Approvals', 'approvals/approval-management', 'Approval Management'],
];

(async () => {
  const b = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage(); p.setDefaultTimeout(3000);
  let errs = []; p.on('pageerror', (e) => errs.push(e.message.split('\n')[0]));
  p.on('dialog', (d) => d.dismiss().catch(() => {}));
  ctx.on('page', (pp) => { if (pp !== p) pp.close().catch(() => {}); });
  const R = []; let cur = { module: '', page: '' };
  const rec = (area, check, result, detail = '') => { R.push({ module: cur.module, page: cur.page, area, check, result, detail: String(detail).slice(0, 400) }); if (result !== 'PASS') console.log(`${result} ${cur.page} · ${area} · ${check} → ${String(detail).slice(0, 160)}`); };
  const wait = (ms) => p.waitForTimeout(ms);
  const dlgCount = () => p.locator('[role=dialog]').count();
  const topDlg = () => p.locator('[role=dialog]').last();
  const bad = async (loc) => { const t = (await loc.innerText().catch(() => '')) || ''; const m = t.match(BAD); return m ? `"${t.slice(Math.max(0, m.index - 40), m.index + 30).replace(/\s+/g, ' ')}"` : ''; };
  const fresh = async (route) => { await p.goto('about:blank'); await p.evaluate(() => 0).catch(() => {}); await p.goto(route.startsWith('#') ? file + route : base + route); await wait(650); };
  const resetStore = async () => { await p.goto(base + 'vendor-management/registry'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('wfm-demo-user', JSON.stringify({ name: 'UAT', email: 'uat@x' })); }); };
  const closeAll = async () => { for (let i = 0; i < 4 && (await dlgCount()); i++) { await p.keyboard.press('Escape'); await wait(120); } if (await p.locator('[data-filter-panel]').count()) { await p.keyboard.press('Escape'); await wait(100); } };
  const toast = async () => ((await p.locator('.pointer-events-none.fixed').last().innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();

  // a modal just opened: content, Save state on the untouched form, Esc closes it
  async function checkModal(where) {
    const d = topDlg(); const title = ((await d.locator('h2').first().innerText().catch(() => '')) || where).trim();
    const e0 = errs.length; const b0 = await bad(d);
    rec('Form', `${where} → "${title}" opens`, errs.length > e0 ? 'FAIL' : b0 ? 'WARN' : 'PASS', errs.slice(e0).join(' / ') || (b0 ? `shows ${b0}` : ''));
    const labels = await d.locator('label').count(); const req = await d.locator('label .text-red-500').count();
    const btns = d.locator('div.border-t button, footer button').filter({ hasNotText: /^(Cancel|Close)$/ });
    const nb = await btns.count();
    if (nb) {
      const prim = btns.last(); const name = ((await prim.innerText()) || '').trim(); const dis = await prim.isDisabled();
      if (dis) rec('Form', `"${title}" — ${name} disabled until the form is complete`, 'PASS', `${labels} fields, ${req} required`);
      else {
        const before = await dlgCount(); const e1 = errs.length;
        await prim.click().catch(() => {}); await wait(300);
        const after = await dlgCount(); const msg = await toast(); const red = await topDlg().locator('.text-red-600, .text-red-500:not(label .text-red-500)').count().catch(() => 0);
        if (errs.length > e1) rec('Form', `"${title}" — ${name} on the untouched form`, 'FAIL', errs.slice(e1).join(' / '));
        else if (after < before) rec('Form', `"${title}" — ${name} on the untouched form`, req ? 'WARN' : 'INFO', `Saved straight away with the pre-filled values${req ? ` although ${req} fields are marked required` : ''}${msg ? ` — toast "${msg.slice(0, 80)}"` : ''}`);
        else rec('Form', `"${title}" — ${name} on the untouched form`, 'PASS', `Blocked: ${red ? 'validation message shown' : msg ? `toast "${msg.slice(0, 80)}"` : 'stays open'}`);
      }
    }
    if (await dlgCount()) { const n0 = await dlgCount(); await p.keyboard.press('Escape'); await wait(150); rec('Form', `"${title}" closes with Esc`, (await dlgCount()) < n0 ? 'PASS' : 'WARN', (await dlgCount()) < n0 ? '' : 'Esc did not close it'); }
  }

  // the list (DataTable) currently on screen inside `scope`
  async function checkList(where) {
    const rowsLoc = p.locator('main table.nx-list').first().locator('tbody tr'); const n = await rowsLoc.count();
    const foot = ((await p.locator('main').locator('text=/\\d+ (of \\d+ )?[a-z]/').last().innerText().catch(() => '')) || '');
    const empty = n === 1 && /No |Nothing|yet/.test(await rowsLoc.first().innerText().catch(() => ''));
    // footer count = rows shown
    const ft = (await p.locator('main div:has-text("Last updated")').last().innerText().catch(() => '')) || '';
    const fm = ft.match(/^\s*(\d+)\s+(?:of\s+\d+\s+)?([a-z][a-z &-]*)/i);
    if (fm && !empty) rec('List', `${where}: footer count matches the rows`, Number(fm[1]) === n ? 'PASS' : 'WARN', `footer ${fm[1]} ${fm[2]}, rows ${n}`);
    // sort every sortable column (asc → desc), rows stay
    const sorts = p.locator('main thead button[aria-label^="Sort by"]'); const ns = await sorts.count(); let sortErr = '';
    for (let i = 0; i < ns; i++) { const e0 = errs.length; await sorts.nth(i).click().catch(() => {}); await wait(60); await sorts.nth(i).click().catch(() => {}); await wait(60); await sorts.nth(i).click().catch(() => {}); if (errs.length > e0 || (await rowsLoc.count()) !== n) sortErr += `${await sorts.nth(i).innerText()}; `; }
    if (ns) rec('List', `${where}: sort on all ${ns} columns`, sortErr ? 'FAIL' : 'PASS', sortErr);
    // search
    const sb = p.locator('main input[placeholder^="Search"]');
    if (await sb.count() && n && !empty) {
      const word = ((await rowsLoc.first().locator('td').nth(1).innerText().catch(() => '')) || (await rowsLoc.first().innerText())).trim().split(/\s+/).find((w) => w.length > 3) || '';
      const box = sb.first(); if (!(await box.isVisible())) rec('List', `${where}: search box visible`, 'FAIL', 'hidden');
      if (word) { await box.fill(word); await wait(150); const hit = await rowsLoc.count(); rec('List', `${where}: search "${word}" finds rows`, hit >= 1 && !/No matches/.test(await p.locator('main').innerText()) ? 'PASS' : 'FAIL', `${hit} rows`); }
      await box.fill('zzqxqzz'); await wait(150); rec('List', `${where}: search with no match shows "No matches"`, /No matches/.test(await p.locator('main').innerText()) ? 'PASS' : 'FAIL', '');
      await box.fill(''); await wait(120); await p.locator('main h1').click().catch(() => {});
    }
    // Filters panel
    const fb = p.locator('main button[aria-label="Filters"]');
    if (await fb.count() && n && !empty) {
      const e0 = errs.length; await fb.first().click(); await wait(250); const panel = p.locator('[data-filter-panel]');
      if (!(await panel.count())) rec('Filters', `${where}: panel opens`, 'FAIL', 'no panel');
      else {
        const secs = await panel.locator('section').count(); const chips = panel.locator('button[aria-pressed]'); const nc = await chips.count();
        rec('Filters', `${where}: panel opens (${secs} sections, ${nc} chips)`, errs.length > e0 ? 'FAIL' : secs ? 'PASS' : 'WARN', errs.slice(e0).join(' / ') || (secs ? '' : 'no filter sections'));
        const pb = await bad(panel); if (pb) rec('Filters', `${where}: chip labels`, 'WARN', `shows ${pb}`);
        if (nc) {
          await chips.first().click(); await panel.locator('button:has-text("Apply Filters")').click(); await wait(250);
          const after = await rowsLoc.count(); const t = await p.locator('main').innerText();
          rec('Filters', `${where}: apply one chip`, errs.length > e0 ? 'FAIL' : after <= n && /filters? applied/.test(t) ? 'PASS' : 'FAIL', `${n} → ${after} rows`);
          await fb.first().click(); await wait(200); await p.locator('[data-filter-panel] button:has-text("Reset")').click(); await wait(250);
          rec('Filters', `${where}: Reset restores all rows`, (await rowsLoc.count()) === n ? 'PASS' : 'FAIL', `${await rowsLoc.count()} of ${n}`);
        } else { await p.keyboard.press('Escape'); await wait(120); }
        if (await p.locator('[data-filter-panel]').count()) { await p.keyboard.press('Escape'); await wait(100); }
      }
    }
    // export
    const ex = p.locator('main button[aria-label="Export"]');
    if (await ex.count() && n && !empty) {
      const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 2500 }).catch(() => null), ex.first().click()]);
      let ok = !!dl, det = dl ? dl.suggestedFilename() : 'no download';
      if (dl) { const fp = await dl.path().catch(() => null); if (fp) { const csv = fs.readFileSync(fp, 'utf8'); const lines = csv.trim().split(/\r?\n/).length - 1; det += ` · ${lines} rows`; if (lines !== n) { ok = false; det += ` (screen ${n})`; } if (BAD.test(csv)) det += ' · contains undefined/NaN'; } }
      rec('List', `${where}: export to CSV`, ok ? 'PASS' : 'FAIL', det);
    }
    // column picker
    const cp = p.locator('main button[aria-label="Customize columns"]');
    if (await cp.count()) { const e0 = errs.length; await cp.first().click(); await wait(200); const opened = await dlgCount(); rec('List', `${where}: Customize columns opens`, opened && errs.length === e0 ? 'PASS' : 'FAIL', errs.slice(e0).join(' / ')); await closeAll(); }
    return { n, empty };
  }

  // first record of the list → drawer, its tabs and its buttons
  async function checkRecord(route, tabIdx, where) {
    const open = async () => { await fresh(route); if (tabIdx) await p.locator('main button.-mb-px').nth(tabIdx).click(); await wait(200); const r = p.locator('main table.nx-list').first().locator('tbody tr').first(); const before = p.url(); await r.click({ position: { x: 30, y: 12 } }).catch(() => {}); await wait(450); return { dlg: await dlgCount(), nav: p.url() !== before ? p.url() : '' }; };
    const e0 = errs.length; const o = await open();
    if (!o.dlg) { if (o.nav) rec('Record', `${where}: row opens ${o.nav.split('#')[1]}`, errs.length > e0 ? 'FAIL' : 'PASS', errs.slice(e0).join(' / ')); else rec('Record', `${where}: row click`, 'INFO', 'no drawer (row is not clickable)'); return; }
    const d = topDlg(); const title = ((await d.locator('h2').first().innerText().catch(() => '')) || '').trim();
    const b0 = await bad(d); rec('Record', `${where}: drawer "${title.slice(0, 50)}" opens`, errs.length > e0 ? 'FAIL' : b0 ? 'WARN' : 'PASS', errs.slice(e0).join(' / ') || (b0 ? `shows ${b0}` : ''));
    const tabs = d.locator('[role=tab]'); const nt = await tabs.count();
    for (let i = 0; i < nt; i++) { const e1 = errs.length; const name = (await tabs.nth(i).innerText()).replace(/\s+/g, ' ').trim(); await tabs.nth(i).click(); await wait(200); const bb = await bad(topDlg()); rec('Record', `${where}: drawer tab "${name}"`, errs.length > e1 ? 'FAIL' : bb ? 'WARN' : 'PASS', errs.slice(e1).join(' / ') || (bb ? `shows ${bb}` : '')); }
    // drawer header buttons (reopen each time so one action doesn't hide the next)
    const HB = ':scope > div > div.shrink-0 button:not([role=tab])';
    const hb = await d.locator(HB).evaluateAll((bs) => bs.map((b) => (b.innerText || '').trim()).filter((t) => t && t.length < 40 && !/\n/.test(t)));
    for (const name of [...new Set(hb)].slice(0, 8)) {
      if (/^(Close|×)$/.test(name)) continue;
      const r = await open(); if (!r.dlg) break;
      const btn = topDlg().locator(':scope > div > div.shrink-0 button:not([role=tab])').filter({ hasText: name }).first(); if (!(await btn.count()) || (await btn.isDisabled())) { rec('Record', `${where}: drawer button "${name}"`, 'INFO', 'disabled (conditions not met)'); continue; }
      const e2 = errs.length; const n0 = await dlgCount(); await btn.click().catch(() => {}); await wait(350);
      if (errs.length > e2) rec('Record', `${where}: drawer button "${name}"`, 'FAIL', errs.slice(e2).join(' / '));
      else if ((await dlgCount()) > n0) await checkModal(`${where} drawer → ${name}`);
      else rec('Record', `${where}: drawer button "${name}"`, 'PASS', (await toast()).slice(0, 100) || 'action ran');
    }
    await closeAll();
  }

  // ---------------------------------------------------------------- run
  await resetStore();
  // sidebar: every link opens a page whose title matches
  cur = { module: 'Navigation', page: 'Sidebar' };
  await fresh('vendor-management/overview');
  for (const [mod, route, label] of PAGES) {
    const e0 = errs.length; await fresh(route); const h1 = ((await p.locator('main h1').first().innerText().catch(() => '')) || '').trim();
    rec('Menu', `${mod} → ${label}`, errs.length > e0 || !h1 ? 'FAIL' : 'PASS', errs.slice(e0).join(' / ') || (h1 && h1 !== label ? `page title is "${h1}"` : ''));
  }

  for (const [mod, route, label] of PAGES) {
    cur = { module: mod, page: label }; await resetStore();
    const t0 = Date.now(); errs = []; await fresh(route); const ms = Date.now() - t0;
    const main = p.locator('main');
    rec('Page', 'loads without script errors', errs.length ? 'FAIL' : 'PASS', errs.join(' / ') || `${ms} ms`);
    const b0 = await bad(main); rec('Page', 'no undefined / NaN / Invalid Date on screen', b0 ? 'FAIL' : 'PASS', b0);
    const ov = await p.evaluate(() => { const m = document.querySelector('main'); return m ? m.scrollWidth - m.clientWidth : 0; });
    rec('Page', 'no sideways scroll of the page', ov > 4 ? 'WARN' : 'PASS', ov > 4 ? `${ov}px wider than the screen` : '');
    const tiles = await main.locator('div.rounded-xl.border:has(> div)').count();
    // header buttons
    const hdr = await main.locator('h1').first().evaluate((h) => { let el = h; for (let i = 0; i < 5 && el; i++) { el = el.parentElement; if (el && el.querySelectorAll('button').length && el.querySelector('h1') && el.clientWidth > 600) break; } return el ? [...el.querySelectorAll('button')].map((b) => (b.innerText || '').trim()).filter((t) => t && t.length < 40) : []; }).catch(() => []);
    for (const name of [...new Set(hdr)]) {
      await fresh(route); const btn = main.locator('button', { hasText: name }).first(); if (!(await btn.count()) || (await btn.isDisabled())) continue;
      const e1 = errs.length, n0 = await dlgCount(), u0 = p.url(); await btn.click().catch(() => {}); await wait(350);
      if (errs.length > e1) rec('Header', `button "${name}"`, 'FAIL', errs.slice(e1).join(' / '));
      else if ((await dlgCount()) > n0) await checkModal(`button "${name}"`);
      else if (p.url() !== u0) rec('Header', `button "${name}" → ${p.url().split('#')[1]}`, (await p.locator('main h1').count()) ? 'PASS' : 'FAIL', '');
      else rec('Header', `button "${name}"`, 'PASS', (await toast()).slice(0, 100) || 'menu / action');
      await closeAll();
    }
    // tabs on the page
    await fresh(route); const tabsN = await main.locator('button.-mb-px').count(); const tabNames = await main.locator('button.-mb-px').allInnerTexts();
    for (let ti = 0; ti < Math.max(1, tabsN); ti++) {
      const tname = tabsN ? tabNames[ti].replace(/\s+/g, ' ').trim() : '';
      const where = tname ? `tab "${tname}"` : 'list';
      await fresh(route); errs = [];
      if (tabsN) { await main.locator('button.-mb-px').nth(ti).click(); await wait(250); const bb = await bad(main); rec('Tab', `${where} opens`, errs.length ? 'FAIL' : bb ? 'WARN' : 'PASS', errs.join(' / ') || (bb ? `shows ${bb}` : '')); }
      if (!(await main.locator('tbody tr').count())) continue;
      const l = await checkList(where);
      if (l.n && !l.empty) await checkRecord(route, tabsN ? ti : 0, where);
    }
    rec('Page', 'summary', 'INFO', `${tiles} cards, ${tabsN || 0} tabs, ${hdr.length} header buttons, loaded in ${ms} ms`);
  }

  // ---------------------------------------------------------------- supplier portal & public pages
  for (const [vid, who] of [['VEN-001', 'Contractor (Shree Balaji)'], ['VEN-003', 'Goods supplier (Deccan Steel)']]) {
    cur = { module: 'Supplier portal', page: who }; await resetStore();
    await p.evaluate((id) => localStorage.setItem('nxv-vendor-session', JSON.stringify({ vendorId: id, email: 'uat@x', at: Date.now() })), vid);
    errs = []; await fresh('#/supplier'); const body = p.locator('body');
    rec('Portal', 'opens signed in', errs.length ? 'FAIL' : 'PASS', errs.join(' / '));
    const tabs = p.locator('button.-mb-px'); const nt = await tabs.count(); const names = await tabs.allInnerTexts();
    for (let i = 0; i < nt; i++) {
      await fresh('#/supplier'); const e0 = errs.length; await p.locator('button.-mb-px').nth(i).click(); await wait(250);
      const bb = await bad(body); const nm = names[i].replace(/\s+/g, ' ').trim();
      rec('Portal', `tab "${nm}"`, errs.length > e0 ? 'FAIL' : bb ? 'WARN' : 'PASS', errs.slice(e0).join(' / ') || (bb ? `shows ${bb}` : ''));
      const row = p.locator('tbody tr').first();
      if (await row.count() && !/No |Nothing/.test(await row.innerText())) { const e1 = errs.length; await row.click({ position: { x: 30, y: 12 } }).catch(() => {}); await wait(350); if (await dlgCount()) { const b2 = await bad(topDlg()); rec('Portal', `tab "${nm}": first record opens`, errs.length > e1 ? 'FAIL' : b2 ? 'WARN' : 'PASS', errs.slice(e1).join(' / ') || (b2 ? `shows ${b2}` : '')); const dt = topDlg().locator('[role=tab]'); for (let k = 0; k < await dt.count(); k++) { const e2 = errs.length; await dt.nth(k).click(); await wait(150); rec('Portal', `tab "${nm}": record tab "${(await dt.nth(k).innerText()).trim()}"`, errs.length > e2 ? 'FAIL' : 'PASS', errs.slice(e2).join(' / ')); } await closeAll(); } }
    }
  }
  cur = { module: 'Public pages', page: 'No sign-in' }; await resetStore();
  const st = await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('nxv-store-v1') || 'null'); return s; });
  for (const [h, name] of [['#/supplier/login', 'Supplier sign-in'], ['#/vendor-register', 'Vendor self-registration'], ['#/vendor-quote/RFQ-001/VEN-011', 'Vendor quotation link']]) {
    errs = []; await fresh(h); const bb = await bad(p.locator('body'));
    rec('Public', `${name} opens`, errs.length ? 'FAIL' : bb ? 'WARN' : 'PASS', errs.join(' / ') || (bb ? `shows ${bb}` : ''));
  }
  errs = []; await fresh('#/supplier/login'); await p.locator('input[type=email]').fill('not-an-email');
  const sendDis = await p.locator('button:has-text("Send one-time code")').isDisabled();
  await p.locator('input[type=email]').fill('ramesh@shreebalaji.in'); const sendOk = !(await p.locator('button:has-text("Send one-time code")').isDisabled());
  rec('Public', 'Sign-in: Send code disabled for an invalid e-mail, enabled for a valid one', sendDis && sendOk ? 'PASS' : 'FAIL', `invalid → ${sendDis ? 'disabled' : 'enabled'}, valid → ${sendOk ? 'enabled' : 'disabled'}`);

  // ---------------------------------------------------------------- narrow screen
  cur = { module: 'Layout', page: 'Laptop 1280 × 720' }; await p.setViewportSize({ width: 1280, height: 720 });
  for (const [, route, label] of PAGES) { await fresh(route); const ov = await p.evaluate(() => document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth); rec('Layout', `${label}: fits 1280 px wide`, ov > 4 ? 'WARN' : 'PASS', ov > 4 ? `${ov}px sideways scroll` : ''); }

  fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'out/res-uat.json'), JSON.stringify(R, null, 1));
  const c = (r) => R.filter((x) => x.result === r).length;
  console.log(`\nuat: ${R.length} checks — ${c('PASS')} pass, ${c('FAIL')} fail, ${c('WARN')} warn, ${c('INFO')} info`);
  await b.close();
})();
