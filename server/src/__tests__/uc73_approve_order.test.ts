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
import { Notification } from '../models/Notification';
import { AuditLog } from '../models/AuditLog';

describe('UC-73: Approve Order (Manager Booking Approval)', () => {
  let managerDadToken: string;
  let managerMkToken: string;
  let staffToken: string;
  let customerToken: string;
  let adminToken: string;

  let branchDADId: mongoose.Types.ObjectId;
  let branchMKId: mongoose.Types.ObjectId;
  let customerId: mongoose.Types.ObjectId;
  let vehicleId: mongoose.Types.ObjectId;

  let pendingBookingId: string;
  let depositPaidBookingId: string;
  let cancelledBookingId: string;

  beforeAll(async () => {
    await setupTestEnvironment();

    const branchDAD = await Branch.findOne({ code: 'CN-DAD' });
    const branchMK = await Branch.findOne({ code: 'CN-MK' });
    const vehicle = await Vehicle.findOne({ status: 'Available' });
    const customer = await User.findOne({ username: 'customer_hoang' });
    const staff = await User.findOne({ username: 'staff_dad' });
    const admin = await User.findOne({ username: 'admin' });

    if (!branchDAD || !branchMK || !vehicle || !customer || !staff || !admin) {
      throw new Error('Test fixtures missing in database');
    }

    branchDADId = branchDAD._id as mongoose.Types.ObjectId;
    branchMKId = branchMK._id as mongoose.Types.ObjectId;
    customerId = customer._id as mongoose.Types.ObjectId;
    vehicleId = vehicle._id as mongoose.Types.ObjectId;

    // Create or find Manager for branch DAD
    let managerDad = await User.findOne({ username: 'manager_dad' });
    if (!managerDad) {
      managerDad = await User.create({
        username: 'manager_dad',
        email: 'manager.dad@motorent.vn',
        passwordHash: '$2a$10$hashedpasswordplaceholder',
        firstName: 'Nguyễn Văn',
        lastName: 'Quản Lý Sân Bay',
        phoneNumber: '0905111222',
        roles: 'BranchManager',
        status: 'Active',
        branchId: branchDADId,
        identityStatus: 'Verified',
        tokenVersion: 0,
        isEmailVerified: true,
      });
    }

    // Create or find Manager for branch MK (different branch)
    let managerMk = await User.findOne({ username: 'manager_mk' });
    if (!managerMk) {
      managerMk = await User.create({
        username: 'manager_mk',
        email: 'manager.mk@motorent.vn',
        passwordHash: '$2a$10$hashedpasswordplaceholder',
        firstName: 'Trần Thị',
        lastName: 'Quản Lý Mỹ Khê',
        phoneNumber: '0905333444',
        roles: 'BranchManager',
        status: 'Active',
        branchId: branchMKId,
        identityStatus: 'Verified',
        tokenVersion: 0,
        isEmailVerified: true,
      });
    }

    managerDadToken = jwt.sign(
      { userId: managerDad._id.toString(), tokenVersion: managerDad.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    managerMkToken = jwt.sign(
      { userId: managerMk._id.toString(), tokenVersion: managerMk.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

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

    adminToken = jwt.sign(
      { userId: admin._id.toString(), tokenVersion: admin.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 1. Pending booking (not deposit paid)
    const booking1 = await Booking.create({
      bookingCode: `MV-AP${Date.now().toString().slice(-6)}`,
      userId: customerId,
      vehicleId,
      pickupBranchId: branchDADId,
      returnBranchId: branchDADId,
      pickupDateTime: new Date(Date.now() + 24 * 3600 * 1000),
      returnDateTime: new Date(Date.now() + 72 * 3600 * 1000),
      totalAmount: 1000000,
      depositAmount: 300000,
      remainingAmount: 700000,
      paidAmount: 0,
      discountAmount: 0,
      lateFee: 0,
      damageFee: 0,
      loyaltyPointsEarned: 100,
      status: 'Pending',
      paymentMethod: 'Banking',
      isPaid: false,
      depositPaid: false,
      startOdometer: 5000,
    });
    pendingBookingId = booking1._id.toString();

    // 2. Pending booking with depositPaid: true
    const booking2 = await Booking.create({
      bookingCode: `MV-DP${Date.now().toString().slice(-6)}`,
      userId: customerId,
      vehicleId,
      pickupBranchId: branchDADId,
      returnBranchId: branchDADId,
      pickupDateTime: new Date(Date.now() + 36 * 3600 * 1000),
      returnDateTime: new Date(Date.now() + 84 * 3600 * 1000),
      totalAmount: 1200000,
      depositAmount: 360000,
      remainingAmount: 840000,
      paidAmount: 360000,
      discountAmount: 0,
      lateFee: 0,
      damageFee: 0,
      loyaltyPointsEarned: 120,
      status: 'Pending',
      paymentMethod: 'Banking',
      isPaid: false,
      depositPaid: true,
      startOdometer: 6000,
    });
    depositPaidBookingId = booking2._id.toString();

    // 3. Cancelled booking
    const booking3 = await Booking.create({
      bookingCode: `MV-CC${Date.now().toString().slice(-6)}`,
      userId: customerId,
      vehicleId,
      pickupBranchId: branchDADId,
      returnBranchId: branchDADId,
      pickupDateTime: new Date(Date.now() + 48 * 3600 * 1000),
      returnDateTime: new Date(Date.now() + 96 * 3600 * 1000),
      totalAmount: 800000,
      depositAmount: 240000,
      remainingAmount: 560000,
      paidAmount: 0,
      discountAmount: 0,
      lateFee: 0,
      damageFee: 0,
      loyaltyPointsEarned: 80,
      status: 'Cancelled',
      cancelReason: 'Khách đổi lịch',
      paymentMethod: 'Banking',
      isPaid: false,
      depositPaid: false,
      startOdometer: 7000,
    });
    cancelledBookingId = booking3._id.toString();
  }, 30000);

  afterAll(async () => {
    await mongoose.disconnect();
  }, 10000);

  it('1. Rejects unauthenticated request without token (401)', async () => {
    const res = await request(app).put(`/api/bookings/${pendingBookingId}/approve`);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('2. Rejects Customer role (403 Forbidden)', async () => {
    const res = await request(app)
      .put(`/api/bookings/${pendingBookingId}/approve`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('3. Rejects Staff role (403 Forbidden - requires Manager/Admin)', async () => {
    const res = await request(app)
      .put(`/api/bookings/${pendingBookingId}/approve`)
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('4. Rejects BranchManager from a different branch (403 Forbidden)', async () => {
    const res = await request(app)
      .put(`/api/bookings/${pendingBookingId}/approve`)
      .set('Authorization', `Bearer ${managerMkToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('chi nhánh');
  });

  it('5. Successfully approves Pending booking by branch manager (200 OK -> Approved)', async () => {
    const res = await request(app)
      .put(`/api/bookings/${pendingBookingId}/approve`)
      .set('Authorization', `Bearer ${managerDadToken}`)
      .send({ notes: 'Đã kiểm tra xe và giấy tờ, đồng ý duyệt' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('Approved');
    expect(res.body.data.approvedBy).toBeDefined();

    // Verify DB update
    const dbBooking = await Booking.findById(pendingBookingId);
    expect(dbBooking?.status).toBe('Approved');
    expect(dbBooking?.approvedAt).toBeDefined();

    // Verify customer notification created
    const notif = await Notification.findOne({
      userId: customerId,
      relatedId: pendingBookingId,
      type: 'BOOKING',
    });
    expect(notif).toBeDefined();
    expect(notif?.title).toContain('phê duyệt');

    // Verify audit log created
    const audit = await AuditLog.findOne({
      action: 'APPROVE_BOOKING',
      entityId: pendingBookingId,
    });
    expect(audit).toBeDefined();
  });

  it('6. Approving booking with depositPaid: true sets status to Confirmed', async () => {
    const res = await request(app)
      .put(`/api/bookings/${depositPaidBookingId}/approve`)
      .set('Authorization', `Bearer ${managerDadToken}`)
      .send({ notes: 'Khách đã cọc, duyệt và khóa xe' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('Confirmed');

    const dbBooking = await Booking.findById(depositPaidBookingId);
    expect(dbBooking?.status).toBe('Confirmed');
  });

  it('7. Rejects approving already approved booking (400 Bad Request)', async () => {
    const res = await request(app)
      .put(`/api/bookings/${pendingBookingId}/approve`)
      .set('Authorization', `Bearer ${managerDadToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('không cần phê duyệt lại');
  });

  it('8. Rejects approving cancelled booking (400 Bad Request)', async () => {
    const res = await request(app)
      .put(`/api/bookings/${cancelledBookingId}/approve`)
      .set('Authorization', `Bearer ${managerDadToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('đã bị hủy');
  });

  it('9. SystemAdmin has global access and can approve any branch booking', async () => {
    // Create another pending booking for MK branch
    const bookingMK = await Booking.create({
      bookingCode: `MV-MK${Date.now().toString().slice(-6)}`,
      userId: customerId,
      vehicleId,
      pickupBranchId: branchMKId,
      returnBranchId: branchMKId,
      pickupDateTime: new Date(Date.now() + 24 * 3600 * 1000),
      returnDateTime: new Date(Date.now() + 72 * 3600 * 1000),
      totalAmount: 900000,
      depositAmount: 270000,
      remainingAmount: 630000,
      paidAmount: 0,
      discountAmount: 0,
      lateFee: 0,
      damageFee: 0,
      loyaltyPointsEarned: 90,
      status: 'Pending',
      paymentMethod: 'Banking',
      isPaid: false,
      depositPaid: false,
      startOdometer: 5500,
    });

    const res = await request(app)
      .put(`/api/bookings/${bookingMK._id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('Approved');
  });
});
