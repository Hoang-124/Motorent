import { Router } from 'express';
import { authenticateJWT } from '../../core/authMiddleware';
import { authorize } from '../../core/rbacMiddleware';
import { complaintUpload } from '../../core/uploadMiddleware';
import { auditLogger } from '../../core/auditMiddleware';
import * as complaintController from './complaintController';

const router = Router();

// Categories endpoint (Accessible for dropdown)
router.get('/categories', complaintController.getCategories);

// Customer endpoints (UC-42, UC-43)
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

/**
 * Customer Complaint Tracking Router: /me/complaints & /api/me/complaints (UC-43)
 */
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

/**
 * Manager Complaints Router: /manager/complaints (UC-85)
 * Role: BranchManager, SystemAdmin
 */
export const managerComplaintRouter = Router();

managerComplaintRouter.use(
  authenticateJWT,
  authorize('BranchManager', 'SystemAdmin')
);

managerComplaintRouter.get('/pending', complaintController.getPendingComplaints);
managerComplaintRouter.post('/:id/resolve', complaintController.resolveComplaint);
managerComplaintRouter.post('/:id/close', complaintController.closeComplaint);
managerComplaintRouter.get('/:id', complaintController.getStaffComplaintById);

export default router;
