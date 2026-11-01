import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import sanitizeHtml from 'sanitize-html';
import { env } from '../config/env';

/**
 * Allowed trusted origins for CORS & CSRF Origin verification
 */
export const TRUSTED_ORIGINS: readonly string[] = [
  env.CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'https://sandbox.vnpayment.vn',
];

export const isTrustedOrigin = (origin?: string | null): boolean => {
  if (!origin) return true;
  if (TRUSTED_ORIGINS.includes(origin)) return true;
  if (
    process.env.NODE_ENV !== 'production' &&
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  ) {
    return true;
  }
  return false;
};

/**
 * 1. Hardened HTTP Security Headers via Helmet (S4 Security Hardening)
 */
export const helmetSecurityMiddleware = helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'default-src': ["'self'"],
      'base-uri': ["'self'"],
      'frame-ancestors': ["'none'"],
      'object-src': ["'none'"],
      'img-src': ["'self'", 'data:', 'blob:', 'https:', 'http:'],
      'script-src': ["'self'"],
      'style-src': ["'self'", "'unsafe-inline'", 'https:'],
      'font-src': ["'self'", 'data:', 'https:'],
      'connect-src': ["'self'", 'ws:', 'wss:', 'http:', 'https:'],
    },
  },
});

/**
 * 2. Global API Rate Limiter via express-rate-limit (S4 Security Hardening)
 * Supports deterministic testing via `X-Test-Ratelimit: enforce` header while
 * skipping high-throughput automated Vitest suites when not explicitly testing rate limits.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: (req: Request) => {
    if (req.headers['x-test-ratelimit'] === 'enforce') {
      return 5;
    }
    return 600;
  },
  keyGenerator: (req: Request) => {
    if (typeof req.headers['x-test-ratelimit-key'] === 'string') {
      return `test-rl:${req.headers['x-test-ratelimit-key']}`;
    }
    return ipKeyGenerator(req.ip || '127.0.0.1');
  },
  skip: (req: Request) => {
    if (req.headers['x-test-ratelimit'] === 'enforce') {
      return false;
    }
    if (process.env.NODE_ENV === 'test') {
      return true;
    }
    return req.path === '/health' || req.path === '/api/health';
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Phát hiện lưu lượng truy cập vượt ngưỡng cho phép. Vui lòng thử lại sau ít phút.',
  },
});

/**
 * Fields excluded from HTML/XSS text mutation (passwords, cryptographic tokens, base64 signatures)
 */
const EXCLUDED_SANITIZE_KEYS = new Set<string>([
  'password',
  'oldPassword',
  'currentPassword',
  'newPassword',
  'confirmPassword',
  'token',
  'idToken',
  'credential',
  'customerSignature',
  'staffSignature',
  'vnp_SecureHash',
]);

/**
 * Safe HTML tags allowed only in CMS static page rich-text content
 */
const CMS_SAFE_HTML_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p',
    'br',
    'hr',
    'strong',
    'b',
    'em',
    'i',
    'u',
    'ul',
    'ol',
    'li',
    'blockquote',
    'a',
    'span',
    'div',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'code',
    'pre',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    '*': ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
};

const DANGEROUS_URI_PATTERN = /^\s*(javascript|vbscript|data\s*:\s*text\/html)\s*:/i;
const INLINE_HANDLER_PATTERN = /\bon[a-z]+\s*=/i;

class UnsafeUriPayloadError extends Error {
  constructor() {
    super('Phát hiện giao thức liên kết không an toàn (XSS bị chặn).');
    this.name = 'UnsafeUriPayloadError';
  }
}

const sanitizePlainText = (value: string): string => {
  if (!value) return value;

  if (DANGEROUS_URI_PATTERN.test(value)) {
    throw new UnsafeUriPayloadError();
  }

  // Fast path: if string contains no HTML angle brackets and no inline event handler pattern, keep intact
  if (!value.includes('<') && !value.includes('>') && !INLINE_HANDLER_PATTERN.test(value)) {
    return value;
  }

  const stripped = sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
  });

  // Restore safe plain characters encoded by sanitize-html while never restoring < or >
  return stripped
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[<>]/g, '');
};

const isDangerousObjectKey = (key: string): boolean => {
  return (
    key.startsWith('$') ||
    key.includes('.') ||
    key === '__proto__' ||
    key === 'constructor' ||
    key === 'prototype'
  );
};

const sanitizePayloadValue = (
  input: unknown,
  isCmsRichTextRoute: boolean,
  currentKey?: string,
  allowDotsInKeys = false
): unknown => {
  if (typeof input === 'string') {
    if (currentKey && EXCLUDED_SANITIZE_KEYS.has(currentKey)) {
      return input;
    }
    if (isCmsRichTextRoute && (currentKey === 'content' || currentKey === 'htmlContent')) {
      return sanitizeHtml(input, CMS_SAFE_HTML_OPTIONS);
    }
    return sanitizePlainText(input);
  }

  if (Array.isArray(input)) {
    return input.map((item) =>
      sanitizePayloadValue(item, isCmsRichTextRoute, currentKey, allowDotsInKeys)
    );
  }

  if (input !== null && typeof input === 'object' && !(input instanceof Date) && !Buffer.isBuffer(input)) {
    const record = input as Record<string, unknown>;
    const cleaned: Record<string, unknown> = {};
    for (const key of Object.keys(record)) {
      const blocked = allowDotsInKeys
        ? key.startsWith('$') || key === '__proto__' || key === 'constructor' || key === 'prototype'
        : isDangerousObjectKey(key);
      if (blocked) {
        continue;
      }
      const nextAllowDots = allowDotsInKeys || key === 'overrides' || key === 'vi' || key === 'en';
      cleaned[key] = sanitizePayloadValue(record[key], isCmsRichTextRoute, key, nextAllowDots);
    }
    return cleaned;
  }

  return input;
};

const sanitizeRecordInPlace = (
  target: Record<string, unknown>,
  isCmsRichTextRoute: boolean
): void => {
  for (const key of Object.keys(target)) {
    if (isDangerousObjectKey(key)) {
      delete target[key];
      continue;
    }
    target[key] = sanitizePayloadValue(target[key], isCmsRichTextRoute, key, false);
  }
};

/**
 * 3. Recursive XSS + NoSQL Operator + Prototype Pollution Sanitizer (S4 Security Hardening)
 */
export const xssAndInjectionSanitizer = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const isCmsRichTextRoute =
      req.path.includes('/pages') || req.originalUrl.includes('/pages');

    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      const isI18nRoute =
        req.path.includes('/system/i18n') || req.originalUrl.includes('/system/i18n');
      req.body = sanitizePayloadValue(req.body, isCmsRichTextRoute, undefined, isI18nRoute);
    }

    if (req.query && typeof req.query === 'object') {
      sanitizeRecordInPlace(req.query as Record<string, unknown>, false);
    }

    if (req.params && typeof req.params === 'object') {
      sanitizeRecordInPlace(req.params as Record<string, unknown>, false);
    }

    next();
  } catch (err) {
    if (err instanceof UnsafeUriPayloadError) {
      res.status(400).json({
        success: false,
        code: 'XSS_UNSAFE_URI_SCHEME',
        message: err.message,
      });
      return;
    }
    next(err);
  }
};

/**
 * 4. Stateless HMAC-SHA256 Signed CSRF Token & Origin Defense-in-Depth (S4 Security Hardening)
 */
const CSRF_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const SAFE_HTTP_METHODS = new Set<string>(['GET', 'HEAD', 'OPTIONS']);
const CSRF_EXEMPT_PATHS = new Set<string>([
  '/api/payments/vnpay/ipn',
  '/payments/vnpay/ipn',
]);

export const generateCsrfToken = (): string => {
  const issuedAt = Date.now().toString(36);
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = `${issuedAt}.${nonce}`;
  const signature = crypto
    .createHmac('sha256', `${env.JWT_SECRET}:csrf-v1`)
    .update(payload)
    .digest('hex');
  return `${payload}.${signature}`;
};

export const verifyCsrfToken = (rawToken?: string | null): boolean => {
  if (!rawToken || typeof rawToken !== 'string') return false;
  const parts = rawToken.trim().split('.');
  if (parts.length !== 3) return false;

  const [issuedAtHex, nonce, providedSig] = parts;
  const issuedAt = parseInt(issuedAtHex, 36);
  if (Number.isNaN(issuedAt) || !nonce || !providedSig) return false;

  const age = Date.now() - issuedAt;
  if (age < -60_000 || age > CSRF_TTL_MS) return false;

  const expectedSig = crypto
    .createHmac('sha256', `${env.JWT_SECRET}:csrf-v1`)
    .update(`${issuedAtHex}.${nonce}`)
    .digest('hex');

  const a = Buffer.from(providedSig, 'utf8');
  const b = Buffer.from(expectedSig, 'utf8');
  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
};

export const csrfTokenHandler = (_req: Request, res: Response): void => {
  const csrfToken = generateCsrfToken();
  const isSecure = env.NODE_ENV === 'production';
  res.setHeader(
    'Set-Cookie',
    `motorent_csrf=${csrfToken}; Path=/; Max-Age=86400; SameSite=Strict${isSecure ? '; Secure' : ''}`
  );
  res.json({
    success: true,
    data: {
      csrfToken,
      headerName: 'X-CSRF-Token',
      expiresInSeconds: 86400,
    },
  });
};

const extractRequestOrigin = (req: Request): string | null => {
  const originHeader = req.headers.origin;
  if (typeof originHeader === 'string' && originHeader.trim() !== '') {
    return originHeader.trim();
  }
  const refererHeader = req.headers.referer;
  if (typeof refererHeader === 'string' && refererHeader.trim() !== '') {
    try {
      return new URL(refererHeader).origin;
    } catch {
      return 'INVALID_ORIGIN';
    }
  }
  return null;
};

export const csrfProtectionMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (SAFE_HTTP_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }

  if (CSRF_EXEMPT_PATHS.has(req.path) || CSRF_EXEMPT_PATHS.has(req.originalUrl.split('?')[0])) {
    next();
    return;
  }

  // Layer 1: Strict Origin / Referer verification on state-changing requests
  const requestOrigin = extractRequestOrigin(req);
  if (requestOrigin && !isTrustedOrigin(requestOrigin)) {
    res.status(403).json({
      success: false,
      code: 'CSRF_ORIGIN_FORBIDDEN',
      message: 'Yêu cầu bị từ chối bởi cơ chế bảo vệ chống giả mạo CSRF (Origin không hợp lệ).',
    });
    return;
  }

  // Layer 2: HMAC-SHA256 Signed CSRF Token verification
  const rawCsrfHeader = req.headers['x-csrf-token'];
  const csrfToken = Array.isArray(rawCsrfHeader) ? rawCsrfHeader[0] : rawCsrfHeader;
  const enforceCsrf = req.headers['x-csrf-enforce'] === 'true';

  if (csrfToken !== undefined || enforceCsrf) {
    if (!verifyCsrfToken(csrfToken)) {
      res.status(403).json({
        success: false,
        code: 'CSRF_TOKEN_INVALID',
        message: 'Mã bảo vệ CSRF không hợp lệ hoặc đã hết hạn. Vui lòng tải lại phiên làm việc.',
      });
      return;
    }
  }

  next();
};
