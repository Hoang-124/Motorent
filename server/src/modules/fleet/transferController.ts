import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../core/authMiddleware';
import { AppError } from '../../core/errorHandler';
import { IUser } from '../../models/User';
import * as transfers from './transferService';

const id = z.string().regex(/^[a-f\d]{24}$/i, 'Mã định danh không hợp lệ');
const reason = z.string().trim().min(5, 'Vui lòng mô tả ít nhất 5 ký tự').max(2000);

const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
  branchId: id.optional(),
});

const transferSchema = z
  .object({
    vehicleId: id,
    toBranchId: id,
    transferReason: reason,
    notes: z.string().trim().max(2000).optional(),
  })
  .strict();

const completeTransferSchema = z
  .object({
    notes: z.string().trim().max(2000).optional(),
  })
  .strict()
  .optional();

const actor = (req: AuthenticatedRequest): IUser => {
  if (!req.user) throw new AppError(401, 'Yêu cầu đăng nhập.');
  return req.user;
};

type Handler = (req: AuthenticatedRequest, res: Response) => Promise<void>;
const action =
  (handler: Handler) =>
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await handler(req, res);
    } catch (error) {
      next(error);
    }
  };

export const listTransfers = action(async (req, res) => {
  const options = pageQuery
    .extend({
      status: z.enum(['Pending', 'Approved', 'InTransit', 'Completed', 'Rejected']).optional(),
      vehicleId: id.optional(),
    })
    .parse(req.query);
  res.json({ success: true, ...(await transfers.listTransfers(actor(req), options)) });
});

export const requestTransfer = action(async (req, res) => {
  const data = await transfers.requestTransfer(actor(req), transferSchema.parse(req.body));
  res.status(201).json({ success: true, data });
});

export const approveTransfer = action(async (req, res) => {
  const data = await transfers.approveTransfer(id.parse(req.params.id), actor(req));
  res.json({ success: true, data });
});

export const dispatchTransfer = action(async (req, res) => {
  const data = await transfers.dispatchTransfer(id.parse(req.params.id), actor(req));
  res.json({ success: true, data });
});

export const completeTransfer = action(async (req, res) => {
  const parsedBody =
    req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0
      ? completeTransferSchema.parse(req.body)
      : undefined;
  const data = await transfers.completeTransfer(
    id.parse(req.params.id),
    actor(req),
    parsedBody?.notes
  );
  res.json({ success: true, data });
});

export const rejectTransfer = action(async (req, res) => {
  const input = z.object({ rejectionReason: reason }).strict().parse(req.body);
  const data = await transfers.rejectTransfer(
    id.parse(req.params.id),
    actor(req),
    input.rejectionReason
  );
  res.json({ success: true, data });
});
