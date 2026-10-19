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
export default router;
