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
import staticPageRoutes from '../modules/cms/staticPageRoutes';
import categoryRoutes from '../modules/category/categoryRoutes';
import pricingRoutes from '../modules/pricing/pricingRoutes';
import transferRoutes from '../modules/fleet/transferRoutes';
import maintenanceRoutes from '../modules/fleet/maintenanceRoutes';
import dashboardRoutes from '../modules/fleet/dashboardRoutes';
import { autoCrudAuditMiddleware } from '../core/auditMiddleware';

const router = Router();

// Global Auto-CRUD Audit Middleware (Captures all POST/PUT/PATCH/DELETE mutations)
router.use(autoCrudAuditMiddleware);

// Direct Categories endpoint alias
router.use('/categories', categoryRoutes);

// System telemetry & RBAC matrix
router.use('/', systemRoutes);

// Modular Monolith feature routes
router.use('/auth', authRoutes);
router.use('/branches', branchRoutes);
router.use('/vehicles', pricingRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/transfers', transferRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/fleet', dashboardRoutes);
router.use('/bookings', bookingRoutes);
router.use('/feedbacks', feedbackRoutes);
router.use('/payments', paymentRoutes);
router.use('/audit', auditRoutes);
router.use('/chat', chatRoutes);
router.use('/finance', financeRoutes);
router.use('/pages', staticPageRoutes);

export default router;
