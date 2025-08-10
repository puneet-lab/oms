import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: { provider: 'v8' },
    globalSetup: ['./tests/setup/global.ts'],
    testTimeout: 60000,
  },
});
