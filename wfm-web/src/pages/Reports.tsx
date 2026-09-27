import { Fragment, useState } from "react";
import { Building, ClipboardList, Grid2x2, Layers, Shapes, Users, Wrench, Zap } from "lucide-react";
import {
  DatesButton, Divider, EmptyState, FooterStats, IconBtn, PageCard, PageHeader, SearchDownload, SelectProject,
  StatusDot, Td, Th, Toolbar, cx, nowStamp,
} from "../components/ui";
import { Category, assignedVsCompleted, costRows, inr, num, quantityRows } from "../data/demo";

const catStyle: Record<Category, { cls: string; icon: typeof Building }> = {
  Concrete: { cls: "border-gray-300 bg-white text-ink-soft", icon: Building },
  Steel: { cls: "border-blue-200 bg-blue-50 text-blue-700", icon: Wrench },
  Electrical: { cls: "border-amber-200 bg-amber-50 text-amber-700", icon: Zap },
  Masonry: { cls: "border-orange-200 bg-orange-50 text-orange-700", icon: Grid2x2 },
};

function GroupRow({ cat, count, span }: { cat: Category; count: number; span: number }) {
  const s = catStyle[cat];
  return (
    <tr className="bg-[#f6f6f4]">
      <td colSpan={span} className="border-b border-line px-3 py-1.5">
        <span className={cx("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px] font-semibold", s.cls)}>
          <s.icon size={11} /> {cat}
        </span>
        <span className="ml-2 text-[12px] text-ink-mute">{count} {count === 1 ? "item" : "items"}</span>
      </td>
    </tr>
  );
}

function grouped<T extends { cat: Category }>(rows: T[]) {
  const map = new Map<Category, T[]>();
  rows.forEach((r) => map.set(r.cat, [...(map.get(r.cat) ?? []), r]));
  return [...map.entries()];
}

export function AssignedVsCompleted() {
  const [project, setProject] = useState<string>();
  const rows = project ? assignedVsCompleted : [];
  const avg = rows.length ? rows.reduce((s, r) => s + (r.cTasks / r.aTasks) * 100, 0) / rows.length : 0;
  return (
    <PageCard>
      <PageHeader title="Assigned vs Completed Report" actions={<SelectProject value={project} onChange={setProject} />} />
      <Toolbar left={<><IconBtn icon={Users} /><IconBtn icon={Shapes} /><StatusDot /><Divider /><DatesButton /></>} right={<SearchDownload />} />
      <table className="w-full">
        <thead><tr>
          {["WBS", "Resource", "Assigned Date", "Due Date", "Assigned Tasks", "Completed Date", "Completed Tasks", "Pending", "% Completion", "Delay"].map((h) => <Th key={h}>{h}</Th>)}
        </tr></thead>
        <tbody>
          {rows.map((r) => {
            const pct = (r.cTasks / r.aTasks) * 100;
            return (
              <tr key={r.wbs} className="hover:bg-gray-50">
                <Td className="font-medium">{r.wbs}</Td><Td>{r.resource}</Td><Td>{r.assigned}</Td><Td>{r.due}</Td>
                <Td align="center">{r.aTasks}</Td><Td>{r.cDate}</Td><Td align="center">{r.cTasks}</Td><Td align="center">{r.aTasks - r.cTasks}</Td>
                <Td align="center" className={pct === 100 ? "font-semibold text-green-600" : ""}>{pct.toFixed(1)}%</Td>
                <Td align="center" className={r.delay ? "font-semibold text-red-600" : "text-ink-mute"}>{r.delay ? `${r.delay}d` : "—"}</Td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!rows.length && <EmptyState icon={ClipboardList} title="No report data yet" text="No report rows matched the selected filters." className="border-b border-line py-12" />}
      <FooterStats
        items={[
          { value: rows.length, label: "Rows" },
          { value: `${avg.toFixed(1)}%`, label: "Avg. Completion", color: "text-brand" },
          { value: rows.filter((r) => r.delay).length, label: "Delayed", color: "text-red-600" },
        ]}
        updated={nowStamp()}
        range={`${rows.length ? 1 : 0}–${rows.length} of ${rows.length}`}
      />
    </PageCard>
  );
}

export function QuantityTracking() {
  const [project, setProject] = useState<string>();
  const avg = quantityRows.reduce((s, r) => s + (r.executed / r.planned) * 100, 0) / quantityRows.length;
  return (
    <PageCard>
      <PageHeader title="Quantity Wise Tracking Report" actions={<SelectProject value={project} onChange={setProject} />} />
      <Toolbar left={<><IconBtn icon={Layers} /><Divider /><DatesButton /></>} right={<SearchDownload />} />
      <table className="w-full">
        <thead><tr>
          <Th>WBS</Th><Th>Material Description</Th><Th>Unit</Th><Th align="right">Planned Quantity</Th><Th align="right">Executed Quantity</Th><Th align="right">Balance Quantity</Th><Th>Material Consumption %</Th>
        </tr></thead>
        <tbody>
          {grouped(quantityRows).map(([cat, rows]) => (
            <Fragment key={cat}>
              <GroupRow cat={cat} count={rows.length} span={7} />
              {rows.map((r) => (
                <tr key={r.wbs + r.material} className="hover:bg-gray-50">
                  <Td className="font-medium">{r.wbs}</Td><Td>{r.material}</Td><Td>{r.unit}</Td>
                  <Td align="right" className="num">{num(r.planned)}</Td><Td align="right" className="num">{num(r.executed)}</Td>
                  <Td align="right" className="num">{num(r.planned - r.executed)}</Td>
                  <Td align="center" className="num">{((r.executed / r.planned) * 100).toFixed(1)}%</Td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
      <FooterStats items={[{ value: quantityRows.length, label: "Rows" }, { value: `${avg.toFixed(1)}%`, label: "Avg. Consumption", color: "text-cyan-600" }]} updated={nowStamp()} range={`1–${quantityRows.length} of ${quantityRows.length}`} />
    </PageCard>
  );
}

export function CostTracking() {
  const [project, setProject] = useState<string>();
  const cpis = costRows.map((r) => (r.qtyUsed * r.rate) / (r.qtyUsed * r.rate));
  const avgCpi = cpis.reduce((a, b) => a + b, 0) / cpis.length;
  return (
    <PageCard>
      <PageHeader title="Cost Wise Tracking Report" actions={<SelectProject value={project} onChange={setProject} />} />
      <Toolbar left={<><IconBtn icon={Layers} /><Divider /><DatesButton /></>} right={<SearchDownload />} />
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr>
            <Th>WBS</Th><Th align="right">Budget Cost</Th><Th>Material</Th><Th align="right">Rate</Th><Th align="right">Quantity (Total)</Th><Th align="right">Total Cost</Th>
            <Th align="right">Quantity (Assigned)</Th><Th align="right">Assigned Cost</Th><Th align="right">Quantity (Used)</Th><Th align="right">Actual Cost</Th><Th align="right">Variance</Th>
          </tr></thead>
          <tbody>
            {grouped(costRows).map(([cat, rows]) => (
              <Fragment key={cat}>
                <GroupRow cat={cat} count={rows.length} span={11} />
                {rows.map((r) => {
                  const total = r.qty * r.rate, assigned = r.qtyAssigned * r.rate, actual = r.qtyUsed * r.rate;
                  return (
                    <tr key={r.wbs} className="hover:bg-gray-50">
                      <Td className="font-medium">{r.wbs}</Td><Td align="right" className="num">{inr(r.budget)}</Td><Td>{r.material}</Td>
                      <Td align="right" className="num">{inr(r.rate)}</Td><Td align="right" className="num">{num(r.qty)}</Td><Td align="right" className="num">{inr(total)}</Td>
                      <Td align="right" className="num">{num(r.qtyAssigned)}</Td><Td align="right" className="num">{inr(assigned)}</Td>
                      <Td align="right" className="num">{num(r.qtyUsed)}</Td><Td align="right" className="num">{inr(actual)}</Td>
                      <Td align="right" className="num font-medium text-green-600">{inr(r.budget - actual)}</Td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <FooterStats items={[{ value: costRows.length, label: "Rows" }, { value: avgCpi.toFixed(2), label: "Avg. CPI", color: "text-violet-600" }]} updated={nowStamp()} range={`1–${costRows.length} of ${costRows.length}`} />
    </PageCard>
  );
}
