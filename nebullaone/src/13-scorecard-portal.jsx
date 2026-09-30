// Vendor performance scorecard, CAPs, offboarding (module 12) and the
// vendor self-service portal preview (module 8).

const primaryCategory = (v) => v.categories[0] || v.type;

function evaluateAutoBlock() {
  const st = getState();
  const { blockThreshold, autoBlock } = st.scoreConfig;
  if (!autoBlock) return [];
  const hits = st.vendors.filter((v) => v.status === "Active" && (vendorScore(st, v.id).score ?? 100) < blockThreshold);
  if (hits.length)
    setState((s) => hits.forEach((h0) => {
      const v = byId(s.vendors, h0.id);
      v.status = "On Hold";
      v.hold = { scope: "Payments", until: shiftDays(30), reason: `Scorecard below ${blockThreshold}`, placedAt: todayISO(), auto: true };
    }), { entity: "Vendor", id: hits.map((x) => x.id).join(", "), action: `Auto-hold — score below ${blockThreshold}` });
  return hits;
}

function RatePerformanceModal({ open, onClose, vendorId: fixedVendor, woId: fixedWo }) {
  const st = useStore();
  const blank = () => ({ vendorId: fixedVendor || "", woId: fixedWo || "", period: new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" }), quality: 4, safety: 4, manpower: 4, incidents: 0, remarks: "" });
  const [f, setF] = y.useState(blank);
  y.useEffect(() => { if (open) setF(blank()); }, [open]);
  const wos = st.workOrders.filter((w) => w.vendorId === f.vendorId);
  return (
    <Modal open={open} onClose={onClose} width={560} title="Rate contractor performance"
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={!f.vendorId} onClick={() => {
        setState((s) => s.ratings.push({ ...f, id: `RT-${Date.now().toString(36)}`, by: currentUser(), at: todayISO() }), { entity: "Vendor", id: f.vendorId, action: `Performance rated for ${f.period}` });
        const blocked = evaluateAutoBlock();
        toast(blocked.some((b) => b.id === f.vendorId) ? "Rating saved — vendor auto-held (score below threshold)" : "Rating saved", blocked.length ? "red" : "green");
        onClose();
      }}>Save rating</Btn></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Contractor / vendor"><Select value={f.vendorId} placeholder="Select…" onChange={(x) => setF({ ...f, vendorId: x, woId: "" })} options={st.vendors.filter((v) => v.status !== "Draft").map((v) => ({ value: v.id, label: v.name }))} /></Field>
        <Field label="Work order"><Select value={f.woId} placeholder="General" onChange={(x) => setF({ ...f, woId: x })} options={wos.map((w) => ({ value: w.id, label: `${w.id} — ${w.title}` }))} /></Field>
        <Field label="Period"><TextInput value={f.period} onChange={(x) => setF({ ...f, period: x })} /></Field>
        <Field label="Safety incidents (LTI / near-miss)"><NumInput value={f.incidents} onChange={(x) => setF({ ...f, incidents: x })} /></Field>
        {[["quality", "Quality of work"], ["safety", "Safety & housekeeping"], ["manpower", "Manpower adherence"]].map(([k, l]) => (
          <Field key={k} label={l}><Stars value={f[k]} onChange={(n) => setF({ ...f, [k]: n })} /></Field>
        ))}
        <Field label="Remarks" span={2}><TextArea rows={2} value={f.remarks} onChange={(x) => setF({ ...f, remarks: x })} /></Field>
      </div>
    </Modal>
  );
}

function OffboardModal({ vendorId, onClose }) {
  const st = useStore();
  const v = byId(st.vendors, vendorId);
  const openPos = st.purchaseOrders.filter((p) => p.vendorId === vendorId && !["Received", "Closed"].includes(poStatus(p)));
  const openInv = st.invoices.filter((i) => i.vendorId === vendorId && invoiceStatus(i) !== "Paid");
  const activeCtr = st.contracts.filter((c) => c.vendorId === vendorId && ["Active", "Expiring"].includes(contractStatus(c)));
  const retention = sum(st.contracts.filter((c) => c.vendorId === vendorId), (c) => contractLedger(st, c).retentionBalance);
  const steps = [
    ["Open purchase orders closed or cancelled", openPos.length === 0, `${openPos.length} open`],
    ["Outstanding bills settled", openInv.length === 0, `${openInv.length} unpaid`],
    ["Active contracts closed / terminated", activeCtr.length === 0, `${activeCtr.length} active`],
    ["Retention released or forfeited", retention <= 0, inrShort(retention) + " held"],
  ];
  const [manual, setManual] = y.useState({ access: false, docs: false });
  const [reason, setReason] = y.useState("");
  const ready = steps.every((s) => s[1]) && manual.access && manual.docs && reason;
  return (
    <Modal open onClose={onClose} width={600} title={`Offboard ${v.name}`} subtitle="Deactivates the vendor, keeps history, revokes access"
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="danger" disabled={!ready} onClick={() => {
        setState((s) => { const x = byId(s.vendors, vendorId); x.status = "Inactive"; x.hold = null; x.notes.unshift({ at: new Date().toISOString(), by: currentUser(), text: `Offboarded — ${reason}` }); }, { entity: "Vendor", id: vendorId, action: `Offboarded — ${reason}` });
        toast(`${v.name} offboarded`); onClose();
      }}>Deactivate vendor</Btn></>}>
      <ul className="space-y-2">
        {steps.map(([l, ok, n]) => <li key={l} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-[13px]"><span className="flex items-center gap-2">{ok ? <Icon.check size={15} className="text-green-600" /> : <Icon.alert size={15} className="text-amber-500" />}{l}</span>{!ok && <span className="text-[12px] text-amber-700">{n}</span>}</li>)}
        <li className="rounded-lg border border-line px-3 py-2"><Check checked={manual.access} onChange={(b) => setManual({ ...manual, access: b })} label="Portal login, site gate passes and badges revoked" /></li>
        <li className="rounded-lg border border-line px-3 py-2"><Check checked={manual.docs} onChange={(b) => setManual({ ...manual, docs: b })} label="Documents archived & final performance rating recorded" /></li>
      </ul>
      <div className="mt-3"><Field label="Reason" required><TextInput value={reason} onChange={setReason} placeholder="e.g. Contract completed, no further requirement" /></Field></div>
    </Modal>
  );
}

function ScorecardPage() {
  const st = useStore();
  const [tab, setTab] = y.useState("scores");
  const [open, setOpen] = y.useState(null), [rate, setRate] = y.useState(false), [cap, setCap] = y.useState(null), [off, setOff] = y.useState(null);
  const [cfg, setCfg] = y.useState(st.scoreConfig);
  y.useEffect(() => setCfg(st.scoreConfig), [st.scoreConfig]);
  const rows = st.vendors.map((v) => ({ v, ...vendorScore(st, v.id) }));
  const cats = {};
  rows.forEach((r) => { if (r.score != null) (cats[primaryCategory(r.v)] = cats[primaryCategory(r.v)] || []).push(r.score); });
  const catAvg = (v) => { const a = cats[primaryCategory(v)] || []; return a.length ? sum(a) / a.length : null; };
  const scored = rows.filter((r) => r.score != null);
  const partCell = (x) => (x == null ? <span className="text-ink-faint">—</span> : <span className={cls("num", x < 60 && "text-red-600")}>{Math.round(x)}</span>);
  return (
    <Page title="Vendor Scorecard" subtitle="Weighted KPIs, category benchmarking, auto-block and corrective action" icon={Icon.gauge}
      actions={<><Btn icon={Icon.star} onClick={() => setRate(true)}>Rate performance</Btn>
        <Btn variant="primary" icon={Icon.zap} onClick={() => { const b = evaluateAutoBlock(); toast(b.length ? `${b.length} vendor(s) auto-held` : "No vendor below threshold", b.length ? "red" : "green"); }}>Run auto-block check</Btn></>}>
      <TabBar active={tab} onChange={setTab} tabs={[{ id: "scores", label: "Scorecard", icon: Icon.gauge }, { id: "trend", label: "Monthly scores", icon: Icon.calendar }, { id: "bench", label: "Category benchmark", icon: Icon.chart }, { id: "spend", label: "Spend by group", icon: Icon.layers }, { id: "caps", label: "Corrective actions", icon: Icon.clipboardList }, { id: "model", label: "Metric model", icon: Icon.sliders }]} />
      {tab === "scores" && (
        <DataTable noun="vendors" rows={rows.sort((a, b) => (b.score ?? -1) - (a.score ?? -1))} rowKey={(r) => r.v.id} onRow={(r) => setOpen(r.v.id)} columns={[
          { key: "name", label: "Vendor", render: (r) => <span className="font-medium">{r.v.name}</span> },
          { key: "cat", label: "Category", filterOptions: FO.trades, filter: (r) => primaryCategory(r.v), render: (r) => primaryCategory(r.v) },
          { key: "score", label: "Score", render: (r) => <ScoreBadge value={r.score} /> },
          { key: "band", label: "Standing", filterOptions: FO.standings, filter: (r) => standingOf(st, r.v.id)?.name, render: (r) => { const b = standingOf(st, r.v.id); return b ? <span className="flex flex-col"><Status tone={b.color === "blue" ? "blue" : b.color}>{b.name}</Status><span className="text-[10.5px] text-ink-mute">{[b.preventRfq && "no RFQ", b.preventPo && "no PO", !b.preventRfq && b.warnRfq && "warn RFQ", !b.preventPo && b.warnPo && "warn PO"].filter(Boolean).join(" · ") || "no restriction"}</span></span> : "—"; } },
          { key: "q", label: "Quality", align: "right", render: (r) => partCell(r.parts.quality) },
          { key: "t", label: "Timeliness", align: "right", render: (r) => partCell(r.parts.timeliness) },
          { key: "s", label: "Safety", align: "right", render: (r) => partCell(r.parts.safety) },
          { key: "c", label: "Compliance", align: "right", render: (r) => partCell(r.parts.compliance) },
          { key: "b", label: "vs category", align: "right", render: (r) => { const a = catAvg(r.v); if (a == null || r.score == null) return "—"; const d = r.score - a; return <span className={cls("num", d < 0 ? "text-red-600" : "text-green-600")}>{d >= 0 ? "+" : ""}{d.toFixed(1)}</span>; } },
          { key: "st", label: "Status", filterOptions: FO.vendorStatus, filter: (r) => r.v.status, render: (r) => <Status>{r.v.status}</Status> },
          { key: "a", label: "", align: "right", render: (r) => (
            <span className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
              {r.score != null && r.score < st.scoreConfig.capThreshold && !st.caps.some((c) => c.vendorId === r.v.id && c.status === "Open") && <Btn size="sm" onClick={() => setCap({ vendorId: r.v.id, issue: "", actions: "", dueDate: shiftDays(21), owner: currentUser() })}>Issue CAP</Btn>}
              {r.v.status !== "Inactive" && <Btn size="sm" variant="ghost" onClick={() => setOff(r.v.id)}>Offboard</Btn>}
            </span>) },
        ]} />
      )}
      {tab === "trend" && (() => {
        const months = lastMonths(6);
        const lbl = (m) => new Date(m).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
        const tone = (x) => (x == null ? "text-ink-faint" : x >= 80 ? "text-green-700" : x >= 65 ? "text-blue-700" : x >= 50 ? "text-amber-700" : "text-red-600");
        return (
          <>
            <DataTable noun="vendors" filters={<span className="text-[12.5px] text-ink-soft">Scored per month from the ratings and deliveries recorded in that month (ERPNext-style evaluation periods). “—” means no activity.</span>} rows={rows.filter((r) => r.score != null)} rowKey={(r) => r.v.id} onRow={(r) => setOpen(r.v.id)} columns={[
              { key: "n", label: "Vendor", render: (r) => <span className="font-medium">{r.v.name}</span> },
              ...months.map((m) => ({ key: m, label: lbl(m), align: "center", render: (r) => { const x = periodScore(st, r.v.id, m); return <span className={cls("num font-medium", tone(x))}>{x == null ? "—" : Math.round(x)}</span>; } })),
              { key: "c", label: "Current", render: (r) => <ScoreBadge value={r.score} /> },
            ]} />
          </>
        );
      })()}
      {tab === "bench" && (
        <div className="grid grid-cols-2 gap-4 p-4">
          <Section title="Average score by category" icon={Icon.chart}>
            <BarList rows={Object.entries(cats).map(([k, a]) => ({ label: k, value: sum(a) / a.length })).sort((a, b) => b.value - a.value)} format={(x) => x.toFixed(1)} max={100} />
          </Section>
          <Section title="Vendor vs peers" icon={Icon.users}>
            <BarList rows={scored.sort((a, b) => b.score - a.score).map((r) => ({ label: r.v.name, value: r.score, color: r.score >= 80 ? "bg-green-500" : r.score >= st.scoreConfig.blockThreshold ? "bg-amber-500" : "bg-red-500" }))} format={(x) => x.toFixed(1)} max={100} />
          </Section>
        </div>
      )}
      {tab === "spend" && <SpendByGroup onOpenVendor={setOpen} />}
      {tab === "caps" && (
        <DataTable noun="corrective actions" rows={st.caps} empty={<EmptyState icon={Icon.check} title="No corrective action plans" text="Issue a CAP from the scorecard when a vendor falls below the CAP threshold." />} columns={[
          { key: "id", label: "CAP", className: "mono text-[12px]" },
          { key: "v", label: "Vendor", filterOptions: FO.vendors, filter: (x) => vendorName(st, x.vendorId), render: (c) => <span className="font-medium">{vendorName(st, c.vendorId)}</span> },
          { key: "issue", label: "Issue", className: "whitespace-normal" },
          { key: "actions", label: "Required actions", className: "whitespace-normal text-[12px] text-ink-soft" },
          { key: "due", label: "Due", render: (c) => <ExpiryCell iso={c.status === "Open" ? c.dueDate : null} /> },
          { key: "owner", label: "Owner", filterOptions: FO.owners, filter: true },
          { key: "s", label: "Status", filterOptions: FO.capStatus, filter: (c) => (c.status === "Open" && daysUntil(c.dueDate) < 0 ? "Overdue" : c.status), render: (c) => <Status tone={c.status === "Open" ? (daysUntil(c.dueDate) < 0 ? "red" : "amber") : "gray"}>{c.status === "Open" && daysUntil(c.dueDate) < 0 ? "Overdue" : c.status}</Status> },
          { key: "a", label: "", align: "right", render: (c) => c.status === "Open" && <Btn size="sm" variant="success" onClick={() => setState((s) => (byId(s.caps, c.id).status = "Closed"), { entity: "CAP", id: c.id, action: "Closed — actions verified" })}>Close</Btn> },
        ]} />
      )}
      {tab === "model" && (
        <div className="grid grid-cols-2 gap-4 p-4">
          <Section title="Custom metric model" icon={Icon.sliders}>
            <div className="space-y-3 p-4">
              {Object.keys(cfg.weights).map((k) => (
                <div key={k} className="grid grid-cols-[140px_1fr_60px] items-center gap-3 text-[13px]">
                  <span className="capitalize">{k}</span>
                  <input type="range" min="0" max="60" value={cfg.weights[k]} onChange={(e) => setCfg({ ...cfg, weights: { ...cfg.weights, [k]: Number(e.target.value) } })} className="accent-[#0b5ed7]" />
                  <span className="num text-right">{cfg.weights[k]}%</span>
                </div>
              ))}
              <p className="text-[12px] text-ink-mute">Weights total {sum(Object.values(cfg.weights))}%. Metrics without data for a vendor are skipped and the rest re-weighted.</p>
            </div>
          </Section>
          <Section title="Standings (score bands)" icon={Icon.layers} className="col-span-2">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr><Th>Standing</Th><Th align="right">Min %</Th><Th align="right">Max %</Th><Th align="center">Warn RFQ</Th><Th align="center">Warn PO</Th><Th align="center">Prevent RFQ</Th><Th align="center">Prevent PO</Th><Th align="right">Vendors</Th></tr></thead>
                <tbody>
                  {(cfg.standings || DEFAULT_STANDINGS).map((b, i) => (
                    <tr key={i}>
                      <Td><span className="flex items-center gap-2"><Status tone={b.color}>{b.name}</Status></span></Td>
                      {["min", "max"].map((k) => <Td key={k} align="right"><div className="ml-auto w-20"><NumInput value={b[k]} onChange={(x) => setCfg({ ...cfg, standings: cfg.standings.map((z, j) => (j === i ? { ...z, [k]: x } : z)) })} /></div></Td>)}
                      {["warnRfq", "warnPo", "preventRfq", "preventPo"].map((k) => <Td key={k} align="center"><input type="checkbox" className="h-4 w-4 accent-[#0b5ed7]" checked={!!b[k]} onChange={(e) => setCfg({ ...cfg, standings: cfg.standings.map((z, j) => (j === i ? { ...z, [k]: e.target.checked } : z)) })} /></Td>)}
                      <Td align="right" className="num">{rows.filter((r) => standingOf({ ...st, scoreConfig: cfg }, r.v.id)?.name === b.name).length}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-line px-4 py-2 text-[12px] text-ink-mute">“Prevent” removes the vendor from new RFQ invitations / PO creation; “Warn” shows a warning. Payment holds still follow the auto-block threshold below.</p>
          </Section>
          <Section title="Thresholds" icon={Icon.target}>
            <div className="grid grid-cols-2 gap-3 p-4">
              <Field label="Auto-block below"><NumInput value={cfg.blockThreshold} onChange={(x) => setCfg({ ...cfg, blockThreshold: x })} /></Field>
              <Field label="Suggest CAP below"><NumInput value={cfg.capThreshold} onChange={(x) => setCfg({ ...cfg, capThreshold: x })} /></Field>
              <div className="col-span-2"><Check checked={cfg.autoBlock} onChange={(b) => setCfg({ ...cfg, autoBlock: b })} label="Automatically hold payments when a vendor drops below the block threshold" /></div>
              <div className="col-span-2 flex justify-end"><Btn variant="primary" icon={Icon.save} disabled={sum(Object.values(cfg.weights)) !== 100}
                onClick={() => { setState((s) => (s.scoreConfig = cfg), { entity: "Scorecard", id: "MODEL", action: "Metric model updated" }); toast("Scoring model saved"); }}>Save model</Btn></div>
              {sum(Object.values(cfg.weights)) !== 100 && <p className="col-span-2 text-[12px] text-red-600">Weights must add up to 100%.</p>}
            </div>
          </Section>
        </div>
      )}
      <RatePerformanceModal open={rate} onClose={() => setRate(false)} />
      {cap && (
        <Modal open onClose={() => setCap(null)} width={560} title={`Corrective action plan — ${vendorName(st, cap.vendorId)}`}
          footer={<><Btn onClick={() => setCap(null)}>Cancel</Btn><Btn variant="primary" disabled={!cap.issue || !cap.actions} onClick={() => {
            const id = nextId("CAP", st.caps);
            setState((s) => s.caps.unshift({ ...cap, id, issuedOn: todayISO(), status: "Open" }), { entity: "CAP", id, action: `Issued to ${vendorName(st, cap.vendorId)}` });
            toast(`${id} issued`); setCap(null);
          }}>Issue CAP</Btn></>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Issue" span={2}><TextInput value={cap.issue} onChange={(x) => setCap({ ...cap, issue: x })} /></Field>
            <Field label="Required actions" span={2}><TextArea value={cap.actions} onChange={(x) => setCap({ ...cap, actions: x })} /></Field>
            <Field label="Due date"><DateInput value={cap.dueDate} onChange={(x) => setCap({ ...cap, dueDate: x })} /></Field>
            <Field label="Owner"><TextInput value={cap.owner} onChange={(x) => setCap({ ...cap, owner: x })} /></Field>
          </div>
        </Modal>
      )}
      {off && <OffboardModal vendorId={off} onClose={() => setOff(null)} />}
      {open && <VendorDrawer vendorId={open} onClose={() => setOpen(null)} />}
    </Page>
  );
}

