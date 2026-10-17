import mongoose, { FilterQuery } from 'mongoose';
import { AppError } from '../../core/errorHandler';
import { assertBranchAccess } from '../../core/permissions';
import { IUser } from '../../models/User';
import { Vehicle } from '../../models/Vehicle';
import { IVehicleTransfer, VehicleTransfer, TransferStatus } from '../../models/VehicleTransfer';
import { withResourceLock as acquireVehicleLock } from '../../core/resourceLock';
import { assertActiveBranch, assertFleetRole, assertMovableVehicle, branchScope, objectId, pagination } from './fleetAccess';

export interface TransferInput { vehicleId: string; toBranchId: string; transferReason: string; notes?: string }
const populatedTransfer = (id: mongoose.Types.ObjectId) => VehicleTransfer.findById(id)
  .populate('vehicleId', 'vehicleModel brand licensePlate status odometer branchId')
  .populate('fromBranchId toBranchId', 'name code')
  .populate('requestedBy approvedBy', 'firstName lastName username');

export const requestTransfer = async (user: IUser, input: TransferInput) => {
  assertFleetRole(user, true);
  const vehicleId = objectId(input.vehicleId, 'Mã xe');
  const destination = objectId(input.toBranchId, 'Chi nhánh nhận');
  assertBranchAccess(user, destination);
  return acquireVehicleLock(vehicleId.toString(), async () => {
    const vehicle = await Vehicle.findOne({ _id: vehicleId, isDeleted: false });
    if (!vehicle) throw new AppError(404, 'Không tìm thấy xe.');
    if (vehicle.branchId.equals(destination)) throw new AppError(400, 'Chi nhánh nhận phải khác chi nhánh hiện tại của xe.');
    await Promise.all([assertActiveBranch(vehicle.branchId), assertActiveBranch(destination)]);
    await assertMovableVehicle(vehicle);
    if (await VehicleTransfer.exists({ vehicleId, status: { $in: ['Pending', 'InTransit'] } })) {
      throw new AppError(409, 'Xe đã có yêu cầu điều chuyển đang chờ xử lý.');
    }
    const transfer = await VehicleTransfer.create({ ...input, vehicleId, fromBranchId: vehicle.branchId,
      toBranchId: destination, requestedBy: user._id, status: 'Pending' });
    return populatedTransfer(transfer._id as mongoose.Types.ObjectId);
  });
};

const reviewTransfer = async (id: string, user: IUser) => {
  assertFleetRole(user, true);
  const transfer = await VehicleTransfer.findById(objectId(id, 'Mã yêu cầu'));
  if (!transfer) throw new AppError(404, 'Không tìm thấy yêu cầu điều chuyển.');
  assertBranchAccess(user, transfer.fromBranchId);
  if (transfer.requestedBy.toString() === user._id.toString()) throw new AppError(403, 'Người tạo yêu cầu không được tự duyệt hoặc từ chối yêu cầu của mình.');
  if (transfer.status !== 'Pending') throw new AppError(409, 'Yêu cầu đã được xử lý.');
  return transfer;
};

export const approveTransfer = async (id: string, user: IUser) => {
  const initial = await reviewTransfer(id, user);
  return acquireVehicleLock(initial.vehicleId.toString(), async () => {
    const transfer = await reviewTransfer(id, user);
    await Promise.all([assertActiveBranch(transfer.fromBranchId), assertActiveBranch(transfer.toBranchId)]);
    const vehicle = await Vehicle.findOne({ _id: transfer.vehicleId, isDeleted: false });
    if (!vehicle) throw new AppError(404, 'Không tìm thấy xe.');
    if (!vehicle.branchId.equals(transfer.fromBranchId)) throw new AppError(409, 'Xe không còn thuộc chi nhánh xuất trên yêu cầu.');
    await assertMovableVehicle(vehicle);
    const moved = await Vehicle.updateOne({ _id: vehicle._id, branchId: transfer.fromBranchId,
      status: 'Available', requiresMaintenance: { $ne: true }, isDeleted: false }, { $set: { branchId: transfer.toBranchId } });
    if (moved.modifiedCount !== 1) throw new AppError(409, 'Trạng thái xe đã thay đổi. Vui lòng tải lại.');
    try {
      const now = new Date();
      const approved = await VehicleTransfer.updateOne({ _id: transfer._id, status: 'Pending' },
        { $set: { status: 'Approved', approvedBy: user._id, departureTime: now, arrivalTime: now } });
      if (approved.modifiedCount !== 1) throw new AppError(409, 'Yêu cầu vừa được xử lý bởi người khác.');
    } catch (error) {
      await Vehicle.updateOne({ _id: vehicle._id, branchId: transfer.toBranchId, status: 'Available' }, { $set: { branchId: transfer.fromBranchId } });
      throw error;
    }
    return populatedTransfer(transfer._id as mongoose.Types.ObjectId);
  });
};

export const rejectTransfer = async (id: string, user: IUser, rejectionReason: string) => {
  const initial = await reviewTransfer(id, user);
  return acquireVehicleLock(initial.vehicleId.toString(), async () => {
    const transfer = await reviewTransfer(id, user);
    const result = await VehicleTransfer.updateOne({ _id: transfer._id, status: 'Pending' },
      { $set: { status: 'Rejected', approvedBy: user._id, rejectionReason } });
    if (result.modifiedCount !== 1) throw new AppError(409, 'Yêu cầu vừa được xử lý bởi người khác.');
    return populatedTransfer(transfer._id as mongoose.Types.ObjectId);
  });
};

export const listTransfers = async (user: IUser, options: { page?: number; limit?: number; status?: TransferStatus; branchId?: string }) => {
  assertFleetRole(user, true);
  const scope = branchScope(user, options.branchId);
  const filter: FilterQuery<IVehicleTransfer> = {
    ...(scope ? { $or: [{ fromBranchId: scope }, { toBranchId: scope }] } : {}),
    ...(options.status ? { status: options.status } : {}),
  };
  const { page, limit, skip } = pagination(options.page, options.limit);
  const [data, total, pending] = await Promise.all([
    VehicleTransfer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate('vehicleId', 'vehicleModel brand licensePlate status odometer branchId')
      .populate('fromBranchId toBranchId', 'name code')
      .populate('requestedBy approvedBy', 'firstName lastName username'),
    VehicleTransfer.countDocuments(filter),
    VehicleTransfer.countDocuments({ ...filter, status: 'Pending' }),
  ]);
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }, summary: { pending } };
};
