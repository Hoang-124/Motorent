import { Router } from 'express';
import { authenticateJWT } from '../../core/authMiddleware';
import * as paymentController from './paymentController';

const router = Router();

// Customer creates VNPay payment URL (UC-29: 30% deposit & UC-30: 100% full payment)
router.post('/vnpay/create', authenticateJWT, paymentController.createPaymentUrl);

// VNPay IPN Webhook (Server-to-Server, called by VNPay)
router.get('/vnpay/ipn', paymentController.handleVnPayIpn);
router.post('/vnpay/ipn', paymentController.handleVnPayIpn);

// Customer Return URL verification (Redirect callback)
router.get('/vnpay/return', paymentController.handleVnPayReturn);

export default router;
