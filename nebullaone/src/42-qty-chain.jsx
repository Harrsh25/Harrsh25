// Quantity chain per BOQ line: contract BOQ → work order → executed → measured (JMS) → certified → billed → paid → balance.
// Item-rate work orders only; lump-sum work orders are tracked by milestone % on the work order.
const RA_CERTIFIED = ["Certified", "Approved", "Paid"];
function qtyChain(st, c) {
  const wos = st.workOrders.filter((w) => w.contractId === c.id && w.type !== "Lump Sum" && w.status !== "Cancelled");
  const links = wos.flatMap((w) => (w.items || []).map((i) => ({ w, i })));
  const lineQty = (x) => {
    const mbs = st.measurements.filter((m) => m.woId === x.w.id && m.lineId === x.i.id);
    const bills = st.raBills.filter((b) => b.woId === x.w.id && b.status !== "Rejected");
    const inBills = (pick) => sum(bills.filter(pick).flatMap((b) => b.lines.filter((l) => l.lineId === x.i.id)), (l) => l.thisQty);
    return {
      ordered: x.i.qty, executed: sum(mbs.filter((m) => m.jms?.status !== "Rejected"), (m) => m.qty), measured: sum(mbs.filter((m) => m.jms?.status === "Signed"), (m) => m.qty),
      billed: inBills(() => true), certified: inBills((b) => RA_CERTIFIED.includes(b.status)), paid: inBills((b) => b.status === "Paid"),
    };
  };
  const roll = (key, base, ls) => {
    const q = ls.map(lineQty), t = (k) => round2(sum(q, (x) => x[k]));
    const rate = base.rate ?? ls[0]?.i.rate ?? 0, boq = base.boqQty;
    const row = { key, code: base.code, desc: base.desc, unit: base.unit, rate, boq, wos: [...new Set(ls.map((x) => x.w.id))], ordered: t("ordered"), executed: t("executed"), measured: t("measured"), certified: t("certified"), billed: t("billed"), paid: t("paid") };
    row.balance = round2((boq ?? row.ordered) - row.executed);
    row.flags = [boq != null && row.ordered > boq + 1e-9 && "Ordered above BOQ", row.executed > row.ordered + 1e-9 && "Executed above WO", row.billed > row.measured + 1e-9 && "Billed above measured"].filter(Boolean);
    return row;
  };
  const rows = (c.scope || []).map((l) => roll(l.id, { code: l.code, desc: l.desc, unit: l.unit, rate: l.rate, boqQty: l.qty }, links.filter((x) => x.i.boqRef === l.id)));
  // work-order lines not linked to a contract BOQ line: grouped by item code
  const loose = links.filter((x) => !x.i.boqRef || !(c.scope || []).some((l) => l.id === x.i.boqRef));
  const groups = {};
  for (const x of loose) (groups[`${x.i.code || x.i.desc}|${x.i.unit}`] = groups[`${x.i.code || x.i.desc}|${x.i.unit}`] || []).push(x);
  for (const [k, ls] of Object.entries(groups)) rows.push(roll(k, { code: ls[0].i.code, desc: ls[0].i.desc, unit: ls[0].i.unit, rate: ls[0].i.rate, boqQty: null }, ls));
  return rows;
}

function QtyChainSection({ c }) {
  const st = useStore();
  const rows = qtyChain(st, c);
  if (!rows.length) return null;
  const val = (k) => sum(rows, (r) => (k === "boq" ? r.boq ?? r.ordered : r[k]) * r.rate);
    return (
    <Section title="Quantity chain - BOQ to payment" icon={Icon.sheet}>
      <div data-qty-chain>
        {rows.map((r) => (
          <div key={r.key} className="border-b border-line px-4 py-2.5" data-chain-row>
            <div className="flex flex-wrap items-baseline gap-x-2"><span className="text-[13px] font-medium">{r.code ? `${r.code} · ` : ""}{r.desc}</span><span className="text-[11.5px] text-ink-mute">{r.unit} · {inr(r.rate)} · {r.wos.join(", ") || "no work order yet"}</span>{r.flags.map((f) => <span key={f} className="text-[11.5px] font-medium text-red-600">{f}</span>)}</div>
            <div className="mt-1.5 grid grid-cols-8 gap-1">
              {[["BOQ", r.boq], ["WO", r.ordered], ["Executed", r.executed, r.executed > r.ordered + 1e-9], ["Measured", r.measured], ["Certified", r.certified], ["Billed", r.billed, r.billed > r.measured + 1e-9], ["Paid", r.paid], ["Balance", r.balance, r.balance < 0]].map(([l, v, bad]) => (
                <div key={l} className="rounded-md bg-gray-50 px-2 py-1"><div className="text-[10.5px] uppercase tracking-wide text-ink-mute">{l}</div><div className={cls("num text-[12.5px] font-semibold", bad && "text-red-600")}>{v == null ? "-" : num(v)}</div></div>
              ))}
            </div>
          </div>
        ))}
        <div className="grid grid-cols-4 gap-x-6 gap-y-1 border-t border-line px-4 py-2.5 text-[12.5px]">
          {[["BOQ / WO value", val("boq")], ["Executed", val("executed")], ["Measured (JMS)", val("measured")], ["Certified", val("certified")], ["Billed", val("billed")], ["Paid", val("paid")], ["Certified, not paid", val("certified") - val("paid")], ["Balance to execute", sum(rows, (r) => r.balance * r.rate)]].map(([l, v]) => (
            <span key={l} className="flex justify-between gap-2"><span className="text-ink-soft">{l}</span><b className="num">{inrShort(v)}</b></span>
          ))}
        </div>
      </div>
    </Section>
  );
}

// Demo data: CTR-001 gets its contract BOQ and the work-order lines are linked to it
function seedContractBoq(s) {
  const c = (s.contracts || []).find((x) => x.id === "CTR-001");
  if (!c || c.scope?.length || s.boqSeeded) return false;
  s.boqSeeded = true;
  c.scope = [["S1", "2.1", "PCC M15 in foundations", "cum", 900, 5850], ["S2", "3.4", "RCC M30 in raft, columns & slabs", "cum", 3200, 7450], ["S3", "4.1", "Reinforcement Fe500D - cut, bend & place (labour only)", "MT", 420, 9800],
    ["S4", "5.2", "Formwork / shuttering for slabs, beams & columns", "sqm", 12000, 610], ["S5", "6.1", "Brick masonry 230 mm in CM 1:6", "cum", 1200, 6150]].map(([id, code, desc, unit, qty, rate]) => ({ id, code, desc, unit, qty, rate }));
  for (const w of (s.workOrders || []).filter((x) => x.contractId === "CTR-001")) for (const i of w.items || []) { const l = c.scope.find((x) => x.code === i.code); if (l && !i.boqRef) i.boqRef = l.id; }
  return true;
}
