import { Ban, Plus } from 'lucide-react';
import { useState } from 'react';
import { ActionForm } from '../../components/ActionForm';
import { DataTable } from '../../components/DataTable';
import { Page } from '../../components/Layout';
import { Badge, Notice, Tabs } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useList } from '../../lib/data';
import { fmtDate } from '../../lib/format';
import { useVendors, vendorOptions } from '../../lib/hooks';

/** New screen: one register for every hold (fixes B7 — previously three separate mechanisms). */
export function Holds() {
  const holds = useList('holds');
  const vendors = useVendors();
  const { can } = useAuth();
  const [tab, setTab] = useState<'Active' | 'Released'>('Active');
  const rows = (holds.data ?? []).filter((h) => h.status === tab);
  return (
    <Page title="Holds Register" icon={Ban}
      actions={can('procurement', 'finance', 'legal') && (
        <ActionForm className="btn btn-primary" label={<><Plus size={14} />Place hold</>} title="Place a hold" path="/holds"
          description="Holds stop the actions covered by their scope until released. Compliance and performance holds are placed and released automatically."
          fields={[
            { name: 'vendorId', label: 'Vendor', type: 'select', required: true, options: vendorOptions(vendors.data) },
            { name: 'level', label: 'Applies to', type: 'select', required: true, default: 'Vendor', options: [{ value: 'Vendor', label: 'The whole vendor' }, { value: 'Contract', label: 'One contract' }, { value: 'Invoice', label: 'One invoice' }] },
            { name: 'refId', label: 'Contract / invoice id', show: (v) => v.level !== 'Vendor', placeholder: 'e.g. CTR-001 or INV-008' },
            { name: 'scope', label: 'Scope', type: 'select', required: true, options: [{ value: 'All', label: 'All — RFQs, orders, bills, payments' }, { value: 'RFQ/PO', label: 'RFQ / PO — no new invitations or orders' }, { value: 'Invoices', label: 'Invoices — bills cannot be posted' }, { value: 'Payments', label: 'Payments only' }] },
            { name: 'releaseDate', label: 'Planned release date', type: 'date' },
            { name: 'detail', label: 'Reason', type: 'textarea', required: true },
          ]} />
      )}
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'Active', label: 'Active', count: (holds.data ?? []).filter((h) => h.status === 'Active').length }, { id: 'Released', label: 'Released', count: (holds.data ?? []).filter((h) => h.status === 'Released').length }]} />}>
      <div className="border-b border-line px-4 py-2.5">
        <Notice tone="blue" title="How scope works">
          <p className="mt-0.5"><b>All</b> blocks RFQ invites, new POs/contracts/work orders, bill posting and payments · <b>RFQ/PO</b> blocks sourcing and ordering · <b>Invoices</b> blocks bill posting · <b>Payments</b> blocks payment only.</p>
        </Notice>
      </div>
      <DataTable rows={rows} loading={holds.isLoading} exportName="holds" empty={{ title: tab === 'Active' ? 'No active holds' : 'No released holds' }}
        filters={[{ label: 'Reason', options: ['Compliance', 'Performance', 'Manual'], value: (r) => r.reason }, { label: 'Scope', options: ['All', 'RFQ/PO', 'Invoices', 'Payments'], value: (r) => r.scope }]}
        columns={[
          { key: 'id', header: 'Hold' },
          { key: 'vendor', header: 'Vendor', value: (r) => vendors.name(r.vendorId), render: (r) => <span className="font-medium">{vendors.name(r.vendorId)}</span> },
          { key: 'level', header: 'Level', value: (r) => (r.level === 'Vendor' ? 'Vendor' : `${r.level} ${r.refId}`) },
          { key: 'scope', header: 'Scope', render: (r) => <Badge tone={r.scope === 'All' ? 'red' : 'amber'}>{r.scope}</Badge> },
          { key: 'reason', header: 'Reason', render: (r) => <span>{r.reason}{r.auto ? <span className="ml-1 text-[11px] text-ink-mute">(auto)</span> : null}{r.permanent ? <span className="ml-1 text-[11px] text-red-600">(blacklist)</span> : null}</span> },
          { key: 'detail', header: 'Detail', render: (r) => <span className="line-clamp-2 max-w-[380px] text-[12.5px]" title={r.detail}>{r.detail}</span> },
          { key: 'raisedAt', header: tab === 'Active' ? 'Since' : 'Released', render: (r) => (tab === 'Active' ? fmtDate(r.raisedAt) : `${fmtDate(r.releasedAt)} · ${r.releaseNote ?? ''}`) },
          { key: 'act', header: '', sortable: false, render: (r) => tab === 'Active' && !r.auto && can('procurement', 'finance', 'legal') && (
            <ActionForm className="btn btn-sm" label="Release" title={`Release ${r.id}`} path={`/holds/${r.id}/release`} fields={[{ name: 'note', label: 'Why is it released?', type: 'textarea', required: true }]} />
          ) },
        ]} />
    </Page>
  );
}
