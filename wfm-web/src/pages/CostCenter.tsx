import { useState } from "react";
import {
  Boxes, FileText, FileX2, FolderKanban, LayoutTemplate, Plus, Receipt, Scale, FileSpreadsheet, Shapes,
  ShieldCheck, User, Info,
} from "lucide-react";
import {
  AskAIButton, Badge, ComingSoon, DatesButton, Divider, Dropdown, EmptyState, FooterStats, IconBtn, PageCard,
  PageHeader, PickHint, PrimaryButton, SearchFilter, SearchMore, SelectProject, StatusDot, Tabs, Td, Th, TipBar,
  Toolbar, ViewToggle, cx, nowStamp,
} from "../components/ui";
import {
  approvalModules, boqItems, boqTemplates, boqs, documents, inr, materials, moduleApprovals, num,
} from "../data/demo";

/* ── BOQ Workspace ─────────────────────────────────── */
export function BoqManagement() {
  const [tab, setTab] = useState("register");
  return (
    <PageCard>
      <PageHeader title="BOQ Management" actions={<PrimaryButton>Create BOQ</PrimaryButton>} />
      <Tabs tabs={[{ id: "register", label: "BOQ Register", icon: FileText }, { id: "template", label: "BOQ Template", icon: LayoutTemplate }]} active={tab} onChange={setTab} />
      <Toolbar left={<ViewToggle />} right={<SearchFilter />} />
      {tab === "register" ? (
        <table className="w-full">
          <thead><tr><Th>BOQ Code</Th><Th>Name</Th><Th>Project</Th><Th align="center">Items</Th><Th align="right">Value</Th><Th align="center">Version</Th><Th>Status</Th></tr></thead>
          <tbody>{boqs.map((b) => (
            <tr key={b.code} className="hover:bg-gray-50">
              <Td className="mono text-[12px]">{b.code}</Td><Td className="font-medium">{b.name}</Td><Td>{b.project}</Td>
              <Td align="center">{b.items}</Td><Td align="right" className="num">{inr(b.value)}</Td><Td align="center">{b.version}</Td><Td><Badge>{b.status}</Badge></Td>
            </tr>
          ))}</tbody>
        </table>
      ) : (
        <table className="w-full">
          <thead><tr><Th>Template</Th><Th align="center">Items</Th><Th>Last Updated</Th></tr></thead>
          <tbody>{boqTemplates.map((t) => (<tr key={t.name}><Td className="font-medium">{t.name}</Td><Td align="center">{t.items}</Td><Td>{t.updated}</Td></tr>))}</tbody>
        </table>
      )}
    </PageCard>
  );
}

/* ── BOQ grid (shared by BOQ + BOQ Approval) ───────── */
function BoqGrid({ approval }: { approval?: boolean }) {
  const [project, setProject] = useState<string>();
  const rows = project ? boqItems : [];
  const grp = "border-b border-r border-line px-3 py-2 text-center text-[11.5px] font-semibold";
  const sub = "border-b border-r border-line px-3 py-2 text-center text-[11.5px] font-semibold";
  return (
    <PageCard>
      <PageHeader title={approval ? "Bill of Quantities Approval" : "Bill of Quantities (BOQ)"} actions={<SelectProject value={project} onChange={setProject} />} />
      <Toolbar right={<SearchMore />} />
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th rowSpan={2} className="w-10 border-b border-r border-line bg-gray-50"><input type="checkbox" /></th>
              <th rowSpan={2} className="border-b border-r border-line bg-gray-50 px-3 text-[11.5px] font-semibold text-ink-soft">S.No.</th>
              <th rowSpan={2} className="border-b border-r border-line bg-gray-50 px-3 text-left text-[11.5px] font-semibold text-ink-soft">Description</th>
              <th rowSpan={2} className="border-b border-r border-line bg-gray-50 px-3 text-center text-[11.5px] font-semibold text-ink-soft">Unit</th>
              <th colSpan={4} className={cx(grp, "bg-blue-50 text-blue-700")}>As per Contract</th>
              <th colSpan={2} className={cx(grp, "bg-green-50 text-green-700")}>As per Tower Schedule</th>
              <th colSpan={2} className={cx(grp, "bg-orange-50 text-orange-600")}>Variance</th>
              <th rowSpan={2} className="border-b border-r border-line bg-gray-50 px-3 text-[11.5px] font-semibold text-ink-soft">Status</th>
              {!approval && <th rowSpan={2} className="border-b border-line bg-gray-50 px-3 text-[11.5px] font-semibold text-ink-soft">Action</th>}
            </tr>
            <tr>
              {["Qty", "Rate", "GST %", "Amount"].map((h) => <th key={h} className={cx(sub, "bg-blue-50/60 text-blue-700")}>{h}</th>)}
              {["Qty", "Amount"].map((h) => <th key={h} className={cx(sub, "bg-green-50/60 text-green-700")}>{h}</th>)}
              {["Amount", "Qty"].map((h) => <th key={h} className={cx(sub, "bg-orange-50/60 text-orange-600")}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const amt = r.qty * r.rate * (1 + r.gst / 100), tsAmt = r.tsQty * r.rate * (1 + r.gst / 100);
              return (
                <tr key={r.desc} className="hover:bg-gray-50">
                  <Td align="center"><input type="checkbox" /></Td><Td align="center">{i + 1}</Td><Td className="font-medium">{r.desc}</Td><Td align="center">{r.unit}</Td>
                  <Td align="right" className="num">{num(r.qty)}</Td><Td align="right" className="num">{inr(r.rate)}</Td><Td align="center">{r.gst}%</Td><Td align="right" className="num">{inr(Math.round(amt))}</Td>
                  <Td align="right" className="num">{num(r.tsQty)}</Td><Td align="right" className="num">{inr(Math.round(tsAmt))}</Td>
                  <Td align="right" className={cx("num", tsAmt - amt < 0 ? "text-red-600" : "text-green-600")}>{inr(Math.round(tsAmt - amt))}</Td>
                  <Td align="right" className="num">{num(r.tsQty - r.qty)}</Td>
                  <Td><Badge>{r.status}</Badge></Td>
                  {!approval && <Td align="center" className="text-brand">Edit</Td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!rows.length && (approval
        ? <EmptyState icon={Receipt} title="No BOQ rows yet" text="Submitted BOQ items awaiting approval will show up here." className="border-b border-line py-12" />
        : <EmptyState icon={FileText} title="Select a project" text="Use the project selector above to load its BOQ items." className="border-b border-line py-12" />)}
      {approval ? (
        <FooterStats items={[
          { value: rows.filter((r) => r.status === "In Draft").length, label: "In Draft", color: "text-amber-600" },
          { value: rows.filter((r) => r.status === "Approved").length, label: "Approved", color: "text-green-600" },
          { value: rows.filter((r) => r.status === "Rejected").length, label: "Rejected", color: "text-red-600" },
        ]} updated={nowStamp()} />
      ) : (
        <div className="mt-auto flex h-[40px] items-center border-t border-line px-4">
          <button className="flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-[13px] font-medium text-brand"><Plus size={14} /> Add Row</button>
          <span className="flex-1 text-center text-[11.5px] text-ink-faint">Last updated: {nowStamp()}</span>
        </div>
      )}
    </PageCard>
  );
}
export const Boq = () => <BoqGrid />;
export const BoqApproval = () => <BoqGrid approval />;

/* ── Coming soon pages ─────────────────────────────── */
function SoonPage({ title, icon }: { title: string; icon: typeof Boxes }) {
  return (
    <PageCard>
      <div className="px-4 pt-3"><PageHeaderInline title={title} icon={icon} /></div>
      <ComingSoon icon={icon} name={title} />
    </PageCard>
  );
}
function PageHeaderInline({ title, icon: Icon }: { title: string; icon: typeof Boxes }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-soft text-brand"><Icon size={18} /></span>
      <h1 className="text-[15.5px] font-semibold">{title}</h1>
    </div>
  );
}
export const QuantityManagement = () => <SoonPage title="Quantity Management" icon={Boxes} />;
export const CostControl = () => <SoonPage title="Cost Control" icon={Scale} />;
export const ProjectAccounting = () => <SoonPage title="Project Accounting" icon={FileSpreadsheet} />;

/* ── Material Lifecycle Tracking ───────────────────── */
export function MaterialLifecycle() {
  const [project, setProject] = useState<string>();
  const rows = project ? materials : [];
  const g = "border-b border-r border-line px-3 py-2 text-center text-[11.5px] font-semibold";
  const h = (t: string, c: string) => (
    <th key={t} className={cx(g, c)}><span className="inline-flex items-center gap-1">{t}<Info size={11} /></span></th>
  );
  const avg = rows.length ? rows.reduce((s, r) => s + (r.consumed / r.boq) * 100, 0) / rows.length : 0;
  return (
    <PageCard>
      <PageHeader title="Material Lifecycle Tracking" actions={<SelectProject value={project} onChange={setProject} />} />
      <Toolbar left={<Dropdown label="All BOQ Types" width={150} />} right={<SearchMore />} />
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th rowSpan={2} className="border-b border-r border-line bg-gray-50 px-3 text-[11.5px] font-semibold text-ink-soft">S.No.</th>
              <th colSpan={3} className={cx(g, "bg-gray-50 text-ink-soft")}>Material Identification</th>
              <th className={cx(g, "bg-blue-50 text-blue-700")}>BOQ Baseline</th>
              <th colSpan={3} className={cx(g, "bg-amber-50 text-amber-700")}>Procurement (Commitment)</th>
              <th colSpan={2} className={cx(g, "bg-green-50 text-green-700")}>Receipt (Inventory)</th>
              <th colSpan={2} className={cx(g, "bg-violet-50 text-violet-700")}>Consumption</th>
            </tr>
            <tr>
              {["Material Name", "Unit", "Type"].map((t) => <th key={t} className={cx(g, "bg-gray-50 text-ink-soft")}>{t}</th>)}
              {h("BOQ Quantity", "bg-blue-50/60 text-blue-700")}
              {["Ordered Quantity", "Balance to Order", "Order %"].map((t) => h(t, "bg-amber-50/60 text-amber-700"))}
              {["Received Quantity", "Pending Receipt"].map((t) => h(t, "bg-green-50/60 text-green-700"))}
              {["Consumed Quantity", "Consumption %"].map((t) => h(t, "bg-violet-50/60 text-violet-700"))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.name} className="hover:bg-gray-50">
                <Td align="center">{i + 1}</Td><Td className="font-medium">{r.name}</Td><Td align="center">{r.unit}</Td><Td align="center">{r.type}</Td>
                <Td align="right" className="num">{num(r.boq)}</Td>
                <Td align="right" className="num">{num(r.ordered)}</Td><Td align="right" className="num">{num(Math.max(0, r.boq - r.ordered))}</Td>
                <Td align="right" className={cx("num", r.ordered > r.boq && "font-semibold text-red-600")}>{((r.ordered / r.boq) * 100).toFixed(1)}%</Td>
                <Td align="right" className="num">{num(r.received)}</Td><Td align="right" className="num">{num(r.ordered - r.received)}</Td>
                <Td align="right" className="num">{num(r.consumed)}</Td><Td align="right" className="num">{((r.consumed / r.boq) * 100).toFixed(1)}%</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <EmptyState icon={Boxes} title="No materials yet" text="No materials found for the selected project and BOQ type." className="border-b border-line py-12" />}
      <FooterStats items={[
        { value: rows.length, label: "Materials" },
        { value: `${avg.toFixed(1)}%`, label: "Avg. Consumption", color: "text-cyan-600" },
        { value: rows.filter((r) => r.ordered > r.boq).length, label: "Overrun Items", color: "text-red-600" },
      ]} updated={nowStamp()} range={`${rows.length ? 1 : 0}–${rows.length} of ${rows.length}`} />
    </PageCard>
  );
}

/* ── Document Repository ───────────────────────────── */
export function DocumentRepository() {
  const [tab, setTab] = useState("official");
  const [project, setProject] = useState<string>();
  const rows = project && tab === "official" ? documents : [];
  return (
    <PageCard>
      <PageHeader title="Document Repository" actions={<SelectProject value={project} onChange={setProject} />} />
      <Tabs tabs={[{ id: "official", label: "Official", icon: ShieldCheck }, { id: "personal", label: "Personal", icon: User }]} active={tab} onChange={setTab} />
      <Toolbar left={<><IconBtn icon={Shapes} /><Dropdown label="All Document Types" width={180} /><DatesButton /></>} right={<SearchMore />} />
      <table className="w-full">
        <thead><tr><Th>Document Name</Th><Th>Parent (Activity &gt; Task)</Th><Th>Document Type</Th><Th>Description</Th><Th>Created Date</Th><Th>Action</Th></tr></thead>
        <tbody>{rows.map((d) => (
          <tr key={d.name} className="hover:bg-gray-50">
            <Td className="font-medium text-brand">{d.name}</Td><Td>{d.parent}</Td><Td>{d.type}</Td><Td>{d.desc}</Td><Td>{d.created}</Td><Td className="text-brand">Download</Td>
          </tr>
        ))}</tbody>
      </table>
      {!rows.length && <EmptyState icon={FileX2} title="No documents yet" text="No documents matched the selected filters. Upload a document to get started." className="border-b border-line py-12" />}
      <FooterStats items={[
        { value: rows.length, label: "Documents" },
        { value: rows.filter((d) => d.status === "Active").length, label: "Active", color: "text-green-600" },
        { value: rows.filter((d) => d.status === "Draft").length, label: "Draft", color: "text-amber-600" },
      ]} updated={nowStamp()} range={`${rows.length ? 1 : 0}–${rows.length} of ${rows.length}`} />
    </PageCard>
  );
}

/* ── Approval Management ───────────────────────────── */
export function ApprovalManagement() {
  const [project, setProject] = useState<string>();
  const [mod, setMod] = useState<string>("");
  const rows = moduleApprovals.filter((a) => a.module === mod);
  return (
    <PageCard>
      <PageHeader title="Approval Management" actions={<><AskAIButton /><SelectProject value={project} onChange={setProject} /></>} />
      <Toolbar
        left={<>
          <select value={mod} onChange={(e) => setMod(e.target.value)} className="h-[28px] w-[165px] rounded-md border border-line bg-white px-2.5 text-[13px]">
            <option value="">Select module</option>
            {approvalModules.map((m) => <option key={m}>{m}</option>)}
          </select>
          <Divider /><StatusDot />
        </>}
        right={<SearchFilter />}
      />
      {!mod ? (
        <PickHint icon={ShieldCheck} title="Select a module" text="Approvals are grouped by the module they come from. Pick one from the selector above to load its queue." cta="Choose a module above" />
      ) : rows.length ? (
        <table className="w-full">
          <thead><tr><Th>Reference</Th><Th>Title</Th><Th>Submitted By</Th><Th>Date</Th><Th>Level</Th><Th>Status</Th><Th>Action</Th></tr></thead>
          <tbody>{rows.map((a) => (
            <tr key={a.ref} className="hover:bg-gray-50">
              <Td className="mono text-[12px]">{a.ref}</Td><Td className="font-medium">{a.title}</Td><Td>{a.by}</Td><Td>{a.date}</Td><Td>{a.level}</Td><Td><Badge>{a.status}</Badge></Td>
              <Td>{a.status === "Pending" ? <span className="flex gap-2"><button className="rounded bg-green-600 px-2 py-0.5 text-[12px] text-white">Approve</button><button className="rounded border border-red-200 px-2 py-0.5 text-[12px] text-red-600">Reject</button></span> : "—"}</Td>
            </tr>
          ))}</tbody>
        </table>
      ) : (
        <EmptyState icon={FolderKanban} title="Nothing to approve" text={`There are no ${mod} items waiting in your queue.`} />
      )}
      <TipBar />
    </PageCard>
  );
}

