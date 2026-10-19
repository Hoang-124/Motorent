import { defineConfig } from 'vitest/config';

// Deliberately excludes the default database setup and uses mocked model access.
export default defineConfig({
  test: {
    include: ['src/__tests__/category_management.test.ts'],
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'isolated-category-tests-only-secret',
    },
    clearMocks: true,
    restoreMocks: true,
    testTimeout: 10000,
  },
});
