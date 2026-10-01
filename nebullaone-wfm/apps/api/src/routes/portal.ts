import type { FastifyInstance } from 'fastify';
import { authenticate } from '../auth';
import { forbidden, list } from '../repo';

type Doc = Record<string, any>;

/** Vendor-portal views that need filtering beyond "rows with my vendor id". */
export async function portalRoutes(app: FastifyInstance) {
  // RFQs the vendor is invited to — with only their own quote (never competitors' prices).
  app.get<{ Querystring: { vendorId?: string } }>('/api/portal/rfqs', { preHandler: authenticate }, async (req) => {
    const u = req.user;
    const vendorId = u.role === 'vendor' ? u.vendorId! : req.query.vendorId;
    if (!vendorId) throw forbidden('vendorId is required');
    const rfqs = await list('rfqs');
    return rfqs
      .filter((r) => r.status !== 'Draft' && (r.vendorIds ?? []).includes(vendorId))
      .map((r) => ({
        id: r.id, title: r.title, project: r.project, status: r.status, dueDate: r.dueDate, items: r.items, incoterm: r.incoterm, tnc: r.tnc,
        myQuote: (r.quotes ?? []).find((q: Doc) => q.vendorId === vendorId) ?? null,
        myResponse: r.responses?.[vendorId] ?? null,
        awardedToMe: (r.awards ?? []).filter((a: Doc) => a.vendorId === vendorId).map((a: Doc) => ({ line: a.line, poId: a.poId })),
      }));
  });
}
