import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { Branch, Booking, Category, Payment, User, Vehicle } from '../models';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DEMO_BOOKING_CODE = 'MTR-FLOW06-DEMO';
const DEMO_VEHICLE_PLATE = '43-F06-001';
const COMPLAINT_BOOKING_CODE = 'MTR-FLOW06-CLAIM';
const COMPLAINT_VEHICLE_PLATE = '43-F06-002';
const LOCAL_DATABASE_NAME = 'motorent_db';

const assertSafeLocalDatabase = (uri: string): void => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Từ chối chạy seed Luồng 6 khi NODE_ENV=production.');
  }

  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error('MONGODB_URI không hợp lệ; seed chỉ chạy với MongoDB local.');
  }

  const allowedHosts = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (
    parsed.protocol !== 'mongodb:' ||
    !allowedHosts.has(parsed.hostname) ||
    databaseName !== LOCAL_DATABASE_NAME
  ) {
    throw new Error(`Từ chối ghi dữ liệu: chỉ chấp nhận MongoDB local và database ${LOCAL_DATABASE_NAME}.`);
  }
};

const setPaymentFixture = async (
  bookingId: mongoose.Types.ObjectId,
  txnRef: string,
  amount: number,
  type: 'DEPOSIT' | 'COUNTER'
): Promise<void> => {
  const existing = await Payment.findOne({ txnRef });
  if (existing && String(existing.bookingId) !== String(bookingId)) {
    throw new Error(`Mã giao dịch demo ${txnRef} đã thuộc về đơn khác; dừng để tránh sửa dữ liệu thật.`);
  }

  if (existing) {
    existing.amount = amount;
    existing.type = type;
    existing.status = 'SUCCESS';
    await existing.save();
    return;
  }

  await Payment.create({ bookingId, txnRef, amount, type, status: 'SUCCESS' });
};

const seedFlow06Sample = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/motorent_db';
  assertSafeLocalDatabase(uri);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });

  const customer = await User.findOne({ username: 'customer_hoang', roles: 'Customer' });
  const branch = await Branch.findOne({ code: 'CN-DAD', isActive: true });
  const category = await Category.findOne({ slug: 'xe-tay-ga' });
  const staff = await User.findOne({ username: 'staff_dad', roles: 'Staff' });

  if (!customer || !branch || !category) {
    throw new Error('Thiếu dữ liệu nền: cần customer_hoang, chi nhánh CN-DAD đang hoạt động và loại xe xe-tay-ga. Hãy seed dữ liệu chuẩn trước.');
  }

  let vehicle = await Vehicle.findOne({ licensePlate: DEMO_VEHICLE_PLATE });
  if (vehicle) {
    const isFixture =
      vehicle.vehicleModel === 'Flow 06 Demo Scooter' &&
      vehicle.brand === 'MOTORENT DEMO' &&
      String(vehicle.branchId) === String(branch._id);
    if (!isFixture) {
      throw new Error(`Biển số ${DEMO_VEHICLE_PLATE} đã được dùng bởi xe không phải dữ liệu demo; dừng để tránh sửa dữ liệu thật.`);
    }
    vehicle.status = 'Available';
    vehicle.isDeleted = false;
    await vehicle.save();
  } else {
    vehicle = await Vehicle.create({
      branchId: branch._id,
      category: category._id,
      vehicleModel: 'Flow 06 Demo Scooter',
      brand: 'MOTORENT DEMO',
      licensePlate: DEMO_VEHICLE_PLATE,
      odometer: 12400,
      dailyPrice: 180000,
      hourlyPrice: 25000,
      status: 'Available',
      transmissionType: 'Automatic',
      fuelType: 'Gasoline',
      yearManufactured: 2024,
      color: 'Đen',
      requiresMaintenance: false,
      lastMaintenanceBucket: 8,
      isDeleted: false,
      images: [],
      averageRating: 0,
      reviewCount: 0,
    });
  }

  const now = new Date();
  const actualReturnDateTime = new Date(now);
  actualReturnDateTime.setDate(actualReturnDateTime.getDate() - 1);
  actualReturnDateTime.setHours(9, 0, 0, 0);
  const pickupDateTime = new Date(actualReturnDateTime);
  pickupDateTime.setDate(pickupDateTime.getDate() - 3);
  pickupDateTime.setHours(9, 0, 0, 0);
  const returnDateTime = new Date(actualReturnDateTime);
  returnDateTime.setDate(returnDateTime.getDate() - 1);
  returnDateTime.setHours(9, 0, 0, 0);

  const totalAmount = 360000;
  const depositAmount = Math.round(totalAmount * 0.3);
  const bookingFields = {
    userId: customer._id,
    vehicleId: vehicle._id,
    pickupBranchId: branch._id,
    returnBranchId: branch._id,
    pickupDateTime,
    returnDateTime,
    actualReturnDateTime,
    totalAmount,
    baseRentalAmount: totalAmount,
    seasonalSurcharge: 0,
    depositAmount,
    remainingAmount: 0,
    discountAmount: 0,
    lateFee: 0,
    damageFee: 0,
    loyaltyPointsEarned: Math.floor(totalAmount / 10000),
    status: 'Completed' as const,
    paymentMethod: 'Banking' as const,
    isPaid: true,
    depositPaid: true,
    paidAmount: totalAmount,
    lastTxnRef: 'FLOW06-DEMO-SETTLEMENT',
    settlementAmount: totalAmount - depositAmount,
    paymentType: 'Deposit30' as const,
    startOdometer: 12400,
    endOdometer: 12620,
    startFuelLevel: '100%',
    endFuelLevel: '80%',
    checkinImages: [],
    checkoutImages: [],
    checkinAt: pickupDateTime,
    ...(staff ? { checkinBy: staff._id, checkoutBy: staff._id } : {}),
    checkinChecklist: {
      identityVerified: true,
      vehicleConditionConfirmed: true,
      fuelLevelRecorded: true,
      odometerRecorded: true,
      contractSigned: true,
    },
    receiverName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
    receiverPhone: customer.phoneNumber || '',
    verifiedAtCounter: true,
    checkoutAt: actualReturnDateTime,
    returnNotes: 'Đơn demo Luồng 6: đã hoàn tất nhận và trả xe.',
    refundAmount: 0,
    refundStatus: 'None' as const,
    extensionCount: 0,
  };

  let booking = await Booking.findOne({ bookingCode: DEMO_BOOKING_CODE });
  if (booking) {
    const isFixture =
      String(booking.userId) === String(customer._id) &&
      String(booking.vehicleId) === String(vehicle._id);
    if (!isFixture) {
      throw new Error(`Mã đơn ${DEMO_BOOKING_CODE} đã thuộc về đơn khác; dừng để tránh sửa dữ liệu thật.`);
    }
    booking.set(bookingFields);
    await booking.save();
  } else {
    booking = await Booking.create({ bookingCode: DEMO_BOOKING_CODE, ...bookingFields });
  }

  await setPaymentFixture(booking._id, 'FLOW06-DEMO-DEPOSIT', depositAmount, 'DEPOSIT');
  await setPaymentFixture(booking._id, 'FLOW06-DEMO-SETTLEMENT', totalAmount - depositAmount, 'COUNTER');

  const ledgerRows = await Payment.find({ bookingId: booking._id, status: 'SUCCESS' });
  const recordedCashIn = ledgerRows.reduce(
    (sum, payment) => sum + (payment.type === 'REFUND' ? 0 : payment.amount),
    0
  );
  if (recordedCashIn !== totalAmount) {
    throw new Error(`Dữ liệu demo chưa đối soát: sổ giao dịch ghi ${recordedCashIn}, đơn ghi ${totalAmount}.`);
  }

  let complaintVehicle = await Vehicle.findOne({ licensePlate: COMPLAINT_VEHICLE_PLATE });
  if (complaintVehicle) {
    const isFixture =
      complaintVehicle.vehicleModel === 'Flow 06 Complaint Scooter' &&
      complaintVehicle.brand === 'MOTORENT DEMO' &&
      String(complaintVehicle.branchId) === String(branch._id);
    if (!isFixture) {
      throw new Error(`Biển số ${COMPLAINT_VEHICLE_PLATE} đã được dùng bởi xe không phải dữ liệu demo; dừng để tránh sửa dữ liệu thật.`);
    }
    complaintVehicle.status = 'Available';
    complaintVehicle.isDeleted = false;
    await complaintVehicle.save();
  } else {
    complaintVehicle = await Vehicle.create({
      branchId: branch._id,
      category: category._id,
      vehicleModel: 'Flow 06 Complaint Scooter',
      brand: 'MOTORENT DEMO',
      licensePlate: COMPLAINT_VEHICLE_PLATE,
      odometer: 20100,
      dailyPrice: 180000,
      hourlyPrice: 25000,
      status: 'Available',
      transmissionType: 'Automatic',
      fuelType: 'Gasoline',
      yearManufactured: 2024,
      color: 'Trắng',
      requiresMaintenance: false,
      lastMaintenanceBucket: 13,
      isDeleted: false,
      images: [],
      averageRating: 0,
      reviewCount: 0,
    });
  }

  const complaintBookingFields = {
    ...bookingFields,
    vehicleId: complaintVehicle._id,
    lastTxnRef: 'FLOW06-CLAIM-SETTLEMENT',
    returnNotes: 'Đơn demo Luồng 6 dành riêng để thử quy trình khiếu nại.',
  };
  let complaintBooking = await Booking.findOne({ bookingCode: COMPLAINT_BOOKING_CODE });
  if (complaintBooking) {
    const isFixture =
      String(complaintBooking.userId) === String(customer._id) &&
      String(complaintBooking.vehicleId) === String(complaintVehicle._id);
    if (!isFixture) {
      throw new Error(`Mã đơn ${COMPLAINT_BOOKING_CODE} đã thuộc về đơn khác; dừng để tránh sửa dữ liệu thật.`);
    }
    complaintBooking.set(complaintBookingFields);
    await complaintBooking.save();
  } else {
    complaintBooking = await Booking.create({ bookingCode: COMPLAINT_BOOKING_CODE, ...complaintBookingFields });
  }

  await setPaymentFixture(complaintBooking._id, 'FLOW06-CLAIM-DEPOSIT', depositAmount, 'DEPOSIT');
  await setPaymentFixture(
    complaintBooking._id,
    'FLOW06-CLAIM-SETTLEMENT',
    totalAmount - depositAmount,
    'COUNTER'
  );
  const complaintLedgerRows = await Payment.find({ bookingId: complaintBooking._id, status: 'SUCCESS' });
  const complaintRecordedCashIn = complaintLedgerRows.reduce(
    (sum, payment) => sum + (payment.type === 'REFUND' ? 0 : payment.amount),
    0
  );
  if (complaintRecordedCashIn !== totalAmount) {
    throw new Error(`Đơn khiếu nại demo chưa đối soát: sổ giao dịch ghi ${complaintRecordedCashIn}, đơn ghi ${totalAmount}.`);
  }

  console.log(`Luồng 6 sample đã sẵn sàng: ${DEMO_BOOKING_CODE} — Completed, ${totalAmount.toLocaleString('vi-VN')} đ.`);
  console.log(`Luồng 6 sample đã sẵn sàng: ${COMPLAINT_BOOKING_CODE} — Completed, ${totalAmount.toLocaleString('vi-VN')} đ.`);
  console.log(`Đã đối soát sổ giao dịch cho 2 đơn: tiền vào ${(recordedCashIn + complaintRecordedCashIn).toLocaleString('vi-VN')} đ; tiền hoàn ra 0 đ.`);
  console.log(`Khách test: ${customer.username}; chi nhánh: ${branch.code}.`);
  console.log(`Xe đánh giá: ${DEMO_VEHICLE_PLATE} (/bikes/${vehicle._id}); xe khiếu nại: ${COMPLAINT_VEHICLE_PLATE} (/bikes/${complaintVehicle._id}).`);
};

seedFlow06Sample()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[FLOW 06 SEED ERROR] ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
