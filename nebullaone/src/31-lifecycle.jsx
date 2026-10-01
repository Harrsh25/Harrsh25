// Lifecycle frame: the A → F stages (Onboarding → Sourcing → Commitment → Execution → Bill & Pay →
// Closure) with the cross-cutting services that are always on. Every page shows where it sits in
// the lifecycle and the next step; the Lifecycle Map shows live counts and the gate between stages.
// Cross-cutting pages: Notifications, Integrations and the vendor / contract state machines.

const ADMIN_PATH = (p) => `/productivity/administration/${p}`;
const LIFECYCLE = [
  { key: "A", label: "A · Onboarding", short: "Onboarding", icon: Icon.userPlus, tone: "blue",
    flow: "Registration → Qualification → Approval → Master", gate: "Vendor status + qualification valid" },
  { key: "B", label: "B · Sourcing", short: "Sourcing", icon: Icon.scale, tone: "purple",
    flow: "Requirement → RFQ → Quotation → Evaluation & award (or direct award / rate contract)", gate: "Requirement approved · vendor passes the sourcing gate (compliance, scorecard, requalification)" },
  { key: "C", label: "C · Commitment", short: "Commitment", icon: Icon.file, tone: "cyan",
    flow: "PO / Contract / Work order + securities (advance, PBG, retention)", gate: "Award approved · contractor spend-authorized and qualified · PBG on file before signing" },
  { key: "D", label: "D · Execution", short: "Execution", icon: Icon.hardHat, tone: "orange",
    flow: "Goods: delivery → GRN → QC → returns · Works: labour, material, Q&S → measurement → progress cert · overlays: variations", gate: "PO issued / contract signed / work order accepted · background check clear" },
  { key: "E", label: "E · Bill & Pay", short: "Bill & Pay", icon: Icon.receipt, tone: "green",
    flow: "Invoice / RA bill → match / verify → approval → payment (per cycle)", gate: "Receipt or measurement certified · 3-way match · no hold · bank verified" },
  { key: "F", label: "F · Closure", short: "Closure", icon: Icon.folderCheck, tone: "amber",
    flow: "Completion → final settlement → handover → DLP / warranty → retention & PBG release → contractor release → closed (alt: termination → encashment → final account → blacklist?)", gate: "Feeds performance / requalification → gates B & C" },
];
const stageOf = (k) => LIFECYCLE.find((s) => s.key === k);
const pageTo = (p) => `${p.base}/${p.path}`;

// Strip under every page header: the six stages, this page's step and the next one
function StageFlow() {
  const loc = Ht(), st = useStore();
  const pg = NXV_PAGES.find((p) => loc.pathname === pageTo(p));
  if (!pg) return null;
  const inStage = NXV_PAGES.filter((p) => p.stage === pg.stage), i = inStage.indexOf(pg);
  const si = LIFECYCLE.findIndex((s) => s.key === pg.stage);
  const nextStage = si >= 0 && si < LIFECYCLE.length - 1 ? LIFECYCLE[si + 1] : null;
  const next = si < 0 ? null : inStage[i + 1] || (nextStage && NXV_PAGES.find((p) => p.stage === nextStage.key));
  const prev = si < 0 ? null : inStage[i - 1] || (si > 0 && NXV_PAGES.filter((p) => p.stage === LIFECYCLE[si - 1].key).slice(-1)[0]);
  const unread = notificationsOf(st).filter((n) => !(st.notifRead || {})[n.id]).length;
  return (
    <div data-stageflow className="flex flex-wrap items-center gap-1 border-b border-line bg-gray-50/70 px-4 py-1.5 text-[11.5px]">
      <RouterLink to={ADMIN_PATH("lifecycle")} className={cls("mr-1 rounded px-1.5 py-0.5 font-medium", pg.path === "lifecycle" ? "bg-brand text-white" : "text-ink-soft hover:bg-white")}>Lifecycle</RouterLink>
      {LIFECYCLE.map((s, k) => {
        const first = NXV_PAGES.find((p) => p.stage === s.key);
        return (
          <span key={s.key} className="flex items-center gap-1">
            <RouterLink to={pageTo(first)} title={`${s.flow}\nGate into the next stage: ${s.gate}`}
              className={cls("rounded px-1.5 py-0.5", s.key === pg.stage ? "bg-brand-soft font-semibold text-brand ring-1 ring-brand/30" : k < si ? "text-green-700 hover:bg-white" : "text-ink-soft hover:bg-white")}>{s.label}</RouterLink>
            {k < LIFECYCLE.length - 1 && <span className="text-ink-mute">›</span>}
          </span>
        );
      })}
      {pg.stage === "X" && <span className="ml-1 rounded bg-white px-1.5 py-0.5 text-ink-mute ring-1 ring-line">{pg.group} — always on</span>}
      <span className="ml-auto flex items-center gap-2">
        {si >= 0 && <span className="text-ink-mute">Step {i + 1} of {inStage.length}</span>}
        {prev && <RouterLink to={pageTo(prev)} className="rounded px-1.5 py-0.5 text-ink-soft hover:bg-white">← {prev.label}</RouterLink>}
        {next && <RouterLink data-next-step to={pageTo(next)} title={next.stage !== pg.stage ? `Gate: ${stageOf(pg.stage).gate}` : ""} className="rounded bg-white px-2 py-0.5 font-medium text-brand ring-1 ring-brand/30 hover:bg-brand-soft">Next step: {next.stage !== pg.stage ? `${stageOf(next.stage).label} — ` : ""}{next.label} →</RouterLink>}
        <RouterLink to={ADMIN_PATH("notifications")} title="Notifications" className={cls("flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-white", unread ? "text-amber-700" : "text-ink-mute")}>{h(Icon.alert, { size: 12 })}{unread}</RouterLink>
      </span>
    </div>
  );
}

// ---------------------------------------------------------------- lifecycle map
function lifecycleCounts(st) {
  const v = st.vendors, cs = st.contracts;
  const gateFail = v.filter((x) => x.status === "Active" && (sourcingGate(st, x, "po").block || (x.isContractor && ["Not qualified", "Expired", "Requalification required"].includes(qualStatus(x).status))));
  const rfqOpen = st.rfqs.filter((r) => ["Draft", "Sent", "Quotes Received", "Partially Awarded"].includes(r.status));
  const das = st.directAwards || [];
  const dlp = cs.filter((c) => c.status !== "Closed" && contractStatus(c) === "In DLP");
  return {
    A: [["Pending approval", v.filter((x) => ["Pending Approval", "Changes Requested"].includes(x.status)).length, `${VM_BASE}/approvals`],
      ["Contractors onboarding", v.filter((x) => (x.isContractor || x.type === "Labor") && x.status === "Active" && onboardingStage(x) !== "Onboarded").length, `${CL_BASE}/onboarding`],
      ["Active vendors", v.filter((x) => x.status === "Active").length, `${VM_BASE}/registry`],
      ["Failing the gate", gateFail.length, `${VM_BASE}/requalification`]],
    B: [["Requisitions to source", (st.requisitions || []).filter((r) => ["Submitted", "Approved"].includes(r.status) && reqOrdered(st, r).pctOrdered < 100).length, `${VM_BASE}/requisitions`],
      ["Open RFQs", rfqOpen.length, `${VM_BASE}/rfq`],
      ["Direct awards pending", das.filter((d) => ["Pending Approval", "Approved"].includes(d.status)).length, `${VM_BASE}/direct-awards`],
      ["Active rate contracts", st.blanketOrders.filter((b) => blanketStatus(st, b) === "Active").length, `${VM_BASE}/blanket-orders`]],
    C: [["POs awaiting approval", st.purchaseOrders.filter((p) => p.status === "Draft").length, `${VM_BASE}/purchase-orders`],
      ["Open POs", st.purchaseOrders.filter((p) => ["Issued", "Partially Received"].includes(poStatus(p))).length, `${VM_BASE}/purchase-orders`],
      ["Contracts to approve / sign", cs.filter((c) => ["Pending Approval", "Approved"].includes(c.status)).length, `${CL_BASE}/contracts`],
      ["Live work orders", st.workOrders.filter((w) => ["Issued", "In Progress"].includes(w.status)).length, `${CL_BASE}/work-orders`]],
    D: [["GRNs (30 days)", goodsReceiptRows(st).filter((r) => daysUntil(r.date) >= -30).length, `${VM_BASE}/goods-receipts`],
      ["Measurements awaiting JMS", st.measurements.filter((m) => m.jms.status !== "Signed" && !m.voided).length, `${CL_BASE}/measurement-book`],
      ["Variations pending", cs.flatMap((c) => c.changeOrders || []).filter((o) => o.status === "Pending").length, `${CL_BASE}/change-orders`],
      ["Open NCRs", (st.ncrs || []).filter((n) => n.status !== "Closed").length, `${CL_BASE}/performance`]],
    E: [["Bills unpaid", st.invoices.filter((i) => ["Unpaid", "Partially Paid", "Overdue"].includes(invoiceStatus(i))).length, `${VM_BASE}/invoices`],
      ["Overdue", st.invoices.filter((i) => invoiceStatus(i) === "Overdue").length, `${VM_BASE}/invoices`],
      ["RA bills in certification", st.raBills.filter((b) => !["Paid", "Rejected", "Draft"].includes(b.status)).length, `${CL_BASE}/ra-bills`],
      ["Active holds", holdRows(st).length, `${VM_BASE}/holds`]],
    F: [["In close-out", cs.filter((c) => ["Active", "Terminated"].includes(c.status) && c.handover || c.status === "Terminated").length, `${CL_BASE}/closeout`],
      ["In DLP", dlp.length, `${CL_BASE}/dlp-warranty`],
      ["Settlements open", cs.filter((c) => c.status !== "Closed" && settlementReady(st, c) && c.settlement?.status !== "Agreed").length, `${CL_BASE}/final-settlement`],
      ["To requalify", requalQueue(st).length, `${VM_BASE}/requalification`]],
  };
}
const CROSS_CUTTING = () => [
  ["Configuration / Rules", "settings", VM_BASE, Icon.settings], ["Approval Engine", "approvals/approval-management", "/productivity", Icon.clipboardCheck],
  ["Vendor State Machine", "state-machines", "/productivity/administration", Icon.branch], ["Contract State Machine", "state-machines?m=contract", "/productivity/administration", Icon.branch],
  ["Documents & Expiry", "compliance", VM_BASE, Icon.fileClock], ["Performance Scoring", "scorecard", VM_BASE, Icon.gauge], ["Audit", "audit-log", "/productivity/administration", Icon.book],
  ["Notifications", "notifications", "/productivity/administration", Icon.alert], ["Vendor Portal", "portal", VM_BASE, Icon.globe], ["Integrations", "integrations", "/productivity/administration", Icon.network],
];
function LifecycleMapPage() {
  const st = useStore(), nav = useNavigate();
  const counts = lifecycleCounts(st);
  const unread = notificationsOf(st).filter((n) => !(st.notifRead || {})[n.id]).length;
  const intErr = (st.integrations || []).filter((c) => c.enabled && c.status === "Error").length;
  return (
    <Page title="Lifecycle Map" subtitle="Vendor & contract lifecycle from onboarding to closure — live counts, the gate between stages and every screen in order" icon={Icon.branch}>
      <div className="space-y-3 p-4">
        <Section title="Cross-cutting — always on" icon={Icon.layers}>
          <div className="flex flex-wrap gap-1.5 p-3">
            {CROSS_CUTTING().map(([label, path, base, icon]) => (
              <RouterLink key={label} to={`${base}/${path}`} className="flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-[12px] text-ink-soft hover:border-brand hover:text-brand">
                {h(icon, { size: 13 })}{label}
                {label === "Notifications" && unread > 0 && <span className="rounded-full bg-amber-100 px-1.5 text-[10.5px] font-semibold text-amber-700">{unread}</span>}
                {label === "Integrations" && intErr > 0 && <span className="rounded-full bg-red-100 px-1.5 text-[10.5px] font-semibold text-red-700">{intErr}</span>}
              </RouterLink>
            ))}
          </div>
        </Section>
        {LIFECYCLE.map((s, k) => (
          <div key={s.key}>
            <Section title={s.label} icon={s.icon} actions={<span className="max-w-[560px] truncate text-[11.5px] text-ink-mute" title={s.flow}>{s.flow}</span>}>
              <div className="grid grid-cols-[1fr_340px] gap-3 p-3">
                <ol className="flex flex-wrap items-center gap-1.5">
                  {NXV_PAGES.filter((p) => p.stage === s.key).map((p, n, arr) => (
                    <li key={p.path} className="flex items-center gap-1.5">
                      <RouterLink to={pageTo(p)} className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-ink hover:border-brand hover:text-brand">
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-gray-100 text-[10.5px] text-ink-soft">{n + 1}</span>{p.label}
                      </RouterLink>
                      {n < arr.length - 1 && <span className="text-ink-mute">→</span>}
                    </li>
                  ))}
                </ol>
                <div className="grid grid-cols-2 gap-1.5">
                  {counts[s.key].map(([label, value, to]) => (
                    <button key={label} type="button" onClick={() => nav(to)} className="flex items-center justify-between rounded-md border border-line bg-gray-50/60 px-2.5 py-1.5 text-left text-[12px] hover:border-brand">
                      <span className="text-ink-soft">{label}</span><b className="num text-ink">{value}</b>
                    </button>
                  ))}
                </div>
              </div>
            </Section>
            {k < LIFECYCLE.length - 1 && (
              <div className="flex items-center gap-2 py-1 pl-6 text-[11.5px] text-ink-mute">
                <span className="text-[14px] leading-none">↓</span><span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-800 ring-1 ring-amber-200">gate</span>{s.gate}
              </div>
            )}
          </div>
        ))}
        <Note tone="blue" icon={Icon.refresh}>F · Closure feeds back: the closing performance evaluation goes into the Vendor Scorecard, and a poor evaluation or a termination marks the vendor for requalification — new RFQs, POs, contracts and work orders stop until it is re-assessed (Procurement Settings → requalification gate).</Note>
      </div>
    </Page>
  );
}

// ---------------------------------------------------------------- notifications (derived from the records)
const NOTIF_CATS = ["Approvals", "Documents & expiry", "Sourcing", "Commitment", "Bill & pay", "Closure", "Requalification", "Holds"];
function notificationsOf(st) {
  const ahead = Number(settingsOf(st).notifyDaysAhead) || 30, out = [];
  const add = (id, cat, tone, title, text, to, date) => out.push({ id, cat, tone, title, text, to, date: (date || todayISO()).slice(0, 10) });
  for (const v of st.vendors) {
    if (v.status === "Pending Approval") add(`va-${v.id}`, "Approvals", "amber", `${v.name} waiting for approval`, "Vendor registration submitted", `${VM_BASE}/approvals?open=${v.id}`, v.submittedAt);
    if (!["Active", "On Hold"].includes(v.status)) continue;
    for (const i of complianceItems(v).filter((x) => x.level > 0 && (x.level === 2 || x.expiry == null || daysUntil(x.expiry) <= ahead)))
      add(`doc-${v.id}-${i.key}`, "Documents & expiry", i.level === 2 ? "red" : "amber", `${v.name}: ${i.name}`, i.note, `${VM_BASE}/registry?open=${v.id}`, i.expiry);
    if (v.requalRequired) add(`rq-${v.id}-${v.requalRequired.at}`, "Requalification", "red", `${v.name} must requalify`, v.requalRequired.reason, `${VM_BASE}/requalification`, v.requalRequired.at);
    else if (requalDue(v)) add(`rqd-${v.id}`, "Requalification", "amber", `${v.name}: requalification overdue`, "Re-assess on the Qualification tab", `${VM_BASE}/requalification`);
    if (v.status === "On Hold" && v.hold?.until && daysUntil(v.hold.until) <= 7) add(`hold-${v.id}-${v.hold.until}`, "Holds", "blue", `Hold on ${v.name} ends ${fmtDate(v.hold.until)}`, v.hold.reason, `${VM_BASE}/holds`, v.hold.until);
  }
  for (const r of st.requisitions || []) if (r.status === "Submitted") add(`req-${r.id}`, "Approvals", "amber", `${r.id} requisition to approve`, `${r.purpose} · ${r.project}`, `${VM_BASE}/requisitions?open=${r.id}`, r.date);
  for (const r of st.rfqs) if (r.status === "Sent" && r.dueDate && daysUntil(r.dueDate) < 0) add(`rfq-${r.id}`, "Sourcing", "amber", `${r.id} past its due date`, `Quotes were due ${fmtDate(r.dueDate)}`, `${VM_BASE}/rfq?open=${r.id}`, r.dueDate);
  for (const d of st.directAwards || []) if (d.status === "Pending Approval") add(`da-${d.id}`, "Approvals", "amber", `${d.id} direct award to approve`, `${vendorName(st, d.vendorId)} · ${inrShort(d.value)} · ${d.justification}`, `${VM_BASE}/direct-awards?open=${d.id}`, d.date);
  for (const p of st.purchaseOrders) if (p.status === "Draft") add(`po-${p.id}`, "Approvals", "amber", `${p.id} PO to approve`, `${vendorName(st, p.vendorId)} · ${inrShort(poValue(p))}`, `${VM_BASE}/purchase-orders?open=${p.id}`, p.date);
  for (const c of st.contracts) {
    if (c.status === "Pending Approval") add(`ct-${c.id}`, "Approvals", "amber", `${c.id} contract to approve`, `${c.title}`, `${CL_BASE}/contracts?open=${c.id}`, c.submittedAt);
    if (c.status === "Approved") add(`cs-${c.id}`, "Commitment", "blue", `${c.id} approved — ready to sign`, c.title, `${CL_BASE}/contracts?open=${c.id}`, c.approvedOn);
    for (const o of c.changeOrders || []) if (o.status === "Pending") add(`co-${o.id}`, "Approvals", "amber", `${o.id} variation to approve`, `${c.id} · ${o.desc} · ${inrShort(o.amount)}`, `${CL_BASE}/contracts?open=${c.id}`, o.date);
    if (["Closed"].includes(c.status)) continue;
    for (const g of liveGuarantees(c)) if (daysUntil(g.expiry) <= ahead) add(`bg-${c.id}-${g.number}`, "Documents & expiry", daysUntil(g.expiry) < 0 ? "red" : "amber", `${g.type} BG ${g.number} expires ${fmtDate(g.expiry)}`, `${c.id} · ${vendorName(st, c.vendorId)}`, `${CL_BASE}/contracts?open=${c.id}`, g.expiry);
    if (contractStatus(c) === "In DLP") { const e = shiftDays((c.dlpMonths || 0) * 30, c.handover?.date || c.end); if (daysUntil(e) <= ahead) add(`dlp-${c.id}`, "Closure", "blue", `${c.id} DLP ends ${fmtDate(e)}`, "Release retention and guarantees after it ends", `${CL_BASE}/dlp-warranty`, e); }
    if (settlementReady(st, c) && c.settlement?.status !== "Agreed") add(`fs-${c.id}`, "Closure", "amber", `${c.id} final settlement ${c.settlement ? "awaiting the contractor's agreement" : "to prepare"}`, c.title, `${CL_BASE}/final-settlement?open=${c.id}`);
    if (c.status === "Terminated" && !c.blacklistDecision) add(`tb-${c.id}`, "Closure", "red", `${c.id} terminated — blacklist decision pending`, c.terminated?.reason || "", `${CL_BASE}/terminations?open=${c.id}`, c.terminated?.at);
  }
  for (const i of st.invoices) {
    const s = invoiceStatus(i);
    if (s === "Overdue") add(`inv-${i.id}`, "Bill & pay", "red", `${i.id} overdue`, `${vendorName(st, i.vendorId)} · ${inrShort(invoiceTotals(i).balance)} due ${fmtDate(i.due)}`, `${VM_BASE}/invoices?open=${i.id}`, i.due);
    if (s === "Awaiting Review") add(`invr-${i.id}`, "Approvals", "amber", `${i.id} vendor invoice to review`, vendorName(st, i.vendorId), `${VM_BASE}/invoices?open=${i.id}`, i.date);
  }
  for (const b of st.raBills) if (["Submitted", "Verified", "Certified", "Approved"].includes(b.status)) add(`ra-${b.id}-${b.status}`, "Bill & pay", "blue", `${b.id} RA bill at ${b.status}`, `${b.woId} · ${inrShort(b.net)}`, `${CL_BASE}/ra-bills?open=${b.id}`, b.date);
  for (const r of st.retentionReleases) if (["Due", "Pending Approval"].includes(r.status)) add(`rr-${r.id}`, "Approvals", "amber", `${r.id} retention release to approve`, `${r.contractId} · ${inrShort(r.amount)}`, `${CL_BASE}/retention`, r.requestedOn);
  for (const w of st.warranties || []) { const s = warrantyStatus(w); if (s === "Expiring") add(`wr-${w.id}`, "Closure", "amber", `${w.id} warranty expires ${fmtDate(warrantyEnd(w))}`, `${w.item} · ${vendorName(st, w.vendorId)}`, `${CL_BASE}/dlp-warranty?tab=warranty`, warrantyEnd(w)); }
  const rank = { red: 0, amber: 1, blue: 2 };
  return out.sort((a, b) => rank[a.tone] - rank[b.tone] || (a.date || "").localeCompare(b.date || ""));
}
function NotificationsPage() {
  const st = useStore(), nav = useNavigate();
  const [tab, setTab] = y.useState("unread"), [cat, setCat] = y.useState("All");
  const read = st.notifRead || {};
  const all = notificationsOf(st);
  const rows = all.filter((n) => (tab === "all" || !read[n.id]) && (cat === "All" || n.cat === cat));
  const rules = { ...Object.fromEntries(NOTIF_CATS.map((c) => [c, { inApp: true, email: c !== "Holds", sms: c === "Approvals" }])), ...(settingsOf(st).notifRules || {}) };
  const mark = (ids) => setState((s) => { s.notifRead = { ...(s.notifRead || {}) }; ids.forEach((id) => (s.notifRead[id] = new Date().toISOString())); });
  const setRule = (c, k, b) => setState((s) => { s.settings = { ...(s.settings || {}), notifRules: { ...rules, [c]: { ...rules[c], [k]: b } } }; }, { entity: "Settings", id: "Notifications", action: `${c}: ${k === "inApp" ? "in-app" : k} ${b ? "on" : "off"}` });
  const digest = (channel) => {
    const conn = (st.integrations || []).find((c) => c.kind === channel);
    const list = all.filter((n) => !read[n.id] && rules[n.cat]?.[channel === "E-mail" ? "email" : "sms"]);
    if (!conn || !conn.enabled) return toast(`${channel} connector is off — turn it on in Integrations`, "red");
    if (!list.length) return toast("Nothing to send", "amber");
    setState((s) => { s.integrationLog = [{ id: nextId("INT", s.integrationLog || []), at: new Date().toISOString(), conn: conn.id, dir: "Out", what: `${channel} digest — ${list.length} notification${list.length === 1 ? "" : "s"}`, records: list.length, status: "Success" }, ...(s.integrationLog || [])].slice(0, 200);
      byId(s.integrations, conn.id).lastSync = new Date().toISOString(); }, { entity: "Notifications", id: channel, action: `${channel} digest sent (${list.length})` });
    toast(`${channel} digest sent — ${list.length} notification${list.length === 1 ? "" : "s"}`);
  };
  return (
    <Page title="Notifications" subtitle="Approvals waiting, documents and guarantees expiring, overdue bills, close-out and requalification — from live records" icon={Icon.alert}
      actions={<><Btn icon={Icon.mail} onClick={() => digest("E-mail")}>Send e-mail digest</Btn><Btn icon={Icon.message} onClick={() => digest("SMS")}>Send SMS alerts</Btn><Btn variant="primary" icon={Icon.check} disabled={!rows.some((n) => !read[n.id])} onClick={() => { mark(rows.map((n) => n.id)); toast("Marked as read"); }}>Mark all read</Btn></>}>
      <div className="grid grid-cols-4 gap-3 px-4 pt-4">
        <StatTile tone="amber" label="Unread" value={all.filter((n) => !read[n.id]).length} icon={Icon.alert} />
        <StatTile tone="red" label="Urgent" value={all.filter((n) => n.tone === "red" && !read[n.id]).length} sub="expired, overdue or blocking" icon={Icon.warning} />
        <StatTile tone="blue" label="Approvals waiting" value={all.filter((n) => n.cat === "Approvals").length} icon={Icon.clipboardCheck} />
        <StatTile tone="purple" label="Expiring" value={all.filter((n) => n.cat === "Documents & expiry").length} sub={`next ${settingsOf(st).notifyDaysAhead} days`} icon={Icon.fileClock} />
      </div>
      <TabBar active={tab} onChange={setTab} tabs={[{ id: "unread", label: "Unread", icon: Icon.alert, count: all.filter((n) => !read[n.id]).length }, { id: "all", label: "All", icon: Icon.listChecks, count: all.length }, { id: "rules", label: "Rules & channels", icon: Icon.sliders }]} />
      {tab !== "rules" ? (
        <DataTable noun="notifications" rows={rows} onRow={(n) => { mark([n.id]); nav(n.to); }} filters={<FilterSelect label="Category" value={cat} onChange={setCat} options={[{ value: "All", label: "All categories" }, ...NOTIF_CATS]} />}
          empty={<EmptyState icon={Icon.check} title="You're up to date" text="New approvals, expiries and overdue items appear here." />} columns={[
          { key: "tone", label: "", render: (n) => <span className={cls("inline-block h-2 w-2 rounded-full", DOT[n.tone])} /> },
          { key: "title", label: "Notification", render: (n) => <span className={cls(!read[n.id] && "font-semibold")}>{n.title}</span> },
          { key: "text", label: "Details", className: "max-w-[320px] truncate text-[12px] text-ink-soft" },
          { key: "cat", label: "Category", filter: true, render: (n) => <Status tone={n.tone === "red" ? "red" : n.tone === "amber" ? "amber" : "blue"}>{n.cat}</Status> },
          { key: "date", label: "Date", sort: (n) => n.date, render: (n) => fmtDate(n.date) },
        ]} />
      ) : (
        <div className="space-y-3 p-4">
          <Note>Notifications are worked out from the records themselves — an approval disappears once decided, an expiry once renewed. Channels decide what the e-mail digest and SMS alerts carry (Integrations → E-mail / SMS).</Note>
          <table className="w-full max-w-[640px] text-[13px]"><thead><tr><Th>Category</Th><Th>In-app</Th><Th>E-mail</Th><Th>SMS</Th></tr></thead>
            <tbody>{NOTIF_CATS.map((c) => (
              <tr key={c} className="border-b border-line"><Td>{c}</Td>{["inApp", "email", "sms"].map((k) => <Td key={k}><input type="checkbox" aria-label={`${c} ${k}`} className="h-4 w-4 accent-[#0b5ed7]" checked={!!rules[c][k]} onChange={(e) => setRule(c, k, e.target.checked)} /></Td>)}</tr>
            ))}</tbody></table>
          <div className="w-60"><Field label="Expiry look-ahead (days)"><NumInput value={settingsOf(st).notifyDaysAhead} onChange={(x) => setState((s) => { s.settings = { ...(s.settings || {}), notifyDaysAhead: Math.max(1, Math.min(180, Number(x) || 30)) }; })} /></Field></div>
        </div>
      )}
    </Page>
  );
}

// ---------------------------------------------------------------- integrations (simulated connectors with a sync log)
const INTEGRATION_DEFAULTS = () => [
  { id: "ERP", kind: "ERP", name: "ERP / accounting (Tally Prime)", desc: "Vendor masters, POs and posted bills as vouchers; payments back", enabled: true, status: "Connected", lastSync: null, endpoint: "tally.local:9000" },
  { id: "BANK", kind: "Bank", name: "Bank host-to-host payment file", desc: "Payment batch file (NEFT / RTGS) for recorded payments", enabled: true, status: "Connected", lastSync: null, endpoint: "SFTP · hdfc-h2h" },
  { id: "GST", kind: "GST", name: "GST — GSTIN check & e-invoice (IRP)", desc: "Validates vendor GSTINs and reads the IRN on vendor e-invoices", enabled: true, status: "Connected", lastSync: null, endpoint: "einvoice1.gst.gov.in (sandbox)" },
  { id: "KYC", kind: "KYC", name: "PAN / bank-account verification", desc: "PAN status and penny-drop for new bank accounts", enabled: false, status: "Not connected", lastSync: null, endpoint: "" },
  { id: "MAIL", kind: "E-mail", name: "E-mail (SMTP)", desc: "RFQ invitations, POs and notification digests", enabled: true, status: "Connected", lastSync: null, endpoint: "smtp.nebullaone.in:587" },
  { id: "SMS", kind: "SMS", name: "SMS / WhatsApp", desc: "Approval and expiry alerts", enabled: false, status: "Not connected", lastSync: null, endpoint: "" },
];
const csvCell = (x) => `"${String(x ?? "").replace(/"/g, '""')}"`;
function downloadCsv(name, rows) {
  const blob = new Blob([rows.map((r) => r.map(csvCell).join(",")).join("\n")], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function runIntegration(conn, what) {
  const st = getState();
  if (!conn.enabled) { toast(`${conn.name} is off`, "red"); return; }
  let records = 0, text = "", status = "Success", file = null, mutate = null;
  if (conn.kind === "ERP") {
    const since = conn.lastSync || "";
    const vs = st.vendors.filter((v) => v.status === "Active").length;
    const pos = st.purchaseOrders.filter((p) => p.status !== "Draft" && (p.createdAt || p.date) > since).length;
    const bills = st.invoices.filter((i) => i.posted !== false && i.review !== "Pending" && i.review !== "Rejected" && (i.createdAt || i.date) > since);
    records = vs + pos + bills.length; text = `Synced ${vs} vendors, ${pos} new POs, ${bills.length} bills as purchase vouchers`;
    if (what === "export") { file = ["tally-purchase-vouchers.csv", [["Voucher", "Date", "Party", "Ledger", "Amount", "GST %", "Reference"], ...st.invoices.filter((i) => i.review !== "Rejected").map((i) => [i.id, i.date, vendorName(st, i.vendorId), "Purchase", round2(invoiceTotals(i).payable), i.gstPct, i.number])]]; text = `Exported ${file[1].length - 1} purchase vouchers`; records = file[1].length - 1; }
  } else if (conn.kind === "Bank") {
    const pays = st.invoices.flatMap((i) => (i.payments || []).map((p, n) => ({ i, p, n }))).filter((x) => !x.p.exported && !/Advance adjustment|Write-off/.test(x.p.mode || ""));
    if (!pays.length) { toast("No new payments to send to the bank", "amber"); return; }
    file = ["bank-payment-batch.csv", [["Payment ref", "Value date", "Beneficiary", "Account", "IFSC", "Mode", "Amount", "Bill"], ...pays.map(({ i, p }) => { const v = byId(st.vendors, i.vendorId); const b = (v?.bankAccounts || []).find((x) => x.primary) || (v?.bankAccounts || [])[0] || {}; return [p.ref || p.reference || "", p.date, v?.legalName || v?.name, b.account || "", b.ifsc || "", p.mode || "NEFT", p.amount, i.id]; })]];
    records = pays.length; text = `Payment batch of ${pays.length} payments (${inr(sum(pays, (x) => x.p.amount))}) sent`;
    mutate = (s) => pays.forEach(({ i, n }) => { byId(s.invoices, i.id).payments[n].exported = todayISO(); });
  } else if (conn.kind === "GST") {
    const bad = st.vendors.filter((v) => v.status === "Active" && v.gstin && !GSTIN_RE.test(String(v.gstin).trim().toUpperCase()));
    const missing = st.vendors.filter((v) => v.status === "Active" && !v.gstin && (v.country || "India") === "India" && !v.unregistered);
    records = st.vendors.filter((v) => v.status === "Active").length; status = bad.length ? "Warning" : "Success";
    text = `Checked ${records} GSTINs — ${bad.length} invalid${bad.length ? ` (${bad.map((v) => v.name).join(", ")})` : ""}, ${missing.length} not on file`;
  } else if (conn.kind === "KYC") {
    const pend = st.vendors.flatMap((v) => (v.bankAccounts || []).filter((b) => b.status !== "Verified")).length;
    records = pend; text = `${pend} bank accounts sent for penny-drop`;
  } else if (conn.kind === "E-mail" || conn.kind === "SMS") {
    records = 1; text = what === "test" ? "Test message delivered" : "Queue flushed";
  }
  if (what === "test") { records = 0; text = `Connection test passed (${conn.endpoint || "default endpoint"})`; status = "Success"; }
  setState((s) => {
    s.integrations = s.integrations || INTEGRATION_DEFAULTS();
    const c = byId(s.integrations, conn.id); c.lastSync = new Date().toISOString(); c.status = status === "Warning" ? "Connected" : "Connected";
    s.integrationLog = [{ id: nextId("INT", s.integrationLog || []), at: new Date().toISOString(), conn: conn.id, dir: conn.kind === "GST" || conn.kind === "KYC" ? "In" : "Out", what: text, records, status }, ...(s.integrationLog || [])].slice(0, 200);
    mutate && mutate(s);
  }, { entity: "Integration", id: conn.id, action: text });
  if (file) downloadCsv(file[0], file[1]);
  toast(text, status === "Warning" ? "amber" : "green");
}
function IntegrationsPage() {
  const st = useStore();
  const conns = st.integrations || INTEGRATION_DEFAULTS();
  const log = st.integrationLog || [];
  const [cfg, setCfg] = y.useState(null);
  const toggle = (c) => setState((s) => { s.integrations = s.integrations || INTEGRATION_DEFAULTS(); const x = byId(s.integrations, c.id); x.enabled = !x.enabled; x.status = x.enabled ? (x.endpoint ? "Connected" : "Error") : "Not connected"; }, { entity: "Integration", id: c.id, action: c.enabled ? "Turned off" : "Turned on" });
  return (
    <Page title="Integrations" subtitle="ERP, bank, GST, KYC, e-mail and SMS connectors — run a sync, export a file and see every exchange in the log" icon={Icon.network}>
      <div className="grid grid-cols-3 gap-3 p-4">
        {conns.map((c) => (
          <div key={c.id} data-conn={c.id} className="flex flex-col rounded-lg border border-line bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <div><div className="text-[13.5px] font-semibold">{c.name}</div><div className="mt-0.5 text-[12px] text-ink-mute">{c.desc}</div></div>
              <Status tone={!c.enabled ? "gray" : c.status === "Error" ? "red" : "green"}>{!c.enabled ? "Off" : c.status}</Status>
            </div>
            <div className="mt-2 text-[11.5px] text-ink-mute">{c.endpoint || "No endpoint set"} · last run {c.lastSync ? fmtDateTime(c.lastSync) : "never"}</div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Btn size="sm" onClick={() => toggle(c)}>{c.enabled ? "Turn off" : "Turn on"}</Btn>
              <Btn size="sm" icon={Icon.settings} onClick={() => setCfg({ ...c })}>Configure</Btn>
              {c.enabled && c.endpoint && <Btn size="sm" onClick={() => runIntegration(c, "test")}>Test</Btn>}
              {c.enabled && c.endpoint && c.kind === "ERP" && <><Btn size="sm" variant="primary" icon={Icon.refresh} onClick={() => runIntegration(c, "sync")}>Sync now</Btn><Btn size="sm" icon={Icon.download} onClick={() => runIntegration(c, "export")}>Export vouchers</Btn></>}
              {c.enabled && c.endpoint && c.kind === "Bank" && <Btn size="sm" variant="primary" icon={Icon.download} onClick={() => runIntegration(c, "sync")}>Generate payment file</Btn>}
              {c.enabled && c.endpoint && c.kind === "GST" && <Btn size="sm" variant="primary" icon={Icon.shieldCheck} onClick={() => runIntegration(c, "sync")}>Validate GSTINs</Btn>}
              {c.enabled && c.endpoint && c.kind === "KYC" && <Btn size="sm" variant="primary" onClick={() => runIntegration(c, "sync")}>Verify pending</Btn>}
            </div>
          </div>
        ))}
      </div>
      <Section title="Sync log" icon={Icon.fileClock} className="mx-4 mb-4">
        <DataTable dense noun="exchanges" rows={log} exportName="integration-log" empty={<p className="p-4 text-[13px] text-ink-mute">No exchanges yet — run a sync above.</p>} columns={[
          { key: "id", label: "Run", className: "mono text-[12px]" }, { key: "at", label: "When", sort: (r) => r.at, render: (r) => fmtDateTime(r.at) },
          { key: "conn", label: "Connector", filterOptions: conns.map((c) => c.id), filter: true, render: (r) => conns.find((c) => c.id === r.conn)?.name || r.conn },
          { key: "dir", label: "Direction", render: (r) => (r.dir === "In" ? "Inbound" : "Outbound") }, { key: "what", label: "What", className: "max-w-[420px] whitespace-normal text-[12.5px]" },
          { key: "records", label: "Records", align: "right", num: true }, { key: "status", label: "Result", filterOptions: ["Success", "Warning", "Error"], filter: true, render: (r) => <Status tone={r.status === "Success" ? "green" : r.status === "Warning" ? "amber" : "red"}>{r.status}</Status> },
        ]} />
      </Section>
      {cfg && (
        <Modal open onClose={() => setCfg(null)} width={520} title={`Configure — ${cfg.name}`} footer={<><Btn onClick={() => setCfg(null)}>Cancel</Btn><Btn variant="primary" disabled={cfg.enabled && !cfg.endpoint.trim()} onClick={() => {
          setState((s) => { s.integrations = s.integrations || INTEGRATION_DEFAULTS(); Object.assign(byId(s.integrations, cfg.id), { endpoint: cfg.endpoint.trim(), status: cfg.endpoint.trim() ? "Connected" : "Error" }); }, { entity: "Integration", id: cfg.id, action: `Endpoint set to ${cfg.endpoint.trim() || "—"}` });
          toast("Connector saved"); setCfg(null);
        }}>Save</Btn></>}>
          <Field label="Endpoint / host" required={cfg.enabled} hint="Host, SFTP path or API base URL"><TextInput value={cfg.endpoint} onChange={(x) => setCfg({ ...cfg, endpoint: x })} placeholder="e.g. tally.local:9000" /></Field>
        </Modal>
      )}
    </Page>
  );
}

// ---------------------------------------------------------------- state machines
const VENDOR_SM = {
  states: ["Draft", "Pending Approval", "Changes Requested", "Active", "On Hold", "Inactive", "Blacklisted", "Rejected"],
  tr: [
    ["Draft", "Pending Approval", "Submit for approval", "Vendor Registry / Supplier portal", "Mandatory fields, documents and bank details"],
    ["Pending Approval", "Changes Requested", "Request changes", "Vendor Approvals", "Remark required"],
    ["Changes Requested", "Pending Approval", "Vendor resubmits", "Supplier portal", ""],
    ["Pending Approval", "Active", "Final approval stage", "Vendor Approvals / Approval Management", "No approval blockers; critical questions passed"],
    ["Pending Approval", "Rejected", "Reject", "Vendor Approvals", "Reason required"],
    ["Active", "On Hold", "Place hold", "Vendor Registry / Holds Register / scorecard auto-hold", "Reason, scope and optional release date"],
    ["On Hold", "Active", "Release hold", "Holds Register / release date passed", "Release reason"],
    ["Active", "Inactive", "Disable", "Vendor Registry → Flags", ""],
    ["Inactive", "Active", "Enable", "Vendor Registry → Flags", ""],
    ["Active", "Blacklisted", "Blacklist", "Vendor Registry / Termination blacklist decision", "Reason (min 5 characters)"],
    ["On Hold", "Blacklisted", "Blacklist", "Vendor Registry", "Reason"],
    ["Blacklisted", "Active", "Remove from blacklist", "Holds Register", "Reason"],
  ],
  of: (st) => st.vendors.map((v) => ({ id: v.id, name: v.name, state: v.status, to: `${VM_BASE}/registry?open=${v.id}` })),
};
const CONTRACT_SM = {
  states: ["Draft", "Pending Approval", "Rejected", "Approved", "Active", "Expiring", "In DLP", "Completed", "Terminated", "Closed"],
  tr: [
    ["Draft", "Pending Approval", "Submit", "Contracts", "Value, dates; contractor not blocked"],
    ["Pending Approval", "Approved", "Last approval stage", "Contract drawer / Approval Management", "Contractor still eligible"],
    ["Pending Approval", "Rejected", "Reject", "Contract drawer / Approval Management", "Reason required"],
    ["Rejected", "Draft", "Revise", "Contracts", ""],
    ["Approved", "Active", "Sign & activate", "Contract drawer", "PBG on file; contractor eligible"],
    ["Active", "Expiring", "(automatic) 90 days before completion", "—", ""],
    ["Active", "In DLP", "Handover certificate", "Close-out & Handover", "Final inspection passed"],
    ["In DLP", "Completed", "(automatic) DLP ends", "DLP & Warranty", ""],
    ["Active", "Terminated", "Terminate", "Contract drawer / Termination & Final Account", "Reason; open WOs short-closed"],
    ["Completed", "Closed", "Close contract", "Close-out & Handover", "Closure checklist incl. final settlement and contractor release"],
    ["Terminated", "Closed", "Close contract", "Termination & Final Account", "Final account settled; blacklist decision recorded"],
  ],
  of: (st) => st.contracts.map((c) => ({ id: c.id, name: c.title, state: contractStatus(c), to: `${CL_BASE}/contracts?open=${c.id}` })),
};
function StateMachinesPage() {
  const st = useStore(), nav = useNavigate(), loc = Ht();
  const [m, setM] = y.useState(() => (/m=contract/.test(loc.search) ? "contract" : "vendor"));
  const [pickS, setPickS] = y.useState(null);
  const sm = m === "vendor" ? VENDOR_SM : CONTRACT_SM;
  const recs = sm.of(st);
  const odd = recs.filter((r) => !sm.states.includes(r.state));
  const list = pickS ? recs.filter((r) => r.state === pickS) : [];
  return (
    <Page title="State Machines" subtitle="Every status a vendor or contract can be in, the allowed moves between them and where each move happens" icon={Icon.branch}>
      <TabBar active={m} onChange={(x) => { setM(x); setPickS(null); }} tabs={[{ id: "vendor", label: "Vendor", icon: Icon.building }, { id: "contract", label: "Contract", icon: Icon.file }]} />
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap gap-1.5">
          {sm.states.map((s) => { const n = recs.filter((r) => r.state === s).length; return (
            <button key={s} type="button" data-state={s} onClick={() => setPickS(pickS === s ? null : s)} className={cls("flex items-center gap-2 rounded-lg border px-3 py-2 text-[12.5px]", pickS === s ? "border-brand bg-brand-soft text-brand" : "border-line bg-white hover:border-brand")}>
              <span className="font-medium">{s}</span><span className="num rounded-full bg-gray-100 px-1.5 text-[11px]">{n}</span>
            </button>); })}
        </div>
        {odd.length > 0 ? <Note tone="red">{odd.length} record(s) in a state outside the model: {odd.map((r) => `${r.id} (${r.state})`).join(", ")}</Note> : <Note tone="green" icon={Icon.check}>All {recs.length} {m === "vendor" ? "vendors" : "contracts"} are in a state the model allows.</Note>}
        {pickS && (
          <Section title={`${pickS} — ${list.length}`} icon={Icon.listChecks}>
            <DataTable dense rows={list} onRow={(r) => nav(r.to)} columns={[{ key: "id", label: "ID", className: "mono text-[12px]" }, { key: "name", label: m === "vendor" ? "Vendor" : "Contract" }, { key: "state", label: "State", render: (r) => <Status>{r.state}</Status> }]} />
          </Section>
        )}
        <Section title="Allowed transitions" icon={Icon.branch}>
          <DataTable dense rows={sm.tr.map((t, i) => ({ id: i, from: t[0], to: t[1], action: t[2], where: t[3], guard: t[4] }))} columns={[
            { key: "from", label: "From", render: (t) => <Status>{t.from}</Status> }, { key: "arrow", label: "", render: () => "→" }, { key: "to", label: "To", render: (t) => <Status>{t.to}</Status> },
            { key: "action", label: "Action", className: "font-medium" }, { key: "where", label: "Where", className: "text-[12px]" }, { key: "guard", label: "Guard / condition", className: "max-w-[320px] whitespace-normal text-[12px] text-ink-soft" },
          ]} />
        </Section>
      </div>
    </Page>
  );
}
