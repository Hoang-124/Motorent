import { Router } from 'express';
import { authenticateJWT } from '../../core/authMiddleware';
import { authorize } from '../../core/rbacMiddleware';
import { auditLogger } from '../../core/auditMiddleware';
import * as adminController from './adminController';

const router = Router();

// Protect all admin routes with JWT and SystemAdmin role authorization
router.use(authenticateJWT);
router.use(authorize('SystemAdmin'));

// Users & Managers management endpoints
router.post(
  '/users',
  auditLogger('CREATE_USER', 'User'),
  adminController.createUser
);

router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);

router.put(
  '/users/:id/lock',
  auditLogger('LOCK_USER', 'User'),
  adminController.lockUser
);

router.put(
  '/users/:id/unlock',
  auditLogger('UNLOCK_USER', 'User'),
  adminController.unlockUser
);

router.put(
  '/users/:id',
  auditLogger('UPDATE_USER', 'User'),
  adminController.updateUser
);

router.delete(
  '/users/:id',
  auditLogger('DELETE_USER', 'User'),
  adminController.deleteUser
);

export default router;
