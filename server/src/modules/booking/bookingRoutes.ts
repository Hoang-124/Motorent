import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateJWT } from '../../core/authMiddleware';
import { authorize } from '../../core/rbacMiddleware';
import { auditLogger } from '../../core/auditMiddleware';
import { reviewPhotosUpload } from '../../core/uploadMiddleware';
import * as reviewController from '../review/reviewController';
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

// UC-39: Create review for completed booking (Customer)
router.post(
  '/:bookingId/reviews',
  authenticateJWT,
  authorize('Customer', 'BranchManager', 'Staff', 'SystemAdmin'),
  reviewPhotosUpload.array('photos', 5),
  reviewController.createReview
);

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

// UC-58: Record vehicle damage and assessment fee
router.post(
  '/:id/damage',
  authenticateJWT,
  authorize('Staff', 'BranchManager', 'SystemAdmin'),
  auditLogger('RECORD_DAMAGE_BOOKING', 'Booking'),
  bookingController.recordDamage
);

// Common endpoints
router.get('/:id', authenticateJWT, bookingController.getBookingById);

// UC-59: Calculate penalty fees (30,000 VND / hour ceil overdue + damage)
router.get('/:id/penalty', authenticateJWT, bookingController.calculatePenalty);
router.post('/:id/penalty/preview', authenticateJWT, bookingController.calculatePenalty);

// UC-34: Extend Rental
router.post(
  '/:id/estimate-extension',
  authenticateJWT,
  bookingController.estimateExtension
);

router.put(
  '/:id/extend',
  authenticateJWT,
  auditLogger('EXTEND_BOOKING', 'Booking'),
  bookingController.extend
);

// UC-73: Manager approve booking
router.put(
  '/:id/approve',
  authenticateJWT,
  authorize('BranchManager', 'SystemAdmin'),
  auditLogger('APPROVE_BOOKING', 'Booking'),
  bookingController.approveBooking
);

// UC-74: Manager reject booking
router.put(
  '/:id/reject',
  authenticateJWT,
  authorize('BranchManager', 'SystemAdmin'),
  auditLogger('REJECT_BOOKING', 'Booking'),
  bookingController.rejectBooking
);

// UC-32: Cancel booking
router.put(
  '/:id/cancel',
  authenticateJWT,
  auditLogger('CANCEL_BOOKING', 'Booking'),
  bookingController.cancel
);

// UC-33: Request refund
router.post(
  '/:id/refund',
  authenticateJWT,
  auditLogger('REQUEST_REFUND', 'Booking'),
  bookingController.requestRefund
);

// UC-75: Approve Refund
router.put(
  '/:id/refund/approve',
  authenticateJWT,
  authorize('BranchManager', 'SystemAdmin'),
  auditLogger('APPROVE_REFUND', 'Booking'),
  bookingController.approveRefund
);

// UC-76: Reject Refund
router.put(
  '/:id/refund/reject',
  authenticateJWT,
  authorize('BranchManager', 'SystemAdmin'),
  auditLogger('REJECT_REFUND', 'Booking'),
  bookingController.rejectRefund
);

// UC-38: Download PDF invoice
router.get('/:id/invoice', authenticateJWT, bookingController.downloadInvoice);

export default router;
