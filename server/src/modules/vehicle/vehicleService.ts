import mongoose from 'mongoose';
import { Vehicle, IVehicle } from '../../models/Vehicle';
import { Category, ICategory } from '../../models/Category';
import { Booking } from '../../models/Booking';
import { Feedback } from '../../models/Feedback';
import { AppError } from '../../core/errorHandler';

export interface VehicleFilterOptions {
  branchId?: string;
  category?: string;
  status?: string;
  q?: string;
  fuelType?: string;
  transmissionType?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'price_asc' | 'price_desc' | 'rating_asc' | 'rating_desc';
}

export const getAllVehicles = async (options: VehicleFilterOptions) => {
  const filter: Record<string, unknown> = { isDeleted: false };

  if (options.branchId) {
    filter.branchId = options.branchId;
  }

  if (options.category) {
    if (mongoose.Types.ObjectId.isValid(options.category)) {
      filter.category = options.category;
    } else {
      // Find category by slug
      const cat = await Category.findOne({ slug: options.category.toLowerCase() });
      if (cat) {
        filter.category = cat._id;
      }
    }
  }

  if (options.status) {
    filter.status = options.status;
  }

  if (options.fuelType) {
    filter.fuelType = options.fuelType;
  }

  if (options.transmissionType) {
    filter.transmissionType = options.transmissionType;
  }

  if (options.brand?.trim()) {
    const escapedBrand = options.brand.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.brand = new RegExp(escapedBrand, 'i');
  }

  if (options.minPrice !== undefined || options.maxPrice !== undefined) {
    const priceRange: Record<string, number> = {};
    if (options.minPrice !== undefined) priceRange.$gte = options.minPrice;
    if (options.maxPrice !== undefined) priceRange.$lte = options.maxPrice;
    filter.dailyPrice = priceRange;
  }

  const searchQuery = options.q?.trim();

  const sort: Record<string, 1 | -1> = {};
  if (options.sort === 'price_asc') sort.dailyPrice = 1;
  else if (options.sort === 'price_desc') sort.dailyPrice = -1;
  else sort.dailyPrice = 1;

  const fetchVehicles = (vehicleFilter: Record<string, unknown>) =>
    Vehicle.find(vehicleFilter)
      .populate('branchId', 'name code address phone hours_open hours_close')
      .populate('category', 'name slug description')
      .sort(sort);

  const partialMatchFilter = (): Record<string, unknown> => {
    const escapedQuery = (searchQuery || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchPattern = new RegExp(escapedQuery, 'i');
    return {
      ...filter,
      $or: [
        { vehicleModel: searchPattern },
        { brand: searchPattern },
        { licensePlate: searchPattern },
      ],
    };
  };

  let vehicles: Awaited<ReturnType<typeof fetchVehicles>>;
  if (searchQuery && searchQuery.length > 2) {
    // Use MongoDB's text index for normal searches. If no token matches,
    // fall back to partial matching so prefixes such as "Yam" still work.
    vehicles = await fetchVehicles({ ...filter, $text: { $search: searchQuery } });
    if (vehicles.length === 0) vehicles = await fetchVehicles(partialMatchFilter());
  } else if (searchQuery) {
    // MongoDB text search does not match one- or two-character prefixes.
    vehicles = await fetchVehicles(partialMatchFilter());
  } else {
    vehicles = await fetchVehicles(filter);
  }

  const vehicleIds = vehicles.map((vehicle) => vehicle._id);
  const ratingRows = vehicleIds.length
    ? await Feedback.aggregate<{ _id: mongoose.Types.ObjectId; averageRating: number; reviewCount: number }>([
        { $match: { vehicleId: { $in: vehicleIds }, isPublic: true, isBlocked: false } },
        {
          $group: {
            _id: '$vehicleId',
            averageRating: { $avg: '$rating' },
            reviewCount: { $sum: 1 },
          },
        },
      ])
    : [];
  const ratings = new Map(
    ratingRows.map((row) => [row._id.toString(), { averageRating: row.averageRating, reviewCount: row.reviewCount }])
  );

  const results = vehicles.map((vehicle) => {
    const rating = ratings.get(vehicle._id.toString());
    return {
      ...vehicle.toObject(),
      ratingAverage: rating?.averageRating ?? 0,
      reviewCount: rating?.reviewCount ?? 0,
    };
  });

  if (options.sort === 'rating_asc' || options.sort === 'rating_desc') {
    const direction = options.sort === 'rating_asc' ? 1 : -1;
    results.sort((a, b) => direction * (a.ratingAverage - b.ratingAverage) || a.dailyPrice - b.dailyPrice);
  }

  return results;
};

export const getVehicleRatingSummary = async (vehicleId: string) => {
  const [rating] = await Feedback.aggregate<{ averageRating: number; reviewCount: number }>([
    { $match: { vehicleId: new mongoose.Types.ObjectId(vehicleId), isPublic: true, isBlocked: false } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  return { ratingAverage: rating?.averageRating ?? 0, reviewCount: rating?.reviewCount ?? 0 };
};

export const getVehicleReviews = async (vehicleId: string, page: number, limit: number) => {
  if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
    throw new AppError(400, 'Mã phương tiện không hợp lệ.');
  }

  const vehicleExists = await Vehicle.exists({ _id: vehicleId, isDeleted: false });
  if (!vehicleExists) throw new AppError(404, 'Không tìm thấy phương tiện.');

  const filter = { vehicleId, isPublic: true, isBlocked: false };
  const [reviews, total] = await Promise.all([
    Feedback.find(filter)
      .select('rating comment imageUrls response createdAt userId')
      .populate('userId', 'firstName avatarUrl')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Feedback.countDocuments(filter),
  ]);

  return { reviews, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const getVehicleAvailability = async (vehicleId: string, month: string) => {
  if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
    throw new AppError(400, 'Mã phương tiện không hợp lệ.');
  }

  const vehicleExists = await Vehicle.exists({ _id: vehicleId, isDeleted: false });
  if (!vehicleExists) throw new AppError(404, 'Không tìm thấy phương tiện.');

  const [year, monthNumber] = month.split('-').map(Number);
  const monthStart = new Date(Date.UTC(year, monthNumber - 1, 1));
  const monthEnd = new Date(Date.UTC(year, monthNumber, 1));
  const bookings = await Booking.find({
    vehicleId,
    status: { $in: ['Pending', 'Approved', 'Confirmed', 'Ongoing'] },
    pickupDateTime: { $lt: monthEnd },
    returnDateTime: { $gte: monthStart },
  })
    .select('pickupDateTime returnDateTime')
    .lean();

  const blockedDates = new Set<string>();
  for (const booking of bookings) {
    const firstDay = new Date(Math.max(booking.pickupDateTime.getTime(), monthStart.getTime()));
    const lastDay = new Date(Math.min(booking.returnDateTime.getTime(), monthEnd.getTime() - 1));
    const cursor = new Date(Date.UTC(firstDay.getUTCFullYear(), firstDay.getUTCMonth(), firstDay.getUTCDate()));
    const last = Date.UTC(lastDay.getUTCFullYear(), lastDay.getUTCMonth(), lastDay.getUTCDate());
    while (cursor.getTime() <= last) {
      blockedDates.add(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  return { month, blockedDates: [...blockedDates].sort() };
};

export const getVehicleById = async (id: string): Promise<IVehicle> => {
  const vehicle = await Vehicle.findOne({ _id: id, isDeleted: false })
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
  odometer?: number;
  images?: string[];
}): Promise<IVehicle> => {
  const cleanPlate = data.licensePlate.trim().toUpperCase();
  const existing = await Vehicle.findOne({ licensePlate: cleanPlate });
  if (existing) {
    throw new AppError(409, `Biển số xe "${cleanPlate}" đã tồn tại trong hệ thống.`);
  }

  return Vehicle.create({
    ...data,
    licensePlate: cleanPlate,
    status: 'Available',
    requiresMaintenance: false,
    isDeleted: false,
    odometer: data.odometer || 0,
    images: data.images || [],
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
    requiresMaintenance: boolean;
    images: string[];
    odometer: number;
  }>
): Promise<IVehicle> => {
  const vehicle = await Vehicle.findOne({ _id: id, isDeleted: false });
  if (!vehicle) {
    throw new AppError(404, 'Không tìm thấy phương tiện để cập nhật.');
  }

  Object.assign(vehicle, data);
  await vehicle.save();
  return vehicle;
};

export const deleteVehicle = async (id: string): Promise<IVehicle> => {
  const vehicle = await Vehicle.findOne({ _id: id, isDeleted: false });
  if (!vehicle) {
    throw new AppError(404, 'Không tìm thấy phương tiện.');
  }

  if (vehicle.status === 'Rented') {
    throw new AppError(400, 'Không thể xóa xe khi xe đang trong trạng thái cho thuê.');
  }

  vehicle.isDeleted = true;
  await vehicle.save();
  return vehicle;
};
