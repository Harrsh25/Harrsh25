// Subcontracts: approval value limit (two levels above it), back-to-back or own terms, the subcontract BOQ,
// payments made by the main contractor, and the subcontractor's guarantee and defect liability period.
const SUB_TERMS = ["Back-to-back with main contract", "Own terms"];
const subApprovalLimit = (st) => Number(settingsOf(st || getState()).subApprovalLimit) || 0;
const subLevels = (st, sub) => (subApprovalLimit(st) && Number(sub.value) > subApprovalLimit(st) ? ["Project Manager", "Finance Controller"] : ["Project Manager"]);
// Back-to-back: retention, payment days and DLP mirror the main contract
const subTermsOf = (c, f) => (f.terms === "Own terms"
  ? { terms: "Own terms", retentionPct: Number(f.retentionPct), paymentDays: Number(f.paymentDays), dlpMonths: Number(f.dlpMonths) }
  : { terms: "Back-to-back with main contract", retentionPct: Number(c.retentionPct) || 0, paymentDays: Number(c.paymentDays) || 30, dlpMonths: Number(c.dlpMonths) || 0 });
const subPaid = (sub) => round2(sum(sub.payments || [], (p) => p.amount));
const subDlpEnd = (sub) => (sub.closedAt && sub.dlpMonths ? shiftDays(sub.dlpMonths * 30, sub.closedAt.slice(0, 10)) : null);

function SubTermsFields({ c, f, setF, tried, er, value }) {
  const setL = (i, k, v) => setF({ ...f, boq: f.boq.map((l, j) => (j === i ? { ...l, [k]: v } : l)) });
  return (
    <div className="space-y-3" data-sub-terms>
      <div className="grid grid-cols-4 gap-3">
        <Field label="Terms" required><Select value={f.terms} onChange={(x) => setF({ ...f, terms: x })} options={SUB_TERMS} />{tried && <FieldErr m={er.terms} />}</Field>
        {f.terms === "Own terms" && <>
          <Field label="Retention (%)" required><NumInput value={f.retentionPct} onChange={(x) => setF({ ...f, retentionPct: x })} /></Field>
          <Field label="Payment within (days)" required><NumInput value={f.paymentDays} onChange={(x) => setF({ ...f, paymentDays: x })} /></Field>
          <Field label="DLP (months)" required><NumInput value={f.dlpMonths} onChange={(x) => setF({ ...f, dlpMonths: x })} />{tried && <FieldErr m={er.own} />}</Field>
        </>}
        {f.terms === "Back-to-back with main contract" && <p className="col-span-3 self-end pb-2 text-[12.5px] text-ink-soft">Retention {c.retentionPct || 0}% · payment {c.paymentDays || 30} days · DLP {c.dlpMonths || 0} months - as the main contract</p>}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between"><span className="text-[12.5px] font-medium text-ink-soft">Subcontract BOQ{f.boq.length ? ` - ${inrShort(value)}` : ""}</span><Btn size="sm" icon={Icon.plus} onClick={() => setF({ ...f, boq: [...f.boq, { desc: "", unit: "", qty: "", rate: "" }] })}>Add BOQ line</Btn></div>
        {f.boq.map((l, i) => (
          <div key={i} className="grid grid-cols-[1fr_90px_110px_130px_28px] gap-2">
            <TextInput value={l.desc} onChange={(x) => setL(i, "desc", x)} placeholder="Item" /><TextInput value={l.unit} onChange={(x) => setL(i, "unit", x)} placeholder="Unit" />
            <NumInput value={l.qty} onChange={(x) => setL(i, "qty", x)} placeholder="Qty" /><NumInput value={l.rate} onChange={(x) => setL(i, "rate", x)} placeholder="Rate" />
            <IconBtn icon={Icon.trash} title="Remove" onClick={() => setF({ ...f, boq: f.boq.filter((_, j) => j !== i) })} />
          </div>
        ))}
        {tried && <FieldErr m={er.boq} />}
      </div>
      <div className="grid grid-cols-4 gap-3">
        <Field label="Subcontractor BG no."><TextInput value={f.bgNo} onChange={(x) => setF({ ...f, bgNo: x })} /></Field>
        <Field label="BG bank"><TextInput value={f.bgBank} onChange={(x) => setF({ ...f, bgBank: x })} /></Field>
        <Field label="BG amount (₹)"><NumInput value={f.bgAmount} onChange={(x) => setF({ ...f, bgAmount: x })} /></Field>
        <Field label="BG valid till"><DateInput value={f.bgExpiry} onChange={(x) => setF({ ...f, bgExpiry: x })} />{tried && <FieldErr m={er.bg} />}</Field>
      </div>
    </div>
  );
}

function SubcontractDetail({ c, id, onClose }) {
  const st = useStore();
  const x = contractSubs(byId(st.contracts, c.id)).find((q) => q.id === id);
  const [pay, setPay] = y.useState(null);
  if (!x) return null;
  const paid = subPaid(x), left = round2(x.value - paid), lv = subLevels(st, x);
  const payErr = pay && ((!pay.date || pay.date > todayISO()) ? "Enter a date that is not in the future" : !(Number(pay.amount) > 0) ? "Enter the amount" : Number(pay.amount) > left + 0.5 ? `Only ${inr(left)} left on the subcontract` : pay.ref.trim().length < 3 ? "Enter the payment reference" : "");
  return (
    <Modal open onClose={onClose} width={820} title={`${x.id} - ${vendorName(st, x.vendorId)}`} footer={<Btn onClick={onClose}>Close</Btn>}>
      <div className="space-y-4" data-sub-detail>
        <div className="grid grid-cols-4 gap-3">
          <StatTile tone="blue" label="Subcontract value" value={inrShort(x.value)} icon={Icon.file} />
          <StatTile tone="green" label="Paid by main contractor" value={inrShort(paid)} icon={Icon.wallet} />
          <StatTile tone="amber" label="Balance" value={inrShort(left)} icon={Icon.clock} />
          <StatTile tone="purple" label="Approval" value={`${(x.approvals || []).length || (x.status === "Approved" || x.status === "Closed" ? lv.length : 0)} / ${lv.length}`} sub={lv.join(" → ")} icon={Icon.clipboardCheck} />
        </div>
        <Section title="Terms, guarantee & DLP" icon={Icon.scale}>
          <KV items={[["Scope", x.scope], ["Period", `${fmtDate(x.start)} - ${fmtDate(x.end)}`], ["Terms", x.terms || "Not recorded"], x.retentionPct != null && ["Retention", `${x.retentionPct}%`], x.paymentDays && ["Payment within", `${x.paymentDays} days`],
            x.dlpMonths != null && ["Defect liability", `${x.dlpMonths} months${subDlpEnd(x) ? ` - ends ${fmtDate(subDlpEnd(x))}` : " from close"}`],
            ["Guarantee", x.bg ? `${x.bg.number} · ${x.bg.bank} · ${inr(x.bg.amount)} · valid till ${fmtDate(x.bg.expiry)}` : "None"], (x.approvals || []).length > 0 && ["Approved by", x.approvals.map((a) => `${a.level}: ${a.by}`).join(" · ")]].filter(Boolean)} />
        </Section>
        <Section title="Subcontract BOQ" icon={Icon.sheet}>
          <DataTable dense plain rows={x.boq || []} rowKey={(_, i) => i} empty={<p className="p-4 text-[13px] text-ink-mute">Lump-sum value - no BOQ lines.</p>} columns={[
            { key: "desc", label: "Item" }, { key: "qty", label: "Qty", align: "right", render: (l) => `${num(l.qty)} ${l.unit}` },
            { key: "rate", label: "Rate", align: "right", render: (l) => inr(l.rate) }, { key: "amt", label: "Amount", align: "right", render: (l) => inr(l.qty * l.rate) },
          ]} />
        </Section>
        <Section title="Payments to the subcontractor" icon={Icon.rupee} actions={["Approved", "Closed"].includes(x.status) && left > 0.5 && !pay && <Btn size="sm" icon={Icon.plus} onClick={() => setPay({ date: todayISO(), amount: "", ref: "" })}>Record payment</Btn>}>
          <DataTable dense plain rows={x.payments || []} rowKey={(_, i) => i} empty={<p className="p-4 text-[13px] text-ink-mute">No payments recorded.</p>} columns={[
            { key: "date", label: "Date", render: (p) => fmtDate(p.date) }, { key: "ref", label: "Reference", className: "mono text-[12px]" },
            { key: "amount", label: "Amount", align: "right", render: (p) => inr(p.amount) }, { key: "by", label: "Recorded by", className: "text-[12px] text-ink-soft" },
          ]} />
          {pay && (
            <div className="grid grid-cols-[150px_150px_1fr_auto] items-end gap-3 border-t border-line p-4">
              <Field label="Paid on" required><DateInput value={pay.date} onChange={(v) => setPay({ ...pay, date: v })} /></Field>
              <Field label="Amount (₹)" required><NumInput value={pay.amount} onChange={(v) => setPay({ ...pay, amount: v })} /></Field>
              <Field label="Reference" required><TextInput value={pay.ref} onChange={(v) => setPay({ ...pay, ref: v })} /></Field>
              <span className="flex gap-2"><Btn onClick={() => setPay(null)}>Cancel</Btn><Btn variant="primary" disabled={!!payErr} title={payErr} onClick={() => {
                setState((s) => { const q = contractSubs(byId(s.contracts, c.id)).find((z) => z.id === x.id); q.payments = [...(q.payments || []), { date: pay.date, amount: Number(pay.amount), ref: pay.ref.trim(), by: currentUser() }]; },
                  { entity: "Contract", id: c.id, action: `Payment to subcontractor ${vendorName(st, x.vendorId)} (${x.id}) - ${inr(Number(pay.amount))}, ${pay.ref.trim()}` });
                toast("Payment recorded"); setPay(null);
              }}>Save</Btn></span>
            </div>
          )}
        </Section>
      </div>
    </Modal>
  );
}

function subExceptions(st, add) {
  for (const x of allSubs(st)) {
    if (!["Approved", "Closed"].includes(x.status)) continue;
    const to = `${CL_BASE}/contracts?open=${x.contract.id}`;
    if (x.bg && x.status === "Approved" && daysUntil(x.bg.expiry) <= 30) add(daysUntil(x.bg.expiry) < 0 ? "Subcontractor guarantee expired" : "Subcontractor guarantee expiring", "Medium", "Contract", x.contract.id, `${vendorName(st, x.vendorId)} under ${vendorName(st, x.contract.vendorId)}`, `${x.id} BG ${x.bg.number} ${inr(x.bg.amount)} - valid till ${fmtDate(x.bg.expiry)}`, x.bg.expiry, to);
  }
}
function seedSubTerms(s) {
  if (s.subTermsSeeded) return false;
  s.subTermsSeeded = true;
  const c = (s.contracts || []).find((k) => k.id === "CTR-001"), sub = c && (c.subcontracts || []).find((x) => x.id === "SUB-001");
  if (sub) Object.assign(sub, { terms: "Back-to-back with main contract", retentionPct: c.retentionPct || 5, paymentDays: c.paymentDays || 30, dlpMonths: c.dlpMonths || 12,
    boq: [{ desc: "Excavation in ordinary soil - footings F1-F40", unit: "cum", qty: 9000, rate: 380 }, { desc: "Excavation in hard rock (breaker)", unit: "cum", qty: 600, rate: 1300 }],
    payments: [{ date: shiftDays(-20), amount: 1200000, ref: "SBIC/PAY/0931", by: "Shree Balaji (declared)" }], bg: { number: "BG/HDFC/77120", bank: "HDFC Bank", amount: 420000, expiry: shiftDays(24) } });
  return true;
}
