import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../server';
import { setupTestEnvironment, teardownTestEnvironment } from './testHelper';
import { Booking } from '../models/Booking';
import { Vehicle } from '../models/Vehicle';
import { Branch } from '../models/Branch';
import { User } from '../models/User';
import { env } from '../config/env';
import { sortAndSignParams, verifyVnPayChecksum } from '../modules/payment/vnpayService';

let customerToken: string;
let customerUserId: mongoose.Types.ObjectId;
let testBookingId: string;
let testBookingCode = 'MV-TESTVNPAY';
const depositAmount = 90000;
const totalAmount = 300000;

const TEST_SECRET = env.VNP_HASHSECRET || 'DEMO_SECRET';

beforeAll(async () => {
  await setupTestEnvironment();

  // Login as Customer
  const customerRes = await request(app)
    .post('/api/auth/login')
    .send({ identifier: 'customer_hoang', password: 'Customer@123456' });
  customerToken = customerRes.body?.data?.token;

  const customerUser = await User.findOne({ username: 'customer_hoang' });
  customerUserId = customerUser!._id;

  const branches = await Branch.find();
  const pickupBranchId = branches[0]._id;
  const returnBranchId = branches[1] ? branches[1]._id : branches[0]._id;
  const vehicle = await Vehicle.findOne({ status: 'Available' });

  // Clean previous test booking if any
  await Booking.deleteMany({ bookingCode: testBookingCode });

  // Create dedicated test booking
  const newBooking = await Booking.create({
    bookingCode: testBookingCode,
    userId: customerUserId,
    vehicleId: vehicle!._id,
    pickupBranchId,
    returnBranchId,
    pickupDateTime: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    returnDateTime: new Date(Date.now() + 32 * 24 * 3600 * 1000),
    totalAmount,
    depositAmount,
    remainingAmount: totalAmount - depositAmount,
    discountAmount: 0,
    lateFee: 0,
    damageFee: 0,
    loyaltyPointsEarned: 0,
    status: 'Pending',
    paymentMethod: 'Banking',
    isPaid: false,
    startOdometer: 1000,
  });

  testBookingId = newBooking._id.toString();
});

describe('UC-29 & UC-30: VNPay Payment Integration & IPN Webhook', () => {
  it('1. Secure Hash & Checksum calculation correctly sorts params and generates HMAC-SHA512', () => {
    const rawParams = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: 'DEMO_CODE',
      vnp_Amount: '30000000',
      vnp_TxnRef: 'MV-TEST01',
      vnp_OrderInfo: 'Thanh toan coc 30% don thue MV-TEST01',
    };

    const { secureHash, signData } = sortAndSignParams(rawParams, TEST_SECRET);
    expect(secureHash).toBeDefined();
    expect(secureHash.length).toBe(128); // SHA512 produces 128-hex char digest
    expect(signData).toContain('vnp_Amount=30000000');
    expect(signData.indexOf('vnp_Amount')).toBeLessThan(signData.indexOf('vnp_Command'));

    // Checksum verification
    const verified = verifyVnPayChecksum({ ...rawParams, vnp_SecureHash: secureHash }, TEST_SECRET);
    expect(verified).toBe(true);

    // Tampered checksum should fail
    const tampered = verifyVnPayChecksum({ ...rawParams, vnp_Amount: '1000', vnp_SecureHash: secureHash }, TEST_SECRET);
    expect(tampered).toBe(false);
  });

  it('2. POST /api/payments/vnpay/create - Generates valid VNPay redirect URL for deposit', async () => {
    const res = await request(app)
      .post('/api/payments/vnpay/create')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        bookingId: testBookingId,
        paymentType: 'Deposit30',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.paymentUrl).toContain('https://sandbox.vnpayment.vn');
    expect(res.body.data.paymentUrl).toContain('vnp_SecureHash=');
    expect(res.body.data.amount).toBe(depositAmount);
    expect(res.body.data.bookingCode).toBe(testBookingCode);
  });

  it('3. GET /api/payments/vnpay/ipn - Rejects IPN with invalid checksum (RspCode 97)', async () => {
    const res = await request(app)
      .get('/api/payments/vnpay/ipn')
      .query({
        vnp_TxnRef: testBookingCode,
        vnp_Amount: String(depositAmount * 100),
        vnp_ResponseCode: '00',
        vnp_SecureHash: 'INVALID_HASH_VALUE_HERE',
      });

    expect(res.status).toBe(200);
    expect(res.body.RspCode).toBe('97');
    expect(res.body.Message).toContain('Checksum failed');
  });

  it('4. GET /api/payments/vnpay/ipn - Rejects IPN when amount is tampered (RspCode 04)', async () => {
    const tamperedParams: Record<string, string> = {
      vnp_TxnRef: testBookingCode,
      vnp_Amount: '100000', // Only 1,000 VND instead of depositAmount * 100
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
      vnp_TransactionNo: '14523999',
    };
    const { secureHash } = sortAndSignParams(tamperedParams, TEST_SECRET);
    tamperedParams.vnp_SecureHash = secureHash;

    const res = await request(app)
      .get('/api/payments/vnpay/ipn')
      .query(tamperedParams);

    expect(res.status).toBe(200);
    expect(res.body.RspCode).toBe('04');
    expect(res.body.Message).toContain('Invalid amount');
  });

  it('5. GET /api/payments/vnpay/ipn - Successfully confirms booking on valid payment (RspCode 00)', async () => {
    const validParams: Record<string, string> = {
      vnp_TxnRef: `${testBookingCode}__${Date.now()}`,
      vnp_Amount: String(depositAmount * 100),
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
      vnp_TransactionNo: '14889922',
      vnp_BankCode: 'NCB',
      vnp_PayDate: '20261014193000',
    };
    const { secureHash } = sortAndSignParams(validParams, TEST_SECRET);
    validParams.vnp_SecureHash = secureHash;

    const res = await request(app)
      .get('/api/payments/vnpay/ipn')
      .query(validParams);

    expect(res.status).toBe(200);
    expect(res.body.RspCode).toBe('00');
    expect(res.body.Message).toContain('Confirm Success');

    // Verify DB updated
    const updatedBooking = await Booking.findById(testBookingId);
    expect(updatedBooking?.isPaid).toBe(true);
    expect(updatedBooking?.status).toBe('Confirmed');
    expect(updatedBooking?.vnpayTransactionNo).toBe('14889922');
  });

  it('6. GET /api/payments/vnpay/ipn - Handles idempotency (RspCode 02 when already confirmed)', async () => {
    const validParams: Record<string, string> = {
      vnp_TxnRef: `${testBookingCode}__${Date.now()}`,
      vnp_Amount: String(depositAmount * 100),
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
      vnp_TransactionNo: '14889922',
    };
    const { secureHash } = sortAndSignParams(validParams, TEST_SECRET);
    validParams.vnp_SecureHash = secureHash;

    // Call IPN a second time
    const res = await request(app)
      .get('/api/payments/vnpay/ipn')
      .query(validParams);

    expect(res.status).toBe(200);
    expect(res.body.RspCode).toBe('02');
    expect(res.body.Message).toContain('Order already confirmed');
  });

  it('7. GET /api/payments/vnpay/return - Verifies redirect params for frontend receipt', async () => {
    const returnParams: Record<string, string> = {
      vnp_TxnRef: testBookingCode,
      vnp_Amount: String(depositAmount * 100),
      vnp_ResponseCode: '00',
      vnp_TransactionNo: '14889922',
      vnp_BankCode: 'NCB',
    };
    const { secureHash } = sortAndSignParams(returnParams, TEST_SECRET);
    returnParams.vnp_SecureHash = secureHash;

    const res = await request(app)
      .get('/api/payments/vnpay/return')
      .query(returnParams);

    expect(res.body.success).toBe(true);
    expect(res.body.data.isSuccess).toBe(true);
    expect(res.body.data.bookingCode).toBe(testBookingCode);
  });

  afterAll(async () => {
    if (testBookingId) {
      await Booking.findByIdAndDelete(testBookingId);
    }
    await teardownTestEnvironment();
  });
});

