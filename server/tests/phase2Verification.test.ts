import { describe, it, expect, vi, afterEach } from 'vitest';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import type { Response, NextFunction } from 'express';
import {
  aiOptimizeSchedules,
  compareShiftCandidates,
  getMyTodaySchedule,
  parseLocalDateKey,
  pickActiveTodayShift,
  shouldPreserveShiftOnOverwrite,
  sortShiftsChronologically,
} from '../src/modules/hr/scheduleController';
import * as geminiShiftService from '../src/modules/hr/geminiShiftService';
import { parseStaffAvailabilityMessage, toLocalDateKey } from '../src/modules/hr/availabilityParser';
import * as bookingService from '../src/modules/booking/bookingService';
import * as authService from '../src/modules/auth/authService';
import * as vnpayService from '../src/modules/payment/vnpayService';
import { Branch } from '../src/models/Branch';
import { User, type IUser } from '../src/models/User';
import { StaffSchedule } from '../src/models/StaffSchedule';
import { StaffAvailability } from '../src/models/StaffAvailability';
import { Booking } from '../src/models/Booking';
import { Payment } from '../src/models/Payment';
import { AuditLog } from '../src/models/AuditLog';
import { Notification } from '../src/models/Notification';
import { AppError } from '../src/core/errorHandler';
import type { AuthenticatedRequest } from '../src/core/authMiddleware';

describe('Phase 2 Verification Suite (AI Shift Optimizer, NLP, Booking Balance/Cancel, OTP Gate & VietQR)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses Vietnamese NLP negated shift expressions accurately ("t2 bận ca 1", "t3 ko làm ca 2", "t4 nghỉ sáng", "t5 1 2 bận 3")', () => {
    const monday = parseLocalDateKey('2026-11-16');
    const parsed = parseStaffAvailabilityMessage(
      't2 bận ca 1, t3 ko làm ca 2, t4 nghỉ sáng, t5 1 2 bận 3, t6 bận',
      monday
    );

    const monSlot = parsed.slots.find((s) => s.dayOfWeek === 1);
    const tueSlot = parsed.slots.find((s) => s.dayOfWeek === 2);
    const wedSlot = parsed.slots.find((s) => s.dayOfWeek === 3);
    const thuSlot = parsed.slots.find((s) => s.dayOfWeek === 4);
    const friSlot = parsed.slots.find((s) => s.dayOfWeek === 5);

    expect(monSlot?.isAllDayBusy).toBe(false);
    expect(monSlot?.busyShifts).toEqual(['Morning']);
    expect(monSlot?.availableShifts).toEqual(['Afternoon', 'Evening']);

    expect(tueSlot?.isAllDayBusy).toBe(false);
    expect(tueSlot?.busyShifts).toEqual(['Afternoon']);
    expect(tueSlot?.availableShifts).toEqual(['Morning', 'Evening']);

    expect(wedSlot?.isAllDayBusy).toBe(false);
    expect(wedSlot?.busyShifts).toEqual(['Morning']);
    expect(wedSlot?.availableShifts).toEqual(['Afternoon', 'Evening']);

    expect(thuSlot?.isAllDayBusy).toBe(false);
    expect(thuSlot?.availableShifts).toEqual(['Morning', 'Afternoon']);
    expect(thuSlot?.busyShifts).toEqual(['Evening']);

    expect(friSlot?.isAllDayBusy).toBe(true);
    expect(friSlot?.availableShifts).toEqual([]);
  });

  it('orders double shifts chronologically (Morning -> Afternoon -> Evening) and advances active shift after clock-out', async () => {
    const staffId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const shiftDate = parseLocalDateKey('2026-11-18');

    // Afternoon created AFTER Morning (simulating AI sequential insert order)
    const afternoonDoc = {
      _id: new mongoose.Types.ObjectId(),
      staffId,
      branchId,
      shiftDate,
      shiftType: 'Afternoon',
      status: 'Assigned',
      checkInTime: null as Date | null,
      checkOutTime: null as Date | null,
      createdAt: new Date('2026-11-18T01:00:05.000Z'),
    };
    const morningDoc = {
      _id: new mongoose.Types.ObjectId(),
      staffId,
      branchId,
      shiftDate,
      shiftType: 'Morning',
      status: 'Assigned',
      checkInTime: null as Date | null,
      checkOutTime: null as Date | null,
      createdAt: new Date('2026-11-18T01:00:00.000Z'),
    };

    const sorted = sortShiftsChronologically([afternoonDoc, morningDoc]);
    expect(sorted.map((s) => s.shiftType)).toEqual(['Morning', 'Afternoon']);

    // Before clock-in: Morning must be chosen first despite Afternoon having newer createdAt
    const initialPick = pickActiveTodayShift([afternoonDoc, morningDoc]);
    expect(initialPick.activeShift?.shiftType).toBe('Morning');

    // Mock getMyTodaySchedule controller response
    vi.spyOn(StaffSchedule, 'find').mockImplementation((() => {
      const chain = Promise.resolve([afternoonDoc, morningDoc]) as unknown as Record<string, unknown>;
      chain.populate = () => chain;
      return chain;
    }) as unknown as typeof StaffSchedule.find);

    let jsonPayload: Record<string, unknown> = {};
    const req = { user: { _id: staffId, roles: 'Staff', branchId } } as unknown as AuthenticatedRequest;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn((body: Record<string, unknown>) => {
        jsonPayload = body;
        return res;
      }),
    } as unknown as Response;
    const next: NextFunction = vi.fn();

    await getMyTodaySchedule(req, res, next);
    expect((jsonPayload.data as { shiftType?: string })?.shiftType).toBe('Morning');

    // Once Morning is clocked in and clocked out, active shift seamlessly advances to Afternoon
    morningDoc.status = 'Present';
    morningDoc.checkInTime = new Date('2026-11-18T00:02:00.000Z');
    morningDoc.checkOutTime = new Date('2026-11-18T05:01:00.000Z');

    const afterMorningDone = pickActiveTodayShift([afternoonDoc, morningDoc]);
    expect(afterMorningDone.activeShift?.shiftType).toBe('Afternoon');

    // Also verify compareShiftCandidates ranks available Tier-2 volunteer ahead of declared-busy Tier-1 staff
    const candidates = [
      { id: 'busy-tier1', isBusyByRegistration: true, tier: 1, totalUtility: 90 },
      { id: 'volunteer-13', isBusyByRegistration: false, tier: 2, totalUtility: 45 },
    ].sort(compareShiftCandidates);
    expect(candidates[0].id).toBe('volunteer-13');
  });

  it('preserves past/attended shifts on mid-week AI overwrite AND resets assignedCountMap when Gemini succeeds', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const managerId = new mongoose.Types.ObjectId();
    const staffAId = new mongoose.Types.ObjectId();
    const staffBId = new mongoose.Types.ObjectId();

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    const yesterdayKey = toLocalDateKey(yesterday);
    const todayKey = toLocalDateKey(now);
    const tomorrowKey = toLocalDateKey(tomorrow);

    // Direct unit check on shouldPreserveShiftOnOverwrite
    expect(
      shouldPreserveShiftOnOverwrite(
        { shiftDate: yesterday, status: 'Assigned', checkInTime: null, checkOutTime: null },
        todayKey
      )
    ).toBe(true);
    expect(
      shouldPreserveShiftOnOverwrite(
        { shiftDate: now, status: 'Present', checkInTime: new Date(), checkOutTime: null },
        todayKey
      )
    ).toBe(true);
    expect(
      shouldPreserveShiftOnOverwrite(
        { shiftDate: tomorrow, status: 'Assigned', checkInTime: null, checkOutTime: null },
        todayKey
      )
    ).toBe(false);

    // Mock Branch, User, StaffSchedule, Booking, StaffAvailability for aiOptimizeSchedules
    vi.spyOn(Branch, 'findById').mockImplementation((() => ({
      select: async () => ({
        _id: branchId,
        name: 'Chi nhánh Sân Bay Đà Nẵng',
        code: 'CN-DAD',
        address: 'Hải Châu, Đà Nẵng',
      }),
    })) as unknown as typeof Branch.findById);

    vi.spyOn(User, 'find').mockImplementation((() => ({
      select: () => ({
        lean: async () => [
          {
            _id: staffAId,
            firstName: 'Nguyễn',
            lastName: 'Thành An',
            email: 'an@motorent.vn',
            phoneNumber: '0905111222',
            username: 'staff_an',
          },
          {
            _id: staffBId,
            firstName: 'Trần',
            lastName: 'Minh Bình',
            email: 'binh@motorent.vn',
            phoneNumber: '0905333444',
            username: 'staff_binh',
          },
        ],
      }),
    })) as unknown as typeof User.find);

    const attendedTodayShift = {
      _id: new mongoose.Types.ObjectId(),
      staffId: { _id: staffAId, firstName: 'Nguyễn', lastName: 'Thành An' },
      branchId,
      shiftDate: now,
      shiftType: 'Morning',
      status: 'Present',
      checkInTime: new Date(),
      checkOutTime: null,
    };
    const unattendedTomorrowShift = {
      _id: new mongoose.Types.ObjectId(),
      staffId: { _id: staffBId, firstName: 'Trần', lastName: 'Minh Bình' },
      branchId,
      shiftDate: tomorrow,
      shiftType: 'Evening',
      status: 'Assigned',
      checkInTime: null,
      checkOutTime: null,
    };

    let findCallIndex = 0;
    vi.spyOn(StaffSchedule, 'find').mockImplementation((() => {
      findCallIndex += 1;
      if (findCallIndex === 1) {
        return {
          populate: async () => [attendedTodayShift, unattendedTomorrowShift],
        };
      }
      return Promise.resolve([]);
    }) as unknown as typeof StaffSchedule.find);

    vi.spyOn(Booking, 'find').mockImplementation((() => ({
      select: async () => [],
    })) as unknown as typeof Booking.find);

    vi.spyOn(StaffAvailability, 'find').mockImplementation((() => ({
      lean: async () => [],
    })) as unknown as typeof StaffAvailability.find);

    let capturedDeleteFilter: Record<string, unknown> | null = null;
    vi.spyOn(StaffSchedule, 'deleteMany').mockImplementation((async (filter: Record<string, unknown>) => {
      capturedDeleteFilter = filter;
      return { acknowledged: true, deletedCount: 1 };
    }) as unknown as typeof StaffSchedule.deleteMany);

    const createdDocs: Array<Record<string, unknown>> = [];
    vi.spyOn(StaffSchedule, 'create').mockImplementation((async (doc: Record<string, unknown>) => {
      createdDocs.push(doc);
      return { _id: new mongoose.Types.ObjectId(), ...doc };
    }) as unknown as typeof StaffSchedule.create);

    vi.spyOn(AuditLog, 'create').mockResolvedValue([] as never);

    // Mock Gemini returning exactly 2 future shifts (1 for staffA, 1 for staffB)
    vi.spyOn(geminiShiftService, 'runGeminiShiftOptimization').mockResolvedValue({
      engine: 'Google Gemini',
      modelUsed: 'gemini-2.5-flash',
      aiOverview: 'Gemini tối ưu ca liên tiếp và bảo toàn lịch sử chấm công.',
      recommendations: [
        {
          staffId: String(staffAId),
          staffName: 'Nguyễn Thành An',
          staffEmail: 'an@motorent.vn',
          shiftDate: todayKey,
          shiftType: 'Afternoon',
          demandScore: 1.4,
          confidenceScore: 95,
          reason: 'Khớp lịch đăng ký và ca liên tiếp 1-2',
          isConsecutive: true,
          isReluctant13: false,
          isMatchRegistration: true,
        },
        {
          staffId: String(staffBId),
          staffName: 'Trần Minh Bình',
          staffEmail: 'binh@motorent.vn',
          shiftDate: tomorrowKey,
          shiftType: 'Morning',
          demandScore: 1.2,
          confidenceScore: 93,
          reason: 'Đảm bảo định biên trực vận hành',
          isConsecutive: false,
          isReluctant13: false,
          isMatchRegistration: true,
        },
      ],
    });

    let responseBody: Record<string, unknown> = {};
    const req = {
      user: { _id: managerId, roles: 'BranchManager', branchId },
      body: {
        branchId: String(branchId),
        startDate: yesterdayKey,
        days: 3,
        overwriteExisting: true,
        applyImmediately: true,
      },
      query: {},
      ip: '127.0.0.1',
    } as unknown as AuthenticatedRequest;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn((payload: Record<string, unknown>) => {
        responseBody = payload;
        return res;
      }),
    } as unknown as Response;
    const next: NextFunction = vi.fn();

    await aiOptimizeSchedules(req, res, next);

    expect(responseBody.success).toBe(true);
    // Verify deleteMany strictly scopes to un-attended Assigned/Scheduled shifts >= startOfToday
    expect(capturedDeleteFilter).not.toBeNull();
    expect(capturedDeleteFilter).toMatchObject({
      status: { $in: ['Assigned', 'Scheduled'] },
      checkInTime: null,
      checkOutTime: null,
    });
    const shiftDateFilter = (capturedDeleteFilter as unknown as { shiftDate: { $gte: Date } }).shiftDate;
    expect(toLocalDateKey(shiftDateFilter.$gte)).toBe(todayKey);

    // Verify assignedCountMap was reset before Gemini shifts were counted:
    // staffA = 1 preserved Present shift + 1 Gemini shift = 2 (NOT heuristic + Gemini)
    // staffB = 0 preserved shifts + 1 Gemini shift = 1
    const data = responseBody.data as {
      staffWorkloadSummary: Array<{ staffId: string; totalShifts: number }>;
    };
    const summaryA = data.staffWorkloadSummary.find((s) => s.staffId === String(staffAId));
    const summaryB = data.staffWorkloadSummary.find((s) => s.staffId === String(staffBId));
    expect(summaryA?.totalShifts).toBe(2);
    expect(summaryB?.totalShifts).toBe(1);
    expect(createdDocs).toHaveLength(2);
  });

  it('keeps full 100% unpaid contract balance when approveBooking approves an unpaid Cash booking', async () => {
    const bookingId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const customerId = new mongoose.Types.ObjectId();
    const managerId = new mongoose.Types.ObjectId();

    const mockBookingDoc = {
      _id: bookingId,
      bookingCode: 'MV-CASH100',
      userId: { _id: customerId, email: 'cust@example.com', firstName: 'An', lastName: 'Lê' },
      vehicleId: new mongoose.Types.ObjectId(),
      pickupBranchId: branchId,
      returnBranchId: branchId,
      status: 'Pending',
      paymentMethod: 'Cash',
      totalAmount: 500_000,
      depositAmount: 150_000,
      paidAmount: 0,
      depositPaid: false,
      isPaid: false,
      remainingAmount: 350_000, // Initially 70% before fix
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(Booking, 'findById').mockImplementation((() => {
      const chain = Promise.resolve(mockBookingDoc) as unknown as Record<string, unknown>;
      chain.populate = () => chain;
      return chain;
    }) as unknown as typeof Booking.findById);
    vi.spyOn(AuditLog, 'create').mockResolvedValue([] as never);
    vi.spyOn(Notification, 'create').mockResolvedValue([] as never);
    vi.spyOn(Payment, 'create').mockResolvedValue({} as never);

    const managerUser = {
      _id: managerId,
      roles: 'BranchManager',
      branchId,
    } as unknown as IUser;

    await bookingService.approveBooking(bookingId.toString(), managerUser, 'Duyệt giữ xe thanh toán tại quầy');

    expect(mockBookingDoc.status).toBe('Approved');
    expect(mockBookingDoc.remainingAmount).toBe(500_000);

    // Staff can now collect full 100% (500,000 VND) at counter without 400 rejection
    await bookingService.recordCounterPayment(bookingId.toString(), managerUser, 500_000, 'Thu 100% tại quầy');
    expect(mockBookingDoc.paidAmount).toBe(500_000);
    expect(mockBookingDoc.remainingAmount).toBe(0);
    expect(mockBookingDoc.isPaid).toBe(true);
    expect(mockBookingDoc.status).toBe('Confirmed');
  });

  it('blocks Customer from self-cancelling an Ongoing rental online with 400 AppError', async () => {
    const bookingId = new mongoose.Types.ObjectId();
    const customerId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();

    vi.spyOn(Booking, 'findById').mockResolvedValue({
      _id: bookingId,
      bookingCode: 'MV-ONGOING1',
      userId: customerId,
      vehicleId: new mongoose.Types.ObjectId(),
      pickupBranchId: branchId,
      returnBranchId: branchId,
      status: 'Ongoing',
      pickupDateTime: new Date(Date.now() - 3600 * 1000),
      returnDateTime: new Date(Date.now() + 20 * 3600 * 1000),
      paidAmount: 150_000,
    } as unknown as Awaited<ReturnType<typeof Booking.findById>>);

    await expect(
      bookingService.cancelBooking(
        bookingId.toString(),
        { _id: customerId, roles: 'Customer' } as unknown as IUser,
        'Tự hủy giữa chừng'
      )
    ).rejects.toThrow('Phương tiện đang trong hành trình thuê');
  });

  it('enforces 6-digit OTP email verification gate in authService.login while allowing verified accounts', async () => {
    const passwordHash = await bcrypt.hash('StrongPass123!', 10);
    const userId = new mongoose.Types.ObjectId();

    const mockUserDoc = {
      _id: userId,
      username: 'new_rider',
      email: 'new_rider@outlook.com',
      passwordHash,
      roles: 'Customer',
      status: 'Unverified',
      isEmailVerified: false,
      failedLoginAttempts: 0,
      tokenVersion: 0,
      save: vi.fn().mockResolvedValue(true),
      toObject: function () {
        return { ...this };
      },
    };

    vi.spyOn(User, 'findOne').mockResolvedValue(
      mockUserDoc as unknown as Awaited<ReturnType<typeof User.findOne>>
    );

    // 1. Unverified account must be blocked with 403
    await expect(authService.login('new_rider@outlook.com', 'StrongPass123!')).rejects.toMatchObject({
      statusCode: 403,
    });

    // 2. Once OTP verified, login succeeds and returns JWT
    mockUserDoc.isEmailVerified = true;
    mockUserDoc.status = 'Active';
    const result = await authService.login('new_rider@outlook.com', 'StrongPass123!');
    expect(result.token).toBeTruthy();
    expect(result.user.username).toBe('new_rider');
  });

  it('preserves confirmVietQrPayment self-service confirmation flow for test/demo mode', async () => {
    const bookingId = new mongoose.Types.ObjectId();
    const customerId = new mongoose.Types.ObjectId();

    vi.spyOn(Booking, 'findById').mockResolvedValue({
      _id: bookingId,
      bookingCode: 'MV-VIETQR1',
      userId: customerId,
      status: 'Pending',
      totalAmount: 400_000,
      depositAmount: 120_000,
      paidAmount: 0,
      depositPaid: false,
      isPaid: false,
      remainingAmount: 280_000,
    } as unknown as Awaited<ReturnType<typeof Booking.findById>>);

    vi.spyOn(Booking, 'findByIdAndUpdate').mockImplementation(((_id, update) => {
      const setObj = (update as { $set: Record<string, unknown> }).$set;
      const updated = {
        _id: bookingId,
        bookingCode: 'MV-VIETQR1',
        userId: customerId,
        totalAmount: 400_000,
        depositAmount: 120_000,
        ...setObj,
      };
      const chain = Promise.resolve(updated) as unknown as Record<string, unknown>;
      chain.populate = () => chain;
      return chain;
    }) as unknown as typeof Booking.findByIdAndUpdate);

    vi.spyOn(Payment, 'create').mockResolvedValue({} as never);
    vi.spyOn(Notification, 'create').mockResolvedValue([] as never);
    vi.spyOn(AuditLog, 'create').mockResolvedValue([] as never);

    const confirmed = await vnpayService.confirmVietQrPayment({
      bookingId: bookingId.toString(),
      userId: customerId.toString(),
      paymentType: 'Full100',
    });

    expect(confirmed.status).toBe('Confirmed');
    expect(confirmed.isPaid).toBe(true);
    expect(confirmed.remainingAmount).toBe(0);
  });
});
