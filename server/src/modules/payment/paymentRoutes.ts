import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateJWT } from '../../core/authMiddleware';
import * as paymentController from './paymentController';

const router = Router();

const paymentCreateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // max 10 URLs created per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Bạn đang tạo yêu cầu thanh toán quá nhanh. Vui lòng thử lại sau 1 phút.',
  },
});

// Customer creates VNPay payment URL (UC-29: 30% deposit & UC-30: 100% full payment)
router.post('/vnpay/create', authenticateJWT, paymentCreateLimiter, paymentController.createPaymentUrl);

// VNPay IPN Webhook (Server-to-Server, called by VNPay)
router.get('/vnpay/ipn', paymentController.handleVnPayIpn);
router.post('/vnpay/ipn', paymentController.handleVnPayIpn);

// Customer Return URL verification (Redirect callback)
router.get('/vnpay/return', paymentController.handleVnPayReturn);

// Customer confirms VietQR 24/7 transfer
router.post('/vietqr/confirm', authenticateJWT, paymentCreateLimiter, paymentController.confirmVietQr);

export default router;

