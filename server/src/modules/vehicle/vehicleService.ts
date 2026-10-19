import mongoose from 'mongoose';
import { Vehicle, IVehicle } from '../../models/Vehicle';
import { Booking } from '../../models/Booking';
import { Category, ICategory } from '../../models/Category';
import { MaintenanceLog } from '../../models/MaintenanceLog';
import { AppError } from '../../core/errorHandler';
import { assertBranchAccess } from '../../core/permissions';

export interface VehicleFilterOptions {
  branchId?: string;
  category?: string;
  status?: string;
  q?: string;
  fuelType?: string;
  transmissionType?: string;
  sortPrice?: 'asc' | 'desc';
}

const syncVehicleAvailability = async () => {
  try {
    const activeBookings = await Booking.find({
      status: { $in: ['Approved', 'Confirmed', 'Ongoing'] },
    }).select('vehicleId');
    const lockedVehicleIds = activeBookings.map((b) => b.vehicleId);

    if (lockedVehicleIds.length > 0) {
      await Vehicle.updateMany(
        { _id: { $in: lockedVehicleIds }, status: 'Available' },
        { $set: { status: 'Rented' } }
      );
      await Vehicle.updateMany(
        { _id: { $nin: lockedVehicleIds }, status: 'Rented' },
        { $set: { status: 'Available' } }
      );
    } else {
      await Vehicle.updateMany(
        { status: 'Rented' },
        { $set: { status: 'Available' } }
      );
    }
  } catch {
    // Ignore sync errors so read queries never fail
  }
};

export const getAllVehicles = async (options: VehicleFilterOptions) => {
  await syncVehicleAvailability();

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

  if (options.q && options.q.trim()) {
    const searchRegex = new RegExp(options.q.trim(), 'i');
    filter.$or = [
      { vehicleModel: searchRegex },
      { brand: searchRegex },
      { licensePlate: searchRegex },
    ];
  }

  const sort: Record<string, 1 | -1> = {};
  if (options.sortPrice === 'asc') sort.dailyPrice = 1;
  else if (options.sortPrice === 'desc') sort.dailyPrice = -1;
  else sort.dailyPrice = 1;

  const vehicles = await Vehicle.find(filter)
    .populate('branchId', 'name code address phone hours_open hours_close')
    .populate('category', 'name slug description')
    .sort(sort);

  return vehicles;
};

export const getVehicleById = async (id: string): Promise<IVehicle> => {
  await syncVehicleAvailability();

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

export const updateVehicleStatus = async (
  id: string,
  data: {
    status: 'Available' | 'Rented' | 'Maintenance';
    reason?: string;
    maintenanceType?: 'Routine' | 'Repair' | 'Inspection';
    cost?: number;
    odometer?: number;
    requiresMaintenance?: boolean;
  },
  user?: {
    _id?: string | mongoose.Types.ObjectId;
    roles: string;
    fullName?: string;
    email?: string;
    branchId?: string | mongoose.Types.ObjectId;
  }
): Promise<IVehicle> => {
  const vehicle = await Vehicle.findOne({ _id: id, isDeleted: false });
  if (!vehicle) {
    throw new AppError(404, 'Không tìm thấy phương tiện.');
  }

  // Branch access check for Staff and BranchManager
  if (user && user.roles !== 'SystemAdmin') {
    assertBranchAccess(user as any, vehicle.branchId);
  }

  // Check ongoing booking if vehicle is being toggled away from Rented
  if (vehicle.status === 'Rented' && data.status !== 'Rented') {
    const ongoingBooking = await Booking.findOne({
      vehicleId: vehicle._id,
      status: 'Ongoing',
    });
    if (ongoingBooking) {
      throw new AppError(
        400,
        `Phương tiện đang trong chuyến thuê (${ongoingBooking.bookingCode}). Không thể chuyển trạng thái thủ công khi chưa hoàn tất Trả xe.`
      );
    }
  }

  if (data.odometer !== undefined && data.odometer >= (vehicle.odometer || 0)) {
    vehicle.odometer = data.odometer;
  }

  vehicle.status = data.status;

  if (data.status === 'Maintenance') {
    vehicle.requiresMaintenance = true;
    await MaintenanceLog.create({
      vehicleId: vehicle._id,
      branchId: vehicle.branchId,
      maintenanceType: data.maintenanceType || 'Repair',
      description: data.reason || 'Bảo trì kỹ thuật định kỳ / khắc phục sự cố',
      cost: data.cost || 0,
      odometerAtMaintenance: data.odometer ?? vehicle.odometer ?? 0,
      status: 'InProgress',
      performedBy: user?.fullName || user?.email || 'Staff',
      startDate: new Date(),
    });
  } else if (data.status === 'Available') {
    vehicle.requiresMaintenance = false;
    await MaintenanceLog.updateMany(
      { vehicleId: vehicle._id, status: { $in: ['InProgress', 'Scheduled'] } },
      { $set: { status: 'Completed', endDate: new Date() } }
    );
  }

  await vehicle.save();
  return vehicle;
};

