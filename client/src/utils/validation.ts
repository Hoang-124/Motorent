/**
 * Client validation utilities for MOTORENT forms
 * Strictly adheres to SVG icons, TypeScript types, and localized Vietnamese messages.
 */

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export interface PasswordStrength {
  score: number; // 0 - 4
  label: 'Rất yếu' | 'Yếu' | 'Trung bình' | 'Mạnh' | 'Rất mạnh';
  color: string; // Tailwind color class
  bgClass: string;
  widthPercent: number;
  suggestions: string[];
}

/**
 * Validates a username
 * - Required
 * - Length: 3 - 30 characters
 * - Characters: alphanumeric, underscore, dot (no spaces)
 */
export const validateUsername = (username: string): string | null => {
  const trimmed = username.trim();
  if (!trimmed) {
    return 'Vui lòng nhập tên đăng nhập.';
  }
  if (trimmed.length < 3) {
    return 'Tên đăng nhập phải có ít nhất 3 ký tự.';
  }
  if (trimmed.length > 30) {
    return 'Tên đăng nhập không được vượt quá 30 ký tự.';
  }
  const usernameRegex = /^[a-zA-Z0-9_.]+$/;
  if (!usernameRegex.test(trimmed)) {
    return 'Tên đăng nhập chỉ được chứa chữ cái, số, dấu gạch dưới (_) hoặc dấu chấm (.).';
  }
  return null;
};

/**
 * Checks if an email address belongs to Google domain (@gmail.com or @googlemail.com)
 */
export const isGoogleEmailDomain = (email: string): boolean => {
  const trimmed = email.trim().toLowerCase();
  return /@(gmail\.com|googlemail\.com)$/i.test(trimmed);
};

/**
 * Validates an email address
 * - Required
 * - Standard email format
 * - Checks for Google email if disallowGoogle is true
 */
export const validateEmail = (
  email: string,
  options?: { disallowGoogle?: boolean }
): string | null => {
  const trimmed = email.trim();
  if (!trimmed) {
    return 'Vui lòng nhập địa chỉ email.';
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return 'Địa chỉ email không đúng định dạng (VD: an@outlook.com.vn).';
  }
  if (options?.disallowGoogle && isGoogleEmailDomain(trimmed)) {
    return 'Email của Google (@gmail.com). Vui lòng đăng nhập bằng Google.';
  }
  return null;
};

/**
 * Validates a Vietnamese mobile phone number
 * - Optional, but if provided must match VN phone standards
 * - Supports formats: 0912345678, 0912 345 678, +84912345678
 */
export const validatePhoneNumber = (phone: string): string | null => {
  const trimmed = phone.trim().replace(/[\s.-]/g, '');
  if (!trimmed) {
    return null; // Phone is optional in initial register
  }
  const vnPhoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
  if (!vnPhoneRegex.test(trimmed)) {
    return 'Số điện thoại di động không hợp lệ (10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09).';
  }
  return null;
};

/**
 * Validates password
 * - Required
 * - Minimum 8 characters
 */
export const validatePassword = (password: string): string | null => {
  if (!password) {
    return 'Vui lòng nhập mật khẩu.';
  }
  if (password.length < 8) {
    return 'Mật khẩu phải có độ dài tối thiểu từ 8 ký tự.';
  }
  return null;
};

/**
 * Validates confirm password
 * - Required
 * - Must match password
 */
export const validateConfirmPassword = (password: string, confirmPassword: string): string | null => {
  if (!confirmPassword) {
    return 'Vui lòng xác nhận lại mật khẩu.';
  }
  if (password !== confirmPassword) {
    return 'Mật khẩu xác nhận không trùng khớp.';
  }
  return null;
};

/**
 * Validates first name / last name
 * - Optional
 * - Max length 50
 * - Disallow special characters and numbers if provided
 */
export const validateName = (name: string, fieldName: string): string | null => {
  const trimmed = name.trim();
  if (!trimmed) return null;
  if (trimmed.length > 50) {
    return `${fieldName} không được vượt quá 50 ký tự.`;
  }
  // Allow Unicode letters (Vietnamese accents) and spaces
  const nameRegex = /^[\p{L}\s]+$/u;
  if (!nameRegex.test(trimmed)) {
    return `${fieldName} chỉ được chứa chữ cái, không chứa số hoặc ký tự đặc biệt.`;
  }
  return null;
};

/**
 * Calculates password strength indicator
 */
export const calculatePasswordStrength = (password: string): PasswordStrength => {
  if (!password) {
    return {
      score: 0,
      label: 'Rất yếu',
      color: 'text-slate-400',
      bgClass: 'bg-slate-200',
      widthPercent: 0,
      suggestions: ['Nhập ít nhất 6 ký tự'],
    };
  }

  let score = 0;
  const suggestions: string[] = [];

  // Length check
  if (password.length >= 6) score += 1;
  else suggestions.push('Ít nhất 6 ký tự');

  if (password.length >= 8) score += 1;

  // Has lowercase and uppercase
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    score += 1;
  } else {
    suggestions.push('Chữ hoa & chữ thường');
  }

  // Has number
  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    suggestions.push('Ít nhất 1 chữ số');
  }

  // Has special character
  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 1;
  } else {
    suggestions.push('Ký tự đặc biệt (@, #, $...)');
  }

  // Normalize score to max 4
  const normalizedScore = Math.min(4, Math.max(1, score - (password.length < 6 ? 1 : 0)));

  switch (normalizedScore) {
    case 1:
      return {
        score: 1,
        label: 'Yếu',
        color: 'text-red-500',
        bgClass: 'bg-red-500',
        widthPercent: 25,
        suggestions,
      };
    case 2:
      return {
        score: 2,
        label: 'Trung bình',
        color: 'text-amber-500',
        bgClass: 'bg-amber-500',
        widthPercent: 50,
        suggestions,
      };
    case 3:
      return {
        score: 3,
        label: 'Mạnh',
        color: 'text-emerald-500',
        bgClass: 'bg-emerald-500',
        widthPercent: 75,
        suggestions,
      };
    case 4:
      return {
        score: 4,
        label: 'Rất mạnh',
        color: 'text-forest-700',
        bgClass: 'bg-forest-600',
        widthPercent: 100,
        suggestions: [],
      };
    default:
      return {
        score: 0,
        label: 'Rất yếu',
        color: 'text-red-500',
        bgClass: 'bg-red-500',
        widthPercent: 15,
        suggestions,
      };
  }
};
