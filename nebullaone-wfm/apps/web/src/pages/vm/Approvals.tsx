import { BadgeCheck } from 'lucide-react';
import { useState } from 'react';
import { DataTable } from '../../components/DataTable';
import { Page } from '../../components/Layout';
import { Badge, Tabs } from '../../components/ui';
import { fmtDate } from '../../lib/format';
import { useVendors } from '../../lib/hooks';
import { VendorDrawer } from './VendorDrawer';

export function Approvals() {
  const vendors = useVendors();
  const [tab, setTab] = useState<'queue' | 'qual'>('queue');
  const [open, setOpen] = useState<string | null>(null);
  const queue = (vendors.data ?? []).filter((v) => ['Pending Approval', 'Draft', 'Changes Requested'].includes(v.status));
  const qualified = (vendors.data ?? []).filter((v) => v.qualification);
  return (
    <Page title="Vendor Approvals" icon={BadgeCheck}
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'queue', label: 'Approval queue', count: queue.length }, { id: 'qual', label: 'Qualification results', count: qualified.length }]} />}>
      {tab === 'queue' ? (
        <DataTable rows={queue} loading={vendors.isLoading} onRowClick={(r) => setOpen(r.id)} empty={{ title: 'Nothing waiting for approval' }} exportName="approval-queue"
          columns={[
            { key: 'name', header: 'Vendor', render: (r) => <span className="font-medium">{r.name}</span> },
            { key: 'type', header: 'Type' },
            { key: 'routing', header: 'Routing', sortable: false, render: (r) => (
              <span className="flex flex-wrap gap-1">{(r.approval?.stages ?? []).length ? r.approval.stages.map((s: any) => <Badge key={s.dept} tone={s.status === 'Approved' ? 'green' : s.status === 'Pending' ? 'amber' : 'red'}>{s.dept}</Badge>) : <span className="text-[12px] text-ink-mute">not submitted</span>}</span>
            ) },
            { key: 'createdAt', header: 'Registered', render: (r) => fmtDate(r.createdAt) },
            { key: 'waiting', header: 'Waiting for', value: (r) => r.approval?.stages?.find((s: any) => s.status === 'Pending')?.dept ?? '—' },
            { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
          ]} />
      ) : (
        <DataTable rows={qualified} onRowClick={(r) => setOpen(r.id)} exportName="qualification"
          columns={[
            { key: 'name', header: 'Vendor', render: (r) => <span className="font-medium">{r.name}</span> },
            { key: 'ruleSet', header: 'Rule set', value: (r) => r.qualification.ruleSet },
            { key: 'score', header: 'Score', align: 'right', value: (r) => r.qualification.score },
            { key: 'decision', header: 'Decision', value: (r) => r.qualification.decision ?? 'Qualified', render: (r) => <Badge tone={(r.qualification.decision ?? 'Qualified') === 'Qualified' ? 'green' : r.qualification.decision === 'Rejected' ? 'red' : 'amber'}>{r.qualification.decision ?? 'Qualified'}</Badge> },
            { key: 'exceptions', header: 'Exceptions', value: (r) => r.qualification.exceptions || '—' },
            { key: 'at', header: 'Assessed', render: (r) => fmtDate(r.qualification.at) },
          ]} />
      )}
      <VendorDrawer id={open} onClose={() => setOpen(null)} />
    </Page>
  );
}
