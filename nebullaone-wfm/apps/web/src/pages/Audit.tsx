import { History } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { Page } from '../components/Layout';
import { useGet } from '../lib/data';

export function Audit() {
  const q = useGet<any[]>('/audit?limit=500', ['audit-all']);
  return (
    <Page title="Audit Log" icon={History}>
      <DataTable rows={q.data?.map((a, i) => ({ ...a, id: String(i) }))} loading={q.isLoading} exportName="audit-log"
        filters={[{ label: 'Entity', options: [...new Set((q.data ?? []).map((a) => a.entity))], value: (r) => r.entity }]}
        columns={[
          { key: 'at', header: 'When', render: (r) => new Date(r.at).toLocaleString('en-IN') },
          { key: 'by', header: 'Who' }, { key: 'entity', header: 'Entity' }, { key: 'refId', header: 'Record' }, { key: 'action', header: 'Action' },
          { key: 'detail', header: 'Detail', value: (r) => (r.detail ? JSON.stringify(r.detail) : ''), render: (r) => <span className="line-clamp-2 max-w-[360px] font-mono text-[11.5px] text-ink-mute">{r.detail ? JSON.stringify(r.detail) : ''}</span> },
        ]} />
    </Page>
  );
}
