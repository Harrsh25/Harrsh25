import { useGet } from '../lib/data';
import { fmtDate } from '../lib/format';
import { Empty } from './ui';

export function AuditTrail({ entity, refId }: { entity: string; refId: string }) {
  const q = useGet<any[]>(`/audit?entity=${entity}&refId=${encodeURIComponent(refId)}&limit=50`, ['audit', entity, refId]);
  if (!q.data?.length) return <Empty title="No activity recorded" />;
  return (
    <ol className="space-y-3 p-5">
      {q.data.map((a, i) => (
        <li key={i} className="flex gap-3 text-[13px]">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
          <div><div>{a.action}</div><div className="text-[12px] text-ink-mute">{fmtDate(a.at)} · {new Date(a.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · {a.by}</div></div>
        </li>
      ))}
    </ol>
  );
}
