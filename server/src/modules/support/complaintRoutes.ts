import { Router } from 'express';
import { authenticateJWT } from '../../core/authMiddleware';
import { authorize } from '../../core/rbacMiddleware';
import { complaintUpload } from '../../core/uploadMiddleware';
import { auditLogger } from '../../core/auditMiddleware';
import * as complaintController from './complaintController';

const router = Router();

// Categories endpoint (Accessible for dropdown)
router.get('/categories', complaintController.getCategories);

// Customer endpoints
router.post(
  '/',
  authenticateJWT,
  authorize('Customer', 'Staff', 'BranchManager', 'SystemAdmin'),
  complaintUpload.array('attachments', 5),
  auditLogger('SUBMIT_COMPLAINT', 'Complaint'),
  complaintController.submitComplaint
);

router.get('/', authenticateJWT, complaintController.getMyComplaints);
router.get('/my', authenticateJWT, complaintController.getMyComplaints);
router.get('/:id', authenticateJWT, complaintController.getComplaintDetail);

export const complaintRouter = router;

// Customer Complaint Tracking Router: /me/complaints & /api/me/complaints (UC-43)
export const customerComplaintRouter = Router();

customerComplaintRouter.get(
  ['/', ''],
  authenticateJWT,
  authorize('Customer', 'Staff', 'BranchManager', 'SystemAdmin'),
  complaintController.getMyComplaints
);

customerComplaintRouter.get(
  '/:id',
  authenticateJWT,
  authorize('Customer', 'Staff', 'BranchManager', 'SystemAdmin'),
  complaintController.getComplaintDetail
);

export default router;
