// Contract & Labor Management - contractor onboarding and contract creation /
// tracking (renewal reminders, change orders, bank guarantees).

const contractorVendors = (st) => st.vendors.filter((v) => v.isContractor || hasType(v, "Labor"));

// ---------------------------------------------------------------- onboarding
function OnboardingPage() {
  const st = useStore();
  const [reg, setReg] = y.useState(false), [open, setOpen] = y.useState(null), [full, setFull] = y.useState(null), [stageF, setStageF] = y.useState("All");
  const list = contractorVendors(st).filter((v) => !["Blacklisted", "Inactive"].includes(v.status));
  const col = (stage) => list.filter((v) => onboardingStage(v) === stage);
  return (
    <Page title="Contractor Onboarding" subtitle="Registration → statutory documents → approvals → mobilisation checklist" icon={Icon.userPlus}
      actions={<Btn variant="primary" icon={Icon.userPlus} onClick={() => setReg(true)}>Onboard contractor</Btn>}>
      <DataTable noun="contractors" placeholder="Search contractor, trade…"
        filters={<FilterSelect label="Stage" value={stageF} onChange={setStageF} options={[{ value: "All", label: "All stages" }, ...ONBOARD_STAGES.map((x, k) => ({ value: x, label: x, tone: ["amber", "blue", "purple", "green"][k] }))]} />}
        rows={list.filter((v) => stageF === "All" || onboardingStage(v) === stageF)} onRow={(v) => setOpen(v.id)} columns={[
        { key: "n", label: "Contractor", className: "font-medium", render: (v) => v.name },
        { key: "t", label: "Trades", filterOptions: FO.trades, filter: (v) => v.categories, render: (v) => <CategoryChips list={v.categories} /> },
        { key: "st", label: "Stage", render: (v) => { const s0 = onboardingStage(v); return <Status tone={{ Documents: "amber", "Under Review": "blue", Mobilising: "purple", Onboarded: "green", Rejected: "red" }[s0]}>{s0}</Status>; } },
        { key: "d", label: "Documents", render: (v) => { const ok = v.docs.filter((d) => d.status === "Verified").length, n = requiredDocs(v).length; return <span className="flex items-center gap-2"><span className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200"><span className={cls("block h-full rounded-full", ok >= n ? "bg-green-500" : "bg-amber-500")} style={{ width: `${(ok / (n || 1)) * 100}%` }} /></span><span className="num text-[12px] text-ink-soft">{ok}/{n}</span></span>; } },
        { key: "a", label: "Approval", render: (v) => { const pnd = v.approval.stages.find((x) => x.status === "Pending"); return pnd ? <Status tone="blue">{`With ${pnd.dept}`}</Status> : v.status === "Active" || v.status === "On Hold" ? <Status tone="green">Approved</Status> : <Status>{v.status}</Status>; } },
        { key: "c", label: "Mobilisation checklist", render: (v) => { const ck = v.onboarding?.checklist || []; const done = ck.filter((x) => x.done).length; return ck.length ? <span className="flex items-center gap-2"><span className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200"><span className="block h-full rounded-full bg-violet-500" style={{ width: `${(done / ck.length) * 100}%` }} /></span><span className="num text-[12px] text-ink-soft">{done}/{ck.length}</span></span> : <span className="text-ink-faint">-</span>; } },
        { key: "w", label: "Workforce", align: "right", num: true, render: (v) => v.contractor?.workforce || "-" },
        { key: "cp", label: "Compliance", filterOptions: FO.compliance, filter: (v) => complianceOf(v).status, render: (v) => <Status>{complianceOf(v).status}</Status> },
      ]} />
      <RegisterVendorModal open={reg} contractorMode onClose={() => setReg(false)} onCreated={setOpen} />
      {open && <OnboardingDrawer vendorId={open} onClose={() => setOpen(null)} onFull={(tab) => { setFull({ id: open, tab }); setOpen(null); }} />}
      {full && <VendorDrawer vendorId={full.id} initialTab={full.tab} onClose={() => setFull(null)} />}
    </Page>
  );
}

const SITE_ITEMS = ["Safety induction completed", "Site gate passes / ID badges issued"];
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
    <Drawer open onClose={onClose} width={720} title={v.name} recordId={v.id} status={<Status>{stage}</Status>} details={[["Compliance", <Status>{complianceOf(v).status}</Status>]]}
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
            {docs.every((d) => d.status !== "Missing") ? "All documents uploaded - submit for Procurement → Legal → Finance approval." : `${docs.filter((d) => d.status === "Missing").length} document(s) still missing. You can submit now, but approvers will see the gaps.`}
            <div className="mt-2"><Btn variant="primary" size="sm" icon={Icon.send} onClick={() => { if (resubmit(v)) toast("Submitted for approval"); }}>Submit for approval</Btn></div>
          </Note>
        )}
        {v.status === "Pending Approval" && <Note>Awaiting <b>{v.approval.stages.find((s) => s.status === "Pending")?.dept}</b> approval. <button className="font-medium text-brand" onClick={() => onFull("approval")}>Open approvals →</button></Note>}
        {backgroundIssue(v) && <Note tone="red" icon={Icon.lock}>{backgroundIssue(v)}. Mobilisation (safety induction, gate passes, work orders) is blocked until the background check is clear - record it on the vendor's Approval tab.</Note>}
        {v.qualification && <Note tone={qualStatus(v).tone === "green" ? "green" : qualStatus(v).tone === "amber" ? "amber" : "red"}>Qualification: <b>{qualStatus(v).status}</b>{qualStatus(v).limit ? ` · project value limit ${inrShort(qualStatus(v).limit)}` : ""}{qualStatus(v).exceptions ? ` · ${qualStatus(v).exceptions}` : ""}</Note>}
        <Section title="Mobilisation checklist" icon={Icon.listChecks} actions={<span className="text-[12px] text-ink-mute">{ck.filter((c) => c.done).length}/{ck.length} done</span>}>
          <ul className="divide-y divide-line">
            {ck.map((c, i) => (
              <li key={c.item} className="px-4 py-2">
                <Check checked={c.done} onChange={() => (!(v.status === "Active" || v.status === "On Hold") ? toast("Checklist opens once the contractor is approved", "red")
                  : !c.done && SITE_ITEMS.includes(c.item) && backgroundIssue(v) ? toast(`${backgroundIssue(v)} - mobilisation is blocked until it is clear`, "red") : toggle(i))} label={c.item} />
              </li>
            ))}
          </ul>
        </Section>
        {v.contractor && (
          <Section title="Contractor profile" icon={Icon.hardHat}>
            <KV items={[["Labour licence", v.contractor.labourLicence || "-"], ["Valid till", fmtDate(v.contractor.licenceExpiry)], ["Workforce", v.contractor.workforce || "-"], ["PF code", v.contractor.pfCode || "-"], ["ESI code", v.contractor.esiCode || "-"], ["Experience", v.contractor.experienceYrs ? `${v.contractor.experienceYrs} yrs` : "-"]]} />
          </Section>
        )}
      </div>
    </Drawer>
  );
}

// ---------------------------------------------------------------- contracts
function ContractsPage() {
  const st = useStore();
  const [open, setOpen] = useQueryOpen();
  const [create, setCreate] = y.useState(false), [status, setStatus] = y.useState("All");
  const rows = st.contracts.filter((c) => status === "All" || contractStatus(c) === status);
  const reminders = st.contracts.filter((c) => !["Closed", "Draft", "Pending Approval", "Approved", "Rejected"].includes(c.status)).flatMap((c) => {
    const out = [], d = daysUntil(c.end);
    if (c.status !== "Terminated" && d >= 0 && d <= 90) out.push({ c, what: "Completion", date: c.end, d });
    liveGuarantees(c).filter((g) => daysUntil(g.expiry) <= 90).forEach((g) => out.push({ c, what: `${g.type} BG`, date: g.expiry, d: daysUntil(g.expiry) }));
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
      <DataTable noun="contracts" defaultCols={["title", "v", "val", "end", "s"]} extraColumns={LIST_EXTRA.contracts(st)} calendar={{ label: "Completion dates", date: (c) => c.end, title: (c) => c.title }} filters={<FilterSelect label="Status" value={status} onChange={setStatus} options={[{ value: "All", label: "All status" }, ...FO.contractStatus]} />} rows={rows} onRow={(c) => setOpen(c.id)} columns={[
        { key: "id", label: "Contract", className: "mono text-[12px] text-ink-soft" },
        { key: "title", label: "Title", className: "font-medium" },
        { key: "v", label: "Contractor", filterOptions: FO.contractors, filter: (x) => vendorName(st, x.vendorId), render: (c) => vendorName(st, c.vendorId) },
        { key: "type", label: "Type", filterOptions: FO.contractType, filter: true },
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
