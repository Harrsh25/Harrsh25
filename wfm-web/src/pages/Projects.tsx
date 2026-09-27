import { useState } from "react";
import {
  Archive, BarChart2, ChevronDown, ChevronLeft, ChevronRight, Clock, Filter, FolderOpen,
  FolderKanban, Gauge, Flag, Layers, LayoutTemplate, ListChecks, MousePointerClick, Plus, Search, Shapes, Star,
  Target, Activity, ClipboardList, GitBranch, Briefcase, Loader, AlertTriangle, CheckCircle2, FolderCheck,
  CalendarDays, CalendarClock, AlertCircle, Pin, Info, RefreshCw, ArrowLeftRight, SlidersHorizontal, LayoutGrid,
} from "lucide-react";
import {
  AskAIButton, Badge, DatesButton, Divider, EmptyState, IconBtn, PageCard, PageHeader, PickHint, PrimaryButton,
  Progress, SearchFilter, SelectProject, StatusDot, Tabs, Td, Th, TipBar, Toolbar, ViewToggle, cx,
} from "../components/ui";
import { approvals, assignments, goals, milestones, projects, timesheets } from "../data/demo";

/* ── Project Center ────────────────────────────────── */
export function ProjectCenter() {
  const [tab, setTab] = useState("active");
  const tabs = [
    { id: "active", label: "Active Projects", icon: FolderOpen },
    { id: "templates", label: "Project Templates", icon: LayoutTemplate },
    { id: "groups", label: "Project Groups", icon: Layers },
    { id: "archived", label: "Archived Projects", icon: Archive },
    { id: "overview", label: "Overview", icon: BarChart2 },
  ];
  return (
    <PageCard>
      <PageHeader title="Project Center" actions={<><PrimaryButton>Add Project</PrimaryButton><AskAIButton /></>} />
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      <Toolbar left={<><StatusDot /><IconBtn icon={Activity} /><IconBtn icon={Gauge} /><IconBtn icon={Star} /></>} />
      {tab === "active" && (
        <table className="w-full">
          <thead><tr><Th>Project</Th><Th>Client</Th><Th>Manager</Th><Th>Start</Th><Th>End</Th><Th>Progress</Th><Th>Status</Th></tr></thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <Td><span className="font-medium">{p.name}</span><span className="ml-2 text-[11.5px] text-ink-faint">{p.id}</span></Td>
                <Td>{p.client}</Td><Td>{p.manager}</Td><Td>{p.start}</Td><Td>{p.end}</Td>
                <Td><Progress value={p.progress} /></Td><Td><Badge>{p.status}</Badge></Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {tab === "templates" && <EmptyState icon={LayoutTemplate} title="No templates yet" text="Save a project as a template to reuse its WBS, milestones and team setup." />}
      {tab === "groups" && <EmptyState icon={Layers} title="No project groups yet" text="Bundle related projects together to track them as a portfolio." />}
      {tab === "archived" && (
        <EmptyState
          icon={FolderOpen}
          title="No archived projects found"
          text="Projects you archive will appear here. Archived projects are read-only and can be restored at any time."
          tips={[
            { icon: Plus, title: "Add a project", text: "Use the “Add Project” button to create your first project." },
            { icon: Layers, title: "Organize into groups", text: "Bundle related projects together in the Project Groups tab." },
          ]}
        />
      )}
      {tab === "overview" && (
        <div className="grid grid-cols-4 gap-4 p-4">
          {[["Active projects", projects.length], ["On track", projects.filter((p) => p.status === "On Track").length], ["At risk", 1], ["Delayed", 1]].map(([l, v]) => (
            <div key={l} className="rounded-xl border border-line p-4">
              <p className="text-[12px] text-ink-mute">{l}</p>
              <p className="mt-1 text-[24px] font-bold">{v}</p>
            </div>
          ))}
        </div>
      )}
    </PageCard>
  );
}

/* ── My Assignment ─────────────────────────────────── */
export function MyAssignment() {
  const [project, setProject] = useState<string>();
  const rows = assignments.filter((a) => !project || a.project === project);
  return (
    <PageCard>
      <PageHeader title="My Assignment" actions={<><AskAIButton /><SelectProject value={project} onChange={setProject} /></>} />
      <Toolbar left={<><ViewToggle /><Divider /><IconBtn icon={Shapes} /><StatusDot /><DatesButton /></>} right={<SearchFilter />} />
      {rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No assignments yet"
          text="You don't have any work items assigned to you in this project."
          tips={[
            { icon: ListChecks, title: "Get assigned to work", text: "Ask a planner to assign you to activities, tasks or sub-tasks in the Workspace." },
            { icon: MousePointerClick, title: "Check your filters", text: "Type, status or date filters above may be hiding your assignments." },
          ]}
        />
      ) : (
        <table className="w-full">
          <thead><tr><Th>WBS</Th><Th>Type</Th><Th>Project</Th><Th>Due Date</Th><Th>Progress</Th><Th>Status</Th></tr></thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.wbs} className="hover:bg-gray-50">
                <Td className="font-medium">{a.wbs}</Td><Td>{a.type}</Td><Td>{a.project}</Td><Td>{a.due}</Td>
                <Td><Progress value={a.progress} /></Td><Td><Badge>{a.status}</Badge></Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </PageCard>
  );
}

/* ── Goals & Milestones ────────────────────────────── */
export function Goals() {
  const [tab, setTab] = useState("goals");
  const [project, setProject] = useState<string>();
  return (
    <PageCard>
      <PageHeader title="Goals & Milestones" actions={<><PrimaryButton>Add Goal</PrimaryButton><AskAIButton /><SelectProject value={project} onChange={setProject} /></>} />
      <Tabs tabs={[{ id: "goals", label: "Goals", icon: Target }, { id: "milestones", label: "Milestones", icon: Flag }]} active={tab} onChange={setTab} />
      <Toolbar left={<><ViewToggle /><Divider /><StatusDot /></>} />
      {!project ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState icon={Target} title="No goals yet" text="Set a goal to give the work a finish line." action={<PrimaryButton>Add Goal</PrimaryButton>} />
        </div>
      ) : tab === "goals" ? (
        <table className="w-full">
          <thead><tr><Th>Goal</Th><Th>Owner</Th><Th>Due Date</Th><Th>Milestones</Th><Th>Progress</Th></tr></thead>
          <tbody>{goals.map((g) => (<tr key={g.name}><Td className="font-medium">{g.name}</Td><Td>{g.owner}</Td><Td>{g.due}</Td><Td align="center">{g.milestones}</Td><Td><Progress value={g.progress} /></Td></tr>))}</tbody>
        </table>
      ) : (
        <table className="w-full">
          <thead><tr><Th>Milestone</Th><Th>Goal</Th><Th>Date</Th><Th>Status</Th></tr></thead>
          <tbody>{milestones.map((m) => (<tr key={m.name}><Td className="font-medium">{m.name}</Td><Td>{m.goal}</Td><Td>{m.date}</Td><Td><Badge>{m.status}</Badge></Td></tr>))}</tbody>
        </table>
      )}
    </PageCard>
  );
}

/* ── Timesheets ────────────────────────────────────── */
export function Timesheets() {
  const [project, setProject] = useState<string>();
  const [month, setMonth] = useState(new Date(2026, 8, 1));
  const label = month.toLocaleString("en-US", { month: "short", year: "numeric" });
  const shift = (d: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + d, 1));
  return (
    <PageCard>
      <PageHeader title="Timesheets" actions={<><PrimaryButton>New</PrimaryButton><AskAIButton /><SelectProject value={project} onChange={setProject} /></>} />
      <Toolbar
        left={<>
          <ViewToggle grid={false} /><Divider /><StatusDot /><Divider />
          <button onClick={() => shift(-1)} className="text-ink-soft"><ChevronLeft size={15} /></button>
          <span className="rounded-md border border-line px-3 py-1 text-[13px]">{label}</span>
          <button onClick={() => shift(1)} className="text-ink-soft"><ChevronRight size={15} /></button>
          <button className="ml-2 flex h-[28px] items-center gap-2 rounded-md border border-line px-3 text-[13px]">Monthly <ChevronDown size={13} /></button>
        </>}
        right={<SearchFilter />}
      />
      {!project ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={Clock}
            title="Select a project to begin"
            text="Choose a project to view and log timesheets against its work items."
            tips={[
              { icon: MousePointerClick, title: "Pick a project", text: "Use the project selector above." },
              { icon: GitBranch, title: "Sub-projects supported", text: "If a project has sub-projects, you'll choose one next." },
            ]}
          />
        </div>
      ) : (
        <table className="w-full">
          <thead><tr><Th>Date</Th><Th>Work Item</Th><Th align="right">Hours</Th><Th>Note</Th><Th>Status</Th></tr></thead>
          <tbody>{timesheets.map((t) => (<tr key={t.date}><Td>{t.date}</Td><Td className="font-medium">{t.wbs}</Td><Td align="right" className="num">{t.hours.toFixed(1)}</Td><Td>{t.note}</Td><Td><Badge>{t.status}</Badge></Td></tr>))}</tbody>
        </table>
      )}
    </PageCard>
  );
}

/* ── Execution approvals ───────────────────────────── */
export function ProjectApprovals() {
  const [project, setProject] = useState<string>();
  return (
    <PageCard>
      <PageHeader title="Approvals" actions={<><AskAIButton /><SelectProject value={project} onChange={setProject} /></>} />
      <Toolbar left={<><ViewToggle /><Divider /><StatusDot /></>} right={<><Search size={15} /><Filter size={15} /><SlidersHorizontal size={15} /></>} />
      {!project ? (
        <PickHint icon={FolderKanban} title="Select a project" text="Use the project selector in the toolbar above to load approvals for a project." cta="Choose a project above" />
      ) : (
        <table className="w-full">
          <thead><tr><Th>Work Item</Th><Th>Type</Th><Th>Submitted By</Th><Th>Submitted</Th><Th>Progress</Th><Th>Status</Th></tr></thead>
          <tbody>{approvals.map((a) => (<tr key={a.item}><Td className="font-medium">{a.item}</Td><Td>{a.type}</Td><Td>{a.by}</Td><Td>{a.submitted}</Td><Td><Progress value={a.progress} color="bg-green-500" /></Td><Td><Badge>{a.status}</Badge></Td></tr>))}</tbody>
        </table>
      )}
      <TipBar />
    </PageCard>
  );
}

/* ── Dashboard (My View) ───────────────────────────── */
const kpis = [
  { label: "My Work", value: 5, icon: Briefcase, grad: "from-[#6d6ff0] to-[#8b8df5]" },
  { label: "Ongoing", value: 2, icon: Loader, grad: "from-[#3b8bf0] to-[#63a8f7]" },
  { label: "Overdue", value: 1, icon: AlertTriangle, grad: "from-[#ef4b6c] to-[#f7728a]" },
  { label: "Completed Work", value: 1, icon: CheckCircle2, grad: "from-[#1db9a3] to-[#34d3bd]" },
  { label: "Active Projects", value: projects.length, icon: FolderCheck, grad: "from-[#2fbf64] to-[#4ed883]" },
];

function Widget({ title, icon: Icon, children }: { title: string; icon: typeof CalendarDays; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-white">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-brand-soft text-brand"><Icon size={13} /></span>
        <span className="text-[13.5px] font-semibold">{title}</span>
        <Info size={11} className="text-ink-faint" /><Pin size={11} className="text-ink-faint" />
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function Dashboard() {
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const busy = new Set([3, 8, 9, 14, 17, 22, 25, 30]);
  return (
    <div className="space-y-4 pr-1">
      <div className="flex h-[44px] items-center justify-between rounded-xl bg-white/60 px-4">
        <div className="flex items-center gap-3">
          <h1 className="text-[15.5px] font-semibold">My View</h1>
          <span className="h-4 w-px bg-line" />
          <span className="flex items-center gap-1.5 text-[12px] text-ink-mute"><Clock size={12} /> Last updated {new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
          <RefreshCw size={12} className="text-ink-mute" />
        </div>
        <div className="flex items-center gap-4 text-ink-soft">
          <span className="flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-[13px] text-ink"><ArrowLeftRight size={13} className="text-brand" /> Switch to Project View</span>
          <Filter size={15} /><SlidersHorizontal size={15} /><LayoutGrid size={15} />
        </div>
      </div>
      <div className="grid grid-cols-5 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className={cx("overflow-hidden rounded-xl bg-gradient-to-br text-white shadow-sm", k.grad)}>
            <p className="flex items-center gap-2 bg-black/5 px-4 py-2 text-[13px] font-semibold"><k.icon size={14} /> {k.label}</p>
            <p className="px-4 pb-3 pt-2 text-[22px] font-bold">{k.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Widget title="Work Calendar" icon={CalendarDays}>
          <div className="grid grid-cols-7 gap-1.5 text-center text-[11px]">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i} className="text-ink-faint">{d}</span>)}
            <span /><span />
            {days.map((d) => (
              <span key={d} className={cx("rounded-md py-1.5", busy.has(d) ? "bg-brand-soft font-semibold text-brand" : "text-ink-soft", d === 27 && "ring-1 ring-brand")}>{d}</span>
            ))}
          </div>
        </Widget>
        <Widget title="Priority Task Distribution" icon={ListChecks}>
          {[["Critical", 1, "bg-red-500"], ["High", 2, "bg-orange-400"], ["Medium", 3, "bg-amber-400"], ["Low", 1, "bg-green-500"]].map(([l, v, c]) => (
            <div key={l as string} className="mb-3 flex items-center gap-3 text-[12.5px]">
              <span className="w-16 text-ink-soft">{l}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100"><span className={cx("block h-full rounded-full", c as string)} style={{ width: `${(v as number) * 28}%` }} /></span>
              <span className="w-4 text-right font-semibold">{v}</span>
            </div>
          ))}
        </Widget>
        <Widget title="My Due Work Today" icon={CalendarClock}>
          {assignments.slice(0, 2).map((a) => (
            <div key={a.wbs} className="mb-2 flex items-center justify-between rounded-lg border border-line px-3 py-2 text-[12.5px]">
              <span><b className="font-medium">{a.wbs}</b><span className="ml-2 text-ink-mute">{a.project}</span></span><Badge>{a.status}</Badge>
            </div>
          ))}
        </Widget>
        <Widget title="My Overdue Work" icon={AlertCircle}>
          {assignments.filter((a) => a.status === "Overdue").map((a) => (
            <div key={a.wbs} className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50/40 px-3 py-2 text-[12.5px]">
              <span><b className="font-medium">{a.wbs}</b><span className="ml-2 text-ink-mute">due {a.due}</span></span><Badge>{a.status}</Badge>
            </div>
          ))}
        </Widget>
      </div>
    </div>
  );
}

export function ProjectPlanningHome() {
  return <PageCard><div className="flex-1" /></PageCard>;
}

