import { Router } from 'express';
import { authenticateJWT } from '../../core/authMiddleware';
import { authorize } from '../../core/rbacMiddleware';
import { bannerUpload } from '../../core/uploadMiddleware';
import { auditLogger } from '../../core/auditMiddleware';
import * as bannerController from './bannerController';

export const adminBannerRouter = Router();
export const publicBannerRouter = Router();

// ==========================================
// Public Banner Routes
// ==========================================
publicBannerRouter.get('/', bannerController.getPublicBanners);

// ==========================================
// Protected Admin Banner Routes (UC-116)
// ==========================================

// GET /admin/banners - List all banners with pagination and filter (UC-116)
adminBannerRouter.get(
  '/',
  authenticateJWT,
  authorize('SystemAdmin'),
  bannerController.getAdminBanners
);

// POST /admin/banners - Add promotional banner (UC-116)
adminBannerRouter.post(
  '/',
  authenticateJWT,
  authorize('SystemAdmin'),
  bannerUpload.single('image'),
  auditLogger('CREATE_BANNER', 'Banner'),
  bannerController.createBanner
);

// DELETE /admin/banners/:id - Soft delete banner (UC-118)
adminBannerRouter.delete(
  '/:id',
  authenticateJWT,
  authorize('SystemAdmin'),
  auditLogger('DELETE_BANNER', 'Banner'),
  bannerController.deleteBanner
);

export default {
  adminBannerRouter,
  publicBannerRouter,
};
