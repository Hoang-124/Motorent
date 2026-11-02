import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env relative to server root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI không được để trống').default('mongodb://127.0.0.1:27017/motorent_db'),
  MONGODB_URI_TEST: z.string().default('mongodb://127.0.0.1:27017/motorent_test'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET phải có độ dài tối thiểu 32 ký tự để bảo mật').default('your_jwt_secret_key_minimum_32_characters_long_for_security'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  CLIENT_URL: z.string().url('CLIENT_URL phải là một URL hợp lệ').default('http://localhost:5173'),
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID là bắt buộc').default('dummy_google_client_id.apps.googleusercontent.com'),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
  VNP_TMNCODE: z.string().default('CYA7OTRA'),
  VNP_HASHSECRET: z.string().default('BVZDMDWPBXKSURQPPEDEGVVRCLAUNNVR'),
  VNP_URL: z.string().default('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'),
  VNP_RETURNURL: z.string().default('http://localhost:5173/vnpay-return'),
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

const envInput: Record<string, any> = { ...process.env };
if (!envInput.JWT_SECRET || envInput.JWT_SECRET.length < 32) {
  envInput.JWT_SECRET = 'your_jwt_secret_key_minimum_32_characters_long_for_security';
}
if (!envInput.MONGODB_URI) {
  envInput.MONGODB_URI = 'mongodb://127.0.0.1:27017/motorent_db';
}
if (!envInput.GOOGLE_CLIENT_ID) {
  envInput.GOOGLE_CLIENT_ID = 'dummy_google_client_id.apps.googleusercontent.com';
}

const parsed = envSchema.safeParse(envInput);

if (!parsed.success) {
  console.error('[CONFIG ERROR] Cấu hình biến môi trường không hợp lệ:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export type EnvConfig = z.infer<typeof envSchema>;
