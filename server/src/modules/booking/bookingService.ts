import crypto from 'crypto';
import mongoose from 'mongoose';
import { Booking, IBooking, BookingStatus, IDamageRecord } from '../../models/Booking';
import { Vehicle } from '../../models/Vehicle';
import { Branch } from '../../models/Branch';
import { User, IUser } from '../../models/User';
import { Discount } from '../../models/Discount';
import { Notification } from '../../models/Notification';
import { BookingReminder } from '../../models/BookingReminder';
import { AuditLog } from '../../models/AuditLog';
import { Payment } from '../../models/Payment';
import { AppError } from '../../core/errorHandler';
import { withResourceLock as acquireVehicleLock } from '../../core/resourceLock';
export { withResourceLock as acquireVehicleLock } from '../../core/resourceLock';
import { assertBranchAccess } from '../../core/permissions';
import { emitBookingStatus } from './bookingEvents';
import { isCloudinaryConfigured, uploadDataUriToCloudinary } from '../../config/cloudinary';
import { sendBookingStatusEmail } from '../../config/mailer';
import { quoteVehicleRental } from '../pricing/pricingService';

export interface CreateBookingDto {
  vehicleId: string;
  pickupBranchId: string;
  returnBranchId: string;
  pickupDateTime: string | Date;
  returnDateTime: string | Date;
  paymentMethod?: 'Banking' | 'Cash';
  discountCode?: string;
}

export interface EstimateBookingDto {
  vehicleId: string;
  pickupBranchId: string;
  returnBranchId: string;
  pickupDateTime: string | Date;
  returnDateTime: string | Date;
  discountCode?: string;
}

export interface CheckinDto {
  startOdometer: number;
  startFuelLevel?: string;
  checkinImages?: string[];
  eSignatureUrl?: string;
  checklist?: Record<string, boolean>;
  verifiedAtCounter?: boolean;
  receiverName?: string;
  receiverPhone?: string;
  receiverIdCard?: string;
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

export interface RecordDamageDto {
  description: string;
  damageFee: number;
  photos?: string[];
  severity?: 'Minor' | 'Moderate' | 'Severe';
  partsReplaced?: string[];
}

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
 * Availability Checker: Checks if a vehicle has overlapping active bookings (Rule BR-02)
 * Formula: NOT (newPickup < existingReturn AND newReturn > existingPickup)
 * Active blocking statuses: ['Pending', 'Approved', 'Confirmed', 'Ongoing']
 */
export const checkVehicleAvailability = async (
  vehicleId: string | mongoose.Types.ObjectId,
  pickupDateTime: Date,
  returnDateTime: Date,
  excludeBookingId?: string | mongoose.Types.ObjectId,
  session?: mongoose.ClientSession | null
): Promise<{ available: boolean; conflictingBooking?: IBooking | null }> => {
  const query: mongoose.FilterQuery<IBooking> = {
    vehicleId,
    status: { $in: ['Pending', 'Approved', 'Confirmed', 'Ongoing'] },
    pickupDateTime: { $lt: returnDateTime },
    returnDateTime: { $gt: pickupDateTime },
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const findQuery = Booking.findOne(query);
  if (session) {
    findQuery.session(session);
  }

  const conflictingBooking = await findQuery;
  return {
    available: !conflictingBooking,
    conflictingBooking,
  };
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

    if (vehicle.status === 'Maintenance' || vehicle.status === 'Transferring') {
      throw new AppError(400, 'Phương tiện hiện đang bảo dưỡng định kỳ hoặc đang điều chuyển và chưa sẵn sàng bàn giao.');
    }

    const activeDepositedOrRented = await Booking.findOne({
      vehicleId: vehicle._id,
      status: { $in: ['Approved', 'Confirmed', 'Ongoing'] },
    });
    if (activeDepositedOrRented || vehicle.status === 'Rented') {
      throw new AppError(
        409,
        'Phương tiện này hiện đã được đặt cọc hoặc đang trong kỳ cho thuê. Vui lòng chọn phương tiện khác.'
      );
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

    // Auto-cancel any stale unpaid online banking draft (>15 mins old) on this vehicle so abandoned gateway tabs do not lock vehicles indefinitely
    const staleCutoff = new Date(Date.now() - 15 * 60 * 1000);
    const staleUserDrafts = await Booking.find({
      vehicleId: vehicle._id,
      status: 'Pending',
      depositPaid: false,
      isPaid: false,
      paymentMethod: 'Banking',
      createdAt: { $lt: staleCutoff },
    });
    for (const draft of staleUserDrafts) {
      draft.status = 'Cancelled';
      draft.cancelReason = 'Hủy tự động đơn nháp chưa thanh toán để tạo giao dịch mới.';
      await draft.save();
      if (draft.discountId) {
        await Discount.findByIdAndUpdate(draft.discountId, { $inc: { usedCount: -1 } }).catch(() => {});
      }
      await Notification.deleteMany({ relatedId: draft._id.toString() }).catch(() => {});
    }

    // Atomic conflict check via Availability Checker (Rule BR-02)
    const { available, conflictingBooking } = await checkVehicleAvailability(
      vehicle._id,
      pickupDate,
      returnDate
    );

    if (!available) {
      throw new AppError(
        409,
        `Phương tiện này đã có lịch đặt hoặc đang được sử dụng trong khung giờ bạn chọn (Đơn ${conflictingBooking?.bookingCode || ''}). Vui lòng chọn khung giờ khác hoặc xe khác.`
      );
    }

    // Server-side price calculation via quoteVehicleRental
    const rentalQuote = await quoteVehicleRental(vehicle, pickupDate, returnDate);
    const basePrice = rentalQuote.rentalAmount;

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

      // Only send immediate notification for Cash hold at counter; online Banking notifications are sent after VNPay/VietQR payment succeeds
      if (data.paymentMethod === 'Cash') {
        Notification.create({
          userId: user._id,
          title: 'Đã giữ chỗ tạm thời tại quầy (30 phút)',
          body: `Đơn thuê ${bookingCode} (${vehicle.vehicleModel}) đang được giữ chỗ 30 phút. Vui lòng đến quầy chi nhánh thanh toán cọc 30% (${depositAmount.toLocaleString('vi-VN')} đ) để khóa xe.`,
          type: 'BOOKING',
          relatedId: newBooking._id.toString(),
          isRead: false,
        }).catch((err: unknown) => console.error('[Notification error]', err));
      }

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
 * Pre-booking estimation: calculates rental duration, pricing, 30% deposit, and checks availability
 */
export const estimateBooking = async (data: EstimateBookingDto) => {
  const vehicle = await Vehicle.findOne({ _id: data.vehicleId, isDeleted: false });
  if (!vehicle) {
    throw new AppError(404, 'Không tìm thấy phương tiện.');
  }

  if (vehicle.status === 'Maintenance' || vehicle.status === 'Transferring') {
    throw new AppError(400, 'Phương tiện đang bảo dưỡng hoặc điều chuyển, chưa sẵn sàng bàn giao.');
  }

  const [pickupBranch, returnBranch] = await Promise.all([
    Branch.findOne({ _id: data.pickupBranchId, isActive: true }),
    Branch.findOne({ _id: data.returnBranchId, isActive: true }),
  ]);

  if (!pickupBranch || !returnBranch) {
    throw new AppError(400, 'Chi nhánh nhận hoặc trả xe không hợp lệ.');
  }

  const pickupDate = new Date(data.pickupDateTime);
  const returnDate = new Date(data.returnDateTime);

  if (isNaN(pickupDate.getTime()) || isNaN(returnDate.getTime())) {
    throw new AppError(400, 'Thời gian nhận hoặc trả xe không hợp lệ.');
  }

  if (pickupDate >= returnDate) {
    throw new AppError(400, 'Thời gian trả xe phải sau thời gian nhận xe ít nhất 2 giờ.');
  }

  const diffHours = (returnDate.getTime() - pickupDate.getTime()) / (1000 * 3600);
  if (diffHours < 2) {
    throw new AppError(400, 'Thời gian thuê xe tối thiểu là 2 giờ.');
  }
  if (diffHours > 30 * 24) {
    throw new AppError(400, 'Thời gian thuê xe tối đa cho một đơn là 30 ngày.');
  }
  if (pickupDate < new Date(Date.now() - 10 * 60 * 1000)) {
    throw new AppError(400, 'Thời gian nhận xe không thể ở trong quá khứ.');
  }

  // Branch operating hours check
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

  // Conflict check
  const cashHoldCutoff = new Date(Date.now() - 30 * 60 * 1000);
  const [conflictingBooking, activeDepositedOrRented] = await Promise.all([
    Booking.findOne({
      vehicleId: vehicle._id,
      $or: [
        { status: { $in: ['Approved', 'Confirmed', 'Ongoing'] } },
        { status: 'Pending', paymentMethod: 'Cash', createdAt: { $gte: cashHoldCutoff } },
      ],
      pickupDateTime: { $lt: returnDate },
      returnDateTime: { $gt: pickupDate },
    }),
    Booking.findOne({
      vehicleId: vehicle._id,
      status: { $in: ['Approved', 'Confirmed', 'Ongoing'] },
    }),
  ]);

  const isAvailable =
    !conflictingBooking &&
    !activeDepositedOrRented &&
    vehicle.status === 'Available';

  const rentalQuote = await quoteVehicleRental(vehicle, pickupDate, returnDate);
  const basePrice = rentalQuote.rentalAmount;

  let discountAmount = 0;
  let appliedDiscount: { code: string; discountPercent: number; discountAmount: number } | null = null;

  if (data.discountCode?.trim()) {
    const discount = await Discount.findOne({
      code: data.discountCode.trim().toUpperCase(),
      isActive: true,
    });

    if (discount) {
      const now = new Date();
      const isExpired = discount.endDate && new Date(discount.endDate) < now;
      const isNotStarted = discount.startDate && new Date(discount.startDate) > now;
      const isUsageExceeded = discount.usedCount >= discount.usageLimit;

      if (!isExpired && !isNotStarted && !isUsageExceeded) {
        if (!discount.minBookingAmount || basePrice >= discount.minBookingAmount) {
          const rawDiscount = Math.round(basePrice * (discount.discountPercent / 100));
          discountAmount = discount.maxDiscountAmount
            ? Math.min(discount.maxDiscountAmount, rawDiscount)
            : rawDiscount;
          appliedDiscount = {
            code: discount.code,
            discountPercent: discount.discountPercent,
            discountAmount,
          };
        }
      }
    }
  }

  const totalAmount = Math.max(0, basePrice - discountAmount);
  const depositAmount = Math.round(totalAmount * 0.3);
  const remainingAmount = totalAmount - depositAmount;

  return {
    ...rentalQuote,
    isAvailable,
    conflicting: !isAvailable,
    durationHours: Math.round(diffHours * 10) / 10,
    rentalDays: Math.ceil(diffHours / 24),
    dailyPrice: vehicle.dailyPrice,
    basePrice,
    discountAmount,
    appliedDiscount,
    totalAmount,
    depositAmount,
    remainingAmount,
  };
};

export interface GetMyBookingsOptions {
  status?: string;
  page?: number;
  limit?: number;
  search?: string;
}

export interface GetMyBookingsResult {
  bookings: IBooking[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPrev: boolean;
    hasNext: boolean;
  };
  counts: {
    all: number;
    trips: number;
    active: number;
    completed: number;
    cancelled: number;
  };
}

/**
 * Get customer's personal bookings with status tabs and pagination (UC-35)
 */
export const getMyBookings = async (
  userId: string,
  options: GetMyBookingsOptions = {}
): Promise<GetMyBookingsResult> => {
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(options.limit) || 10));
  const skip = (page - 1) * limit;

  const baseFilter: Record<string, unknown> = {
    userId: new mongoose.Types.ObjectId(userId),
  };

  const query: Record<string, unknown> = { ...baseFilter };

  if (options.status && options.status !== 'all') {
    if (options.status === 'active') {
      query.status = { $in: ['Pending', 'Approved', 'Confirmed', 'Ongoing'] };
    } else if (options.status === 'completed') {
      query.status = 'Completed';
    } else if (options.status === 'cancelled') {
      query.status = { $in: ['Cancelled', 'Rejected'] };
    } else {
      query.status = options.status;
    }
  }

  if (options.search && options.search.trim()) {
    query.bookingCode = { $regex: options.search.trim(), $options: 'i' };
  }

  const [bookings, total, allCount, activeCount, completedCount, cancelledCount] =
    await Promise.all([
      Booking.find(query)
        .populate(
          'vehicleId',
          'vehicleModel brand licensePlate dailyPrice hourlyPrice images odometer status fuelType transmissionType'
        )
        .populate('pickupBranchId', 'name code address phone hours_open hours_close')
        .populate('returnBranchId', 'name code address phone hours_open hours_close')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Booking.countDocuments(query),
      Booking.countDocuments(baseFilter),
      Booking.countDocuments({
        ...baseFilter,
        status: { $in: ['Pending', 'Approved', 'Confirmed', 'Ongoing'] },
      }),
      Booking.countDocuments({
        ...baseFilter,
        status: 'Completed',
      }),
      Booking.countDocuments({
        ...baseFilter,
        status: { $in: ['Cancelled', 'Rejected'] },
      }),
    ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    bookings,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages,
    },
    counts: {
      all: allCount,
      trips: activeCount + completedCount,
      active: activeCount,
      completed: completedCount,
      cancelled: cancelledCount,
    },
  };
};

export interface BranchOrdersOptions {
  status?: string;
  queue?: string; // 'today' | 'upcoming' | 'overdue'
  search?: string;
  page?: number;
  limit?: number;
  branchId?: string;
}

/**
 * UC-54: Get branch bookings queue for Staff/BranchManager
 * Supports status filter ('all', 'active', 'confirmed', 'ongoing', 'completed', 'cancelled'),
 * today's queue filter ('today'), keyword search across bookingCode/phone/plate,
 * pagination, and aggregated counts summary.
 */
export const getBranchBookings = async (
  user: IUser,
  options: BranchOrdersOptions | string = {}
) => {
  // Support legacy signature getBranchBookings(user, statusFilter)
  const opts: BranchOrdersOptions =
    typeof options === 'string' ? { status: options } : options;

  const {
    status,
    queue,
    search,
    page = 1,
    limit = 50,
    branchId,
  } = opts;

  const baseBranchQuery: Record<string, unknown> = {};

  // If user is Staff or BranchManager, require and restrict to their branch
  if (user.roles === 'Staff' || user.roles === 'BranchManager') {
    if (!user.branchId) {
      throw new AppError(403, 'Tài khoản nhân sự chưa được gán chi nhánh công tác.');
    }
    baseBranchQuery.$or = [{ pickupBranchId: user.branchId }, { returnBranchId: user.branchId }];
  } else if (user.roles === 'SystemAdmin' && branchId && mongoose.isValidObjectId(branchId)) {
    const bId = new mongoose.Types.ObjectId(branchId);
    baseBranchQuery.$or = [{ pickupBranchId: bId }, { returnBranchId: bId }];
  }

  const query: Record<string, unknown> = { ...baseBranchQuery };

  // Status Filter
  if (status && status !== 'all') {
    if (status.toLowerCase() === 'active') {
      query.status = { $in: ['Pending', 'Approved', 'Confirmed', 'Ongoing'] };
    } else if (status.toLowerCase() === 'completed') {
      query.status = 'Completed';
    } else if (status.toLowerCase() === 'cancelled') {
      query.status = { $in: ['Cancelled', 'Rejected'] };
    } else if (status.toLowerCase() === 'confirmed') {
      query.status = { $in: ['Approved', 'Confirmed'] };
    } else {
      query.status = status;
    }
  }

  // Today Queue Filter
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (queue === 'today') {
    query.$and = [
      ...(Array.isArray(query.$and) ? query.$and : []),
      {
        $or: [
          { pickupDateTime: { $gte: startOfToday, $lte: endOfToday } },
          { returnDateTime: { $gte: startOfToday, $lte: endOfToday } },
        ],
      },
    ];
  }

  // Keyword Search across bookingCode, phone, vehicle plate
  if (search && search.trim()) {
    const cleanSearch = search.trim();
    const [matchingVehicles, matchingUsers] = await Promise.all([
      Vehicle.find({
        $or: [
          { licensePlate: { $regex: cleanSearch, $options: 'i' } },
          { vehicleModel: { $regex: cleanSearch, $options: 'i' } },
        ],
      }).select('_id'),
      User.find({
        $or: [
          { phoneNumber: { $regex: cleanSearch, $options: 'i' } },
          { firstName: { $regex: cleanSearch, $options: 'i' } },
          { lastName: { $regex: cleanSearch, $options: 'i' } },
          { username: { $regex: cleanSearch, $options: 'i' } },
        ],
      }).select('_id'),
    ]);

    const searchOrConditions: Array<Record<string, unknown>> = [
      { bookingCode: { $regex: cleanSearch, $options: 'i' } },
    ];

    if (matchingVehicles.length > 0) {
      searchOrConditions.push({ vehicleId: { $in: matchingVehicles.map((v) => v._id) } });
    }
    if (matchingUsers.length > 0) {
      searchOrConditions.push({ userId: { $in: matchingUsers.map((u) => u._id) } });
    }

    query.$and = [
      ...(Array.isArray(query.$and) ? query.$and : []),
      { $or: searchOrConditions },
    ];
  }

  const skip = (Math.max(1, page) - 1) * limit;

  const [bookings, total, totalCount, todayCount, pendingCount, confirmedCount, ongoingCount, completedCount, cancelledCount] =
    await Promise.all([
      Booking.find(query)
        .populate('vehicleId', 'vehicleModel brand licensePlate dailyPrice hourlyPrice images odometer status fuelType transmissionType')
        .populate('userId', 'firstName lastName username phoneNumber email avatarUrl selfieUrl identityStatus')
        .populate('pickupBranchId', 'name code address phone hours_open hours_close')
        .populate('returnBranchId', 'name code address phone hours_open hours_close')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Booking.countDocuments(query),
      Booking.countDocuments(baseBranchQuery),
      Booking.countDocuments({
        ...baseBranchQuery,
        $or: [
          { pickupDateTime: { $gte: startOfToday, $lte: endOfToday } },
          { returnDateTime: { $gte: startOfToday, $lte: endOfToday } },
        ],
      }),
      Booking.countDocuments({ ...baseBranchQuery, status: 'Pending' }),
      Booking.countDocuments({ ...baseBranchQuery, status: { $in: ['Approved', 'Confirmed'] } }),
      Booking.countDocuments({ ...baseBranchQuery, status: 'Ongoing' }),
      Booking.countDocuments({ ...baseBranchQuery, status: 'Completed' }),
      Booking.countDocuments({ ...baseBranchQuery, status: { $in: ['Cancelled', 'Rejected'] } }),
    ]);

  return {
    bookings,
    total,
    page: Math.max(1, page),
    limit,
    totalPages: Math.ceil(total / limit) || 1,
    counts: {
      total: totalCount,
      today: todayCount,
      pending: pendingCount,
      confirmed: confirmedCount,
      ongoing: ongoingCount,
      completed: completedCount,
      cancelled: cancelledCount,
    },
  };
};

export interface OrderTimelineItem {
  key: string;
  title: string;
  description: string;
  timestamp?: Date | string | null;
  isCompleted: boolean;
  isCurrent: boolean;
  status: 'completed' | 'current' | 'upcoming' | 'cancelled';
}

export interface OrderPricingDetails {
  basePrice: number;
  dailyPrice: number;
  durationDays: number;
  durationHours: number;
  discountAmount: number;
  totalAmount: number;
  depositAmount: number;
  paidAmount: number;
  remainingAmount: number;
  lateFee: number;
  damageFee: number;
  refundAmount?: number;
  refundStatus?: string;
  isPaid: boolean;
  depositPaid: boolean;
}

export interface OrderAvailableActions {
  canPayDeposit: boolean;
  canPayFull: boolean;
  canCancel: boolean;
  canExtend: boolean;
  canRefund: boolean;
  canCheckin: boolean;
  canCheckout: boolean;
  canCounterPay: boolean;
}

export const buildOrderDetails = (booking: IBooking) => {
  const isCancelled = ['Cancelled', 'Rejected'].includes(booking.status);
  const isPending = booking.status === 'Pending';
  const isApproved = booking.status === 'Approved';
  const isConfirmed = booking.status === 'Confirmed';
  const isOngoing = booking.status === 'Ongoing';
  const isCompleted = booking.status === 'Completed';

  const timeline: OrderTimelineItem[] = [
    {
      key: 'created',
      title: 'Tạo đơn đặt xe',
      description: 'Đơn được tạo thành công trên hệ thống',
      timestamp: booking.createdAt,
      isCompleted: true,
      isCurrent: isPending,
      status: isPending ? 'current' : 'completed',
    },
    {
      key: 'deposit',
      title: 'Đặt cọc giữ xe (30%)',
      description: Boolean(booking.depositPaid || booking.isPaid)
        ? `Đã thanh toán cọc ${(booking.depositAmount || 0).toLocaleString('vi-VN')} đ`
        : 'Chờ thanh toán cọc 30% để khóa biển số xe',
      timestamp: Boolean(booking.depositPaid || booking.isPaid) ? booking.updatedAt : null,
      isCompleted: Boolean(booking.depositPaid || booking.isPaid),
      isCurrent: isPending && !booking.depositPaid && !booking.isPaid,
      status: Boolean(booking.depositPaid || booking.isPaid)
        ? 'completed'
        : isPending
        ? 'current'
        : 'upcoming',
    },
    {
      key: 'confirmed',
      title: 'Xác nhận & Khóa biển số',
      description: isApproved || isConfirmed || isOngoing || isCompleted
        ? 'Hệ thống đã khóa xe và chuẩn bị phương tiện tại chi nhánh'
        : 'Chờ chi nhánh chuẩn bị xe',
      timestamp: isApproved || isConfirmed || isOngoing || isCompleted ? booking.updatedAt : null,
      isCompleted: isApproved || isConfirmed || isOngoing || isCompleted,
      isCurrent: isApproved || isConfirmed,
      status: isApproved || isConfirmed ? 'current' : isOngoing || isCompleted ? 'completed' : 'upcoming',
    },
    {
      key: 'handover',
      title: 'Bàn giao nhận xe (Check-in)',
      description: isOngoing || isCompleted
        ? 'Đã kiểm tra xe, ký biên bản và bàn giao xe cho khách'
        : 'Xuất trình CCCD/GPLX tại quầy để nhận xe',
      timestamp: isOngoing || isCompleted ? booking.pickupDateTime : null,
      isCompleted: isOngoing || isCompleted,
      isCurrent: isOngoing,
      status: isOngoing ? 'current' : isCompleted ? 'completed' : 'upcoming',
    },
    {
      key: 'return',
      title: 'Thu hồi & Hoàn tất (Check-out)',
      description: isCompleted
        ? 'Đã kiểm tra xe, thanh toán phần còn lại và hoàn tất hợp đồng'
        : 'Trả xe tại chi nhánh đã chọn đúng giờ hẹn',
      timestamp: isCompleted ? booking.actualReturnDateTime || booking.returnDateTime : null,
      isCompleted: isCompleted,
      isCurrent: false,
      status: isCompleted ? 'completed' : 'upcoming',
    },
  ];

  if (isCancelled) {
    timeline.push({
      key: 'cancelled',
      title: booking.status === 'Cancelled' ? 'Hủy đơn thuê' : 'Đơn bị từ chối',
      description: booking.cancelReason || booking.rejectReason || 'Đơn đã dừng xử lý',
      timestamp: booking.cancelledAt || booking.updatedAt,
      isCompleted: true,
      isCurrent: true,
      status: 'cancelled',
    });
  }

  const vehicle = booking.vehicleId as unknown as { dailyPrice?: number };
  const diffHours = (new Date(booking.returnDateTime).getTime() - new Date(booking.pickupDateTime).getTime()) / (1000 * 3600);
  const durationDays = Math.max(1, Math.ceil(diffHours / 24));
  const dailyPrice = vehicle?.dailyPrice || Math.round(booking.totalAmount / durationDays);

  const pricing: OrderPricingDetails = {
    basePrice: booking.totalAmount + (booking.discountAmount || 0),
    dailyPrice,
    durationDays,
    durationHours: Math.round(diffHours * 10) / 10,
    discountAmount: booking.discountAmount || 0,
    totalAmount: booking.totalAmount,
    depositAmount: booking.depositAmount,
    paidAmount: booking.paidAmount || 0,
    remainingAmount: booking.remainingAmount || 0,
    lateFee: booking.lateFee || 0,
    damageFee: booking.damageFee || 0,
    refundAmount: booking.refundAmount,
    refundStatus: booking.refundStatus,
    isPaid: Boolean(booking.isPaid),
    depositPaid: Boolean(booking.depositPaid),
  };

  const actions: OrderAvailableActions = {
    canPayDeposit: isPending && !booking.depositPaid && !booking.isPaid,
    canPayFull: !booking.isPaid && (booking.remainingAmount || 0) > 0 && !isCancelled,
    canCancel: (isPending || isApproved || isConfirmed) && !isCancelled,
    canExtend: (isConfirmed || isOngoing) && !isCancelled,
    canRefund: isCancelled && (booking.refundAmount || 0) > 0 && booking.refundStatus === 'Pending',
    canCheckin: (isConfirmed || isApproved) && !isCancelled,
    canCheckout: isOngoing && !isCompleted && !isCancelled,
    canCounterPay: (booking.remainingAmount || 0) > 0 && !isCancelled,
  };

  return {
    timeline,
    pricing,
    actions,
  };
};

/**
 * Lookup booking by booking code
 */
export const getBookingByCode = async (code: string, requestingUser: IUser) => {
  const cleanCode = code.trim().toUpperCase();
  const booking = await Booking.findOne({ bookingCode: cleanCode })
    .populate('vehicleId', 'vehicleModel brand licensePlate dailyPrice hourlyPrice images odometer status fuelType transmissionType')
    .populate('userId', 'firstName lastName username phoneNumber email avatarUrl selfieUrl identityStatus')
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

  const doc = booking.toObject ? booking.toObject() : booking;
  const details = buildOrderDetails(booking);

  return {
    ...doc,
    ...details,
  };
};

/**
 * Get booking details by ID with Timeline, Pricing, and Actions (UC-36)
 */
export const getBookingById = async (id: string, requestingUser: IUser) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, 'Mã định danh đơn đặt xe không hợp lệ.');
  }

  const booking = await Booking.findById(id)
    .populate('vehicleId', 'vehicleModel brand licensePlate dailyPrice hourlyPrice images odometer status fuelType transmissionType')
    .populate('userId', 'firstName lastName username phoneNumber email avatarUrl selfieUrl identityStatus')
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

  const doc = booking.toObject ? booking.toObject() : booking;
  const details = buildOrderDetails(booking);

  return {
    ...doc,
    ...details,
  };
};

const populateBookingDetails = async (bookingId: mongoose.Types.ObjectId | string) => {
  return Booking.findById(bookingId)
    .populate('vehicleId', 'vehicleModel brand licensePlate dailyPrice hourlyPrice images odometer status fuelType transmissionType')
    .populate('userId', 'firstName lastName username phoneNumber email avatarUrl selfieUrl identityStatus')
    .populate('pickupBranchId', 'name code address phone hours_open hours_close')
    .populate('returnBranchId', 'name code address phone hours_open hours_close')
    .populate('counterPaidBy', 'username firstName lastName');
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

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError(404, 'Không tìm thấy đơn đặt xe.');
  }

  // Auto-promote Pending -> Confirmed if deposit or full payment was already settled
  if (booking.status === 'Pending' && (booking.depositPaid || booking.isPaid)) {
    booking.status = 'Confirmed';
  }

  // Reject unpaid Pending status: must be Confirmed (or Approved)
  if (booking.status !== 'Confirmed' && booking.status !== 'Approved') {
    throw new AppError(
      409,
      `Không thể thực hiện Check-in với trạng thái đơn hiện tại: "${booking.status}". Đơn cần ở trạng thái Đã xác nhận (Confirmed) hoặc Được duyệt (Approved).`
    );
  }

  // Verify staff branch assignment
  assertBranchAccess(staffUser, booking.pickupBranchId);

  // Handover Verification (UC-56):
  // Once booking is valid/paid, ANY legitimate presenter at the counter (the booking creator OR a proxy receiver)
  // can receive the vehicle as long as either online eKYC is Verified OR Staff verifies physical ID/license at the counter.
  const customer = await User.findById(booking.userId);
  const isVerifiedAtCounter = Boolean(
    input.verifiedAtCounter ||
      input.checklist?.idCardVerified ||
      input.receiverName?.trim() ||
      input.receiverIdCard?.trim()
  );

  if ((!customer || customer.identityStatus !== 'Verified') && !isVerifiedAtCounter) {
    throw new AppError(
      403,
      'Khách hàng chưa hoàn tất xác minh danh tính eKYC (CCCD/GPLX) và nhân viên chưa xác nhận đối chiếu người nhận trực tiếp tại quầy.'
    );
  }

  // Point 3: 4 photos handover check (if checkinImages is provided, require at least 4 photos)
  if (input.checkinImages !== undefined && input.checkinImages.length < 4) {
    throw new AppError(400, 'Yêu cầu chụp và cung cấp đủ 4 góc ảnh xe (Trước, Trái, Phải, Sau/ODO) trước khi hoàn tất bàn giao.');
  }

  const vehicle = await Vehicle.findById(booking.vehicleId);
  if (!vehicle) {
    throw new AppError(404, 'Phương tiện liên quan không tồn tại.');
  }

  if (vehicle.status === 'Maintenance' || vehicle.status === 'Transferring') {
    throw new AppError(409, `Phương tiện hiện không ở trạng thái sẵn sàng bàn giao (Trạng thái hiện tại: ${vehicle.status}).`);
  }

  // Point 4: Odometer verification
  if (input.startOdometer === undefined || input.startOdometer === null || input.startOdometer < 0) {
    throw new AppError(400, 'Chỉ số ODO bắt đầu không hợp lệ.');
  }
  if (vehicle.odometer && input.startOdometer < vehicle.odometer) {
    throw new AppError(400, `Chỉ số ODO lúc bàn giao (${input.startOdometer}) không thể nhỏ hơn ODO hiện tại của xe (${vehicle.odometer}).`);
  }

  // Point 5: Fuel level check
  const fuelLevel = input.startFuelLevel ? String(input.startFuelLevel).trim() : '100%';
  if (!fuelLevel) {
    throw new AppError(400, 'Vui lòng ghi nhận mức nhiên liệu trước khi bàn giao xe.');
  }

  booking.startOdometer = input.startOdometer;
  booking.startFuelLevel = fuelLevel;
  if (input.checkinImages) booking.checkinImages = input.checkinImages;
  booking.checkinAt = new Date();
  booking.checkinBy = staffUser._id as mongoose.Types.ObjectId;
  booking.verifiedAtCounter = isVerifiedAtCounter || customer?.identityStatus === 'Verified';
  const defaultReceiverName = customer
    ? [customer.lastName, customer.firstName].filter(Boolean).join(' ').trim() || customer.username
    : '';
  booking.receiverName = input.receiverName?.trim() || defaultReceiverName;
  booking.receiverPhone = input.receiverPhone?.trim() || customer?.phoneNumber || '';
  if (input.receiverIdCard?.trim()) {
    booking.receiverIdCard = input.receiverIdCard.trim().toUpperCase();
  }
  if (input.checklist) {
    booking.checkinChecklist = input.checklist;
  }
  if (input.eSignatureUrl) {
    if (input.eSignatureUrl.startsWith('data:image/') && isCloudinaryConfigured()) {
      try {
        const uploadedSig = await uploadDataUriToCloudinary(input.eSignatureUrl, {
          folder: 'motorent/signatures',
          type: 'upload',
          publicId: `sig_${booking.bookingCode}_${Date.now()}`,
        });
        booking.eSignatureUrl = uploadedSig.secureUrl;
      } catch {
        booking.eSignatureUrl = input.eSignatureUrl;
      }
    } else {
      booking.eSignatureUrl = input.eSignatureUrl;
    }
  }
  booking.approvedBy = staffUser._id as mongoose.Types.ObjectId;
  booking.status = 'Ongoing';
  await booking.save();

  // Set vehicle status to Rented and update odometer
  vehicle.status = 'Rented';
  vehicle.odometer = input.startOdometer;
  await vehicle.save();

  // Log audit
  await AuditLog.create({
    userId: staffUser._id,
    action: 'CHECKIN_HANDOVER',
    entity: 'Booking',
    entityId: booking._id.toString(),
    details: {
      bookingCode: booking.bookingCode,
      vehicleId: vehicle._id.toString(),
      licensePlate: vehicle.licensePlate,
      startOdometer: input.startOdometer,
      startFuelLevel: fuelLevel,
      photosCount: input.checkinImages ? input.checkinImages.length : 0,
      verifiedAtCounter: booking.verifiedAtCounter,
      receiverName: booking.receiverName,
      receiverPhone: booking.receiverPhone,
      hasReceiverIdCard: Boolean(input.receiverIdCard?.trim()),
      staffId: staffUser._id.toString(),
      branchId: booking.pickupBranchId.toString(),
    },
    ipAddress: '127.0.0.1',
    userAgent: 'Motorent-CounterDesk/1.0',
  }).catch(() => {});

  if (customer?.email) {
    sendBookingStatusEmail({
      toEmail: customer.email,
      customerName: defaultReceiverName || customer.username,
      bookingCode: booking.bookingCode,
      event: 'CHECKIN',
      vehicleName: `${vehicle.brand} ${vehicle.vehicleModel}`,
      licensePlate: vehicle.licensePlate,
      totalAmount: booking.totalAmount,
      paidAmount: booking.paidAmount,
      remainingAmount: booking.remainingAmount,
      note: booking.receiverName && booking.receiverName !== defaultReceiverName
        ? `Người nhận xe thực tế tại quầy: ${booking.receiverName} (${booking.receiverPhone || 'Đã đối chiếu giấy tờ'})`
        : undefined,
    }).catch(() => {});
  }

  emitBookingStatus(booking);
  const populated = await populateBookingDetails(booking._id);
  return populated || booking;
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

  // Acceptance requirement UC-57: 4 photos, ODO, fuel, damage, late fee
  if (input.checkoutImages !== undefined && input.checkoutImages.length < 4) {
    throw new AppError(400, 'Yêu cầu chụp và cung cấp đủ 4 góc ảnh xe (Trước, Trái, Phải, Sau/ODO) trước khi hoàn tất trả xe (Check-out).');
  }

  if (input.endOdometer < booking.startOdometer) {
    throw new AppError(
      400,
      `Chỉ số ODO lúc trả (${input.endOdometer}) không thể nhỏ hơn ODO lúc nhận (${booking.startOdometer}).`
    );
  }

  const fuelLevel = input.endFuelLevel ? String(input.endFuelLevel).trim() : '100%';
  if (!fuelLevel) {
    throw new AppError(400, 'Vui lòng ghi nhận mức nhiên liệu thực tế lúc nhận lại xe.');
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
  booking.checkoutAt = now;
  booking.checkoutBy = staffUser._id as mongoose.Types.ObjectId;
  booking.endOdometer = input.endOdometer;
  booking.endFuelLevel = fuelLevel;
  if (input.checkoutImages) booking.checkoutImages = input.checkoutImages;
  if (input.returnNotes || input.notes) {
    booking.returnNotes = (input.returnNotes || input.notes || '').trim();
  }
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

  // Update Vehicle: move to return branch, update ODO, set Available (or Maintenance if severely damaged)
  const vehicle = await Vehicle.findById(booking.vehicleId);
  if (vehicle) {
    const baselineOdo = booking.startOdometer || vehicle.odometer || 0;
    const currentBucket = Math.floor(input.endOdometer / 1500);
    const lastBucket = vehicle.lastMaintenanceBucket || Math.floor(baselineOdo / 1500);
    if (currentBucket > lastBucket) {
      vehicle.requiresMaintenance = true;
      vehicle.lastMaintenanceBucket = currentBucket;
    } else if (!vehicle.lastMaintenanceBucket) {
      vehicle.lastMaintenanceBucket = lastBucket;
    }
    vehicle.branchId = booking.returnBranchId;
    vehicle.odometer = input.endOdometer;
    vehicle.status = damageFee > 500000 ? 'Maintenance' : 'Available';
    await vehicle.save();
  }

  // Log audit
  await AuditLog.create({
    userId: staffUser._id,
    action: 'CHECKOUT_RETURN',
    entity: 'Booking',
    entityId: booking._id.toString(),
    details: {
      bookingCode: booking.bookingCode,
      vehicleId: vehicle?._id.toString(),
      licensePlate: vehicle?.licensePlate,
      endOdometer: input.endOdometer,
      endFuelLevel: fuelLevel,
      lateHours,
      lateFee,
      damageFee,
      settlementAmount: finalDue,
      photosCount: input.checkoutImages ? input.checkoutImages.length : 0,
      returnBranchId: booking.returnBranchId.toString(),
      staffId: staffUser._id.toString(),
    },
    ipAddress: '127.0.0.1',
    userAgent: 'Motorent-CounterDesk/1.0',
  }).catch(() => {});

  emitBookingStatus(booking);
  User.findById(booking.userId)
    .select('email firstName lastName username')
    .then((cust) => {
      if (cust?.email) {
        const custName = [cust.lastName, cust.firstName].filter(Boolean).join(' ').trim() || cust.username;
        sendBookingStatusEmail({
          toEmail: cust.email,
          customerName: custName,
          bookingCode: booking.bookingCode,
          event: 'COMPLETED',
          vehicleName: vehicle ? `${vehicle.brand} ${vehicle.vehicleModel}` : undefined,
          licensePlate: vehicle?.licensePlate,
          totalAmount: booking.totalAmount,
          paidAmount: booking.paidAmount,
          remainingAmount: 0,
        }).catch(() => {});
      }
    })
    .catch(() => {});
  const populated = await populateBookingDetails(booking._id);
  return populated || booking;
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

  // Prevent paying on cancelled/rejected bookings
  if (booking.status === 'Cancelled' || booking.status === 'Rejected') {
    throw new AppError(400, `Không thể thu tiền cho đơn đặt xe đã ở trạng thái ${booking.status}.`);
  }

  // Prevent double-paying if already fully paid
  if (booking.isPaid && (booking.remainingAmount || 0) <= 0) {
    throw new AppError(400, 'Đơn đặt xe này đã được thanh toán toàn bộ (100%). Không còn số dư cần thu.');
  }

  // Verify staff branch assignment (staff at pickup branch or return branch can accept counter payment)
  assertBranchAccess(staffUser, [booking.pickupBranchId, booking.returnBranchId]);

  if (amount <= 0) {
    throw new AppError(400, 'Số tiền thanh toán phải lớn hơn 0 VNĐ.');
  }

  const isInitialPendingUnpaid =
    booking.status === 'Pending' && !booking.depositPaid && (booking.paidAmount || 0) === 0;
  const maxPayableBalance = isInitialPendingUnpaid
    ? booking.totalAmount
    : booking.remainingAmount || 0;

  if (amount > maxPayableBalance) {
    throw new AppError(
      400,
      `Số tiền thu (${amount.toLocaleString('vi-VN')} đ) vượt quá số dư còn lại cần thanh toán (${maxPayableBalance.toLocaleString('vi-VN')} đ).`
    );
  }

  const wasPending = booking.status === 'Pending';
  booking.paidAmount = (booking.paidAmount || 0) + amount;
  if (isInitialPendingUnpaid) {
    booking.remainingAmount = Math.max(0, booking.totalAmount - booking.paidAmount);
  } else {
    booking.remainingAmount = Math.max(0, (booking.remainingAmount || 0) - amount);
  }
  if (booking.remainingAmount === 0) {
    booking.isPaid = true;
  }
  if (wasPending) {
    booking.status = 'Confirmed';
  }
  booking.depositPaid = true;
  booking.counterPaidBy = staffUser._id as mongoose.Types.ObjectId;
  booking.counterPaidAt = new Date();
  await booking.save();

  await Vehicle.findByIdAndUpdate(booking.vehicleId, { status: 'Rented' }).catch(() => {});

  await AuditLog.create({
    userId: staffUser._id,
    action: 'RECORD_COUNTER_PAYMENT',
    entity: 'Booking',
    entityId: booking._id.toString(),
    details: {
      bookingCode: booking.bookingCode,
      amount,
      notes,
      paidAmount: booking.paidAmount,
      remainingAmount: booking.remainingAmount,
      isPaid: booking.isPaid,
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

  const populated = await populateBookingDetails(booking._id);
  return populated || booking;
};

/**
 * Record vehicle damage during rental or return (UC-58)
 * Photos + description, damage fee, severity assessment, and vehicle status update
 */
export const recordBookingDamage = async (
  bookingId: string,
  staffUser: IUser,
  input: RecordDamageDto
): Promise<IBooking> => {
  if (!mongoose.isValidObjectId(bookingId)) {
    throw new AppError(400, 'Mã đơn đặt xe không hợp lệ.');
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError(404, 'Không tìm thấy đơn đặt xe.');
  }

  // Verify staff branch assignment
  assertBranchAccess(staffUser, [booking.pickupBranchId, booking.returnBranchId]);

  if (input.damageFee < 0) {
    throw new AppError(400, 'Chi phí bồi thường hư hại không thể là số âm.');
  }

  if (!input.description || !input.description.trim()) {
    throw new AppError(400, 'Vui lòng nhập mô tả chi tiết hư hại, trầy xước của phương tiện.');
  }

  const severity = input.severity || (input.damageFee > 500000 ? 'Severe' : input.damageFee > 100000 ? 'Moderate' : 'Minor');
  const photos = Array.isArray(input.photos) ? input.photos : [];

  const record: IDamageRecord = {
    description: input.description.trim(),
    damageFee: input.damageFee,
    photos,
    severity,
    partsReplaced: input.partsReplaced || [],
    recordedBy: staffUser._id as mongoose.Types.ObjectId,
    recordedAt: new Date(),
  };

  booking.damageRecords = booking.damageRecords || [];
  booking.damageRecords.push(record);

  // Update cumulative damageFee and settlement
  booking.damageFee = (booking.damageFee || 0) + input.damageFee;
  booking.damageDescription = booking.damageDescription
    ? `${booking.damageDescription}\n- ${input.description.trim()}`
    : input.description.trim();
  if (photos.length > 0) {
    booking.damagePhotos = [...(booking.damagePhotos || []), ...photos];
  }

  // If settlement amount is set, adjust it with the new damage fee
  if (booking.settlementAmount !== undefined && booking.settlementAmount > 0) {
    booking.settlementAmount += input.damageFee;
  }

  await booking.save();

  // If severe damage or high cost, flag vehicle for maintenance
  if (severity === 'Severe' || input.damageFee >= 500000) {
    await Vehicle.findByIdAndUpdate(booking.vehicleId, {
      requiresMaintenance: true,
      status: 'Maintenance',
    });
  }

  // Audit log
  await AuditLog.create({
    userId: staffUser._id,
    action: 'RECORD_DAMAGE',
    entity: 'Booking',
    entityId: booking._id.toString(),
    details: {
      bookingCode: booking.bookingCode,
      damageFee: input.damageFee,
      severity,
      description: input.description.trim(),
      photosCount: photos.length,
      staffId: staffUser._id.toString(),
    },
    ipAddress: '127.0.0.1',
    userAgent: 'Motorent-CounterDesk/1.0',
  }).catch(() => {});

  emitBookingStatus(booking);
  const populated = await populateBookingDetails(booking._id);
  return populated || booking;
};

export interface PenaltyPreviewOptions {
  simulatedReturnTime?: Date | string;
  damageFee?: number;
}

/**
 * UC-59: Calculate penalty fees (late fee + damage fee)
 * Formula: 30,000 VND / hour ceil overdue after 15 min grace period + damage fee
 */
export const calculateBookingPenalty = async (
  bookingId: string,
  requestingUser: IUser,
  options: PenaltyPreviewOptions = {}
) => {
  if (!mongoose.isValidObjectId(bookingId)) {
    throw new AppError(400, 'Mã đơn đặt xe không hợp lệ.');
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError(404, 'Không tìm thấy đơn đặt xe.');
  }

  // Authorization: Customer can check their own booking; Staff/Manager/Admin can check branch bookings
  if (requestingUser.roles === 'Customer') {
    if (booking.userId.toString() !== requestingUser._id.toString()) {
      throw new AppError(403, 'Bạn không có quyền xem chi phí phạt của đơn đặt xe này.');
    }
  } else {
    assertBranchAccess(requestingUser, [booking.pickupBranchId, booking.returnBranchId]);
  }

  const returnTime = options.simulatedReturnTime
    ? new Date(options.simulatedReturnTime)
    : (booking.actualReturnDateTime || new Date());

  const scheduledReturn = new Date(booking.returnDateTime);
  const graceMinutes = 15;
  const overdueMs = returnTime.getTime() - scheduledReturn.getTime();
  const isOverdue = overdueMs > graceMinutes * 60 * 1000;

  let lateHoursCeil = 0;
  let overdueMinutes = 0;
  if (isOverdue) {
    overdueMinutes = Math.max(0, Math.ceil(overdueMs / (60 * 1000)));
    lateHoursCeil = Math.ceil(overdueMs / (3600 * 1000));
  }

  const hourlyLateRate = 30000; // 30,000 VND / hour
  const calculatedLateFee = lateHoursCeil * hourlyLateRate;
  const currentDamageFee = options.damageFee !== undefined ? Math.max(0, options.damageFee) : (booking.damageFee || 0);
  const remainingAmount = booking.remainingAmount || 0;
  const totalPenalty = calculatedLateFee + currentDamageFee;
  const totalSettlementDue = remainingAmount + totalPenalty;

  return {
    bookingId: booking._id,
    bookingCode: booking.bookingCode,
    status: booking.status,
    scheduledReturnDateTime: scheduledReturn,
    returnDateTimeUsed: returnTime,
    graceMinutes,
    isOverdue,
    overdueMinutes,
    lateHoursCeil,
    hourlyLateRate,
    lateFee: calculatedLateFee,
    damageFee: currentDamageFee,
    remainingAmount,
    totalPenalty,
    totalSettlementDue,
  };
};

/**
 * Cancel booking (UC-32) - BR-06 Cancellation Policy
 * Free cancellation if > 24 hours before pickup time.
 * 50% deposit forfeited if cancelled within 24 hours of pickup.
 * No cancellation allowed after vehicle handover (Ongoing / Completed).
 */
export const cancelBooking = async (
  bookingId: string,
  requestingUser: IUser,
  cancelReason?: string
): Promise<IBooking & { policySummary?: Record<string, unknown> }> => {
  if (!mongoose.isValidObjectId(bookingId)) {
    throw new AppError(400, 'Mã đơn đặt xe không hợp lệ.');
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError(404, 'Không tìm thấy đơn đặt xe.');
  }

  // Precondition 1: Customer authorization
  if (requestingUser.roles === 'Customer') {
    if (booking.userId.toString() !== requestingUser._id.toString()) {
      throw new AppError(403, 'Bạn không có quyền hủy đơn đặt xe này.');
    }
  }

  // 32.0.E1: Disallow cancellation if already Ongoing, Completed, Cancelled, or Rejected
  if (booking.status === 'Ongoing' || booking.status === 'Completed') {
    throw new AppError(
      409,
      `Không thể hủy đơn đặt xe đang trong hành trình hoặc đã hoàn tất (Trạng thái hiện tại: "${booking.status}").`
    );
  }

  if (booking.status === 'Cancelled' || booking.status === 'Rejected') {
    throw new AppError(
      409,
      `Đơn đặt xe này đã ở trạng thái "${booking.status}", không thể thực hiện thao tác hủy.`
    );
  }

  const now = new Date();
  const hoursUntilPickup = (booking.pickupDateTime.getTime() - now.getTime()) / (1000 * 3600);

  let forfeitAmount = 0;
  let refundAmount = 0;
  let policyNotice = '';

  // BR-06 policy calculation
  if ((booking.paidAmount || 0) > 0) {
    if (hoursUntilPickup > 24) {
      // Free cancellation > 24h before pickup
      forfeitAmount = 0;
      refundAmount = booking.paidAmount;
      policyNotice = `Hủy trước giờ nhận > 24 giờ (${Math.max(0, Math.floor(hoursUntilPickup))} giờ). Miễn phí hủy 100%, số tiền hoàn lại: ${refundAmount.toLocaleString('vi-VN')} đ.`;
    } else {
      // Within 24h of pickup: 50% deposit forfeited
      forfeitAmount = Math.round((booking.depositAmount || 0) * 0.5);
      refundAmount = Math.max(0, (booking.paidAmount || 0) - forfeitAmount);
      policyNotice = `Hủy trong vòng 24 giờ trước giờ nhận (${Math.max(0, Math.round(hoursUntilPickup))} giờ). Khấu trừ 50% tiền cọc (${forfeitAmount.toLocaleString('vi-VN')} đ) theo chính sách BR-06. Số tiền hoàn lại: ${refundAmount.toLocaleString('vi-VN')} đ.`;
    }
  } else {
    policyNotice = 'Đơn đặt giữ chưa phát sinh tiền thanh toán, hủy đơn không mất phí.';
  }

  // Update booking status and refund state
  booking.status = 'Cancelled';
  booking.cancelReason = cancelReason?.trim() || 'Khách hàng yêu cầu hủy đơn trực tuyến.';
  booking.cancelledAt = now;
  booking.refundAmount = refundAmount;
  booking.refundForfeitAmount = forfeitAmount;
  booking.refundStatus = refundAmount > 0 ? 'Pending' : 'None';
  await booking.save();

  // Release vehicle back to Available status
  await Vehicle.findByIdAndUpdate(booking.vehicleId, { status: 'Available' }).catch(() => {});

  // Rollback discount usage count if applied
  if (booking.discountId) {
    await Discount.findByIdAndUpdate(booking.discountId, { $inc: { usedCount: -1 } }).catch(() => {});
  }

  // Create pending refund record if eligible
  if (refundAmount > 0) {
    await Payment.create({
      bookingId: booking._id,
      txnRef: `REFUND-${booking.bookingCode}-${Date.now()}`,
      amount: refundAmount,
      type: 'REFUND',
      status: 'PENDING',
    }).catch((err: unknown) => console.error('[Refund Payment Record Error]', err));
  }

  // Send customer notification
  await Notification.create({
    userId: booking.userId,
    title: `Đơn đặt xe ${booking.bookingCode} đã được hủy`,
    message: policyNotice,
    type: 'BOOKING_CANCELLED',
    data: {
      bookingId: booking._id,
      bookingCode: booking.bookingCode,
      refundAmount,
      forfeitAmount,
      refundStatus: booking.refundStatus,
    },
  }).catch(() => {});

  // Log action to AuditLog
  await AuditLog.create({
    userId: requestingUser._id,
    action: 'CANCEL_BOOKING',
    entity: 'Booking',
    entityId: booking._id.toString(),
    details: {
      bookingCode: booking.bookingCode,
      cancelReason: booking.cancelReason,
      hoursUntilPickup,
      paidAmount: booking.paidAmount,
      depositAmount: booking.depositAmount,
      forfeitAmount,
      refundAmount,
      refundStatus: booking.refundStatus,
      policyNotice,
    },
    timestamp: now,
  }).catch(() => {});

  emitBookingStatus(booking);

  const populated = await populateBookingDetails(booking._id);

  const result = populated ? populated.toObject() : booking.toObject();
  (result as unknown as Record<string, unknown>).policySummary = {
    hoursUntilPickup,
    forfeitAmount,
    refundAmount,
    policyNotice,
  };

  return result as unknown as IBooking;
};

export interface RequestRefundDto {
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  reason?: string;
}

/**
 * Request refund for cancelled or rejected booking (UC-33)
 */
export const requestRefund = async (
  bookingId: string,
  requestingUser: IUser,
  data: RequestRefundDto
): Promise<IBooking> => {
  if (!mongoose.isValidObjectId(bookingId)) {
    throw new AppError(400, 'Mã đơn đặt xe không hợp lệ.');
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError(404, 'Không tìm thấy đơn đặt xe.');
  }

  // Precondition: Customer authorization
  if (requestingUser.roles === 'Customer') {
    if (booking.userId.toString() !== requestingUser._id.toString()) {
      throw new AppError(403, 'Bạn không có quyền yêu cầu hoàn tiền cho đơn đặt xe này.');
    }
  }

  // Booking must be Cancelled or Rejected
  if (booking.status !== 'Cancelled' && booking.status !== 'Rejected') {
    throw new AppError(
      400,
      `Chỉ có thể yêu cầu hoàn tiền cho đơn đặt xe đã hủy hoặc bị từ chối (Trạng thái hiện tại: "${booking.status}").`
    );
  }

  // Must have paid amount > 0
  if ((booking.paidAmount || 0) <= 0) {
    throw new AppError(
      400,
      'Đơn đặt xe chưa phát sinh khoản tiền thanh toán, không thể yêu cầu hoàn tiền.'
    );
  }

  // Cannot request if already Approved
  if (booking.refundStatus === 'Approved') {
    throw new AppError(400, 'Yêu cầu hoàn tiền của đơn này đã được quản lý phê duyệt và hoàn tất.');
  }

  // Calculate refundAmount if not already calculated
  if (!booking.refundAmount || booking.refundAmount === 0) {
    const pickupTime = booking.pickupDateTime.getTime();
    const cancelTime = booking.cancelledAt ? booking.cancelledAt.getTime() : Date.now();
    const hoursUntil = (pickupTime - cancelTime) / (1000 * 3600);
    if (hoursUntil > 24) {
      booking.refundForfeitAmount = 0;
      booking.refundAmount = booking.paidAmount;
    } else {
      booking.refundForfeitAmount = Math.round((booking.depositAmount || 0) * 0.5);
      booking.refundAmount = Math.max(0, (booking.paidAmount || 0) - booking.refundForfeitAmount);
    }
  }

  const now = new Date();
  booking.refundStatus = 'Pending';
  booking.refundBankInfo = {
    bankName: data.bankName.trim(),
    bankAccountNumber: data.bankAccountNumber.trim(),
    bankAccountName: data.bankAccountName.trim().toUpperCase(),
    reason: data.reason?.trim() || 'Khách hàng gửi thông tin tài khoản nhận hoàn cọc.',
    requestedAt: now,
  };

  await booking.save();

  // Create or update refund Payment record
  await Payment.findOneAndUpdate(
    { bookingId: booking._id, type: 'REFUND' },
    {
      bookingId: booking._id,
      txnRef: `REFUND-${booking.bookingCode}-${Date.now()}`,
      amount: booking.refundAmount,
      type: 'REFUND',
      status: 'PENDING',
      rawIpn: {
        bankName: data.bankName,
        bankAccountNumber: data.bankAccountNumber,
        bankAccountName: data.bankAccountName,
        reason: data.reason,
      },
    },
    { upsert: true, new: true }
  ).catch((err: unknown) => console.error('[Refund Payment Error]', err));

  // Send Notification to customer
  await Notification.create({
    userId: booking.userId,
    title: `Đã tiếp nhận thông tin hoàn tiền đơn ${booking.bookingCode}`,
    message: `Yêu cầu hoàn số tiền ${(booking.refundAmount || 0).toLocaleString('vi-VN')} đ về tài khoản ${data.bankAccountNumber} (${data.bankName}) đang được kế toán/quản lý phê duyệt.`,
    type: 'BOOKING_REFUND_REQUESTED',
    data: {
      bookingId: booking._id,
      bookingCode: booking.bookingCode,
      refundAmount: booking.refundAmount,
      bankName: data.bankName,
    },
  }).catch(() => {});

  // AuditLog
  await AuditLog.create({
    userId: requestingUser._id,
    action: 'REQUEST_REFUND',
    entity: 'Booking',
    entityId: booking._id.toString(),
    details: {
      bookingCode: booking.bookingCode,
      refundAmount: booking.refundAmount,
      bankInfo: booking.refundBankInfo,
    },
    timestamp: now,
  }).catch(() => {});

  emitBookingStatus(booking);

  const populated = await Booking.findById(booking._id)
    .populate('userId', 'username email firstName lastName phoneNumber')
    .populate('vehicleId', 'modelName plateNumber brand dailyPrice')
    .populate('pickupBranchId', 'name address phone')
    .populate('returnBranchId', 'name address phone');

  return populated || booking;
};

export interface ExtendBookingDto {
  newReturnDateTime: string | Date;
}

export interface ExtensionEstimateResult {
  bookingId: string;
  bookingCode: string;
  oldReturnDateTime: string;
  newReturnDateTime: string;
  addedHours: number;
  addedDays: number;
  oldTotalAmount: number;
  addedAmount: number;
  newTotalAmount: number;
  newRemainingAmount: number;
  isAvailable: boolean;
  requiresPayment: boolean;
}

/**
 * Preview / estimate rental extension costs and verify availability (UC-34)
 */
export const estimateBookingExtension = async (
  bookingId: string,
  requestingUser: IUser,
  data: ExtendBookingDto
): Promise<ExtensionEstimateResult> => {
  if (!mongoose.isValidObjectId(bookingId)) {
    throw new AppError(400, 'Mã đơn đặt xe không hợp lệ.');
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError(404, 'Không tìm thấy đơn đặt xe.');
  }

  if (requestingUser.roles === 'Customer') {
    if (booking.userId.toString() !== requestingUser._id.toString()) {
      throw new AppError(403, 'Bạn không có quyền thao tác trên đơn đặt xe này.');
    }
  }

  if (!['Confirmed', 'Ongoing'].includes(booking.status)) {
    throw new AppError(
      400,
      `Chỉ có thể gia hạn đơn đặt xe đang trong hành trình hoặc đã được xác nhận (Trạng thái hiện tại: "${booking.status}").`
    );
  }

  const newReturnDate = new Date(data.newReturnDateTime);
  if (isNaN(newReturnDate.getTime())) {
    throw new AppError(400, 'Thời gian trả xe mới không hợp lệ.');
  }

  if (newReturnDate <= booking.returnDateTime) {
    throw new AppError(
      400,
      `Thời gian trả xe mới (${newReturnDate.toLocaleString('vi-VN')}) phải sau thời gian trả xe hiện tại (${booking.returnDateTime.toLocaleString('vi-VN')}).`
    );
  }

  const totalHours = (newReturnDate.getTime() - booking.pickupDateTime.getTime()) / (1000 * 3600);
  if (totalHours > 30 * 24) {
    throw new AppError(400, 'Tổng thời gian thuê xe sau khi gia hạn không được vượt quá 30 ngày.');
  }

  const returnBranch = await Branch.findById(booking.returnBranchId);
  if (returnBranch && returnBranch.hours_open && returnBranch.hours_close) {
    const returnHm = getVnHm(newReturnDate);
    if (returnHm < returnBranch.hours_open || returnHm > returnBranch.hours_close) {
      throw new AppError(
        400,
        `Thời gian trả xe mới (${returnHm}) nằm ngoài giờ mở cửa của chi nhánh ${returnBranch.name} (${returnBranch.hours_open} - ${returnBranch.hours_close}).`
      );
    }
  }

  const conflict = await Booking.findOne({
    _id: { $ne: booking._id },
    vehicleId: booking.vehicleId,
    status: { $in: ['Pending', 'Approved', 'Confirmed', 'Ongoing'] },
    pickupDateTime: { $lt: newReturnDate },
    returnDateTime: { $gt: booking.returnDateTime },
  });

  if (conflict) {
    throw new AppError(
      409,
      'Phương tiện này đã có lịch đặt tiếp theo trong khung giờ gia hạn bạn yêu cầu. Vui lòng chọn thời gian khác hoặc liên hệ nhân viên chi nhánh.'
    );
  }

  const vehicle = await Vehicle.findById(booking.vehicleId);
  if (!vehicle) {
    throw new AppError(404, 'Không tìm thấy thông tin phương tiện.');
  }

  let basePrice = 0;
  if (totalHours < 24 && vehicle.hourlyPrice) {
    basePrice = Math.ceil(totalHours) * vehicle.hourlyPrice;
  } else {
    const diffDays = Math.max(1, Math.ceil(totalHours / 24));
    basePrice = diffDays * vehicle.dailyPrice;
  }

  const discountAmount = booking.discountAmount || 0;
  const newTotalAmount = Math.max(0, basePrice - discountAmount);
  const addedAmount = Math.max(0, newTotalAmount - booking.totalAmount);
  const addedHours = (newReturnDate.getTime() - booking.returnDateTime.getTime()) / (1000 * 3600);
  const addedDays = Math.ceil(addedHours / 24);
  const newRemainingAmount = (booking.remainingAmount || 0) + addedAmount;

  return {
    bookingId: booking._id.toString(),
    bookingCode: booking.bookingCode,
    oldReturnDateTime: booking.returnDateTime.toISOString(),
    newReturnDateTime: newReturnDate.toISOString(),
    addedHours: Math.round(addedHours * 10) / 10,
    addedDays,
    oldTotalAmount: booking.totalAmount,
    addedAmount,
    newTotalAmount,
    newRemainingAmount,
    isAvailable: true,
    requiresPayment: addedAmount > 0,
  };
};

/**
 * Execute booking extension with atomic lock and event emission (UC-34)
 */
export const extendBooking = async (
  bookingId: string,
  requestingUser: IUser,
  data: ExtendBookingDto
): Promise<IBooking & { extensionSummary?: Record<string, unknown> }> => {
  if (!mongoose.isValidObjectId(bookingId)) {
    throw new AppError(400, 'Mã đơn đặt xe không hợp lệ.');
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError(404, 'Không tìm thấy đơn đặt xe.');
  }

  if (requestingUser.roles === 'Customer') {
    if (booking.userId.toString() !== requestingUser._id.toString()) {
      throw new AppError(403, 'Bạn không có quyền gia hạn đơn đặt xe này.');
    }
  }

  if (!['Confirmed', 'Ongoing'].includes(booking.status)) {
    throw new AppError(
      400,
      `Chỉ có thể gia hạn đơn đặt xe đang trong hành trình hoặc đã được xác nhận (Trạng thái hiện tại: "${booking.status}").`
    );
  }

  const newReturnDate = new Date(data.newReturnDateTime);
  if (isNaN(newReturnDate.getTime())) {
    throw new AppError(400, 'Thời gian trả xe mới không hợp lệ.');
  }

  if (newReturnDate <= booking.returnDateTime) {
    throw new AppError(
      400,
      `Thời gian trả xe mới phải sau thời gian trả xe hiện tại (${booking.returnDateTime.toLocaleString('vi-VN')}).`
    );
  }

  const totalHours = (newReturnDate.getTime() - booking.pickupDateTime.getTime()) / (1000 * 3600);
  if (totalHours > 30 * 24) {
    throw new AppError(400, 'Tổng thời gian thuê xe sau khi gia hạn không được vượt quá 30 ngày.');
  }

  const returnBranch = await Branch.findById(booking.returnBranchId);
  if (returnBranch && returnBranch.hours_open && returnBranch.hours_close) {
    const returnHm = getVnHm(newReturnDate);
    if (returnHm < returnBranch.hours_open || returnHm > returnBranch.hours_close) {
      throw new AppError(
        400,
        `Thời gian trả xe mới (${returnHm}) nằm ngoài giờ mở cửa của chi nhánh ${returnBranch.name} (${returnBranch.hours_open} - ${returnBranch.hours_close}).`
      );
    }
  }

  return await acquireVehicleLock(booking.vehicleId.toString(), async () => {
    const conflict = await Booking.findOne({
      _id: { $ne: booking._id },
      vehicleId: booking.vehicleId,
      status: { $in: ['Pending', 'Approved', 'Confirmed', 'Ongoing'] },
      pickupDateTime: { $lt: newReturnDate },
      returnDateTime: { $gt: booking.returnDateTime },
    });

    if (conflict) {
      throw new AppError(
        409,
        'Phương tiện này đã có lịch đặt tiếp theo trong khung giờ gia hạn bạn yêu cầu. Vui lòng chọn thời gian khác hoặc liên hệ nhân viên chi nhánh.'
      );
    }

    const vehicle = await Vehicle.findById(booking.vehicleId);
    if (!vehicle) {
      throw new AppError(404, 'Không tìm thấy thông tin phương tiện.');
    }

    let basePrice = 0;
    if (totalHours < 24 && vehicle.hourlyPrice) {
      basePrice = Math.ceil(totalHours) * vehicle.hourlyPrice;
    } else {
      const diffDays = Math.max(1, Math.ceil(totalHours / 24));
      basePrice = diffDays * vehicle.dailyPrice;
    }

    const discountAmount = booking.discountAmount || 0;
    const newTotalAmount = Math.max(0, basePrice - discountAmount);
    const addedAmount = Math.max(0, newTotalAmount - booking.totalAmount);
    const oldReturnDateTime = booking.returnDateTime;

    if (!booking.originalReturnDateTime) {
      booking.originalReturnDateTime = oldReturnDateTime;
    }

    booking.returnDateTime = newReturnDate;
    booking.totalAmount = newTotalAmount;
    booking.remainingAmount = (booking.remainingAmount || 0) + addedAmount;
    if (addedAmount > 0) {
      booking.isPaid = false;
    }
    booking.extensionCount = (booking.extensionCount || 0) + 1;
    booking.lastExtendedAt = new Date();

    await booking.save();

    await AuditLog.create({
      userId: requestingUser._id,
      action: 'EXTEND_BOOKING',
      entity: 'Booking',
      entityId: booking._id.toString(),
      details: {
        bookingCode: booking.bookingCode,
        oldReturnDateTime,
        newReturnDateTime: newReturnDate,
        addedAmount,
        newTotalAmount,
        remainingAmount: booking.remainingAmount,
      },
      timestamp: new Date(),
    }).catch(() => {});

    await Notification.create({
      userId: booking.userId,
      title: 'Gia hạn chuyến xe thành công',
      message: `Đơn thuê xe ${booking.bookingCode} đã được gia hạn đến ${newReturnDate.toLocaleString('vi-VN')}. Phí phát sinh: ${addedAmount.toLocaleString('vi-VN')} đ.`,
      type: 'BOOKING_UPDATE',
    }).catch(() => {});

    emitBookingStatus(booking);

    const populated = await Booking.findById(booking._id)
      .populate('userId', 'username email firstName lastName phoneNumber')
      .populate('vehicleId', 'vehicleModel licensePlate brand dailyPrice hourlyPrice images')
      .populate('pickupBranchId', 'name address phone')
      .populate('returnBranchId', 'name address phone');

    const doc = populated || booking;
    const result = doc.toObject();
    (result as unknown as Record<string, unknown>).extensionSummary = {
      oldReturnDateTime,
      newReturnDateTime: newReturnDate,
      addedAmount,
      newTotalAmount,
      remainingAmount: booking.remainingAmount,
      extensionCount: booking.extensionCount,
    };

    return result as unknown as IBooking;
  });
};

/**
 * UC-73: Approve Order (Manager)
 */
export const approveBooking = async (
  bookingId: string,
  managerUser: IUser,
  notes?: string
) => {
  if (!mongoose.isValidObjectId(bookingId)) {
    throw new AppError(400, 'Mã đơn đặt xe không hợp lệ.');
  }

  const booking = await Booking.findById(bookingId)
    .populate('vehicleId')
    .populate('userId');

  if (!booking) {
    throw new AppError(404, 'Không tìm thấy thông tin đơn đặt xe.');
  }

  // Branch access authorization
  assertBranchAccess(managerUser, booking.pickupBranchId);

  // Status validation: can only approve Pending bookings
  if (booking.status === 'Cancelled' || booking.status === 'Rejected') {
    throw new AppError(400, 'Không thể phê duyệt đơn đặt xe đã bị hủy hoặc từ chối.');
  }

  if (['Approved', 'Confirmed', 'Ongoing', 'Completed'].includes(booking.status)) {
    throw new AppError(400, `Đơn đặt xe đã ở trạng thái "${booking.status}", không cần phê duyệt lại.`);
  }

  const now = new Date();
  booking.approvedBy = managerUser._id as mongoose.Types.ObjectId;
  booking.approvedAt = now;

  // If deposit or full payment is already paid, transition directly to Confirmed, else Approved
  if (booking.depositPaid || booking.isPaid) {
    booking.status = 'Confirmed';
  } else {
    booking.status = 'Approved';
  }

  await booking.save();

  // Audit log
  await AuditLog.create({
    userId: managerUser._id,
    action: 'APPROVE_BOOKING',
    entity: 'Booking',
    entityId: booking._id.toString(),
    details: {
      bookingCode: booking.bookingCode,
      previousStatus: 'Pending',
      newStatus: booking.status,
      approvedBy: managerUser._id,
      notes: notes || '',
    },
    timestamp: now,
  }).catch((err) => console.error('[AuditLog Error]', err));

  // Send Notification to Customer
  const customerId = (booking.userId as unknown as { _id?: mongoose.Types.ObjectId })?._id || booking.userId;
  await Notification.create({
    userId: customerId,
    title: 'Đơn đặt xe đã được phê duyệt',
    body: `Đơn đặt xe #${booking.bookingCode} của bạn đã được Quản lý chi nhánh phê duyệt thành công. Phương tiện đang được chuẩn bị sẵn sàng tại trạm.`,
    type: 'BOOKING',
    relatedId: booking._id.toString(),
    isRead: false,
  }).catch((err) => console.error('[Notification Error]', err));

  // Socket real-time status update
  emitBookingStatus(booking);
  const approvedUser = booking.userId as unknown as { email?: string; firstName?: string; lastName?: string; username?: string };
  if (approvedUser?.email) {
    sendBookingStatusEmail({
      toEmail: approvedUser.email,
      customerName: [approvedUser.lastName, approvedUser.firstName].filter(Boolean).join(' ').trim() || approvedUser.username || 'Quý khách',
      bookingCode: booking.bookingCode,
      event: 'APPROVED',
      totalAmount: booking.totalAmount,
      paidAmount: booking.paidAmount,
      remainingAmount: booking.remainingAmount,
      note: notes,
    }).catch(() => {});
  }

  return booking;
};

/**
 * UC-74: Reject Order (Manager)
 */
export const rejectBooking = async (
  bookingId: string,
  managerUser: IUser,
  rejectReason: string
) => {
  if (!mongoose.isValidObjectId(bookingId)) {
    throw new AppError(400, 'Mã đơn đặt xe không hợp lệ.');
  }

  const cleanReason = (rejectReason || '').trim();
  if (!cleanReason) {
    throw new AppError(400, 'Lý do từ chối đơn đặt xe là bắt buộc.');
  }

  const booking = await Booking.findById(bookingId)
    .populate('vehicleId')
    .populate('userId');

  if (!booking) {
    throw new AppError(404, 'Không tìm thấy thông tin đơn đặt xe.');
  }

  // Branch access authorization
  assertBranchAccess(managerUser, booking.pickupBranchId);

  // Status check: cannot reject already finished or cancelled/rejected orders
  if (booking.status === 'Cancelled' || booking.status === 'Rejected') {
    throw new AppError(400, 'Không thể từ chối đơn đặt xe đã bị hủy hoặc từ chối trước đó.');
  }

  if (['Ongoing', 'Completed'].includes(booking.status)) {
    throw new AppError(400, `Không thể từ chối đơn đặt xe đang ở trạng thái "${booking.status}".`);
  }

  const now = new Date();
  booking.status = 'Rejected';
  booking.rejectReason = cleanReason;
  booking.rejectedBy = managerUser._id as mongoose.Types.ObjectId;
  booking.rejectedAt = now;
  booking.cancelledAt = now;

  // Since rejection is initiated by Manager/System, customer is entitled to 100% refund of any paid money
  const customerPaid = (booking.paidAmount && booking.paidAmount > 0)
    ? booking.paidAmount
    : (booking.depositPaid ? booking.depositAmount : 0);

  if (customerPaid > 0) {
    booking.refundAmount = customerPaid;
    booking.refundForfeitAmount = 0;
    booking.refundStatus = 'Pending';

    // Create Payment refund record
    await Payment.create({
      bookingId: booking._id,
      txnRef: `REFUND-REJECT-${booking.bookingCode}-${Date.now()}`,
      amount: customerPaid,
      type: 'REFUND',
      status: 'PENDING',
    }).catch((err: unknown) => console.error('[Refund Record Error]', err));
  } else {
    booking.refundAmount = 0;
    booking.refundForfeitAmount = 0;
    booking.refundStatus = 'None';
  }

  // Restore voucher usage if used
  if (booking.discountId) {
    await Discount.findByIdAndUpdate(booking.discountId, { $inc: { usedCount: -1 } }).catch(() => {});
  }

  await booking.save();

  // Audit log
  await AuditLog.create({
    userId: managerUser._id,
    action: 'REJECT_BOOKING',
    entity: 'Booking',
    entityId: booking._id.toString(),
    details: {
      bookingCode: booking.bookingCode,
      rejectReason: cleanReason,
      rejectedBy: managerUser._id,
      customerPaid,
      refundAmount: booking.refundAmount,
      refundStatus: booking.refundStatus,
    },
    timestamp: now,
  }).catch((err) => console.error('[AuditLog Error]', err));

  // Send Notification to Customer
  const customerId = (booking.userId as unknown as { _id?: mongoose.Types.ObjectId })?._id || booking.userId;
  const refundText = booking.refundAmount && booking.refundAmount > 0
    ? ` Số tiền đã thanh toán (${booking.refundAmount.toLocaleString('vi-VN')} đ) đang được xử lý hoàn trả 100%.`
    : '';

  await Notification.create({
    userId: customerId,
    title: `Đơn đặt xe ${booking.bookingCode} đã bị từ chối`,
    body: `Đơn đặt xe #${booking.bookingCode} của bạn đã bị Quản lý chi nhánh từ chối. Lý do: "${cleanReason}".${refundText}`,
    type: 'BOOKING',
    relatedId: booking._id.toString(),
    isRead: false,
    data: {
      bookingId: booking._id,
      bookingCode: booking.bookingCode,
      rejectReason: cleanReason,
      refundAmount: booking.refundAmount,
    },
  }).catch((err) => console.error('[Notification Error]', err));

  // Socket status event
  emitBookingStatus(booking);
  const rejectedUser = booking.userId as unknown as { email?: string; firstName?: string; lastName?: string; username?: string };
  if (rejectedUser?.email) {
    sendBookingStatusEmail({
      toEmail: rejectedUser.email,
      customerName: [rejectedUser.lastName, rejectedUser.firstName].filter(Boolean).join(' ').trim() || rejectedUser.username || 'Quý khách',
      bookingCode: booking.bookingCode,
      event: 'REJECTED',
      totalAmount: booking.totalAmount,
      paidAmount: booking.paidAmount,
      remainingAmount: 0,
      note: cleanReason,
    }).catch(() => {});
  }

  return booking;
};

/**
 * UC-75: Approve Refund (Manager)
 */
export const approveRefund = async (
  bookingId: string,
  requestingUser: { _id: mongoose.Types.ObjectId | string; roles: string; fullName?: string; email?: string; branchId?: string | mongoose.Types.ObjectId },
  data: {
    refundAmount?: number;
    note?: string;
    bankName?: string;
    bankAccount?: string;
    bankAccountName?: string;
  }
): Promise<IBooking> => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError(404, 'Không tìm thấy đơn đặt xe.');
  }

  // Branch access check for BranchManager
  if (requestingUser.roles !== 'SystemAdmin') {
    assertBranchAccess(requestingUser as any, booking.pickupBranchId);
  }

  if (booking.refundStatus === 'Approved') {
    throw new AppError(400, 'Yêu cầu hoàn tiền đã được phê duyệt trước đó.');
  }

  if (booking.refundStatus === 'Rejected') {
    throw new AppError(400, 'Yêu cầu hoàn tiền đã bị từ chối trước đó.');
  }

  if (booking.refundStatus !== 'Pending' || (booking.refundAmount || 0) <= 0) {
    throw new AppError(400, 'Đơn đặt xe không có khoản hoàn tiền nào đang ở trạng thái chờ duyệt (Pending).');
  }

  // If manager adjusts refund amount
  if (data.refundAmount !== undefined && data.refundAmount > 0) {
    if (data.refundAmount > (booking.paidAmount || 0)) {
      throw new AppError(
        400,
        `Số tiền hoàn (${data.refundAmount.toLocaleString('vi-VN')} đ) không thể vượt quá số tiền khách đã thanh toán (${(booking.paidAmount || 0).toLocaleString('vi-VN')} đ).`
      );
    }
    booking.refundAmount = data.refundAmount;
  }

  booking.refundStatus = 'Approved';
  await booking.save();

  // Find or create REFUND payment record and mark SUCCESS
  const refundPayment = await Payment.findOne({
    bookingId: booking._id,
    type: 'REFUND',
  });

  if (refundPayment) {
    refundPayment.status = 'SUCCESS';
    refundPayment.amount = booking.refundAmount || 0;
    await refundPayment.save();
  } else {
    await Payment.create({
      bookingId: booking._id,
      txnRef: `REFUND-${booking.bookingCode}-${Date.now()}`,
      amount: booking.refundAmount || 0,
      type: 'REFUND',
      status: 'SUCCESS',
    });
  }

  // Notify customer
  await Notification.create({
    userId: booking.userId,
    title: `Khoản hoàn tiền đơn ${booking.bookingCode} đã được duyệt`,
    body: `Khoản hoàn tiền ${(booking.refundAmount || 0).toLocaleString('vi-VN')} đ cho đơn đặt xe ${booking.bookingCode} đã được Quản lý chi nhánh phê duyệt. ${data.note ? `Ghi chú: ${data.note}` : ''}`,
    type: 'BOOKING',
    data: {
      bookingId: booking._id,
      bookingCode: booking.bookingCode,
      refundAmount: booking.refundAmount,
      refundStatus: 'Approved',
      approvedAt: new Date(),
    },
  }).catch(() => {});

  // Audit log
  await AuditLog.create({
    userId: requestingUser._id,
    action: 'APPROVE_REFUND',
    entity: 'Booking',
    entityId: booking._id.toString(),
    details: {
      bookingCode: booking.bookingCode,
      refundAmount: booking.refundAmount,
      refundStatus: 'Approved',
      bankInfo: {
        bankName: data.bankName,
        bankAccount: data.bankAccount,
        bankAccountName: data.bankAccountName,
      },
      note: data.note,
    },
    timestamp: new Date(),
  }).catch(() => {});

  emitBookingStatus(booking);

  const populated = await populateBookingDetails(booking._id);
  return (populated || booking) as unknown as IBooking;
};

/**
 * UC-76: Reject Refund (Manager)
 */
export const rejectRefund = async (
  bookingId: string,
  requestingUser: { _id: mongoose.Types.ObjectId | string; roles: string; fullName?: string; email?: string; branchId?: string | mongoose.Types.ObjectId },
  data: {
    reason: string;
  }
): Promise<IBooking> => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError(404, 'Không tìm thấy đơn đặt xe.');
  }

  // Branch access check for BranchManager
  if (requestingUser.roles !== 'SystemAdmin') {
    assertBranchAccess(requestingUser as any, booking.pickupBranchId);
  }

  if (booking.refundStatus === 'Approved') {
    throw new AppError(400, 'Không thể từ chối vì yêu cầu hoàn tiền đã được phê duyệt trước đó.');
  }

  if (booking.refundStatus === 'Rejected') {
    throw new AppError(400, 'Yêu cầu hoàn tiền đã bị từ chối trước đó.');
  }

  if (booking.refundStatus !== 'Pending' || (booking.refundAmount || 0) <= 0) {
    throw new AppError(400, 'Đơn đặt xe không có khoản hoàn tiền nào đang ở trạng thái chờ duyệt (Pending).');
  }

  booking.refundStatus = 'Rejected';
  booking.rejectReason = data.reason.trim();
  await booking.save();

  // Find or create REFUND payment record and mark FAILED
  const refundPayment = await Payment.findOne({
    bookingId: booking._id,
    type: 'REFUND',
  });

  if (refundPayment) {
    refundPayment.status = 'FAILED';
    await refundPayment.save();
  } else {
    await Payment.create({
      bookingId: booking._id,
      txnRef: `REFUND-${booking.bookingCode}-${Date.now()}`,
      amount: booking.refundAmount || 0,
      type: 'REFUND',
      status: 'FAILED',
    });
  }

  // Notify customer
  await Notification.create({
    userId: booking.userId,
    title: `Yêu cầu hoàn tiền đơn ${booking.bookingCode} đã bị từ chối`,
    body: `Yêu cầu hoàn tiền cho đơn đặt xe ${booking.bookingCode} đã bị từ chối bởi Quản lý chi nhánh. Lý do: ${data.reason.trim()}`,
    type: 'BOOKING',
    data: {
      bookingId: booking._id,
      bookingCode: booking.bookingCode,
      refundStatus: 'Rejected',
      rejectReason: data.reason.trim(),
      rejectedAt: new Date(),
    },
  }).catch(() => {});

  // Audit log
  await AuditLog.create({
    userId: requestingUser._id,
    action: 'REJECT_REFUND',
    entity: 'Booking',
    entityId: booking._id.toString(),
    details: {
      bookingCode: booking.bookingCode,
      refundAmount: booking.refundAmount,
      refundStatus: 'Rejected',
      reason: data.reason.trim(),
    },
    timestamp: new Date(),
  }).catch(() => {});

  emitBookingStatus(booking);

  const populated = await populateBookingDetails(booking._id);
  return (populated || booking) as unknown as IBooking;
};
