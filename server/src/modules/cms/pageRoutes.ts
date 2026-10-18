import { Router } from 'express';
import { authenticateJWT } from '../../core/authMiddleware';
import { authorize } from '../../core/rbacMiddleware';
import {
  getAdminPages,
  getAdminPageById,
  createAdminPage,
  updateAdminPage,
  deleteAdminPage,
  getPublicPageBySlug,
} from './pageController';

// Admin Pages Router: /admin/pages
export const adminPageRouter = Router();

adminPageRouter.use(authenticateJWT, authorize('SystemAdmin'));

adminPageRouter.get('/', getAdminPages);
adminPageRouter.post('/', createAdminPage);
adminPageRouter.get('/:id', getAdminPageById);
adminPageRouter.patch('/:id', updateAdminPage);
adminPageRouter.delete('/:id', deleteAdminPage);

// Public Pages Router: /pages
export const publicPageRouter = Router();

publicPageRouter.get('/:slug', getPublicPageBySlug);

export default {
  adminPageRouter,
  publicPageRouter,
};
