import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as branchService from './branchService';

const createBranchSchema = z.object({
  name: z.string().trim().min(3, 'Tên chi nhánh phải có ít nhất 3 ký tự'),
  code: z.string().trim().min(2, 'Mã chi nhánh tối thiểu 2 ký tự').max(10),
  address: z.string().trim().min(5, 'Địa chỉ chi nhánh phải rõ ràng'),
  phone: z.string().trim().min(8, 'Số điện thoại không hợp lệ'),
  email: z.string().trim().email().optional().or(z.literal('')),
  location_lat: z.coerce.number().optional(),
  location_lng: z.coerce.number().optional(),
  hours_open: z.string().default('06:00'),
  hours_close: z.string().default('23:00'),
  description: z.string().optional(),
  managerId: z.string().optional().or(z.literal('')),
});

const updateBranchSchema = createBranchSchema.partial().extend({
  isActive: z.boolean().optional(),
  managerId: z.string().optional().nullable(),
});

export const getBranches = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const includeInactive = req.query.all === 'true' || req.query.includeInactive === 'true';
    const branches = await branchService.getAllBranches(includeInactive);
    res.json({
      success: true,
      count: branches.length,
      data: branches,
    });
  } catch (error) {
    next(error);
  }
};

export const getBranch = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const branch = await branchService.getBranchById(req.params.id);
    res.json({
      success: true,
      data: branch,
    });
  } catch (error) {
    next(error);
  }
};

export const getNearby = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const lat = req.query.lat ? Number(req.query.lat) : undefined;
    const lng = req.query.lng ? Number(req.query.lng) : undefined;
    const branches = await branchService.getNearbyBranches(lat, lng);
    res.json({
      success: true,
      count: branches.length,
      data: branches,
    });
  } catch (error) {
    next(error);
  }
};

export const checkActiveBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const count = await branchService.checkActiveBookings(req.params.id);
    res.json({
      success: true,
      activeBookingsCount: count,
      hasActiveBookings: count > 0,
      message: count > 0 ? `Chi nhánh có ${count} đơn thuê xe đang hoạt động.` : 'Không có đơn thuê xe đang hoạt động.',
    });
  } catch (error) {
    next(error);
  }
};

export const createBranch = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = createBranchSchema.parse(req.body);
    const branch = await branchService.createBranch({
      ...data,
      managerId: data.managerId || undefined,
    });
    res.status(201).json({
      success: true,
      message: 'Tạo chi nhánh mới thành công.',
      data: branch,
    });
  } catch (error) {
    next(error);
  }
};

export const updateBranch = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = updateBranchSchema.parse(req.body);
    const branch = await branchService.updateBranch(req.params.id, data);
    res.json({
      success: true,
      message: 'Cập nhật thông tin chi nhánh thành công.',
      data: branch,
    });
  } catch (error) {
    next(error);
  }
};

export const deactivateBranch = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await branchService.deactivateBranch(req.params.id);
    res.json({
      success: true,
      message: result.warning || 'Đã tạm ngưng hoạt động chi nhánh.',
      activeBookingsCount: result.activeBookingsCount,
      warning: result.warning,
      data: result.branch,
    });
  } catch (error) {
    next(error);
  }
};

export const activateBranch = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const branch = await branchService.activateBranch(req.params.id);
    res.json({
      success: true,
      message: 'Đã kích hoạt lại chi nhánh thành công.',
      data: branch,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteBranch = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await branchService.deactivateBranch(req.params.id);
    res.json({
      success: true,
      message: result.warning || 'Đã tạm ngưng hoạt động chi nhánh.',
      activeBookingsCount: result.activeBookingsCount,
      warning: result.warning,
      data: result.branch,
    });
  } catch (error) {
    next(error);
  }
};
