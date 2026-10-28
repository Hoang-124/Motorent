import { Router } from 'express';
import { authenticateJWT } from '../../core/authMiddleware';
import { authorize } from '../../core/rbacMiddleware';
import * as reportController from './reportController';

const router = Router();

// All report endpoints require valid JWT authentication
router.use(authenticateJWT);

// UC-86: Daily Revenue
router.get(
  '/revenue/daily',
  authorize('BranchManager', 'SystemAdmin'),
  reportController.getDailyRevenue
);

// UC-87 & UC-88: Monthly Revenue
router.get(
  '/revenue/monthly',
  authorize('BranchManager', 'SystemAdmin'),
  reportController.getMonthlyRevenue
);

// UC-89: Export Excel / PDF Reports
router.get(
  '/export',
  authorize('BranchManager', 'SystemAdmin'),
  reportController.exportReport
);

// UC-90, UC-91, UC-92: Fleet Analytics & Utilization
router.get(
  '/fleet',
  authorize('BranchManager', 'SystemAdmin', 'Staff'),
  reportController.getFleetStats
);

// UC-103: Chain Revenue (All branches combined)
router.get(
  '/chain',
  authorize('SystemAdmin', 'BranchManager'),
  reportController.getChainRevenue
);

// UC-104: Branch Side-by-side KPI Comparison
router.get(
  '/compare',
  authorize('SystemAdmin'),
  reportController.getBranchComparison
);

// UC-105: Executive KPI Dashboard (Trend, Top Vehicles, Funnel)
router.get(
  '/dashboard',
  authorize('BranchManager', 'SystemAdmin'),
  reportController.getKpiDashboard
);

// UC-106: Demand Forecast Service
router.get(
  '/forecast',
  authorize('BranchManager', 'SystemAdmin'),
  reportController.getDemandForecast
);

export default router;
