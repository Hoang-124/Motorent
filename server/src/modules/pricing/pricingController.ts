import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../core/authMiddleware';
import { AppError } from '../../core/errorHandler';
import { isCalendarDate } from './pricingCalculator';
import * as service from './pricingService';

const price = z.number().finite().positive('Giá thuê phải lớn hơn 0.').max(1_000_000_000, 'Giá thuê vượt quá giới hạn.');
const pricingSchema = z.object({ dailyPrice: price, hourlyPrice: price.nullable().optional() }).strict();
const date = z.string().refine(isCalendarDate, 'Ngày phải hợp lệ và theo định dạng YYYY-MM-DD.');
const ruleSchema = z.object({
  name: z.string().trim().min(1, 'Nhập tên quy tắc giá.').max(120),
  startDate: date, endDate: date,
  multiplier: z.number().finite().min(0.01, 'Hệ số phải từ 0,01 đến 10.').max(10, 'Hệ số phải từ 0,01 đến 10.'),
}).strict().refine((value) => value.startDate <= value.endDate, {
  message: 'Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.', path: ['endDate'],
});
const requireUser = (req: AuthenticatedRequest) => {
  if (!req.user) throw new AppError(401, 'Vui lòng đăng nhập.');
  return req.user;
};

export const updatePricing = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try { res.json({ success: true, message: 'Đã cập nhật giá thuê.', data: await service.updatePricing(req.params.id, requireUser(req), pricingSchema.parse(req.body)) }); }
  catch (error) { next(error); }
};
export const listRules = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await service.listRules(req.params.id, requireUser(req)) }); }
  catch (error) { next(error); }
};
export const saveRule = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await service.saveRule(req.params.id, requireUser(req), ruleSchema.parse(req.body), req.params.ruleId);
    res.status(req.params.ruleId ? 200 : 201).json({ success: true, message: 'Đã lưu quy tắc giá mùa vụ.', data });
  } catch (error) { next(error); }
};
export const deleteRule = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try { await service.deleteRule(req.params.id, requireUser(req), req.params.ruleId); res.json({ success: true, message: 'Đã xóa quy tắc giá mùa vụ.' }); }
  catch (error) { next(error); }
};
export const getQuote = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = z.object({ pickupDateTime: z.string().min(1), returnDateTime: z.string().min(1) }).parse(req.query);
    res.json({ success: true, data: await service.getQuote(req.params.id, query.pickupDateTime, query.returnDateTime) });
  } catch (error) { next(error); }
};
