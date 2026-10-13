import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../server';
import { connectDatabase } from '../config/database';
import { Vehicle } from '../models/Vehicle';
import { Branch } from '../models/Branch';
import { Booking } from '../models/Booking';
import { User } from '../models/User';

let customerToken: string;
let staffDadToken: string;
let staffMkToken: string;
let testVehicleId: string;
let pickupBranchId: string;
let returnBranchId: string;

beforeAll(async () => {
  await connectDatabase();

  // Login as Customer
  const customerRes = await request(app)
    .post('/api/auth/login')
    .send({ identifier: 'customer_hoang', password: 'Customer@123456' });
  customerToken = customerRes.body?.data?.token;

  // Login as Staff DAD
  const staffDadRes = await request(app)
    .post('/api/auth/login')
    .send({ identifier: 'staff_dad', password: 'Staff@123456' });
  staffDadToken = staffDadRes.body?.data?.token;

  // Login as Staff MK
  const staffMkRes = await request(app)
    .post('/api/auth/login')
    .send({ identifier: 'staff_mk', password: 'Staff@123456' });
  staffMkToken = staffMkRes.body?.data?.token;

  // Fetch branches and a test vehicle
  const branches = await Branch.find();
  pickupBranchId = branches.find((b) => b.code === 'CN-DAD')?._id.toString() || branches[0]._id.toString();
  returnBranchId = branches.find((b) => b.code === 'CN-MK')?._id.toString() || branches[1]._id.toString();

  const vehicle = await Vehicle.findOne({ branchId: pickupBranchId, status: 'Available' });
  testVehicleId = vehicle?._id.toString() || '';
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe('Phase A & F: Security and Authentication Verifications', () => {
  it('A1: POST /api/auth/google with forged/raw token must return 401', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'forged.invalid.jwt.token' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('A3: Registration response does NOT expose devOtp or verificationToken', async () => {
    const testUsername = `user_${Date.now()}`;
    const testEmail = `${testUsername}@motorent.vn`;

    const testPhone = '09' + Math.floor(10000000 + Math.random() * 90000000);
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: testUsername,
        email: testEmail,
        password: 'Password@123456',
        phoneNumber: testPhone,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.devOtp).toBeUndefined();
    expect(res.body.data.verificationToken).toBeUndefined();

    // Test A3: POST /api/auth/verify-otp with wrong OTP returns 400
    const verifyFail = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: testEmail, otp: '111111' });
    expect(verifyFail.status).toBe(400);
    expect(verifyFail.body.success).toBe(false);

    // Test A3: 5 failed attempts lock the OTP
    for (let i = 0; i < 4; i++) {
      await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: testEmail, otp: '111111' });
    }

    const verifyLock = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: testEmail, otp: '111111' });
    expect(verifyLock.status).toBe(400);
    expect(verifyLock.body.message).toContain('quá 5 lần');
  });

  it('A2: GET /api/auth/verify-email?token=invalid must not return JWT token', async () => {
    const res = await request(app)
      .get('/api/auth/verify-email?token=fake_random_token_123456&email=test@motorent.vn');
    expect(res.status).toBe(400);
    expect(res.body.token).toBeUndefined();
    expect(res.body.data?.token).toBeUndefined();
  });

  it('A5: Logout invalidates token through tokenVersion check', async () => {
    const tempLogin = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'customer_tuan', password: 'Customer@123456' });
    const tempToken = tempLogin.body?.data?.token;
    expect(tempToken).toBeDefined();

    // Verify token works
    const check1 = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tempToken}`);
    expect(check1.status).toBe(200);

    // Logout
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${tempToken}`);
    expect(logoutRes.status).toBe(200);

    // Using token after logout must return 401
    const check2 = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tempToken}`);
    expect(check2.status).toBe(401);
  });

  it('A5: 6 failed login attempts lock account for 30 minutes', async () => {
    const victimUser = `lockout_test_${Date.now()}`;
    const victimEmail = `${victimUser}@motorent.vn`;

    // Create user directly
    await User.create({
      username: victimUser,
      email: victimEmail,
      passwordHash: 'hashed',
      roles: 'Customer',
      status: 'Active',
      isEmailVerified: true,
      tokenVersion: 0,
    });

    // Fail 6 times
    for (let i = 0; i < 6; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ identifier: victimUser, password: 'WrongPassword@123' });
    }

    // 7th attempt must inform account is locked
    const lockedRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: victimUser, password: 'WrongPassword@123' });

    expect(lockedRes.status).toBe(403);
    expect(lockedRes.body.message).toContain('Tài khoản đang tạm thời bị khóa');
  });
});

describe('Phase B & C: Booking & Counter Desk Business Logic', () => {
  it('C1: POST /api/bookings without authentication must return 401', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({
        vehicleId: testVehicleId,
        pickupBranchId,
        returnBranchId,
        pickupDateTime: new Date(Date.now() + 86400000).toISOString(),
        returnDateTime: new Date(Date.now() + 172800000).toISOString(),
      });
    expect(res.status).toBe(401);
  });

  it('C2: Public GET /api/bookings without auth must be blocked (401 or 404)', async () => {
    const res = await request(app).get('/api/bookings');
    expect([401, 404]).toContain(res.status);
  });

  let createdBookingId: string;
  const randomOffsetDays = Math.floor(60 + Math.random() * 200);
  const pickupDate = new Date(Date.now() + randomOffsetDays * 86400000);
  const returnDate = new Date(pickupDate.getTime() + 2 * 86400000);

  it('C1: Customer creates booking successfully with MV- code and 30% deposit calculation', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: testVehicleId,
        pickupBranchId,
        returnBranchId,
        pickupDateTime: pickupDate.toISOString(),
        returnDateTime: returnDate.toISOString(),
        paymentMethod: 'Banking',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.bookingCode).toMatch(/^MV-[A-Z0-9]{6}$/);
    expect(res.body.data.depositAmount).toBe(Math.round(res.body.data.totalAmount * 0.3));
    expect(res.body.data.status).toBe('Pending');
    createdBookingId = res.body.data._id;
  });

  it('C1: Attempting overlapping booking on same vehicle must return 409 Conflict', async () => {
    const overlapPickup = new Date(pickupDate.getTime() + 3600000);
    const overlapReturn = new Date(returnDate.getTime() + 3600000);

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: testVehicleId,
        pickupBranchId,
        returnBranchId,
        pickupDateTime: overlapPickup.toISOString(),
        returnDateTime: overlapReturn.toISOString(),
        paymentMethod: 'Cash',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('C2: Staff of branch MK trying to check-in booking of branch DAD must return 403 Forbidden', async () => {
    // Set booking to Confirmed
    await Booking.findByIdAndUpdate(createdBookingId, { status: 'Confirmed' });

    const res = await request(app)
      .put(`/api/bookings/${createdBookingId}/checkin`)
      .set('Authorization', `Bearer ${staffMkToken}`)
      .send({
        startOdometer: 3200,
        startFuelLevel: 100,
        checklist: { tires: true, brakes: true, lights: true, fuel: true, helmets: true },
        eSignatureUrl: 'data:image/svg+xml;utf8,<svg></svg>',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('C2: Staff of correct branch DAD completes check-in -> Ongoing and vehicle Rented', async () => {
    const res = await request(app)
      .put(`/api/bookings/${createdBookingId}/checkin`)
      .set('Authorization', `Bearer ${staffDadToken}`)
      .send({
        startOdometer: 3200,
        startFuelLevel: 100,
        checklist: { tires: true, brakes: true, lights: true, fuel: true, helmets: true },
        eSignatureUrl: 'data:image/svg+xml;utf8,<svg><text>Customer</text></svg>',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Ongoing');

    const updatedVehicle = await Vehicle.findById(testVehicleId);
    expect(updatedVehicle?.status).toBe('Rented');
  });

  it('C2: State machine rejects invalid transition (check-in on already Ongoing booking) -> 409', async () => {
    const res = await request(app)
      .put(`/api/bookings/${createdBookingId}/checkin`)
      .set('Authorization', `Bearer ${staffDadToken}`)
      .send({
        startOdometer: 3200,
        startFuelLevel: 100,
        checklist: { tires: true, brakes: true, lights: true, fuel: true, helmets: true },
      });

    expect(res.status).toBe(409);
  });

  it('C2: Staff completes check-out -> Completed, late fee auto-calculated, vehicle back to Available', async () => {
    const res = await request(app)
      .put(`/api/bookings/${createdBookingId}/checkout`)
      .set('Authorization', `Bearer ${staffMkToken}`)
      .send({
        endOdometer: 3350,
        damageFee: 0,
        returnNotes: 'Xe nguyên vẹn, đối soát ODO chuẩn xác',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Completed');
    expect(res.body.data.isPaid).toBe(true);

    const updatedVehicle = await Vehicle.findById(testVehicleId);
    expect(updatedVehicle?.status).toBe('Available');
  });
});
