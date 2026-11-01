import { Router } from 'express';
import { authenticateJWT } from '../../core/authMiddleware';
import { authorize } from '../../core/rbacMiddleware';
import * as discountController from './discountController';

const router = Router();

// Validate discount code (can be called by customer booking or staff counter desk)
router.post('/validate', discountController.validateDiscount);

// Public/Authenticated active discounts list
router.get('/', discountController.getDiscounts);
router.get('/:id', discountController.getDiscountById);

// Admin-only management endpoints (UC-110, UC-111, UC-112)
router.post('/', authenticateJWT, authorize('SystemAdmin'), discountController.createDiscount);
router.put('/:id', authenticateJWT, authorize('SystemAdmin'), discountController.updateDiscount);
router.delete('/:id', authenticateJWT, authorize('SystemAdmin'), discountController.deleteDiscount);

export default router;
