const H = require('../tools/lib');
module.exports = async () => {
  const t = H.T('Bill entry, due date, payment value date, select payable, accruals');
  const { b, p, errors } = await H.open();
  await H.go(p, '/productivity/vendor-management/invoices');
  // accruals
  await H.click(p, 'Accruals', { dlg: false });
  const acc = await H.text(p);
  t.ok(/Accruals/.test(acc) && /(GRN|Measurement|Nothing to accrue)/.test(acc), 'accruals view opens with GRN / measurement lines');
  t.ok(/lines · total ₹/.test(acc), 'accruals show a total');
  await H.click(p, 'Close');
  // bill entry
  await H.click(p, 'Enter vendor bill', { dlg: false });
  await H.pick(p, 'Purchase order', 'PO-001');
  await H.fill(p, 'Vendor invoice no.', 'dst/26-27/0412 ');
  let a = (await H.alerts(p)).join(' | ');
  t.ok(/Already entered as INV-/.test(a), 'duplicate vendor invoice number (case/space-insensitive) blocked');
  await H.fill(p, 'Vendor invoice no.', 'DST/26-27/9999');
  await H.fill(p, 'Invoice date', '2099-01-01');
  t.ok(/can't be in the future/.test((await H.alerts(p)).join(' ')), 'future invoice date blocked');
  const today = new Date().toISOString().slice(0, 10);
  await H.fill(p, 'Invoice date', today);
  const due = await (await H.field(p, 'Due date')).inputValue();
  t.ok(due > today, 'due date defaulted from payment terms (' + due + ')');
  await H.fill(p, 'Due date', '2020-01-01');
  t.ok(/before the invoice date/.test((await H.alerts(p)).join(' ')), 'due before invoice date blocked');
  await H.fill(p, 'Due date', due);
  // over-billing
  const q = await p.$$('[role=dialog] table input[type=number]');
  await q[0].fill('99999'); await H.sleep(100);
  t.ok(/only [\d.]+ is billable/.test(await H.text(p)), 'billing more than received qty blocked');
  t.ok(await H.disabled(p, 'Save bill') === true, 'save blocked while over-billed');
  await H.click(p, 'Cancel');
  // select payable
  await H.click(p, 'Select payable', { dlg: false });
  const sel = await p.$$eval('main table tbody input[type=checkbox]:checked', x => x.length);
  const tst = (await H.toasts(p)).join(' ');
  t.ok(sel > 0 || /No bills are due/.test(tst), 'select payable picks due & clear bills (' + sel + ')');
  if (sel > 0) {
    await H.click(p, `Payment run (${sel})`, { dlg: false });
    await H.fill(p, 'Value date', '2099-01-01');
    t.ok(/can't be in the future/.test((await H.alerts(p)).join(' ')), 'future value date blocked');
    await H.fill(p, 'Value date', '2000-01-01');
    t.ok(/Before the bill date/.test((await H.alerts(p)).join(' ')), 'value date before bill date blocked');
    t.ok(await H.disabled(p, 'Release payment') === true, 'release blocked on bad value date');
    await H.fill(p, 'Value date', today);
    t.ok(await H.disabled(p, 'Release payment') === false, 'release enabled with valid date');
    await H.click(p, 'Release payment'); await H.sleep(300);
    const st = await H.store(p);
    t.ok(st.invoices.some(i => i.payments.some(x => x.date === today)), 'payments recorded with value date');
  }
  t.ok(errors.length === 0, 'no page errors: ' + errors.join('; '));
  await b.close(); return t.done();
};
