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
// Protected Admin Banner Routes (UC-116, UC-117, UC-118)
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

// PATCH /admin/banners/reorder - Reorder banners atomically (UC-117)
adminBannerRouter.patch(
  '/reorder',
  authenticateJWT,
  authorize('SystemAdmin'),
  auditLogger('REORDER_BANNERS', 'Banner'),
  bannerController.reorderBanners
);

// PATCH /admin/banners/:id/status - Quick toggle isActive on table (UC-117)
adminBannerRouter.patch(
  '/:id/status',
  authenticateJWT,
  authorize('SystemAdmin'),
  auditLogger('UPDATE_BANNER_STATUS', 'Banner'),
  bannerController.updateBannerStatus
);

// GET /admin/banners/:id - Get banner details for edit form (UC-117)
adminBannerRouter.get(
  '/:id',
  authenticateJWT,
  authorize('SystemAdmin'),
  bannerController.getBannerById
);

// PATCH /admin/banners/:id - Edit banner fields and/or replacement image (UC-117)
adminBannerRouter.patch(
  '/:id',
  authenticateJWT,
  authorize('SystemAdmin'),
  bannerUpload.single('image'),
  auditLogger('UPDATE_BANNER', 'Banner'),
  bannerController.updateBanner
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
