import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../core/authMiddleware';
import * as reportService from './reportService';

/**
 * Determine effective branchId based on user role and request query
 */
const resolveBranchScope = (req: AuthenticatedRequest): string | undefined => {
  if (req.user?.roles === 'BranchManager') {
    return req.user?.branchId ? String((req.user.branchId as any)._id || req.user.branchId) : undefined;
  }
  if (req.query.branchId) {
    return String(req.query.branchId);
  }
  return undefined;
};

/**
 * UC-86: Daily Revenue Endpoint
 */
export const getDailyRevenue = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = resolveBranchScope(req);
    const dateStr = req.query.date as string | undefined;

    const data = await reportService.getDailyRevenue(branchId, dateStr);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * UC-87 & UC-88: Monthly Revenue Endpoint with Comparisons
 */
export const getMonthlyRevenue = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = resolveBranchScope(req);
    const month = req.query.month ? Number(req.query.month) : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;

    const data = await reportService.getMonthlyRevenue(branchId, month, year);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * UC-90, UC-91, UC-92: Fleet Analytics & Utilization
 */
export const getFleetStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = resolveBranchScope(req);
    const data = await reportService.getFleetStats(branchId);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * UC-103: Chain Revenue across all branches
 */
export const getChainRevenue = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const period = (req.query.period as string) || 'this_month';
    const data = await reportService.getChainRevenue(period);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * UC-104: Branch Side-by-side KPI Comparison
 */
export const getBranchComparison = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const period = (req.query.period as string) || 'this_month';
    const data = await reportService.getBranchComparison(period);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * UC-105: Executive KPI Dashboard (Trend, Top Vehicles, Funnel)
 */
export const getKpiDashboard = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = resolveBranchScope(req);
    const data = await reportService.getKpiDashboard(branchId);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * UC-106: Demand Forecast
 */
export const getDemandForecast = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = resolveBranchScope(req);
    const data = await reportService.getDemandForecast(branchId);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * UC-89: Export Excel / PDF Reports
 */
export const exportReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const branchId = resolveBranchScope(req);
    const format = String(req.query.format || req.query.type || 'excel').toLowerCase();
    const reportType = String(req.query.reportType || 'daily').toLowerCase();
    const dateStr = req.query.date as string | undefined;
    const month = req.query.month ? Number(req.query.month) : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;

    const timestamp = new Date().toISOString().slice(0, 10);

    if (format === 'pdf') {
      const pdfBuffer = await reportService.generatePdfReport(reportType, branchId, dateStr, month, year);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="motorent-report-${reportType}-${timestamp}.pdf"`
      );
      res.send(pdfBuffer);
    } else {
      // Default Excel
      const excelBuffer = await reportService.generateExcelReport(reportType, branchId, dateStr, month, year);

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="motorent-report-${reportType}-${timestamp}.xlsx"`
      );
      res.send(excelBuffer);
    }
  } catch (error) {
    next(error);
  }
};
