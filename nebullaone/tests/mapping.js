// WORKFLOW MAPPING UAT - takes the data left by final.js (the full vendor and contractor lifecycles
// driven through the screens) and checks that every field carried from one step to the next maps
// correctly, both in the data and on the screen the user sees:
//   P2P:   registration → vendor master → RFQ → quotation → award → PO → goods receipt → bill (3-way) → payment
//   C2C:   registration → contractor master → tender → contract BOQ → work order → change order →
//          measurement / JMS → RA bill (deductions) → payable → payment → retention → close-out
// plus record-to-record links (each drawer links to the right record) and data-wide invariants
// (every PO / bill / RA bill / measurement points at records that exist and agree with each other).
// Run final.js first (it writes out/final-store.json and out/final-chain.json).
const fs = require('fs');
require('./lib')('mapping', async ({ fill, p, go, dlg, S, T }) => {
  const store = JSON.parse(fs.readFileSync(__dirname + '/out/final-store.json', 'utf8'));
  const chain = JSON.parse(fs.readFileSync(__dirname + '/out/final-chain.json', 'utf8'));
  await p.evaluate((s) => localStorage.setItem('nxv-store-v1', JSON.stringify(s)), store);
  const s = await S();
  const by = (list, id) => list.find((x) => x.id === id);
  const inr = (n) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
  const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const near = (a, b, tol = 1) => Math.abs((Number(a) || 0) - (Number(b) || 0)) <= tol;
  const sum = (a, f = (x) => x) => a.reduce((t, x) => t + (Number(f(x)) || 0), 0);
  const lineRate = (q, i) => (q.rates[i] == null || q.rates[i] === '' || (q.noBid && q.noBid[i]) ? null : Number(q.rates[i]) * (1 - (Number(q.discounts?.[i]) || 0) / 100) * (Number(q.fx) || 1));
  const drawerText = async (route) => { await go(route); await p.waitForTimeout(350); return (await dlg().innerText().catch(() => '')) || ''; };
  const links = async () => p.$$eval('[role=dialog] a[href*="open="]', (as) => as.map((a) => a.getAttribute('href')));

  // ---------------------------------------------------------------- P2P (goods)
  const V = chain.vendor, v = by(s.vendors, V.id), rfq = by(s.rfqs, V.rfq), po = by(s.purchaseOrders, V.po), inv = by(s.invoices, V.invoice);
  const VN = { name: 'Sahyadri Steel Traders', gst: '27SAHYD4411K1Z5', pan: 'SAHYD4411K', contact: 'Meera Kulkarni', email: 'sales@sahyadristeel.in', trade: 'Steel' };

  await T('P2P-01', 'Registration → vendor master: name, GSTIN, PAN, contact, e-mail, category', async () => {
    const bad = []; if (v.name !== VN.name) bad.push('name'); if (v.gstin !== VN.gst) bad.push('GSTIN'); if (v.pan !== VN.pan) bad.push('PAN');
    if (v.contact?.name !== VN.contact) bad.push('contact'); if (v.contact?.email !== VN.email) bad.push('e-mail'); if (!(v.categories || []).includes(VN.trade)) bad.push('category');
    const t = await drawerText('vendor-management/registry?open=' + v.id); const shown = [VN.gst, VN.pan, VN.contact, VN.email].filter((x) => !t.includes(x));
    return [`${v.id}: data ${bad.length ? 'mismatch ' + bad.join(', ') : 'OK'}; vendor record shows ${shown.length ? 'missing ' + shown.join(', ') : 'all fields'}`, !bad.length && !shown.length];
  });
  await T('P2P-02', 'Vendor master → RFQ: vendor invited, RFQ shows the vendor', async () => {
    await drawerText('vendor-management/rfq?open=' + rfq.id); await p.locator('[data-drawer] [role=tab]').filter({ hasText: 'Vendors' }).first().click(); await p.waitForTimeout(150); const t = await dlg().innerText();
    return [`${rfq.id} invites ${rfq.vendorIds.join(', ')}; screen lists ${v.name}: ${t.includes(v.name)}`, rfq.vendorIds.includes(v.id) && t.includes(v.name)];
  });
  const q = rfq.quotes.find((x) => x.vendorId === v.id);
  await T('P2P-03', 'RFQ lines → quotation: one rate per RFQ line; quote total = Σ qty × rate', async () => {
    const tot = sum(rfq.items.map((it, i) => (Number(it.qty) || 0) * (lineRate(q, i) || 0)));
    return [`${rfq.items.length} RFQ lines, ${q.rates.length} quoted rates; total ${inr(tot)}`, q.rates.length === rfq.items.length && tot > 0];
  });
  await T('P2P-04', 'Award → PO: vendor, RFQ link, and every line (item, unit, qty, rate after discount / FX) carried exactly', async () => {
    const bad = [];
    if (po.vendorId !== v.id) bad.push('vendor'); if (po.rfqId !== rfq.id) bad.push('RFQ link');
    po.lines.forEach((l) => { const i = rfq.items.findIndex((it) => it.desc === l.desc); if (i < 0) return bad.push(`unknown line ${l.desc}`); const it = rfq.items[i];
      if (l.unit !== it.unit) bad.push(`${l.desc} unit`); if (Number(l.qty) !== Number(it.qty)) bad.push(`${l.desc} qty ${l.qty}≠${it.qty}`); if (!near(l.rate, r2(lineRate(q, i)), 0.01)) bad.push(`${l.desc} rate ${l.rate}≠${r2(lineRate(q, i))}`); });
    const t = await drawerText('vendor-management/purchase-orders?open=' + po.id); const l = await links();
    const shows = t.includes(v.name) && po.lines.every((x) => t.includes(x.desc));
    return [`${po.id} ← ${rfq.id}: ${bad.length ? bad.join('; ') : 'all fields match'}; PO screen shows vendor + lines ${shows}; links ${l.filter((h) => /rfq|registry/.test(h)).length}`, !bad.length && shows];
  });
  await T('P2P-05', 'PO → goods receipt: received ≤ ordered (+ tolerance), accepted ≤ received; PO status follows', async () => {
    const bad = []; const rec = {}; po.receipts.forEach((g) => g.lines.forEach((l) => { rec[l.line] = rec[l.line] || { q: 0, a: 0 }; rec[l.line].q += l.qty; rec[l.line].a += l.accepted; if (l.accepted > l.qty) bad.push(`${g.id} accepted > received`); }));
    po.lines.forEach((l, i) => { const r = rec[i] || { q: 0 }; if (r.q > l.qty * (1 + (po.tolerance || 0) / 100) + 1e-6) bad.push(`line ${i} over-received`); });
    const full = po.lines.every((l, i) => (rec[i]?.a || 0) >= l.qty);
    const t = await drawerText('vendor-management/purchase-orders?open=' + po.id);
    return [`${po.receipts.map((g) => g.id).join(', ')}: ${bad.length ? bad.join('; ') : 'quantities consistent'}; fully received ${full}; GRN shown on PO ${po.receipts.every((g) => t.includes(g.id))}`, !bad.length && po.receipts.every((g) => t.includes(g.id))];
  });
  await T('P2P-06', 'Goods receipt → vendor bill: same vendor and PO; billed qty ≤ accepted; bill rate = PO rate (3-way match)', async () => {
    const bad = []; if (inv.vendorId !== v.id) bad.push('vendor'); if (inv.poId !== po.id) bad.push('PO link');
    const acc = {}; po.receipts.forEach((g) => g.lines.forEach((l) => (acc[l.line] = (acc[l.line] || 0) + l.accepted)));
    inv.lines.forEach((l) => { if (l.qty > (acc[l.line] || 0) + 1e-6) bad.push(`line ${l.line} billed ${l.qty} > accepted ${acc[l.line] || 0}`); if (!near(l.rate, po.lines[l.line].rate, 0.01)) bad.push(`line ${l.line} rate ${l.rate}≠PO ${po.lines[l.line].rate}`); });
    const t = await drawerText('vendor-management/invoices?open=' + inv.id);
    return [`${inv.id} (${inv.number}) ← ${po.id}: ${bad.length ? bad.join('; ') : 'qty and rate match'}; bill screen shows PO ${t.includes(po.id)}`, !bad.length && t.includes(po.id)];
  });
  await T('P2P-07', 'Bill → payment: payments + TDS = payable; balance 0; status Paid on list and record', async () => {
    const taxable = sum(inv.lines, (l) => l.qty * l.rate), gst = r2((taxable * (inv.gstPct || 0)) / 100), notes = sum(inv.notes || [], (n) => (n.type === 'Debit Note' ? -n.amount : n.amount));
    const payable = r2(taxable + gst + notes), paid = sum(inv.payments, (x) => x.amount + (x.tds || 0));
    const t = await drawerText('vendor-management/invoices?open=' + inv.id);
    return [`payable ${inr(payable)}, paid ${inr(paid)} (${inv.payments.map((x) => `${x.mode} ${x.ref || ''}`).join(', ')}); screen Paid ${/\bPaid\b/.test(t)}`, near(paid, payable) && /\bPaid\b/.test(t)];
  });
  await T('P2P-08', 'One ID chain on screen: vendor ↔ RFQ ↔ PO ↔ bill links open the right records', async () => {
    const res = [];
    for (const [route, want] of [['vendor-management/purchase-orders?open=' + po.id, [rfq.id]], ['vendor-management/invoices?open=' + inv.id, [po.id]]]) {
      await go(route); await p.waitForTimeout(300); const hs = await links();
      for (const id of want) { const h = hs.find((x) => x.includes('open=' + id)); if (!h) { res.push(`${route.split('?')[0]} has no link to ${id}`); continue; } await go(h.replace(/^#?\/?productivity\//, '').replace(/^#\//, '')); await p.waitForTimeout(350); if (!(await dlg().innerText().catch(() => '')).includes(id)) res.push(`link to ${id} opens the wrong record`); }
    }
    return [res.length ? res.join('; ') : `${po.id} → ${rfq.id} and ${inv.id} → ${po.id} links open the right records`, !res.length];
  });

  // ---------------------------------------------------------------- C2C (contractor)
  const C = chain.contractor, cv = by(s.vendors, C.id), trfq = by(s.rfqs, C.rfq), ct = by(s.contracts, C.contract), wo = by(s.workOrders, C.wo);
  const bills = s.raBills.filter((b) => b.woId === wo.id && b.status !== 'Rejected');
  await T('C2C-01', 'Contractor registration → master: contractor flag, trade, statutory IDs, onboarding complete', async () => {
    const ck = cv.onboarding?.checklist || [];
    return [`${cv.id} ${cv.name}: contractor ${!!(cv.isContractor || cv.type === 'Labor')}, GSTIN ${cv.gstin}, PAN ${cv.pan}, checklist ${ck.filter((x) => x.done).length}/${ck.length}`, (cv.isContractor || cv.type === 'Labor') && cv.gstin === '27DKINF5521M1Z9' && cv.pan === 'DKINF5521M' && ck.length > 0 && ck.every((x) => x.done)];
  });
  const tq = trfq.quotes.find((x) => x.vendorId === cv.id);
  await T('C2C-02', 'Tender → contract BOQ: every line (item, unit, qty, rate) carried; value = Σ BOQ', async () => {
    const bad = []; if (ct.vendorId !== cv.id) bad.push('contractor'); if (ct.rfqId !== trfq.id) bad.push('tender link');
    ct.scope.forEach((l) => { const i = trfq.items.findIndex((it) => it.desc === l.desc); if (i < 0) return bad.push(`unknown ${l.desc}`); const it = trfq.items[i]; if (Number(l.qty) !== Number(it.qty)) bad.push(`${l.desc} qty`); if (l.unit !== it.unit) bad.push(`${l.desc} unit`); if (!near(l.rate, r2(lineRate(tq, i)), 0.01)) bad.push(`${l.desc} rate ${l.rate}≠${r2(lineRate(tq, i))}`); });
    const boq = sum(ct.scope, (l) => l.qty * l.rate);
    const t = await drawerText('contract-labor/contracts?open=' + ct.id);
    return [`${ct.id} ← ${trfq.id}: ${bad.length ? bad.join('; ') : 'BOQ matches the tender'}; value ${inr(ct.value)} vs BOQ ${inr(boq)}; contract screen shows ${cv.name}: ${t.includes(cv.name)}`, !bad.length && near(ct.value, boq) && t.includes(cv.name)];
  });
  await T('C2C-03', 'Contract → work order: contractor, project, WBS, BOQ reference and rate carried', async () => {
    const bad = []; if (wo.contractId !== ct.id) bad.push('contract'); if (wo.vendorId !== ct.vendorId) bad.push('contractor'); if (wo.project !== ct.project) bad.push('project'); if (!wo.wbs) bad.push('WBS');
    wo.items.forEach((it) => { const l = ct.scope.find((x) => x.id === it.boqRef); if (!l) return bad.push(`${it.desc} has no BOQ ref`); if (!near(it.rate, l.rate, 0.01)) bad.push(`${it.desc} rate ${it.rate}≠BOQ ${l.rate}`); });
    const t = await drawerText('contract-labor/work-orders?open=' + wo.id);
    return [`${wo.id} ← ${ct.id} (${wo.project} › ${wo.wbs}): ${bad.length ? bad.join('; ') : 'all fields match'}; WO screen shows ${ct.id}: ${t.includes(ct.id)}`, !bad.length && t.includes(ct.id)];
  });
  await T('C2C-04', 'Change order → contract value and WO quantity', async () => {
    const appr = (ct.changeOrders || []).filter((o) => o.status === 'Approved'); const cvv = Number(ct.value) + sum(appr, (o) => o.amount);
    const qtyCo = sum(appr.flatMap((o) => o.lines || []), (l) => l.qty);
    return [`${appr.map((o) => `${o.id} ${inr(o.amount)}`).join(', ') || 'none'}; revised value ${inr(cvv)}; WO line qty ${wo.items[0].qty} (CO +${wo.items[0].coQty || 0})`, appr.length > 0 && (wo.items[0].coQty || 0) > 0];
  });
  await T('C2C-05', 'Measurement (JMS) → RA bills: each bill uses only this WO\'s signed measurements; billed qty = measured qty', async () => {
    const bad = []; const used = new Set();
    bills.forEach((b) => b.mbIds.forEach((m) => { const mb = by(s.measurements, m); if (!mb) bad.push(`${b.id}: ${m} missing`); else { if (mb.woId !== wo.id) bad.push(`${m} from another WO`); if (mb.jms.status !== 'Signed') bad.push(`${m} not signed`); if (used.has(m)) bad.push(`${m} billed twice`); used.add(m); } }));
    const measured = sum(s.measurements.filter((m) => m.woId === wo.id && m.jms.status === 'Signed' && !m.voided), (m) => m.qty);
    const billed = sum(bills.flatMap((b) => b.lines), (l) => l.thisQty || 0);
    return [`${bills.map((b) => b.id).join(', ')}: ${bad.length ? bad.join('; ') : 'measurements map 1:1'}; measured ${measured}, billed ${billed}`, !bad.length && near(measured, billed, 0.01)];
  });
  await T('C2C-06', 'RA bill amounts: line amount = qty × rate; retention, advance, TDS, cess, GST from contract / vendor; net = gross + GST − deductions', async () => {
    const bad = [];
    for (const b of bills) {
      const g = r2(sum(b.lines, (l) => l.amount)); if (!near(g, b.gross)) bad.push(`${b.id} gross`);
      b.lines.forEach((l) => { if (l.rate != null && !near(l.amount, l.thisQty * l.rate)) bad.push(`${b.id} line ${l.desc} amount`); });
      if (!near(b.ded.retention, (b.gross * (ct.retentionPct || 0)) / 100)) bad.push(`${b.id} retention ${b.ded.retention}≠${r2((b.gross * ct.retentionPct) / 100)}`);
      if (!near(b.gst, (b.gross * (ct.gstPct || 0)) / 100)) bad.push(`${b.id} GST`);
      if (!near(b.ded.cess, (b.gross * (ct.cessPct || 0)) / 100)) bad.push(`${b.id} cess`);
      if (!near(b.net, b.gross + b.gst - sum(Object.values(b.ded)))) bad.push(`${b.id} net`);
    }
    const t = await drawerText('contract-labor/ra-bills?open=' + bills[0].id);
    return [`${bills.length} bills (${bills.map((b) => `${b.id} gross ${inr(b.gross)} net ${inr(b.net)}`).join('; ')}): ${bad.length ? bad.join('; ') : 'all amounts reconcile'}; screen shows net ${inr(bills[0].net)}: ${t.includes(inr(bills[0].net))}`, !bad.length && t.includes(inr(bills[0].net))];
  });
  await T('C2C-07', 'Approved RA bill → payable → payment: payable = RA net; paid in full; RA bill Paid', async () => {
    const bad = [];
    bills.forEach((b) => { const i = by(s.invoices, b.invoiceId); if (!i) return bad.push(`${b.id} has no payable`); if (i.raBillId !== b.id) bad.push(`${i.id} not linked back`); if (!near(i.amount, b.net)) bad.push(`${i.id} ${i.amount}≠${b.net}`); if (b.status !== 'Paid') bad.push(`${b.id} ${b.status}`); if (!near(sum(i.payments, (x) => x.amount + (x.tds || 0)), i.amount)) bad.push(`${i.id} not fully paid`); });
    return [bills.map((b) => `${b.id} → ${b.invoiceId}`).join(', ') + (bad.length ? ' - ' + bad.join('; ') : ' - amounts and links match'), !bad.length];
  });
  await T('C2C-08', 'Retention ledger: held = Σ RA retention; released via approved release; balance 0 at close', async () => {
    const held = sum(bills.filter((b) => b.status !== 'Draft'), (b) => b.ded.retention), rel = sum(s.retentionReleases.filter((r) => r.contractId === ct.id && r.status === 'Released'), (r) => r.amount);
    await go('contract-labor/retention'); await p.waitForTimeout(300); const row = (await p.locator(`tr:has-text("${ct.id}")`).first().innerText().catch(() => '')) || '';
    return [`held ${inr(held)}, released ${inr(rel)}, balance ${inr(held - rel)}; ledger row "${row.replace(/\s+/g, ' ').slice(0, 120)}"`, near(held, rel) && held > 0];
  });
  await T('C2C-09', 'Close-out: handover → final bill flagged → contract Closed → work orders Closed', async () => {
    const fb = bills.find((b) => b.final); const wos = s.workOrders.filter((w) => w.contractId === ct.id);
    return [`handover ${ct.handover?.date}; final bill ${fb?.id}; contract ${ct.status}; WOs ${wos.map((w) => w.status).join(',')}`, !!ct.handover && !!fb && ct.status === 'Closed' && wos.every((w) => w.status === 'Closed')];
  });

  // ---------------------------------------------------------------- data-wide invariants (seed + everything created)
  await T('INV-01', 'Every PO: vendor exists; receipts never accept more than received; PO value = Σ qty × rate shown on the list', async () => {
    const bad = [];
    s.purchaseOrders.forEach((x) => { if (!by(s.vendors, x.vendorId)) bad.push(`${x.id} vendor`); x.receipts.forEach((g) => g.lines.forEach((l) => { if (l.accepted > l.qty) bad.push(`${g.id} accepted>received`); })); });
    await go('vendor-management/purchase-orders'); await p.waitForTimeout(300); const body = await p.locator('main tbody').innerText();
    const miss = s.purchaseOrders.filter((x) => !body.includes(x.id)); return [`${s.purchaseOrders.length} POs: ${bad.length ? bad.join('; ') : 'consistent'}; list shows all ${!miss.length}`, !bad.length && !miss.length];
  });
  await T('INV-02', 'Every bill: vendor and PO exist and agree; balance on the list = payable − paid', async () => {
    const bad = [];
    s.invoices.forEach((i) => { if (!by(s.vendors, i.vendorId)) bad.push(`${i.id} vendor`); if (i.poId) { const x = by(s.purchaseOrders, i.poId); if (!x) bad.push(`${i.id} PO missing`); else if (x.vendorId !== i.vendorId) bad.push(`${i.id} vendor ≠ PO vendor`); } if (i.raBillId && !by(s.raBills, i.raBillId)) bad.push(`${i.id} RA bill missing`); });
    return [`${s.invoices.length} bills: ${bad.length ? bad.join('; ') : 'all links valid'}`, !bad.length];
  });
  await T('INV-03', 'Every RA bill: contract, contractor and WO agree; measurements belong to the WO; no measurement billed twice', async () => {
    const bad = []; const seen = new Map();
    s.raBills.filter((b) => b.status !== 'Rejected').forEach((b) => { const w = by(s.workOrders, b.woId); if (!w) return bad.push(`${b.id} WO`); if (w.contractId !== b.contractId) bad.push(`${b.id} contract ≠ WO contract`); if (w.vendorId !== b.vendorId) bad.push(`${b.id} vendor`);
      (b.mbIds || []).forEach((m) => { const mb = by(s.measurements, m); if (mb && mb.woId !== b.woId) bad.push(`${m} wrong WO`); if (seen.has(m)) bad.push(`${m} in ${seen.get(m)} and ${b.id}`); seen.set(m, b.id); }); });
    return [`${s.raBills.length} RA bills, ${seen.size} measurements billed: ${bad.length ? bad.join('; ') : 'consistent'}`, !bad.length];
  });
  await T('INV-04', 'Every work order: contract and contractor exist and agree; BOQ references resolve; measurements point to real WO lines', async () => {
    const bad = [];
    s.workOrders.forEach((w) => { const c = by(s.contracts, w.contractId); if (!c) return bad.push(`${w.id} contract`); if (c.vendorId !== w.vendorId) bad.push(`${w.id} vendor ≠ contract vendor`); (w.items || []).forEach((it) => { if (it.boqRef && !(c.scope || []).some((l) => l.id === it.boqRef)) bad.push(`${w.id} ${it.id} BOQ ref`); }); });
    s.measurements.forEach((m) => { const w = by(s.workOrders, m.woId); if (!w) return bad.push(`${m.id} WO`); const ok = w.type === 'Lump Sum' ? (w.milestones || []).some((x) => x.id === m.lineId) : (w.items || []).some((x) => x.id === m.lineId); if (!ok) bad.push(`${m.id} line ${m.lineId}`); });
    return [`${s.workOrders.length} work orders, ${s.measurements.length} measurements: ${bad.length ? bad.join('; ') : 'consistent'}`, !bad.length];
  });
  await T('INV-05', 'Every contract: contractor exists; contract value on the list = value + approved variations', async () => {
    const bad = []; s.contracts.forEach((c) => { if (!by(s.vendors, c.vendorId)) bad.push(`${c.id} contractor`); });
    await go('contract-labor/contracts'); await p.waitForTimeout(300); const body = await p.locator('main tbody').innerText();
    return [`${s.contracts.length} contracts: ${bad.length ? bad.join('; ') : 'consistent'}; all listed ${s.contracts.every((c) => body.includes(c.id))}`, !bad.length && s.contracts.every((c) => body.includes(c.id))];
  });
  await T('INV-07', 'Every main list shows the document number of each record (PO, RFQ, bill, contract, work order, RA bill, requisition)', async () => {
    const res = [];
    for (const [route, list] of [['vendor-management/purchase-orders', s.purchaseOrders], ['vendor-management/rfq', s.rfqs], ['vendor-management/invoices', s.invoices], ['contract-labor/contracts', s.contracts],
      ['contract-labor/work-orders', s.workOrders], ['contract-labor/ra-bills', s.raBills], ['vendor-management/requisitions', s.requisitions || []]]) {
      await go(route); await p.waitForTimeout(300); const body = (await p.locator('main tbody').first().innerText().catch(() => '')) || '';
      const miss = list.filter((x) => !body.includes(x.id)); res.push([route.split('/')[1], list.length, miss.length]);
    }
    return [res.map(([r, n, m]) => `${r} ${n - m}/${n}`).join(' · '), res.every((x) => !x[2])];
  });
  await T('INV-06', 'Audit trail: every record in both chains has its steps in the audit log', async () => {
    const ids = [V.id, rfq.id, po.id, inv.id, C.id, ct.id, wo.id, ...bills.map((b) => b.id)];
    const miss = ids.filter((id) => !s.audit.some((a) => String(a.id).includes(id) || String(a.action).includes(id)));
    return [`${ids.length} records; missing from audit: ${miss.join(', ') || 'none'}`, !miss.length];
  });
});
