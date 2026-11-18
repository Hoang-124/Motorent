import { Router } from 'express';
import { authenticateJWT } from '../../core/authMiddleware';
import { authorize } from '../../core/rbacMiddleware';
import { auditLogger } from '../../core/auditMiddleware';
import * as controller from './transferController';

const router = Router();
router.use(authenticateJWT);

router.get('/', authorize('Staff', 'VEHICLE_TRANSFER'), controller.listTransfers);
router.post(
  '/',
  authorize('VEHICLE_TRANSFER'),
  auditLogger('REQUEST_VEHICLE_TRANSFER', 'VehicleTransfer'),
  controller.requestTransfer
);
router.put(
  '/:id/approve',
  authorize('VEHICLE_TRANSFER'),
  auditLogger('APPROVE_VEHICLE_TRANSFER', 'VehicleTransfer'),
  controller.approveTransfer
);
router.put(
  '/:id/dispatch',
  authorize('VEHICLE_TRANSFER'),
  auditLogger('DISPATCH_VEHICLE_TRANSFER', 'VehicleTransfer'),
  controller.dispatchTransfer
);
router.put(
  '/:id/complete',
  authorize('VEHICLE_TRANSFER'),
  auditLogger('COMPLETE_VEHICLE_TRANSFER', 'VehicleTransfer'),
  controller.completeTransfer
);
router.put(
  '/:id/receive',
  authorize('VEHICLE_TRANSFER'),
  auditLogger('COMPLETE_VEHICLE_TRANSFER', 'VehicleTransfer'),
  controller.completeTransfer
);
router.put(
  '/:id/reject',
  authorize('VEHICLE_TRANSFER'),
  auditLogger('REJECT_VEHICLE_TRANSFER', 'VehicleTransfer'),
  controller.rejectTransfer
);

export default router;
