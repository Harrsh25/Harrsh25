import { buildApp } from './app';
import { config } from './config';
import { pool } from './db';
import { migrate } from './migrate';
import { syncComplianceHolds } from './services/rules';

const app = await buildApp();
await migrate();

// Keep automatic compliance holds current (documents expire overnight).
const sync = () => syncComplianceHolds(pool, 'System — daily check').catch((e) => app.log.error(e));
await sync();
setInterval(sync, 6 * 60 * 60 * 1000).unref();

await app.listen({ port: config.port, host: '0.0.0.0' });
console.log(`NebullaOne API listening on http://localhost:${config.port}`);
