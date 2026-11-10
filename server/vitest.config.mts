import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDir, '.env') });

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 20000,
    fileParallelism: false,
    exclude: ['**/node_modules/**', '**/dist/**', '**/manager_pricing.test.ts'],
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret_key_minimum_32_characters_long_for_security',
      MONGODB_URI_TEST: process.env.MONGODB_URI_TEST || 'mongodb+srv://duongnt047_db_user:motoren2026@cluster0.coagjwn.mongodb.net/motorent_test?retryWrites=true&w=majority',
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || 'your_google_client_id.apps.googleusercontent.com',
      CLIENT_URL: 'http://localhost:5173',
      TRUST_PROXY: '1',
    },
  },
});
