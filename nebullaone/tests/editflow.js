// Vendor edit rules: Draft / Changes Requested / Rejected → Edit details; Pending Approval → locked;
// approved (Active / Inactive / On Hold) and Blacklisted → no editing at all
require('./lib')('editflow', async ({ fill, p, go, S, mut, T }) => {
  const s0 = await S(); const byStatus = (st) => s0.vendors.find((v) => v.status === st);
  const hasEdit = async (id) => { await go(`vendor-management/registry?open=${id}`); await p.waitForTimeout(300); return (await p.locator('[data-drawer] button:has-text("Edit details")').count()) > 0; };
  for (const [stt, want] of [['Draft', true], ['Pending Approval', false], ['Active', false], ['On Hold', false], ['Blacklisted', false]]) {
    const v = byStatus(stt); if (!v) continue;
    await T('EF-' + stt.replace(/\s/g, ''), `${stt}: Edit details ${want ? 'offered' : 'not offered'}`, async () => { const e = await hasEdit(v.id); return [`${v.name}: edit ${e}`, e === want]; });
  }
  for (const stt of ['Rejected', 'Changes Requested']) {
    await T('EF-' + stt.replace(/\s/g, ''), `${stt}: Edit details offered (edit and resubmit)`, async () => {
      const v = byStatus('Active'); await mut(`(s) => { s.vendors.find((y) => y.id === '${v.id}').status = '${stt}'; }`); const e = await hasEdit(v.id);
      await mut(`(s) => { s.vendors.find((y) => y.id === '${v.id}').status = 'Active'; }`); return [`edit ${e}`, e];
    });
  }
});
