import { useQueryClient } from '@tanstack/react-query';
import { Activity, CalendarCheck, ClipboardCheck, Plus, Ruler, ShieldAlert, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ActionButton, ActionForm } from '../../components/ActionForm';
import { DataTable } from '../../components/DataTable';
import { Page } from '../../components/Layout';
import { Badge, Chip, Drawer, KV, Notice, Progress, Tabs } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useDoc, useList, type Doc } from '../../lib/data';
import { cls, fmtDate, fmtINR, fmtINRShort, fmtNum, fmtPct, todayISO } from '../../lib/format';
import { useVendors } from '../../lib/hooks';
import { VendorDrawer } from '../vm/VendorDrawer';

// ── Contractor onboarding / mobilisation (stage 09) ──────────────────────────
export function Onboarding() {
  const vendors = useVendors();
  const workers = useList('workers');
  const [open, setOpen] = useState<string | null>(null);
  const [check, setCheck] = useState<string | null>(null);
  const rows = (vendors.data ?? []).filter((v) => v.isContractor);
  const cur = rows.find((r) => r.id === check);
  const { can } = useAuth();
  return (
    <Page title="Contractor Onboarding" icon={Users}>
      <DataTable rows={rows} loading={vendors.isLoading} onRowClick={(r) => setCheck(r.id)} exportName="onboarding"
        columns={[
          { key: 'name', header: 'Contractor', render: (r) => <button className="font-medium text-brand hover:underline" onClick={(e) => { e.stopPropagation(); setOpen(r.id); }}>{r.name}</button> },
          { key: 'trades', header: 'Trades', value: (r) => r.categories.join(', '), render: (r) => <span className="flex flex-wrap gap-1">{r.categories.slice(0, 2).map((c: string) => <Chip key={c}>{c}</Chip>)}</span> },
          { key: 'stage', header: 'Stage', value: (r) => stage(r), render: (r) => <Badge>{stage(r)}</Badge> },
          { key: 'docs', header: 'Documents', value: (r) => (r.docs ?? []).filter((d: Doc) => d.status === 'Verified').length, render: (r) => `${(r.docs ?? []).filter((d: Doc) => d.status === 'Verified').length}/${(r.docs ?? []).length}` },
          { key: 'approval', header: 'Approval', value: (r) => (r.status === 'Active' ? 'Approved' : r.status), render: (r) => <Badge>{r.status === 'Active' ? 'Approved' : r.status}</Badge> },
          { key: 'mob', header: 'Mobilisation checklist', value: (r) => (r.onboarding?.checklist ?? []).filter((i: Doc) => i.done).length, render: (r) => { const c = r.onboarding?.checklist ?? []; return `${c.filter((i: Doc) => i.done).length}/${c.length}`; } },
          { key: 'workforce', header: 'Workforce', align: 'right', value: (r) => (workers.data ?? []).filter((w) => w.vendorId === r.id && w.active).length || r.contractor?.workforce || 0 },
          { key: 'compliance', header: 'Compliance', value: (r) => r._compliance?.status, render: (r) => <Badge>{r._compliance?.status}</Badge> },
        ]} />
      <Drawer open={!!cur} onClose={() => setCheck(null)} title={`Mobilisation — ${cur?.name ?? ''}`} subtitle="Must be complete before the first work order (Procurement Settings)">
        {cur && (
          <ul className="space-y-2 p-5">
            {(cur.onboarding?.checklist ?? []).map((i: Doc, n: number) => (
              <li key={n} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-[13px]">
                <span className={cls(i.done && 'text-ink-mute line-through')}>{i.item}</span>
                {can('project', 'procurement') ? <ActionButton className="btn btn-sm" label={i.done ? 'Undo' : 'Mark done'} path={`/vendors/${cur.id}/onboarding`} body={{ index: n, done: !i.done }} /> : <Badge>{i.done ? 'Done' : 'Open'}</Badge>}
              </li>
            ))}
          </ul>
        )}
      </Drawer>
      <VendorDrawer id={open} onClose={() => setOpen(null)} />
    </Page>
  );
}
const stage = (v: Doc) => (v.status === 'Active' && (v.onboarding?.checklist ?? []).every((i: Doc) => i.done) ? 'Onboarded' : v.status === 'Active' ? 'Mobilising' : v.status === 'Draft' ? 'Docs Pending' : v.status);

// ── Work orders (stages 07/10) ───────────────────────────────────────────────
export function WorkOrders() {
  const rows = useList('workOrders');
  const contracts = useList('contracts');
  const { can } = useAuth();
  const [open, setOpen] = useState<string | null>(null);
  const [newFor, setNewFor] = useState('');
  const active = (contracts.data ?? []).filter((c) => c.status === 'Active');
  const ctr = active.find((c) => c.id === newFor);
  return (
    <Page title="Work Orders" icon={ClipboardCheck}
      actions={can('project') && (
        <span className="flex items-center gap-2">
          <select className="input w-64" value={newFor} onChange={(e) => setNewFor(e.target.value)} aria-label="Contract for new work order"><option value="">Create work order for contract…</option>{active.map((c) => <option key={c.id} value={c.id}>{c.id} — {c.title}</option>)}</select>
          {ctr && (
            <ActionForm className="btn btn-primary" label={<><Plus size={14} />Create</>} title={`Work order under ${ctr.id} (${ctr.type})`} path="/work-orders" onDone={(w) => { setOpen(w.id); setNewFor(''); }}
              description={`Must fall within ${fmtDate(ctr.start)} → ${fmtDate(ctr.end)}. Needs a completed kickoff and mobilisation; total work orders can't exceed the contract value.`}
              transform={(v) => ({ ...v, contractId: ctr.id })}
              fields={[
                { name: 'title', label: 'Scope title', required: true, span: 2 }, { name: 'location', label: 'Location' }, { name: 'wbs', label: 'WBS' },
                { name: 'start', label: 'Start', type: 'date', required: true }, { name: 'end', label: 'Finish', type: 'date', required: true },
                ...(ctr.type === 'Lump Sum'
                  ? [{ name: 'lumpSum', label: 'Lump sum (₹)', type: 'number' as const, required: true }, { name: 'milestones', label: 'Milestones (weights must total 100%)', type: 'lines' as const, columns: [{ name: 'name', label: 'Milestone', width: '70%' }, { name: 'weight', label: 'Weight %', type: 'number' as const }] }]
                  : [{ name: 'items', label: 'BOQ items', type: 'lines' as const, columns: [{ name: 'code', label: 'Code', width: '10%' }, { name: 'desc', label: 'Description', width: '40%' }, { name: 'unit', label: 'Unit' }, { name: 'qty', label: 'Qty', type: 'number' as const }, { name: 'rate', label: 'Rate', type: 'number' as const }, { name: 'trade', label: 'Trade (manpower)' }] }]),
              ]} />
          )}
        </span>
      )}>
      <DataTable rows={rows.data} loading={rows.isLoading} onRowClick={(r) => setOpen(r.id)} exportName="work-orders"
        filters={[{ label: 'Status', options: ['Issued', 'In Progress', 'Completed', 'Suspended'], value: (r) => r.status }]}
        columns={[
          { key: 'id', header: 'WO' }, { key: 'title', header: 'Title', render: (r) => <span className="font-medium">{r.title}</span> }, { key: 'vendor', header: 'Contractor', value: (r) => r._vendorName },
          { key: 'type', header: 'Type' }, { key: 'value', header: 'Value', align: 'right', value: (r) => r._value, render: (r) => fmtINRShort(r._value) },
          { key: 'planned', header: 'Planned', align: 'right', value: (r) => r._progress.planned, render: (r) => fmtPct(r._progress.planned) },
          { key: 'physical', header: 'Physical', value: (r) => r._progress.physical, render: (r) => <span className="flex items-center gap-2"><Progress value={r._progress.physical} /><span className="text-[12px] num">{fmtPct(r._progress.physical)}</span></span> },
          { key: 'end', header: 'Finish', render: (r) => fmtDate(r.end) },
          { key: 'acc', header: 'Contractor', value: (r) => r.acceptance?.status, render: (r) => <Badge>{r.acceptance?.status === 'Pending' ? 'Awaiting acceptance' : r.acceptance?.status}</Badge> },
          { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
        ]} />
      <WoDrawer id={open} onClose={() => setOpen(null)} />
    </Page>
  );
}

function WoDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: w } = useDoc('workOrders', id);
  const { can } = useAuth();
  if (!id || !w) return null;
  const p = w._progress;
  return (
    <Drawer open onClose={onClose} title={`${w.id} · ${w.title}`} subtitle={<span className="flex items-center gap-2">{w._vendorName} · {w.contractId} <Badge>{w.status}</Badge><Badge>{w._flag}</Badge></span>}
      actions={['Issued', 'In Progress', 'Suspended'].includes(w.status) && can('project') && (
        <>
          {w.acceptance?.status === 'Pending' && <ActionButton className="btn btn-sm" label="Record acceptance" path={`/work-orders/${w.id}/acceptance`} body={{ decision: 'Accepted', note: 'Accepted on behalf of contractor' }} confirm="Record the contractor's acceptance (normally done by the contractor in the portal)?" />}
          <ActionForm className="btn btn-sm" label="Change status" title={`Status of ${w.id}`} path={`/work-orders/${w.id}/status`} fields={[{ name: 'status', label: 'Status', type: 'select', required: true, options: ['In Progress', 'Suspended', 'Completed', 'Cancelled'] }, { name: 'remark', label: 'Remark', type: 'textarea' }]} />
        </>
      )}>
      <div className="space-y-4 p-5">
        <KV rows={[['Period', `${fmtDate(w.start)} → ${fmtDate(w.end)}`], ['Location', w.location], ['WBS', w.wbs], ['Value', fmtINR(w._value)], ['Planned', fmtPct(p.planned)], ['Physical', fmtPct(p.physical)], ['Financial (billed)', fmtPct(p.financial)], ['SPI', p.spi.toFixed(2)], ['Issued', `${fmtDate(w.issuedOn)} · ${w.issuedBy ?? ''}`], ['Acceptance', `${w.acceptance?.status ?? '—'}${w.acceptance?.by ? ` · ${w.acceptance.by}` : ''}`]]} />
        {w.type === 'Lump Sum' ? (
          <table className="tbl w-full"><thead><tr><th>Milestone</th><th className="text-right">Weight</th><th className="text-right">Value</th></tr></thead>
            <tbody>{w.milestones.map((m: Doc) => <tr key={m.id}><td>{m.id} · {m.name}</td><td className="text-right num">{m.weight}%</td><td className="text-right num">{fmtINR((w.lumpSum * m.weight) / 100)}</td></tr>)}</tbody></table>
        ) : (
          <table className="tbl w-full"><thead><tr><th>Item</th><th>Unit</th><th className="text-right">Qty</th><th className="text-right">Rate</th><th className="text-right">Amount</th></tr></thead>
            <tbody>{w.items.map((i: Doc) => <tr key={i.id}><td>{i.code ?? i.id} · {i.desc}</td><td>{i.unit}</td><td className="text-right num">{fmtNum(i.qty)}</td><td className="text-right num">{fmtINR(i.rate)}</td><td className="text-right num">{fmtINR(i.qty * i.rate)}</td></tr>)}</tbody></table>
        )}
      </div>
    </Drawer>
  );
}

// ── Labour attendance (stage 11) ─────────────────────────────────────────────
export function Attendance() {
  const wos = useList('workOrders');
  const workers = useList('workers');
  const att = useList('attendance');
  const { can } = useAuth();
  const qc = useQueryClient();
  const manpowerWos = (wos.data ?? []).filter((w) => w.type !== 'Lump Sum' && (workers.data ?? []).some((k) => k.woId === w.id));
  const [woId, setWoId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [marks, setMarks] = useState<Record<string, { status: string; ot: number }>>({});
  const [msg, setMsg] = useState<{ tone: 'green' | 'red'; text: string; items?: string[] } | null>(null);
  useEffect(() => { if (!woId && manpowerWos[0]) setWoId(manpowerWos[0].id); }, [manpowerWos, woId]);
  const crew = (workers.data ?? []).filter((k) => k.woId === woId);
  const today = useMemo(() => (att.data ?? []).filter((a) => a.woId === woId && a.date === date), [att.data, woId, date]);
  useEffect(() => { setMarks(Object.fromEntries(today.map((a) => [a.workerId, { status: a.status, ot: a.ot ?? 0 }]))); setMsg(null); }, [today]);
  const unverified = (att.data ?? []).filter((a) => a.woId === woId && !a.verified);
  const unbilled = (att.data ?? []).filter((a) => a.woId === woId && !a.rolledInto && a.verified);
  const save = async () => {
    try {
      await api('/attendance', { body: { woId, date, entries: crew.filter((k) => marks[k.id]).map((k) => ({ workerId: k.id, status: marks[k.id].status, ot: marks[k.id].ot })) } });
      await qc.invalidateQueries(); setMsg({ tone: 'green', text: 'Muster saved' });
    } catch (e: any) { setMsg({ tone: 'red', text: e.message, items: e.blocking }); }
  };
  return (
    <Page title="Labour Attendance" icon={CalendarCheck}
      actions={can('project') && woId && <>
        <ActionForm label="Add worker" title="Register worker" path="/workers" transform={(v) => ({ ...v, woId, vendorId: manpowerWos.find((w) => w.id === woId)?.vendorId })}
          fields={[{ name: 'name', label: 'Name', required: true }, { name: 'trade', label: 'Trade', required: true, placeholder: 'e.g. Mason' }, { name: 'skill', label: 'Skill', type: 'select', required: true, options: ['Unskilled', 'Semi-skilled', 'Skilled', 'Highly Skilled'] }, { name: 'gatePass', label: 'Gate pass no.', required: true }, { name: 'inductionOn', label: 'Safety induction date', type: 'date', required: true }]} />
        <ActionForm label="Roll up to measurement book" title="Roll verified attendance into the measurement book" path="/attendance/rollup" transform={(v) => ({ ...v, woId })}
          description={`Creates man-day measurements per trade line (overtime counted at 2×). ${unbilled.length} verified, unbilled rows on ${woId}.`}
          fields={[{ name: 'from', label: 'From', type: 'date', required: true }, { name: 'to', label: 'To', type: 'date', required: true, default: todayISO() }]} />
      </>}>
      <div className="flex flex-wrap items-end gap-3 border-b border-line px-4 py-3">
        <label className="block"><span className="label">Work order</span><select className="input w-80" value={woId} onChange={(e) => setWoId(e.target.value)}>{manpowerWos.map((w) => <option key={w.id} value={w.id}>{w.id} — {w.title}</option>)}</select></label>
        <label className="block"><span className="label">Date</span><input className="input" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} /></label>
        {unverified.length > 0 && can('project') && <ActionButton label={`Verify contractor muster (${unverified.length})`} path="/attendance/verify" body={{ woId, date }} />}
        {can('project') && <button className="btn btn-primary ml-auto" onClick={save} disabled={!crew.length}>Save muster</button>}
      </div>
      {msg && <div className="px-4 pt-3"><Notice tone={msg.tone} title={msg.text} items={msg.items} /></div>}
      <div className="flex-1 overflow-auto">
        <table className="tbl w-full"><thead><tr><th>Worker</th><th>Trade</th><th>Gate pass</th><th>Attendance</th><th>OT hours</th><th>Status</th></tr></thead>
          <tbody>{crew.map((k) => {
            const m = marks[k.id];
            const rec = today.find((a) => a.workerId === k.id);
            return (
              <tr key={k.id} className={cls(!k.active && 'opacity-50')}>
                <td className="font-medium">{k.name}</td><td>{k.trade}</td><td>{k.gatePass}</td>
                <td><div className="inline-flex rounded-lg border border-line p-0.5">{['P', 'H', 'A'].map((s) => <button key={s} disabled={!can('project') || !!rec?.rolledInto} onClick={() => setMarks({ ...marks, [k.id]: { status: s, ot: s === 'A' ? 0 : m?.ot ?? 0 } })} className={cls('w-8 rounded-md py-0.5 text-[12.5px] font-semibold', m?.status === s ? (s === 'P' ? 'bg-green-100 text-green-800' : s === 'H' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800') : 'text-ink-mute')}>{s}</button>)}</div></td>
                <td><input className="input w-20" type="number" min={0} max={4} value={m?.ot ?? 0} disabled={!m || m.status === 'A' || !can('project') || !!rec?.rolledInto} onChange={(e) => setMarks({ ...marks, [k.id]: { ...m!, ot: Number(e.target.value) } })} /></td>
                <td>{rec ? (rec.rolledInto ? <Badge tone="gray">Billed · {rec.rolledInto}</Badge> : rec.verified ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Contractor-marked</Badge>) : <span className="text-[12px] text-ink-faint">Not recorded</span>}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </Page>
  );
}

// ── Measurement book (stage 15) ──────────────────────────────────────────────
export function MeasurementBook() {
  const ms = useList('measurements');
  const wos = useList('workOrders');
  const ncrs = useList('ncrs');
  const vendors = useVendors();
  const { can } = useAuth();
  const [tab, setTab] = useState<'mb' | 'ncr' | 'abstract'>('mb');
  const woMap = new Map((wos.data ?? []).map((w) => [w.id, w]));
  const lineName = (m: Doc) => { const w = woMap.get(m.woId); const l = w?.type === 'Lump Sum' ? w.milestones?.find((x: Doc) => x.id === m.lineId) : w?.items?.find((x: Doc) => x.id === m.lineId); return l ? `${l.code ? `${l.code} · ` : ''}${l.desc ?? l.name}` : m.lineId; };
  const openWos = (wos.data ?? []).filter((w) => ['In Progress'].includes(w.status));
  const lineOptions = openWos.flatMap((w) => (w.type === 'Lump Sum' ? w.milestones : w.items).map((l: Doc) => ({ value: `${w.id}|${l.id}`, label: `${w.id} — ${l.code ? `${l.code} ` : ''}${l.desc ?? l.name}${w.type === 'Lump Sum' ? ' (milestone %)' : ` (${l.unit})`}` })));
  const abstract = useMemo(() => (wos.data ?? []).flatMap((w) => (w.type === 'Lump Sum' ? [] : w.items.map((i: Doc) => {
    const signed = (ms.data ?? []).filter((m) => m.woId === w.id && m.lineId === i.id && m.jms?.status === 'Signed');
    const q = signed.reduce((s, m) => s + (m.qty ?? 0), 0);
    const billed = signed.filter((m) => m.billedIn).reduce((s, m) => s + (m.qty ?? 0), 0);
    return { id: `${w.id}:${i.id}`, wo: w.id, item: `${i.code ?? i.id} · ${i.desc}`, unit: i.unit, woQty: i.qty, measured: q, billed, balance: i.qty - q, pct: (q / i.qty) * 100 };
  }))), [wos.data, ms.data]);
  return (
    <Page title="Measurement Book" icon={Ruler}
      actions={can('project') && (
        <ActionForm className="btn btn-primary" label={<><Plus size={14} />Record measurement</>} title="Record measurement" path="/measurements"
          description="Quantity = N × L × B × D (or enter it directly). Lump-sum milestones take cumulative % complete. The entry then needs a joint measurement sign-off and, when required, a passed quality inspection before billing."
          transform={(v) => { const [woId, lineId] = String(v.line).split('|'); const { line, ...rest } = v; return { ...rest, woId, lineId }; }}
          fields={[
            { name: 'line', label: 'Work order line', type: 'select', required: true, options: lineOptions, span: 2 },
            { name: 'date', label: 'Date', type: 'date', required: true, default: todayISO() }, { name: 'location', label: 'Location', required: true },
            { name: 'nos', label: 'N (nos)', type: 'number' }, { name: 'l', label: 'L (m)', type: 'number' }, { name: 'b', label: 'B (m)', type: 'number' }, { name: 'd', label: 'D (m)', type: 'number' },
            { name: 'qty', label: 'Or quantity', type: 'number' }, { name: 'pct', label: 'Cumulative % (lump-sum milestone)', type: 'number' }, { name: 'remarks', label: 'Remarks', type: 'textarea' },
          ]} />
      )}
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'mb', label: 'Measurement book', count: ms.data?.length }, { id: 'ncr', label: 'Inspections & NCRs', count: (ncrs.data ?? []).filter((n) => n.status !== 'Closed').length }, { id: 'abstract', label: 'Abstract by item' }]} />}>
      {tab === 'mb' && (
        <DataTable rows={[...(ms.data ?? [])].reverse()} loading={ms.isLoading} exportName="measurement-book"
          filters={[{ label: 'JMS', options: ['Pending', 'Signed', 'Disputed'], value: (r) => r.jms?.status }, { label: 'Billed', options: ['Unbilled', 'Billed'], value: (r) => (r.billedIn ? 'Billed' : 'Unbilled') }]}
          columns={[
            { key: 'id', header: 'MB no.' }, { key: 'date', header: 'Date', render: (r) => fmtDate(r.date) }, { key: 'woId', header: 'WO' },
            { key: 'line', header: 'Item / milestone', value: (r) => lineName(r), render: (r) => <span className="line-clamp-1 max-w-[260px]" title={lineName(r)}>{lineName(r)}</span> },
            { key: 'location', header: 'Location' },
            { key: 'dims', header: 'N × L × B × D', value: (r) => [r.nos, r.l, r.b, r.d].some((x) => x != null) ? [r.nos ?? 1, r.l ?? '–', r.b ?? '–', r.d ?? '–'].join(' × ') : '—' },
            { key: 'qty', header: 'Quantity', align: 'right', value: (r) => r.qty ?? r.pct, render: (r) => (r.pct != null ? `${r.pct}% cum.` : `${fmtNum(r.qty)} ${woMap.get(r.woId)?.items?.find((i: Doc) => i.id === r.lineId)?.unit ?? ''}`) },
            { key: 'jms', header: 'JMS', value: (r) => r.jms?.status, render: (r) => r.jms?.status === 'Pending' && can('project') && !r.billedIn ? (
              <span className="inline-flex gap-1">
                <ActionForm className="btn btn-sm" label="Sign" title={`Joint measurement — ${r.id}`} path={`/measurements/${r.id}/jms`} transform={(v) => ({ ...v, status: 'Signed' })} fields={[{ name: 'contractorRep', label: "Contractor's representative", required: true }]} />
                <ActionForm className="btn btn-sm" label="Dispute" title={`Dispute — ${r.id}`} path={`/measurements/${r.id}/jms`} transform={(v) => ({ ...v, status: 'Disputed' })} fields={[{ name: 'contractorRep', label: "Contractor's representative", required: true }, { name: 'remark', label: 'What is disputed', type: 'textarea', required: true }]} />
              </span>) : <Badge>{r.jms?.status}</Badge> },
            { key: 'qc', header: 'Inspection', value: (r) => r.qc?.status, render: (r) => r.qc?.status === 'Pending' && can('qa_hse', 'project') && !r.billedIn ? (
              <span className="inline-flex gap-1">
                <ActionButton className="btn btn-sm" label="Pass" path={`/measurements/${r.id}/qc`} body={{ status: 'Passed' }} />
                <ActionForm className="btn btn-sm" label="Fail" title={`Inspection failed — ${r.id}`} description="An NCR is raised automatically." path={`/measurements/${r.id}/qc`} transform={(v) => ({ ...v, status: 'Failed' })} fields={[{ name: 'remark', label: 'Findings', type: 'textarea', required: true }, { name: 'severity', label: 'Severity', type: 'select', default: 'Major', options: ['Minor', 'Major', 'Critical'] }]} />
              </span>) : <Badge>{r.qc?.status}</Badge> },
            { key: 'billedIn', header: 'Billed in', value: (r) => r.billedIn ?? '—' },
          ]} />
      )}
      {tab === 'ncr' && (
        <DataTable rows={ncrs.data} loading={ncrs.isLoading} exportName="ncrs" empty={{ title: 'No NCRs' }}
          toolbar={can('qa_hse', 'project') && <ActionForm className="btn btn-sm" label="Raise NCR" title="Raise non-conformance report" path="/ncrs" fields={[{ name: 'woId', label: 'Work order', type: 'select', required: true, options: (wos.data ?? []).map((w) => ({ value: w.id, label: `${w.id} — ${w.title}` })) }, { name: 'category', label: 'Category', type: 'select', required: true, options: ['Quality', 'Safety', 'Environment', 'Documentation'] }, { name: 'severity', label: 'Severity', type: 'select', required: true, options: ['Minor', 'Major', 'Critical'] }, { name: 'desc', label: 'Description', type: 'textarea', required: true }]} />}
          columns={[
            { key: 'id', header: 'NCR' }, { key: 'woId', header: 'WO', render: (r) => <span>{r.woId}<div className="text-[12px] text-ink-mute">{vendors.name(woMap.get(r.woId)?.vendorId)}</div></span> }, { key: 'mbId', header: 'From MB' },
            { key: 'category', header: 'Category' }, { key: 'severity', header: 'Severity', render: (r) => <Badge>{r.severity}</Badge> }, { key: 'desc', header: 'Description', render: (r) => <span className="line-clamp-2 max-w-[320px]">{r.desc}</span> },
            { key: 'raisedOn', header: 'Raised', render: (r) => fmtDate(r.raisedOn) }, { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
            { key: 'act', header: '', sortable: false, render: (r) => r.status !== 'Closed' && (
              <span className="inline-flex gap-1">
                {r.status === 'Open' && can('project') && <ActionForm className="btn btn-sm" label="Rework done" title={`Rework done — ${r.id}`} path={`/ncrs/${r.id}/status`} transform={(v) => ({ ...v, status: 'Rework Done' })} fields={[{ name: 'rootCause', label: 'Root cause', type: 'textarea' }, { name: 'correctiveAction', label: 'Corrective action taken', type: 'textarea', required: true }]} />}
                {can('qa_hse') && <ActionForm className="btn btn-sm" label="Close" title={`Close ${r.id} after re-inspection`} path={`/ncrs/${r.id}/status`} transform={(v) => ({ ...v, status: 'Closed' })} fields={[{ name: 'correctiveAction', label: 'Corrective action (if not recorded)', type: 'textarea', default: r.correctiveAction ?? '' }, { name: 'note', label: 'Re-inspection note', type: 'textarea' }]} />}
              </span>
            ) },
          ]} />
      )}
      {tab === 'abstract' && (
        <DataTable rows={abstract} exportName="mb-abstract"
          columns={[
            { key: 'wo', header: 'WO' }, { key: 'item', header: 'Item' }, { key: 'unit', header: 'Unit' },
            { key: 'woQty', header: 'WO qty', align: 'right', render: (r) => fmtNum(r.woQty) }, { key: 'measured', header: 'Measured (signed)', align: 'right', render: (r) => fmtNum(r.measured) },
            { key: 'billed', header: 'Billed', align: 'right', render: (r) => fmtNum(r.billed) }, { key: 'balance', header: 'Balance', align: 'right', render: (r) => <span className={r.balance < 0 ? 'font-semibold text-red-600' : ''}>{fmtNum(r.balance)}</span> },
            { key: 'pct', header: 'Progress', value: (r) => r.pct, render: (r) => <span className="flex items-center gap-2"><Progress value={r.pct} tone={r.pct > 100 ? 'red' : 'brand'} /><span className="text-[12px] num">{fmtPct(r.pct)}</span></span> },
          ]} />
      )}
    </Page>
  );
}

// ── Performance & progress (stage 16) ────────────────────────────────────────
export function Performance() {
  const wos = useList('workOrders');
  const dprs = useList('dprs');
  const { can } = useAuth();
  const [tab, setTab] = useState<'wo' | 'dpr'>('wo');
  return (
    <Page title="Performance & Progress" icon={Activity}
      actions={can('project') && <ActionForm label="Daily progress report" title="Daily progress report" path="/dprs" fields={[{ name: 'woId', label: 'Work order', type: 'select', required: true, options: (wos.data ?? []).filter((w) => w.status === 'In Progress').map((w) => ({ value: w.id, label: `${w.id} — ${w.title}` })) }, { name: 'date', label: 'Date', type: 'date', required: true, default: todayISO() }, { name: 'manpower', label: 'Manpower on site', type: 'number', required: true }, { name: 'weather', label: 'Weather', default: 'Clear' }, { name: 'work', label: 'Work done', type: 'textarea', required: true }, { name: 'hindrance', label: 'Hindrances / delays', type: 'textarea' }]} />}
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'wo', label: 'Work order progress' }, { id: 'dpr', label: 'Daily progress', count: dprs.data?.length }]} />}>
      {tab === 'wo' ? (
        <DataTable rows={wos.data} loading={wos.isLoading} exportName="progress"
          columns={[
            { key: 'id', header: 'WO' }, { key: 'title', header: 'Scope' }, { key: 'vendor', header: 'Contractor', value: (r) => r._vendorName },
            { key: 'planned', header: 'Planned', align: 'right', value: (r) => r._progress.planned, render: (r) => fmtPct(r._progress.planned, 1) },
            { key: 'physical', header: 'Physical', value: (r) => r._progress.physical, render: (r) => <span className="flex items-center gap-2"><Progress value={r._progress.physical} /><span className="text-[12px] num">{fmtPct(r._progress.physical)}</span></span> },
            { key: 'financial', header: 'Financial', value: (r) => r._progress.financial, render: (r) => <span className="flex items-center gap-2"><Progress value={r._progress.financial} tone="green" /><span className="text-[12px] num">{fmtPct(r._progress.financial)}</span></span> },
            { key: 'spi', header: 'SPI', align: 'right', value: (r) => r._progress.spi, render: (r) => <span className={r._progress.spi < 0.8 ? 'font-semibold text-red-600' : r._progress.spi < 0.95 ? 'text-amber-700' : ''}>{r._progress.spi.toFixed(2)}</span> },
            { key: 'days', header: 'Days left', align: 'right', value: (r) => Math.round((Date.parse(r.end) - Date.now()) / 86_400_000) },
            { key: 'flag', header: 'Status', value: (r) => r._flag, render: (r) => <Badge>{r._flag}</Badge> },
          ]} />
      ) : (
        <DataTable rows={dprs.data} loading={dprs.isLoading} exportName="dprs"
          columns={[{ key: 'id', header: 'DPR' }, { key: 'date', header: 'Date', render: (r) => fmtDate(r.date) }, { key: 'woId', header: 'WO' }, { key: 'manpower', header: 'Manpower', align: 'right' }, { key: 'work', header: 'Work done', render: (r) => <span className="line-clamp-2 max-w-[380px]">{r.work}</span> }, { key: 'hindrance', header: 'Hindrance', value: (r) => r.hindrance || '—' }, { key: 'weather', header: 'Weather' }, { key: 'by', header: 'By' }]} />
      )}
    </Page>
  );
}

// ── Safety incidents (stage 14 — new) ────────────────────────────────────────
export function Safety() {
  const rows = useList('safetyIncidents');
  const wos = useList('workOrders');
  const caps = useList('caps');
  const vendors = useVendors();
  const { can } = useAuth();
  const list = rows.data ?? [];
  const lti = list.filter((r) => r.lostTimeInjury).length;
  return (
    <Page title="Safety Incidents" icon={ShieldAlert}
      actions={can('qa_hse', 'project') && (
        <ActionForm className="btn btn-primary" label={<><Plus size={14} />Report incident</>} title="Report a safety incident / near miss" path="/safety-incidents"
          fields={[
            { name: 'woId', label: 'Work order', type: 'select', options: (wos.data ?? []).map((w) => ({ value: w.id, label: `${w.id} — ${w.title}` })) },
            { name: 'type', label: 'Type', type: 'select', required: true, options: ['Near Miss', 'Unsafe Act', 'Unsafe Condition', 'First Aid', 'Medical Treatment', 'Lost Time Injury', 'Fatality', 'Property Damage', 'Environmental'] },
            { name: 'severity', label: 'Severity', type: 'select', required: true, options: ['Minor', 'Major', 'Critical'] }, { name: 'date', label: 'Date', type: 'date', required: true, default: todayISO() },
            { name: 'injured', label: 'People injured', type: 'number', default: 0 }, { name: 'location', label: 'Location', required: true },
            { name: 'description', label: 'What happened', type: 'textarea', required: true }, { name: 'immediateAction', label: 'Immediate action taken', type: 'textarea', required: true },
          ]} />
      )}>
      <div className="grid grid-cols-2 gap-3 border-b border-line p-4 lg:grid-cols-4">
        <Stat label="Incidents recorded" value={list.length} /><Stat label="Open" value={list.filter((r) => r.status !== 'Closed').length} /><Stat label="Near misses" value={list.filter((r) => r.type === 'Near Miss').length} /><Stat label="Lost-time injuries" value={lti} warn={lti > 0} />
      </div>
      <DataTable rows={list} loading={rows.isLoading} exportName="safety-incidents" empty={{ title: 'No incidents reported' }}
        filters={[{ label: 'Status', options: ['Investigating', 'Action Pending', 'Closed'], value: (r) => r.status }, { label: 'Type', options: [...new Set(list.map((r) => r.type))], value: (r) => r.type }]}
        columns={[
          { key: 'id', header: 'Incident' }, { key: 'date', header: 'Date', render: (r) => fmtDate(r.date) }, { key: 'type', header: 'Type' }, { key: 'severity', header: 'Severity', render: (r) => <Badge>{r.severity}</Badge> },
          { key: 'vendor', header: 'Contractor', value: (r) => vendors.name(r.vendorId) }, { key: 'location', header: 'Location' },
          { key: 'description', header: 'Description', render: (r) => <span className="line-clamp-2 max-w-[300px]" title={r.description}>{r.description}</span> },
          { key: 'capId', header: 'CAP', value: (r) => r.capId ?? '—' }, { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
          { key: 'act', header: '', sortable: false, render: (r) => r.status !== 'Closed' && can('qa_hse') && (
            <ActionForm className="btn btn-sm" label="Update" title={`Update ${r.id}`} path={`/safety-incidents/${r.id}/status`} initial={{ rootCause: r.rootCause, capId: r.capId ?? '' }}
              fields={[{ name: 'status', label: 'Status', type: 'select', required: true, options: ['Investigating', 'Action Pending', 'Closed'] }, { name: 'rootCause', label: 'Root cause (required to close)', type: 'textarea' }, { name: 'capId', label: 'Linked corrective action plan', type: 'select', options: (caps.data ?? []).filter((c) => c.vendorId === r.vendorId).map((c) => ({ value: c.id, label: `${c.id} — ${c.issue.slice(0, 50)}` })) }, { name: 'note', label: 'Note', type: 'textarea' }]} />
          ) },
        ]} />
    </Page>
  );
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return <div className="rounded-lg border border-line px-3 py-2"><div className="text-[12px] text-ink-mute">{label}</div><div className={cls('text-[20px] font-semibold num', warn && 'text-red-600')}>{value}</div></div>;
}
