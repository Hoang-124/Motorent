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
import { Notification } from '../models/Notification';
import { AuditLog } from '../models/AuditLog';

describe('UC-74: Reject Order (Manager Booking Rejection)', () => {
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
  let ongoingBookingId: string;
  let alreadyRejectedBookingId: string;

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

    // Create Manager for branch DAD
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

    // Create Manager for branch MK (different branch)
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

    // 1. Pending booking (no deposit paid)
    const booking1 = await Booking.create({
      bookingCode: `MV-RJ1${Date.now().toString().slice(-5)}`,
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

    // 2. Pending booking with deposit paid (300,000 VND)
    const booking2 = await Booking.create({
      bookingCode: `MV-RJ2${Date.now().toString().slice(-5)}`,
      userId: customerId,
      vehicleId,
      pickupBranchId: branchDADId,
      returnBranchId: branchDADId,
      pickupDateTime: new Date(Date.now() + 36 * 3600 * 1000),
      returnDateTime: new Date(Date.now() + 84 * 3600 * 1000),
      totalAmount: 1000000,
      depositAmount: 300000,
      remainingAmount: 700000,
      paidAmount: 300000,
      discountAmount: 0,
      lateFee: 0,
      damageFee: 0,
      loyaltyPointsEarned: 100,
      status: 'Pending',
      paymentMethod: 'Banking',
      isPaid: false,
      depositPaid: true,
      startOdometer: 6000,
    });
    depositPaidBookingId = booking2._id.toString();

    // 3. Ongoing booking
    const booking3 = await Booking.create({
      bookingCode: `MV-RJ3${Date.now().toString().slice(-5)}`,
      userId: customerId,
      vehicleId,
      pickupBranchId: branchDADId,
      returnBranchId: branchDADId,
      pickupDateTime: new Date(Date.now() - 12 * 3600 * 1000),
      returnDateTime: new Date(Date.now() + 36 * 3600 * 1000),
      totalAmount: 1000000,
      depositAmount: 300000,
      remainingAmount: 700000,
      paidAmount: 300000,
      discountAmount: 0,
      lateFee: 0,
      damageFee: 0,
      loyaltyPointsEarned: 100,
      status: 'Ongoing',
      paymentMethod: 'Banking',
      isPaid: false,
      depositPaid: true,
      startOdometer: 7000,
    });
    ongoingBookingId = booking3._id.toString();

    // 4. Already rejected booking
    const booking4 = await Booking.create({
      bookingCode: `MV-RJ4${Date.now().toString().slice(-5)}`,
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
      status: 'Rejected',
      rejectReason: 'Xe cần bảo trì đột xuất',
      paymentMethod: 'Banking',
      isPaid: false,
      depositPaid: false,
      startOdometer: 8000,
    });
    alreadyRejectedBookingId = booking4._id.toString();
  }, 30000);

  afterAll(async () => {
    await mongoose.disconnect();
  }, 10000);

  it('1. Rejects unauthenticated request without token (401)', async () => {
    const res = await request(app)
      .put(`/api/bookings/${pendingBookingId}/reject`)
      .send({ reason: 'Hết xe phục vụ' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('2. Rejects Customer role (403 Forbidden)', async () => {
    const res = await request(app)
      .put(`/api/bookings/${pendingBookingId}/reject`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ reason: 'Khách không có quyền từ chối của quản lý' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('3. Rejects Staff role (403 Forbidden - only BranchManager or SystemAdmin)', async () => {
    const res = await request(app)
      .put(`/api/bookings/${pendingBookingId}/reject`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ reason: 'Nhân viên không có thẩm quyền từ chối' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('4. Rejects BranchManager from a different branch (403 Forbidden)', async () => {
    const res = await request(app)
      .put(`/api/bookings/${pendingBookingId}/reject`)
      .set('Authorization', `Bearer ${managerMkToken}`)
      .send({ reason: 'Quản lý chi nhánh khác không được can thiệp' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('chi nhánh');
  });

  it('5. Rejects request without mandatory reason (400 Bad Request)', async () => {
    const res = await request(app)
      .put(`/api/bookings/${pendingBookingId}/reject`)
      .set('Authorization', `Bearer ${managerDadToken}`)
      .send({ reason: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Lý do từ chối');
  });

  it('6. Successfully rejects Pending booking without prior payment (200 OK -> Rejected, refundAmount = 0)', async () => {
    const res = await request(app)
      .put(`/api/bookings/${pendingBookingId}/reject`)
      .set('Authorization', `Bearer ${managerDadToken}`)
      .send({ reason: 'Phương tiện cần đưa vào xưởng bảo dưỡng định kỳ đột xuất' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('Rejected');
    expect(res.body.data.rejectReason).toBe('Phương tiện cần đưa vào xưởng bảo dưỡng định kỳ đột xuất');
    expect(res.body.data.rejectedBy).toBeDefined();

    // Verify DB update
    const dbBooking = await Booking.findById(pendingBookingId);
    expect(dbBooking?.status).toBe('Rejected');
    expect(dbBooking?.rejectReason).toBe('Phương tiện cần đưa vào xưởng bảo dưỡng định kỳ đột xuất');
    expect(dbBooking?.refundAmount).toBe(0);
    expect(dbBooking?.refundStatus).toBe('None');

    // Verify Notification created
    const notif = await Notification.findOne({
      userId: customerId,
      relatedId: pendingBookingId,
      type: 'BOOKING',
    });
    expect(notif).toBeDefined();
    expect(notif?.title).toContain('từ chối');

    // Verify AuditLog
    const audits = await AuditLog.find({
      action: 'REJECT_BOOKING',
      entityId: pendingBookingId,
    });
    expect(audits.length).toBeGreaterThan(0);
    const hasAuditReason = audits.some((a) =>
      a.details?.rejectReason === 'Phương tiện cần đưa vào xưởng bảo dưỡng định kỳ đột xuất' ||
      (a.details as { body?: { reason?: string } })?.body?.reason === 'Phương tiện cần đưa vào xưởng bảo dưỡng định kỳ đột xuất'
    );
    expect(hasAuditReason).toBe(true);
  });

  it('7. Successfully rejects booking with prior deposit: grants 100% refund and creates Payment record', async () => {
    const res = await request(app)
      .put(`/api/bookings/${depositPaidBookingId}/reject`)
      .set('Authorization', `Bearer ${managerDadToken}`)
      .send({ reason: 'Xe bị sự cố động cơ trước giờ giao, hoàn tiền 100%' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('Rejected');
    expect(res.body.data.refundAmount).toBe(300000);
    expect(res.body.data.refundStatus).toBe('Pending');

    const dbBooking = await Booking.findById(depositPaidBookingId);
    expect(dbBooking?.refundAmount).toBe(300000);
    expect(dbBooking?.refundForfeitAmount).toBe(0);

    // Verify Payment refund record created
    const refundPayment = await Payment.findOne({
      bookingId: depositPaidBookingId,
      type: 'REFUND',
      status: 'PENDING',
    });
    expect(refundPayment).toBeDefined();
    expect(refundPayment?.amount).toBe(300000);
  });

  it('8. Rejects rejecting an already rejected booking (400 Bad Request)', async () => {
    const res = await request(app)
      .put(`/api/bookings/${alreadyRejectedBookingId}/reject`)
      .set('Authorization', `Bearer ${managerDadToken}`)
      .send({ reason: 'Từ chối lần nữa' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('đã bị hủy hoặc từ chối');
  });

  it('9. Rejects rejecting an Ongoing booking (400 Bad Request)', async () => {
    const res = await request(app)
      .put(`/api/bookings/${ongoingBookingId}/reject`)
      .set('Authorization', `Bearer ${managerDadToken}`)
      .send({ reason: 'Không thể từ chối xe đang lưu hành' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Ongoing');
  });

  it('10. SystemAdmin has global access and can reject any branch booking', async () => {
    // Create pending booking for MK branch
    const bookingMK = await Booking.create({
      bookingCode: `MV-RJA${Date.now().toString().slice(-5)}`,
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
      .put(`/api/bookings/${bookingMK._id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Admin can thiệp xử lý hủy' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('Rejected');
  });
});
