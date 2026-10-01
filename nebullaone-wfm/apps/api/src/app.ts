import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyError } from 'fastify';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZodError } from 'zod';
import { authRoutes } from './auth';
import { config } from './config';
import { HttpError } from './repo';
import { adminRoutes } from './routes/admin';
import { billingRoutes } from './routes/billing';
import { contractRoutes } from './routes/contracts';
import { crudRoutes } from './routes/crud';
import { executionRoutes } from './routes/execution';
import { holdRoutes } from './routes/holds';
import { invoiceRoutes } from './routes/invoices';
import { portalRoutes } from './routes/portal';
import { procurementRoutes } from './routes/procurement';
import { vendorRoutes } from './routes/vendors';

export async function buildApp(opts: { logger?: boolean } = {}) {
  const logger = opts.logger === false ? false : config.isProd ? true : { level: 'warn' };
  const app = Fastify({ logger, bodyLimit: 2 * 1024 * 1024 });

  await app.register(cors, { origin: config.corsOrigin.split(',').map((s) => s.trim()), credentials: false });
  await app.register(jwt, { secret: config.jwtSecret });

  app.setErrorHandler((err: FastifyError | HttpError | ZodError, req, reply) => {
    if (err instanceof HttpError) return reply.status(err.status).send({ error: err.message, details: err.details });
    if (err instanceof ZodError) return reply.status(400).send({ error: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '), details: err.issues });
    const status = (err as FastifyError).statusCode ?? 500;
    if (status >= 500) req.log.error(err);
    return reply.status(status).send({ error: status >= 500 ? 'Something went wrong on the server' : err.message });
  });

  app.get('/api/health', async () => ({ ok: true }));
  await app.register(authRoutes);
  await app.register(crudRoutes);
  await app.register(vendorRoutes);
  await app.register(holdRoutes);
  await app.register(procurementRoutes);
  await app.register(invoiceRoutes);
  await app.register(contractRoutes);
  await app.register(executionRoutes);
  await app.register(billingRoutes);
  await app.register(adminRoutes);
  await app.register(portalRoutes);

  // In production the API also serves the built web app.
  const web = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'web', 'dist');
  if (existsSync(web)) {
    await app.register(fastifyStatic, { root: web, wildcard: false });
    app.setNotFoundHandler((req, reply) => (req.url.startsWith('/api/') ? reply.status(404).send({ error: 'Not found' }) : reply.sendFile('index.html')));
  }
  return app;
}
