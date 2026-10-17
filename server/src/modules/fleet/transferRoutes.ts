import { Router } from 'express';
import { authenticateJWT } from '../../core/authMiddleware';
import { authorize } from '../../core/rbacMiddleware';
import { auditLogger } from '../../core/auditMiddleware';
import * as controller from './fleetController';

const router = Router();
router.use(authenticateJWT, authorize('BranchManager', 'SystemAdmin'));
router.get('/', controller.listTransfers);
router.post('/', auditLogger('REQUEST_VEHICLE_TRANSFER', 'VehicleTransfer'), controller.requestTransfer);
router.put('/:id/approve', auditLogger('APPROVE_VEHICLE_TRANSFER', 'VehicleTransfer'), controller.approveTransfer);
router.put('/:id/reject', auditLogger('REJECT_VEHICLE_TRANSFER', 'VehicleTransfer'), controller.rejectTransfer);
export default router;
