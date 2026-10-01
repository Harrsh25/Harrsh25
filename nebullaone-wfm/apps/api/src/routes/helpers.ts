import type { FastifyRequest } from 'fastify';
import type pg from 'pg';
import { z, type ZodTypeAny } from 'zod';
import { userLabel, type AuthUser } from '../auth';
import { tx } from '../db';
import { audit, badRequest } from '../repo';

/** Parse with zod and turn failures into a readable 400. */
export function parse<S extends ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const r = schema.safeParse(data);
  if (!r.success) {
    const msg = r.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ');
    throw badRequest(msg, r.error.issues);
  }
  return r.data;
}

export interface ActCtx { db: pg.PoolClient; user: AuthUser; by: string; log: (entity: string, id: string, action: string, detail?: unknown) => Promise<void> }

/** Run a workflow action in one transaction with an audit logger. */
export function act<T>(req: FastifyRequest, fn: (ctx: ActCtx) => Promise<T>): Promise<T> {
  const user = req.user;
  const by = userLabel(user);
  return tx((db) => fn({ db, user, by, log: (e, id, a, d) => audit(db, by, e, id, a, d) }));
}

export const nowISO = () => new Date().toISOString();

export const id = z.string().min(1);
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be a date (YYYY-MM-DD)');
export const money = z.coerce.number().finite().nonnegative();
export const qty = z.coerce.number().finite().positive();
export const params = z.object({ id: z.string().min(1) });

export const pushHistory = (d: Record<string, any>, status: string, by: string, remark = '') => {
  d.history = [...(d.history ?? []), { status, by, at: nowISO(), remark }];
};
