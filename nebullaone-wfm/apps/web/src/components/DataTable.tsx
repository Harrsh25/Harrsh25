import { ArrowDown, ArrowUp, Download, Search } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { cls } from '../lib/format';
import { Empty, Loading } from './ui';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render?: (row: T) => ReactNode;
  /** Value used for sorting, searching and CSV export (defaults to row[key]). */
  value?: (row: T) => string | number | null | undefined;
  align?: 'left' | 'right' | 'center';
  width?: string;
  sortable?: boolean;
}

interface Props<T> {
  rows: T[] | undefined;
  columns: Column<T>[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
  rowKey?: (row: T) => string;
  empty?: { title: string; text?: string };
  footer?: ReactNode;
  filters?: { label: string; options: string[]; value: (row: T) => string }[];
  exportName?: string;
  toolbar?: ReactNode;
  searchPlaceholder?: string;
}

/** List view used on every screen: search, filter chips, sort, CSV export and a footer summary. */
export function DataTable<T extends Record<string, any>>({ rows, columns, loading, onRowClick, rowKey, empty, footer, filters = [], exportName, toolbar, searchPlaceholder }: Props<T>) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [f, setF] = useState<Record<string, string>>({});
  const val = (c: Column<T>, r: T) => (c.value ? c.value(r) : r[c.key]);

  const view = useMemo(() => {
    let out = rows ?? [];
    if (q.trim()) {
      const n = q.toLowerCase();
      out = out.filter((r) => columns.some((c) => String(val(c, r) ?? '').toLowerCase().includes(n)) || String(r.id ?? '').toLowerCase().includes(n));
    }
    for (const fl of filters) if (f[fl.label]) out = out.filter((r) => fl.value(r) === f[fl.label]);
    if (sort) {
      const c = columns.find((x) => x.key === sort.key);
      if (c) out = [...out].sort((a, b) => {
        const x = val(c, a); const y = val(c, b);
        if (x == null) return 1; if (y == null) return -1;
        return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * sort.dir;
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, q, sort, f, columns]);

  const exportCsv = () => {
    const esc = (s: unknown) => `"${String(s ?? '').replace(/"/g, '""')}"`;
    const head = columns.map((c) => esc(typeof c.header === 'string' ? c.header : c.key)).join(',');
    const body = view.map((r) => columns.map((c) => esc(val(c, r))).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([`${head}\n${body}`], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `${exportName ?? 'export'}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
        <div className="relative w-full max-w-[280px]">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input className="input pl-8" placeholder={searchPlaceholder ?? 'Search…'} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
        </div>
        {filters.map((fl) => (
          <select key={fl.label} className="input w-auto" value={f[fl.label] ?? ''} onChange={(e) => setF({ ...f, [fl.label]: e.target.value })} aria-label={fl.label}>
            <option value="">{fl.label}: all</option>
            {fl.options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {toolbar}
          <button className="btn btn-ghost btn-sm" onClick={exportCsv} title="Export CSV" aria-label="Export CSV"><Download size={15} /></button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {loading ? <Loading /> : !view.length ? <Empty title={empty?.title ?? 'Nothing here yet'}>{q || Object.values(f).some(Boolean) ? 'No rows match your search or filters.' : empty?.text}</Empty> : (
          <table className="tbl w-full border-separate border-spacing-0">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key} style={{ width: c.width }} className={cls(c.align === 'right' && 'text-right', c.align === 'center' && 'text-center')}>
                    {c.sortable === false ? c.header : (
                      <button className="inline-flex items-center gap-1 hover:text-ink" onClick={() => setSort((s) => (s?.key === c.key ? (s.dir === 1 ? { key: c.key, dir: -1 } : null) : { key: c.key, dir: 1 }))}>
                        {c.header}{sort?.key === c.key && (sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view.map((r, i) => (
                <tr key={rowKey ? rowKey(r) : r.id ?? i} onClick={onRowClick ? () => onRowClick(r) : undefined} className={onRowClick ? 'cursor-pointer' : undefined}>
                  {columns.map((c) => (
                    <td key={c.key} className={cls(c.align === 'right' && 'text-right num', c.align === 'center' && 'text-center')}>{c.render ? c.render(r) : (val(c, r) ?? '—')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="flex items-center justify-center gap-4 border-t border-line px-4 py-2 text-[12px] text-ink-mute">
        <span><b className="text-ink">{view.length}</b>{rows && view.length !== rows.length ? ` of ${rows.length}` : ''} records</span>
        {footer}
      </div>
    </div>
  );
}
