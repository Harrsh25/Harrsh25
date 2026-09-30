const H = require('../tools/lib');
module.exports = async () => {
  const t = H.T('Bank accounts: holder, validation, verification, default, remove');
  const { b, p, errors } = await H.open();
  await H.go(p, '/productivity/vendor-management/registry');
  await p.click('main >> text=Deccan Steel Traders'); await H.sleep(500);
  await H.click(p, 'Bank 1', { exact: false }).catch(() => H.click(p, 'Bank', { exact: false }));
  let tx = await H.text(p);
  t.ok(/Account holder/.test(tx) && /Verification/.test(tx) && /Type/.test(tx), 'bank table has holder / type / verification columns');
  await H.fill(p, 'Account holder', '');
  await H.fill(p, 'Account no.', '12');
  await H.fill(p, 'IFSC', 'BAD');
  await H.click(p, 'Add');
  const a = (await H.alerts(p)).join(' | ');
  t.ok(/holder/i.test(a) && /Enter the bank name/.test(a) && /9.18 digits/.test(a) && /IFSC must be 11/.test(a), 'add-account validation errors shown: ' + a);
  const acct0 = (await H.store(p) || { vendors: [] }).vendors.find(v => v.name === 'Deccan Steel Traders');
  // mismatching holder -> verification fails
  await H.fill(p, 'Account holder', 'Random Person');
  await H.fill(p, 'Bank', 'ICICI Bank');
  await H.fill(p, 'Account no.', '001234567890');
  await H.fill(p, 'IFSC', 'ICIC0001234');
  await H.click(p, 'Add');
  let st = await H.store(p); let v = st.vendors.find(v => v.name === 'Deccan Steel Traders');
  const added = v.bankAccounts.find(x => x.account === '001234567890');
  t.ok(added && added.status === 'Unverified' && added.holder === 'Random Person', 'account added as Unverified with holder');
  // duplicate
  await H.fill(p, 'Account holder', 'Deccan Steel Traders');
  await H.fill(p, 'Bank', 'ICICI Bank'); await H.fill(p, 'Account no.', '001234567890'); await H.fill(p, 'IFSC', 'ICIC0001234');
  await H.click(p, 'Add');
  t.ok(/already on file/.test((await H.alerts(p)).join(' ')), 'duplicate account rejected');
  // verify (mismatch) -> Rejected
  await p.evaluate(() => { const r = [...[...document.querySelectorAll('[role=dialog]')].pop().querySelectorAll('tr')].find(r => r.innerText.includes('7890')); [...r.querySelectorAll('button')].find(b => b.innerText === 'Verify').click(); });
  await H.sleep(400);
  st = await H.store(p); v = st.vendors.find(v => v.name === 'Deccan Steel Traders');
  let x = v.bankAccounts.find(x => x.account === '001234567890');
  t.ok(x.status === 'Rejected' && /name does not match/.test(x.remark) && x.verifiedBy, 'penny-drop name mismatch -> Rejected with remark + verifiedBy');
  // add a matching one & verify
  await H.fill(p, 'Account holder', 'Deccan Steel Traders LLP'); await H.fill(p, 'Bank', 'Kotak'); await H.fill(p, 'Account no.', '991234567812'); await H.fill(p, 'IFSC', 'KKBK0000123');
  await H.click(p, 'Add');
  await p.evaluate(() => { const r = [...[...document.querySelectorAll('[role=dialog]')].pop().querySelectorAll('tr')].find(r => r.innerText.includes('7812')); [...r.querySelectorAll('button')].find(b => b.innerText === 'Verify').click(); });
  await H.sleep(400);
  await p.evaluate(() => { const r = [...[...document.querySelectorAll('[role=dialog]')].pop().querySelectorAll('tr')].find(r => r.innerText.includes('7812')); [...r.querySelectorAll('button')].find(b => b.innerText === 'Make default').click(); });
  await H.sleep(400);
  st = await H.store(p); v = st.vendors.find(v => v.name === 'Deccan Steel Traders');
  x = v.bankAccounts.find(x => x.account === '991234567812');
  t.ok(x.status === 'Verified' && x.verifiedAt && x.isDefault, 'matching holder verified and made default');
  t.ok(v.bankAccounts.filter(a => a.isDefault).length === 1, 'exactly one default account');
  // remove rejected one
  await p.evaluate(() => { const r = [...[...document.querySelectorAll('[role=dialog]')].pop().querySelectorAll('tr')].find(r => r.innerText.includes('7890')); [...r.querySelectorAll('button')].find(b => b.innerText === 'Remove').click(); });
  await H.sleep(400);
  st = await H.store(p); v = st.vendors.find(v => v.name === 'Deccan Steel Traders');
  t.ok(!v.bankAccounts.find(x => x.account === '001234567890'), 'non-default account removed');
  t.ok(st.audit.some(a => /verified \(penny drop\)/.test(a.action)), 'verification written to audit trail');
  t.ok(errors.length === 0, 'no page errors: ' + errors.join('; '));
  await b.close(); return t.done();
};
