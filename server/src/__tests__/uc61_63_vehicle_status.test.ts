import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { app } from '../server';
import { env } from '../config/env';
import { setupTestEnvironment, teardownTestEnvironment } from './testHelper';
import { Vehicle } from '../models/Vehicle';
import { Branch } from '../models/Branch';
import { Category } from '../models/Category';
import { Booking } from '../models/Booking';
import { MaintenanceLog } from '../models/MaintenanceLog';
import { User } from '../models/User';

describe('UC-61-63: Vehicle Status Management (PUT /api/vehicles/:id/status)', () => {
  let staffDadToken: string;
  let staffMkToken: string;
  let customerToken: string;
  let branchDad: any;
  let branchMk: any;
  let category: any;
  let testVehicleDad: any;

  beforeAll(async () => {
    await setupTestEnvironment();

    const staffDad = await User.findOne({ username: 'staff_dad' });
    staffDadToken = jwt.sign(
      { userId: staffDad!._id.toString(), tokenVersion: staffDad!.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const staffMk = await User.findOne({ username: 'staff_mk' });
    staffMkToken = jwt.sign(
      { userId: staffMk!._id.toString(), tokenVersion: staffMk!.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const customer = await User.findOne({ username: 'customer_hoang' });
    customerToken = jwt.sign(
      { userId: customer!._id.toString(), tokenVersion: customer!.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    branchDad = await Branch.findOne({ code: 'CN-DAD' });
    branchMk = await Branch.findOne({ code: 'CN-MK' });
    category = await Category.findOne({ slug: 'xe-tay-ga' });

    testVehicleDad = await Vehicle.create({
      branchId: branchDad._id,
      category: category._id,
      vehicleModel: 'Honda Air Blade 160cc 2026',
      brand: 'Honda',
      licensePlate: '43-A1 888.88',
      odometer: 4500,
      dailyPrice: 160000,
      status: 'Available',
      transmissionType: 'Automatic',
      fuelType: 'Gasoline',
      requiresMaintenance: false,
      isDeleted: false,
    });
  }, 30000);

  afterAll(async () => {
    if (testVehicleDad) {
      await Vehicle.deleteOne({ _id: testVehicleDad._id });
      await MaintenanceLog.deleteMany({ vehicleId: testVehicleDad._id });
      await Booking.deleteMany({ vehicleId: testVehicleDad._id });
    }
    await teardownTestEnvironment();
  }, 10000);

  it('1. Returns 401 Unauthorized when no JWT token is provided', async () => {
    const res = await request(app)
      .put(`/api/vehicles/${testVehicleDad._id}/status`)
      .send({ status: 'Maintenance' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('2. Returns 403 Forbidden when accessed by Customer role', async () => {
    const res = await request(app)
      .put(`/api/vehicles/${testVehicleDad._id}/status`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'Maintenance' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('3. Returns 403 Forbidden when staff from another branch (staff_mk) attempts to update vehicle in CN-DAD', async () => {
    const res = await request(app)
      .put(`/api/vehicles/${testVehicleDad._id}/status`)
      .set('Authorization', `Bearer ${staffMkToken}`)
      .send({
        status: 'Maintenance',
        reason: 'Staff MK trái quyền thao tác',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/chi nhánh/i);
  });

  it('4. Returns 404 when vehicle ID does not exist', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    const res = await request(app)
      .put(`/api/vehicles/${fakeId}/status`)
      .set('Authorization', `Bearer ${staffDadToken}`)
      .send({ status: 'Maintenance' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('5. Successfully changes status to Maintenance (UC-63) by assigned branch staff and creates MaintenanceLog', async () => {
    const res = await request(app)
      .put(`/api/vehicles/${testVehicleDad._id}/status`)
      .set('Authorization', `Bearer ${staffDadToken}`)
      .send({
        status: 'Maintenance',
        reason: 'Kiểm tra hệ thống phanh sau và thay dầu máy mốc 5000km',
        maintenanceType: 'Routine',
        cost: 250000,
        odometer: 4800,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('Maintenance');
    expect(res.body.data.requiresMaintenance).toBe(true);
    expect(res.body.data.odometer).toBe(4800);

    // Verify database record
    const updatedVehicle = await Vehicle.findById(testVehicleDad._id);
    expect(updatedVehicle?.status).toBe('Maintenance');
    expect(updatedVehicle?.requiresMaintenance).toBe(true);
    expect(updatedVehicle?.odometer).toBe(4800);

    // Verify MaintenanceLog created
    const log = await MaintenanceLog.findOne({
      vehicleId: testVehicleDad._id,
      status: 'InProgress',
    });
    expect(log).toBeDefined();
    expect(log?.description).toBe('Kiểm tra hệ thống phanh sau và thay dầu máy mốc 5000km');
    expect(log?.cost).toBe(250000);
    expect(log?.odometerAtMaintenance).toBe(4800);
  });

  it('6. Successfully restores status to Available (UC-61) and closes open maintenance logs', async () => {
    const res = await request(app)
      .put(`/api/vehicles/${testVehicleDad._id}/status`)
      .set('Authorization', `Bearer ${staffDadToken}`)
      .send({
        status: 'Available',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('Available');
    expect(res.body.data.requiresMaintenance).toBe(false);

    // Verify open maintenance logs marked Completed
    const completedLog = await MaintenanceLog.findOne({
      vehicleId: testVehicleDad._id,
      status: 'Completed',
    });
    expect(completedLog).toBeDefined();
    expect(completedLog?.endDate).toBeDefined();
  });

  it('7. Returns 400 when attempting to change status away from Rented if there is an active Ongoing booking', async () => {
    const customer = await User.findOne({ username: 'customer_hoang' });

    // Set vehicle to Rented
    await Vehicle.updateOne({ _id: testVehicleDad._id }, { $set: { status: 'Rented' } });

    // Create an active ongoing booking
    const activeBooking = await Booking.create({
      bookingCode: 'MTR-TEST-ONGOING-VSTAT',
      userId: customer?._id,
      vehicleId: testVehicleDad._id,
      pickupBranchId: branchDad._id,
      returnBranchId: branchDad._id,
      pickupDateTime: new Date(Date.now() - 3600000),
      returnDateTime: new Date(Date.now() + 3600000),
      dailyPrice: 160000,
      totalAmount: 160000,
      depositAmount: 48000,
      remainingAmount: 112000,
      discountAmount: 0,
      lateFee: 0,
      damageFee: 0,
      loyaltyPointsEarned: 0,
      startOdometer: 4500,
      status: 'Ongoing',
      depositPaid: true,
      isPaid: false,
      paidAmount: 48000,
      paymentMethod: 'Banking',
    });

    // Attempt to manually toggle status away from Rented
    const res = await request(app)
      .put(`/api/vehicles/${testVehicleDad._id}/status`)
      .set('Authorization', `Bearer ${staffDadToken}`)
      .send({
        status: 'Available',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Ongoing/i);

    // Cleanup active booking and reset vehicle
    await Booking.deleteOne({ _id: activeBooking._id });
    await Vehicle.updateOne({ _id: testVehicleDad._id }, { $set: { status: 'Available' } });
  });
});
