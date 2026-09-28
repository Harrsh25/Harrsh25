// Contractor-side flows: RA claims (Procore-style progress claims → our
// verification & certification) and worker-wise daily attendance that rolls up
// into the measurement book (Beeline / VNDLY timesheet → invoice).

// ---------------------------------------------------------------- RA claims
function claimValue(st, c) {
  const wo = byId(st.workOrders, c.woId);
  if (!wo) return 0;
  if (wo.type === "Lump Sum") {
    const pos = woPosition(st, wo);
    return sum(c.lines, (l) => { const p = pos.find((x) => x.line.id === l.lineId); return p ? (Math.max(0, (Number(l.pct) || 0) - p.measured) / 100) * p.value : 0; });
  }
  return sum(c.lines, (l) => (Number(l.qty) || 0) * ((wo.items.find((i) => i.id === l.lineId) || {}).rate || 0));
}

function ClaimModal({ woId, fromClaim, onClose }) {
  const st = useStore();
  const wo = byId(st.workOrders, woId);
  const prev = fromClaim && byId(st.claims, fromClaim);
  const pos = woPosition(st, wo);
  const lastClaim = st.claims.filter((c) => c.woId === woId && c.status !== "Returned").slice(-1)[0];
  const [f, setF] = y.useState(() => ({
    periodFrom: lastClaim ? shiftDays(1, lastClaim.periodTo) : wo.start, periodTo: todayISO(), note: prev?.note || "", attachment: null,
    lines: pos.map((p) => { const old = prev?.lines.find((l) => l.lineId === p.line.id); return wo.type === "Lump Sum" ? { lineId: p.line.id, pct: old?.pct ?? "", location: old?.location || "" } : { lineId: p.line.id, qty: old?.qty ?? "", location: old?.location || "" }; }),
  }));
  const setL = (i, k, v) => setF({ ...f, lines: f.lines.map((l, j) => (j === i ? { ...l, [k]: v } : l)) });
  const draft = { woId, lines: f.lines.filter((l) => (wo.type === "Lump Sum" ? Number(l.pct) > 0 : Number(l.qty) > 0)) };
  const value = claimValue(st, draft);
  const bad = f.lines.some((l, i) => wo.type === "Lump Sum" ? l.pct !== "" && (Number(l.pct) <= pos[i].measured || Number(l.pct) > 100) : Number(l.qty) < 0);
  const submit = () => {
    const id = nextId("CLM", st.claims);
    const by = getVendorSession()?.email || byId(st.vendors, wo.vendorId).contact.name;
    setState((s) => {
      s.claims.push({ id, woId, vendorId: wo.vendorId, date: todayISO(), periodFrom: f.periodFrom, periodTo: f.periodTo, note: f.note, attachment: f.attachment, status: "Submitted",
        lines: draft.lines.map((l) => ({ ...l, qty: l.qty !== undefined ? Number(l.qty) : undefined, pct: l.pct !== undefined ? Number(l.pct) : undefined })),
        history: [{ status: "Submitted", by, at: new Date().toISOString(), remark: prev ? `Revision of ${prev.id}` : "" }], revises: prev?.id || null });
      if (prev) byId(s.claims, prev.id).resubmittedAs = id;
    }, { entity: "RA Claim", id, action: `Submitted by contractor for ${woId} — ${inr(value)}` });
    toast(`${id} submitted for verification`);
    onClose();
  };
  return (
    <Modal open onClose={onClose} width={960} title={`Submit RA claim — ${wo.id}`} subtitle={`${wo.title} · ${wo.type}. Claim the work done this period; the site engineer verifies it jointly before certification.`}
      footer={<><span className="mr-auto text-[13px]">Claimed value <b className="num">{inr(value)}</b></span><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" icon={Icon.send} disabled={!draft.lines.length || bad} onClick={submit}>Submit claim</Btn></>}>
      <div className="space-y-3">
        {prev && <Note tone="amber">Returned by the buyer: <b>{prev.history[prev.history.length - 1].remark}</b></Note>}
        <div className="grid grid-cols-3 gap-3">
          <Field label="Period from"><DateInput value={f.periodFrom} onChange={(x) => setF({ ...f, periodFrom: x })} /></Field>
          <Field label="Period to"><DateInput value={f.periodTo} onChange={(x) => setF({ ...f, periodTo: x })} /></Field>
          <Field label="Supporting sheet (optional)">
            <label className={cls("flex h-[32px] cursor-pointer items-center gap-2 truncate rounded-md border border-dashed px-2.5 text-[12.5px]", f.attachment ? "border-green-300 bg-green-50 text-green-700" : "border-gray-300 text-ink-soft")}>
              <Icon.upload size={13} /><span className="truncate">{f.attachment?.name || "Attach measurement sheet"}</span>
              <input type="file" className="hidden" onChange={async (e) => { const a = await readAttachment(e.target.files[0]); a && setF((ff) => ({ ...ff, attachment: a })); }} />
            </label>
          </Field>
        </div>
        <table className="w-full">
          <thead><tr>{wo.type === "Lump Sum" ? <><Th>Milestone</Th><Th align="right">Value</Th><Th align="right">Certified to date</Th><Th align="right">Claim cumulative %</Th></> : <><Th>Item</Th><Th align="right">WO qty</Th><Th align="right">Certified to date</Th><Th align="right">Rate</Th><Th align="right">Claim this period</Th></>}<Th>Location / reference</Th><Th align="right">Amount</Th></tr></thead>
          <tbody>
            {pos.map((p, i) => {
              const l = f.lines[i];
              const amt = wo.type === "Lump Sum" ? (Math.max(0, (Number(l.pct) || 0) - p.measured) / 100) * p.value : (Number(l.qty) || 0) * p.line.rate;
              return (
                <tr key={p.line.id}>
                  <Td className="max-w-[280px] whitespace-normal">{p.line.name || `${p.line.code} · ${p.line.desc}`}</Td>
                  {wo.type === "Lump Sum" ? <>
                    <Td align="right" className="num">{inr(p.value)}</Td><Td align="right" className="num">{p.measured}%</Td>
                    <Td align="right"><div className="ml-auto w-24"><NumInput value={l.pct} onChange={(x) => setL(i, "pct", x)} /></div></Td>
                  </> : <>
                    <Td align="right" className="num">{num(p.total)} {p.unit}</Td><Td align="right" className="num">{num(p.measured)}</Td><Td align="right" className="num">{inr(p.line.rate)}</Td>
                    <Td align="right"><div className="ml-auto w-28"><NumInput value={l.qty} onChange={(x) => setL(i, "qty", x)} /></div>{Number(l.qty) + p.measured > p.total && <span className="block text-[10.5px] text-amber-700">exceeds WO qty</span>}</Td>
                  </>}
                  <Td><TextInput value={l.location} onChange={(x) => setL(i, "location", x)} placeholder="Grid / floor / chainage" /></Td>
                  <Td align="right" className="num">{amt ? inr(amt) : "—"}</Td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {bad && <Note tone="red">Lump-sum claims must be above the certified % and at most 100%.</Note>}
        <Field label="Note to engineer"><TextArea rows={2} value={f.note} onChange={(x) => setF({ ...f, note: x })} /></Field>
      </div>
    </Modal>
  );
}

function ClaimReviewModal({ id, onClose, onBill }) {
  const st = useStore();
  const c = byId(st.claims, id);
  const wo = byId(st.workOrders, c.woId), v = byId(st.vendors, c.vendorId);
  const pos = woPosition(st, wo);
  const [cert, setCert] = y.useState(() => c.lines.map((l) => (wo.type === "Lump Sum" ? l.pct : l.qty)));
  const [remark, setRemark] = y.useState("");
  const [rep, setRep] = y.useState(v.contact.name);
  const certifiedDraft = { woId: c.woId, lines: c.lines.map((l, i) => (wo.type === "Lump Sum" ? { ...l, pct: Number(cert[i]) || 0 } : { ...l, qty: Number(cert[i]) || 0 })) };
  const ret = () => {
    setState((s) => { const x = byId(s.claims, id); x.status = "Returned"; x.history.push({ status: "Returned", by: currentUser(), at: new Date().toISOString(), remark }); }, { entity: "RA Claim", id, action: `Returned for revision — ${remark}` });
    toast(`${id} returned to contractor`, "red"); onClose();
  };
  const verify = () => {
    let billId;
    setState((s) => {
      const mbIds = [];
      c.lines.forEach((l, i) => {
        const val = Number(cert[i]) || 0;
        if (val <= 0) return;
        const mbId = nextId("MB", s.measurements);
        s.measurements.push({ id: mbId, woId: c.woId, lineId: l.lineId, date: c.periodTo, location: l.location || `Claim ${c.id}`, nos: null, l: null, b: null, d: null,
          qty: wo.type === "Lump Sum" ? 0 : val, pct: wo.type === "Lump Sum" ? val : null, recordedBy: `${currentUser()} (from ${c.id})`,
          jms: { status: "Signed", contractorRep: rep, engineer: currentUser(), at: new Date().toISOString() }, remarks: `Claimed ${wo.type === "Lump Sum" ? l.pct + "%" : l.qty}`, billedIn: null });
        mbIds.push(mbId);
      });
      const w = byId(s.workOrders, c.woId); if (w.status === "Issued") w.status = "In Progress";
      billId = nextId("RA", s.raBills);
      const seq = s.raBills.filter((b) => b.woId === c.woId && b.status !== "Rejected").length + 1;
      const calc = computeRABill(s, c.woId, mbIds, {});
      s.raBills.unshift({ id: billId, woId: c.woId, contractId: wo.contractId, vendorId: wo.vendorId, seq, date: todayISO(), periodFrom: c.periodFrom, periodTo: c.periodTo, mbIds, manual: {}, ...calc,
        status: "Verified", claimId: c.id, claimedValue: claimValue(s, c),
        history: [{ status: "Submitted", by: c.history[0].by, at: c.history[0].at, remark: `Contractor claim ${c.id}` }, { status: "Verified", by: currentUser(), at: new Date().toISOString(), remark: remark || "Jointly verified at site" }] });
      mbIds.forEach((m) => (byId(s.measurements, m).billedIn = billId));
      const x = byId(s.claims, id); x.status = "Verified"; x.raBillId = billId; x.history.push({ status: "Verified", by: currentUser(), at: new Date().toISOString(), remark });
    }, { entity: "RA Claim", id, action: `Verified → RA bill created` });
    toast(`${id} verified — RA bill created for QS certification`);
    onClose(); onBill && onBill(billId);
  };
  return (
    <Modal open onClose={onClose} width={980} title={`Verify contractor claim ${c.id}`} subtitle={`${v.name} · ${wo.id} ${wo.title} · period ${fmtDate(c.periodFrom)} – ${fmtDate(c.periodTo)}`}
      footer={<><span className="mr-auto text-[13px]">Claimed <b className="num">{inr(claimValue(st, c))}</b> · certified <b className="num">{inr(claimValue(st, certifiedDraft))}</b></span>
        <Btn variant="danger" disabled={!remark} onClick={ret}>Return for revision</Btn><Btn variant="success" icon={Icon.check} disabled={!rep || claimValue(st, certifiedDraft) <= 0} onClick={verify}>Verify & create RA bill</Btn></>}>
      <div className="space-y-3">
        {c.note && <Note>Contractor's note: {c.note}</Note>}
        {c.attachment && <p className="text-[12.5px]">Supporting sheet: <FileLink name={c.attachment.name} dataUrl={c.attachment.dataUrl} /></p>}
        <table className="w-full">
          <thead><tr><Th>{wo.type === "Lump Sum" ? "Milestone" : "Item"}</Th><Th>Location</Th><Th align="right">Certified before</Th><Th align="right">Claimed</Th><Th align="right">Certify now</Th><Th align="right">Amount</Th></tr></thead>
          <tbody>
            {c.lines.map((l, i) => {
              const p = pos.find((x) => x.line.id === l.lineId);
              const amt = wo.type === "Lump Sum" ? (Math.max(0, (Number(cert[i]) || 0) - p.measured) / 100) * p.value : (Number(cert[i]) || 0) * p.line.rate;
              return (
                <tr key={l.lineId}>
                  <Td className="max-w-[260px] whitespace-normal">{p.line.name || `${p.line.code} · ${p.line.desc}`}</Td><Td className="text-[12px]">{l.location || "—"}</Td>
                  <Td align="right" className="num">{wo.type === "Lump Sum" ? `${p.measured}%` : `${num(p.measured)} ${p.unit}`}</Td>
                  <Td align="right" className="num">{wo.type === "Lump Sum" ? `${l.pct}%` : num(l.qty)}</Td>
                  <Td align="right"><div className="ml-auto w-28"><NumInput value={cert[i]} onChange={(x) => setCert(cert.map((y2, j) => (j === i ? x : y2)))} /></div></Td>
                  <Td align="right" className={cls("num", Number(cert[i]) !== Number(wo.type === "Lump Sum" ? l.pct : l.qty) && "text-amber-700")}>{inr(amt)}</Td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Contractor's representative at joint verification" required><TextInput value={rep} onChange={setRep} /></Field>
          <Field label="Engineer remark" hint="Required when returning"><TextInput value={remark} onChange={setRemark} placeholder="e.g. Slab L3 shuttering reduced to 756 sqm as per JMS" /></Field>
        </div>
      </div>
    </Modal>
  );
}

function ClaimsTab({ onBill }) {
  const st = useStore();
  const [rev, setRev] = y.useState(null);
  const rows = st.claims.slice().reverse();
  return (
    <>
      <DataTable noun="claims" rows={rows} onRow={(c) => c.status === "Submitted" && setRev(c.id)} empty={<EmptyState icon={Icon.receipt} title="No contractor claims" text="Contractors submit RA claims from the supplier portal (Work orders → Submit RA claim)." />} columns={[
        { key: "id", label: "Claim", className: "mono text-[12px]" },
        { key: "v", label: "Contractor", filter: (x) => vendorName(st, x.vendorId), render: (c) => <span className="font-medium">{vendorName(st, c.vendorId)}</span> },
        { key: "wo", label: "Work order", render: (c) => `${c.woId} · ${byId(st.workOrders, c.woId)?.type}` },
        { key: "p", label: "Period", render: (c) => `${fmtDate(c.periodFrom)} – ${fmtDate(c.periodTo)}` },
        { key: "val", label: "Claimed", align: "right", num: true, render: (c) => inr(claimValue(st, c)) },
        { key: "cert", label: "Certified", align: "right", num: true, render: (c) => (c.raBillId ? inr(byId(st.raBills, c.raBillId)?.gross) : "—") },
        { key: "s", label: "Status", filter: (c) => c.status, render: (c) => <Status tone={{ Submitted: "blue", Verified: "green", Returned: "red" }[c.status]}>{c.status}{c.resubmittedAs ? ` → ${c.resubmittedAs}` : ""}</Status> },
        { key: "a", label: "", align: "right", render: (c) => c.status === "Submitted" ? <Btn size="sm" variant="primary" onClick={(e) => { e.stopPropagation(); setRev(c.id); }}>Verify</Btn> : c.raBillId ? <Btn size="sm" onClick={(e) => { e.stopPropagation(); onBill(c.raBillId); }}>Open {c.raBillId}</Btn> : null },
      ]} />
      {rev && <ClaimReviewModal id={rev} onClose={() => setRev(null)} onBill={onBill} />}
    </>
  );
}

// ---------------------------------------------------------------- labour attendance
const ATT_STATUS = [{ v: "P", l: "Present", d: 1 }, { v: "H", l: "Half day", d: 0.5 }, { v: "A", l: "Absent", d: 0 }];
const manDays = (a) => (ATT_STATUS.find((x) => x.v === a.status) || { d: 0 }).d;

function AttendanceSheet({ vendorId, portal }) {
  const st = useStore();
  const vendors = vendorId ? [byId(st.vendors, vendorId)] : st.vendors.filter((v) => st.workers.some((w) => w.vendorId === v.id));
  const [vid, setVid] = y.useState(vendors[0]?.id);
  const wos = st.workOrders.filter((w) => w.vendorId === vid && woAccepted(w) && ["Issued", "In Progress"].includes(w.status));
  const [woId, setWoId] = y.useState(wos[0]?.id || "");
  const [date, setDate] = y.useState(todayISO());
  const workers = st.workers.filter((w) => w.vendorId === vid && w.active);
  const existing = st.attendance.filter((a) => a.date === date && a.woId === woId);
  const [rows, setRows] = y.useState({});
  y.useEffect(() => {
    const m = {};
    for (const w of workers) { const e = existing.find((a) => a.workerId === w.id); m[w.id] = e ? { status: e.status, ot: e.ot, verified: e.verified } : { status: "P", ot: 0 }; }
    setRows(m);
  }, [vid, woId, date, st.attendance.length]);
  const [nw, setNw] = y.useState(null);
  const locked = existing.some((a) => a.rolledInto);
  const save = (verify) => {
    setState((s) => {
      s.attendance = s.attendance.filter((a) => !(a.date === date && a.woId === woId));
      for (const w of workers) { const r = rows[w.id]; if (!r) continue; s.attendance.push({ date, woId, workerId: w.id, status: r.status, hours: r.status === "P" ? 8 : r.status === "H" ? 4 : 0, ot: Number(r.ot) || 0, rolledInto: null, source: portal ? "Contractor" : "Site", verified: verify || r.verified || false }); }
    }, { entity: "Attendance", id: `${woId} ${date}`, action: `${portal ? "Submitted by contractor" : verify ? "Verified by site" : "Saved"} — ${Object.values(rows).filter((r) => r.status !== "A").length}/${workers.length} present` });
    toast(verify ? "Muster verified" : "Attendance saved");
  };
  return (
    <div className="space-y-3 p-4">
      <div className="flex flex-wrap items-end gap-3">
        {!vendorId && <Field label="Contractor"><Select value={vid} onChange={(x) => { setVid(x); setWoId(st.workOrders.find((w) => w.vendorId === x && woAccepted(w))?.id || ""); }} options={vendors.map((v) => ({ value: v.id, label: v.name }))} /></Field>}
        <Field label="Work order"><Select value={woId} placeholder="Select…" onChange={setWoId} options={wos.map((w) => ({ value: w.id, label: `${w.id} — ${w.title}` }))} /></Field>
        <Field label="Date"><DateInput value={date} max={todayISO()} onChange={setDate} /></Field>
        <span className="flex-1" />
        <Btn icon={Icon.userPlus} onClick={() => setNw({ name: "", trade: "Mason", skill: "Skilled", gatePass: "" })}>Add worker</Btn>
      </div>
      {!woId ? <Note>No accepted work order to record attendance against.</Note> : (
        <>
          {locked && <Note tone="amber">This day is already rolled into the measurement book and can't be edited.</Note>}
          <table className="w-full">
            <thead><tr><Th>Worker</Th><Th>Trade</Th><Th>Gate pass</Th><Th>Attendance</Th><Th align="right">OT hours</Th><Th>Status</Th></tr></thead>
            <tbody>
              {workers.map((w) => (
                <tr key={w.id}>
                  <Td className="font-medium">{w.name}</Td><Td>{w.trade}</Td><Td className="mono text-[12px]">{w.gatePass}</Td>
                  <Td>
                    <span className="inline-flex gap-1">
                      {ATT_STATUS.map((o) => (
                        <button key={o.v} disabled={locked} onClick={() => setRows({ ...rows, [w.id]: { ...rows[w.id], status: o.v } })}
                          className={cls("h-[26px] w-[34px] rounded-md border text-[12px] font-semibold", rows[w.id]?.status === o.v ? (o.v === "P" ? "border-green-600 bg-green-600 text-white" : o.v === "H" ? "border-amber-500 bg-amber-500 text-white" : "border-red-500 bg-red-500 text-white") : "border-line bg-white text-ink-soft")}
                          title={o.l}>{o.v}</button>
                      ))}
                    </span>
                  </Td>
                  <Td align="right"><div className="ml-auto w-20"><NumInput value={rows[w.id]?.ot ?? 0} disabled={locked || rows[w.id]?.status === "A"} onChange={(x) => setRows({ ...rows, [w.id]: { ...rows[w.id], ot: x } })} /></div></Td>
                  <Td>{(() => { const e = existing.find((a) => a.workerId === w.id); return e ? <Status tone={e.rolledInto ? "purple" : e.verified ? "green" : "blue"}>{e.rolledInto ? `In ${e.rolledInto}` : e.verified ? "Verified" : `Submitted (${e.source || "Site"})`}</Status> : <span className="text-ink-faint">Not recorded</span>; })()}</Td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] text-ink-soft">Present {Object.values(rows).filter((r) => r.status === "P").length} · Half {Object.values(rows).filter((r) => r.status === "H").length} · Absent {Object.values(rows).filter((r) => r.status === "A").length} · OT {sum(Object.values(rows), (r) => r.ot)} h</span>
            <span className="flex gap-2">
              <Btn disabled={locked} onClick={() => save(false)}>{portal ? "Submit muster" : "Save"}</Btn>
              {!portal && <Btn variant="success" disabled={locked} onClick={() => save(true)}>Save & verify</Btn>}
            </span>
          </div>
        </>
      )}
      {nw && (
        <Modal open onClose={() => setNw(null)} width={520} title="Add worker" footer={<><Btn onClick={() => setNw(null)}>Cancel</Btn><Btn variant="primary" disabled={!nw.name} onClick={() => {
          const id = nextId("WK", st.workers);
          setState((s) => s.workers.push({ id, vendorId: vid, ...nw, gatePass: nw.gatePass || `GP-${4300 + s.workers.length}`, inductionOn: todayISO(), active: true, woId }), { entity: "Worker", id, action: `Added to ${vendorName(st, vid)}` });
          setNw(null);
        }}>Add</Btn></>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name" span={2}><TextInput value={nw.name} onChange={(x) => setNw({ ...nw, name: x })} /></Field>
            <Field label="Trade"><Select value={nw.trade} onChange={(x) => setNw({ ...nw, trade: x })} options={[...new Set(st.laborRates.map((r) => r.trade))]} /></Field>
            <Field label="Skill"><Select value={nw.skill} onChange={(x) => setNw({ ...nw, skill: x })} options={SKILLS} /></Field>
            <Field label="Gate pass no."><TextInput value={nw.gatePass} onChange={(x) => setNw({ ...nw, gatePass: x })} placeholder="Auto" /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Match a worker trade to a man-day item on the work order
function tradeItem(wo, trade) {
  const words = trade.toLowerCase().split(/[ /]+/).filter((w) => w.length > 3);
  return (wo.items || []).find((i) => i.unit === "man-day" && words.some((w) => i.desc.toLowerCase().includes(w.replace(/s$/, ""))));
}

function LabourAttendancePage() {
  const st = useStore();
  const [tab, setTab] = y.useState("muster");
  const [roll, setRoll] = y.useState({ woId: st.workOrders.find((w) => st.attendance.some((a) => a.woId === w.id))?.id || "", from: shiftDays(-14), to: shiftDays(-1) });
  const wo = byId(st.workOrders, roll.woId);
  const pending = st.attendance.filter((a) => a.woId === roll.woId && !a.rolledInto && a.date >= roll.from && a.date <= roll.to);
  const byTrade = {};
  for (const a of pending) {
    const w = byId(st.workers, a.workerId); if (!w) continue;
    const t = (byTrade[w.trade] = byTrade[w.trade] || { trade: w.trade, days: 0, ot: 0, workers: new Set(), unverified: 0 });
    t.days += manDays(a); t.ot += a.ot || 0; t.workers.add(w.id); if (!a.verified) t.unverified++;
  }
  const rows = Object.values(byTrade).map((t) => {
    const item = wo && tradeItem(wo, t.trade);
    const card = item && matchRate(st, wo, item);
    const otDays = (t.ot / 8) * (card?.otMultiplier || 2);
    return { ...t, workers: t.workers.size, item, card, otDays, total: round2(t.days + otDays) };
  });
  const today = st.attendance.filter((a) => a.date === shiftDays(-1));
  const rollUp = () => {
    const ids = [];
    setState((s) => {
      for (const r of rows) {
        if (!r.item || r.total <= 0) continue;
        const id = nextId("MB", s.measurements);
        s.measurements.push({ id, woId: roll.woId, lineId: r.item.id, date: roll.to, location: `Muster roll ${fmtDate(roll.from)} – ${fmtDate(roll.to)} · ${r.workers} workers (${num(r.days)} days + ${num(r.ot)} OT h)`, nos: null, l: null, b: null, d: null, qty: r.total, pct: null, recordedBy: `${currentUser()} (attendance roll-up)`, jms: { status: "Pending" }, remarks: "From daily attendance", billedIn: null });
        ids.push(id);
        for (const a of s.attendance) { const w = byId(s.workers, a.workerId); if (a.woId === roll.woId && !a.rolledInto && a.date >= roll.from && a.date <= roll.to && w && w.trade === r.trade) a.rolledInto = id; }
      }
    }, { entity: "Attendance", id: roll.woId, action: `Rolled up ${fmtDate(roll.from)}–${fmtDate(roll.to)} into measurement book` });
    toast("Man-days posted to the measurement book (awaiting JMS)");
  };
  return (
    <Page title="Labour Attendance" subtitle="Worker-wise daily muster → man-days in the measurement book → RA bill" icon={Icon.users}>
      <StatGrid>
        <StatTile tone="blue" label="Workers on roll" value={st.workers.filter((w) => w.active).length} sub={`${new Set(st.workers.map((w) => w.vendorId)).size} contractor(s)`} icon={Icon.users} />
        <StatTile tone="green" label="Present yesterday" value={today.filter((a) => a.status !== "A").length} sub={`of ${today.length} marked`} icon={Icon.userCheck} />
        <StatTile tone="amber" label="Unverified days" value={st.attendance.filter((a) => !a.verified && !a.rolledInto).length} sub="Contractor-submitted" icon={Icon.clock} />
        <StatTile tone="purple" label="Man-days not yet billed" value={num(sum(st.attendance.filter((a) => !a.rolledInto), manDays))} icon={Icon.fileClock} />
      </StatGrid>
      <TabBar active={tab} onChange={setTab} tabs={[{ id: "muster", label: "Daily muster", icon: Icon.listChecks }, { id: "roll", label: "Roll up to measurement book", icon: Icon.ruler }, { id: "workers", label: "Workers", icon: Icon.hardHat }]} />
      {tab === "muster" && <AttendanceSheet />}
      {tab === "roll" && (
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Work order"><Select value={roll.woId} onChange={(x) => setRoll({ ...roll, woId: x })} options={st.workOrders.filter((w) => (w.items || []).some((i) => i.unit === "man-day")).map((w) => ({ value: w.id, label: `${w.id} — ${w.title}` }))} /></Field>
            <Field label="From"><DateInput value={roll.from} onChange={(x) => setRoll({ ...roll, from: x })} /></Field>
            <Field label="To"><DateInput value={roll.to} onChange={(x) => setRoll({ ...roll, to: x })} /></Field>
          </div>
          <DataTable rows={rows} rowKey={(r) => r.trade} empty={<EmptyState icon={Icon.check} title="Nothing to roll up" text="All attendance in this period is already in the measurement book." className="py-8" />} columns={[
            { key: "trade", label: "Trade", className: "font-medium" }, { key: "w", label: "Workers", align: "center", render: (r) => r.workers },
            { key: "d", label: "Man-days", align: "right", num: true, render: (r) => num(r.days) },
            { key: "ot", label: "OT hours", align: "right", num: true, render: (r) => `${num(r.ot)} → ${num(r.otDays)} md` },
            { key: "t", label: "Billable man-days", align: "right", render: (r) => <b className="num">{num(r.total)}</b> },
            { key: "i", label: "WO item", render: (r) => (r.item ? `${r.item.code} · ${r.item.desc}` : <Status tone="red">No matching man-day item</Status>) },
            { key: "rate", label: "WO rate vs card", align: "right", render: (r) => (r.item ? <span className="num">{inr(r.item.rate)}{r.card && <span className={cls("block text-[11px]", r.item.rate > r.card.rate ? "text-amber-700" : "text-ink-mute")}>card {inr(r.card.rate)}</span>}</span> : "—") },
            { key: "v", label: "Value", align: "right", num: true, render: (r) => (r.item ? inr(r.total * r.item.rate) : "—") },
            { key: "u", label: "", render: (r) => (r.unverified ? <Status tone="amber">{`${r.unverified} unverified`}</Status> : <Status tone="green">Verified</Status>) },
          ]} />
          {rows.length > 0 && <div className="flex justify-end"><Btn variant="primary" icon={Icon.ruler} disabled={rows.some((r) => r.unverified) || !rows.some((r) => r.item)} onClick={rollUp}>Post to measurement book</Btn></div>}
          {rows.some((r) => r.unverified) && <Note tone="amber">Verify the contractor-submitted days in the Daily muster tab before posting.</Note>}
        </div>
      )}
      {tab === "workers" && <DataTable noun="workers" rows={st.workers} columns={[
        { key: "id", label: "ID", className: "mono text-[12px]" }, { key: "name", label: "Worker", className: "font-medium" }, { key: "v", label: "Contractor", filter: (x) => vendorName(st, x.vendorId), render: (w) => vendorName(st, w.vendorId) },
        { key: "trade", label: "Trade", filter: true }, { key: "skill", label: "Skill", filter: true }, { key: "gatePass", label: "Gate pass", className: "mono text-[12px]" },
        { key: "ind", label: "Safety induction", render: (w) => fmtDate(w.inductionOn) },
        { key: "d", label: "Days (14d)", align: "right", render: (w) => num(sum(st.attendance.filter((a) => a.workerId === w.id && a.date >= shiftDays(-14)), manDays)) },
        { key: "s", label: "Status", filter: (w) => (w.active ? "Active" : "Inactive"), render: (w) => <Status tone={w.active ? "green" : "gray"}>{w.active ? "Active" : "Inactive"}</Status> },
      ]} />}
    </Page>
  );
}

