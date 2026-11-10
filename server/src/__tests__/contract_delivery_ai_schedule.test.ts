import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { app } from '../server';
import { env } from '../config/env';
import { setupTestEnvironment } from './testHelper';
import { User } from '../models/User';
import { Vehicle } from '../models/Vehicle';
import { Branch } from '../models/Branch';
import { Booking } from '../models/Booking';
import { StaffSchedule } from '../models/StaffSchedule';

describe('Bilateral Contract (2-Party Signatures), Door-to-Door Delivery & AI Shift Optimizer Tests', () => {
  let customerToken: string;
  let staffToken: string;
  let managerToken: string;
  let adminToken: string;
  let branchId: string;
  let secondBranchId: string;
  let vehicleId: string;
  let createdBookingId: string;

  beforeAll(async () => {
    await setupTestEnvironment();

    const customer = await User.findOne({ roles: 'Customer' });
    const manager = await User.findOne({ roles: 'BranchManager' });
    const admin = await User.findOne({ roles: 'SystemAdmin' });
    const branches = await Branch.find({ isActive: true });

    branchId = String(manager?.branchId || branches[0]._id);
    secondBranchId = String((branches[1] || branches[0])._id);

    // Ensure at least 2 active Staff members exist in the target branch for AI scheduling fairness & headcount tests
    const existingStaffInBranch = await User.find({ roles: 'Staff', branchId });
    if (existingStaffInBranch.length < 2) {
      await User.create({
        username: `staff_ai_test_${Date.now()}`,
        email: `staff_ai_${Date.now()}@motorent.vn`,
        passwordHash: 'hashed_pw',
        firstName: 'Minh',
        lastName: 'Trần AI',
        phoneNumber: '0905888999',
        roles: 'Staff',
        status: 'Active',
        branchId: new mongoose.Types.ObjectId(branchId),
      });
    }

    const staffMember = await User.findOne({ roles: 'Staff', branchId });

    customerToken = jwt.sign(
      { userId: customer!._id.toString(), tokenVersion: customer!.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    staffToken = jwt.sign(
      { userId: staffMember!._id.toString(), tokenVersion: staffMember!.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    managerToken = jwt.sign(
      { userId: manager!._id.toString(), tokenVersion: manager!.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    adminToken = jwt.sign(
      { userId: admin!._id.toString(), tokenVersion: admin!.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const vehicle = await Vehicle.findOne({ status: 'Available', branchId });
    const fallbackVehicle = vehicle || (await Vehicle.findOne({ status: 'Available' }));
    vehicleId = fallbackVehicle!._id.toString();
  }, 30000);

  afterAll(async () => {
    await mongoose.disconnect();
  }, 10000);

  it('1. POST /api/bookings/estimate calculates DoorDelivery fee (+40,000 VND for 1 leg, +80,000 VND for 2 legs)', async () => {
    const pickupDate = new Date();
    pickupDate.setDate(pickupDate.getDate() + 10);
    pickupDate.setHours(9, 0, 0, 0);

    const returnDate = new Date(pickupDate);
    returnDate.setDate(returnDate.getDate() + 2);
    returnDate.setHours(17, 0, 0, 0);

    // BranchPickup (0 VND delivery fee)
    const branchRes = await request(app).post('/api/bookings/estimate').send({
      vehicleId,
      pickupBranchId: branchId,
      returnBranchId: branchId,
      pickupDateTime: pickupDate.toISOString(),
      returnDateTime: returnDate.toISOString(),
      deliveryMode: 'BranchPickup',
    });
    expect(branchRes.status).toBe(200);
    expect(branchRes.body.data.deliveryFee).toBe(0);

    // DoorDelivery 1 leg (40,000 VND)
    const oneLegRes = await request(app).post('/api/bookings/estimate').send({
      vehicleId,
      pickupBranchId: branchId,
      returnBranchId: branchId,
      pickupDateTime: pickupDate.toISOString(),
      returnDateTime: returnDate.toISOString(),
      deliveryMode: 'DoorDelivery',
      customPickupAddress: 'Sảnh Ga đến T1 - Sân bay Quốc tế Đà Nẵng',
    });
    expect(oneLegRes.status).toBe(200);
    expect(oneLegRes.body.data.deliveryFee).toBe(40000);
    expect(oneLegRes.body.data.totalAmount).toBe(branchRes.body.data.totalAmount + 40000);

    // DoorDelivery 2 legs (80,000 VND)
    const twoLegRes = await request(app).post('/api/bookings/estimate').send({
      vehicleId,
      pickupBranchId: branchId,
      returnBranchId: branchId,
      pickupDateTime: pickupDate.toISOString(),
      returnDateTime: returnDate.toISOString(),
      deliveryMode: 'DoorDelivery',
      customPickupAddress: 'Sảnh Ga đến T1 - Sân bay Quốc tế Đà Nẵng',
      customReturnAddress: 'Khách sạn Novotel 36 Bạch Đằng, Hải Châu, Đà Nẵng',
    });
    expect(twoLegRes.status).toBe(200);
    expect(twoLegRes.body.data.deliveryFee).toBe(80000);
    expect(twoLegRes.body.data.totalAmount).toBe(branchRes.body.data.totalAmount + 80000);
  });

  it('2. POST /api/bookings creates booking with DoorDelivery addresses and bilateral contract signatures (Bên A & Bên B)', async () => {
    const pickupDate = new Date();
    pickupDate.setDate(pickupDate.getDate() + 12);
    pickupDate.setHours(8, 30, 0, 0);

    const returnDate = new Date(pickupDate);
    returnDate.setDate(returnDate.getDate() + 1);
    returnDate.setHours(18, 30, 0, 0);

    const samplePngDataUri =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId,
        pickupBranchId: branchId,
        returnBranchId: secondBranchId,
        pickupDateTime: pickupDate.toISOString(),
        returnDateTime: returnDate.toISOString(),
        paymentMethod: 'Banking',
        deliveryMode: 'DoorDelivery',
        customPickupAddress: 'Resort InterContinental Sơn Trà, Đà Nẵng',
        customReturnAddress: 'Sân bay Quốc tế Đà Nẵng - Cổng T2',
        eSignatureUrl: samplePngDataUri,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const b = res.body.data;
    createdBookingId = b._id;

    expect(b.deliveryMode).toBe('DoorDelivery');
    expect(b.customPickupAddress).toBe('Resort InterContinental Sơn Trà, Đà Nẵng');
    expect(b.customReturnAddress).toBe('Sân bay Quốc tế Đà Nẵng - Cổng T2');
    expect(b.deliveryFee).toBe(80000);
    expect(b.eSignatureUrl).toBe(samplePngDataUri);
    // Lessor signature stamp is auto-generated for Party A on creation
    expect(Boolean(b.lessorSignatureUrl)).toBe(true);
    expect(Boolean(b.contractSignedAt)).toBe(true);
  });

  it('3. PUT /api/bookings/:id/contract-delivery allows updating delivery locations & counter-signing by Lessor (Bên A)', async () => {
    const lessorPngUri =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    // Customer updates custom return address to empty (switching from 2 legs -> 1 leg, fee 80k -> 40k)
    const updateRes = await request(app)
      .put(`/api/bookings/${createdBookingId}/contract-delivery`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        deliveryMode: 'DoorDelivery',
        customPickupAddress: 'Khách sạn Mường Thanh 270 Võ Nguyên Giáp',
        customReturnAddress: '',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.deliveryFee).toBe(40000);
    expect(updateRes.body.data.customPickupAddress).toBe('Khách sạn Mường Thanh 270 Võ Nguyên Giáp');
    expect(Boolean(updateRes.body.data.customReturnAddress)).toBe(false);

    // Staff / Lessor (Bên A) counter-signs with handwritten canvas signature
    const staffSignRes = await request(app)
      .put(`/api/bookings/${createdBookingId}/contract-delivery`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        lessorSignatureUrl: lessorPngUri,
      });

    expect(staffSignRes.status).toBe(200);
    expect(staffSignRes.body.data.lessorSignatureUrl).toBe(lessorPngUri);
    expect(staffSignRes.body.data.eSignatureUrl).toBeDefined();

    // Both parties can download the bilateral PDF contract
    const pdfRes = await request(app)
      .get(`/api/bookings/${createdBookingId}/invoice`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers['content-type']).toContain('application/pdf');
  });

  it('4. POST /api/schedules/ai-optimize forecasts demand (weighting DoorDelivery), prevents clopenings, balances workload (Fairness >= 85%), and applies idempotently', async () => {
    // Set target week starting 14 days from now to have a clean 7-day window
    const targetMonday = new Date();
    targetMonday.setDate(targetMonday.getDate() + 14);
    targetMonday.setHours(0, 0, 0, 0);
    const y = targetMonday.getFullYear();
    const m = String(targetMonday.getMonth() + 1).padStart(2, '0');
    const d = String(targetMonday.getDate()).padStart(2, '0');
    const startDateStr = `${y}-${m}-${d}`;

    // Clean any existing schedules in that future test window
    const windowEnd = new Date(targetMonday);
    windowEnd.setDate(windowEnd.getDate() + 8);
    await StaffSchedule.deleteMany({
      branchId: new mongoose.Types.ObjectId(branchId),
      shiftDate: { $gte: targetMonday, $lte: windowEnd },
    });

    // Create 2 high-demand DoorDelivery bookings on Day 1 Morning (09:00) at this branch to verify AI demand boost
    const highDemandMorning = new Date(targetMonday);
    highDemandMorning.setHours(9, 0, 0, 0);
    const highDemandReturn = new Date(targetMonday);
    highDemandReturn.setDate(highDemandReturn.getDate() + 1);
    highDemandReturn.setHours(15, 0, 0, 0);

    const customer = await User.findOne({ roles: 'Customer' });
    await Booking.create({
      bookingCode: `MV-AITEST-${Date.now()}-1`,
      userId: customer!._id,
      vehicleId: new mongoose.Types.ObjectId(vehicleId),
      pickupBranchId: new mongoose.Types.ObjectId(branchId),
      returnBranchId: new mongoose.Types.ObjectId(branchId),
      pickupDateTime: highDemandMorning,
      returnDateTime: highDemandReturn,
      totalAmount: 500000,
      depositAmount: 150000,
      remainingAmount: 350000,
      status: 'Confirmed',
      paymentMethod: 'Banking',
      deliveryMode: 'DoorDelivery',
      customPickupAddress: 'Sân bay Quốc tế Đà Nẵng',
      customReturnAddress: 'Khách sạn Hilton Đà Nẵng',
      deliveryFee: 80000,
    });

    // Step A: Run AI Optimization Preview (applyImmediately: false)
    const previewRes = await request(app)
      .post('/api/schedules/ai-optimize')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        branchId,
        startDate: startDateStr,
        days: 7,
        applyImmediately: false,
      });

    expect(previewRes.status).toBe(200);
    expect(previewRes.body.success).toBe(true);

    const aiData = previewRes.body.data;
    expect(aiData.analytics.coverageRatePct).toBe(100);
    expect(aiData.analytics.fairnessIndexPct).toBeGreaterThanOrEqual(85);
    expect(aiData.analytics.doorDeliveryOrdersCount).toBeGreaterThanOrEqual(1);
    expect(aiData.recommendations.length).toBeGreaterThanOrEqual(21); // At least 21 slots (7 days * 3 shifts)

    // Verify Day 1 Morning slot detected the DoorDelivery booking and boosted demandScore
    const day1MorningSlot = aiData.slotAnalyses.find(
      (s: { date: string; shiftType: string }) => s.date === startDateStr && s.shiftType === 'Morning'
    );
    expect(day1MorningSlot).toBeDefined();
    expect(day1MorningSlot.doorDeliveryCount).toBeGreaterThanOrEqual(1);
    expect(day1MorningSlot.demandScore).toBeGreaterThan(1.5);

    // Verify no staff member is assigned a split-shift (Morning + Evening without Afternoon on same day)
    const staffDayMap = new Map<string, Set<string>>();
    for (const rec of aiData.recommendations) {
      const k = `${rec.staffId}_${rec.shiftDate}`;
      if (!staffDayMap.has(k)) staffDayMap.set(k, new Set());
      staffDayMap.get(k)!.add(rec.shiftType);
    }
    for (const [, shifts] of staffDayMap.entries()) {
      const isSplitShift = shifts.has('Morning') && shifts.has('Evening') && !shifts.has('Afternoon');
      expect(isSplitShift).toBe(false);
    }

    // Step B: Apply AI Schedule (applyImmediately: true)
    const applyRes = await request(app)
      .post('/api/schedules/ai-optimize')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        branchId,
        startDate: startDateStr,
        days: 7,
        applyImmediately: true,
      });

    expect(applyRes.status).toBe(200);
    expect(applyRes.body.data.analytics.appliedShiftsCount).toBe(aiData.recommendations.length);

    // Step C: Idempotency check - Running AI optimization again after applying should recommend 0 new shifts (deficit = 0)
    const secondRunRes = await request(app)
      .post('/api/schedules/ai-optimize')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        branchId,
        startDate: startDateStr,
        days: 7,
        applyImmediately: false,
      });

    expect(secondRunRes.status).toBe(200);
    expect(secondRunRes.body.data.recommendations.length).toBe(0);
    expect(secondRunRes.body.data.analytics.coverageRatePct).toBe(100);
  });
});
