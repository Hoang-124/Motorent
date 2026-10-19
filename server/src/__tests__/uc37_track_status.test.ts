import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import jwt from 'jsonwebtoken';
import { setupTestEnvironment } from './testHelper';
import { Booking } from '../models/Booking';
import { Vehicle } from '../models/Vehicle';
import { Branch } from '../models/Branch';
import { User } from '../models/User';
import { env } from '../config/env';
import { io } from '../server';
import { emitBookingStatus, BookingStatusPayload } from '../modules/booking/bookingEvents';

describe('UC-37: Track Status Real-Time Socket Tests', () => {
  let customerUser: any;
  let otherUser: any;
  let testBooking: any;

  beforeAll(async () => {
    await setupTestEnvironment();

    customerUser = await User.findOne({ username: 'customer_hoang' });
    otherUser = await User.findOne({ roles: 'Customer', username: { $ne: 'customer_hoang' } });
    const vehicle = await Vehicle.findOne({ status: 'Available' });
    const branchDAD = await Branch.findOne({ code: 'CN-DAD' });

    if (!customerUser || !vehicle || !branchDAD) {
      throw new Error('Test fixtures missing in database');
    }

    testBooking = await Booking.create({
      bookingCode: `MV-TRK${Date.now().toString().slice(-6)}`,
      userId: customerUser._id,
      vehicleId: vehicle._id,
      pickupBranchId: branchDAD._id,
      returnBranchId: branchDAD._id,
      pickupDateTime: new Date(Date.now() + 24 * 3600 * 1000),
      returnDateTime: new Date(Date.now() + 72 * 3600 * 1000),
      totalAmount: 1200000,
      depositAmount: 360000,
      remainingAmount: 840000,
      paidAmount: 360000,
      status: 'Confirmed',
      paymentMethod: 'Banking',
      isPaid: false,
      depositPaid: true,
    });
  });

  afterAll(async () => {
    if (testBooking?._id) {
      await Booking.deleteOne({ _id: testBooking._id });
    }
  });

  it('1. emitBookingStatus emits accurate minimal payload without PII', () => {
    let emittedRooms: string[] = [];
    let emittedEvents: Array<{ event: string; payload: BookingStatusPayload }> = [];

    // Mock io.to
    const originalTo = io.to;
    io.to = ((room: string) => {
      emittedRooms.push(room);
      return {
        emit: (event: string, payload: any) => {
          emittedEvents.push({ event, payload });
          return true;
        },
      } as any;
    }) as any;

    try {
      emitBookingStatus(testBooking);

      expect(emittedRooms).toContain(`booking:${testBooking._id.toString()}`);
      expect(emittedRooms).toContain(`user:${customerUser._id.toString()}`);
      expect(emittedEvents.length).toBe(2);

      const payload = emittedEvents[0].payload;
      expect(payload.bookingId).toBe(testBooking._id.toString());
      expect(payload.bookingCode).toBe(testBooking.bookingCode);
      expect(payload.status).toBe('Confirmed');
      expect(payload.depositPaid).toBe(true);
      expect(payload.isPaid).toBe(false);
      expect(payload.remainingAmount).toBe(840000);
      expect(payload.updatedAt).toBeDefined();

      // Ensure no PII is leaked
      expect((payload as any).customerName).toBeUndefined();
      expect((payload as any).phoneNumber).toBeUndefined();
      expect((payload as any).idCardNumber).toBeUndefined();
    } finally {
      io.to = originalTo;
    }
  });

  it('2. emitBookingStatus handles updated status to Completed / Paid', async () => {
    testBooking.status = 'Completed';
    testBooking.isPaid = true;
    testBooking.remainingAmount = 0;
    testBooking.paidAmount = 1200000;
    await testBooking.save();

    let capturedPayload: any = null;
    const originalTo = io.to;
    io.to = ((room: string) => {
      return {
        emit: (event: string, payload: any) => {
          if (room === `booking:${testBooking._id.toString()}`) {
            capturedPayload = payload;
          }
          return true;
        },
      } as any;
    }) as any;

    try {
      emitBookingStatus(testBooking);
      expect(capturedPayload).not.toBeNull();
      expect(capturedPayload.status).toBe('Completed');
      expect(capturedPayload.isPaid).toBe(true);
      expect(capturedPayload.remainingAmount).toBe(0);
    } finally {
      io.to = originalTo;
    }
  });

  it('3. Generates valid token for customer to connect socket', () => {
    const token = jwt.sign(
      { userId: customerUser._id.toString(), tokenVersion: customerUser.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
    expect(decoded.userId).toBe(customerUser._id.toString());
  });
});
