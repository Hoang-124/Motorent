import mongoose, { FilterQuery } from 'mongoose';
import { AppError } from '../../core/errorHandler';
import { assertBranchAccess } from '../../core/permissions';
import { IUser } from '../../models/User';
import { Vehicle } from '../../models/Vehicle';
import { VehicleTransfer } from '../../models/VehicleTransfer';
import { IMaintenanceLog, MaintenanceLog, MaintenanceStatus, MaintenanceType } from '../../models/MaintenanceLog';
import { withResourceLock as acquireVehicleLock } from '../../core/resourceLock';
import { ODOMETER_MAINTENANCE_INTERVAL } from '../../core/jobs/odometerAlertJob';
import { assertActiveBranch, assertFleetRole, assertNoBooking, branchScope, objectId, pagination, scopedVehicleFilter } from './fleetAccess';

export interface MaintenanceInput {
  vehicleId: string;
  maintenanceType: MaintenanceType;
  description: string;
  performedBy: string;
  cost: number;
  scheduledDate?: Date;
}
export interface MaintenanceListOptions { page?: number; limit?: number; branchId?: string; status?: MaintenanceStatus; vehicleId?: string }

const populatedLog = (id: mongoose.Types.ObjectId) => MaintenanceLog.findById(id)
  .populate('vehicleId', 'vehicleModel brand licensePlate status odometer requiresMaintenance branchId')
  .populate('branchId', 'name code').populate('createdBy', 'firstName lastName username');

export const scheduleMaintenance = async (user: IUser, input: MaintenanceInput) => {
  assertFleetRole(user);
  const vehicleId = objectId(input.vehicleId, 'Mã xe');
  if (input.scheduledDate && input.scheduledDate.getTime() < Date.now() - 60000) {
    throw new AppError(400, 'Thời gian dự kiến không được ở trong quá khứ.');
  }
  return acquireVehicleLock(vehicleId.toString(), async () => {
    const vehicle = await Vehicle.findOne({ _id: vehicleId, isDeleted: false });
    if (!vehicle) throw new AppError(404, 'Không tìm thấy xe.');
    assertBranchAccess(user, vehicle.branchId);
    await assertActiveBranch(vehicle.branchId);
    if (vehicle.status !== 'Available') throw new AppError(409, 'Chỉ có thể lập phiếu cho xe đang sẵn sàng. Xe đang thuê, điều chuyển hoặc bảo trì không thể lập thêm phiếu.');
    await assertNoBooking(vehicleId);
    if (await MaintenanceLog.exists({ vehicleId, status: { $in: ['Scheduled', 'InProgress'] } })) {
      throw new AppError(409, 'Xe đã có phiếu bảo trì chưa hoàn tất.');
    }
    if (await VehicleTransfer.exists({ vehicleId, status: { $in: ['Pending', 'InTransit'] } })) {
      throw new AppError(409, 'Xe đang có yêu cầu điều chuyển. Vui lòng xử lý yêu cầu trước khi bảo trì.');
    }
    const reserved = await Vehicle.updateOne({ _id: vehicleId, branchId: vehicle.branchId, isDeleted: false, status: 'Available' },
      { $set: { status: 'Maintenance' } });
    if (reserved.modifiedCount !== 1) throw new AppError(409, 'Trạng thái xe vừa thay đổi. Vui lòng tải lại.');
    try {
      const log = await MaintenanceLog.create({ ...input, vehicleId, branchId: vehicle.branchId,
        createdBy: user._id, status: 'Scheduled', odometerAtMaintenance: vehicle.odometer });
      return populatedLog(log._id as mongoose.Types.ObjectId);
    } catch (error) {
      await Vehicle.updateOne({ _id: vehicleId, branchId: vehicle.branchId, status: 'Maintenance' }, { $set: { status: 'Available' } });
      throw error;
    }
  });
};

const accessibleLog = async (id: string, user: IUser, managerOnly = false) => {
  assertFleetRole(user, managerOnly);
  const log = await MaintenanceLog.findById(objectId(id, 'Mã phiếu bảo trì'));
  if (!log) throw new AppError(404, 'Không tìm thấy phiếu bảo trì.');
  assertBranchAccess(user, log.branchId);
  return log;
};

export const startMaintenance = async (id: string, user: IUser) => {
  const initial = await accessibleLog(id, user);
  return acquireVehicleLock(initial.vehicleId.toString(), async () => {
    const log = await accessibleLog(id, user);
    if (log.status !== 'Scheduled') throw new AppError(409, 'Chỉ phiếu đã lên lịch mới có thể bắt đầu.');
    if (log.scheduledDate && log.scheduledDate.getTime() > Date.now()) {
      throw new AppError(409, 'Chưa đến thời gian bảo trì dự kiến.');
    }
    const vehicle = await Vehicle.findOne({ _id: log.vehicleId, isDeleted: false });
    if (!vehicle || !vehicle.branchId.equals(log.branchId) || vehicle.status !== 'Maintenance') {
      throw new AppError(409, 'Xe không còn ở chi nhánh hoặc trạng thái bảo trì của phiếu.');
    }
    await assertActiveBranch(log.branchId);
    await assertNoBooking(log.vehicleId);
    const updated = await MaintenanceLog.updateOne({ _id: log._id, status: 'Scheduled' },
      { $set: { status: 'InProgress', startDate: new Date() } });
    if (updated.modifiedCount !== 1) throw new AppError(409, 'Phiếu đã được cập nhật. Vui lòng tải lại.');
    return populatedLog(log._id as mongoose.Types.ObjectId);
  });
};

export const completeMaintenance = async (id: string, user: IUser, input: { cost: number; performedBy?: string; odometer?: number }) => {
  const initial = await accessibleLog(id, user, true);
  return acquireVehicleLock(initial.vehicleId.toString(), async () => {
    const log = await accessibleLog(id, user, true);
    if (log.status !== 'InProgress') throw new AppError(409, 'Chỉ phiếu đang thực hiện mới có thể hoàn tất.');
    const vehicle = await Vehicle.findOne({ _id: log.vehicleId, isDeleted: false });
    if (!vehicle || !vehicle.branchId.equals(log.branchId) || vehicle.status !== 'Maintenance') {
      throw new AppError(409, 'Xe không còn ở chi nhánh hoặc trạng thái bảo trì của phiếu.');
    }
    await assertActiveBranch(log.branchId);
    await assertNoBooking(log.vehicleId);
    const odometer = input.odometer ?? vehicle.odometer;
    if (odometer < vehicle.odometer) throw new AppError(400, 'ODO hoàn tất không được nhỏ hơn ODO hiện tại của xe.');
    const previousBucket = vehicle.lastMaintenanceBucket ?? 0;
    const released = await Vehicle.updateOne({ _id: vehicle._id, branchId: log.branchId, status: 'Maintenance', odometer: vehicle.odometer },
      { $set: { status: 'Available', odometer, requiresMaintenance: false,
        lastMaintenanceBucket: Math.floor(odometer / ODOMETER_MAINTENANCE_INTERVAL) } });
    if (released.modifiedCount !== 1) throw new AppError(409, 'Trạng thái xe vừa thay đổi. Vui lòng tải lại.');
    try {
      const completed = await MaintenanceLog.updateOne({ _id: log._id, status: 'InProgress' },
        { $set: { status: 'Completed', cost: input.cost, performedBy: input.performedBy ?? log.performedBy,
          odometerAtMaintenance: odometer, endDate: new Date() } });
      if (completed.modifiedCount !== 1) throw new AppError(409, 'Phiếu đã được cập nhật. Vui lòng tải lại.');
    } catch (error) {
      await Vehicle.updateOne({ _id: vehicle._id, branchId: log.branchId, status: 'Available', odometer },
        { $set: { status: 'Maintenance', odometer: vehicle.odometer, requiresMaintenance: vehicle.requiresMaintenance,
          lastMaintenanceBucket: previousBucket } });
      throw error;
    }
    return populatedLog(log._id as mongoose.Types.ObjectId);
  });
};

export const listMaintenance = async (user: IUser, options: MaintenanceListOptions) => {
  assertFleetRole(user);
  const scope = branchScope(user, options.branchId);
  const filter: FilterQuery<IMaintenanceLog> = { ...(scope ? { branchId: scope } : {}) };
  if (options.vehicleId) {
    const vehicle = await Vehicle.findOne({ _id: objectId(options.vehicleId, 'Mã xe'), isDeleted: false });
    if (!vehicle) throw new AppError(404, 'Không tìm thấy xe.');
    assertBranchAccess(user, vehicle.branchId);
    filter.vehicleId = vehicle._id;
  }
  const summaryFilter = { ...filter };
  if (options.status) filter.status = options.status;
  const { page, limit, skip } = pagination(options.page, options.limit);
  const [data, total, totals] = await Promise.all([
    MaintenanceLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate('vehicleId', 'vehicleModel brand licensePlate status odometer requiresMaintenance branchId')
      .populate('branchId', 'name code').populate('createdBy', 'firstName lastName username'),
    MaintenanceLog.countDocuments(filter),
    MaintenanceLog.aggregate<{ _id: MaintenanceStatus; count: number; cost: number }>([
      { $match: summaryFilter }, { $group: { _id: '$status', count: { $sum: 1 }, cost: { $sum: '$cost' } } },
    ]),
  ]);
  const completed = totals.find((row) => row._id === 'Completed');
  const pending = totals.filter((row) => row._id !== 'Completed');
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }, summary: {
    totalCost: completed?.cost ?? 0, completedCount: completed?.count ?? 0,
    pendingEstimatedCost: pending.reduce((sum, row) => sum + row.cost, 0),
    pendingCount: pending.reduce((sum, row) => sum + row.count, 0),
  } };
};

export const listOdometerAlerts = async (user: IUser, options: { page?: number; limit?: number; branchId?: string }) => {
  const filter = { ...scopedVehicleFilter(user, options.branchId), requiresMaintenance: true };
  const { page, limit, skip } = pagination(options.page, options.limit);
  const [data, total] = await Promise.all([
    Vehicle.find(filter).select('branchId vehicleModel brand licensePlate odometer status requiresMaintenance lastMaintenanceBucket')
      .sort({ odometer: -1 }).skip(skip).limit(limit).populate('branchId', 'name code'),
    Vehicle.countDocuments(filter),
  ]);
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    summary: { dueCount: total, intervalKm: ODOMETER_MAINTENANCE_INTERVAL } };
};
