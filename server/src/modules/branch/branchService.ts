import { Branch, IBranch } from '../../models/Branch';
import { Vehicle } from '../../models/Vehicle';
import { Booking } from '../../models/Booking';
import { User } from '../../models/User';
import { AppError } from '../../core/errorHandler';

export interface CreateBranchInput {
  name: string;
  code: string;
  address: string;
  phone: string;
  email?: string;
  location_lat?: number;
  location_lng?: number;
  hours_open?: string;
  hours_close?: string;
  description?: string;
  managerId?: string;
}

export interface UpdateBranchInput {
  name?: string;
  code?: string;
  address?: string;
  phone?: string;
  email?: string;
  location_lat?: number;
  location_lng?: number;
  hours_open?: string;
  hours_close?: string;
  isActive?: boolean;
  description?: string;
  managerId?: string | null;
}

export const getAllBranches = async (includeInactive = false) => {
  const query = includeInactive ? {} : { isActive: true };
  const branches = await Branch.find(query)
    .populate('managerId', 'firstName lastName username phoneNumber email')
    .sort({ createdAt: 1 });

  // Calculate real-time available & total vehicle count for each branch
  const [availableCounts, totalCounts] = await Promise.all([
    Vehicle.aggregate([
      { $match: { isDeleted: false, status: 'Available' } },
      { $group: { _id: '$branchId', count: { $sum: 1 } } },
    ]),
    Vehicle.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$branchId', count: { $sum: 1 } } },
    ]),
  ]);

  const countMap = new Map<string, number>();
  for (const item of availableCounts) {
    if (item._id) countMap.set(item._id.toString(), item.count);
  }

  const totalMap = new Map<string, number>();
  for (const item of totalCounts) {
    if (item._id) totalMap.set(item._id.toString(), item.count);
  }

  return branches.map((branch) => {
    const obj = branch.toObject();
    return {
      ...obj,
      availableVehiclesCount: countMap.get(branch._id.toString()) || 0,
      totalVehiclesCount: totalMap.get(branch._id.toString()) || 0,
    };
  });
};

export const getBranchById = async (id: string) => {
  const branch = await Branch.findById(id).populate('managerId', 'firstName lastName username phone email');
  if (!branch) {
    throw new AppError(404, 'Không tìm thấy chi nhánh.');
  }
  return branch;
};

export const getNearbyBranches = async (lat?: number, lng?: number) => {
  const branches = await getAllBranches(false);
  if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
    return branches;
  }

  // Calculate approximate distance using Haversine formula
  const toRad = (val: number) => (val * Math.PI) / 180;
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  return branches
    .map((b) => {
      let distanceKm: number | null = null;
      if (b.location_lat !== undefined && b.location_lng !== undefined) {
        distanceKm = Math.round(calculateDistance(lat, lng, b.location_lat, b.location_lng) * 10) / 10;
      }
      return { ...b, distanceKm };
    })
    .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
};

export const createBranch = async (data: CreateBranchInput): Promise<IBranch> => {
  const existingCode = await Branch.findOne({ code: data.code.trim().toUpperCase() });
  if (existingCode) {
    throw new AppError(409, `Mã chi nhánh "${data.code}" đã tồn tại.`);
  }

  // Validate manager if provided
  if (data.managerId) {
    const manager = await User.findById(data.managerId);
    if (!manager) {
      throw new AppError(404, 'Không tìm thấy Quản lý được chỉ định.');
    }
  }

  const branch = await Branch.create({
    ...data,
    code: data.code.trim().toUpperCase(),
    isActive: true,
  });

  // Link manager to branch
  if (data.managerId) {
    await User.findByIdAndUpdate(data.managerId, { branchId: branch._id });
  }

  return branch;
};

export const updateBranch = async (id: string, data: UpdateBranchInput): Promise<IBranch> => {
  const branch = await Branch.findById(id);
  if (!branch) {
    throw new AppError(404, 'Không tìm thấy chi nhánh để cập nhật.');
  }

  if (data.code && data.code.trim().toUpperCase() !== branch.code) {
    const existingCode = await Branch.findOne({
      code: data.code.trim().toUpperCase(),
      _id: { $ne: id },
    });
    if (existingCode) {
      throw new AppError(409, `Mã chi nhánh "${data.code}" đã được sử dụng bởi chi nhánh khác.`);
    }
    data.code = data.code.trim().toUpperCase();
  }

  const oldManagerId = branch.managerId?.toString();

  // If reassigning manager
  if (data.managerId !== undefined) {
    if (data.managerId && data.managerId !== oldManagerId) {
      const newManager = await User.findById(data.managerId);
      if (!newManager) {
        throw new AppError(404, 'Không tìm thấy Quản lý được chỉ định.');
      }
      // Unlink previous manager if they were tied to this branch
      if (oldManagerId) {
        await User.findByIdAndUpdate(oldManagerId, { $unset: { branchId: 1 } });
      }
      // Link new manager
      await User.findByIdAndUpdate(data.managerId, { branchId: branch._id });
    } else if (data.managerId === null || data.managerId === '') {
      if (oldManagerId) {
        await User.findByIdAndUpdate(oldManagerId, { $unset: { branchId: 1 } });
      }
      data.managerId = undefined;
      branch.set('managerId', undefined);
    }
  }

  Object.assign(branch, data);
  await branch.save();
  return branch;
};

export const checkActiveBookings = async (branchId: string): Promise<number> => {
  return Booking.countDocuments({
    $or: [{ pickupBranchId: branchId }, { returnBranchId: branchId }],
    status: { $in: ['Pending', 'Approved', 'Confirmed', 'Ongoing'] },
  });
};

export const deactivateBranch = async (
  id: string
): Promise<{ branch: IBranch; activeBookingsCount: number; warning?: string }> => {
  const branch = await Branch.findById(id);
  if (!branch) {
    throw new AppError(404, 'Không tìm thấy chi nhánh.');
  }

  const activeBookingsCount = await checkActiveBookings(id);
  branch.isActive = false;
  await branch.save();

  let warning: string | undefined;
  if (activeBookingsCount > 0) {
    warning = `Cảnh báo: Chi nhánh này hiện có ${activeBookingsCount} đơn thuê xe đang hoạt động hoặc chờ nhận/trả xe!`;
  }

  return {
    branch,
    activeBookingsCount,
    warning,
  };
};

export const activateBranch = async (id: string): Promise<IBranch> => {
  const branch = await Branch.findById(id);
  if (!branch) {
    throw new AppError(404, 'Không tìm thấy chi nhánh.');
  }

  branch.isActive = true;
  await branch.save();
  return branch;
};
