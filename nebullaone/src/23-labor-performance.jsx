// Labour rate management (rate cards, versioning, minimum-wage check) and
// contractor performance & progress tracking.

const REGIONS = ["Mumbai (Zone I)", "Pune (Zone II)", "Nashik (Zone III)"];
const SKILLS = ["Unskilled", "Semi-skilled", "Skilled", "Highly Skilled"];
const PROJECT_REGION = {
  "Skyline Towers — Phase 1": "Pune (Zone II)", "Metro Line Extension": "Mumbai (Zone I)", "400kV Transmission Line A": "Nashik (Zone III)",
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
    : { trade: "", skill: "Skilled", region: REGIONS[0], vendorId: "", minWage: "", rate: "", otMultiplier: 2, basis: "Per 8-hr man-day", effectiveFrom: todayISO(), reason: "" });
  const ok = f.trade && f.minWage > 0 && f.rate > 0 && f.effectiveFrom && (!base || f.reason);
  return (
    <Modal open onClose={onClose} width={640} title={base ? `Revise rate — ${base.trade}, ${base.region}` : "New labour rate"} subtitle="New versions go for approval; the approved one supersedes the current card from its effective date"
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={!ok} onClick={() => {
        const id = nextId("LR", st.laborRates);
        const prev = st.laborRates.filter((r) => rateKey(r) === rateKey({ ...f, vendorId: f.vendorId || null }));
        setState((s) => s.laborRates.unshift({ id, trade: f.trade, skill: f.skill, region: f.region, vendorId: f.vendorId || null, minWage: Number(f.minWage), rate: Number(f.rate), otMultiplier: Number(f.otMultiplier) || 2, basis: f.basis, effectiveFrom: f.effectiveFrom, effectiveTo: null, status: "Pending Approval", version: Math.max(0, ...prev.map((p) => p.version)) + 1, reason: f.reason }),
          { entity: "Labour Rate", id, action: `${base ? "Revision" : "New rate"} submitted — ${f.trade} @ ${inr(f.rate)}/day` });
        toast(`${id} sent for approval`); onClose();
      }}>Submit for approval</Btn></>}>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Trade" required span={2}><TextInput value={f.trade} onChange={(x) => setF({ ...f, trade: x })} disabled={!!base} placeholder="e.g. Plumber" /></Field>
        <Field label="Skill category"><Select value={f.skill} onChange={(x) => setF({ ...f, skill: x })} options={SKILLS} disabled={!!base} /></Field>
        <Field label="Region / wage zone"><Select value={f.region} onChange={(x) => setF({ ...f, region: x })} options={REGIONS} disabled={!!base} /></Field>
        <Field label="Applies to" span={2}><Select value={f.vendorId || ""} onChange={(x) => setF({ ...f, vendorId: x })} disabled={!!base} options={[{ value: "", label: "Standard schedule (all contractors)" }, ...contractorVendors(st).filter((v) => v.status === "Active").map((v) => ({ value: v.id, label: v.name }))]} /></Field>
        <Field label="Statutory minimum wage / day (₹)" required><NumInput value={f.minWage} onChange={(x) => setF({ ...f, minWage: x })} /></Field>
        <Field label="Billing rate / day (₹)" required hint={f.minWage && f.rate ? `${margin(f).toFixed(1)}% over minimum wage` : ""}><NumInput value={f.rate} onChange={(x) => setF({ ...f, rate: x })} /></Field>
        <Field label="Overtime multiplier"><NumInput value={f.otMultiplier} onChange={(x) => setF({ ...f, otMultiplier: x })} /></Field>
        <Field label="Effective from"><DateInput value={f.effectiveFrom} onChange={(x) => setF({ ...f, effectiveFrom: x })} /></Field>
        <Field label={base ? "Reason for revision" : "Note"} required={!!base} span={2}><TextInput value={f.reason} onChange={(x) => setF({ ...f, reason: x })} placeholder="e.g. VDA notification w.e.f. 1 Oct" /></Field>
      </div>
      {f.minWage > 0 && f.rate > 0 && f.rate < f.minWage && <div className="mt-3"><Note tone="red">Billing rate is below the statutory minimum wage — this card will be flagged non-compliant.</Note></div>}
    </Modal>
  );
}

function approveRate(r, approve) {
  setState((s) => {
    const x = byId(s.laborRates, r.id);
    if (!approve) { x.status = "Rejected"; return; }
    s.laborRates.filter((o) => o.id !== r.id && o.status === "Active" && rateKey(o) === rateKey(r)).forEach((o) => { o.status = "Superseded"; o.effectiveTo = shiftDays(-1, r.effectiveFrom); });
    x.status = "Active";
  }, { entity: "Labour Rate", id: r.id, action: approve ? `Approved — ${r.trade} ${inr(r.rate)}/day from ${fmtDate(r.effectiveFrom)}` : "Rejected" });
  toast(approve ? "Rate approved and active" : "Rate rejected", approve ? "green" : "red");
}

function LaborRatesPage() {
  const st = useStore();
  const [tab, setTab] = y.useState("cards");
  const [region, setRegion] = y.useState("All"), [skill, setSkill] = y.useState("All"), [src, setSrc] = y.useState("All");
  const [edit, setEdit] = y.useState(null);
  const active = st.laborRates.filter((r) => r.status === "Active");
  const filt = (list) => list.filter((r) => (region === "All" || r.region === region) && (skill === "All" || r.skill === skill) && (src === "All" || (src === "Standard" ? !r.vendorId : r.vendorId === src)));
  const pending = st.laborRates.filter((r) => r.status === "Pending Approval");
  const below = active.filter((r) => r.rate < r.minWage);
  const labourItems = st.workOrders.filter((w) => w.type === "Item-Rate" && w.status !== "Draft").flatMap((wo) => wo.items.filter((i) => i.unit === "man-day").map((i) => ({ wo, i, card: matchRate(st, wo, i) })));
  const cols = [
    { key: "id", label: "Card", className: "mono text-[12px] text-ink-soft" },
    { key: "trade", label: "Trade", className: "font-medium" },
    { key: "skill", label: "Skill" },
    { key: "region", label: "Region" },
    { key: "v", label: "Applies to", render: (r) => (r.vendorId ? vendorName(st, r.vendorId) : <span className="text-ink-mute">Standard</span>) },
    { key: "mw", label: "Min. wage", align: "right", num: true, render: (r) => inr(r.minWage) },
    { key: "rate", label: "Rate / day", align: "right", num: true, render: (r) => <b>{inr(r.rate)}</b> },
    { key: "m", label: "Margin", align: "right", render: (r) => (r.rate < r.minWage ? <Status tone="red">Below min. wage</Status> : <span className="num">{margin(r).toFixed(1)}%</span>) },
    { key: "ot", label: "OT", align: "right", render: (r) => `${r.otMultiplier}×` },
    { key: "ef", label: "Effective", render: (r) => `${fmtDate(r.effectiveFrom)}${r.effectiveTo ? ` → ${fmtDate(r.effectiveTo)}` : ""}` },
    { key: "ver", label: "Ver.", align: "center", render: (r) => `v${r.version}` },
  ];
  return (
    <Page title="Labour Rate Management" subtitle="Rate cards by trade, skill and wage zone — versioned, approved and checked against minimum wages" icon={Icon.hardHat}
      actions={<Btn variant="primary" icon={Icon.plus} onClick={() => setEdit({})}>New rate</Btn>}>
      <StatGrid>
        <StatTile tone="blue" label="Active rate cards" value={active.length} sub={`${active.filter((r) => r.vendorId).length} contractor-specific`} icon={Icon.sheet} />
        <StatTile tone="amber" label="Pending approval" value={pending.length} icon={Icon.clipboardCheck} />
        <StatTile tone="red" label="Below minimum wage" value={below.length} sub="Statutory risk" icon={Icon.warning} />
        <StatTile tone="green" label="Avg. margin over min. wage" value={`${(sum(active, margin) / (active.length || 1)).toFixed(1)}%`} icon={Icon.trending} />
      </StatGrid>
      <TabBar active={tab} onChange={setTab} tabs={[{ id: "cards", label: "Rate cards", icon: Icon.sheet }, { id: "pending", label: `Pending approval (${pending.length})`, icon: Icon.clipboardCheck }, { id: "check", label: "Work order rate check", icon: Icon.scale }, { id: "hist", label: "Revision history", icon: Icon.fileClock }]} />
      {(tab === "cards" || tab === "hist") && (
        <Toolbar left={<>
          <FilterSelect label="Region" value={region} onChange={setRegion} options={[{ value: "All", label: "All regions" }, ...REGIONS]} />
          <FilterSelect label="Skill" value={skill} onChange={setSkill} options={[{ value: "All", label: "All skills" }, ...SKILLS]} />
          <FilterSelect label="Source" value={src} onChange={setSrc} options={[{ value: "All", label: "Standard + contractor" }, { value: "Standard", label: "Standard only" }, ...contractorVendors(st).filter((v) => st.laborRates.some((r) => r.vendorId === v.id)).map((v) => ({ value: v.id, label: v.name }))]} />
        </>} />
      )}
      {tab === "cards" && <DataTable rows={filt(active)} columns={[...cols, { key: "a", label: "", align: "right", render: (r) => <Btn size="sm" icon={Icon.pencil} onClick={() => setEdit(r)}>Revise</Btn> }]} />}
      {tab === "pending" && <DataTable rows={pending} empty={<EmptyState icon={Icon.check} title="No revisions awaiting approval" />} columns={[...cols,
        { key: "cur", label: "Current rate", align: "right", num: true, render: (r) => { const c = active.find((a) => rateKey(a) === rateKey(r)); return c ? <span>{inr(c.rate)} <span className={cls("text-[11px]", r.rate > c.rate ? "text-red-600" : "text-green-600")}>({r.rate > c.rate ? "+" : ""}{pct(r.rate - c.rate, c.rate)}%)</span></span> : "new"; } },
        { key: "why", label: "Reason", className: "whitespace-normal text-[12px] text-ink-soft", render: (r) => r.reason || "—" },
        { key: "a", label: "", align: "right", render: (r) => <span className="flex justify-end gap-1"><Btn size="sm" variant="success" onClick={() => approveRate(r, true)}>Approve</Btn><Btn size="sm" variant="danger" onClick={() => approveRate(r, false)}>Reject</Btn></span> }]} />}
      {tab === "check" && <DataTable rows={labourItems} rowKey={(r) => r.wo.id + r.i.id} empty={<EmptyState icon={Icon.hardHat} title="No man-day items on work orders" />} columns={[
        { key: "wo", label: "Work order", render: (r) => <span><span className="mono text-[12px]">{r.wo.id}</span> · {vendorName(st, r.wo.vendorId)}</span> },
        { key: "i", label: "Item", render: (r) => r.i.desc },
        { key: "reg", label: "Wage zone", render: (r) => PROJECT_REGION[r.wo.project] },
        { key: "wr", label: "WO rate", align: "right", num: true, render: (r) => inr(r.i.rate) },
        { key: "cr", label: "Rate card", align: "right", num: true, render: (r) => (r.card ? `${inr(r.card.rate)} (${r.card.id})` : "—") },
        { key: "mw", label: "Min. wage", align: "right", num: true, render: (r) => (r.card ? inr(r.card.minWage) : "—") },
        { key: "res", label: "Check", render: (r) => !r.card ? <Status tone="gray">No card</Status> : r.i.rate < r.card.minWage ? <Status tone="red">Below min. wage</Status> : r.i.rate > r.card.rate ? <Status tone="amber">{`Above card by ${pct(r.i.rate - r.card.rate, r.card.rate)}%`}</Status> : <Status tone="green">Within card</Status> },
        { key: "v", label: "Value at risk", align: "right", num: true, render: (r) => (r.card && r.i.rate > r.card.rate ? inr((r.i.rate - r.card.rate) * r.i.qty) : "—") },
      ]} />}
      {tab === "hist" && <DataTable rows={filt(st.laborRates).slice().sort((a, b) => rateKey(a).localeCompare(rateKey(b)) || b.version - a.version)} columns={[...cols, { key: "s", label: "Status", render: (r) => <Status>{r.status}</Status> }]} />}
      {edit && <RateModal base={edit.id ? edit : null} onClose={() => setEdit(null)} />}
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
  const [open, setOpen] = y.useState(null), [rate, setRate] = y.useState(null), [vd, setVd] = y.useState(null);
  const live = st.workOrders.filter((w) => ["Issued", "In Progress"].includes(w.status)).map((wo) => ({ wo, p: woProgress(st, wo) }));
  const contractors = contractorVendors(st).filter((v) => st.workOrders.some((w) => w.vendorId === v.id));
  const cRow = (v) => {
    const wos = st.workOrders.filter((w) => w.vendorId === v.id);
    const pr = wos.map((w) => woProgress(st, w));
    const rt = st.ratings.filter((r) => r.vendorId === v.id);
    const avg = (k) => (rt.length ? sum(rt, (r) => r[k]) / rt.length : null);
    const mbs = st.measurements.filter((m) => wos.some((w) => w.id === m.woId));
    return { v, wos, value: sum(pr, (p) => p.value), physical: pr.length ? (sum(pr, (p) => p.measured) / (sum(pr, (p) => p.value) || 1)) * 100 : 0,
      spi: pr.length ? sum(pr, (p) => Math.min(1.2, p.spi)) / pr.length : 1, quality: avg("quality"), safety: avg("safety"), manpower: avg("manpower"),
      incidents: sum(rt, (r) => r.incidents || 0), disputes: mbs.length ? pct(mbs.filter((m) => m.jms.status === "Disputed").length, mbs.length) : 0,
      score: vendorScore(st, v.id).score, caps: st.caps.filter((c) => c.vendorId === v.id && c.status === "Open").length };
  };
  const rowsC = contractors.map(cRow);
  const stars = (x) => (x == null ? <span className="text-ink-faint">—</span> : <span className="flex items-center gap-1"><Stars value={Math.round(x)} /><span className="num text-[11.5px] text-ink-mute">{x.toFixed(1)}</span></span>);
  return (
    <Page title="Performance & Progress" subtitle="Planned vs physical vs financial progress per work order, and contractor scorecards" icon={Icon.trending}
      actions={<Btn variant="primary" icon={Icon.star} onClick={() => setRate({})}>Rate contractor</Btn>}>
      <StatGrid cols={5}>
        <StatTile tone="blue" label="Live work orders" value={live.length} sub={inrShort(sum(live, (x) => x.p.value))} icon={Icon.clipboardList} />
        <StatTile tone="green" label="On track" value={live.filter((x) => progressStatus(x.p) === "On Track").length} sub="SPI ≥ 0.95" icon={Icon.check} />
        <StatTile tone="amber" label="At risk" value={live.filter((x) => progressStatus(x.p) === "At Risk").length} sub="SPI 0.80–0.95" icon={Icon.warning} />
        <StatTile tone="red" label="Delayed" value={live.filter((x) => progressStatus(x.p) === "Delayed").length} sub="SPI < 0.80" icon={Icon.clock} />
        <StatTile tone="purple" label="Work done, unbilled" value={inrShort(sum(live, (x) => x.p.measured - x.p.billed))} icon={Icon.fileClock} />
      </StatGrid>
      <TabBar active={tab} onChange={setTab} tabs={[{ id: "progress", label: "Work order progress", icon: Icon.trending }, { id: "chart", label: "Planned vs actual", icon: Icon.chart }, { id: "score", label: "Contractor scorecard", icon: Icon.gauge }, { id: "log", label: `Ratings log (${st.ratings.length})`, icon: Icon.star }]} />
      {tab === "progress" && <DataTable rows={live} rowKey={(x) => x.wo.id} onRow={(x) => setOpen(x.wo.id)} columns={[
        { key: "id", label: "WO", className: "mono text-[12px] text-ink-soft", render: (x) => x.wo.id },
        { key: "t", label: "Scope", className: "max-w-[240px] truncate font-medium", render: (x) => <span title={x.wo.title}>{x.wo.title}</span> },
        { key: "v", label: "Contractor", render: (x) => vendorName(st, x.wo.vendorId) },
        { key: "pl", label: "Planned", align: "right", num: true, render: (x) => `${x.p.planned.toFixed(1)}%` },
        { key: "ph", label: "Physical", render: (x) => <Progress value={Math.round(x.p.physical)} /> },
        { key: "fi", label: "Financial", render: (x) => <Progress value={Math.round(x.p.financial)} color="bg-violet-500" /> },
        { key: "spi", label: "SPI", align: "right", render: (x) => <span className={cls("num font-semibold", x.p.spi < 0.8 ? "text-red-600" : x.p.spi < 0.95 ? "text-amber-600" : "text-green-700")}>{x.p.spi.toFixed(2)}</span> },
        { key: "d", label: "Days left", align: "right", num: true, render: (x) => daysUntil(x.wo.end) },
        { key: "s", label: "Status", render: (x) => <Status tone={{ "On Track": "green", "At Risk": "amber", Delayed: "red" }[progressStatus(x.p)]}>{progressStatus(x.p)}</Status> },
      ]} />}
      {tab === "chart" && <PlanVsActual rows={live} />}
      {tab === "score" && <DataTable rows={rowsC} rowKey={(r) => r.v.id} onRow={(r) => setVd(r.v.id)} columns={[
        { key: "n", label: "Contractor", render: (r) => <span className="font-medium">{r.v.name}</span> },
        { key: "w", label: "WOs", align: "center", render: (r) => r.wos.length },
        { key: "val", label: "Value", align: "right", num: true, render: (r) => inrShort(r.value) },
        { key: "ph", label: "Physical", render: (r) => <Progress value={Math.round(r.physical)} /> },
        { key: "spi", label: "Avg SPI", align: "right", render: (r) => <span className="num">{r.spi.toFixed(2)}</span> },
        { key: "q", label: "Quality", render: (r) => stars(r.quality) },
        { key: "sf", label: "Safety", render: (r) => stars(r.safety) },
        { key: "mp", label: "Manpower", render: (r) => stars(r.manpower) },
        { key: "inc", label: "Incidents", align: "center", render: (r) => (r.incidents ? <span className="font-semibold text-red-600">{r.incidents}</span> : "0") },
        { key: "dis", label: "JMS disputes", align: "right", render: (r) => `${r.disputes}%` },
        { key: "sc", label: "Score", render: (r) => <ScoreBadge value={r.score} /> },
        { key: "cap", label: "", render: (r) => (r.caps ? <Status tone="amber">{`${r.caps} open CAP`}</Status> : null) },
        { key: "a", label: "", align: "right", render: (r) => <Btn size="sm" icon={Icon.star} onClick={(e) => { e.stopPropagation(); setRate({ vendorId: r.v.id }); }}>Rate</Btn> },
      ]} />}
      {tab === "log" && <DataTable rows={st.ratings.slice().reverse()} columns={[
        { key: "p", label: "Period", render: (r) => r.period }, { key: "v", label: "Contractor", render: (r) => <span className="font-medium">{vendorName(st, r.vendorId)}</span> },
        { key: "w", label: "WO", className: "mono text-[12px]", render: (r) => r.woId || "—" },
        { key: "q", label: "Quality", render: (r) => <Stars value={r.quality} /> }, { key: "s", label: "Safety", render: (r) => <Stars value={r.safety} /> }, { key: "m", label: "Manpower", render: (r) => <Stars value={r.manpower} /> },
        { key: "i", label: "Incidents", align: "center", render: (r) => r.incidents || 0 },
        { key: "r", label: "Remarks", className: "whitespace-normal text-[12px] text-ink-soft", render: (r) => r.remarks },
        { key: "b", label: "By", render: (r) => r.by },
      ]} />}
      {open && <WorkOrderDrawer id={open} onClose={() => setOpen(null)} />}
      {vd && <VendorDrawer vendorId={vd} initialTab="activity" onClose={() => setVd(null)} />}
      <RatePerformanceModal open={!!rate} vendorId={rate?.vendorId} onClose={() => setRate(null)} />
    </Page>
  );
}
