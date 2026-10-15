import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateJWT, authenticateJWTFromQuery } from '../../core/authMiddleware';
import { authorize } from '../../core/rbacMiddleware';
import { avatarUpload, ekycUpload } from '../../core/uploadMiddleware';
import * as authController from './authController';

const router = Router();

// Strict rate limiter for sensitive authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 requests per IP per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu từ địa chỉ IP này. Vui lòng thử lại sau 15 phút.',
  },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // max 15 login attempts per IP per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu đăng nhập. Vui lòng thử lại sau 15 phút.',
  },
});

const emailVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu xác thực email. Vui lòng thử lại sau ít phút.',
  },
});

const ekycLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15, // max 15 uploads per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Bạn đã tải lên giấy tờ eKYC quá nhiều lần trong 1 giờ. Vui lòng thử lại sau.',
  },
});

// Public routes
router.post('/register', authLimiter, authController.register);
router.get('/verify-email', emailVerificationLimiter, authController.verifyEmail);
router.get('/verify-email/:token', emailVerificationLimiter, authController.verifyEmail);
router.post('/verify-otp', authLimiter, authController.verifyOtp);
router.post('/resend-otp', authLimiter, authController.resendOtp);
router.post('/login', loginLimiter, authController.login);
router.post('/google', loginLimiter, authController.loginWithGoogle);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);

// Protected routes (require JWT)
router.post('/logout', authenticateJWT, authController.logout);
router.get('/me', authenticateJWT, authController.getProfile);
router.put('/me', authenticateJWT, authController.updateProfile);

// Change password
router.put('/change-password', authenticateJWT, authController.changePassword);

// Upload avatar
router.put('/me/avatar', authenticateJWT, avatarUpload.single('avatar'), authController.uploadAvatar);

// eKYC Upload (Stored in private_uploads/ekyc, blocked from public static HTTP access)
router.post(
  '/ekyc',
  authenticateJWT,
  ekycLimiter,
  ekycUpload.fields([
    { name: 'idCardFront', maxCount: 1 },
    { name: 'idCardBack', maxCount: 1 },
    { name: 'selfiePhoto', maxCount: 1 },
    { name: 'drivingLicense', maxCount: 1 },
  ]),
  authController.uploadEkyc
);

// Protected eKYC document retrieval (Customer access via browser img tag)
router.get('/ekyc/document/me/:docType', authenticateJWTFromQuery, authController.getEkycDocumentMe);

// Protected eKYC document retrieval for Staff / BranchManager / SystemAdmin with audit logging
router.get(
  '/ekyc/document/view/:userId/:docType',
  authenticateJWTFromQuery,
  authorize('SystemAdmin', 'BranchManager', 'Staff'),
  authController.getEkycDocumentAdmin
);

// Protected eKYC review endpoints for Staff / BranchManager / SystemAdmin
router.get(
  '/ekyc/pending',
  authenticateJWT,
  authorize('SystemAdmin', 'BranchManager', 'Staff'),
  authController.getPendingEkycQueue
);

router.put(
  '/ekyc/review/:userId',
  authenticateJWT,
  authorize('SystemAdmin', 'BranchManager', 'Staff'),
  ekycUpload.fields([
    { name: 'idCardFront', maxCount: 1 },
    { name: 'idCardBack', maxCount: 1 },
  ]),
  authController.reviewUserEkyc
);

export default router;


