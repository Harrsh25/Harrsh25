import type pg from 'pg';
import { pool, type Db } from './db';
import { entity, type EntityDef } from './entities';

type Doc = Record<string, any>;

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}
export const notFound = (what: string) => new HttpError(404, `${what} not found`);
export const badRequest = (msg: string, details?: unknown) => new HttpError(400, msg, details);
export const conflict = (msg: string, details?: unknown) => new HttpError(409, msg, details);
export const forbidden = (msg = 'You do not have permission to do this') => new HttpError(403, msg);
export const unprocessable = (msg: string, details?: unknown) => new HttpError(422, msg, details);

function columnValues(def: EntityDef, doc: Doc) {
  const cols = Object.keys(def.columns);
  return { cols, vals: cols.map((c) => def.columns[c](doc)) };
}

/** Next id for a prefix, e.g. VEN-014. Counter is kept in id_counters (seeded from existing max). */
export async function nextId(db: Db, prefix: string): Promise<string> {
  const r = await db.query<{ next: number }>(
    `INSERT INTO id_counters (prefix, next) VALUES ($1, 2)
     ON CONFLICT (prefix) DO UPDATE SET next = id_counters.next + 1
     RETURNING next - 1 AS next`,
    [prefix],
  );
  return `${prefix}-${String(r.rows[0].next).padStart(3, '0')}`;
}

export async function list<T = Doc>(name: string, opts: { where?: Record<string, unknown>; vendorId?: string; db?: Db } = {}): Promise<T[]> {
  const def = entity(name);
  const db = opts.db ?? pool;
  const conds: string[] = [];
  const params: unknown[] = [];
  for (const [k, v] of Object.entries(opts.where ?? {})) {
    if (!(k in def.columns) && k !== 'id') throw badRequest(`Cannot filter ${name} by ${k}`);
    params.push(v);
    conds.push(`${k} = $${params.length}`);
  }
  if (opts.vendorId) {
    if (!def.vendorColumn) return [];
    params.push(opts.vendorId);
    conds.push(`${def.vendorColumn} = $${params.length}`);
  }
  const sql = `SELECT id, doc, version FROM ${def.table}${conds.length ? ` WHERE ${conds.join(' AND ')}` : ''} ORDER BY created_at, id`;
  const r = await db.query(sql, params);
  return r.rows.map((row) => ({ ...row.doc, id: row.id, _v: row.version })) as T[];
}

export async function get<T = Doc>(name: string, id: string, db: Db = pool, lock = false): Promise<T> {
  const def = entity(name);
  const r = await db.query(`SELECT id, doc, version FROM ${def.table} WHERE id = $1${lock ? ' FOR UPDATE' : ''}`, [id]);
  if (!r.rowCount) throw notFound(`${name.replace(/s$/, '')} ${id}`);
  return { ...r.rows[0].doc, id: r.rows[0].id, _v: r.rows[0].version } as T;
}

export async function find<T = Doc>(name: string, id: string, db: Db = pool): Promise<T | null> {
  try { return await get<T>(name, id, db); } catch (e) { if (e instanceof HttpError && e.status === 404) return null; throw e; }
}

const clean = (doc: Doc): Doc => {
  const { _v, ...rest } = doc;
  return rest;
};

export async function insert<T extends Doc>(name: string, doc: T, db: Db = pool): Promise<T & { id: string }> {
  const def = entity(name);
  const id = doc.id ?? (await nextId(db, def.prefix));
  const full = clean({ ...doc, id });
  const { cols, vals } = columnValues(def, full);
  const allCols = ['id', ...cols, 'doc'];
  const placeholders = allCols.map((_, i) => `$${i + 1}`);
  try {
    await db.query(`INSERT INTO ${def.table} (${allCols.join(', ')}) VALUES (${placeholders.join(', ')})`, [id, ...vals, JSON.stringify(full)]);
  } catch (e) {
    throw translatePgError(e as pg.DatabaseError);
  }
  return full as T & { id: string };
}

/** Replace the stored doc. Pass expectedVersion to get optimistic-concurrency protection. */
export async function save<T extends Doc>(name: string, doc: T, db: Db = pool, expectedVersion?: number): Promise<T> {
  const def = entity(name);
  if (!doc.id) throw new Error(`save(${name}) called without an id`);
  const full = clean(doc);
  const { cols, vals } = columnValues(def, full);
  const sets = [...cols.map((c, i) => `${c} = $${i + 2}`), `doc = $${cols.length + 2}`, 'version = version + 1', 'updated_at = now()'];
  const params: unknown[] = [doc.id, ...vals, JSON.stringify(full)];
  let where = 'id = $1';
  if (expectedVersion !== undefined) { params.push(expectedVersion); where += ` AND version = $${params.length}`; }
  let r;
  try {
    r = await db.query(`UPDATE ${def.table} SET ${sets.join(', ')} WHERE ${where}`, params);
  } catch (e) {
    throw translatePgError(e as pg.DatabaseError);
  }
  if (!r.rowCount) {
    if (expectedVersion !== undefined) throw conflict('This record was changed by someone else — reload and try again');
    throw notFound(`${name} ${doc.id}`);
  }
  return full as T;
}

/** Load, mutate, save — inside the caller's transaction, with a row lock. */
export async function mutate<T extends Doc>(name: string, id: string, db: pg.PoolClient, fn: (d: T) => void | Promise<void>): Promise<T> {
  const d = await get<T>(name, id, db, true);
  await fn(d);
  return save(name, d, db);
}

export async function remove(name: string, id: string, db: Db = pool): Promise<void> {
  const def = entity(name);
  const r = await db.query(`DELETE FROM ${def.table} WHERE id = $1`, [id]);
  if (!r.rowCount) throw notFound(`${name} ${id}`);
}

export async function audit(db: Db, by: string, entityName: string, refId: string, action: string, detail?: unknown): Promise<void> {
  await db.query('INSERT INTO audit_log (by_user, entity, ref_id, action, detail) VALUES ($1, $2, $3, $4, $5)', [by, entityName, refId, action, detail == null ? null : JSON.stringify(detail)]);
}

export async function getConfig<T = Doc>(key: string, db: Db = pool): Promise<T> {
  const r = await db.query('SELECT doc FROM app_config WHERE key = $1', [key]);
  if (!r.rowCount) throw notFound(`config ${key}`);
  return r.rows[0].doc as T;
}

export async function setConfig(key: string, doc: unknown, db: Db = pool): Promise<void> {
  await db.query(
    'INSERT INTO app_config (key, doc) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET doc = EXCLUDED.doc, updated_at = now()',
    [key, JSON.stringify(doc)],
  );
}

function translatePgError(e: pg.DatabaseError): Error {
  if (e.code === '23505') return conflict(`Duplicate value: ${e.detail ?? e.message}`);
  if (e.code === '23503') return badRequest(`Referenced record does not exist: ${e.detail ?? e.message}`);
  if (e.code === '23514') {
    if (e.constraint === 'labor_rate_min_wage') return unprocessable('Rate is below the statutory minimum wage');
    return unprocessable(`Validation failed: ${e.constraint ?? e.message}`);
  }
  return e;
}
