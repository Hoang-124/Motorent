import { Router } from 'express';
import { authenticateJWT } from '../../core/authMiddleware';
import { upload } from '../../core/uploadMiddleware';
import * as authController from './authController';

const router = Router();

// Public routes
router.post('/register', authController.register);
router.get('/verify-email', authController.verifyEmail);
router.post('/login', authController.login);
router.post('/google', authController.loginWithGoogle);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected routes (require JWT)
router.get('/me', authenticateJWT, authController.getProfile);
router.put('/profile', authenticateJWT, authController.updateProfile);
router.post('/change-password', authenticateJWT, authController.changePassword);
router.post('/avatar', authenticateJWT, upload.single('avatar'), authController.uploadAvatar);

export default router;
