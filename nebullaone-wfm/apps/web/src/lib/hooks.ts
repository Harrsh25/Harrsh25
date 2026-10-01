import { useMemo } from 'react';
import { useAuth } from './auth';
import { useGet, useList, type Doc } from './data';

export function useVendors() {
  const q = useList('vendors');
  const map = useMemo(() => new Map((q.data ?? []).map((v) => [v.id, v])), [q.data]);
  return { ...q, map, name: (id?: string | null) => (id ? map.get(id)?.name ?? id : '—') };
}

export function useScorecard() {
  const { user } = useAuth();
  const q = useGet<Doc[]>(user && user.role !== 'vendor' ? '/scorecard' : null, ['scorecard']);
  const map = useMemo(() => new Map((q.data ?? []).map((s) => [s.vendorId, s])), [q.data]);
  return { ...q, map };
}

export const PROJECTS = ['Skyline Towers — Phase 1', 'Metro Line Extension', '400kV Transmission Line A', 'Riverside Business Park', 'Solar Farm Substation'];

export const vendorOptions = (rows: Doc[] | undefined, pred: (v: Doc) => boolean = () => true) =>
  (rows ?? []).filter(pred).map((v) => ({ value: v.id, label: `${v.name} (${v.id})` }));
