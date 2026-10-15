import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env relative to server root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI không được để trống'),
  MONGODB_URI_TEST: z.string().default('mongodb://127.0.0.1:27017/motorent_test'),
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
  CLOUDINARY_CLOUD_NAME: z.string().default('dsxbuk4pe'),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  SEED_PASSWORD: z.string().default('Motorent@2026'),
  TRUST_PROXY: z.string().default('1'),
}).superRefine((val, ctx) => {
  if (val.NODE_ENV === 'production') {
    if (!val.VNP_TMNCODE || val.VNP_TMNCODE === 'DEMO_CODE') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'VNP_TMNCODE là bắt buộc và không được dùng DEMO_CODE trên môi trường production',
        path: ['VNP_TMNCODE'],
      });
    }
    if (!val.VNP_HASHSECRET || val.VNP_HASHSECRET === 'DEMO_SECRET') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'VNP_HASHSECRET là bắt buộc và không được dùng DEMO_SECRET trên môi trường production',
        path: ['VNP_HASHSECRET'],
      });
    }
    if (!val.VNP_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'VNP_URL là bắt buộc trên môi trường production',
        path: ['VNP_URL'],
      });
    }
    if (!val.VNP_RETURNURL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'VNP_RETURNURL là bắt buộc trên môi trường production',
        path: ['VNP_RETURNURL'],
      });
    }
    if (val.JWT_SECRET.includes('motorent_super_secret')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'JWT_SECRET không được dùng chuỗi mẫu mặc định trên production',
        path: ['JWT_SECRET'],
      });
    }
  }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[CONFIG ERROR] Cấu hình biến môi trường không hợp lệ:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export type EnvConfig = z.infer<typeof envSchema>;
