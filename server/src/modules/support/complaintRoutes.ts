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

export const complaintRouter = router;

/**
 * Staff Complaints Router: /staff/complaints (UC-65)
 * Role: Staff, BranchManager, SystemAdmin
 */
export const staffComplaintRouter = Router();

staffComplaintRouter.use(
  authenticateJWT,
  authorize('Staff', 'BranchManager', 'SystemAdmin')
);

staffComplaintRouter.get('/', complaintController.getStaffComplaints);
staffComplaintRouter.get('/:id', complaintController.getStaffComplaintById);
staffComplaintRouter.post('/:id/responses', complaintController.addStaffComplaintResponse);
staffComplaintRouter.post('/:id/response', complaintController.addStaffComplaintResponse);
staffComplaintRouter.patch('/:id/status', complaintController.updateComplaintStatus);

export default router;
