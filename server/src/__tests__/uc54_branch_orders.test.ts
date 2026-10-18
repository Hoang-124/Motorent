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

describe('UC-54: Branch Orders Queue Management', () => {
  let staffTokenDAD: string;
  let customerToken: string;
  let branchDADId: string;
  let branchMKId: string;
  let todayBookingCode: string;
  let targetPlate: string;

  beforeAll(async () => {
    await setupTestEnvironment();

    const staffDAD = await User.findOne({ username: 'staff_dad' });
    const customer = await User.findOne({ username: 'customer_hoang' });
    const branchDAD = await Branch.findOne({ code: 'CN-DAD' });
    const branchMK = await Branch.findOne({ code: 'CN-MK' });
    const vehicleDAD = await Vehicle.findOne({ branchId: branchDAD?._id });

    if (!staffDAD || !customer || !branchDAD || !branchMK || !vehicleDAD) {
      throw new Error('Test fixtures missing in database');
    }

    branchDADId = branchDAD._id.toString();
    branchMKId = branchMK._id.toString();
    targetPlate = vehicleDAD.licensePlate;

    staffTokenDAD = jwt.sign(
      { userId: staffDAD._id.toString(), tokenVersion: staffDAD.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    customerToken = jwt.sign(
      { userId: customer._id.toString(), tokenVersion: customer.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const now = new Date();
    todayBookingCode = `MV-54TODAY${Date.now().toString().slice(-4)}`;

    // 1. Create a booking for today at branch DAD
    await Booking.create({
      bookingCode: todayBookingCode,
      userId: customer._id,
      vehicleId: vehicleDAD._id,
      pickupBranchId: branchDAD._id,
      returnBranchId: branchDAD._id,
      pickupDateTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0),
      returnDateTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0),
      totalAmount: 500000,
      depositAmount: 150000,
      remainingAmount: 350000,
      paidAmount: 150000,
      status: 'Confirmed',
      depositStatus: 'Paid',
    });

    // 2. Create an ongoing booking at branch DAD
    await Booking.create({
      bookingCode: `MV-54ONG${Date.now().toString().slice(-4)}`,
      userId: customer._id,
      vehicleId: vehicleDAD._id,
      pickupBranchId: branchDAD._id,
      returnBranchId: branchDAD._id,
      pickupDateTime: new Date(now.getTime() - 24 * 3600 * 1000),
      returnDateTime: new Date(now.getTime() + 48 * 3600 * 1000),
      totalAmount: 600000,
      depositAmount: 600000,
      remainingAmount: 0,
      paidAmount: 600000,
      status: 'Ongoing',
      depositStatus: 'Paid',
    });

    // 3. Create a booking for branch MK (different branch)
    await Booking.create({
      bookingCode: `MV-54MK${Date.now().toString().slice(-4)}`,
      userId: customer._id,
      vehicleId: vehicleDAD._id,
      pickupBranchId: branchMK._id,
      returnBranchId: branchMK._id,
      pickupDateTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0),
      returnDateTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 19, 0, 0),
      totalAmount: 700000,
      depositAmount: 210000,
      remainingAmount: 490000,
      paidAmount: 210000,
      status: 'Confirmed',
      depositStatus: 'Paid',
    });
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  it('TC-54-01: Should reject unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/bookings/branch');
    expect(res.status).toBe(401);
  });

  it('TC-54-02: Should reject Customer role with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/bookings/branch')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(403);
  });

  it('TC-54-03: Staff should only receive bookings for their assigned branch', async () => {
    const res = await request(app)
      .get('/api/bookings/branch')
      .set('Authorization', `Bearer ${staffTokenDAD}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    // All returned bookings must belong to branch DAD
    for (const b of res.body.data) {
      const pId = typeof b.pickupBranchId === 'object' ? b.pickupBranchId._id : b.pickupBranchId;
      const rId = typeof b.returnBranchId === 'object' ? b.returnBranchId._id : b.returnBranchId;
      expect([pId.toString(), rId.toString()]).toContain(branchDADId);
    }

    // Branch MK booking must not be present
    const hasMK = res.body.data.some((b: { bookingCode: string }) => b.bookingCode.startsWith('MV-54MK'));
    expect(hasMK).toBe(false);
  });

  it('TC-54-04: Should filter by queue=today', async () => {
    const res = await request(app)
      .get('/api/bookings/branch?queue=today')
      .set('Authorization', `Bearer ${staffTokenDAD}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const codes = res.body.data.map((b: { bookingCode: string }) => b.bookingCode);
    expect(codes).toContain(todayBookingCode);
  });

  it('TC-54-05: Should filter by status=Ongoing', async () => {
    const res = await request(app)
      .get('/api/bookings/branch?status=ongoing')
      .set('Authorization', `Bearer ${staffTokenDAD}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    for (const b of res.body.data) {
      expect(b.status).toBe('Ongoing');
    }
  });

  it('TC-54-06: Should search by bookingCode', async () => {
    const res = await request(app)
      .get(`/api/bookings/branch?search=${todayBookingCode}`)
      .set('Authorization', `Bearer ${staffTokenDAD}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].bookingCode).toBe(todayBookingCode);
  });

  it('TC-54-07: Should search by vehicle licensePlate', async () => {
    const res = await request(app)
      .get(`/api/bookings/branch?search=${targetPlate}`)
      .set('Authorization', `Bearer ${staffTokenDAD}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('TC-54-08: Should return aggregated counts in meta', async () => {
    const res = await request(app)
      .get('/api/bookings/branch')
      .set('Authorization', `Bearer ${staffTokenDAD}`);

    expect(res.status).toBe(200);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.counts).toBeDefined();
    expect(typeof res.body.meta.counts.total).toBe('number');
    expect(typeof res.body.meta.counts.today).toBe('number');
    expect(typeof res.body.meta.counts.confirmed).toBe('number');
    expect(typeof res.body.meta.counts.ongoing).toBe('number');
    expect(res.body.meta.counts.today).toBeGreaterThanOrEqual(1);
  });
});
