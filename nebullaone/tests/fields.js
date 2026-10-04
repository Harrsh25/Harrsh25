// Field-level tests on the vendor registration form (full form) - validation, dependent and conditional fields,
// defaults, and that every saved value lands in the vendor record. Runs in Chromium against the built HTML.
require('./lib')('fields', async ({ fill, p, go, dlg, S, T, pick }) => {
  const open = async () => {
    await go('vendor-management/registry'); await p.locator('main button:has-text("Register vendor")').first().click(); await p.waitForTimeout(200);
    await dlg().locator('button:has-text("Fill all details now")').click().catch(() => {}); await p.waitForTimeout(150); return dlg();
  };
  const fld = (d, label) => d.locator(`label:has(> span:text-is("${label}")) input, label:has(> span:text-is("${label} *")) input`).first();
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
  const lab = (d, label) => d.locator('label').filter({ has: p.locator('xpath=./span[1]').filter({ hasText: new RegExp('^\\s*' + esc(label) + '\\s*\\*?\\s*$') }) }).first();
  const errOf = async (d, label) => ((await lab(d, label).innerText({ timeout: 1500 }).catch(() => '')).split('\n').slice(1).join(' ').trim());
  const save = async (d, what = 'Save draft') => { await fill(d); await d.locator(`button:has-text("${what}")`).click(); await p.waitForTimeout(250); };
  const trade = async (d, t) => { await d.locator('[role=combobox][aria-haspopup=listbox]').filter({ hasText: /Select trades|,/ }).first().click(); await p.locator('[role=option]').filter({ hasText: t }).first().click(); await d.locator('h2,h3').first().click(); };
  const base = async (d, o = {}) => {
    await lab(d, 'Company / trade name').locator('input').fill(o.name ?? 'Field Test Traders');
    await lab(d, 'GSTIN').locator('input').fill(o.gstin ?? '27FLDTS1234A1Z5'); if (o.pan !== undefined) await lab(d, 'PAN').locator('input').fill(o.pan);
    await lab(d, 'Contact person').locator('input').first().fill(o.contact ?? 'Ravi'); await d.locator('input[type=email]').first().fill(o.email ?? 'ravi@fieldtest.in');
    if (o.trade !== false) await trade(d, 'Hardware');
  };
  const count = async () => (await S()).vendors.length;
  await T('F-01', 'Empty form: required fields flagged, nothing saved', async () => {
    const d = await open(); const n0 = await count(); await save(d);
    const errs = { name: await errOf(d, 'Company / trade name'), gstin: await errOf(d, 'GSTIN'), pan: await errOf(d, 'PAN'), contact: await errOf(d, 'Contact person'), email: await errOf(d, "Email") };
    const n1 = await count(); await p.keyboard.press('Escape');
    return [JSON.stringify(errs), n1 === n0 && errs.name && errs.gstin && errs.pan && errs.contact && errs.email];
  });
  await T('F-02', 'GSTIN fills PAN and State automatically (dependent fields)', async () => {
    const d = await open(); await lab(d, 'GSTIN').locator('input').fill('29ABCDE1234F1Z5'); await p.waitForTimeout(100);
    const pan = await lab(d, 'PAN').locator('input').inputValue(); const state = (await lab(d, 'State').innerText()).replace(/^State\s*\*?\s*/, '');
    await p.keyboard.press('Escape'); return [`PAN ${pan}; State ${state.split('\n')[0]}`, pan === 'ABCDE1234F' && /Karnataka/.test(state)];
  });
  await T('F-03', 'Invalid GSTIN format rejected', async () => {
    const d = await open(); await base(d, { gstin: '27XYZ' }); await save(d); const e = await errOf(d, 'GSTIN'); await p.keyboard.press('Escape'); return [e, /valid 15-character GSTIN/.test(e)];
  });
  await T('F-04', 'PAN that does not match the GSTIN rejected', async () => {
    const d = await open(); await base(d, { gstin: '27FLDTS1234A1Z5', pan: 'ZZZZZ9999Z' }); await save(d); const e = await errOf(d, 'PAN'); await p.keyboard.press('Escape'); return [e, /match GSTIN/.test(e)];
  });
  await T('F-05', 'Duplicate GSTIN (already registered) rejected', async () => {
    const v = (await S()).vendors.find((x) => x.gstin && x.gstin.length === 15); const d = await open(); await base(d, { gstin: v.gstin }); await save(d);
    const e = await errOf(d, 'GSTIN'); await p.keyboard.press('Escape'); return [e, /Already registered/.test(e)];
  });
  await T('F-06', 'Invalid e-mail and phone rejected', async () => {
    const d = await open(); await base(d, { email: 'ravi@' }); await lab(d, "Phone / mobile").locator('input').first().fill('12ab'); await save(d);
    const e1 = await errOf(d, "Email"), e2 = await errOf(d, 'Phone / mobile'); await p.keyboard.press('Escape'); return [`${e1} | ${e2}`, /valid email/i.test(e1) && !!e2];
  });
  await T('F-07', 'Trade is required on the full form', async () => {
    const d = await open(); await base(d, { trade: false }); await save(d); const e = await errOf(d, 'Trades / categories'); await p.keyboard.press('Escape'); return [e, /at least one/.test(e)];
  });
  await T('F-08', 'Bank details: partial entry must be complete and valid (IFSC format)', async () => {
    const d = await open(); await base(d); await lab(d, 'IFSC').locator('input').fill('HDFC12'); await save(d);
    const e = await errOf(d, 'IFSC'); await p.keyboard.press('Escape'); return [e || '(no message)', !!e];
  });
  await T('F-09', 'Ticking Labour shows the contractor statutory fields (conditional) and sets TDS 194C', async () => {
    const d = await open(); const before = await lab(d, 'Labour licence no. (CLRA)').count();
    await d.locator('[role=checkbox]:has-text("Labour")').first().click(); await p.waitForTimeout(150);
    const after = await lab(d, 'Labour licence no. (CLRA)').count(); const tds = (await lab(d, 'Withholding tax (TDS)').innerText().catch(() => '')).split('\n').slice(1).join(' ');
    await p.keyboard.press('Escape'); return [`licence field before ${before}, after ${after}; TDS ${tds}`, before === 0 && after === 1 && /194C/.test(tds)];
  });
  await T('F-10', 'Labour licence with a past expiry date rejected', async () => {
    const d = await open(); await base(d); await d.locator('[role=checkbox]:has-text("Labour")').first().click(); await p.waitForTimeout(100);
    await lab(d, 'Labour licence no. (CLRA)').locator('input').fill('CLRA/MH/2024/12345'); await lab(d, 'Licence valid till').locator('input').fill('2020-01-01'); await save(d);
    const e = await errOf(d, 'Licence valid till'); await p.keyboard.press('Escape'); return [e, /expired/.test(e)];
  });
  await T('F-11', 'Goods-only vendor defaults TDS to 194Q', async () => {
    const d = await open(); await d.locator('button[role=checkbox]:has-text("Goods")').click(); await p.waitForTimeout(80); const tds = (await lab(d, 'Withholding tax (TDS)').innerText().catch(() => '')).split('\n').slice(1).join(' '); await p.keyboard.press('Escape'); return [tds, /194Q/.test(tds)];
  });
  await T('F-12', 'Valid full form saves; values land in the vendor record (form → data mapping)', async () => {
    const d = await open(); await base(d, { name: 'Mapping Check Pvt Ltd', gstin: '27MAPCK1234B1Z9', email: 'ops@mapping.in', contact: 'Meera' });
    await lab(d, "Phone / mobile").locator('input').first().fill('9876543210'); await save(d);
    const v = (await S()).vendors.find((x) => x.name === 'Mapping Check Pvt Ltd');
    const ok = v && v.gstin === '27MAPCK1234B1Z9' && v.pan === 'MAPCK1234B' && v.state === 'Maharashtra' && v.contact.name === 'Meera' && v.contact.email === 'ops@mapping.in' && v.contact.phone.includes('9876543210') && v.categories.includes('Hardware') && v.status === 'Draft';
    return [v ? `${v.id} ${v.status}: GSTIN ${v.gstin}, PAN ${v.pan}, state ${v.state}, contact ${v.contact.name} ${v.contact.email} ${v.contact.phone}, trades ${v.categories}` : 'not saved', !!ok];
  });
  await T('F-13', 'Saved record shows the same values in the vendor panel', async () => {
    const v = (await S()).vendors.find((x) => x.name === 'Mapping Check Pvt Ltd'); await go(`vendor-management/registry?open=${v.id}`); await p.waitForTimeout(300);
    const t = await p.locator('[data-drawer]').innerText(); const hits = ['27MAPCK1234B1Z9', 'MAPCK1234B', 'Meera', 'ops@mapping.in', 'Hardware'].filter((x) => t.includes(x));
    return [`${hits.length}/5 values shown`, hits.length === 5];
  });
  await T('F-14', 'Register vendor opens the full form directly; no quick form or send-to-vendor (vendors self-register only via Invite)', async () => {
    await go('vendor-management/registry'); await p.locator('main button:has-text("Register vendor")').first().click(); await p.waitForTimeout(200); const d = dlg();
    const n = await d.locator('input,[role=combobox],[role=checkbox]').count(); const extra = await d.locator('button').filter({ hasText: /Fill all details|send to vendor/i }).count();
    const bank = await d.locator('label:has-text("IFSC")').count(); await p.keyboard.press('Escape');
    return [`${n} fields; bank section ${bank ? 'shown' : 'missing'}; quick / send buttons ${extra}`, n > 30 && bank > 0 && extra === 0];
  });
});
