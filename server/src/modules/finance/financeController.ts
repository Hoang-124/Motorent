import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../core/authMiddleware';
import { AppError } from '../../core/errorHandler';
import * as financeService from './financeService';

const reconcileQuerySchema = z.object({
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  branchId: z.string().trim().optional(),
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

    if (fromDate && Number.isNaN(fromDate.getTime())) {
      throw new AppError(400, 'Ngày bắt đầu đối soát (from) không hợp lệ.');
    }
    if (toDate && Number.isNaN(toDate.getTime())) {
      throw new AppError(400, 'Ngày kết thúc đối soát (to) không hợp lệ.');
    }
    if (toDate && query.to && /^\d{4}-\d{2}-\d{2}$/.test(query.to)) {
      toDate.setHours(23, 59, 59, 999);
    }

    let scopedBranchId: string | undefined;
    if (req.user?.roles === 'BranchManager') {
      if (!req.user.branchId) {
        throw new AppError(403, 'Tài khoản quản lý chưa được phân công chi nhánh để đối soát.');
      }
      scopedBranchId = req.user.branchId.toString();
    } else if (query.branchId && mongoose.isValidObjectId(query.branchId)) {
      scopedBranchId = query.branchId;
    }

    const result = await financeService.reconcilePayments(fromDate, toDate, scopedBranchId);
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
