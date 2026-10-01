// Contract close-out (punch list → final inspection → handover certificate → final
// bill → DLP → retention release → closure) and vendor invoice submission from the
// supplier portal with AP review.

const CLOSEOUT_ROLES = ["Project Manager", "Site Engineer"];
const closeoutContracts = (st) => st.contracts.filter((c) => ["Active", "Terminated", "Closed"].includes(c.status));
const woDone = (w) => ["Completed", "Short-closed", "Cancelled", "Closed"].includes(w.status);

function closeoutStage(st, c) {
  if (c.status === "Closed") return "Closed";
  const wos = st.workOrders.filter((w) => w.contractId === c.id);
  const openPunch = (st.punchItems || []).filter((p) => p.contractId === c.id && p.status !== "Closed").length;
  const insp = (st.inspections || []).filter((i) => i.contractId === c.id).slice(-1)[0];
  const finalBill = st.raBills.find((b) => b.contractId === c.id && b.final && b.status !== "Rejected");
  if (c.status === "Terminated") {
    if (c.settlement?.status !== "Agreed") return "Final settlement";
    if (!c.blacklistDecision) return "Blacklist decision";
    return closureChecklist(st, c).every((i) => i.ok) ? "Ready to close" : "Retention & guarantees";
  }
  if (!wos.length || !wos.every(woDone)) return "Execution";
  if (openPunch) return "Punch list";
  if (!c.handover) return insp?.result === "Passed" ? "Handover" : "Final inspection";
  if (!finalBill) return "Final bill";
  if (finalBill.status !== "Paid") return "Final payment";
  if (c.settlement?.status !== "Agreed") return "Final settlement";
  if (daysUntil(shiftDays((c.dlpMonths || 0) * 30, c.handover.date)) >= 0) return "Defect liability";
  if (!releaseBlockers(st, c).every((i) => i.ok)) return "Retention & guarantees";
  return c.release ? "Ready to close" : "Contractor release";
}
const CLOSEOUT_STAGES = ["Execution", "Punch list", "Final inspection", "Handover", "Final bill", "Final payment", "Final settlement", "Defect liability", "Retention & guarantees", "Contractor release", "Blacklist decision", "Ready to close", "Closed"];

// ---------------------------------------------------------------- punch list
function addPunch(c, f) {
  if (!tryAct(CLOSEOUT_ROLES, [], "raising punch-list items")) return false;
  setState((s) => { s.punchItems = s.punchItems || []; s.punchItems.unshift({ id: nextId("PL", s.punchItems), contractId: c.id, woId: f.woId || null, desc: f.desc.trim(), location: f.location.trim(), severity: f.severity, due: f.due, status: "Open", raisedBy: currentUser(), raisedOn: todayISO(), history: [{ at: new Date().toISOString(), by: currentUser(), what: "Raised" }] }); },
    { entity: "Contract", id: c.id, action: `Punch item raised — ${f.desc}` });
  return true;
}
function movePunch(p, what, by, note) {
  if (what !== "Rectified" && !tryAct(CLOSEOUT_ROLES, [], "verifying punch items")) return false;
  setState((s) => { const x = byId(s.punchItems, p.id); x.status = what === "Rectified" ? "Rectified" : what === "Closed" ? "Closed" : "Open"; x.history.push({ at: new Date().toISOString(), by: by || currentUser(), what, note: note || "" }); },
    { entity: "Punch", id: p.id, action: `${what}${note ? ` — ${note}` : ""}` });
  toast(`${p.id} ${what.toLowerCase()}`, what === "Reopened" ? "amber" : "green");
  return true;
}
function PunchTable({ rows, portal, by }) {
  return (
    <DataTable dense rows={rows} empty={<p className="p-4 text-[13px] text-ink-mute">No punch-list items.</p>} columns={[
      { key: "id", label: "Item", className: "mono text-[12px]" }, { key: "desc", label: "Snag / defect", className: "max-w-[300px] whitespace-normal" },
      { key: "location", label: "Location", className: "text-[12px]" }, { key: "severity", label: "Severity", render: (p) => <Status tone={{ Minor: "gray", Major: "amber", Critical: "red" }[p.severity]}>{p.severity}</Status> },
      { key: "due", label: "Due", render: (p) => <ExpiryCell iso={p.status === "Closed" ? null : p.due} /> },
      { key: "s", label: "Status", render: (p) => <Status tone={{ Open: "red", Rectified: "blue", Closed: "green" }[p.status]}>{p.status}</Status> },
      { key: "a", label: "", align: "right", render: (p) => (
        <span className="flex justify-end gap-1">
          {p.status === "Open" && <Btn size="sm" onClick={() => movePunch(p, "Rectified", portal ? by : undefined)}>Mark rectified</Btn>}
          {p.status === "Rectified" && !portal && <><Btn size="sm" variant="success" onClick={() => movePunch(p, "Closed")}>Verify & close</Btn><Btn size="sm" variant="danger" onClick={() => movePunch(p, "Reopened")}>Reopen</Btn></>}
        </span>) },
    ]} />
  );
}

// ---------------------------------------------------------------- close-out drawer
function CloseoutDrawer({ id, onClose }) {
  const st = useStore();
  const c = byId(st.contracts, id);
  const [pf, setPf] = y.useState(null), [insp, setInsp] = y.useState(null), [ho, setHo] = y.useState(null), [bill, setBill] = y.useState(null);
  if (!c) return null;
  const v = byId(st.vendors, c.vendorId);
  const wos = st.workOrders.filter((w) => w.contractId === id);
  const punch = (st.punchItems || []).filter((p) => p.contractId === id);
  const inspections = (st.inspections || []).filter((i) => i.contractId === id);
  const lastInsp = inspections.slice(-1)[0];
  const openNcr = (st.ncrs || []).filter((n) => wos.some((w) => w.id === n.woId) && n.status !== "Closed");
  const stage = closeoutStage(st, c), si = CLOSEOUT_STAGES.indexOf(stage);
  const finalBills = st.raBills.filter((b) => b.contractId === id && b.final && b.status !== "Rejected");
  const inspBlock = [!wos.every(woDone) && "all work orders completed or short-closed", punch.some((p) => p.status !== "Closed") && "punch-list items closed", openNcr.length > 0 && "NCRs closed"].filter(Boolean);
  const dlpEnd = c.handover ? shiftDays((c.dlpMonths || 0) * 30, c.handover.date) : null;
  const checklist = closureChecklist(st, c);
  const printCert = () => {
    const w = window.open("", "_blank"); if (!w) return toast("Allow pop-ups to print", "red");
    w.document.write(`<html><head><title>Handover certificate ${c.id}</title><style>body{font:14px/1.6 system-ui;margin:48px;max-width:720px}h1{font-size:20px}td{padding:4px 12px 4px 0}</style></head><body><h1>Taking-over / Handover Certificate</h1>
      <p>This certifies that the works under contract <b>${c.id} — ${c.title}</b> executed by <b>${v.name}</b> for <b>${c.project}</b> were inspected on ${fmtDate(lastInsp?.date)} and taken over on <b>${fmtDate(c.handover.date)}</b>.</p>
      <table><tr><td>Taken over by</td><td>${c.handover.takenOverBy}</td></tr><tr><td>Certified by</td><td>${c.handover.by}</td></tr><tr><td>Defect liability period</td><td>${c.dlpMonths} months, until ${fmtDate(dlpEnd)}</td></tr><tr><td>Remarks</td><td>${c.handover.note || "—"}</td></tr></table>
      <p style="margin-top:48px">______________________<br/>Project Manager</p></body></html>`);
    w.document.close(); w.print();
  };
  return (
    <Drawer open onClose={onClose} width={980} title={`Close-out — ${c.title}`} subtitle={<><span className="mono">{c.id}</span><Status>{contractStatus(c)}</Status><span>{v.name}</span><span>· {c.project}</span></>}
      actions={<RefLink to={`${CL_BASE}/contracts?open=${id}`}>Open contract →</RefLink>}>
      <div className="space-y-4 px-6 py-5">
        <Section><div className="overflow-x-auto p-5"><Stepper steps={CLOSEOUT_STAGES.filter((x) => x !== "Final payment" && x !== "Retention & guarantees" && (c.status === "Terminated" ? !["Punch list", "Final inspection", "Handover", "Defect liability", "Contractor release"].includes(x) : x !== "Blacklist decision")).map((x) => { const i = CLOSEOUT_STAGES.indexOf(x); return { label: x, status: i < si ? "done" : i === si ? (x === "Closed" ? "done" : "current") : "todo" }; })} /></div></Section>
        {c.status === "Terminated" && <Note tone="red">Terminated contract — no handover; settle the final account (bills, retention, guarantees) and close.</Note>}
        <Section title="1 · Work completion" icon={Icon.clipboardList}>
          <DataTable dense rows={wos} columns={[
            { key: "id", label: "WO", render: (w) => <RefLink to={`${CL_BASE}/work-orders?open=${w.id}`}>{w.id}</RefLink> }, { key: "title", label: "Title" },
            { key: "p", label: "Measured", render: (w) => <Progress value={Math.round(woProgress(st, w).physical)} /> },
            { key: "s", label: "Status", render: (w) => <Status>{w.status}</Status> },
          ]} />
        </Section>
        <Section title={`2 · Punch list (${punch.filter((p) => p.status !== "Closed").length} open)`} icon={Icon.listChecks} actions={c.status === "Active" && !c.handover && <Btn size="sm" icon={Icon.plus} onClick={() => setPf({ desc: "", location: "", severity: "Minor", due: shiftDays(7), woId: wos[0]?.id || "" })}>Add punch item</Btn>}>
          <PunchTable rows={punch} />
        </Section>
        <Section title="3 · Final inspection" icon={Icon.shieldCheck} actions={c.status === "Active" && !c.handover && <Btn size="sm" variant="primary" disabled={inspBlock.length > 0} title={inspBlock.length ? `Needs ${inspBlock.join(", ")}` : ""} onClick={() => setInsp({ result: "Passed", note: "", snags: "" })}>Record final inspection</Btn>}>
          {inspBlock.length > 0 && !c.handover && c.status === "Active" && <div className="px-4 pt-3"><Note tone="amber">Before the final inspection: {inspBlock.join(", ")}.</Note></div>}
          <DataTable dense rows={inspections} empty={<p className="p-4 text-[13px] text-ink-mute">No final inspection yet.</p>} columns={[
            { key: "id", label: "Inspection", className: "mono text-[12px]" }, { key: "date", label: "Date", render: (i) => fmtDate(i.date) }, { key: "by", label: "Inspected by" },
            { key: "result", label: "Result", render: (i) => <Status tone={i.result === "Passed" ? "green" : "red"}>{i.result}</Status> }, { key: "note", label: "Remarks", className: "whitespace-normal text-[12px]" },
          ]} />
        </Section>
        <Section title="4 · Handover certificate" icon={Icon.file} actions={c.handover ? <Btn size="sm" icon={Icon.download} onClick={printCert}>Print certificate</Btn> : c.status === "Active" && <Btn size="sm" variant="primary" disabled={lastInsp?.result !== "Passed" || inspBlock.length > 0} onClick={() => setHo({ date: todayISO(), takenOverBy: "", note: "" })}>Issue handover certificate</Btn>}>
          {c.handover ? <KV cols={4} items={[["Handed over", fmtDate(c.handover.date)], ["Taken over by", c.handover.takenOverBy], ["Certified by", c.handover.by], ["DLP ends", fmtDate(dlpEnd)]]} />
            : <p className="p-4 text-[13px] text-ink-mute">{lastInsp?.result === "Passed" ? "Final inspection passed — issue the certificate. The defect liability period starts from the handover date." : "Issued after a passed final inspection."}</p>}
        </Section>
        <Section title="5 · Final bill" icon={Icon.receipt} actions={(c.handover || c.status === "Terminated") && !finalBills.length && <Btn size="sm" variant="primary" onClick={() => setBill(true)}>Prepare final bill</Btn>}>
          {finalBills.length ? <DataTable dense rows={finalBills} columns={[
            { key: "id", label: "Bill", render: (b) => <RefLink to={`${CL_BASE}/ra-bills?open=${b.id}`}>{b.id}</RefLink> }, { key: "wo", label: "WO", render: (b) => b.woId }, { key: "g", label: "Gross", align: "right", num: true, render: (b) => inr(b.gross) },
            { key: "n", label: "Net", align: "right", num: true, render: (b) => inr(b.net) }, { key: "s", label: "Status", render: (b) => <Status>{b.status}</Status> },
          ]} /> : <p className="p-4 text-[13px] text-ink-mute">{c.handover || c.status === "Terminated" ? "Prepare the final bill: it settles all remaining measured work and closes billing on the work order." : "Available after handover."}</p>}
          {!finalBills.length && (c.handover || c.status === "Terminated") && (() => {
            // Everything already billed: the last running bill becomes the final account
            const left = st.measurements.some((m) => wos.some((w) => w.id === m.woId) && !m.billedIn && !m.voided && (m.qty > 0 || m.pct > 0));
            const last = st.raBills.filter((b) => b.contractId === id && b.status !== "Rejected").sort((a, b) => b.date.localeCompare(a.date))[0];
            return !left && last ? <div className="flex items-center justify-between border-t border-line px-4 py-3 text-[12.5px]"><span>No unbilled work remains. Treat <b>{last.id}</b> (RA-{last.seq}, {last.status}) as the final bill?</span>
              <Btn size="sm" onClick={() => tryAct(["Project Manager", "Quantity Surveyor"], [], "designating the final bill") && setState((s) => (byId(s.raBills, last.id).final = true), { entity: "RA Bill", id: last.id, action: "Designated as the final bill" })}>Mark as final bill</Btn></div> : null;
          })()}
        </Section>
        <Section title="6 · Defect liability, retention & guarantees" icon={Icon.lock}>
          <KV cols={4} items={[["DLP", c.handover ? `${c.dlpMonths} months → ${fmtDate(dlpEnd)}${daysUntil(dlpEnd) >= 0 ? ` (${daysUntil(dlpEnd)} days left)` : " (ended)"}` : "Starts at handover"],
            ["Retention balance", inrShort(contractLedger(st, c).retentionBalance)], ["Release", <RefLink to={`${CL_BASE}/retention`}>Retention & Deductions →</RefLink>], ["Guarantees live", liveGuarantees(c).length || "None"]]} />
        </Section>
        <Section title="7 · Final settlement & release" icon={Icon.handshake}>
          <KV cols={4} items={[["Final settlement", c.settlement ? <Status tone={c.settlement.status === "Agreed" ? "green" : "amber"}>{c.settlement.status}</Status> : "Not prepared"],
            ["Net position", c.settlement ? inr(c.settlement.net) : "—"], [c.status === "Terminated" ? "Blacklist decision" : "Release certificate", c.status === "Terminated" ? (c.blacklistDecision ? c.blacklistDecision.decision : "Pending") : (c.release ? c.release.no : "Not issued")],
            ["Open", <span className="flex flex-col gap-0.5">{settlementReady(st, c) ? <RefLink to={`${CL_BASE}/final-settlement?open=${c.id}`}>Final Settlement →</RefLink> : <span className="text-ink-mute">Settlement after the final bill</span>}{c.status === "Terminated" ? <RefLink to={`${CL_BASE}/terminations?open=${c.id}`}>Termination & Final Account →</RefLink> : (c.settlement?.status === "Agreed" || c.release) ? <RefLink to={`${CL_BASE}/contractor-release?open=${c.id}`}>Contractor Release →</RefLink> : null}</span>]]} />
        </Section>
        <Section title="8 · Closure checklist" icon={Icon.check} actions={c.status !== "Closed" && <Btn size="sm" variant="success" disabled={checklist.some((i) => !i.ok)} onClick={() => closeContract(c)}>Close contract</Btn>}>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5 p-4">
            {checklist.map((i) => <li key={i.label} className="flex items-center gap-2 text-[12.5px]">{h(i.ok ? Icon.check : Icon.warning, { size: 14, className: i.ok ? "text-green-600" : "text-amber-500" })}{i.label}</li>)}
          </ul>
        </Section>
      </div>
      {pf && (
        <Modal open onClose={() => setPf(null)} width={560} title="Add punch-list item" footer={<><Btn onClick={() => setPf(null)}>Cancel</Btn><Btn variant="primary" disabled={!pf.desc.trim() || !pf.due} onClick={() => { if (addPunch(c, pf)) { toast("Punch item added"); setPf(null); } }}>Save</Btn></>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Snag / defect" required span={2}><TextInput value={pf.desc} onChange={(x) => setPf({ ...pf, desc: x })} placeholder="e.g. Plaster crack at lift lobby L4" /></Field>
            <Field label="Location"><TextInput value={pf.location} onChange={(x) => setPf({ ...pf, location: x })} /></Field>
            <Field label="Work order"><Select value={pf.woId} onChange={(x) => setPf({ ...pf, woId: x })} options={wos.map((w) => ({ value: w.id, label: `${w.id} — ${w.title}` }))} /></Field>
            <Field label="Severity"><Select value={pf.severity} onChange={(x) => setPf({ ...pf, severity: x })} options={["Minor", "Major", "Critical"]} /></Field>
            <Field label="Rectify by" required><DateInput value={pf.due} onChange={(x) => setPf({ ...pf, due: x })} /></Field>
          </div>
        </Modal>
      )}
      {insp && (
        <Modal open onClose={() => setInsp(null)} width={560} title={`Final inspection — ${c.id}`} footer={<><Btn onClick={() => setInsp(null)}>Cancel</Btn><Btn variant="primary" disabled={!insp.note.trim() || (insp.result === "Failed" && !insp.snags.trim())} onClick={() => {
          if (!tryAct(["Project Manager"], [], "the final inspection")) return;
          setState((s) => {
            s.inspections = s.inspections || []; const fid = nextId("FI", s.inspections);
            s.inspections.push({ id: fid, contractId: c.id, date: todayISO(), by: currentUser(), result: insp.result, note: insp.note.trim() });
            if (insp.result === "Failed") { s.punchItems = s.punchItems || []; insp.snags.split("\n").map((x) => x.trim()).filter(Boolean).forEach((d) => s.punchItems.unshift({ id: nextId("PL", s.punchItems), contractId: c.id, woId: wos[0]?.id || null, desc: d, location: "", severity: "Major", due: shiftDays(7), status: "Open", raisedBy: currentUser(), raisedOn: todayISO(), history: [{ at: new Date().toISOString(), by: currentUser(), what: `Raised at ${fid}` }] })); }
          }, { entity: "Contract", id: c.id, action: `Final inspection ${insp.result.toLowerCase()}` });
          toast(insp.result === "Passed" ? "Final inspection passed — issue the handover certificate" : "Inspection failed — snags added to the punch list", insp.result === "Passed" ? "green" : "amber"); setInsp(null);
        }}>Save</Btn></>}>
          <div className="space-y-3">
            <Field label="Result"><div className="flex gap-1 rounded-lg bg-gray-100 p-0.5">{["Passed", "Failed"].map((r) => <button key={r} type="button" onClick={() => setInsp({ ...insp, result: r })} className={cls("h-[28px] flex-1 rounded-md text-[13px]", insp.result === r ? cls("bg-white font-medium shadow-sm", r === "Passed" ? "text-green-700" : "text-red-600") : "text-ink-soft")}>{r}</button>)}</div></Field>
            <Field label="Remarks" required><TextInput value={insp.note} onChange={(x) => setInsp({ ...insp, note: x })} placeholder="e.g. Joint walk-through with client; all areas acceptable" /></Field>
            {insp.result === "Failed" && <Field label="Snags found (one per line — added to the punch list)" required><TextArea rows={3} value={insp.snags} onChange={(x) => setInsp({ ...insp, snags: x })} /></Field>}
          </div>
        </Modal>
      )}
      {ho && (
        <Modal open onClose={() => setHo(null)} width={520} title="Issue handover certificate" subtitle="The defect liability period runs from this date" footer={<><Btn onClick={() => setHo(null)}>Cancel</Btn><Btn variant="primary" disabled={!ho.takenOverBy.trim() || !ho.date || ho.date > todayISO()} onClick={() => {
          if (!tryAct("Project Manager", [], "issuing the handover certificate")) return;
          setState((s) => { byId(s.contracts, c.id).handover = { date: ho.date, by: currentUser(), takenOverBy: ho.takenOverBy.trim(), note: ho.note.trim(), inspectionId: lastInsp.id }; }, { entity: "Contract", id: c.id, action: `Handover certificate issued — taken over ${fmtDate(ho.date)} by ${ho.takenOverBy}` });
          toast("Handover certificate issued — DLP started"); setHo(null);
        }}>Issue certificate</Btn></>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Handover date" required><DateInput value={ho.date} onChange={(x) => setHo({ ...ho, date: x })} /></Field>
            <Field label="Taken over by" required><TextInput value={ho.takenOverBy} onChange={(x) => setHo({ ...ho, takenOverBy: x })} placeholder="e.g. Client facility team" /></Field>
            <Field label="Remarks" span={2}><TextInput value={ho.note} onChange={(x) => setHo({ ...ho, note: x })} /></Field>
          </div>
        </Modal>
      )}
      {bill && <PrepareBillModal woId={wos.find((w) => !["Cancelled"].includes(w.status))?.id} finalFor={c.id} onClose={() => setBill(null)} />}
    </Drawer>
  );
}

function CloseoutPage() {
  const st = useStore();
  const [open, setOpen] = useQueryOpen();
  const [stage, setStage] = y.useState("All");
  const rows = closeoutContracts(st).map((c) => ({ c, stage: closeoutStage(st, c) })).filter((r) => stage === "All" || r.stage === stage);
  return (
    <Page title="Close-out & Handover" icon={Icon.folderCheck}>
      <DataTable noun="contracts" rows={rows} rowKey={(r) => r.c.id} onRow={(r) => setOpen(r.c.id)}
        filters={<FilterSelect label="Stage" value={stage} onChange={setStage} options={[{ value: "All", label: "All stages" }, ...CLOSEOUT_STAGES]} />} columns={[
        { key: "id", label: "Contract", className: "mono text-[12px] text-ink-soft", render: (r) => r.c.id },
        { key: "t", label: "Title", className: "font-medium", render: (r) => r.c.title },
        { key: "v", label: "Contractor", filterOptions: FO.contractors, filter: (r) => vendorName(st, r.c.vendorId), render: (r) => vendorName(st, r.c.vendorId) },
        { key: "w", label: "Work orders done", render: (r) => { const ws = st.workOrders.filter((w) => w.contractId === r.c.id); return `${ws.filter(woDone).length}/${ws.length}`; } },
        { key: "p", label: "Open punch items", align: "right", render: (r) => (st.punchItems || []).filter((p) => p.contractId === r.c.id && p.status !== "Closed").length || "—" },
        { key: "h", label: "Handover", render: (r) => (r.c.handover ? fmtDate(r.c.handover.date) : "—") },
        { key: "d", label: "DLP ends", render: (r) => (r.c.handover ? fmtDate(shiftDays((r.c.dlpMonths || 0) * 30, r.c.handover.date)) : "—") },
        { key: "s", label: "Stage", render: (r) => <Status tone={{ Execution: "blue", Closed: "gray", "Ready to close": "green", "Defect liability": "purple" }[r.stage] || "amber"}>{r.stage}</Status> },
      ]} />
      {open && <CloseoutDrawer id={open} onClose={() => setOpen(null)} />}
    </Page>
  );
}

// ---------------------------------------------------------------- vendor invoices from the portal
function reviewVendorInvoice(inv, accept, remark) {
  if (inv.review !== "Pending") return false;
  if (!tryAct(["Accounts", "Finance Controller"], [], "reviewing vendor invoices")) return false;
  if (!accept && !(remark || "").trim()) { toast("A reason is required to reject", "red"); return false; }
  setState((s) => Object.assign(byId(s.invoices, inv.id), { review: accept ? "Accepted" : "Rejected", reviewedBy: currentUser(), reviewedAt: new Date().toISOString(), reviewRemark: remark || "" }),
    { entity: "Invoice", id: inv.id, action: accept ? "Vendor invoice accepted by AP" : `Vendor invoice rejected — ${remark}` });
  toast(accept ? `${inv.id} accepted — goes to the payment run` : `${inv.id} returned to the vendor`, accept ? "green" : "red");
  return true;
}
function PortalInvoiceModal({ v, by, onClose }) {
  const st = useStore();
  const billedOn = (po, i) => sum(st.invoices.filter((x) => x.poId === po.id && x.review !== "Rejected").flatMap((x) => x.lines.filter((l) => l.line === i)), (l) => l.qty);
  const pos = st.purchaseOrders.filter((p) => p.vendorId === v.id && !["Draft", "Cancelled", "Closed"].includes(p.status)).map((p) => {
    const rec = poReceived(p);
    return { p, lines: rec.map((l, i) => ({ line: i, desc: l.desc, unit: l.unit, rate: l.rate, max: Math.max(0, (p.billingPolicy === "On ordered quantity" ? l.qty : l.accepted) - billedOn(p, i)) })) };
  }).filter((x) => x.lines.some((l) => l.max > 0));
  const [f, setF] = y.useState({ poId: pos[0]?.p.id || "", number: "", date: todayISO(), gstPct: 18, file: null, qty: {} });
  const cur = pos.find((x) => x.p.id === f.poId);
  const lines = cur ? cur.lines.filter((l) => l.max > 0) : [];
  const qtyOf = (l) => (f.qty[l.line] !== undefined ? f.qty[l.line] : l.max);
  const dup = f.number.trim() && st.invoices.some((i) => i.vendorId === v.id && i.review !== "Rejected" && String(i.number).trim().toLowerCase() === f.number.trim().toLowerCase());
  const bad = lines.some((l) => Number(qtyOf(l)) > l.max + 0.001 || Number(qtyOf(l)) < 0);
  const total = sum(lines, (l) => (Number(qtyOf(l)) || 0) * l.rate);
  const ok = cur && f.number.trim() && !dup && !bad && total > 0 && f.file && f.date <= todayISO();
  return (
    <Modal open onClose={onClose} width={820} title="Submit invoice" subtitle="Invoice against goods / services the buyer has received. Accounts reviews it before it is scheduled for payment."
      footer={<><span className="mr-auto text-[13px]">Taxable <b className="num">{inr(total)}</b> + GST {f.gstPct}%</span><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" icon={Icon.send} disabled={!ok} onClick={() => {
        const days = parseInt(v.paymentTerms.replace(/\D/g, ""), 10) || 0;
        setState((s) => { const id = nextId("INV", s.invoices); s.invoices.unshift({ id, vendorId: v.id, source: "Purchase Order", poId: f.poId, number: f.number.trim(), date: f.date, due: shiftDays(days, f.date), gstPct: Number(f.gstPct), hold: null, notes: [], payments: [], schedule: null,
          lines: lines.filter((l) => Number(qtyOf(l)) > 0).map((l) => ({ line: l.line, desc: l.desc, qty: Number(qtyOf(l)), rate: l.rate })), review: "Pending", submittedVia: "Portal", submittedBy: by, enteredBy: by, attachment: f.file }); },
          { entity: "Invoice", id: f.number, action: `Submitted by ${v.name} in the portal against ${f.poId}` });
        toast("Invoice submitted — the buyer's Accounts team will review it"); onClose();
      }}>Submit invoice</Btn></>}>
      {pos.length === 0 ? <EmptyState icon={Icon.receipt} title="Nothing to invoice" text="Invoices can be raised against received (or ordered, where agreed) quantities that aren't billed yet." /> : (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <Field label="Purchase order" required span={2}><Select value={f.poId} onChange={(x) => setF({ ...f, poId: x, qty: {} })} options={pos.map((x) => ({ value: x.p.id, label: `${x.p.id} — ${itemsSummary(x.p.lines)}` }))} /></Field>
            <Field label="Your invoice no." required><TextInput value={f.number} onChange={(x) => setF({ ...f, number: x })} /></Field>
            <Field label="Invoice date" required><DateInput value={f.date} onChange={(x) => setF({ ...f, date: x })} /></Field>
          </div>
          {dup && <Note tone="red">Invoice no. {f.number} has already been submitted.</Note>}
          {f.date > todayISO() && <Note tone="red">The invoice date can't be in the future.</Note>}
          <table className="w-full"><thead><tr><Th>Item</Th><Th align="right">Billable</Th><Th align="right">Rate</Th><Th align="right">Invoice qty</Th><Th align="right">Amount</Th></tr></thead>
            <tbody>{lines.map((l) => (
              <tr key={l.line}><Td className="whitespace-normal">{l.desc}</Td><Td align="right" className="num">{num(l.max)} {l.unit}</Td><Td align="right" className="num">{inr(l.rate)}</Td>
                <Td align="right"><div className="ml-auto w-28"><NumInput value={qtyOf(l)} onChange={(x) => setF({ ...f, qty: { ...f.qty, [l.line]: x } })} /></div>{Number(qtyOf(l)) > l.max + 0.001 && <span className="block text-[10.5px] text-red-600">above billable</span>}</Td>
                <Td align="right" className="num">{inr((Number(qtyOf(l)) || 0) * l.rate)}</Td></tr>))}</tbody></table>
          <div className="grid grid-cols-2 gap-3">
            <Field label="GST %"><Select value={String(f.gstPct)} onChange={(x) => setF({ ...f, gstPct: Number(x) })} options={["0", "5", "12", "18", "28"]} /></Field>
            <Field label="Invoice copy (PDF)" required>
              <label className={cls("flex h-[32px] cursor-pointer items-center gap-2 truncate rounded-md border border-dashed px-2.5 text-[12.5px]", f.file ? "border-green-300 bg-green-50 text-green-700" : "border-gray-300 text-ink-soft")}>
                <Icon.upload size={13} /><span className="truncate">{f.file?.name || "Attach invoice"}</span>
                <input type="file" className="hidden" onChange={async (e) => { const a = await readAttachment(e.target.files[0]); a && setF((ff) => ({ ...ff, file: a })); }} />
              </label>
            </Field>
          </div>
        </div>
      )}
    </Modal>
  );
}
