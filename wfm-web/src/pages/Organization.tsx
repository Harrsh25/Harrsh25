import { ReactNode, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight, Briefcase, Building2, CheckCircle2, ChevronDown, Circle, Clock, Globe, MoreHorizontal, Network,
  Plus, Save, Scale, Settings, Shield, AlertCircle, Building,
} from "lucide-react";
import { Badge, FooterStats, PageCard, PageHeader, PrimaryButton, SearchFilter, Tabs, Td, Th, Toolbar, cx, nowStamp } from "../components/ui";
import { branches, businessUnits, clients, departments, industries, legalEntities, locations, organizations } from "../data/demo";

const O = "/productivity/organization/configuration";

function Box({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-xl border border-line bg-white p-4", className)}>{children}</div>;
}

/* ── Organization Setup (overview) ─────────────────── */
export function OrganizationSetup() {
  const nav = useNavigate();
  const info = [
    { icon: Globe, label: "Country", value: "United States" },
    { icon: Clock, label: "Timezone", value: "America/New_York (EST)" },
    { icon: Briefcase, label: "Industry", value: "Technology & Software" },
  ];
  const steps = [
    { title: "Organization Details", text: "Basic organization information", state: "Completed" },
    { title: "Legal Entity Setup", text: "Legal and compliance configuration", state: "Pending" },
    { title: "Business Units", text: "Departments and divisions", state: "Optional" },
  ];
  const actions = [
    { icon: Settings, title: "Configure Organization Settings", text: "Update organization details and preferences", to: `${O}/profile` },
    { icon: Scale, title: "Manage Legal Entities", text: "Configure legal entities and compliance", to: `${O}/legal-entities` },
    { icon: Building2, title: "Business Units", text: "Set up departments and divisions", to: `${O}/business-units` },
  ];
  return (
    <PageCard className="bg-gray-50/40">
      <PageHeader title="Organization Setup" subtitle="Configure your organization before managing work" />
      <div className="grid grid-cols-2 gap-4 p-0.5 pt-0">
        <Box className="self-start">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-medium">Organization Overview</h2>
            <span className="flex items-center gap-1 rounded-md bg-green-50 px-2 py-0.5 text-[12px] text-green-700"><CheckCircle2 size={11} /> Active</span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand"><Building2 size={19} /></span>
            <div><p className="text-[15px] font-semibold">Acme Corporation</p><p className="text-[12px] text-ink-mute">Primary Organization</p></div>
          </div>
          <div className="mt-3 space-y-2">
            {info.map((i) => (
              <div key={i.label} className="flex items-center gap-3 rounded-lg border border-line bg-gray-50/60 px-3 py-2">
                <i.icon size={15} className="text-ink-mute" />
                <div><p className="text-[11.5px] text-ink-mute">{i.label}</p><p className="text-[12.5px] font-medium">{i.value}</p></div>
              </div>
            ))}
          </div>
          <button onClick={() => nav(`${O}/profile`)} className="mt-3 h-8 w-full rounded-lg border border-line bg-gray-50 text-[12.5px] font-medium hover:bg-gray-100">Edit Organization Settings</button>
        </Box>
        <div className="space-y-4">
          <Box>
            <div className="flex items-center justify-between"><h2 className="text-[14px] font-medium">Setup Status</h2><span className="text-[12px] text-ink-mute">1/2 required</span></div>
            <div className="mt-2 h-1 rounded-full bg-gray-100"><div className="h-full w-1/2 rounded-full bg-green-600" /></div>
            <div className="mt-2 space-y-2">
              {steps.map((s) => (
                <div key={s.title} className={cx("flex items-center gap-3 rounded-lg border px-3 py-2.5", s.state === "Completed" ? "border-green-200 bg-green-50" : "border-line")}>
                  {s.state === "Completed" ? <CheckCircle2 size={17} className="text-green-600" /> : s.state === "Pending" ? <AlertCircle size={15} /> : <Circle size={15} className="text-ink-faint" />}
                  <div className="flex-1"><p className="text-[12.5px] font-medium">{s.title}</p><p className="text-[12px] text-ink-mute">{s.text}</p></div>
                  <span className={cx("rounded-md px-2 py-0.5 text-[12px]", s.state === "Completed" ? "bg-green-100 text-green-700" : s.state === "Optional" ? "bg-gray-100 text-ink-soft" : "text-ink")}>{s.state}</span>
                </div>
              ))}
            </div>
          </Box>
          <Box>
            <div className="flex items-center justify-between"><h2 className="text-[14px] font-medium">Legal Entity</h2><span className="rounded-md bg-blue-50 px-2 py-0.5 text-[12px] text-brand">Single Entity</span></div>
            <div className="mt-3 rounded-lg border border-line bg-gray-50/60 p-3">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-soft text-brand"><Scale size={15} /></span>
                <div><p className="text-[12px] text-ink-mute">Primary Legal Entity</p><p className="text-[12.5px] font-medium">Acme Corporation LLC</p></div>
              </div>
              <p className="mt-3 flex items-center gap-1.5 border-t border-line pt-2 text-[12px] text-ink-mute"><Building size={11} /> 1 entity configured</p>
            </div>
            <button onClick={() => nav(`${O}/legal-entities`)} className="mt-3 flex h-8 w-full items-center justify-center gap-2 rounded-lg border border-line bg-gray-50 text-[12.5px] font-medium hover:bg-gray-100">Manage Legal Entities <ArrowRight size={13} /></button>
          </Box>
        </div>
      </div>
      <p className="mt-5 px-0.5 text-[12px] font-medium tracking-wider text-ink-soft">QUICK ACTIONS</p>
      <div className="mt-3 grid grid-cols-3 gap-3 pb-4">
        {actions.map((a) => (
          <Link key={a.title} to={a.to} className="rounded-xl border border-line bg-gray-50/60 p-4 hover:border-blue-200 hover:bg-white">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-soft text-brand"><a.icon size={15} /></span>
            <p className="mt-3 text-[12.5px] font-medium">{a.title}</p>
            <p className="text-[12px] text-ink-mute">{a.text}</p>
          </Link>
        ))}
      </div>
    </PageCard>
  );
}

/* ── Organization Details (form) ───────────────────── */
export function OrganizationProfile() {
  const [name, setName] = useState("Acme Corporation");
  const [industry, setIndustry] = useState("Technology & Software");
  const [desc, setDesc] = useState("A leading provider of innovative workforce management solutions.");
  const [mode, setMode] = useState<"single" | "multi">("single");
  const [saved, setSaved] = useState(true);
  const dirty = () => setSaved(false);
  return (
    <PageCard>
      <div className="flex items-start justify-between border-b border-line px-4 py-3">
        <div><h1 className="text-[15.5px] font-semibold">Organization Details</h1><p className="mt-0.5 text-[13.5px] text-ink-soft">Define your organization's identity and structure</p></div>
        <span className="flex items-center gap-1.5 rounded-md border border-green-300 bg-green-50 px-2 py-0.5 text-[11px] font-semibold tracking-widest text-green-700"><span className="h-1 w-1 rounded-full bg-green-600" /> ACTIVE</span>
      </div>
      <div className="max-w-[864px] px-4 py-4">
        <h2 className="text-[13px] font-medium">Basic Organization Information</h2>
        <p className="text-[11.5px] text-ink-mute">Core details that identify your organization</p>
        <label className="mt-4 block text-[11.5px] font-medium">Organization Name <span className="text-red-500">*</span></label>
        <input value={name} onChange={(e) => { setName(e.target.value); dirty(); }} className="mt-2 h-9 w-full rounded-lg border border-gray-300 px-3 text-[14px] outline-none focus:border-brand" />
        <label className="mt-4 block text-[11.5px] font-medium">Primary Industry</label>
        <div className="relative mt-2">
          <select value={industry} onChange={(e) => { setIndustry(e.target.value); dirty(); }} className="h-9 w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 text-[14px]">
            {industries.map((i) => <option key={i.name}>{i.name}</option>)}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-2.5 text-ink-mute" />
        </div>
        <p className="mt-1.5 text-[11.5px] text-ink-mute">Used for high-level classification and reporting.</p>
        <label className="mt-4 block text-[11.5px] font-medium">Description</label>
        <textarea value={desc} maxLength={500} onChange={(e) => { setDesc(e.target.value); dirty(); }} className="mt-2 h-20 w-full resize-none rounded-lg bg-gray-100/80 px-3 py-2.5 text-[14px] outline-none" />
        <p className="text-right text-[11px] text-ink-mute">{desc.length}/500</p>

        <h2 className="mt-8 text-[13px] font-medium">Legal Entity Mode</h2>
        <p className="text-[11.5px] text-ink-mute">Choose how many legal entities your organization operates under</p>
        {([["single", "Single Legal Entity", "One legal entity, auto-created and cannot be removed."], ["multi", "Multiple Legal Entities", "Create, manage, and designate a primary entity."]] as const).map(([id, t, d]) => (
          <button key={id} onClick={() => { setMode(id); dirty(); }} className={cx("mt-3 flex w-full items-center gap-3 rounded-lg border-2 px-4 py-3 text-left", mode === id ? "border-brand bg-blue-50/40" : "border-gray-200")}>
            <span className={cx("grid h-4 w-4 place-items-center rounded-full border-2", mode === id ? "border-brand" : "border-gray-300")}>{mode === id && <span className="h-2 w-2 rounded-full bg-brand" />}</span>
            <span className="flex-1"><span className="block text-[12.5px] font-medium">{t}</span><span className="block text-[12px] text-ink-soft">{d}</span></span>
            {mode === id && <CheckCircle2 size={15} className="text-brand" />}
          </button>
        ))}
        <div className="mt-4 rounded-lg bg-blue-50/50 px-3 py-2.5 text-[11.5px] text-ink-soft">
          <p><b className="font-semibold">Note:</b> This controls legal entity management across the system.</p>
          <ul className="ml-5 mt-1 list-disc space-y-0.5"><li><b className="font-semibold">Single:</b> One primary entity, cannot add more</li><li><b className="font-semibold">Multiple:</b> Add entities freely, one must be primary</li></ul>
        </div>
        <div className="mt-5 flex items-center justify-between">
          <span className={cx("flex items-center gap-2 text-[13px]", saved ? "text-ink-soft" : "text-amber-600")}>
            {saved ? <CheckCircle2 size={15} className="text-green-600" /> : <AlertCircle size={15} />}{saved ? "All changes saved" : "Unsaved changes"}
          </span>
          <div className="flex gap-3">
            <button onClick={() => setSaved(true)} disabled={saved} className="h-8 rounded-lg border border-line px-3.5 text-[13.5px] text-ink-soft disabled:opacity-60">Save &amp; Return to Overview</button>
            <button onClick={() => setSaved(true)} disabled={saved} className="flex h-8 items-center gap-2 rounded-lg bg-brand px-5 text-[13.5px] font-medium text-white disabled:bg-blue-300"><Save size={14} /> Save</button>
          </div>
        </div>
      </div>
    </PageCard>
  );
}

/* ── Legal Entities / Business Units ───────────────── */
function EntityTable<T>({ title, subtitle, action, disabled, banner, cols, rows }: {
  title: string; subtitle: string; action: string; disabled?: boolean; banner?: ReactNode;
  cols: { h: string; cell: (r: T) => ReactNode }[]; rows: T[];
}) {
  return (
    <PageCard>
      <PageHeader title={title} subtitle={subtitle} actions={
        <button disabled={disabled} className="flex h-8 items-center gap-2 rounded-lg bg-brand px-4 text-[12.5px] font-medium text-white disabled:bg-blue-300"><Plus size={14} /> {action}</button>
      } />
      {banner}
      <table className="mt-4 w-full">
        <thead><tr>{cols.map((c) => <Th key={c.h}>{c.h}</Th>)}<Th>Actions</Th></tr></thead>
        <tbody>{rows.map((r, i) => (<tr key={i}>{cols.map((c) => <Td key={c.h}>{c.cell(r)}</Td>)}<Td align="center"><MoreHorizontal size={15} className="text-ink-soft" /></Td></tr>))}</tbody>
      </table>
      <div className="flex justify-end px-4 py-3 text-[12px]"><b className="font-semibold">1–{rows.length}</b>&nbsp;<span className="text-ink-mute">of</span>&nbsp;<b>{rows.length}</b></div>
    </PageCard>
  );
}
const StatusPill = ({ s }: { s: string }) => (
  <span className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[12px] text-brand"><span className="h-1.5 w-1.5 rounded-full bg-brand" />{s}</span>
);

export const LegalEntities = () => (
  <EntityTable
    title="Legal Entities" subtitle="Manage registered legal entities operating under this organization." action="Add Legal Entity" disabled
    banner={
      <div className="flex gap-3 border-b border-blue-100 bg-blue-50/60 px-4 py-3">
        <Shield size={16} className="mt-0.5 text-brand" />
        <div><p className="text-[12px] font-medium">Single Legal Entity Mode</p>
          <p className="mt-0.5 text-[12px] text-ink-soft">The primary entity is system-managed and cannot be removed. <Link to={`${O}/profile`} className="text-[13.5px] font-medium text-brand">Enable multi-entity support</Link> to add more.</p></div>
      </div>
    }
    rows={legalEntities}
    cols={[
      { h: "Organization", cell: (r) => <span className="text-ink-soft">{r.org}</span> },
      { h: "Legal Entity Name", cell: (r) => <b className="font-medium">{r.name}</b> },
      { h: "Country", cell: (r) => r.country },
      { h: "Registration No.", cell: (r) => <span className="mono text-[12.5px]">{r.reg}</span> },
      { h: "Currency", cell: (r) => <span className="text-[12px] text-ink-soft">{r.currency}</span> },
      { h: "Status", cell: (r) => <StatusPill s={r.status} /> },
    ]}
  />
);

export const BusinessUnits = () => (
  <EntityTable
    title="Business Units" subtitle="Organize your legal entity into departments and divisions." action="Add Business Unit"
    rows={businessUnits}
    cols={[
      { h: "Business Unit", cell: (r) => <b className="font-medium">{r.name}</b> },
      { h: "Code", cell: (r) => <span className="mono text-[12.5px]">{r.code}</span> },
      { h: "Head", cell: (r) => r.head },
      { h: "Legal Entity", cell: (r) => r.entity },
      { h: "Status", cell: (r) => <StatusPill s={r.status} /> },
    ]}
  />
);

/* ── Configuration module ──────────────────────────── */
function ConfigTable<T>({ cols, rows }: { cols: { h: string; cell: (r: T) => ReactNode }[]; rows: T[] }) {
  return (
    <>
      <Toolbar right={<SearchFilter />} />
      <table className="w-full">
        <thead><tr>{cols.map((c) => <Th key={c.h}>{c.h}</Th>)}</tr></thead>
        <tbody>{rows.map((r, i) => (<tr key={i} className="hover:bg-gray-50">{cols.map((c) => <Td key={c.h}>{c.cell(r)}</Td>)}</tr>))}</tbody>
      </table>
      <FooterStats items={[{ value: rows.length, label: "Records" }]} updated={nowStamp()} range={`1–${rows.length} of ${rows.length}`} />
    </>
  );
}

export function ConfigOrgSetup() {
  const [tab, setTab] = useState("org");
  const add = { org: "Add Organization", branch: "Add Branch", dept: "Add Department" }[tab];
  return (
    <PageCard>
      <PageHeader title="Organization Setup" actions={<PrimaryButton>{add!}</PrimaryButton>} />
      <Tabs tabs={[{ id: "org", label: "Organization", icon: Building2 }, { id: "branch", label: "Branch", icon: Network }, { id: "dept", label: "Department", icon: Shield }]} active={tab} onChange={setTab} />
      {tab === "org" && <ConfigTable rows={organizations} cols={[
        { h: "Organization", cell: (r) => <b className="font-medium">{r.name}</b> }, { h: "Code", cell: (r) => r.code },
        { h: "Industry", cell: (r) => r.industry }, { h: "Country", cell: (r) => r.country }, { h: "Branches", cell: (r) => r.branches }, { h: "Status", cell: (r) => <Badge>{r.status}</Badge> },
      ]} />}
      {tab === "branch" && <ConfigTable rows={branches} cols={[
        { h: "Branch", cell: (r) => <b className="font-medium">{r.name}</b> }, { h: "Organization", cell: (r) => r.org },
        { h: "City", cell: (r) => r.city }, { h: "Manager", cell: (r) => r.manager }, { h: "Status", cell: (r) => <Badge>{r.status}</Badge> },
      ]} />}
      {tab === "dept" && <ConfigTable rows={departments} cols={[
        { h: "Department", cell: (r) => <b className="font-medium">{r.name}</b> }, { h: "Head", cell: (r) => r.head },
        { h: "Branch", cell: (r) => r.branch }, { h: "People", cell: (r) => r.people }, { h: "Status", cell: (r) => <Badge>{r.status}</Badge> },
      ]} />}
    </PageCard>
  );
}

export const ConfigLocations = () => (
  <PageCard>
    <PageHeader title="Locations" actions={<PrimaryButton>Add Location</PrimaryButton>} />
    <ConfigTable rows={locations} cols={[
      { h: "Location", cell: (r) => <b className="font-medium">{r.name}</b> }, { h: "Address", cell: (r) => r.address },
      { h: "State", cell: (r) => r.state }, { h: "Country", cell: (r) => r.country }, { h: "Status", cell: (r) => <Badge>{r.status}</Badge> },
    ]} />
  </PageCard>
);
export const ConfigClients = () => (
  <PageCard>
    <PageHeader title="Client" actions={<PrimaryButton>Add Client</PrimaryButton>} />
    <ConfigTable rows={clients} cols={[
      { h: "Client", cell: (r) => <b className="font-medium">{r.name}</b> }, { h: "Contact", cell: (r) => r.contact },
      { h: "Email", cell: (r) => r.email }, { h: "Projects", cell: (r) => r.projects }, { h: "Status", cell: (r) => <Badge>{r.status}</Badge> },
    ]} />
  </PageCard>
);
export const ConfigIndustries = () => (
  <PageCard>
    <PageHeader title="Industry" actions={<PrimaryButton>Add Industry</PrimaryButton>} />
    <ConfigTable rows={industries} cols={[
      { h: "Industry", cell: (r) => <b className="font-medium">{r.name}</b> }, { h: "Code", cell: (r) => r.code },
      { h: "Organizations", cell: (r) => r.orgs }, { h: "Status", cell: (r) => <Badge>{r.status}</Badge> },
    ]} />
  </PageCard>
);
