import { Router } from 'express';
import { authenticateJWT } from '../../core/authMiddleware';
import { authorize } from '../../core/rbacMiddleware';
import * as loyaltyController from './loyaltyController';

const router = Router();
router.use(authenticateJWT, authorize('Customer'));
router.get('/me', loyaltyController.getSummary);
router.post('/redeem', loyaltyController.redeem);

export default router;
