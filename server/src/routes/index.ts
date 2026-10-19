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
import { getCategories } from '../modules/vehicle/vehicleController';
import reviewRoutes from '../modules/review/reviewRoutes';
import * as reviewController from '../modules/review/reviewController';
import { authenticateJWT } from '../core/authMiddleware';
import { authorize } from '../core/rbacMiddleware';
import { autoCrudAuditMiddleware } from '../core/auditMiddleware';

const router = Router();

// Global Auto-CRUD Audit Middleware (Captures all POST/PUT/PATCH/DELETE mutations)
router.use(autoCrudAuditMiddleware);

// Direct Categories endpoint alias
router.get('/categories', getCategories);

// System telemetry & RBAC matrix
router.use('/', systemRoutes);

// Modular Monolith feature routes
router.use('/auth', authRoutes);
router.use('/branches', branchRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/bookings', bookingRoutes);
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

export default router;
