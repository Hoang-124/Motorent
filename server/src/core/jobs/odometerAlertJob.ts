import cron from 'node-cron';
import { Vehicle } from '../../models/Vehicle';
import { User } from '../../models/User';
import { Notification } from '../../models/Notification';

// Shared with the existing checkout threshold; completion baselines this bucket.
export const ODOMETER_MAINTENANCE_INTERVAL = 1500;
let cronTask: cron.ScheduledTask | null = null;
let sweepRunning = false;

export const runOdometerAlertSweep = async (): Promise<number> => {
  if (sweepRunning) return 0;
  sweepRunning = true;
  let dueCount = 0;
  try {
    const vehicles = Vehicle.find({ isDeleted: false, $or: [
      { requiresMaintenance: true },
      { $expr: { $gt: [{ $floor: { $divide: ['$odometer', ODOMETER_MAINTENANCE_INTERVAL] } }, { $ifNull: ['$lastMaintenanceBucket', 0] }] } },
    ] }).cursor();
    for await (const vehicle of vehicles) {
      const bucket = Math.floor(vehicle.odometer / ODOMETER_MAINTENANCE_INTERVAL);
      const lastBucket = vehicle.lastMaintenanceBucket ?? 0;
      if (bucket > lastBucket) {
        const flagged = await Vehicle.updateOne({ _id: vehicle._id, isDeleted: false, odometer: vehicle.odometer,
          lastMaintenanceBucket: { $in: [lastBucket, null] } },
        { $set: { requiresMaintenance: true, lastMaintenanceBucket: bucket } });
        if (flagged.modifiedCount !== 1) continue;
      } else if (!vehicle.requiresMaintenance) {
        continue;
      }
      // Recheck after the cursor read so completion does not emit a stale alert.
      if (!await Vehicle.exists({ _id: vehicle._id, isDeleted: false, requiresMaintenance: true, odometer: vehicle.odometer })) continue;
      dueCount += 1;
      const recipients = await User.find({ status: 'Active', $or: [
        { branchId: vehicle.branchId, roles: { $in: ['BranchManager', 'Staff'] } },
        { roles: 'SystemAdmin' },
      ] }).select('_id');
      const relatedId = `odo:${vehicle._id.toString()}:${bucket}`;
      for (const recipient of recipients) {
        // The same bucket is updated with $setOnInsert on every sweep, including
        // vehicles already flagged at checkout. Repeated runs create no new alert.
        await Notification.updateOne({ userId: recipient._id, type: 'MAINTENANCE', relatedId }, {
          $setOnInsert: { userId: recipient._id, type: 'MAINTENANCE', relatedId,
            title: `Đến hạn bảo trì: ${vehicle.licensePlate}`,
            body: `${vehicle.brand} ${vehicle.vehicleModel} đã đạt ${vehicle.odometer.toLocaleString('vi-VN')} km. Kiểm tra và lập phiếu bảo trì.`,
            isRead: false, data: { vehicleId: vehicle._id.toString(), branchId: vehicle.branchId.toString(),
              odometer: vehicle.odometer, bucket, intervalKm: ODOMETER_MAINTENANCE_INTERVAL } },
        }, { upsert: true });
      }
    }
    return dueCount;
  } finally {
    sweepRunning = false;
  }
};

export const startOdometerAlertJob = (): void => {
  if (cronTask) return;
  const sweep = () => { void runOdometerAlertSweep().catch((error: unknown) => console.error('[ODO] Alert sweep failed:', error)); };
  cronTask = cron.schedule('*/5 * * * *', sweep);
  sweep();
};

export const stopOdometerAlertJob = (): void => {
  cronTask?.stop();
  cronTask = null;
};
