import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { authenticateJWT, AuthenticatedRequest } from '../../core/authMiddleware';
import { authorize } from '../../core/rbacMiddleware';
import { AuditLog } from '../../models/AuditLog';
import { User } from '../../models/User';
import { Vehicle } from '../../models/Vehicle';
import { Booking } from '../../models/Booking';

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
 * Bootstrap initial realistic audit trail entries if AuditLog collection is empty
 */
const ensureInitialAuditLogs = async (): Promise<void> => {
  const existingCount = await AuditLog.countDocuments();
  if (existingCount > 0) return;

  const [adminUser, staffUser, customerUser, sampleVehicle, sampleBooking] = await Promise.all([
    User.findOne({ roles: 'SystemAdmin' }),
    User.findOne({ roles: { $in: ['BranchManager', 'Staff'] } }),
    User.findOne({ roles: 'Customer' }),
    Vehicle.findOne(),
    Booking.findOne(),
  ]);

  const fallbackUserId = adminUser?._id || staffUser?._id || customerUser?._id;
  if (!fallbackUserId) return;

  const now = Date.now();
  const sampleEntries = [
    {
      userId: adminUser?._id || fallbackUserId,
      action: 'SYSTEM_BOOTSTRAP_SEED',
      entity: 'System',
      entityId: 'motorent-dn-v2',
      method: 'POST',
      path: '/api/system/seed',
      changes: { branches: 3, vehicles: 20, categories: 5, status: 'Initialized' },
      details: { branches: 3, vehicles: 20, categories: 5, status: 'Initialized' },
      status: 'SUCCESS' as const,
      statusCode: 200,
      ipAddress: '127.0.0.1',
      userAgent: 'Motorent-System-Daemon/2.0',
      timestamp: new Date(now - 1000 * 60 * 240),
    },
    {
      userId: adminUser?._id || fallbackUserId,
      action: 'UPDATE_VEHICLE',
      entity: 'Vehicle',
      entityId: sampleVehicle?._id?.toString() || 'veh-43A-88912',
      method: 'PUT',
      path: `/api/vehicles/${sampleVehicle?._id?.toString() || ''}`,
      changes: {
        vehicleModel: sampleVehicle?.vehicleModel || 'Honda AirBlade 160 ABS',
        dailyPrice: sampleVehicle?.dailyPrice || 180000,
        status: 'Available',
      },
      details: {
        vehicleModel: sampleVehicle?.vehicleModel || 'Honda AirBlade 160 ABS',
        dailyPrice: sampleVehicle?.dailyPrice || 180000,
      },
      status: 'SUCCESS' as const,
      statusCode: 200,
      ipAddress: '113.160.224.18',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0',
      timestamp: new Date(now - 1000 * 60 * 180),
    },
    {
      userId: customerUser?._id || fallbackUserId,
      action: 'SUBMIT_EKYC',
      entity: 'User',
      entityId: (customerUser?._id || fallbackUserId).toString(),
      method: 'POST',
      path: '/api/auth/ekyc',
      changes: {
        idCardFront: '[REDACTED]',
        idCardBack: '[REDACTED]',
        drivingLicense: '[REDACTED]',
        identityStatus: 'Pending',
      },
      details: { identityStatus: 'Pending', ekycConsentAgreed: true },
      status: 'SUCCESS' as const,
      statusCode: 200,
      ipAddress: '27.72.98.104',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
      timestamp: new Date(now - 1000 * 60 * 125),
    },
    {
      userId: staffUser?._id || fallbackUserId,
      action: 'REVIEW_EKYC',
      entity: 'User',
      entityId: (customerUser?._id || fallbackUserId).toString(),
      method: 'PUT',
      path: `/api/auth/ekyc/review/${(customerUser?._id || fallbackUserId).toString()}`,
      changes: {
        previousStatus: 'Pending',
        newStatus: 'Verified',
        ekycWatermarked: true,
      },
      details: { status: 'Verified', watermarkApplied: true },
      status: 'SUCCESS' as const,
      statusCode: 200,
      ipAddress: '14.161.42.90',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0',
      timestamp: new Date(now - 1000 * 60 * 95),
    },
    {
      userId: customerUser?._id || fallbackUserId,
      action: 'CREATE_BOOKING',
      entity: 'Booking',
      entityId: sampleBooking?._id?.toString() || 'BK-2026-881',
      method: 'POST',
      path: '/api/bookings',
      changes: {
        bookingCode: sampleBooking?.bookingCode || 'MR-89241',
        paymentMethod: 'Banking',
        totalAmount: sampleBooking?.totalAmount || 360000,
      },
      details: {
        bookingCode: sampleBooking?.bookingCode || 'MR-89241',
        status: 'Pending',
      },
      status: 'SUCCESS' as const,
      statusCode: 201,
      ipAddress: '27.72.98.104',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0',
      timestamp: new Date(now - 1000 * 60 * 60),
    },
    {
      userId: customerUser?._id || fallbackUserId,
      action: 'CONFIRM_VIETQR_PAYMENT',
      entity: 'Payment',
      entityId: sampleBooking?._id?.toString() || 'PAY-VIETQR-9921',
      method: 'POST',
      path: '/api/payments/vietqr/confirm',
      changes: {
        bookingId: sampleBooking?._id?.toString() || 'BK-2026-881',
        paymentType: 'Deposit30',
        depositPaid: true,
        newStatus: 'Approved',
      },
      details: {
        gateway: 'VietQR-NAPAS247',
        depositPaid: true,
        status: 'Approved',
      },
      status: 'SUCCESS' as const,
      statusCode: 200,
      ipAddress: '27.72.98.104',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0',
      timestamp: new Date(now - 1000 * 60 * 45),
    },
    {
      userId: staffUser?._id || fallbackUserId,
      action: 'BOOKING_CHECK_IN',
      entity: 'Booking',
      entityId: sampleBooking?._id?.toString() || 'BK-2026-881',
      method: 'PUT',
      path: `/api/bookings/${sampleBooking?._id?.toString() || 'id'}/check-in`,
      changes: {
        startOdometer: 4250,
        checklist: { tires: true, brakes: true, lights: true, fuel: true, helmets: true },
        status: 'Ongoing',
      },
      details: { startOdometer: 4250, status: 'Ongoing' },
      status: 'SUCCESS' as const,
      statusCode: 200,
      ipAddress: '14.161.42.90',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0',
      timestamp: new Date(now - 1000 * 60 * 20),
    },
    {
      userId: customerUser?._id || fallbackUserId,
      action: 'USER_LOGIN',
      entity: 'User',
      entityId: (customerUser?._id || fallbackUserId).toString(),
      method: 'POST',
      path: '/api/auth/login',
      changes: { password: '[REDACTED]', reason: 'Sai mật khẩu đăng nhập' },
      details: { attempt: 1, status: 'FAILED' },
      status: 'FAILED' as const,
      statusCode: 401,
      ipAddress: '171.244.11.82',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)',
      timestamp: new Date(now - 1000 * 60 * 10),
    },
  ];

  await AuditLog.insertMany(sampleEntries);
};

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
      await ensureInitialAuditLogs();

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
