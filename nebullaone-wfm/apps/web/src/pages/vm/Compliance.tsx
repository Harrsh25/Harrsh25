import { RefreshCw, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ActionButton } from '../../components/ActionForm';
import { DataTable } from '../../components/DataTable';
import { Page } from '../../components/Layout';
import { Badge, Tabs } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useGet, type Doc } from '../../lib/data';
import { fmtDate, fmtINR, todayISO } from '../../lib/format';
import { useVendors } from '../../lib/hooks';
import { VendorDrawer } from './VendorDrawer';

type Tab = 'vendors' | 'expiring' | 'queue' | 'insurance' | 'requirements';

export function Compliance() {
  const vendors = useVendors();
  const settings = useGet<any>('/config/settings', ['config', 'settings']).data;
  const { can } = useAuth();
  const [tab, setTab] = useState<Tab>('vendors');
  const [open, setOpen] = useState<string | null>(null);
  const t = todayISO();
  const rows = vendors.data ?? [];
  const items = useMemo(() => rows.flatMap((v) => (v._compliance?.issues ?? []).map((i: Doc) => ({ ...i, vendorId: v.id, vendor: v.name, id: `${v.id}:${i.name}` }))), [rows]);
  const queue = rows.flatMap((v) => (v.docs ?? []).filter((d: Doc) => d.status === 'Pending').map((d: Doc) => ({ ...d, vendorId: v.id, vendor: v.name, id: `${v.id}:${d.name}` })));
  const policies = rows.flatMap((v) => (v.insurance ?? []).map((p: Doc) => ({ ...p, vendorId: v.id, vendor: v.name, id: `${v.id}:${p.policy}` })));

  return (
    <Page title="Compliance Center" icon={ShieldCheck}
      actions={can('procurement', 'finance', 'legal') && <ActionButton label={<><RefreshCw size={14} />Re-check holds</>} path="/compliance/sync" />}
      tabs={<Tabs value={tab} onChange={setTab} tabs={[
        { id: 'vendors', label: 'Vendors' }, { id: 'expiring', label: 'Expiring & expired', count: items.length }, { id: 'queue', label: 'Verification queue', count: queue.length },
        { id: 'insurance', label: 'Insurance', count: policies.length }, { id: 'requirements', label: 'Requirements' },
      ]} />}>
      {tab === 'vendors' && (
        <DataTable rows={rows.filter((v) => v.status !== 'Draft')} loading={vendors.isLoading} onRowClick={(r) => setOpen(r.id)} exportName="compliance"
          filters={[{ label: 'Status', options: ['Compliant', 'Expiring', 'Non-Compliant'], value: (r) => r._compliance?.status }]}
          columns={[
            { key: 'name', header: 'Vendor', render: (r) => <span className="font-medium">{r.name}</span> },
            { key: 'status', header: 'Status', value: (r) => r._compliance?.status, render: (r) => <Badge>{r._compliance?.status}</Badge> },
            { key: 'ins', header: 'Insurance', value: (r) => r._compliance?.insuranceStatus, render: (r) => <Badge>{r._compliance?.insuranceStatus}</Badge> },
            { key: 'open', header: 'Open items', value: (r) => r._compliance?.issues?.length ?? 0, render: (r) => r._compliance?.issues?.length ? <span className="text-[12.5px]">{r._compliance.issues.map((i: Doc) => `${i.name}: ${i.note.toLowerCase()}`).join(' · ')}</span> : '—' },
            { key: 'next', header: 'Next expiry', value: (r) => r._compliance?.nextExpiry, render: (r) => fmtDate(r._compliance?.nextExpiry) },
            { key: 'gate', header: 'Payment gate', value: (r) => r._paymentGate, render: (r) => r._paymentGate === 'Blocked' ? <Badge tone="red">Blocked</Badge> : <Badge tone="green">Open</Badge> },
          ]} />
      )}
      {tab === 'expiring' && (
        <DataTable rows={items} onRowClick={(r) => setOpen(r.vendorId)} exportName="compliance-items"
          columns={[
            { key: 'name', header: 'Item', render: (r) => <div><div className="font-medium">{r.name}</div><div className="text-[12px] text-ink-mute">{r.vendor}</div></div> },
            { key: 'kind', header: 'Kind' },
            { key: 'note', header: 'Status', render: (r) => <Badge tone={r.level === 2 ? 'red' : 'amber'}>{r.note}</Badge> },
            { key: 'blocks', header: 'Blocking', value: (r) => (r.blocks ? 'Yes' : 'No') },
            { key: 'expiry', header: 'Expiry', render: (r) => <span className={r.expiry && r.expiry < t ? 'text-red-600' : ''}>{fmtDate(r.expiry)}</span> },
          ]} />
      )}
      {tab === 'queue' && (
        <DataTable rows={queue} onRowClick={(r) => setOpen(r.vendorId)} empty={{ title: 'No documents awaiting verification' }}
          columns={[
            { key: 'vendor', header: 'Vendor' }, { key: 'name', header: 'Document' }, { key: 'file', header: 'File' },
            { key: 'uploadedAt', header: 'Uploaded', render: (r) => fmtDate(r.uploadedAt) }, { key: 'expiry', header: 'Expiry', render: (r) => fmtDate(r.expiry) },
            { key: 'act', header: '', sortable: false, render: (r) => can('procurement', 'legal') && <ActionButton className="btn btn-sm" label="Verify" path={`/vendors/${r.vendorId}/docs/verify`} body={{ name: r.name, decision: 'Verified' }} /> },
          ]} />
      )}
      {tab === 'insurance' && (
        <DataTable rows={policies} onRowClick={(r) => setOpen(r.vendorId)}
          columns={[
            { key: 'vendor', header: 'Vendor' }, { key: 'type', header: 'Type' }, { key: 'policy', header: 'Policy' }, { key: 'insurer', header: 'Insurer' },
            { key: 'cover', header: 'Cover', align: 'right', render: (r) => fmtINR(r.cover) },
            { key: 'expiry', header: 'Expiry', render: (r) => <span className={r.expiry < t ? 'text-red-600' : ''}>{fmtDate(r.expiry)}</span> },
          ]} />
      )}
      {tab === 'requirements' && settings && (
        <div className="grid gap-4 overflow-y-auto p-4 lg:grid-cols-2">
          <table className="tbl card w-full"><thead><tr><th>Document</th><th>Applies to</th><th>Expires</th><th>Blocks payment</th></tr></thead>
            <tbody>{settings.complianceDocs.map((d: Doc) => <tr key={d.name}><td>{d.name}</td><td>{d.applies}</td><td>{d.expires ? 'Yes' : 'No'}</td><td>{d.blocks ? 'Yes' : 'No'}</td></tr>)}</tbody></table>
          <table className="tbl card w-full"><thead><tr><th>Insurance</th><th>Applies to</th><th className="text-right">Minimum cover</th><th>Blocks</th></tr></thead>
            <tbody>{settings.complianceIns.map((d: Doc) => <tr key={d.type}><td>{d.type}</td><td>{d.applies}</td><td className="text-right num">{fmtINR(d.min)}</td><td>{d.blocks ? 'Yes' : 'No'}</td></tr>)}</tbody></table>
          <p className="text-[12.5px] text-ink-mute lg:col-span-2">Warning window: {settings.expiryWarnDays} days. Blocking items put an automatic payment hold on the vendor (released automatically when fixed). The payment gate is set to <b>{settings.complianceGate}</b>; the {settings.overrideRole} may override a Stop with a reason.</p>
        </div>
      )}
      <VendorDrawer id={open} onClose={() => setOpen(null)} />
    </Page>
  );
}
