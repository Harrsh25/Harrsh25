// Earned value & productivity per work order: baseline vs forecast finish, PV / EV / AC, SPI / CPI,
// value and cost per day, quantity per day per item, and output per man-day.
//   PV = planned % of the WO value · EV = value measured (JMS signed) · AC = value billed in RA bills
function woEv(st, wo) {
  const p = woProgress(st, wo), bac = woValue(wo) || 0;
  const base = wo.baseline || { start: wo.start, end: wo.end };
  const elapsed = Math.max(1, Math.round((Math.min(Date.now(), new Date(wo.end).getTime() + DAY) - new Date(wo.start).getTime()) / DAY));
  const left = Math.max(0, daysUntil(wo.end));
  const pv = round2((bac * p.planned) / 100), ev = round2(p.measured), ac = round2(p.billed);
  const forecastEnd = p.physical >= 99.9 ? null : p.physical >= 1 ? shiftDays(Math.round(elapsed / (p.physical / 100)), wo.start) : null;
  const slip = forecastEnd ? Math.round((new Date(forecastEnd) - new Date(base.end)) / DAY) : null;
  const att = st.attendance.filter((a) => a.woId === wo.id), dprs = (st.dprs || []).filter((d) => d.woId === wo.id);
  const manDaysN = round2(sum(att, manDays) + sum(dprs, (d) => Number(d.manpower) || 0));
  return {
    p, bac, base, forecastEnd, slip, pv, ev, ac, spi: pv > 0 ? ev / pv : null, cpi: ac > 0 ? ev / ac : null,
    valuePerDay: ev / elapsed, costPerDay: ac / elapsed, needPerDay: left > 0 ? Math.max(0, bac - ev) / left : null, elapsed, left,
    manDays: manDaysN, perManDay: manDaysN > 0 ? ev / manDaysN : null,
  };
}
const idxTone = (x) => (x == null ? "" : x < 0.8 ? "text-red-600" : x < 0.95 ? "text-amber-600" : "text-green-700");
const idx = (x) => (x == null ? "-" : x.toFixed(2));

function EvTab({ rows, onOpen }) {
  const st = useStore();
  const data = rows.map((x) => ({ ...x, e: woEv(st, x.wo) }));
  return (
    <DataTable noun="work orders" rows={data} rowKey={(x) => x.wo.id} onRow={(x) => onOpen(x.wo.id)} columns={[
      { key: "t", label: "Work order", className: "max-w-[230px]", render: (x) => <span className="flex flex-col"><span className="truncate font-medium" title={x.wo.title}>{x.wo.title}</span><span className="text-[11.5px] text-ink-mute">{x.wo.id} · {vendorName(st, x.wo.vendorId)}</span></span> },
      { key: "sch", label: "Baseline → forecast finish", render: (x) => <span className="flex flex-col text-[12.5px]"><span>{fmtDate(x.e.base.end)} → {x.e.forecastEnd ? fmtDate(x.e.forecastEnd) : "-"}</span>{x.e.slip != null && <span className={x.e.slip > 0 ? "text-red-600" : "text-green-700"}>{x.e.slip > 0 ? `${x.e.slip} days late` : x.e.slip < 0 ? `${-x.e.slip} days early` : "on baseline"}</span>}</span> },
      { key: "ev", label: "PV · EV · AC", align: "right", render: (x) => <span className="flex flex-col text-right text-[12.5px]"><span className="num">{inrShort(x.e.pv)} · <b>{inrShort(x.e.ev)}</b> · {inrShort(x.e.ac)}</span><span className="text-ink-mute">of {inrShort(x.e.bac)}</span></span> },
      { key: "ix", label: "SPI · CPI", align: "right", render: (x) => <span className="num font-semibold"><span className={idxTone(x.e.spi)}>{idx(x.e.spi)}</span> · <span className={idxTone(x.e.cpi)}>{idx(x.e.cpi)}</span></span> },
      { key: "rate", label: "Per day · output per man-day", align: "right", render: (x) => <span className="flex flex-col text-right text-[12.5px]"><span className="num">value {inrShort(x.e.valuePerDay)} · cost {inrShort(x.e.costPerDay)}</span>{x.e.needPerDay != null && <span className={cls(x.e.needPerDay > x.e.valuePerDay * 1.1 ? "text-red-600" : "text-ink-mute")}>need {inrShort(x.e.needPerDay)}/day</span>}<span className="text-ink-soft">{x.e.perManDay != null ? `${inr(Math.round(x.e.perManDay))} per man-day (${num(x.e.manDays)})` : "no muster / DPR"}</span></span> },
    ]} />
  );
}

// On the work order: schedule, earned value and per-item quantity per day
function WoEvSection({ wo }) {
  const st = useStore();
  if (!["Issued", "In Progress", "Completed", "Suspended"].includes(wo.status)) return null;
  const e = woEv(st, wo);
  const lines = wo.type === "Lump Sum" ? [] : woPosition(st, wo).map((x) => ({ ...x, perDay: x.measured / e.elapsed, need: e.left > 0 ? Math.max(0, x.total - x.measured) / e.left : null }));
  return (
    <Section title="Earned value & productivity" icon={Icon.trending}>
      <div data-wo-ev>
        <KV items={[["Baseline", `${fmtDate(e.base.start)} → ${fmtDate(e.base.end)}`], ["Forecast finish", e.forecastEnd ? `${fmtDate(e.forecastEnd)}${e.slip ? ` (${e.slip > 0 ? `${e.slip} days late` : `${-e.slip} days early`})` : ""}` : e.p.physical >= 99.9 ? "Complete" : "Not enough progress to forecast"],
          ["PV · EV · AC", `${inr(e.pv)} · ${inr(e.ev)} · ${inr(e.ac)}`], ["SPI · CPI", `${idx(e.spi)} · ${idx(e.cpi)}`], ["Value · cost per day", `${inr(Math.round(e.valuePerDay))} · ${inr(Math.round(e.costPerDay))}`],
          ["Output per man-day", e.perManDay != null ? `${inr(Math.round(e.perManDay))} (${num(e.manDays)} man-days)` : "-"]]} />
        {lines.length > 0 && <DataTable dense plain rows={lines} rowKey={(x) => x.line.id} columns={[
          { key: "i", label: "Item", className: "whitespace-normal", render: (x) => x.line.desc }, { key: "m", label: "Measured", align: "right", render: (x) => <span className="num">{num(x.measured)} / {num(x.total)} {x.unit}</span> },
          { key: "d", label: "Qty per day", align: "right", render: (x) => <span className="num">{num(round2(x.perDay))}</span> },
          { key: "n", label: "Needed per day", align: "right", render: (x) => <span className={cls("num", x.need != null && x.need > x.perDay * 1.1 && "text-red-600")}>{x.need == null ? "-" : num(round2(x.need))}</span> },
        ]} />}
      </div>
    </Section>
  );
}
// Baseline = the dates the work order was issued with (kept when dates move later)
function seedBaselines(s) {
  let ch = false;
  for (const w of s.workOrders || []) if (!w.baseline && w.start && w.end) { w.baseline = { start: w.start, end: w.end }; ch = true; }
  return ch;
}
