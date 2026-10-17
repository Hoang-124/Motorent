import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { PERMISSION_MATRIX } from '../../core/permissions';
import { authenticateJWT, AuthenticatedRequest } from '../../core/authMiddleware';
import { authorize } from '../../core/rbacMiddleware';
import {
  Branch,
  Vehicle,
  Booking,
  User,
  Category,
  VehicleTransfer,
  MaintenanceLog,
  StaffSchedule,
  Complaint,
  AuditLog,
  Discount,
  Feedback,
  Notification,
  BookingReminder,
  Conversation,
  Message,
  Banner,
  StaticPage,
} from '../../models';

const router = Router();

/**
 * Lightweight Health Check endpoint (UC-00)
 * Public returns basic health status; Authenticated SystemAdmin returns collection telemetry
 */
router.get('/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isDbConnected = mongoose.connection.readyState === 1;

    const baseHealth = {
      service: 'motorent',
      status: isDbConnected ? 'UP' : 'DOWN',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: isDbConnected ? 'Connected' : 'Disconnected',
    };

    if (req.query.detailed === 'true') {
      const collections = {
        branches: await Branch.countDocuments(),
        users: await User.countDocuments(),
        categories: await Category.countDocuments(),
        vehicles: await Vehicle.countDocuments(),
        bookings: await Booking.countDocuments(),
        vehicleTransfers: await VehicleTransfer.countDocuments(),
        maintenanceLogs: await MaintenanceLog.countDocuments(),
        staffSchedules: await StaffSchedule.countDocuments(),
        complaints: await Complaint.countDocuments(),
        auditLogs: await AuditLog.countDocuments(),
        discounts: await Discount.countDocuments(),
        feedbacks: await Feedback.countDocuments(),
        notifications: await Notification.countDocuments(),
        bookingReminders: await BookingReminder.countDocuments(),
        conversations: await Conversation.countDocuments(),
        messages: await Message.countDocuments(),
        banners: await Banner.countDocuments(),
        staticPages: await StaticPage.countDocuments(),
      };
      res.json({ success: true, data: { ...baseHealth, collections } });
      return;
    }

    res.json({ success: true, data: baseHealth });
  } catch (error) {
    next(error);
  }
});

/**
 * RBAC Matrix Endpoint (UC-99)
 * Returns the single source of truth for Role-Based Access Control
 */
router.get(
  '/system/permissions',
  authenticateJWT,
  authorize('SystemAdmin', 'BranchManager', 'Staff'),
  (req: AuthenticatedRequest, res: Response): void => {
    const userRole = req.user?.roles;
    const userPermissions = Object.entries(PERMISSION_MATRIX)
      .filter(([_, allowedRoles]) => userRole && (allowedRoles as readonly string[]).includes(userRole))
      .map(([perm]) => perm);

    res.json({
      success: true,
      message: 'Ma trận phân quyền hệ thống MOTORENT (RBAC Single Source of Truth)',
      data: {
        role: userRole,
        permissions: userPermissions,
        matrix: PERMISSION_MATRIX,
        roles: ['SystemAdmin', 'BranchManager', 'Staff', 'Customer'],
      },
    });
  }
);

/**
 * Notifications Endpoints for Header Notification Bell
 */
router.get(
  '/notifications',
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?._id) {
        res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập.' });
        return;
      }

      const items = await Notification.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .limit(30);

      const unreadCount = items.filter((n) => !n.isRead).length;

      res.json({
        success: true,
        data: {
          items,
          unreadCount,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/notifications/read-all',
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?._id) {
        res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập.' });
        return;
      }

      await Notification.updateMany(
        { userId: req.user._id, isRead: false },
        { $set: { isRead: true } }
      );

      res.json({ success: true, message: 'Đã đánh dấu đọc tất cả thông báo.' });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/notifications/:id/read',
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?._id) {
        res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập.' });
        return;
      }

      if (mongoose.isValidObjectId(req.params.id)) {
        await Notification.updateOne(
          { _id: req.params.id, userId: req.user._id },
          { $set: { isRead: true } }
        );
      }

      res.json({ success: true, message: 'Đã đánh dấu đã đọc.' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
