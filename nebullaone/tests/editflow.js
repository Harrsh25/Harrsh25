// Vendor edit flow: Draft / Rejected / Changes Requested → edit directly; Pending Approval → locked;
// approved (Active / Inactive / On Hold) → change goes for approval (approve applies it, reject discards it); Blacklisted → no edit
require('./lib')('editflow', async ({ p, go, dlg, S, mut, T }) => {
  const s0 = await S(); const byStatus = (st) => s0.vendors.find((v) => v.status === st);
  const hasEdit = async (id) => { await go(`vendor-management/registry?open=${id}`); await p.waitForTimeout(300); return (await p.locator('[data-drawer] button:has-text("Edit details")').count()) > 0; };
  for (const [stt, want] of [['Draft', true], ['Pending Approval', false], ['Active', true], ['On Hold', true], ['Blacklisted', false]]) {
    const v = byStatus(stt); if (!v) continue;
    await T('EF-' + stt.replace(/\s/g, ''), `${stt}: Edit details ${want ? 'offered' : 'not offered'}`, async () => { const e = await hasEdit(v.id); return [`${v.name}: edit ${e}`, e === want]; });
  }
  await T('EF-Rejected', 'Rejected: Edit details offered (edit and resubmit)', async () => {
    const v = byStatus('Active'); await mut(`(s) => { s.vendors.find((y) => y.id === '${v.id}').status = 'Rejected'; }`); const e = await hasEdit(v.id);
    await mut(`(s) => { s.vendors.find((y) => y.id === '${v.id}').status = 'Active'; }`); return [`edit ${e}`, e];
  });
  const a = s0.vendors.find((v) => v.status === 'Active');
  await T('EF-SUBMIT', 'Approved vendor: edit is sent for approval; current details stay until approved', async () => {
    await go(`vendor-management/registry?open=${a.id}`); await p.waitForTimeout(300); await p.locator('[data-drawer] button:has-text("Edit details")').click(); await p.waitForTimeout(250);
    const d = dlg(); await d.locator('label:has-text("City") input').first().fill('Nashik'); await d.locator('input[placeholder^="Why is this changing"]').fill('Office moved');
    await d.locator('button:has-text("Submit change for approval")').click(); await p.waitForTimeout(300);
    const v = (await S()).vendors.find((x) => x.id === a.id);
    return [`city now ${v.city}; pending: ${(v.pendingEdit?.changes || []).map((c) => `${c.field} ${c.from} → ${c.to}`).join('; ')}`, v.city === a.city && v.pendingEdit && v.pendingEdit.changes.some((c) => c.field === 'City' && c.to === 'Nashik')];
  });
  await T('EF-LIST', 'List shows Approval = Change Pending; vendor appears in the approval queue', async () => {
    await go('vendor-management/registry'); const row = await p.locator('main tbody tr').filter({ hasText: a.name }).innerText();
    await go('vendor-management/approvals'); const q = await p.locator('main tbody').innerText();
    return [`row has "Change Pending": ${row.includes('Change Pending')}; in queue: ${q.includes(a.name)}`, row.includes('Change Pending') && q.includes(a.name)];
  });
  await T('EF-APPROVE', 'Approve change → applied; pending cleared', async () => {
    await go(`vendor-management/registry?open=${a.id}`); await p.waitForTimeout(300); await p.locator('[data-drawer] button:has-text("Approve change")').click(); await p.waitForTimeout(250);
    const v = (await S()).vendors.find((x) => x.id === a.id); return [`city ${v.city}; pending ${!!v.pendingEdit}`, v.city === 'Nashik' && !v.pendingEdit];
  });
  await T('EF-REJECT', 'Reject change → discarded with reason; details unchanged', async () => {
    await go(`vendor-management/registry?open=${a.id}`); await p.waitForTimeout(300); await p.locator('[data-drawer] button:has-text("Edit details")').click(); await p.waitForTimeout(250);
    let d = dlg(); await d.locator('label:has-text("City") input').first().fill('Surat'); await d.locator('input[placeholder^="Why is this changing"]').fill('Test'); await d.locator('button:has-text("Submit change for approval")').click(); await p.waitForTimeout(300);
    await p.locator('[data-drawer] button:has-text("Reject change")').click(); await p.waitForTimeout(200); d = dlg();
    await d.locator('textarea:not([aria-label="Write a comment"])').first().fill('Not confirmed by the vendor'); await d.locator('button').filter({ hasText: /^Reject change/ }).last().click(); await p.waitForTimeout(250);
    const v = (await S()).vendors.find((x) => x.id === a.id); return [`city ${v.city}; pending ${!!v.pendingEdit}; note "${v.notes[0]?.text}"`, v.city === 'Nashik' && !v.pendingEdit && /rejected/.test(v.notes[0]?.text || '')];
  });
});
