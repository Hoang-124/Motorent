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

describe('UC-57: Vehicle Return & Settlement (Check-out)', () => {
  let staffTokenDAD: string;
  let staffTokenMK: string;
  let customerToken: string;
  let customerId: string;
  let vehicleId: string;
  let branchDADId: string;
  let branchMKId: string;
  let ongoingBookingId: string;
  const startOdo = 3500;

  const validFourPhotos = [
    'https://res.cloudinary.com/motorent/image/upload/v1/checkout_angle1_front.jpg',
    'https://res.cloudinary.com/motorent/image/upload/v1/checkout_angle2_left.jpg',
    'https://res.cloudinary.com/motorent/image/upload/v1/checkout_angle3_right.jpg',
    'https://res.cloudinary.com/motorent/image/upload/v1/checkout_angle4_rear_odo.jpg',
  ];

  beforeAll(async () => {
    await setupTestEnvironment();

    const staffDAD = await User.findOne({ username: 'staff_dad' });
    const staffMK = await User.findOne({ username: 'staff_mk' });
    const customer = await User.findOne({ username: 'customer_hoang' });
    const branchDAD = await Branch.findOne({ code: 'CN-DAD' });
    const branchMK = await Branch.findOne({ code: 'CN-MK' });
    const vehicle = await Vehicle.findOne({ branchId: branchDAD?._id });

    if (!staffDAD || !staffMK || !customer || !branchDAD || !branchMK || !vehicle) {
      throw new Error('Test fixtures missing in database');
    }

    branchDADId = branchDAD._id.toString();
    branchMKId = branchMK._id.toString();
    vehicleId = vehicle._id.toString();
    customerId = customer._id.toString();

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

    const now = new Date();
    // Create standard ongoing booking for checkout at branch DAD
    const ongoingBooking = await Booking.create({
      bookingCode: `MV-57ONG${Date.now().toString().slice(-4)}`,
      userId: customer._id,
      vehicleId: vehicle._id,
      pickupBranchId: branchDAD._id,
      returnBranchId: branchDAD._id,
      pickupDateTime: new Date(now.getTime() - 48 * 3600 * 1000),
      returnDateTime: new Date(now.getTime() + 24 * 3600 * 1000),
      totalAmount: 600000,
      depositAmount: 180000,
      remainingAmount: 420000,
      paidAmount: 180000,
      startOdometer: startOdo,
      startFuelLevel: '100%',
      status: 'Ongoing',
      depositStatus: 'Paid',
    });
    ongoingBookingId = ongoingBooking._id.toString();
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  it('TC-57-01: Should reject unauthenticated requests with 401', async () => {
    const res = await request(app)
      .put(`/api/bookings/${ongoingBookingId}/checkout`)
      .send({
        endOdometer: 3600,
        endFuelLevel: '100%',
        checkoutImages: validFourPhotos,
      });

    expect(res.status).toBe(401);
  });

  it('TC-57-02: Should reject Customer role with 403 Forbidden', async () => {
    const res = await request(app)
      .put(`/api/bookings/${ongoingBookingId}/checkout`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        endOdometer: 3600,
        endFuelLevel: '100%',
        checkoutImages: validFourPhotos,
      });

    expect(res.status).toBe(403);
  });

  it('TC-57-03: Should reject checkout if booking is not in Ongoing status with 409', async () => {
    const now = new Date();
    const confirmedBooking = await Booking.create({
      bookingCode: `MV-57CONF${Date.now().toString().slice(-4)}`,
      userId: customerId,
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
      .put(`/api/bookings/${confirmedBooking._id}/checkout`)
      .set('Authorization', `Bearer ${staffTokenDAD}`)
      .send({
        endOdometer: 3600,
        endFuelLevel: '100%',
        checkoutImages: validFourPhotos,
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('Ongoing');
  });

  it('TC-57-04: Should reject staff from different branch than return branch with 403', async () => {
    // booking return branch is CN-DAD, but staffTokenMK belongs to CN-MK
    const res = await request(app)
      .put(`/api/bookings/${ongoingBookingId}/checkout`)
      .set('Authorization', `Bearer ${staffTokenMK}`)
      .send({
        endOdometer: 3600,
        endFuelLevel: '100%',
        checkoutImages: validFourPhotos,
      });

    expect(res.status).toBe(403);
  });

  it('TC-57-05: Should reject endOdometer lower than startOdometer with 400', async () => {
    const res = await request(app)
      .put(`/api/bookings/${ongoingBookingId}/checkout`)
      .set('Authorization', `Bearer ${staffTokenDAD}`)
      .send({
        endOdometer: startOdo - 50, // lower than startOdo
        endFuelLevel: '100%',
        checkoutImages: validFourPhotos,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('nhỏ hơn ODO lúc nhận');
  });

  it('TC-57-06: Should reject checkout if fewer than 4 angle photos provided with 400', async () => {
    const res = await request(app)
      .put(`/api/bookings/${ongoingBookingId}/checkout`)
      .set('Authorization', `Bearer ${staffTokenDAD}`)
      .send({
        endOdometer: startOdo + 100,
        endFuelLevel: '100%',
        checkoutImages: ['https://example.com/one_angle.jpg'],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('4 góc ảnh');
  });

  it('TC-57-07: Should calculate overdue late fee at 30,000 VND per hour', async () => {
    const now = new Date();
    // Booking was due 2 hours and 30 minutes ago
    const overdueBooking = await Booking.create({
      bookingCode: `MV-57LATE${Date.now().toString().slice(-4)}`,
      userId: customerId,
      vehicleId,
      pickupBranchId: branchDADId,
      returnBranchId: branchDADId,
      pickupDateTime: new Date(now.getTime() - 72 * 3600 * 1000),
      returnDateTime: new Date(now.getTime() - 150 * 60 * 1000), // 2.5 hours overdue
      totalAmount: 500000,
      depositAmount: 150000,
      remainingAmount: 350000,
      paidAmount: 150000,
      startOdometer: startOdo,
      startFuelLevel: '100%',
      status: 'Ongoing',
    });

    const res = await request(app)
      .put(`/api/bookings/${overdueBooking._id}/checkout`)
      .set('Authorization', `Bearer ${staffTokenDAD}`)
      .send({
        endOdometer: startOdo + 120,
        endFuelLevel: '100%',
        damageFee: 50000,
        returnNotes: 'Trễ hẹn 3 giờ, xước nhẹ yếm',
        checkoutImages: validFourPhotos,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // 2.5 hours overdue -> Math.ceil(2.5) = 3 hours -> 3 * 30,000 = 90,000 VND late fee
    expect(res.body.data.lateFee).toBe(90000);
    expect(res.body.data.damageFee).toBe(50000);
    // Settlement = remaining (350,000) + lateFee (90,000) + damageFee (50,000) = 490,000 VND
    expect(res.body.data.settlementAmount).toBe(490000);
    expect(res.body.data.status).toBe('Completed');
  });

  it('TC-57-08: Should successfully execute checkout, award points, update vehicle, and write AuditLog', async () => {
    const endOdo = startOdo + 150;
    const initialCustomer = await User.findById(customerId);
    const initialPoints = initialCustomer?.loyaltyPoints || 0;

    const res = await request(app)
      .put(`/api/bookings/${ongoingBookingId}/checkout`)
      .set('Authorization', `Bearer ${staffTokenDAD}`)
      .send({
        endOdometer: endOdo,
        endFuelLevel: '100%',
        damageFee: 0,
        returnNotes: 'Xe hoàn hảo, trả đúng hạn',
        checkoutImages: validFourPhotos,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('Completed');
    expect(res.body.data.endOdometer).toBe(endOdo);
    expect(res.body.data.isPaid).toBe(true);
    expect(res.body.data.remainingAmount).toBe(0);

    // Verify database state: Booking updated
    const updatedBooking = await Booking.findById(ongoingBookingId);
    expect(updatedBooking?.status).toBe('Completed');
    expect(updatedBooking?.actualReturnDateTime).toBeDefined();
    expect(updatedBooking?.checkoutAt).toBeDefined();
    expect(updatedBooking?.checkoutBy).toBeDefined();
    expect(updatedBooking?.returnNotes).toBe('Xe hoàn hảo, trả đúng hạn');

    // Verify Vehicle updated
    const updatedVehicle = await Vehicle.findById(vehicleId);
    expect(updatedVehicle?.status).toBe('Available');
    expect(updatedVehicle?.odometer).toBe(endOdo);
    expect(updatedVehicle?.branchId.toString()).toBe(branchDADId);

    // Verify Loyalty points awarded (600,000 VND -> 60 points)
    const updatedCustomer = await User.findById(customerId);
    expect((updatedCustomer?.loyaltyPoints || 0)).toBe(initialPoints + 60);

    // Verify AuditLog written
    const audits = await AuditLog.find({
      entityId: ongoingBookingId,
      action: 'CHECKOUT_RETURN',
    });
    expect(audits.length).toBeGreaterThanOrEqual(1);
    expect(audits[0].details).toHaveProperty('endOdometer', endOdo);
    expect(audits[0].details).toHaveProperty('photosCount', 4);
  });
});
