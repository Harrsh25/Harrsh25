import { Blocks, ClipboardList, Plus, Scale, Send, Tags } from 'lucide-react';
import { useState } from 'react';
import { ActionButton, ActionForm } from '../../components/ActionForm';
import { AuditTrail } from '../../components/AuditTrail';
import { DataTable } from '../../components/DataTable';
import type { FieldSpec } from '../../components/FormModal';
import { Page } from '../../components/Layout';
import { Badge, Drawer, KV, Progress, Section, Tabs } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useDoc, useList, type Doc } from '../../lib/data';
import { cls, fmtDate, fmtINR, fmtINRShort, todayISO } from '../../lib/format';
import { PROJECTS, useVendors, vendorOptions } from '../../lib/hooks';

const LINE_COLS = [
  { name: 'desc', label: 'Description', width: '40%' }, { name: 'unit', label: 'Unit', width: '12%' },
  { name: 'qty', label: 'Quantity', type: 'number' as const, width: '14%' }, { name: 'rate', label: 'Est. rate', type: 'number' as const, width: '14%' },
  { name: 'requiredBy', label: 'Required by', type: 'date' as const },
];

// ── Purchase requisitions (stage 04) ─────────────────────────────────────────
export function Requisitions() {
  const rows = useList('requisitions');
  const { can, user } = useAuth();
  return (
    <Page title="Purchase Requisitions" icon={ClipboardList}
      actions={can('project', 'procurement') && (
        <ActionForm className="btn btn-primary" label={<><Plus size={14} />New requisition</>} title="New purchase requisition" path="/requisitions"
          fields={[
            { name: 'purpose', label: 'Purpose', type: 'select', required: true, options: ['Purchase', 'Manpower (labour)', 'Service', 'Material Transfer'] },
            { name: 'project', label: 'Project', type: 'select', required: true, options: PROJECTS },
            { name: 'requiredBy', label: 'Required by', type: 'date', required: true },
            { name: 'costCentre', label: 'Cost centre' },
            { name: 'targetStore', label: 'Deliver to (store / site)' },
            { name: 'items', label: 'Items', type: 'lines', columns: LINE_COLS.slice(0, 4) },
            { name: 'notes', label: 'Notes', type: 'textarea' },
          ]} />
      )}>
      <DataTable rows={rows.data} loading={rows.isLoading} exportName="requisitions"
        filters={[{ label: 'Status', options: ['Submitted', 'Approved', 'Rejected'], value: (r) => r.status }]}
        columns={[
          { key: 'id', header: 'ID' }, { key: 'purpose', header: 'Purpose' },
          { key: 'req', header: 'Requirement', value: (r) => r.items.map((i: Doc) => i.desc).join(', '), render: (r) => <span>{r.items[0]?.desc}{r.items.length > 1 && <span className="text-ink-mute"> +{r.items.length - 1} more</span>}</span> },
          { key: 'project', header: 'Project' },
          { key: 'requested', header: 'Requested', value: (r) => r.date, render: (r) => <span>{fmtDate(r.date)}<span className="text-ink-mute"> · {r.requestedBy}</span></span> },
          { key: 'requiredBy', header: 'Required by', render: (r) => fmtDate(r.requiredBy) },
          { key: 'rfqs', header: 'Sourcing', value: (r) => (r.rfqIds ?? []).join(', ') || '—' },
          { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
          { key: 'act', header: '', sortable: false, render: (r) => r.status === 'Submitted' && can('project', 'procurement') && !String(r.requestedBy).startsWith(user?.name ?? '§') && (
            <span className="inline-flex gap-1">
              <ActionButton className="btn btn-sm" label="Approve" path={`/requisitions/${r.id}/decision`} body={{ decision: 'Approved' }} />
              <ActionForm className="btn btn-sm" label="Reject" title="Reject requisition" path={`/requisitions/${r.id}/decision`} transform={(v) => ({ ...v, decision: 'Rejected' })} fields={[{ name: 'remark', label: 'Reason', type: 'textarea', required: true }]} />
            </span>
          ) },
        ]} />
    </Page>
  );
}

// ── RFQ & quotations (stages 05–06) ──────────────────────────────────────────
export function Rfqs() {
  const rows = useList('rfqs');
  const vendors = useVendors();
  const reqs = useList('requisitions');
  const { can } = useAuth();
  const [open, setOpen] = useState<string | null>(null);
  const eligible = vendorOptions(vendors.data, (v) => ['Active', 'Pending Approval'].includes(v.status));
  const fields: FieldSpec[] = [
    { name: 'title', label: 'Title', required: true, span: 2 },
    { name: 'project', label: 'Project', type: 'select', required: true, options: PROJECTS },
    { name: 'requisitionId', label: 'From requisition', type: 'select', options: (reqs.data ?? []).filter((r) => r.status === 'Approved').map((r) => ({ value: r.id, label: `${r.id} — ${r.items[0]?.desc}` })) },
    { name: 'mode', label: 'Sourcing mode', type: 'select', default: 'Call for Tenders', options: [{ value: 'Call for Tenders', label: 'Multiple vendors (competitive)' }, { value: 'Single Vendor', label: 'Single vendor (direct)' }] },
    { name: 'dueDate', label: 'Quotes due', type: 'date', required: true },
    { name: 'incoterm', label: 'Incoterm', type: 'select', default: 'DAP (delivered at site)', options: ['DAP (delivered at site)', 'EXW (ex works)', 'FCA (free carrier)', 'DDP (delivered duty paid)'] },
    { name: 'sourceRef', label: 'Source (BOQ / MR reference)' },
    { name: 'items', label: 'Line items', type: 'lines', columns: LINE_COLS.filter((c) => c.name !== 'rate') },
    { name: 'vendorIds', label: 'Invite vendors (at least two for competitive)', type: 'multiselect', options: eligible },
    { name: 'tnc', label: 'Terms & conditions', type: 'textarea' },
  ];
  return (
    <Page title="RFQ & Quotations" icon={Scale}
      actions={can('procurement') && <ActionForm className="btn btn-primary" label={<><Plus size={14} />New RFQ</>} title="New request for quotation" path="/rfqs" fields={fields} onDone={(r) => setOpen(r.id)} />}>
      <DataTable rows={rows.data} loading={rows.isLoading} onRowClick={(r) => setOpen(r.id)} exportName="rfqs"
        columns={[
          { key: 'title', header: 'Requirement', render: (r) => <div><div className="font-medium">{r.title}</div><div className="text-[12px] text-ink-mute">{r.id}</div></div> },
          { key: 'project', header: 'Project' },
          { key: 'mode', header: 'Mode', value: (r) => (r.mode === 'Single Vendor' ? 'Single Vendor' : 'Multiple Vendors') },
          { key: 'responses', header: 'Responses', value: (r) => { const s = Object.values(r.responses ?? {}) as Doc[]; return `${s.filter((x) => x.status === 'Quoted' || x.status === 'Accepted').length} quoted · ${s.filter((x) => x.status === 'Declined').length} declined · ${r.vendorIds.length} invited`; } },
          { key: 'lowest', header: 'Lowest total', align: 'right', value: (r) => lowestTotal(r), render: (r) => fmtINRShort(lowestTotal(r)) },
          { key: 'dueDate', header: 'Due', render: (r) => <span className={r.dueDate < todayISO() && r.status === 'Sent' ? 'text-red-600' : ''}>{fmtDate(r.dueDate)}</span> },
          { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
        ]} />
      <RfqDrawer id={open} onClose={() => setOpen(null)} />
    </Page>
  );
}

const netRate = (q: Doc, l: number) => (q.noBid?.[l] || q.rates[l] == null ? null : q.rates[l] * (1 - (q.discounts?.[l] ?? 0) / 100));
function lowestTotal(r: Doc): number | null {
  const totals = (r.quotes ?? []).map((q: Doc) => r.items.reduce((s: number, it: Doc, l: number) => s + (netRate(q, l) ?? 0) * it.qty, 0)).filter((x: number) => x > 0);
  return totals.length ? Math.min(...totals) : null;
}

function RfqDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: r } = useDoc('rfqs', id);
  const vendors = useVendors();
  const { can } = useAuth();
  const [tab, setTab] = useState<'compare' | 'details' | 'activity'>('compare');
  if (!id || !r) return null;
  const awarded = new Map((r.awards ?? []).map((a: Doc) => [a.line, a]));
  const l1 = (l: number) => Math.min(...(r.quotes ?? []).map((q: Doc) => netRate(q, l)).filter((x: number | null): x is number => x != null));
  const quoted = (r.quotes ?? []).map((q: Doc) => q.vendorId);
  return (
    <Drawer open onClose={onClose} title={r.title} subtitle={<span className="flex items-center gap-2">{r.id} · {r.project} <Badge>{r.status}</Badge></span>} width="max-w-[980px]"
      actions={<>
        {r.status === 'Draft' && can('procurement') && <ActionButton className="btn btn-primary btn-sm" label={<><Send size={14} />Send to vendors</>} path={`/rfqs/${r.id}/send`} />}
        {['Sent', 'Quotes Received'].includes(r.status) && can('procurement') && (
          <ActionForm className="btn btn-sm" label="Enter quote" title="Enter a vendor's quote" path={`/rfqs/${r.id}/quotes`} wide
            transform={(v) => ({ vendorId: v.vendorId, quoteNo: v.quoteNo, validUntil: v.validUntil, deliveryDays: v.deliveryDays, gstPct: v.gstPct, note: v.note, rates: r.items.map((_: Doc, i: number) => (v[`rate${i}`] === undefined ? null : v[`rate${i}`])) })}
            fields={[
              { name: 'vendorId', label: 'Vendor', type: 'select', required: true, options: r.vendorIds.map((v: string) => ({ value: v, label: vendors.name(v) })) },
              { name: 'quoteNo', label: 'Vendor quote no.', required: true }, { name: 'validUntil', label: 'Valid until', type: 'date', required: true },
              { name: 'deliveryDays', label: 'Delivery (days)', type: 'number', required: true }, { name: 'gstPct', label: 'GST %', type: 'number', default: 18 },
              ...r.items.map((it: Doc, i: number) => ({ name: `rate${i}`, label: `Rate — ${it.desc} (per ${it.unit}); leave empty for no-bid`, type: 'number' as const })),
              { name: 'note', label: 'Note', type: 'textarea' },
            ]} />
        )}
      </>}>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'compare', label: 'Quote comparison', count: r.quotes?.length }, { id: 'details', label: 'Details' }, { id: 'activity', label: 'Activity' }]} />
      {tab === 'compare' ? (
        <div className="space-y-4 p-5">
          {!quoted.length ? <p className="text-[13px] text-ink-mute">No quotes yet.</p> : (
            <div className="overflow-x-auto rounded-lg border border-line">
              <table className="tbl w-full">
                <thead><tr><th>Line</th><th className="text-right">Qty</th>{r.quotes.map((q: Doc) => <th key={q.vendorId} className="text-right">{vendors.name(q.vendorId)}<div className="font-normal text-ink-faint">{q.quoteNo} · {q.deliveryDays}d · valid {fmtDate(q.validUntil)}</div></th>)}<th>Awarded</th></tr></thead>
                <tbody>
                  {r.items.map((it: Doc, l: number) => (
                    <tr key={l}>
                      <td><div className="font-medium">{it.desc}</div><div className="text-[12px] text-ink-mute">{it.unit}</div></td>
                      <td className="text-right num">{it.qty}</td>
                      {r.quotes.map((q: Doc) => { const n = netRate(q, l); return <td key={q.vendorId} className={cls('text-right num', n != null && n === l1(l) && 'bg-green-50 font-semibold text-green-700')}>{n == null ? <span className="text-ink-faint">no bid</span> : fmtINR(n)}</td>; })}
                      <td>{awarded.get(l) ? <span className="text-[12.5px]">{vendors.name((awarded.get(l) as Doc).vendorId)} · {(awarded.get(l) as Doc).poId}</span> : '—'}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-medium"><td>Total (ex GST)</td><td />{r.quotes.map((q: Doc) => <td key={q.vendorId} className="text-right num">{fmtINR(r.items.reduce((s: number, it: Doc, l: number) => s + (netRate(q, l) ?? 0) * it.qty, 0))}</td>)}<td /></tr>
                </tbody>
              </table>
            </div>
          )}
          {['Quotes Received', 'Partially Awarded'].includes(r.status) && can('procurement') && (
            <ActionForm className="btn btn-primary" label="Award & create PO" title="Award lines and issue a purchase order" path={`/rfqs/${r.id}/award`}
              description="Awarding a line to anyone but the lowest bidder needs a justification. The vendor must pass the PO gate (status, holds, compliance, scorecard)."
              transform={(v) => ({ ...v, lines: (v.lines as string[]).map(Number) })}
              fields={[
                { name: 'vendorId', label: 'Vendor', type: 'select', required: true, options: quoted.map((v: string) => ({ value: v, label: vendors.name(v) })) },
                { name: 'lines', label: 'Lines to award', type: 'multiselect', options: r.items.map((it: Doc, i: number) => ({ value: String(i), label: `${i + 1}. ${it.desc}` })).filter((o: any) => !awarded.has(Number(o.value))) },
                { name: 'deliveryDate', label: 'Delivery date', type: 'date', required: true },
                { name: 'billingPolicy', label: 'Bill on', type: 'select', default: 'On received quantity', options: ['On received quantity', 'On ordered quantity'] },
                { name: 'justification', label: 'Justification (if not L1)', type: 'textarea' },
              ]} />
          )}
          {(r.negotiation ?? []).length > 0 && (
            <Section title="Negotiation log">
              <ul className="divide-y divide-line">{r.negotiation.map((n: Doc, i: number) => <li key={i} className="px-4 py-2 text-[13px]"><span className="font-medium">{vendors.name(n.vendorId)}</span> — {n.text}<div className="text-[12px] text-ink-mute">{fmtDate(n.at)} · {n.by}</div></li>)}</ul>
            </Section>
          )}
          {['Sent', 'Quotes Received'].includes(r.status) && can('procurement') && (
            <ActionForm label="Log negotiation" title="Negotiation note" path={`/rfqs/${r.id}/negotiation`} fields={[{ name: 'vendorId', label: 'Vendor', type: 'select', required: true, options: quoted.map((v: string) => ({ value: v, label: vendors.name(v) })) }, { name: 'text', label: 'Note', type: 'textarea', required: true }]} />
          )}
        </div>
      ) : tab === 'details' ? (
        <div className="space-y-4 p-5">
          <KV rows={[['Mode', r.mode], ['Created', fmtDate(r.createdOn)], ['Quotes due', fmtDate(r.dueDate)], ['Incoterm', r.incoterm], ['Source', r.sourceRef || '—'], ['Template', r.template], ['Weights', `Price ${r.weights?.price}% · Quality ${r.weights?.quality}% · Delivery ${r.weights?.delivery}%`]]} />
          <div><div className="label">Invited vendors</div><ul className="space-y-1">{r.vendorIds.map((v: string) => <li key={v} className="flex items-center justify-between text-[13px]">{vendors.name(v)}<Badge>{r.responses?.[v]?.status ?? (r.status === 'Draft' ? 'Not sent' : 'Invited')}</Badge></li>)}</ul></div>
          <div><div className="label">Terms</div><p className="whitespace-pre-wrap text-[13px]">{r.tnc || '—'}</p></div>
        </div>
      ) : <AuditTrail entity="rfqs" refId={r.id} />}
    </Drawer>
  );
}

// ── Blanket orders ───────────────────────────────────────────────────────────
export function BlanketOrders() {
  const rows = useList('blanketOrders');
  const pos = useList('purchaseOrders');
  const vendors = useVendors();
  const { can } = useAuth();
  const consumed = (b: Doc) => {
    const calls = (pos.data ?? []).filter((p) => p.blanketId === b.id && p.status !== 'Cancelled');
    const value = b.lines.reduce((s: number, l: Doc) => s + l.qty * l.rate, 0);
    const used = calls.flatMap((p) => p.lines).reduce((s: number, l: Doc) => s + l.qty * l.rate, 0);
    return { value, used, pct: value ? (used / value) * 100 : 0, calls: calls.length };
  };
  return (
    <Page title="Blanket Orders" icon={Blocks}
      actions={can('procurement') && (
        <ActionForm className="btn btn-primary" label={<><Plus size={14} />New blanket order</>} title="New blanket (rate) agreement" path="/blanket-orders"
          fields={[
            { name: 'vendorId', label: 'Vendor', type: 'select', required: true, options: vendorOptions(vendors.data, (v) => v.status === 'Active') },
            { name: 'title', label: 'Title', required: true }, { name: 'start', label: 'Start', type: 'date', required: true }, { name: 'deadline', label: 'Valid till', type: 'date', required: true },
            { name: 'lines', label: 'Agreed lines', type: 'lines', columns: LINE_COLS.slice(0, 4) }, { name: 'terms', label: 'Terms', type: 'textarea' },
          ]} />
      )}>
      <DataTable rows={rows.data} loading={rows.isLoading} exportName="blanket-orders"
        columns={[
          { key: 'title', header: 'Agreement', render: (r) => <div><div className="font-medium">{r.title}</div><div className="text-[12px] text-ink-mute">{r.id}</div></div> },
          { key: 'vendor', header: 'Vendor', value: (r) => vendors.name(r.vendorId) },
          { key: 'value', header: 'Value', align: 'right', value: (r) => consumed(r).value, render: (r) => fmtINRShort(consumed(r).value) },
          { key: 'consumed', header: 'Consumed', value: (r) => consumed(r).pct, render: (r) => <span className="flex items-center gap-2"><Progress value={consumed(r).pct} /><span className="text-[12px] num">{consumed(r).pct.toFixed(0)}%</span></span> },
          { key: 'calls', header: 'Call-offs', align: 'right', value: (r) => consumed(r).calls },
          { key: 'deadline', header: 'Valid till', render: (r) => fmtDate(r.deadline) },
          { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
          { key: 'act', header: '', sortable: false, render: (r) => r.status === 'Active' && can('procurement', 'project') && (
            <ActionForm className="btn btn-sm" label="Call-off" title={`Call-off against ${r.id}`} path={`/blanket-orders/${r.id}/call-off`}
              transform={(v) => ({ project: v.project, deliveryDate: v.deliveryDate, lines: r.lines.map((_: Doc, i: number) => ({ blanketLine: i, qty: v[`q${i}`] })).filter((l: Doc) => l.qty > 0) })}
              fields={[{ name: 'project', label: 'Project', type: 'select', required: true, options: PROJECTS }, { name: 'deliveryDate', label: 'Delivery date', type: 'date', required: true },
                ...r.lines.map((l: Doc, i: number) => ({ name: `q${i}`, label: `${l.desc} (${l.unit} @ ₹${l.rate})`, type: 'number' as const }))]} />
          ) },
        ]} />
    </Page>
  );
}

// ── Vendor price lists ───────────────────────────────────────────────────────
export function PriceLists() {
  const rows = useList('vendorPrices');
  const vendors = useVendors();
  const { can } = useAuth();
  const t = todayISO();
  return (
    <Page title="Vendor Price Lists" icon={Tags}
      actions={can('procurement') && (
        <ActionForm className="btn btn-primary" label={<><Plus size={14} />Add price</>} title="Add vendor price" path="/data/vendorPrices"
          fields={[
            { name: 'vendorId', label: 'Vendor', type: 'select', required: true, options: vendorOptions(vendors.data, (v) => v.status === 'Active') },
            { name: 'product', label: 'Product', required: true }, { name: 'unit', label: 'Unit', required: true }, { name: 'minQty', label: 'Min qty', type: 'number', required: true },
            { name: 'unitPrice', label: 'Unit price (₹)', type: 'number', required: true }, { name: 'discount', label: 'Discount %', type: 'number', default: 0 },
            { name: 'leadDays', label: 'Lead time (days)', type: 'number' }, { name: 'priceList', label: 'Price list', default: 'Standard Buying' },
            { name: 'validFrom', label: 'Valid from', type: 'date', required: true }, { name: 'validTo', label: 'Valid to', type: 'date', required: true },
          ]} transform={(v) => ({ ...v, currency: 'INR', company: 'NebullaOne Infra Pvt Ltd' })} />
      )}>
      <DataTable rows={rows.data} loading={rows.isLoading} exportName="price-lists"
        columns={[
          { key: 'vendor', header: 'Vendor', value: (r) => vendors.name(r.vendorId) }, { key: 'product', header: 'Product' },
          { key: 'minQty', header: 'Min qty', value: (r) => `${r.minQty} ${r.unit}` },
          { key: 'unitPrice', header: 'Unit price', align: 'right', render: (r) => <span>{fmtINR(r.unitPrice)}{r.discount ? <span className="text-green-700"> −{r.discount}%</span> : null}</span> },
          { key: 'leadDays', header: 'Lead time', value: (r) => (r.leadDays != null ? `${r.leadDays} d` : '—') }, { key: 'priceList', header: 'Price list' },
          { key: 'validity', header: 'Validity', value: (r) => r.validTo, render: (r) => <span className="flex items-center gap-2">{fmtDate(r.validFrom)} → {fmtDate(r.validTo)} <Badge tone={r.validTo < t ? 'red' : 'green'}>{r.validTo < t ? 'Expired' : 'Valid'}</Badge></span> },
        ]} />
    </Page>
  );
}
