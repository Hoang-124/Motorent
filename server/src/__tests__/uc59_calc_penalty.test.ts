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

describe('UC-59: Auto-Calculate Penalty (Late Fee 30k/hr Ceil + Damage Fee)', () => {
  let staffTokenDAD: string;
  let customerToken: string;
  let otherCustomerToken: string;
  let testBookingId: string;
  let scheduledReturnDate: Date;
  const remaining = 350000;

  beforeAll(async () => {
    await setupTestEnvironment();

    const staffDAD = await User.findOne({ username: 'staff_dad' });
    const customer = await User.findOne({ username: 'customer_hoang' });
    const branchDAD = await Branch.findOne({ code: 'CN-DAD' });
    const vehicle = await Vehicle.findOne({ branchId: branchDAD?._id });

    if (!staffDAD || !customer || !branchDAD || !vehicle) {
      throw new Error('Test fixtures missing in database');
    }

    // Create another customer to test unauthorized access
    let otherCustomer = await User.findOne({ username: 'customer_other_59' });
    if (!otherCustomer) {
      otherCustomer = await User.create({
        username: 'customer_other_59',
        email: 'other59@motorent.vn',
        passwordHash: 'dummy_hash',
        firstName: 'Người Khác',
        lastName: 'Khách',
        phoneNumber: '0966777888',
        roles: 'Customer',
        status: 'Active',
        identityStatus: 'Verified',
        tokenVersion: 0,
      });
    }

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

    otherCustomerToken = jwt.sign(
      { userId: otherCustomer._id.toString(), tokenVersion: otherCustomer.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const now = new Date();
    scheduledReturnDate = new Date(now.getTime() + 2 * 3600 * 1000); // 2 hours from now

    const booking = await Booking.create({
      bookingCode: `MV-59PEN${Date.now().toString().slice(-4)}`,
      userId: customer._id,
      vehicleId: vehicle._id,
      pickupBranchId: branchDAD._id,
      returnBranchId: branchDAD._id,
      pickupDateTime: new Date(now.getTime() - 24 * 3600 * 1000),
      returnDateTime: scheduledReturnDate,
      totalAmount: 500000,
      depositAmount: 150000,
      remainingAmount: remaining,
      paidAmount: 150000,
      startOdometer: 3500,
      damageFee: 0,
      status: 'Ongoing',
    });
    testBookingId = booking._id.toString();
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  it('TC-59-01: Should reject unauthenticated requests with 401', async () => {
    const res = await request(app).get(`/api/bookings/${testBookingId}/penalty`);
    expect(res.status).toBe(401);
  });

  it('TC-59-02: Should reject another Customer attempting to view someone elses booking penalty with 403', async () => {
    const res = await request(app)
      .get(`/api/bookings/${testBookingId}/penalty`)
      .set('Authorization', `Bearer ${otherCustomerToken}`);

    expect(res.status).toBe(403);
  });

  it('TC-59-03: Should return 0 late fee when return is on-time (before scheduled return)', async () => {
    const onTime = new Date(scheduledReturnDate.getTime() - 30 * 60 * 1000); // 30 mins before
    const res = await request(app)
      .get(`/api/bookings/${testBookingId}/penalty?simulatedReturnTime=${onTime.toISOString()}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isOverdue).toBe(false);
    expect(res.body.data.lateHoursCeil).toBe(0);
    expect(res.body.data.lateFee).toBe(0);
    expect(res.body.data.totalPenalty).toBe(0);
    expect(res.body.data.totalSettlementDue).toBe(remaining);
  });

  it('TC-59-04: Should return 0 late fee when return is within 15-minute grace period', async () => {
    const withinGrace = new Date(scheduledReturnDate.getTime() + 10 * 60 * 1000); // 10 mins late (< 15 mins)
    const res = await request(app)
      .get(`/api/bookings/${testBookingId}/penalty?simulatedReturnTime=${withinGrace.toISOString()}`)
      .set('Authorization', `Bearer ${staffTokenDAD}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isOverdue).toBe(false);
    expect(res.body.data.lateFee).toBe(0);
  });

  it('TC-59-05: Should calculate 1 hour late fee (30,000 VND) when 25 minutes overdue', async () => {
    // 25 mins overdue -> beyond 15 min grace -> Math.ceil(25/60) = 1 hour -> 30,000 VND
    const late25Mins = new Date(scheduledReturnDate.getTime() + 25 * 60 * 1000);
    const res = await request(app)
      .get(`/api/bookings/${testBookingId}/penalty?simulatedReturnTime=${late25Mins.toISOString()}`)
      .set('Authorization', `Bearer ${staffTokenDAD}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isOverdue).toBe(true);
    expect(res.body.data.lateHoursCeil).toBe(1);
    expect(res.body.data.lateFee).toBe(30000);
    expect(res.body.data.totalSettlementDue).toBe(remaining + 30000);
  });

  it('TC-59-06: Should calculate 3 hours late fee (90,000 VND) when 2 hours 15 minutes overdue', async () => {
    // 135 mins overdue -> Math.ceil(135/60) = 3 hours -> 90,000 VND
    const late135Mins = new Date(scheduledReturnDate.getTime() + 135 * 60 * 1000);
    const res = await request(app)
      .get(`/api/bookings/${testBookingId}/penalty?simulatedReturnTime=${late135Mins.toISOString()}`)
      .set('Authorization', `Bearer ${staffTokenDAD}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isOverdue).toBe(true);
    expect(res.body.data.lateHoursCeil).toBe(3);
    expect(res.body.data.lateFee).toBe(90000);
  });

  it('TC-59-07: Should calculate totalPenalty = lateFee + damageFee and totalSettlementDue', async () => {
    const late135Mins = new Date(scheduledReturnDate.getTime() + 135 * 60 * 1000);
    const damageFee = 150000;

    const res = await request(app)
      .post(`/api/bookings/${testBookingId}/penalty/preview`)
      .set('Authorization', `Bearer ${staffTokenDAD}`)
      .send({
        simulatedReturnTime: late135Mins.toISOString(),
        damageFee,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.lateFee).toBe(90000);
    expect(res.body.data.damageFee).toBe(150000);
    // Total penalty = 90,000 + 150,000 = 240,000 VND
    expect(res.body.data.totalPenalty).toBe(240000);
    // Total settlement due = remaining (350,000) + 240,000 = 590,000 VND
    expect(res.body.data.totalSettlementDue).toBe(remaining + 240000);
  });
});
