import sanitizeHtml from 'sanitize-html';

export const SYSTEM_PAGE_SLUGS = ['faq', 'terms', 'privacy'] as const;
export type SystemPageSlug = (typeof SYSTEM_PAGE_SLUGS)[number];

export const RESERVED_SLUGS = new Set<string>([
  'admin',
  'login',
  'register',
  'api',
  'vehicles',
  'bookings',
  'profile',
  'wishlist',
  'complaints',
  'bikes',
  'branches',
  'counter',
  'audit',
  'verify-email',
  'forgot-password',
  'reset-password',
  'vnpay-return',
  'health',
  'auth',
  'feedbacks',
  'payments',
  'chat',
  'finance',
  'notifications',
  'users',
  'categories',
  'orders',
  'dashboard',
  'settings',
  'system',
  'pages',
]);

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Generates a clean kebab-case slug from raw text by removing Vietnamese diacritics
 * and special characters.
 */
export function generateSlug(text: string): string {
  if (!text) return '';

  const slug = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (slug.length > 80) {
    return slug.slice(0, 80).replace(/-+$/, '');
  }

  return slug;
}

/**
 * Validates slug format, length, and reserved routes.
 */
export function validateSlug(slug: string): { isValid: boolean; error?: string } {
  if (!slug || typeof slug !== 'string') {
    return { isValid: false, error: 'Slug là bắt buộc và phải là chuỗi ký tự.' };
  }

  const normalized = slug.trim().toLowerCase();

  if (normalized.length < 3 || normalized.length > 80) {
    return {
      isValid: false,
      error: 'Slug phải có độ dài từ 3 đến 80 ký tự.',
    };
  }

  if (!SLUG_REGEX.test(normalized)) {
    return {
      isValid: false,
      error: 'Slug không hợp lệ. Chỉ chấp nhận chữ thường, số và dấu gạch nối (kebab-case, ví dụ: ve-chung-toi).',
    };
  }

  if (RESERVED_SLUGS.has(normalized)) {
    return {
      isValid: false,
      error: `Slug "${normalized}" trùng với đường dẫn hệ thống đã được bảo lưu. Vui lòng chọn slug khác.`,
    };
  }

  return { isValid: true };
}

/**
 * Backend HTML sanitizer using sanitize-html.
 * Allowlist tags: p, h1-h4, ul, ol, li, strong, em, a, br, blockquote, table, etc.
 * Disallowed: script, iframe, style, on*, javascript:
 * Enforces rel="noopener noreferrer" for any target="_blank" <a> tag.
 */
export function sanitizePageContent(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') {
    return '';
  }

  return sanitizeHtml(rawHtml, {
    allowedTags: [
      'p',
      'h1',
      'h2',
      'h3',
      'h4',
      'ul',
      'ol',
      'li',
      'strong',
      'em',
      'b',
      'i',
      'u',
      's',
      'strike',
      'a',
      'br',
      'hr',
      'blockquote',
      'table',
      'thead',
      'tbody',
      'tfoot',
      'tr',
      'th',
      'td',
      'code',
      'pre',
      'span',
    ],
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel', 'title'],
      table: ['class', 'border'],
      th: ['scope', 'colspan', 'rowspan', 'align', 'class'],
      td: ['colspan', 'rowspan', 'align', 'class'],
      span: ['class'],
      p: ['class'],
      h1: ['class'],
      h2: ['class'],
      h3: ['class'],
      h4: ['class'],
      ul: ['class'],
      ol: ['class'],
      li: ['class'],
      blockquote: ['class'],
      code: ['class'],
      pre: ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: {
      a: ['http', 'https', 'mailto', 'tel'],
    },
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName: string, attribs: Record<string, string>) => {
        const nextAttribs = { ...attribs };
        if (nextAttribs.target === '_blank') {
          nextAttribs.rel = 'noopener noreferrer';
        }
        return {
          tagName,
          attribs: nextAttribs,
        };
      },
    },
  });
}
