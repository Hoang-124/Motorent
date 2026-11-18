import mongoose, { FilterQuery } from 'mongoose';
import { AppError } from '../../core/errorHandler';
import { assertBranchAccess } from '../../core/permissions';
import { IUser } from '../../models/User';
import { Vehicle } from '../../models/Vehicle';
import { IVehicleTransfer, VehicleTransfer, TransferStatus } from '../../models/VehicleTransfer';
import { withResourceLock as acquireVehicleLock } from '../../core/resourceLock';
import {
  assertActiveBranch,
  assertFleetRole,
  assertMovableVehicle,
  branchScope,
  objectId,
  pagination,
} from './fleetAccess';

export interface TransferInput {
  vehicleId: string;
  toBranchId: string;
  transferReason: string;
  notes?: string;
}

const populatedTransfer = (id: mongoose.Types.ObjectId) =>
  VehicleTransfer.findById(id)
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
    if (vehicle.branchId.equals(destination)) {
      throw new AppError(400, 'Chi nhánh nhận phải khác chi nhánh hiện tại của xe.');
    }
    await Promise.all([assertActiveBranch(vehicle.branchId), assertActiveBranch(destination)]);
    await assertMovableVehicle(vehicle);
    if (
      await VehicleTransfer.exists({
        vehicleId,
        status: { $in: ['Pending', 'Approved', 'InTransit'] },
      })
    ) {
      throw new AppError(409, 'Xe đã có yêu cầu điều chuyển đang chờ xử lý hoặc đang vận chuyển.');
    }
    const transfer = await VehicleTransfer.create({
      ...input,
      vehicleId,
      fromBranchId: vehicle.branchId,
      toBranchId: destination,
      requestedBy: user._id,
      status: 'Pending',
    });
    return populatedTransfer(transfer._id as mongoose.Types.ObjectId);
  });
};

const reviewTransfer = async (id: string, user: IUser) => {
  assertFleetRole(user, true);
  const transfer = await VehicleTransfer.findById(objectId(id, 'Mã yêu cầu'));
  if (!transfer) throw new AppError(404, 'Không tìm thấy yêu cầu điều chuyển.');
  assertBranchAccess(user, transfer.fromBranchId);
  if (
    user.roles !== 'SystemAdmin' &&
    transfer.requestedBy.toString() === user._id.toString()
  ) {
    throw new AppError(403, 'Người tạo yêu cầu không được tự duyệt hoặc từ chối yêu cầu của mình.');
  }
  if (transfer.status !== 'Pending') throw new AppError(409, 'Yêu cầu đã được xử lý.');
  return transfer;
};

export const approveTransfer = async (id: string, user: IUser) => {
  const initial = await reviewTransfer(id, user);
  return acquireVehicleLock(initial.vehicleId.toString(), async () => {
    const transfer = await reviewTransfer(id, user);
    await Promise.all([
      assertActiveBranch(transfer.fromBranchId),
      assertActiveBranch(transfer.toBranchId),
    ]);
    const vehicle = await Vehicle.findOne({ _id: transfer.vehicleId, isDeleted: false });
    if (!vehicle) throw new AppError(404, 'Không tìm thấy xe.');
    if (!vehicle.branchId.equals(transfer.fromBranchId)) {
      throw new AppError(409, 'Xe không còn thuộc chi nhánh xuất trên yêu cầu.');
    }
    await assertMovableVehicle(vehicle);
    const dispatched = await Vehicle.updateOne(
      {
        _id: vehicle._id,
        branchId: transfer.fromBranchId,
        status: 'Available',
        requiresMaintenance: { $ne: true },
        isDeleted: false,
      },
      { $set: { status: 'Transferring' } }
    );
    if (dispatched.modifiedCount !== 1) {
      throw new AppError(409, 'Trạng thái xe đã thay đổi. Vui lòng tải lại.');
    }
    try {
      const now = new Date();
      const approved = await VehicleTransfer.updateOne(
        { _id: transfer._id, status: 'Pending' },
        {
          $set: {
            status: 'InTransit',
            approvedBy: user._id,
            departureTime: now,
          },
        }
      );
      if (approved.modifiedCount !== 1) {
        throw new AppError(409, 'Yêu cầu vừa được xử lý bởi người khác.');
      }
    } catch (error) {
      await Vehicle.updateOne(
        { _id: vehicle._id, status: 'Transferring' },
        { $set: { status: 'Available' } }
      );
      throw error;
    }
    return populatedTransfer(transfer._id as mongoose.Types.ObjectId);
  });
};

export const dispatchTransfer = async (id: string, user: IUser) => {
  assertFleetRole(user, true);
  const initial = await VehicleTransfer.findById(objectId(id, 'Mã yêu cầu'));
  if (!initial) throw new AppError(404, 'Không tìm thấy yêu cầu điều chuyển.');
  assertBranchAccess(user, initial.fromBranchId);

  return acquireVehicleLock(initial.vehicleId.toString(), async () => {
    const transfer = await VehicleTransfer.findById(initial._id);
    if (!transfer) throw new AppError(404, 'Không tìm thấy yêu cầu điều chuyển.');
    if (transfer.status !== 'Approved') {
      throw new AppError(409, 'Chỉ có thể xuất kho cho phiếu điều chuyển ở trạng thái đã duyệt.');
    }
    const vehicle = await Vehicle.findOne({ _id: transfer.vehicleId, isDeleted: false });
    if (!vehicle) throw new AppError(404, 'Không tìm thấy xe.');
    await Vehicle.updateOne(
      { _id: vehicle._id, isDeleted: false },
      { $set: { status: 'Transferring' } }
    );
    const now = new Date();
    const updated = await VehicleTransfer.updateOne(
      { _id: transfer._id, status: 'Approved' },
      { $set: { status: 'InTransit', departureTime: transfer.departureTime ?? now } }
    );
    if (updated.modifiedCount !== 1) {
      throw new AppError(409, 'Yêu cầu vừa được xử lý bởi người khác.');
    }
    return populatedTransfer(transfer._id as mongoose.Types.ObjectId);
  });
};

export const completeTransfer = async (id: string, user: IUser, notes?: string) => {
  assertFleetRole(user, true);
  const initial = await VehicleTransfer.findById(objectId(id, 'Mã yêu cầu'));
  if (!initial) throw new AppError(404, 'Không tìm thấy yêu cầu điều chuyển.');
  assertBranchAccess(user, initial.toBranchId);
  if (!['InTransit', 'Approved'].includes(initial.status)) {
    throw new AppError(409, 'Chỉ có thể xác nhận tiếp nhận xe đang trong quá trình vận chuyển.');
  }

  return acquireVehicleLock(initial.vehicleId.toString(), async () => {
    const transfer = await VehicleTransfer.findById(initial._id);
    if (!transfer) throw new AppError(404, 'Không tìm thấy yêu cầu điều chuyển.');
    assertBranchAccess(user, transfer.toBranchId);
    if (!['InTransit', 'Approved'].includes(transfer.status)) {
      throw new AppError(409, 'Phiếu điều chuyển đã được hoàn tất hoặc từ chối trước đó.');
    }
    await assertActiveBranch(transfer.toBranchId);

    const vehicle = await Vehicle.findOne({ _id: transfer.vehicleId, isDeleted: false });
    if (!vehicle) throw new AppError(404, 'Không tìm thấy xe.');
    const previousBranchId = vehicle.branchId;
    const previousStatus = vehicle.status;

    const received = await Vehicle.updateOne(
      {
        _id: vehicle._id,
        isDeleted: false,
        status: { $in: ['Transferring', 'Available'] },
      },
      {
        $set: {
          branchId: transfer.toBranchId,
          status: 'Available',
        },
      }
    );
    if (received.matchedCount !== 1) {
      throw new AppError(409, 'Không thể tiếp nhận xe do trạng thái xe hiện tại không hợp lệ.');
    }

    try {
      const now = new Date();
      const mergedNotes = notes?.trim()
        ? [transfer.notes?.trim(), notes.trim()].filter(Boolean).join(' | ')
        : transfer.notes;
      const completed = await VehicleTransfer.updateOne(
        { _id: transfer._id, status: { $in: ['InTransit', 'Approved'] } },
        {
          $set: {
            status: 'Completed',
            arrivalTime: now,
            ...(mergedNotes !== undefined ? { notes: mergedNotes } : {}),
          },
        }
      );
      if (completed.modifiedCount !== 1) {
        throw new AppError(409, 'Yêu cầu vừa được xử lý bởi người khác.');
      }
    } catch (error) {
      await Vehicle.updateOne(
        { _id: vehicle._id },
        { $set: { branchId: previousBranchId, status: previousStatus } }
      );
      throw error;
    }

    return populatedTransfer(transfer._id as mongoose.Types.ObjectId);
  });
};

export const rejectTransfer = async (id: string, user: IUser, rejectionReason: string) => {
  const initial = await reviewTransfer(id, user);
  return acquireVehicleLock(initial.vehicleId.toString(), async () => {
    const transfer = await reviewTransfer(id, user);
    const result = await VehicleTransfer.updateOne(
      { _id: transfer._id, status: 'Pending' },
      { $set: { status: 'Rejected', approvedBy: user._id, rejectionReason } }
    );
    if (result.modifiedCount !== 1) {
      throw new AppError(409, 'Yêu cầu vừa được xử lý bởi người khác.');
    }
    return populatedTransfer(transfer._id as mongoose.Types.ObjectId);
  });
};

export const listTransfers = async (
  user: IUser,
  options: {
    page?: number;
    limit?: number;
    status?: TransferStatus;
    branchId?: string;
    vehicleId?: string;
  }
) => {
  assertFleetRole(user);
  const scope = branchScope(user, options.branchId);
  const baseScopeFilter: FilterQuery<IVehicleTransfer> = {
    ...(scope ? { $or: [{ fromBranchId: scope }, { toBranchId: scope }] } : {}),
    ...(options.vehicleId ? { vehicleId: objectId(options.vehicleId, 'Mã xe') } : {}),
  };
  const filter: FilterQuery<IVehicleTransfer> = {
    ...baseScopeFilter,
    ...(options.status ? { status: options.status } : {}),
  };
  const { page, limit, skip } = pagination(options.page, options.limit);
  const [data, total, pending, inTransitCount, completedCount, rejectedCount] = await Promise.all([
    VehicleTransfer.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('vehicleId', 'vehicleModel brand licensePlate status odometer branchId')
      .populate('fromBranchId toBranchId', 'name code')
      .populate('requestedBy approvedBy', 'firstName lastName username'),
    VehicleTransfer.countDocuments(filter),
    VehicleTransfer.countDocuments({ ...baseScopeFilter, status: 'Pending' }),
    VehicleTransfer.countDocuments({
      ...baseScopeFilter,
      status: { $in: ['InTransit', 'Approved'] },
    }),
    VehicleTransfer.countDocuments({ ...baseScopeFilter, status: 'Completed' }),
    VehicleTransfer.countDocuments({ ...baseScopeFilter, status: 'Rejected' }),
  ]);
  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    summary: { pending, inTransitCount, completedCount, rejectedCount },
  };
};
