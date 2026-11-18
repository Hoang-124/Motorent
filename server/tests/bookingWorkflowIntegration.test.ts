import { describe, it, expect, vi, afterEach } from 'vitest';
import mongoose from 'mongoose';
import * as bookingService from '../src/modules/booking/bookingService';
import { Booking } from '../src/models/Booking';
import { Vehicle } from '../src/models/Vehicle';
import { Branch } from '../src/models/Branch';
import { User, IUser } from '../src/models/User';
import { AuditLog } from '../src/models/AuditLog';
import { Notification } from '../src/models/Notification';
import * as notificationService from '../src/modules/notifications/notificationService';
import * as notificationDispatch from '../src/core/notificationDispatch';
import { AppError } from '../src/core/errorHandler';

describe('Booking Service Workflow Integration (Handover, Cancel, No-Refund, Extension)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects requestRefund with 400 under strict NO-REFUND contract policy', async () => {
    const customerId = new mongoose.Types.ObjectId();
    const bookingId = new mongoose.Types.ObjectId();

    vi.spyOn(Booking, 'findById').mockResolvedValue({
      _id: bookingId,
      bookingCode: 'MV-NOREF1',
      userId: customerId,
      status: 'Cancelled',
      paidAmount: 250_000,
      refundAmount: 0,
      refundStatus: 'None',
    } as unknown as Awaited<ReturnType<typeof Booking.findById>>);

    await expect(
      bookingService.requestRefund(
        bookingId.toString(),
        { _id: customerId, roles: 'Customer' } as unknown as IUser,
        {
          bankName: 'Vietcombank',
          bankAccountNumber: '0123456789',
          bankAccountName: 'TRAN QUANG BUU HOANG',
        }
      )
    ).rejects.toThrowError(AppError);
  });

  it('enforces customer signature on checkinBooking and sets Ongoing + Rented upon valid handover', async () => {
    const bookingId = new mongoose.Types.ObjectId();
    const vehicleId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const customerId = new mongoose.Types.ObjectId();
    const staffId = new mongoose.Types.ObjectId();

    const mockBookingDoc = {
      _id: bookingId,
      bookingCode: 'MV-CHKIN1',
      userId: customerId,
      vehicleId,
      pickupBranchId: branchId,
      returnBranchId: branchId,
      status: 'Confirmed',
      startOdometer: 0,
      eSignatureUrl: '',
      lessorSignatureUrl: '',
      save: vi.fn().mockResolvedValue(true),
    };

    const mockVehicleDoc = {
      _id: vehicleId,
      licensePlate: '43D1-888.88',
      status: 'Available',
      odometer: 1200,
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(Booking, 'findById').mockImplementation((() => {
      const chain = Promise.resolve(mockBookingDoc) as unknown as Record<string, unknown>;
      chain.populate = () => chain;
      return chain;
    }) as unknown as typeof Booking.findById);
    vi.spyOn(Vehicle, 'findById').mockResolvedValue(
      mockVehicleDoc as unknown as Awaited<ReturnType<typeof Vehicle.findById>>
    );
    vi.spyOn(User, 'findById').mockResolvedValue({
      _id: customerId,
      username: 'customer01',
      identityStatus: 'Verified',
    } as unknown as Awaited<ReturnType<typeof User.findById>>);
    vi.spyOn(AuditLog, 'create').mockResolvedValue([] as never);
    vi.spyOn(notificationService, 'createUserNotification').mockResolvedValue({} as never);

    const staffUser = {
      _id: staffId,
      username: 'staff_dad',
      roles: 'Staff',
      branchId,
    } as unknown as IUser;

    // 1. Missing customer signature must fail with 400
    await expect(
      bookingService.checkinBooking(bookingId.toString(), staffUser, {
        startOdometer: 1250,
        startFuelLevel: '100%',
        checkinImages: ['a1.jpg', 'a2.jpg', 'a3.jpg', 'a4.jpg'],
        verifiedAtCounter: true,
      })
    ).rejects.toThrow('Yêu cầu chữ ký xác nhận của khách hàng khi bàn giao xe.');

    // 2. Providing customer signature succeeds, records both signatures, and marks vehicle Rented
    await bookingService.checkinBooking(bookingId.toString(), staffUser, {
      startOdometer: 1250,
      startFuelLevel: '100%',
      checkinImages: ['a1.jpg', 'a2.jpg', 'a3.jpg', 'a4.jpg'],
      eSignatureUrl: 'data:image/png;base64,CUST_SIG',
      verifiedAtCounter: true,
    });

    expect(mockBookingDoc.status).toBe('Ongoing');
    expect(mockBookingDoc.eSignatureUrl).toBe('data:image/png;base64,CUST_SIG');
    expect(mockBookingDoc.lessorSignatureUrl).toContain('MOTORENT-STAFF:staff_dad:');
    expect(mockVehicleDoc.status).toBe('Rented');
    expect(mockVehicleDoc.odometer).toBe(1250);
  });

  it('cancels paid booking with refundAmount = 0, refundStatus = None, and releases vehicle', async () => {
    const bookingId = new mongoose.Types.ObjectId();
    const vehicleId = new mongoose.Types.ObjectId();
    const customerId = new mongoose.Types.ObjectId();

    const mockBookingDoc = {
      _id: bookingId,
      bookingCode: 'MV-CANC01',
      userId: customerId,
      vehicleId,
      pickupBranchId: new mongoose.Types.ObjectId(),
      returnBranchId: new mongoose.Types.ObjectId(),
      pickupDateTime: new Date(Date.now() + 72 * 3600 * 1000), // 72h before pickup
      returnDateTime: new Date(Date.now() + 96 * 3600 * 1000),
      status: 'Confirmed',
      totalAmount: 500_000,
      depositAmount: 150_000,
      paidAmount: 150_000,
      refundAmount: 0,
      refundForfeitAmount: 0,
      refundStatus: 'None',
      save: vi.fn().mockResolvedValue(true),
      toObject: function () {
        return { ...this };
      },
    };

    vi.spyOn(Booking, 'findById').mockImplementation((() => {
      const chain = Promise.resolve(mockBookingDoc) as unknown as Record<string, unknown>;
      chain.populate = () => chain;
      return chain;
    }) as unknown as typeof Booking.findById);
    vi.spyOn(Booking, 'countDocuments').mockResolvedValue(0);
    const vehicleReleaseSpy = vi.spyOn(Vehicle, 'findOneAndUpdate').mockResolvedValue(null);
    vi.spyOn(AuditLog, 'create').mockResolvedValue([] as never);
    vi.spyOn(notificationService, 'createUserNotification').mockResolvedValue({} as never);

    const res = await bookingService.cancelBooking(
      bookingId.toString(),
      { _id: customerId, roles: 'Customer' } as unknown as IUser,
      'Thay đổi lịch bay'
    );

    expect(mockBookingDoc.status).toBe('Cancelled');
    expect(mockBookingDoc.refundAmount).toBe(0);
    expect(mockBookingDoc.refundForfeitAmount).toBe(150_000);
    expect(mockBookingDoc.refundStatus).toBe('None');
    expect(vehicleReleaseSpy).toHaveBeenCalledTimes(1);
    expect(res.policySummary).toBeDefined();
  });

  it('notifies branch staff, managers, and admins via notifyBranchOperations when customer extends booking', async () => {
    const bookingId = new mongoose.Types.ObjectId();
    const vehicleId = new mongoose.Types.ObjectId();
    const pickupBranchId = new mongoose.Types.ObjectId();
    const returnBranchId = new mongoose.Types.ObjectId();
    const customerId = new mongoose.Types.ObjectId();

    const pickupDate = new Date('2026-11-20T09:00:00+07:00');
    const oldReturnDate = new Date('2026-11-21T09:00:00+07:00');
    const newReturnDate = new Date('2026-11-22T09:00:00+07:00');

    const mockBookingDoc = {
      _id: bookingId,
      bookingCode: 'MV-EXT999',
      userId: customerId,
      vehicleId,
      pickupBranchId,
      returnBranchId,
      pickupDateTime: pickupDate,
      returnDateTime: oldReturnDate,
      status: 'Ongoing',
      totalAmount: 180_000,
      baseRentalAmount: 180_000,
      seasonalSurcharge: 0,
      depositAmount: 54_000,
      paidAmount: 54_000,
      depositPaid: true,
      remainingAmount: 126_000,
      deliveryFee: 0,
      discountAmount: 0,
      extensionCount: 0,
      save: vi.fn().mockResolvedValue(true),
      toObject: function () {
        return { ...this };
      },
    };

    vi.spyOn(Booking, 'findById').mockImplementation((() => {
      const chain = Promise.resolve(mockBookingDoc) as unknown as Record<string, unknown>;
      chain.populate = () => chain;
      return chain;
    }) as unknown as typeof Booking.findById);
    vi.spyOn(Booking, 'findOne').mockResolvedValue(null);
    vi.spyOn(Branch, 'findById').mockResolvedValue({
      _id: returnBranchId,
      name: 'Chi nhánh Biển Mỹ Khê',
      hours_open: '07:00',
      hours_close: '22:30',
    } as unknown as Awaited<ReturnType<typeof Branch.findById>>);
    vi.spyOn(Vehicle, 'findById').mockResolvedValue({
      _id: vehicleId,
      dailyPrice: 180_000,
      hourlyPrice: 25_000,
      branchId: pickupBranchId,
    } as unknown as Awaited<ReturnType<typeof Vehicle.findById>>);
    vi.spyOn(AuditLog, 'create').mockResolvedValue([] as never);
    vi.spyOn(Notification, 'create').mockResolvedValue([] as never);
    const staffNotifySpy = vi
      .spyOn(notificationDispatch, 'notifyBranchOperations')
      .mockResolvedValue();

    // Mock seasonal pricing rule lookup inside quoteVehicleRental
    const { SeasonalPricingRule } = await import('../src/models/SeasonalPricingRule');
    vi.spyOn(SeasonalPricingRule, 'find').mockImplementation((() => {
      const chain = Promise.resolve([]) as unknown as Record<string, unknown>;
      chain.sort = () => chain;
      chain.lean = () => Promise.resolve([]);
      return chain;
    }) as unknown as typeof SeasonalPricingRule.find);

    await bookingService.extendBooking(
      bookingId.toString(),
      { _id: customerId, roles: 'Customer' } as unknown as IUser,
      { newReturnDateTime: newReturnDate.toISOString() }
    );

    expect(mockBookingDoc.extensionCount).toBe(1);
    expect(mockBookingDoc.totalAmount).toBe(360_000);
    expect(staffNotifySpy).toHaveBeenCalledTimes(1);
    expect(staffNotifySpy.mock.calls[0][0].title).toContain('MV-EXT999');
  });
});
