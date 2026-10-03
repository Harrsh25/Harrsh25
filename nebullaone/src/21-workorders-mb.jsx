// Work orders (Lump Sum / Item-Rate) and the Measurement Book with joint
// measurement sheet (JMS) sign-off.

function WorkOrderModal({ open, onClose, onCreated, contractId: presetContract }) {
  const st = useStore();
  const blank = () => ({ contractId: presetContract || "", title: "", type: "Item-Rate", location: "", wbs: "", start: todayISO(), end: shiftDays(90), lumpSum: "",
    items: [{ id: "I1", code: "1.1", desc: "", unit: "cum", qty: "", rate: "" }],
    milestones: [{ id: "M1", name: "Mobilisation", weight: 10 }, { id: "M2", name: "", weight: 90 }] });
  const [f, setF] = y.useState(blank);
  y.useEffect(() => { if (open) setF(blank()); }, [open]);
  const c = byId(st.contracts, f.contractId);
  const contracts = st.contracts.filter((x) => ["Active", "Expiring"].includes(contractStatus(x)) && !isBlockedFor(byId(st.vendors, x.vendorId) || {}, "All"));
  const blockers = f.contractId ? woIssueBlockers(st, f.contractId) : [];
  const qualWarn = c ? qualLimitWarn(st, byId(st.vendors, c.vendorId), f.type === "Lump Sum" ? Number(f.lumpSum) || 0 : sum(f.items, (i) => (Number(i.qty) || 0) * (Number(i.rate) || 0))) : "";
  // Lines still available on the contract BOQ (scope qty − already ordered on other work orders)
  const boqLeft = c ? contractBoq(st, c).filter((l) => l.balance > 0) : [];
  const loadBoq = () => setF({ ...f, type: "Item-Rate", items: boqLeft.map((l, i) => ({ id: `I${i + 1}`, code: l.code, desc: l.desc, unit: l.unit, qty: l.balance, rate: l.rate, boqRef: l.id })) });
  const value = f.type === "Lump Sum" ? Number(f.lumpSum) || 0 : sum(f.items, (i) => (Number(i.qty) || 0) * (Number(i.rate) || 0));
  // committed on the contract: cancelled WOs release their value, short-closed WOs keep only what was measured
  const ordered = c ? sum(st.workOrders.filter((w) => w.contractId === c.id && w.status !== "Cancelled"), (w) => (w.status === "Short-closed" ? woProgress(st, w).measured : woValue(w))) : 0;
  const headroom = c ? contractValue(c) - ordered : 0;
  const wsum = sum(f.milestones, (m) => m.weight);
  const setItem = (i, k, v) => setF({ ...f, items: f.items.map((x, j) => (j === i ? { ...x, [k]: v } : x)) });
  const setMs = (i, k, v) => setF({ ...f, milestones: f.milestones.map((x, j) => (j === i ? { ...x, [k]: v } : x)) });
  const boqOver = c && f.type !== "Lump Sum" && f.items.some((i) => { const l = i.boqRef && contractBoq(st, c).find((b) => b.id === i.boqRef); return l && Number(i.qty) > l.balance + 0.001; });
  const dateErr = !f.start || !f.end ? "Enter start and finish dates" : f.end <= f.start ? "Finish must be after start" : c && f.start < c.start ? `Starts before the contract (${fmtDate(c.start)})` : c && f.end > c.end ? `Finishes after the contract completion (${fmtDate(c.end)}) — extend the contract first` : "";
  const ok = c && f.title && f.wbs && value > 0 && !boqOver && !dateErr && (f.type === "Lump Sum" ? wsum === 100 && f.milestones.every((m) => m.name) : f.items.every((i) => i.desc && i.qty > 0 && i.rate > 0));
  const save = (issue) => {
    const id = nextId("WO", st.workOrders);
    if (issue && blockers.length) return toast(`Can't issue — ${blockers.join("; ")}`, "red");
    const wo = { id, contractId: c.id, vendorId: c.vendorId, project: c.project, wbs: f.wbs, title: f.title, type: f.type, location: f.location, start: f.start, end: f.end, status: issue ? "Issued" : "Draft", issuedOn: issue ? todayISO() : null, issuedBy: issue ? currentUser() : null, acceptance: issue ? { status: "Pending" } : null };
    if (f.type === "Lump Sum") Object.assign(wo, { lumpSum: Number(f.lumpSum), milestones: f.milestones.map((m, i) => ({ id: `M${i + 1}`, name: m.name, weight: Number(m.weight) })) });
    else wo.items = f.items.map((it, i) => ({ id: `${id.slice(-3)}-${i + 1}`, code: it.code, desc: it.desc, unit: it.unit, qty: Number(it.qty), rate: Number(it.rate), ...(it.boqRef ? { boqRef: it.boqRef } : {}) }));
    setState((s) => s.workOrders.unshift(wo), { entity: "Work Order", id, action: `${issue ? "Issued" : "Drafted"} under ${c.id} (${f.type})` });
    toast(`${id} ${issue ? "issued" : "saved"}`); onClose(); onCreated && onCreated(id);
  };
  return (
    <Modal open={open} onClose={onClose} width={900} title="Create work order"
      footer={<><span className="mr-auto text-[13px]">WO value <b className="num">{inr(value)}</b>{c && <span className={cls("ml-3", value > headroom ? "text-red-600" : "text-ink-mute")}>· contract headroom {inrShort(headroom)}</span>}</span>
        <Btn onClick={onClose}>Cancel</Btn><Btn disabled={!ok} onClick={() => save(false)}>Save draft</Btn><Btn variant="primary" disabled={!ok || value > headroom || blockers.length > 0} onClick={() => save(true)}>Issue work order</Btn></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Contract" required hint="Signed contracts of contractors who aren't blocked"><Select value={f.contractId} placeholder="Select contract…" onChange={(x) => setF({ ...f, contractId: x, wbs: "" })} options={contracts.map((x) => ({ value: x.id, label: `${x.id} — ${vendorName(st, x.vendorId)}` }))} /></Field>
          <Field label="Work order type" hint={f.type === "Lump Sum" ? "Fixed price, billed on milestone % complete" : "Billed on measured quantity × agreed rate"}>
            <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5">
              {["Item-Rate", "Lump Sum"].map((t) => <button key={t} type="button" onClick={() => setF({ ...f, type: t })} className={cls("h-[28px] flex-1 rounded-md text-[13px]", f.type === t ? "bg-white font-medium text-brand shadow-sm" : "text-ink-soft")}>{t}</button>)}
            </div>
          </Field>
          <Field label="WBS element" required hint={c ? c.project : "Pick a contract first"}><Select value={f.wbs} placeholder="Select…" disabled={!c} onChange={(x) => setF({ ...f, wbs: x })} options={c ? wbsFor(c.project) : []} /></Field>
          <Field label="Title / scope" required span={2}><TextInput value={f.title} onChange={(x) => setF({ ...f, title: x })} /></Field>
          <Field label="Location / work front"><TextInput value={f.location} onChange={(x) => setF({ ...f, location: x })} placeholder="e.g. Tower C, Block 2" /></Field>
          <div className="grid grid-cols-2 gap-2"><Field label="Start"><DateInput value={f.start} onChange={(x) => setF({ ...f, start: x })} /></Field><Field label="Finish"><DateInput value={f.end} onChange={(x) => setF({ ...f, end: x })} /></Field></div>
        </div>
        {c && (() => { const cv = byId(st.vendors, c.vendorId), cc = cv && complianceOf(cv); return cc && cc.blocking.length > 0 ? <Note tone="amber" icon={Icon.shieldCheck}><b>{cv.name} is not compliant:</b> {cc.blocking.join(" · ")}. Payments against this work order will be held until it is fixed.</Note> : null; })()}
        {c && dateErr && <Note tone="red">{dateErr}</Note>}
        {blockers.length > 0 && <Note tone="red" icon={Icon.lock}>Can be saved as a draft but not issued: {blockers.join(" · ")}.</Note>}
        {qualWarn && <Note tone="amber" icon={Icon.alert}>{qualWarn}. You can still issue — the approver sees this warning.</Note>}
        {boqOver && <Note tone="red">A line is above what is left on the contract BOQ — raise a change order for the extra quantity.</Note>}
        {c && boqLeft.length > 0 && f.type !== "Lump Sum" && <div className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-[12.5px]"><span>Contract BOQ has <b>{boqLeft.length}</b> line(s) not yet ordered.</span><Btn size="sm" icon={Icon.sheet} onClick={loadBoq}>Load lines from contract BOQ</Btn></div>}
        {c && <Note>Contract terms applied to bills under this WO: retention {c.retentionPct}%, advance recovery {c.advanceRecoveryPct || 0}%, cess {c.cessPct}%, GST {c.gstPct}%.</Note>}
        {f.type === "Item-Rate" ? (
          <Section title="Schedule of items (BOQ)" actions={<Btn size="sm" icon={Icon.plus} onClick={() => setF({ ...f, items: [...f.items, { id: `I${f.items.length + 1}`, code: "", desc: "", unit: "cum", qty: "", rate: "" }] })}>Add item</Btn>}>
            <div className="space-y-2 p-3">
              <div className="grid grid-cols-[70px_1fr_80px_100px_110px_110px_28px] gap-2 text-[11.5px] font-medium text-ink-mute"><span>Code</span><span>Description</span><span>Unit</span><span>Qty</span><span>Rate (₹)</span><span className="text-right">Amount</span><span /></div>
              {f.items.map((it, i) => (
                <div key={i} className="grid grid-cols-[70px_1fr_80px_100px_110px_110px_28px] items-center gap-2">
                  <TextInput value={it.code} onChange={(x) => setItem(i, "code", x)} />
                  <TextInput value={it.desc} onChange={(x) => setItem(i, "desc", x)} placeholder="Item description" />
                  <Select value={it.unit} onChange={(x) => setItem(i, "unit", x)} options={["cum", "sqm", "rmt", "MT", "kg", "nos", "man-day", "LS"]} />
                  <NumInput value={it.qty} onChange={(x) => setItem(i, "qty", x)} />
                  <NumInput value={it.rate} onChange={(x) => setItem(i, "rate", x)} />
                  <span className="num text-right text-[13px]">{inr((Number(it.qty) || 0) * (Number(it.rate) || 0))}</span>
                  <IconBtn icon={Icon.trash} title="Remove item" onClick={() => f.items.length > 1 && setF({ ...f, items: f.items.filter((_, j) => j !== i) })} />
                </div>
              ))}
            </div>
          </Section>
        ) : (
          <Section title="Lump sum & payment milestones" actions={<Btn size="sm" icon={Icon.plus} onClick={() => setF({ ...f, milestones: [...f.milestones, { id: `M${f.milestones.length + 1}`, name: "", weight: 0 }] })}>Add milestone</Btn>}>
            <div className="space-y-2 p-3">
              <div className="w-60"><Field label="Lump sum value (₹)" required><NumInput value={f.lumpSum} onChange={(x) => setF({ ...f, lumpSum: x })} /></Field></div>
              {f.milestones.map((m, i) => (
                <div key={i} className="grid grid-cols-[1fr_110px_140px_28px] items-center gap-2">
                  <TextInput value={m.name} onChange={(x) => setMs(i, "name", x)} placeholder={`Milestone ${i + 1}`} />
                  <NumInput value={m.weight} onChange={(x) => setMs(i, "weight", x)} />
                  <span className="num text-right text-[13px]">{inr(((Number(f.lumpSum) || 0) * (Number(m.weight) || 0)) / 100)}</span>
                  <IconBtn icon={Icon.trash} title="Remove milestone" onClick={() => f.milestones.length > 1 && setF({ ...f, milestones: f.milestones.filter((_, j) => j !== i) })} />
                </div>
              ))}
              <p className={cls("text-[12px]", wsum === 100 ? "text-green-700" : "text-red-600")}>Milestone weights total {wsum}% {wsum !== 100 && "— must equal 100%"}</p>
            </div>
          </Section>
        )}
      </div>
    </Modal>
  );
}

function WorkOrderDrawer({ id, onClose }) {
  const st = useStore();
  const wo = byId(st.workOrders, id);
  const [mb, setMb] = y.useState(null), [act, setAct] = y.useState(null), [res, setRes] = y.useState(null);
  if (!wo) return null;
  const pos = woPosition(st, wo), pr = woProgress(st, wo);
  const bills = st.raBills.filter((b) => b.woId === id);
  const hasWork = st.measurements.some((m) => m.woId === id) || bills.length > 0;
  const mut = (status, reason) => {
    if ((status === "Issued" || (status === "In Progress" && wo.status === "Suspended"))) { const b = woIssueBlockers(getState(), wo.contractId); if (b.length) return toast(`Can't ${status === "Issued" ? "issue" : "resume"} — ${b.join("; ")}`, "red"); }
    if (["Suspended", "Short-closed", "Cancelled"].includes(status) && !tryAct(["Project Manager", "Procurement Head"], [], `${status.toLowerCase()} a work order`)) return;
    setState((s) => {
      const w = byId(s.workOrders, id); w.status = status;
      if (status === "Issued") { w.issuedOn = todayISO(); w.issuedBy = currentUser(); w.acceptance = { status: "Pending" }; }
      if (reason) w.log = [...(w.log || []), { at: new Date().toISOString(), by: currentUser(), status, reason }];
    }, { entity: "Work Order", id, action: `Status → ${status}${reason ? ` — ${reason}` : ""}` });
    toast(`${id} ${status.toLowerCase()}`, ["Suspended", "Cancelled"].includes(status) ? "amber" : "green");
    setAct(null);
  };
  const lastLog = (wo.log || []).slice(-1)[0];
  return (
    <Drawer open stages={{ steps: STAGES.wo, current: wo.status }} related={relatedFor(st, "wo", wo)} comments={wo.id} onClose={onClose} width={960} title={wo.title} subtitle={<><span className="mono">{wo.id}</span><Status>{wo.status}</Status><span>{wo.type}</span><span>· {vendorName(st, wo.vendorId)}</span><span>· {wo.contractId}</span><span>· {wo.location}</span></>}
      actions={<>
        {wo.status === "Draft" && <Btn variant="primary" onClick={() => mut("Issued")}>Issue</Btn>}
        {wo.status === "Issued" && wo.acceptance?.status !== "Accepted" && <Btn onClick={() => setState((s) => (byId(s.workOrders, id).acceptance = { status: "Accepted", by: `${currentUser()} (on contractor's signed copy)`, at: new Date().toISOString() }), { entity: "Work Order", id, action: "Acceptance recorded on contractor's behalf" })}>Record acceptance</Btn>}
        {["Issued", "In Progress"].includes(wo.status) && <Btn variant="primary" icon={Icon.ruler} disabled={!woAccepted(wo)} title={woAccepted(wo) ? "" : "Contractor must accept the work order first"} onClick={() => setMb({ woId: id })}>Record measurement</Btn>}
        {["Issued", "In Progress"].includes(wo.status) && pr.physical >= 99.5 && <Btn variant="success" onClick={() => mut("Completed")}>Mark completed</Btn>}
        {["Issued", "In Progress"].includes(wo.status) && <Btn onClick={() => setAct({ status: "Suspended", reason: "" })}>Suspend</Btn>}
        {wo.status === "Suspended" && <Btn variant="primary" onClick={() => mut("In Progress", "Resumed")}>Resume</Btn>}
        {["Issued", "In Progress", "Suspended"].includes(wo.status) && hasWork && <Btn onClick={() => setAct({ status: "Short-closed", reason: "" })}>Short-close</Btn>}
        {["Draft", "Issued"].includes(wo.status) && !hasWork && <Btn variant="danger" onClick={() => setAct({ status: "Cancelled", reason: "" })}>Cancel</Btn>}
      </>}>
      <div className="space-y-4 px-6 py-5">
        {wo.status === "Draft" && woIssueBlockers(st, wo.contractId).length > 0 && <Note tone="red" icon={Icon.lock}>Can't be issued yet: {woIssueBlockers(st, wo.contractId).join(" · ")}.</Note>}
        {wo.status === "Draft" && qualLimitWarn(st, byId(st.vendors, wo.vendorId), woValue(wo), wo.id) && <Note tone="amber" icon={Icon.alert}>{qualLimitWarn(st, byId(st.vendors, wo.vendorId), woValue(wo), wo.id)}.</Note>}
        {["Suspended", "Short-closed", "Cancelled", "Closed"].includes(wo.status) && <Note tone={wo.status === "Suspended" ? "amber" : "blue"}>{wo.status === "Suspended" ? "Stop-work: measurements, claims and new bills are paused until resumed." : wo.status === "Closed" ? "Closed with the contract — no further measurement or billing." : `${wo.status}${lastLog ? ` by ${lastLog.by} on ${fmtDate(lastLog.at)}` : ""}.`}{(wo.closedReason || lastLog?.reason) && ` Reason: ${wo.closedReason || lastLog.reason}`}</Note>}
        {wo.wbs && <p className="text-[12.5px] text-ink-soft">WBS <b className="text-ink">{wo.project} › {wo.wbs}</b></p>}
        {wo.acceptance?.status === "Pending" && <Note tone="amber">Waiting for the contractor to accept this work order in the supplier portal. Measurements open once it is accepted.</Note>}
        {wo.acceptance?.status === "Declined" && <Note tone="red">Contractor declined: {wo.acceptance.reason}. Revise and re-issue.</Note>}
        {woAccepted(wo) && <Note tone="green" icon={Icon.check}>Accepted by {wo.acceptance.by} on {fmtDate(wo.acceptance.at)}.</Note>}
        <div className="grid grid-cols-4 gap-3">
          <StatTile tone="blue" label="WO value" value={inrShort(pr.value)} icon={Icon.file} />
          <StatTile tone="purple" label="Planned progress" value={`${pr.planned.toFixed(0)}%`} sub={`${fmtDate(wo.start)} → ${fmtDate(wo.end)}`} icon={Icon.calendar} />
          <StatTile tone={pr.spi >= 0.95 ? "green" : pr.spi >= 0.8 ? "amber" : "red"} label="Measured (physical)" value={`${pr.physical.toFixed(1)}%`} sub={`SPI ${pr.spi.toFixed(2)}`} icon={Icon.ruler} />
          <StatTile tone="cyan" label="Billed (financial)" value={`${pr.financial.toFixed(1)}%`} sub={inrShort(pr.billed)} icon={Icon.receipt} />
        </div>
        <Section title={wo.type === "Lump Sum" ? `Milestones — lump sum ${inr(wo.lumpSum)}` : "Items — WO quantity vs measured vs billed"} icon={Icon.listChecks}>
          <DataTable dense rows={pos} rowKey={(p) => p.line.id} columns={wo.type === "Lump Sum" ? [
            { key: "n", label: "Milestone", render: (p) => p.line.name },
            { key: "w", label: "Weight", align: "right", render: (p) => `${p.line.weight}%` },
            { key: "a", label: "Amount", align: "right", num: true, render: (p) => inr(p.value) },
            { key: "m", label: "Measured", render: (p) => <Progress value={p.measured} color="bg-violet-500" /> },
            { key: "b", label: "Billed", render: (p) => <Progress value={p.billed} /> },
          ] : [
            { key: "c", label: "Code", render: (p) => <span className="mono text-[12px]">{p.line.code}</span> },
            { key: "d", label: "Item", className: "whitespace-normal", render: (p) => p.line.desc },
            { key: "q", label: "WO qty", align: "right", num: true, render: (p) => `${num(p.total)} ${p.unit}` },
            { key: "r", label: "Rate", align: "right", num: true, render: (p) => inr(p.line.rate) },
            { key: "m", label: "Measured", align: "right", num: true, render: (p) => <span className={cls(p.measured > p.total && "font-semibold text-red-600")}>{num(p.measured)}</span> },
            { key: "b", label: "Billed", align: "right", num: true, render: (p) => num(p.billed) },
            { key: "p", label: "Progress", render: (p) => <Progress value={Math.round(pct(p.measured, p.total))} color={p.measured > p.total ? "bg-red-500" : "bg-brand"} /> },
          ]} />
        </Section>
        <Section title="RA bills" icon={Icon.receipt} actions={<RefLink to={`${CL_BASE}/ra-bills?wo=${id}`}>+ Prepare RA bill</RefLink>}>
          <DataTable dense rows={bills} empty={<p className="p-4 text-[13px] text-ink-mute">No bills yet.</p>} columns={[
            { key: "id", label: "Bill", render: (b) => <RefLink to={`${CL_BASE}/ra-bills?open=${b.id}`}>{b.id}</RefLink> }, { key: "seq", label: "RA no.", render: (b) => `RA-${b.seq}` },
            { key: "d", label: "Date", render: (b) => fmtDate(b.date) }, { key: "g", label: "Gross", align: "right", num: true, render: (b) => inr(b.gross) },
            { key: "n", label: "Net payable", align: "right", num: true, render: (b) => inr(b.net) }, { key: "s", label: "Status", render: (b) => <Status>{b.status}</Status> },
          ]} />
        </Section>
      </div>
      {mb && <MeasurementModal preset={mb} onClose={() => setMb(null)} />}
      {wo.status !== "Draft" && <div className="space-y-4 px-6 pb-5"><WoResources wo={wo} /></div>}
      {act && (
        <Modal open onClose={() => setAct(null)} width={480} title={`${{ Suspended: "Suspend", "Short-closed": "Short-close", Cancelled: "Cancel" }[act.status]} ${wo.id}`}
          subtitle={{ Suspended: "Stop-work order: no measurements, claims or bills until resumed", "Short-closed": "Work stops here; measured work is still billed, the rest of the quantity is dropped", Cancelled: "Nothing has been measured or billed on this work order" }[act.status]}
          footer={<><Btn onClick={() => setAct(null)}>Back</Btn><Btn variant="danger" disabled={!act.reason.trim()} onClick={() => mut(act.status, act.reason.trim())}>Confirm</Btn></>}>
          <Field label="Reason (audit logged)" required><TextArea value={act.reason} onChange={(x) => setAct({ ...act, reason: x })} /></Field>
        </Modal>
      )}
    </Drawer>
  );
}

function WorkOrdersPage() {
  const st = useStore();
  const loc = Ht();
  const [open, setOpen] = useQueryOpen();
  const presetContract = new URLSearchParams(loc.search).get("contract");
  const [create, setCreate] = y.useState(!!presetContract);
  const [type, setType] = y.useState("All");
  const rows = st.workOrders.filter((w) => type === "All" || w.type === type);
  return (
    <Page title="Work Orders" subtitle="Lump Sum and Item-Rate work orders issued under contracts" icon={Icon.clipboardList}
      actions={<Btn variant="primary" icon={Icon.plus} onClick={() => setCreate(true)}>Create work order</Btn>}>
      <DataTable noun="work orders" calendar={{ label: "Finish dates", date: (w) => w.end, title: (w) => `${w.id} · ${w.title}` }} filters={<FilterSelect label="Type" value={type} onChange={setType} options={[{ value: "All", label: "All types" }, "Item-Rate", "Lump Sum"]} />} rows={rows} onRow={(w) => setOpen(w.id)} columns={[
        { key: "id", label: "WO", className: "mono text-[12px] text-ink-soft" },
        { key: "title", label: "Title", className: "font-medium" },
        { key: "v", label: "Contractor", filterOptions: FO.contractors, filter: (x) => vendorName(st, x.vendorId), render: (w) => vendorName(st, w.vendorId) },
        { key: "type", label: "Type", opt: true, render: (w) => <span className={cls("rounded px-1.5 py-[1px] text-[11px] font-medium", w.type === "Lump Sum" ? "bg-cyan-50 text-cyan-700" : "bg-violet-50 text-violet-700")}>{w.type}</span> },
        { key: "val", label: "Value", align: "right", num: true, render: (w) => inrShort(woValue(w)) },
        { key: "pl", label: "Planned", opt: true, align: "right", num: true, render: (w) => `${woProgress(st, w).planned.toFixed(0)}%` },
        { key: "ph", label: "Physical", render: (w) => { const p = woProgress(st, w); return <Progress value={Math.round(p.physical)} color={p.spi >= 0.95 ? "bg-green-500" : p.spi >= 0.8 ? "bg-amber-500" : "bg-red-500"} />; } },
        { key: "end", label: "Finish", render: (w) => fmtDate(w.end) },
        { key: "acc", label: "Contractor", opt: true, filterOptions: FO.acceptance, filter: (w) => w.acceptance?.status || "—", filterLabel: "Acceptance", render: (w) => <Status tone={{ Accepted: "green", Pending: "amber", Declined: "red" }[w.acceptance?.status] || "gray"}>{w.acceptance?.status === "Pending" ? "Awaiting acceptance" : w.acceptance?.status || "—"}</Status> },
        { key: "s", label: "Status", filterOptions: FO.woStatus, filter: (w) => w.status, render: (w) => <Status>{w.status}</Status> },
      ]} />
      <WorkOrderModal open={create} contractId={presetContract} onClose={() => setCreate(false)} onCreated={setOpen} />
      {open && <WorkOrderDrawer id={open} onClose={() => setOpen(null)} />}
    </Page>
  );
}

// ---------------------------------------------------------------- measurement book
function MeasurementModal({ preset = {}, onClose }) {
  const st = useStore();
  const [f, setF] = y.useState({ woId: preset.woId || "", lineId: "", date: todayISO(), location: "", nos: 1, l: "", b: "", d: "", direct: "", pct: "", remarks: "" });
  const wo = byId(st.workOrders, f.woId);
  const lines = wo ? (wo.type === "Lump Sum" ? wo.milestones.map((m) => ({ value: m.id, label: `${m.name} (${m.weight}%)` })) : wo.items.map((i) => ({ value: i.id, label: `${i.code} · ${i.desc} (${i.unit})` }))) : [];
  const item = wo && wo.type !== "Lump Sum" && wo.items.find((i) => i.id === f.lineId);
  const dimsUsed = [f.l, f.b, f.d].some((x) => x !== "" && x != null);
  const qty = item ? (dimsUsed ? round2((Number(f.nos) || 1) * (Number(f.l) || 1) * (Number(f.b) || 1) * (Number(f.d) || 1)) : Number(f.direct) || 0) : 0;
  const posLine = wo && f.lineId ? woPosition(st, wo).find((p) => p.line.id === f.lineId) : null;
  const pending = wo ? sum(st.measurements.filter((m) => m.woId === wo.id && m.lineId === f.lineId && m.jms.status === "Pending"), (m) => m.qty) : 0;
  const overQty = item && posLine && posLine.measured + pending + qty > item.qty;
  const lsBad = wo && wo.type === "Lump Sum" && posLine && (Number(f.pct) <= posLine.measured || Number(f.pct) > 100);
  const mDateErr = !f.date ? "Date required" : f.date > todayISO() ? "Measurement date can't be in the future" : wo && f.date < wo.start ? `Before the work order start (${fmtDate(wo.start)})` : "";
  const ok = wo && f.lineId && f.location && !mDateErr && (wo.type === "Lump Sum" ? f.pct !== "" && !lsBad : qty > 0);
  return (
    <Modal open onClose={onClose} width={720} title="Record measurement" subtitle="Entry goes to the Measurement Book and waits for joint (JMS) sign-off"
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={!ok} onClick={() => {
        const id = nextId("MB", st.measurements);
        setState((s) => {
          s.measurements.push({ id, woId: wo.id, lineId: f.lineId, date: f.date, location: f.location, nos: dimsUsed ? Number(f.nos) || 1 : null, l: f.l === "" ? null : Number(f.l), b: f.b === "" ? null : Number(f.b), d: f.d === "" ? null : Number(f.d), qty: wo.type === "Lump Sum" ? 0 : qty, pct: wo.type === "Lump Sum" ? Number(f.pct) : null, recordedBy: currentUser(), jms: { status: "Pending" }, qc: { status: "Pending" }, remarks: f.remarks, billedIn: null });
          const w = byId(s.workOrders, wo.id); if (w.status === "Issued") w.status = "In Progress";
        }, { entity: "Measurement", id, action: `Recorded on ${wo.id} — awaiting JMS` });
        toast(`${id} recorded`); onClose();
      }}>Save to MB</Btn></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Work order" required><Select value={f.woId} placeholder="Select…" onChange={(x) => setF({ ...f, woId: x, lineId: "" })} options={st.workOrders.filter((w) => ["Issued", "In Progress"].includes(w.status) && woAccepted(w)).map((w) => ({ value: w.id, label: `${w.id} — ${w.title}` }))} /></Field>
          <Field label={wo?.type === "Lump Sum" ? "Milestone" : "BOQ item"} required span={2}><Select value={f.lineId} placeholder="Select…" onChange={(x) => setF({ ...f, lineId: x })} options={lines} /></Field>
          <Field label="Date"><DateInput value={f.date} onChange={(x) => setF({ ...f, date: x })} /><FieldErr m={wo && mDateErr} /></Field>
          <Field label="Location / grid / chainage" required span={2}><TextInput value={f.location} onChange={(x) => setF({ ...f, location: x })} placeholder="e.g. Slab L4, grid A1–A6" /></Field>
        </div>
        {wo && wo.type === "Lump Sum" ? (
          <div className="grid grid-cols-3 gap-3">
            <Field label="Cumulative % complete" hint={posLine ? `Last signed: ${posLine.measured}%` : ""}><NumInput value={f.pct} onChange={(x) => setF({ ...f, pct: x })} /></Field>
            {lsBad && <div className="col-span-2 self-end"><Note tone="red">Must be above the last signed {posLine.measured}% and at most 100%.</Note></div>}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-5 gap-3">
              <Field label="Nos"><NumInput value={f.nos} onChange={(x) => setF({ ...f, nos: x })} /></Field>
              <Field label="Length (m)"><NumInput value={f.l} onChange={(x) => setF({ ...f, l: x })} /></Field>
              <Field label="Breadth (m)"><NumInput value={f.b} onChange={(x) => setF({ ...f, b: x })} /></Field>
              <Field label="Depth / height (m)"><NumInput value={f.d} onChange={(x) => setF({ ...f, d: x })} /></Field>
              <Field label="…or direct qty" hint="MT / man-days etc."><NumInput value={f.direct} onChange={(x) => setF({ ...f, direct: x })} disabled={dimsUsed} /></Field>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-[13px]">
              <span>Quantity {dimsUsed && <span className="text-ink-mute">= {f.nos || 1} × {f.l || 1} × {f.b || 1} × {f.d || 1}</span>}</span>
              <b className="num">{num(qty, 3)} {item?.unit || ""}</b>
            </div>
            {item && posLine && <p className="text-[12px] text-ink-mute">WO qty {num(item.qty)} · signed {num(posLine.measured)} · pending JMS {num(pending)} · balance {num(item.qty - posLine.measured - pending)}</p>}
            {overQty && <Note tone="amber">This takes the item above its WO quantity — it will need a change order / deviation approval before billing.</Note>}
          </>
        )}
        <Field label="Remarks"><TextInput value={f.remarks} onChange={(x) => setF({ ...f, remarks: x })} /></Field>
      </div>
    </Modal>
  );
}

function MeasurementBookPage() {
  const st = useStore();
  const [wo, setWo] = y.useState("All"), [jms, setJms] = y.useState("All"), [tab, setTab] = y.useState("mb");
  const [add, setAdd] = y.useState(false), [sign, setSign] = y.useState(null), [sel, setSel] = y.useState([]), [openMb, setOpenMb] = y.useState(null), [ncrFor, setNcrFor] = y.useState(null);
  const lineName = (m) => {
    const w = byId(st.workOrders, m.woId);
    if (w.type === "Lump Sum") { const ms = w.milestones.find((x) => x.id === m.lineId); return ms ? ms.name : m.lineId; }
    const it = w.items.find((x) => x.id === m.lineId); return it ? `${it.code} · ${it.desc}` : m.lineId;
  };
  const unitOf = (m) => { const w = byId(st.workOrders, m.woId); return w.type === "Lump Sum" ? "%" : (w.items.find((x) => x.id === m.lineId) || {}).unit; };
  const rows = st.measurements.filter((m) => (wo === "All" || m.woId === wo) && (jms === "All" || m.jms.status === jms)).slice().sort((a, b) => b.date.localeCompare(a.date));
  const pendingRows = st.measurements.filter((m) => m.jms.status !== "Signed" && !m.voided);
  const signAll = (ids, form) => {
    if (!tryAct("Site Engineer", [], "JMS sign-off")) return;
    setState((s) => ids.forEach((id) => { const m = byId(s.measurements, id); if (form.qty !== undefined && form.qty !== "") m.qty = Number(form.qty); m.jms = { status: "Signed", contractorRep: form.rep, engineer: form.eng, at: new Date().toISOString(), ...(m.jms.contractorAgreed ? { contractorAgreed: m.jms.contractorAgreed } : { paperSigned: true }) }; if (!m.qc) m.qc = { status: "Pending" }; }),
      { entity: "Measurement", id: ids.join(", "), action: `JMS signed (${form.rep} / ${form.eng})` });
    toast(`${ids.length} measurement(s) signed`); setSel([]); setSign(null);
  };
  const woOpts = [{ value: "All", label: "All work orders" }, ...st.workOrders.map((w) => ({ value: w.id, label: `${w.id} — ${w.title}` }))];
  const qtyText = (m) => (m.pct !== null && m.pct !== undefined ? `${m.pct}% cum.` : `${num(m.qty, 3)} ${unitOf(m)}`);
  return (
    <Page title="Measurement Book" subtitle="Site measurements and joint measurement sheets (JMS) — the basis for every RA bill" icon={Icon.ruler}
      actions={<Btn variant="primary" icon={Icon.plus} onClick={() => setAdd(true)}>Record measurement</Btn>}>
      <TabBar active={tab} onChange={setTab} tabs={[{ id: "mb", label: "Measurement book", icon: Icon.book }, { id: "jms", label: "Joint measurement sheets", icon: Icon.users }, { id: "ncr", label: `Inspections & NCRs${(st.ncrs || []).filter((n) => n.status !== "Closed").length ? ` (${(st.ncrs || []).filter((n) => n.status !== "Closed").length})` : ""}`, icon: Icon.shieldCheck }, { id: "abs", label: "Abstract by item", icon: Icon.sheet }]} />
      {tab === "ncr" && <NcrTable rows={(st.ncrs || []).filter((n) => wo === "All" || n.woId === wo)} />}
      {ncrFor && <NcrModal woId={ncrFor.woId} mb={ncrFor} onClose={() => setNcrFor(null)} />}
      {tab === "mb" && <>
        <DataTable noun="measurements" filters={<><FilterSelect label="Work order" value={wo} onChange={setWo} options={woOpts} /><FilterSelect label="JMS" value={jms} onChange={setJms} options={[{ value: "All", label: "All JMS status" }, "Pending", "Signed", "Disputed"]} /></>} rows={rows} onRow={(m) => setOpenMb(m.id)} columns={[
          { key: "id", label: "MB no.", className: "mono text-[12px]" },
          { key: "date", label: "Date", render: (m) => fmtDate(m.date) },
          { key: "wo", label: "WO", className: "mono text-[12px]", render: (m) => m.woId },
          { key: "item", label: "Item / milestone", className: "max-w-[260px] truncate", render: (m) => <span title={lineName(m)}>{lineName(m)}</span> },
          { key: "loc", label: "Location", opt: true, className: "max-w-[200px] truncate", render: (m) => <span title={m.location}>{m.location}</span> },
          { key: "dims", label: "N × L × B × D", opt: true, className: "num text-[12px] text-ink-soft", render: (m) => (m.l || m.b || m.d ? [m.nos || 1, m.l ?? "–", m.b ?? "–", m.d ?? "–"].join(" × ") : "—") },
          { key: "qty", label: "Quantity", align: "right", num: true, render: (m) => <b>{qtyText(m)}</b> },
          { key: "jms", label: "JMS", render: (m) => <span title={m.jms.remark || ""}><Status>{m.jms.status}</Status></span> },
          { key: "qc", label: "Inspection", filterOptions: ["Pending", "Passed", "Failed"], filter: (m) => m.qc?.status || "Pending", render: (m) => (
            <span className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <Status tone={{ Passed: "green", Failed: "red" }[m.qc?.status] || "amber"}>{m.qc?.status === "Failed" ? `Failed · ${m.qc.ncrId}` : m.qc?.status || "Pending"}</Status>
              {(!m.qc || m.qc.status === "Pending") && !m.billedIn && <><button className="text-[11.5px] font-medium text-green-700 hover:underline" onClick={() => inspectMeasurement(m, true)}>Pass</button><button className="text-[11.5px] font-medium text-red-600 hover:underline" onClick={() => setNcrFor(m)}>Fail</button></>}
            </span>) },
          { key: "bill", label: "Billed in", filterOptions: FO.billed, filter: (m) => (m.billedIn ? "Billed" : "Not billed"), filterLabel: "Billing", render: (m) => (m.billedIn ? <RefLink to={`${CL_BASE}/ra-bills?open=${m.billedIn}`}>{m.billedIn}</RefLink> : <span className="text-ink-faint">—</span>) },
        ]} />
      </>}
      {tab === "jms" && <>
        <DataTable noun="pending entries" filters={<span className="text-[12.5px] text-ink-soft">Engineer and contractor representative sign together; disputed entries can be re-measured with a corrected quantity.</span>} actions={<Btn variant="primary" size="sm" icon={Icon.check} disabled={!sel.length} onClick={() => setSign({ ids: sel, rep: "", eng: currentUser() })}>Sign selected ({sel.length})</Btn>} rows={pendingRows} onRow={(m) => setOpenMb(m.id)} empty={<EmptyState icon={Icon.check} title="All measurements are jointly signed" />} columns={[
          { key: "sel", label: "", render: (m) => <input type="checkbox" className="h-4 w-4 accent-[#0b5ed7]" checked={sel.includes(m.id)} onClick={(e) => e.stopPropagation()} onChange={(e) => setSel(e.target.checked ? [...sel, m.id] : sel.filter((x) => x !== m.id))} /> },
          { key: "id", label: "MB no.", className: "mono text-[12px]" }, { key: "wo", label: "WO", render: (m) => `${m.woId} · ${vendorName(st, byId(st.workOrders, m.woId).vendorId)}` },
          { key: "item", label: "Item", className: "max-w-[240px] truncate", render: (m) => lineName(m) }, { key: "loc", label: "Location", className: "max-w-[180px] truncate", render: (m) => m.location },
          { key: "qty", label: "Engineer qty", align: "right", num: true, render: (m) => qtyText(m) },
          { key: "s", label: "Status", filterOptions: FO.jms, filter: (m) => m.jms.status, render: (m) => <span className="flex flex-col"><Status>{m.jms.status}</Status>{m.jms.remark && <span className="mt-0.5 max-w-[220px] whitespace-normal text-[11px] text-red-600">{m.jms.remark}</span>}</span> },
          { key: "a", label: "", align: "right", render: (m) => (
            <span className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
              <Btn size="sm" variant="success" onClick={() => setSign({ ids: [m.id], rep: "", eng: currentUser(), qty: m.jms.status === "Disputed" ? (m.pct ?? m.qty) : undefined, disputed: m.jms.status === "Disputed", isPct: m.pct !== null })}>{m.jms.status === "Disputed" ? "Re-measure & sign" : "Sign"}</Btn>
              {m.jms.status === "Pending" && <Btn size="sm" variant="danger" onClick={() => setSign({ ids: [m.id], dispute: true, remark: "" })}>Dispute</Btn>}
            </span>) },
        ]} />
      </>}
      {tab === "abs" && (
        <div className="space-y-4 p-4">
          {st.workOrders.filter((w) => w.status !== "Draft" && (wo === "All" || w.id === wo)).map((w) => (
            <Section key={w.id} title={`${w.id} · ${w.title}`} icon={Icon.sheet} actions={<span className="text-[12px] text-ink-mute">{vendorName(st, w.vendorId)} · {w.type}</span>}>
              <DataTable dense rows={woPosition(st, w)} rowKey={(p) => p.line.id} columns={[
                { key: "d", label: w.type === "Lump Sum" ? "Milestone" : "Item", className: "whitespace-normal", render: (p) => p.line.name || `${p.line.code} · ${p.line.desc}` },
                { key: "t", label: "WO", align: "right", num: true, render: (p) => `${num(p.total)} ${p.unit}` },
                { key: "m", label: "Signed", align: "right", num: true, render: (p) => num(p.measured) },
                { key: "b", label: "Billed", align: "right", num: true, render: (p) => num(p.billed) },
                { key: "u", label: "Unbilled value", align: "right", num: true, render: (p) => inr(p.measuredValue - p.billedValue) },
              ]} />
            </Section>
          ))}
        </div>
      )}
      {add && <MeasurementModal preset={{ woId: wo !== "All" ? wo : "" }} onClose={() => setAdd(false)} />}
      {openMb && (() => {
        const m = byId(st.measurements, openMb); if (!m) return null;
        const w = byId(st.workOrders, m.woId);
        return (
          <Drawer open onClose={() => setOpenMb(null)} width={720} title={lineName(m)}
            subtitle={<><span className="mono">{m.id}</span><Status>{m.jms.status}</Status><span>{w.title}</span><span>· {vendorName(st, w.vendorId)}</span></>}
            actions={m.jms.status !== "Signed" && <>
              {m.jms.status === "Pending" && <Btn variant="danger" onClick={() => setSign({ ids: [m.id], dispute: true, remark: "" })}>Dispute</Btn>}
              <Btn variant="success" icon={Icon.check} onClick={() => setSign({ ids: [m.id], rep: "", eng: currentUser(), qty: m.jms.status === "Disputed" ? (m.pct ?? m.qty) : undefined, disputed: m.jms.status === "Disputed", isPct: m.pct !== null && m.pct !== undefined })}>Sign JMS</Btn></>}>
            <div className="space-y-4 px-6 py-5">
              {m.jms.status === "Disputed" && <Note tone="red">Disputed: {m.jms.remark}</Note>}
              <Section title="Measurement" icon={Icon.ruler}>
                <KV items={[["Date", fmtDate(m.date)], ["Location", m.location || "—"], ["Quantity", <b>{qtyText(m)}</b>],
                  ["N × L × B × D", m.l || m.b || m.d ? [m.nos || 1, m.l ?? "–", m.b ?? "–", m.d ?? "–"].join(" × ") : "—"], ["Recorded by", m.recordedBy || "—"], ["Remarks", m.remarks || "—"]]} />
              </Section>
              <Section title="Joint measurement (JMS)" icon={Icon.users}>
                <KV items={[["Status", <Status>{m.jms.status}</Status>], ["Contractor representative", m.jms.contractorRep || "—"], ["Site engineer", m.jms.engineer || "—"], ["Signed on", m.jms.at && m.jms.status === "Signed" ? fmtDateTime(m.jms.at) : "—"]]} />
              </Section>
              <Section title="Work order & billing" icon={Icon.receipt}>
                <KV items={[["Work order", <RefLink to={`${CL_BASE}/work-orders?open=${w.id}`}>{w.title}</RefLink>], ["Type", w.type], ["Contractor", vendorName(st, w.vendorId)],
                  ["Billed in", m.billedIn ? <RefLink to={`${CL_BASE}/ra-bills?open=${m.billedIn}`}>RA bill {byId(st.raBills, m.billedIn)?.seq ?? ""}</RefLink> : m.jms.status !== "Signed" ? "Not billable until JMS is signed" : m.qc?.status === "Passed" || !settingsOf(st).qcBeforeBilling ? "Ready to bill" : m.qc?.status === "Failed" ? `Blocked — ${m.qc.ncrId} open` : "Waiting for quality inspection"],
                  ["Inspection", m.qc?.status ? `${m.qc.status}${m.qc.by ? ` · ${m.qc.by}` : ""}` : "Pending"]]} />
              </Section>
            </div>
          </Drawer>
        );
      })()}
      {sign && !sign.dispute && (
        <Modal open onClose={() => setSign(null)} width={500} title={`Joint measurement sign-off — ${sign.ids.length} entr${sign.ids.length > 1 ? "ies" : "y"}`}
          footer={<><Btn onClick={() => setSign(null)}>Cancel</Btn><Btn variant="primary" disabled={!sign.rep || !sign.eng || (!sign.ids.every((i) => byId(st.measurements, i)?.jms.contractorAgreed) && !sign.paper)} onClick={() => {
            if (sign.disputed && sign.isPct) { setState((s) => { const m = byId(s.measurements, sign.ids[0]); m.pct = Number(sign.qty); }); signAll(sign.ids, { rep: sign.rep, eng: sign.eng }); }
            else signAll(sign.ids, sign);
          }}>Sign JMS</Btn></>}>
          <div className="space-y-3">
            {sign.disputed && <Field label={sign.isPct ? "Agreed cumulative %" : "Agreed quantity after re-measurement"}><NumInput value={sign.qty} onChange={(x) => setSign({ ...sign, qty: x })} /></Field>}
            {(() => { const ag = sign.ids.map((i) => byId(st.measurements, i)?.jms.contractorAgreed).filter(Boolean); return ag.length === sign.ids.length
              ? <Note tone="green" icon={Icon.check}>The contractor agreed {sign.ids.length > 1 ? "these entries" : "this entry"} in the supplier portal ({ag[0].by}, {fmtDateTime(ag[0].at)}).</Note>
              : <Note tone="amber">{ag.length ? `${sign.ids.length - ag.length} of ${sign.ids.length} entries` : "This entry"} not yet agreed by the contractor in the portal. Countersign only against a JMS sheet physically signed by their representative.</Note>; })()}
            <Field label="Contractor representative" required><TextInput value={sign.rep} onChange={(x) => setSign({ ...sign, rep: x })} placeholder="Name" /></Field>
            <Field label="Site engineer" required><TextInput value={sign.eng} onChange={(x) => setSign({ ...sign, eng: x })} /></Field>
            {!sign.ids.every((i) => byId(st.measurements, i)?.jms.contractorAgreed) && <Check checked={!!sign.paper} onChange={(b) => setSign({ ...sign, paper: b })} label="Paper JMS signed by the contractor's representative is on file" />}
          </div>
        </Modal>
      )}
      {sign && sign.dispute && (
        <Modal open onClose={() => setSign(null)} width={480} title="Record dispute" footer={<><Btn onClick={() => setSign(null)}>Cancel</Btn><Btn variant="danger" disabled={!sign.remark} onClick={() => {
          setState((s) => (byId(s.measurements, sign.ids[0]).jms = { status: "Disputed", remark: sign.remark, at: new Date().toISOString() }), { entity: "Measurement", id: sign.ids[0], action: `JMS disputed — ${sign.remark}` });
          setSign(null);
        }}>Mark disputed</Btn></>}>
          <Field label="What does the contractor dispute?"><TextArea value={sign.remark} onChange={(x) => setSign({ ...sign, remark: x })} /></Field>
        </Modal>
      )}
    </Page>
  );
}
