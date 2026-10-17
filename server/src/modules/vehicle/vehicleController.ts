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
  branchId: z.string().regex(/^[a-f\d]{24}$/i, 'ID chi nhánh không hợp lệ'),
  category: z.string().regex(/^[a-f\d]{24}$/i, 'ID danh mục không hợp lệ'),
  vehicleModel: z.string().trim().min(2, 'Tên mẫu xe không hợp lệ'),
  brand: z.string().trim().min(2, 'Tên thương hiệu không hợp lệ'),
  licensePlate: z.string().trim().min(6, 'Biển số xe không hợp lệ').max(24),
  dailyPrice: z.coerce.number().finite().positive('Giá thuê ngày phải lớn hơn 0'),
  hourlyPrice: z.coerce.number().finite().positive().optional(),
  transmissionType: z.enum(['Automatic', 'Manual', 'Semi-Auto']).default('Automatic'),
  fuelType: z.enum(['Gasoline', 'Electric']).default('Gasoline'),
  yearManufactured: z.coerce.number().int().min(1950).max(new Date().getFullYear() + 1).optional(),
  color: z.string().trim().max(80).optional(),
  odometer: z.coerce.number().finite().nonnegative().optional(),
  images: z.array(z.string().url('Ảnh cần là một URL hợp lệ').regex(/^https?:\/\//i, 'Chỉ chấp nhận URL ảnh http/https')).max(10, 'Mỗi xe có tối đa 10 ảnh').optional(),
});

const updateVehicleSchema = createVehicleSchema.omit({ licensePlate: true }).partial().extend({
  status: z.enum(['Available', 'Rented', 'Maintenance', 'Transferring']).optional(),
}).strict();

const readQueryString = (value: unknown, label: string): string | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new AppError(400, `${label} không hợp lệ.`);
  return value.trim();
};

const readPositiveInteger = (value: unknown, fallback: number): number => {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new AppError(400, 'Trang và số kết quả mỗi trang phải là số nguyên dương.');
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new AppError(400, 'Trang và số kết quả mỗi trang phải là số nguyên dương.');
  }
  return parsed;
};

const readPrice = (value: unknown, label: string): number | undefined => {
  const raw = readQueryString(value, label);
  if (raw === undefined) return undefined;
  const price = Number(raw);
  if (!raw || !Number.isFinite(price) || price < 0) {
    throw new AppError(400, `${label} phải là số không âm.`);
  }
  return price;
};

export const getVehicles = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const branchId = readQueryString(req.query.branchId, 'Mã chi nhánh');
    const category = readQueryString(req.query.category, 'Danh mục');
    const status = readQueryString(req.query.status, 'Trạng thái xe');
    const q = readQueryString(req.query.q, 'Từ khóa tìm kiếm');
    const fuelType = readQueryString(req.query.fuelType, 'Nhiên liệu');
    const transmissionType = readQueryString(req.query.transmissionType, 'Loại hộp số');
    const brand = readQueryString(req.query.brand, 'Thương hiệu');
    const minPrice = readPrice(req.query.minPrice, 'Giá thấp nhất');
    const maxPrice = readPrice(req.query.maxPrice, 'Giá cao nhất');
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      throw new AppError(400, 'Giá thấp nhất không được lớn hơn giá cao nhất.');
    }
    const sortValue = readQueryString(req.query.sort, 'Cách sắp xếp');
    const sortSchema = z.enum(['price_asc', 'price_desc', 'rating_asc', 'rating_desc']);
    const sort = sortValue ? sortSchema.parse(sortValue) : undefined;
    const sortPrice =
      req.query.sortPrice === 'asc' || req.query.sortPrice === 'desc'
        ? req.query.sortPrice
        : undefined;

    const paginated = req.query.page !== undefined || req.query.limit !== undefined;
    const page = paginated ? readPositiveInteger(req.query.page, 1) : undefined;
    const limit = paginated ? Math.min(readPositiveInteger(req.query.limit, 12), 100) : undefined;
    if (page && limit && !Number.isSafeInteger((page - 1) * limit)) {
      throw new AppError(400, 'Số trang vượt quá phạm vi cho phép.');
    }

    const result = await vehicleService.getAllVehicles({
      branchId,
      category,
      status,
      q,
      fuelType,
      transmissionType,
      sortPrice,
      brand,
      minPrice,
      maxPrice,
      sort,
      page,
      limit,
    });

    res.json({
      success: true,
      count: result.vehicles.length,
      data: result.vehicles,
      pagination: result.pagination,
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
    const rating = await vehicleService.getVehicleRatingSummary(req.params.id);
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
    const page = readPositiveInteger(req.query.page, 1);
    const limit = Math.min(readPositiveInteger(req.query.limit, 6), 50);
    if (!Number.isSafeInteger((page - 1) * limit)) {
      throw new AppError(400, 'Số trang vượt quá phạm vi cho phép.');
    }
    const result = await vehicleService.getVehicleReviews(req.params.id, page, limit);
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
    const defaultMonth = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 7);
    const month = readQueryString(req.query.month, 'Tháng') ?? defaultMonth;
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
    if (Object.prototype.hasOwnProperty.call(req.body, 'licensePlate')) {
      throw new AppError(400, 'Biển số xe là duy nhất và không được thay đổi sau khi tạo.');
    }
    const data = updateVehicleSchema.parse(req.body);
    if (Object.keys(data).length === 0) throw new AppError(400, 'Chưa có thông tin cần cập nhật.');

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
      if (data.branchId && data.branchId !== vehicleBranch) {
        throw new AppError(403, 'Vui lòng sử dụng yêu cầu điều chuyển để đổi chi nhánh của xe.');
      }
    }

    const vehicle = await vehicleService.updateVehicle(req.params.id, data, req.user);
    res.json({
      success: true,
      message: 'Cập nhật thông tin phương tiện thành công.',
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
};

export const getManagedVehicles = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw new AppError(401, 'Vui lòng đăng nhập.');
    const branchId = req.user.roles === 'SystemAdmin'
      ? readQueryString(req.query.branchId, 'Chi nhánh')
      : req.user.branchId?.toString();
    if (req.user.roles !== 'SystemAdmin' && !branchId) throw new AppError(403, 'Tài khoản chưa được phân công chi nhánh.');
    const result = await vehicleService.getAllVehicles({ branchId, q: readQueryString(req.query.q, 'Từ khóa') });
    res.json({ success: true, data: result.vehicles });
  } catch (error) { next(error); }
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

    const vehicle = await vehicleService.deleteVehicle(req.params.id, req.user);
    res.json({
      success: true,
      message: 'Đã xóa phương tiện khỏi danh sách khai thác.',
      data: vehicle,
    });
  } catch (error) {
    next(error);
  }
};
