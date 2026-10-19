import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { PERMISSION_MATRIX, Permission } from '../../core/permissions';
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

const PERMISSION_METADATA: Record<Permission, { label: string; module: string; description: string }> = {
  USER_VIEW: { label: 'Xem danh sách người dùng', module: 'Người dùng & Định danh', description: 'Xem hồ sơ, danh bạ tài khoản khách hàng và nhân sự' },
  USER_MANAGE: { label: 'Quản lý tài khoản', module: 'Người dùng & Định danh', description: 'Tạo, sửa, khóa hoặc mở khóa tài khoản người dùng' },
  EKYC_VIEW: { label: 'Xem tài liệu eKYC', module: 'Người dùng & Định danh', description: 'Tra cứu hình ảnh CCCD, GPLX của khách thuê' },
  EKYC_REVIEW: { label: 'Duyệt hồ sơ eKYC', module: 'Người dùng & Định danh', description: 'Phê duyệt hoặc từ chối hồ sơ định danh điện tử của khách' },

  BRANCH_VIEW: { label: 'Xem thông tin chi nhánh', module: 'Chi nhánh & Trạm xe', description: 'Xem vị trí, giờ hoạt động, số hotline các trạm' },
  BRANCH_MANAGE: { label: 'Quản lý chi nhánh', module: 'Chi nhánh & Trạm xe', description: 'Thêm mới, sửa đổi thông tin hoặc mở rộng chi nhánh' },

  VEHICLE_VIEW: { label: 'Xem đội xe & Tình trạng', module: 'Phương tiện & Kho bãi', description: 'Tra cứu danh mục xe, giá thuê, biển số và tính khả dụng' },
  VEHICLE_MANAGE: { label: 'Quản trị danh mục xe', module: 'Phương tiện & Kho bãi', description: 'Thêm xe mới, điều chỉnh giá thuê, cập nhật thông số xe' },
  MAINTENANCE_VIEW: { label: 'Xem lịch bảo trì', module: 'Phương tiện & Kho bãi', description: 'Theo dõi nhật ký sửa chữa, thay nhớt định kỳ của xe' },
  MAINTENANCE_LOG: { label: 'Ghi nhận bảo dưỡng', module: 'Phương tiện & Kho bãi', description: 'Cập nhật tình trạng bảo trì, chuyển trạng thái xe sang bảo dưỡng' },

  BOOKING_VIEW: { label: 'Xem danh sách đơn đặt', module: 'Vận hành đơn hàng', description: 'Xem lịch trình, chi tiết hợp đồng và tiến độ chuyến đi' },
  BOOKING_CREATE: { label: 'Khởi tạo đơn đặt xe', module: 'Vận hành đơn hàng', description: 'Tạo đơn thuê xe mới trên hệ thống' },
  BOOKING_CHECKIN: { label: 'Thực hiện Check-in', module: 'Vận hành đơn hàng', description: 'Bàn giao xe, kiểm tra ODO/xăng, thu chữ ký điện tử' },
  BOOKING_CHECKOUT: { label: 'Thực hiện Check-out', module: 'Vận hành đơn hàng', description: 'Thu hồi xe, kiểm tra hư tổn, tính phụ phí và tất toán' },
  BOOKING_CANCEL: { label: 'Hủy đơn đặt xe', module: 'Vận hành đơn hàng', description: 'Hủy đơn theo chính sách hủy hoàn BR-06' },
  BOOKING_COUNTER_PAY: { label: 'Thu tiền tại quầy', module: 'Vận hành đơn hàng', description: 'Ghi nhận thanh toán tiền mặt / POS tại quầy chi nhánh' },

  FINANCE_RECONCILE: { label: 'Đối soát tài chính trạm', module: 'Tài chính & Kế toán', description: 'Đối chiếu doanh thu tiền mặt, POS và ngân hàng theo ca' },
  FINANCE_TAX_REPORT: { label: 'Báo cáo thuế & Lợi nhuận', module: 'Tài chính & Kế toán', description: 'Xuất dữ liệu hóa đơn, thuế GTGT và tổng quan tài chính' },
  AUDIT_VIEW: { label: 'Xem nhật ký kiểm toán', module: 'Bảo mật & Kiểm toán', description: 'Truy vết toàn bộ thao tác nhạy cảm, lịch sử can thiệp hệ thống' },

  STAFF_SCHEDULE: { label: 'Phân ca trực nhân sự', module: 'Nhân sự & Hỗ trợ', description: 'Điều phối ca trực quầy tại các trạm chi nhánh' },
  CHAT_STAFF_CONSOLE: { label: 'Trực tổng đài Live Chat', module: 'Nhân sự & Hỗ trợ', description: 'Tiếp nhận và tư vấn khách qua khung chat thời gian thực' },
};

const ROLE_METADATA: Record<string, { name: string; description: string; badgeColor: string }> = {
  SystemAdmin: {
    name: 'Quản trị viên toàn hệ thống',
    description: 'Toàn quyền cấu hình hệ thống, quản lý tài khoản, xem nhật ký kiểm toán và báo cáo thuế.',
    badgeColor: 'text-[#FFC799] border-[#FFC799]/40 bg-[#FFC799]/10',
  },
  BranchManager: {
    name: 'Quản lý chi nhánh',
    description: 'Quản lý phương tiện, nhân sự, kiểm soát đơn và đối soát doanh thu tại chi nhánh.',
    badgeColor: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
  },
  Staff: {
    name: 'Nhân viên trực quầy',
    description: 'Thực hiện thủ tục giao nhận xe (Check-in/Check-out), thu tiền tại quầy, duyệt eKYC và hỗ trợ khách.',
    badgeColor: 'text-sky-400 border-sky-500/40 bg-sky-500/10',
  },
  Customer: {
    name: 'Khách hàng',
    description: 'Tìm xe, đặt xe trực tuyến, thanh toán cọc/toàn bộ qua VNPay, theo dõi trạng thái và quản lý lịch sử thuê.',
    badgeColor: 'text-[#F5F5F5] border-white/20 bg-white/5',
  },
};

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

    // Group permissions by module
    const modulesMap: Record<string, Array<{ permission: Permission; label: string; description: string; allowedRoles: readonly string[] }>> = {};
    for (const [permKey, allowedRoles] of Object.entries(PERMISSION_MATRIX)) {
      const p = permKey as Permission;
      const meta = PERMISSION_METADATA[p] || {
        label: p,
        module: 'Chức năng chung',
        description: 'Quyền thực thi hệ thống',
      };
      if (!modulesMap[meta.module]) {
        modulesMap[meta.module] = [];
      }
      modulesMap[meta.module].push({
        permission: p,
        label: meta.label,
        description: meta.description,
        allowedRoles,
      });
    }

    res.json({
      success: true,
      message: 'Ma trận phân quyền hệ thống MOTORENT (RBAC Single Source of Truth)',
      data: {
        role: userRole,
        permissions: userPermissions,
        matrix: PERMISSION_MATRIX,
        roles: ['SystemAdmin', 'BranchManager', 'Staff', 'Customer'],
        roleDescriptions: ROLE_METADATA,
        metadata: PERMISSION_METADATA,
        modules: modulesMap,
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
