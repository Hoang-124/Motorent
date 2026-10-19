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

describe('UC-75: Approve Refund Integration Tests (PUT /api/bookings/:id/refund/approve)', () => {
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

    // Ensure manager_dad exists
    let managerDad = await User.findOne({ username: 'manager_dad_uc75' });
    if (!managerDad) {
      managerDad = await User.create({
        username: 'manager_dad_uc75',
        email: 'manager.dad.uc75@motorent.vn',
        passwordHash: 'dummy',
        firstName: 'Trần Văn',
        lastName: 'Quản Lý Sân Bay',
        phoneNumber: '0905123456',
        roles: 'BranchManager',
        status: 'Active',
        branchId: branchDad._id,
        identityStatus: 'Verified',
        tokenVersion: 0,
        isEmailVerified: true,
      });
    }

    // Ensure manager_mk exists
    let managerMk = await User.findOne({ username: 'manager_mk_uc75' });
    if (!managerMk) {
      managerMk = await User.create({
        username: 'manager_mk_uc75',
        email: 'manager.mk.uc75@motorent.vn',
        passwordHash: 'dummy',
        firstName: 'Lê Hoàng',
        lastName: 'Quản Lý Mỹ Khê',
        phoneNumber: '0905789123',
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

    // Create a cancelled booking with pending refund
    pendingRefundBooking = await Booking.create({
      bookingCode: 'MTR-REFUND-001',
      userId: testCustomer._id,
      vehicleId: testVehicle._id,
      pickupBranchId: branchDad._id,
      returnBranchId: branchDad._id,
      pickupDateTime: new Date(Date.now() + 86400000 * 3),
      returnDateTime: new Date(Date.now() + 86400000 * 5),
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
      cancelReason: 'Khách đổi lịch công tác',
      cancelledAt: new Date(),
    });

    // Create pending refund payment record
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
    await User.deleteMany({ username: { $in: ['manager_dad_uc75', 'manager_mk_uc75'] } });
    await teardownTestEnvironment();
  }, 10000);

  it('1. Returns 401 Unauthorized when unauthenticated', async () => {
    const res = await request(app)
      .put(`/api/bookings/${pendingRefundBooking._id}/refund/approve`)
      .send();

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('2. Returns 403 Forbidden when requested by Customer or Staff (requires Manager or Admin)', async () => {
    const resCustomer = await request(app)
      .put(`/api/bookings/${pendingRefundBooking._id}/refund/approve`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send();
    expect(resCustomer.status).toBe(403);

    const resStaff = await request(app)
      .put(`/api/bookings/${pendingRefundBooking._id}/refund/approve`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send();
    expect(resStaff.status).toBe(403);
  });

  it('3. Returns 403 Forbidden when manager of another branch (manager_mk) attempts to approve refund for CN-DAD', async () => {
    const res = await request(app)
      .put(`/api/bookings/${pendingRefundBooking._id}/refund/approve`)
      .set('Authorization', `Bearer ${managerMkToken}`)
      .send({ note: 'Duyệt trái quyền chi nhánh' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/chi nhánh/i);
  });

  it('4. Returns 404 when booking does not exist', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    const res = await request(app)
      .put(`/api/bookings/${fakeId}/refund/approve`)
      .set('Authorization', `Bearer ${managerDadToken}`)
      .send();

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('5. Returns 400 when attempting to approve a booking with no pending refund', async () => {
    // Create non-refund booking
    const noRefundBooking = await Booking.create({
      bookingCode: 'MTR-NO-REFUND',
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
      .put(`/api/bookings/${noRefundBooking._id}/refund/approve`)
      .set('Authorization', `Bearer ${managerDadToken}`)
      .send();

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);

    await Booking.deleteOne({ _id: noRefundBooking._id });
  });

  it('6. Successfully approves refund (UC-75) by assigned BranchManager, completes Payment record, and notifies customer', async () => {
    const res = await request(app)
      .put(`/api/bookings/${pendingRefundBooking._id}/refund/approve`)
      .set('Authorization', `Bearer ${managerDadToken}`)
      .send({
        refundAmount: 90000,
        note: 'Đã hoàn tiền 100% qua tài khoản Vietcombank',
        bankName: 'Vietcombank',
        bankAccount: '1012345678',
        bankAccountName: 'NGUYEN HUY HOANG',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.refundStatus).toBe('Approved');
    expect(res.body.data.refundAmount).toBe(90000);

    // Verify DB update
    const updated = await Booking.findById(pendingRefundBooking._id);
    expect(updated?.refundStatus).toBe('Approved');

    // Verify Payment completed
    const refundPayment = await Payment.findOne({
      bookingId: pendingRefundBooking._id,
      type: 'REFUND',
    });
    expect(refundPayment).toBeDefined();
    expect(refundPayment?.status).toBe('SUCCESS');

    // Verify customer notification sent
    const notif = await Notification.findOne({
      userId: testCustomer._id,
      type: 'BOOKING',
    });
    expect(notif).toBeDefined();
    expect(notif?.body).toMatch(/90\.000/);
  });

  it('7. Returns 400 when attempting to re-approve an already approved refund', async () => {
    const res = await request(app)
      .put(`/api/bookings/${pendingRefundBooking._id}/refund/approve`)
      .set('Authorization', `Bearer ${managerDadToken}`)
      .send();

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/đã được phê duyệt trước đó/i);
  });
});
