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

/**
 * Audit Logger Middleware.
 * Automatically logs both successful mutations and sensitive failed actions (401/403).
 * Truncates details to 10KB to prevent audit log bloat.
 */
export const auditLogger = (action: string, entity: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const originalSend = res.send.bind(res);

    res.send = (body?: unknown): Response => {
      const isSuccess = res.statusCode >= 200 && res.statusCode < 300;
      const isAuthFailure = res.statusCode === 401 || res.statusCode === 403;

      // Log successful operations OR unauthorized attempts on sensitive entities
      if (req.user && (isSuccess || isAuthFailure)) {
        const entityId =
          req.params.id ||
          (req.body && typeof req.body === 'object'
            ? (req.body as Record<string, unknown>).id || (req.body as Record<string, unknown>)._id
            : '') ||
          '';

        const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
        const userAgent = req.headers['user-agent'] || '';

        let sanitizedDetails = redactSensitiveData(req.body) as Record<string, unknown>;

        // Cap details payload size to 10KB
        try {
          const serialized = JSON.stringify(sanitizedDetails);
          if (serialized.length > 10240) {
            sanitizedDetails = {
              truncated: true,
              preview: serialized.slice(0, 10240),
            };
          }
        } catch {
          sanitizedDetails = { error: 'Non-serializable payload' };
        }

        AuditLog.create({
          userId: req.user._id,
          action,
          entity,
          entityId: String(entityId),
          details: sanitizedDetails,
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
