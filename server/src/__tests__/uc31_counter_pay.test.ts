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
import { Payment } from '../models/Payment';

describe('UC-31: Pay at Counter (Counter Desk Payment)', () => {
  let staffToken: string;
  let customerToken: string;
  let testBookingId: string;
  let testBookingCode: string;
  const totalAmount = 1000000; // 1,000,000 VND
  const depositAmount = 300000; // 300,000 VND (30%)
  const remainingAmount = 700000; // 700,000 VND (70%)

  beforeAll(async () => {
    await setupTestEnvironment();

    const staff = await User.findOne({ username: 'staff_dad' });
    const customer = await User.findOne({ username: 'customer_hoang' });
    const vehicle = await Vehicle.findOne({ status: 'Available' });
    const branchDAD = await Branch.findOne({ code: 'CN-DAD' });

    if (!staff || !customer || !vehicle || !branchDAD) {
      throw new Error('Test fixtures missing in database');
    }

    staffToken = jwt.sign(
      { userId: staff._id.toString(), tokenVersion: staff.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    customerToken = jwt.sign(
      { userId: customer._id.toString(), tokenVersion: customer.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const booking = await Booking.create({
      bookingCode: `MV-CP${Date.now().toString().slice(-6)}`,
      userId: customer._id,
      vehicleId: vehicle._id,
      pickupBranchId: branchDAD._id,
      returnBranchId: branchDAD._id,
      pickupDateTime: new Date(Date.now() + 24 * 3600 * 1000),
      returnDateTime: new Date(Date.now() + 72 * 3600 * 1000),
      totalAmount,
      depositAmount,
      remainingAmount,
      paidAmount: depositAmount,
      discountAmount: 0,
      lateFee: 0,
      damageFee: 0,
      loyaltyPointsEarned: 100,
      status: 'Confirmed',
      paymentMethod: 'Banking',
      isPaid: false,
      depositPaid: true,
      startOdometer: 12000,
    });

    testBookingId = booking._id.toString();
    testBookingCode = booking.bookingCode;
  }, 30000);

  afterAll(async () => {
    await mongoose.disconnect();
  }, 10000);

  it('1. Rejects unauthenticated request without token (401)', async () => {
    const res = await request(app)
      .put(`/api/bookings/${testBookingId}/counter-pay`)
      .send({ amount: remainingAmount });

    expect(res.status).toBe(401);
  });

  it('2. Rejects Customer role attempting to record counter payment (403 Forbidden)', async () => {
    const res = await request(app)
      .put(`/api/bookings/${testBookingId}/counter-pay`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ amount: remainingAmount });

    expect(res.status).toBe(403);
  });

  it('3. Rejects payment amount <= 0 or invalid body (400)', async () => {
    const res = await request(app)
      .put(`/api/bookings/${testBookingId}/counter-pay`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ amount: 0 });

    expect(res.status).toBe(400);
  });

  it('4. Rejects overpayment exceeding remaining amount (400)', async () => {
    const res = await request(app)
      .put(`/api/bookings/${testBookingId}/counter-pay`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ amount: remainingAmount + 50000 });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('vượt quá số dư còn lại');
  });

  it('5. Successfully records partial counter payment', async () => {
    const partialAmount = 200000;
    const res = await request(app)
      .put(`/api/bookings/${testBookingId}/counter-pay`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        amount: partialAmount,
        notes: 'Khách thanh toán một phần bằng tiền mặt',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.paidAmount).toBe(depositAmount + partialAmount);
    expect(res.body.data.remainingAmount).toBe(remainingAmount - partialAmount);
    expect(res.body.data.isPaid).toBe(false);

    // Verify Payment collection record
    const payment = await Payment.findOne({
      bookingId: testBookingId,
      type: 'COUNTER',
    });
    expect(payment).toBeTruthy();
    expect(payment?.amount).toBe(partialAmount);
    expect(payment?.status).toBe('SUCCESS');
  });

  it('6. Successfully records final 70% payment -> isPaid=true and remainingAmount=0', async () => {
    const finalAmount = remainingAmount - 200000; // 500,000 VND
    const res = await request(app)
      .put(`/api/bookings/${testBookingId}/counter-pay`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        amount: finalAmount,
        notes: 'Thu nốt số tiền còn lại tại quầy qua thẻ POS',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.paidAmount).toBe(totalAmount);
    expect(res.body.data.remainingAmount).toBe(0);
    expect(res.body.data.isPaid).toBe(true);
    expect(res.body.data.counterPaidBy).toBeTruthy();
  });

  it('7. Rejects subsequent payment attempts when already fully paid (400)', async () => {
    const res = await request(app)
      .put(`/api/bookings/${testBookingId}/counter-pay`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ amount: 100000 });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('đã được thanh toán toàn bộ');
  });
});
