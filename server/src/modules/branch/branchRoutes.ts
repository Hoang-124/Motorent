import { Router } from 'express';
import { authenticateJWT } from '../../core/authMiddleware';
import { authorize } from '../../core/rbacMiddleware';
import { auditLogger } from '../../core/auditMiddleware';
import * as branchController from './branchController';

const router = Router();

// Public routes
router.get('/', branchController.getBranches);
router.get('/nearby', branchController.getNearby);
router.get('/:id', branchController.getBranch);

// SystemAdmin protected routes
router.post(
  '/',
  authenticateJWT,
  authorize('SystemAdmin'),
  auditLogger('CREATE_BRANCH', 'Branch'),
  branchController.createBranch
);

router.put(
  '/:id',
  authenticateJWT,
  authorize('SystemAdmin'),
  auditLogger('UPDATE_BRANCH', 'Branch'),
  branchController.updateBranch
);

router.delete(
  '/:id',
  authenticateJWT,
  authorize('SystemAdmin'),
  auditLogger('DEACTIVATE_BRANCH', 'Branch'),
  branchController.deleteBranch
);

export default router;
