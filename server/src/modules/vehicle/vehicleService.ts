import mongoose from 'mongoose';
import { Vehicle, IVehicle } from '../../models/Vehicle';
import { Category, ICategory } from '../../models/Category';
import { Booking } from '../../models/Booking';
import { Feedback } from '../../models/Feedback';
import { Branch } from '../../models/Branch';
import { MaintenanceLog } from '../../models/MaintenanceLog';
import { VehicleTransfer } from '../../models/VehicleTransfer';
import { withResourceLock as acquireVehicleLock } from '../../core/resourceLock';
import { IUser } from '../../models/User';
import { assertBranchAccess } from '../../core/permissions';
import { AppError } from '../../core/errorHandler';

export interface VehicleFilterOptions {
  branchId?: string;
  category?: string;
  status?: string;
  q?: string;
  fuelType?: string;
  transmissionType?: string;
  sortPrice?: 'asc' | 'desc';
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'price_asc' | 'price_desc' | 'rating_asc' | 'rating_desc';
  page?: number;
  limit?: number;
}

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseVehicleId = (id: string): mongoose.Types.ObjectId => {
  if (!/^[a-f\d]{24}$/i.test(id)) {
    throw new AppError(400, 'Mã phương tiện không hợp lệ.');
  }
  return new mongoose.Types.ObjectId(id);
};

interface CatalogVehicle {
  _id: mongoose.Types.ObjectId;
  dailyPrice: number;
  ratingAverage?: number;
  reviewCount?: number;
}

interface VehicleRatingSummary {
  _id: mongoose.Types.ObjectId;
  ratingAverage: number;
  reviewCount: number;
}

const addVehicleRatings = async (vehicles: CatalogVehicle[]): Promise<CatalogVehicle[]> => {
  if (vehicles.length === 0) return vehicles;
  // One indexed feedback query for the selected page, rather than a lookup for
  // every matching vehicle or one application query per card.
  const ratings = await Feedback.aggregate<VehicleRatingSummary>([
    {
      $match: {
        vehicleId: { $in: vehicles.map((vehicle) => vehicle._id) },
        isPublic: true,
        isBlocked: false,
      },
    },
    { $group: { _id: '$vehicleId', ratingAverage: { $avg: '$rating' }, reviewCount: { $sum: 1 } } },
  ]);
  const byVehicle = new Map(ratings.map((rating) => [rating._id.toString(), rating]));
  return vehicles.map((vehicle) => {
    const rating = byVehicle.get(vehicle._id.toString());
    return { ...vehicle, ratingAverage: rating?.ratingAverage ?? 0, reviewCount: rating?.reviewCount ?? 0 };
  });
};

export const getAllVehicles = async (options: VehicleFilterOptions) => {
  const filter: Record<string, unknown> = { isDeleted: false };

  if (options.branchId) {
    if (!/^[a-f\d]{24}$/i.test(options.branchId)) {
      throw new AppError(400, 'Mã chi nhánh không hợp lệ.');
    }
    filter.branchId = new mongoose.Types.ObjectId(options.branchId);
  }

  if (options.category) {
    if (/^[a-f\d]{24}$/i.test(options.category)) {
      filter.category = new mongoose.Types.ObjectId(options.category);
    } else {
      // Find category by slug
      const cat = await Category.findOne({ slug: options.category.toLowerCase() });
      // An unknown category must return no vehicles, rather than ignore the filter.
      filter.category = cat ? cat._id : { $in: [] };
    }
  }

  if (options.status) {
    filter.status = options.status;
    if (options.status === 'Available') filter.requiresMaintenance = { $ne: true };
  }

  if (options.fuelType) {
    filter.fuelType = options.fuelType;
  }

  if (options.transmissionType) {
    filter.transmissionType = options.transmissionType;
  }

  if (options.q && options.q.trim()) {
    // Keep literal substring matching, including one character. MongoDB $text
    // tokenizes words and cannot replace this public search contract.
    const searchRegex = new RegExp(escapeRegex(options.q.trim()), 'i');
    filter.$or = [
      { vehicleModel: searchRegex },
      { brand: searchRegex },
      { licensePlate: searchRegex },
    ];
  }

  if (options.brand?.trim()) {
    filter.brand = new RegExp(`^${escapeRegex(options.brand.trim())}$`, 'i');
  }

  if (options.minPrice !== undefined || options.maxPrice !== undefined) {
    const priceRange: Record<string, number> = {};
    if (options.minPrice !== undefined) priceRange.$gte = options.minPrice;
    if (options.maxPrice !== undefined) priceRange.$lte = options.maxPrice;
    filter.dailyPrice = priceRange;
  }

  const sortOption = options.sort ?? (options.sortPrice === 'desc' ? 'price_desc' : 'price_asc');
  const sort: Record<string, 1 | -1> = sortOption.startsWith('rating_')
    ? { ratingAverage: sortOption === 'rating_asc' ? 1 : -1, dailyPrice: 1, _id: 1 }
    : { dailyPrice: sortOption === 'price_desc' ? -1 : 1, _id: 1 };
  const ratingStages: mongoose.PipelineStage.FacetPipelineStage[] = [
    {
      $lookup: {
        from: Feedback.collection.name,
        let: { vehicleId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$vehicleId', '$$vehicleId'] },
              isPublic: true,
              isBlocked: false,
            },
          },
          { $group: { _id: null, ratingAverage: { $avg: '$rating' }, reviewCount: { $sum: 1 } } },
        ],
        as: 'ratingSummary',
      },
    },
    {
      $set: {
        ratingAverage: { $ifNull: [{ $arrayElemAt: ['$ratingSummary.ratingAverage', 0] }, 0] },
        reviewCount: { $ifNull: [{ $arrayElemAt: ['$ratingSummary.reviewCount', 0] }, 0] },
      },
    },
    { $unset: 'ratingSummary' },
  ];

  // Existing internal callers receive every vehicle. Catalog callers opt in to pagination.
  const paginated = options.page !== undefined || options.limit !== undefined;
  const page = options.page ?? 1;
  const limit = options.limit ?? 12;
  const pageStages: mongoose.PipelineStage.FacetPipelineStage[] = paginated
    ? [{ $skip: (page - 1) * limit }, { $limit: limit }]
    : [];
  let rows: CatalogVehicle[];
  let total: number;
  if (sortOption.startsWith('rating_')) {
    // Ratings must be calculated before pagination to preserve global ordering.
    // A top-level sort may spill to disk; an unpaged result no longer builds one
    // large facet document subject to the facet/document size limit.
    const [ratedRows, count] = await Promise.all([
      Vehicle.aggregate<CatalogVehicle>([
        { $match: filter },
        ...ratingStages,
        { $sort: sort },
        ...pageStages,
      ]).allowDiskUse(true),
      paginated ? Vehicle.countDocuments(filter) : Promise.resolve(undefined),
    ]);
    rows = ratedRows;
    total = count ?? rows.length;
  } else {
    // Keep sorting outside $facet so MongoDB can use the catalog price index.
    // Hydrate and rate only the page selected by the database.
    const query = Vehicle.find(filter).sort(sort);
    if (paginated) query.skip((page - 1) * limit).limit(limit);
    const [pageRows, count] = await Promise.all([
      query.lean<CatalogVehicle[]>(),
      paginated ? Vehicle.countDocuments(filter) : Promise.resolve(undefined),
    ]);
    rows = await addVehicleRatings(pageRows);
    total = count ?? rows.length;
  }

  const vehicles = await Vehicle.populate(rows, [
    { path: 'branchId', select: 'name code address phone hours_open hours_close' },
    { path: 'category', select: 'name slug description' },
  ]);
  const responseLimit = paginated ? limit : Math.max(total, 1);
  return {
    vehicles,
    pagination: { page, limit: responseLimit, total, pages: Math.ceil(total / responseLimit) },
  };
};

export const getVehicleRatingSummary = async (vehicleId: string) => {
  const [rating] = await Feedback.aggregate<{ ratingAverage: number; reviewCount: number }>([
    { $match: { vehicleId: parseVehicleId(vehicleId), isPublic: true, isBlocked: false } },
    { $group: { _id: null, ratingAverage: { $avg: '$rating' }, reviewCount: { $sum: 1 } } },
  ]);
  return { ratingAverage: rating?.ratingAverage ?? 0, reviewCount: rating?.reviewCount ?? 0 };
};

export const getVehicleReviews = async (vehicleId: string, page: number, limit: number) => {
  const id = parseVehicleId(vehicleId);
  if (!(await Vehicle.exists({ _id: id, isDeleted: false }))) {
    throw new AppError(404, 'Không tìm thấy phương tiện.');
  }
  const filter = { vehicleId: id, isPublic: true, isBlocked: false };
  const [reviews, total] = await Promise.all([
    Feedback.find(filter)
      .select('rating comment imageUrls response createdAt userId')
      .populate('userId', 'firstName avatarUrl')
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Feedback.countDocuments(filter),
  ]);
  return { reviews, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const getAvailabilityMonthRange = (month: string) => {
  if (!/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new AppError(400, 'Tháng cần có định dạng YYYY-MM.');
  }
  const [year, monthNumber] = month.split('-').map(Number);
  return {
    monthStart: new Date(Date.UTC(year, monthNumber - 1, 1) - VIETNAM_OFFSET_MS),
    monthEnd: new Date(Date.UTC(year, monthNumber, 1) - VIETNAM_OFFSET_MS),
  };
};

export const getBlockedDatesForMonth = (
  month: string,
  bookings: { pickupDateTime: Date; returnDateTime: Date }[]
): string[] => {
  const { monthStart, monthEnd } = getAvailabilityMonthRange(month);
  const blockedDates = new Set<string>();
  for (const booking of bookings) {
    const start = Math.max(booking.pickupDateTime.getTime(), monthStart.getTime());
    const end = Math.min(booking.returnDateTime.getTime(), monthEnd.getTime());
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) continue;
    // Shift to Vietnam wall time. A return at midnight does not occupy the next day.
    const firstDay = Math.floor((start + VIETNAM_OFFSET_MS) / DAY_MS) * DAY_MS;
    const lastDay = Math.floor((end - 1 + VIETNAM_OFFSET_MS) / DAY_MS) * DAY_MS;
    for (let day = firstDay; day <= lastDay; day += DAY_MS) {
      blockedDates.add(new Date(day).toISOString().slice(0, 10));
    }
  }
  return [...blockedDates].sort();
};

export const getVehicleAvailability = async (vehicleId: string, month: string) => {
  const id = parseVehicleId(vehicleId);
  const { monthStart, monthEnd } = getAvailabilityMonthRange(month);
  if (!(await Vehicle.exists({ _id: id, isDeleted: false }))) {
    throw new AppError(404, 'Không tìm thấy phương tiện.');
  }
  const bookings = await Booking.find({
    vehicleId: id,
    status: { $in: ['Pending', 'Approved', 'Confirmed', 'Ongoing'] },
    pickupDateTime: { $lt: monthEnd },
    returnDateTime: { $gt: monthStart },
  })
    .select('pickupDateTime returnDateTime')
    .lean();
  return { month, blockedDates: getBlockedDatesForMonth(month, bookings) };
};

export const getVehicleById = async (id: string): Promise<IVehicle> => {
  const vehicle = await Vehicle.findOne({ _id: parseVehicleId(id), isDeleted: false })
    .populate('branchId', 'name code address phone hours_open hours_close')
    .populate('category', 'name slug description');

  if (!vehicle) {
    throw new AppError(404, 'Không tìm thấy phương tiện hoặc xe đã bị xóa.');
  }

  return vehicle;
};

export const getAllCategories = async (): Promise<ICategory[]> => {
  return Category.find().sort({ name: 1 });
};

export const createCategory = async (data: {
  name: string;
  slug: string;
  description?: string;
}): Promise<ICategory> => {
  const slug = data.slug.trim().toLowerCase();
  const existing = await Category.findOne({ slug });
  if (existing) {
    throw new AppError(409, `Danh mục với slug "${slug}" đã tồn tại.`);
  }

  return Category.create({
    name: data.name.trim(),
    slug,
    description: data.description?.trim(),
  });
};

export const createVehicle = async (data: {
  branchId: string;
  category: string;
  vehicleModel: string;
  brand: string;
  licensePlate: string;
  dailyPrice: number;
  hourlyPrice?: number;
  transmissionType?: 'Automatic' | 'Manual' | 'Semi-Auto';
  fuelType?: 'Gasoline' | 'Electric';
  yearManufactured?: number;
  color?: string;
  odometer?: number;
  images?: string[];
}): Promise<IVehicle> => {
  const cleanPlate = data.licensePlate.trim().toUpperCase().replace(/\s+/g, ' ');
  const canonicalPlate = cleanPlate.replace(/[\s.-]/g, '');
  return acquireVehicleLock(`plate:${canonicalPlate}`, async () => {
    const equivalentPlate = new RegExp(`^${canonicalPlate.split('').map(escapeRegex).join('[\\s.\\-]*')}$`, 'i');
    if (await Vehicle.exists({ licensePlate: equivalentPlate })) {
      throw new AppError(409, `Biển số xe "${cleanPlate}" đã tồn tại, kể cả xe đã ngừng khai thác.`);
    }
    return acquireVehicleLock(`category:${data.category}`, async () => {
    const [branch, category] = await Promise.all([
      Branch.exists({ _id: data.branchId, isActive: true }),
      Category.exists({ _id: data.category }),
    ]);
    if (!branch) throw new AppError(400, 'Chi nhánh không tồn tại hoặc đã ngừng hoạt động.');
    if (!category) throw new AppError(400, 'Danh mục xe không tồn tại.');
    return Vehicle.create({
      ...data,
      licensePlate: cleanPlate,
      status: 'Available',
      requiresMaintenance: (data.odometer ?? 0) >= 1500,
      lastMaintenanceBucket: 0,
      isDeleted: false,
      odometer: data.odometer ?? 0,
      images: data.images ?? [],
    });
    });
  });
};

export const updateVehicle = async (
  id: string,
  data: Partial<{
    branchId: string;
    category: string;
    vehicleModel: string;
    brand: string;
    dailyPrice: number;
    hourlyPrice: number;
    status: 'Available' | 'Rented' | 'Maintenance' | 'Transferring';
    transmissionType: 'Automatic' | 'Manual' | 'Semi-Auto';
    fuelType: 'Gasoline' | 'Electric';
    yearManufactured: number;
    color: string;
    requiresMaintenance: boolean;
    images: string[];
    odometer: number;
  }>,
  actor?: IUser
): Promise<IVehicle> => {
  parseVehicleId(id);
  if (Object.prototype.hasOwnProperty.call(data, 'licensePlate')) {
    throw new AppError(400, 'Biển số xe không được thay đổi sau khi tạo.');
  }
  return acquireVehicleLock(id, async () => {
    const vehicle = await Vehicle.findOne({ _id: id, isDeleted: false });
    if (!vehicle) throw new AppError(404, 'Không tìm thấy phương tiện để cập nhật.');
    if (actor) assertBranchAccess(actor, vehicle.branchId);
    if (data.branchId && data.branchId !== vehicle.branchId.toString()) {
      throw new AppError(409, 'Đổi chi nhánh phải thực hiện qua chức năng điều chuyển xe.');
    }
    return acquireVehicleLock(`category:${data.category ?? vehicle.category.toString()}`, async () => {
    if (data.category && !(await Category.exists({ _id: data.category }))) throw new AppError(400, 'Danh mục xe không tồn tại.');
    if (data.odometer !== undefined && data.odometer < vehicle.odometer) {
      throw new AppError(400, 'Chỉ số ODO mới không được nhỏ hơn chỉ số hiện tại.');
    }
    if (data.status && data.status !== vehicle.status) {
      if (!['Available', 'Maintenance'].includes(data.status)) {
        throw new AppError(400, 'Trạng thái đang thuê và điều chuyển được cập nhật bởi quy trình nghiệp vụ.');
      }
      const [booking, maintenance, transfer] = await Promise.all([
        Booking.exists({ vehicleId: id, status: { $in: ['Pending', 'Approved', 'Confirmed', 'Ongoing'] } }),
        MaintenanceLog.exists({ vehicleId: id, status: { $in: ['Scheduled', 'InProgress'] } }),
        VehicleTransfer.exists({ vehicleId: id, status: { $in: ['Pending', 'InTransit'] } }),
      ]);
      if (booking || maintenance || transfer || vehicle.status === 'Rented' || vehicle.status === 'Transferring') {
        throw new AppError(409, 'Xe đang có đơn thuê, phiếu bảo dưỡng hoặc yêu cầu điều chuyển. Hãy hoàn tất quy trình trước.');
      }
      if (data.status === 'Available' && vehicle.requiresMaintenance) {
        throw new AppError(409, 'Xe đang có cảnh báo ODO. Cần hoàn thành phiếu bảo dưỡng để mở lại cho thuê.');
      }
    }
    // The maintenance flag is derived from ODO and only cleared by completing maintenance.
    delete data.requiresMaintenance;
    Object.assign(vehicle, data);
    if (Math.floor(vehicle.odometer / 1500) > (vehicle.lastMaintenanceBucket ?? 0)) vehicle.requiresMaintenance = true;
    await vehicle.save();
    return vehicle;
    });
  });
};

export const deleteVehicle = async (id: string, actor?: IUser): Promise<IVehicle> => {
  parseVehicleId(id);
  return acquireVehicleLock(id, async () => {
    const vehicle = await Vehicle.findOne({ _id: id, isDeleted: false });
    if (!vehicle) throw new AppError(404, 'Không tìm thấy phương tiện.');
    if (actor) assertBranchAccess(actor, vehicle.branchId);
    const [booking, maintenance, transfer] = await Promise.all([
      Booking.exists({ vehicleId: id, status: { $in: ['Pending', 'Approved', 'Confirmed', 'Ongoing'] } }),
      MaintenanceLog.exists({ vehicleId: id, status: { $in: ['Scheduled', 'InProgress'] } }),
      VehicleTransfer.exists({ vehicleId: id, status: { $in: ['Pending', 'InTransit'] } }),
    ]);
    if (booking || maintenance || transfer || vehicle.status === 'Rented' || vehicle.status === 'Transferring') {
      throw new AppError(409, 'Không thể xóa xe có đơn thuê đang hoạt động, bảo dưỡng chưa xong hoặc yêu cầu điều chuyển.');
    }
    vehicle.isDeleted = true;
    await vehicle.save();
    return vehicle;
  });
};
