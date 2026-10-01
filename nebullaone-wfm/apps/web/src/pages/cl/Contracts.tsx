import { CheckCircle2, Clock3, FileSignature, FileStack, Plus, Rocket, XCircle } from 'lucide-react';
import { useState } from 'react';
import { ActionButton, ActionForm } from '../../components/ActionForm';
import { AuditTrail } from '../../components/AuditTrail';
import { DataTable } from '../../components/DataTable';
import { Page } from '../../components/Layout';
import { Badge, Drawer, KV, Notice, Progress, Section, Tabs } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useDoc, useList, type Doc } from '../../lib/data';
import { fmtDate, fmtINR, fmtINRShort, fmtPct, todayISO } from '../../lib/format';
import { PROJECTS, useVendors, vendorOptions } from '../../lib/hooks';

const STAGE_ROLE: Record<string, string> = { 'Legal Counsel': 'legal', Legal: 'legal', 'Finance Controller': 'finance', Finance: 'finance', 'Project Manager': 'project' };

export function Contracts() {
  const rows = useList('contracts');
  const vendors = useVendors();
  const { can } = useAuth();
  const [open, setOpen] = useState<string | null>(null);
  const renewals = (rows.data ?? []).flatMap((c) => [
    ...(c._expiring ? [`${c.id} · completion ${fmtDate(c._revisedEnd)}`] : []),
    ...(c._bgIssues ?? []).map((i: Doc) => `${c.id} · ${i.message}`),
  ]);
  return (
    <Page title="Contracts" icon={FileSignature}
      actions={can('project') && (
        <ActionForm className="btn btn-primary" label={<><Plus size={14} />Create contract</>} title="Create contract (draft)" path="/contracts" onDone={(c) => setOpen(c.id)}
          fields={[
            { name: 'vendorId', label: 'Contractor', type: 'select', required: true, options: vendorOptions(vendors.data, (v) => v.isContractor && v.status === 'Active') },
            { name: 'project', label: 'Project', type: 'select', required: true, options: PROJECTS }, { name: 'title', label: 'Title', required: true, span: 2 },
            { name: 'type', label: 'Type', type: 'select', required: true, options: ['Item-Rate', 'Lump Sum', 'Rate Contract'] }, { name: 'value', label: 'Contract value (₹, ex GST)', type: 'number', required: true },
            { name: 'start', label: 'Start', type: 'date', required: true }, { name: 'end', label: 'Completion', type: 'date', required: true },
            { name: 'retentionPct', label: 'Retention %', type: 'number', default: 5 }, { name: 'securityDepositPct', label: 'Security deposit % (per bill)', type: 'number', default: 0, help: 'New: deducted from each RA bill and tracked in the financial security ledger' },
            { name: 'advancePct', label: 'Mobilisation advance %', type: 'number', default: 0 }, { name: 'advanceRecoveryPct', label: 'Advance recovery % per bill', type: 'number', default: 0 },
            { name: 'pbgPct', label: 'Performance BG %', type: 'number', default: 5 }, { name: 'dlpMonths', label: 'Defect liability (months)', type: 'number', default: 12 },
            { name: 'ldPctPerWeek', label: 'LD % per week', type: 'number', default: 0.5 }, { name: 'ldCapPct', label: 'LD cap %', type: 'number', default: 5 },
            { name: 'gstPct', label: 'GST %', type: 'number', default: 18 }, { name: 'cessPct', label: 'Labour cess %', type: 'number', default: 1 },
          ]} />
      )}>
      {renewals.length > 0 && <div className="border-b border-line px-4 py-2.5"><Notice tone="amber" title="Renewals & guarantee coverage" items={renewals} /></div>}
      <DataTable rows={rows.data} loading={rows.isLoading} onRowClick={(r) => setOpen(r.id)} exportName="contracts"
        filters={[{ label: 'Status', options: ['Draft', 'Pending Approval', 'Approved', 'Active', 'In DLP', 'Completed', 'Closed'], value: (r) => r.status }]}
        columns={[
          { key: 'id', header: 'Contract' }, { key: 'title', header: 'Title', render: (r) => <span className="font-medium">{r.title}</span> },
          { key: 'vendor', header: 'Contractor', value: (r) => vendors.name(r.vendorId) }, { key: 'type', header: 'Type' },
          { key: 'value', header: 'Value', align: 'right', value: (r) => r._revisedValue, render: (r) => <span title={r._revisedValue !== r.value ? `Original ${fmtINR(r.value)} + approved variations` : undefined}>{fmtINRShort(r._revisedValue)}</span> },
          { key: 'billed', header: 'Billed', value: (r) => r._billedPct, render: (r) => <span className="flex items-center gap-2"><Progress value={r._billedPct} /><span className="text-[12px] num">{fmtPct(r._billedPct)}</span></span> },
          { key: 'end', header: 'Completion', value: (r) => r._revisedEnd, render: (r) => fmtDate(r._revisedEnd) },
          { key: 'status', header: 'Status', render: (r) => <span className="flex gap-1"><Badge>{r._expiring ? 'Expiring' : r.status}</Badge>{r._bgIssues?.length > 0 && <Badge tone="red">BG gap</Badge>}</span> },
        ]} />
      <ContractDrawer id={open} onClose={() => setOpen(null)} />
    </Page>
  );
}

export function ContractDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: c } = useDoc('contracts', id);
  const vendors = useVendors();
  const { can, user } = useAuth();
  const [tab, setTab] = useState<'overview' | 'approval' | 'bg' | 'co' | 'fs' | 'activity'>('overview');
  if (!id || !c) return null;
  const pending = c.approval?.stages?.find((s: Doc) => s.status === 'Pending');
  const mine = pending && (user?.role === 'admin' || STAGE_ROLE[pending.role] === user?.role);
  const fs = c._fs;
  return (
    <Drawer open onClose={onClose} title={`${c.id} · ${c.title}`} subtitle={<span className="flex items-center gap-2">{vendors.name(c.vendorId)} · {c.type} <Badge>{c.status}</Badge></span>} width="max-w-[900px]"
      actions={<>
        {['Draft', 'Returned'].includes(c.status) && can('project') && <ActionButton className="btn btn-primary btn-sm" label="Submit for approval" path={`/contracts/${c.id}/submit`} />}
        {c.status === 'Approved' && can('project', 'legal') && <ActionForm className="btn btn-primary btn-sm" label="Record signing" title="Contract signed" path={`/contracts/${c.id}/sign`} initial={{ signedOn: todayISO() }} description="Signing activates the contract. A performance BG valid until DLP end is required when the contract asks for one." fields={[{ name: 'signedOn', label: 'Signed on', type: 'date', required: true }, { name: 'signedBy', label: 'Signed by', required: true }]} />}
      </>}>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'overview', label: 'Overview' }, { id: 'approval', label: 'Approval' }, { id: 'bg', label: 'Guarantees', count: c.guarantees?.length }, { id: 'co', label: 'Change orders', count: c.changeOrders?.length }, { id: 'fs', label: 'Financial security' }, { id: 'activity', label: 'Activity' }]} />
      {tab === 'overview' && (
        <div className="space-y-4 p-5">
          {c._bgIssues?.length > 0 && <Notice tone="red" title="Guarantee coverage gap" items={c._bgIssues.map((i: Doc) => i.message)} />}
          <KV rows={[
            ['Project', c.project], ['Owner', c.owner], ['Original value', fmtINR(c.value)], ['Revised value (incl. approved COs)', fmtINR(c._revisedValue)],
            ['Period', `${fmtDate(c.start)} → ${fmtDate(c.end)}`], ['Revised completion', fmtDate(c._revisedEnd)], ['Billed (gross)', `${fmtINR(c._billed)} · ${fmtPct(c._billedPct)}`],
            ['Retention', `${c.retentionPct}%`], ['Security deposit', `${c.securityDepositPct ?? 0}%`], ['Advance', `${c.advancePct}% · ${fmtINR(c.advanceAmount)} (recovered ${c.advanceRecoveryPct}%/bill)`],
            ['Performance BG', `${c.pbgPct ?? 0}%`], ['DLP', `${c.dlpMonths} months · ends ${fmtDate(c._dlpEnd)}`], ['LD', `${c.ldPctPerWeek}%/week, cap ${c.ldCapPct}%`], ['GST / cess', `${c.gstPct}% / ${c.cessPct}%`],
            ['Signed', c.signedOn ? `${fmtDate(c.signedOn)} · ${c.signedBy}` : '—'], ['Handover', c.handover ? `${fmtDate(c.handover.date)} · ${c.handover.takenOverBy}` : '—'],
          ]} />
        </div>
      )}
      {tab === 'approval' && (
        <div className="space-y-3 p-5">
          {!(c.approval?.stages ?? []).length ? <p className="text-[13px] text-ink-mute">Not submitted yet.</p> : c.approval.stages.map((s: Doc, i: number) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border border-line p-3">
              {s.status === 'Approved' ? <CheckCircle2 className="text-green-600" size={18} /> : s.status === 'Pending' ? <Clock3 className="text-amber-500" size={18} /> : <XCircle className="text-red-600" size={18} />}
              <div><div className="font-medium">L{i + 1} · {s.role}</div><div className="text-[12px] text-ink-mute">{s.status}{s.by ? ` · ${s.by} · ${fmtDate(s.at)}` : ''}{s.remark ? ` — ${s.remark}` : ''}</div></div>
            </div>
          ))}
          {c.status === 'Pending Approval' && mine && (
            <div className="flex gap-2">
              <ActionForm className="btn btn-primary" label={`Approve as ${pending.role}`} title={`Approve — ${pending.role}`} path={`/contracts/${c.id}/approval`} transform={(v) => ({ ...v, decision: 'Approve' })} fields={[{ name: 'remark', label: 'Remark', type: 'textarea' }]} />
              <ActionForm label="Return" title="Return for changes" path={`/contracts/${c.id}/approval`} transform={(v) => ({ ...v, decision: 'Return' })} fields={[{ name: 'remark', label: 'What needs to change', type: 'textarea', required: true }]} />
              <ActionForm danger label="Reject" title="Reject contract" path={`/contracts/${c.id}/approval`} transform={(v) => ({ ...v, decision: 'Reject' })} fields={[{ name: 'remark', label: 'Reason', type: 'textarea', required: true }]} />
            </div>
          )}
          {c.status === 'Pending Approval' && pending && !mine && <Notice tone="blue" title={`Waiting for ${pending.role}`} />}
        </div>
      )}
      {tab === 'bg' && (
        <div className="space-y-3 p-5">
          {c._bgIssues?.length > 0 && <Notice tone="red" title="Coverage check" items={c._bgIssues.map((i: Doc) => i.message)} />}
          <table className="tbl w-full"><thead><tr><th>Guarantee</th><th>Bank</th><th className="text-right">Amount</th><th>Expiry</th><th /></tr></thead>
            <tbody>{(c.guarantees ?? []).map((g: Doc) => (
              <tr key={g.id}><td><div className="font-medium">{g.type}</div><div className="text-[12px] text-ink-mute">{g.number}</div></td><td>{g.bank}</td><td className="text-right num">{fmtINR(g.amount)}</td><td>{fmtDate(g.expiry)}</td>
                <td className="text-right">{can('finance', 'legal', 'project') && <ActionForm className="btn btn-sm" label="Extend" title={`Extend ${g.number}`} path={`/contracts/${c.id}/guarantees/extend`} transform={(v) => ({ ...v, guaranteeId: g.id })} initial={{ expiry: c._dlpEnd }} fields={[{ name: 'expiry', label: 'New expiry', type: 'date', required: true, help: `DLP ends ${fmtDate(c._dlpEnd)}` }, { name: 'amendmentRef', label: 'Bank amendment ref.', required: true }]} />}</td></tr>
            ))}</tbody>
          </table>
          {can('finance', 'legal', 'project') && <ActionForm label={<><Plus size={14} />Record guarantee</>} title="Record bank guarantee" path={`/contracts/${c.id}/guarantees`} initial={{ receivedOn: todayISO(), expiry: c._dlpEnd }}
            fields={[{ name: 'type', label: 'Type', type: 'select', required: true, options: ['Performance', 'Advance', 'Retention'] }, { name: 'bank', label: 'Issuing bank', required: true }, { name: 'number', label: 'BG number', required: true }, { name: 'amount', label: 'Amount (₹)', type: 'number', required: true, help: `PBG ${c.pbgPct ?? 0}% = ${fmtINR((c._revisedValue * (c.pbgPct ?? 0)) / 100)}` }, { name: 'expiry', label: 'Expiry', type: 'date', required: true, help: `Performance BGs must cover DLP end (${fmtDate(c._dlpEnd)})` }, { name: 'receivedOn', label: 'Received on', type: 'date', required: true }]} />}
        </div>
      )}
      {tab === 'co' && <ChangeOrderList contract={c} />}
      {tab === 'fs' && fs && (
        <div className="space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <FsBox title="Advance" held={fs.advanceGiven} moved={fs.advanceRecovered} bal={fs.advanceBalance} movedLabel="recovered" />
            <FsBox title="Retention" held={fs.retentionHeld} moved={fs.retentionReleased} bal={fs.retentionBalance} movedLabel="released" />
            <FsBox title="Security deposit" held={fs.sdHeld} moved={fs.sdReleased} bal={fs.sdBalance} movedLabel="refunded" />
          </div>
          <table className="tbl w-full"><thead><tr><th>Date</th><th>Type</th><th>Movement</th><th>Ref</th><th className="text-right">Amount</th><th className="text-right">Balance</th></tr></thead>
            <tbody>{fs.movements.map((m: Doc, i: number) => <tr key={i}><td>{fmtDate(m.date)}</td><td>{m.type}</td><td>{m.description}</td><td>{m.ref}</td><td className={`text-right num ${m.amount < 0 ? 'text-green-700' : ''}`}>{fmtINR(m.amount)}</td><td className="text-right num">{fmtINR(m.balance)}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {tab === 'activity' && <AuditTrail entity="contracts" refId={c.id} />}
    </Drawer>
  );
}

function FsBox({ title, held, moved, bal, movedLabel }: { title: string; held: number; moved: number; bal: number; movedLabel: string }) {
  return <div className="rounded-lg border border-line p-3"><div className="text-[12px] font-semibold text-ink-mute">{title}</div><div className="mt-1 text-[18px] font-semibold num">{fmtINRShort(bal)}</div><div className="text-[12px] text-ink-mute">{fmtINRShort(held)} in · {fmtINRShort(moved)} {movedLabel}</div></div>;
}

function ChangeOrderList({ contract: c }: { contract: Doc }) {
  const { can, user } = useAuth();
  return (
    <div className="space-y-3 p-5">
      {['Active', 'In DLP'].includes(c.status) && can('project') && (
        <ActionForm className="btn btn-primary" label={<><Plus size={14} />Raise change order</>} title={`Change order on ${c.id}`} path={`/contracts/${c.id}/change-orders`}
          fields={[
            { name: 'type', label: 'Change type', type: 'select', required: true, options: ['Scope Change', 'Quantity Change', 'Rate Change', 'Additional Work', 'Deleted Work', 'Time Extension'] },
            { name: 'amount', label: 'Cost impact (₹, negative for deletions)', type: 'number', required: true, default: 0 }, { name: 'days', label: 'Time impact (days)', type: 'number', default: 0 },
            { name: 'desc', label: 'Description', required: true, span: 2 }, { name: 'reason', label: 'Reason / instruction reference', required: true, span: 2 },
            { name: 'technicalJustification', label: 'Technical justification', type: 'textarea' }, { name: 'commercialJustification', label: 'Commercial justification', type: 'textarea' },
          ]} />
      )}
      {!(c.changeOrders ?? []).length && <p className="text-[13px] text-ink-mute">No change orders.</p>}
      {(c.changeOrders ?? []).map((co: Doc) => (
        <div key={co.id} className="rounded-lg border border-line p-3">
          <div className="flex flex-wrap items-center gap-2"><b>{co.id}</b><span>{co.desc}</span><Badge>{co.status}</Badge><span className="ml-auto font-medium num">{fmtINR(co.amount)}{co.days ? ` · +${co.days} days` : ''}</span></div>
          <div className="mt-1 text-[12.5px] text-ink-mute">{co.type ?? 'Variation'} · raised {fmtDate(co.raisedOn)}{co.raisedBy ? ` by ${co.raisedBy}` : ''} · {co.reason}{co.decidedBy ? ` · ${co.status.toLowerCase()} by ${co.decidedBy}` : ''}</div>
          {co.status === 'Pending' && can('project', 'finance') && !String(co.raisedBy ?? '').startsWith(user?.name ?? '§') && (
            <div className="mt-2 flex gap-2">
              <ActionForm className="btn btn-primary btn-sm" label="Approve" title={`Approve ${co.id}`} path={`/contracts/${c.id}/change-orders/${co.id}/decision`} transform={(v) => ({ ...v, decision: 'Approved' })} description={`Revised value becomes ${fmtINR(c._revisedValue + co.amount)}${co.days ? `; completion moves ${co.days} days` : ''}. Guarantee coverage is re-checked.`} fields={[{ name: 'remark', label: 'Remark', type: 'textarea' }]} />
              <ActionForm className="btn btn-sm" label="Reject" title={`Reject ${co.id}`} path={`/contracts/${c.id}/change-orders/${co.id}/decision`} transform={(v) => ({ ...v, decision: 'Rejected' })} fields={[{ name: 'remark', label: 'Reason', type: 'textarea', required: true }]} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** New screen (stage 17): all change orders across contracts. */
export function ChangeOrders() {
  const rows = useList('contracts');
  const vendors = useVendors();
  const [open, setOpen] = useState<string | null>(null);
  const cos = (rows.data ?? []).flatMap((c) => (c.changeOrders ?? []).map((co: Doc) => ({ ...co, contractId: c.id, contractTitle: c.title, vendorId: c.vendorId, rowId: `${c.id}:${co.id}` })));
  const approved = cos.filter((x) => x.status === 'Approved').reduce((s, x) => s + x.amount, 0);
  const pending = cos.filter((x) => x.status === 'Pending').reduce((s, x) => s + x.amount, 0);
  return (
    <Page title="Change & Variations" icon={FileStack}>
      <div className="border-b border-line px-4 py-2.5 text-[12.5px] text-ink-mute">Raise a change order from the contract (Contracts → open → Change orders). Approved changes update the contract value and completion date; the raiser can never approve their own change.</div>
      <DataTable rows={cos} rowKey={(r) => r.rowId} loading={rows.isLoading} onRowClick={(r) => setOpen(r.contractId)} exportName="change-orders" empty={{ title: 'No change orders' }}
        filters={[{ label: 'Status', options: ['Pending', 'Approved', 'Rejected'], value: (r) => r.status }]}
        footer={<span>Approved <b className="text-ink">{fmtINR(approved)}</b> · pending <b className="text-amber-700">{fmtINR(pending)}</b></span>}
        columns={[
          { key: 'id', header: 'CO' }, { key: 'contract', header: 'Contract', value: (r) => `${r.contractId} ${r.contractTitle}`, render: (r) => <div><div>{r.contractId}</div><div className="text-[12px] text-ink-mute">{vendors.name(r.vendorId)}</div></div> },
          { key: 'type', header: 'Type', value: (r) => r.type ?? 'Variation' }, { key: 'desc', header: 'Description' },
          { key: 'amount', header: 'Cost impact', align: 'right', render: (r) => fmtINR(r.amount) }, { key: 'days', header: 'Days', align: 'right' },
          { key: 'raisedOn', header: 'Raised', render: (r) => fmtDate(r.raisedOn) }, { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
        ]} />
      <ContractDrawer id={open} onClose={() => setOpen(null)} />
    </Page>
  );
}

/** New screen (stage 08): contract kickoff checklist — work orders can't be issued until it's complete. */
export function Kickoff() {
  const contracts = useList('contracts');
  const kickoffs = useList('kickoffs');
  const vendors = useVendors();
  const { can } = useAuth();
  const [sel, setSel] = useState<string | null>(null);
  const rows: Doc[] = (contracts.data ?? []).filter((c) => !['Draft', 'Pending Approval', 'Rejected'].includes(c.status)).map((c) => ({ ...c, _ko: (kickoffs.data ?? []).find((k) => k.contractId === c.id) }));
  const cur = rows.find((r) => r.id === sel);
  const ko = cur?._ko;
  return (
    <Page title="Contract Kickoff" icon={Rocket}>
      <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_420px]">
        <DataTable rows={rows} loading={contracts.isLoading} onRowClick={(r) => setSel(r.id)} exportName="kickoffs"
          columns={[
            { key: 'id', header: 'Contract' }, { key: 'title', header: 'Title' }, { key: 'vendor', header: 'Contractor', value: (r) => vendors.name(r.vendorId) },
            { key: 'meeting', header: 'Meeting', value: (r) => r._ko?.meetingDate, render: (r) => fmtDate(r._ko?.meetingDate) },
            { key: 'items', header: 'Checklist', value: (r) => (r._ko ? r._ko.checklist.filter((i: Doc) => i.done).length : 0), render: (r) => r._ko ? `${r._ko.checklist.filter((i: Doc) => i.done).length}/${r._ko.checklist.length}` : '—' },
            { key: 'status', header: 'Status', value: (r) => r._ko?.status ?? 'Not started', render: (r) => <Badge tone={r._ko?.status === 'Completed' ? 'green' : r._ko ? 'blue' : 'amber'}>{r._ko?.status ?? 'Not started'}</Badge> },
          ]} />
        <aside className="border-l border-line p-4">
          {!cur ? <p className="text-[13px] text-ink-mute">Select a contract to see or run its kickoff.</p> : (
            <Section title={`${cur.id} kickoff`}>
              <div className="space-y-3 p-4">
                {ko ? <p className="text-[12.5px] text-ink-mute">Meeting {fmtDate(ko.meetingDate)} · chaired by {ko.chairedBy}{ko.attendees?.length ? ` · ${ko.attendees.join(', ')}` : ''}</p> : <p className="text-[13px]">No kickoff recorded yet.</p>}
                {ko && <ul className="space-y-1.5">{ko.checklist.map((i: Doc, n: number) => <li key={n} className="flex items-center gap-2 text-[13px]">{i.done ? <CheckCircle2 size={16} className="text-green-600" /> : <Clock3 size={16} className="text-amber-500" />}{i.item}</li>)}</ul>}
                {can('project') && ko?.status !== 'Completed' && (
                  <div className="flex flex-wrap gap-2">
                    <ActionForm className="btn btn-primary btn-sm" label={ko ? 'Update checklist' : 'Record kickoff meeting'} title={`Kickoff — ${cur.id}`} path={`/contracts/${cur.id}/kickoff`}
                      initial={{ meetingDate: ko?.meetingDate ?? todayISO(), attendees: (ko?.attendees ?? []).join(', '), ...Object.fromEntries((ko?.checklist ?? []).map((i: Doc, n: number) => [`c${n}`, i.done])) }}
                      transform={(v) => ({ meetingDate: v.meetingDate, attendees: String(v.attendees ?? '').split(',').map((s) => s.trim()).filter(Boolean), checklist: KO_ITEMS.map((item, n) => ({ item, done: !!v[`c${n}`], note: '' })) })}
                      fields={[{ name: 'meetingDate', label: 'Meeting date', type: 'date', required: true }, { name: 'attendees', label: 'Attendees (comma separated)', span: 2 }, ...KO_ITEMS.map((item, n) => ({ name: `c${n}`, label: item, type: 'checkbox' as const }))]} />
                    {ko && <ActionButton className="btn btn-sm" label="Mark kickoff complete" path={`/contracts/${cur.id}/kickoff/complete`} />}
                  </div>
                )}
              </div>
            </Section>
          )}
        </aside>
      </div>
    </Page>
  );
}

const KO_ITEMS = ['Scope & BOQ confirmed', 'Drawings & documents handed over', 'Site handed over', 'Schedule & milestones agreed', 'Labour & material rates confirmed', 'Payment terms, retention & guarantees confirmed', 'Roles, contacts & communication matrix'];
