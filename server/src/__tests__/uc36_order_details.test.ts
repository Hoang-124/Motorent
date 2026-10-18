import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { app } from '../server';
import { env } from '../config/env';
import { setupTestEnvironment } from './testHelper';
import { Booking } from '../models/Booking';
import { Vehicle } from '../models/Vehicle';
import { Branch } from '../models/Branch';
import { User } from '../models/User';

describe('UC-36: Order Details (Timeline, Pricing, Actions)', () => {
  let customerToken: string;
  let otherCustomerToken: string;
  let customerUser: any;
  let otherUser: any;
  let vehicleDoc: any;
  let branchDAD: any;
  let testBooking: any;

  beforeAll(async () => {
    await setupTestEnvironment();

    customerUser = await User.findOne({ username: 'customer_hoang' });
    otherUser = await User.findOne({ roles: 'Customer', username: { $ne: 'customer_hoang' } });
    vehicleDoc = await Vehicle.findOne({ status: 'Available' });
    branchDAD = await Branch.findOne({ code: 'CN-DAD' });

    if (!customerUser || !otherUser || !vehicleDoc || !branchDAD) {
      throw new Error('Test fixtures missing in database');
    }

    customerToken = jwt.sign(
      { userId: customerUser._id.toString(), tokenVersion: customerUser.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    otherCustomerToken = jwt.sign(
      { userId: otherUser._id.toString(), tokenVersion: otherUser.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const now = Date.now();
    const pickup = new Date(now + 24 * 3600 * 1000);
    const returnDate = new Date(pickup.getTime() + 48 * 3600 * 1000);
    const totalAmount = 600000;

    testBooking = await Booking.create({
      bookingCode: `MV-DTL${now.toString().slice(-5)}`,
      userId: customerUser._id,
      vehicleId: vehicleDoc._id,
      pickupBranchId: branchDAD._id,
      returnBranchId: branchDAD._id,
      pickupDateTime: pickup,
      returnDateTime: returnDate,
      totalAmount,
      depositAmount: 180000,
      remainingAmount: 420000,
      paidAmount: 180000,
      status: 'Confirmed',
      paymentMethod: 'Banking',
      isPaid: false,
      depositPaid: true,
      startOdometer: 14500,
    });
  });

  afterAll(async () => {
    if (testBooking?._id) {
      await Booking.deleteOne({ _id: testBooking._id });
    }
  });

  it('1. Rejects unauthenticated request with 401', async () => {
    const res = await request(app).get(`/api/bookings/${testBooking._id}`);
    expect(res.status).toBe(401);
  });

  it('2. Rejects unauthorized customer access to another user booking with 403', async () => {
    const res = await request(app)
      .get(`/api/bookings/${testBooking._id}`)
      .set('Authorization', `Bearer ${otherCustomerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('3. Returns 404 for non-existent booking ID', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`/api/bookings/${fakeId}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(404);
  });

  it('4. Successfully returns booking details with timeline, pricing, and actions', async () => {
    const res = await request(app)
      .get(`/api/bookings/${testBooking._id}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    const data = res.body.data;
    expect(data.bookingCode).toBe(testBooking.bookingCode);

    // Verify Timeline
    expect(Array.isArray(data.timeline)).toBe(true);
    expect(data.timeline.length).toBeGreaterThanOrEqual(5);
    const createdStep = data.timeline.find((t: any) => t.key === 'created');
    const depositStep = data.timeline.find((t: any) => t.key === 'deposit');
    const confirmedStep = data.timeline.find((t: any) => t.key === 'confirmed');
    expect(createdStep?.isCompleted).toBe(true);
    expect(depositStep?.isCompleted).toBe(true);
    expect(confirmedStep?.isCompleted).toBe(true);

    // Verify Pricing Breakdown
    expect(data.pricing).toBeDefined();
    expect(data.pricing.totalAmount).toBe(600000);
    expect(data.pricing.depositAmount).toBe(180000);
    expect(data.pricing.remainingAmount).toBe(420000);
    expect(data.pricing.paidAmount).toBe(180000);
    expect(data.pricing.depositPaid).toBe(true);
    expect(data.pricing.isPaid).toBe(false);
    expect(data.pricing.durationDays).toBe(2);

    // Verify Available Actions
    expect(data.actions).toBeDefined();
    expect(data.actions.canCancel).toBe(true);
    expect(data.actions.canExtend).toBe(true);
    expect(data.actions.canPayFull).toBe(true);
    expect(data.actions.canPayDeposit).toBe(false); // already paid deposit
  });

  it('5. Lookup by code (/api/bookings/code/:code) requires staff role and returns enriched details', async () => {
    // Customer is forbidden on staff lookup endpoint
    const custRes = await request(app)
      .get(`/api/bookings/code/${testBooking.bookingCode}`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(custRes.status).toBe(403);

    // Staff succeeds and receives enriched details
    const staffUser = await User.findOne({ roles: 'Staff' });
    if (staffUser) {
      const staffToken = jwt.sign(
        { userId: staffUser._id.toString(), tokenVersion: staffUser.tokenVersion || 0 },
        env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const staffRes = await request(app)
        .get(`/api/bookings/code/${testBooking.bookingCode}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(staffRes.status).toBe(200);
      expect(staffRes.body.success).toBe(true);
      expect(staffRes.body.data.timeline).toBeDefined();
      expect(staffRes.body.data.pricing).toBeDefined();
      expect(staffRes.body.data.actions).toBeDefined();
    }
  });
});
