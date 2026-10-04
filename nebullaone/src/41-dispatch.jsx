// Dispatch notice (advance shipping notice - SAP inbound delivery, Oracle ASN, ERPNext / Zoho delivery note):
// the vendor says in the portal what it sent; site checks it at goods receipt; differences and notices that
// never arrive are flagged to both sides.
const dispatchesOf = (po) => po.dispatches || [];
const dispatchGrn = (po, d) => (d.grnId ? po.receipts.find((r) => r.id === d.grnId) : null);
const openDispatches = (po) => dispatchesOf(po).filter((d) => !dispatchGrn(po, d));
const dispatchGraceDays = (st) => Number(settingsOf(st || getState()).dispatchGraceDays) || 0;
// what the vendor may still declare on a line: ordered - received - already on the way
function dispatchRoom(po, i, skipId) {
  const r = poReceived(po)[i];
  const onWay = sum(openDispatches(po).filter((d) => d.id !== skipId).flatMap((d) => d.lines.filter((l) => l.line === i)), (l) => l.qty);
  return Math.max(0, r.qty - r.received - onWay);
}
// Sent vs received for one notice
function dispatchCheck(st, po, d) {
  const g = dispatchGrn(po, d);
  if (!g) {
    const past = d.eta ? -daysUntil(d.eta) : 0, late = past > dispatchGraceDays(st);
    return { open: true, late, diffs: [], tone: late ? "red" : "blue", text: late ? `Not received - ${past} day(s) past arrival` : "Awaiting receipt" };
  }
  const diffs = d.lines.map((l) => { const got = sum(g.lines.filter((x) => x.line === l.line), (x) => x.qty); return { line: l.line, sent: l.qty, got, diff: round2(got - l.qty) }; }).filter((x) => Math.abs(x.diff) > 1e-9);
  const short = diffs.filter((x) => x.diff < 0), extra = diffs.filter((x) => x.diff > 0);
  const unit = (x) => po.lines[x.line]?.unit || "";
  return {
    open: false, grn: g, diffs, short: short.length > 0,
    tone: short.length ? "red" : extra.length ? "amber" : "green",
    text: short.length ? `Short by ${short.map((x) => `${num(-x.diff)} ${unit(x)}`).join(", ")}` : extra.length ? `Excess ${extra.map((x) => `${num(x.diff)} ${unit(x)}`).join(", ")}` : "Received in full",
  };
}
const dispatchDiffText = (po, c) => c.diffs.map((x) => `${po.lines[x.line].desc}: sent ${num(x.sent)}, received ${num(x.got)} - ${num(Math.abs(x.diff))} ${x.diff < 0 ? "short" : "excess"}`).join(" · ");
// The PO's delivery state for the status chip
function poDispatchState(st, po) {
  const open = openDispatches(po);
  if (!open.length || ["Draft", "Closed", "Cancelled"].includes(po.status)) return null;
  const late = open.some((d) => dispatchCheck(st, po, d).late);
  return { tone: late ? "red" : "blue", text: late ? "Dispatched, not received" : "Dispatched - awaiting receipt" };
}
const PoDispatchChip = ({ st, po }) => { const s = poDispatchState(st, po); return s ? <Status tone={s.tone}>{s.text}</Status> : null; };

// Notices on a PO - the buyer's view and the vendor's view
function DispatchSection({ po, portal }) {
  const st = useStore();
  const rows = dispatchesOf(po).slice().reverse();
  if (!rows.length && !portal) return null;
  return (
    <Section title={portal ? "Your dispatch notices" : "Dispatch notices from the vendor"} icon={Icon.truck}>
      <DataTable dense rows={rows} empty={<p className="p-4 text-[13px] text-ink-mute">No dispatch notice sent yet.</p>} columns={[
        { key: "id", label: "Notice", className: "mono text-[12px]" },
        { key: "date", label: "Sent · expected", className: "text-[12.5px]", render: (d) => <span className="flex flex-col"><span>{fmtDate(d.date)}</span><span className="text-ink-mute">{fmtDate(d.eta)}</span></span> },
        { key: "ch", label: "Challan · vehicle", className: "text-[12px]", render: (d) => <span className="flex flex-col"><span>{d.challan}</span>{d.vehicleNo && <span className="text-ink-mute">{d.vehicleNo}</span>}{d.ewayBill && <span className="text-ink-mute">e-Way {d.ewayBill}</span>}{d.file && <a className="text-brand hover:underline" href={d.file.data} download={d.file.name} onClick={(e) => e.stopPropagation()}>{d.file.name}</a>}</span> },
        { key: "i", label: "Items", className: "whitespace-normal text-[12.5px]", render: (d) => { const g = dispatchGrn(po, d); return d.lines.map((l) => { const u = po.lines[l.line].unit, got = g ? sum(g.lines.filter((x) => x.line === l.line), (x) => x.qty) : null; return `${po.lines[l.line].desc}: ${portal ? "you sent" : "sent"} ${num(l.qty)} ${u}${got !== null ? `, ${portal ? "buyer received" : "received"} ${num(got)} ${u}` : ""}`; }).join(" · "); } },
        { key: "s", label: "Status", render: (d) => { const c = dispatchCheck(st, po, d), g = dispatchGrn(po, d); return <span className="flex flex-col items-start gap-0.5"><Status tone={c.tone}>{c.text}</Status>{g && <span className="mono text-[11px] text-ink-mute">{g.id}</span>}</span>; } },
      ]} />
    </Section>
  );
}

// Vendor: send a dispatch notice from the portal
function DispatchModal({ po, by, onClose }) {
  const rec = poReceived(po);
  const [f, setF] = y.useState({ date: todayISO(), eta: "", challan: "", vehicleNo: "", ewayBill: "", file: null, qty: rec.map(() => "") });
  const room = rec.map((_, i) => dispatchRoom(po, i));
  const lineErr = f.qty.map((q, i) => (q === "" ? "" : !(Number(q) >= 0) ? "Enter a quantity" : Number(q) > room[i] + 1e-9 ? `Only ${num(room[i])} pending` : ""));
  const total = sum(f.qty, (q) => Number(q) || 0);
  const err = VX.req(f.date, "Dispatch date required") || VX.notFuture(f.date, "Dispatch date can't be in the future") || (f.date < po.date ? `Before the PO date (${fmtDate(po.date)})` : "")
    || (!f.eta ? "Expected arrival required" : f.eta < f.date ? "Arrival can't be before dispatch" : "")
    || (!f.challan.trim() ? "Challan no. required" : "")
    || (f.ewayBill && !/^\d{12}$/.test(f.ewayBill.trim()) ? "e-Way bill no. is 12 digits" : "")
    || lineErr.find(Boolean) || (total <= 0 ? "Enter the quantity sent on at least one line" : "");
  const save = () => {
    let id = "";
    setState((s) => {
      const p = byId(s.purchaseOrders, po.id);
      id = nextId("DSP", s.purchaseOrders.flatMap(dispatchesOf));
      p.dispatches = [...dispatchesOf(p), { id, date: f.date, eta: f.eta, challan: f.challan.trim(), vehicleNo: f.vehicleNo.trim(), ewayBill: f.ewayBill.trim(), file: f.file, by, at: new Date().toISOString(), grnId: null,
        lines: f.qty.map((q, i) => ({ line: i, qty: Number(q) || 0 })).filter((l) => l.qty > 0) }];
    }, { entity: "PO", id: po.id, action: `Dispatch notice from vendor - ${f.qty.map((q, i) => (Number(q) > 0 ? `${num(Number(q))} ${rec[i].unit} ${rec[i].desc}` : "")).filter(Boolean).join(", ")}; challan ${f.challan.trim()}, arriving ${fmtDate(f.eta)}` });
    toast(`${id} sent - the buyer is notified`); onClose();
  };
  return (
    <Modal open onClose={onClose} width={760} title={`Send dispatch notice - ${po.id}`}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" icon={Icon.send} disabled={!!err} onClick={save}>Send notice</Btn></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Dispatch date" required><DateInput value={f.date} onChange={(x) => setF({ ...f, date: x })} /></Field>
          <Field label="Expected arrival" required><DateInput value={f.eta} onChange={(x) => setF({ ...f, eta: x })} /></Field>
          <Field label="Challan no." required><TextInput value={f.challan} onChange={(x) => setF({ ...f, challan: x })} /></Field>
          <Field label="Vehicle no."><TextInput value={f.vehicleNo} onChange={(x) => setF({ ...f, vehicleNo: x })} placeholder="e.g. MH12 AB 4521" /></Field>
          <Field label="e-Way bill no."><TextInput value={f.ewayBill} onChange={(x) => setF({ ...f, ewayBill: x })} /></Field>
          <Field label="Challan copy">
            <label className={cls("flex h-[32px] cursor-pointer items-center gap-2 truncate rounded-md border border-dashed px-2.5 text-[12.5px]", f.file ? "border-green-300 bg-green-50 text-green-700" : "border-gray-300 text-ink-mute")}>
              <Icon.upload size={13} /><span className="truncate">{f.file?.name || "Attach photo or PDF"}</span>
              <input type="file" className="hidden" onChange={async (e) => { const a = await readAttachment(e.target.files[0]); a && setF((ff) => ({ ...ff, file: a })); }} />
            </label>
          </Field>
        </div>
        <table className="w-full">
          <thead><tr><Th>Item</Th><Th align="right">Ordered</Th><Th align="right">Pending</Th><Th align="right">Sending now</Th></tr></thead>
          <tbody>
            {rec.map((l, i) => (
              <tr key={i}>
                <Td>{l.desc}</Td><Td align="right" className="num">{num(l.qty)} {l.unit}</Td><Td align="right" className="num">{num(room[i])}</Td>
                <Td align="right"><NumInput aria-label={`Sending now - ${l.desc}`} value={f.qty[i]} disabled={room[i] <= 0} onChange={(x) => setF({ ...f, qty: f.qty.map((z, j) => (j === i ? x : z)) })} />{lineErr[i] && <span className="block text-[11.5px] text-red-600">{lineErr[i]}</span>}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

// Exception Center rows
function dispatchExceptions(st, add) {
  for (const po of st.purchaseOrders) {
    if (["Draft", "Cancelled"].includes(po.status)) continue;
    const to = `${VM_BASE}/purchase-orders?open=${po.id}`;
    for (const d of dispatchesOf(po)) {
      const c = dispatchCheck(st, po, d);
      if (c.late && po.status !== "Closed") add("Dispatched, not received", "Medium", "PO", po.id, vendorName(st, po.vendorId), `${d.id} - challan ${d.challan}, expected ${fmtDate(d.eta)}; no goods receipt yet`, d.eta, to);
      if (!c.open && c.diffs.length) add(c.short ? "Short receipt against dispatch" : "Excess receipt against dispatch", c.short ? "Medium" : "Low", "PO", po.id, vendorName(st, po.vendorId), `${d.id} → ${c.grn.id}: ${dispatchDiffText(po, c)}`, c.grn.date, to);
    }
  }
}

// Demo data: one notice received short (PO-001) and one on the way (PO-003)
function seedDispatches(s) {
  if (s.dispatchSeeded) return false;
  s.dispatchSeeded = true;
  const D = (n) => new Date(Date.now() + n * DAY).toISOString().slice(0, 10);
  const p1 = (s.purchaseOrders || []).find((p) => p.id === "PO-001"), g2 = p1 && p1.receipts.find((r) => r.id === "GRN-002");
  if (p1 && g2 && !p1.dispatches) {
    p1.dispatches = [{ id: "DSP-001", date: shiftDays(-1, g2.date), eta: g2.date, challan: "DST/DC/2291", vehicleNo: "MH04 GT 7781", ewayBill: "", file: null, by: "Vendor (portal)", at: new Date(Date.now() - 42 * DAY).toISOString(), grnId: "GRN-002", lines: [{ line: 1, qty: 10 }] }];
    g2.dispatchId = "DSP-001";
  }
  const p3 = (s.purchaseOrders || []).find((p) => p.id === "PO-003");
  if (p3 && !p3.dispatches && !p3.receipts.length) p3.dispatches = [{ id: "DSP-002", date: D(-1), eta: D(1), challan: "KA/MS/0518", vehicleNo: "MH14 KQ 3310", ewayBill: "", file: null, by: "Portal user", at: new Date(Date.now() - DAY).toISOString(), grnId: null, lines: [{ line: 0, qty: 300 }] }];
  return true;
}
