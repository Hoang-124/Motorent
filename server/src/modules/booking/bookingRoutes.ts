import { Router } from 'express';
import { authenticateJWT } from '../../core/authMiddleware';
import { authorize } from '../../core/rbacMiddleware';
import { auditLogger } from '../../core/auditMiddleware';
import * as bookingController from './bookingController';

const router = Router();

// Customer bookings
router.post(
  '/',
  authenticateJWT,
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

// Common endpoints
router.get('/:id', authenticateJWT, bookingController.getBookingById);

router.put(
  '/:id/cancel',
  authenticateJWT,
  auditLogger('CANCEL_BOOKING', 'Booking'),
  bookingController.cancel
);

export default router;
