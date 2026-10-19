import { Router, type NextFunction, type Response } from 'express';
import type { PipelineStage } from 'mongoose';
import { z } from 'zod';
import { authenticateJWT, type AuthenticatedRequest } from '../../core/authMiddleware';
import { authorize } from '../../core/rbacMiddleware';
import { AppError } from '../../core/errorHandler';
import { Branch } from '../../models/Branch';
import { MaintenanceLog, type MaintenanceStatus } from '../../models/MaintenanceLog';
import { Vehicle, type VehicleStatus } from '../../models/Vehicle';
import { VehicleTransfer } from '../../models/VehicleTransfer';
import { assertFleetRole, branchScope } from './fleetAccess';

const querySchema = z.object({
  branchId: z.string().regex(/^[a-f\d]{24}$/i, 'Mã chi nhánh không hợp lệ.').optional(),
}).strict();

interface VehicleTotals { _id: VehicleStatus; count: number; maintenanceDue: number; readyCount: number }
interface MaintenanceTotals { _id: MaintenanceStatus; count: number; cost: number }
interface TransferTotals { _id: 'Pending' | 'InTransit'; count: number; inbound: number; outbound: number }

// Keep historical work scoped by its recorded branch while excluding records
// whose vehicle has been deleted. A moved vehicle can still have local history.
const withExistingVehicle = (): PipelineStage[] => [
  { $lookup: { from: Vehicle.collection.name, localField: 'vehicleId', foreignField: '_id', as: 'vehicle' } },
  { $match: { 'vehicle.isDeleted': false } },
];

export const getFleetDashboard = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw new AppError(401, 'Yêu cầu đăng nhập.');
    assertFleetRole(req.user, true);
    const { branchId } = querySchema.parse(req.query);
    // branchScope rejects a manager's attempt to select another branch and also
    // rejects an unassigned manager instead of falling back to all branches.
    const scope = branchScope(req.user, branchId);
    const selectedBranch = scope ? await Branch.findById(scope).select('name code').lean() : null;
    if (scope && !selectedBranch) throw new AppError(404, 'Không tìm thấy chi nhánh.');
    const scopedBranchFilter = scope ? { branchId: scope } : {};

    const [vehicleTotals, maintenanceTotals, transferTotals, branches] = await Promise.all([
      Vehicle.aggregate<VehicleTotals>([
        { $match: { isDeleted: false, ...scopedBranchFilter } },
        { $group: {
          _id: '$status', count: { $sum: 1 },
          maintenanceDue: { $sum: { $cond: [{ $eq: ['$requiresMaintenance', true] }, 1, 0] } },
          readyCount: { $sum: { $cond: [{ $and: [
            { $eq: ['$status', 'Available'] },
            { $ne: [{ $ifNull: ['$requiresMaintenance', false] }, true] },
          ] }, 1, 0] } },
        } },
      ]),
      MaintenanceLog.aggregate<MaintenanceTotals>([
        { $match: scopedBranchFilter }, ...withExistingVehicle(),
        { $group: { _id: '$status', count: { $sum: 1 }, cost: { $sum: '$cost' } } },
      ]),
      VehicleTransfer.aggregate<TransferTotals>([
        { $match: { status: { $in: ['Pending', 'InTransit'] },
          ...(scope ? { $or: [{ fromBranchId: scope }, { toBranchId: scope }] } : {}) } },
        ...withExistingVehicle(),
        { $group: {
          _id: '$status', count: { $sum: 1 },
          inbound: { $sum: scope ? { $cond: [{ $eq: ['$toBranchId', scope] }, 1, 0] } : 1 },
          outbound: { $sum: scope ? { $cond: [{ $eq: ['$fromBranchId', scope] }, 1, 0] } : 1 },
        } },
      ]),
      req.user.roles === 'SystemAdmin'
        ? Branch.find().select('name code isActive').sort({ name: 1, _id: 1 }).lean()
        : Promise.resolve([]),
    ]);

    const statusCounts: Record<VehicleStatus, number> = { Available: 0, Rented: 0, Maintenance: 0, Transferring: 0 };
    for (const row of vehicleTotals) statusCounts[row._id] = row.count;
    const scheduled = maintenanceTotals.find((row) => row._id === 'Scheduled');
    const inProgress = maintenanceTotals.find((row) => row._id === 'InProgress');
    const completed = maintenanceTotals.find((row) => row._id === 'Completed');
    const pendingTransfer = transferTotals.find((row) => row._id === 'Pending');
    const inTransit = transferTotals.find((row) => row._id === 'InTransit');

    res.json({ success: true, data: {
      generatedAt: new Date().toISOString(),
      scope: { branchId: scope?.toString() ?? null, name: selectedBranch?.name ?? 'Toàn bộ chi nhánh', code: selectedBranch?.code ?? null },
      branches: branches.map((branch) => ({ _id: branch._id.toString(), name: branch.name, code: branch.code, isActive: branch.isActive })),
      vehicles: {
        total: Object.values(statusCounts).reduce((sum, count) => sum + count, 0), statusCounts,
        readyCount: vehicleTotals.reduce((sum, row) => sum + row.readyCount, 0),
        maintenanceDueCount: vehicleTotals.reduce((sum, row) => sum + row.maintenanceDue, 0),
        availableWithMaintenanceDueCount: vehicleTotals.find((row) => row._id === 'Available')?.maintenanceDue ?? 0,
      },
      maintenance: {
        scheduledCount: scheduled?.count ?? 0, inProgressCount: inProgress?.count ?? 0,
        pendingCount: (scheduled?.count ?? 0) + (inProgress?.count ?? 0), completedCount: completed?.count ?? 0,
        pendingEstimatedCost: (scheduled?.cost ?? 0) + (inProgress?.cost ?? 0), completedCost: completed?.cost ?? 0,
      },
      transfers: {
        pendingCount: pendingTransfer?.count ?? 0, pendingInboundCount: pendingTransfer?.inbound ?? 0,
        pendingOutboundCount: pendingTransfer?.outbound ?? 0, inTransitCount: inTransit?.count ?? 0,
        inTransitInboundCount: inTransit?.inbound ?? 0, inTransitOutboundCount: inTransit?.outbound ?? 0,
      },
    } });
  } catch (error) { next(error); }
};

const router = Router();
router.use(authenticateJWT, authorize('BranchManager', 'SystemAdmin'));
router.get('/dashboard', getFleetDashboard);
export default router;
