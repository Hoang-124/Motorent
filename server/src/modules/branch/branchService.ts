import { Branch, IBranch } from '../../models/Branch';
import { Vehicle } from '../../models/Vehicle';
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
}

export interface UpdateBranchInput {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  location_lat?: number;
  location_lng?: number;
  hours_open?: string;
  hours_close?: string;
  isActive?: boolean;
  description?: string;
  managerId?: string;
}

export const getAllBranches = async () => {
  const branches = await Branch.find({ isActive: true })
    .populate('managerId', 'firstName lastName username phoneNumber email')
    .sort({ createdAt: 1 });

  // Calculate real-time available vehicle count for each branch
  const branchCounts = await Vehicle.aggregate([
    { $match: { isDeleted: false, status: 'Available' } },
    { $group: { _id: '$branchId', count: { $sum: 1 } } },
  ]);

  const countMap = new Map<string, number>();
  for (const item of branchCounts) {
    countMap.set(item._id.toString(), item.count);
  }

  return branches.map((branch) => {
    const obj = branch.toObject();
    return {
      ...obj,
      availableVehiclesCount: countMap.get(branch._id.toString()) || 0,
    };
  });
};

export const getBranchById = async (id: string) => {
  const branch = await Branch.findById(id).populate('managerId', 'firstName lastName username phone');
  if (!branch) {
    throw new AppError(404, 'Không tìm thấy chi nhánh.');
  }
  return branch;
};

export const getNearbyBranches = async (lat?: number, lng?: number) => {
  const branches = await getAllBranches();
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

  const branch = await Branch.create({
    ...data,
    code: data.code.trim().toUpperCase(),
    isActive: true,
  });

  return branch;
};

export const updateBranch = async (id: string, data: UpdateBranchInput): Promise<IBranch> => {
  const branch = await Branch.findById(id);
  if (!branch) {
    throw new AppError(404, 'Không tìm thấy chi nhánh để cập nhật.');
  }

  Object.assign(branch, data);
  await branch.save();
  return branch;
};

export const deactivateBranch = async (id: string): Promise<IBranch> => {
  const branch = await Branch.findById(id);
  if (!branch) {
    throw new AppError(404, 'Không tìm thấy chi nhánh.');
  }

  branch.isActive = false;
  await branch.save();
  return branch;
};
