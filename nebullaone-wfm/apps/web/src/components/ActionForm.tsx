import { useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { FormModal, type FieldSpec } from './FormModal';

interface Props {
  label: ReactNode;
  title: string;
  fields: FieldSpec[];
  /** Endpoint path, or a function building it from the form values. */
  path: string | ((v: Record<string, any>) => string);
  method?: string;
  description?: ReactNode;
  submitLabel?: string;
  initial?: Record<string, any>;
  /** Shape the body before sending (e.g. merge fixed values). */
  transform?: (v: Record<string, any>) => unknown;
  onDone?: (res: any) => void;
  className?: string;
  danger?: boolean;
  disabled?: boolean;
  wide?: boolean;
  children?: ReactNode;
}

/** A button that opens a form and posts it to an action endpoint, then refreshes data. */
export function ActionForm({ label, title, fields, path, method = 'POST', description, submitLabel, initial, transform, onDone, className = 'btn', danger, disabled, wide, children }: Props) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  return (
    <>
      <button type="button" className={className} onClick={(e) => { e.stopPropagation(); setOpen(true); }} disabled={disabled}>{label}</button>
      <FormModal open={open} onClose={() => setOpen(false)} title={title} description={description} fields={fields} submitLabel={submitLabel} initial={initial} danger={danger} wide={wide}
        onSubmit={async (v) => {
          const res = await api(typeof path === 'function' ? path(v) : path, { method, body: transform ? transform(v) : v });
          await qc.invalidateQueries();
          onDone?.(res);
        }}>{children}</FormModal>
    </>
  );
}

/** One-click action with confirmation (no form fields). */
export function ActionButton({ label, path, body, confirm, className = 'btn', onDone, disabled }: { label: ReactNode; path: string; body?: unknown; confirm?: string; className?: string; onDone?: (r: any) => void; disabled?: boolean }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" className={className} disabled={busy || disabled} onClick={async (e) => {
      e.stopPropagation();
      if (confirm && !window.confirm(confirm)) return;
      setBusy(true);
      try { const r = await api(path, { body: body ?? {} }); await qc.invalidateQueries(); onDone?.(r); }
      catch (ex: any) { window.alert([ex.message, ...(ex.blocking ?? [])].join('\n• ')); }
      finally { setBusy(false); }
    }}>{busy ? '…' : label}</button>
  );
}
