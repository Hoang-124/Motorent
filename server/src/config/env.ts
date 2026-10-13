import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env relative to server root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI không được để trống'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET phải có độ dài tối thiểu 32 ký tự để bảo mật'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  CLIENT_URL: z.string().url('CLIENT_URL phải là một URL hợp lệ').default('http://localhost:5173'),
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID là bắt buộc'),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  VNP_TMNCODE: z.string().optional(),
  VNP_HASHSECRET: z.string().optional(),
  VNP_URL: z.string().optional(),
  VNP_RETURNURL: z.string().optional(),
  SEED_PASSWORD: z.string().default('Motorent@2026'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ [CONFIG ERROR] Cấu hình biến môi trường không hợp lệ:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export type EnvConfig = z.infer<typeof envSchema>;
