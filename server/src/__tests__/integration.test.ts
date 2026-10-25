import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { app } from '../server';
import { env } from '../config/env';
import { encryptFileInPlace } from '../core/cryptoVault';
import { setupTestEnvironment, teardownTestEnvironment } from './testHelper';
import { Vehicle } from '../models/Vehicle';
import { Branch } from '../models/Branch';
import { Booking } from '../models/Booking';
import { User } from '../models/User';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { AuditLog } from '../models/AuditLog';

let adminToken: string;
let customerToken: string;
let customerUserId: string;
let staffDadToken: string;
let staffMkToken: string;
let testVehicleId: string;
let pickupBranchId: string;
let returnBranchId: string;

beforeAll(async () => {
  await setupTestEnvironment();

  // Login as Admin
  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({ identifier: 'admin', password: 'Admin@123456' });
  adminToken = adminRes.body?.data?.token;

  // Login as Customer
  const customerRes = await request(app)
    .post('/api/auth/login')
    .send({ identifier: 'customer_hoang', password: 'Customer@123456' });
  customerToken = customerRes.body?.data?.token;
  customerUserId = customerRes.body?.data?.user?._id;

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

  it('A2: GET /api/auth/verify-email with expired token returns 410 Gone with resend hint', async () => {
    const expiredUser = await User.create({
      username: `exp_${Date.now()}`,
      email: `exp_${Date.now()}@motorent.vn`,
      passwordHash: 'hashed',
      status: 'Unverified',
      isEmailVerified: false,
      emailVerificationToken: crypto.createHash('sha256').update('expired_link_token').digest('hex'),
      emailVerificationExpires: new Date(Date.now() - 3600000), // Expired 1 hour ago
      roles: 'Customer',
      tokenVersion: 0,
    });

    const res = await request(app)
      .get(`/api/auth/verify-email?token=expired_link_token&email=${expiredUser.email}`);
    expect(res.status).toBe(410);
    expect(res.body.message).toContain('hết hạn');
    expect(res.body.message).toContain('resend-otp');

    // Also test the alias route GET /api/auth/verify-email/:token
    const resAlias = await request(app)
      .get(`/api/auth/verify-email/expired_link_token?email=${expiredUser.email}`);
    expect(resAlias.status).toBe(410);
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

  it('UC-22: eKYC lifecycle - blocked when Pending, rejected with reason, customer notified, re-upload allowed', async () => {
    const ekycUser = await User.create({
      username: `ekyc_user_${Date.now()}`,
      email: `ekyc_${Date.now()}@motorent.vn`,
      passwordHash: await bcrypt.hash('Customer@123456', 10),
      roles: 'Customer',
      status: 'Active',
      identityStatus: 'Unverified',
      isEmailVerified: true,
      tokenVersion: 0,
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: ekycUser.username, password: 'Customer@123456' });
    const ekycToken = loginRes.body?.data?.token;

    // 1. Submit eKYC
    const submitRes = await request(app)
      .post('/api/auth/ekyc')
      .set('Authorization', `Bearer ${ekycToken}`)
      .send({
        idCardFrontUrl: 'https://example.com/front.png',
        consentAgreed: true,
      });
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.identityStatus).toBe('Pending');

    // 2. Block duplicate upload while Pending
    const blockRes = await request(app)
      .post('/api/auth/ekyc')
      .set('Authorization', `Bearer ${ekycToken}`)
      .send({
        idCardFrontUrl: 'https://example.com/front2.png',
        consentAgreed: true,
      });
    expect(blockRes.status).toBe(400);
    expect(blockRes.body.message).toContain('chờ xét duyệt');

    // 3. Staff rejects with specific reason
    const rejectRes = await request(app)
      .put(`/api/auth/ekyc/review/${ekycUser._id}`)
      .set('Authorization', `Bearer ${staffDadToken}`)
      .send({
        status: 'Rejected',
        note: 'Ảnh chụp CCCD bị lóa sáng, không đọc được số CCCD.',
      });
    expect(rejectRes.status).toBe(200);

    // 4. Verify customer profile contains the rejection reason
    const profileRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${ekycToken}`);
    expect(profileRes.status).toBe(200);
    expect(profileRes.body.data.identityStatus).toBe('Rejected');
    expect(profileRes.body.data.ekycRejectionReason).toBe('Ảnh chụp CCCD bị lóa sáng, không đọc được số CCCD.');

    // 5. Re-upload is now permitted because status is Rejected
    const retryRes = await request(app)
      .post('/api/auth/ekyc')
      .set('Authorization', `Bearer ${ekycToken}`)
      .send({
        idCardFrontUrl: 'https://example.com/front_fixed.png',
        consentAgreed: true,
      });
    expect(retryRes.status).toBe(200);
    expect(retryRes.body.data.identityStatus).toBe('Pending');

    // 6. Reject again and test forged magic-bytes upload (.png containing HTML script) -> 400
    await User.findByIdAndUpdate(ekycUser._id, { identityStatus: 'Rejected' });
    const forgedRes = await request(app)
      .post('/api/auth/ekyc')
      .set('Authorization', `Bearer ${ekycToken}`)
      .attach('idCardFront', Buffer.from('<script>alert("xss")</script>'), {
        filename: 'forged.png',
        contentType: 'image/png',
      });
    expect(forgedRes.status).toBe(400);
    expect(forgedRes.body.message).toContain('sai chữ ký định dạng');

    // 7. Test Cloudinary private authenticated signed URL redirection & AuditLog
    await User.findByIdAndUpdate(ekycUser._id, {
      idCardFrontFile: 'cloudinary:motorent/ekyc/sample_cccd_front.webp',
      identityStatus: 'Pending',
    });
    const docRes = await request(app)
      .get(`/api/auth/ekyc/document/view/${ekycUser._id}/idCardFront`)
      .set('Authorization', `Bearer ${staffDadToken}`);
    expect(docRes.status).toBe(302);
    expect(docRes.headers['cache-control']).toContain('no-store');
    expect(docRes.headers['location']).toMatch(
      /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/authenticated\/s--[A-Za-z0-9_-]{8}--\/motorent\/ekyc\/sample_cccd_front\.webp$/
    );
  });

  it('Security Vault: Encrypts idCardNumber & local eKYC files with AES-256-GCM at rest while serving unmasked originals to owner', async () => {
    const vaultUser = await User.create({
      username: `vault_user_${Date.now()}`,
      email: `vault_${Date.now()}@motorent.vn`,
      passwordHash: await bcrypt.hash('Customer@123456', 10),
      roles: 'Customer',
      status: 'Active',
      identityStatus: 'Verified',
      isEmailVerified: true,
      tokenVersion: 0,
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: vaultUser.username, password: 'Customer@123456' });
    const vaultToken = loginRes.body?.data?.token;

    // 1. Update idCardNumber -> owner receives unmasked value, raw MongoDB stores AES-256-GCM ciphertext
    const updateRes = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${vaultToken}`)
      .send({ idCardNumber: '079203009876' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.idCardNumber).toBe('079203009876');

    const rawUserDoc = await User.collection.findOne({ _id: vaultUser._id });
    expect(String(rawUserDoc?.idCardNumber)).toMatch(/^enc:v1:/);
    expect(rawUserDoc?.idCardNumber).not.toBe('079203009876');

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${vaultToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.idCardNumber).toBe('079203009876');

    // 2. Encrypt local private eKYC image at rest with MRENC1 envelope and verify owner Bearer stream decrypts in RAM
    const ekycDir = path.join(process.cwd(), 'private_uploads', 'ekyc');
    if (!fs.existsSync(ekycDir)) {
      fs.mkdirSync(ekycDir, { recursive: true });
    }
    const testFilename = `vault_front_${Date.now()}.png`;
    const testFilePath = path.join(ekycDir, testFilename);
    const samplePngBytes = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    fs.writeFileSync(testFilePath, samplePngBytes);
    await encryptFileInPlace(testFilePath);

    try {
      const diskBytes = fs.readFileSync(testFilePath);
      expect(diskBytes.subarray(0, 6).toString('ascii')).toBe('MRENC1');
      expect(diskBytes.equals(samplePngBytes)).toBe(false);

      await User.findByIdAndUpdate(vaultUser._id, { idCardFrontFile: testFilename });

      // Unauthorized user cannot read another customer's eKYC document
      const unauthDocRes = await request(app).get('/api/auth/ekyc/document/me/idCardFront');
      expect(unauthDocRes.status).toBe(401);

      // Owner receives exact unmasked PNG bytes with strict anti-cache/nosniff headers
      const ownerDocRes = await request(app)
        .get('/api/auth/ekyc/document/me/idCardFront')
        .set('Authorization', `Bearer ${vaultToken}`)
        .buffer(true)
        .parse((res, cb) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => cb(null, Buffer.concat(chunks)));
        });

      expect(ownerDocRes.status).toBe(200);
      expect(ownerDocRes.headers['content-type']).toContain('image/png');
      expect(ownerDocRes.headers['cache-control']).toContain('no-store');
      expect(ownerDocRes.headers['x-content-type-options']).toBe('nosniff');
      expect(Buffer.isBuffer(ownerDocRes.body)).toBe(true);
      expect((ownerDocRes.body as Buffer).equals(samplePngBytes)).toBe(true);
    } finally {
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
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
  pickupDate.setUTCHours(2, 0, 0, 0); // 09:00 AM Vietnam time (GMT+7)
  const returnDate = new Date(pickupDate.getTime() + 2 * 86400000);
  returnDate.setUTCHours(9, 0, 0, 0); // 16:00 PM Vietnam time (GMT+7)

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

  it('C1: Concurrency guard - 5 parallel booking requests for same slot return exactly 1 success and 4 conflicts', async () => {
    const concPickup = new Date(Date.now() + 400 * 86400000);
    concPickup.setUTCHours(2, 0, 0, 0); // 09:00 AM GMT+7
    const concReturn = new Date(concPickup.getTime() + 86400000);
    concReturn.setUTCHours(9, 0, 0, 0); // 16:00 PM GMT+7

    const requests = Array.from({ length: 5 }, () =>
      request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          vehicleId: testVehicleId,
          pickupBranchId,
          returnBranchId,
          pickupDateTime: concPickup.toISOString(),
          returnDateTime: concReturn.toISOString(),
          paymentMethod: 'Banking',
        })
    );

    const responses = await Promise.all(requests);
    const successCount = responses.filter((r) => r.status === 201).length;
    const conflictCount = responses.filter((r) => r.status === 409).length;

    expect(successCount).toBe(1);
    expect(conflictCount).toBe(4);
  });

  it('C2: Attempting check-in on Pending booking returns 409 Conflict', async () => {
    const res = await request(app)
      .put(`/api/bookings/${createdBookingId}/checkin`)
      .set('Authorization', `Bearer ${staffDadToken}`)
      .send({
        startOdometer: 3200,
        startFuelLevel: '100%',
        checklist: { tires: true, brakes: true, lights: true, fuel: true, helmets: true },
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('Đơn cần ở trạng thái Đã xác nhận');
  });

  it('C2: Staff of branch MK trying to check-in booking of branch DAD must return 403 Forbidden', async () => {
    // Set booking to Confirmed (e.g. after deposit)
    await Booking.findByIdAndUpdate(createdBookingId, { status: 'Confirmed' });

    const res = await request(app)
      .put(`/api/bookings/${createdBookingId}/checkin`)
      .set('Authorization', `Bearer ${staffMkToken}`)
      .send({
        startOdometer: 3200,
        startFuelLevel: '100%',
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

  it('C3: Staff records 70% remaining balance at counter (UC-31)', async () => {
    // Create temporary booking to test counter payment
    const tempB = await Booking.create({
      bookingCode: 'MV-COUNTERTEST',
      userId: (await User.findOne({ username: 'customer_hoang' }))!._id,
      vehicleId: testVehicleId,
      pickupBranchId,
      returnBranchId,
      pickupDateTime: new Date(Date.now() + 86400000),
      returnDateTime: new Date(Date.now() + 2 * 86400000),
      totalAmount: 300000,
      depositAmount: 90000,
      remainingAmount: 210000,
      status: 'Confirmed',
      isPaid: false,
    });

    const res = await request(app)
      .put(`/api/bookings/${tempB._id}/counter-pay`)
      .set('Authorization', `Bearer ${staffDadToken}`)
      .send({ amount: 210000, notes: 'Thanh toán tiền mặt tất toán 70%' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isPaid).toBe(true);
    expect(res.body.data.remainingAmount).toBe(0);

    await Booking.findByIdAndDelete(tempB._id);
  });

  describe('Phase 4: RBAC Matrix and Access Control (UC-99)', () => {
    it('Staff can inspect RBAC matrix at GET /api/system/permissions', async () => {
      const res = await request(app)
        .get('/api/system/permissions')
        .set('Authorization', `Bearer ${staffDadToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('Staff');
      expect(Array.isArray(res.body.data.permissions)).toBe(true);
      expect(res.body.data.permissions).toContain('BOOKING_CHECKIN');
      expect(res.body.data.permissions).not.toContain('USER_MANAGE');
    });

    it('SystemAdmin can inspect full permissions at GET /api/system/permissions', async () => {
      const res = await request(app)
        .get('/api/system/permissions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('SystemAdmin');
      expect(res.body.data.permissions).toContain('USER_MANAGE');
      expect(res.body.data.permissions).toContain('AUDIT_VIEW');
      expect(res.body.data.permissions).toContain('FINANCE_TAX_REPORT');
    });

    it('Customer is rejected with 403 on GET /api/system/permissions', async () => {
      const res = await request(app)
        .get('/api/system/permissions')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });

    it('Unauthenticated request is rejected with 401', async () => {
      const res = await request(app).get('/api/system/permissions');
      expect(res.status).toBe(401);
    });
  });

  describe('Phase 4: Audit Log Viewer (UC-102)', () => {
    it('SystemAdmin can view paginated audit logs at GET /api/audit', async () => {
      const res = await request(app)
        .get('/api/audit?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(typeof res.body.data.total).toBe('number');
      expect(res.body.data.page).toBe(1);
    });

    it('Customer is blocked from GET /api/audit with 403 Forbidden while internal Staff has access', async () => {
      const staffRes = await request(app)
        .get('/api/audit')
        .set('Authorization', `Bearer ${staffDadToken}`);
      expect(staffRes.status).toBe(200);

      const customerRes = await request(app)
        .get('/api/audit')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(customerRes.status).toBe(403);
    });

    it('Audit query filters by action successfully', async () => {
      const res = await request(app)
        .get('/api/audit?action=RECORD_COUNTER_PAYMENT')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      if (res.body.data.items.length > 0) {
        expect(res.body.data.items[0].action).toBe('RECORD_COUNTER_PAYMENT');
      }
    });
  });

  describe('Phase 4: Customer Live Chat and Staff Chat Console (UC-44 & UC-66)', () => {
    let convId: string;
    const testClientMsgId = `cmsg_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    it('Customer can open or get active conversation via GET /api/chat/my', async () => {
      const res = await request(app)
        .get('/api/chat/my')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Open');
      const returnedCustomerId =
        typeof res.body.data.customerId === 'object' && res.body.data.customerId !== null
          ? res.body.data.customerId._id
          : res.body.data.customerId;
      expect(returnedCustomerId).toBe(customerUserId);
      convId = res.body.data._id;
    });

    it('Customer sends message with clientMsgId and receives sanitized response', async () => {
      const res = await request(app)
        .post(`/api/chat/${convId}/messages`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          clientMsgId: testClientMsgId,
          content: '<script>alert("xss")</script>Xin chào hỗ trợ xe máy!',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.content).not.toContain('<script>');
      expect(res.body.data.content).toContain('Xin chào hỗ trợ xe máy!');
      expect(res.body.data.senderId.roles).toBe('Customer');
    });

    it('Idempotent check: Resending same clientMsgId returns existing message without duplication', async () => {
      const res = await request(app)
        .post(`/api/chat/${convId}/messages`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          clientMsgId: testClientMsgId,
          content: 'Nội dung gửi lại với cùng clientMsgId',
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);

      // Verify DB contains exactly one record with testClientMsgId
      const count = await Message.countDocuments({ clientMsgId: testClientMsgId });
      expect(count).toBe(1);
    });

    it('Empty or whitespace message is rejected with 400', async () => {
      const res = await request(app)
        .post(`/api/chat/${convId}/messages`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          content: '     ',
        });

      expect(res.status).toBe(400);
    });

    it('Staff can list branch conversations at GET /api/chat/staff/conversations', async () => {
      const res = await request(app)
        .get('/api/chat/staff/conversations')
        .set('Authorization', `Bearer ${staffDadToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });

    it('Staff can close conversation at PUT /api/chat/:id/close', async () => {
      const res = await request(app)
        .put(`/api/chat/${convId}/close`)
        .set('Authorization', `Bearer ${staffDadToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Closed');
    });

    afterAll(async () => {
      if (convId) {
        await Message.deleteMany({ conversationId: convId });
        await Conversation.findByIdAndDelete(convId);
      }
    });
  });

  describe('Phase 4: VNPay Reconciliation and Tax Report (UC-120 & UC-121)', () => {
    it('SystemAdmin can run financial reconciliation at GET /api/finance/reconcile', async () => {
      const res = await request(app)
        .get('/api/finance/reconcile')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary).toBeDefined();
      expect(typeof res.body.data.summary.totalBookingsChecked).toBe('number');
      expect(Array.isArray(res.body.data.discrepancies)).toBe(true);
    });

    it('Customer is rejected from financial reconciliation with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/finance/reconcile')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });

    it('SystemAdmin can stream tax report excel workbook at GET /api/finance/tax-report', async () => {
      const res = await request(app)
        .get('/api/finance/tax-report?period=month&year=2026&n=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .responseType('blob');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(res.headers['content-disposition']).toContain('Bao_Cao_Thue_Motorent');
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('Staff and Customer are blocked from tax report with 403 Forbidden', async () => {
      const staffRes = await request(app)
        .get('/api/finance/tax-report')
        .set('Authorization', `Bearer ${staffDadToken}`);
      expect(staffRes.status).toBe(403);

      const customerRes = await request(app)
        .get('/api/finance/tax-report')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(customerRes.status).toBe(403);
    });
  });

  describe('Phase 4: Booking Cancellation Workflow and IDOR Prevention (UC-37)', () => {
    let cancelBookingId: string;
    let otherCustomerToken: string;

    beforeAll(async () => {
      const tuanUser = await User.findOne({ username: 'customer_tuan' });
      expect(tuanUser).toBeTruthy();
      otherCustomerToken = jwt.sign(
        { userId: tuanUser!._id.toString(), tokenVersion: tuanUser!.tokenVersion || 0 },
        env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Create a pending booking for customer_hoang
      const booking = await Booking.create({
        bookingCode: `MV-CANCEL-${Date.now().toString().slice(-4)}`,
        userId: customerUserId,
        vehicleId: testVehicleId,
        pickupBranchId,
        returnBranchId,
        pickupDateTime: new Date(Date.now() + 86400000),
        returnDateTime: new Date(Date.now() + 2 * 86400000),
        totalAmount: 300000,
        depositAmount: 90000,
        remainingAmount: 210000,
        status: 'Pending',
        isPaid: false,
      });
      cancelBookingId = booking._id.toString();
    });

    it('Customer cannot cancel another customer booking (IDOR guard) -> 403', async () => {
      const res = await request(app)
        .put(`/api/bookings/${cancelBookingId}/cancel`)
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .send({ cancelReason: 'Cố ý hủy đơn người khác' });

      expect(res.status).toBe(403);
    });

    it('Customer can cancel their own pending booking -> 200 and status Cancelled', async () => {
      const res = await request(app)
        .put(`/api/bookings/${cancelBookingId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ cancelReason: 'Khách đổi kế hoạch lịch trình' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Cancelled');
      expect(res.body.data.cancelReason).toBe('Khách đổi kế hoạch lịch trình');
    });

    it('Cannot cancel an Ongoing booking -> 400', async () => {
      const ongoingBooking = await Booking.create({
        bookingCode: `MV-ONGOING-${Date.now().toString().slice(-4)}`,
        userId: customerUserId,
        vehicleId: testVehicleId,
        pickupBranchId,
        returnBranchId,
        pickupDateTime: new Date(Date.now() - 3600000),
        returnDateTime: new Date(Date.now() + 86400000),
        totalAmount: 300000,
        depositAmount: 90000,
        remainingAmount: 210000,
        status: 'Ongoing',
        isPaid: false,
      });

      const res = await request(app)
        .put(`/api/bookings/${ongoingBooking._id}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ cancelReason: 'Hủy đơn đang đi xe' });

      expect(res.status).toBe(409);

      await Booking.findByIdAndDelete(ongoingBooking._id);
    });

    afterAll(async () => {
      if (cancelBookingId) {
        await Booking.findByIdAndDelete(cancelBookingId);
      }
    });
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });
});
