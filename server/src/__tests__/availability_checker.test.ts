import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../server';
import { setupTestEnvironment } from './testHelper';
import { Booking } from '../models/Booking';
import { Vehicle } from '../models/Vehicle';
import { Branch } from '../models/Branch';
import { User } from '../models/User';
import { checkVehicleAvailability } from '../modules/booking/bookingService';

describe('Availability Checker (Rule BR-02)', () => {
  let vehicleId: mongoose.Types.ObjectId;
  let customerId: mongoose.Types.ObjectId;
  let branchId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    await setupTestEnvironment();

    const vehicle = await Vehicle.findOne({ status: 'Available' });
    const customer = await User.findOne({ username: 'customer_hoang' });
    const branch = await Branch.findOne({ code: 'CN-DAD' });

    if (!vehicle || !customer || !branch) {
      throw new Error('Test fixtures missing in database');
    }

    vehicleId = vehicle._id as mongoose.Types.ObjectId;
    customerId = customer._id as mongoose.Types.ObjectId;
    branchId = branch._id as mongoose.Types.ObjectId;
  });

  it('1. Returns available: true when vehicle has no overlapping bookings', async () => {
    const pickupDate = new Date(Date.now() + 10 * 3600 * 1000);
    const returnDate = new Date(Date.now() + 30 * 3600 * 1000);

    const check = await checkVehicleAvailability(vehicleId, pickupDate, returnDate);
    expect(check.available).toBe(true);
    expect(check.conflictingBooking).toBeNull();
  });

  it('2. Atomic overlap detection (BR-02): Returns available: false when dates overlap existing booking', async () => {
    const bookingPickup = new Date(Date.now() + 24 * 3600 * 1000);
    const bookingReturn = new Date(Date.now() + 72 * 3600 * 1000);

    const existingBooking = await Booking.create({
      bookingCode: `MV-AV1-${Date.now().toString().slice(-4)}`,
      userId: customerId,
      vehicleId,
      pickupBranchId: branchId,
      returnBranchId: branchId,
      pickupDateTime: bookingPickup,
      returnDateTime: bookingReturn,
      totalAmount: 1000000,
      depositAmount: 300000,
      remainingAmount: 700000,
      status: 'Confirmed',
    });

    // Overlapping search: starts in middle of existing booking
    const testPickup = new Date(Date.now() + 36 * 3600 * 1000);
    const testReturn = new Date(Date.now() + 84 * 3600 * 1000);

    const check = await checkVehicleAvailability(vehicleId, testPickup, testReturn);
    expect(check.available).toBe(false);
    expect(check.conflictingBooking?._id.toString()).toBe(existingBooking._id.toString());
  });

  it('3. POST /api/bookings/check-availability returns 409 Conflict when overlapping', async () => {
    const testPickup = new Date(Date.now() + 40 * 3600 * 1000).toISOString();
    const testReturn = new Date(Date.now() + 50 * 3600 * 1000).toISOString();

    const res = await request(app)
      .post('/api/bookings/check-availability')
      .send({
        vehicleId: vehicleId.toString(),
        pickupDateTime: testPickup,
        returnDateTime: testReturn,
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.available).toBe(false);
    expect(res.body.message).toMatch(/Phương tiện này đã có lịch đặt/);
  });

  it('4. POST /api/bookings/check-availability returns 200 when time window is completely free', async () => {
    // 5 days later (after existing booking returns)
    const testPickup = new Date(Date.now() + 120 * 3600 * 1000).toISOString();
    const testReturn = new Date(Date.now() + 150 * 3600 * 1000).toISOString();

    const res = await request(app)
      .post('/api/bookings/check-availability')
      .send({
        vehicleId: vehicleId.toString(),
        pickupDateTime: testPickup,
        returnDateTime: testReturn,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.available).toBe(true);
  });

  it('5. Ignore Cancelled or Rejected bookings from blocking availability', async () => {
    const cancelPickup = new Date(Date.now() + 200 * 3600 * 1000);
    const cancelReturn = new Date(Date.now() + 240 * 3600 * 1000);

    await Booking.create({
      bookingCode: `MV-AV-CAN-${Date.now().toString().slice(-4)}`,
      userId: customerId,
      vehicleId,
      pickupBranchId: branchId,
      returnBranchId: branchId,
      pickupDateTime: cancelPickup,
      returnDateTime: cancelReturn,
      totalAmount: 1000000,
      depositAmount: 300000,
      status: 'Cancelled',
    });

    const check = await checkVehicleAvailability(vehicleId, cancelPickup, cancelReturn);
    expect(check.available).toBe(true);
  });
});
