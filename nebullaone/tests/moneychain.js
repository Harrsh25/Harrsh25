// MONEY CHAIN - follows a contract's money end to end and checks that every number agrees with every other one:
// contract value + approved change orders → work orders → signed measurements → RA bill lines → deductions → net →
// payable (invoice) → payments (incl. part-payments and reversals) → retention / advance ledger → final settlement screen.
// Every figure is recomputed here independently from the stored records, then compared with what the screens show.
require('./lib')('moneychain', async ({ p, go, dlg, S, mut, T }) => {
  const r2 = (x) => Math.round(x * 100) / 100, near = (a, b, tol = 1) => Math.abs(a - b) <= tol;
  const sum = (a, f) => a.reduce((n, x) => n + (Number(f(x)) || 0), 0);
  const money = (t) => { const neg = /^[−-]/.test(t.trim()); const n = Number(String(t).replace(/[^0-9.]/g, '')); return neg ? -n : n; };
  // reads the final-settlement statement of a contract as { label: amount }
  const statement = async (cid) => {
    await go(`contract-labor/final-settlement?open=${cid}`); await p.waitForTimeout(350);
    const rows = await dlg().locator('table tbody tr').evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => td.innerText.trim())));
    return Object.fromEntries(rows.filter((r) => r.length === 2).map(([k, v]) => [k, money(v)]));
  };
  const s0 = await S();
  const tdsRates = { '194C-1': 1, '194C-2': 2, '194J': 10, '194Q': 0.1, '194I': 2, '194H': 5 };
  const contracts = s0.contracts.filter((c) => s0.raBills.some((b) => b.contractId === c.id && !['Rejected', 'Draft'].includes(b.status)));

  await T('MC-01', 'Revised contract value = original value + approved change orders (screen = arithmetic)', async () => {
    const bad = [];
    for (const c of contracts) {
      const exp = (Number(c.value) || 0) + sum((c.changeOrders || []).filter((o) => o.status === 'Approved'), (o) => o.amount);
      const st = await statement(c.id);
      if (!near(st['Revised contract value'], exp)) bad.push(`${c.id}: screen ${st['Revised contract value']} vs ${exp}`);
    }
    return [bad.length ? bad.join('; ') : `${contracts.length} contracts agree`, !bad.length];
  });

  await T('MC-02', 'Every RA bill line = this-period quantity × WO rate, and gross = sum of its lines', async () => {
    const bad = [];
    for (const b of s0.raBills.filter((x) => x.status !== 'Rejected')) {
      const wo = s0.workOrders.find((w) => w.id === b.woId);
      if (wo.type !== 'Lump Sum') for (const l of b.lines) if (!near(l.amount, r2(l.thisQty * l.rate))) bad.push(`${b.id} ${l.lineId}: ${l.amount} ≠ ${l.thisQty}×${l.rate}`);
      if (!near(b.gross, sum(b.lines, (l) => l.amount))) bad.push(`${b.id}: gross ${b.gross} ≠ Σ lines ${sum(b.lines, (l) => l.amount)}`);
    }
    return [bad.length ? bad.slice(0, 4).join('; ') : 'all RA bill lines and gross values add up', !bad.length];
  });

  await T('MC-03', 'Deductions follow the contract terms (retention %, cess %, GST %, TDS rate) and net = gross + GST − deductions', async () => {
    const bad = [];
    for (const b of s0.raBills.filter((x) => x.status !== 'Rejected')) {
      const c = s0.contracts.find((x) => x.id === b.contractId), v = s0.vendors.find((x) => x.id === b.vendorId);
      const chk = (name, got, exp) => { if (!near(got, exp)) bad.push(`${b.id} ${name}: ${got} vs ${exp}`); };
      chk('retention', b.ded.retention, r2((b.gross * (c.retentionPct || 0)) / 100));
      chk('cess', b.ded.cess, r2((b.gross * (c.cessPct || 0)) / 100));
      chk('GST', b.gst, r2((b.gross * (c.gstPct || 0)) / 100));
      if (tdsRates[v.tds] != null) chk('TDS', b.ded.tds, r2((b.gross * tdsRates[v.tds]) / 100));
      chk('net', b.net, r2(b.gross + b.gst - sum(Object.values(b.ded), (x) => x)));
      if (b.net < 0) bad.push(`${b.id}: negative net`);
    }
    return [bad.length ? bad.slice(0, 4).join('; ') : 'every deduction and net matches the contract terms', !bad.length];
  });

  await T('MC-04', 'Nothing billed beyond what was measured and signed (per work-order line), and no measurement billed twice', async () => {
    const bad = [];
    for (const wo of s0.workOrders.filter((w) => w.type !== 'Lump Sum')) {
      const bills = s0.raBills.filter((b) => b.woId === wo.id && b.status !== 'Rejected');
      for (const it of wo.items) {
        const billed = sum(bills.flatMap((b) => b.lines.filter((l) => l.lineId === it.id)), (l) => l.thisQty);
        const signed = sum(s0.measurements.filter((m) => m.woId === wo.id && m.lineId === it.id && m.jms?.status === 'Signed'), (m) => m.qty);
        if (billed > signed + 0.01) bad.push(`${wo.id} ${it.id}: billed ${billed} > signed ${signed}`);
      }
    }
    const used = s0.measurements.filter((m) => m.billedIn); const live = new Set(s0.raBills.filter((b) => b.status !== 'Rejected').map((b) => b.id));
    for (const m of used) if (!live.has(m.billedIn)) bad.push(`${m.id} billed in missing/rejected ${m.billedIn}`);
    return [bad.length ? bad.slice(0, 4).join('; ') : `${s0.workOrders.length} work orders: billed ≤ signed measurement`, !bad.length];
  });

  await T('MC-05', 'Each approved RA bill has one payable for exactly its net; "Paid" bills are fully paid and fully paid payables mark the bill Paid', async () => {
    const bad = [];
    for (const b of s0.raBills.filter((x) => ['Approved', 'Paid'].includes(x.status))) {
      const inv = s0.invoices.find((i) => i.raBillId === b.id && !i.cancelled);
      if (!inv) { bad.push(`${b.id}: no payable`); continue; }
      if (!near(inv.amount, b.net)) bad.push(`${b.id}: payable ${inv.amount} ≠ net ${b.net}`);
      const paid = sum(inv.payments.filter((x) => !x.reversed), (x) => x.amount + (x.tds || 0));
      if (b.status === 'Paid' && paid < b.net - 0.5) bad.push(`${b.id}: Paid but only ${paid} of ${b.net} paid`);
      if (b.status === 'Approved' && paid >= b.net - 0.5) bad.push(`${b.id}: fully paid but still Approved`);
    }
    return [bad.length ? bad.join('; ') : 'RA bills, payables and payments agree', !bad.length];
  });

  // what the ledger / settlement should show for a contract, from raw records
  const expected = (s, c) => {
    const bills = s.raBills.filter((b) => b.contractId === c.id && !['Rejected', 'Draft'].includes(b.status));
    const paid = sum(bills, (b) => { const inv = s.invoices.find((i) => i.id === b.invoiceId); return inv ? Math.min(b.net, sum(inv.payments.filter((x) => !x.reversed), (x) => x.amount + (x.tds || 0))) : 0; });
    return { net: sum(bills, (b) => b.net), paid, ret: sum(bills, (b) => b.ded.retention), adv: sum(bills, (b) => b.ded.advance) };
  };
  await T('MC-06', 'Final-settlement screen: net certified, paid to date, retention held and advance recovered = sum of the RA bills and payments', async () => {
    const bad = [];
    for (const c of contracts) {
      const e = expected(s0, c), st = await statement(c.id);
      if (!near(st['Net certified'], e.net)) bad.push(`${c.id} net certified ${st['Net certified']} vs ${e.net}`);
      if (!near(-st['Less paid to date'], e.paid)) bad.push(`${c.id} paid ${-st['Less paid to date']} vs ${e.paid}`);
      if (!near(-st['Less retention held'], e.ret)) bad.push(`${c.id} retention ${-st['Less retention held']} vs ${e.ret}`);
      if (!near(-st['Less advance recovered'], e.adv)) bad.push(`${c.id} advance ${-st['Less advance recovered']} vs ${e.adv}`);
      if (e.adv > (Number(c.advanceAmount) || 0) + 1) bad.push(`${c.id}: recovered ${e.adv} more than advance given ${c.advanceAmount}`);
    }
    return [bad.length ? bad.slice(0, 4).join('; ') : `${contracts.length} settlement statements agree with the bills`, !bad.length];
  });

  // ---- live chain: part-pay, pay in full, reverse - every screen moves by exactly the amount
  const bill = s0.raBills.find((b) => b.status === 'Approved' && s0.invoices.some((i) => i.id === b.invoiceId && i.payments.filter((x) => !x.reversed).length === 0));
  if (bill) {
    const cid = bill.contractId, part = Math.min(100000, Math.floor(bill.net / 2));
    const base = await statement(cid);
    await T('MC-07', `Part-payment of ₹${part.toLocaleString('en-IN')} on ${bill.id} shows in "paid to date" and the settlement (bill stays Approved)`, async () => {
      await mut(`(s) => { s.invoices.find((i) => i.id === '${bill.invoiceId}').payments.push({ id: 'PAY-T1', date: new Date().toISOString().slice(0, 10), amount: ${part}, tds: 0, mode: 'NEFT', ref: 'UTRTEST1' }); }`);
      const st = await statement(cid); const b = (await S()).raBills.find((x) => x.id === bill.id);
      const moved = r2(-st['Less paid to date'] - -base['Less paid to date']);
      return [`paid to date moved by ${moved}; bill ${b.status}`, near(moved, part) && b.status === 'Approved'];
    });
    await T('MC-08', 'Paying the balance through Record payment marks the RA bill Paid and the settlement shows it fully paid', async () => {
      await go('vendor-management/invoices?open=' + bill.invoiceId); await p.waitForTimeout(300);
      await p.locator('[data-drawer] button:has-text("Record payment")').first().click(); await p.waitForTimeout(250);
      await dlg().locator('button:has-text("Release payment")').click(); await p.waitForTimeout(300);
      const s = await S(); const b = s.raBills.find((x) => x.id === bill.id); const st = await statement(cid);
      const moved = r2(-st['Less paid to date'] - -base['Less paid to date']);
      return [`bill ${b.status}; paid to date moved by ${moved} (net ${bill.net})`, b.status === 'Paid' && near(moved, bill.net)];
    });
    await T('MC-09', 'Reversing that payment re-opens the RA bill (back to Approved) and takes it off "paid to date"', async () => {
      await go('vendor-management/invoices?open=' + bill.invoiceId); await p.waitForTimeout(300);
      const s = await S(); const inv = s.invoices.find((i) => i.id === bill.invoiceId); const last = inv.payments.filter((x) => !x.reversed).slice(-1)[0];
      await p.locator('[data-drawer] tr').filter({ hasText: last.id }).locator('button:has-text("Reverse")').click(); await p.waitForTimeout(200);
      await dlg().locator('textarea').fill('Bounced - wrong beneficiary account'); await dlg().locator('button:has-text("Reverse payment")').click(); await p.waitForTimeout(300);
      const b = (await S()).raBills.find((x) => x.id === bill.id); const st = await statement(cid);
      const moved = r2(-st['Less paid to date'] - -base['Less paid to date']);
      return [`bill ${b.status}; paid to date now ${moved} above the start (the part-payment ${part})`, b.status === 'Approved' && near(moved, part)];
    });
    await T('MC-10', 'The audit log records the reversal and the payments (who / when / what)', async () => {
      const a = (await S()).audit.filter((x) => x.id && String(x.id).includes(bill.invoiceId)).map((x) => x.action);
      return [a.slice(0, 2).join(' | '), a.some((x) => /reversed/i.test(x)) && a.some((x) => /Paid via/i.test(x))];
    });
  }

  await T('MC-11', 'Approving a change order raises the revised contract value everywhere by exactly its amount', async () => {
    const c = (await S()).contracts.find((x) => x.status === 'Active');
    const before = await statement(c.id);
    await mut(`(s) => { const c = s.contracts.find((x) => x.id === '${c.id}'); c.changeOrders.push({ id: 'CO-T1', desc: 'Test variation', reason: 'test', amount: 250000, days: 0, status: 'Approved', raisedOn: new Date().toISOString().slice(0, 10) }); }`);
    const after = await statement(c.id);
    const d1 = after['Revised contract value'] - before['Revised contract value'], d2 = after['Approved variations'] - before['Approved variations'];
    return [`revised +${d1}, variations +${d2}`, near(d1, 250000) && near(d2, 250000)];
  });

  await T('MC-12', 'Changing a sensitive vendor field is audited with the old and new value', async () => {
    const v = (await S()).vendors.find((x) => x.status === 'Active');
    await go(`vendor-management/registry?open=${v.id}`); await p.waitForTimeout(300); await dlg().locator('[role=tab]:has-text("Status & flags")').click(); await p.waitForTimeout(200);
    await p.locator('[data-drawer] [role=combobox][aria-label="Allow bills without PO"]').click(); await p.waitForTimeout(100);
    await p.locator('[role=listbox] [role=option]').filter({ hasText: v.allowBillWithoutPO ? 'No' : 'Yes' }).click(); await p.waitForTimeout(200);
    const a = (await S()).audit[0];
    const ch = (a.changes || []).find((x) => x.field === 'Bills without PO');
    return [ch ? `${ch.field}: ${ch.from} → ${ch.to}` : 'no change recorded', !!ch && ch.from !== ch.to];
  });
});
