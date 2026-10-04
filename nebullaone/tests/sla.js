// G2 - approval deadlines (SLA) per stage and escalation
require('./lib')('sla', async ({ fill, p, go, dlg, S, mut, T }) => {
  const s0 = await S(); const v = s0.vendors.find((x) => x.status === 'Pending Approval');
  const ago = (d) => new Date(Date.now() - d * 86400000).toISOString();
  await T('SLA-01', 'Vendor approval queue shows when each decision is due', async () => {
    await mut(`(s) => { const x = s.vendors.find((y) => y.id === '${v.id}'); x.approval.stages.find((a) => a.status === 'Pending').since = '${ago(10)}'; }`);
    await go('vendor-management/approvals'); const head = await p.locator('main table thead').innerText();
    const row = await p.locator('main table tbody tr').filter({ hasText: v.name }).first().innerText();
    return [`header has "Decision due": ${/Decision due/.test(head)}; ${v.name}: ${(row.match(/Overdue \d+ days?/) || ['-'])[0]}`, /Decision due/.test(head) && /Overdue \d+ days?/.test(row)];
  });
  await T('SLA-02', 'Overdue approval can be escalated - recorded on the stage and in the audit log', async () => {
    await go(`vendor-management/approvals?open=${v.id}`); await dlg().locator('[role=tab]:has-text("Approvals")').click(); await p.waitForTimeout(150);
    const before = await dlg().locator('[data-sla]').innerText();
    await dlg().locator('[data-sla] button:has-text("Escalate")').click(); await p.waitForTimeout(150);
    await dlg().locator('textarea').fill('Site mobilisation waiting'); await dlg().locator('button:has-text("Escalate")').last().click(); await p.waitForTimeout(250);
    const s = await S(); const stg = s.vendors.find((x) => x.id === v.id).approval.stages.find((a) => a.status === 'Pending');
    const a = s.audit.find((x) => x.id === v.id && /escalated/i.test(x.action));
    const after = await p.locator('[data-drawer] [data-sla]').innerText();
    return [`before "${before.replace(/\s+/g, ' ').slice(0, 70)}"; stage escalated to ${stg.escalated?.to}; audit: ${a?.action?.slice(0, 80)}; button gone: ${!/Escalate$/.test(after.trim())}`, !!stg.escalated && !!a && /Escalated to/.test(after) && !(await p.locator('[data-drawer] [data-sla] button').count())];
  });
  await T('SLA-03', 'Exception Center lists the overdue approval (High once escalated)', async () => {
    await go('administration/exceptions');
    const row = await p.locator('main table tbody tr').filter({ hasText: 'Approval overdue' }).filter({ hasText: v.name }).first().innerText();
    return [row.replace(/\s+/g, ' ').slice(0, 140), /High/.test(row) && /escalated to/.test(row)];
  });
  await T('SLA-04', 'Approving the stage restarts the clock for the next stage (on time)', async () => {
    await go(`vendor-management/approvals?open=${v.id}`); await dlg().locator('[role=tab]:has-text("Approvals")').click(); await p.waitForTimeout(150);
    const s = await S(); const x = s.vendors.find((y) => y.id === v.id); const i = x.approval.stages.findIndex((a) => a.status === 'Pending');
    if (i === x.approval.stages.length - 1) return ['pending is last stage - skipped', true];
    await dlg().locator('button:has-text("Approve as")').click(); await p.waitForTimeout(250);
    const t = await p.locator('[data-drawer] [data-sla]').innerText();
    return [t.replace(/\s+/g, ' '), /Due in \d+ days?/.test(t) && !/Escalated/.test(t)];
  });
  await T('SLA-05', 'Contract approvals: deadline shown in the contract and in Approval Management', async () => {
    const c = (await S()).contracts.find((x) => x.status === 'Pending Approval') || (await S()).contracts[0];
    await mut(`(s) => { const c = s.contracts.find((y) => y.id === '${c.id}'); c.status = 'Pending Approval'; c.submittedAt = '${ago(6)}'; c.approval = { stages: [{ role: 'Legal Counsel', status: 'Pending', by: null, at: null, remark: '', since: '${ago(6)}' }, { role: 'Finance Controller', status: 'Waiting', by: null, at: null, remark: '' }] }; }`);
    await go(`contract-labor/contracts?open=${c.id}`); await p.waitForTimeout(200);
    const t = await p.locator('[data-drawer] [data-sla]').innerText();
    await go('approvals/approval-management?module=Contracts'); await p.waitForTimeout(300);
    const row = await p.locator('main table tbody tr').filter({ hasText: c.id }).first().innerText().catch(() => '');
    return [`drawer: ${t.replace(/\s+/g, ' ').slice(0, 80)} | list: ${row.replace(/\s+/g, ' ').slice(0, 120)}`, /Overdue 3 days/.test(t) && /Overdue 3 days/.test(row)];
  });
  await T('SLA-06', 'Deadline and escalate-to are set per stage in Procurement Settings; 0 days is refused', async () => {
    await go('vendor-management/settings'); await p.locator('main [role=tab]:has-text("Gates"), main button:has-text("Gates")').first().click().catch(() => {}); await p.waitForTimeout(200);
    const t = await p.locator('main').innerText();
    const inp = p.locator('main input[aria-label="Deadline (days)"]').first(); await inp.fill('0');
    await p.locator('main button:has-text("Save settings")').click(); await p.waitForTimeout(200);
    const msg = await p.locator('main').innerText();
    return [`columns ${/Deadline \(days\)/.test(t)} / ${/Escalate to/.test(t)}; zero refused: ${/at least 1 day/.test(msg)}`, /Deadline \(days\)/.test(t) && /Escalate to/.test(t) && /at least 1 day/.test(msg)];
  });
});
