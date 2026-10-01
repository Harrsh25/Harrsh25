import { useQueryClient } from '@tanstack/react-query';
import { Coins, FileCheck2, Landmark, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ActionButton, ActionForm } from '../../components/ActionForm';
import { AuditTrail } from '../../components/AuditTrail';
import { DataTable } from '../../components/DataTable';
import { Page } from '../../components/Layout';
import { Badge, Drawer, KV, Modal, Notice, Tabs } from '../../components/ui';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useDoc, useList, type Doc } from '../../lib/data';
import { cls, fmtDate, fmtINR, fmtINRShort, fmtNum, todayISO } from '../../lib/format';
import { useVendors, vendorOptions } from '../../lib/hooks';

// ── RA bills & certification (stages 20B–21) ─────────────────────────────────
export function RaBills() {
  const rows = useList('raBills');
  const claims = useList('claims');
  const vendors = useVendors();
  const { can } = useAuth();
  const [tab, setTab] = useState<'bills' | 'claims'>('bills');
  const [open, setOpen] = useState<string | null>(null);
  const list = rows.data ?? [];
  return (
    <Page title="RA Bills & Certification" icon={FileCheck2}
      actions={can('project') && <PrepareRaBill onDone={(id) => setOpen(id)} />}
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'bills', label: 'RA bills', count: list.length }, { id: 'claims', label: 'Contractor claims', count: (claims.data ?? []).filter((c) => c.status === 'Submitted').length }]} />}>
      {tab === 'bills' ? (
        <DataTable rows={[...list].reverse()} loading={rows.isLoading} onRowClick={(r) => setOpen(r.id)} exportName="ra-bills"
          filters={[{ label: 'Status', options: ['Submitted', 'Verified', 'Certified', 'Approved', 'Paid', 'Returned', 'Rejected'], value: (r) => r.status }]}
          footer={<span><b className="text-ink">{fmtINRShort(list.reduce((s, b) => s + b.gross, 0))}</b> gross · <b className="text-ink">{fmtINRShort(list.reduce((s, b) => s + b.net, 0))}</b> net payable</span>}
          columns={[
            { key: 'id', header: 'Bill' }, { key: 'seq', header: 'RA no.', value: (r) => `RA-${r.seq}` },
            { key: 'wo', header: 'Work order', value: (r) => `${r.woId} · ${r._vendorName}` }, { key: 'type', header: 'Type', value: (r) => r._woType },
            { key: 'date', header: 'Bill date', render: (r) => fmtDate(r.date) },
            { key: 'gross', header: 'Gross (work done)', align: 'right', render: (r) => fmtINR(r.gross) },
            // B5: GST is its own column so Net > Gross is no longer confusing.
            { key: 'gst', header: '+ GST', align: 'right', render: (r) => fmtINR(r.gst) },
            { key: 'ded', header: '− Deductions', align: 'right', value: (r) => r.totalDed, render: (r) => <span className="text-red-700">− {fmtINR(r.totalDed)}</span> },
            { key: 'net', header: '= Net payable', align: 'right', render: (r) => <b>{fmtINR(r.net)}</b> },
            { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
          ]} />
      ) : (
        <DataTable rows={claims.data} loading={claims.isLoading} exportName="claims" empty={{ title: 'No contractor claims' }}
          columns={[
            { key: 'id', header: 'Claim' }, { key: 'woId', header: 'WO' }, { key: 'vendor', header: 'Contractor', value: (r) => vendors.name(r.vendorId) },
            { key: 'period', header: 'Period', value: (r) => r.periodFrom, render: (r) => `${fmtDate(r.periodFrom)} → ${fmtDate(r.periodTo)}` },
            { key: 'lines', header: 'Claimed', value: (r) => r.lines.map((l: Doc) => `${l.lineId}: ${l.qty ?? `${l.pct}%`} @ ${l.location}`).join('; '), render: (r) => <span className="text-[12.5px]">{r.lines.map((l: Doc) => `${l.lineId}: ${l.qty ?? `${l.pct}%`} — ${l.location}`).join(' · ')}</span> },
            { key: 'note', header: 'Note' }, { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
            { key: 'act', header: '', sortable: false, render: (r) => r.status === 'Submitted' && can('project') && (
              <span className="inline-flex gap-1">
                <ActionForm className="btn btn-sm" label="Accept" title={`Accept ${r.id}`} description="Accepted lines become measurement-book entries that still need joint measurement and QC before billing." path={`/claims/${r.id}/decision`} transform={(v) => ({ ...v, decision: 'Approved' })} fields={[{ name: 'remark', label: 'Remark', type: 'textarea' }]} />
                <ActionForm className="btn btn-sm" label="Reject" title={`Reject ${r.id}`} path={`/claims/${r.id}/decision`} transform={(v) => ({ ...v, decision: 'Rejected' })} fields={[{ name: 'remark', label: 'Reason', type: 'textarea', required: true }]} />
              </span>
            ) },
          ]} />
      )}
      <RaDrawer id={open} onClose={() => setOpen(null)} />
    </Page>
  );
}

function PrepareRaBill({ onDone }: { onDone: (id: string) => void }) {
  const wos = useList('workOrders');
  const ms = useList('measurements');
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [woId, setWoId] = useState('');
  const [sel, setSel] = useState<string[]>([]);
  const [extra, setExtra] = useState({ penalty: 0, other: 0, otherNote: '' });
  const [preview, setPreview] = useState<Doc | null>(null);
  const [err, setErr] = useState<ApiError | null>(null);
  const eligible = (ms.data ?? []).filter((m) => m.woId === woId && !m.billedIn && m.jms?.status === 'Signed');
  const waiting = (ms.data ?? []).filter((m) => m.woId === woId && !m.billedIn && m.jms?.status !== 'Signed');
  const body = { woId, mbIds: sel, penalty: extra.penalty || 0, other: extra.other || 0, otherNote: extra.otherNote };
  const run = async (save: boolean) => {
    setErr(null);
    try {
      if (save) { const b = await api('/ra-bills', { body }); await qc.invalidateQueries(); setOpen(false); onDone(b.id); }
      else setPreview(await api('/ra-bills/preview', { body }));
    } catch (e) { setErr(e as ApiError); setPreview(null); }
  };
  return (
    <>
      <button className="btn btn-primary" onClick={() => { setOpen(true); setWoId(''); setSel([]); setPreview(null); setErr(null); }}><Plus size={14} />Prepare RA bill</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Prepare RA bill" wide
        footer={<><button className="btn" onClick={() => setOpen(false)}>Cancel</button><button className="btn" disabled={!sel.length} onClick={() => run(false)}>Preview</button><button className="btn btn-primary" disabled={!preview} onClick={() => run(true)}>Submit bill</button></>}>
        <div className="space-y-4">
          <label className="block"><span className="label">Work order</span>
            <select className="input" value={woId} onChange={(e) => { setWoId(e.target.value); setSel([]); setPreview(null); }}>
              <option value="">Select…</option>{(wos.data ?? []).filter((w) => w.status === 'In Progress').map((w) => <option key={w.id} value={w.id}>{w.id} — {w.title} ({w._vendorName})</option>)}
            </select>
          </label>
          {woId && (
            <div>
              <div className="label">Measurements to bill (JMS signed, not yet billed)</div>
              {!eligible.length ? <p className="text-[13px] text-ink-mute">Nothing signed and unbilled on this work order.</p> : (
                <div className="max-h-[220px] overflow-y-auto rounded-lg border border-line">
                  {eligible.map((m) => (
                    <label key={m.id} className="flex items-center gap-3 border-b border-line px-3 py-2 text-[13px] last:border-0">
                      <input type="checkbox" checked={sel.includes(m.id)} onChange={(e) => { setSel(e.target.checked ? [...sel, m.id] : sel.filter((x) => x !== m.id)); setPreview(null); }} />
                      <span className="w-16 font-medium">{m.id}</span><span className="flex-1">{m.location}</span><span className="num">{m.pct != null ? `${m.pct}% cum.` : fmtNum(m.qty)}</span>
                      <Badge tone={['Passed', 'Not required'].includes(m.qc?.status) ? 'green' : 'amber'}>QC {m.qc?.status}</Badge>
                    </label>
                  ))}
                </div>
              )}
              {waiting.length > 0 && <p className="mt-1 text-[12px] text-ink-mute">{waiting.length} more measurement(s) awaiting joint measurement sign-off.</p>}
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <label className="block"><span className="label">Penalty (₹)</span><input className="input" type="number" value={extra.penalty} onChange={(e) => { setExtra({ ...extra, penalty: Number(e.target.value) }); setPreview(null); }} /></label>
            <label className="block"><span className="label">Other deduction (₹)</span><input className="input" type="number" value={extra.other} onChange={(e) => { setExtra({ ...extra, other: Number(e.target.value) }); setPreview(null); }} /></label>
            <label className="block"><span className="label">Other — reason</span><input className="input" value={extra.otherNote} onChange={(e) => setExtra({ ...extra, otherNote: e.target.value })} /></label>
          </div>
          {err && <Notice tone="red" title={err.message} items={err.blocking} />}
          {preview && <RaSummary b={preview} />}
        </div>
      </Modal>
    </>
  );
}

function RaSummary({ b }: { b: Doc }) {
  const d = b.ded ?? {};
  return (
    <div className="space-y-3">
      {b.warnings?.length > 0 && <Notice tone="amber" title="Check before submitting" items={b.warnings} />}
      <table className="tbl w-full"><thead><tr><th>Line</th><th className="text-right">Previous</th><th className="text-right">This bill</th><th className="text-right">Cumulative</th><th className="text-right">Amount</th></tr></thead>
        <tbody>{b.lines.map((l: Doc) => <tr key={l.lineId}><td>{l.code ? `${l.code} · ` : ''}{l.desc}</td><td className="text-right num">{l.prevPct != null ? `${l.prevPct}%` : fmtNum(l.prevQty)}</td><td className="text-right num">{l.thisPct != null ? `${l.thisPct}%` : fmtNum(l.thisQty)}</td><td className="text-right num">{l.cumPct != null ? `${l.cumPct}%` : `${fmtNum(l.cumQty)} / ${fmtNum(l.woQty)}`}</td><td className="text-right num">{fmtINR(l.amount)}</td></tr>)}</tbody>
      </table>
      <div className="ml-auto max-w-[420px] space-y-1 rounded-lg border border-line p-3 text-[13px]">
        <Line k="Gross (work done)" v={b.gross} bold /><Line k="+ GST" v={b.gst} />
        <Line k="− Retention" v={-d.retention} /><Line k="− Advance recovery" v={-d.advance} />{d.securityDeposit ? <Line k="− Security deposit" v={-d.securityDeposit} /> : null}
        <Line k="− TDS" v={-d.tds} /><Line k="− Labour cess" v={-d.cess} />{d.materials ? <Line k="− Free-issue material" v={-d.materials} /> : null}{d.penalty ? <Line k="− Penalty" v={-d.penalty} /> : null}{d.other ? <Line k="− Other" v={-d.other} /> : null}
        <div className="border-t border-line pt-1"><Line k="= Net payable" v={b.net} bold /></div>
      </div>
    </div>
  );
}
const Line = ({ k, v, bold }: { k: string; v: number; bold?: boolean }) => <div className={cls('flex justify-between', bold && 'font-semibold')}><span className="text-ink-soft">{k}</span><span className="num">{fmtINR(v)}</span></div>;

const NEXT: Record<string, { to: string; label: string; roles: string[] }[]> = {
  Submitted: [{ to: 'Verified', label: 'Verify', roles: ['project', 'qa_hse'] }],
  Verified: [{ to: 'Certified', label: 'Certify (QS)', roles: ['project', 'procurement'] }],
  Certified: [{ to: 'Approved', label: 'Approve for payment', roles: ['project', 'finance'] }],
  Returned: [{ to: 'Submitted', label: 'Resubmit', roles: ['project'] }],
};

function RaDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: b } = useDoc('raBills', id);
  const { user, can } = useAuth();
  const [tab, setTab] = useState<'bill' | 'history' | 'activity'>('bill');
  if (!id || !b) return null;
  const actedBefore = (b.history ?? []).some((h: Doc) => String(h.by).startsWith(user?.name ?? '§')) || String(b.preparedBy ?? '').startsWith(user?.name ?? '§');
  return (
    <Drawer open onClose={onClose} title={`${b.id} · RA-${b.seq} · ${b.woId}`} subtitle={<span className="flex items-center gap-2">{b._vendorName} · {fmtDate(b.periodFrom)} → {fmtDate(b.periodTo)} <Badge>{b.status}</Badge></span>} width="max-w-[860px]"
      actions={<>
        {(NEXT[b.status] ?? []).filter((n) => can(...(n.roles as any))).map((n) => (
          <ActionForm key={n.to} className="btn btn-primary btn-sm" label={n.label} title={`${n.label} — ${b.id}`} path={`/ra-bills/${b.id}/transition`} transform={(v) => ({ ...v, to: n.to })} disabled={actedBefore && n.to !== 'Submitted'}
            description={actedBefore && n.to !== 'Submitted' ? 'You already acted on this bill; another person must take this step.' : n.to === 'Approved' ? 'Approval creates the payable in Invoices & Payments.' : undefined} fields={[{ name: 'remark', label: 'Remark', type: 'textarea' }]} />
        ))}
        {['Submitted', 'Verified', 'Certified'].includes(b.status) && can('project', 'qa_hse', 'procurement', 'finance') && <ActionForm className="btn btn-sm" label="Return" title="Return to site team" path={`/ra-bills/${b.id}/transition`} transform={(v) => ({ ...v, to: 'Returned' })} fields={[{ name: 'remark', label: 'Reason', type: 'textarea', required: true }]} />}
        {b.status === 'Submitted' && can('project') && <ActionForm className="btn btn-sm" danger label="Reject" title="Reject RA bill" description="Rejected measurements become available for a new bill." path={`/ra-bills/${b.id}/transition`} transform={(v) => ({ ...v, to: 'Rejected' })} fields={[{ name: 'remark', label: 'Reason', type: 'textarea', required: true }]} />}
      </>}>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'bill', label: 'Bill' }, { id: 'history', label: 'Certification trail' }, { id: 'activity', label: 'Activity' }]} />
      {tab === 'bill' && <div className="p-5"><RaSummary b={b} />{b.invoiceId && <p className="mt-3 text-[13px]">Payable: <b>{b.invoiceId}</b></p>}{b.otherNote && <p className="mt-1 text-[12.5px] text-ink-mute">Other deduction: {b.otherNote}</p>}<p className="mt-2 text-[12px] text-ink-mute">Measurements: {b.mbIds.join(', ')}</p></div>}
      {tab === 'history' && <ol className="space-y-3 p-5">{(b.history ?? []).map((h: Doc, i: number) => <li key={i} className="text-[13px]"><Badge>{h.status}</Badge> <span className="ml-2">{h.by}</span> <span className="text-ink-mute">· {fmtDate(h.at)}</span>{h.remark && <div className="mt-0.5 text-[12.5px] text-ink-mute">{h.remark}</div>}</li>)}</ol>}
      {tab === 'activity' && <AuditTrail entity="raBills" refId={b.id} />}
    </Drawer>
  );
}

// ── Retention, security deposit, advances & guarantees (FS ledger) ───────────
export function FinancialSecurity() {
  const contracts = useList('contracts');
  const releases = useList('retentionReleases');
  const bills = useList('raBills');
  const vendors = useVendors();
  const { can } = useAuth();
  const [tab, setTab] = useState<'ledger' | 'releases' | 'deductions' | 'bg'>('ledger');
  const rows = (contracts.data ?? []).filter((c) => c._fs && c.status !== 'Draft');
  const tot = rows.reduce((a, c) => ({ gross: a.gross + c._billed, ret: a.ret + c._fs.retentionBalance, sd: a.sd + c._fs.sdBalance, adv: a.adv + c._fs.advanceBalance }), { gross: 0, ret: 0, sd: 0, adv: 0 });
  const bgRows = rows.flatMap((c) => (c.guarantees ?? []).map((g: Doc) => ({ ...g, contractId: c.id, vendorId: c.vendorId, dlpEnd: c._dlpEnd, issue: (c._bgIssues ?? []).find((i: Doc) => i.guaranteeId === g.id), rowId: `${c.id}:${g.id}` })));
  const dedRows = (bills.data ?? []).filter((b) => b.status !== 'Rejected').map((b) => ({ ...b, ...Object.fromEntries(Object.entries(b.ded).map(([k, v]) => [`d_${k}`, v])) }));
  return (
    <Page title="Retention & Guarantees" icon={Landmark}
      actions={can('project') && (
        <ActionForm className="btn btn-primary" label={<><Plus size={14} />Request release</>} title="Request retention / security deposit release" path="/retention-releases"
          description="'After DLP' is only allowed once the DLP has really ended (calendar months from handover). Finance approves; approval creates the payable."
          fields={[
            { name: 'contractId', label: 'Contract', type: 'select', required: true, options: rows.map((c) => ({ value: c.id, label: `${c.id} — ${vendors.name(c.vendorId)} — retention ${fmtINR(c._fs.retentionBalance)} · SD ${fmtINR(c._fs.sdBalance)}` })) },
            { name: 'kind', label: 'What', type: 'select', default: 'Retention', options: ['Retention', 'Security Deposit'] },
            { name: 'type', label: 'Basis', type: 'select', required: true, options: ['On completion', 'After DLP', 'Against BG'] },
            { name: 'amount', label: 'Amount (₹)', type: 'number', required: true }, { name: 'note', label: 'Note', type: 'textarea' },
          ]} />
      )}
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'ledger', label: 'Contract ledger' }, { id: 'releases', label: 'Releases', count: releases.data?.length }, { id: 'deductions', label: 'Deduction register' }, { id: 'bg', label: 'Bank guarantees', count: bgRows.length }]} />}>
      {tab === 'ledger' && (
        <DataTable rows={rows} loading={contracts.isLoading} exportName="fs-ledger"
          footer={<span>Retention <b className="text-ink">{fmtINRShort(tot.ret)}</b> · SD <b className="text-ink">{fmtINRShort(tot.sd)}</b> · advance to recover <b className="text-ink">{fmtINRShort(tot.adv)}</b></span>}
          columns={[
            { key: 'c', header: 'Contract', value: (r) => `${r.id} ${vendors.name(r.vendorId)}`, render: (r) => <div><div className="font-medium">{r.id} · {vendors.name(r.vendorId)}</div><Badge>{r.status}</Badge></div> },
            { key: 'gross', header: 'Gross billed', align: 'right', value: (r) => r._billed, render: (r) => fmtINRShort(r._billed) },
            { key: 'rh', header: 'Retention held', align: 'right', value: (r) => r._fs.retentionHeld, render: (r) => fmtINRShort(r._fs.retentionHeld) },
            { key: 'rr', header: 'Released', align: 'right', value: (r) => r._fs.retentionReleased, render: (r) => fmtINRShort(r._fs.retentionReleased) },
            { key: 'rb', header: 'Retention bal.', align: 'right', value: (r) => r._fs.retentionBalance, render: (r) => <b>{fmtINRShort(r._fs.retentionBalance)}</b> },
            { key: 'sd', header: 'Security dep. bal.', align: 'right', value: (r) => r._fs.sdBalance, render: (r) => fmtINRShort(r._fs.sdBalance) },
            { key: 'ag', header: 'Advance given', align: 'right', value: (r) => r._fs.advanceGiven, render: (r) => fmtINRShort(r._fs.advanceGiven) },
            { key: 'ar', header: 'Recovered', align: 'right', value: (r) => r._fs.advanceRecovered, render: (r) => fmtINRShort(r._fs.advanceRecovered) },
            { key: 'ab', header: 'Advance bal.', align: 'right', value: (r) => r._fs.advanceBalance, render: (r) => <b>{fmtINRShort(r._fs.advanceBalance)}</b> },
            // B2/B3: one DLP-end calculation (handover-based, calendar months) shared with Close-out.
            { key: 'dlp', header: 'DLP ends', value: (r) => r._dlpEnd, render: (r) => fmtDate(r._dlpEnd) },
          ]} />
      )}
      {tab === 'releases' && (
        <DataTable rows={releases.data} loading={releases.isLoading} exportName="releases" empty={{ title: 'No release requests' }}
          columns={[
            { key: 'id', header: 'Release' }, { key: 'contractId', header: 'Contract' }, { key: 'kind', header: 'What', value: (r) => r.kind ?? 'Retention' }, { key: 'type', header: 'Basis' },
            { key: 'amount', header: 'Amount', align: 'right', render: (r) => fmtINR(r.amount) }, { key: 'requestedOn', header: 'Requested', render: (r) => `${fmtDate(r.requestedOn)} · ${r.requestedBy}` },
            { key: 'note', header: 'Note' }, { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
            { key: 'act', header: '', sortable: false, render: (r) => r.status === 'Pending Approval' && can('finance') && (
              <span className="inline-flex gap-1"><ActionButton className="btn btn-sm" label="Approve" path={`/retention-releases/${r.id}/decision`} body={{ decision: 'Approved' }} confirm={`Approve release of ${fmtINR(r.amount)}? A payable will be created.`} />
                <ActionForm className="btn btn-sm" label="Reject" title="Reject release" path={`/retention-releases/${r.id}/decision`} transform={(v) => ({ ...v, decision: 'Rejected' })} fields={[{ name: 'remark', label: 'Reason', type: 'textarea', required: true }]} /></span>
            ) },
          ]} />
      )}
      {tab === 'deductions' && (
        <DataTable rows={dedRows} exportName="deduction-register"
          columns={[
            { key: 'id', header: 'RA bill' }, { key: 'contractId', header: 'Contract' }, { key: 'date', header: 'Date', render: (r) => fmtDate(r.date) },
            ...['retention', 'advance', 'securityDeposit', 'tds', 'cess', 'materials', 'penalty', 'other'].map((k) => ({ key: `d_${k}`, header: { retention: 'Retention', advance: 'Advance', securityDeposit: 'Security dep.', tds: 'TDS', cess: 'Cess', materials: 'Materials', penalty: 'Penalty', other: 'Other' }[k]!, align: 'right' as const, render: (r: Doc) => (r[`d_${k}`] ? fmtINR(r[`d_${k}`]) : '—') })),
            { key: 'totalDed', header: 'Total', align: 'right', render: (r) => <b>{fmtINR(r.totalDed)}</b> },
          ]} />
      )}
      {tab === 'bg' && (
        <DataTable rows={bgRows} rowKey={(r) => r.rowId} exportName="bank-guarantees" empty={{ title: 'No bank guarantees' }}
          columns={[
            { key: 'contractId', header: 'Contract' }, { key: 'vendor', header: 'Contractor', value: (r) => vendors.name(r.vendorId) }, { key: 'type', header: 'Type' }, { key: 'number', header: 'BG no.' }, { key: 'bank', header: 'Bank' },
            { key: 'amount', header: 'Amount', align: 'right', render: (r) => fmtINR(r.amount) }, { key: 'expiry', header: 'Expiry', render: (r) => <span className={r.expiry < todayISO() ? 'text-red-600' : ''}>{fmtDate(r.expiry)}</span> },
            // B4: coverage against DLP end.
            { key: 'cover', header: 'Covers DLP?', value: (r) => (r.issue ? 'No' : 'Yes'), render: (r) => (r.issue ? <span className="text-[12.5px] text-red-700">No — {r.issue.shortByDays} days short (DLP ends {fmtDate(r.dlpEnd)})</span> : <Badge tone="green">Yes</Badge>) },
          ]} />
      )}
    </Page>
  );
}

// ── Labour rate management (stage 03) ────────────────────────────────────────
export function LaborRates() {
  const rows = useList('laborRates');
  const vendors = useVendors();
  const wos = useList('workOrders');
  const { can, user } = useAuth();
  const [tab, setTab] = useState<'cards' | 'pending' | 'check' | 'history'>('cards');
  const list = rows.data ?? [];
  const check = useMemo(() => (wos.data ?? []).flatMap((w) => (w.items ?? []).filter((i: Doc) => i.unit === 'man-day').map((i: Doc) => {
    const trade = i.trade ?? i.desc.split(' ')[1] ?? i.desc;
    const card = list.find((r) => r.status === 'Active' && r.vendorId === w.vendorId && i.desc.toLowerCase().includes(r.trade.split(/[ /]/)[0].toLowerCase()))
      ?? list.find((r) => r.status === 'Active' && !r.vendorId && i.desc.toLowerCase().includes(r.trade.split(/[ /]/)[0].toLowerCase()));
    return { id: `${w.id}:${i.id}`, wo: w.id, vendor: w._vendorName, item: i.desc, woRate: i.rate, card: card?.id, cardRate: card?.rate, minWage: card?.minWage, trade };
  })), [wos.data, list]);
  const cols = [
    { key: 'id', header: 'Card' }, { key: 'trade', header: 'Trade' }, { key: 'skill', header: 'Skill' }, { key: 'region', header: 'Region' },
    { key: 'applies', header: 'Applies to', value: (r: Doc) => (r.vendorId ? vendors.name(r.vendorId) : 'Standard') },
    { key: 'minWage', header: 'Min. wage', align: 'right' as const, render: (r: Doc) => fmtINR(r.minWage) },
    { key: 'rate', header: 'Rate / day', align: 'right' as const, render: (r: Doc) => <span className={r.rate < r.minWage ? 'font-semibold text-red-600' : ''}>{fmtINR(r.rate)}</span> },
    { key: 'margin', header: 'Margin', align: 'right' as const, value: (r: Doc) => ((r.rate - r.minWage) / r.minWage) * 100, render: (r: Doc) => (r.rate < r.minWage ? <Badge tone="red">Below min. wage</Badge> : `${(((r.rate - r.minWage) / r.minWage) * 100).toFixed(1)}%`) },
    { key: 'ot', header: 'OT', value: (r: Doc) => `${r.otMultiplier}×` }, { key: 'effectiveFrom', header: 'Effective', render: (r: Doc) => fmtDate(r.effectiveFrom) }, { key: 'version', header: 'Ver.', value: (r: Doc) => `v${r.version}` },
  ];
  return (
    <Page title="Labour Rate Management" icon={Coins}
      actions={can('project', 'procurement') && (
        <ActionForm className="btn btn-primary" label={<><Plus size={14} />New rate</>} title="Propose labour rate card" path="/labor-rates"
          description="Rates below the statutory minimum wage are refused (Minimum Wages Act). Overtime must be at least 2×. Another person approves."
          fields={[{ name: 'trade', label: 'Trade', required: true }, { name: 'skill', label: 'Skill', type: 'select', required: true, options: ['Unskilled', 'Semi-skilled', 'Skilled', 'Highly Skilled'] }, { name: 'region', label: 'Region / zone', required: true }, { name: 'vendorId', label: 'Contractor (blank = standard)', type: 'select', options: vendorOptions(vendors.data, (v) => v.isContractor) }, { name: 'minWage', label: 'Statutory minimum wage (₹/day)', type: 'number', required: true }, { name: 'rate', label: 'Rate (₹/day)', type: 'number', required: true }, { name: 'otMultiplier', label: 'Overtime multiplier', type: 'number', default: 2 }, { name: 'effectiveFrom', label: 'Effective from', type: 'date', required: true }]} />
      )}
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'cards', label: 'Rate cards', count: list.filter((r) => r.status === 'Active').length }, { id: 'pending', label: 'Pending approval', count: list.filter((r) => r.status === 'Pending Approval').length }, { id: 'check', label: 'Work order rate check' }, { id: 'history', label: 'Revision history' }]} />}>
      {tab === 'cards' && <DataTable rows={list.filter((r) => r.status === 'Active')} loading={rows.isLoading} exportName="rate-cards" columns={[...cols, { key: 'act', header: '', sortable: false, render: (r: Doc) => can('project', 'procurement') && <ActionForm className="btn btn-sm" label="Revise" title={`Revise ${r.id} (${r.trade})`} path={`/labor-rates/${r.id}/revise`} initial={{ rate: r.rate, minWage: r.minWage }} fields={[{ name: 'rate', label: 'New rate (₹/day)', type: 'number', required: true }, { name: 'minWage', label: 'Minimum wage (if notified change)', type: 'number' }, { name: 'effectiveFrom', label: 'Effective from', type: 'date', required: true }, { name: 'reason', label: 'Reason', type: 'textarea', required: true }]} /> }]} />}
      {tab === 'pending' && <DataTable rows={list.filter((r) => r.status === 'Pending Approval')} exportName="pending-rates" empty={{ title: 'Nothing pending' }} columns={[...cols, { key: 'proposedBy', header: 'Proposed by' }, { key: 'act', header: '', sortable: false, render: (r: Doc) => can('finance', 'procurement') && !String(r.proposedBy).startsWith(user?.name ?? '§') && <span className="inline-flex gap-1"><ActionButton className="btn btn-sm" label="Approve" path={`/labor-rates/${r.id}/decision`} body={{ decision: 'Approved' }} /><ActionForm className="btn btn-sm" label="Reject" title="Reject rate" path={`/labor-rates/${r.id}/decision`} transform={(v) => ({ ...v, decision: 'Rejected' })} fields={[{ name: 'remark', label: 'Reason', type: 'textarea', required: true }]} /></span> }]} />}
      {tab === 'check' && (
        <DataTable rows={check} exportName="wo-rate-check" empty={{ title: 'No man-day items on work orders' }}
          columns={[
            { key: 'wo', header: 'WO' }, { key: 'vendor', header: 'Contractor' }, { key: 'item', header: 'Item' }, { key: 'woRate', header: 'WO rate', align: 'right', render: (r) => fmtINR(r.woRate) },
            { key: 'card', header: 'Rate card', value: (r) => r.card ?? '—' }, { key: 'cardRate', header: 'Card rate', align: 'right', render: (r) => (r.cardRate ? fmtINR(r.cardRate) : '—') }, { key: 'minWage', header: 'Min. wage', align: 'right', render: (r) => (r.minWage ? fmtINR(r.minWage) : '—') },
            { key: 'ok', header: 'Check', value: (r) => (!r.card ? 'No card' : r.woRate < r.minWage ? 'Below min. wage' : r.woRate > r.cardRate ? 'Above card' : 'OK'), render: (r) => (!r.card ? <Badge tone="amber">No card</Badge> : r.woRate < r.minWage ? <Badge tone="red">Below min. wage</Badge> : r.woRate > r.cardRate ? <Badge tone="amber">Above card</Badge> : <Badge tone="green">OK</Badge>) },
          ]} />
      )}
      {tab === 'history' && <DataTable rows={list.filter((r) => ['Superseded', 'Rejected'].includes(r.status))} exportName="rate-history" empty={{ title: 'No revisions yet' }} columns={[...cols, { key: 'status', header: 'Status', render: (r: Doc) => <Badge>{r.status}</Badge> }, { key: 'reason', header: 'Note', value: (r: Doc) => r.rejection?.reason ?? r.decisionRemark ?? r.revisionReason ?? '—' }]} />}
    </Page>
  );
}

