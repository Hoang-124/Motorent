import { Router, Request, Response, NextFunction } from 'express';
import authRoutes from '../modules/auth/authRoutes';
import branchRoutes from '../modules/branch/branchRoutes';
import vehicleRoutes from '../modules/vehicle/vehicleRoutes';
import bookingRoutes from '../modules/booking/bookingRoutes';
import feedbackRoutes from '../modules/support/feedbackRoutes';
import { getCategories } from '../modules/vehicle/vehicleController';
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
} from '../models';

const router = Router();

// Health check endpoint
router.get('/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = {
      status: 'UP',
      timestamp: new Date(),
      database: 'Connected',
      collections: {
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
      },
    };
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

// Direct Categories endpoint alias
router.get('/categories', getCategories);

// Feature modules
router.use('/auth', authRoutes);
router.use('/branches', branchRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/bookings', bookingRoutes);
router.use('/feedbacks', feedbackRoutes);

export default router;
