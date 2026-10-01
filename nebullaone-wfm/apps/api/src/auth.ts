import bcrypt from 'bcryptjs';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { pool } from './db';
import type { Role } from './entities';
import { forbidden, HttpError } from './repo';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: Role;
  vendorId: string | null;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthUser;
    user: AuthUser;
  }
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrator',
  procurement: 'Procurement',
  legal: 'Legal Counsel',
  finance: 'Finance Controller',
  project: 'Project / Site Engineer',
  qa_hse: 'QA / HSE',
  vendor: 'Vendor portal user',
};

/** Approval stage names used in settings → role that may act on them. */
export const STAGE_ROLE: Record<string, Role> = {
  Procurement: 'procurement',
  Legal: 'legal',
  'Legal Counsel': 'legal',
  Finance: 'finance',
  'Finance Controller': 'finance',
  Project: 'project',
  'Project Manager': 'project',
};

export const hashPassword = (p: string) => bcrypt.hash(p, 10);

export async function authenticate(req: FastifyRequest): Promise<void> {
  try {
    await req.jwtVerify();
  } catch {
    throw new HttpError(401, 'Please sign in');
  }
}

export const requireRole = (...roles: Role[]) => async (req: FastifyRequest, _rep: FastifyReply) => {
  await authenticate(req);
  if (req.user.role !== 'admin' && !roles.includes(req.user.role)) throw forbidden();
};

export const requireInternal = requireRole('procurement', 'legal', 'finance', 'project', 'qa_hse');

export const userLabel = (u: AuthUser) => `${u.name} (${ROLE_LABELS[u.role]})`;

export function canActOnStage(u: AuthUser, stage: string): boolean {
  return u.role === 'admin' || STAGE_ROLE[stage] === u.role;
}

const loginBody = z.object({ email: z.string().email(), password: z.string().min(1) });

/** Simple brute-force protection: 5 failed attempts per email+IP locks for 15 minutes. */
const failures = new Map<string, { count: number; until: number }>();
const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60_000;

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/login', async (req) => {
    const { email, password } = loginBody.parse(req.body);
    const key = `${email.toLowerCase()}|${req.ip}`;
    const f = failures.get(key);
    if (f && f.count >= MAX_FAILURES && f.until > Date.now())
      throw new HttpError(429, 'Too many failed sign-in attempts — try again in 15 minutes');
    const r = await pool.query('SELECT * FROM users WHERE lower(email) = lower($1) AND active', [email]);
    const row = r.rows[0];
    // Same error for unknown user and wrong password — don't reveal which accounts exist.
    if (!row || !(await bcrypt.compare(password, row.password_hash))) {
      const cur = f && f.until > Date.now() ? f : { count: 0, until: 0 };
      failures.set(key, { count: cur.count + 1, until: Date.now() + LOCK_MS });
      throw new HttpError(401, 'Wrong email or password');
    }
    failures.delete(key);
    const user: AuthUser = { id: row.id, email: row.email, name: row.name, role: row.role, vendorId: row.vendor_id };
    const token = app.jwt.sign(user, { expiresIn: '12h' });
    return { token, user };
  });

  app.get('/api/auth/me', { preHandler: authenticate }, async (req) => ({ user: req.user }));

  app.get('/api/users', { preHandler: requireRole('admin') }, async () => {
    const r = await pool.query('SELECT id, email, name, role, vendor_id AS "vendorId", active FROM users ORDER BY id');
    return r.rows;
  });

  const newUser = z.object({
    email: z.string().email(),
    name: z.string().min(1),
    role: z.enum(['admin', 'procurement', 'legal', 'finance', 'project', 'qa_hse', 'vendor']),
    vendorId: z.string().nullable().optional(),
    password: z.string().min(10, 'Password must be at least 10 characters'),
  });
  app.post('/api/users', { preHandler: requireRole('admin') }, async (req) => {
    const b = newUser.parse(req.body);
    if ((b.role === 'vendor') !== !!b.vendorId) throw new HttpError(400, 'Vendor users need a vendor; internal users must not have one');
    const r = await pool.query(
      'INSERT INTO users (email, name, role, vendor_id, password_hash) VALUES ($1,$2,$3,$4,$5) RETURNING id, email, name, role, vendor_id AS "vendorId"',
      [b.email, b.name, b.role, b.vendorId ?? null, await hashPassword(b.password)],
    );
    return r.rows[0];
  });
}
