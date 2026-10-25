import { Router } from 'express';
import { authenticateJWT } from '../../core/authMiddleware';
import { authorize } from '../../core/rbacMiddleware';
import * as staffController from './staffController';

const router = Router();

// Only SystemAdmin and BranchManager can manage staff
router.use(authenticateJWT, authorize('SystemAdmin', 'BranchManager'));

router.get('/', staffController.getStaff);
router.post('/', staffController.createStaff);
router.put('/:id', staffController.updateStaff);
router.put('/:id/deactivate', staffController.deactivateStaff);
router.put('/:id/activate', staffController.activateStaff);

export default router;
