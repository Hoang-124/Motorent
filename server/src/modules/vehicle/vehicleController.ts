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
    const brand = typeof req.query.brand === 'string' ? req.query.brand : undefined;
    const parsePrice = (value: unknown, label: string): number | undefined => {
      if (value === undefined) return undefined;
      if (typeof value !== 'string' || !value.trim()) {
        throw new AppError(400, `${label} không hợp lệ.`);
      }
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new AppError(400, `${label} phải là số không âm.`);
      }
      return parsed;
    };
    const minPrice = parsePrice(req.query.minPrice, 'Giá thấp nhất');
    const maxPrice = parsePrice(req.query.maxPrice, 'Giá cao nhất');
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      throw new AppError(400, 'Giá thấp nhất không được lớn hơn giá cao nhất.');
    }
    const sortValue = typeof req.query.sort === 'string' ? req.query.sort : undefined;
    const sort = ['price_asc', 'price_desc', 'rating_asc', 'rating_desc'].includes(sortValue || '')
      ? (sortValue as 'price_asc' | 'price_desc' | 'rating_asc' | 'rating_desc')
      : undefined;

    const vehicles = await vehicleService.getAllVehicles({
      branchId,
      category,
      status,
      q,
      fuelType,
      transmissionType,
      brand,
      minPrice,
      maxPrice,
      sort,
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
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      throw new AppError(400, 'Mã phương tiện không hợp lệ.');
    }
    const [vehicle, rating] = await Promise.all([
      vehicleService.getVehicleById(req.params.id),
      vehicleService.getVehicleRatingSummary(req.params.id),
    ]);
    res.json({
      success: true,
      data: { ...vehicle.toObject(), ...rating },
    });
  } catch (error) {
    next(error);
  }
};

export const getVehicleReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 6);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1) {
      throw new AppError(400, 'Trang và số đánh giá mỗi trang phải là số nguyên dương.');
    }
    const result = await vehicleService.getVehicleReviews(req.params.id, page, Math.min(limit, 50));
    res.json({ success: true, data: result.reviews, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

export const getVehicleAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const month = typeof req.query.month === 'string' ? req.query.month : new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      throw new AppError(400, 'Tháng cần có định dạng YYYY-MM.');
    }
    const availability = await vehicleService.getVehicleAvailability(req.params.id, month);
    res.json({ success: true, data: availability });
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
