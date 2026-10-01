import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { ApiError } from '../lib/api';
import { cls } from '../lib/format';
import { Modal, Notice } from './ui';

export type Option = string | { value: string; label: string };
export interface LineCol { name: string; label: string; type?: 'text' | 'number' | 'date' | 'select'; options?: Option[]; width?: string; default?: any }
export interface FieldSpec {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox' | 'lines' | 'multiselect';
  options?: Option[];
  required?: boolean;
  placeholder?: string;
  help?: ReactNode;
  default?: any;
  span?: 1 | 2;
  columns?: LineCol[];
  show?: (v: Record<string, any>) => boolean;
  min?: number;
  step?: string;
}

const opt = (o: Option) => (typeof o === 'string' ? { value: o, label: o } : o);

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  fields: FieldSpec[];
  submitLabel?: string;
  initial?: Record<string, any>;
  /** Return value is ignored; throw ApiError to show validation/gate errors. */
  onSubmit: (values: Record<string, any>) => Promise<unknown>;
  wide?: boolean;
  danger?: boolean;
  children?: ReactNode;
}

/**
 * Every create / action form in the app. Shows server validation, "blocked by"
 * reasons from the vendor gates, and — when the server allows it — an override
 * box that resubmits with a reason (logged in the audit trail).
 */
export function FormModal({ open, onClose, title, description, fields, submitLabel = 'Save', initial, onSubmit, wide, danger, children }: Props) {
  const init = () => {
    const v: Record<string, any> = {};
    for (const f of fields) v[f.name] = initial?.[f.name] ?? f.default ?? (f.type === 'checkbox' ? false : f.type === 'lines' ? [blankLine(f)] : f.type === 'multiselect' ? [] : '');
    return v;
  };
  const [v, setV] = useState<Record<string, any>>(init);
  const [err, setErr] = useState<ApiError | Error | null>(null);
  const [busy, setBusy] = useState(false);
  const [override, setOverride] = useState('');
  useEffect(() => { if (open) { setV(init()); setErr(null); setOverride(''); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: string, x: any) => setV((p) => ({ ...p, [k]: x }));

  const clean = (): Record<string, any> => {
    const out: Record<string, any> = {};
    for (const f of fields) {
      if (f.show && !f.show(v)) continue;
      let x = v[f.name];
      if (f.type === 'number') x = x === '' || x == null ? undefined : Number(x);
      if (f.type === 'lines') x = (x as any[]).filter((row) => Object.values(row).some((c) => c !== '' && c != null)).map((row) => {
        const r: Record<string, any> = {};
        for (const c of f.columns ?? []) r[c.name] = c.type === 'number' ? (row[c.name] === '' ? undefined : Number(row[c.name])) : row[c.name] === '' ? undefined : row[c.name];
        return r;
      });
      if ((f.type === 'text' || f.type === 'textarea' || f.type === 'date' || f.type === 'select' || !f.type) && x === '') x = undefined;
      out[f.name] = x;
    }
    return out;
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true); setErr(null);
    try {
      const body = clean();
      if (override.trim()) body.overrideReason = override.trim();
      await onSubmit(body);
      onClose();
    } catch (ex) {
      setErr(ex as Error);
    } finally { setBusy(false); }
  };

  const api = err instanceof ApiError ? err : null;
  return (
    <Modal open={open} onClose={onClose} title={title} wide={wide || fields.some((f) => f.type === 'lines')}
      footer={<><button className="btn" onClick={onClose} type="button">Cancel</button><button className={cls('btn', danger ? 'btn-danger' : 'btn-primary')} onClick={() => submit()} disabled={busy}>{busy ? 'Saving…' : override.trim() ? `${submitLabel} with override` : submitLabel}</button></>}>
      <form onSubmit={submit} className="space-y-4">
        {description && <div className="text-[13px] text-ink-soft">{description}</div>}
        {err && (
          <Notice tone="red" title={err.message} items={api?.blocking.length ? api.blocking : detailItems(api?.details, err.message)}>
            {api?.warnings?.length ? <p className="mt-1 text-amber-800">Warnings: {api.warnings.join('; ')}</p> : null}
            {api?.canOverride && (
              <div className="mt-2">
                <span className="label text-red-800">Only compliance items are blocking — {api.details?.overrideRole ?? 'the override role'} may proceed with a reason (recorded in the audit log):</span>
                <textarea className="input" rows={2} value={override} onChange={(e) => setOverride(e.target.value)} placeholder="Reason for overriding" />
              </div>
            )}
          </Notice>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {fields.filter((f) => !f.show || f.show(v)).map((f) => (
            <div key={f.name} className={cls((f.span === 2 || f.type === 'lines' || f.type === 'textarea' || f.type === 'multiselect') && 'sm:col-span-2')}>
              {f.type === 'checkbox' ? (
                <label className="flex items-start gap-2 text-[13px]"><input type="checkbox" className="mt-0.5" checked={!!v[f.name]} onChange={(e) => set(f.name, e.target.checked)} /><span>{f.label}{f.help && <span className="block text-[11.5px] text-ink-mute">{f.help}</span>}</span></label>
              ) : (
                <label className="block">
                  <span className="label">{f.label}{f.required && <span className="text-red-600"> *</span>}</span>
                  {renderInput(f, v[f.name], (x) => set(f.name, x))}
                  {f.help && <span className="mt-1 block text-[11.5px] text-ink-mute">{f.help}</span>}
                </label>
              )}
            </div>
          ))}
        </div>
        {children}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

function blankLine(f: FieldSpec) {
  return Object.fromEntries((f.columns ?? []).map((c) => [c.name, c.default ?? '']));
}

function renderInput(f: FieldSpec, value: any, onChange: (v: any) => void) {
  switch (f.type) {
    case 'textarea': return <textarea className="input" rows={3} value={value} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} required={f.required} />;
    case 'select': return (
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)} required={f.required}>
        <option value="">{f.placeholder ?? 'Select…'}</option>
        {(f.options ?? []).map(opt).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
    case 'multiselect': return (
      <div className="flex flex-wrap gap-1.5 rounded-lg border border-line p-2">
        {(f.options ?? []).map(opt).map((o) => {
          const on = (value as string[]).includes(o.value);
          return <button type="button" key={o.value} onClick={() => onChange(on ? value.filter((x: string) => x !== o.value) : [...value, o.value])}
            className={cls('rounded-md border px-2 py-0.5 text-[12.5px]', on ? 'border-brand bg-brand-soft text-brand' : 'border-line text-ink-soft hover:bg-gray-50')}>{on ? '✓ ' : '+ '}{o.label}</button>;
        })}
      </div>
    );
    case 'lines': return <LinesEditor f={f} value={value} onChange={onChange} />;
    default: return <input className="input" type={f.type ?? 'text'} value={value} min={f.min} step={f.step ?? (f.type === 'number' ? 'any' : undefined)} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} required={f.required} />;
  }
}

function LinesEditor({ f, value, onChange }: { f: FieldSpec; value: any[]; onChange: (v: any[]) => void }) {
  const cols = f.columns ?? [];
  const upd = (i: number, k: string, x: any) => onChange(value.map((r, j) => (j === i ? { ...r, [k]: x } : r)));
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full text-[13px]">
        <thead className="bg-gray-50 text-[12px] text-ink-mute"><tr>{cols.map((c) => <th key={c.name} className="px-2 py-1.5 text-left font-medium" style={{ width: c.width }}>{c.label}</th>)}<th className="w-8" /></tr></thead>
        <tbody>
          {value.map((row, i) => (
            <tr key={i} className="border-t border-line">
              {cols.map((c) => (
                <td key={c.name} className="px-1.5 py-1">
                  {c.type === 'select' ? (
                    <select className="input py-1" value={row[c.name]} onChange={(e) => upd(i, c.name, e.target.value)}>
                      <option value="">—</option>
                      {(c.options ?? []).map(opt).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : <input className="input py-1" type={c.type ?? 'text'} step={c.type === 'number' ? 'any' : undefined} value={row[c.name]} onChange={(e) => upd(i, c.name, e.target.value)} />}
                </td>
              ))}
              <td className="px-1"><button type="button" className="btn btn-ghost btn-sm" aria-label="Remove line" onClick={() => onChange(value.filter((_, j) => j !== i))}><Trash2 size={14} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className="btn btn-ghost btn-sm m-1" onClick={() => onChange([...value, blankLine(f)])}><Plus size={14} />Add line</button>
    </div>
  );
}

/** Server details can be zod issues or plain strings; don't repeat the headline message. */
function detailItems(details: unknown, headline: string): string[] | undefined {
  if (!Array.isArray(details)) return undefined;
  const items = details.map((d: any) => (typeof d === 'string' ? d : d?.message ? `${(d.path ?? []).join('.') || 'value'}: ${d.message}` : '')).filter((x) => x && x !== headline && !headline.includes(x));
  return items.length ? items : undefined;
}
