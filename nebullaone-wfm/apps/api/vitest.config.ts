import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://nebulla:nebulla@localhost:5432/nebulla_test',
      JWT_SECRET: 'test-secret',
      SEED_PASSWORD: 'nebulla123',
    },
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
