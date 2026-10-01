import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export type Doc = Record<string, any>;

/** All rows of a collection (already scoped to the user's vendor on the server). */
export const useList = <T = Doc>(entity: string, enabled = true) =>
  useQuery({ queryKey: ['data', entity], queryFn: () => api<T[]>(`/data/${entity}`), enabled });

export const useDoc = <T = Doc>(entity: string, id: string | null | undefined) =>
  useQuery({ queryKey: ['data', entity, id], queryFn: () => api<T>(`/data/${entity}/${id}`), enabled: !!id });

export const useGet = <T = any>(path: string | null, key?: unknown[]) =>
  useQuery({ queryKey: key ?? ['get', path], queryFn: () => api<T>(path!), enabled: !!path });

/** POST/PUT to an action endpoint and refresh everything afterwards (workflows touch many collections). */
export function useAction<TBody = any, TRes = any>(path: string | ((b: TBody) => string), method = 'POST') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TBody) => api<TRes>(typeof path === 'function' ? path(body) : path, { method, body: body ?? {} }),
    onSuccess: () => qc.invalidateQueries(),
  });
}

export const byId = <T extends { id: string }>(rows: T[] | undefined) => new Map((rows ?? []).map((r) => [r.id, r]));
