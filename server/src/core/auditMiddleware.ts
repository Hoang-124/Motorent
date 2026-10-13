import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
import { AuditLog } from '../models/AuditLog';

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
];

const redactSensitiveData = (data: unknown): unknown => {
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
    } else {
      result[key] = value;
    }
  }
  return result;
};

export const auditLogger = (action: string, entity: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const originalSend = res.send.bind(res);

    res.send = (body?: unknown): Response => {
      // Log only on successful 2xx responses and when user is authenticated
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const entityId = req.params.id || (req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>).id || (req.body as Record<string, unknown>)._id : '') || '';
        const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
        const userAgent = req.headers['user-agent'] || '';

        const sanitizedDetails = redactSensitiveData(req.body);

        AuditLog.create({
          userId: req.user._id,
          action,
          entity,
          entityId: String(entityId),
          details: sanitizedDetails,
          ipAddress,
          userAgent,
          timestamp: new Date(),
        }).catch((err: unknown) => {
          console.error('❌ Lỗi ghi AuditLog:', err);
        });
      }

      return originalSend(body);
    };

    next();
  };
};
