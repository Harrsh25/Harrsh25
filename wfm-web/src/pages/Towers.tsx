import { useState } from "react";
import {
  BookOpen, Building2, CalendarDays, CheckCircle2, ChevronsUpDown, ClipboardList, Download, FileClock, FileText,
  Expand, Grip, LogIn, Ruler, SlidersHorizontal, TrendingUp, Cable, Boxes, Clock,
} from "lucide-react";
import {
  Badge, DatesButton, Divider, Dropdown, EmptyState, ErrorState, FooterStats, GhostButton, PageCard, PageHeader,
  PrimaryButton, SearchMore, SelectProject, StatCard, Tabs, Td, Th, Toolbar, cx, nowStamp,
} from "../components/ui";
import { attendance, foundationRows, l2Activities, l2Construction, num, towers } from "../data/demo";

const grpTh = "border-b border-r border-line px-3 py-2 text-center text-[11.5px] font-semibold tracking-wide";

/* ── Tower Schedule (upload + approval) ────────────── */
function TowerSchedule({ approval }: { approval?: boolean }) {
  const [project, setProject] = useState<string>();
  const rows = project ? towers : [];
  const count = (s: string) => rows.filter((t) => t.status === s).length;
  let cum = 0;
  return (
    <PageCard>
      <PageHeader
        title={approval ? "Tower Schedule Approval" : "Tower Schedule Upload"}
        subtitle="Tower Schedule"
        actions={<>{approval && project && <PrimaryButton icon={CheckCircle2}>Approve Selected</PrimaryButton>}<SelectProject value={project} onChange={setProject} /></>}
      />
      <div className="grid grid-cols-4 gap-3 border-b border-line p-4">
        <StatCard tone="blue" label="Total Towers" value={rows.length} icon={Building2} />
        <StatCard tone="purple" label="Gantry Filled" value={count("Gantry Filled")} icon={Building2} />
        <StatCard tone="amber" label="In Draft" value={count("Draft")} icon={FileClock} />
        <StatCard tone="green" label="Approved" value={count("Approved")} icon={CheckCircle2} />
      </div>
      <Toolbar right={<SearchMore />} />
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th rowSpan={2} className="w-10 border-b border-r border-line bg-gray-50"><input type="checkbox" /></th>
              {["S No.", "AP No.", "Angle Deviation", "LOC. No.", "Tower Type"].map((h) => <th key={h} rowSpan={2} className="whitespace-nowrap border-b border-r border-line bg-gray-50 px-3 text-[11.5px] font-semibold text-ink-soft">{h}</th>)}
              <th colSpan={3} className={cx(grpTh, "bg-blue-50 text-blue-700")}>LENGTH (MTRS.)</th>
              <th colSpan={3} className={cx(grpTh, "bg-green-50 text-green-700")}>WEIGHT SPAN (COLD)</th>
              <th colSpan={3} className={cx(grpTh, "bg-orange-50 text-orange-600")}>WEIGHT SPAN (HOT)</th>
              <th colSpan={2} className={cx(grpTh, "bg-violet-50 text-violet-700")}>COORDINATES</th>
              <th rowSpan={2} className="whitespace-nowrap border-b border-r border-line bg-gray-50 px-3 text-[11.5px] font-semibold text-ink-soft">Wind Span</th>
              <th rowSpan={2} className="border-b border-line bg-gray-50 px-3 text-[11.5px] font-semibold text-ink-soft">Status</th>
            </tr>
            <tr>
              {["SPAN", "SEC.", "CUM."].map((h) => <th key={h} className={cx(grpTh, "bg-blue-50/60 text-blue-700")}>{h}</th>)}
              {["LEFT", "RIGHT", "TOTAL"].map((h) => <th key={"c" + h} className={cx(grpTh, "bg-green-50/60 text-green-700")}>{h}</th>)}
              {["LEFT", "RIGHT", "TOTAL"].map((h) => <th key={"h" + h} className={cx(grpTh, "bg-orange-50/60 text-orange-600")}>{h}</th>)}
              {["X", "Y"].map((h) => <th key={h} className={cx(grpTh, "bg-violet-50/60 text-violet-700")}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((t, i) => {
              cum += t.span;
              return (
                <tr key={t.ap} className="hover:bg-gray-50">
                  <Td align="center"><input type="checkbox" /></Td><Td align="center">{i + 1}</Td><Td className="font-medium">{t.ap}</Td><Td>{t.angle}</Td><Td>{t.loc}</Td><Td>{t.type}</Td>
                  <Td align="right" className="num">{t.span}</Td><Td align="right" className="num">{i < 5 ? 1 : 2}</Td><Td align="right" className="num">{num(cum)}</Td>
                  <Td align="right" className="num">{t.wcL}</Td><Td align="right" className="num">{t.wcR}</Td><Td align="right" className="num">{t.wcL + t.wcR}</Td>
                  <Td align="right" className="num">{t.whL}</Td><Td align="right" className="num">{t.whR}</Td><Td align="right" className="num">{t.whL + t.whR}</Td>
                  <Td align="right" className="num">{t.x}</Td><Td align="right" className="num">{t.y}</Td><Td align="right" className="num">{Math.round(t.span * 1.02)}</Td>
                  <Td><Badge>{t.status}</Badge></Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!rows.length && <EmptyState icon={FileText} title="Select a project" text="Use the project selector above to load its tower schedule." className="border-b border-line py-16" />}
      <FooterStats items={[]} updated={nowStamp()} />
    </PageCard>
  );
}
export const TowerScheduleUpload = () => <TowerSchedule />;
export const TowerScheduleApproval = () => <TowerSchedule approval />;

/* ── Foundation Matrix ─────────────────────────────── */
export function FoundationMatrix() {
  const [project, setProject] = useState<string>();
  const rows = project ? foundationRows : [];
  return (
    <PageCard>
      <PageHeader title="Foundation Matrix Upload" actions={<SelectProject value={project} onChange={setProject} />} />
      <div className="grid grid-cols-3 gap-3 border-b border-line p-4">
        <StatCard tone="blue" label="Total Towers" value={rows.length} icon={Building2} />
        <StatCard tone="amber" label="In Draft" value={rows.length ? 2 : 0} icon={FileClock} />
        <StatCard tone="green" label="Approved" value={rows.length ? rows.length - 2 : 0} icon={CheckCircle2} />
      </div>
      <Toolbar left={<><Dropdown label="Tower Type" width={125} /><Dropdown label="Soil Type" width={115} /><Dropdown label="Leg Ext." width={105} /></>} right={<SearchMore />} />
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th rowSpan={2} className="border-b border-r border-line bg-gray-50 px-3 text-[11.5px] font-semibold text-ink-soft">S No.</th>
              <th colSpan={4} className={cx(grpTh, "bg-blue-50 text-blue-700")}>Tower Details</th>
              <th rowSpan={2} className="border-b border-r border-line bg-gray-50 px-3 text-[11.5px] font-semibold text-ink-soft">Soil Type</th>
              <th colSpan={6} className={cx(grpTh, "bg-green-50 text-green-700")}>Quantities per Leg</th>
            </tr>
            <tr>
              {["Tower", "Location No.", "Type", "Leg Ext."].map((h) => <th key={h} className={cx(grpTh, "bg-blue-50/60 text-blue-700")}>{h}</th>)}
              {["Excavation", "M-10", "M-20", "Steel", "Stub HT", "Stub WT"].map((h) => <th key={h} className={cx(grpTh, "bg-green-50/60 text-green-700")}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.tower} className="hover:bg-gray-50">
                <Td align="center">{i + 1}</Td><Td className="font-medium">{r.tower}</Td><Td>{r.loc}</Td><Td>{r.type}</Td><Td>{r.leg}</Td><Td>{r.soil}</Td>
                <Td align="right" className="num">{r.excavation.toFixed(2)}</Td><Td align="right" className="num">{r.m10.toFixed(2)}</Td><Td align="right" className="num">{r.m20.toFixed(2)}</Td>
                <Td align="right" className="num">{r.steel.toFixed(2)}</Td><Td align="right" className="num">{r.stubHt.toFixed(3)}</Td><Td align="right" className="num">{r.stubWt}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <p className="border-b border-line py-16 text-center text-[13px] text-ink-mute">No rows yet. Upload a foundation matrix file to get started.</p>}
      <FooterStats items={[]} updated={nowStamp()} />
    </PageCard>
  );
}

/* ── L2 Schedule (Gantt) ───────────────────────────── */
const months = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
const barColor: Record<string, string> = { Planned: "bg-amber-300", "In Progress": "bg-blue-400", Completed: "bg-green-400", Delayed: "bg-red-400" };

export function L2Schedule() {
  const [tab, setTab] = useState("supply");
  const [project, setProject] = useState<string>();
  const rows = project ? (tab === "supply" ? l2Activities : l2Construction) : [];
  const c = (s: string) => rows.filter((r) => r.status === s).length;
  return (
    <PageCard>
      <PageHeader title="L2 Schedule" actions={<SelectProject value={project} onChange={setProject} />} />
      <Tabs tabs={[{ id: "supply", label: "L2 Schedule — Supply", icon: ClipboardList }, { id: "construction", label: "L2 Schedule — Construction", icon: ClipboardList }]} active={tab} onChange={setTab} />
      <Toolbar left={<><Dropdown label="All Status" width={165} /><DatesButton /><Divider /><ChevronsUpDown size={15} className="text-ink-soft" /></>} right={<SearchMore />} />
      <div className="flex border-b border-line">
        <div className="w-[520px] shrink-0 border-r-2 border-line">
          <div className="grid grid-cols-[1fr_65px_65px] border-b border-line bg-gray-50 text-[11.5px] font-semibold tracking-wider text-ink-soft">
            <span className="px-3 py-2.5">ACTIVITY / WBS</span><span className="border-l border-line px-3 py-2.5 text-center">UOM</span><span className="border-l border-line px-3 py-2.5 text-center">QTY</span>
          </div>
          {rows.map((r) => (
            <div key={r.name} className="grid h-10 grid-cols-[1fr_65px_65px] items-center border-b border-line text-[13px]">
              <span className="px-3 font-medium">{r.name}</span><span className="text-center text-ink-soft">{r.uom}</span><span className="num text-center">{num(r.qty)}</span>
            </div>
          ))}
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-6 border-b border-line bg-gray-50 text-center text-[11.5px] font-semibold text-ink-soft">
            {months.map((m) => <span key={m} className="border-l border-line py-2.5 first:border-l-0">{m} 2026</span>)}
          </div>
          {rows.map((r) => (
            <div key={r.name} className="relative h-10 border-b border-line">
              <div className="absolute inset-0 grid grid-cols-6">{months.map((m) => <span key={m} className="border-l border-dashed border-gray-100 first:border-l-0" />)}</div>
              <span className={cx("absolute top-3 h-4 rounded-md", barColor[r.status])} style={{ left: `${(r.start / 6) * 100 + 1}%`, width: `${(r.len / 6) * 100 - 2}%` }} />
            </div>
          ))}
        </div>
      </div>
      {!rows.length && <p className="py-16 text-center text-[13px] text-ink-soft">No activities match your filters.</p>}
      <div className="mx-auto mb-3 mt-auto flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-1.5 text-[12px] shadow-sm">
        <Grip size={13} className="text-ink-faint" /><Divider />
        {["W", "M", "Q", "Y"].map((z) => <span key={z} className={cx("rounded-md px-2 py-0.5 font-medium", z === "M" ? "bg-white text-brand shadow ring-1 ring-line" : "text-ink-soft")}>{z}</span>)}
        <Divider /><span className="rounded-md border border-line px-1.5 text-ink-soft">{new Date().getDate()}</span><Divider />
        <SlidersHorizontal size={13} className="text-ink-soft" /><Expand size={13} className="text-ink-soft" />
      </div>
      <FooterStats items={[
        { value: rows.length, label: "Activities" }, { value: c("Planned"), label: "Planned" }, { value: c("In Progress"), label: "In Progress" },
        { value: c("Completed"), label: "Completed" }, { value: c("Delayed"), label: "Delayed" },
      ]} />
    </PageCard>
  );
}

/* ── Tower Progress ────────────────────────────────── */
export function TowerProgress() {
  const [project, setProject] = useState<string>();
  const rows = project ? towers : [];
  const avg = (k: "foundation" | "erection" | "stringing") => (rows.length ? Math.round(rows.reduce((s, t) => s + t[k], 0) / rows.length) : 0);
  return (
    <PageCard>
      <PageHeader title="Tower Progress" actions={<SelectProject value={project} onChange={setProject} />} />
      <div className="grid grid-cols-6 gap-3 border-b border-line p-4">
        <StatCard tone="blue" label="Total Towers" value={rows.length} icon={Building2} />
        <StatCard tone="purple" label="Total Gantry" value={rows.length ? 2 : 0} icon={Boxes} />
        <StatCard tone="green" label="Towers Completed" value={rows.filter((t) => t.stringing === 100).length} icon={CheckCircle2} />
        <StatCard tone="blue" label="Foundation Avg" value={`${avg("foundation")}%`} icon={Ruler} />
        <StatCard tone="amber" label="Erection Avg" value={`${avg("erection")}%`} icon={TrendingUp} />
        <StatCard tone="purple" label="Stringing Avg" value={`${avg("stringing")}%`} icon={Cable} />
      </div>
      <Toolbar right={<SearchMore />} />
      <table className="w-full">
        <thead><tr><Th>S No.</Th><Th>Tower</Th><Th>Location</Th><Th align="center">Total %</Th><Th align="center">Status</Th></tr></thead>
        <tbody>{rows.map((t, i) => {
          const total = Math.round((t.foundation + t.erection + t.stringing) / 3);
          return (
            <tr key={t.ap} className="hover:bg-gray-50">
              <Td>{i + 1}</Td><Td className="font-medium">{t.ap}</Td><Td>{t.loc}</Td>
              <Td align="center"><span className="inline-flex"><span className="h-1.5 w-28 overflow-hidden rounded-full bg-gray-200"><span className="block h-full rounded-full bg-brand" style={{ width: `${total}%` }} /></span><span className="num ml-2 w-9 text-right text-[12px]">{total}%</span></span></Td>
              <Td align="center"><Badge>{total === 100 ? "Completed" : total === 0 ? "Not Started" : "In Progress"}</Badge></Td>
            </tr>
          );
        })}</tbody>
      </table>
      {!rows.length && <p className="border-b border-line py-10 text-center text-[13px] text-ink-soft">No tower progress data found.</p>}
      <FooterStats items={[]} updated={nowStamp()} />
    </PageCard>
  );
}

/* ── Visual Chart ──────────────────────────────────── */
const activities = [
  { name: "ROW (Right of Way)", key: "row" }, { name: "Revetment", key: "rev" }, { name: "Foundation", key: "foundation" },
  { name: "Tower Erection", key: "erection" }, { name: "Tack Welding / Punching", key: "tack" }, { name: "Stringing (m)", key: "stringing" },
  { name: "OPGW / Earthwire", key: "opgw" },
];
export function VisualChart() {
  const [project, setProject] = useState<string>();
  const has = !!project;
  const scope = has ? towers.length : 0;
  const done: Record<string, number> = has
    ? { row: 10, rev: 7, foundation: towers.filter((t) => t.foundation === 100).length, erection: towers.filter((t) => t.erection === 100).length, tack: 2, stringing: 1, opgw: 1 }
    : {};
  const erected = done.erection ?? 0;
  const stat = (tone: Parameters<typeof StatCard>[0]["tone"], label: string, v: string | number, sub: string) => <StatCard tone={tone} label={label} value={v} sub={sub} />;
  return (
    <PageCard>
      <PageHeader title="Visual Chart" actions={<><SelectProject value={project} onChange={setProject} /><GhostButton icon={BookOpen}>Legends</GhostButton><GhostButton icon={Download}>Export</GhostButton></>} />
      <div className="grid grid-cols-8 gap-2 border-b border-line p-4">
        {stat("blue", "Towers", scope, `${has ? 2 : 0} gantry`)}{stat("purple", "Sections", has ? 2 : 0, "")}
        {stat("red", "ROW", done.row ?? 0, String(scope))}{stat("orange", "Revetment", done.rev ?? 0, String(scope))}
        {stat("green", "Foundation", done.foundation ?? 0, String(scope))}{stat("blue", "Erection", erected, String(scope))}
        {stat("cyan", "Stringing", done.stringing ?? 0, `${has ? "3.15" : "0.00"}km`)}{stat("amber", "OPGW", done.opgw ?? 0, String(scope))}
      </div>
      {has && (
        <div className="flex flex-wrap gap-1.5 border-b border-line px-4 py-3">
          {towers.map((t) => (
            <span key={t.ap} title={t.ap} className={cx("grid h-9 w-14 place-items-center rounded-md text-[11px] font-semibold text-white", t.erection === 100 ? "bg-green-500" : t.foundation === 100 ? "bg-blue-500" : t.foundation > 0 ? "bg-amber-400" : "bg-gray-300")}>{t.ap}</span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between border-b border-line px-4 py-3 text-[12.5px]">
        <span className="font-semibold tracking-wider text-ink-soft">SUMMARY OF TOWERS</span>
        <span className="flex items-center gap-4"><span className="h-1 w-24 rounded-full bg-gray-200"><span className="block h-full rounded-full bg-green-500" style={{ width: `${scope ? (erected / scope) * 100 : 0}%` }} /></span>
          <b className="mono text-[11px]">{scope ? Math.round((erected / scope) * 100) : 0}%</b><span className="text-ink-soft">{erected} / {scope} erected</span></span>
      </div>
      <div className="m-4 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 text-[12.5px]">
        <span className="font-semibold tracking-wider text-ink-soft">GRAND TOTAL</span>
        <span className="flex items-center gap-3 text-ink-soft">{has ? 5 : 0} types <Divider /><span className="mono text-[11.5px]">{erected} / {scope} erected</span><span className="rounded bg-blue-50 px-1.5 text-[11px] font-bold text-brand">{scope ? Math.round((erected / scope) * 100) : 0}%</span></span>
      </div>
      <p className="border-t border-line px-4 py-3 text-[12.5px] font-semibold tracking-wider text-ink-soft">PROJECT PROGRESS SUMMARY</p>
      <table className="w-full">
        <thead><tr className="bg-gray-50 text-left text-[12px] font-semibold text-ink">
          <th className="px-4 py-2.5">ACTIVITY</th><th className="px-4 text-right">DONE</th><th className="px-4 text-right">SCOPE</th><th className="px-4 text-right">BALANCE</th><th className="px-4">PROGRESS</th><th className="px-4 text-right">%</th>
        </tr></thead>
        <tbody>{activities.map((a) => {
          const d = done[a.key] ?? 0, pct = scope ? Math.round((d / scope) * 100) : 0;
          return (
            <tr key={a.key} className="border-t border-line text-[13px]">
              <td className="px-4 py-2.5">{a.name}</td><td className="mono px-4 text-right text-[12px]">{d.toFixed(2)}</td><td className="mono px-4 text-right text-[12px]">{scope.toFixed(2)}</td>
              <td className="mono px-4 text-right text-[12px] font-bold">{(scope - d).toFixed(2)}</td>
              <td className="px-4"><span className="block h-1.5 w-60 rounded-full bg-gray-200"><span className="block h-full rounded-full bg-brand" style={{ width: `${pct}%` }} /></span></td>
              <td className="mono px-4 text-right text-[11.5px] font-bold">{pct}%</td>
            </tr>
          );
        })}</tbody>
      </table>
    </PageCard>
  );
}

/* ── HRMS: Attendance Report ───────────────────────── */
export function Attendance() {
  const [error, setError] = useState(false);
  const present = attendance.filter((a) => a.status !== "Leave").length;
  const hrs = attendance.reduce((s, a) => s + a.hours, 0) / present;
  const rate = Math.round((present / attendance.length) * 100);
  return (
    <PageCard>
      <PageHeader title="Attendance Report" actions={<PrimaryButton icon={LogIn}>Check In</PrimaryButton>} />
      <div className="grid grid-cols-4 gap-3 border-b border-line p-4">
        <StatCard tone="blue" label="Total Days" value={attendance.length} sub="This month" icon={CalendarDays} />
        <StatCard tone="green" label="Present Days" value={present} sub={`${rate}% attendance`} icon={CheckCircle2} />
        <StatCard tone="purple" label="Avg. Hours" value={hrs.toFixed(1)} sub="Per day" icon={Clock} />
        <StatCard tone="amber" label="Attendance Rate" value={`${rate}%`} sub="This month" icon={TrendingUp} />
      </div>
      <Toolbar right={<Dropdown label="Sep 2026" width={140} />} />
      {error ? <ErrorState title="Couldn't load attendance report" onRetry={() => setError(false)} /> : (
        <table className="w-full">
          <thead><tr><Th>Date</Th><Th>Day</Th><Th>Check In</Th><Th>Check Out</Th><Th align="right">Hours</Th><Th>Status</Th></tr></thead>
          <tbody>{attendance.map((a) => (
            <tr key={a.date} className="hover:bg-gray-50">
              <Td className="font-medium">{a.date}</Td><Td>{a.day}</Td><Td className="num">{a.checkIn}</Td><Td className="num">{a.checkOut}</Td>
              <Td align="right" className="num">{a.hours ? a.hours.toFixed(1) : "—"}</Td><Td><Badge>{a.status}</Badge></Td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </PageCard>
  );
}
