// F · Closure — Final Settlement (final account statement agreed with the contractor), DLP &
// Warranty (defects in the liability period, goods warranties and claims), Termination & Final
// Account (termination → encashment → final account → blacklist decision), Contractor Release
// (no-claim certificate with the closing performance evaluation) and Requalification — the loop
// back from closure into the sourcing and commitment gates.

// ---------------------------------------------------------------- final settlement
const settlementReady = (st, c) => c.status === "Terminated" || (c.status === "Closed" && !!c.settlement)
  || (c.status === "Active" && st.raBills.some((b) => b.contractId === c.id && b.final && b.status !== "Rejected"));
const SETTLE_PRE = ["No measurements waiting for JMS sign-off", "No signed measurements left unbilled", "No contractor claims waiting", "No change orders pending"];
const settlementBlockers = (st, c) => closureChecklist(st, c).filter((i) => SETTLE_PRE.includes(i.label) && !i.ok).map((i) => i.label);
// Everything except the last step (release certificate / blacklist decision) — the release needs the rest done
const releaseBlockers = (st, c) => closureChecklist(st, c).filter((i) => !/release certificate|Blacklist decision/.test(i.label));
function settlementStatement(st, c, adj = {}) {
  const led = contractLedger(st, c);
  const bills = led.bills;
  const gst = sum(bills, (b) => b.gst), net = sum(bills, (b) => b.net);
  const encashed = sum((c.guarantees || []).filter((g) => g.status === "Encashed"), (g) => g.amount);
  const claims = Number(adj.claims) || 0, back = Number(adj.backcharges) || 0;
  const unpaid = round2(net - led.paid);
  const position = round2(unpaid + led.retentionBalance - Math.max(0, led.advanceBalance) + claims - back);
  // Encashed guarantees are money already recovered from the bank: they settle what the contractor owes
  const afterBg = position < 0 ? round2(Math.min(0, position + encashed)) : position;
  const rows = [
    ["Original contract value", Number(c.value) || 0, "info"], ["Approved variations", contractValue(c) - (Number(c.value) || 0), "info"], ["Revised contract value", contractValue(c), "info"],
    ["Work certified (gross)", led.gross, "plus"], ["GST on certified work", gst, "plus"],
    ["Less retention held", -led.retentionHeld, "minus"], ["Less advance recovered", -led.recovered, "minus"], ["Less TDS and cess", -(led.tds + led.cess), "minus"],
    ["Less material recoveries, penalties / LD and other", -(led.materials + led.penalty + led.other), "minus"],
    ["Net certified", net, "sub"], ["Less paid to date", -led.paid, "minus"], ["Certified, not yet paid", unpaid, "sub"],
    ["Add retention to be released", led.retentionBalance, "plus"], ["Less advance not yet recovered", -Math.max(0, led.advanceBalance), "minus"],
    ["Add claims admitted", claims, "plus"], ["Less back-charges / LD not yet deducted", -back, "minus"],
    ...(encashed ? [["Bank guarantees encashed (recovered from the bank)", encashed, "info"]] : []),
  ];
  return { rows, net: afterBg, raw: position, encashed, ledger: led };
}
function SettlementTable({ stm }) {
  return (
    <table className="w-full text-[13px]"><tbody>
      {stm.rows.map(([label, v, kind]) => (
        <tr key={label} className={cls("border-b border-line", kind === "sub" && "bg-gray-50 font-semibold")}>
          <td className={cls("px-4 py-1.5", kind === "info" && "text-ink-soft")}>{label}</td>
          <td className={cls("num px-4 py-1.5 text-right", v < 0 && "text-red-600")}>{v < 0 ? `−${inr(-v)}` : inr(v)}</td>
        </tr>
      ))}
      <tr className="bg-brand-soft font-semibold"><td className="px-4 py-2">{stm.net >= 0 ? "Net payable to the contractor" : "Net recoverable from the contractor"}</td><td className="num px-4 py-2 text-right">{inr(Math.abs(stm.net))}</td></tr>
    </tbody></table>
  );
}
function SettlementDrawer({ id, onClose }) {
  const st = useStore();
  const c = byId(st.contracts, id);
  const [adj, setAdj] = y.useState(() => ({ claims: c?.settlement?.claims ?? "", claimsNote: c?.settlement?.claimsNote || "", backcharges: c?.settlement?.backcharges ?? "", backNote: c?.settlement?.backNote || "" }));
  const [agree, setAgree] = y.useState(null), [dispute, setDispute] = y.useState(null);
  if (!c) return null;
  const s0 = c.settlement, locked = s0?.status === "Agreed";
  const stm = settlementStatement(st, c, locked ? s0 : adj);
  const blockers = settlementBlockers(st, c);
  const adjErr = (Number(adj.claims) > 0 && adj.claimsNote.trim().length < 5 ? "Describe the claims admitted" : "") || (Number(adj.backcharges) > 0 && adj.backNote.trim().length < 5 ? "Describe the back-charges" : "")
    || (adj.claims !== "" && Number(adj.claims) < 0 ? "Claims can't be negative" : "") || (adj.backcharges !== "" && Number(adj.backcharges) < 0 ? "Back-charges can't be negative" : "");
  const save = (status) => {
    setState((s) => { const x = byId(s.contracts, c.id); x.settlement = { ...(x.settlement || {}), claims: Number(adj.claims) || 0, claimsNote: adj.claimsNote.trim(), backcharges: Number(adj.backcharges) || 0, backNote: adj.backNote.trim(), net: stm.net, status, preparedBy: currentUser(), preparedAt: new Date().toISOString(), ...(status === "Sent" ? { sentAt: new Date().toISOString() } : {}) }; },
      { entity: "Contract", id: c.id, action: `Final settlement ${status === "Sent" ? "sent to the contractor" : "prepared"} — ${stm.net >= 0 ? "payable" : "recoverable"} ${inr(Math.abs(stm.net))}` });
    toast(status === "Sent" ? "Final settlement sent to the contractor" : "Final settlement saved");
  };
  return (
    <Drawer open onClose={onClose} width={820} title={`Final settlement — ${c.title}`} subtitle={<><span className="mono">{c.id}</span><Status>{contractStatus(c)}</Status><span>{vendorName(st, c.vendorId)}</span>{s0 && <Status tone={locked ? "green" : s0.status === "Disputed" ? "red" : "amber"}>{s0.status}</Status>}</>}
      actions={<>
        <RefLink to={`${CL_BASE}/closeout?open=${c.id}`}>Close-out →</RefLink>
        {!locked && <Btn disabled={!!adjErr} onClick={() => save("Draft")}>Save draft</Btn>}
        {!locked && <Btn variant="primary" icon={Icon.send} disabled={!!adjErr || blockers.length > 0} title={blockers.join("\n")} onClick={() => save("Sent")}>Send to contractor</Btn>}
        {s0?.status === "Sent" && <><Btn variant="danger" onClick={() => setDispute({ note: "" })}>Record dispute</Btn><Btn variant="success" onClick={() => setAgree({ signatory: byId(st.vendors, c.vendorId)?.contact?.name || "", date: todayISO() })}>Record agreement</Btn></>}
      </>}>
      <div className="space-y-4 px-6 py-5">
        {blockers.length > 0 && !locked && <Note tone="amber">Before the settlement can go to the contractor: {blockers.join(" · ").toLowerCase()}.</Note>}
        {s0?.status === "Disputed" && <Note tone="red">Disputed by the contractor — {s0.disputeNote}. Revise the adjustments and send again.</Note>}
        {locked && <Note tone="green" icon={Icon.check}>Agreed on {fmtDate(s0.agreedAt)} — signed for the contractor by {s0.agreedBy}. {c.status === "Terminated" ? "Next: blacklist decision." : "Next: DLP, retention & guarantee release, then the contractor release."}</Note>}
        <Section title="Final account statement" icon={Icon.receipt}><SettlementTable stm={stm} /></Section>
        {!locked && (
          <Section title="Settlement adjustments" icon={Icon.sliders}>
            <div className="grid grid-cols-2 gap-3 p-4">
              <Field label="Claims admitted (₹)"><NumInput value={adj.claims} onChange={(x) => setAdj({ ...adj, claims: x })} /></Field>
              <Field label="Claims — what was admitted"><TextInput value={adj.claimsNote} onChange={(x) => setAdj({ ...adj, claimsNote: x })} placeholder="e.g. Idle-time claim for July rains, 50%" /></Field>
              <Field label="Back-charges / LD (₹)"><NumInput value={adj.backcharges} onChange={(x) => setAdj({ ...adj, backcharges: x })} /></Field>
              <Field label="Back-charges — reason"><TextInput value={adj.backNote} onChange={(x) => setAdj({ ...adj, backNote: x })} placeholder="e.g. Scaffold damage, debris removal" /></Field>
              {adjErr && <span className="col-span-2 text-[12px] text-red-600">{adjErr}</span>}
            </div>
          </Section>
        )}
        {locked && (s0.claims > 0 || s0.backcharges > 0) && <Section title="Agreed adjustments"><KV cols={2} items={[["Claims admitted", s0.claims ? `${inr(s0.claims)} — ${s0.claimsNote}` : "—"], ["Back-charges / LD", s0.backcharges ? `${inr(s0.backcharges)} — ${s0.backNote}` : "—"]]} /></Section>}
      </div>
      {agree && (
        <Modal open onClose={() => setAgree(null)} width={480} title="Contractor agrees the final account" footer={<><Btn onClick={() => setAgree(null)}>Cancel</Btn><Btn variant="success" disabled={agree.signatory.trim().length < 3 || !agree.date || agree.date > todayISO()} onClick={() => {
          setState((s) => Object.assign(byId(s.contracts, c.id).settlement, { status: "Agreed", agreedBy: agree.signatory.trim(), agreedAt: agree.date, net: stm.net }), { entity: "Contract", id: c.id, action: `Final settlement agreed by ${agree.signatory.trim()} — ${stm.net >= 0 ? "payable" : "recoverable"} ${inr(Math.abs(stm.net))}` });
          toast("Final settlement agreed"); setAgree(null);
        }}>Record agreement</Btn></>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Signed for the contractor by" required><TextInput value={agree.signatory} onChange={(x) => setAgree({ ...agree, signatory: x })} /></Field>
            <Field label="Date signed" required><DateInput value={agree.date} onChange={(x) => setAgree({ ...agree, date: x })} /></Field>
          </div>
        </Modal>
      )}
      {dispute && (
        <Modal open onClose={() => setDispute(null)} width={480} title="Contractor disputes the final account" footer={<><Btn onClick={() => setDispute(null)}>Cancel</Btn><Btn variant="danger" disabled={dispute.note.trim().length < 5} onClick={() => {
          setState((s) => Object.assign(byId(s.contracts, c.id).settlement, { status: "Disputed", disputeNote: dispute.note.trim() }), { entity: "Contract", id: c.id, action: `Final settlement disputed — ${dispute.note.trim()}` });
          toast("Dispute recorded", "amber"); setDispute(null);
        }}>Record dispute</Btn></>}>
          <Field label="What the contractor disputes" required><TextInput value={dispute.note} onChange={(x) => setDispute({ note: x })} placeholder="e.g. Claims idle-time of ₹4.2 L in full" /></Field>
        </Modal>
      )}
    </Drawer>
  );
}
function FinalSettlementPage() {
  const st = useStore();
  const [open, setOpen] = useQueryOpen();
  const rows = st.contracts.filter((c) => settlementReady(st, c) || c.settlement).map((c) => ({ id: c.id, c, stm: settlementStatement(st, c, c.settlement || {}) }));
  return (
    <Page title="Final Settlement" subtitle="Final account per contract — certified work, recoveries, retention, advances, claims and back-charges — agreed with the contractor" icon={Icon.scale}>
      <div className="grid grid-cols-4 gap-3 px-4 pt-4">
        <StatTile tone="amber" label="To prepare" value={rows.filter((r) => !r.c.settlement).length} icon={Icon.pencil} />
        <StatTile tone="blue" label="With the contractor" value={rows.filter((r) => r.c.settlement?.status === "Sent").length} icon={Icon.send} />
        <StatTile tone="red" label="Disputed" value={rows.filter((r) => r.c.settlement?.status === "Disputed").length} icon={Icon.warning} />
        <StatTile tone="green" label="Agreed" value={rows.filter((r) => r.c.settlement?.status === "Agreed").length} icon={Icon.check} />
      </div>
      <DataTable noun="contracts" rows={rows} onRow={(r) => setOpen(r.id)} empty={<EmptyState icon={Icon.scale} title="Nothing to settle yet" text="A contract appears here once its final bill is prepared, or when it is terminated." />} columns={[
        { key: "id", label: "Contract", className: "mono text-[12px]" }, { key: "t", label: "Title", className: "font-medium", render: (r) => r.c.title },
        { key: "v", label: "Contractor", filterOptions: FO.contractors, filter: (r) => vendorName(st, r.c.vendorId), render: (r) => vendorName(st, r.c.vendorId) },
        { key: "cs", label: "Contract", render: (r) => <Status>{contractStatus(r.c)}</Status> },
        { key: "g", label: "Certified", align: "right", num: true, render: (r) => inrShort(r.stm.ledger.gross) },
        { key: "n", label: "Net position", align: "right", num: true, sort: (r) => r.stm.net, render: (r) => <span className={r.stm.net < 0 ? "text-red-600" : ""}>{r.stm.net < 0 ? "−" : ""}{inrShort(Math.abs(r.stm.net))}</span> },
        { key: "s", label: "Settlement", filterOptions: ["Not prepared", "Draft", "Sent", "Disputed", "Agreed"], filter: (r) => r.c.settlement?.status || "Not prepared",
          render: (r) => <Status tone={{ Agreed: "green", Disputed: "red", Sent: "blue", Draft: "amber" }[r.c.settlement?.status] || "gray"}>{r.c.settlement?.status || "Not prepared"}</Status> },
      ]} />
      {open && <SettlementDrawer id={open} onClose={() => setOpen(null)} />}
    </Page>
  );
}

// ---------------------------------------------------------------- DLP & warranty
const dlpEndOf = (c) => shiftDays((c.dlpMonths || 0) * 30, c.handover?.date || c.end);
const warrantyEnd = (w) => shiftDays((Number(w.months) || 0) * 30, w.start);
function warrantyStatus(w) {
  const d = daysUntil(warrantyEnd(w));
  return d < 0 ? "Expired" : d <= (Number(currentSettings().notifyDaysAhead) || 30) ? "Expiring" : "Active";
}
function DlpWarrantyPage() {
  const st = useStore(), nav = useNavigate(), loc = Ht();
  const [tab, setTab] = y.useState(() => (/tab=warranty/.test(loc.search) ? "warranty" : "dlp"));
  const [defect, setDefect] = y.useState(null), [ext, setExt] = y.useState(null), [reg, setReg] = y.useState(null), [claim, setClaim] = y.useState(null), [res, setRes] = y.useState(null);
  const inDlp = st.contracts.filter((c) => !["Draft", "Pending Approval", "Approved", "Rejected", "Closed", "Terminated"].includes(c.status) && ["In DLP", "Completed"].includes(contractStatus(c)));
  const dlpRows = inDlp.map((c) => { const defects = (st.punchItems || []).filter((p) => p.contractId === c.id && p.dlp); return { id: c.id, c, end: dlpEndOf(c), defects, open: defects.filter((p) => p.status !== "Closed").length, ret: contractLedger(st, c).retentionBalance }; });
  const wr = st.warranties || [];
  const wRows = wr.map((w) => ({ ...w, end: warrantyEnd(w), status: warrantyStatus(w), openClaims: (w.claims || []).filter((x) => x.status === "Open").length }));
  const receivedLines = st.purchaseOrders.filter((p) => (p.receipts || []).length).flatMap((p) => p.lines.map((l, i) => ({ p, l, i, grn: p.receipts.find((g) => (g.lines || []).some((x) => x.line === i && x.accepted > 0)) })).filter((x) => x.grn));
  const wErr = reg && ((!reg.key && "Choose the received item") || (!(Number(reg.months) > 0 && Number(reg.months) <= 120) && "Warranty months 1–120") || (!reg.start && "Start date") || "");
  return (
    <Page title="DLP & Warranty" subtitle="Defects in the defect liability period of works contracts, and warranties on goods received — with claims against them" icon={Icon.shieldCheck}
      actions={tab === "warranty" && <Btn variant="primary" icon={Icon.plus} onClick={() => setReg({ key: "", months: 12, start: "", serial: "", terms: "" })}>Register warranty</Btn>}>
      <TabBar active={tab} onChange={setTab} tabs={[{ id: "dlp", label: "Defect liability", icon: Icon.hardHat, count: dlpRows.length }, { id: "warranty", label: "Goods warranties", icon: Icon.package, count: wRows.length }]} />
      {tab === "dlp" ? (
        <DataTable noun="contracts" rows={dlpRows} onRow={(r) => nav(`${CL_BASE}/closeout?open=${r.id}`)} empty={<EmptyState icon={Icon.hardHat} title="No contract in its defect liability period" text="The DLP starts at the handover certificate (Close-out & Handover)." />} columns={[
          { key: "id", label: "Contract", className: "mono text-[12px]" }, { key: "t", label: "Title", className: "font-medium", render: (r) => r.c.title },
          { key: "v", label: "Contractor", render: (r) => vendorName(st, r.c.vendorId) },
          { key: "start", label: "DLP from", render: (r) => fmtDate(r.c.handover?.date || r.c.end) },
          { key: "end", label: "DLP ends", sort: (r) => r.end, render: (r) => <span>{fmtDate(r.end)} <span className="text-[11.5px] text-ink-mute">{daysUntil(r.end) >= 0 ? `(${daysUntil(r.end)} days left)` : "(ended)"}</span></span> },
          { key: "d", label: "Defects open / logged", render: (r) => <span className={r.open ? "font-semibold text-red-600" : ""}>{r.open} / {r.defects.length}</span> },
          { key: "ret", label: "Retention held", align: "right", num: true, render: (r) => inrShort(r.ret) },
          { key: "bg", label: "Guarantees live", render: (r) => liveGuarantees(r.c).length || "—" },
          { key: "s", label: "Status", render: (r) => <Status tone={daysUntil(r.end) >= 0 ? "purple" : "green"}>{daysUntil(r.end) >= 0 ? "In DLP" : "DLP ended"}</Status> },
          { key: "a", label: "", align: "right", render: (r) => <span className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <Btn size="sm" onClick={() => setDefect({ c: r.c, desc: "", location: "", severity: "Major", due: shiftDays(14) })}>Log defect</Btn>
            {daysUntil(r.end) >= 0 && <Btn size="sm" onClick={() => setExt({ c: r.c, months: 3, reason: "" })}>Extend DLP</Btn>}</span> },
        ]} />
      ) : (
        <DataTable noun="warranties" rows={wRows} empty={<EmptyState icon={Icon.package} title="No warranties registered" text="Register the warranty on equipment or goods when they are received." />} columns={[
          { key: "id", label: "ID", className: "mono text-[12px]" }, { key: "item", label: "Item", className: "font-medium" }, { key: "serial", label: "Serial / batch", className: "text-[12px]" },
          { key: "vendor", label: "Vendor", filterOptions: FO.vendors, filter: (w) => vendorName(st, w.vendorId), render: (w) => vendorName(st, w.vendorId) },
          { key: "po", label: "PO / GRN", render: (w) => <RefLink to={`${VM_BASE}/purchase-orders?open=${w.poId}`}>{w.poId}</RefLink> },
          { key: "start", label: "From", render: (w) => fmtDate(w.start) }, { key: "end", label: "Until", sort: (w) => w.end, render: (w) => fmtDate(w.end) },
          { key: "claims", label: "Claims open / total", render: (w) => <span className={w.openClaims ? "font-semibold text-amber-700" : ""}>{w.openClaims} / {(w.claims || []).length}</span> },
          { key: "status", label: "Status", filterOptions: ["Active", "Expiring", "Expired"], filter: true, render: (w) => <Status tone={{ Active: "green", Expiring: "amber", Expired: "gray" }[w.status]}>{w.status}</Status> },
          { key: "a", label: "", align: "right", render: (w) => <span className="flex justify-end gap-1">
            {w.status !== "Expired" && <Btn size="sm" onClick={() => setClaim({ w, issue: "", date: todayISO() })}>Raise claim</Btn>}
            {(w.claims || []).filter((x) => x.status === "Open").map((x) => <Btn key={x.id} size="sm" variant="success" onClick={() => setRes({ w, x, resolution: "Repaired", note: "" })}>Resolve {x.id}</Btn>)}</span> },
        ]} />
      )}
      {defect && (
        <Modal open onClose={() => setDefect(null)} width={540} title={`Log defect — ${defect.c.id}`} subtitle="Goes on the punch list; the contract can't close until it is rectified and verified"
          footer={<><Btn onClick={() => setDefect(null)}>Cancel</Btn><Btn variant="primary" disabled={defect.desc.trim().length < 5 || !defect.due} onClick={() => {
            setState((s) => { s.punchItems = s.punchItems || []; s.punchItems.unshift({ id: nextId("PL", s.punchItems), contractId: defect.c.id, woId: null, desc: defect.desc.trim(), location: defect.location.trim(), severity: defect.severity, due: defect.due, status: "Open", dlp: true, raisedBy: currentUser(), raisedOn: todayISO(), history: [{ at: new Date().toISOString(), by: currentUser(), what: "Raised in DLP" }] }); },
              { entity: "Contract", id: defect.c.id, action: `DLP defect logged — ${defect.desc.trim()}` });
            toast("Defect logged — the contractor is notified to rectify"); setDefect(null);
          }}>Log defect</Btn></>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Defect" required span={2}><TextInput value={defect.desc} onChange={(x) => setDefect({ ...defect, desc: x })} placeholder="e.g. Seepage at basement retaining wall" /></Field>
            <Field label="Location"><TextInput value={defect.location} onChange={(x) => setDefect({ ...defect, location: x })} /></Field>
            <Field label="Severity"><Select value={defect.severity} onChange={(x) => setDefect({ ...defect, severity: x })} options={["Minor", "Major", "Critical"]} /></Field>
            <Field label="Rectify by" required><DateInput value={defect.due} onChange={(x) => setDefect({ ...defect, due: x })} /></Field>
          </div>
        </Modal>
      )}
      {ext && (
        <Modal open onClose={() => setExt(null)} width={480} title={`Extend DLP — ${ext.c.id}`} footer={<><Btn onClick={() => setExt(null)}>Cancel</Btn><Btn variant="primary" disabled={!(Number(ext.months) >= 1 && Number(ext.months) <= 24) || ext.reason.trim().length < 5} onClick={() => {
          setState((s) => { const x = byId(s.contracts, ext.c.id); x.dlpMonths = (Number(x.dlpMonths) || 0) + Number(ext.months); x.dlpExtensions = [...(x.dlpExtensions || []), { months: Number(ext.months), reason: ext.reason.trim(), by: currentUser(), at: todayISO() }]; },
            { entity: "Contract", id: ext.c.id, action: `DLP extended by ${ext.months} months — ${ext.reason.trim()}` });
          toast("DLP extended"); setExt(null);
        }}>Extend</Btn></>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Extend by (months)" required hint="1–24"><NumInput value={ext.months} onChange={(x) => setExt({ ...ext, months: x })} /></Field>
            <Field label="New end">{fmtDate(shiftDays(((Number(ext.c.dlpMonths) || 0) + (Number(ext.months) || 0)) * 30, ext.c.handover?.date || ext.c.end))}</Field>
            <Field label="Reason" required span={2}><TextInput value={ext.reason} onChange={(x) => setExt({ ...ext, reason: x })} placeholder="e.g. Repeated seepage — monitor one more monsoon" /></Field>
          </div>
        </Modal>
      )}
      {reg && (
        <Modal open onClose={() => setReg(null)} width={620} title="Register warranty" footer={<>{wErr && <span className="mr-auto text-[12px] text-red-600">{wErr}</span>}<Btn onClick={() => setReg(null)}>Cancel</Btn><Btn variant="primary" disabled={!!wErr} onClick={() => {
          const x = receivedLines.find((r) => `${r.p.id}:${r.i}` === reg.key);
          setState((s) => { s.warranties = s.warranties || []; s.warranties.unshift({ id: nextId("WR", s.warranties), vendorId: x.p.vendorId, poId: x.p.id, grnId: x.grn.id, line: x.i, item: x.l.desc, serial: reg.serial.trim(), months: Number(reg.months), start: reg.start, terms: reg.terms.trim(), claims: [], by: currentUser(), at: todayISO() }); },
            { entity: "PO", id: x.p.id, action: `Warranty registered — ${x.l.desc}, ${reg.months} months` });
          toast("Warranty registered"); setReg(null);
        }}>Register</Btn></>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Received item" required span={2}><Select value={reg.key} placeholder="Select PO line…" onChange={(k) => { const x = receivedLines.find((r) => `${r.p.id}:${r.i}` === k); setReg({ ...reg, key: k, start: x?.grn.date || "" }); }} options={receivedLines.map((r) => ({ value: `${r.p.id}:${r.i}`, label: `${r.p.id} · ${r.l.desc} · ${vendorName(st, r.p.vendorId)} (${r.grn.id})` }))} /></Field>
            <Field label="Warranty (months)" required><NumInput value={reg.months} onChange={(x) => setReg({ ...reg, months: x })} /></Field>
            <Field label="Starts" required hint="Defaults to the GRN date"><DateInput value={reg.start} onChange={(x) => setReg({ ...reg, start: x })} /></Field>
            <Field label="Serial / batch no."><TextInput value={reg.serial} onChange={(x) => setReg({ ...reg, serial: x })} /></Field>
            <Field label="Terms"><TextInput value={reg.terms} onChange={(x) => setReg({ ...reg, terms: x })} placeholder="e.g. Replacement within 7 days" /></Field>
          </div>
        </Modal>
      )}
      {claim && (
        <Modal open onClose={() => setClaim(null)} width={480} title={`Warranty claim — ${claim.w.item}`} footer={<><Btn onClick={() => setClaim(null)}>Cancel</Btn><Btn variant="primary" disabled={claim.issue.trim().length < 5 || !claim.date || claim.date > todayISO() || claim.date > claim.w.end} onClick={() => {
          setState((s) => { const w = byId(s.warranties, claim.w.id); w.claims = w.claims || []; w.claims.push({ id: `${w.id}-C${w.claims.length + 1}`, date: claim.date, issue: claim.issue.trim(), status: "Open", by: currentUser() }); }, { entity: "Warranty", id: claim.w.id, action: `Claim raised — ${claim.issue.trim()}` });
          toast("Warranty claim raised with the vendor"); setClaim(null);
        }}>Raise claim</Btn></>}>
          <div className="space-y-3">
            <Field label="Issue" required><TextInput value={claim.issue} onChange={(x) => setClaim({ ...claim, issue: x })} placeholder="e.g. Motor burnt out after 3 weeks" /></Field>
            <Field label="Date found" required hint={`Within the warranty (until ${fmtDate(claim.w.end)})`}><DateInput value={claim.date} onChange={(x) => setClaim({ ...claim, date: x })} /></Field>
          </div>
        </Modal>
      )}
      {res && (
        <Modal open onClose={() => setRes(null)} width={480} title={`Resolve ${res.x.id}`} footer={<><Btn onClick={() => setRes(null)}>Cancel</Btn><Btn variant="success" disabled={res.note.trim().length < 3} onClick={() => {
          setState((s) => Object.assign(byId(s.warranties, res.w.id).claims.find((x) => x.id === res.x.id), { status: res.resolution === "Rejected by vendor" ? "Rejected" : "Resolved", resolution: res.resolution, note: res.note.trim(), resolvedAt: todayISO() }), { entity: "Warranty", id: res.w.id, action: `${res.x.id} ${res.resolution.toLowerCase()} — ${res.note.trim()}` });
          toast("Claim closed"); setRes(null);
        }}>Close claim</Btn></>}>
          <div className="space-y-3">
            <Field label="Resolution"><Select value={res.resolution} onChange={(x) => setRes({ ...res, resolution: x })} options={["Repaired", "Replaced", "Credit note", "Rejected by vendor"]} /></Field>
            <Field label="Note" required><TextInput value={res.note} onChange={(x) => setRes({ ...res, note: x })} /></Field>
          </div>
        </Modal>
      )}
    </Page>
  );
}

// ---------------------------------------------------------------- closing evaluation → scorecard + requalification
function ClosingEvaluation({ f, setF, terminated }) {
  const avg = round2(((Number(f.quality) || 0) + (Number(f.safety) || 0) + (Number(f.timeliness) || 0)) / 3);
  return (
    <Section title="Closing performance evaluation" icon={Icon.gauge}>
      <div className="grid grid-cols-3 gap-3 p-4">
        <Field label="Quality"><Stars value={f.quality} onChange={(x) => setF({ ...f, quality: x, requal: f.touched ? f.requal : terminated || round2((x + f.safety + f.timeliness) / 3) < 3 })} /></Field>
        <Field label="Safety (HSE)"><Stars value={f.safety} onChange={(x) => setF({ ...f, safety: x, requal: f.touched ? f.requal : terminated || round2((f.quality + x + f.timeliness) / 3) < 3 })} /></Field>
        <Field label="Timeliness"><Stars value={f.timeliness} onChange={(x) => setF({ ...f, timeliness: x, requal: f.touched ? f.requal : terminated || round2((f.quality + f.safety + x) / 3) < 3 })} /></Field>
        <Field label="Remarks" required span={3}><TextInput value={f.remarks} onChange={(x) => setF({ ...f, remarks: x })} placeholder="e.g. Good finish; slow de-mobilisation" /></Field>
        <div className="col-span-3 flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-[12.5px]">
          <span>Average <b>{avg || "—"}</b> / 5 — goes into the Vendor Scorecard</span>
          <Check checked={!!f.requal} onChange={(b) => setF({ ...f, requal: b, touched: true })} label="Requalify before the next award" />
        </div>
      </div>
    </Section>
  );
}
const evalBlank = (terminated) => ({ quality: 0, safety: 0, timeliness: 0, remarks: "", requal: !!terminated, touched: false });
const evalErr = (f) => (!(f.quality && f.safety && f.timeliness) ? "Rate quality, safety and timeliness" : f.remarks.trim().length < 5 ? "Add evaluation remarks (min 5 characters)" : "");
function applyEvaluation(s, c, f, why) {
  s.ratings.push({ id: `RT-${Date.now().toString(36)}`, vendorId: c.vendorId, woId: null, contractId: c.id, period: `Close-out ${c.id}`, quality: f.quality, safety: f.safety, manpower: f.timeliness, incidents: 0, remarks: f.remarks.trim(), by: currentUser(), at: todayISO(), closing: true });
  const x = byId(s.contracts, c.id); x.closingEval = { quality: f.quality, safety: f.safety, timeliness: f.timeliness, remarks: f.remarks.trim(), requal: !!f.requal, by: currentUser(), at: todayISO() };
  if (f.requal) { const v = byId(s.vendors, c.vendorId); if (v.status !== "Blacklisted") v.requalRequired = { reason: why, at: todayISO(), contractId: c.id }; }
}

// ---------------------------------------------------------------- contractor release
function ContractorReleasePage() {
  const st = useStore();
  const [open, setOpen] = useQueryOpen();
  const [f, setF] = y.useState(null);
  const rows = st.contracts.filter((c) => c.status !== "Terminated" && (c.settlement?.status === "Agreed" || c.release)).map((c) => { const b = releaseBlockers(st, c); return { id: c.id, c, open: b.filter((i) => !i.ok), all: b }; });
  const c = open && byId(st.contracts, open), row = c && rows.find((r) => r.id === c.id);
  const printRelease = (c) => {
    const v = byId(st.vendors, c.vendorId), w = window.open("", "_blank"); if (!w) return toast("Allow pop-ups to print", "red");
    w.document.write(`<html><head><title>Release ${c.release.no}</title><style>body{font:14px/1.6 system-ui;margin:48px;max-width:720px}h1{font-size:20px}td{padding:4px 12px 4px 0}</style></head><body><h1>Contractor Release — No-Claim Certificate</h1>
      <p>Certificate <b>${c.release.no}</b> dated ${fmtDate(c.release.date)}. The final account of contract <b>${c.id} — ${c.title}</b> with <b>${v.legalName || v.name}</b> was agreed on ${fmtDate(c.settlement.agreedAt)} at ${inr(Math.abs(c.settlement.net))} ${c.settlement.net >= 0 ? "payable to the contractor" : "recoverable"}.</p>
      <p>Retention has been released, guarantees returned and all dues settled. The contractor confirms there are no further claims under this contract, and the employer releases the contractor from further obligations except latent defects as per law.</p>
      <table><tr><td>Signed for the contractor</td><td>${c.release.contractorSignatory}</td></tr><tr><td>Issued by</td><td>${c.release.by}</td></tr><tr><td>Closing evaluation</td><td>${c.closingEval ? `${round2((c.closingEval.quality + c.closingEval.safety + c.closingEval.timeliness) / 3)} / 5` : "—"}</td></tr></table>
      <p style="margin-top:48px">______________________<br/>Project Manager</p></body></html>`);
    w.document.close(); w.print();
  };
  const err = f && ((f.signatory.trim().length < 3 && "Contractor signatory required") || evalErr(f.ev) || "");
  return (
    <Page title="Contractor Release" subtitle="No-claim / release certificate once the final account is agreed, DLP is over, retention is released and guarantees are returned" icon={Icon.handshake}>
      <DataTable noun="contracts" rows={rows} onRow={(r) => setOpen(r.id)} empty={<EmptyState icon={Icon.handshake} title="No contract ready for release" text="Contracts appear here after the final settlement is agreed." />} columns={[
        { key: "id", label: "Contract", className: "mono text-[12px]" }, { key: "t", label: "Title", className: "font-medium", render: (r) => r.c.title },
        { key: "v", label: "Contractor", render: (r) => vendorName(st, r.c.vendorId) },
        { key: "s", label: "Settlement", render: (r) => `${inrShort(Math.abs(r.c.settlement?.net || 0))} ${r.c.settlement?.net < 0 ? "recoverable" : "payable"}` },
        { key: "o", label: "Open conditions", render: (r) => (r.c.release ? "—" : r.open.length ? <span className="text-amber-700">{r.open.length} open</span> : <span className="text-green-700">All met</span>) },
        { key: "r", label: "Release", filterOptions: ["Issued", "Ready", "Waiting"], filter: (r) => (r.c.release ? "Issued" : r.open.length ? "Waiting" : "Ready"), render: (r) => (r.c.release ? <Status tone="green">{r.c.release.no}</Status> : <Status tone={r.open.length ? "amber" : "blue"}>{r.open.length ? "Waiting" : "Ready"}</Status>) },
      ]} />
      {c && row && (
        <Drawer open onClose={() => setOpen(null)} width={760} title={`Contractor release — ${c.title}`} subtitle={<><span className="mono">{c.id}</span><Status>{contractStatus(c)}</Status><span>{vendorName(st, c.vendorId)}</span></>}
          actions={<>{c.release ? <Btn icon={Icon.download} onClick={() => printRelease(c)}>Print certificate</Btn> : <Btn variant="primary" disabled={row.open.length > 0} title={row.open.map((i) => i.label).join("\n")} onClick={() => setF({ date: todayISO(), signatory: byId(st.vendors, c.vendorId).contact?.name || "", ev: evalBlank(false) })}>Issue release certificate</Btn>}
            {c.release && c.status !== "Closed" && <Btn variant="success" disabled={closureChecklist(st, c).some((i) => !i.ok)} title={closureChecklist(st, c).filter((i) => !i.ok).map((i) => i.label).join("\n")} onClick={() => closeContract(c)}>Close contract</Btn>}</>}>
          <div className="space-y-4 px-6 py-5">
            <Section title="No-dues conditions" icon={Icon.listChecks}>
              <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5 p-4">{row.all.map((i) => <li key={i.label} className="flex items-center gap-2 text-[12.5px]">{h(i.ok ? Icon.check : Icon.warning, { size: 14, className: i.ok ? "text-green-600" : "text-amber-500" })}{i.label}</li>)}</ul>
            </Section>
            {c.release && <Section title="Certificate" icon={Icon.file}><KV cols={3} items={[["Certificate", c.release.no], ["Date", fmtDate(c.release.date)], ["Contractor signatory", c.release.contractorSignatory], ["Issued by", c.release.by],
              ["Closing evaluation", c.closingEval ? `${round2((c.closingEval.quality + c.closingEval.safety + c.closingEval.timeliness) / 3)} / 5 — ${c.closingEval.remarks}` : "—"], ["Requalification", c.closingEval?.requal ? "Required before the next award" : "Not required"]]} /></Section>}
          </div>
        </Drawer>
      )}
      {f && c && (
        <Modal open onClose={() => setF(null)} width={680} title={`Issue release certificate — ${c.id}`} footer={<>{err && <span className="mr-auto text-[12px] text-red-600">{err}</span>}<Btn onClick={() => setF(null)}>Cancel</Btn><Btn variant="primary" disabled={!!err} onClick={() => {
          const no = `REL-${String(st.contracts.filter((x) => x.release).length + 1).padStart(3, "0")}`;
          const avg = round2((f.ev.quality + f.ev.safety + f.ev.timeliness) / 3);
          setState((s) => { byId(s.contracts, c.id).release = { no, date: f.date, contractorSignatory: f.signatory.trim(), by: currentUser(), at: new Date().toISOString() }; applyEvaluation(s, c, f.ev, `close-out evaluation on ${c.id} (${avg}/5)`); },
            { entity: "Contract", id: c.id, action: `Release certificate ${no} issued; closing evaluation ${avg}/5${f.ev.requal ? " — requalification required" : ""}` });
          toast(`${no} issued${f.ev.requal ? " — vendor flagged for requalification" : ""}`); setF(null);
        }}>Issue certificate</Btn></>}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Certificate date" required><DateInput value={f.date} onChange={(x) => setF({ ...f, date: x })} /></Field>
              <Field label="Signed for the contractor by" required><TextInput value={f.signatory} onChange={(x) => setF({ ...f, signatory: x })} /></Field>
            </div>
            <ClosingEvaluation f={f.ev} setF={(ev) => setF({ ...f, ev })} />
          </div>
        </Modal>
      )}
    </Page>
  );
}

// ---------------------------------------------------------------- termination & final account
const TERM_STEPS = ["Terminated", "Encashment", "Final account", "Blacklist decision", "Closed"];
function terminationStep(st, c) {
  if (c.status === "Closed") return 4;
  if (liveGuarantees(c).length > 0 && !c.encashDecision) return 1;
  if (c.settlement?.status !== "Agreed") return 2;
  if (!c.blacklistDecision) return 3;
  return 4;
}
function TerminationsPage() {
  const st = useStore();
  const [open, setOpen] = useQueryOpen();
  const [term, setTerm] = y.useState(null), [bg, setBg] = y.useState(null), [noEnc, setNoEnc] = y.useState(null), [dec, setDec] = y.useState(null);
  const rows = st.contracts.filter((c) => c.status === "Terminated" || c.terminated).map((c) => ({ id: c.id, c, step: terminationStep(st, c) }));
  const live = st.contracts.filter((c) => !["Draft", "Pending Approval", "Approved", "Rejected", "Closed", "Terminated"].includes(c.status));
  const c = open && byId(st.contracts, open);
  const decErr = dec && ((!dec.decision && "Choose the decision") || (dec.reason.trim().length < 5 && "Give the reason (min 5 characters)") || evalErr(dec.ev) || "");
  return (
    <Page title="Termination & Final Account" subtitle="Alternative close path: terminate → encash guarantees → settle the final account → blacklist decision → close" icon={Icon.ban}
      actions={<Btn variant="danger" icon={Icon.ban} disabled={!live.length} onClick={() => setTerm({ contractId: "", reason: "" })}>Terminate a contract</Btn>}>
      <DataTable noun="terminations" rows={rows} onRow={(r) => setOpen(r.id)} empty={<EmptyState icon={Icon.ban} title="No terminated contracts" text="Terminating a contract short-closes its open work orders and starts the final-account path." />} columns={[
        { key: "id", label: "Contract", className: "mono text-[12px]" }, { key: "t", label: "Title", className: "font-medium", render: (r) => r.c.title },
        { key: "v", label: "Contractor", render: (r) => vendorName(st, r.c.vendorId) },
        { key: "on", label: "Terminated", render: (r) => fmtDate(r.c.terminated?.at) }, { key: "why", label: "Reason", className: "max-w-[240px] truncate text-[12px]", render: (r) => r.c.terminated?.reason },
        { key: "s", label: "Step", filterOptions: TERM_STEPS, filter: (r) => TERM_STEPS[r.step], render: (r) => <Status tone={r.step === 4 ? "gray" : "amber"}>{TERM_STEPS[r.step]}</Status> },
      ]} />
      {c && (
        <Drawer open onClose={() => setOpen(null)} width={860} title={`Termination — ${c.title}`} subtitle={<><span className="mono">{c.id}</span><Status>{contractStatus(c)}</Status><span>{vendorName(st, c.vendorId)}</span></>}
          actions={<>{c.status !== "Closed" && <Btn variant="success" disabled={closureChecklist(st, c).some((i) => !i.ok)} title={closureChecklist(st, c).filter((i) => !i.ok).map((i) => i.label).join("\n")} onClick={() => closeContract(c)}>Close contract</Btn>}</>}>
          <div className="space-y-4 px-6 py-5">
            <Section><div className="overflow-x-auto p-5"><Stepper steps={TERM_STEPS.map((x, i) => { const k = terminationStep(st, c); return { label: x, status: i < k || (i === 4 && c.status === "Closed") ? "done" : i === k ? "current" : "todo" }; })} /></div></Section>
            <Note tone="red">Terminated {fmtDate(c.terminated?.at)} by {c.terminated?.by} — {c.terminated?.reason}</Note>
            <Section title="1 · Encashment of guarantees" icon={Icon.lock} actions={liveGuarantees(c).length > 0 && !c.encashDecision && <Btn size="sm" onClick={() => setNoEnc({ reason: "" })}>No encashment</Btn>}>
              <DataTable dense rows={c.guarantees || []} rowKey={(g) => g.number} empty={<p className="p-4 text-[13px] text-ink-mute">No guarantees on this contract.</p>} columns={[
                { key: "type", label: "Type" }, { key: "number", label: "BG no.", className: "mono text-[12px]" }, { key: "bank", label: "Bank" }, { key: "amount", label: "Amount", align: "right", render: (g) => inr(g.amount) },
                { key: "s", label: "Status", render: (g) => <Status tone={{ Encashed: "red", Returned: "gray" }[bgStatus(g)] || "green"}>{bgStatus(g)}</Status> },
                { key: "a", label: "", align: "right", render: (g) => ["Active", "Expiring"].includes(bgStatus(g)) && <span className="flex justify-end gap-1"><Btn size="sm" variant="danger" onClick={() => setBg({ g, mode: "encash" })}>Encash</Btn><Btn size="sm" onClick={() => setBg({ g, mode: "return" })}>Return</Btn></span> },
              ]} />
              {c.encashDecision && <p className="border-t border-line px-4 py-2 text-[12.5px]">Not encashed — {c.encashDecision.reason} ({c.encashDecision.by}, {fmtDate(c.encashDecision.at)})</p>}
            </Section>
            <Section title="2 · Final account" icon={Icon.scale} actions={<RefLink to={`${CL_BASE}/final-settlement?open=${c.id}`}>Open final settlement →</RefLink>}>
              {(() => { const stm = settlementStatement(st, c, c.settlement || {}); return <KV cols={3} items={[["Status", c.settlement?.status || "Not prepared"], ["Guarantees encashed", inr(stm.encashed)], [stm.net >= 0 ? "Net payable" : "Net recoverable", inr(Math.abs(stm.net))]]} />; })()}
            </Section>
            <Section title="3 · Blacklist decision" icon={Icon.ban} actions={!c.blacklistDecision && <Btn size="sm" variant="primary" disabled={c.settlement?.status !== "Agreed"} title={c.settlement?.status !== "Agreed" ? "Agree the final account first" : ""} onClick={() => setDec({ decision: "", reason: "", ev: evalBlank(true) })}>Record decision</Btn>}>
              {c.blacklistDecision ? <KV cols={3} items={[["Decision", c.blacklistDecision.decision], ["Reason", c.blacklistDecision.reason], ["By", `${c.blacklistDecision.by} · ${fmtDate(c.blacklistDecision.at)}`]]} />
                : <p className="p-4 text-[13px] text-ink-mute">After the final account: blacklist the contractor, place them on hold, or take no action. The closing evaluation goes into the scorecard either way.</p>}
            </Section>
          </div>
        </Drawer>
      )}
      {term && (
        <Modal open onClose={() => setTerm(null)} width={520} title="Terminate a contract" subtitle="Open work orders are short-closed; billed work, retention and guarantees stay for the final account"
          footer={<><Btn onClick={() => setTerm(null)}>Cancel</Btn><Btn variant="danger" disabled={!term.contractId || term.reason.trim().length < 5} onClick={() => { const x = byId(st.contracts, term.contractId); if (terminateContract(x, term.reason.trim())) { setTerm(null); setOpen(x.id); } }}>Terminate contract</Btn></>}>
          <div className="space-y-3">
            <Field label="Contract" required><Select value={term.contractId} placeholder="Select…" onChange={(x) => setTerm({ ...term, contractId: x })} options={live.map((x) => ({ value: x.id, label: `${x.id} — ${x.title} (${vendorName(st, x.vendorId)})` }))} /></Field>
            <Field label="Reason" required><TextInput value={term.reason} onChange={(x) => setTerm({ ...term, reason: x })} placeholder="e.g. Abandoned site for 30 days after two notices" /></Field>
          </div>
        </Modal>
      )}
      {bg && c && <GuaranteeModal c={c} g={bg.g} mode={bg.mode} onClose={() => setBg(null)} />}
      {noEnc && c && (
        <Modal open onClose={() => setNoEnc(null)} width={480} title="Record no encashment" footer={<><Btn onClick={() => setNoEnc(null)}>Cancel</Btn><Btn variant="primary" disabled={noEnc.reason.trim().length < 5} onClick={() => {
          setState((s) => { byId(s.contracts, c.id).encashDecision = { decision: "Not encashed", reason: noEnc.reason.trim(), by: currentUser(), at: todayISO() }; }, { entity: "Contract", id: c.id, action: `Guarantees not encashed — ${noEnc.reason.trim()}` });
          toast("Recorded — return the guarantees after the final account"); setNoEnc(null);
        }}>Save</Btn></>}>
          <Field label="Why not encash" required><TextInput value={noEnc.reason} onChange={(x) => setNoEnc({ reason: x })} placeholder="e.g. Termination by mutual consent, no loss" /></Field>
        </Modal>
      )}
      {dec && c && (
        <Modal open onClose={() => setDec(null)} width={680} title={`Blacklist decision — ${vendorName(st, c.vendorId)}`} footer={<>{decErr && <span className="mr-auto text-[12px] text-red-600">{decErr}</span>}<Btn onClick={() => setDec(null)}>Cancel</Btn><Btn variant={dec.decision === "Blacklist" ? "danger" : "primary"} disabled={!!decErr} onClick={() => {
          const avg = round2((dec.ev.quality + dec.ev.safety + dec.ev.timeliness) / 3);
          setState((s) => {
            byId(s.contracts, c.id).blacklistDecision = { decision: dec.decision, reason: dec.reason.trim(), by: currentUser(), at: todayISO() };
            const v = byId(s.vendors, c.vendorId);
            if (dec.decision === "Blacklist") { v.status = "Blacklisted"; v.hold = null; v.notes = v.notes || []; v.notes.unshift({ at: todayISO(), by: currentUser(), text: `Blacklisted — ${dec.reason.trim()} (termination of ${c.id})` }); }
            if (dec.decision === "Hold for review") { v.status = "On Hold"; v.hold = { scope: "All", reason: `Termination of ${c.id} — ${dec.reason.trim()}`, until: null, placedAt: todayISO() }; }
            applyEvaluation(s, c, dec.ev, `terminated on ${c.id} — ${c.terminated?.reason || ""}`.trim());
          }, { entity: "Contract", id: c.id, action: `Blacklist decision: ${dec.decision} — ${dec.reason.trim()}; closing evaluation ${avg}/5` });
          toast(`Decision recorded — ${dec.decision}`); setDec(null);
        }}>Record decision</Btn></>}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Decision" required><Select value={dec.decision} placeholder="Select…" onChange={(x) => setDec({ ...dec, decision: x })} options={["Blacklist", "Hold for review", "No action"]} /></Field>
              <Field label="Reason" required><TextInput value={dec.reason} onChange={(x) => setDec({ ...dec, reason: x })} /></Field>
            </div>
            <ClosingEvaluation f={dec.ev} setF={(ev) => setDec({ ...dec, ev })} terminated />
          </div>
        </Modal>
      )}
    </Page>
  );
}

// ---------------------------------------------------------------- requalification (closure → gates B & C)
function requalQueue(st) {
  return st.vendors.filter((v) => !["Blacklisted", "Rejected", "Draft"].includes(v.status)).map((v) => {
    const q = v.qualification;
    const why = v.requalRequired ? { kind: "Close-out / termination", reason: v.requalRequired.reason, since: v.requalRequired.at }
      : requalDue(v) ? { kind: "Cycle overdue", reason: "Requalification cycle passed", since: shiftDays(Math.min(...ruleSetsFor(v).map((s) => s.requalifyDays)), q.at) }
      : q?.expiryDate && q.expiryDate < todayISO() ? { kind: "Qualification expired", reason: `Expired ${fmtDate(q.expiryDate)}`, since: q.expiryDate } : null;
    return why && { id: v.id, v, ...why, gate: sourcingGate(st, v, "po") };
  }).filter(Boolean);
}
function RequalificationPage() {
  const st = useStore(), nav = useNavigate();
  const [tab, setTab] = y.useState("queue"), [waive, setWaive] = y.useState(null);
  const rows = requalQueue(st);
  const hist = st.vendors.flatMap((v) => (v.requalHistory || []).map((h0, i) => ({ id: `${v.id}-${i}`, v, ...h0 }))).sort((a, b) => (b.clearedAt || "").localeCompare(a.clearedAt || ""));
  return (
    <Page title="Requalification" subtitle="Vendors that must be re-assessed — after a poor close-out evaluation, a termination, an expired qualification or an overdue cycle. Until then new RFQs, POs, contracts and work orders stop." icon={Icon.refresh}>
      <TabBar active={tab} onChange={setTab} tabs={[{ id: "queue", label: "To requalify", icon: Icon.refresh, count: rows.length }, { id: "hist", label: "History", icon: Icon.fileClock, count: hist.length }]} />
      {tab === "queue" ? (
        <DataTable noun="vendors" rows={rows} onRow={(r) => nav(`${VM_BASE}/registry?open=${r.id}`)} empty={<EmptyState icon={Icon.check} title="No vendor needs requalification" text="Close-out evaluations below 3 / 5 and terminations send vendors here." />} columns={[
          { key: "v", label: "Vendor", className: "font-medium", render: (r) => r.v.name }, { key: "kind", label: "Trigger", filterOptions: ["Close-out / termination", "Cycle overdue", "Qualification expired"], filter: true },
          { key: "reason", label: "Reason", className: "max-w-[300px] truncate text-[12px]" }, { key: "since", label: "Since", render: (r) => fmtDate(r.since) },
          { key: "last", label: "Last qualification", render: (r) => (r.v.qualification ? `${r.v.qualification.score}/100 · ${fmtDate(r.v.qualification.at)}` : "—") },
          { key: "g", label: "Effect", render: (r) => <Status tone={r.gate.block ? "red" : "amber"}>{r.gate.block ? "RFQ / PO / contract / WO stopped" : "Warning only"}</Status> },
          { key: "a", label: "", align: "right", render: (r) => <span className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <Btn size="sm" variant="primary" onClick={() => nav(`${VM_BASE}/registry?open=${r.id}`)}>Re-assess</Btn>
            {r.v.requalRequired && <Btn size="sm" onClick={() => setWaive({ v: r.v, reason: "" })}>Waive</Btn>}</span> },
        ]} />
      ) : (
        <DataTable noun="entries" rows={hist} columns={[{ key: "v", label: "Vendor", render: (r) => r.v.name }, { key: "reason", label: "Trigger", className: "text-[12px]" }, { key: "at", label: "Raised", render: (r) => fmtDate(r.at) },
          { key: "how", label: "Cleared by", className: "text-[12px]" }, { key: "clearedAt", label: "Cleared", render: (r) => `${fmtDate(r.clearedAt)} · ${r.clearedBy}` }]} />
      )}
      <div className="px-4 pb-4"><Note>Re-assess opens the vendor record — on its Qualification tab, saving the Qualification questionnaire clears the flag. Gate strength: Procurement Settings → requalification gate (<b>{settingsOf(st).requalGate}</b>).</Note></div>
      {waive && (
        <Modal open onClose={() => setWaive(null)} width={480} title={`Waive requalification — ${waive.v.name}`} footer={<><Btn onClick={() => setWaive(null)}>Cancel</Btn><Btn variant="primary" disabled={waive.reason.trim().length < 10} onClick={() => {
          setState((s) => { const x = byId(s.vendors, waive.v.id); x.requalHistory = [...(x.requalHistory || []), { ...x.requalRequired, clearedAt: todayISO(), clearedBy: currentUser(), how: `Waived — ${waive.reason.trim()}` }]; x.requalRequired = null; },
            { entity: "Vendor", id: waive.v.id, action: `Requalification waived — ${waive.reason.trim()}` });
          toast("Requalification waived"); setWaive(null);
        }}>Waive</Btn></>}>
          <Field label="Why waive" required hint="Min 10 characters — kept in the history"><TextInput value={waive.reason} onChange={(x) => setWaive({ ...waive, reason: x })} /></Field>
        </Modal>
      )}
    </Page>
  );
}
