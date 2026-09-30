// Shared E2E helpers for the NebullaOne prototype
const { chromium } = require('playwright-core');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../dist/NebullaOne-WFM.html');
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function open() {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage({ viewport: { width: 1600, height: 1100 } });
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('dialog', d => d.accept().catch(() => {}));
  await p.goto(URL); await sleep(600);
  const i = await p.$$('input:not([type=checkbox])');
  if (i.length >= 2) { await i[0].fill('demo'); await i[1].fill('demo'); await p.click('text=Sign In'); await sleep(600); }
  const o = await p.$$('text=Open'); if (o.length) { await o[0].click(); await sleep(600); }
  await p.evaluate(() => { localStorage.removeItem('nxv-store-v1'); }); await p.reload(); await sleep(700);
  const o2 = await p.$$('text=Open'); if (o2.length) { await o2[0].click(); await sleep(500); }
  return { b, p, errors };
}
const go = async (p, route) => { await p.evaluate(h => location.hash = h, route); await sleep(500); };
const scope = dlg => dlg ? '[role=dialog]:last-of-type' : 'main';
// field by visible label text (label > span:first-child)
async function field(p, label, { dlg = true, nth = 0 } = {}) {
  const h = await p.evaluateHandle(({ label, dlg, nth }) => {
    const sc = dlg ? [...document.querySelectorAll('[role=dialog]')].pop() : document.querySelector('main');
    const labs = [...sc.querySelectorAll('label')].filter(l => { const s = l.querySelector('span'); return s && s.textContent.replace(/\s*\*$/, '').trim() === label; });
    const l = labs[nth]; if (!l) return null;
    return l.querySelector('input,textarea,select,button[aria-haspopup]');
  }, { label, dlg, nth });
  const el = h.asElement(); if (!el) throw new Error('field not found: ' + label);
  return el;
}
async function fill(p, label, value, o) { const el = await field(p, label, o); await el.scrollIntoViewIfNeeded(); await el.fill(String(value)); await sleep(80); }
async function pick(p, label, option, o) { // custom listbox
  const el = await field(p, label, o); await el.scrollIntoViewIfNeeded(); await el.click(); await sleep(250);
  const ok = await p.evaluate(opt => { const lb = [...document.querySelectorAll('[role=listbox]')].pop(); const b = lb && [...lb.querySelectorAll('[role=option]')].find(x => x.innerText.trim() === opt || x.innerText.trim().startsWith(opt)); if (b) { b.click(); return true; } return false; }, option);
  if (!ok) throw new Error(`option not found: ${label} = ${option}`); await sleep(150);
}
async function click(p, text, { dlg = null, exact = true } = {}) {
  const ok = await p.evaluate(({ text, dlg, exact }) => {
    const sc = dlg === null ? ([...document.querySelectorAll('[role=dialog]')].pop() || document.querySelector('main')) : dlg ? [...document.querySelectorAll('[role=dialog]')].pop() : document.querySelector('main');
    const bs = [...sc.querySelectorAll('button,a')].filter(b => { const t = b.innerText.replace(/\s+/g, ' ').trim(); return exact ? t === text : t.includes(text); });
    const b = bs.find(b => !b.disabled) || bs[0]; if (!b) return 'missing'; if (b.disabled) return 'disabled'; b.scrollIntoView({ block: 'center' }); b.click(); return 'ok';
  }, { text, dlg, exact });
  if (ok !== 'ok') throw new Error(`button ${text}: ${ok}`); await sleep(350);
}
const disabled = (p, text) => p.evaluate(text => { const sc = [...document.querySelectorAll('[role=dialog]')].pop() || document.querySelector('main'); const b = [...sc.querySelectorAll('button')].find(b => b.innerText.replace(/\s+/g, ' ').trim() === text); return b ? b.disabled : null; }, text);
const alerts = p => p.evaluate(() => { const sc = [...document.querySelectorAll('[role=dialog]')].pop() || document.querySelector('main'); return [...sc.querySelectorAll('[role=alert], .text-red-600')].map(e => e.innerText.trim()).filter(Boolean); });
const toasts = p => p.evaluate(() => [...document.querySelectorAll('.fixed.bottom-5 span')].map(e => e.innerText));
const text = (p, dlg = true) => p.evaluate(dlg => ((dlg ? [...document.querySelectorAll('[role=dialog]')].pop() : null) || document.querySelector('main')).innerText, dlg);
const store = p => p.evaluate(() => JSON.parse(localStorage.getItem('nxv-store-v1') || 'null'));
const dialogs = p => p.evaluate(() => document.querySelectorAll('[role=dialog]').length);
// tiny assertion collector
function T(name) { const res = []; return { res, ok(c, msg) { res.push({ pass: !!c, msg }); if (!c) console.log('   FAIL:', msg); }, done() { const f = res.filter(r => !r.pass).length; console.log(`${f ? '✗' : '✓'} ${name}: ${res.length - f}/${res.length}`); return f; } }; }
module.exports = { open, go, field, fill, pick, click, disabled, alerts, toasts, text, store, dialogs, sleep, T };
