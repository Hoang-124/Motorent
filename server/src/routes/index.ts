import { Router } from 'express';
import authRoutes from '../modules/auth/authRoutes';
import branchRoutes from '../modules/branch/branchRoutes';
import vehicleRoutes from '../modules/vehicle/vehicleRoutes';
import bookingRoutes from '../modules/booking/bookingRoutes';
import feedbackRoutes from '../modules/support/feedbackRoutes';
import paymentRoutes from '../modules/payment/paymentRoutes';
import systemRoutes from '../modules/system/systemRoutes';
import auditRoutes from '../modules/audit/auditRoutes';
import chatRoutes from '../modules/chat/chatRoutes';
import financeRoutes from '../modules/finance/financeRoutes';
import adminRoutes from '../modules/admin/adminRoutes';
import categoryRoutes from '../modules/category/categoryRoutes';
import pricingRoutes from '../modules/pricing/pricingRoutes';
import transferRoutes from '../modules/fleet/transferRoutes';
import maintenanceRoutes from '../modules/fleet/maintenanceRoutes';
import dashboardRoutes from '../modules/fleet/dashboardRoutes';
import wishlistRoutes from '../modules/wishlist/wishlistRoutes';
import reviewRoutes from '../modules/review/reviewRoutes';
import * as reviewController from '../modules/review/reviewController';
import { adminBannerRouter, publicBannerRouter } from '../modules/cms/bannerRoutes';
import { adminPageRouter, publicPageRouter } from '../modules/cms/pageRoutes';
import {
  complaintRouter,
  customerComplaintRouter,
  staffComplaintRouter,
  managerComplaintRouter,
} from '../modules/support/complaintRoutes';
import { authenticateJWT } from '../core/authMiddleware';
import { authorize } from '../core/rbacMiddleware';
import { autoCrudAuditMiddleware } from '../core/auditMiddleware';

const router = Router();

// Global Auto-CRUD Audit Middleware (Captures all POST/PUT/PATCH/DELETE mutations)
router.use(autoCrudAuditMiddleware);

// Direct Categories endpoint
router.use('/categories', categoryRoutes);

// System telemetry & RBAC matrix
router.use('/', systemRoutes);

// Modular Monolith feature routes
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/branches', branchRoutes);
router.use('/vehicles', pricingRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/transfers', transferRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/fleet', dashboardRoutes);
router.use('/bookings', bookingRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/reviews', reviewRoutes);
router.use('/feedbacks', feedbackRoutes);
router.use('/payments', paymentRoutes);
router.use('/audit', auditRoutes);
router.use('/chat', chatRoutes);
router.use('/finance', financeRoutes);

// Customer Review profile route: GET /api/me/reviews
router.get(
  '/me/reviews',
  authenticateJWT,
  authorize('Customer', 'BranchManager', 'Staff', 'SystemAdmin'),
  reviewController.getMyReviews
);

// CMS Banners (UC-116, UC-117, UC-118)
router.use('/admin/banners', adminBannerRouter);
router.use('/banners', publicBannerRouter);
router.use('/cms/banners', adminBannerRouter);

// CMS Static Pages (UC-119)
router.use('/admin/pages', adminPageRouter);
router.use('/pages', publicPageRouter);

// Complaints Management (UC-42, UC-43, UC-65, UC-85)
router.use('/me/complaints', customerComplaintRouter);
router.use('/complaints', complaintRouter);
router.use('/manager/complaints', managerComplaintRouter);
router.use('/staff/complaints', staffComplaintRouter);

export default router;
