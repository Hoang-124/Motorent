import { Router } from 'express';
import { authenticateJWT } from '../../core/authMiddleware';
import { authorize } from '../../core/rbacMiddleware';
import * as financeController from './financeController';

const router = Router();

// UC-120: VNPay & Payment Reconciliation
router.get(
  '/reconcile',
  authenticateJWT,
  authorize('SystemAdmin', 'BranchManager', 'FINANCE_RECONCILE'),
  financeController.getReconcile
);

// UC-121: Export Tax Report XLSX stream
router.get(
  '/tax-report',
  authenticateJWT,
  authorize('SystemAdmin', 'FINANCE_TAX_REPORT'),
  financeController.getTaxReport
);

export default router;
