// Supplier Risk 360: one risk score per vendor built from what the system already knows (compliance, qualification,
// performance, delivery, execution, money and status), the reasons behind it, and the actions taken to reduce it.
const RISK_LEVELS = [{ name: "Critical", min: 60, tone: "red" }, { name: "High", min: 40, tone: "red" }, { name: "Medium", min: 20, tone: "amber" }, { name: "Low", min: 0, tone: "green" }];
const riskLevel = (score) => RISK_LEVELS.find((l) => score >= l.min) || RISK_LEVELS[RISK_LEVELS.length - 1];
function vendorRisk(st, v) {
  const D = [];
  const add = (area, pts, why) => { if (pts > 0) D.push({ area, pts, why }); };
  const today = todayISO();
  // compliance
  const c = complianceOf(v);
  if (c.blocking.length) add("Compliance", 25, `${c.blocking.length} blocking: ${c.blocking.slice(0, 2).join("; ")}`);
  else if (c.issues.length) add("Compliance", 10, c.issues.slice(0, 2).join("; "));
  // qualification
  const q = qualStatus(v);
  add("Qualification", { Medium: 10, High: 20, Critical: 30 }[v.qualification?.riskRating] || 0, `Rated ${v.qualification?.riskRating} risk at qualification`);
  if (["Expired", "Requalification required", "Not qualified"].includes(q.status)) add("Qualification", 10, q.status);
  // performance
  const sc = vendorScore(st, v.id).score;
  if (sc != null && sc < 65) add("Performance", sc < 50 ? 20 : 10, `Scorecard ${Math.round(sc)} / 100`);
  // delivery
  const late = st.purchaseOrders.filter((p) => p.vendorId === v.id && ["Issued", "Partially Received"].includes(poStatus(p)) && p.deliveryDate && p.deliveryDate < today);
  add("Delivery", Math.min(15, late.length * 5), `${late.length} purchase order(s) past delivery date`);
  // execution (contractors)
  const slow = st.workOrders.filter((w) => w.vendorId === v.id && w.status === "In Progress" && woProgress(st, w).spi < 0.8);
  add("Execution", Math.min(15, slow.length * 5), `${slow.length} work order(s) behind plan`);
  const disp = st.measurements.filter((m) => m.jms?.status === "Disputed" && byId(st.workOrders, m.woId)?.vendorId === v.id).length + st.raBills.filter((b) => b.vendorId === v.id && b.status === "Rejected").length;
  add("Execution", Math.min(10, disp * 5), `${disp} disputed measurement(s) / rejected bill(s)`);
  // money — dependency on one supplier, bank details
  const spend = (id) => sum(st.purchaseOrders.filter((p) => p.vendorId === id && poStatus(p) !== "Cancelled"), poValue) + sum(st.contracts.filter((k) => k.vendorId === id && !["Draft", "Rejected"].includes(k.status)), contractValue);
  const total = sum(st.vendors, (x) => spend(x.id)), share = total ? spend(v.id) / total : 0;
  if (share > 0.3) add("Dependency", 10, `${Math.round(share * 100)}% of all ordered and contracted spend`);
  const defB = defaultBank(v);
  if (lifeStatus(v) && (!defB || bankStatus(defB) !== "Verified")) add("Bank", 10, defB ? "Default bank account not verified" : "No default bank account");
  else if ((v.bankAccounts || []).some(bankChangePending)) add("Bank", 5, "Bank account change in progress");
  // status
  if (v.status === "Blacklisted") add("Status", 40, "Blacklisted");
  else if (v.hold || v.status === "On Hold") add("Status", 15, `On hold${v.hold?.reason ? ` — ${v.hold.reason}` : ""}`);
  if (v.frozen) add("Status", 10, `Transactions frozen${v.freeze?.reason ? ` — ${v.freeze.reason}` : ""}`);
  const dup = duplicateHints(v); if (dup.length) add("Integrity", 10, `Possible duplicate: ${dup[0]}`);
  // HSE — safety incidents and safety ratings
  const rts = st.ratings.filter((x) => x.vendorId === v.id), inc = sum(rts, (x) => Number(x.incidents) || 0);
  add("HSE", Math.min(15, inc * 5), `${inc} safety incident(s) reported`);
  if (rts.length && sum(rts, (x) => x.safety) / rts.length < 3) add("HSE", 10, `Average safety rating ${(sum(rts, (x) => x.safety) / rts.length).toFixed(1)} / 5`);
  // financial and legal — from the qualification answers and contract history
  const ans = v.qualification?.answers || {};
  if (ans.turnover != null && Number(ans.turnover) < 10) add("Financial", 10, `Annual turnover ₹${ans.turnover} Cr — thin for large work`);
  if (/yes/i.test(String(ans.litigation || ""))) add("Legal", 10, "Pending litigation declared");
  const term = st.contracts.filter((k) => k.vendorId === v.id && k.status === "Terminated").length;
  add("Legal", Math.min(20, term * 15), `${term} contract(s) terminated`);
  // geographic
  if (isForeign(v)) add("Geographic", 5, `Foreign supplier (${v.country || "outside India"}) — currency and import risk`);
  const score = Math.min(100, sum(D, (d) => d.pts));
  const actions = v.riskActions || [];
  const open = actions.filter((a) => a.status !== "Done");
  // residual risk: a reason that has a risk action against it counts half (mitigation in place)
  const covered = new Set(actions.map((a) => a.area).filter(Boolean));
  const residual = Math.max(0, Math.round(score - sum(D.filter((d) => covered.has(d.area)), (d) => d.pts / 2)));
  return { score, level: riskLevel(score), residual, residualLevel: riskLevel(residual), drivers: D.sort((a, b) => b.pts - a.pts), actions, open, overdue: open.filter((a) => a.due && a.due < today), history: v.riskHistory || [] };
}
const RiskBadge = ({ r }) => <span className="inline-flex items-center gap-1.5"><Status tone={r.level.tone}>{r.level.name}</Status><span className="num text-[12px] text-ink-mute">{r.score}</span></span>;

// Risk tab in the vendor record
function VendorRiskTab({ v, canAct }) {
  const st = useStore(), r = vendorRisk(st, v);
  const blank = { title: "", owner: "", due: "", area: r.drivers[0]?.area || "" };
  const snap = (x, note) => { const rr = vendorRisk(getState(), x); x.riskHistory = [{ at: new Date().toISOString(), by: currentUser(), score: rr.score, level: rr.level.name, residual: rr.residual, note }, ...(x.riskHistory || [])]; };
  const [f, setF] = y.useState(null), [tried, setTried] = y.useState(false);
  const er = f ? { title: f.title.trim().length < 4 ? "Describe the action" : "", owner: f.owner ? "" : "Pick an owner", due: !f.due ? "Pick a due date" : f.due < todayISO() ? "Due date can't be in the past" : "" } : {};
  const save = () => {
    setTried(true); if (Object.values(er).some(Boolean)) return;
    setState((s) => { const x = byId(s.vendors, v.id); x.riskActions = [...(x.riskActions || []), { id: Date.now(), title: f.title.trim(), area: f.area, owner: f.owner, due: f.due, status: "Open", by: currentUser(), at: new Date().toISOString(), level: r.level.name, score: r.score }]; snap(x, `Action added: ${f.title.trim()}`); },
      { entity: "Vendor", id: v.id, action: `Risk action added — ${f.title.trim()} (owner ${f.owner}, due ${fmtDate(f.due)}); risk ${r.level.name} ${r.score}` });
    toast("Risk action added"); setF(null); setTried(false);
  };
  const close = (a) => {
    setState((s) => { const x = byId(s.vendors, v.id); Object.assign(x.riskActions.find((o) => o.id === a.id), { status: "Done", closedBy: currentUser(), closedAt: new Date().toISOString() }); snap(x, `Action closed: ${a.title}`); }, { entity: "Vendor", id: v.id, action: `Risk action closed — ${a.title}` });
    toast("Risk action closed");
  };
  return (
    <>
      <div className="grid grid-cols-4 gap-3">
        <StatTile tone={r.level.tone} label="Risk level" value={r.level.name} sub={`score ${r.score} / 100`} icon={Icon.alert} />
        <StatTile tone={r.residualLevel.tone} label="Residual risk" value={r.residualLevel.name} sub={`score ${r.residual} after actions`} icon={Icon.shieldCheck} />
        <StatTile tone="amber" label="Open actions" value={r.open.length} sub={`${r.actions.length - r.open.length} done`} icon={Icon.clipboardList} />
        <StatTile tone={r.overdue.length ? "red" : "green"} label="Overdue actions" value={r.overdue.length} sub="past due date" icon={Icon.clock} />
      </div>
      <Section title="Why this risk level" icon={Icon.alert}>
        <DataTable dense plain rows={r.drivers.map((d, i) => ({ ...d, id: i }))} empty={<p className="p-4 text-[13px] text-ink-mute">Nothing raises this vendor's risk right now.</p>} columns={[
          { key: "area", label: "Area", className: "font-medium" },
          { key: "why", label: "Reason" },
          { key: "pts", label: "Points", align: "right", render: (d) => <span className="num">+{d.pts}</span> },
        ]} />
        <p className="border-t border-line px-4 py-2 text-[12px] text-ink-mute">Low below 20 · Medium 20–39 · High 40–59 · Critical 60 and above. The score updates on its own as the reasons are fixed.</p>
      </Section>
      <Section title="Risk actions" icon={Icon.clipboardList} actions={canAct && !f && <Btn size="sm" variant="primary" icon={Icon.plus} onClick={() => setF(blank)}>Add risk action</Btn>}>
        <DataTable dense plain rows={r.actions} empty={<p className="p-4 text-[13px] text-ink-mute">No risk actions yet.</p>} columns={[
          { key: "title", label: "Action", className: "font-medium" },
          { key: "area", label: "Reduces", render: (a) => a.area || "—" },
          { key: "owner", label: "Owner" },
          { key: "due", label: "Due", render: (a) => (a.status !== "Done" && a.due < todayISO() ? <span className="text-red-600">{fmtDate(a.due)} · overdue</span> : fmtDate(a.due)) },
          { key: "status", label: "Status", render: (a) => <Status tone={a.status === "Done" ? "green" : a.due < todayISO() ? "red" : "amber"}>{a.status === "Done" ? `Done ${fmtDate(a.closedAt)}` : a.status}</Status> },
          { key: "act", label: "", align: "right", render: (a) => canAct && a.status !== "Done" && <Btn size="sm" variant="success" onClick={() => close(a)}>Mark done</Btn> },
        ]} />
        {f && (
          <div className="grid grid-cols-[1.5fr_130px_1fr_150px_auto] items-start gap-3 border-t border-line p-4">
            <Field label="Action" required><TextInput value={f.title} onChange={(x) => setF({ ...f, title: x })} placeholder="e.g. Get the renewed labour licence" />{tried && <FieldErr m={er.title} />}</Field>
            <Field label="Reduces"><Select value={f.area} onChange={(x) => setF({ ...f, area: x })} options={[...new Set([...r.drivers.map((d) => d.area), "Compliance", "Financial", "Legal", "HSE", "Quality", "Delivery", "Performance", "Dependency", "Geographic", "Integrity", "Bank"])]} /></Field>
            <Field label="Owner" required><Select value={f.owner} onChange={(x) => setF({ ...f, owner: x })} options={ROLES} placeholder="Select" />{tried && <FieldErr m={er.owner} />}</Field>
            <Field label="Due" required><DateInput value={f.due} onChange={(x) => setF({ ...f, due: x })} />{tried && <FieldErr m={er.due} />}</Field>
            <div className="flex gap-2 pt-[22px]"><Btn onClick={() => { setF(null); setTried(false); }}>Cancel</Btn><Btn variant="primary" onClick={save}>Add</Btn></div>
          </div>
        )}
      </Section>
      <Section title="Risk history" icon={Icon.clock} actions={canAct && <Btn size="sm" onClick={() => { setState((s) => snap(byId(s.vendors, v.id), "Periodic risk review"), { entity: "Vendor", id: v.id, action: `Risk reviewed — ${r.level.name} ${r.score}, residual ${r.residual}` }); toast("Risk review recorded"); }}>Record review</Btn>}>
        <DataTable dense plain rows={r.history.map((h0, i) => ({ ...h0, id: i }))} empty={<p className="p-4 text-[13px] text-ink-mute">No reviews recorded yet — the score is shown live above.</p>} columns={[
          { key: "at", label: "When", render: (h0) => fmtDateTime(h0.at) },
          { key: "level", label: "Risk", render: (h0) => <span className="inline-flex items-center gap-1.5"><Status tone={riskLevel(h0.score).tone}>{h0.level}</Status><span className="num text-[12px] text-ink-mute">{h0.score}</span></span> },
          { key: "residual", label: "Residual", render: (h0) => <span className="num">{h0.residual}</span> },
          { key: "note", label: "Event" }, { key: "by", label: "By" },
        ]} />
      </Section>
    </>
  );
}
