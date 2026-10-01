import { useQueryClient } from '@tanstack/react-query';
import { Plus, Receipt, Wallet } from 'lucide-react';
import { useState } from 'react';
import { ActionForm } from '../../components/ActionForm';
import { AuditTrail } from '../../components/AuditTrail';
import { DataTable } from '../../components/DataTable';
import { FormModal } from '../../components/FormModal';
import { Page } from '../../components/Layout';
import { Badge, Drawer, KV, Modal, Notice, Tabs } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useDoc, useList, type Doc } from '../../lib/data';
import { cls, fmtDate, fmtINR, todayISO } from '../../lib/format';
import { useVendors, vendorOptions } from '../../lib/hooks';

export function Invoices() {
  const rows = useList('invoices');
  const adv = useList('vendorAdvances');
  const vendors = useVendors();
  const { can } = useAuth();
  const [tab, setTab] = useState<'bills' | 'advances'>('bills');
  const [open, setOpen] = useState<string | null>(null);
  const outstanding = (rows.data ?? []).reduce((s, i) => s + Math.max(0, i._totals?.balance ?? 0), 0);
  return (
    <Page title="Invoices & Payments" icon={Receipt}
      actions={can('finance') && (
        <>
          <ActionForm label={<><Wallet size={14} />Record advance</>} title="Record vendor advance" path="/vendor-advances"
            fields={[{ name: 'vendorId', label: 'Vendor', type: 'select', required: true, options: vendorOptions(vendors.data, (v) => v.status === 'Active') }, { name: 'amount', label: 'Amount (₹)', type: 'number', required: true }, { name: 'date', label: 'Date', type: 'date', required: true, default: todayISO() }, { name: 'ref', label: 'UTR / reference', required: true }, { name: 'note', label: 'Note', type: 'textarea' }]} />
          <EnterBill />
        </>
      )}
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'bills', label: 'Bills', count: rows.data?.length }, { id: 'advances', label: 'Advances', count: adv.data?.length }]} />}>
      {tab === 'bills' ? (
        <DataTable rows={rows.data} loading={rows.isLoading} onRowClick={(r) => setOpen(r.id)} exportName="bills"
          filters={[{ label: 'Status', options: ['Unpaid', 'Partially Paid', 'Overdue', 'On Hold', 'Paid', 'Awaiting Review'], value: (r) => r._status }, { label: 'Source', options: ['RA Bill', 'Purchase Order', 'Retention Release', 'Direct'], value: (r) => r.source }]}
          footer={<span><b className="text-ink">{fmtINR(outstanding)}</b> outstanding</span>}
          columns={[
            { key: 'vendor', header: 'Vendor', value: (r) => vendors.name(r.vendorId), render: (r) => <span className="font-medium">{vendors.name(r.vendorId)}</span> },
            { key: 'against', header: 'Against', value: (r) => r._against, render: (r) => <div><div className="max-w-[280px] truncate">{r._against}</div><div className="text-[12px] text-ink-mute">{r.poId ?? r.raBillId ?? r.releaseId ?? 'Direct'}</div></div> },
            { key: 'number', header: 'Vendor bill no.', value: (r) => (r.source === 'RA Bill' ? 'Auto (from RA bill)' : r.number) },
            { key: 'amount', header: 'Amount', align: 'right', value: (r) => r._totals.payable, render: (r) => fmtINR(r._totals.payable) },
            { key: 'balance', header: 'Balance', align: 'right', value: (r) => r._totals.balance, render: (r) => fmtINR(r._totals.balance) },
            { key: 'due', header: 'Next due', render: (r) => <span className={r._status === 'Overdue' ? 'text-red-600' : ''}>{fmtDate(r.due)}</span> },
            { key: 'match', header: 'Match', value: (r) => r._match.status, render: (r) => <Badge tone={r._match.status.startsWith('Matched') ? 'green' : r._match.status === 'Mismatch' ? 'red' : 'amber'}>{r._match.status}</Badge> },
            { key: 'should', header: 'Should pay', value: (r) => (r._shouldPay ? 'Yes' : 'No'), render: (r) => (r._shouldPay ? <b className="text-green-700">Yes</b> : r._blockedBy?.length && r._totals.balance > 0.5 ? <span className="text-red-600" title={r._blockedBy.join('\n')}>Blocked</span> : 'No') },
            { key: 'status', header: 'Status', value: (r) => r._status, render: (r) => <Badge>{r._status}</Badge> },
          ]} />
      ) : (
        <DataTable rows={adv.data} loading={adv.isLoading} exportName="advances" empty={{ title: 'No vendor advances' }}
          columns={[
            { key: 'id', header: 'Advance' }, { key: 'vendor', header: 'Vendor', value: (r) => vendors.name(r.vendorId) }, { key: 'date', header: 'Date', render: (r) => fmtDate(r.date) },
            { key: 'amount', header: 'Amount', align: 'right', render: (r) => fmtINR(r.amount) },
            { key: 'allocated', header: 'Allocated', align: 'right', value: (r) => (r.allocated ?? []).reduce((s: number, a: Doc) => s + a.amount, 0), render: (r) => fmtINR((r.allocated ?? []).reduce((s: number, a: Doc) => s + a.amount, 0)) },
            { key: 'ref', header: 'Reference' }, { key: 'note', header: 'Note' },
            { key: 'act', header: '', sortable: false, render: (r) => can('finance') && (r.allocated ?? []).reduce((s: number, a: Doc) => s + a.amount, 0) < r.amount && (
              <ActionForm className="btn btn-sm" label="Allocate" title="Allocate advance to a bill" path={`/vendor-advances/${r.id}/allocate`}
                fields={[{ name: 'invoiceId', label: 'Bill', type: 'select', required: true, options: (rows.data ?? []).filter((i) => i.vendorId === r.vendorId && i._totals.balance > 0.5).map((i) => ({ value: i.id, label: `${i.number} — balance ${fmtINR(i._totals.balance)}` })) }, { name: 'amount', label: 'Amount', type: 'number', required: true }]} />
            ) },
          ]} />
      )}
      <BillDrawer id={open} onClose={() => setOpen(null)} />
    </Page>
  );
}

function EnterBill() {
  const pos = useList('purchaseOrders');
  const vendors = useVendors();
  const qc = useQueryClient();
  const [step, setStep] = useState<'closed' | 'pick' | 'form'>('closed');
  const [poId, setPoId] = useState('');
  const [direct, setDirect] = useState(false);
  const po = (pos.data ?? []).find((p) => p.id === poId);
  const billable = (pos.data ?? []).filter((p) => !['Cancelled', 'Draft'].includes(p.status) && p._billing !== 'Fully Billed');
  return (
    <>
      <button className="btn btn-primary" onClick={() => { setStep('pick'); setPoId(''); setDirect(false); }}><Plus size={14} />Enter vendor bill</button>
      <Modal open={step === 'pick'} onClose={() => setStep('closed')} title="Enter vendor bill"
        footer={<><button className="btn" onClick={() => setStep('closed')}>Cancel</button><button className="btn btn-primary" disabled={!poId && !direct} onClick={() => setStep('form')}>Continue</button></>}>
        <div className="space-y-3">
          <label className="block"><span className="label">Purchase order</span>
            <select className="input" value={poId} onChange={(e) => { setPoId(e.target.value); setDirect(false); }}>
              <option value="">Select a PO…</option>
              {billable.map((p) => <option key={p.id} value={p.id}>{p.id} — {vendors.name(p.vendorId)} — {p.lines[0]?.desc} ({p._billing})</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={direct} onChange={(e) => { setDirect(e.target.checked); setPoId(''); }} />Bill without a PO (only for vendors exempted in their profile)</label>
          <p className="text-[12px] text-ink-mute">PO bills are 3-way matched: billed quantity against accepted goods / service receipts, and rate against the PO. Settings decide whether a mismatch stops or warns.</p>
        </div>
      </Modal>
      <FormModal open={step === 'form'} onClose={() => setStep('closed')} title={po ? `Bill against ${po.id} — ${vendors.name(po.vendorId)}` : 'Direct bill (no PO)'} submitLabel="Save bill"
        fields={[
          ...(direct ? [{ name: 'vendorId', label: 'Vendor', type: 'select' as const, required: true, options: vendorOptions(vendors.data, (v) => v.allowBillWithoutPO) }] : []),
          { name: 'number', label: 'Vendor bill no.', required: true }, { name: 'date', label: 'Bill date', type: 'date', required: true, default: todayISO() },
          { name: 'gstPct', label: 'GST %', type: 'number', default: po?.gstPct ?? 18 },
          ...(po ? po._lines.flatMap((l: Doc, i: number) => [
            { name: `q${i}`, label: `${l.desc} — qty billed (${l.unit}; accepted ${l.accepted}${po.kind === 'Service' ? ' via SES' : ''})`, type: 'number' as const },
            { name: `r${i}`, label: `${l.desc} — rate (PO ₹${l.rate})`, type: 'number' as const, default: l.rate },
          ]) : [{ name: 'amount', label: 'Amount incl. GST (₹)', type: 'number' as const, required: true }, { name: 'description', label: 'Description', type: 'textarea' as const }]),
        ]}
        onSubmit={async (v) => {
          const body = po
            ? { vendorId: po.vendorId, poId: po.id, number: v.number, date: v.date, gstPct: v.gstPct, lines: po._lines.map((_: Doc, i: number) => ({ line: i, qty: v[`q${i}`], rate: v[`r${i}`] })).filter((l: Doc) => l.qty > 0) }
            : { vendorId: v.vendorId, number: v.number, date: v.date, gstPct: v.gstPct, amount: v.amount, description: v.description };
          await api('/invoices', { body });
          await qc.invalidateQueries();
        }} />
    </>
  );
}

function BillDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: i } = useDoc('invoices', id);
  const vendors = useVendors();
  const { can } = useAuth();
  const [tab, setTab] = useState<'bill' | 'activity'>('bill');
  if (!id || !i) return null;
  const t = i._totals;
  return (
    <Drawer open onClose={onClose} title={`${i.number} · ${vendors.name(i.vendorId)}`} subtitle={<span className="flex items-center gap-2">{i.id} · {i.source} <Badge>{i._status}</Badge></span>}
      actions={<>
        {t.balance > 0.5 && can('finance') && i._status !== 'Awaiting Review' && (
          <ActionForm className="btn btn-primary btn-sm" label="Record payment" title={`Pay ${i.number}`} path={`/invoices/${i.id}/pay`} initial={{ amount: t.balance, date: todayISO() }}
            description={i._blockedBy?.length ? <Notice tone="amber" title="This vendor has active controls" items={i._blockedBy} /> : 'All holds and the compliance gate are checked again when you save.'}
            fields={[{ name: 'amount', label: 'Amount (₹)', type: 'number', required: true }, { name: 'tds', label: 'TDS withheld (₹)', type: 'number', default: 0 }, { name: 'date', label: 'Payment date', type: 'date', required: true }, { name: 'mode', label: 'Mode', type: 'select', required: true, default: 'NEFT', options: ['NEFT', 'RTGS', 'IMPS', 'Cheque', 'UPI'] }, { name: 'ref', label: 'UTR / cheque no.', required: true }]} />
        )}
        {t.balance > 0.5 && can('finance', 'procurement') && (
          <ActionForm className="btn btn-sm" label="Debit / credit note" title="Raise a note" path={`/invoices/${i.id}/notes`}
            fields={[{ name: 'type', label: 'Type', type: 'select', required: true, default: 'Debit Note', options: ['Debit Note', 'Credit Note'] }, { name: 'amount', label: 'Amount (₹)', type: 'number', required: true }, { name: 'reason', label: 'Reason', type: 'textarea', required: true }]} />
        )}
        {i._status === 'Awaiting Review' && can('finance') && (
          <ActionForm className="btn btn-sm" label="Review" title="Review direct bill" path={`/invoices/${i.id}/review`} fields={[{ name: 'decision', label: 'Decision', type: 'select', required: true, options: ['Approved', 'Rejected'] }, { name: 'remark', label: 'Remark', type: 'textarea' }]} />
        )}
      </>}>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'bill', label: 'Bill' }, { id: 'activity', label: 'Activity' }]} />
      {tab === 'bill' ? (
        <div className="space-y-4 p-5">
          {i._blockedBy?.length > 0 && t.balance > 0.5 && <Notice tone="red" title="Payment blocked" items={i._blockedBy} />}
          <KV rows={[['Bill date', fmtDate(i.date)], ['Due', fmtDate(i.due)], ['Taxable', fmtINR(t.taxable)], ['GST', fmtINR(t.gst)], ['Notes (debit − / credit +)', fmtINR(t.notes)], ['Payable', fmtINR(t.payable)], ['Paid (incl. TDS)', fmtINR(t.paid)], ['Balance', <b key="b">{fmtINR(t.balance)}</b>]]} />
          <div>
            <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold">3-way match <Badge tone={i._match.status.startsWith('Matched') ? 'green' : i._match.status === 'Mismatch' ? 'red' : 'amber'}>{i._match.status}</Badge></div>
            {i._match.rows.length > 0 && (
              <table className="tbl w-full"><thead><tr><th>Line</th><th className="text-right">PO qty</th><th className="text-right">Accepted</th><th className="text-right">Billed</th><th className="text-right">PO rate</th><th className="text-right">Bill rate</th></tr></thead>
                <tbody>{i._match.rows.map((r: Doc, k: number) => <tr key={k}><td>{r.desc}</td><td className="text-right num">{r.poQty}</td><td className="text-right num">{r.receivedQty}</td><td className={cls('text-right num', !r.qtyOk && 'font-semibold text-red-600')}>{r.invQty}</td><td className="text-right num">{fmtINR(r.poRate)}</td><td className={cls('text-right num', !r.rateOk && 'font-semibold text-red-600')}>{fmtINR(r.invRate)}</td></tr>)}</tbody>
              </table>
            )}
          </div>
          {(i.notes ?? []).length > 0 && <div><div className="label">Notes</div>{i.notes.map((n: Doc) => <div key={n.id} className="text-[13px]">{n.id} · {n.type} {fmtINR(n.amount)} — {n.reason}</div>)}</div>}
          <div><div className="label">Payments</div>{(i.payments ?? []).length ? (
            <table className="tbl w-full"><thead><tr><th>Payment</th><th>Date</th><th>Mode</th><th>Reference</th><th className="text-right">Amount</th><th className="text-right">TDS</th></tr></thead>
              <tbody>{i.payments.map((p: Doc) => <tr key={p.id}><td>{p.id}{p.overridden ? <span className="ml-1 text-[11px] text-amber-700" title={p.overridden}>(override)</span> : null}</td><td>{fmtDate(p.date)}</td><td>{p.mode}</td><td>{p.ref}</td><td className="text-right num">{fmtINR(p.amount)}</td><td className="text-right num">{fmtINR(p.tds)}</td></tr>)}</tbody>
            </table>) : <p className="text-[13px] text-ink-mute">No payments yet.</p>}
          </div>
        </div>
      ) : <AuditTrail entity="invoices" refId={i.id} />}
    </Drawer>
  );
}
