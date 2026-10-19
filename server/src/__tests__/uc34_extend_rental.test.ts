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

describe('UC-34: Extend Rental (FE/BE Extension Flow)', () => {
  let customerToken: string;
  let otherCustomerToken: string;
  let customerUser: any;
  let vehicleDoc: any;
  let branchDAD: any;
  let activeBooking: any;
  let conflictingBooking: any;

  beforeAll(async () => {
    await setupTestEnvironment();

    customerUser = await User.findOne({ username: 'customer_hoang' });
    const otherUser = await User.findOne({ roles: 'Customer', username: { $ne: 'customer_hoang' } });
    vehicleDoc = await Vehicle.findOne({ status: 'Available' });
    branchDAD = await Branch.findOne({ code: 'CN-DAD' });

    if (!customerUser || !vehicleDoc || !branchDAD || !otherUser) {
      throw new Error('Test fixtures missing in database');
    }

    customerToken = jwt.sign(
      { userId: customerUser._id.toString(), tokenVersion: customerUser.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    otherCustomerToken = jwt.sign(
      { userId: otherUser._id.toString(), tokenVersion: otherUser.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Create an active Confirmed booking for 2 days (48 hours)
    const basePickup = new Date(Date.now() + 24 * 3600 * 1000);
    basePickup.setHours(9, 0, 0, 0); // 09:00 AM (within operating hours)
    const baseReturn = new Date(basePickup.getTime() + 48 * 3600 * 1000);
    baseReturn.setHours(17, 0, 0, 0); // 17:00 PM (within operating hours)

    const dailyPrice = vehicleDoc.dailyPrice || 250000;
    const initialTotal = 2 * dailyPrice;

    activeBooking = await Booking.create({
      bookingCode: `MV-EXT${Date.now().toString().slice(-6)}`,
      userId: customerUser._id,
      vehicleId: vehicleDoc._id,
      pickupBranchId: branchDAD._id,
      returnBranchId: branchDAD._id,
      pickupDateTime: basePickup,
      returnDateTime: baseReturn,
      totalAmount: initialTotal,
      depositAmount: Math.round(initialTotal * 0.3),
      remainingAmount: initialTotal - Math.round(initialTotal * 0.3),
      paidAmount: Math.round(initialTotal * 0.3),
      discountAmount: 0,
      lateFee: 0,
      damageFee: 0,
      loyaltyPointsEarned: 50,
      status: 'Confirmed',
      paymentMethod: 'Banking',
      isPaid: false,
      depositPaid: true,
      startOdometer: 12000,
    });
  });

  afterAll(async () => {
    if (activeBooking?._id) {
      await Booking.deleteOne({ _id: activeBooking._id });
    }
    if (conflictingBooking?._id) {
      await Booking.deleteOne({ _id: conflictingBooking._id });
    }
  });

  it('1. POST /api/bookings/:id/estimate-extension returns preview without modifying DB', async () => {
    const newReturn = new Date(activeBooking.returnDateTime.getTime() + 24 * 3600 * 1000);
    newReturn.setHours(17, 0, 0, 0);

    const res = await request(app)
      .post(`/api/bookings/${activeBooking._id}/estimate-extension`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        newReturnDateTime: newReturn.toISOString(),
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.isAvailable).toBe(true);
    expect(res.body.data.addedAmount).toBeGreaterThan(0);
    expect(res.body.data.newTotalAmount).toBe(activeBooking.totalAmount + res.body.data.addedAmount);
    expect(res.body.data.newRemainingAmount).toBe(activeBooking.remainingAmount + res.body.data.addedAmount);

    // Ensure database was NOT yet modified
    const dbBooking = await Booking.findById(activeBooking._id);
    expect(dbBooking?.totalAmount).toBe(activeBooking.totalAmount);
  });

  it('2. PUT /api/bookings/:id/extend rejects earlier or identical return date with 400', async () => {
    const invalidDate = new Date(activeBooking.returnDateTime.getTime() - 3600 * 1000);

    const res = await request(app)
      .put(`/api/bookings/${activeBooking._id}/extend`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        newReturnDateTime: invalidDate.toISOString(),
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('3. PUT /api/bookings/:id/extend rejects unauthorized user with 403', async () => {
    const newReturn = new Date(activeBooking.returnDateTime.getTime() + 24 * 3600 * 1000);
    newReturn.setHours(17, 0, 0, 0);

    const res = await request(app)
      .put(`/api/bookings/${activeBooking._id}/extend`)
      .set('Authorization', `Bearer ${otherCustomerToken}`)
      .send({
        newReturnDateTime: newReturn.toISOString(),
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('4. PUT /api/bookings/:id/extend rejects with 409 if vehicle has conflicting schedule', async () => {
    // Create conflicting booking starting 12h after activeBooking's current return
    const conflictPickup = new Date(activeBooking.returnDateTime.getTime() + 12 * 3600 * 1000);
    conflictPickup.setHours(10, 0, 0, 0);
    const conflictReturn = new Date(conflictPickup.getTime() + 48 * 3600 * 1000);
    conflictReturn.setHours(18, 0, 0, 0);

    conflictingBooking = await Booking.create({
      bookingCode: `MV-CNF${Date.now().toString().slice(-6)}`,
      userId: customerUser._id,
      vehicleId: vehicleDoc._id,
      pickupBranchId: branchDAD._id,
      returnBranchId: branchDAD._id,
      pickupDateTime: conflictPickup,
      returnDateTime: conflictReturn,
      totalAmount: 500000,
      depositAmount: 150000,
      remainingAmount: 350000,
      paidAmount: 150000,
      status: 'Confirmed',
      paymentMethod: 'Banking',
      isPaid: false,
      depositPaid: true,
    });

    // Attempt to extend past conflictPickup (e.g. +36 hours)
    const targetReturn = new Date(activeBooking.returnDateTime.getTime() + 36 * 3600 * 1000);
    targetReturn.setHours(17, 0, 0, 0);

    const res = await request(app)
      .put(`/api/bookings/${activeBooking._id}/extend`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        newReturnDateTime: targetReturn.toISOString(),
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Phương tiện này đã có lịch đặt');
  });

  it('5. PUT /api/bookings/:id/extend successfully executes extension and recalculates price', async () => {
    // Delete conflicting booking first so slot is free
    if (conflictingBooking?._id) {
      await Booking.deleteOne({ _id: conflictingBooking._id });
    }

    const extendReturn = new Date(activeBooking.returnDateTime.getTime() + 24 * 3600 * 1000);
    extendReturn.setHours(17, 0, 0, 0);

    const res = await request(app)
      .put(`/api/bookings/${activeBooking._id}/extend`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        newReturnDateTime: extendReturn.toISOString(),
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    const updated = res.body.data;
    expect(new Date(updated.returnDateTime).getTime()).toBe(extendReturn.getTime());
    expect(updated.extensionCount).toBe(1);
    expect(updated.extensionSummary).toBeDefined();
    expect(updated.extensionSummary.addedAmount).toBeGreaterThan(0);
    expect(updated.totalAmount).toBe(activeBooking.totalAmount + updated.extensionSummary.addedAmount);
    expect(updated.remainingAmount).toBe(activeBooking.remainingAmount + updated.extensionSummary.addedAmount);

    // Verify in database
    const dbBooking = await Booking.findById(activeBooking._id);
    expect(dbBooking?.extensionCount).toBe(1);
    expect(dbBooking?.totalAmount).toBe(updated.totalAmount);
    expect(dbBooking?.remainingAmount).toBe(updated.remainingAmount);
    expect(dbBooking?.originalReturnDateTime).toBeDefined();
  });
});
