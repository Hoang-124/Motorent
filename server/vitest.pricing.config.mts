import { defineConfig } from 'vitest/config';

// Pure calculator coverage; deliberately no inherited setup/database connection.
export default defineConfig({
  test: {
    include: ['src/__tests__/pricing_calculator.test.ts'],
    environment: 'node',
    pool: 'forks',
    fileParallelism: false,
    maxWorkers: 1,
    env: {
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/motorent_pricing_calculator_unused',
      MONGODB_URI_TEST: 'mongodb://127.0.0.1:27017/motorent_pricing_calculator_unused',
      JWT_SECRET: 'pricing_calculator_local_only_secret_minimum_32',
      GOOGLE_CLIENT_ID: 'pricing-tests.apps.googleusercontent.com',
      CLIENT_URL: 'http://127.0.0.1:5173',
    },
  },
});
