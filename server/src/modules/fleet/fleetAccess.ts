import mongoose, { FilterQuery } from 'mongoose';
import { AppError } from '../../core/errorHandler';
import { assertBranchAccess } from '../../core/permissions';
import { Branch } from '../../models/Branch';
import { Booking } from '../../models/Booking';
import { IUser } from '../../models/User';
import { IVehicle } from '../../models/Vehicle';
import { MaintenanceLog } from '../../models/MaintenanceLog';

export const objectId = (value: string, label = 'Mã định danh'): mongoose.Types.ObjectId => {
  if (!/^[a-f\d]{24}$/i.test(value)) throw new AppError(400, `${label} không hợp lệ.`);
  return new mongoose.Types.ObjectId(value);
};

export const assertFleetRole = (user: IUser, managerOnly = false): void => {
  const allowed = managerOnly ? ['SystemAdmin', 'BranchManager'] : ['SystemAdmin', 'BranchManager', 'Staff'];
  if (!allowed.includes(user.roles)) throw new AppError(403, 'Bạn không có quyền quản lý vận hành xe.');
};

export const branchScope = (user: IUser, requestedBranch?: string): mongoose.Types.ObjectId | undefined => {
  assertFleetRole(user);
  if (requestedBranch) {
    const branch = objectId(requestedBranch, 'Mã chi nhánh');
    assertBranchAccess(user, branch);
    return branch;
  }
  if (user.roles === 'SystemAdmin') return undefined;
  if (!user.branchId) throw new AppError(403, 'Tài khoản chưa được phân bổ chi nhánh công tác.');
  return objectId(user.branchId.toString(), 'Chi nhánh công tác');
};

export const assertActiveBranch = async (branchId: mongoose.Types.ObjectId): Promise<void> => {
  if (!await Branch.exists({ _id: branchId, isActive: true })) {
    throw new AppError(409, 'Chi nhánh không tồn tại hoặc đã ngừng hoạt động.');
  }
};

export const assertNoBooking = async (vehicleId: mongoose.Types.ObjectId): Promise<void> => {
  if (await Booking.exists({ vehicleId, status: { $in: ['Pending', 'Approved', 'Confirmed', 'Ongoing'] } })) {
    throw new AppError(409, 'Xe còn đơn đặt đang hoạt động hoặc sắp tới. Vui lòng xử lý đơn trước khi điều chuyển hoặc bảo trì.');
  }
};

export const assertMovableVehicle = async (vehicle: IVehicle): Promise<void> => {
  if (vehicle.isDeleted || vehicle.status !== 'Available' || vehicle.requiresMaintenance) {
    throw new AppError(409, 'Chỉ có thể điều chuyển xe sẵn sàng và không có cảnh báo bảo trì.');
  }
  await assertNoBooking(vehicle._id as mongoose.Types.ObjectId);
  if (await MaintenanceLog.exists({ vehicleId: vehicle._id, status: { $in: ['Scheduled', 'InProgress'] } })) {
    throw new AppError(409, 'Xe còn phiếu bảo trì chưa hoàn tất.');
  }
};

export const pagination = (page = 1, limit = 12) => {
  if (!Number.isSafeInteger(page) || !Number.isSafeInteger(limit) || page < 1 || limit < 1 || limit > 100 || !Number.isSafeInteger((page - 1) * limit)) {
    throw new AppError(400, 'Trang và số kết quả không hợp lệ (tối đa 100 kết quả mỗi trang).');
  }
  return { page, limit, skip: (page - 1) * limit };
};

export const scopedVehicleFilter = (user: IUser, branchId?: string): FilterQuery<IVehicle> => {
  const scope = branchScope(user, branchId);
  return { isDeleted: false, ...(scope ? { branchId: scope } : {}) };
};
