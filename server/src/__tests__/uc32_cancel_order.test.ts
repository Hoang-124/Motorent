import { describe, it, expect, beforeAll } from 'vitest';
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
import { Discount } from '../models/Discount';

describe('UC-32: Cancel Rental Order (BR-06 Policy)', () => {
  let customerToken: string;
  let otherCustomerToken: string;
  let customerId: mongoose.Types.ObjectId;
  let otherCustomerId: mongoose.Types.ObjectId;
  let vehicleId: mongoose.Types.ObjectId;
  let branchId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    await setupTestEnvironment();

    const customer = await User.findOne({ username: 'customer_hoang' });
    const vehicle = await Vehicle.findOne({ status: 'Available' });
    const branchDAD = await Branch.findOne({ code: 'CN-DAD' });

    if (!customer || !vehicle || !branchDAD) {
      throw new Error('Test fixtures missing in database');
    }

    customerId = customer._id as mongoose.Types.ObjectId;
    vehicleId = vehicle._id as mongoose.Types.ObjectId;
    branchId = branchDAD._id as mongoose.Types.ObjectId;

    // Create another customer for authorization test
    let otherCustomer = await User.findOne({ username: 'customer_other' });
    if (!otherCustomer) {
      otherCustomer = await User.create({
        username: 'customer_other',
        email: 'other@test.motorent.vn',
        passwordHash: 'dummyhash',
        firstName: 'Other',
        lastName: 'User',
        roles: 'Customer',
        identityStatus: 'Verified',
      });
    }
    otherCustomerId = otherCustomer._id as mongoose.Types.ObjectId;

    customerToken = jwt.sign(
      { userId: customerId.toString(), tokenVersion: customer.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    otherCustomerToken = jwt.sign(
      { userId: otherCustomerId.toString(), tokenVersion: otherCustomer.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  });

  it('1. Free cancellation when cancelled > 24 hours before pickup (100% refund of deposit)', async () => {
    // Booking 48 hours in future
    const pickupDateTime = new Date(Date.now() + 48 * 3600 * 1000);
    const returnDateTime = new Date(Date.now() + 96 * 3600 * 1000);
    const totalAmount = 1000000;
    const depositAmount = 300000;

    const booking = await Booking.create({
      bookingCode: `MV-CANC1-${Date.now().toString().slice(-4)}`,
      userId: customerId,
      vehicleId,
      pickupBranchId: branchId,
      returnBranchId: branchId,
      pickupDateTime,
      returnDateTime,
      totalAmount,
      depositAmount,
      remainingAmount: totalAmount - depositAmount,
      paidAmount: depositAmount,
      depositPaid: true,
      status: 'Confirmed',
    });

    const res = await request(app)
      .put(`/api/bookings/${booking._id}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ cancelReason: 'Kế hoạch công tác bị thay đổi' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updatedBooking = await Booking.findById(booking._id);
    expect(updatedBooking?.status).toBe('Cancelled');
    expect(updatedBooking?.cancelReason).toBe('Kế hoạch công tác bị thay đổi');
    expect(updatedBooking?.refundForfeitAmount).toBe(0);
    expect(updatedBooking?.refundAmount).toBe(depositAmount); // 100% refund
    expect(updatedBooking?.refundStatus).toBe('Pending');

    // Verify refund payment record created
    const refundPayment = await Payment.findOne({
      bookingId: booking._id,
      type: 'REFUND',
    });
    expect(refundPayment).toBeTruthy();
    expect(refundPayment?.amount).toBe(depositAmount);
    expect(refundPayment?.status).toBe('PENDING');

    // Verify vehicle released
    const v = await Vehicle.findById(vehicleId);
    expect(v?.status).toBe('Available');
  });

  it('2. Forfeit 50% deposit when cancelled within 24 hours of pickup (< 24h)', async () => {
    // Booking 12 hours in future (< 24h)
    const pickupDateTime = new Date(Date.now() + 12 * 3600 * 1000);
    const returnDateTime = new Date(Date.now() + 60 * 3600 * 1000);
    const totalAmount = 1000000;
    const depositAmount = 300000; // 300,000 VND
    const expectedForfeit = 150000; // 50% of deposit
    const expectedRefund = 150000; // paidAmount - forfeit

    const booking = await Booking.create({
      bookingCode: `MV-CANC2-${Date.now().toString().slice(-4)}`,
      userId: customerId,
      vehicleId,
      pickupBranchId: branchId,
      returnBranchId: branchId,
      pickupDateTime,
      returnDateTime,
      totalAmount,
      depositAmount,
      remainingAmount: totalAmount - depositAmount,
      paidAmount: depositAmount,
      depositPaid: true,
      status: 'Confirmed',
    });

    const res = await request(app)
      .put(`/api/bookings/${booking._id}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ cancelReason: 'Đổi sang mẫu xe khác' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updatedBooking = await Booking.findById(booking._id);
    expect(updatedBooking?.status).toBe('Cancelled');
    expect(updatedBooking?.refundForfeitAmount).toBe(expectedForfeit);
    expect(updatedBooking?.refundAmount).toBe(expectedRefund);
    expect(updatedBooking?.refundStatus).toBe('Pending');
  });

  it('3. Free cancellation on unpaid booking (0 deposit paid)', async () => {
    const pickupDateTime = new Date(Date.now() + 5 * 3600 * 1000);
    const returnDateTime = new Date(Date.now() + 29 * 3600 * 1000);

    const booking = await Booking.create({
      bookingCode: `MV-CANC3-${Date.now().toString().slice(-4)}`,
      userId: customerId,
      vehicleId,
      pickupBranchId: branchId,
      returnBranchId: branchId,
      pickupDateTime,
      returnDateTime,
      totalAmount: 500000,
      depositAmount: 150000,
      remainingAmount: 500000,
      paidAmount: 0,
      status: 'Pending',
    });

    const res = await request(app)
      .put(`/api/bookings/${booking._id}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ cancelReason: 'Đặt nhầm ngày nhận xe' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updatedBooking = await Booking.findById(booking._id);
    expect(updatedBooking?.status).toBe('Cancelled');
    expect(updatedBooking?.refundAmount).toBe(0);
    expect(updatedBooking?.refundStatus).toBe('None');
  });

  it('4. Exception 32.0.E1: Disallow cancellation if booking is already Ongoing', async () => {
    const booking = await Booking.create({
      bookingCode: `MV-CANC4-${Date.now().toString().slice(-4)}`,
      userId: customerId,
      vehicleId,
      pickupBranchId: branchId,
      returnBranchId: branchId,
      pickupDateTime: new Date(Date.now() - 3600 * 1000),
      returnDateTime: new Date(Date.now() + 24 * 3600 * 1000),
      totalAmount: 500000,
      status: 'Ongoing',
    });

    const res = await request(app)
      .put(`/api/bookings/${booking._id}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send();

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/Không thể hủy đơn đặt xe đang trong hành trình/);
  });

  it('5. Exception 32.0.E1: Disallow cancellation if already Cancelled', async () => {
    const booking = await Booking.create({
      bookingCode: `MV-CANC5-${Date.now().toString().slice(-4)}`,
      userId: customerId,
      vehicleId,
      pickupBranchId: branchId,
      returnBranchId: branchId,
      pickupDateTime: new Date(Date.now() + 48 * 3600 * 1000),
      returnDateTime: new Date(Date.now() + 72 * 3600 * 1000),
      totalAmount: 500000,
      status: 'Cancelled',
    });

    const res = await request(app)
      .put(`/api/bookings/${booking._id}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send();

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/không thể thực hiện thao tác hủy/);
  });

  it('6. Authorization check: Customer cannot cancel another customer\'s booking', async () => {
    const booking = await Booking.create({
      bookingCode: `MV-CANC6-${Date.now().toString().slice(-4)}`,
      userId: customerId,
      vehicleId,
      pickupBranchId: branchId,
      returnBranchId: branchId,
      pickupDateTime: new Date(Date.now() + 48 * 3600 * 1000),
      returnDateTime: new Date(Date.now() + 72 * 3600 * 1000),
      totalAmount: 500000,
      status: 'Pending',
    });

    const res = await request(app)
      .put(`/api/bookings/${booking._id}/cancel`)
      .set('Authorization', `Bearer ${otherCustomerToken}`)
      .send();

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/Bạn không có quyền/);
  });

  it('7. Rollback discount usage count upon cancellation', async () => {
    const discount = await Discount.create({
      code: `PROMO-${Date.now().toString().slice(-5)}`,
      discountPercent: 10,
      usedCount: 5,
      usageLimit: 100,
      startDate: new Date(Date.now() - 3600000),
      endDate: new Date(Date.now() + 86400000),
      isActive: true,
    });

    const booking = await Booking.create({
      bookingCode: `MV-CANC7-${Date.now().toString().slice(-4)}`,
      userId: customerId,
      vehicleId,
      pickupBranchId: branchId,
      returnBranchId: branchId,
      pickupDateTime: new Date(Date.now() + 48 * 3600 * 1000),
      returnDateTime: new Date(Date.now() + 72 * 3600 * 1000),
      totalAmount: 900000,
      discountId: discount._id,
      discountAmount: 100000,
      status: 'Confirmed',
    });

    const res = await request(app)
      .put(`/api/bookings/${booking._id}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send();

    expect(res.status).toBe(200);

    const updatedDiscount = await Discount.findById(discount._id);
    expect(updatedDiscount?.usedCount).toBe(4); // Rolled back from 5 to 4
  });
});
