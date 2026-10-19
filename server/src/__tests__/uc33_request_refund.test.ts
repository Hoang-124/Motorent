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

describe('UC-33: Request Refund', () => {
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
    const branch = await Branch.findOne({ code: 'CN-DAD' });

    if (!customer || !vehicle || !branch) {
      throw new Error('Test fixtures missing in database');
    }

    customerId = customer._id as mongoose.Types.ObjectId;
    vehicleId = vehicle._id as mongoose.Types.ObjectId;
    branchId = branch._id as mongoose.Types.ObjectId;

    let otherCustomer = await User.findOne({ username: 'customer_other' });
    if (!otherCustomer) {
      otherCustomer = await User.create({
        username: 'customer_other_refund',
        email: 'other_refund@test.motorent.vn',
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

  it('1. POST /api/bookings/:id/refund successfully submits bank info for a cancelled booking', async () => {
    const booking = await Booking.create({
      bookingCode: `MV-REF1-${Date.now().toString().slice(-4)}`,
      userId: customerId,
      vehicleId,
      pickupBranchId: branchId,
      returnBranchId: branchId,
      pickupDateTime: new Date(Date.now() + 48 * 3600 * 1000),
      returnDateTime: new Date(Date.now() + 96 * 3600 * 1000),
      totalAmount: 1000000,
      depositAmount: 300000,
      paidAmount: 300000,
      refundAmount: 300000,
      status: 'Cancelled',
      refundStatus: 'Pending',
    });

    const res = await request(app)
      .post(`/api/bookings/${booking._id}/refund`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        bankName: 'MB Bank',
        bankAccountNumber: '0905123456',
        bankAccountName: 'HOANG BAC',
        reason: 'Hủy lịch công tác',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updated = await Booking.findById(booking._id);
    expect(updated?.refundBankInfo).toBeTruthy();
    expect(updated?.refundBankInfo?.bankName).toBe('MB Bank');
    expect(updated?.refundBankInfo?.bankAccountNumber).toBe('0905123456');
    expect(updated?.refundBankInfo?.bankAccountName).toBe('HOANG BAC');

    // Verify refund payment record
    const payment = await Payment.findOne({ bookingId: booking._id, type: 'REFUND' });
    expect(payment).toBeTruthy();
    expect(payment?.amount).toBe(300000);
    expect(payment?.status).toBe('PENDING');
  });

  it('2. Rejects refund request if booking is not Cancelled or Rejected (e.g. Confirmed)', async () => {
    const booking = await Booking.create({
      bookingCode: `MV-REF2-${Date.now().toString().slice(-4)}`,
      userId: customerId,
      vehicleId,
      pickupBranchId: branchId,
      returnBranchId: branchId,
      pickupDateTime: new Date(Date.now() + 48 * 3600 * 1000),
      returnDateTime: new Date(Date.now() + 96 * 3600 * 1000),
      totalAmount: 1000000,
      depositAmount: 300000,
      paidAmount: 300000,
      status: 'Confirmed',
    });

    const res = await request(app)
      .post(`/api/bookings/${booking._id}/refund`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        bankName: 'MB Bank',
        bankAccountNumber: '0905123456',
        bankAccountName: 'HOANG BAC',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Chỉ có thể yêu cầu hoàn tiền cho đơn đặt xe đã hủy hoặc bị từ chối/);
  });

  it('3. Rejects refund request if booking has 0 paid amount', async () => {
    const booking = await Booking.create({
      bookingCode: `MV-REF3-${Date.now().toString().slice(-4)}`,
      userId: customerId,
      vehicleId,
      pickupBranchId: branchId,
      returnBranchId: branchId,
      pickupDateTime: new Date(Date.now() + 48 * 3600 * 1000),
      returnDateTime: new Date(Date.now() + 96 * 3600 * 1000),
      totalAmount: 1000000,
      depositAmount: 300000,
      paidAmount: 0,
      status: 'Cancelled',
    });

    const res = await request(app)
      .post(`/api/bookings/${booking._id}/refund`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        bankName: 'MB Bank',
        bankAccountNumber: '0905123456',
        bankAccountName: 'HOANG BAC',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/chưa phát sinh khoản tiền thanh toán/);
  });

  it('4. Rejects refund request if customer does not own the booking (403 Forbidden)', async () => {
    const booking = await Booking.create({
      bookingCode: `MV-REF4-${Date.now().toString().slice(-4)}`,
      userId: customerId,
      vehicleId,
      pickupBranchId: branchId,
      returnBranchId: branchId,
      pickupDateTime: new Date(Date.now() + 48 * 3600 * 1000),
      returnDateTime: new Date(Date.now() + 96 * 3600 * 1000),
      totalAmount: 1000000,
      depositAmount: 300000,
      paidAmount: 300000,
      status: 'Cancelled',
    });

    const res = await request(app)
      .post(`/api/bookings/${booking._id}/refund`)
      .set('Authorization', `Bearer ${otherCustomerToken}`)
      .send({
        bankName: 'MB Bank',
        bankAccountNumber: '0905123456',
        bankAccountName: 'HOANG BAC',
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/Bạn không có quyền yêu cầu hoàn tiền/);
  });
});
