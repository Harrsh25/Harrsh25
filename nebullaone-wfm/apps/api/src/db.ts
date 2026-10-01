import pg from 'pg';
import { config } from './config';

// Return DATE columns as plain 'YYYY-MM-DD' strings, not JS Dates shifted by timezone.
pg.types.setTypeParser(1082, (v) => v);

export const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 10 });

export type Db = pg.PoolClient | pg.Pool;

export async function tx<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const r = await fn(c);
    await c.query('COMMIT');
    return r;
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}

/**
 * Run independent queries: in parallel on the pool, one after another on a
 * transaction client (a single connection can only run one query at a time).
 */
export async function all<T extends readonly (() => Promise<unknown>)[]>(db: Db, fns: T): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  if (db instanceof pg.Pool) return Promise.all(fns.map((f) => f())) as any;
  const out: unknown[] = [];
  for (const f of fns) out.push(await f());
  return out as any;
}
