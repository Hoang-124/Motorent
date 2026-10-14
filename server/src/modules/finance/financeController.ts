import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../core/authMiddleware';
import * as financeService from './financeService';

const reconcileQuerySchema = z.object({
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
});

const taxReportQuerySchema = z.object({
  period: z.enum(['month', 'quarter']).default('month'),
  year: z.coerce.number().int().min(2020).max(2035).default(new Date().getFullYear()),
  n: z.coerce.number().int().min(1).max(12).default(new Date().getMonth() + 1),
  vatRate: z.coerce.number().min(0).max(0.3).default(0.1), // 10% standard VAT
});

export const getReconcile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = reconcileQuerySchema.parse(req.query);
    const fromDate = query.from ? new Date(query.from) : undefined;
    const toDate = query.to ? new Date(query.to) : undefined;

    const result = await financeService.reconcilePayments(fromDate, toDate);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getTaxReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = taxReportQuerySchema.parse(req.query);
    await financeService.streamTaxReportExcel(
      query.period,
      query.year,
      query.n,
      query.vatRate,
      res
    );
  } catch (error) {
    next(error);
  }
};
