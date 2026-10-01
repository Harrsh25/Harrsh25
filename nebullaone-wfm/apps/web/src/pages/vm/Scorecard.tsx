import { Gauge, ShieldBan, Star } from 'lucide-react';
import { useState } from 'react';
import { ActionButton, ActionForm } from '../../components/ActionForm';
import { DataTable } from '../../components/DataTable';
import { Page } from '../../components/Layout';
import { Badge, Notice, Progress, Tabs } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useGet, useList, type Doc } from '../../lib/data';
import { fmtDate } from '../../lib/format';
import { useScorecard, useVendors, vendorOptions } from '../../lib/hooks';

const r = (x?: number | null) => (x == null ? '—' : Math.round(x));

export function Scorecard() {
  const sc = useScorecard();
  const vendors = useVendors();
  const caps = useList('caps');
  const ratings = useList('ratings');
  const wos = useList('workOrders');
  const cfg = useGet<any>('/config/scoreConfig', ['config', 'scoreConfig']).data;
  const { can } = useAuth();
  const [tab, setTab] = useState<'score' | 'ratings' | 'caps' | 'model'>('score');
  const [result, setResult] = useState<string | null>(null);
  return (
    <Page title="Vendor Scorecard" icon={Gauge}
      actions={<>
        {can('project', 'qa_hse', 'procurement') && (
          <ActionForm label={<><Star size={14} />Rate performance</>} title="Rate vendor performance" path="/ratings"
            fields={[
              { name: 'vendorId', label: 'Vendor', type: 'select', required: true, options: vendorOptions(vendors.data, (v) => v.status === 'Active') },
              { name: 'woId', label: 'Work order (contractors)', type: 'select', options: (wos.data ?? []).map((w) => ({ value: w.id, label: `${w.id} — ${w.title}` })) },
              { name: 'period', label: 'Period', required: true, placeholder: 'e.g. Sep 2026', default: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) },
              { name: 'quality', label: 'Quality (1–5)', type: 'number', required: true }, { name: 'safety', label: 'Safety (1–5)', type: 'number', required: true },
              { name: 'manpower', label: 'Manpower / resources (1–5)', type: 'number', required: true }, { name: 'incidents', label: 'Incidents in period', type: 'number', default: 0 },
              { name: 'remarks', label: 'Remarks', type: 'textarea' },
            ]} />
        )}
        {can('procurement') && <ActionButton label={<><ShieldBan size={14} />Run auto-block check</>} path="/scorecard/auto-block" onDone={(x) => setResult(`Auto-block check: ${x.raised.length} hold(s) raised, ${x.released.length} released.`)} />}
      </>}
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'score', label: 'Scorecard' }, { id: 'ratings', label: 'Ratings log', count: ratings.data?.length }, { id: 'caps', label: 'Corrective actions', count: (caps.data ?? []).filter((c) => c.status !== 'Closed').length }, { id: 'model', label: 'Metric model' }]} />}>
      {result && <div className="border-b border-line px-4 py-2"><Notice tone="blue" title={result} /></div>}
      {tab === 'score' && (
        <DataTable rows={sc.data} loading={sc.isLoading} rowKey={(x) => x.vendorId} exportName="scorecard"
          filters={[{ label: 'Standing', options: (cfg?.standings ?? []).map((s: Doc) => s.name), value: (x) => x.standing?.name ?? '' }]}
          columns={[
            { key: 'name', header: 'Vendor', render: (x) => <span className="font-medium">{x.name}</span> }, { key: 'category', header: 'Category' },
            { key: 'score', header: 'Score', value: (x) => x.score, render: (x) => (x.score == null ? <span className="text-[12px] text-ink-faint">New — no data</span> : <span className="flex items-center gap-2"><Progress value={x.score} tone={x.score >= 80 ? 'green' : x.score >= 65 ? 'brand' : x.score >= 50 ? 'amber' : 'red'} /><b className="num">{x.score}</b></span>) },
            { key: 'standing', header: 'Standing', value: (x) => x.standing?.name, render: (x) => x.standing ? <div><Badge tone={x.standing.color}>{x.standing.name}</Badge><div className="text-[11.5px] text-ink-mute">{x.standing.preventPo ? 'RFQ/PO prevented' : x.standing.warnPo ? 'warning on RFQ/PO' : 'no restriction'}</div></div> : '—' },
            { key: 'q', header: 'Quality', align: 'right', value: (x) => x.parts?.quality, render: (x) => r(x.parts?.quality) },
            { key: 't', header: 'Timeliness', align: 'right', value: (x) => x.parts?.timeliness, render: (x) => r(x.parts?.timeliness) },
            { key: 's', header: 'Safety', align: 'right', value: (x) => x.parts?.safety, render: (x) => r(x.parts?.safety) },
            { key: 'c', header: 'Compliance', align: 'right', value: (x) => x.parts?.compliance, render: (x) => r(x.parts?.compliance) },
            { key: 'status', header: 'Status', value: (x) => vendors.map.get(x.vendorId)?.status, render: (x) => { const v = vendors.map.get(x.vendorId); return <span className="flex gap-1"><Badge>{v?.status}</Badge>{v?._holdFlag && <Badge tone="amber">{v._holdFlag}</Badge>}</span>; } },
          ]} />
      )}
      {tab === 'ratings' && (
        <DataTable rows={ratings.data} loading={ratings.isLoading} exportName="ratings"
          columns={[
            { key: 'vendor', header: 'Vendor', value: (x) => vendors.name(x.vendorId) }, { key: 'woId', header: 'Work order' }, { key: 'period', header: 'Period' },
            { key: 'quality', header: 'Quality', align: 'right' }, { key: 'safety', header: 'Safety', align: 'right' }, { key: 'manpower', header: 'Manpower', align: 'right' },
            { key: 'incidents', header: 'Incidents', align: 'right' }, { key: 'remarks', header: 'Remarks' }, { key: 'by', header: 'By' },
          ]} />
      )}
      {tab === 'caps' && (
        <DataTable rows={caps.data} loading={caps.isLoading} exportName="caps" empty={{ title: 'No corrective action plans' }}
          toolbar={can('procurement', 'qa_hse', 'project') && (
            <ActionForm className="btn btn-sm" label="Issue CAP" title="Issue corrective action plan" path="/caps"
              fields={[{ name: 'vendorId', label: 'Vendor', type: 'select', required: true, options: vendorOptions(vendors.data) }, { name: 'issue', label: 'Issue', type: 'textarea', required: true }, { name: 'actions', label: 'Required actions', type: 'textarea', required: true }, { name: 'dueDate', label: 'Due', type: 'date', required: true }, { name: 'owner', label: 'Owner', required: true }]} />
          )}
          columns={[
            { key: 'id', header: 'CAP' }, { key: 'vendor', header: 'Vendor', value: (x) => vendors.name(x.vendorId) }, { key: 'issue', header: 'Issue', render: (x) => <span className="line-clamp-2 max-w-[340px]">{x.issue}</span> },
            { key: 'actions', header: 'Actions', render: (x) => <span className="line-clamp-2 max-w-[300px] text-[12.5px]">{x.actions}</span> },
            { key: 'dueDate', header: 'Due', render: (x) => fmtDate(x.dueDate) }, { key: 'owner', header: 'Owner' }, { key: 'status', header: 'Status', render: (x) => <Badge>{x.status}</Badge> },
            { key: 'act', header: '', sortable: false, render: (x) => x.status !== 'Closed' && can('procurement', 'qa_hse', 'project') && <ActionButton className="btn btn-sm" label="Close" path={`/caps/${x.id}/status`} body={{ status: 'Closed' }} confirm="Close this corrective action plan?" /> },
          ]} />
      )}
      {tab === 'model' && cfg && (
        <div className="grid gap-4 overflow-y-auto p-4 lg:grid-cols-2">
          <table className="tbl card w-full"><thead><tr><th>Criterion</th><th>Formula</th><th className="text-right">Weight</th></tr></thead>
            <tbody>{cfg.criteria.map((c: Doc) => <tr key={c.name}><td>{c.name}</td><td><code>{c.formula}</code></td><td className="text-right num">{c.weight}%</td></tr>)}</tbody></table>
          <table className="tbl card w-full"><thead><tr><th>Standing</th><th>Range</th><th>RFQ</th><th>PO</th></tr></thead>
            <tbody>{cfg.standings.map((s: Doc) => <tr key={s.name}><td><Badge tone={s.color}>{s.name}</Badge></td><td className="num">{s.min} – {s.max === 100 ? '100' : `< ${s.max}`}</td><td>{s.preventRfq ? 'Prevent' : s.warnRfq ? 'Warn' : '—'}</td><td>{s.preventPo ? 'Prevent' : s.warnPo ? 'Warn' : '—'}</td></tr>)}</tbody></table>
          <p className="text-[12.5px] text-ink-mute lg:col-span-2">Quality = average rating (contractors) or GRN acceptance % (suppliers) · Timeliness = work-order SPI or on-time receipts · Safety = average safety rating · Compliance = 100 / 70 / 30. Metrics with no data are left out and the weights re-balanced. Auto-block {cfg.autoBlock ? 'on' : 'off'}: a score below {cfg.blockThreshold} raises a Performance hold on new RFQs/POs.</p>
        </div>
      )}
    </Page>
  );
}
