import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../core/authMiddleware';
import * as vehicleService from './vehicleService';
import { AppError } from '../../core/errorHandler';

const createCategorySchema = z.object({
  name: z.string().trim().min(2, 'Tên danh mục phải có tối thiểu 2 ký tự'),
  slug: z.string().trim().min(2, 'Slug danh mục phải có tối thiểu 2 ký tự'),
  description: z.string().optional(),
});

const createVehicleSchema = z.object({
  branchId: z.string().min(1, 'Thiếu ID chi nhánh'),
  category: z.string().min(1, 'Thiếu ID danh mục'),
  vehicleModel: z.string().trim().min(2, 'Tên mẫu xe không hợp lệ'),
  brand: z.string().trim().min(2, 'Tên thương hiệu không hợp lệ'),
  licensePlate: z.string().trim().min(6, 'Biển số xe không hợp lệ'),
  dailyPrice: z.coerce.number().positive('Giá thuê ngày phải lớn hơn 0'),
  hourlyPrice: z.coerce.number().positive().optional(),
  transmissionType: z.enum(['Automatic', 'Manual', 'Semi-Auto']).default('Automatic'),
  fuelType: z.enum(['Gasoline', 'Electric']).default('Gasoline'),
  yearManufactured: z.coerce.number().optional(),
  odometer: z.coerce.number().nonnegative().optional(),
  images: z.array(z.string()).optional(),
});

const updateVehicleSchema = createVehicleSchema.partial().extend({
  status: z.enum(['Available', 'Rented', 'Maintenance', 'Transferring']).optional(),
  requiresMaintenance: z.boolean().optional(),
});

const updateVehicleStatusSchema = z.object({
  status: z.enum(['Available', 'Rented', 'Maintenance']),
  reason: z.string().trim().optional(),
  maintenanceType: z.enum(['Routine', 'Repair', 'Inspection']).optional(),
  cost: z.coerce.number().nonnegative().optional(),
  odometer: z.coerce.number().nonnegative().optional(),
});

export const getVehicles = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const branchId = typeof req.query.branchId === 'string' ? req.query.branchId : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const fuelType = typeof req.query.fuelType === 'string' ? req.query.fuelType : undefined;
    const transmissionType = typeof req.query.transmissionType === 'string' ? req.query.transmissionType : undefined;
    const sortPrice =
      req.query.sortPrice === 'asc' || req.query.sortPrice === 'desc'
        ? req.query.sortPrice
        : undefined;

    const vehicles = await vehicleService.getAllVehicles({
      branchId,
      category,
      status,
      q,
      fuelType,
      transmissionType,
      sortPrice,
    });

    res.json({
      success: true,
      count: vehicles.length,
      data: vehicles,
    });
  } catch (error) {
    next(error);
  }
};

export const getVehicle = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const vehicle = await vehicleService.getVehicleById(req.params.id);
    res.json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const categories = await vehicleService.getAllCategories();
    res.json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = createCategorySchema.parse(req.body);
    const category = await vehicleService.createCategory(data);
    res.status(201).json({
      success: true,
      message: 'Tạo danh mục xe mới thành công.',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

export const createVehicle = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = createVehicleSchema.parse(req.body);

    // If user is BranchManager, ensure vehicle belongs to their assigned branch
    if (req.user?.roles === 'BranchManager') {
      if (!req.user.branchId || req.user.branchId.toString() !== data.branchId) {
        throw new AppError(403, 'Bạn chỉ có quyền tạo xe thuộc chi nhánh do bạn quản lý.');
      }
    }

    const vehicle = await vehicleService.createVehicle(data);
    res.status(201).json({
      success: true,
      message: 'Thêm phương tiện mới thành công.',
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
};

export const updateVehicle = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = updateVehicleSchema.parse(req.body);

    // Check existing vehicle branch if user is BranchManager
    if (req.user?.roles === 'BranchManager') {
      const existing = await vehicleService.getVehicleById(req.params.id);
      const rawBranch = existing.branchId as unknown;
      const vehicleBranch = rawBranch && typeof rawBranch === 'object' && '_id' in rawBranch
        ? (rawBranch as { _id: { toString(): string } })._id.toString()
        : String(rawBranch);

      if (!req.user.branchId || req.user.branchId.toString() !== vehicleBranch) {
        throw new AppError(403, 'Bạn chỉ có quyền cập nhật xe thuộc chi nhánh do bạn quản lý.');
      }
    }

    const vehicle = await vehicleService.updateVehicle(req.params.id, data);
    res.json({
      success: true,
      message: 'Cập nhật thông tin phương tiện thành công.',
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteVehicle = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (req.user?.roles === 'BranchManager') {
      const existing = await vehicleService.getVehicleById(req.params.id);
      const rawBranch = existing.branchId as unknown;
      const vehicleBranch = rawBranch && typeof rawBranch === 'object' && '_id' in rawBranch
        ? (rawBranch as { _id: { toString(): string } })._id.toString()
        : String(rawBranch);

      if (!req.user.branchId || req.user.branchId.toString() !== vehicleBranch) {
        throw new AppError(403, 'Bạn chỉ có quyền xóa xe thuộc chi nhánh do bạn quản lý.');
      }
    }

    const vehicle = await vehicleService.deleteVehicle(req.params.id);
    res.json({
      success: true,
      message: 'Đã xóa phương tiện khỏi danh sách khai thác.',
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
};

export const updateVehicleStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = updateVehicleStatusSchema.parse(req.body);
    const vehicle = await vehicleService.updateVehicleStatus(
      req.params.id,
      data,
      req.user
    );
    res.json({
      success: true,
      message: `Cập nhật trạng thái xe thành "${vehicle.status}" thành công.`,
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
};

