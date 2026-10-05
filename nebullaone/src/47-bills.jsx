// Bills: GST split (CGST + SGST inside the company's state, IGST across states / imports), retention on PO bills,
// and bank confirmation of each payment (confirmed with the bank reference, or failed with the reason).
function gstSplit(st, v, gstPct, taxable, siteId) {
  const pct = Number(gstPct) || 0, amt = round2((taxable * pct) / 100);
  const site = siteOf(v, siteId), home = settingsOf(st).companyState, vs = (site && site.id !== "REG" && site.state) || v?.placeOfSupply || v?.state;
  const intra = v && !isForeign(v) && home && vs && vs === home;
  return intra ? [["CGST", pct / 2, round2(amt / 2)], ["SGST", pct / 2, round2(amt - round2(amt / 2))]] : [["IGST", pct, amt]];
}
const gstSplitText = (rows) => rows.map(([k, p, a]) => `${k} ${p}% ${inr(a)}`).join(" + ");
const payBankState = (p) => (p.reversed && !p.bank ? "Reversed" : p.bank?.status || (p.mode === "Advance adjustment" || p.mode === "Write-off" || p.writeOff ? "Not applicable" : "Awaiting confirmation"));
const BANK_TONE = { Confirmed: "green", Failed: "red", "Awaiting confirmation": "amber", Reversed: "gray", "Not applicable": "gray" };

function confirmPayment(inv, p, data) {
  setState((s) => {
    const x = byId(s.invoices, inv.id), q = x.payments.find((y) => y.id === p.id);
    if (data.ok) q.bank = { status: "Confirmed", utr: data.utr.trim(), date: data.date, by: currentUser(), at: new Date().toISOString() };
    else {
      q.bank = { status: "Failed", reason: data.reason.trim(), date: data.date, by: currentUser(), at: new Date().toISOString() };
      q.reversed = q.reversed || { at: new Date().toISOString(), by: currentUser(), reason: `Bank: ${data.reason.trim()}` };
      const b = x.raBillId && byId(s.raBills, x.raBillId);
      if (b && b.status === "Paid" && invoiceTotals(x).balance > 0.5) { b.status = "Approved"; b.history.push({ status: "Approved", by: currentUser(), at: new Date().toISOString(), remark: `Payment ${q.id} failed at the bank - ${data.reason.trim()}` }); }
    }
  }, { entity: "Invoice", id: inv.id, action: data.ok ? `Payment ${p.id} confirmed by the bank - ${data.utr.trim()}` : `Payment ${p.id} failed at the bank - ${data.reason.trim()}` });
  toast(data.ok ? `${p.id} confirmed` : `${p.id} failed - amount back on the bill`, data.ok ? "green" : "red");
}
function BankConfirmModal({ inv, p, ok, onClose }) {
  const [f, setF] = y.useState({ utr: p.ref && !/^(NEFT|RTGS|UPI|Cheque)\d+$/.test(p.ref) ? p.ref : "", reason: "", date: todayISO() });
  const err = VX.req(f.date) || VX.notFuture(f.date, "Date can't be in the future") || (f.date < p.date ? "Before the payment date" : "") || (ok ? (f.utr.trim().length < 6 ? "Enter the bank reference / UTR" : "") : f.reason.trim().length < 5 ? "Give the failure reason" : "");
  return (
    <Modal open onClose={onClose} width={480} title={ok ? `Bank confirmation - ${p.id}` : `Payment failed - ${p.id}`} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant={ok ? "primary" : "danger"} disabled={!!err} onClick={() => { confirmPayment(inv, p, { ...f, ok }); onClose(); }}>{ok ? "Confirm" : "Mark failed"}</Btn></>}>
      <div className="grid grid-cols-2 gap-3">
        {ok ? <Field label="Bank reference / UTR" required><TextInput value={f.utr} onChange={(x) => setF({ ...f, utr: x })} /></Field>
          : <Field label="Failure reason" required><TextInput value={f.reason} onChange={(x) => setF({ ...f, reason: x })} placeholder="e.g. Account closed, wrong IFSC" /></Field>}
        <Field label={ok ? "Credited on" : "Returned on"} required><DateInput value={f.date} onChange={(x) => setF({ ...f, date: x })} /></Field>
      </div>
    </Modal>
  );
}

function BillTaxSection({ inv }) {
  const st = useStore();
  const [rel, setRel] = y.useState(null);
  const t = invoiceTotals(inv), v = byId(st.vendors, inv.vendorId);
  const siteId = inv.details?.supplierAddress || byId(st.purchaseOrders, inv.poId)?.details?.supplierAddress, site = siteOf(v, siteId);
  const split = inv.source === "RA Bill" ? null : gstSplit(st, v, inv.gstPct, t.taxable, siteId);
  return (
    <Section title="Tax & retention" icon={Icon.percent} actions={t.retentionHeld > 0.5 && !inv.cancelled && <Btn size="sm" onClick={() => setRel({ note: "" })}>Release retention</Btn>}>
      <div data-bill-tax>
        <KV items={[["Bill received on", inv.receivedOn ? fmtDate(inv.receivedOn) : null], ["Supplier site", site && site.id !== "REG" ? `${site.title} (${site.state || "-"})${site.gstin ? ` · GSTIN ${site.gstin}` : ""}` : null], ["Remit to", siteRemit(v, site) || null], ["Taxable value", inv.source === "RA Bill" ? null : inr(t.taxable)],
          ...(split || []).map(([k, p, a]) => [`${k} (${p}%)`, inr(a)]),
          t.retention > 0 && ["Retention", `${inv.retentionPct}% - ${inr(t.retention)}${inv.retentionReleased ? `, released ${inr(inv.retentionReleased.amount)} on ${fmtDate(inv.retentionReleased.at.slice(0, 10))}` : ", held"}`]].filter((r) => r && r[1])} />
      </div>
      {rel && (
        <Modal open onClose={() => setRel(null)} width={480} title={`Release retention - ${inv.id}`} footer={<><Btn onClick={() => setRel(null)}>Cancel</Btn><Btn variant="primary" disabled={rel.note.trim().length < 5} onClick={() => {
          setState((s) => { byId(s.invoices, inv.id).retentionReleased = { amount: t.retention, note: rel.note.trim(), by: currentUser(), at: new Date().toISOString() }; }, { entity: "Invoice", id: inv.id, action: `Retention ${inr(t.retention)} released - ${rel.note.trim()}` });
          toast("Retention released - now payable"); setRel(null);
        }}>Release {inr(t.retentionHeld)}</Btn></>}>
          <Field label="Reason" required><TextInput value={rel.note} onChange={(x) => setRel({ note: x })} placeholder="e.g. Warranty period over, no defects" /></Field>
        </Modal>
      )}
    </Section>
  );
}

function billExceptions(st, add) {
  for (const inv of st.invoices) {
    if (inv.cancelled) continue;
    for (const p of inv.payments) if (payBankState(p) === "Awaiting confirmation" && -daysUntil(p.date) > 3)
      add("Payment not confirmed by bank", "Medium", "Invoice", inv.id, vendorName(st, inv.vendorId), `${p.id} ${inr(p.amount)} via ${p.mode} on ${fmtDate(p.date)} - no bank confirmation yet`, p.date, `${VM_BASE}/invoices?open=${inv.id}`);
  }
}
// Existing payments in the demo were settled long ago: confirmed by the bank
function seedBankConfirm(s) {
  if (s.bankConfirmSeeded) return false;
  s.bankConfirmSeeded = true;
  for (const inv of s.invoices || []) for (const p of inv.payments || []) if (!p.bank && !p.reversed && p.date && p.date < shiftDays(-3)) p.bank = { status: "Confirmed", utr: p.ref || "", date: p.date, by: "Bank statement", at: `${p.date}T12:00:00.000Z` };
  return true;
}
