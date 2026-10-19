import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../core/authMiddleware';
import { AppError } from '../../core/errorHandler';
import { IUser } from '../../models/User';
import * as transfers from './transferService';
import * as maintenance from './maintenanceService';

const id = z.string().regex(/^[a-f\d]{24}$/i, 'Mã định danh không hợp lệ');
const reason = z.string().trim().min(5, 'Vui lòng mô tả ít nhất 5 ký tự').max(2000);
const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(12),
  branchId: id.optional(),
});
const transferSchema = z.object({ vehicleId: id, toBranchId: id, transferReason: reason,
  notes: z.string().trim().max(2000).optional() }).strict();
const maintenanceSchema = z.object({ vehicleId: id, maintenanceType: z.enum(['Routine', 'Repair', 'Inspection']).default('Routine'),
  description: reason, performedBy: z.string().trim().min(2).max(120), cost: z.number().finite().nonnegative().default(0),
  scheduledDate: z.iso.datetime({ offset: true }).transform((value) => new Date(value)).optional(),
}).strict();
const completeSchema = z.object({ cost: z.number().finite().nonnegative(),
  performedBy: z.string().trim().min(2).max(120).optional(), odometer: z.number().finite().nonnegative().optional() }).strict();
const actor = (req: AuthenticatedRequest): IUser => {
  if (!req.user) throw new AppError(401, 'Yêu cầu đăng nhập.');
  return req.user;
};

type Handler = (req: AuthenticatedRequest, res: Response) => Promise<void>;
const action = (handler: Handler) => async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try { await handler(req, res); } catch (error) { next(error); }
};

export const requestTransfer = action(async (req, res) => {
  const data = await transfers.requestTransfer(actor(req), transferSchema.parse(req.body));
  res.status(201).json({ success: true, data });
});
export const approveTransfer = action(async (req, res) => {
  const data = await transfers.approveTransfer(id.parse(req.params.id), actor(req));
  res.json({ success: true, data });
});
export const rejectTransfer = action(async (req, res) => {
  const input = z.object({ rejectionReason: reason }).strict().parse(req.body);
  const data = await transfers.rejectTransfer(id.parse(req.params.id), actor(req), input.rejectionReason);
  res.json({ success: true, data });
});
export const listTransfers = action(async (req, res) => {
  const options = pageQuery.extend({ status: z.enum(['Pending', 'Approved', 'InTransit', 'Completed', 'Rejected']).optional() }).parse(req.query);
  res.json({ success: true, ...await transfers.listTransfers(actor(req), options) });
});
export const scheduleMaintenance = action(async (req, res) => {
  const data = await maintenance.scheduleMaintenance(actor(req), maintenanceSchema.parse(req.body));
  res.status(201).json({ success: true, data });
});
export const startMaintenance = action(async (req, res) => {
  const data = await maintenance.startMaintenance(id.parse(req.params.id), actor(req));
  res.json({ success: true, data });
});
export const completeMaintenance = action(async (req, res) => {
  const data = await maintenance.completeMaintenance(id.parse(req.params.id), actor(req), completeSchema.parse(req.body));
  res.json({ success: true, data });
});
export const listMaintenance = action(async (req, res) => {
  const options = pageQuery.extend({ status: z.enum(['Scheduled', 'InProgress', 'Completed']).optional(), vehicleId: id.optional() }).parse(req.query);
  res.json({ success: true, ...await maintenance.listMaintenance(actor(req), options) });
});
export const vehicleMaintenance = action(async (req, res) => {
  const options = pageQuery.parse(req.query);
  res.json({ success: true, ...await maintenance.listMaintenance(actor(req), { ...options, vehicleId: id.parse(req.params.id) }) });
});
export const odometerAlerts = action(async (req, res) => {
  res.json({ success: true, ...await maintenance.listOdometerAlerts(actor(req), pageQuery.parse(req.query)) });
});
