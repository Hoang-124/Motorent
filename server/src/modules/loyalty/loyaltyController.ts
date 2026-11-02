import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../core/authMiddleware';
import { AppError } from '../../core/errorHandler';
import * as loyaltyService from './loyaltyService';

const redeemSchema = z.object({
  points: z.coerce.number().int().positive(),
});

const getUserId = (req: AuthenticatedRequest): string => {
  if (!req.user?._id) throw new AppError(401, 'Yêu cầu đăng nhập.');
  return req.user._id.toString();
};

export const getSummary = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const summary = await loyaltyService.getLoyaltySummary(getUserId(req));
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};

export const redeem = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { points } = redeemSchema.parse(req.body);
    const voucher = await loyaltyService.redeemPoints(getUserId(req), points);
    res.status(201).json({ success: true, data: voucher });
  } catch (error) {
    next(error);
  }
};
