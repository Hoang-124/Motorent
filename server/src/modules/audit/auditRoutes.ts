import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { authenticateJWT, AuthenticatedRequest } from '../../core/authMiddleware';
import { authorize } from '../../core/rbacMiddleware';
import { AuditLog } from '../../models/AuditLog';
import { User } from '../../models/User';

const router = Router();

const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(15),
  userId: z.string().trim().optional(),
  action: z.string().trim().optional(),
  entity: z.string().trim().optional(),
  status: z.enum(['SUCCESS', 'FAILED', '']).optional(),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  q: z.string().trim().optional(),
});

/**
 * UC-102 Audit Log Viewer (SystemAdmin, BranchManager, Staff)
 * Searchable, filterable, paginated append-only security log inspection.
 */
router.get(
  '/',
  authenticateJWT,
  authorize('SystemAdmin', 'BranchManager', 'Staff'),
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

      if (query.status && (query.status === 'SUCCESS' || query.status === 'FAILED')) {
        filter.status = query.status;
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
            toDate.setHours(23, 59, 59, 999);
            (filter.timestamp as Record<string, unknown>).$lte = toDate;
          }
        }
      }

      if (query.q) {
        const escaped = query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'i');

        const matchingUsers = await User.find({
          $or: [
            { username: regex },
            { email: regex },
            { firstName: regex },
            { lastName: regex },
          ],
        }).select('_id');

        const userIds = matchingUsers.map((u) => u._id);

        filter.$or = [
          { action: regex },
          { entity: regex },
          { entityId: regex },
          { ipAddress: regex },
          { path: regex },
          ...(userIds.length > 0 ? [{ userId: { $in: userIds } }] : []),
        ];
      }

      const skip = (query.page - 1) * query.limit;

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const [logs, total, totalAll, successCount, failedCount, todayCount, distinctEntities, distinctActions] =
        await Promise.all([
          AuditLog.find(filter)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(query.limit)
            .populate('userId', 'username firstName lastName email roles avatarUrl'),
          AuditLog.countDocuments(filter),
          AuditLog.countDocuments(),
          AuditLog.countDocuments({ status: 'SUCCESS' }),
          AuditLog.countDocuments({ status: 'FAILED' }),
          AuditLog.countDocuments({ timestamp: { $gte: startOfToday } }),
          AuditLog.distinct('entity'),
          AuditLog.distinct('action'),
        ]);

      res.json({
        success: true,
        data: {
          items: logs,
          logs,
          total,
          page: query.page,
          limit: query.limit,
          stats: {
            totalAll,
            successCount,
            failedCount,
            todayCount,
            entities: distinctEntities.filter(Boolean).sort(),
            actions: distinctActions.filter(Boolean).sort(),
          },
          pagination: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / query.limit)),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
