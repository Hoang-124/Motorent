import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateJWT } from '../../core/authMiddleware';
import { authorize } from '../../core/rbacMiddleware';
import { auditLogger } from '../../core/auditMiddleware';
import * as bookingController from './bookingController';

const router = Router();

const bookingCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // max 30 bookings created per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Bạn đã tạo quá nhiều đơn đặt xe trong 1 giờ. Vui lòng thử lại sau.',
  },
});

// Price estimation & availability check (Public/Customer)
router.post('/estimate', bookingController.estimateBooking);
router.post('/check-availability', bookingController.checkAvailability);

// Customer bookings
router.post(
  '/',
  authenticateJWT,
  bookingCreateLimiter,
  auditLogger('CREATE_BOOKING', 'Booking'),
  bookingController.createBooking
);

router.get('/my', authenticateJWT, bookingController.getMyBookings);

// Staff / Manager counter desk endpoints
router.get(
  '/branch',
  authenticateJWT,
  authorize('Staff', 'BranchManager', 'SystemAdmin'),
  bookingController.getBranchBookings
);

router.get(
  '/code/:code',
  authenticateJWT,
  authorize('Staff', 'BranchManager', 'SystemAdmin'),
  bookingController.getBookingByCode
);

router.put(
  '/:id/checkin',
  authenticateJWT,
  authorize('Staff', 'BranchManager', 'SystemAdmin'),
  auditLogger('CHECKIN_BOOKING', 'Booking'),
  bookingController.checkin
);

router.put(
  '/:id/checkout',
  authenticateJWT,
  authorize('Staff', 'BranchManager', 'SystemAdmin'),
  auditLogger('CHECKOUT_BOOKING', 'Booking'),
  bookingController.checkout
);

// UC-31: Record 70% or full payment at counter
router.put(
  '/:id/counter-pay',
  authenticateJWT,
  authorize('Staff', 'BranchManager', 'SystemAdmin'),
  auditLogger('COUNTER_PAY_BOOKING', 'Booking'),
  bookingController.counterPay
);

// Common endpoints
router.get('/:id', authenticateJWT, bookingController.getBookingById);

router.put(
  '/:id/cancel',
  authenticateJWT,
  auditLogger('CANCEL_BOOKING', 'Booking'),
  bookingController.cancel
);

// UC-38: Download PDF invoice
router.get('/:id/invoice', authenticateJWT, bookingController.downloadInvoice);

export default router;
