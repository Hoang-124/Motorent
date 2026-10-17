import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { app } from '../server';
import { env } from '../config/env';
import { setupTestEnvironment } from './testHelper';
import { User } from '../models/User';
import { Vehicle } from '../models/Vehicle';
import { Branch } from '../models/Branch';
import { Booking } from '../models/Booking';
import { sortAndSignParams, getVnpSecretKey } from '../modules/payment/vnpayService';

describe('UC-29: Pay Deposit VNPay Integration Tests', () => {
  let customerToken: string;
  let testBookingId: string;
  let testBookingCode: string;
  let depositAmount: number;

  beforeAll(async () => {
    await setupTestEnvironment();

    const customer = await User.findOne({ username: 'customer_hoang' });
    customerToken = jwt.sign(
      { userId: customer!._id.toString(), tokenVersion: customer!.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const branches = await Branch.find({ isActive: true });
    const vehicle = await Vehicle.findOne({ status: 'Available' });

    const pickupDate = new Date();
    pickupDate.setDate(pickupDate.getDate() + 7);
    pickupDate.setHours(9, 0, 0, 0);

    const returnDate = new Date(pickupDate);
    returnDate.setDate(returnDate.getDate() + 2);
    returnDate.setHours(17, 0, 0, 0);

    // Create a test pending booking
    const booking = await Booking.create({
      bookingCode: 'MV-TEST29',
      userId: customer!._id,
      vehicleId: vehicle!._id,
      pickupBranchId: branches[0]._id,
      returnBranchId: branches[1]._id,
      pickupDateTime: pickupDate,
      returnDateTime: returnDate,
      totalAmount: 300000,
      depositAmount: 90000,
      remainingAmount: 210000,
      paymentMethod: 'Banking',
      status: 'Pending',
      isPaid: false,
      depositPaid: false,
    });

    testBookingId = booking._id.toString();
    testBookingCode = booking.bookingCode;
    depositAmount = booking.depositAmount;
  }, 30000);

  afterAll(async () => {
    await mongoose.disconnect();
  }, 10000);

  it('1. POST /api/payments/vnpay/create generates valid sandbox URL with HMAC-SHA512 hash', async () => {
    const res = await request(app)
      .post('/api/payments/vnpay/create')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        bookingId: testBookingId,
        paymentType: 'Deposit30',
        bankCode: 'NCB',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.paymentUrl).toContain('vnp_SecureHash=');
    expect(res.body.data.amount).toBe(depositAmount);
    expect(res.body.data.bookingCode).toBe(testBookingCode);
  });

  it('2. GET /api/payments/vnpay/ipn rejects webhook with tampered checksum (RspCode 97)', async () => {
    const res = await request(app)
      .get('/api/payments/vnpay/ipn')
      .query({
        vnp_TxnRef: testBookingCode,
        vnp_Amount: String(depositAmount * 100),
        vnp_ResponseCode: '00',
        vnp_TransactionStatus: '00',
        vnp_SecureHash: 'invalid_forged_hash',
      });

    expect(res.status).toBe(200);
    expect(res.body.RspCode).toBe('97');
  });

  it('3. GET /api/payments/vnpay/ipn rejects webhook with tampered amount (RspCode 04)', async () => {
    const secretKey = getVnpSecretKey();
    const tamperedAmount = (depositAmount + 50000) * 100;
    const params: Record<string, string | number> = {
      vnp_TxnRef: testBookingCode,
      vnp_Amount: tamperedAmount,
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
      vnp_TransactionNo: '14523999',
      vnp_BankCode: 'NCB',
      vnp_PayDate: '20261017120000',
    };

    const { secureHash } = sortAndSignParams(params, secretKey);
    params.vnp_SecureHash = secureHash;

    const res = await request(app)
      .get('/api/payments/vnpay/ipn')
      .query(params);

    expect(res.status).toBe(200);
    expect(res.body.RspCode).toBe('04');
  });

  it('4. GET /api/payments/vnpay/ipn successfully confirms 30% deposit payment and updates booking (RspCode 00)', async () => {
    const secretKey = getVnpSecretKey();
    const params: Record<string, string | number> = {
      vnp_TxnRef: testBookingCode,
      vnp_Amount: depositAmount * 100,
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
      vnp_TransactionNo: '14523999',
      vnp_BankCode: 'NCB',
      vnp_PayDate: '20261017120000',
    };

    const { secureHash } = sortAndSignParams(params, secretKey);
    params.vnp_SecureHash = secureHash;

    const res = await request(app)
      .get('/api/payments/vnpay/ipn')
      .query(params);

    expect(res.status).toBe(200);
    expect(res.body.RspCode).toBe('00');

    // Verify booking state in DB
    const updated = await Booking.findById(testBookingId);
    expect(updated?.status).toBe('Confirmed');
    expect(updated?.depositPaid).toBe(true);
    expect(updated?.vnpayTransactionNo).toBe('14523999');
  });

  it('5. GET /api/payments/vnpay/ipn handles idempotency for already confirmed order (RspCode 02)', async () => {
    const secretKey = getVnpSecretKey();
    const params: Record<string, string | number> = {
      vnp_TxnRef: testBookingCode,
      vnp_Amount: depositAmount * 100,
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
      vnp_TransactionNo: '14523999',
      vnp_BankCode: 'NCB',
      vnp_PayDate: '20261017120000',
    };

    const { secureHash } = sortAndSignParams(params, secretKey);
    params.vnp_SecureHash = secureHash;

    const res = await request(app)
      .get('/api/payments/vnpay/ipn')
      .query(params);

    expect(res.status).toBe(200);
    expect(res.body.RspCode).toBe('02');
  });

  it('6. GET /api/payments/vnpay/return verifies client return data correctly', async () => {
    const secretKey = getVnpSecretKey();
    const params: Record<string, string | number> = {
      vnp_TxnRef: testBookingCode,
      vnp_Amount: depositAmount * 100,
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
      vnp_TransactionNo: '14523999',
      vnp_BankCode: 'NCB',
      vnp_PayDate: '20261017120000',
    };

    const { secureHash } = sortAndSignParams(params, secretKey);
    params.vnp_SecureHash = secureHash;

    const res = await request(app)
      .get('/api/payments/vnpay/return')
      .query(params);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isValid).toBe(true);
    expect(res.body.data.isSuccess).toBe(true);
  });
});
