import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { Vehicle } from '../models/Vehicle';
import { Review } from '../models/Review';

export async function migrateVehicleReviews(): Promise<void> {
  console.log('[MIGRATION] Starting migration for Vehicle averageRating and reviewCount...');
  await connectDatabase();

  const vehicles = await Vehicle.find({});
  console.log(`[MIGRATION] Found ${vehicles.length} vehicles to verify/migrate.`);

  let updatedCount = 0;
  for (const v of vehicles) {
    const reviews = await Review.find({ vehicleId: v._id, deletedAt: null });
    const count = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const avg = count > 0 ? Math.round((sum / count) * 100) / 100 : 0;

    v.reviewCount = count;
    v.averageRating = avg;
    await v.save();
    updatedCount++;
  }

  console.log(`[MIGRATION] Completed migration! Updated ${updatedCount} vehicles.`);
}

if (process.env.NODE_ENV !== 'test' && require.main === module) {
  migrateVehicleReviews()
    .then(async () => {
      await disconnectDatabase();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[MIGRATION ERROR]', err);
      await disconnectDatabase();
      process.exit(1);
    });
}
