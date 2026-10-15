import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from './authMiddleware';
import { AuditLog } from '../models/AuditLog';
import { env } from '../config/env';

const SENSITIVE_PATTERNS = [
  /^password$/i,
  /^currentpassword$/i,
  /^newpassword$/i,
  /^passwordhash$/i,
  /^token$/i,
  /^idtoken$/i,
  /^credential$/i,
  /^otp$/i,
  /^idcard/i,
  /^drivinglicense/i,
  /^secret/i,
  /^esignatureurl$/i,
];

interface AuditTrackedRequest extends AuthenticatedRequest {
  _auditLogged?: boolean;
}

export const redactSensitiveData = (data: unknown): unknown => {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const isSensitive = SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));
    if (isSensitive) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactSensitiveData(value);
    } else if (typeof value === 'string' && value.length > 500) {
      result[key] = `${value.slice(0, 500)}...[TRUNCATED]`;
    } else {
      result[key] = value;
    }
  }
  return result;
};

const capPayloadSize = (payload: Record<string, unknown>): Record<string, unknown> => {
  try {
    const serialized = JSON.stringify(payload);
    if (serialized.length > 10240) {
      return {
        truncated: true,
        preview: serialized.slice(0, 10240),
      };
    }
    return payload;
  } catch {
    return { error: 'Non-serializable payload' };
  }
};

const resolveUserIdFromRequest = (req: AuditTrackedRequest, responseBody?: unknown): mongoose.Types.ObjectId | undefined => {
  if (req.user?._id) {
    return req.user._id as mongoose.Types.ObjectId;
  }

  // Fallback 1: Decode JWT from Authorization header if route ran authenticateJWT inside sub-router
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId?: string };
      if (decoded.userId && mongoose.isValidObjectId(decoded.userId)) {
        return new mongoose.Types.ObjectId(decoded.userId);
      }
    } catch {
      // Ignore invalid token
    }
  }

  // Fallback 2: Extract user._id from login/register response payload
  if (responseBody) {
    try {
      const parsed = typeof responseBody === 'string' ? JSON.parse(responseBody) : responseBody;
      const userIdCandidate =
        parsed?.data?.user?._id ||
        parsed?.data?.user?.id ||
        parsed?.user?._id ||
        parsed?.data?._id;
      if (typeof userIdCandidate === 'string' && mongoose.isValidObjectId(userIdCandidate)) {
        return new mongoose.Types.ObjectId(userIdCandidate);
      }
    } catch {
      // Ignore parse error
    }
  }

  return undefined;
};

const extractEntityIdFromResponse = (req: AuditTrackedRequest, responseBody?: unknown): string => {
  const fromParams =
    req.params?.id ||
    req.params?.bookingId ||
    req.params?.vehicleId ||
    req.params?.conversationId ||
    req.params?.userId;
  if (fromParams) return String(fromParams);

  if (req.body && typeof req.body === 'object') {
    const bodyObj = req.body as Record<string, unknown>;
    const bodyId = bodyObj.id || bodyObj._id || bodyObj.bookingId || bodyObj.vehicleId || bodyObj.conversationId;
    if (bodyId) return String(bodyId);
  }

  if (responseBody) {
    try {
      const parsed = typeof responseBody === 'string' ? JSON.parse(responseBody) : responseBody;
      const dataId =
        parsed?.data?._id ||
        parsed?.data?.booking?._id ||
        parsed?.data?.payment?._id ||
        parsed?.data?.user?._id ||
        parsed?.data?.id;
      if (dataId) return String(dataId);
    } catch {
      // Ignore parse error
    }
  }

  return '';
};

const inferEntityAndAction = (method: string, path: string): { entity: string; action: string } => {
  const cleanPath = path.replace(/^\/api\/?/, '').split('?')[0];
  const segments = cleanPath.split('/').filter(Boolean);
  const rootSegment = (segments[0] || 'System').toLowerCase();

  const entityMap: Record<string, string> = {
    auth: 'User',
    users: 'User',
    admin: 'User',
    branches: 'Branch',
    vehicles: 'Vehicle',
    categories: 'Category',
    bookings: 'Booking',
    payments: 'Payment',
    feedbacks: 'Feedback',
    chat: 'Conversation',
    finance: 'Finance',
    audit: 'AuditLog',
  };

  const entity = entityMap[rootSegment] || 'System';
  const upperMethod = method.toUpperCase();

  // Specific semantic action mappings
  if (cleanPath.includes('auth/login')) return { entity: 'User', action: 'USER_LOGIN' };
  if (cleanPath.includes('auth/register')) return { entity: 'User', action: 'USER_REGISTER' };
  if (cleanPath.includes('auth/logout')) return { entity: 'User', action: 'USER_LOGOUT' };
  if (cleanPath.includes('auth/change-password')) return { entity: 'User', action: 'CHANGE_PASSWORD' };
  if (cleanPath.includes('auth/ekyc/review')) return { entity: 'User', action: 'REVIEW_EKYC' };
  if (cleanPath.includes('auth/ekyc')) return { entity: 'User', action: 'SUBMIT_EKYC' };
  if (cleanPath.includes('auth/me/avatar')) return { entity: 'User', action: 'UPLOAD_AVATAR' };
  if (cleanPath.includes('auth/me')) return { entity: 'User', action: 'UPDATE_PROFILE' };
  if (cleanPath.includes('payments/vietqr/confirm')) return { entity: 'Payment', action: 'CONFIRM_VIETQR_PAYMENT' };
  if (cleanPath.includes('payments/vnpay/create')) return { entity: 'Payment', action: 'CREATE_VNPAY_URL' };
  if (cleanPath.includes('check-in')) return { entity: 'Booking', action: 'BOOKING_CHECK_IN' };
  if (cleanPath.includes('check-out')) return { entity: 'Booking', action: 'BOOKING_CHECK_OUT' };
  if (cleanPath.includes('cancel')) return { entity: 'Booking', action: 'CANCEL_BOOKING' };
  if (cleanPath.includes('chat') && cleanPath.includes('messages')) return { entity: 'Message', action: 'SEND_CHAT_MESSAGE' };
  if (cleanPath.includes('chat') && cleanPath.includes('claim')) return { entity: 'Conversation', action: 'CLAIM_CONVERSATION' };
  if (cleanPath.includes('chat') && cleanPath.includes('close')) return { entity: 'Conversation', action: 'CLOSE_CONVERSATION' };
  if (cleanPath.includes('chat') && cleanPath.includes('reopen')) return { entity: 'Conversation', action: 'REOPEN_CONVERSATION' };

  const verbMap: Record<string, string> = {
    POST: 'CREATE',
    PUT: 'UPDATE',
    PATCH: 'UPDATE',
    DELETE: 'DELETE',
  };

  const verb = verbMap[upperMethod] || upperMethod;
  return {
    entity,
    action: `${verb}_${entity.toUpperCase()}`,
  };
};

/**
 * Explicit Route-Level Audit Logger Middleware.
 * Automatically logs both successful mutations and sensitive failed actions (401/403).
 */
export const auditLogger = (action: string, entity: string) => {
  return (req: AuditTrackedRequest, res: Response, next: NextFunction): void => {
    const originalSend = res.send.bind(res);

    res.send = (body?: unknown): Response => {
      const isSuccess = res.statusCode >= 200 && res.statusCode < 300;
      const isAuthFailure = res.statusCode === 401 || res.statusCode === 403;

      const resolvedUserId = resolveUserIdFromRequest(req, body);

      if (resolvedUserId && (isSuccess || isAuthFailure) && !req._auditLogged) {
        req._auditLogged = true;
        const entityId = extractEntityIdFromResponse(req, body);
        const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
        const userAgent = req.headers['user-agent'] || '';

        const rawChanges = {
          ...(typeof req.body === 'object' && req.body !== null ? (redactSensitiveData(req.body) as Record<string, unknown>) : {}),
          ...(Object.keys(req.params || {}).length > 0 ? { params: req.params } : {}),
        };
        const sanitizedChanges = capPayloadSize(rawChanges);

        AuditLog.create({
          userId: resolvedUserId,
          action,
          entity,
          entityId,
          changes: sanitizedChanges,
          details: sanitizedChanges,
          method: req.method,
          path: req.originalUrl || req.url,
          status: isSuccess ? 'SUCCESS' : 'FAILED',
          statusCode: res.statusCode,
          ipAddress,
          userAgent,
          timestamp: new Date(),
        }).catch((err: unknown) => {
          console.error('[AUDIT LOG ERROR] Failed to persist audit log entry:', err);
        });
      }

      return originalSend(body);
    };

    next();
  };
};

/**
 * Global Auto-CRUD Audit Middleware (S3 - Audit Middleware)
 * Automatically captures all mutating CRUD operations (POST, PUT, PATCH, DELETE)
 * across the entire /api router without duplicating explicit auditLogger entries.
 */
export const autoCrudAuditMiddleware = (req: AuditTrackedRequest, res: Response, next: NextFunction): void => {
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!mutatingMethods.includes(req.method.toUpperCase())) {
    next();
    return;
  }

  // Skip noisy read-receipt mutations from polluting the security audit log
  const fullPath = req.originalUrl || req.url || '';
  if (fullPath.endsWith('/read')) {
    next();
    return;
  }

  const originalSend = res.send.bind(res);

  res.send = (body?: unknown): Response => {
    if (!req._auditLogged) {
      const isSuccess = res.statusCode >= 200 && res.statusCode < 300;
      const isFailure = res.statusCode >= 400;
      const resolvedUserId = resolveUserIdFromRequest(req, body);

      if (resolvedUserId && (isSuccess || isFailure)) {
        req._auditLogged = true;
        const { entity, action } = inferEntityAndAction(req.method, fullPath);
        const entityId = extractEntityIdFromResponse(req, body);
        const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
        const userAgent = req.headers['user-agent'] || '';

        const rawChanges = {
          method: req.method,
          path: fullPath,
          ...(typeof req.body === 'object' && req.body !== null ? { payload: redactSensitiveData(req.body) } : {}),
          ...(Object.keys(req.params || {}).length > 0 ? { params: req.params } : {}),
        };
        const sanitizedChanges = capPayloadSize(rawChanges);

        AuditLog.create({
          userId: resolvedUserId,
          action,
          entity,
          entityId,
          changes: sanitizedChanges,
          details: sanitizedChanges,
          method: req.method,
          path: fullPath,
          status: isSuccess ? 'SUCCESS' : 'FAILED',
          statusCode: res.statusCode,
          ipAddress,
          userAgent,
          timestamp: new Date(),
        }).catch((err: unknown) => {
          console.error('[AUTO-CRUD AUDIT ERROR] Failed to persist audit entry:', err);
        });
      }
    }

    return originalSend(body);
  };

  next();
};
