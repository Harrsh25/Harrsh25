import { Building2, FileWarning, LayoutGrid, Lock, Scale, ShieldAlert, ShoppingCart, Wallet } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Page } from '../../components/Layout';
import { Badge, Donut, Kpi, Progress, Section } from '../../components/ui';
import { useList, type Doc } from '../../lib/data';
import { fmtDate, fmtINRShort, todayISO } from '../../lib/format';
import { useScorecard, useVendors } from '../../lib/hooks';

const C = { green: '#16a34a', amber: '#f59e0b', violet: '#7c3aed', red: '#dc2626', blue: '#2563eb', gray: '#9ca3af' };

export function VmOverview() {
  const vendors = useVendors();
  const rfqs = useList('rfqs');
  const pos = useList('purchaseOrders');
  const invoices = useList('invoices');
  const holds = useList('holds');
  const sc = useScorecard();
  const t = todayISO();

  const d = useMemo(() => {
    const v = vendors.data ?? [];
    const inv = invoices.data ?? [];
    const open = inv.filter((i) => i._totals?.balance > 0.5);
    const blocked = open.filter((i) => i._blockedBy?.length || i._status === 'On Hold');
    const ageing = [0, 0, 0, 0];
    for (const i of open) {
      const late = Math.floor((Date.parse(t) - Date.parse(i.due)) / 86_400_000);
      ageing[late <= 0 ? 0 : late <= 30 ? 1 : late <= 60 ? 2 : 3] += i._totals.balance;
    }
    const livePos = (pos.data ?? []).filter((p) => !['Received', 'Closed', 'Cancelled'].includes(p._status));
    const activeHolds = (holds.data ?? []).filter((h) => h.status === 'Active');
    return {
      v, open, blocked, ageing, livePos, activeHolds,
      status: { active: v.filter((x) => x.status === 'Active' && !x._holdFlag).length, pending: v.filter((x) => ['Pending Approval', 'Draft', 'Changes Requested'].includes(x.status)).length, hold: v.filter((x) => x._holdFlag === 'On Hold').length, blocked: v.filter((x) => ['Blacklisted', 'Blocked'].includes(x._holdFlag ?? x.status)).length },
      comp: { ok: v.filter((x) => x._compliance?.status === 'Compliant').length, exp: v.filter((x) => x._compliance?.status === 'Expiring').length, bad: v.filter((x) => x._compliance?.status === 'Non-Compliant').length },
      expiring: v.flatMap((x) => (x._compliance?.issues ?? []).map((i: Doc) => ({ ...i, vendor: x.name }))).sort((a, b) => (a.expiry ?? '').localeCompare(b.expiry ?? '')).slice(0, 8),
    };
  }, [vendors.data, invoices.data, pos.data, holds.data, t]);

  const rfqStage = (s: string) => (rfqs.data ?? []).filter((r) => r.status === s).length;
  const top = [...(sc.data ?? [])].filter((s) => s.score != null).sort((a, b) => b.score - a.score).slice(0, 5);
  const maxAge = Math.max(1, ...d.ageing);

  return (
    <Page title="Vendor Overview" icon={LayoutGrid} scroll>
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <Kpi label="Vendors" value={d.v.length} sub={`${d.status.active} active`} tone="violet" icon={<Building2 size={16} />} />
          <Kpi label="Compliance issues" value={d.comp.bad + d.comp.exp} sub={`${d.activeHolds.filter((h) => h.reason === 'Compliance').length} payments held`} tone="red" icon={<ShieldAlert size={16} />} />
          <Kpi label="Open RFQs" value={(rfqs.data ?? []).filter((r) => ['Draft', 'Sent', 'Quotes Received'].includes(r.status)).length} sub={`${(rfqs.data ?? []).filter((r) => r.dueDate < t && ['Sent'].includes(r.status)).length} past due`} tone="blue" icon={<Scale size={16} />} />
          <Kpi label="Open PO value" value={fmtINRShort(d.livePos.reduce((s, p) => s + p._value, 0))} sub={`${d.livePos.length} POs · ${d.livePos.filter((p) => p._late).length} late`} tone="teal" icon={<ShoppingCart size={16} />} />
          <Kpi label="Payables outstanding" value={fmtINRShort(d.open.reduce((s, i) => s + i._totals.balance, 0))} sub={`${d.open.length} bills`} tone="amber" icon={<Wallet size={16} />} />
          <Kpi label="Payments blocked" value={fmtINRShort(d.blocked.reduce((s, i) => s + i._totals.balance, 0))} sub={`${d.blocked.length} bills`} tone="red" icon={<Lock size={16} />} />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Section title="Vendor status" action={<Link className="text-[13px] text-brand" to="/vm/registry">Registry →</Link>}>
            <Donut center={d.v.length} sub="vendors" segments={[
              { label: 'Active', value: d.status.active, color: C.green }, { label: 'Pending approval', value: d.status.pending, color: C.amber },
              { label: 'On hold', value: d.status.hold, color: C.violet }, { label: 'Blocked / blacklisted', value: d.status.blocked, color: C.red },
            ]} />
          </Section>
          <Section title="Compliance status" action={<Link className="text-[13px] text-brand" to="/vm/compliance">Compliance →</Link>}>
            <Donut center={d.v.length} sub="vendors" segments={[
              { label: 'Compliant', value: d.comp.ok, color: C.green }, { label: 'Expiring / unverified', value: d.comp.exp, color: C.amber }, { label: 'Non-compliant', value: d.comp.bad, color: C.red },
            ]} />
          </Section>
          <Section title="Sourcing pipeline" action={<Link className="text-[13px] text-brand" to="/vm/rfq">RFQs →</Link>}>
            <div className="flex items-start justify-between gap-2 p-5">
              {[['Draft', rfqStage('Draft')], ['Sent', rfqStage('Sent')], ['Quoted', rfqStage('Quotes Received')], ['Part-awarded', rfqStage('Partially Awarded')], ['Awarded', rfqStage('Awarded')]].map(([l, n]) => (
                <div key={l as string} className="flex flex-col items-center gap-1 text-center"><span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-brand/60 text-[15px] font-semibold text-brand">{n}</span><span className="text-[12px] text-ink-mute">{l}</span></div>
              ))}
            </div>
          </Section>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Section title="Payables ageing" action={<Link className="text-[13px] text-brand" to="/vm/invoices">Invoices & payments →</Link>}>
            <div className="space-y-3 p-5">
              {['Not yet due', '1–30 days overdue', '31–60 days', 'Over 60 days'].map((l, i) => (
                <div key={l} className="flex items-center gap-3 text-[13px]"><span className="w-36 text-ink-soft">{l}</span><div className="flex-1"><Progress value={(d.ageing[i] / maxAge) * 100} tone={i === 0 ? 'brand' : i === 1 ? 'amber' : 'red'} /></div><span className="w-24 text-right font-medium num">{fmtINRShort(d.ageing[i])}</span></div>
              ))}
            </div>
          </Section>
          <Section title="Expiring & due" action={<Link className="text-[13px] text-brand" to="/vm/compliance">Compliance →</Link>}>
            <table className="tbl w-full"><thead><tr><th>Item</th><th>Due</th><th>Status</th></tr></thead>
              <tbody>{d.expiring.map((x, i) => (
                <tr key={i}><td><div className="font-medium">{x.name}</div><div className="text-[12px] text-ink-mute">{x.vendor}</div></td><td className={x.level === 2 ? 'text-red-600' : ''}>{x.note}</td><td><Badge tone={x.level === 2 ? 'red' : 'amber'}>{x.level === 2 ? (x.note.startsWith('Expired') ? 'Expired' : 'Missing') : 'Attention'}</Badge></td></tr>
              ))}</tbody>
            </table>
          </Section>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Section title="Vendor performance (top 5)" action={<Link className="text-[13px] text-brand" to="/vm/scorecard">Scorecard →</Link>}>
            <table className="tbl w-full"><thead><tr><th>Vendor</th><th className="text-right">Quality</th><th className="text-right">Delivery</th><th className="text-right">Compliance</th><th className="text-right">Overall</th></tr></thead>
              <tbody>{top.map((s) => <tr key={s.vendorId}><td>{s.name}</td><td className="text-right num">{r(s.parts?.quality)}</td><td className="text-right num">{r(s.parts?.timeliness)}</td><td className="text-right num">{r(s.parts?.compliance)}</td><td className="text-right font-semibold num">{s.score}</td></tr>)}</tbody>
            </table>
          </Section>
          <Section title="Active holds" action={<Link className="text-[13px] text-brand" to="/vm/holds">Holds register →</Link>}>
            <table className="tbl w-full"><thead><tr><th>Vendor</th><th>Scope</th><th>Reason</th><th>Since</th></tr></thead>
              <tbody>{d.activeHolds.slice(0, 8).map((h) => <tr key={h.id}><td><div className="font-medium">{vendors.name(h.vendorId)}</div><div className="max-w-[320px] truncate text-[12px] text-ink-mute" title={h.detail}>{h.detail}</div></td><td><Badge tone="amber">{h.scope}</Badge></td><td>{h.reason}</td><td>{fmtDate(h.raisedAt)}</td></tr>)}</tbody>
            </table>
          </Section>
        </div>
        {!d.v.length && <div className="flex items-center gap-2 text-[13px] text-ink-mute"><FileWarning size={14} />No vendors yet — register one in the Vendor Registry.</div>}
      </div>
    </Page>
  );
}

const r = (x?: number | null) => (x == null ? '—' : Math.round(x));
