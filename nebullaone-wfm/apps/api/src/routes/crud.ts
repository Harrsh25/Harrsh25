/**
 * Generic read endpoints for every entity, plus create/patch for the simple
 * entities that have no workflow. Anything with a workflow (approvals, billing,
 * receipts, payments…) is only changed through its action routes.
 */
import type { FastifyInstance } from 'fastify';
import { authenticate } from '../auth';
import { pool } from '../db';
import { ENTITIES, entity, INTERNAL_ROLES } from '../entities';
import { forbidden, get, insert, list, notFound, save } from '../repo';
import { derive } from '../services/derive';
import { act } from './helpers';

const PROTECTED_FIELDS = ['id', 'status', 'approval', 'history', 'payments', 'receipts', 'createdAt', 'vendorId'];

export async function crudRoutes(app: FastifyInstance) {
  app.get<{ Params: { entity: string } }>('/api/data/:entity', { preHandler: authenticate }, async (req) => {
    const def = ENTITIES.find((e) => e.name === req.params.entity);
    if (!def) throw notFound(`Collection ${req.params.entity}`);
    const u = req.user;
    const readRoles = def.readRoles ?? [...INTERNAL_ROLES, 'vendor'];
    if (u.role !== 'admin' && !readRoles.includes(u.role)) throw forbidden();
    const rows = await list(def.name, { vendorId: u.role === 'vendor' ? u.vendorId! : undefined });
    return derive(def.name, rows, pool);
  });

  app.get<{ Params: { entity: string; id: string } }>('/api/data/:entity/:id', { preHandler: authenticate }, async (req) => {
    const def = ENTITIES.find((e) => e.name === req.params.entity);
    if (!def) throw notFound(`Collection ${req.params.entity}`);
    const u = req.user;
    const readRoles = def.readRoles ?? [...INTERNAL_ROLES, 'vendor'];
    if (u.role !== 'admin' && !readRoles.includes(u.role)) throw forbidden();
    const row = await get(def.name, req.params.id);
    if (u.role === 'vendor') {
      const vid = def.vendorColumn === 'id' ? row.id : row.vendorId;
      if (!def.vendorColumn || vid !== u.vendorId) throw notFound(`${def.name} ${req.params.id}`);
    }
    return (await derive(def.name, [row], pool))[0];
  });

  app.post<{ Params: { entity: string }; Body: Record<string, any> }>('/api/data/:entity', { preHandler: authenticate }, async (req) => {
    const def = entity(req.params.entity);
    if (req.user.role !== 'admin' && !def.writeRoles.includes(req.user.role)) throw forbidden();
    if (!def.writeRoles.length) throw forbidden(`${def.name} are created through their workflow screen`);
    const body = { ...(req.body ?? {}) };
    delete body.id;
    return act(req, async ({ db, by, log }) => {
      const row = await insert(def.name, { ...body, createdBy: by, createdAt: new Date().toISOString() }, db);
      await log(def.name, row.id, 'Created');
      return row;
    });
  });

  app.patch<{ Params: { entity: string; id: string }; Body: Record<string, any> }>('/api/data/:entity/:id', { preHandler: authenticate }, async (req) => {
    const def = entity(req.params.entity);
    if (req.user.role !== 'admin' && !def.writeRoles.includes(req.user.role)) throw forbidden();
    if (!def.writeRoles.length) throw forbidden(`${def.name} are changed through their workflow actions`);
    return act(req, async ({ db, log }) => {
      const cur = await get(def.name, req.params.id, db, true);
      const patch = { ...(req.body ?? {}) };
      const expected = patch._v;
      for (const f of PROTECTED_FIELDS) delete patch[f];
      delete patch._v;
      const next = await save(def.name, { ...cur, ...patch, id: cur.id }, db, typeof expected === 'number' ? expected : undefined);
      await log(def.name, cur.id, 'Updated', { fields: Object.keys(patch) });
      return next;
    });
  });
}
