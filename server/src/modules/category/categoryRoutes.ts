import { Router } from 'express';
import { authenticateJWT } from '../../core/authMiddleware';
import { authorize } from '../../core/rbacMiddleware';
import { auditLogger } from '../../core/auditMiddleware';
import * as categoryController from './categoryController';

const router = Router();

router.get('/', categoryController.getCategories);

router.post(
  '/',
  authenticateJWT,
  authorize('SystemAdmin'),
  auditLogger('CREATE_CATEGORY', 'Category'),
  categoryController.createCategory
);

router.put(
  '/:id',
  authenticateJWT,
  authorize('SystemAdmin'),
  auditLogger('UPDATE_CATEGORY', 'Category'),
  categoryController.updateCategory
);

router.delete(
  '/:id',
  authenticateJWT,
  authorize('SystemAdmin'),
  auditLogger('DELETE_CATEGORY', 'Category'),
  categoryController.deleteCategory
);

export default router;
