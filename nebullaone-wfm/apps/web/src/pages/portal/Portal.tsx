import { Globe, LogOut } from 'lucide-react';
import { useState } from 'react';
import { ActionButton, ActionForm } from '../../components/ActionForm';
import { DataTable } from '../../components/DataTable';
import { Logo, Page } from '../../components/Layout';
import { Badge, Kpi, Notice, Tabs } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useGet, useList, type Doc } from '../../lib/data';
import { fmtDate, fmtINR, todayISO } from '../../lib/format';
import { useVendors } from '../../lib/hooks';

type Tab = 'rfqs' | 'pos' | 'wos' | 'claims' | 'bills' | 'docs' | 'queries';

/**
 * The vendor portal. Vendors see only their own records (enforced by the API).
 * Internal users can preview it for any vendor from Vendor Management → Vendor Portal.
 */
export function PortalView({ vendorId, preview }: { vendorId: string; preview?: boolean }) {
  const vendors = useVendors();
  const v = vendors.map.get(vendorId);
  const rfqs = useGet<Doc[]>(`/portal/rfqs?vendorId=${vendorId}`, ['portal-rfqs', vendorId]);
  const pos = useList('purchaseOrders');
  const wos = useList('workOrders');
  const claims = useList('claims');
  const invoices = useList('invoices');
  const tickets = useList('tickets');
  const settings = useGet<Doc>('/config/settings', ['config', 'settings']).data;
  const [tab, setTab] = useState<Tab>('rfqs');
  const mine = <T extends Doc>(rows: T[] | undefined) => (rows ?? []).filter((r) => r.vendorId === vendorId);
  const myWos = mine(wos.data);
  const toQuote = (rfqs.data ?? []).filter((r) => ['Sent', 'Quotes Received'].includes(r.status) && !r.myQuote && r.myResponse?.status !== 'Declined' && r.dueDate >= todayISO());
  const due = mine(invoices.data).reduce((s, i) => s + Math.max(0, i._totals?.balance ?? 0), 0);
  const renew = (v?._compliance?.issues ?? []).length;
  const act = !preview; // only the vendor acts; internal preview is read-only

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div><h2 className="text-[18px] font-semibold">Welcome{v?.contact?.name ? `, ${v.contact.name}` : ''}</h2><p className="text-[13px] text-ink-mute">{v?.name} · {vendorId}{preview ? ' · buyer preview' : ''}</p></div>
        <div className="ml-auto flex gap-2">{v && <Badge>{v.status}</Badge>}{v?._compliance && <Badge>{v._compliance.status}</Badge>}</div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="RFQs to quote" value={toQuote.length} tone="blue" /><Kpi label="Work orders to accept" value={myWos.filter((w) => w.acceptance?.status === 'Pending').length} tone="violet" />
        <Kpi label="Amount due to you" value={fmtINR(due)} tone="teal" /><Kpi label="Documents to renew" value={renew} tone={renew ? 'red' : 'green'} />
      </div>
      {v?._paymentGate === 'Blocked' && <Notice tone="red" title="Payments to you are on hold until these items are fixed" items={(v._compliance?.blocking ?? []).map((i: Doc) => `${i.name}: ${i.note}`)} />}
      <div className="card overflow-hidden">
        <Tabs value={tab} onChange={setTab} tabs={[{ id: 'rfqs', label: 'RFQs', count: rfqs.data?.length }, { id: 'pos', label: 'Purchase orders', count: mine(pos.data).length }, { id: 'wos', label: 'Work orders', count: myWos.length }, { id: 'claims', label: 'RA claims', count: mine(claims.data).length }, { id: 'bills', label: 'Bills & payments', count: mine(invoices.data).length }, { id: 'docs', label: 'Documents' }, { id: 'queries', label: 'Queries', count: mine(tickets.data).length }]} />
        <div className="flex h-[440px] flex-col">
          {tab === 'rfqs' && (
            <DataTable rows={rfqs.data} empty={{ title: 'No RFQs yet', text: "Requests for quotation you're invited to will appear here." }}
              columns={[
                { key: 'title', header: 'RFQ', render: (r) => <div><div className="font-medium">{r.title}</div><div className="text-[12px] text-ink-mute">{r.id} · {r.project}</div></div> },
                { key: 'dueDate', header: 'Due', render: (r) => fmtDate(r.dueDate) },
                { key: 'mine', header: 'Your response', value: (r) => (r.myQuote ? `Quoted ${r.myQuote.quoteNo}` : r.myResponse?.status ?? 'Invited'), render: (r) => <Badge>{r.myQuote ? 'Quoted' : r.myResponse?.status ?? 'Invited'}</Badge> },
                { key: 'award', header: 'Awarded to you', value: (r) => r.awardedToMe.map((a: Doc) => a.poId).join(', ') || '—' },
                { key: 'act', header: '', sortable: false, render: (r) => act && ['Sent', 'Quotes Received'].includes(r.status) && r.dueDate >= todayISO() && (
                  <span className="inline-flex gap-1">
                    <ActionForm className="btn btn-primary btn-sm" label={r.myQuote ? 'Revise quote' : 'Submit quote'} title={`Quote for ${r.id} — ${r.title}`} path={`/rfqs/${r.id}/quotes`} wide
                      transform={(x) => ({ vendorId, quoteNo: x.quoteNo, validUntil: x.validUntil, deliveryDays: x.deliveryDays, gstPct: x.gstPct, note: x.note, rates: r.items.map((_: Doc, i: number) => x[`rate${i}`] ?? null) })}
                      fields={[{ name: 'quoteNo', label: 'Your quote no.', required: true }, { name: 'validUntil', label: 'Valid until', type: 'date', required: true }, { name: 'deliveryDays', label: 'Delivery (days)', type: 'number', required: true }, { name: 'gstPct', label: 'GST %', type: 'number', default: 18 },
                        ...r.items.map((it: Doc, i: number) => ({ name: `rate${i}`, label: `${it.desc} — ${it.qty} ${it.unit} (rate per ${it.unit}; empty = no bid)`, type: 'number' as const })), { name: 'note', label: 'Note', type: 'textarea' }]} />
                    {!r.myQuote && <ActionButton className="btn btn-sm" label="Decline" path={`/rfqs/${r.id}/decline`} confirm="Decline this RFQ?" />}
                  </span>
                ) },
              ]} />
          )}
          {tab === 'pos' && <DataTable rows={mine(pos.data)} columns={[{ key: 'id', header: 'PO' }, { key: 'items', header: 'Items', value: (r) => r.lines.map((l: Doc) => l.desc).join(', ') }, { key: 'deliveryDate', header: 'Deliver by', render: (r) => fmtDate(r.deliveryDate) }, { key: 'value', header: 'Value', align: 'right', value: (r) => r._value, render: (r) => fmtINR(r._value) }, { key: 'status', header: 'Status', value: (r) => r._status, render: (r) => <Badge>{r._status}</Badge> }]} />}
          {tab === 'wos' && (
            <DataTable rows={myWos} columns={[
              { key: 'id', header: 'WO' }, { key: 'title', header: 'Scope' }, { key: 'period', header: 'Period', value: (r) => r.start, render: (r) => `${fmtDate(r.start)} → ${fmtDate(r.end)}` },
              { key: 'value', header: 'Value', align: 'right', value: (r) => r._value, render: (r) => fmtINR(r._value) }, { key: 'acc', header: 'Acceptance', value: (r) => r.acceptance?.status, render: (r) => <Badge>{r.acceptance?.status}</Badge> },
              { key: 'act', header: '', sortable: false, render: (r) => act && r.acceptance?.status === 'Pending' && (
                <span className="inline-flex gap-1"><ActionButton className="btn btn-primary btn-sm" label="Accept" path={`/work-orders/${r.id}/acceptance`} body={{ decision: 'Accepted' }} confirm={`Accept ${r.id}?`} />
                  <ActionForm className="btn btn-sm" label="Reject" title={`Reject ${r.id}`} path={`/work-orders/${r.id}/acceptance`} transform={(x) => ({ ...x, decision: 'Rejected' })} fields={[{ name: 'note', label: 'Reason', type: 'textarea', required: true }]} /></span>
              ) },
            ]} />
          )}
          {tab === 'claims' && (
            <DataTable rows={mine(claims.data)} empty={{ title: 'No claims yet' }}
              toolbar={act && myWos.some((w) => w.status === 'In Progress') && (
                <ActionForm className="btn btn-primary btn-sm" label="Submit RA claim" title="Submit a running-account claim" path="/claims"
                  transform={(x) => ({ woId: x.woId, periodFrom: x.periodFrom, periodTo: x.periodTo, note: x.note, lines: [{ lineId: x.lineId, qty: x.qty, pct: x.pct, location: x.location }] })}
                  fields={[{ name: 'woId', label: 'Work order', type: 'select', required: true, options: myWos.filter((w) => w.status === 'In Progress').map((w) => ({ value: w.id, label: `${w.id} — ${w.title}` })) },
                    { name: 'lineId', label: 'Line / milestone id', required: true, placeholder: 'e.g. A3 or M4' }, { name: 'qty', label: 'Quantity (item-rate)', type: 'number' }, { name: 'pct', label: 'Cumulative % (lump sum)', type: 'number' },
                    { name: 'location', label: 'Location', required: true }, { name: 'periodFrom', label: 'Period from', type: 'date', required: true }, { name: 'periodTo', label: 'Period to', type: 'date', required: true }, { name: 'note', label: 'Note', type: 'textarea' }]} />
              )}
              columns={[{ key: 'id', header: 'Claim' }, { key: 'woId', header: 'WO' }, { key: 'period', header: 'Period', value: (r) => r.periodFrom, render: (r) => `${fmtDate(r.periodFrom)} → ${fmtDate(r.periodTo)}` }, { key: 'lines', header: 'Lines', value: (r) => r.lines.length }, { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> }]} />
          )}
          {tab === 'bills' && <DataTable rows={mine(invoices.data)} columns={[{ key: 'number', header: 'Bill' }, { key: 'date', header: 'Date', render: (r) => fmtDate(r.date) }, { key: 'amount', header: 'Amount', align: 'right', value: (r) => r._totals.payable, render: (r) => fmtINR(r._totals.payable) }, { key: 'paid', header: 'Paid', align: 'right', value: (r) => r._totals.paid, render: (r) => fmtINR(r._totals.paid) }, { key: 'due', header: 'Due', render: (r) => fmtDate(r.due) }, { key: 'status', header: 'Status', value: (r) => r._status, render: (r) => <Badge>{r._status}</Badge> }]} />}
          {tab === 'docs' && v && (
            <DataTable rows={(v._compliance?.items ?? []).map((i: Doc) => ({ ...i, id: i.name }))}
              toolbar={act && <ActionForm className="btn btn-primary btn-sm" label="Upload / renew document" title="Upload a document" path={`/vendors/${vendorId}/docs`} fields={[{ name: 'name', label: 'Document', type: 'select', required: true, options: (settings?.complianceDocs ?? []).map((d: Doc) => d.name) }, { name: 'file', label: 'File name / reference', required: true }, { name: 'expiry', label: 'Expiry', type: 'date' }]} />}
              columns={[{ key: 'name', header: 'Requirement' }, { key: 'kind', header: 'Kind' }, { key: 'note', header: 'Status', render: (r) => <Badge tone={r.level === 0 ? 'green' : r.level === 1 ? 'amber' : 'red'}>{r.level === 0 ? 'OK' : r.note}</Badge> }, { key: 'expiry', header: 'Expiry', render: (r) => fmtDate(r.expiry) }]} />
          )}
          {tab === 'queries' && (
            <DataTable rows={mine(tickets.data)} empty={{ title: 'No queries' }}
              toolbar={act && <ActionForm className="btn btn-primary btn-sm" label="Raise query" title="Raise a query" path="/tickets" fields={[{ name: 'subject', label: 'Subject', required: true }, { name: 'body', label: 'Message', type: 'textarea', required: true }]} />}
              columns={[{ key: 'id', header: 'Query' }, { key: 'subject', header: 'Subject' }, { key: 'raisedOn', header: 'Raised', render: (r) => fmtDate(r.raisedOn) }, { key: 'replies', header: 'Replies', value: (r) => r.replies?.length ?? 0 }, { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
                { key: 'act', header: '', sortable: false, render: (r) => <ActionForm className="btn btn-sm" label="Reply" title={r.subject} path={`/tickets/${r.id}/reply`} fields={[{ name: 'text', label: 'Reply', type: 'textarea', required: true }, ...(preview ? [{ name: 'close', label: 'Close the query', type: 'checkbox' as const }] : [])]}>
                  <div className="space-y-2 rounded-lg bg-gray-50 p-3 text-[13px]"><p>{r.body}</p>{(r.replies ?? []).map((x: Doc, i: number) => <p key={i} className="border-t border-line pt-2"><b>{x.by}</b>: {x.text}</p>)}</div></ActionForm> }]} />
          )}
        </div>
      </div>
    </div>
  );
}

/** Buyer-side preview (Vendor Management → Vendor Portal). */
export function PortalPreview() {
  const vendors = useVendors();
  const [vid, setVid] = useState('VEN-001');
  return (
    <Page title="Vendor Portal" icon={Globe} scroll
      actions={<label className="flex items-center gap-2 text-[13px]">Viewing as<select className="input w-64" value={vid} onChange={(e) => setVid(e.target.value)}>{(vendors.data ?? []).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>}>
      <PortalView vendorId={vid} preview />
    </Page>
  );
}

/** What a signed-in vendor sees. */
export function VendorPortalShell() {
  const { user, logout } = useAuth();
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 items-center gap-3 border-b border-line bg-white px-4">
        <div className="flex items-center gap-2 text-[17px] font-bold text-brand"><Logo />NebullaONE <span className="text-[13px] font-medium text-ink-mute">Supplier portal</span></div>
        <div className="ml-auto flex items-center gap-3 text-[13px]">{user?.name}<button className="btn btn-ghost btn-sm" onClick={logout} aria-label="Sign out"><LogOut size={16} /></button></div>
      </header>
      <main className="flex-1 overflow-y-auto">{user?.vendorId && <PortalView vendorId={user.vendorId} />}</main>
    </div>
  );
}
