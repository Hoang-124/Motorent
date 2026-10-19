import { Router } from 'express';
import { authenticateJWT } from '../../core/authMiddleware';
import { authorize } from '../../core/rbacMiddleware';
import { reviewPhotosUpload } from '../../core/uploadMiddleware';
import * as reviewController from './reviewController';

const router = Router();

// PATCH /api/reviews/:id - Customer (chủ review)
router.patch(
  '/:id',
  authenticateJWT,
  authorize('Customer', 'BranchManager', 'Staff', 'SystemAdmin'),
  reviewPhotosUpload.array('photos', 5),
  reviewController.updateReview
);

// DELETE /api/reviews/:id - Customer (chủ review)
router.delete(
  '/:id',
  authenticateJWT,
  authorize('Customer', 'BranchManager', 'Staff', 'SystemAdmin'),
  reviewController.deleteReview
);

// GET /api/reviews/me - Customer reviews
router.get(
  '/me',
  authenticateJWT,
  authorize('Customer', 'BranchManager', 'Staff', 'SystemAdmin'),
  reviewController.getMyReviews
);

export default router;
