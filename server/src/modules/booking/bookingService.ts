import crypto from 'crypto';
import mongoose from 'mongoose';
import { Booking, IBooking, BookingStatus } from '../../models/Booking';
import { Vehicle } from '../../models/Vehicle';
import { Branch } from '../../models/Branch';
import { User, IUser } from '../../models/User';
import { Discount } from '../../models/Discount';
import { Notification } from '../../models/Notification';
import { BookingReminder } from '../../models/BookingReminder';
import { AuditLog } from '../../models/AuditLog';
import { Payment } from '../../models/Payment';
import { AppError } from '../../core/errorHandler';
import { assertBranchAccess } from '../../core/permissions';
import { emitBookingStatus } from './bookingEvents';

export interface CreateBookingDto {
  vehicleId: string;
  pickupBranchId: string;
  returnBranchId: string;
  pickupDateTime: string | Date;
  returnDateTime: string | Date;
  paymentMethod?: 'Banking' | 'Cash';
  discountCode?: string;
}

export interface CheckinDto {
  startOdometer: number;
  startFuelLevel?: string;
  checkinImages?: string[];
  eSignatureUrl?: string;
  checklist?: {
    idCardVerified?: boolean;
    drivingLicenseVerified?: boolean;
    tires?: boolean;
    brakes?: boolean;
    lights?: boolean;
    fuel?: boolean;
    helmets?: boolean;
  };
}

export interface CheckoutDto {
  endOdometer: number;
  endFuelLevel?: string;
  checkoutImages?: string[];
  damageFee?: number;
  notes?: string;
  returnNotes?: string;
  settleNow?: boolean;
}

// In-process concurrency mutex per vehicle to prevent race conditions on double-booking
const vehicleMutexes = new Map<string, Promise<unknown>>();

export const acquireVehicleLock = async <T>(vehicleId: string, fn: () => Promise<T>): Promise<T> => {
  const currentLock = vehicleMutexes.get(vehicleId) || Promise.resolve();
  let release: () => void;
  const newLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  vehicleMutexes.set(vehicleId, currentLock.then(() => newLock));

  await currentLock;
  try {
    return await fn();
  } finally {
    release!();
    if (vehicleMutexes.get(vehicleId) === newLock) {
      vehicleMutexes.delete(vehicleId);
    }
  }
};

/**
 * Generate unique booking code with MV- prefix
 */
const generateBookingCode = async (): Promise<string> => {
  let code = '';
  let exists = true;
  let attempts = 0;

  while (exists && attempts < 10) {
    attempts++;
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    code = `MV-${randomHex}`;
    const found = await Booking.findOne({ bookingCode: code });
    if (!found) {
      exists = false;
    }
  }

  if (exists) {
    code = `MV-${Date.now().toString().slice(-6)}`;
  }

  return code;
};

/**
 * Helper to get HH:mm time string in Asia/Ho_Chi_Minh timezone
 */
const getVnHm = (d: Date): string => {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return formatter.format(d);
};

/**
 * Create a new booking with date validation, concurrency lock, and server-side pricing
 */
export const createBooking = async (
  userId: string,
  data: CreateBookingDto
): Promise<IBooking> => {
  return acquireVehicleLock(data.vehicleId, async () => {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError(404, 'Tài khoản người dùng không tồn tại.');
    }

    if (user.status === 'Suspended') {
      throw new AppError(403, 'Tài khoản của bạn hiện đang bị tạm khóa.');
    }

    if (user.identityStatus === 'Rejected') {
      throw new AppError(403, 'Hồ sơ định danh eKYC của bạn đã bị từ chối. Vui lòng cập nhật lại giấy tờ tùy thân.');
    }

    const vehicle = await Vehicle.findOne({ _id: data.vehicleId, isDeleted: false });
    if (!vehicle) {
      throw new AppError(404, 'Không tìm thấy phương tiện yêu cầu hoặc xe đã ngừng hoạt động.');
    }

    if (vehicle.requiresMaintenance) {
      throw new AppError(400, 'Phương tiện hiện đang cần bảo dưỡng định kỳ và chưa sẵn sàng bàn giao.');
    }

    const [pickupBranch, returnBranch] = await Promise.all([
      Branch.findOne({ _id: data.pickupBranchId, isActive: true }),
      Branch.findOne({ _id: data.returnBranchId, isActive: true }),
    ]);

    if (!pickupBranch) {
      throw new AppError(400, 'Chi nhánh nhận xe không tồn tại hoặc đã tạm dừng hoạt động.');
    }
    if (!returnBranch) {
      throw new AppError(400, 'Chi nhánh trả xe không tồn tại hoặc đã tạm dừng hoạt động.');
    }

    const pickupDate = new Date(data.pickupDateTime);
    const returnDate = new Date(data.returnDateTime);

    if (isNaN(pickupDate.getTime()) || isNaN(returnDate.getTime())) {
      throw new AppError(400, 'Thời gian nhận hoặc trả xe không hợp lệ.');
    }

    if (pickupDate >= returnDate) {
      throw new AppError(400, 'Thời gian trả xe phải sau thời gian nhận xe ít nhất 2 giờ.');
    }

    // Ensure pickupDate is not in the past (allow 10-minute clock skew)
    const now = new Date(Date.now() - 10 * 60 * 1000);
    if (pickupDate < now) {
      throw new AppError(400, 'Thời gian nhận xe không thể ở trong quá khứ.');
    }

    // Validate minimum (2 hours) and maximum (30 days) rental duration
    const diffHours = (returnDate.getTime() - pickupDate.getTime()) / (1000 * 3600);
    if (diffHours < 2) {
      throw new AppError(400, 'Thời gian thuê xe tối thiểu là 2 giờ.');
    }
    if (diffHours > 30 * 24) {
      throw new AppError(400, 'Thời gian thuê xe tối đa cho một đơn là 30 ngày.');
    }

    // Validate branch operating hours (Asia/Ho_Chi_Minh GMT+7)
    if (pickupBranch.hours_open && pickupBranch.hours_close) {
      const pickupHm = getVnHm(pickupDate);
      if (pickupHm < pickupBranch.hours_open || pickupHm > pickupBranch.hours_close) {
        throw new AppError(
          400,
          `Thời gian nhận xe (${pickupHm}) nằm ngoài giờ mở cửa của chi nhánh ${pickupBranch.name} (${pickupBranch.hours_open} - ${pickupBranch.hours_close}).`
        );
      }
    }

    if (returnBranch.hours_open && returnBranch.hours_close) {
      const returnHm = getVnHm(returnDate);
      if (returnHm < returnBranch.hours_open || returnHm > returnBranch.hours_close) {
        throw new AppError(
          400,
          `Thời gian trả xe (${returnHm}) nằm ngoài giờ mở cửa của chi nhánh ${returnBranch.name} (${returnBranch.hours_open} - ${returnBranch.hours_close}).`
        );
      }
    }

    // Atomic conflict check: Find any conflicting booking for the same vehicle
    const conflictingBooking = await Booking.findOne({
      vehicleId: vehicle._id,
      status: { $in: ['Pending', 'Approved', 'Confirmed', 'Ongoing'] },
      pickupDateTime: { $lt: returnDate },
      returnDateTime: { $gt: pickupDate },
    });

    if (conflictingBooking) {
      throw new AppError(
        409,
        'Phương tiện này đã có lịch đặt hoặc đang được sử dụng trong khung giờ bạn chọn. Vui lòng chọn khung giờ khác hoặc xe khác.'
      );
    }

    // Server-side price calculation
    let basePrice = 0;
    if (diffHours < 24 && vehicle.hourlyPrice) {
      basePrice = Math.ceil(diffHours) * vehicle.hourlyPrice;
    } else {
      const diffDays = Math.max(1, Math.ceil(diffHours / 24));
      basePrice = diffDays * vehicle.dailyPrice;
    }

    let discountAmount = 0;
    let discountDoc = null;

    if (data.discountCode && data.discountCode.trim()) {
      const code = data.discountCode.trim().toUpperCase();
      const currentDate = new Date();
      const appliedDiscount = await Discount.findOneAndUpdate(
        {
          code,
          isActive: true,
          startDate: { $lte: currentDate },
          endDate: { $gte: currentDate },
          $expr: { $lt: ['$usedCount', '$usageLimit'] },
        },
        { $inc: { usedCount: 1 } },
        { new: true }
      );

      if (appliedDiscount) {
        if (!appliedDiscount.minBookingAmount || basePrice >= appliedDiscount.minBookingAmount) {
          const rawDiscount = Math.round(basePrice * (appliedDiscount.discountPercent / 100));
          discountAmount = appliedDiscount.maxDiscountAmount
            ? Math.min(appliedDiscount.maxDiscountAmount, rawDiscount)
            : rawDiscount;
          discountDoc = appliedDiscount;
        } else {
          // Revert usage count if min booking amount not met
          await Discount.findByIdAndUpdate(appliedDiscount._id, { $inc: { usedCount: -1 } });
        }
      }
    }

    const totalAmount = Math.max(0, basePrice - discountAmount);
    const depositAmount = Math.round(totalAmount * 0.3);
    const remainingAmount = totalAmount - depositAmount;

    const bookingCode = await generateBookingCode();

    try {
      const newBooking = await Booking.create({
        bookingCode,
        userId: user._id,
        vehicleId: vehicle._id,
        pickupBranchId: pickupBranch._id,
        returnBranchId: returnBranch._id,
        pickupDateTime: pickupDate,
        returnDateTime: returnDate,
        totalAmount,
        depositAmount,
        remainingAmount,
        discountId: discountDoc?._id,
        discountAmount,
        paymentMethod: data.paymentMethod || 'Banking',
        status: 'Pending',
        isPaid: false,
        depositPaid: false,
        paidAmount: 0,
        startOdometer: vehicle.odometer || 0,
      });

      // Create In-App Notification
      Notification.create({
        userId: user._id,
        title: 'Đặt giữ xe thành công',
        body: `Đơn thuê ${bookingCode} (${vehicle.vehicleModel}) đã được khởi tạo. Vui lòng thanh toán cọc 30% (${depositAmount.toLocaleString('vi-VN')} đ) để xác nhận khóa xe.`,
        type: 'BOOKING',
        relatedId: newBooking._id.toString(),
        isRead: false,
      }).catch((err: unknown) => console.error('[Notification error]', err));

      // Schedule pickup reminder
      const reminderTime = new Date(pickupDate.getTime() - 2 * 3600 * 1000);
      if (reminderTime > new Date()) {
        BookingReminder.create({
          bookingId: newBooking._id,
          reminderType: 'PICKUP_UPCOMING',
          scheduledTime: reminderTime,
          status: 'Pending',
          channel: 'SMS',
        }).catch((err: unknown) => console.error('[Reminder error]', err));
      }

      return newBooking;
    } catch (createErr) {
      // Rollback discount usage if booking creation failed
      if (discountDoc) {
        await Discount.findByIdAndUpdate(discountDoc._id, { $inc: { usedCount: -1 } }).catch(() => {});
      }
      throw createErr;
    }
  });
};

/**
 * Get customer's personal bookings
 */
export const getMyBookings = async (userId: string) => {
  return Booking.find({ userId })
    .populate('vehicleId', 'vehicleModel brand licensePlate dailyPrice hourlyPrice images odometer status fuelType transmissionType')
    .populate('pickupBranchId', 'name code address phone hours_open hours_close')
    .populate('returnBranchId', 'name code address phone hours_open hours_close')
    .sort({ createdAt: -1 });
};

/**
 * Get branch bookings queue for Staff/BranchManager
 */
export const getBranchBookings = async (user: IUser, statusFilter?: string) => {
  const query: Record<string, unknown> = {};

  // If user is Staff or BranchManager, require and restrict to their branch
  if (user.roles === 'Staff' || user.roles === 'BranchManager') {
    if (!user.branchId) {
      throw new AppError(403, 'Tài khoản nhân sự chưa được gán chi nhánh công tác.');
    }
    query.$or = [{ pickupBranchId: user.branchId }, { returnBranchId: user.branchId }];
  }

  if (statusFilter) {
    query.status = statusFilter;
  }

  return Booking.find(query)
    .populate('vehicleId', 'vehicleModel brand licensePlate dailyPrice hourlyPrice images odometer status fuelType transmissionType')
    .populate('userId', 'firstName lastName username phoneNumber email avatarUrl identityStatus')
    .populate('pickupBranchId', 'name code address phone')
    .populate('returnBranchId', 'name code address phone')
    .sort({ createdAt: -1 })
    .limit(50);
};

/**
 * Lookup booking by booking code
 */
export const getBookingByCode = async (code: string, requestingUser: IUser) => {
  const cleanCode = code.trim().toUpperCase();
  const booking = await Booking.findOne({ bookingCode: cleanCode })
    .populate('vehicleId', 'vehicleModel brand licensePlate dailyPrice hourlyPrice images odometer status fuelType transmissionType')
    .populate('userId', 'firstName lastName username phoneNumber email avatarUrl identityStatus')
    .populate('pickupBranchId', 'name code address phone hours_open hours_close')
    .populate('returnBranchId', 'name code address phone hours_open hours_close');

  if (!booking) {
    throw new AppError(404, `Không tìm thấy đơn đặt xe với mã: ${cleanCode}`);
  }

  if (requestingUser.roles === 'Customer') {
    const rawUser = booking.userId as unknown;
    const bookingUserId =
      rawUser && typeof rawUser === 'object' && '_id' in rawUser
        ? (rawUser as { _id: mongoose.Types.ObjectId })._id.toString()
        : String(booking.userId);
    if (bookingUserId !== requestingUser._id.toString()) {
      throw new AppError(403, 'Bạn không có quyền xem thông tin đơn đặt xe này.');
    }
  }

  return booking;
};

/**
 * Get booking details by ID
 */
export const getBookingById = async (id: string, requestingUser: IUser) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, 'Mã định danh đơn đặt xe không hợp lệ.');
  }

  const booking = await Booking.findById(id)
    .populate('vehicleId', 'vehicleModel brand licensePlate dailyPrice hourlyPrice images odometer status fuelType transmissionType')
    .populate('userId', 'firstName lastName username phoneNumber email avatarUrl identityStatus')
    .populate('pickupBranchId', 'name code address phone hours_open hours_close')
    .populate('returnBranchId', 'name code address phone hours_open hours_close');

  if (!booking) {
    throw new AppError(404, 'Không tìm thấy đơn đặt xe.');
  }

  if (requestingUser.roles === 'Customer') {
    const rawUserId = booking.userId as unknown;
    const bookingUserId = rawUserId && typeof rawUserId === 'object' && '_id' in rawUserId
      ? (rawUserId as { _id: { toString(): string } })._id.toString()
      : String(rawUserId);
    if (bookingUserId !== requestingUser._id.toString()) {
      throw new AppError(403, 'Bạn không có quyền xem thông tin đơn đặt xe này.');
    }
  }

  return booking;
};

/**
 * Check-in handover workflow at counter (UC-56)
 */
export const checkinBooking = async (
  bookingId: string,
  staffUser: IUser,
  input: CheckinDto
): Promise<IBooking> => {
  if (!mongoose.isValidObjectId(bookingId)) {
    throw new AppError(400, 'Mã đơn đặt xe không hợp lệ.');
  }

  const booking = await Booking.findById(bookingId).populate('vehicleId');
  if (!booking) {
    throw new AppError(404, 'Không tìm thấy đơn đặt xe.');
  }

  // Reject Pending status: must be Confirmed (or Approved)
  if (booking.status !== 'Confirmed' && booking.status !== 'Approved') {
    throw new AppError(
      409,
      `Không thể thực hiện Check-in với trạng thái đơn hiện tại: "${booking.status}". Đơn cần ở trạng thái Đã xác nhận (Confirmed) hoặc Được duyệt (Approved).`
    );
  }

  // Verify staff branch assignment
  assertBranchAccess(staffUser, booking.pickupBranchId);

  // Verify customer eKYC identity status
  const customer = await User.findById(booking.userId);
  if (!customer || customer.identityStatus !== 'Verified') {
    throw new AppError(403, 'Khách hàng chưa hoàn tất xác minh danh tính eKYC (CCCD/GPLX). Không thể tiến hành bàn giao xe.');
  }

  const vehicle = await Vehicle.findById(booking.vehicleId);
  if (!vehicle) {
    throw new AppError(404, 'Phương tiện liên quan không tồn tại.');
  }

  if (vehicle.status !== 'Available') {
    throw new AppError(409, `Phương tiện hiện không ở trạng thái sẵn sàng bàn giao (Trạng thái hiện tại: ${vehicle.status}).`);
  }

  booking.startOdometer = input.startOdometer;
  if (input.startFuelLevel) booking.startFuelLevel = input.startFuelLevel;
  if (input.checkinImages) booking.checkinImages = input.checkinImages;
  if (input.eSignatureUrl) booking.eSignatureUrl = input.eSignatureUrl;
  booking.approvedBy = staffUser._id as mongoose.Types.ObjectId;
  booking.status = 'Ongoing';
  await booking.save();

  // Set vehicle status to Rented
  vehicle.status = 'Rented';
  vehicle.odometer = input.startOdometer;
  await vehicle.save();

  emitBookingStatus(booking);
  return booking;
};

/**
 * Check-out return and settlement workflow at counter (UC-57)
 */
export const checkoutBooking = async (
  bookingId: string,
  staffUser: IUser,
  input: CheckoutDto
): Promise<IBooking> => {
  if (!mongoose.isValidObjectId(bookingId)) {
    throw new AppError(400, 'Mã đơn đặt xe không hợp lệ.');
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError(404, 'Không tìm thấy đơn đặt xe.');
  }

  if (booking.status !== 'Ongoing') {
    throw new AppError(409, `Không thể Check-out đơn xe chưa ở trạng thái "Ongoing" (Đang lưu hành). Trạng thái hiện tại: "${booking.status}".`);
  }

  // Verify branch ownership
  assertBranchAccess(staffUser, booking.returnBranchId);

  if (input.endOdometer < booking.startOdometer) {
    throw new AppError(
      400,
      `Chỉ số ODO lúc trả (${input.endOdometer}) không thể nhỏ hơn ODO lúc nhận (${booking.startOdometer}).`
    );
  }

  const now = new Date();
  let lateHours = 0;
  const graceMinutes = 15;
  if (now.getTime() > booking.returnDateTime.getTime() + graceMinutes * 60 * 1000) {
    lateHours = Math.ceil((now.getTime() - booking.returnDateTime.getTime()) / (1000 * 3600));
  }

  const lateFee = Math.max(0, lateHours * 30000); // 30,000 đ per overdue hour
  const damageFee = Math.max(0, input.damageFee || 0);
  const finalDue = (booking.remainingAmount || 0) + lateFee + damageFee;

  booking.actualReturnDateTime = now;
  booking.endOdometer = input.endOdometer;
  if (input.endFuelLevel) booking.endFuelLevel = input.endFuelLevel;
  if (input.checkoutImages) booking.checkoutImages = input.checkoutImages;
  booking.lateFee = lateFee;
  booking.damageFee = damageFee;
  booking.settlementAmount = finalDue;
  booking.status = 'Completed';
  booking.isPaid = true;
  booking.paidAmount = (booking.paidAmount || 0) + finalDue;
  booking.remainingAmount = 0;

  // Award loyalty points once: 1 point per 10,000 VND
  if (!booking.loyaltyAwarded) {
    const actualPaid = booking.totalAmount - (booking.discountAmount || 0);
    const pointsEarned = Math.floor(actualPaid / 10000);
    booking.loyaltyPointsEarned = pointsEarned;
    booking.loyaltyAwarded = true;
    await User.findByIdAndUpdate(booking.userId, { $inc: { loyaltyPoints: pointsEarned } }).catch(() => {});
  }

  await booking.save();

  // Update Vehicle: move to return branch, update ODO, set Available
  const vehicle = await Vehicle.findById(booking.vehicleId);
  if (vehicle) {
    vehicle.branchId = booking.returnBranchId;
    vehicle.odometer = input.endOdometer;
    vehicle.status = 'Available';

    // Flag maintenance: check 1500km interval bucket
    const currentBucket = Math.floor(input.endOdometer / 1500);
    const lastBucket = vehicle.lastMaintenanceBucket || 0;
    if (currentBucket > lastBucket) {
      vehicle.requiresMaintenance = true;
      vehicle.lastMaintenanceBucket = currentBucket;
    }
    await vehicle.save();
  }

  emitBookingStatus(booking);
  return booking;
};

/**
 * Record payment made at counter (UC-31)
 */
export const recordCounterPayment = async (
  bookingId: string,
  staffUser: IUser,
  amount: number,
  notes?: string
): Promise<IBooking> => {
  if (!mongoose.isValidObjectId(bookingId)) {
    throw new AppError(400, 'Mã đơn đặt xe không hợp lệ.');
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError(404, 'Không tìm thấy đơn đặt xe.');
  }

  // Verify staff branch assignment (staff at pickup branch or return branch can accept counter payment)
  assertBranchAccess(staffUser, [booking.pickupBranchId, booking.returnBranchId]);

  if (amount <= 0) {
    throw new AppError(400, 'Số tiền thanh toán phải lớn hơn 0 VNĐ.');
  }

  booking.paidAmount = (booking.paidAmount || 0) + amount;
  booking.remainingAmount = Math.max(0, (booking.remainingAmount || 0) - amount);
  if (booking.remainingAmount === 0) {
    booking.isPaid = true;
  }
  booking.counterPaidBy = staffUser._id as mongoose.Types.ObjectId;
  booking.counterPaidAt = new Date();
  await booking.save();

  await AuditLog.create({
    userId: staffUser._id,
    action: 'RECORD_COUNTER_PAYMENT',
    entity: 'Booking',
    entityId: booking._id.toString(),
    details: {
      bookingCode: booking.bookingCode,
      amount,
      notes,
      remainingAmount: booking.remainingAmount,
    },
    timestamp: new Date(),
  }).catch(() => {});

  // Record counter transaction in Payment collection
  await Payment.create({
    bookingId: booking._id,
    txnRef: `COUNTER-${booking.bookingCode}-${Date.now()}`,
    amount,
    type: 'COUNTER',
    status: 'SUCCESS',
  }).catch((err: unknown) => console.error('[Payment Record Error]', err));

  emitBookingStatus(booking);
  return booking;
};

/**
 * Cancel booking
 */
export const cancelBooking = async (
  bookingId: string,
  requestingUser: IUser,
  cancelReason?: string
): Promise<IBooking> => {
  if (!mongoose.isValidObjectId(bookingId)) {
    throw new AppError(400, 'Mã đơn đặt xe không hợp lệ.');
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError(404, 'Không tìm thấy đơn đặt xe.');
  }

  if (requestingUser.roles === 'Customer') {
    if (booking.userId.toString() !== requestingUser._id.toString()) {
      throw new AppError(403, 'Bạn không có quyền hủy đơn đặt xe này.');
    }
  }

  if (booking.status === 'Ongoing' || booking.status === 'Completed') {
    throw new AppError(400, 'Không thể hủy đơn đặt xe đang hoặc đã hoàn tất chuyến đi.');
  }

  booking.status = 'Cancelled';
  booking.cancelReason = cancelReason?.trim() || 'Khách hàng yêu cầu hủy đơn.';
  await booking.save();

  // Rollback discount usage count if applied
  if (booking.discountId) {
    await Discount.findByIdAndUpdate(booking.discountId, { $inc: { usedCount: -1 } }).catch(() => {});
  }

  emitBookingStatus(booking);
  return booking;
};
