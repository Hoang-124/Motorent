import { Router } from 'express';
import { authenticateJWT } from '../../core/authMiddleware';
import { authorize } from '../../core/rbacMiddleware';
import { auditLogger } from '../../core/auditMiddleware';
import * as controller from './fleetController';

const router = Router();
router.use(authenticateJWT, authorize('Staff', 'BranchManager', 'SystemAdmin'));
router.get('/', controller.listMaintenance);
router.get('/alerts', controller.odometerAlerts);
router.get('/vehicle/:id', controller.vehicleMaintenance);
router.post('/', auditLogger('SCHEDULE_MAINTENANCE', 'MaintenanceLog'), controller.scheduleMaintenance);
router.put('/:id/start', auditLogger('START_MAINTENANCE', 'MaintenanceLog'), controller.startMaintenance);
router.put('/:id/complete', authorize('BranchManager', 'SystemAdmin'), auditLogger('COMPLETE_MAINTENANCE', 'MaintenanceLog'), controller.completeMaintenance);
export default router;
