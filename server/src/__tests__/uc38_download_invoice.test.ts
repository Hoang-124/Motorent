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

describe('UC-38: Download Invoice Integration Tests (GET /api/bookings/:id/invoice)', () => {
  let customerOwnerToken: string;
  let otherCustomerToken: string;
  let staffDadToken: string;
  let staffMkToken: string;
  let adminToken: string;

  let branchDad: any;
  let branchMk: any;
  let customerOwner: any;
  let otherCustomer: any;
  let testVehicle: any;
  let testBooking: any;

  beforeAll(async () => {
    await setupTestEnvironment();

    branchDad = await Branch.findOne({ code: 'CN-DAD' });
    branchMk = await Branch.findOne({ code: 'CN-MK' });
    customerOwner = await User.findOne({ username: 'customer_hoang' });
    otherCustomer = await User.findOne({ username: 'customer_tuan' });
    testVehicle = await Vehicle.findOne({ status: 'Available' });

    const staffDad = await User.findOne({ username: 'staff_dad' });
    const staffMk = await User.findOne({ username: 'staff_mk' });
    const admin = await User.findOne({ username: 'admin' });

    customerOwnerToken = jwt.sign(
      { userId: customerOwner._id.toString(), tokenVersion: customerOwner.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    otherCustomerToken = jwt.sign(
      { userId: otherCustomer._id.toString(), tokenVersion: otherCustomer.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    staffDadToken = jwt.sign(
      { userId: staffDad!._id.toString(), tokenVersion: staffDad!.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    staffMkToken = jwt.sign(
      { userId: staffMk!._id.toString(), tokenVersion: staffMk!.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    adminToken = jwt.sign(
      { userId: admin!._id.toString(), tokenVersion: admin!.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Create a confirmed booking with deposit paid
    testBooking = await Booking.create({
      bookingCode: 'MTR-INVOICE-001',
      userId: customerOwner._id,
      vehicleId: testVehicle._id,
      pickupBranchId: branchDad._id,
      returnBranchId: branchDad._id,
      pickupDateTime: new Date(Date.now() + 86400000 * 2),
      returnDateTime: new Date(Date.now() + 86400000 * 4),
      dailyPrice: 150000,
      totalAmount: 300000,
      depositAmount: 90000,
      remainingAmount: 210000,
      paidAmount: 90000,
      discountAmount: 0,
      lateFee: 0,
      damageFee: 0,
      loyaltyPointsEarned: 0,
      startOdometer: 3200,
      status: 'Confirmed',
      depositPaid: true,
      isPaid: false,
      paymentMethod: 'Banking',
    });
  }, 30000);

  afterAll(async () => {
    if (testBooking) {
      await Booking.deleteOne({ _id: testBooking._id });
    }
    await teardownTestEnvironment();
  }, 10000);

  it('1. Returns 401 Unauthorized when unauthenticated', async () => {
    const res = await request(app)
      .get(`/api/bookings/${testBooking._id}/invoice`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('2. Returns 403 Forbidden when a customer attempts to access an invoice of another user', async () => {
    const res = await request(app)
      .get(`/api/bookings/${testBooking._id}/invoice`)
      .set('Authorization', `Bearer ${otherCustomerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/khách hàng khác/i);
  });

  it('3. Returns 404 when booking does not exist', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    const res = await request(app)
      .get(`/api/bookings/${fakeId}/invoice`)
      .set('Authorization', `Bearer ${customerOwnerToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('4. Successfully downloads PDF invoice when requested by booking owner (Customer)', async () => {
    const res = await request(app)
      .get(`/api/bookings/${testBooking._id}/invoice`)
      .set('Authorization', `Bearer ${customerOwnerToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain(`MOTORENT-INVOICE-${testBooking.bookingCode}.pdf`);

    // Verify PDF binary signature (%PDF-)
    const buffer = res.body as Buffer;
    expect(buffer.toString('utf-8', 0, 5)).toBe('%PDF-');
  });

  it('5. Successfully downloads PDF invoice when requested by assigned Branch Staff (staff_dad)', async () => {
    const res = await request(app)
      .get(`/api/bookings/${testBooking._id}/invoice`)
      .set('Authorization', `Bearer ${staffDadToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');

    const buffer = res.body as Buffer;
    expect(buffer.toString('utf-8', 0, 5)).toBe('%PDF-');
  });

  it('6. Returns 403 Forbidden when staff from unrelated branch (staff_mk) attempts to download invoice', async () => {
    const res = await request(app)
      .get(`/api/bookings/${testBooking._id}/invoice`)
      .set('Authorization', `Bearer ${staffMkToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/chi nhánh/i);
  });

  it('7. Successfully downloads PDF invoice when requested by SystemAdmin', async () => {
    const res = await request(app)
      .get(`/api/bookings/${testBooking._id}/invoice`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');

    const buffer = res.body as Buffer;
    expect(buffer.toString('utf-8', 0, 5)).toBe('%PDF-');
  });
});
