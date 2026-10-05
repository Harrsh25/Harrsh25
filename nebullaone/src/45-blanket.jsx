// Blanket orders: value position, release schedule (planned call-offs) and expiry / overdue-release alerts.
const blanketValue = (bo) => round2(sum(bo.lines, (l) => l.qty * l.rate));
const blanketOrderedValue = (st, bo) => round2(sum(blanketUsage(st, bo), (l) => l.ordered * l.rate));
const blanketRemainingValue = (st, bo) => round2(sum(blanketUsage(st, bo), (l) => Math.max(0, l.remaining) * l.rate));
// Each planned release is met once the call-offs on its line reach the cumulative scheduled quantity
function blanketReleases(st, bo) {
  const use = blanketUsage(st, bo), cum = {};
  return (bo.releases || []).slice().sort((a, b) => a.due.localeCompare(b.due)).map((r, i) => {
    cum[r.line] = (cum[r.line] || 0) + Number(r.qty);
    const ordered = use[r.line]?.ordered || 0, met = ordered >= cum[r.line] - 1e-9;
    const status = met ? "Released" : r.due < todayISO() ? "Overdue" : daysUntil(r.due) <= 7 ? "Due" : "Planned";
    return { ...r, key: `${r.due}-${r.line}-${i}`, desc: bo.lines[r.line]?.desc || "-", unit: bo.lines[r.line]?.unit || "", status, short: Math.max(0, Math.min(Number(r.qty), round2(cum[r.line] - ordered))) };
  });
}
const RELEASE_TONE = { Released: "green", Overdue: "red", Due: "amber", Planned: "blue" };
// Release rows entered on the form: complete, inside the agreement period, not above the agreed quantity per line
function releaseErrors(f) {
  const out = [], per = {};
  (f.releases || []).forEach((r, i) => {
    if (!r.due || r.line === "" || r.line == null || !(Number(r.qty) > 0)) out.push(`Release ${i + 1}: date, item and quantity required`);
    else if ((f.start && r.due < f.start) || (f.deadline && r.due > f.deadline)) out.push(`Release ${i + 1}: date must fall inside the agreement period`);
    per[r.line] = (per[r.line] || 0) + (Number(r.qty) || 0);
  });
  for (const [k, q] of Object.entries(per)) { const l = f.lines[Number(k)]; if (l && Number(l.qty) > 0 && q > Number(l.qty) + 1e-9) out.push(`Releases for "${l.desc}" add up to more than the agreed ${num(Number(l.qty))}`); }
  return out;
}

function ReleaseRows({ f, setF }) {
  const rel = f.releases || [];
  const setR = (i, k, v) => setF({ ...f, releases: rel.map((r, j) => (j === i ? { ...r, [k]: v } : r)) });
  const items = f.lines.map((l, i) => ({ value: String(i), label: l.desc || `Line ${i + 1}` }));
  return (
    <div className="space-y-2" data-release-rows>
      <div className="flex items-center justify-between"><span className="text-[12.5px] font-medium text-ink-soft">Release schedule</span><Btn size="sm" icon={Icon.plus} onClick={() => setF({ ...f, releases: [...rel, { due: "", line: "", qty: "" }] })}>Add release</Btn></div>
      {rel.map((r, i) => (
        <div key={i} className="grid grid-cols-[150px_1fr_130px_28px] gap-2">
          <DateInput value={r.due} onChange={(x) => setR(i, "due", x)} />
          <Select label="Item" value={r.line === "" || r.line == null ? "" : String(r.line)} onChange={(x) => setR(i, "line", x === "" ? "" : Number(x))} options={items} />
          <NumInput value={r.qty} onChange={(x) => setR(i, "qty", x)} placeholder="Quantity" />
          <IconBtn icon={Icon.trash} title="Remove" onClick={() => setF({ ...f, releases: rel.filter((_, j) => j !== i) })} />
        </div>
      ))}
    </div>
  );
}

function BlanketReleaseSection({ bo }) {
  const st = useStore();
  const [edit, setEdit] = y.useState(null);
  const rows = blanketReleases(st, bo);
  const live = blanketStatus(st, bo) === "Active";
  const err = edit ? releaseErrors({ ...bo, releases: edit }) : [];
  return (
    <Section title="Release schedule" icon={Icon.calendar} actions={live && <Btn size="sm" icon={Icon.pencil} onClick={() => setEdit((bo.releases || []).map((r) => ({ ...r })))}>Edit schedule</Btn>}>
      <DataTable dense rows={rows} rowKey={(r) => r.key} empty={<p className="p-4 text-[13px] text-ink-mute">No releases planned.</p>} columns={[
        { key: "due", label: "Due", render: (r) => fmtDate(r.due) }, { key: "desc", label: "Item", className: "whitespace-normal" },
        { key: "qty", label: "Planned", align: "right", num: true, render: (r) => `${num(Number(r.qty))} ${r.unit}` },
        { key: "s", label: "Status", render: (r) => <span className="flex flex-col items-start"><Status tone={RELEASE_TONE[r.status]}>{r.status}</Status>{r.status !== "Released" && r.short > 0 && <span className="text-[11.5px] text-ink-mute">{num(r.short)} still to call off</span>}</span> },
      ]} />
      {edit && (
        <Modal open onClose={() => setEdit(null)} width={640} title={`Release schedule - ${bo.id}`}
          footer={<><span className="mr-auto text-[12px] text-red-600">{err[0] || ""}</span><Btn onClick={() => setEdit(null)}>Cancel</Btn><Btn variant="primary" disabled={err.length > 0} onClick={() => {
            setState((s) => { byId(s.blanketOrders, bo.id).releases = edit.map((r) => ({ due: r.due, line: Number(r.line), qty: Number(r.qty) })); }, { entity: "Blanket Order", id: bo.id, action: `Release schedule set - ${edit.length} release(s)` });
            toast("Release schedule saved"); setEdit(null);
          }}>Save</Btn></>}>
          <ReleaseRows f={{ ...bo, releases: edit }} setF={(x) => setEdit(x.releases)} />
        </Modal>
      )}
    </Section>
  );
}

function blanketExceptions(st, add) {
  for (const bo of st.blanketOrders || []) {
    if (blanketStatus(st, bo) !== "Active") continue;
    const to = `${VM_BASE}/blanket-orders?open=${bo.id}`, left = blanketRemainingValue(st, bo);
    if (bo.deadline && daysUntil(bo.deadline) <= 30 && left > 0) add("Blanket agreement expiring", "Medium", "Blanket Order", bo.id, vendorName(st, bo.vendorId), `${bo.title} ends ${fmtDate(bo.deadline)} (${daysUntil(bo.deadline)} days) - ${inrShort(left)} not yet called off`, bo.deadline, to);
    for (const r of blanketReleases(st, bo).filter((x) => x.status === "Overdue")) add("Blanket release overdue", "Medium", "Blanket Order", bo.id, vendorName(st, bo.vendorId), `${r.desc}: ${num(r.short)} ${r.unit} planned for ${fmtDate(r.due)} not called off`, r.due, to);
  }
}

function seedBlanketReleases(s) {
  const bo = (s.blanketOrders || []).find((b) => b.id === "BO-001");
  if (!bo || bo.releases) return false;
  const D = (n) => new Date(Date.now() + n * DAY).toISOString().slice(0, 10);
  bo.releases = [{ due: D(-20), line: 0, qty: 5000 }, { due: D(10), line: 0, qty: 5000 }, { due: D(40), line: 1, qty: 3000 }];
  return true;
}
