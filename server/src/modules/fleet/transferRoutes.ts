import { Router } from 'express';
import { authenticateJWT } from '../../core/authMiddleware';
import { authorize } from '../../core/rbacMiddleware';
import { auditLogger } from '../../core/auditMiddleware';
import * as controller from './fleetController';

const router = Router();
router.use(authenticateJWT);
router.get('/', authorize('Staff', 'BranchManager', 'SystemAdmin'), controller.listTransfers);
router.post('/', authorize('BranchManager', 'SystemAdmin'), auditLogger('REQUEST_VEHICLE_TRANSFER', 'VehicleTransfer'), controller.requestTransfer);
router.put('/:id/approve', authorize('BranchManager', 'SystemAdmin'), auditLogger('APPROVE_VEHICLE_TRANSFER', 'VehicleTransfer'), controller.approveTransfer);
router.put('/:id/reject', authorize('BranchManager', 'SystemAdmin'), auditLogger('REJECT_VEHICLE_TRANSFER', 'VehicleTransfer'), controller.rejectTransfer);
export default router;
