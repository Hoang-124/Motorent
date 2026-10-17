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
import { sortAndSignParams } from '../modules/payment/vnpayService';

describe('UC-30: Pay Full Online (100% VNPay Flow)', () => {
  let customerToken: string;
  let testBookingId: string;
  let testBookingCode: string;
  const totalAmount = 1500000; // 1,500,000 VND total
  const depositAmount = 450000; // 450,000 VND (30%)
  const TEST_SECRET = env.VNP_HASHSECRET || 'DEMO_SECRET';

  beforeAll(async () => {
    await setupTestEnvironment();

    const customer = await User.findOne({ username: 'customer_hoang' });
    const vehicle = await Vehicle.findOne({ status: 'Available' });
    const branchDAD = await Branch.findOne({ code: 'CN-DAD' });

    if (!customer || !vehicle || !branchDAD) {
      throw new Error('Test fixtures missing in database');
    }

    customerToken = jwt.sign(
      { userId: customer._id.toString(), tokenVersion: customer.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const booking = await Booking.create({
      bookingCode: `MV-FULL${Date.now().toString().slice(-6)}`,
      userId: customer._id,
      vehicleId: vehicle._id,
      pickupBranchId: branchDAD._id,
      returnBranchId: branchDAD._id,
      pickupDateTime: new Date(Date.now() + 24 * 3600 * 1000),
      returnDateTime: new Date(Date.now() + 72 * 3600 * 1000),
      totalAmount,
      depositAmount,
      remainingAmount: totalAmount - depositAmount,
      paidAmount: 0,
      discountAmount: 0,
      lateFee: 0,
      damageFee: 0,
      loyaltyPointsEarned: 150,
      status: 'Pending',
      paymentMethod: 'Banking',
      isPaid: false,
      depositPaid: false,
      startOdometer: 8500,
    });

    testBookingId = booking._id.toString();
    testBookingCode = booking.bookingCode;
  }, 30000);

  afterAll(async () => {
    await mongoose.disconnect();
  }, 10000);

  it('1. POST /api/payments/vnpay/create with paymentType=Full100 generates URL for 100% total amount', async () => {
    const res = await request(app)
      .post('/api/payments/vnpay/create')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        bookingId: testBookingId,
        paymentType: 'Full100',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.amount).toBe(totalAmount);
    expect(res.body.data.paymentType).toBe('Full100');
    expect(res.body.data.paymentUrl).toContain(`vnp_Amount=${totalAmount * 100}`);
    expect(res.body.data.paymentUrl).toContain('vnp_SecureHash=');

    // Verify booking state
    const booking = await Booking.findById(testBookingId);
    expect(booking?.paymentType).toBe('Full100');
  });

  it('2. IPN rejects forged checksum with RspCode 97', async () => {
    const res = await request(app)
      .get('/api/payments/vnpay/ipn')
      .query({
        vnp_TxnRef: testBookingCode,
        vnp_Amount: String(totalAmount * 100),
        vnp_ResponseCode: '00',
        vnp_TransactionStatus: '00',
        vnp_SecureHash: 'invalid_hash_signature',
      });

    expect(res.status).toBe(200);
    expect(res.body.RspCode).toBe('97');
  });

  it('3. IPN rejects tampered amount (sending 30% deposit when Full100 expected) with RspCode 04', async () => {
    const tamperedAmount = depositAmount * 100;
    const rawParams: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: env.VNP_TMNCODE || 'DEMO_CODE',
      vnp_TxnRef: testBookingCode,
      vnp_Amount: String(tamperedAmount),
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
      vnp_TransactionNo: '14889988',
      vnp_BankCode: 'NCB',
      vnp_PayDate: '20261017150000',
    };

    const { secureHash } = sortAndSignParams(rawParams, TEST_SECRET);
    const res = await request(app)
      .get('/api/payments/vnpay/ipn')
      .query({ ...rawParams, vnp_SecureHash: secureHash });

    expect(res.status).toBe(200);
    expect(res.body.RspCode).toBe('04');
    expect(res.body.Message).toContain('Invalid amount');
  });

  it('4. IPN confirms 100% full payment: status=Confirmed, isPaid=true, remainingAmount=0', async () => {
    const rawParams: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: env.VNP_TMNCODE || 'DEMO_CODE',
      vnp_TxnRef: testBookingCode,
      vnp_Amount: String(totalAmount * 100),
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
      vnp_TransactionNo: '14998877',
      vnp_BankCode: 'NCB',
      vnp_PayDate: '20261017150500',
    };

    const { secureHash } = sortAndSignParams(rawParams, TEST_SECRET);
    const res = await request(app)
      .get('/api/payments/vnpay/ipn')
      .query({ ...rawParams, vnp_SecureHash: secureHash });

    expect(res.status).toBe(200);
    expect(res.body.RspCode).toBe('00');
    expect(res.body.Message).toBe('Confirm Success');

    // Verify booking updated in database
    const booking = await Booking.findById(testBookingId);
    expect(booking?.status).toBe('Confirmed');
    expect(booking?.isPaid).toBe(true);
    expect(booking?.depositPaid).toBe(true);
    expect(booking?.paidAmount).toBe(totalAmount);
    expect(booking?.remainingAmount).toBe(0);
    expect(booking?.vnpayTransactionNo).toBe('14998877');

    // Verify Payment row in collection
    const payment = await Payment.findOne({
      bookingId: testBookingId,
      type: 'FULL',
      status: 'SUCCESS',
    });
    expect(payment).toBeTruthy();
    expect(payment?.amount).toBe(totalAmount);
  });

  it('5. Rejects subsequent payment URL creation when booking already fully paid (400)', async () => {
    const res = await request(app)
      .post('/api/payments/vnpay/create')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        bookingId: testBookingId,
        paymentType: 'Full100',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('đã được thanh toán hoàn tất');
  });

  it('6. GET /api/payments/vnpay/return verifies valid return URL with Full100 data', async () => {
    const returnParams: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: env.VNP_TMNCODE || 'DEMO_CODE',
      vnp_TxnRef: testBookingCode,
      vnp_Amount: String(totalAmount * 100),
      vnp_ResponseCode: '00',
      vnp_TransactionNo: '14998877',
      vnp_BankCode: 'NCB',
    };

    const { secureHash } = sortAndSignParams(returnParams, TEST_SECRET);
    const res = await request(app)
      .get('/api/payments/vnpay/return')
      .query({ ...returnParams, vnp_SecureHash: secureHash });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isSuccess).toBe(true);
    expect(res.body.data.amount).toBe(totalAmount);
    expect(res.body.data.booking.isPaid).toBe(true);
  });
});
