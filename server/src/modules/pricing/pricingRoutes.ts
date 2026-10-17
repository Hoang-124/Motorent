import { Router } from 'express';
import { authenticateJWT } from '../../core/authMiddleware';
import { authorize } from '../../core/rbacMiddleware';
import { auditLogger } from '../../core/auditMiddleware';
import * as controller from './pricingController';

const router = Router();
router.get('/:id/quote', controller.getQuote);
router.put('/:id/pricing', authenticateJWT, authorize('BranchManager', 'SystemAdmin'), auditLogger('UPDATE_VEHICLE_PRICING', 'Vehicle'), controller.updatePricing);
router.get('/:id/pricing-rules', authenticateJWT, authorize('BranchManager', 'SystemAdmin'), controller.listRules);
router.post('/:id/pricing-rules', authenticateJWT, authorize('BranchManager', 'SystemAdmin'), auditLogger('CREATE_SEASONAL_PRICING', 'SeasonalPricingRule'), controller.saveRule);
router.put('/:id/pricing-rules/:ruleId', authenticateJWT, authorize('BranchManager', 'SystemAdmin'), auditLogger('UPDATE_SEASONAL_PRICING', 'SeasonalPricingRule'), controller.saveRule);
router.delete('/:id/pricing-rules/:ruleId', authenticateJWT, authorize('BranchManager', 'SystemAdmin'), auditLogger('DELETE_SEASONAL_PRICING', 'SeasonalPricingRule'), controller.deleteRule);
export default router;
