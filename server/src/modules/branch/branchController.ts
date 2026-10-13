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
});

const updateBranchSchema = createBranchSchema.partial().extend({
  isActive: z.boolean().optional(),
  managerId: z.string().optional(),
});

export const getBranches = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const branches = await branchService.getAllBranches();
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

export const createBranch = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = createBranchSchema.parse(req.body);
    const branch = await branchService.createBranch(data);
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

export const deleteBranch = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const branch = await branchService.deactivateBranch(req.params.id);
    res.json({
      success: true,
      message: 'Đã tạm ngưng hoạt động chi nhánh.',
      data: branch,
    });
  } catch (error) {
    next(error);
  }
};
