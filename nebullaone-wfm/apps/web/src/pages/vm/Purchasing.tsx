import { PackageCheck, Plus, ShoppingCart, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ActionForm } from '../../components/ActionForm';
import { AuditTrail } from '../../components/AuditTrail';
import { DataTable } from '../../components/DataTable';
import { Page } from '../../components/Layout';
import { Badge, Drawer, KV, Notice, Progress, Tabs } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useDoc, useList, type Doc } from '../../lib/data';
import { fmtDate, fmtINR, fmtINRShort, fmtNum, todayISO } from '../../lib/format';
import { PROJECTS, useVendors, vendorOptions } from '../../lib/hooks';

export function PurchaseOrders() {
  const rows = useList('purchaseOrders');
  const vendors = useVendors();
  const { can } = useAuth();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Page title="Purchase Orders" icon={ShoppingCart}
      actions={can('procurement') && (
        <ActionForm className="btn btn-primary" label={<><Plus size={14} />New PO</>} title="New purchase order" path="/purchase-orders" onDone={(p) => setOpen(p.id)}
          description="Direct POs go through the same vendor gate as RFQ awards: vendor status, holds, compliance and scorecard."
          fields={[
            { name: 'vendorId', label: 'Vendor', type: 'select', required: true, options: vendorOptions(vendors.data, (v) => v.status === 'Active') },
            { name: 'kind', label: 'PO type', type: 'select', default: 'Goods', options: [{ value: 'Goods', label: 'Goods — received with a GRN' }, { value: 'Service', label: 'Service — confirmed with a service receipt' }] },
            { name: 'project', label: 'Project', type: 'select', required: true, options: PROJECTS },
            { name: 'deliveryDate', label: 'Delivery / completion by', type: 'date', required: true },
            { name: 'gstPct', label: 'GST %', type: 'number', default: 18 },
            { name: 'billingPolicy', label: 'Bill on', type: 'select', default: 'On received quantity', options: ['On received quantity', 'On ordered quantity'] },
            { name: 'lines', label: 'Lines', type: 'lines', columns: [{ name: 'desc', label: 'Description', width: '45%' }, { name: 'unit', label: 'Unit' }, { name: 'qty', label: 'Qty', type: 'number' }, { name: 'rate', label: 'Rate (₹)', type: 'number' }] },
            { name: 'note', label: 'Note', type: 'textarea' },
          ]} />
      )}>
      <DataTable rows={rows.data} loading={rows.isLoading} onRowClick={(r) => setOpen(r.id)} exportName="purchase-orders"
        filters={[{ label: 'Status', options: ['Issued', 'Partially Received', 'Received', 'Closed', 'Cancelled'], value: (r) => r._status }, { label: 'Type', options: ['Goods', 'Service'], value: (r) => r.kind ?? 'Goods' }]}
        columns={[
          { key: 'vendor', header: 'Vendor', value: (r) => vendors.name(r.vendorId), render: (r) => <div><div className="font-medium">{vendors.name(r.vendorId)}</div><div className="text-[12px] text-ink-mute">{r.id}{r.kind === 'Service' ? ' · service' : ''}</div></div> },
          { key: 'items', header: 'Items · project', value: (r) => r.lines.map((l: Doc) => l.desc).join(', '), render: (r) => <div><div>{r.lines[0]?.desc}{r.lines.length > 1 && <span className="text-ink-mute"> +{r.lines.length - 1} more</span>}</div><div className="text-[12px] text-ink-mute">{r.project}</div></div> },
          { key: 'source', header: 'Source', value: (r) => (r.rfqId ? 'From RFQ' : r.blanketId ? 'Call-off' : 'Direct'), render: (r) => <Badge tone="gray">{r.rfqId ? 'From RFQ' : r.blanketId ? 'Call-off' : 'Direct'}</Badge> },
          { key: 'value', header: 'Value', align: 'right', value: (r) => r._value, render: (r) => fmtINRShort(r._value) },
          { key: 'received', header: 'Received', value: (r) => r._receivedPct, render: (r) => r.kind === 'Service' ? <span className="text-[12px] text-ink-mute">via SES</span> : <span className="flex items-center gap-2"><Progress value={r._receivedPct} tone={r._receivedPct >= 100 ? 'green' : 'brand'} /><span className="text-[12px] num">{r._receivedPct}%</span></span> },
          { key: 'deliveryDate', header: 'Delivery by', render: (r) => <span className={r._late ? 'font-medium text-red-600' : ''}>{fmtDate(r.deliveryDate)}{r._late ? ' · late' : ''}</span> },
          { key: 'billing', header: 'Billing', value: (r) => r._billing, render: (r) => <Badge>{r._billing}</Badge> },
          { key: 'status', header: 'Status', value: (r) => r._status, render: (r) => <Badge>{r._status}</Badge> },
        ]} />
      <PoDrawer id={open} onClose={() => setOpen(null)} />
    </Page>
  );
}

function PoDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: p } = useDoc('purchaseOrders', id);
  const vendors = useVendors();
  const { can } = useAuth();
  const [tab, setTab] = useState<'lines' | 'receipts' | 'activity'>('lines');
  if (!id || !p) return null;
  const open = !['Closed', 'Cancelled', 'Received'].includes(p._status);
  return (
    <Drawer open onClose={onClose} title={`${p.id} · ${vendors.name(p.vendorId)}`} subtitle={<span className="flex items-center gap-2">{p.project} · {p.kind ?? 'Goods'} <Badge>{p._status}</Badge><Badge>{p._billing}</Badge></span>} width="max-w-[900px]"
      actions={<>
        {open && p.kind !== 'Service' && can('procurement', 'project') && (
          <ActionForm className="btn btn-primary btn-sm" label={<><Truck size={14} />Record goods receipt</>} title={`Goods receipt against ${p.id}`} path={`/purchase-orders/${p.id}/receipts`}
            description="Enter received and accepted quantities. Rejected quantity needs a reason; it can then be returned to the vendor."
            transform={(v) => ({ date: v.date, deliveryNote: v.deliveryNote, vehicle: v.vehicle, qc: v.qc, remarks: v.remarks, lines: p._lines.map((_: Doc, i: number) => ({ line: i, qty: v[`q${i}`] ?? 0, accepted: v[`a${i}`] ?? v[`q${i}`] ?? 0, rejectReason: v[`r${i}`] })).filter((l: Doc) => l.qty > 0) })}
            fields={[
              { name: 'date', label: 'Receipt date', type: 'date', required: true, default: todayISO() }, { name: 'deliveryNote', label: 'Delivery note no.' },
              { name: 'vehicle', label: 'Vehicle no.' }, { name: 'qc', label: 'Quality check', type: 'select', default: 'Passed', options: ['Passed', 'Partially Passed', 'Failed', 'Not required'] },
              ...p._lines.flatMap((l: Doc, i: number) => [
                { name: `q${i}`, label: `${l.desc} — received (${l.unit}; ordered ${l.qty}, received so far ${l.received})`, type: 'number' as const },
                { name: `a${i}`, label: `${l.desc} — accepted`, type: 'number' as const },
                { name: `r${i}`, label: `${l.desc} — reason for rejected qty`, show: (v: Doc) => v[`a${i}`] !== '' && Number(v[`a${i}`]) < Number(v[`q${i}`]) },
              ]),
              { name: 'remarks', label: 'Remarks', type: 'textarea' },
            ]} />
        )}
        {!['Closed', 'Cancelled'].includes(p.status) && can('procurement') && (
          (p.receipts ?? []).length
            ? <ActionForm className="btn btn-sm" label="Short-close" title="Short-close PO" path={`/purchase-orders/${p.id}/close`} fields={[{ name: 'reason', label: 'Reason', type: 'textarea', required: true }]} />
            : <ActionForm className="btn btn-sm" danger label="Cancel PO" title="Cancel PO" path={`/purchase-orders/${p.id}/cancel`} fields={[{ name: 'reason', label: 'Reason', type: 'textarea', required: true }]} />
        )}
      </>}>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'lines', label: 'Lines' }, { id: 'receipts', label: p.kind === 'Service' ? 'Service receipts' : 'Receipts & returns', count: (p.receipts ?? []).length }, { id: 'activity', label: 'Activity' }]} />
      {tab === 'lines' ? (
        <div className="space-y-4 p-5">
          <KV rows={[['PO date', fmtDate(p.date)], ['Delivery by', fmtDate(p.deliveryDate)], ['Bill on', p.billingPolicy], ['Receipt tolerance', `${p.tolerance ?? 0}%`], ['Source', p.rfqId ?? p.blanketId ?? 'Direct'], ['Value (ex GST)', fmtINR(p._value)]]} />
          <table className="tbl w-full"><thead><tr><th>Line</th><th className="text-right">Ordered</th><th className="text-right">Rate</th><th className="text-right">Received</th><th className="text-right">Accepted</th><th className="text-right">Rejected</th></tr></thead>
            <tbody>{p._lines.map((l: Doc, i: number) => <tr key={i}><td>{l.desc}<div className="text-[12px] text-ink-mute">{l.unit}</div></td><td className="text-right num">{fmtNum(l.qty)}</td><td className="text-right num">{fmtINR(l.rate)}</td><td className="text-right num">{fmtNum(l.received)}</td><td className="text-right num">{fmtNum(l.accepted)}</td><td className="text-right num">{l.rejected ? <span className="text-red-600">{fmtNum(l.rejected)}</span> : 0}</td></tr>)}</tbody>
          </table>
          {p.justification && <Notice tone="blue" title="Award justification"><p>{p.justification}</p></Notice>}
        </div>
      ) : tab === 'receipts' ? (
        <div className="space-y-3 p-5">
          {(p.receipts ?? []).map((r: Doc) => (
            <div key={r.id} className="rounded-lg border border-line p-3">
              <div className="flex items-center justify-between"><div className="font-medium">{r.id} · {fmtDate(r.date)}</div><Badge>{r.qc}</Badge></div>
              <ul className="mt-2 space-y-1 text-[13px]">{r.lines.map((l: Doc) => (
                <li key={l.line} className="flex items-center justify-between">
                  <span>{p.lines[l.line]?.desc}: {l.qty} received, {l.accepted} accepted{l.rejectReason ? ` — ${l.rejectReason}` : ''}</span>
                  {l.qty > l.accepted && can('procurement', 'project') && (
                    <ActionForm className="btn btn-sm" label="Return to vendor" title="Return rejected quantity" path={`/purchase-orders/${p.id}/returns`} transform={(v) => ({ ...v, grnId: r.id, line: l.line })} initial={{ qty: l.qty - l.accepted }}
                      fields={[{ name: 'qty', label: 'Quantity', type: 'number', required: true }, { name: 'reason', label: 'Reason', required: true, default: l.rejectReason }, { name: 'location', label: 'Return location' }]} />
                  )}
                </li>
              ))}</ul>
            </div>
          ))}
          {(p.returns ?? []).map((r: Doc) => <Notice key={r.id} tone="amber" title={`${r.id} · returned ${r.qty} ${p.lines[r.line]?.unit} of ${p.lines[r.line]?.desc}`}><p>{r.reason} · {fmtDate(r.date)}</p></Notice>)}
          {!(p.receipts ?? []).length && <p className="text-[13px] text-ink-mute">Nothing received yet.</p>}
        </div>
      ) : <AuditTrail entity="purchaseOrders" refId={p.id} />}
    </Drawer>
  );
}

/** New screen: every goods receipt across all POs (receipts used to be hidden inside POs). */
export function GoodsReceipts() {
  const pos = useList('purchaseOrders');
  const vendors = useVendors();
  const rows = useMemo(() => (pos.data ?? []).flatMap((p) => (p.receipts ?? []).map((r: Doc) => {
    const received = r.lines.reduce((s: number, l: Doc) => s + l.qty, 0);
    const accepted = r.lines.reduce((s: number, l: Doc) => s + l.accepted, 0);
    return { ...r, poId: p.id, vendorId: p.vendorId, project: p.project, deliveryDate: p.deliveryDate, received, accepted, items: r.lines.map((l: Doc) => p.lines[l.line]?.desc).join(', '), late: r.date > p.deliveryDate };
  })), [pos.data]);
  return (
    <Page title="Goods Receipts" icon={Truck}>
      <div className="border-b border-line px-4 py-2.5 text-[12.5px] text-ink-mute">Record a receipt from the purchase order (Purchase Orders → open a PO → Record goods receipt). Accepted quantity drives 3-way matching; rejected quantity can be returned to the vendor and, if already billed, is recovered with a debit note.</div>
      <DataTable rows={rows} loading={pos.isLoading} exportName="goods-receipts" empty={{ title: 'No goods received yet' }}
        filters={[{ label: 'QC', options: ['Passed', 'Partially Passed', 'Failed', 'Not required'], value: (r) => r.qc }]}
        columns={[
          { key: 'id', header: 'GRN' }, { key: 'date', header: 'Date', render: (r) => fmtDate(r.date) },
          { key: 'poId', header: 'PO' }, { key: 'vendor', header: 'Vendor', value: (r) => vendors.name(r.vendorId) },
          { key: 'items', header: 'Items' },
          { key: 'received', header: 'Received', align: 'right' }, { key: 'accepted', header: 'Accepted', align: 'right', render: (r) => <span className={r.accepted < r.received ? 'text-amber-700' : ''}>{r.accepted}</span> },
          { key: 'late', header: 'On time', value: (r) => (r.late ? 'Late' : 'On time'), render: (r) => <Badge tone={r.late ? 'red' : 'green'}>{r.late ? 'Late' : 'On time'}</Badge> },
          { key: 'qc', header: 'QC', render: (r) => <Badge>{r.qc}</Badge> },
        ]} />
    </Page>
  );
}

/** New screen (stage 19B): service entry sheets for service POs. */
export function ServiceReceipts() {
  const rows = useList('serviceReceipts');
  const pos = useList('purchaseOrders');
  const vendors = useVendors();
  const { can, user } = useAuth();
  const servicePos = (pos.data ?? []).filter((p) => p.kind === 'Service' && !['Closed', 'Cancelled'].includes(p.status));
  return (
    <Page title="Service Receipts" icon={PackageCheck}
      actions={can('project', 'procurement') && (
        <ActionForm className="btn btn-primary" label={<><Plus size={14} />New service receipt</>} title="Service receipt / service entry sheet" path="/service-receipts"
          description="Confirms that a service was performed. Someone other than the submitter must accept it; only accepted quantity can be billed."
          transform={(v) => { const [poId, line] = String(v.poLine ?? '').split('|'); return { poId, periodFrom: v.periodFrom, periodTo: v.periodTo, site: v.site, description: v.description, timesheetRef: v.timesheetRef, lines: [{ line: Number(line), qty: v.qty, measure: v.measure }] }; }}
          fields={[
            { name: 'poLine', label: 'Service PO line', type: 'select', required: true, options: servicePos.flatMap((p) => p.lines.map((l: Doc, i: number) => ({ value: `${p.id}|${i}`, label: `${p.id} — ${vendors.name(p.vendorId)} — ${l.desc} (${l.qty} ${l.unit})` }))) },
            { name: 'periodFrom', label: 'Period from', type: 'date', required: true }, { name: 'periodTo', label: 'Period to', type: 'date', required: true },
            { name: 'measure', label: 'Measured as', type: 'select', default: 'Quantity', options: ['Quantity', 'Hours', '% Complete', 'Milestone'] },
            { name: 'qty', label: 'Quantity performed', type: 'number', required: true }, { name: 'site', label: 'Site / location' }, { name: 'timesheetRef', label: 'Timesheet reference' },
            { name: 'description', label: 'Service performed', type: 'textarea', required: true },
          ]} />
      )}>
      <DataTable rows={rows.data} loading={rows.isLoading} exportName="service-receipts" empty={{ title: 'No service receipts yet', text: 'Create a service PO first (Purchase Orders → New PO → type Service).' }}
        columns={[
          { key: 'id', header: 'SES' }, { key: 'poId', header: 'PO' }, { key: 'vendor', header: 'Vendor', value: (r) => vendors.name(r.vendorId) },
          { key: 'period', header: 'Period', value: (r) => r.periodFrom, render: (r) => `${fmtDate(r.periodFrom)} → ${fmtDate(r.periodTo)}` },
          { key: 'desc', header: 'Service', value: (r) => r.description, render: (r) => <span className="line-clamp-2 max-w-[320px]">{r.description}</span> },
          { key: 'qty', header: 'Quantity', value: (r) => r.lines.map((l: Doc) => `${l.qty} ${l.unit}`).join(', ') },
          { key: 'value', header: 'Value', align: 'right', value: (r) => r.lines.reduce((s: number, l: Doc) => s + l.value, 0), render: (r) => fmtINR(r.lines.reduce((s: number, l: Doc) => s + l.value, 0)) },
          { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
          { key: 'act', header: '', sortable: false, render: (r) => r.status === 'Submitted' && can('project', 'procurement') && !String(r.submittedBy).startsWith(user?.name ?? '§') && (
            <span className="inline-flex gap-1">
              <ActionForm className="btn btn-sm" label="Accept" title="Accept service" path={`/service-receipts/${r.id}/decision`} transform={(v) => ({ ...v, decision: 'Accepted' })} fields={[{ name: 'remark', label: 'Remark', type: 'textarea' }]} />
              <ActionForm className="btn btn-sm" label="Reject" title="Reject service receipt" path={`/service-receipts/${r.id}/decision`} transform={(v) => ({ ...v, decision: 'Rejected' })} fields={[{ name: 'remark', label: 'Reason', type: 'textarea', required: true }]} />
            </span>
          ) },
        ]} />
    </Page>
  );
}
