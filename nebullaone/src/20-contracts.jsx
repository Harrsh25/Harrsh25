// Contract & Labor Management — contractor onboarding and contract creation /
// tracking (renewal reminders, change orders, bank guarantees).

const contractorVendors = (st) => st.vendors.filter((v) => v.isContractor || v.type === "Labor");

// ---------------------------------------------------------------- onboarding
function OnboardingPage() {
  const st = useStore();
  const [reg, setReg] = y.useState(false), [open, setOpen] = y.useState(null), [full, setFull] = y.useState(null), [stageF, setStageF] = y.useState("All");
  const list = contractorVendors(st).filter((v) => !["Blacklisted", "Disabled"].includes(v.status));
  const col = (stage) => list.filter((v) => onboardingStage(v) === stage);
  return (
    <Page title="Contractor Onboarding" subtitle="Registration → statutory documents → approvals → mobilisation checklist" icon={Icon.userPlus}
      actions={<Btn variant="primary" icon={Icon.userPlus} onClick={() => setReg(true)}>Onboard contractor</Btn>}>
      <DataTable noun="contractors" placeholder="Search contractor, trade…"
        filters={<FilterSelect label="Stage" value={stageF} onChange={setStageF} options={[{ value: "All", label: "All stages" }, ...ONBOARD_STAGES.map((x, k) => ({ value: x, label: x, tone: ["amber", "blue", "purple", "green"][k] }))]} />}
        rows={list.filter((v) => stageF === "All" || onboardingStage(v) === stageF)} onRow={(v) => setOpen(v.id)} columns={[
        { key: "n", label: "Contractor", className: "font-medium", render: (v) => v.name },
        { key: "t", label: "Trades", filter: (v) => v.categories, render: (v) => <CategoryChips list={v.categories} /> },
        { key: "st", label: "Stage", render: (v) => { const s0 = onboardingStage(v); return <Status tone={{ Documents: "amber", "Under Review": "blue", Mobilising: "purple", Onboarded: "green", Rejected: "red" }[s0]}>{s0}</Status>; } },
        { key: "d", label: "Documents", render: (v) => { const ok = v.docs.filter((d) => d.status === "Verified").length, n = requiredDocs(v).length; return <span className="flex items-center gap-2"><span className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200"><span className={cls("block h-full rounded-full", ok >= n ? "bg-green-500" : "bg-amber-500")} style={{ width: `${(ok / (n || 1)) * 100}%` }} /></span><span className="num text-[12px] text-ink-soft">{ok}/{n}</span></span>; } },
        { key: "a", label: "Approval", render: (v) => { const pnd = v.approval.stages.find((x) => x.status === "Pending"); return pnd ? <span>With <b className="font-medium text-blue-700">{pnd.dept}</b></span> : v.status === "Active" || v.status === "On Hold" ? <span className="text-green-700">Approved</span> : <span className="text-ink-mute">{v.status}</span>; } },
        { key: "c", label: "Mobilisation checklist", render: (v) => { const ck = v.onboarding?.checklist || []; const done = ck.filter((x) => x.done).length; return ck.length ? <span className="flex items-center gap-2"><span className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200"><span className="block h-full rounded-full bg-violet-500" style={{ width: `${(done / ck.length) * 100}%` }} /></span><span className="num text-[12px] text-ink-soft">{done}/{ck.length}</span></span> : <span className="text-ink-faint">—</span>; } },
        { key: "w", label: "Workforce", align: "right", num: true, render: (v) => v.contractor?.workforce || "—" },
        { key: "cp", label: "Compliance", filter: (v) => complianceOf(v).status, render: (v) => <Status>{complianceOf(v).status}</Status> },
      ]} />
      <RegisterVendorModal open={reg} contractorMode onClose={() => setReg(false)} onCreated={setOpen} />
      {open && <OnboardingDrawer vendorId={open} onClose={() => setOpen(null)} onFull={(tab) => { setFull({ id: open, tab }); setOpen(null); }} />}
      {full && <VendorDrawer vendorId={full.id} initialTab={full.tab} onClose={() => setFull(null)} />}
    </Page>
  );
}

function OnboardingDrawer({ vendorId, onClose, onFull }) {
  const st = useStore();
  const v = byId(st.vendors, vendorId);
  if (!v) return null;
  const stage = onboardingStage(v);
  const idx = ONBOARD_STAGES.indexOf(stage);
  const ck = v.onboarding?.checklist || ONBOARD_CHECKLIST.map((item) => ({ item, done: false }));
  const docs = requiredDocs(v).map((n) => v.docs.find((d) => d.name === n) || { name: n, status: "Missing" });
  const toggle = (i) => setState((s) => {
    const x = byId(s.vendors, vendorId);
    x.onboarding = x.onboarding || { checklist: ONBOARD_CHECKLIST.map((item) => ({ item, done: false })), startedAt: todayISO() };
    x.onboarding.checklist[i].done = !x.onboarding.checklist[i].done;
  }, { entity: "Vendor", id: vendorId, action: `Onboarding: ${ck[i].item} ${ck[i].done ? "reopened" : "done"}` });
  return (
    <Drawer open onClose={onClose} width={720} title={v.name} subtitle={<><span className="mono">{v.id}</span><Status>{stage}</Status><Status>{complianceOf(v).status}</Status></>}
      actions={<Btn icon={Icon.eye} onClick={() => onFull("overview")}>Full vendor record</Btn>}>
      <div className="space-y-4 px-6 py-5">
        <Section><div className="p-5"><Stepper steps={ONBOARD_STAGES.map((s, i) => ({ label: s, status: stage === "Rejected" ? (i === 1 ? "rejected" : i < 1 ? "done" : "todo") : i < idx ? "done" : i === idx ? (s === "Onboarded" ? "done" : "current") : "todo" }))} /></div></Section>
        <Section title="Statutory documents" icon={Icon.folderCheck} actions={<Btn size="sm" onClick={() => onFull("docs")}>Manage documents</Btn>}>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5 p-4">
            {docs.map((d) => <li key={d.name} className="flex items-center justify-between text-[12.5px]"><span>{d.name}</span><Status>{docState(d)}</Status></li>)}
          </ul>
        </Section>
        {(v.status === "Draft" || v.status === "Rejected") && (
          <Note tone={docs.every((d) => d.status !== "Missing") ? "blue" : "amber"}>
            {docs.every((d) => d.status !== "Missing") ? "All documents uploaded — submit for Procurement → Legal → Finance approval." : `${docs.filter((d) => d.status === "Missing").length} document(s) still missing. You can submit now, but approvers will see the gaps.`}
            <div className="mt-2"><Btn variant="primary" size="sm" icon={Icon.send} onClick={() => { resubmit(v); toast("Submitted for approval"); }}>Submit for approval</Btn></div>
          </Note>
        )}
        {v.status === "Pending Approval" && <Note>Awaiting <b>{v.approval.stages.find((s) => s.status === "Pending")?.dept}</b> approval. <button className="font-medium text-brand" onClick={() => onFull("approval")}>Open approvals →</button></Note>}
        <Section title="Mobilisation checklist" icon={Icon.listChecks} actions={<span className="text-[12px] text-ink-mute">{ck.filter((c) => c.done).length}/{ck.length} done</span>}>
          <ul className="divide-y divide-line">
            {ck.map((c, i) => (
              <li key={c.item} className="px-4 py-2">
                <Check checked={c.done} onChange={() => (v.status === "Active" || v.status === "On Hold" ? toggle(i) : toast("Checklist opens once the contractor is approved", "red"))} label={c.item} />
              </li>
            ))}
          </ul>
        </Section>
        {v.contractor && (
          <Section title="Contractor profile" icon={Icon.hardHat}>
            <KV items={[["Labour licence", v.contractor.labourLicence || "—"], ["Valid till", fmtDate(v.contractor.licenceExpiry)], ["Workforce", v.contractor.workforce || "—"], ["PF code", v.contractor.pfCode || "—"], ["ESI code", v.contractor.esiCode || "—"], ["Experience", v.contractor.experienceYrs ? `${v.contractor.experienceYrs} yrs` : "—"]]} />
          </Section>
        )}
      </div>
    </Drawer>
  );
}

// ---------------------------------------------------------------- contracts
function ContractModal({ open, onClose, onCreated }) {
  const st = useStore();
  const blank = { vendorId: "", project: PROJECTS[0], title: "", type: "Item-Rate", value: "", start: todayISO(), end: shiftDays(365), retentionPct: 5, advancePct: 10, advanceRecoveryPct: 10, cessPct: 1, gstPct: 18, dlpMonths: 12, ldPctPerWeek: 0.5, ldCapPct: 5, bgNo: "", bgExpiry: "", owner: currentUser() };
  const [f, setF] = y.useState(blank);
  y.useEffect(() => { if (open) setF(blank); }, [open]);
  const set = (k) => (x) => setF({ ...f, [k]: x });
  const vendors = contractorVendors(st).filter((v) => v.status === "Active" && v.regTier === "Spend Authorized");
  const ok = f.vendorId && f.title && f.value > 0 && f.end > f.start;
  const save = (activate) => {
    const id = nextId("CTR", st.contracts);
    setState((s) => s.contracts.unshift({ ...f, id, value: Number(f.value), advanceAmount: round2((Number(f.value) * (Number(f.advancePct) || 0)) / 100), status: activate ? "Active" : "Draft", signedOn: activate ? todayISO() : null, changeOrders: [] }),
      { entity: "Contract", id, action: `${activate ? "Created & activated" : "Drafted"} for ${vendorName(st, f.vendorId)}` });
    toast(`${id} ${activate ? "activated" : "saved as draft"}`); onClose(); onCreated && onCreated(id);
  };
  return (
    <Modal open={open} onClose={onClose} width={840} title="Create contract" subtitle="Commercial terms here drive every RA bill: retention, advance recovery, cess, GST and LD"
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn disabled={!ok} onClick={() => save(false)}>Save draft</Btn><Btn variant="primary" disabled={!ok} onClick={() => save(true)}>Sign & activate</Btn></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Contractor" required hint="Approved, spend-authorized contractors"><Select value={f.vendorId} placeholder="Select…" onChange={set("vendorId")} options={vendors.map((v) => ({ value: v.id, label: v.name }))} /></Field>
          <Field label="Project"><Select value={f.project} onChange={set("project")} options={PROJECTS} /></Field>
          <Field label="Contract type"><Select value={f.type} onChange={set("type")} options={["Item-Rate", "Lump Sum", "Rate Contract"]} /></Field>
          <Field label="Contract title / scope" required span={2}><TextInput value={f.title} onChange={set("title")} placeholder="e.g. Civil & structural works — Tower C" /></Field>
          <Field label="Contract value (₹, excl. GST)" required><NumInput value={f.value} onChange={set("value")} /></Field>
          <Field label="Start date"><DateInput value={f.start} onChange={set("start")} /></Field>
          <Field label="Completion date"><DateInput value={f.end} onChange={set("end")} /></Field>
          <Field label="Contract owner"><TextInput value={f.owner} onChange={set("owner")} /></Field>
        </div>
        <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-mute">Payment & security terms</p>
        <div className="grid grid-cols-4 gap-3">
          <Field label="Retention (%)"><NumInput value={f.retentionPct} onChange={set("retentionPct")} /></Field>
          <Field label="Mobilisation advance (%)" hint={f.value ? inrShort((f.value * (f.advancePct || 0)) / 100) : ""}><NumInput value={f.advancePct} onChange={set("advancePct")} /></Field>
          <Field label="Advance recovery per bill (%)"><NumInput value={f.advanceRecoveryPct} onChange={set("advanceRecoveryPct")} /></Field>
          <Field label="Labour welfare cess (%)"><NumInput value={f.cessPct} onChange={set("cessPct")} /></Field>
          <Field label="GST (%)"><Select value={String(f.gstPct)} onChange={(x) => setF({ ...f, gstPct: Number(x) })} options={["18", "12", "5", "0"]} /></Field>
          <Field label="Defect liability (months)"><NumInput value={f.dlpMonths} onChange={set("dlpMonths")} /></Field>
          <Field label="LD per week (%)"><NumInput value={f.ldPctPerWeek} onChange={set("ldPctPerWeek")} /></Field>
          <Field label="LD cap (%)"><NumInput value={f.ldCapPct} onChange={set("ldCapPct")} /></Field>
          <Field label="Performance BG no."><TextInput value={f.bgNo} onChange={set("bgNo")} /></Field>
          <Field label="BG valid till"><DateInput value={f.bgExpiry} onChange={set("bgExpiry")} /></Field>
        </div>
      </div>
    </Modal>
  );
}

function ContractDrawer({ id, onClose }) {
  const st = useStore();
  const c = byId(st.contracts, id);
  const [co, setCo] = y.useState(null), [ext, setExt] = y.useState(null);
  if (!c) return null;
  const v = byId(st.vendors, c.vendorId), status = contractStatus(c), led = contractLedger(st, c);
  const wos = st.workOrders.filter((w) => w.contractId === id);
  const woTotal = sum(wos, woValue), cv = contractValue(c);
  const mut = (fn, action) => setState((s) => fn(byId(s.contracts, id)), { entity: "Contract", id, action });
  return (
    <Drawer open onClose={onClose} width={940} title={c.title} subtitle={<><span className="mono">{c.id}</span><Status tone={status === "Expiring" ? "amber" : undefined}>{status}</Status><span>{v.name}</span><span>· {c.project}</span><span>· {c.type}</span></>}
      actions={<>
        {c.status === "Draft" && <Btn variant="primary" onClick={() => mut((x) => { x.status = "Active"; x.signedOn = todayISO(); }, "Signed & activated")}>Sign & activate</Btn>}
        {c.status !== "Draft" && c.status !== "Closed" && <Btn icon={Icon.calendar} onClick={() => setExt({ end: shiftDays(90, c.end), note: "" })}>Extend / renew</Btn>}
        {c.status !== "Closed" && ["Completed", "In DLP"].includes(status) && led.retentionBalance <= 0 && <Btn onClick={() => mut((x) => (x.status = "Closed"), "Contract closed")}>Close contract</Btn>}
      </>}>
      <div className="space-y-4 px-6 py-5">
        {status === "Expiring" && <Note tone="amber" icon={Icon.calendarClock}>Completion date {fmtDate(c.end)} is in <b>{daysUntil(c.end)} days</b>. Decide on extension or renewal.</Note>}
        {c.bgExpiry && daysUntil(c.bgExpiry) <= 30 && <Note tone="red">Performance bank guarantee {c.bgNo} expires {fmtDate(c.bgExpiry)} — ask the contractor to extend it.</Note>}
        <div className="grid grid-cols-4 gap-3">
          <StatTile tone="blue" label="Contract value" value={inrShort(cv)} sub={cv !== c.value ? `+${inrShort(cv - c.value)} CO` : "original"} icon={Icon.file} />
          <StatTile tone="purple" label="Work ordered" value={inrShort(woTotal)} sub={`${pct(woTotal, cv)}%`} icon={Icon.clipboardList} />
          <StatTile tone="green" label="Billed (gross)" value={inrShort(led.gross)} sub={`${pct(led.gross, cv)}%`} icon={Icon.receipt} />
          <StatTile tone="amber" label="Retention held" value={inrShort(led.retentionBalance)} sub={`adv. ${inrShort(led.advanceBalance)}`} icon={Icon.lock} />
        </div>
        <Section title="Terms" icon={Icon.scale}>
          <KV cols={4} items={[
            ["Start", fmtDate(c.start)], ["Completion", fmtDate(c.end)], ["Signed on", fmtDate(c.signedOn)], ["Owner", c.owner],
            ["Retention", `${c.retentionPct}%`], ["Mobilisation advance", `${c.advancePct || 0}% · ${inrShort(c.advanceAmount)}`], ["Advance recovery", `${c.advanceRecoveryPct || 0}% per bill`], ["Labour cess", `${c.cessPct}%`],
            ["GST", `${c.gstPct}%`], ["DLP", `${c.dlpMonths} months`], ["LD", c.ldPctPerWeek ? `${c.ldPctPerWeek}%/week, cap ${c.ldCapPct}%` : "—"], ["Performance BG", c.bgNo ? `${c.bgNo} · till ${fmtDate(c.bgExpiry)}` : "—"],
          ]} />
        </Section>
        <Section title="Work orders" icon={Icon.clipboardList} actions={<RefLink to={`${CL_BASE}/work-orders?contract=${id}`}>+ New work order</RefLink>}>
          <DataTable dense rows={wos} empty={<p className="p-4 text-[13px] text-ink-mute">No work orders yet.</p>} columns={[
            { key: "id", label: "WO", render: (w) => <RefLink to={`${CL_BASE}/work-orders?open=${w.id}`}>{w.id}</RefLink> },
            { key: "title", label: "Title" }, { key: "type", label: "Type" },
            { key: "v", label: "Value", align: "right", num: true, render: (w) => inrShort(woValue(w)) },
            { key: "p", label: "Progress", render: (w) => <Progress value={Math.round(woProgress(st, w).physical)} /> },
            { key: "s", label: "Status", render: (w) => <Status>{w.status}</Status> },
          ]} />
        </Section>
        <Section title="Change orders" icon={Icon.branch} actions={c.status !== "Closed" && <Btn size="sm" icon={Icon.plus} onClick={() => setCo({ desc: "", amount: "", days: 0, reason: "" })}>Raise change order</Btn>}>
          <DataTable dense rows={c.changeOrders} empty={<p className="p-4 text-[13px] text-ink-mute">No change orders.</p>} columns={[
            { key: "id", label: "CO", className: "mono text-[12px]" }, { key: "desc", label: "Change", className: "whitespace-normal" }, { key: "reason", label: "Reason", className: "whitespace-normal text-[12px] text-ink-soft" },
            { key: "amount", label: "Value", align: "right", num: true, render: (o) => inrShort(o.amount) }, { key: "days", label: "Time", align: "right", render: (o) => (o.days ? `+${o.days} d` : "—") },
            { key: "s", label: "Status", render: (o) => <Status>{o.status}</Status> },
            { key: "a", label: "", align: "right", render: (o) => o.status === "Pending" && <span className="flex justify-end gap-1">
              <Btn size="sm" variant="success" onClick={() => mut((x) => { const z = x.changeOrders.find((q) => q.id === o.id); z.status = "Approved"; if (z.days) x.end = shiftDays(z.days, x.end); }, `${o.id} approved`)}>Approve</Btn>
              <Btn size="sm" variant="danger" onClick={() => mut((x) => (x.changeOrders.find((q) => q.id === o.id).status = "Rejected"), `${o.id} rejected`)}>Reject</Btn></span> },
          ]} />
        </Section>
      </div>
      {co && (
        <Modal open onClose={() => setCo(null)} width={560} title="Raise change order" footer={<><Btn onClick={() => setCo(null)}>Cancel</Btn><Btn variant="primary" disabled={!co.desc || !co.amount} onClick={() => {
          const coId = `CO-${String(c.changeOrders.length + 1).padStart(3, "0")}`;
          mut((x) => x.changeOrders.push({ ...co, id: coId, amount: Number(co.amount), days: Number(co.days) || 0, status: "Pending", raisedOn: todayISO() }), `${coId} raised`);
          setCo(null);
        }}>Submit for approval</Btn></>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Change description" span={2}><TextInput value={co.desc} onChange={(x) => setCo({ ...co, desc: x })} /></Field>
            <Field label="Value (₹, can be negative)"><NumInput value={co.amount} onChange={(x) => setCo({ ...co, amount: x })} /></Field>
            <Field label="Time extension (days)"><NumInput value={co.days} onChange={(x) => setCo({ ...co, days: x })} /></Field>
            <Field label="Reason / instruction ref." span={2}><TextInput value={co.reason} onChange={(x) => setCo({ ...co, reason: x })} /></Field>
          </div>
        </Modal>
      )}
      {ext && (
        <Modal open onClose={() => setExt(null)} width={460} title="Extend / renew contract" footer={<><Btn onClick={() => setExt(null)}>Cancel</Btn><Btn variant="primary" disabled={!ext.note || ext.end <= c.end} onClick={() => { mut((x) => (x.end = ext.end), `Extended to ${fmtDate(ext.end)} — ${ext.note}`); toast("Contract extended"); setExt(null); }}>Save</Btn></>}>
          <div className="space-y-3">
            <Field label="New completion date"><DateInput value={ext.end} onChange={(x) => setExt({ ...ext, end: x })} /></Field>
            <Field label="Reason"><TextInput value={ext.note} onChange={(x) => setExt({ ...ext, note: x })} placeholder="e.g. Client-approved EOT-02" /></Field>
          </div>
        </Modal>
      )}
    </Drawer>
  );
}

function ContractsPage() {
  const st = useStore();
  const [open, setOpen] = useQueryOpen();
  const [create, setCreate] = y.useState(false), [status, setStatus] = y.useState("All");
  const rows = st.contracts.filter((c) => status === "All" || contractStatus(c) === status);
  const reminders = st.contracts.filter((c) => c.status !== "Closed" && c.status !== "Draft").flatMap((c) => {
    const out = [], d = daysUntil(c.end);
    if (d >= 0 && d <= 90) out.push({ c, what: "Completion", date: c.end, d });
    if (c.bgExpiry && daysUntil(c.bgExpiry) <= 90) out.push({ c, what: "Bank guarantee", date: c.bgExpiry, d: daysUntil(c.bgExpiry) });
    return out;
  }).sort((a, b) => a.d - b.d);
  return (
    <Page title="Contracts" subtitle="Contract creation, tracking, renewals and change orders" icon={Icon.file}
      actions={<Btn variant="primary" icon={Icon.plus} onClick={() => setCreate(true)}>Create contract</Btn>}>
      {reminders.length > 0 && (
        <div className="border-b border-line px-4 py-3">
          <p className="mb-2 flex items-center gap-2 text-[12.5px] font-semibold"><Icon.calendarClock size={14} className="text-amber-500" /> Renewal reminders (90 / 30-day triggers)</p>
          <div className="flex flex-wrap gap-2">
            {reminders.map((r) => (
              <button key={r.c.id + r.what} onClick={() => setOpen(r.c.id)} className={cls("rounded-lg border px-3 py-1.5 text-left text-[12px]", r.d <= 30 ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-800")}>
                <b>{r.c.id}</b> · {r.what} {fmtDate(r.date)} · <b>{r.d}d</b>
              </button>
            ))}
          </div>
        </div>
      )}
      <DataTable noun="contracts" filters={<FilterSelect label="Status" value={status} onChange={setStatus} options={[{ value: "All", label: "All status" }, "Draft", "Active", "Expiring", "In DLP", "Completed", "Closed"]} />} rows={rows} onRow={(c) => setOpen(c.id)} columns={[
        { key: "id", label: "Contract", className: "mono text-[12px] text-ink-soft" },
        { key: "title", label: "Title", className: "font-medium" },
        { key: "v", label: "Contractor", filter: (x) => vendorName(st, x.vendorId), render: (c) => vendorName(st, c.vendorId) },
        { key: "type", label: "Type", filter: true },
        { key: "val", label: "Value", align: "right", num: true, render: (c) => inrShort(contractValue(c)) },
        { key: "b", label: "Billed", render: (c) => <Progress value={Math.round(pct(contractLedger(st, c).gross, contractValue(c)))} /> },
        { key: "end", label: "Completion", render: (c) => fmtDate(c.end) },
        { key: "s", label: "Status", render: (c) => <Status tone={contractStatus(c) === "Expiring" ? "amber" : undefined}>{contractStatus(c)}</Status> },
      ]} />
      <ContractModal open={create} onClose={() => setCreate(false)} onCreated={setOpen} />
      {open && <ContractDrawer id={open} onClose={() => setOpen(null)} />}
    </Page>
  );
}
