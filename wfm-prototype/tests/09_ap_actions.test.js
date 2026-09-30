const H = require('../tools/lib');
module.exports = async () => {
  const t = H.T('Blanket order, vendor advance, debit note, instalments, advance adjustment');
  const { b, p, errors } = await H.open();
  const today = new Date().toISOString().slice(0, 10);
  // --- blanket order
  await H.go(p, '/productivity/vendor-management/blanket-orders');
  await H.click(p, 'New blanket order', { dlg: false });
  t.ok(await H.disabled(p, 'Save agreement') === true, 'empty agreement cannot be saved');
  await H.pick(p, 'Vendor', 'Deccan Steel');
  await H.fill(p, 'Title', 'Test rate agreement');
  await H.fill(p, 'Agreement deadline', '2000-01-01');
  t.ok(/after the start date/.test((await H.alerts(p)).join(' ')), 'deadline before start rejected');
  const d = new Date(); d.setDate(d.getDate() + 200); await H.fill(p, 'Agreement deadline', d.toISOString().slice(0, 10));
  let li = await p.$$('[role=dialog] .grid.grid-cols-\\[1fr_90px_120px_130px_28px\\] input');
  await li[0].fill('Binding wire'); await li[2].fill('100'); await li[3].fill('0'); await H.sleep(100);
  t.ok(/rate must be greater than 0/.test(await H.text(p)), 'zero rate rejected');
  await li[3].fill('70'); await H.sleep(100);
  await H.click(p, 'Add line');
  li = await p.$$('[role=dialog] .grid.grid-cols-\\[1fr_90px_120px_130px_28px\\] input');
  await li[4].fill('binding wire '); await li[6].fill('5'); await li[7].fill('70'); await H.sleep(100);
  t.ok(/same item appears twice/.test(await H.text(p)), 'duplicate item rejected');
  await li[4].fill('Cover blocks'); await H.sleep(100);
  t.ok(await H.disabled(p, 'Save agreement') === false, 'valid agreement can be saved');
  await H.click(p, 'Save agreement'); await H.sleep(300);
  t.ok((await H.store(p)).blanketOrders.some(x => x.title === 'Test rate agreement' && x.lines.length === 2), 'blanket order saved');
  while (await H.dialogs(p)) { await p.keyboard.press('Escape'); await H.sleep(250); }
  // --- vendor advance
  await H.go(p, '/productivity/vendor-management/invoices');
  await H.click(p, 'Record advance', { dlg: false });
  await H.pick(p, 'Vendor', 'Deccan Steel');
  await H.fill(p, 'Amount (₹)', '100000');
  await H.fill(p, 'Date paid', '2099-01-01');
  t.ok(/can't be in the future/.test((await H.alerts(p)).join(' ')), 'future advance date rejected');
  await H.fill(p, 'Date paid', today);
  t.ok(await H.disabled(p, 'Save') === true, 'payment reference is mandatory');
  await H.fill(p, 'Payment reference', 'UTR998877');
  await H.click(p, 'Save'); await H.sleep(300);
  let st = await H.store(p);
  const adv = st.vendorAdvances.find(a => a.ref === 'UTR998877');
  t.ok(adv && adv.amount === 100000 && adv.date === today, 'vendor advance saved with date + ref');
  // --- open an unpaid bill of that vendor
  const inv = st.invoices.find(i => i.vendorId === adv.vendorId && i.payments.length === 0) || st.invoices.find(i => i.vendorId === adv.vendorId);
  await H.go(p, '/productivity/vendor-management/invoices?open=' + inv.id); await H.sleep(500);
  if (!(await H.dialogs(p))) { await p.evaluate(id => { const r = [...document.querySelectorAll('main tr')].find(r => r.innerText.includes(id)); r && r.click(); }, inv.id); await H.sleep(600); }
  const has = async s => (await p.evaluate(s => [...([...document.querySelectorAll('[role=dialog]')].pop() || document).querySelectorAll('button')].some(b => b.innerText.trim() === s), s));
  // debit note
  if (await has('Add note')) {
    await H.click(p, 'Add note');
    await H.pick(p, 'Type', 'Debit Note');
    await H.fill(p, 'Amount (₹, incl. GST)', '999999999');
    t.ok(/can't exceed the outstanding/.test((await H.alerts(p)).join(' ')), 'debit note above outstanding rejected');
    await H.fill(p, 'Amount (₹, incl. GST)', '1000');
    await H.fill(p, 'Reason', 'abc');
    t.ok(/min 5 characters/.test((await H.alerts(p)).join(' ')), 'short note reason rejected');
    await H.click(p, 'Cancel');
  } else t.ok(false, 'Add note button not found on ' + inv.id);
  // instalments
  if (await has('Split into instalments') || await has('Payment schedule') || await has('Edit schedule')) {
    const lbl = (await has('Split into instalments')) ? 'Split into instalments' : (await has('Payment schedule')) ? 'Payment schedule' : 'Edit schedule';
    await H.click(p, lbl);
    const di = await p.$$('[role=dialog]:last-of-type input[type=date]');
    await di[0].fill('2000-01-01'); await H.sleep(100);
    t.ok(/due before the bill date/.test((await H.alerts(p)).join(' ')), 'instalment before bill date rejected');
    await H.click(p, 'Cancel');
  } else t.ok(true, 'schedule action not offered for this bill (skipped)');
  // advance adjust
  if (await p.evaluate(() => [...([...document.querySelectorAll('[role=dialog]')].pop() || document).querySelectorAll('button')].some(b => b.innerText.trim().startsWith('Adjust advance')))) {
    await H.click(p, 'Adjust advance', { exact: false });
    await H.pick(p, 'Advance', adv.id);
    await H.fill(p, 'Amount to adjust', '100001');
    t.ok(/left on ADV|Exceeds the bill balance/.test((await H.alerts(p)).join(' ')), 'adjustment above advance left rejected');
    await H.click(p, 'Cancel');
  } else t.ok(false, 'Adjust advance button not found');
  t.ok(errors.length === 0, 'no page errors: ' + errors.join('; '));
  await b.close(); return t.done();
};
