// Labour rate management (rate cards, versioning, minimum-wage check) and
// contractor performance & progress tracking.

const REGIONS = ["Mumbai (Zone I)", "Pune (Zone II)", "Nashik (Zone III)"];
const SKILLS = ["Unskilled", "Semi-skilled", "Skilled", "Highly Skilled"];
const PROJECT_REGION = {
  "Skyline Towers - Phase 1": "Pune (Zone II)", "Metro Line Extension": "Mumbai (Zone I)", "400kV Transmission Line A": "Nashik (Zone III)",
  "Riverside Business Park": "Pune (Zone II)", "Solar Farm Substation": "Nashik (Zone III)",
};
const rateKey = (r) => `${r.trade}|${r.region}|${r.vendorId || ""}`;
const margin = (r) => (r.minWage ? ((r.rate - r.minWage) / r.minWage) * 100 : 0);

// Find the applicable card for a WO labour item (vendor-specific first, then standard)
function matchRate(st, wo, item) {
  const region = PROJECT_REGION[wo.project];
  const words = item.desc.toLowerCase();
  const act = st.laborRates.filter((r) => r.status === "Active" && r.region === region && r.trade.toLowerCase().split(/[ /]+/).some((w) => w.length > 3 && words.includes(w)));
  return act.find((r) => r.vendorId === wo.vendorId) || act.find((r) => !r.vendorId) || null;
}

function RateModal({ base, onClose }) {
  const st = useStore();
  const [f, setF] = y.useState(base ? { ...base, rate: base.rate, minWage: base.minWage, effectiveFrom: shiftDays(1), reason: "" }
    : { trade: "", skill: "", region: "", vendorId: "", minWage: "", rate: "", otMultiplier: 2, basis: "Per 8-hr man-day", effectiveFrom: todayISO(), reason: "" });
  const cur = base && st.laborRates.find((r) => r.status === "Active" && rateKey(r) === rateKey(base));
  const lrErr = {
    trade: VX.req(String(f.trade).trim()),
    skill: VX.req(f.skill, "Pick the skill category"),
    region: VX.req(f.region, "Pick the region / wage zone"),
    dupCard: !base && f.trade && st.laborRates.some((r) => ["Active", "Pending Approval"].includes(r.status) && rateKey(r) === rateKey({ ...f, trade: f.trade.trim(), vendorId: f.vendorId || null })) ? "A rate card for this trade, zone and contractor already exists - use Revise" : "",
    minWage: VX.num(f.minWage, { gt: 0, label: "Minimum wage" }),
    rate: VX.num(f.rate, { gt: 0, label: "Rate" }) || (Number(f.rate) < Number(f.minWage) ? "Billing rate can't be below the statutory minimum wage" : ""),
    ot: VX.num(f.otMultiplier, { min: 1, max: 3, label: "Overtime multiplier" }),
    from: VX.req(f.effectiveFrom) || (cur && f.effectiveFrom <= cur.effectiveFrom ? `Must be after the current version's start (${fmtDate(cur.effectiveFrom)})` : ""),
    reason: base ? VX.reason(f.reason) : "",
  };
  const ok = !VX.any(lrErr);
  return (
    <Modal open onClose={onClose} width={640} title={base ? `Revise rate - ${base.trade}, ${base.region}` : "New labour rate"} subtitle="New versions go for approval; the approved one supersedes the current card from its effective date"
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={!ok} onClick={() => {
        const id = nextId("LR", st.laborRates);
        const prev = st.laborRates.filter((r) => rateKey(r) === rateKey({ ...f, vendorId: f.vendorId || null }));
        setState((s) => s.laborRates.unshift({ id, trade: f.trade, skill: f.skill, region: f.region, vendorId: f.vendorId || null, minWage: Number(f.minWage), rate: Number(f.rate), otMultiplier: Number(f.otMultiplier) || 2, basis: f.basis, effectiveFrom: f.effectiveFrom, effectiveTo: null, status: "Pending Approval", version: Math.max(0, ...prev.map((p) => p.version)) + 1, reason: f.reason, createdBy: currentUser() }),
          { entity: "Labour Rate", id, action: `${base ? "Revision" : "New rate"} submitted - ${f.trade} @ ${inr(f.rate)}/day` });
        toast(`${id} sent for approval`); onClose();
      }}>Submit for approval</Btn></>}>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Trade" required span={2}><TextInput value={f.trade} onChange={(x) => setF({ ...f, trade: x })} disabled={!!base} placeholder="e.g. Plumber" /></Field>
        <Field label="Skill category" required><Select value={f.skill} placeholder="Select" onChange={(x) => setF({ ...f, skill: x })} options={SKILLS} disabled={!!base} /></Field>
        <Field label="Region / wage zone" required><Select value={f.region} placeholder="Select" onChange={(x) => setF({ ...f, region: x })} options={REGIONS} disabled={!!base} /></Field>
        <Field label="Applies to" span={2}><Select value={f.vendorId || ""} onChange={(x) => setF({ ...f, vendorId: x })} disabled={!!base} options={[{ value: "", label: "Standard schedule (all contractors)" }, ...contractorVendors(st).filter((v) => v.status === "Active").map((v) => ({ value: v.id, label: v.name }))]} /></Field>
        <Field label="Statutory minimum wage / day (₹)" required><NumInput value={f.minWage} onChange={(x) => setF({ ...f, minWage: x })} /><FieldErr m={f.minWage !== "" && lrErr.minWage} /></Field>
        <Field label="Billing rate / day (₹)" required hint={f.minWage && f.rate && !lrErr.rate ? `${margin(f).toFixed(1)}% over minimum wage` : ""}><NumInput value={f.rate} onChange={(x) => setF({ ...f, rate: x })} /><FieldErr m={f.rate !== "" && lrErr.rate} /></Field>
        <Field label="Overtime multiplier" hint="1 – 3"><NumInput value={f.otMultiplier} onChange={(x) => setF({ ...f, otMultiplier: x })} /><FieldErr m={lrErr.ot} /></Field>
        <Field label="Effective from"><DateInput value={f.effectiveFrom} onChange={(x) => setF({ ...f, effectiveFrom: x })} /><FieldErr m={lrErr.from} /></Field>
        <Field label={base ? "Reason for revision" : "Note"} required={!!base} span={2}><TextInput value={f.reason} onChange={(x) => setF({ ...f, reason: x })} placeholder="e.g. VDA notification w.e.f. 1 Oct" /></Field>
      </div>
      {lrErr.dupCard && <div className="mt-3"><Note tone="red">{lrErr.dupCard}</Note></div>}
    </Modal>
  );
}

function approveRate(r, approve) {
  if (!tryAct("Procurement Head", [r.createdBy], "labour-rate approval")) return false;
  setState((s) => {
    const x = byId(s.laborRates, r.id);
    if (!approve) { x.status = "Rejected"; return; }
    s.laborRates.filter((o) => o.id !== r.id && o.status === "Active" && rateKey(o) === rateKey(r)).forEach((o) => { o.status = "Superseded"; o.effectiveTo = shiftDays(-1, r.effectiveFrom); });
    x.status = "Active";
  }, { entity: "Labour Rate", id: r.id, action: approve ? `Approved - ${r.trade} ${inr(r.rate)}/day from ${fmtDate(r.effectiveFrom)}` : "Rejected" });
  toast(approve ? "Rate approved and active" : "Rate rejected", approve ? "green" : "red");
}

function LaborRatesPage() {
  const st = useStore();
  const [tab, setTab] = y.useState("cards");
  const [region, setRegion] = y.useState("All"), [skill, setSkill] = y.useState("All"), [src, setSrc] = y.useState("All");
  const [edit, setEdit] = y.useState(null), [openR, setOpenR] = y.useState(null);
  const active = st.laborRates.filter((r) => r.status === "Active");
  const filt = (list) => list.filter((r) => selMatch(region, r.region) && selMatch(skill, r.skill) && selAny(src, (x) => (x === "Standard" ? !r.vendorId : r.vendorId === x)));
  const pending = st.laborRates.filter((r) => r.status === "Pending Approval");
  const below = active.filter((r) => r.rate < r.minWage);
  const labourItems = st.workOrders.filter((w) => w.type === "Item-Rate" && w.status !== "Draft").flatMap((wo) => wo.items.filter((i) => i.unit === "man-day").map((i) => ({ wo, i, card: matchRate(st, wo, i) })));
  const rateFilters = <>
          <FilterSelect label="Region" value={region} onChange={setRegion} options={[{ value: "All", label: "All regions" }, ...REGIONS]} />
          <FilterSelect label="Skill" value={skill} onChange={setSkill} options={[{ value: "All", label: "All skills" }, ...SKILLS]} />
          <FilterSelect label="Source" value={src} onChange={setSrc} options={[{ value: "All", label: "Standard + contractor" }, { value: "Standard", label: "Standard only" }, ...contractorVendors(st).filter((v) => st.laborRates.some((r) => r.vendorId === v.id)).map((v) => ({ value: v.id, label: v.name }))]} />
        </>;
  const cols = [
    { key: "id", label: "Card", className: "mono text-[12px] text-ink-soft" },
    { key: "trade", label: "Trade", filterOptions: FO.labourTrades, filter: true, className: "font-medium" },
    { key: "skill", label: "Skill" },
    { key: "region", label: "Region" },
    { key: "v", label: "Applies to", opt: true, render: (r) => (r.vendorId ? vendorName(st, r.vendorId) : <span className="text-ink-mute">Standard</span>) },
    { key: "mw", label: "Min. wage", align: "right", num: true, render: (r) => inr(r.minWage) },
    { key: "rate", label: "Rate / day", align: "right", num: true, render: (r) => <b>{inr(r.rate)}</b> },
    { key: "m", label: "Margin", align: "right", render: (r) => (r.rate < r.minWage ? <Status tone="red">Below min. wage</Status> : <span className="num">{margin(r).toFixed(1)}%</span>) },
    { key: "ot", label: "OT", opt: true, align: "right", render: (r) => `${r.otMultiplier}×` },
    { key: "ef", label: "Effective", render: (r) => `${fmtDate(r.effectiveFrom)}${r.effectiveTo ? ` → ${fmtDate(r.effectiveTo)}` : ""}` },
    { key: "ver", label: "Ver.", opt: true, align: "center", render: (r) => `v${r.version}` },
  ];
  return (
    <Page title="Labour Rate Management" subtitle="Rate cards by trade, skill and wage zone - versioned, approved and checked against minimum wages" icon={Icon.hardHat}
      actions={<Btn variant="primary" icon={Icon.plus} onClick={() => setEdit({})}>New rate</Btn>}>
      <TabBar active={tab} onChange={setTab} tabs={[{ id: "cards", label: "Rate cards", icon: Icon.sheet }, { id: "pending", label: "Pending approval", icon: Icon.clipboardCheck }, { id: "check", label: "Work order rate check", icon: Icon.scale }, { id: "hist", label: "Revision history", icon: Icon.fileClock }]} />
      {tab === "cards" && <DataTable noun="rate cards" defaultCols={["trade", "skill", "region", "rate", "ef"]} filters={rateFilters} rows={filt(active)} onRow={(r) => setOpenR(r.id)} columns={[...cols, { key: "a", label: "", align: "right", render: (r) => <span onClick={(e) => e.stopPropagation()}><Btn size="sm" icon={Icon.pencil} onClick={() => setEdit(r)}>Revise</Btn></span> }]} />}
      {tab === "pending" && <DataTable noun="revisions" rows={pending} onRow={(r) => setOpenR(r.id)} empty={<EmptyState icon={Icon.check} title="No revisions awaiting approval" />} columns={[...cols,
        { key: "cur", label: "Current rate", align: "right", num: true, render: (r) => { const c = active.find((a) => rateKey(a) === rateKey(r)); return c ? <span>{inr(c.rate)} <span className={cls("text-[11px]", r.rate > c.rate ? "text-red-600" : "text-green-600")}>({r.rate > c.rate ? "+" : ""}{pct(r.rate - c.rate, c.rate)}%)</span></span> : "new"; } },
        { key: "why", label: "Reason", className: "whitespace-normal text-[12px] text-ink-soft", render: (r) => r.reason || "-" },
        { key: "a", label: "", align: "right", render: (r) => <span className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}><Btn size="sm" variant="success" onClick={() => approveRate(r, true)}>Approve</Btn><Btn size="sm" variant="danger" onClick={() => approveRate(r, false)}>Reject</Btn></span> }]} />}
      {tab === "check" && <DataTable noun="items" rows={labourItems} rowKey={(r) => r.wo.id + r.i.id} empty={<EmptyState icon={Icon.hardHat} title="No man-day items on work orders" />} columns={[
        { key: "wo", label: "Work order", filterOptions: FO.contractors, filter: (r) => vendorName(st, r.wo.vendorId), filterLabel: "Contractor", render: (r) => <span><span className="mono text-[12px]">{r.wo.id}</span> · {vendorName(st, r.wo.vendorId)}</span> },
        { key: "i", label: "Item", render: (r) => r.i.desc },
        { key: "reg", label: "Wage zone", filterOptions: FO.regions, filter: (r) => PROJECT_REGION[r.wo.project], render: (r) => PROJECT_REGION[r.wo.project] },
        { key: "wr", label: "WO rate", align: "right", num: true, render: (r) => inr(r.i.rate) },
        { key: "cr", label: "Rate card", align: "right", num: true, render: (r) => (r.card ? `${inr(r.card.rate)} (${r.card.id})` : "-") },
        { key: "mw", label: "Min. wage", align: "right", num: true, render: (r) => (r.card ? inr(r.card.minWage) : "-") },
        { key: "res", label: "Check", render: (r) => !r.card ? <Status tone="gray">No card</Status> : r.i.rate < r.card.minWage ? <Status tone="red">Below min. wage</Status> : r.i.rate > r.card.rate ? <Status tone="amber">{`Above card by ${pct(r.i.rate - r.card.rate, r.card.rate)}%`}</Status> : <Status tone="green">Within card</Status> },
        { key: "v", label: "Value at risk", align: "right", num: true, render: (r) => (r.card && r.i.rate > r.card.rate ? inr((r.i.rate - r.card.rate) * r.i.qty) : "-") },
      ]} />}
      {tab === "hist" && <DataTable noun="versions" filters={rateFilters} onRow={(r) => setOpenR(r.id)} rows={filt(st.laborRates).slice().sort((a, b) => rateKey(a).localeCompare(rateKey(b)) || b.version - a.version)} columns={[...cols, { key: "s", label: "Status", render: (r) => <Status>{r.status}</Status> }]} />}
      {edit && <RateModal base={edit.id ? edit : null} onClose={() => setEdit(null)} />}
      {openR && (() => {
        const r = byId(st.laborRates, openR); if (!r) return null;
        const versions = st.laborRates.filter((x) => rateKey(x) === rateKey(r)).sort((a, b) => b.version - a.version);
        return (
          <Drawer open onClose={() => setOpenR(null)} width={760} title={`${r.trade} - ${r.skill}`} recordId={r.id} status={<Status>{r.status}</Status>} details={[["Region", r.region], ["Vendor", r.vendorId ? vendorName(st, r.vendorId) : "Standard rate"], ["Version", `v${r.version}`]]}
           
            actions={r.status === "Pending Approval" ? <><Btn variant="danger" onClick={() => approveRate(r, false)}>Reject</Btn><Btn variant="success" icon={Icon.check} onClick={() => approveRate(r, true)}>Approve</Btn></>
              : r.status === "Active" && <Btn icon={Icon.pencil} onClick={() => { setOpenR(null); setEdit(r); }}>Revise</Btn>}>
            <div className="space-y-4 px-6 py-5">
              {r.rate < r.minWage && <Note tone="red">This rate is below the statutory minimum wage ({inr(r.minWage)}/day).</Note>}
              <div className="grid grid-cols-3 gap-3">
                <StatTile tone="blue" label="Rate / day" value={inr(r.rate)} icon={Icon.rupee} />
                <StatTile tone="purple" label="Minimum wage" value={inr(r.minWage)} icon={Icon.shieldCheck} />
                <StatTile tone={r.rate < r.minWage ? "red" : "green"} label="Margin" value={`${margin(r).toFixed(1)}%`} icon={Icon.trending} />
              </div>
              <Section title="Rate card" icon={Icon.sheet}>
                <KV items={[["Trade", r.trade], ["Skill", r.skill], ["Wage zone", r.region], ["Applies to", r.vendorId ? vendorName(st, r.vendorId) : "All contractors (standard)"],
                  ["Overtime", `${r.otMultiplier}× rate`], ["Effective", `${fmtDate(r.effectiveFrom)}${r.effectiveTo ? ` → ${fmtDate(r.effectiveTo)}` : " onwards"}`], ["Version", `v${r.version}`], ["Status", r.status], ["Reason", r.reason || "-"]]} />
              </Section>
              <Section title="Version history" icon={Icon.fileClock}>
                <DataTable dense rows={versions} onRow={(x) => setOpenR(x.id)} columns={[
                  { key: "v", label: "Version", render: (x) => <span className={cls(x.id === r.id && "font-semibold")}>v{x.version}</span> },
                  { key: "rate", label: "Rate / day", align: "right", num: true, render: (x) => inr(x.rate) },
                  { key: "ef", label: "Effective", render: (x) => `${fmtDate(x.effectiveFrom)}${x.effectiveTo ? ` → ${fmtDate(x.effectiveTo)}` : ""}` },
                  { key: "why", label: "Reason", className: "whitespace-normal text-[12px]", render: (x) => x.reason || "-" },
                  { key: "s", label: "Status", render: (x) => <Status>{x.status}</Status> },
                ]} />
              </Section>
            </div>
          </Drawer>
        );
      })()}
    </Page>
  );
}

// ---------------------------------------------------------------- performance & progress
const progressStatus = (p) => (p.spi >= 0.95 ? "On Track" : p.spi >= 0.8 ? "At Risk" : "Delayed");

function PlanVsActual({ rows }) {
  return (
    <div className="p-4">
      <div className="mb-3 flex items-center gap-4 text-[12px] text-ink-soft">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-gray-300" /> Planned (time elapsed)</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand" /> Physical (JMS-signed)</span>
      </div>
      <ul className="space-y-3">
        {rows.map(({ wo, p }) => (
          <li key={wo.id} className="grid grid-cols-[210px_1fr_110px] items-center gap-3 text-[12.5px]">
            <span className="truncate" title={wo.title}><span className="mono text-[11.5px] text-ink-mute">{wo.id}</span> {vendorName(getState(), wo.vendorId)}</span>
            <span className="space-y-[3px]">
              <span className="block h-2 rounded-r bg-gray-100" title={`Planned ${p.planned.toFixed(1)}%`}><span className="block h-full rounded-r bg-gray-300" style={{ width: `${Math.max(1, p.planned)}%` }} /></span>
              <span className="block h-2 rounded-r bg-gray-100" title={`Physical ${p.physical.toFixed(1)}%`}><span className="block h-full rounded-r bg-brand" style={{ width: `${Math.max(1, Math.min(100, p.physical))}%` }} /></span>
            </span>
            <span className="flex items-center justify-end gap-2"><span className="num text-ink">{p.physical.toFixed(0)}%</span><Status tone={{ "On Track": "green", "At Risk": "amber", Delayed: "red" }[progressStatus(p)]}>{progressStatus(p)}</Status></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PerformancePage() {
  const st = useStore();
  const [tab, setTab] = y.useState("progress");
  const [open, setOpen] = y.useState(null), [rate, setRate] = y.useState(null);
  const live = st.workOrders.filter((w) => ["Issued", "In Progress"].includes(w.status)).map((wo) => ({ wo, p: woProgress(st, wo) }));
  return (
    <Page title="Performance & Progress" subtitle="Planned vs physical vs financial progress per work order" icon={Icon.trending}
      actions={<Btn variant="primary" icon={Icon.star} onClick={() => setRate({})}>Rate contractor</Btn>}>
      <TabBar active={tab} onChange={setTab} tabs={[{ id: "progress", label: "Work order progress", icon: Icon.trending }, { id: "chart", label: "Planned vs actual", icon: Icon.chart }, { id: "dpr", label: "Daily progress", icon: Icon.calendar }, { id: "wbs", label: "Cost by WBS", icon: Icon.layers }]} />
      {tab === "progress" && <DataTable noun="work orders" rows={live} rowKey={(x) => x.wo.id} onRow={(x) => setOpen(x.wo.id)} columns={[
        { key: "id", label: "WO", className: "mono text-[12px] text-ink-soft", render: (x) => x.wo.id },
        { key: "t", label: "Scope", className: "max-w-[240px] truncate font-medium", render: (x) => <span title={x.wo.title}>{x.wo.title}</span> },
        { key: "v", label: "Contractor", filterOptions: FO.contractors, filter: (x) => vendorName(st, x.wo.vendorId), render: (x) => vendorName(st, x.wo.vendorId) },
        { key: "pl", label: "Planned", align: "right", num: true, render: (x) => `${x.p.planned.toFixed(1)}%` },
        { key: "ph", label: "Physical", render: (x) => <Progress value={Math.round(x.p.physical)} /> },
        { key: "fi", label: "Financial", render: (x) => <Progress value={Math.round(x.p.financial)} color="bg-violet-500" /> },
        { key: "spi", label: "SPI", align: "right", render: (x) => <span className={cls("num font-semibold", x.p.spi < 0.8 ? "text-red-600" : x.p.spi < 0.95 ? "text-amber-600" : "text-green-700")}>{x.p.spi.toFixed(2)}</span> },
        { key: "d", label: "Days left", align: "right", num: true, render: (x) => daysUntil(x.wo.end) },
        { key: "s", label: "Status", filterOptions: FO.progress, filter: (x) => progressStatus(x.p), render: (x) => <Status tone={{ "On Track": "green", "At Risk": "amber", Delayed: "red" }[progressStatus(x.p)]}>{progressStatus(x.p)}</Status> },
      ]} />}
      {tab === "chart" && <PlanVsActual rows={live} />}
      {tab === "dpr" && <DprTab />}
      {tab === "wbs" && <WbsCostTab />}
      {open && <WorkOrderDrawer id={open} onClose={() => setOpen(null)} />}
      <RatePerformanceModal open={!!rate} vendorId={rate?.vendorId} onClose={() => setRate(null)} />
    </Page>
  );
}
