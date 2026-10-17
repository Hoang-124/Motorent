import { defineConfig } from 'vitest/config';

// Deliberately independent of vitest.config.mts and all inherited database URIs.
const fallbackDatabaseName = `motorent_guest_uc03_14_${process.pid}_${Date.now()}`;
const localMongoUri = `mongodb://127.0.0.1:27017/${fallbackDatabaseName}?serverSelectionTimeoutMS=3000&connectTimeoutMS=3000`;

export default defineConfig({
  test: {
    include: ['src/__tests__/guest_vehicle.test.ts'],
    environment: 'node',
    pool: 'forks',
    fileParallelism: false,
    maxWorkers: 1,
    isolate: true,
    testTimeout: 15000,
    hookTimeout: 20000,
    env: {
      NODE_ENV: 'test',
      PORT: '0',
      MONGODB_URI: localMongoUri,
      MONGODB_URI_TEST: localMongoUri,
      JWT_SECRET: 'guest_api_tests_local_only_32_characters_minimum',
      CLIENT_URL: 'http://127.0.0.1:5173',
      GOOGLE_CLIENT_ID: 'guest-api-tests.apps.googleusercontent.com',
      GOOGLE_CLIENT_SECRET: '',
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: '1',
      SMTP_USER: '',
      SMTP_PASS: '',
      CLOUDINARY_CLOUD_NAME: '',
      CLOUDINARY_API_KEY: '',
      CLOUDINARY_API_SECRET: '',
      VNP_TMNCODE: 'GUEST_TEST_ONLY',
      VNP_HASHSECRET: 'guest-test-only-secret',
      VNP_URL: 'http://127.0.0.1:1/vnpay-disabled',
      VNP_RETURNURL: 'http://127.0.0.1:5173/vnpay-return',
      TRUST_PROXY: '1',
    },
  },
});
