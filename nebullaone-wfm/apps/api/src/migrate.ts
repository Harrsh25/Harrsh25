import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

export async function migrate(): Promise<string[]> {
  await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const done = new Set((await pool.query<{ name: string }>('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
  const applied: string[] = [];
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    if (done.has(f)) continue;
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query(readFileSync(join(dir, f), 'utf8'));
      await c.query('INSERT INTO schema_migrations (name) VALUES ($1)', [f]);
      await c.query('COMMIT');
      applied.push(f);
    } catch (e) {
      await c.query('ROLLBACK');
      throw new Error(`Migration ${f} failed: ${(e as Error).message}`);
    } finally {
      c.release();
    }
  }
  return applied;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  migrate()
    .then((a) => { console.log(a.length ? `Applied: ${a.join(', ')}` : 'Database is up to date'); return pool.end(); })
    .catch((e) => { console.error(e.message); process.exit(1); });
}
