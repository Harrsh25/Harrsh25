import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireRole } from '../auth';
import { conflict, forbidden, get, insert, mutate } from '../repo';
import { act, isoDate, nowISO, params, parse } from './helpers';

type Doc = Record<string, any>;

const newHold = z.object({
  level: z.enum(['Vendor', 'Contract', 'Invoice']),
  vendorId: z.string().min(1),
  refId: z.string().nullable().optional(),
  scope: z.enum(['All', 'RFQ/PO', 'Invoices', 'Payments']),
  detail: z.string().min(5, 'describe why (at least 5 characters)'),
  releaseDate: isoDate.nullable().optional(),
}).refine((h) => h.level === 'Vendor' || !!h.refId, { message: 'Contract and invoice holds need the document id', path: ['refId'] });

export async function holdRoutes(app: FastifyInstance) {
  // Manual holds (automatic Compliance / Performance holds are raised by the system)
  app.post('/api/holds', { preHandler: requireRole('procurement', 'finance', 'legal') }, async (req) => {
    const b = parse(newHold, req.body);
    return act(req, async ({ db, by, log }) => {
      await get('vendors', b.vendorId, db);
      if (b.level === 'Contract') {
        const c = await get('contracts', b.refId!, db);
        if (c.vendorId !== b.vendorId) throw conflict('Contract belongs to another vendor');
      }
      if (b.level === 'Invoice') {
        const i = await get('invoices', b.refId!, db);
        if (i.vendorId !== b.vendorId) throw conflict('Invoice belongs to another vendor');
      }
      const h = await insert('holds', { ...b, refId: b.refId ?? null, reason: 'Manual', source: 'Holds register', raisedBy: by, raisedAt: nowISO(), status: 'Active' }, db);
      await log('holds', h.id, `Hold placed (${b.scope})`, { detail: b.detail });
      return h;
    });
  });

  const release = z.object({ note: z.string().min(3, 'say why the hold is released') });
  app.post('/api/holds/:id/release', { preHandler: requireRole('procurement', 'finance', 'legal') }, async (req) => {
    const { id } = parse(params, req.params);
    const b = parse(release, req.body);
    return act(req, async ({ db, user, by, log }) => {
      const h = await mutate('holds', id, db, (h: Doc) => {
        if (h.status !== 'Active') throw conflict('Hold is already released');
        if (h.permanent && user.role !== 'admin' && user.role !== 'legal') throw forbidden('Only Legal or an administrator can lift a blacklist');
        if (h.auto) throw conflict(`This hold is automatic — it is released when the cause is fixed (${h.reason === 'Compliance' ? 'restore compliance' : 'score recovers'})`);
        h.status = 'Released'; h.releasedBy = by; h.releasedAt = nowISO(); h.releaseNote = b.note;
      });
      if (h.permanent) await mutate('vendors', h.vendorId, db, (v: Doc) => { if (v.status === 'Blacklisted') v.status = 'Active'; });
      await log('holds', id, 'Hold released', b);
      return h;
    });
  });
}
