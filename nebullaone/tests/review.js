// Review follow-ups — duplicate supplier detection (GSTIN / bank account block; PAN / e-mail / phone warn),
// the approver's "possible duplicate" note, and the Exception Center.
require('./lib')('review', async ({ p, go, dlg, S, mut, T }) => {
  const open = async () => { await go('vendor-management/registry'); await p.locator('main button:has-text("Register vendor")').first().click(); await p.waitForTimeout(250); return dlg(); };
  const lab = (d, label) => d.locator('label').filter({ has: p.locator('xpath=./span[1]').filter({ hasText: new RegExp('^\\s*' + label.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&') + '\\s*\\*?\\s*$') }) }).first();
  const s0 = await S(); const ref = s0.vendors.find((v) => (v.bankAccounts || []).length && v.contact?.email && v.contact?.phone);
  const acct = ref.bankAccounts[0];

  await T('DUP-01', 'Registering with a bank account that belongs to another vendor is refused (names the vendor)', async () => {
    const d = await open();
    await lab(d, 'Account no.').locator('input').first().fill(String(acct.account)); await lab(d, 'IFSC').locator('input').fill(acct.ifsc || '');
    await d.locator('button:has-text("Save draft")').click(); await p.waitForTimeout(250);
    const t = await d.textContent(); await p.keyboard.press('Escape');
    return [(t.match(/This bank account is already registered to[^)]*\)/) || ['no message'])[0], new RegExp(`already registered to ${ref.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(t)];
  });
  await T('DUP-02', 'Same e-mail and same phone as an existing vendor are flagged while typing', async () => {
    const d = await open();
    await d.locator('input[type=email]').first().fill(ref.contact.email); await lab(d, 'Phone / mobile').locator('input').first().fill(ref.contact.phone); await p.waitForTimeout(150);
    const t = await d.textContent(); await p.keyboard.press('Escape');
    return [`e-mail flag ${/Same e-mail as/.test(t)}, phone flag ${/Same phone as/.test(t)}`, /Same e-mail as/.test(t) && /Same phone as/.test(t)];
  });
  await T('DUP-03', 'Adding an existing vendor\'s bank account to another vendor is refused', async () => {
    const other = s0.vendors.find((v) => v.id !== ref.id && v.status === 'Draft') || s0.vendors.find((v) => v.id !== ref.id);
    await mut(`(s) => { s.vendors.find((v) => v.id === '${other.id}').status = 'Draft'; }`);
    await go(`vendor-management/registry?open=${other.id}`); await p.waitForTimeout(300); await dlg().locator('[role=tab]:has-text("Bank")').click(); await p.waitForTimeout(150);
    await dlg().locator('button:has-text("Add bank account")').click(); await p.waitForTimeout(150);
    await dlg().locator('label:has-text("Account no.") input').first().fill(String(acct.account)); await dlg().locator('label:has-text("IFSC") input').fill(acct.ifsc || ''); await p.waitForTimeout(150);
    const t = await dlg().textContent(); const n0 = (await S()).vendors.find((v) => v.id === other.id).bankAccounts.length;
    await dlg().locator('button:has-text("Add")').last().click(); await p.waitForTimeout(200);
    const n1 = (await S()).vendors.find((v) => v.id === other.id).bankAccounts.length;
    return [`message ${/already registered to/.test(t)}; accounts ${n0} → ${n1}`, /already registered to/.test(t) && n1 === n0];
  });
  await T('DUP-04', 'The approver sees "Possible duplicate supplier" for a pending vendor that shares PAN / e-mail with another', async () => {
    const pend = (await S()).vendors.find((v) => v.status === 'Pending Approval');
    await mut(`(s) => { const v = s.vendors.find((x) => x.id === '${pend.id}'); v.contact.email = '${ref.contact.email}'; }`);
    await go(`vendor-management/approvals?open=${pend.id}`); await p.waitForTimeout(350); await dlg().locator('[role=tab]:has-text("Approvals")').click(); await p.waitForTimeout(150);
    const row = await dlg().locator('[data-dup] tr').filter({ hasText: ref.name }).first().innerText().catch(() => '');
    return [row.replace(/\s+/g, ' ').slice(0, 120), /E-mail/.test(row) && /\d+%/.test(row)];
  });
  await T('EX-01', 'Exception Center lists live problems from every area and each row opens its record', async () => {
    await go('administration/exceptions'); await p.waitForTimeout(500);
    const rows = await p.locator('main table tbody tr').allInnerTexts();
    const kinds = ['Possible duplicate supplier', 'Measurement disputed', 'Invoice mismatch', 'PO delivery overdue'].filter((k) => rows.some((r) => r.includes(k)));
    await p.locator('main table tbody tr').filter({ hasText: 'Measurement disputed' }).first().click(); await p.waitForTimeout(400);
    const opened = /measurement-book\?open=/.test(p.url()) && (await p.locator('[data-drawer]').count()) > 0;
    return [`${rows.length} rows; kinds found: ${kinds.join(', ')}; row opens record: ${opened}`, kinds.length === 4 && opened];
  });
  await T('EX-02', 'Fixing the problem removes the exception (dispute settled → row gone)', async () => {
    await mut(`(s) => { s.measurements.filter((m) => m.jms && m.jms.status === 'Disputed').forEach((m) => { m.jms.status = 'Signed'; }); }`);
    await go('administration/exceptions'); await p.waitForTimeout(400);
    const n = await p.locator('main table tbody tr').filter({ hasText: 'Measurement disputed' }).count();
    return [`disputed rows left: ${n}`, n === 0];
  });
  await T('DUP-05', 'Duplicate review shows match % and matched fields; "Different supplier" dismisses it (audited)', async () => {
    const pend = (await S()).vendors.find((v) => v.status === 'Pending Approval');
    await mut(`(s) => { const v = s.vendors.find((x) => x.id === '${pend.id}'); v.contact.email = '${ref.contact.email}'; }`);
    await go(`vendor-management/approvals?open=${pend.id}`); await p.waitForTimeout(350); await dlg().locator('[role=tab]:has-text("Approvals")').click(); await p.waitForTimeout(150);
    const row = dlg().locator('[data-dup] tr').filter({ hasText: ref.name }).first(); await row.locator('button:has-text("Different")').click(); await p.waitForTimeout(150);
    await dlg().locator('input').last().fill('Different company — separate GSTIN'); await dlg().locator('button:has-text("Confirm")').click(); await p.waitForTimeout(250);
    const s = await S(); const d = s.vendors.find((x) => x.id === pend.id).dupDecisions?.[ref.id]; const a = s.audit.find((x) => x.id === pend.id && /Duplicate review/.test(x.action));
    await go('administration/exceptions'); const ex = await p.locator('main table tbody tr').filter({ hasText: 'Possible duplicate supplier' }).filter({ hasText: pend.name }).count();
    return [`decision ${d?.decision} (${d?.confidence}%); audit ${!!a}; exception left ${ex}`, d?.decision === 'Different supplier' && !!a && ex === 0];
  });
  await T('DUP-06', 'Merge: registration rejected as duplicate; its documents / bank accounts move to the existing vendor (unverified)', async () => {
    await mut(`(s) => { const v = s.vendors.find((x) => x.id === 'VEN-008'); v.status = 'Pending Approval'; v.approval.stages.forEach((a, i) => { a.status = i === 0 ? 'Pending' : 'Waiting'; a.by = null; a.at = null; }); }`);
    const s0 = await S(); const pend = s0.vendors.find((v) => v.id === 'VEN-008');
    const tgt = s0.vendors.find((v) => v.id === 'VEN-011');
    await mut(`(s) => { const v = s.vendors.find((x) => x.id === '${pend.id}'); v.pan = '${tgt.pan}'; v.bankAccounts = [{ id: 77, bank: 'Axis Bank', account: '918000011112222', ifsc: 'UTIB0000999', status: 'Unverified', isDefault: true }]; }`);
    await go(`vendor-management/approvals?open=${pend.id}`); await p.waitForTimeout(350); await dlg().locator('[role=tab]:has-text("Approvals")').click(); await p.waitForTimeout(150);
    const row = dlg().locator('[data-dup] tr').filter({ hasText: tgt.name }).first(); const rt = await row.innerText();
    await row.locator('button:has-text("Merge")').click(); await p.waitForTimeout(150); await dlg().locator('input').last().fill('Same PAN — re-registration by branch office'); await dlg().locator('button:has-text("Confirm")').click(); await p.waitForTimeout(300);
    const s = await S(); const v = s.vendors.find((x) => x.id === pend.id), t = s.vendors.find((x) => x.id === tgt.id); const moved = t.bankAccounts.find((b) => b.account === '918000011112222');
    return [`row "${rt.replace(/\s+/g, ' ').slice(0, 70)}"; ${v.status}, mergedInto ${v.mergedInto}; bank moved ${moved?.status} change ${moved?.change?.status}`, v.status === 'Rejected' && v.mergedInto === tgt.id && moved?.status === 'Unverified' && /PAN/.test(rt)];
  });
});
