import { Router } from 'express';
import { authenticateJWT } from '../../core/authMiddleware';
import { authorize } from '../../core/rbacMiddleware';
import { auditLogger } from '../../core/auditMiddleware';
import * as vehicleController from './vehicleController';
import * as categoryController from '../category/categoryController';

const router = Router();

// Public routes
router.get('/', vehicleController.getVehicles);
router.get('/categories', vehicleController.getCategories);
router.get('/management', authenticateJWT, authorize('BranchManager', 'SystemAdmin'), vehicleController.getManagedVehicles);
router.get('/:id/reviews', vehicleController.getVehicleReviews);
router.get('/:id/availability', vehicleController.getVehicleAvailability);
router.get('/:id', vehicleController.getVehicle);

// Categories admin route
router.post(
  '/categories',
  authenticateJWT,
  authorize('SystemAdmin'),
  auditLogger('CREATE_CATEGORY', 'Category'),
  categoryController.createCategory
);

// Protected vehicle management routes
router.post(
  '/',
  authenticateJWT,
  authorize('BranchManager', 'SystemAdmin'),
  auditLogger('CREATE_VEHICLE', 'Vehicle'),
  vehicleController.createVehicle
);

router.put(
  '/:id',
  authenticateJWT,
  authorize('BranchManager', 'SystemAdmin'),
  auditLogger('UPDATE_VEHICLE', 'Vehicle'),
  vehicleController.updateVehicle
);

router.delete(
  '/:id',
  authenticateJWT,
  authorize('BranchManager', 'SystemAdmin'),
  auditLogger('DELETE_VEHICLE', 'Vehicle'),
  vehicleController.deleteVehicle
);

export default router;
