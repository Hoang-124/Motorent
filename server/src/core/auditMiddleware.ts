import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
import { AuditLog } from '../models/AuditLog';

export const auditLogger = (action: string, entity: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    // Lưu lại send gốc để bắt status code thành công
    const originalSend = res.send;

    res.send = function (body: any): Response {
      // Chỉ log khi request thành công (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const entityId = req.params.id || req.body?.id || req.body?._id || '';
        const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
        const userAgent = req.headers['user-agent'] || '';

        // Chạy async không block response
        AuditLog.create({
          userId: req.user._id,
          action,
          entity,
          entityId: String(entityId),
          details: req.body,
          ipAddress,
          userAgent,
          timestamp: new Date(),
        }).catch((err) => {
          console.error('❌ Lỗi ghi AuditLog:', err);
        });
      }

      return originalSend.apply(res, arguments as any);
    };

    next();
  };
};
