// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./tests/setup/env.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx,js}'],
    pool: 'threads',
    poolOptions: { threads: { minThreads: 1, maxThreads: 1 } },
    globals: true,
    environment: 'node',
    coverage: { provider: 'v8' },
    globalSetup: ['./tests/setup/global.ts'],
    testTimeout: 60000,
    reporters: process.env.CI ? ['dot'] : ['default'],
  },
});
