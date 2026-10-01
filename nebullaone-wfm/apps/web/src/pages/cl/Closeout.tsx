import { CheckCircle2, Circle, Flag, Handshake, LayoutGrid, ListChecks, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ActionButton, ActionForm } from '../../components/ActionForm';
import { DataTable } from '../../components/DataTable';
import { Page } from '../../components/Layout';
import { Badge, Donut, Kpi, KV, Notice, Section, Tabs } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useGet, useList, type Doc } from '../../lib/data';
import { fmtDate, fmtINR, fmtINRShort, todayISO } from '../../lib/format';
import { useVendors } from '../../lib/hooks';

// ── Contract & labour overview ───────────────────────────────────────────────
export function ClOverview() {
  const contracts = useList('contracts');
  const wos = useList('workOrders');
  const bills = useList('raBills');
  const ms = useList('measurements');
  const ncrs = useList('ncrs');
  const si = useList('safetyIncidents');
  const c = (contracts.data ?? []).filter((x) => !['Draft', 'Rejected'].includes(x.status));
  const live = (wos.data ?? []).filter((w) => ['In Progress', 'Issued'].includes(w.status));
  const unbilled = (ms.data ?? []).filter((m) => m.jms?.status === 'Signed' && !m.billedIn).reduce((s, m) => {
    const w = (wos.data ?? []).find((x) => x.id === m.woId);
    if (!w || w.type === 'Lump Sum') return s;
    const it = w.items.find((i: Doc) => i.id === m.lineId);
    return s + (m.qty ?? 0) * (it?.rate ?? 0);
  }, 0);
  const inCert = (bills.data ?? []).filter((b) => ['Submitted', 'Verified', 'Certified'].includes(b.status));
  const ret = c.reduce((s, x) => s + (x._fs?.retentionBalance ?? 0), 0);
  const adv = c.reduce((s, x) => s + (x._fs?.advanceBalance ?? 0), 0);
  const flags = (wos.data ?? []).filter((w) => w.status !== 'Draft');
  const spi = live.length ? live.reduce((s, w) => s + w._progress.spi, 0) / live.length : 0;
  const alerts = [
    ...c.flatMap((x) => (x._bgIssues ?? []).map((i: Doc) => ({ tone: 'red', text: `${x.id}: ${i.message}`, to: '/cl/financial-security' }))),
    ...c.filter((x) => x._expiring).map((x) => ({ tone: 'amber', text: `${x.id} completes ${fmtDate(x._revisedEnd)}`, to: '/cl/contracts' })),
    ...(ncrs.data ?? []).filter((n) => n.status !== 'Closed').map((n) => ({ tone: 'amber', text: `${n.id} open on ${n.woId}: ${n.desc}`, to: '/cl/measurement-book' })),
    ...(si.data ?? []).filter((x) => x.status !== 'Closed').map((x) => ({ tone: x.severity === 'Minor' ? 'amber' : 'red', text: `${x.id} ${x.type}: ${x.description}`, to: '/cl/safety' })),
    ...live.filter((w) => w._flag === 'Delayed').map((w) => ({ tone: 'red', text: `${w.id} delayed — SPI ${w._progress.spi.toFixed(2)}`, to: '/cl/performance' })),
  ];
  return (
    <Page title="Contract & Labour Overview" icon={LayoutGrid} scroll>
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <Kpi label="Contracts" value={c.filter((x) => ['Active', 'In DLP'].includes(x.status)).length} sub={`${fmtINRShort(c.reduce((s, x) => s + x._revisedValue, 0))} value`} tone="violet" />
          <Kpi label="Live work orders" value={fmtINRShort(live.reduce((s, w) => s + w._value, 0))} sub={`${live.length} WOs`} tone="blue" />
          <Kpi label="Work done, unbilled" value={fmtINRShort(unbilled)} sub="JMS-signed" tone="teal" />
          <Kpi label="RA bills in certification" value={fmtINRShort(inCert.reduce((s, b) => s + b.net, 0))} sub={`${inCert.length} bills`} tone="amber" />
          <Kpi label="Retention held" value={fmtINRShort(ret)} sub={`${fmtINRShort(adv)} advance to recover`} tone="green" />
          <Kpi label="Open alerts" value={alerts.length} sub={`${alerts.filter((a) => a.tone === 'red').length} critical`} tone="red" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Section title="Work order delivery" action={<Link className="text-[13px] text-brand" to="/cl/performance">Progress →</Link>}>
            <Donut center={flags.length} sub="work orders" segments={[
              { label: 'On track', value: flags.filter((w) => w._flag === 'On Track').length, color: '#16a34a' }, { label: 'At risk', value: flags.filter((w) => w._flag === 'At Risk').length, color: '#f59e0b' },
              { label: 'Delayed', value: flags.filter((w) => w._flag === 'Delayed').length, color: '#dc2626' }, { label: 'Completed', value: flags.filter((w) => w._flag === 'Completed').length, color: '#2563eb' },
            ]} />
            <div className="border-t border-line px-4 py-2 text-[13px]">Average SPI <b className="num">{spi.toFixed(2)}</b> <span className="text-ink-mute">target 1.00</span></div>
          </Section>
          <Section title="Alerts" className="lg:col-span-2">
            <ul className="max-h-[260px] divide-y divide-line overflow-y-auto">
              {alerts.length ? alerts.map((a, i) => <li key={i} className="flex items-center gap-2 px-4 py-2 text-[13px]"><span className={`h-2 w-2 shrink-0 rounded-full ${a.tone === 'red' ? 'bg-red-500' : 'bg-amber-500'}`} /><span className="flex-1 truncate" title={a.text}>{a.text}</span><Link className="text-brand" to={a.to}>Open</Link></li>) : <li className="px-4 py-6 text-center text-[13px] text-ink-mute">No alerts</li>}
            </ul>
          </Section>
        </div>
      </div>
    </Page>
  );
}

// ── Close-out & handover (stages 24, 26) ─────────────────────────────────────
export function Closeout() {
  const contracts = useList('contracts');
  const wos = useList('workOrders');
  const punch = useList('punchItems');
  const insp = useList('inspections');
  const vendors = useVendors();
  const { can } = useAuth();
  const [tab, setTab] = useState<'contracts' | 'punch' | 'inspections'>('contracts');
  const rows = (contracts.data ?? []).filter((c) => ['Active', 'In DLP', 'Completed', 'Closed'].includes(c.status));
  const done = (c: Doc) => (wos.data ?? []).filter((w) => w.contractId === c.id);
  const stageOf = (c: Doc) => c.status === 'Closed' ? 'Closed' : c.handover ? (c.status === 'In DLP' ? 'In DLP' : 'Retention & guarantees') : done(c).every((w) => w.status === 'Completed') && done(c).length ? 'Ready for inspection' : 'Execution';
  return (
    <Page title="Close-out & Handover" icon={Flag}
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'contracts', label: 'Contracts' }, { id: 'punch', label: 'Punch list', count: (punch.data ?? []).filter((p) => p.status !== 'Closed').length }, { id: 'inspections', label: 'Final inspections', count: insp.data?.length }]} />}>
      {tab === 'contracts' && (
        <DataTable rows={rows} loading={contracts.isLoading} exportName="closeout"
          columns={[
            { key: 'id', header: 'Contract' }, { key: 'title', header: 'Title' }, { key: 'vendor', header: 'Contractor', value: (r) => vendors.name(r.vendorId) },
            { key: 'wos', header: 'Work orders done', value: (r) => done(r).filter((w) => w.status === 'Completed').length, render: (r) => `${done(r).filter((w) => w.status === 'Completed').length}/${done(r).length}` },
            { key: 'punch', header: 'Open punch items', align: 'right', value: (r) => (punch.data ?? []).filter((p) => p.contractId === r.id && p.status !== 'Closed').length },
            { key: 'handover', header: 'Handover', value: (r) => r.handover?.date, render: (r) => fmtDate(r.handover?.date) },
            { key: 'dlp', header: 'DLP ends', value: (r) => r._dlpEnd, render: (r) => (r.handover ? fmtDate(r._dlpEnd) : '—') },
            { key: 'stage', header: 'Stage', value: stageOf, render: (r) => <Badge>{stageOf(r)}</Badge> },
            { key: 'act', header: '', sortable: false, render: (r) => !r.handover && can('project') && stageOf(r) === 'Ready for inspection' && (
              <ActionForm className="btn btn-sm" label="Record handover" title={`Handover — ${r.id}`} path={`/contracts/${r.id}/handover`} initial={{ date: todayISO() }}
                description="Needs a passed final inspection and no open major punch items. DLP starts on the handover date."
                fields={[{ name: 'date', label: 'Handover date', type: 'date', required: true }, { name: 'takenOverBy', label: 'Taken over by', required: true }, { name: 'inspectionId', label: 'Final inspection', type: 'select', required: true, options: (insp.data ?? []).filter((i) => i.contractId === r.id && i.result === 'Passed').map((i) => ({ value: i.id, label: `${i.id} — ${fmtDate(i.date)}` })) }, { name: 'note', label: 'Note', type: 'textarea' }]} />
            ) },
          ]} />
      )}
      {tab === 'punch' && (
        <DataTable rows={punch.data} loading={punch.isLoading} exportName="punch-list" empty={{ title: 'No punch items' }}
          toolbar={can('project', 'qa_hse') && <ActionForm className="btn btn-sm" label={<><Plus size={14} />Add punch item</>} title="Add punch item" path="/punch-items" fields={[{ name: 'contractId', label: 'Contract', type: 'select', required: true, options: rows.map((c) => ({ value: c.id, label: `${c.id} — ${c.title}` })) }, { name: 'desc', label: 'Description', required: true, span: 2 }, { name: 'location', label: 'Location', required: true }, { name: 'severity', label: 'Severity', type: 'select', required: true, options: ['Minor', 'Major', 'Critical'] }, { name: 'due', label: 'Due', type: 'date', required: true }]} />}
          columns={[
            { key: 'id', header: 'Item' }, { key: 'contractId', header: 'Contract' }, { key: 'desc', header: 'Description' }, { key: 'location', header: 'Location' },
            { key: 'severity', header: 'Severity', render: (r) => <Badge>{r.severity}</Badge> }, { key: 'due', header: 'Due', render: (r) => fmtDate(r.due) }, { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
            { key: 'act', header: '', sortable: false, render: (r) => (
              <span className="inline-flex gap-1">
                {r.status === 'Open' && can('project') && <ActionButton className="btn btn-sm" label="Rectified" path={`/punch-items/${r.id}/status`} body={{ status: 'Rectified' }} />}
                {r.status === 'Rectified' && can('project', 'qa_hse') && <ActionButton className="btn btn-sm" label="Verify & close" path={`/punch-items/${r.id}/status`} body={{ status: 'Closed' }} />}
              </span>
            ) },
          ]} />
      )}
      {tab === 'inspections' && (
        <DataTable rows={insp.data} loading={insp.isLoading} exportName="final-inspections" empty={{ title: 'No final inspections' }}
          toolbar={can('project', 'qa_hse') && <ActionForm className="btn btn-sm" label={<><Plus size={14} />Record inspection</>} title="Final inspection" path="/inspections" fields={[{ name: 'contractId', label: 'Contract', type: 'select', required: true, options: rows.map((c) => ({ value: c.id, label: `${c.id} — ${c.title}` })) }, { name: 'date', label: 'Date', type: 'date', required: true, default: todayISO() }, { name: 'result', label: 'Result', type: 'select', required: true, options: ['Passed', 'Failed'] }, { name: 'note', label: 'Note', type: 'textarea' }]} />}
          columns={[{ key: 'id', header: 'Inspection' }, { key: 'contractId', header: 'Contract' }, { key: 'date', header: 'Date', render: (r) => fmtDate(r.date) }, { key: 'by', header: 'By' }, { key: 'result', header: 'Result', render: (r) => <Badge>{r.result}</Badge> }, { key: 'note', header: 'Note' }]} />
      )}
    </Page>
  );
}

function ContractPicker({ value, onChange, filter }: { value: string; onChange: (v: string) => void; filter: (c: Doc) => boolean }) {
  const contracts = useList('contracts');
  const vendors = useVendors();
  return (
    <select className="input w-80" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Contract">
      <option value="">Select a contract…</option>
      {(contracts.data ?? []).filter(filter).map((c) => <option key={c.id} value={c.id}>{c.id} — {c.title} ({vendors.name(c.vendorId)})</option>)}
    </select>
  );
}

// ── Final settlement (stage 25 — new) ────────────────────────────────────────
export function FinalSettlement() {
  const [id, setId] = useState('CTR-005');
  const s = useGet<Doc>(id ? `/contracts/${id}/final-settlement` : null, ['settlement', id]);
  const saved = (useList('finalSettlements').data ?? []).find((f) => f.contractId === id);
  const { can } = useAuth();
  const d = s.data;
  return (
    <Page title="Final Settlement" icon={Handshake} scroll actions={<ContractPicker value={id} onChange={setId} filter={(c) => ['Active', 'In DLP', 'Completed', 'Closed'].includes(c.status)} />}>
      {!d ? <p className="p-6 text-[13px] text-ink-mute">{id ? 'Loading…' : 'Choose a contract.'}</p> : (
        <div className="mx-auto w-full max-w-[860px] space-y-4 p-4">
          {d.blockers.length > 0 ? <Notice tone="amber" title="Not ready to settle" items={d.blockers} /> : <Notice tone="green" title="No blockers — the final account can be prepared" />}
          {saved && <Notice tone={saved.status === 'Approved' ? 'green' : 'blue'} title={`Final settlement ${saved.id}: ${saved.status}`}><p>Prepared by {saved.preparedBy}{saved.approvedBy ? ` · approved by ${saved.approvedBy}` : ''} · final payable {fmtINR(saved.finalPayable)}</p></Notice>}
          <Section title="Final account">
            <div className="p-5"><KV rows={[
              ['Original contract value', fmtINR(d.originalValue)], ['Approved variations', fmtINR(d.approvedVariations)], ['Final contract value', <b key="v">{fmtINR(d.finalContractValue)}</b>],
              ['Gross billed', fmtINR(d.grossBilled)], ['Net certified (approved bills)', fmtINR(d.netCertified)], ['Paid to date', fmtINR(d.paid)], ['Balance of certified bills', fmtINR(d.balanceToPay)],
              ['Advance outstanding (to recover)', fmtINR(d.advanceOutstanding)], ['Retention held', fmtINR(d.retentionHeld)], ['Security deposit held', fmtINR(d.securityDepositHeld)],
              ['Liquidated damages (calculated)', fmtINR(d.ld)], ['DLP ends', fmtDate(d.dlpEnds)],
            ]} /></div>
          </Section>
          {d.activeHolds.length > 0 && <Notice tone="amber" title="Active holds on the contractor" items={d.activeHolds} />}
          {can('project', 'finance') && d.blockers.length === 0 && saved?.status !== 'Approved' && (
            <ActionForm className="btn btn-primary" label={saved ? 'Approve final settlement' : 'Prepare final settlement'} title={saved ? 'Approve final settlement (Finance)' : 'Prepare final settlement'} path={`/contracts/${id}/final-settlement`}
              description={saved ? 'The preparer cannot approve. Retention and security deposit are released separately (after DLP) from Retention & Guarantees.' : 'LD is applied unless waived with a reason.'}
              fields={[{ name: 'ldWaived', label: `Waive calculated LD (${fmtINR(d.ld)})`, type: 'checkbox' }, { name: 'ldWaiverReason', label: 'Reason for waiver', type: 'textarea', show: (v) => !!v.ldWaived }, { name: 'otherDeduction', label: 'Other final deduction (₹)', type: 'number', default: 0 }, { name: 'remark', label: 'Remark', type: 'textarea' }]} />
          )}
        </div>
      )}
    </Page>
  );
}

// ── Contractor release (stage 28 — new) ──────────────────────────────────────
export function ContractorRelease() {
  const [id, setId] = useState('CTR-005');
  const r = useGet<Doc>(id ? `/contracts/${id}/release` : null, ['release', id]);
  const { can } = useAuth();
  const d = r.data;
  const manual = (d?.checks ?? []).filter((c: Doc) => c.manual);
  return (
    <Page title="Contractor Release" icon={ListChecks} scroll actions={<ContractPicker value={id} onChange={setId} filter={(c) => ['In DLP', 'Completed', 'Closed', 'Active'].includes(c.status)} />}>
      {!d ? <p className="p-6 text-[13px] text-ink-mute">{id ? 'Loading…' : 'Choose a contract.'}</p> : (
        <div className="mx-auto w-full max-w-[760px] space-y-4 p-4">
          <div className="flex items-center gap-2"><h2 className="text-[15px] font-semibold">{id}</h2><Badge>{d.status}</Badge><span className="ml-auto text-[13px] text-ink-mute">{d.checks.filter((c: Doc) => c.ok).length}/{d.checks.length} complete</span></div>
          <p className="text-[12.5px] text-ink-mute">System checks update automatically from the ledger, NCRs, claims, holds and workers. Manual items are ticked by the project team. Completing the release closes the contract.</p>
          <ul className="card divide-y divide-line">
            {d.checks.map((c: Doc) => (
              <li key={c.key} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                {c.ok ? <CheckCircle2 size={18} className="text-green-600" /> : <Circle size={18} className="text-ink-faint" />}
                <div className="flex-1"><div>{c.label}</div>{c.detail && !c.ok && <div className="text-[12px] text-ink-mute">{c.detail}</div>}</div>
                <span className="text-[11px] text-ink-faint">{c.manual ? 'manual' : 'system'}</span>
              </li>
            ))}
          </ul>
          {can('project') && d.status !== 'Released' && (
            <div className="flex gap-2">
              <ActionForm label="Update manual checks" title="Manual release checks" path={`/contracts/${id}/release`} initial={Object.fromEntries(manual.map((c: Doc) => [c.key, c.ok]))}
                transform={(v) => ({ checks: Object.fromEntries(manual.map((c: Doc) => [c.key, !!v[c.key]])) })} fields={manual.map((c: Doc) => ({ name: c.key, label: c.label, type: 'checkbox' as const }))} />
              <ActionButton className="btn btn-primary" label="Complete release & close contract" path={`/contracts/${id}/release/complete`} confirm="Release the contractor and close the contract?" disabled={d.checks.some((c: Doc) => !c.ok)} />
            </div>
          )}
        </div>
      )}
    </Page>
  );
}
