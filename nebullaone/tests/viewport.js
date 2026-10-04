// 100% viewport audit - every route at the common desktop sizes (1:1 pixel ratio = 100% browser zoom), plus the
// first record panel of each list and the vendor registration form. Measures what the eye would catch:
// page-level sideways scroll, content poking out of its container, a header / tab bar / action row that does not fit,
// related-document tiles not in one row, record panels or dialogs larger than the window.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '../../NebullaOne-WFM.html');
const ROUTES = [...fs.readFileSync(path.resolve(__dirname, '../src/90-nav.jsx'), 'utf8').matchAll(/base: (\w+), path: "([^"]+)", label: "([^"]+)"/g)]
  .map((m) => ({ hash: `#${{ VM_BASE: '/productivity/vendor-management', CL_BASE: '/productivity/contract-labor', ADMIN_BASE: '/productivity/administration' }[m[1]]}/${m[2]}`, label: m[3] }));
const SIZES = [[1280, 720], [1366, 768], [1440, 900], [1536, 864], [1920, 1080]];

// runs in the page: returns a list of problems for the current screen
const probe = (scope) => {
  const out = [];
  const vw = window.innerWidth, vh = window.innerHeight;
  const de = document.documentElement;
  if (de.scrollWidth > vw + 1) out.push(`page scrolls sideways (${de.scrollWidth}px > ${vw}px)`);
  const root = scope ? document.querySelector(scope) : document.querySelector('main');
  if (!root) return out;
  const rb = root.getBoundingClientRect();
  if (scope && (rb.right > vw + 1 || rb.bottom > vh + 1 || rb.left < -1 || rb.top < -1)) out.push(`${scope} larger than the window (${Math.round(rb.width)}×${Math.round(rb.height)})`);
  // anything sticking out of the panel / page (except inside a sideways scroller, which is intended for wide tables)
  const inScroller = (el) => { for (let p = el.parentElement; p && p !== root; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) return true; } return false; };
  let stick = 0;
  for (const el of root.querySelectorAll('*')) {
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    if (r.right > rb.right + 2 && !inScroller(el) && getComputedStyle(el).position !== 'fixed') { if (stick++ < 2) out.push(`sticks out on the right: <${el.tagName.toLowerCase()}> "${(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 30)}" (${Math.round(r.right - rb.right)}px)`); }
  }
  // related-document tiles in one row
  for (const bar of root.querySelectorAll('[data-related]')) { const tops = new Set([...bar.children].map((c) => Math.round(c.getBoundingClientRect().top))); if (tops.size > 1) out.push(`related tiles wrap to ${tops.size} rows`); }
  // tab bars: may scroll sideways, but then the ‹ › arrows must be there so no tab is unreachable
  for (const tl of root.querySelectorAll('[role=tablist]')) { const canScroll = tl.parentElement.querySelector('[aria-label^="Scroll tabs"]') || tl.scrollLeft > 0; if (tl.scrollWidth > tl.clientWidth + 2 && !canScroll) out.push('tab bar cut off (' + [...tl.children].filter((c) => c.getBoundingClientRect().right > tl.getBoundingClientRect().right + 1).map((c) => c.innerText.trim()).join(', ') + ')'); }
  for (const b of root.querySelectorAll('button:not([disabled])')) { const r = b.getBoundingClientRect(); if (r.width && (r.right > rb.right + 1 || r.left < rb.left - 1) && !inScroller(b)) { out.push(`button outside the ${scope ? 'panel' : 'page'}: "${(b.innerText || b.getAttribute('aria-label') || '').trim().slice(0, 30)}"`); break; } }
  // text that overlaps the next element in a heading row
  for (const h of root.querySelectorAll('h1,h2,h3')) { if (h.scrollWidth > h.clientWidth + 2 && !/ellipsis|clip/.test(getComputedStyle(h).textOverflow) && getComputedStyle(h).overflow === 'visible') out.push(`heading overflows: "${h.innerText.slice(0, 30)}"`); }
  return out;
};

(async () => {
  const b = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined });
  const R = [];
  for (const [w, hgt] of SIZES) {
    const p = await b.newPage({ viewport: { width: w, height: hgt }, deviceScaleFactor: 1 }); p.setDefaultTimeout(3000);
    await p.goto(FILE + '#/productivity/'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('wfm-demo-user', JSON.stringify({ name: 'demo', email: 'demo@x' })); });
    for (const r of ROUTES.filter((x) => !process.env.ONLY || x.label === process.env.ONLY)) {
      await p.goto('about:blank'); await p.goto(FILE + r.hash); await p.waitForTimeout(350);
      R.push({ size: `${w}×${hgt}`, screen: r.label, part: 'page', issues: await p.evaluate(probe, null) });
      const row = p.locator('main table tbody tr.cursor-pointer').first();
      if (await row.count()) {
        await row.click().catch(() => {}); await p.waitForTimeout(350);
        if (await p.locator('[data-drawer]').count()) R.push({ size: `${w}×${hgt}`, screen: r.label, part: 'record panel', issues: await p.evaluate(probe, '[data-drawer]') });
      }
    }
    // vendor registration form (modal)
    await p.goto('about:blank'); await p.goto(FILE + '#/productivity/vendor-management/registry'); await p.waitForTimeout(300);
    await p.locator('main button:has-text("Register vendor")').first().click().catch(() => {}); await p.waitForTimeout(300);
    R.push({ size: `${w}×${hgt}`, screen: 'Register vendor', part: 'form', issues: await p.evaluate(probe, '[role=dialog]') });
    await p.close();
  }
  fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'out/res-viewport.json'), JSON.stringify(R, null, 1));
  const bad = R.filter((x) => x.issues.length);
  console.log(`viewport: ${R.length} screen checks at ${SIZES.length} sizes - ${R.length - bad.length} pass, ${bad.length} fail`);
  bad.forEach((x) => console.log('FAIL', x.size, '|', x.screen, '|', x.part, '|', x.issues.join(' ; ')));
  await b.close();
})();
