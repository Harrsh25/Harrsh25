// Contract create / edit and the contract record: approval routing (Legal → Finance),
// signing gate, contract BOQ, change orders with quantity lines, bank-guarantee
// register, termination and the closure checklist.

function ContractModal({ open, onClose, onCreated, edit }) {
  const st = useStore();
  const blank = () => (edit ? { bgBank: "", ...edit, value: edit.value, scope: (edit.scope || []).map((l) => ({ ...l })) } : { vendorId: "", title: "", value: "", bgBank: "", ...CONTRACT_DEFAULTS(), scope: [] });
  const [f, setF] = y.useState(blank);
  y.useEffect(() => { if (open) setF(blank()); }, [open]);
  const set = (k) => (x) => setF({ ...f, [k]: x });
  const vendors = contractorVendors(st).filter((v) => (v.status === "Active" && v.regTier === "Spend Authorized") || v.id === f.vendorId);
  const v = byId(st.vendors, f.vendorId);
  const blockers = v ? contractorBlockers(st, v) : [];
  const setLine = (i, k, x) => setF({ ...f, scope: f.scope.map((l, j) => (j === i ? { ...l, [k]: x } : l)) });
  const value = f.scope.length ? round2(sum(f.scope, (l) => (Number(l.qty) || 0) * (Number(l.rate) || 0))) : Number(f.value) || 0;
  const scopeOk = f.scope.every((l) => l.desc && Number(l.qty) > 0 && Number(l.rate) > 0);
  const termErr = [
    ["retentionPct", "advancePct", "advanceRecoveryPct", "cessPct", "pbgPct"].some((k) => VX.pct(f[k])) && "percentages must be 0–100",
    Number(f.advancePct) > 0 && !(Number(f.advanceRecoveryPct) > 0) && "set a recovery % when an advance is given",
    VX.num(f.dlpMonths, { min: 0, max: 60, int: true }) && "DLP must be 0–60 whole months",
    Number(f.ldCapPct) < Number(f.ldPctPerWeek) && "LD cap can't be lower than the weekly LD",
    f.bgNo && f.bgExpiry && f.bgExpiry <= f.start && "BG must be valid beyond the contract start",
    f.bgNo && f.bgExpiry && f.bgExpiry < todayISO() && "BG has already expired",
    !edit && f.start && f.start < shiftDays(-90) && "start is more than 90 days in the past",
  ].filter(Boolean);
  const missing = [contractExtrasErr(f), !f.vendorId && "contractor", !f.title.trim() && "title", !(value > 0) && "value", !(f.end > f.start) && "completion after start", !scopeOk && "complete BOQ lines", f.bgNo && !f.bgExpiry && "BG validity date", ...termErr].filter(Boolean);
  const save = (submit) => {
    const id = edit ? edit.id : nextId("CTR", st.contracts);
    const scope = f.scope.map((l, i) => ({ id: l.id || `S${i + 1}`, code: l.code || String(i + 1), desc: l.desc, unit: l.unit || "nos", qty: Number(l.qty), rate: Number(l.rate) }));
    const rec = { ...f, value, scope, advanceAmount: round2((value * (Number(f.advancePct) || 0)) / 100), pbgPct: Number(f.pbgPct) || 0 };
    const gs = (edit?.guarantees || []).slice();
    if (f.bgNo && !gs.some((g) => g.number === f.bgNo)) gs.push({ id: `BG-${gs.length + 1}`, type: "Performance", bank: f.bgBank || "", number: f.bgNo, amount: round2((value * (Number(f.pbgPct) || 0)) / 100), expiry: f.bgExpiry, status: "Active", receivedOn: todayISO() });
    setState((s) => {
      if (edit) Object.assign(byId(s.contracts, id), rec, { guarantees: gs, status: "Draft" });
      else s.contracts.unshift({ ...rec, id, status: "Draft", changeOrders: [], guarantees: gs, createdBy: currentUser() });
    }, { entity: "Contract", id, action: edit ? "Draft updated" : `Drafted for ${vendorName(st, f.vendorId)}` });
    onClose(); onCreated && onCreated(id);
    if (submit) submitContract(byId(getState().contracts, id)); else toast(`${id} saved as draft`);
  };
  return (
    <Modal open={open} onClose={onClose} width={900} title={edit ? `Edit ${edit.id}` : "Create contract"} subtitle="Saved as a draft; submitting routes it Legal → Finance. It can be signed only after approval."
      footer={<><span className="mr-auto text-[12.5px] text-ink-mute">{missing.length ? `Needed: ${missing.join(", ")}` : `Contract value ${inr(value)}`}</span><Btn onClick={onClose}>Cancel</Btn>
        <Btn disabled={missing.length > 0} onClick={() => save(false)}>Save draft</Btn><Btn variant="primary" icon={Icon.send} disabled={missing.length > 0 || blockers.length > 0} onClick={() => save(true)}>Submit for approval</Btn></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Contractor" required hint="Approved, spend-authorized contractors"><Select value={f.vendorId} placeholder="Select…" disabled={!!edit?.rfqId} onChange={set("vendorId")} options={vendors.map((x) => ({ value: x.id, label: x.name }))} /></Field>
          <Field label="Project"><Select value={f.project} onChange={set("project")} options={PROJECTS} /></Field>
          <Field label="Contract type"><Select value={f.type} onChange={set("type")} options={["Item-Rate", "Lump Sum", "Rate Contract"]} /></Field>
          <Field label="Contract title / scope" required span={2}><TextInput value={f.title} onChange={set("title")} placeholder="e.g. Civil & structural works — Tower C" /></Field>
          <Field label="Contract value (₹, excl. GST)" required hint={f.scope.length ? "Sum of the BOQ lines below" : ""}>{f.scope.length ? <span className="flex h-[32px] items-center font-semibold num">{inr(value)}</span> : <NumInput value={f.value} onChange={set("value")} />}</Field>
          <Field label="Start date"><DateInput value={f.start} onChange={set("start")} /></Field>
          <Field label="Completion date"><DateInput value={f.end} onChange={set("end")} /></Field>
          <Field label="Contract owner"><TextInput value={f.owner} onChange={set("owner")} /></Field>
        </div>
        {v && blockers.length > 0 && <Note tone="red">{v.name} can't be contracted right now: {blockers.join(" · ")}.</Note>}
        {v && v.qualification && qualStatus(v).limit > 0 && value > qualStatus(v).limit && <Note tone="amber" icon={Icon.alert}>Contract value {inrShort(value)} is above {v.name}'s qualification limit of {inrShort(qualStatus(v).limit)} ({qualStatus(v).status}) — work orders beyond the limit will show a warning.</Note>}
        {f.rfqId && <Note>Created from the award of <b>{f.rfqId}</b>{f.awardNote ? ` — ${f.awardNote}` : ""}. Lines and rates come from the winning quotation.</Note>}
        <ContractExtras f={f} setF={setF} />
        <Section title={`Contract BOQ${f.scope.length ? ` — ${f.scope.length} line(s)` : " (optional)"}`} actions={<Btn size="sm" icon={Icon.plus} onClick={() => setF({ ...f, scope: [...f.scope, { code: String(f.scope.length + 1), desc: "", unit: "cum", qty: "", rate: "" }] })}>Add BOQ line</Btn>}>
          {f.scope.length === 0 ? <p className="p-3 text-[12.5px] text-ink-mute">Without BOQ lines the contract value is entered directly. With lines, work orders pick from this BOQ and the contract tracks ordered / measured / billed per line.</p> : (
            <div className="space-y-2 p-3">
              <div className="grid grid-cols-[60px_1fr_80px_100px_110px_110px_28px] gap-2 text-[11.5px] font-medium text-ink-mute"><span>Code</span><span>Description</span><span>Unit</span><span>Qty</span><span>Rate (₹)</span><span className="text-right">Amount</span><span /></div>
              {f.scope.map((l, i) => (
                <div key={i} className="grid grid-cols-[60px_1fr_80px_100px_110px_110px_28px] items-center gap-2">
                  <TextInput value={l.code} onChange={(x) => setLine(i, "code", x)} />
                  <TextInput value={l.desc} onChange={(x) => setLine(i, "desc", x)} placeholder="Item description" />
                  <TextInput value={l.unit} onChange={(x) => setLine(i, "unit", x)} />
                  <NumInput value={l.qty} onChange={(x) => setLine(i, "qty", x)} />
                  <NumInput value={l.rate} onChange={(x) => setLine(i, "rate", x)} />
                  <span className="num text-right text-[13px]">{inr((Number(l.qty) || 0) * (Number(l.rate) || 0))}</span>
                  <IconBtn icon={Icon.trash} title="Remove line" onClick={() => setF({ ...f, scope: f.scope.filter((_, j) => j !== i) })} />
                </div>
              ))}
            </div>
          )}
        </Section>
        <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-mute">Payment & security terms</p>
        <div className="grid grid-cols-4 gap-3">
          <Field label="Retention (%)"><NumInput value={f.retentionPct} onChange={set("retentionPct")} /></Field>
          <Field label="Mobilisation advance (%)" hint={value ? inrShort((value * (f.advancePct || 0)) / 100) : ""}><NumInput value={f.advancePct} onChange={set("advancePct")} /></Field>
          <Field label="Advance recovery per bill (%)"><NumInput value={f.advanceRecoveryPct} onChange={set("advanceRecoveryPct")} /></Field>
          <Field label="Labour welfare cess (%)"><NumInput value={f.cessPct} onChange={set("cessPct")} /></Field>
          <Field label="GST (%)"><Select value={String(f.gstPct)} onChange={(x) => setF({ ...f, gstPct: Number(x) })} options={["18", "12", "5", "0"]} /></Field>
          <Field label="Defect liability (months)"><NumInput value={f.dlpMonths} onChange={set("dlpMonths")} /></Field>
          <Field label="LD per week (%)"><NumInput value={f.ldPctPerWeek} onChange={set("ldPctPerWeek")} /></Field>
          <Field label="LD cap (%)"><NumInput value={f.ldCapPct} onChange={set("ldCapPct")} /></Field>
          <Field label="Performance BG required (%)" hint={value && f.pbgPct ? inrShort((value * f.pbgPct) / 100) + " before signing" : "0 = not required"}><NumInput value={f.pbgPct} onChange={set("pbgPct")} /></Field>
          <Field label="Performance BG no."><TextInput value={f.bgNo} onChange={set("bgNo")} placeholder="Can be added later" /></Field>
          <Field label="Issuing bank"><TextInput value={f.bgBank} onChange={set("bgBank")} /></Field>
          <Field label="BG valid till" required={!!f.bgNo}><DateInput value={f.bgExpiry} onChange={set("bgExpiry")} /></Field>
        </div>
      </div>
    </Modal>
  );
}

function ChangeOrderModal({ c, preset, onClose }) {
  const st = useStore();
  const wos = st.workOrders.filter((w) => w.contractId === c.id && w.type !== "Lump Sum" && ["Issued", "In Progress", "Suspended"].includes(w.status));
  const [co, setCo] = y.useState(() => ({ desc: "", amount: "", days: 0, reason: "", lines: [], ...preset }));
  const setL = (i, k, x) => setCo({ ...co, lines: co.lines.map((l, j) => { if (j !== i) return l; const n = { ...l, [k]: x }; if (k === "lineId" || k === "woId") { const w = byId(st.workOrders, n.woId), it = w && w.items.find((q) => q.id === n.lineId); if (it) Object.assign(n, { desc: it.desc, unit: it.unit, rate: it.rate, code: it.code }); else if (k === "lineId") Object.assign(n, { desc: "", rate: "" }); } return n; }) });
  const amount = co.lines.length ? round2(sum(co.lines, (l) => (Number(l.qty) || 0) * (Number(l.rate) || 0))) : Number(co.amount) || 0;
  const linesOk = co.lines.every((l) => l.woId && l.desc && Number(l.qty) > 0 && Number(l.rate) > 0);
  const negErr = contractValue(c) + amount < 0 ? `Would make the contract value negative (current ${inr(contractValue(c))})` : "";
  const daysErr = VX.num(co.days === "" ? 0 : co.days, { min: 0, max: 730, int: true, label: "Extension" }) ? "Extension must be 0–730 whole days" : "";
  const ok = co.desc.trim() && co.reason.trim().length >= 5 && linesOk && !negErr && !daysErr && (co.lines.length ? amount > 0 : (co.amount !== "" && Number(co.amount) !== 0) || Number(co.days) > 0);
  return (
    <Modal open onClose={onClose} width={860} title={preset?.days ? "Extension of time (change order)" : "Raise change order"} subtitle="Goes for approval (contract drawer or Approval Management). Quantity lines raise the work-order quantity on approval."
      footer={<><span className="mr-auto text-[13px]">Value <b className="num">{inr(amount)}</b>{Number(co.days) ? ` · +${co.days} days` : ""}</span><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={!ok} onClick={() => {
        const coId = `CO-${String(c.changeOrders.length + 1).padStart(3, "0")}`;
        setState((s) => byId(s.contracts, c.id).changeOrders.push({ id: coId, desc: co.desc.trim(), reason: co.reason.trim(), amount, days: Number(co.days) || 0, status: "Pending", raisedOn: todayISO(), raisedBy: currentUser(),
          lines: co.lines.map((l) => ({ woId: l.woId, lineId: l.lineId || null, code: l.code || "", desc: l.desc, unit: l.unit || "nos", qty: Number(l.qty), rate: Number(l.rate) })) }), { entity: "Contract", id: c.id, action: `${coId} raised — ${inr(amount)}${co.days ? `, +${co.days} days` : ""}` });
        toast(`${coId} sent for approval`); onClose();
      }}>Submit for approval</Btn></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-3">
          <Field label="Change description" required span={2}><TextInput value={co.desc} onChange={(x) => setCo({ ...co, desc: x })} /></Field>
          <Field label="Value (₹, can be negative)" hint={co.lines.length ? "From the lines below" : ""}>{co.lines.length ? <span className="flex h-[32px] items-center font-semibold num">{inr(amount)}</span> : <NumInput value={co.amount} onChange={(x) => setCo({ ...co, amount: x })} />}</Field>
          <Field label="Time extension (days)"><NumInput value={co.days} onChange={(x) => setCo({ ...co, days: x })} /></Field>
          {(negErr || daysErr) && <div className="col-span-4"><Note tone="red">{negErr || daysErr}</Note></div>}
          <Field label="Reason / instruction ref." required span={4}><TextInput value={co.reason} onChange={(x) => setCo({ ...co, reason: x })} placeholder="e.g. Client revision R3; consultant instruction SCI-044" /></Field>
        </div>
        <Section title="Quantity lines (optional)" actions={wos.length > 0 && <Btn size="sm" icon={Icon.plus} onClick={() => setCo({ ...co, lines: [...co.lines, { woId: wos[0].id, lineId: "", desc: "", unit: "cum", qty: "", rate: "" }] })}>Add quantity line</Btn>}>
          {co.lines.length === 0 ? <p className="p-3 text-[12.5px] text-ink-mute">{wos.length ? "Add lines when the change adds quantity to a work order (extra quantity on an existing item, or a new item). On approval the work order is updated so the extra work can be measured and billed." : "No open item-rate work orders on this contract."}</p> : (
            <div className="space-y-2 p-3">
              <div className="grid grid-cols-[150px_1fr_1fr_70px_90px_100px_28px] gap-2 text-[11.5px] font-medium text-ink-mute"><span>Work order</span><span>Item</span><span>Description</span><span>Unit</span><span>Extra qty</span><span>Rate</span><span /></div>
              {co.lines.map((l, i) => { const w = byId(st.workOrders, l.woId); return (
                <div key={i} className="grid grid-cols-[150px_1fr_1fr_70px_90px_100px_28px] items-center gap-2">
                  <Select value={l.woId} onChange={(x) => setL(i, "woId", x)} options={wos.map((x) => ({ value: x.id, label: x.id }))} />
                  <Select value={l.lineId || ""} onChange={(x) => setL(i, "lineId", x)} options={[{ value: "", label: "New item" }, ...(w ? w.items.map((it) => ({ value: it.id, label: `${it.code} · ${it.desc}` })) : [])]} />
                  <TextInput value={l.desc} onChange={(x) => setL(i, "desc", x)} disabled={!!l.lineId} placeholder="New item description" />
                  <TextInput value={l.unit} onChange={(x) => setL(i, "unit", x)} disabled={!!l.lineId} />
                  <NumInput value={l.qty} onChange={(x) => setL(i, "qty", x)} />
                  <NumInput value={l.rate} onChange={(x) => setL(i, "rate", x)} disabled={!!l.lineId} />
                  <IconBtn icon={Icon.trash} title="Remove line" onClick={() => setCo({ ...co, lines: co.lines.filter((_, j) => j !== i) })} />
                </div>); })}
            </div>
          )}
        </Section>
      </div>
    </Modal>
  );
}

function GuaranteeModal({ c, g, mode, onClose }) {
  const [f, setF] = y.useState(() => (mode === "add" ? { type: "Performance", bank: "", number: "", amount: "", expiry: shiftDays(365), note: "" } : { expiry: shiftDays(180, g.expiry), note: "" }));
  const title = { add: "Add bank guarantee", extend: `Extend ${g?.number}`, return: `Return ${g?.number}`, encash: `Encash ${g?.number}` }[mode];
  const ok = mode === "add" ? f.bank && f.number && Number(f.amount) > 0 && f.expiry : mode === "extend" ? f.expiry > g.expiry : f.note.trim();
  const save = () => {
    if (mode === "encash" && !tryAct("Finance Controller", [], "encashing a guarantee")) return;
    setState((s) => {
      const x = byId(s.contracts, c.id); x.guarantees = x.guarantees || [];
      if (mode === "add") x.guarantees.push({ id: `BG-${x.guarantees.length + 1}`, type: f.type, bank: f.bank, number: f.number, amount: Number(f.amount), expiry: f.expiry, status: "Active", receivedOn: todayISO(), history: [] });
      else {
        const y2 = x.guarantees.find((q) => q.id === g.id); y2.history = [...(y2.history || []), { at: new Date().toISOString(), by: currentUser(), what: mode, note: f.note, from: y2.expiry }];
        if (mode === "extend") y2.expiry = f.expiry;
        if (mode === "return") { y2.status = "Returned"; y2.returnedOn = todayISO(); }
        if (mode === "encash") { y2.status = "Encashed"; y2.encashedOn = todayISO(); }
      }
    }, { entity: "Contract", id: c.id, action: mode === "add" ? `${f.type} BG ${f.number} (${inr(f.amount)}) recorded` : `BG ${g.number} ${mode === "extend" ? `extended to ${fmtDate(f.expiry)}` : mode === "return" ? "returned to contractor" : "encashed"}${f.note ? ` — ${f.note}` : ""}` });
    toast(mode === "add" ? "Guarantee recorded" : `Guarantee ${mode === "extend" ? "extended" : mode === "return" ? "returned" : "encashed"}`); onClose();
  };
  return (
    <Modal open onClose={onClose} width={560} title={title} footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant={mode === "encash" ? "danger" : "primary"} disabled={!ok} onClick={save}>{mode === "add" ? "Save" : mode === "extend" ? "Extend" : mode === "return" ? "Return" : "Encash"}</Btn></>}>
      {mode === "add" ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Guarantee type"><Select value={f.type} onChange={(x) => setF({ ...f, type: x })} options={["Performance", "Advance", "Retention"]} /></Field>
          <Field label="Issuing bank" required><TextInput value={f.bank} onChange={(x) => setF({ ...f, bank: x })} /></Field>
          <Field label="BG number" required><TextInput value={f.number} onChange={(x) => setF({ ...f, number: x })} /></Field>
          <Field label="Amount (₹)" required><NumInput value={f.amount} onChange={(x) => setF({ ...f, amount: x })} /></Field>
          <Field label="Valid till" required><DateInput value={f.expiry} onChange={(x) => setF({ ...f, expiry: x })} /></Field>
        </div>
      ) : (
        <div className="space-y-3">
          {mode === "extend" && <Field label="New validity date" hint={`Currently ${fmtDate(g.expiry)}`}><DateInput value={f.expiry} onChange={(x) => setF({ ...f, expiry: x })} /></Field>}
          <Field label={mode === "encash" ? "Reason (default / non-performance)" : "Note"} required={mode !== "extend"}><TextInput value={f.note} onChange={(x) => setF({ ...f, note: x })} placeholder={mode === "return" ? "e.g. DLP completed, no defects" : ""} /></Field>
        </div>
      )}
    </Modal>
  );
}

function ContractDrawer({ id, onClose }) {
  const st = useStore();
  const c = byId(st.contracts, id);
  const [co, setCo] = y.useState(null), [edit, setEdit] = y.useState(false), [term, setTerm] = y.useState(null), [bg, setBg] = y.useState(null), [remark, setRemark] = y.useState("");
  if (!c) return null;
  const v = byId(st.vendors, c.vendorId), status = contractStatus(c), led = contractLedger(st, c);
  const wos = st.workOrders.filter((w) => w.contractId === id);
  const woTotal = sum(wos.filter((w) => w.status !== "Cancelled"), woValue), cv = contractValue(c);
  const live = !["Draft", "Pending Approval", "Approved", "Rejected", "Closed", "Terminated"].includes(c.status);
  const pendingStage = c.approval?.stages.find((x) => x.status === "Pending");
  const checklist = live || c.status === "Terminated" ? closureChecklist(st, c) : [];
  const boq = contractBoq(st, c);
  return (
    <Drawer open stages={{ steps: STAGES.contract, current: contractStage(c) }} related={relatedFor(st, "contract", c)} comments={c.id} onClose={onClose} width={960} title={c.title} subtitle={<><span className="mono">{c.id}</span><Status tone={status === "Expiring" ? "amber" : undefined}>{status}</Status><span>{v.name}</span><span>· {c.project}</span><span>· {c.type}</span>{c.rfqId && <span>· from {c.rfqId}</span>}</>}
      actions={<>
        {["Draft", "Rejected"].includes(c.status) && <><Btn icon={Icon.pencil} onClick={() => setEdit(true)}>Edit</Btn><Btn variant="primary" icon={Icon.send} onClick={() => submitContract(c)}>Submit for approval</Btn></>}
        {c.status === "Approved" && <Btn variant="primary" icon={Icon.check} onClick={() => activateContract(c)}>Sign & activate</Btn>}
        {live && <Btn icon={Icon.calendar} onClick={() => setCo({ days: 30, desc: "Extension of time", reason: "" })}>Extend (EOT)</Btn>}
        {live && <Btn variant="danger" onClick={() => setTerm({ reason: "" })}>Terminate</Btn>}
        {(live || c.status === "Terminated") && <Btn variant="success" disabled={checklist.some((i) => !i.ok)} title={checklist.some((i) => !i.ok) ? "Complete the closure checklist first" : ""} onClick={() => closeContract(c)}>Close contract</Btn>}
      </>}>
      <div className="space-y-4 px-6 py-5">
        {c.status === "Rejected" && <Note tone="red">Rejected by {c.approval?.stages.find((x) => x.status === "Rejected")?.by}: {c.approval?.stages.find((x) => x.status === "Rejected")?.remark}. Edit and resubmit.</Note>}
        {c.status === "Terminated" && <Note tone="red">Terminated on {fmtDate(c.terminated.at)} by {c.terminated.by} — {c.terminated.reason}. Settle the final account, then close.</Note>}
        {c.status === "Approved" && (signBlockers(st, c).length ? <Note tone="amber">Approved — before signing: {signBlockers(st, c).join(" · ")}.</Note> : <Note tone="green" icon={Icon.check}>Approved by Legal and Finance — ready to sign. Work orders can be issued once it is active.</Note>)}
        {status === "Expiring" && <Note tone="amber" icon={Icon.calendarClock}>Completion date {fmtDate(c.end)} is in <b>{daysUntil(c.end)} days</b>. Raise an extension of time or plan close-out.</Note>}
        {liveGuarantees(c).filter((g) => bgStatus(g) === "Expiring").map((g) => <Note key={g.id} tone="red">{g.type} guarantee {g.number} expires {fmtDate(g.expiry)} — ask the contractor to extend it.</Note>)}
        {c.approval && (
          <Section title="Approval routing" icon={Icon.clipboardCheck}>
            <div className="p-5"><Stepper steps={[{ label: "Submitted", status: "done", meta: c.submittedBy ? `${c.submittedBy} · ${fmtDateTime(c.submittedAt)}` : "" }, ...c.approval.stages.map((x) => ({ label: x.role, status: x.status === "Approved" ? "done" : x.status === "Rejected" ? "rejected" : x.status === "Pending" ? "current" : "todo", meta: x.by ? `${x.by} · ${fmtDateTime(x.at)}${x.remark ? ` — ${x.remark}` : ""}` : x.status === "Pending" ? "Awaiting decision" : "" })), { label: "Signed", status: c.signedOn ? "done" : "todo", meta: c.signedOn ? `${c.signedBy || ""} · ${fmtDate(c.signedOn)}` : "" }]} /></div>
            {c.status === "Pending Approval" && pendingStage && (
              <div className="space-y-3 border-t border-line p-4">
                <ActNote roles={pendingStage.role} involved={contractInvolved(c)} what={`the ${pendingStage.role} contract approval`} />
                {c.awardNote && <Note>Award recommendation: {c.awardNote}</Note>}
                <div className="grid grid-cols-[1fr_auto_auto] items-end gap-2">
                  <Field label={`${pendingStage.role} remark`}><TextInput value={remark} onChange={setRemark} placeholder="Required to reject" /></Field>
                  <Btn variant="danger" disabled={!remark.trim()} onClick={() => decideContract(c, false, remark.trim()) && setRemark("")}>Reject</Btn>
                  <Btn variant="success" icon={Icon.check} onClick={() => decideContract(c, true, remark.trim()) && setRemark("")}>Approve as {pendingStage.role}</Btn>
                </div>
              </div>
            )}
          </Section>
        )}
        <div className="grid grid-cols-4 gap-3">
          <StatTile tone="blue" label="Contract value" value={inrShort(cv)} sub={cv !== c.value ? `+${inrShort(cv - c.value)} CO` : "original"} icon={Icon.file} />
          <StatTile tone="purple" label="Work ordered" value={inrShort(woTotal)} sub={`${pct(woTotal, cv)}%`} icon={Icon.clipboardList} />
          <StatTile tone="green" label="Billed (gross)" value={inrShort(led.gross)} sub={`${pct(led.gross, cv)}%`} icon={Icon.receipt} />
          <StatTile tone="amber" label="Retention held" value={inrShort(led.retentionBalance)} sub={`adv. ${inrShort(led.advanceBalance)}`} icon={Icon.lock} />
        </div>
        <ContractExtrasView c={c} />
        <Section title="Terms" icon={Icon.scale}>
          <KV cols={4} items={[
            ["Start", fmtDate(c.start)], ["Completion", fmtDate(c.end)], ["Signed on", fmtDate(c.signedOn)], ["Owner", c.owner],
            ["Retention", `${c.retentionPct}%`], ["Mobilisation advance", `${c.advancePct || 0}% · ${inrShort(c.advanceAmount)}`], ["Advance recovery", `${c.advanceRecoveryPct || 0}% per bill`], ["Labour cess", `${c.cessPct}%`],
            ["GST", `${c.gstPct}%`], ["DLP", `${c.dlpMonths} months${c.handover ? ` from handover ${fmtDate(c.handover.date)}` : ""}`], ["LD", c.ldPctPerWeek ? `${c.ldPctPerWeek}%/week, cap ${c.ldCapPct}%` : "—"], ["Performance BG", c.pbgPct ? `${c.pbgPct}% required` : "Not required"],
          ]} />
        </Section>
        {boq.length > 0 && (
          <Section title="Contract BOQ — ordered, measured and billed" icon={Icon.sheet}>
            <DataTable dense rows={boq} columns={[
              { key: "code", label: "Code", className: "mono text-[12px]" }, { key: "desc", label: "Item", className: "whitespace-normal" },
              { key: "q", label: "BOQ qty", align: "right", num: true, render: (l) => `${num(l.qty)} ${l.unit}` }, { key: "r", label: "Rate", align: "right", num: true, render: (l) => inr(l.rate) },
              { key: "o", label: "Ordered", align: "right", num: true, render: (l) => num(l.ordered) }, { key: "m", label: "Measured", align: "right", num: true, render: (l) => num(l.measured) },
              { key: "b", label: "Billed", align: "right", num: true, render: (l) => num(l.billed) }, { key: "bal", label: "Not yet ordered", align: "right", num: true, render: (l) => <span className={cls(l.balance < 0 && "text-red-600")}>{num(l.balance)}</span> },
            ]} />
          </Section>
        )}
        <Section title="Work orders" icon={Icon.clipboardList} actions={live ? <RefLink to={`${CL_BASE}/work-orders?contract=${id}`}>+ New work order</RefLink> : <span className="text-[12px] text-ink-mute">{c.status === "Closed" ? "Closed" : "Available once the contract is signed"}</span>}>
          <DataTable dense rows={wos} empty={<p className="p-4 text-[13px] text-ink-mute">No work orders yet.</p>} columns={[
            { key: "id", label: "WO", render: (w) => <RefLink to={`${CL_BASE}/work-orders?open=${w.id}`}>{w.id}</RefLink> },
            { key: "title", label: "Title" }, { key: "wbs", label: "WBS", className: "text-[12px] text-ink-soft", render: (w) => w.wbs || "—" }, { key: "type", label: "Type" },
            { key: "v", label: "Value", align: "right", num: true, render: (w) => inrShort(woValue(w)) },
            { key: "p", label: "Progress", render: (w) => <Progress value={Math.round(woProgress(st, w).physical)} /> },
            { key: "s", label: "Status", render: (w) => <Status>{w.status}</Status> },
          ]} />
        </Section>
        <Section title="Change orders" icon={Icon.branch} actions={live && <Btn size="sm" icon={Icon.plus} onClick={() => setCo({})}>Raise change order</Btn>}>
          <DataTable dense rows={c.changeOrders} empty={<p className="p-4 text-[13px] text-ink-mute">No change orders.</p>} columns={[
            { key: "id", label: "CO", className: "mono text-[12px]" }, { key: "desc", label: "Change", className: "whitespace-normal", render: (o) => <span>{o.desc}{(o.lines || []).length > 0 && <span className="block text-[11px] text-ink-mute">{o.lines.map((l) => `${l.woId}: +${num(l.qty)} ${l.unit} ${l.desc}`).join(" · ")}</span>}</span> },
            { key: "reason", label: "Reason", className: "whitespace-normal text-[12px] text-ink-soft" },
            { key: "amount", label: "Value", align: "right", num: true, render: (o) => inrShort(o.amount) }, { key: "days", label: "Time", align: "right", render: (o) => (o.days ? `+${o.days} d` : "—") },
            { key: "by", label: "Raised / decided", className: "text-[12px] text-ink-soft", render: (o) => [o.raisedBy, o.decidedBy].filter(Boolean).join(" → ") || "—" },
            { key: "s", label: "Status", render: (o) => <Status>{o.status}</Status> },
            { key: "a", label: "", align: "right", render: (o) => o.status === "Pending" && <span className="flex justify-end gap-1">
              <Btn size="sm" variant="success" onClick={() => decideChangeOrder(c.id, o.id, true)}>Approve</Btn>
              <Btn size="sm" variant="danger" onClick={() => decideChangeOrder(c.id, o.id, false)}>Reject</Btn></span> },
          ]} />
        </Section>
        <Section title="Bank guarantees" icon={Icon.shieldCheck} actions={!["Closed"].includes(c.status) && <Btn size="sm" icon={Icon.plus} onClick={() => setBg({ mode: "add" })}>Add guarantee</Btn>}>
          <DataTable dense rows={c.guarantees || []} empty={<p className="p-4 text-[13px] text-ink-mute">No guarantees on file.{c.pbgPct ? ` A ${c.pbgPct}% performance guarantee is required before signing.` : ""}</p>} columns={[
            { key: "type", label: "Type" }, { key: "number", label: "BG no.", className: "mono text-[12px]" }, { key: "bank", label: "Bank" },
            { key: "amount", label: "Amount", align: "right", num: true, render: (g) => inrShort(g.amount) }, { key: "e", label: "Valid till", render: (g) => <ExpiryCell iso={["Returned", "Encashed"].includes(g.status) ? null : g.expiry} /> },
            { key: "s", label: "Status", render: (g) => <Status tone={{ Active: "green", Expiring: "amber", Expired: "red", Returned: "gray", Encashed: "red" }[bgStatus(g)]}>{bgStatus(g)}</Status> },
            { key: "a", label: "", align: "right", render: (g) => ["Active", "Expiring", "Expired"].includes(bgStatus(g)) && <span className="flex justify-end gap-1">
              <Btn size="sm" onClick={() => setBg({ mode: "extend", g })}>Extend</Btn><Btn size="sm" onClick={() => setBg({ mode: "return", g })}>Return</Btn><Btn size="sm" variant="danger" onClick={() => setBg({ mode: "encash", g })}>Encash</Btn></span> },
          ]} />
        </Section>
        {checklist.length > 0 && (
          <Section title="Closure checklist" icon={Icon.listChecks} actions={<span className="text-[12px] text-ink-mute">{checklist.filter((i) => i.ok).length}/{checklist.length} done{c.status !== "Terminated" ? " · punch list, handover and final bill in Close-out & Handover" : ""}</span>}>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5 p-4">
              {checklist.map((i) => <li key={i.label} className="flex items-center gap-2 text-[12.5px]">{h(i.ok ? Icon.check : Icon.warning, { size: 14, className: i.ok ? "text-green-600" : "text-amber-500" })}<span className={cls(!i.ok && "text-ink")}>{i.label}</span></li>)}
            </ul>
          </Section>
        )}
      </div>
      {co && <ChangeOrderModal c={c} preset={co} onClose={() => setCo(null)} />}
      {edit && <ContractModal open edit={c} onClose={() => setEdit(false)} />}
      {bg && <GuaranteeModal c={c} g={bg.g} mode={bg.mode} onClose={() => setBg(null)} />}
      {term && (
        <Modal open onClose={() => setTerm(null)} width={500} title={`Terminate ${c.id}?`} subtitle="Open work orders are short-closed; billed work, retention and guarantees stay for the final account."
          footer={<><Btn onClick={() => setTerm(null)}>Cancel</Btn><Btn variant="danger" disabled={!term.reason.trim()} onClick={() => { if (terminateContract(c, term.reason.trim())) setTerm(null); }}>Terminate contract</Btn></>}>
          <Field label="Reason (audit logged)" required><TextArea value={term.reason} onChange={(x) => setTerm({ reason: x })} placeholder="e.g. Repeated delay notices; LD cap reached" /></Field>
        </Modal>
      )}
    </Drawer>
  );
}
