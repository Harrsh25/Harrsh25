// Status mapping - for each document in each status, the record panel offers only the moves that status allows.
// Invalid transitions must not be offered (or must be disabled with a reason). Runs in Chromium on the built HTML.
require('./lib')('status', async ({ fill, p, go, S, mut, T }) => {
  const acts = async () => { const m = p.locator('[data-drawer] button[title="More actions"]'); if ((await m.count()) && !(await p.locator('[data-actions-menu]').count())) { await m.first().click(); await p.waitForTimeout(80); } return actsNow(); };
  const actsNow = async () => p.locator('[data-drawer]').first().locator('button:visible').evaluateAll((bs) => bs.map((b) => ({ t: b.innerText.replace(/\s+/g, ' ').trim(), d: b.disabled })).filter((x) => x.t));
  // open a record in a given state and check which actions are offered
  const check = async (id, scn, setup, url, allow = [], deny = []) => T(id, scn, async () => {
    if (setup) { const rid = (url.match(/open=([^&]+)/) || [])[1]; await p.evaluate(`(()=>{const s=JSON.parse(localStorage.getItem('nxv-store-v1'));(${setup})(s, ${JSON.stringify(rid)});localStorage.setItem('nxv-store-v1',JSON.stringify(s));})()`); } await go(url); await p.waitForTimeout(300);
    if (!(await p.locator('[data-drawer]').count())) return ['record panel did not open', false];
    const a = await acts(); const live = a.filter((x) => !x.d).map((x) => x.t);
    const has = (t) => live.some((x) => x === t || x.startsWith(t + ' ') || (t.length > 6 && x.startsWith(t)));
    const missing = allow.filter((t) => !has(t)), wrong = deny.filter((t) => has(t));
    return [`offered: ${live.filter((x) => !/^\d|Comments|Close$/.test(x)).slice(0, 9).join(', ')}${missing.length ? ' | MISSING ' + missing.join(', ') : ''}${wrong.length ? ' | SHOULD NOT OFFER ' + wrong.join(', ') : ''}`, !missing.length && !wrong.length];
  });
  const s0 = await S(); const pick = (arr, f) => arr.find(f) || arr[0];
  // ---------- Purchase order
  const po = pick(s0.purchaseOrders, (x) => x.status === 'Issued' && !(x.receipts || []).length);
  await check('ST-PO-1', 'PO Draft → approve or reject only; cannot receive or bill', (s, id) => { s.purchaseOrders.find((y) => y.id === id).status = 'Draft'; }, `vendor-management/purchase-orders?open=${po.id}`, ['Approve & issue', 'Reject'], ['Receive goods', 'Create bill', 'Cancel PO']);
  await check('ST-PO-2', 'PO Issued, nothing received → receive or cancel', (s, id) => { s.purchaseOrders.find((y) => y.id === id).status = 'Issued'; }, `vendor-management/purchase-orders?open=${po.id}`, ['Receive goods', 'Cancel PO'], ['Approve & issue', 'Close (short-close)']);
  await check('ST-PO-3', 'PO Cancelled → no receipt, bill, edit or cancel', (s, id) => { const x = s.purchaseOrders.find((y) => y.id === id); x.status = 'Cancelled'; }, `vendor-management/purchase-orders?open=${po.id}`, [], ['Receive goods', 'Create bill', 'Cancel PO', 'Approve & issue', 'Edit']);
  const poPart = s0.purchaseOrders.find((x) => (x.receipts || []).length && x.status !== 'Closed');
  if (poPart) await check('ST-PO-4', 'PO with goods received → cannot be cancelled', null, `vendor-management/purchase-orders?open=${poPart.id}`, [], ['Cancel PO']);
  // ---------- Bills
  const bill = s0.invoices.find((i) => i.source !== 'RA Bill' && !i.payments.length) || s0.invoices[0];
  await check('ST-BILL-1', 'Bill unpaid → pay or cancel', (s, id) => { const x = s.invoices.find((y) => y.id === id); x.posted = true; delete x.cancelled; x.review = 'Accepted'; }, `vendor-management/invoices?open=${bill.id}`, ['Record payment', 'Cancel bill'], []);
  await check('ST-BILL-2', 'Bill cancelled → no payment, no second cancel', (s, id) => { s.invoices.find((y) => y.id === id).cancelled = { at: '2026-09-01', by: 'x', reason: 'test' }; }, `vendor-management/invoices?open=${bill.id}`, [], ['Record payment', 'Cancel bill', 'Accept invoice', 'Split into instalments', 'Release now', 'Adjust advance']);
  const paid = s0.invoices.find((i) => i.payments.length);
  if (paid) await check('ST-BILL-3', 'Bill with a payment → cannot be cancelled until the payment is reversed', null, `vendor-management/invoices?open=${paid.id}`, [], ['Cancel bill']);
  // ---------- Work orders
  const wo = s0.workOrders.find((w) => !s0.measurements.some((m) => m.woId === w.id)) || s0.workOrders[0];
  await check('ST-WO-1', 'WO Draft → issue or cancel; cannot measure', (s, id) => { s.workOrders.find((y) => y.id === id).status = 'Draft'; }, `contract-labor/work-orders?open=${wo.id}`, ['Issue', 'Cancel WO'], ['Record measurement', 'Mark completed', 'Suspend']);
  await check('ST-WO-2', 'WO Suspended → resume only (no measuring)', (s, id) => { s.workOrders.find((y) => y.id === id).status = 'Suspended'; }, `contract-labor/work-orders?open=${wo.id}`, ['Resume'], ['Record measurement', 'Issue', 'Suspend', 'Issue material', "Deploy from contractor's register…"]);
  await check('ST-WO-3', 'WO Cancelled → no actions that change it', (s, id) => { s.workOrders.find((y) => y.id === id).status = 'Cancelled'; }, `contract-labor/work-orders?open=${wo.id}`, [], ['Record measurement', 'Issue', 'Suspend', 'Resume', 'Cancel WO', 'Short-close', 'Mark completed']);
  const woM = s0.workOrders.find((w) => s0.measurements.some((m) => m.woId === w.id) && ['Issued', 'In Progress'].includes(w.status));
  if (woM) await check('ST-WO-4', 'WO with measured work → cannot be cancelled (short-close instead)', null, `contract-labor/work-orders?open=${woM.id}`, ['Short-close'], ['Cancel WO']);
  // ---------- Measurement book
  const mbBilled = s0.measurements.find((m) => m.billedIn);
  if (mbBilled) await check('ST-MB-1', 'Billed measurement → cannot be withdrawn', null, `contract-labor/measurement-book?open=${mbBilled.id}`, [], ['Withdraw', 'Dispute']);
  // ---------- RA bills
  const ra = s0.raBills.find((b) => b.status === 'Paid') || s0.raBills[0];
  await check('ST-RA-1', 'RA bill Paid → no reject / re-certify', (s, id) => { s.raBills.find((y) => y.id === id).status = 'Paid'; }, `contract-labor/ra-bills?open=${ra.id}`, [], ['Reject', 'Approve', 'Certify', 'Verify']);
  // ---------- Requisitions
  const req = s0.requisitions[0];
  await check('ST-REQ-1', 'Requisition Submitted → approve or reject; no PO yet', (s, id) => { s.requisitions.find((y) => y.id === id).status = 'Submitted'; }, `vendor-management/requisitions?open=${req.id}`, ['Approve', 'Reject'], ['Create PO', 'Create RFQ']);
  await check('ST-REQ-2', 'Requisition Cancelled (rejected) → no PO / RFQ', (s, id) => { s.requisitions.find((y) => y.id === id).status = 'Cancelled'; }, `vendor-management/requisitions?open=${req.id}`, [], ['Create PO', 'Create RFQ', 'Approve']);
  // ---------- RFQ
  const rfq = s0.rfqs.find((r) => (r.awards || []).length || r.awardedTo);
  if (rfq) await check('ST-RFQ-1', 'Awarded RFQ → cannot be cancelled or re-sent', null, `vendor-management/rfq?open=${rfq.id}`, [], ['Cancel RFQ', 'Compose & send']);
  // ---------- Vendors: blocked vendors cannot be ordered from
  await T('ST-V-1', 'Blacklisted vendor cannot be picked for a new PO', async () => {
    const v = s0.vendors.find((x) => x.status === 'Active'); await mut(`(s) => { s.vendors.find((y) => y.id === '${v.id}').status = 'Blacklisted'; }`);
    await go('vendor-management/purchase-orders'); await p.locator('main button:has-text("New PO"), main button:has-text("New purchase order")').first().click(); await p.waitForTimeout(250);
    await p.locator('[role=dialog] [role=combobox]').first().click(); await p.waitForTimeout(150);
    const opts = await p.locator('[role=listbox] [role=option]').allInnerTexts(); const on = opts.find((o) => o.includes(v.name));
    const dis = on ? await p.locator('[role=listbox] [role=option]').filter({ hasText: v.name }).first().getAttribute('aria-disabled') : null;
    await mut(`(s) => { s.vendors.find((y) => y.id === '${v.id}').status = 'Active'; }`);
    return [`${v.name} in list: ${!!on}${on ? ' (disabled ' + dis + ')' : ''}`, !on || dis === 'true'];
  });
  await T('ST-V-2', 'Vendor status menu holds only the business statuses; approval statuses are not set by hand', async () => {
    const v = s0.vendors.find((x) => x.status === 'Active'); await go('vendor-management/registry'); await p.waitForTimeout(300);
    const btn = p.locator(`button[aria-label="Change status of ${v.name}"]`).first();
    if (!(await btn.count())) return ['no status menu on the list', false];
    await btn.click(); await p.waitForTimeout(150);
    const items = await p.locator('[role=menu] [role=menuitem], [role=listbox] [role=option]').evaluateAll((e) => e.map((x) => x.innerText.trim() + (x.getAttribute('aria-disabled') === 'true' || x.disabled ? '(off)' : '')));
    const bad = items.filter((x) => /^(Pending Approval|Changes Requested|Draft|Rejected)$/.test(x));
    return [items.join(', '), items.length === 4 && !bad.length];
  });
});
