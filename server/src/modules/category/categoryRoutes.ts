import { Router } from 'express';
import { authenticateJWT } from '../../core/authMiddleware';
import { authorize } from '../../core/rbacMiddleware';
import { auditLogger } from '../../core/auditMiddleware';
import * as categoryController from './categoryController';

const router = Router();

router.get('/', categoryController.getCategories);

router.post('/',
  auditLogger('CREATE_CATEGORY', 'Category'),
  authenticateJWT,
  authorize('SystemAdmin'),
  categoryController.createCategory
);

router.put('/:id',
  auditLogger('UPDATE_CATEGORY', 'Category'),
  authenticateJWT,
  authorize('SystemAdmin'),
  categoryController.updateCategory
);

router.delete('/:id',
  auditLogger('DELETE_CATEGORY', 'Category'),
  authenticateJWT,
  authorize('SystemAdmin'),
  categoryController.deleteCategory
);

export default router;
