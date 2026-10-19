import { defineConfig } from 'vitest/config';

const unusedLocalDatabase = `mongodb://127.0.0.1:27017/motorent_manager_pricing_config_${process.pid}_${Date.now()}?serverSelectionTimeoutMS=3000&connectTimeoutMS=3000`;

// Independent of the default config/setup, which can select an external URI.
// The suite generates a second unique local URI and validates ownership before
// all fixture writes and cleanup. No gateway or other remote API is contacted.
export default defineConfig({
  test: {
    include: ['src/__tests__/manager_pricing.test.ts'],
    environment: 'node', pool: 'forks', fileParallelism: false, maxWorkers: 1,
    isolate: true, testTimeout: 15000, hookTimeout: 20000,
    env: {
      MANAGER_PRICING_ISOLATED: '1', NODE_ENV: 'test', PORT: '0',
      MONGODB_URI: unusedLocalDatabase, MONGODB_URI_TEST: unusedLocalDatabase,
      JWT_SECRET: 'manager_pricing_local_only_32_characters_minimum', CLIENT_URL: 'http://127.0.0.1:5173',
      GOOGLE_CLIENT_ID: 'manager-pricing-tests.apps.googleusercontent.com', GOOGLE_CLIENT_SECRET: '',
      SMTP_HOST: '127.0.0.1', SMTP_PORT: '1', SMTP_USER: '', SMTP_PASS: '',
      CLOUDINARY_CLOUD_NAME: '', CLOUDINARY_API_KEY: '', CLOUDINARY_API_SECRET: '',
      VNP_TMNCODE: 'PRICING_TEST_ONLY', VNP_HASHSECRET: 'manager-pricing-only-secret',
      VNP_URL: 'http://127.0.0.1:1/vnpay-disabled', VNP_RETURNURL: 'http://127.0.0.1:5173/vnpay-return', TRUST_PROXY: '1',
    },
  },
});
