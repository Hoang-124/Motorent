import crypto from 'crypto';
import mongoose from 'mongoose';
import { Booking, IBooking, BookingStatus } from '../../models/Booking';
import { Vehicle } from '../../models/Vehicle';
import { Branch } from '../../models/Branch';
import { User, IUser } from '../../models/User';
import { Discount } from '../../models/Discount';
import { Notification } from '../../models/Notification';
import { BookingReminder } from '../../models/BookingReminder';
import { AppError } from '../../core/errorHandler';

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
}

export interface CheckoutDto {
  endOdometer: number;
  endFuelLevel?: string;
  checkoutImages?: string[];
  damageFee?: number;
  notes?: string;
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
    // Generate 6 random uppercase chars/numbers
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
 * Create a new booking with date validation, conflict prevention, and server-side pricing
 */
export const createBooking = async (
  userId: string,
  data: CreateBookingDto
): Promise<IBooking> => {
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
    throw new AppError(400, 'Thời gian trả xe phải sau thời gian nhận xe ít nhất vài giờ.');
  }

  // Ensure pickupDate is not in the past (allow 10-minute clock skew)
  const now = new Date(Date.now() - 10 * 60 * 1000);
  if (pickupDate < now) {
    throw new AppError(400, 'Thời gian nhận xe không thể ở trong quá khứ.');
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

  // Calculate duration in days (minimum 1 day)
  const diffDays = Math.max(
    1,
    Math.ceil((returnDate.getTime() - pickupDate.getTime()) / (1000 * 3600 * 24))
  );

  const basePrice = diffDays * vehicle.dailyPrice;
  let discountAmount = 0;
  let discountDoc = null;

  if (data.discountCode && data.discountCode.trim()) {
    const code = data.discountCode.trim().toUpperCase();
    const currentDate = new Date();
    discountDoc = await Discount.findOne({
      code,
      isActive: true,
      startDate: { $lte: currentDate },
      endDate: { $gte: currentDate },
      $expr: { $lt: ['$usedCount', '$usageLimit'] },
    });

    if (discountDoc) {
      if (!discountDoc.minBookingAmount || basePrice >= discountDoc.minBookingAmount) {
        const rawDiscount = Math.round(basePrice * (discountDoc.discountPercent / 100));
        discountAmount = discountDoc.maxDiscountAmount
          ? Math.min(discountDoc.maxDiscountAmount, rawDiscount)
          : rawDiscount;

        // Atomically increment usage
        await Discount.findByIdAndUpdate(discountDoc._id, { $inc: { usedCount: 1 } });
      }
    }
  }

  const totalAmount = Math.max(0, basePrice - discountAmount);
  const depositAmount = Math.round(totalAmount * 0.3);
  const remainingAmount = totalAmount - depositAmount;

  const bookingCode = await generateBookingCode();

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
    startOdometer: vehicle.odometer || 0,
  });

  // Create In-App Notification
  await Notification.create({
    userId: user._id,
    title: 'Đặt giữ xe thành công',
    body: `Đơn thuê ${bookingCode} (${vehicle.vehicleModel}) đã được khởi tạo. Vui lòng thanh toán cọc 30% (${depositAmount.toLocaleString('vi-VN')} đ) để xác nhận khóa xe.`,
    type: 'BOOKING',
    relatedId: newBooking._id.toString(),
    isRead: false,
  }).catch((err: unknown) => console.error('Notification error:', err));

  // Schedule pickup reminder
  const reminderTime = new Date(pickupDate.getTime() - 2 * 3600 * 1000);
  if (reminderTime > new Date()) {
    await BookingReminder.create({
      bookingId: newBooking._id,
      reminderType: 'PICKUP_UPCOMING',
      scheduledTime: reminderTime,
      status: 'Pending',
      channel: 'SMS',
    }).catch((err: unknown) => console.error('Reminder error:', err));
  }

  return newBooking;
};

/**
 * Get customer's personal bookings
 */
export const getMyBookings = async (userId: string) => {
  return Booking.find({ userId })
    .populate('vehicleId', 'vehicleModel brand licensePlate dailyPrice images odometer status fuelType transmissionType')
    .populate('pickupBranchId', 'name code address phone hours_open hours_close')
    .populate('returnBranchId', 'name code address phone hours_open hours_close')
    .sort({ createdAt: -1 });
};

/**
 * Get branch bookings queue for Staff/BranchManager
 */
export const getBranchBookings = async (user: IUser, statusFilter?: string) => {
  const query: Record<string, unknown> = {};

  // If user is Staff or BranchManager, restrict to their branch
  if (user.roles === 'Staff' || user.roles === 'BranchManager') {
    if (user.branchId) {
      query.$or = [{ pickupBranchId: user.branchId }, { returnBranchId: user.branchId }];
    }
  }

  if (statusFilter) {
    query.status = statusFilter;
  }

  return Booking.find(query)
    .populate('vehicleId', 'vehicleModel brand licensePlate dailyPrice images odometer status fuelType transmissionType')
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
    .populate('vehicleId', 'vehicleModel brand licensePlate dailyPrice images odometer status fuelType transmissionType')
    .populate('userId', 'firstName lastName username phoneNumber email avatarUrl identityStatus')
    .populate('pickupBranchId', 'name code address phone hours_open hours_close')
    .populate('returnBranchId', 'name code address phone hours_open hours_close');

  if (!booking) {
    throw new AppError(404, `Không tìm thấy đơn đặt xe với mã: ${cleanCode}`);
  }

  // Authorization check
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
  const booking = await Booking.findById(id)
    .populate('vehicleId', 'vehicleModel brand licensePlate dailyPrice images odometer status fuelType transmissionType')
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
 * Check-in handover workflow at counter
 */
export const checkinBooking = async (
  bookingId: string,
  staffUser: IUser,
  input: CheckinDto
): Promise<IBooking> => {
  const booking = await Booking.findById(bookingId).populate('vehicleId');
  if (!booking) {
    throw new AppError(404, 'Không tìm thấy đơn đặt xe.');
  }

  // Permitted statuses for checkin: Confirmed (or Pending if customer pays at counter)
  if (booking.status !== 'Confirmed' && booking.status !== 'Approved' && booking.status !== 'Pending') {
    throw new AppError(
      409,
      `Không thể thực hiện Check-in với trạng thái đơn hiện tại: "${booking.status}". Đơn cần ở trạng thái Được duyệt hoặc Đã xác nhận.`
    );
  }

  // Verify branch ownership for staff/manager
  if (staffUser.roles === 'Staff' || staffUser.roles === 'BranchManager') {
    if (staffUser.branchId && booking.pickupBranchId.toString() !== staffUser.branchId.toString()) {
      throw new AppError(403, 'Nhân viên chỉ được thực hiện Check-in tại chi nhánh nhận xe của đơn.');
    }
  }

  const vehicle = await Vehicle.findById(booking.vehicleId);
  if (!vehicle) {
    throw new AppError(404, 'Phương tiện liên quan không tồn tại.');
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

  return booking;
};

/**
 * Check-out return and settlement workflow at counter
 */
export const checkoutBooking = async (
  bookingId: string,
  staffUser: IUser,
  input: CheckoutDto
): Promise<IBooking> => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError(404, 'Không tìm thấy đơn đặt xe.');
  }

  if (booking.status !== 'Ongoing') {
    throw new AppError(409, `Không thể Check-out đơn xe chưa ở trạng thái "Ongoing" (Đang lưu hành). Trạng thái hiện tại: "${booking.status}".`);
  }

  // Verify branch ownership
  if (staffUser.roles === 'Staff' || staffUser.roles === 'BranchManager') {
    if (staffUser.branchId && booking.returnBranchId.toString() !== staffUser.branchId.toString()) {
      throw new AppError(403, 'Nhân viên chỉ được thực hiện Check-out tại chi nhánh trả xe đã chỉ định.');
    }
  }

  if (input.endOdometer < booking.startOdometer) {
    throw new AppError(
      400,
      `Chỉ số ODO lúc trả (${input.endOdometer}) không thể nhỏ hơn ODO lúc nhận (${booking.startOdometer}).`
    );
  }

  const now = new Date();
  let lateHours = 0;
  if (now > booking.returnDateTime) {
    lateHours = Math.ceil((now.getTime() - booking.returnDateTime.getTime()) / (1000 * 3600));
  }

  const lateFee = Math.max(0, lateHours * 30000); // 30,000 đ per overdue hour
  const damageFee = Math.max(0, input.damageFee || 0);

  booking.actualReturnDateTime = now;
  booking.endOdometer = input.endOdometer;
  if (input.endFuelLevel) booking.endFuelLevel = input.endFuelLevel;
  if (input.checkoutImages) booking.checkoutImages = input.checkoutImages;
  booking.lateFee = lateFee;
  booking.damageFee = damageFee;
  booking.status = 'Completed';
  booking.isPaid = true;

  // Award loyalty points: 1 point per 10,000 VND
  const pointsEarned = Math.floor(booking.totalAmount / 10000);
  booking.loyaltyPointsEarned = pointsEarned;
  await booking.save();

  // Update customer loyalty points
  await User.findByIdAndUpdate(booking.userId, { $inc: { loyaltyPoints: pointsEarned } });

  // Update Vehicle: move to return branch, update ODO, set Available
  const vehicle = await Vehicle.findById(booking.vehicleId);
  if (vehicle) {
    vehicle.branchId = booking.returnBranchId;
    vehicle.odometer = input.endOdometer;
    vehicle.status = 'Available';

    // Flag maintenance if recommended interval reached
    if (vehicle.odometer >= 1500 && vehicle.odometer % 1500 <= 100) {
      vehicle.requiresMaintenance = true;
    }
    await vehicle.save();
  }

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

  return booking;
};
