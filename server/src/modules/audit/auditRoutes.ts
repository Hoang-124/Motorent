import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { authenticateJWT, AuthenticatedRequest } from '../../core/authMiddleware';
import { authorize } from '../../core/rbacMiddleware';
import { AuditLog } from '../../models/AuditLog';

const router = Router();

const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  userId: z.string().trim().optional(),
  action: z.string().trim().optional(),
  entity: z.string().trim().optional(),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  q: z.string().trim().optional(),
});

/**
 * UC-102 Audit Log Viewer (SystemAdmin only)
 * Filterable, paginated, append-only security log inspection.
 */
router.get(
  '/',
  authenticateJWT,
  authorize('SystemAdmin', 'AUDIT_VIEW'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = auditQuerySchema.parse(req.query);

      const filter: Record<string, unknown> = {};

      if (query.userId && mongoose.isValidObjectId(query.userId)) {
        filter.userId = new mongoose.Types.ObjectId(query.userId);
      }

      if (query.action) {
        filter.action = query.action.toUpperCase();
      }

      if (query.entity) {
        filter.entity = query.entity;
      }

      if (query.from || query.to) {
        filter.timestamp = {};
        if (query.from) {
          const fromDate = new Date(query.from);
          if (!isNaN(fromDate.getTime())) {
            (filter.timestamp as Record<string, unknown>).$gte = fromDate;
          }
        }
        if (query.to) {
          const toDate = new Date(query.to);
          if (!isNaN(toDate.getTime())) {
            (filter.timestamp as Record<string, unknown>).$lte = toDate;
          }
        }
      }

      if (query.q) {
        const regex = new RegExp(query.q, 'i');
        filter.$or = [
          { action: regex },
          { entity: regex },
          { entityId: regex },
          { ipAddress: regex },
        ];
      }

      const skip = (query.page - 1) * query.limit;

      const [logs, total] = await Promise.all([
        AuditLog.find(filter)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(query.limit)
          .populate('userId', 'username firstName lastName email roles'),
        AuditLog.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: {
          items: logs,
          logs,
          total,
          page: query.page,
          limit: query.limit,
          pagination: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.ceil(total / query.limit),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
