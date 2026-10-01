import { useQueryClient } from '@tanstack/react-query';
import { Plus, Save, Settings as SettingsIcon, Trash2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Page } from '../../components/Layout';
import { Loading, Notice } from '../../components/ui';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useGet, type Doc } from '../../lib/data';
import { cls } from '../../lib/format';

function Row({ title, help, children }: { title: string; help?: string; children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3 last:border-0"><div className="min-w-0"><div className="text-[13.5px] font-medium">{title}</div>{help && <div className="text-[12px] text-ink-mute">{help}</div>}</div>{children}</div>;
}

function Segmented<T extends string>({ value, options, onChange, disabled }: { value: T; options: T[]; onChange: (v: T) => void; disabled?: boolean }) {
  return (
    <div className="inline-flex rounded-lg border border-line p-0.5">
      {options.map((o) => <button key={o} type="button" disabled={disabled} onClick={() => onChange(o)} className={cls('rounded-md px-3 py-1 text-[12.5px] font-medium', value === o ? (o === 'Stop' || o === 'No' ? 'bg-red-50 text-red-700' : o === 'Warn' ? 'bg-amber-50 text-amber-700' : 'bg-brand-soft text-brand') : 'text-ink-soft')}>{o}</button>)}
    </div>
  );
}

export function ProcurementSettings() {
  const q = useGet<Doc>('/config/settings', ['config', 'settings']);
  const { can } = useAuth();
  const qc = useQueryClient();
  const [s, setS] = useState<Doc | null>(null);
  const [msg, setMsg] = useState<{ tone: 'green' | 'red'; text: string; items?: string[] } | null>(null);
  useEffect(() => { if (q.data) setS(structuredClone(q.data)); }, [q.data]);
  if (!s) return <Page title="Procurement Settings" icon={SettingsIcon}><Loading /></Page>;
  const editable = can('procurement', 'finance');
  const set = (k: string, v: unknown) => setS({ ...s, [k]: v });
  const yn = (k: string) => <Segmented value={s[k] ? 'Yes' : 'No'} options={['Yes', 'No']} onChange={(v) => set(k, v === 'Yes')} disabled={!editable} />;
  const gate = (k: string) => <Segmented value={s[k]} options={['Stop', 'Warn', 'Off']} onChange={(v) => set(k, v)} disabled={!editable} />;
  const num = (k: string, suffix: string) => <span className="flex items-center gap-1"><input className="input w-20 text-right" type="number" value={s[k]} disabled={!editable} onChange={(e) => set(k, Number(e.target.value))} />{suffix}</span>;
  const save = async () => {
    setMsg(null);
    try { await api('/config/settings', { method: 'PUT', body: s }); await qc.invalidateQueries(); setMsg({ tone: 'green', text: 'Settings saved — compliance holds re-checked.' }); }
    catch (e) { const ex = e as ApiError; setMsg({ tone: 'red', text: ex.message, items: Array.isArray(ex.details) ? ex.details.map((d: Doc) => d.message) : undefined }); }
  };
  return (
    <Page title="Procurement Settings" icon={SettingsIcon} scroll actions={editable && <button className="btn btn-primary" onClick={save}><Save size={14} />Save settings</button>}>
      <div className="mx-auto w-full max-w-[920px] space-y-4 p-4">
        {msg && <Notice tone={msg.tone} title={msg.text} items={msg.items} />}
        {!editable && <Notice tone="blue" title="Read-only — Procurement or Finance can change these settings." />}
        <section className="card px-5 py-2"><h2 className="pt-3 text-[14px] font-semibold">Billing rules</h2>
          <Row title="Purchase order required for vendor bills" help="Vendors can be exempted individually">{yn('poRequiredForBill')}</Row>
          <Row title="Goods receipt required before billing" help="Applies to POs billed on received quantity">{yn('receiptRequiredForBill')}</Row>
          <Row title="Bill for rejected quantity" help="If No, rejected quantity already billed should be recovered with a debit note">{yn('billRejectedQty')}</Row>
        </section>
        <section className="card px-5 py-2"><h2 className="pt-3 text-[14px] font-semibold">Payment checks</h2>
          <Row title="3-way match — quantity" help="Billed quantity above accepted receipt quantity">{gate('threeWayQty')}</Row>
          <Row title="Maintain same rate (PO → bill)" help="Billed rate differs from PO rate">{gate('rateCheck')}</Row>
          <Row title="Rate tolerance" help="Differences within this % count as a match">{num('rateTolerancePct', '%')}</Row>
          <Row title="Vendor compliance gate (payments)" help={`Expired insurance / missing statutory documents. A Stop can be overridden with a reason by the ${s.overrideRole}.`}>{gate('complianceGate')}</Row>
        </section>
        <section className="card px-5 py-2"><h2 className="pt-3 text-[14px] font-semibold">Workflow gates</h2>
          <Row title="Compliance at RFQ invite">{gate('rfqComplianceGate')}</Row>
          <Row title="Compliance at PO / contract / work order">{gate('poComplianceGate')}</Row>
          <Row title="Required documents before submitting a registration">{yn('requireDocsOnSubmit')}</Row>
          <Row title="Mobilisation checklist before the first work order">{yn('mobilisationBeforeWo')}</Row>
          <Row title="Quality inspection before RA billing" help="Only measurements with a passed inspection can be billed">{yn('qcBeforeBilling')}</Row>
          <Row title="Expiry warning window">{num('expiryWarnDays', 'days')}</Row>
        </section>
        <section className="card px-5 py-2"><h2 className="pt-3 text-[14px] font-semibold">Ordering</h2>
          <Row title="Over-order / over-receipt allowance" help="Above RFQ / requisition / PO quantity">{num('overOrderPct', '%')}</Row>
          <Row title="Blanket order allowance" help="Call-offs above the agreed quantity">{num('blanketAllowancePct', '%')}</Row>
        </section>
        <section className="card px-5 py-3"><h2 className="text-[14px] font-semibold">Vendor approval stages</h2>
          <p className="mb-2 text-[12px] text-ink-mute">Each registration is routed through these stages in order. Stage names map to roles: Procurement, Legal, Finance.</p>
          <StageList items={s.vendorFlow} editable={editable} onChange={(x) => set('vendorFlow', x)} render={(st, upd) => <><select className="input w-44" value={st.name} onChange={(e) => upd({ ...st, name: e.target.value })}>{['Procurement', 'Legal', 'Finance'].map((o) => <option key={o}>{o}</option>)}</select><select className="input w-36" value={st.scope} onChange={(e) => upd({ ...st, scope: e.target.value })}>{['All', 'Goods', 'Services', 'Labor'].map((o) => <option key={o}>{o}</option>)}</select></>} blank={{ name: 'Procurement', scope: 'All' }} />
        </section>
        <section className="card px-5 py-3"><h2 className="text-[14px] font-semibold">Contract approval stages</h2>
          <p className="mb-2 text-[12px] text-ink-mute">A stage with a minimum value only applies to contracts at or above it. The last stage also checks the contractor gates.</p>
          <StageList items={s.contractFlow} editable={editable} onChange={(x) => set('contractFlow', x)} render={(st, upd) => <><select className="input w-44" value={st.name} onChange={(e) => upd({ ...st, name: e.target.value })}>{['Legal Counsel', 'Finance Controller', 'Project Manager'].map((o) => <option key={o}>{o}</option>)}</select><span className="flex items-center gap-1 text-[12px] text-ink-mute">min ₹<input className="input w-32" type="number" value={st.minValue} onChange={(e) => upd({ ...st, minValue: Number(e.target.value) })} /></span></>} blank={{ name: 'Finance Controller', minValue: 0 }} />
        </section>
      </div>
    </Page>
  );
}

function StageList({ items, onChange, render, blank, editable }: { items: Doc[]; onChange: (x: Doc[]) => void; render: (s: Doc, upd: (n: Doc) => void) => ReactNode; blank: Doc; editable: boolean }) {
  return (
    <div className="space-y-2">
      {items.map((st, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2"><span className="w-8 text-[12px] font-semibold text-ink-mute">L{i + 1}</span>
          <fieldset disabled={!editable} className="flex flex-wrap gap-2">{render(st, (n) => onChange(items.map((x, j) => (j === i ? n : x))))}</fieldset>
          {editable && <>
            <button className="btn btn-ghost btn-sm" disabled={i === 0} onClick={() => { const c = [...items]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; onChange(c); }} aria-label="Move up">↑</button>
            <button className="btn btn-ghost btn-sm" disabled={i === items.length - 1} onClick={() => { const c = [...items]; [c[i + 1], c[i]] = [c[i], c[i + 1]]; onChange(c); }} aria-label="Move down">↓</button>
            <button className="btn btn-ghost btn-sm" disabled={items.length === 1} onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 size={14} /></button>
          </>}
        </div>
      ))}
      <p className="text-[12px] text-ink-mute">Route: {items.map((x) => x.name).join(' → ')}</p>
      {editable && <button className="btn btn-sm" onClick={() => onChange([...items, { ...blank }])}><Plus size={14} />Add stage</button>}
    </div>
  );
}
