import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../server';
import { env } from '../config/env';
import { setupTestEnvironment, teardownTestEnvironment } from './testHelper';
import { Booking } from '../models/Booking';
import { Vehicle } from '../models/Vehicle';
import { Branch } from '../models/Branch';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';

describe('UC-56: Vehicle Handover (Check-in 5-Point Verification)', () => {
  let staffTokenDAD: string;
  let staffTokenMK: string;
  let customerToken: string;
  let customerId: string;
  let unverifiedCustomerId: string;
  let unverifiedCustomerToken: string;
  let vehicleId: string;
  let branchDADId: string;
  let confirmedBookingId: string;

  const validFourPhotos = [
    'https://res.cloudinary.com/motorent/image/upload/v1/angle1_front.jpg',
    'https://res.cloudinary.com/motorent/image/upload/v1/angle2_left.jpg',
    'https://res.cloudinary.com/motorent/image/upload/v1/angle3_right.jpg',
    'https://res.cloudinary.com/motorent/image/upload/v1/angle4_rear_odo.jpg',
  ];

  beforeAll(async () => {
    await setupTestEnvironment();

    const staffDAD = await User.findOne({ username: 'staff_dad' });
    const staffMK = await User.findOne({ username: 'staff_mk' });
    const customer = await User.findOne({ username: 'customer_hoang' });
    const branchDAD = await Branch.findOne({ code: 'CN-DAD' });
    const vehicle = await Vehicle.findOne({ branchId: branchDAD?._id });

    if (!staffDAD || !staffMK || !customer || !branchDAD || !vehicle) {
      throw new Error('Test fixtures missing in database');
    }

    branchDADId = branchDAD._id.toString();
    vehicleId = vehicle._id.toString();
    customerId = customer._id.toString();

    // Create an unverified customer to test eKYC gate
    let unverifiedCustomer = await User.findOne({ username: 'customer_unverified_56' });
    if (!unverifiedCustomer) {
      unverifiedCustomer = await User.create({
        username: 'customer_unverified_56',
        email: 'unverified56@motorent.vn',
        passwordHash: 'dummy_hash',
        firstName: 'Văn Chưa',
        lastName: 'Xác Minh',
        phoneNumber: '0977666555',
        roles: 'Customer',
        status: 'Active',
        identityStatus: 'Unverified',
        tokenVersion: 0,
      });
    } else {
      unverifiedCustomer.identityStatus = 'Unverified';
      await unverifiedCustomer.save();
    }
    unverifiedCustomerId = unverifiedCustomer._id.toString();

    staffTokenDAD = jwt.sign(
      { userId: staffDAD._id.toString(), tokenVersion: staffDAD.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    staffTokenMK = jwt.sign(
      { userId: staffMK._id.toString(), tokenVersion: staffMK.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    customerToken = jwt.sign(
      { userId: customer._id.toString(), tokenVersion: customer.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    unverifiedCustomerToken = jwt.sign(
      { userId: unverifiedCustomerId, tokenVersion: 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const now = new Date();
    // Create standard confirmed booking for check-in
    const confirmedBooking = await Booking.create({
      bookingCode: `MV-56CONF${Date.now().toString().slice(-4)}`,
      userId: customer._id,
      vehicleId: vehicle._id,
      pickupBranchId: branchDAD._id,
      returnBranchId: branchDAD._id,
      pickupDateTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0),
      returnDateTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 18, 0, 0),
      totalAmount: 450000,
      depositAmount: 135000,
      remainingAmount: 315000,
      paidAmount: 135000,
      status: 'Confirmed',
      depositStatus: 'Paid',
    });
    confirmedBookingId = confirmedBooking._id.toString();
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  it('TC-56-01: Should reject unauthenticated check-in requests with 401', async () => {
    const res = await request(app)
      .put(`/api/bookings/${confirmedBookingId}/checkin`)
      .send({
        startOdometer: 3500,
        startFuelLevel: '100%',
        checkinImages: validFourPhotos,
      });

    expect(res.status).toBe(401);
  });

  it('TC-56-02: Should reject Customer role with 403 Forbidden', async () => {
    const res = await request(app)
      .put(`/api/bookings/${confirmedBookingId}/checkin`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        startOdometer: 3500,
        startFuelLevel: '100%',
        checkinImages: validFourPhotos,
      });

    expect(res.status).toBe(403);
  });

  it('TC-56-03: Should reject checkin if booking is in Pending or Cancelled status with 409', async () => {
    const now = new Date();
    const pendingBooking = await Booking.create({
      bookingCode: `MV-56PEND${Date.now().toString().slice(-4)}`,
      userId: customerId,
      vehicleId,
      pickupBranchId: branchDADId,
      returnBranchId: branchDADId,
      pickupDateTime: new Date(now.getTime() + 3600000),
      returnDateTime: new Date(now.getTime() + 86400000),
      totalAmount: 300000,
      depositAmount: 90000,
      remainingAmount: 210000,
      paidAmount: 0,
      status: 'Pending',
    });

    const res = await request(app)
      .put(`/api/bookings/${pendingBooking._id}/checkin`)
      .set('Authorization', `Bearer ${staffTokenDAD}`)
      .send({
        startOdometer: 3500,
        startFuelLevel: '100%',
        checkinImages: validFourPhotos,
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('Không thể thực hiện Check-in');
  });

  it('TC-56-04: Should reject staff from different branch (cross-branch checkin) with 403', async () => {
    const res = await request(app)
      .put(`/api/bookings/${confirmedBookingId}/checkin`)
      .set('Authorization', `Bearer ${staffTokenMK}`) // staffMK belongs to CN-MK, booking is at CN-DAD
      .send({
        startOdometer: 3500,
        startFuelLevel: '100%',
        checkinImages: validFourPhotos,
      });

    expect(res.status).toBe(403);
  });

  it('TC-56-05: Should reject check-in if customer eKYC identity is unverified with 403', async () => {
    const now = new Date();
    const unverifiedBooking = await Booking.create({
      bookingCode: `MV-56UNV${Date.now().toString().slice(-4)}`,
      userId: unverifiedCustomerId,
      vehicleId,
      pickupBranchId: branchDADId,
      returnBranchId: branchDADId,
      pickupDateTime: new Date(now.getTime() + 3600000),
      returnDateTime: new Date(now.getTime() + 86400000),
      totalAmount: 300000,
      depositAmount: 90000,
      remainingAmount: 210000,
      paidAmount: 90000,
      status: 'Confirmed',
    });

    const res = await request(app)
      .put(`/api/bookings/${unverifiedBooking._id}/checkin`)
      .set('Authorization', `Bearer ${staffTokenDAD}`)
      .send({
        startOdometer: 3500,
        startFuelLevel: '100%',
        checkinImages: validFourPhotos,
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('eKYC');
  });

  it('TC-56-06: Should reject check-in if fewer than 4 angle photos are provided with 400', async () => {
    const res = await request(app)
      .put(`/api/bookings/${confirmedBookingId}/checkin`)
      .set('Authorization', `Bearer ${staffTokenDAD}`)
      .send({
        startOdometer: 3500,
        startFuelLevel: '100%',
        checkinImages: ['https://example.com/only_1_photo.jpg'], // only 1 photo instead of 4
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('4 góc ảnh');
  });

  it('TC-56-07: Should reject startOdometer lower than vehicle current odometer with 400', async () => {
    const currentVehicle = await Vehicle.findById(vehicleId);
    const lowerOdo = (currentVehicle?.odometer || 3200) - 100;

    const res = await request(app)
      .put(`/api/bookings/${confirmedBookingId}/checkin`)
      .set('Authorization', `Bearer ${staffTokenDAD}`)
      .send({
        startOdometer: lowerOdo,
        startFuelLevel: '100%',
        checkinImages: validFourPhotos,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('nhỏ hơn ODO hiện tại');
  });

  it('TC-56-08: Should successfully execute 5-point check-in handover', async () => {
    const currentVehicle = await Vehicle.findById(vehicleId);
    const validOdo = (currentVehicle?.odometer || 3200) + 10;

    const res = await request(app)
      .put(`/api/bookings/${confirmedBookingId}/checkin`)
      .set('Authorization', `Bearer ${staffTokenDAD}`)
      .send({
        startOdometer: validOdo,
        startFuelLevel: '100%',
        checkinImages: validFourPhotos,
        checklist: {
          idCardVerified: true,
          drivingLicenseVerified: true,
          tires: true,
          brakes: true,
          lights: true,
          fuel: true,
          helmets: true,
        },
        eSignatureUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('Ongoing');
    expect(res.body.data.startOdometer).toBe(validOdo);
    expect(res.body.data.startFuelLevel).toBe('100%');
    expect(res.body.data.checkinImages).toHaveLength(4);

    // Verify database state: Booking updated
    const updatedBooking = await Booking.findById(confirmedBookingId);
    expect(updatedBooking?.status).toBe('Ongoing');
    expect(updatedBooking?.checkinAt).toBeDefined();
    expect(updatedBooking?.checkinBy).toBeDefined();

    // Verify database state: Vehicle status is Rented & odometer updated
    const updatedVehicle = await Vehicle.findById(vehicleId);
    expect(updatedVehicle?.status).toBe('Rented');
    expect(updatedVehicle?.odometer).toBe(validOdo);

    // Verify AuditLog record created
    const audits = await AuditLog.find({
      entityId: confirmedBookingId,
      action: 'CHECKIN_HANDOVER',
    });
    expect(audits.length).toBeGreaterThanOrEqual(1);
    expect(audits[0].details).toHaveProperty('startOdometer', validOdo);
    expect(audits[0].details).toHaveProperty('photosCount', 4);
  });
});
