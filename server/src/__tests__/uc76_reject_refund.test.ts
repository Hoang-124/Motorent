import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../server';
import { env } from '../config/env';
import { setupTestEnvironment, teardownTestEnvironment } from './testHelper';
import { Booking } from '../models/Booking';
import { Payment } from '../models/Payment';
import { Vehicle } from '../models/Vehicle';
import { Branch } from '../models/Branch';
import { User } from '../models/User';
import { Notification } from '../models/Notification';

describe('UC-76: Reject Refund Integration Tests (PUT /api/bookings/:id/refund/reject)', () => {
  let adminToken: string;
  let managerDadToken: string;
  let managerMkToken: string;
  let staffToken: string;
  let customerToken: string;

  let branchDad: any;
  let branchMk: any;
  let testCustomer: any;
  let testVehicle: any;
  let pendingRefundBooking: any;

  beforeAll(async () => {
    await setupTestEnvironment();

    branchDad = await Branch.findOne({ code: 'CN-DAD' });
    branchMk = await Branch.findOne({ code: 'CN-MK' });
    testCustomer = await User.findOne({ username: 'customer_hoang' });
    testVehicle = await Vehicle.findOne({ status: 'Available' });

    let managerDad = await User.findOne({ username: 'manager_dad_uc76' });
    if (!managerDad) {
      managerDad = await User.create({
        username: 'manager_dad_uc76',
        email: 'manager.dad.uc76@motorent.vn',
        passwordHash: 'dummy',
        firstName: 'Trần Văn',
        lastName: 'Quản Lý Sân Bay',
        phoneNumber: '0905123777',
        roles: 'BranchManager',
        status: 'Active',
        branchId: branchDad._id,
        identityStatus: 'Verified',
        tokenVersion: 0,
        isEmailVerified: true,
      });
    }

    let managerMk = await User.findOne({ username: 'manager_mk_uc76' });
    if (!managerMk) {
      managerMk = await User.create({
        username: 'manager_mk_uc76',
        email: 'manager.mk.uc76@motorent.vn',
        passwordHash: 'dummy',
        firstName: 'Lê Hoàng',
        lastName: 'Quản Lý Mỹ Khê',
        phoneNumber: '0905789888',
        roles: 'BranchManager',
        status: 'Active',
        branchId: branchMk._id,
        identityStatus: 'Verified',
        tokenVersion: 0,
        isEmailVerified: true,
      });
    }

    const admin = await User.findOne({ username: 'admin' });
    const staff = await User.findOne({ username: 'staff_dad' });

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

    adminToken = jwt.sign(
      { userId: admin!._id.toString(), tokenVersion: admin!.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    staffToken = jwt.sign(
      { userId: staff!._id.toString(), tokenVersion: staff!.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    customerToken = jwt.sign(
      { userId: testCustomer._id.toString(), tokenVersion: testCustomer.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    pendingRefundBooking = await Booking.create({
      bookingCode: 'MTR-REFUND-DENY-001',
      userId: testCustomer._id,
      vehicleId: testVehicle._id,
      pickupBranchId: branchDad._id,
      returnBranchId: branchDad._id,
      pickupDateTime: new Date(Date.now() + 86400000 * 2),
      returnDateTime: new Date(Date.now() + 86400000 * 4),
      dailyPrice: 150000,
      totalAmount: 300000,
      depositAmount: 90000,
      remainingAmount: 210000,
      paidAmount: 90000,
      discountAmount: 0,
      lateFee: 0,
      damageFee: 0,
      loyaltyPointsEarned: 0,
      startOdometer: 3200,
      status: 'Cancelled',
      depositPaid: true,
      isPaid: false,
      paymentMethod: 'Banking',
      refundAmount: 90000,
      refundForfeitAmount: 0,
      refundStatus: 'Pending',
      cancelReason: 'Khách yêu cầu hủy qua điện thoại',
      cancelledAt: new Date(),
    });

    await Payment.create({
      bookingId: pendingRefundBooking._id,
      txnRef: `REFUND-${pendingRefundBooking.bookingCode}-${Date.now()}`,
      amount: 90000,
      type: 'REFUND',
      status: 'PENDING',
    });
  }, 30000);

  afterAll(async () => {
    if (pendingRefundBooking) {
      await Booking.deleteOne({ _id: pendingRefundBooking._id });
      await Payment.deleteMany({ bookingId: pendingRefundBooking._id });
      await Notification.deleteMany({ 'data.bookingCode': pendingRefundBooking.bookingCode });
    }
    await User.deleteMany({ username: { $in: ['manager_dad_uc76', 'manager_mk_uc76'] } });
    await teardownTestEnvironment();
  }, 10000);

  it('1. Returns 401 Unauthorized when unauthenticated', async () => {
    const res = await request(app)
      .put(`/api/bookings/${pendingRefundBooking._id}/refund/reject`)
      .send({ reason: 'Không đủ điều kiện' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('2. Returns 403 Forbidden when requested by Customer or Staff (requires Manager or Admin)', async () => {
    const resCustomer = await request(app)
      .put(`/api/bookings/${pendingRefundBooking._id}/refund/reject`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ reason: 'Khách hàng không thể tự từ chối' });
    expect(resCustomer.status).toBe(403);

    const resStaff = await request(app)
      .put(`/api/bookings/${pendingRefundBooking._id}/refund/reject`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ reason: 'Nhân viên không có thẩm quyền từ chối hoàn tiền' });
    expect(resStaff.status).toBe(403);
  });

  it('3. Returns 403 Forbidden when manager of another branch (manager_mk) attempts to reject refund for CN-DAD', async () => {
    const res = await request(app)
      .put(`/api/bookings/${pendingRefundBooking._id}/refund/reject`)
      .set('Authorization', `Bearer ${managerMkToken}`)
      .send({ reason: 'Từ chối trái chi nhánh' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/chi nhánh/i);
  });

  it('4. Returns 400 Bad Request when reason is missing or less than 3 characters', async () => {
    const resNoReason = await request(app)
      .put(`/api/bookings/${pendingRefundBooking._id}/refund/reject`)
      .set('Authorization', `Bearer ${managerDadToken}`)
      .send({});

    expect(resNoReason.status).toBe(400);

    const resShortReason = await request(app)
      .put(`/api/bookings/${pendingRefundBooking._id}/refund/reject`)
      .set('Authorization', `Bearer ${managerDadToken}`)
      .send({ reason: 'k' });

    expect(resShortReason.status).toBe(400);
  });

  it('5. Returns 404 when booking does not exist', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    const res = await request(app)
      .put(`/api/bookings/${fakeId}/refund/reject`)
      .set('Authorization', `Bearer ${managerDadToken}`)
      .send({ reason: 'Đơn không tồn tại' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('6. Returns 400 when attempting to reject refund for booking with no pending refund', async () => {
    const noRefundBooking = await Booking.create({
      bookingCode: 'MTR-NO-REFUND-DENY',
      userId: testCustomer._id,
      vehicleId: testVehicle._id,
      pickupBranchId: branchDad._id,
      returnBranchId: branchDad._id,
      pickupDateTime: new Date(),
      returnDateTime: new Date(Date.now() + 86400000),
      totalAmount: 150000,
      depositAmount: 45000,
      remainingAmount: 105000,
      startOdometer: 3200,
      status: 'Confirmed',
      refundStatus: 'None',
      paymentMethod: 'Banking',
    });

    const res = await request(app)
      .put(`/api/bookings/${noRefundBooking._id}/refund/reject`)
      .set('Authorization', `Bearer ${managerDadToken}`)
      .send({ reason: 'Không có yêu cầu hoàn tiền' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);

    await Booking.deleteOne({ _id: noRefundBooking._id });
  });

  it('7. Successfully rejects refund (UC-76) with reason by assigned BranchManager, marks Payment FAILED, and notifies customer', async () => {
    const rejectReasonText = 'Khách hàng vi phạm điều khoản hợp đồng bàn giao, không đủ điều kiện hoàn trả cọc';
    const res = await request(app)
      .put(`/api/bookings/${pendingRefundBooking._id}/refund/reject`)
      .set('Authorization', `Bearer ${managerDadToken}`)
      .send({
        reason: rejectReasonText,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.refundStatus).toBe('Rejected');
    expect(res.body.data.rejectReason).toBe(rejectReasonText);

    // Verify DB update
    const updated = await Booking.findById(pendingRefundBooking._id);
    expect(updated?.refundStatus).toBe('Rejected');
    expect(updated?.rejectReason).toBe(rejectReasonText);

    // Verify Payment marked FAILED
    const refundPayment = await Payment.findOne({
      bookingId: pendingRefundBooking._id,
      type: 'REFUND',
    });
    expect(refundPayment).toBeDefined();
    expect(refundPayment?.status).toBe('FAILED');

    // Verify customer notification
    const notif = await Notification.findOne({
      userId: testCustomer._id,
      type: 'BOOKING',
    }).sort({ createdAt: -1 });

    expect(notif).toBeDefined();
    expect(notif?.body).toContain(rejectReasonText);
  });

  it('8. Returns 400 when attempting to reject an already rejected refund', async () => {
    const res = await request(app)
      .put(`/api/bookings/${pendingRefundBooking._id}/refund/reject`)
      .set('Authorization', `Bearer ${managerDadToken}`)
      .send({ reason: 'Từ chối lần 2' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/đã bị từ chối trước đó/i);
  });
});
