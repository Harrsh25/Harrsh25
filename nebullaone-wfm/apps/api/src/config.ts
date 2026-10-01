import 'dotenv/config';

const env = (k: string, fallback?: string): string => {
  const v = process.env[k] ?? fallback;
  if (v === undefined) throw new Error(`Missing environment variable ${k}`);
  return v;
};

export const config = {
  databaseUrl: env('DATABASE_URL', 'postgres://nebulla:nebulla@localhost:5432/nebulla'),
  jwtSecret: env('JWT_SECRET', 'dev-only-secret-change-me'),
  port: Number(env('PORT', '4000')),
  corsOrigin: env('CORS_ORIGIN', 'http://localhost:5173'),
  seedPassword: env('SEED_PASSWORD', 'nebulla123'),
  isProd: process.env.NODE_ENV === 'production',
};

if (config.isProd && config.jwtSecret === 'dev-only-secret-change-me')
  throw new Error('JWT_SECRET must be set in production');
