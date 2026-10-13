import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateJWT } from '../../core/authMiddleware';
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

// Public routes
router.post('/register', authLimiter, authController.register);
router.get('/verify-email', authController.verifyEmail);
router.post('/verify-otp', authLimiter, authController.verifyOtp);
router.post('/resend-otp', authLimiter, authController.resendOtp);
router.post('/login', loginLimiter, authController.login);
router.post('/google', loginLimiter, authController.loginWithGoogle);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);

// Protected routes (require JWT)
router.post('/logout', authenticateJWT, authController.logout);
router.get('/me', authenticateJWT, authController.getProfile);
router.put('/profile', authenticateJWT, authController.updateProfile);
router.put('/me', authenticateJWT, authController.updateProfile);

// Change password
router.put('/change-password', authenticateJWT, authController.changePassword);
router.post('/change-password', authenticateJWT, authController.changePassword);

// Upload avatar
router.put('/me/avatar', authenticateJWT, avatarUpload.single('avatar'), authController.uploadAvatar);
router.put('/avatar', authenticateJWT, avatarUpload.single('avatar'), authController.uploadAvatar);
router.post('/avatar', authenticateJWT, avatarUpload.single('avatar'), authController.uploadAvatar);

// eKYC Upload
router.post(
  '/ekyc',
  authenticateJWT,
  ekycUpload.fields([
    { name: 'idCardFront', maxCount: 1 },
    { name: 'idCardBack', maxCount: 1 },
    { name: 'drivingLicense', maxCount: 1 },
  ]),
  authController.uploadEkyc
);
router.post(
  '/me/ekyc',
  authenticateJWT,
  ekycUpload.fields([
    { name: 'idCardFront', maxCount: 1 },
    { name: 'idCardBack', maxCount: 1 },
    { name: 'drivingLicense', maxCount: 1 },
  ]),
  authController.uploadEkyc
);

export default router;
