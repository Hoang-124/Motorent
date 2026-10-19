import { defineConfig } from 'vitest/config';

const databaseName = `motorent_fleet_uc64_77_80_${process.pid}_${Date.now()}`;
const uri = `mongodb://127.0.0.1:27017/${databaseName}?serverSelectionTimeoutMS=3000&connectTimeoutMS=3000`;
export default defineConfig({
  test: {
    include: ['src/__tests__/fleet_operations.test.ts'], environment: 'node', pool: 'forks',
    fileParallelism: false, maxWorkers: 1, isolate: true, testTimeout: 15000, hookTimeout: 20000,
    env: { NODE_ENV: 'test', PORT: '0', MONGODB_URI: uri, MONGODB_URI_TEST: uri,
      JWT_SECRET: 'fleet_local_integration_tests_32_characters_minimum', CLIENT_URL: 'http://127.0.0.1:5173',
      GOOGLE_CLIENT_ID: 'fleet-local-tests.apps.googleusercontent.com', GOOGLE_CLIENT_SECRET: '',
      SMTP_HOST: '127.0.0.1', SMTP_PORT: '1', SMTP_USER: '', SMTP_PASS: '',
      CLOUDINARY_CLOUD_NAME: '', CLOUDINARY_API_KEY: '', CLOUDINARY_API_SECRET: '',
      VNP_TMNCODE: 'FLEET_TEST_ONLY', VNP_HASHSECRET: 'fleet-local-test-only-secret',
      VNP_URL: 'http://127.0.0.1:1/disabled', VNP_RETURNURL: 'http://127.0.0.1:5173/vnpay-return' },
  },
});
