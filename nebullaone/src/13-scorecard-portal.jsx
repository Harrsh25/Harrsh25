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
        setState((s) => { const x = byId(s.vendors, vendorId); x.status = "Disabled"; x.hold = null; x.notes.unshift({ at: new Date().toISOString(), by: currentUser(), text: `Offboarded — ${reason}` }); }, { entity: "Vendor", id: vendorId, action: `Offboarded — ${reason}` });
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
  const rows = st.vendors.filter((v) => !["Draft", "Rejected"].includes(v.status)).map((v) => ({ v, ...vendorScore(st, v.id) }));
  const cats = {};
  rows.forEach((r) => { if (r.score != null) (cats[primaryCategory(r.v)] = cats[primaryCategory(r.v)] || []).push(r.score); });
  const catAvg = (v) => { const a = cats[primaryCategory(v)] || []; return a.length ? sum(a) / a.length : null; };
  const scored = rows.filter((r) => r.score != null);
  const partCell = (x) => (x == null ? <span className="text-ink-faint">—</span> : <span className={cls("num", x < 60 && "text-red-600")}>{Math.round(x)}</span>);
  return (
    <Page title="Vendor Scorecard" subtitle="Weighted KPIs, category benchmarking, auto-block and corrective action" icon={Icon.gauge}
      actions={<><Btn icon={Icon.star} onClick={() => setRate(true)}>Rate performance</Btn>
        <Btn variant="primary" icon={Icon.zap} onClick={() => { const b = evaluateAutoBlock(); toast(b.length ? `${b.length} vendor(s) auto-held` : "No vendor below threshold", b.length ? "red" : "green"); }}>Run auto-block check</Btn></>}>
      <StatGrid>
        <StatTile tone="blue" label="Average score" value={scored.length ? (sum(scored, (r) => r.score) / scored.length).toFixed(1) : "—"} sub={`${scored.length} vendors scored`} icon={Icon.gauge} />
        <StatTile tone="green" label="Band A (≥ 80)" value={scored.filter((r) => r.score >= 80).length} icon={Icon.star} />
        <StatTile tone="red" label={`Below ${st.scoreConfig.blockThreshold} (block)`} value={scored.filter((r) => r.score < st.scoreConfig.blockThreshold).length} icon={Icon.ban} />
        <StatTile tone="amber" label="Open CAPs" value={st.caps.filter((c) => c.status === "Open").length} icon={Icon.clipboardList} />
      </StatGrid>
      <TabBar active={tab} onChange={setTab} tabs={[{ id: "scores", label: "Scorecard", icon: Icon.gauge }, { id: "bench", label: "Category benchmark", icon: Icon.chart }, { id: "caps", label: "Corrective actions", icon: Icon.clipboardList }, { id: "model", label: "Metric model", icon: Icon.sliders }]} />
      {tab === "scores" && (
        <DataTable rows={rows.sort((a, b) => (b.score ?? -1) - (a.score ?? -1))} rowKey={(r) => r.v.id} onRow={(r) => setOpen(r.v.id)} columns={[
          { key: "name", label: "Vendor", render: (r) => <span className="font-medium">{r.v.name}</span> },
          { key: "cat", label: "Category", render: (r) => primaryCategory(r.v) },
          { key: "score", label: "Score", align: "center", render: (r) => <ScoreRing value={r.score} size={32} /> },
          { key: "band", label: "Band", align: "center", render: (r) => <b>{scoreBand(r.score)}</b> },
          { key: "q", label: "Quality", align: "right", render: (r) => partCell(r.parts.quality) },
          { key: "t", label: "Timeliness", align: "right", render: (r) => partCell(r.parts.timeliness) },
          { key: "s", label: "Safety", align: "right", render: (r) => partCell(r.parts.safety) },
          { key: "c", label: "Compliance", align: "right", render: (r) => partCell(r.parts.compliance) },
          { key: "b", label: "vs category", align: "right", render: (r) => { const a = catAvg(r.v); if (a == null || r.score == null) return "—"; const d = r.score - a; return <span className={cls("num", d < 0 ? "text-red-600" : "text-green-600")}>{d >= 0 ? "+" : ""}{d.toFixed(1)}</span>; } },
          { key: "st", label: "Status", render: (r) => <Status>{r.v.status}</Status> },
          { key: "a", label: "", align: "right", render: (r) => (
            <span className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
              {r.score != null && r.score < st.scoreConfig.capThreshold && !st.caps.some((c) => c.vendorId === r.v.id && c.status === "Open") && <Btn size="sm" onClick={() => setCap({ vendorId: r.v.id, issue: "", actions: "", dueDate: shiftDays(21), owner: currentUser() })}>Issue CAP</Btn>}
              {r.v.status !== "Disabled" && <Btn size="sm" variant="ghost" onClick={() => setOff(r.v.id)}>Offboard</Btn>}
            </span>) },
        ]} />
      )}
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
      {tab === "caps" && (
        <DataTable rows={st.caps} empty={<EmptyState icon={Icon.check} title="No corrective action plans" text="Issue a CAP from the scorecard when a vendor falls below the CAP threshold." />} columns={[
          { key: "id", label: "CAP", className: "mono text-[12px]" },
          { key: "v", label: "Vendor", render: (c) => <span className="font-medium">{vendorName(st, c.vendorId)}</span> },
          { key: "issue", label: "Issue", className: "whitespace-normal" },
          { key: "actions", label: "Required actions", className: "whitespace-normal text-[12px] text-ink-soft" },
          { key: "due", label: "Due", render: (c) => <ExpiryCell iso={c.status === "Open" ? c.dueDate : null} /> },
          { key: "owner", label: "Owner" },
          { key: "s", label: "Status", render: (c) => <Status tone={c.status === "Open" ? (daysUntil(c.dueDate) < 0 ? "red" : "amber") : "gray"}>{c.status === "Open" && daysUntil(c.dueDate) < 0 ? "Overdue" : c.status}</Status> },
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

// ---------------------------------------------------------------- vendor portal preview
function VendorPortalPage() {
  const st = useStore();
  const portalVendors = st.vendors.filter((v) => ["Active", "On Hold", "Pending Approval"].includes(v.status));
  const [vid, setVid] = y.useState(portalVendors[0]?.id);
  const [tab, setTab] = y.useState("rfq");
  const [tk, setTk] = y.useState({ subject: "", body: "" });
  const [reup, setReup] = y.useState(null);
  const [quoteFor, setQuoteFor] = y.useState(null);
  const v = byId(st.vendors, vid);
  if (!v) return <Page title="Vendor Portal" icon={Icon.globe}><EmptyState icon={Icon.globe} title="No vendors with portal access" /></Page>;
  const pos = st.purchaseOrders.filter((p) => p.vendorId === vid);
  const invs = st.invoices.filter((i) => i.vendorId === vid);
  const bills = st.raBills.filter((b) => b.vendorId === vid);
  const docs = requiredDocs(v).map((n) => v.docs.find((d) => d.name === n) || { name: n, status: "Missing" });
  const tickets = st.tickets.filter((t) => t.vendorId === vid);
  const rfqs = st.rfqs.filter((r) => r.vendorIds.includes(vid) && r.status !== "Draft");
  const openRfqs = rfqs.filter((r) => ["Sent", "Quotes Received"].includes(r.status) && daysUntil(r.dueDate) >= 0);
  const pricelist = pos.flatMap((p) => p.lines.map((l) => ({ ...l, po: p.id, date: p.date })));
  return (
    <Page title="Vendor Portal" subtitle="Preview of the supplier self-service portal — what the vendor sees after login" icon={Icon.globe}
      actions={<label className="flex items-center gap-2 text-[12.5px] text-ink-soft">Viewing as
        <select className="h-[28px] rounded-md border border-line bg-white px-2 text-[13px] text-ink" value={vid} onChange={(e) => setVid(e.target.value)}>
          {portalVendors.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select></label>}>
      <div className="flex items-center justify-between gap-4 border-b border-line bg-gradient-to-r from-brand-soft to-white px-5 py-3">
        <div><p className="text-[15px] font-semibold">Welcome, {v.contact.name}</p><p className="text-[12.5px] text-ink-soft">{v.name} · {v.id}</p></div>
        <div className="flex items-center gap-2"><Status>{v.status}</Status><Status>{complianceOf(v).status}</Status></div>
      </div>
      <StatGrid>
        <StatTile tone="blue" label="Open POs" value={pos.filter((p) => poStatus(p) !== "Received").length} icon={Icon.package} />
        <StatTile tone="purple" label="RA bills in process" value={bills.filter((b) => !["Paid", "Rejected"].includes(b.status)).length} icon={Icon.receipt} />
        <StatTile tone="amber" label="Amount due to you" value={inrShort(sum(invs, (i) => invoiceTotals(i).balance))} icon={Icon.rupee} />
        <StatTile tone="red" label="Documents to renew" value={docs.filter((d) => ["Missing", "Expired", "Expiring", "Rejected"].includes(docState(d))).length} icon={Icon.fileClock} />
      </StatGrid>
      <TabBar active={tab} onChange={setTab} tabs={[{ id: "rfq", label: `RFQs (${openRfqs.filter((r) => !r.quotes.some((q) => q.vendorId === vid)).length} to quote)`, icon: Icon.scale }, { id: "orders", label: "Orders & deliveries", icon: Icon.truck }, { id: "bills", label: "Invoices & payments", icon: Icon.receipt }, { id: "price", label: "My pricelist", icon: Icon.sheet }, { id: "docs", label: "Documents", icon: Icon.folderCheck }, { id: "help", label: `Queries (${tickets.length})`, icon: Icon.message }]} />
      {tab === "rfq" && <DataTable rows={rfqs} empty={<EmptyState icon={Icon.scale} title="No RFQs yet" text="Requests for quotation you're invited to will appear here." />} columns={[
        { key: "id", label: "RFQ", className: "mono text-[12px]" }, { key: "title", label: "Requirement", className: "font-medium" }, { key: "project", label: "Project" },
        { key: "n", label: "Lines", align: "center", render: (r) => r.items.length },
        { key: "due", label: "Quotes due", render: (r) => <ExpiryCell iso={["Awarded", "Closed"].includes(r.status) ? null : r.dueDate} /> },
        { key: "me", label: "My quote", render: (r) => { const q = r.quotes.find((x) => x.vendorId === vid); return q ? <span className="num">{q.currency} {num(sum(r.items, (it, i) => it.qty * q.rates[i]))}</span> : <span className="text-ink-faint">—</span>; } },
        { key: "s", label: "Status", render: (r) => r.status === "Awarded" ? <Status tone={r.awardedTo === vid ? "green" : "gray"}>{r.awardedTo === vid ? "Awarded to you" : "Not awarded"}</Status> : r.quotes.some((q) => q.vendorId === vid) ? <Status tone="blue">Quoted</Status> : daysUntil(r.dueDate) < 0 ? <Status tone="red">Missed</Status> : <Status tone="amber">Awaiting your quote</Status> },
        { key: "a", label: "", align: "right", render: (r) => openRfqs.includes(r) && <Btn size="sm" variant="primary" icon={Icon.send} onClick={() => setQuoteFor(r.id)}>{r.quotes.some((q) => q.vendorId === vid) ? "Revise quote" : "Submit quote"}</Btn> },
      ]} />}
      {tab === "orders" && <DataTable rows={pos} empty={<EmptyState icon={Icon.package} title="No purchase orders" />} columns={[
        { key: "id", label: "PO", className: "mono text-[12px]" }, { key: "project", label: "Deliver to" },
        { key: "dd", label: "Delivery due", render: (p) => fmtDate(p.deliveryDate) },
        { key: "r", label: "Delivered", render: (p) => { const r = poReceived(p); return <Progress value={Math.round(pct(sum(r, (x) => x.received), sum(r, (x) => x.qty)))} />; } },
        { key: "s", label: "Status", render: (p) => <Status>{poStatus(p)}</Status> },
      ]} />}
      {tab === "bills" && <DataTable rows={[...invs.map((i) => ({ key: i.id, ref: i.number, what: i.source === "RA Bill" ? i.raBillId : i.poId, amt: invoiceTotals(i).payable, bal: invoiceTotals(i).balance, status: invoiceStatus(i), due: i.due })),
        ...bills.filter((b) => !b.invoiceId).map((b) => ({ key: b.id, ref: b.id, what: `${b.woId} · RA ${b.seq}`, amt: b.net, bal: b.net, status: b.status, due: null }))]} rowKey={(r) => r.key} columns={[
        { key: "ref", label: "Reference", className: "mono text-[12px]" }, { key: "what", label: "Against" },
        { key: "amt", label: "Amount", align: "right", num: true, render: (r) => inr(r.amt) }, { key: "bal", label: "Balance", align: "right", num: true, render: (r) => inr(r.bal) },
        { key: "due", label: "Due", render: (r) => fmtDate(r.due) }, { key: "status", label: "Status", render: (r) => <Status>{r.status}</Status> },
      ]} />}
      {tab === "price" && <DataTable rows={pricelist} rowKey={(r, i) => r.po + i} empty={<EmptyState icon={Icon.sheet} title="No agreed prices yet" />} columns={[
        { key: "desc", label: "Item" }, { key: "unit", label: "Unit" }, { key: "rate", label: "Agreed rate", align: "right", num: true, render: (r) => inr(r.rate) }, { key: "po", label: "Last PO", className: "mono text-[12px]" }, { key: "date", label: "Since", render: (r) => fmtDate(r.date) },
      ]} />}
      {tab === "docs" && <DataTable rows={docs} rowKey={(d) => d.name} columns={[
        { key: "name", label: "Document", className: "font-medium" }, { key: "e", label: "Valid till", render: (d) => <ExpiryCell iso={d.expiry} /> },
        { key: "s", label: "Status", render: (d) => <Status>{docState(d)}</Status> },
        { key: "a", label: "", align: "right", render: (d) => ["Missing", "Expired", "Expiring", "Rejected"].includes(docState(d)) && <Btn size="sm" icon={Icon.upload} onClick={() => setReup({ name: d.name, expiry: shiftDays(365), file: "" })}>Re-upload</Btn> },
      ]} />}
      {tab === "help" && (
        <div className="grid grid-cols-[1fr_360px] gap-4 p-4">
          <Section title="My queries & disputes" icon={Icon.message}>
            <ul className="divide-y divide-line">
              {tickets.length === 0 && <li className="p-4 text-[13px] text-ink-mute">No queries raised.</li>}
              {tickets.map((t) => (
                <li key={t.id} className="p-4 text-[13px]">
                  <p className="flex items-center justify-between"><span className="font-medium"><span className="mono mr-2 text-[11.5px] text-ink-mute">{t.id}</span>{t.subject}</span><Status>{t.status}</Status></p>
                  <p className="mt-1 text-ink-soft">{t.body}</p>
                  {t.replies.map((r, i) => <p key={i} className="mt-2 rounded-md bg-gray-50 px-2 py-1 text-[12.5px]"><b>{r.by}:</b> {r.text}</p>)}
                </li>
              ))}
            </ul>
          </Section>
          <Section title="Raise a query / dispute" icon={Icon.plus}>
            <div className="space-y-3 p-4">
              <Field label="Subject"><TextInput value={tk.subject} onChange={(x) => setTk({ ...tk, subject: x })} placeholder="e.g. Payment status of RA-3" /></Field>
              <Field label="Details"><TextArea value={tk.body} onChange={(x) => setTk({ ...tk, body: x })} /></Field>
              <Btn variant="primary" icon={Icon.send} disabled={!tk.subject || !tk.body} onClick={() => {
                const id = nextId("TKT", st.tickets);
                setState((s) => s.tickets.unshift({ id, vendorId: vid, ...tk, status: "Open", raisedOn: todayISO(), replies: [] }), { entity: "Ticket", id, action: `Raised by ${v.name}` });
                setTk({ subject: "", body: "" }); toast(`${id} raised`);
              }}>Submit</Btn>
            </div>
          </Section>
        </div>
      )}
      {quoteFor && (
        <Modal open onClose={() => setQuoteFor(null)} width={900} title={`Submit quotation — ${byId(st.rfqs, quoteFor).title}`} subtitle={`${quoteFor} · due ${fmtDate(byId(st.rfqs, quoteFor).dueDate)}`}>
          <VendorQuoteForm rfq={byId(st.rfqs, quoteFor)} vendorId={vid} onDone={Object.assign(() => setQuoteFor(null), { via: "Vendor portal" })} />
        </Modal>
      )}
      {reup && (
        <Modal open onClose={() => setReup(null)} width={460} title={`Re-upload — ${reup.name}`}
          footer={<><Btn onClick={() => setReup(null)}>Cancel</Btn><Btn variant="primary" disabled={!reup.file} onClick={() => {
            setState((s) => { const x = byId(s.vendors, vid); let d = x.docs.find((dd) => dd.name === reup.name); if (!d) { d = { name: reup.name }; x.docs.push(d); } Object.assign(d, { status: "Pending", file: reup.file, expiry: reup.expiry, uploadedAt: todayISO() }); }, { entity: "Vendor", id: vid, action: `${reup.name} re-uploaded via portal` });
            toast("Uploaded — the buyer will verify it"); setReup(null);
          }}>Upload</Btn></>}>
          <div className="space-y-3">
            <Field label="File"><input type="file" className="block w-full text-[13px]" onChange={(e) => setReup({ ...reup, file: e.target.files[0]?.name || "" })} /></Field>
            <Field label="New expiry date"><DateInput value={reup.expiry} onChange={(x) => setReup({ ...reup, expiry: x })} /></Field>
          </div>
        </Modal>
      )}
    </Page>
  );
}
