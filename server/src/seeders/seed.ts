import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import {
  Branch,
  User,
  Category,
  Vehicle,
  Booking,
  VehicleTransfer,
  MaintenanceLog,
  StaffSchedule,
  Complaint,
  AuditLog,
  Discount,
  Feedback,
  Notification,
  BookingReminder,
  Conversation,
  Message,
  Banner,
  StaticPage,
} from '../models';
import { VEHICLE_CATALOG_34 } from './vehicleCatalogData';
import { SeasonalPricingRule } from '../models/SeasonalPricingRule';

const seedDatabase = async (): Promise<void> => {
  const isForce = process.argv.includes('--force');

  // Safety guardrail: Reject execution on production unless explicitly forced
  if (process.env.NODE_ENV === 'production' && !isForce) {
    console.error('[SECURITY ERROR] Seeder execution blocked on production environment without --force flag.');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/motorent_db';
  console.log(`[SEED] Connecting to MongoDB: ${uri}...`);
  await mongoose.connect(uri);

  console.log('[SEED] Cleaning existing collections for idempotent bootstrap...');
  await Promise.all([
    Branch.deleteMany({}),
    User.deleteMany({ email: { $nin: ['ht20041975@gmail.com', 'ht20041975@outlook.com.vn'] } }),
    Category.deleteMany({}),
    Vehicle.deleteMany({}),
    SeasonalPricingRule.deleteMany({}),
    Booking.deleteMany({}),
    VehicleTransfer.deleteMany({}),
    MaintenanceLog.deleteMany({}),
    StaffSchedule.deleteMany({}),
    Complaint.deleteMany({}),
    AuditLog.deleteMany({}),
    Discount.deleteMany({}),
    Feedback.deleteMany({}),
    Notification.deleteMany({}),
    BookingReminder.deleteMany({}),
    Conversation.deleteMany({}),
    Message.deleteMany({}),
    Banner.deleteMany({}),
    StaticPage.deleteMany({}),
  ]);

  // Passwords
  const adminRawPass = process.env.SEED_ADMIN_PASSWORD || 'Admin@123456';
  const managerRawPass = process.env.SEED_MANAGER_PASSWORD || 'Manager@123456';
  const staffRawPass = process.env.SEED_STAFF_PASSWORD || 'Staff@123456';
  const customerRawPass = process.env.SEED_CUSTOMER_PASSWORD || 'Customer@123456';

  const salt = await bcrypt.genSalt(10);
  const adminPass = await bcrypt.hash(adminRawPass, salt);
  const managerPass = await bcrypt.hash(managerRawPass, salt);
  const staffPass = await bcrypt.hash(staffRawPass, salt);
  const customerPass = await bcrypt.hash(customerRawPass, salt);

  // 1. Seed 5 Categories (S1 Spec: exactly 5 categories)
  console.log('[SEED] Creating 5 standard vehicle categories...');
  const catScooter = await Category.create({
    name: 'Xe tay ga',
    slug: 'xe-tay-ga',
    description: 'Dòng xe êm ái, cốp rộng, dễ điều khiển trong đô thị.',
  });
  const catManual = await Category.create({
    name: 'Xe số',
    slug: 'xe-so',
    description: 'Tiết kiệm xăng tối đa, linh hoạt, leo dốc tốt.',
  });
  const catClutch = await Category.create({
    name: 'Xe côn tay',
    slug: 'xe-con-tay',
    description: 'Động cơ mạnh mẽ, thể thao, thích hợp đi phượt tour xa.',
  });
  const cat50cc = await Category.create({
    name: 'Xe 50cc (Không cần bằng lái)',
    slug: 'xe-50cc',
    description: 'Dành cho học sinh, sinh viên hoặc khách chưa có bằng lái A1, nhỏ gọn an toàn.',
  });
  const catElectric = await Category.create({
    name: 'Xe máy điện',
    slug: 'xe-dien',
    description: 'Thân thiện môi trường, vận hành êm ái, sạc tiện lợi.',
  });

  // 2. Seed 3 Branches (S1 Spec: Hải Châu, Mỹ Khê, plus Sơn Trà)
  console.log('[SEED] Creating 3 branches (Hai Chau, My Khe, Son Tra)...');
  const branchDAD = await Branch.create({
    name: 'Chi nhánh Sân Bay Quốc Tế Đà Nẵng (Hải Châu)',
    code: 'CN-DAD',
    address: 'Cổng Ga Quốc Tế, Đường Duy Tân, Phường Hòa Thuận Tây, Quận Hải Châu, TP. Đà Nẵng',
    phone: '0236.3822.101',
    email: 'danang.airport@motorent.vn',
    location_lng: 108.2022,
    location_lat: 16.0538,
    hours_open: '06:00',
    hours_close: '23:00',
    isActive: true,
    description: 'Cơ sở tại cửa ngõ Sân bay Quốc tế Đà Nẵng, giao nhận xe siêu tốc trong 2 phút khi vừa hạ cánh.',
  });

  const branchMK = await Branch.create({
    name: 'Chi nhánh Bãi Biển Mỹ Khê',
    code: 'CN-MK',
    address: '28 Võ Nguyên Giáp, Phường Phước Mỹ, Quận Sơn Trà, TP. Đà Nẵng',
    phone: '0236.3822.202',
    email: 'mykhe.beach@motorent.vn',
    location_lng: 108.2472,
    location_lat: 16.0614,
    hours_open: '07:00',
    hours_close: '22:30',
    isActive: true,
    description: 'Nằm sát bãi biển Mỹ Khê, thuận tiện di chuyển tắm biển và khám phá cung đường ven biển.',
  });

  const branchST = await Branch.create({
    name: 'Chi nhánh Bán Đảo Sơn Trà',
    code: 'CN-ST',
    address: 'Đường Hoàng Sa, Phường Thọ Quang, Quận Sơn Trà, TP. Đà Nẵng',
    phone: '0236.3822.303',
    email: 'sontra.peninsula@motorent.vn',
    location_lng: 108.2755,
    location_lat: 16.1042,
    hours_open: '06:30',
    hours_close: '21:00',
    isActive: true,
    description: 'Cửa ngõ cung đường phượt Bán đảo Sơn Trà, Chùa Linh Ứng và Đỉnh Bàn Cờ.',
  });

  // 3. Seed 10 Users (S1 Spec: 1 Admin, 3 Managers, 2 Staff, 4 Customers)
  console.log('[SEED] Creating 10 standard RBAC users...');
  const userAdmin = await User.create({
    username: 'admin',
    email: 'admin@motorent.vn',
    passwordHash: adminPass,
    firstName: 'Quản trị',
    lastName: 'Hệ Thống',
    phoneNumber: '0901888999',
    roles: 'SystemAdmin',
    status: 'Active',
    identityStatus: 'Verified',
    tokenVersion: 0,
    isEmailVerified: true,
  });

  const userManagerDAD = await User.create({
    username: 'manager_dad',
    email: 'manager.dad@motorent.vn',
    passwordHash: managerPass,
    firstName: 'Lê Hoàng',
    lastName: 'Quản Lý Sân Bay',
    phoneNumber: '0903333444',
    roles: 'BranchManager',
    status: 'Active',
    branchId: branchDAD._id,
    identityStatus: 'Verified',
    tokenVersion: 0,
    isEmailVerified: true,
  });

  const userManagerMK = await User.create({
    username: 'manager_mk',
    email: 'manager.mk@motorent.vn',
    passwordHash: managerPass,
    firstName: 'Trần Văn',
    lastName: 'Quản Lý Mỹ Khê',
    phoneNumber: '0902111222',
    roles: 'BranchManager',
    status: 'Active',
    branchId: branchMK._id,
    identityStatus: 'Verified',
    tokenVersion: 0,
    isEmailVerified: true,
  });

  const userManagerST = await User.create({
    username: 'manager_st',
    email: 'manager.st@motorent.vn',
    passwordHash: managerPass,
    firstName: 'Phạm Đức',
    lastName: 'Quản Lý Sơn Trà',
    phoneNumber: '0904555666',
    roles: 'BranchManager',
    status: 'Active',
    branchId: branchST._id,
    identityStatus: 'Verified',
    tokenVersion: 0,
    isEmailVerified: true,
  });

  // Assign managers to branches
  branchDAD.managerId = userManagerDAD._id as mongoose.Types.ObjectId;
  await branchDAD.save();
  branchMK.managerId = userManagerMK._id as mongoose.Types.ObjectId;
  await branchMK.save();
  branchST.managerId = userManagerST._id as mongoose.Types.ObjectId;
  await branchST.save();

  const userStaffDAD = await User.create({
    username: 'staff_dad',
    email: 'staff.dad@motorent.vn',
    passwordHash: staffPass,
    firstName: 'Nguyễn Thành',
    lastName: 'Nhân Viên Sân Bay',
    phoneNumber: '0918111222',
    roles: 'Staff',
    status: 'Active',
    branchId: branchDAD._id,
    identityStatus: 'Verified',
    tokenVersion: 0,
    isEmailVerified: true,
  });

  const userStaffMK = await User.create({
    username: 'staff_mk',
    email: 'staff.mk@motorent.vn',
    passwordHash: staffPass,
    firstName: 'Đặng Minh',
    lastName: 'Nhân Viên Mỹ Khê',
    phoneNumber: '0919333444',
    roles: 'Staff',
    status: 'Active',
    branchId: branchMK._id,
    identityStatus: 'Verified',
    tokenVersion: 0,
    isEmailVerified: true,
  });

  const userCustomer1 = await User.create({
    username: 'customer_hoang',
    email: 'hoang.nguyen@gmail.com',
    passwordHash: customerPass,
    firstName: 'Huy Hoàng',
    lastName: 'Nguyễn',
    phoneNumber: '0988123456',
    roles: 'Customer',
    status: 'Active',
    identityStatus: 'Verified',
    loyaltyPoints: 120,
    tokenVersion: 0,
    isEmailVerified: true,
  });

  const userCustomer2 = await User.create({
    username: 'customer_linh',
    email: 'linh.tran@gmail.com',
    passwordHash: customerPass,
    firstName: 'Thùy Linh',
    lastName: 'Trần',
    phoneNumber: '0988654321',
    roles: 'Customer',
    status: 'Active',
    identityStatus: 'Verified',
    loyaltyPoints: 80,
    tokenVersion: 0,
    isEmailVerified: true,
  });

  const userCustomer3 = await User.create({
    username: 'customer_tuan',
    email: 'tuan.le@gmail.com',
    passwordHash: customerPass,
    firstName: 'Quốc Tuấn',
    lastName: 'Lê',
    phoneNumber: '0977112233',
    roles: 'Customer',
    status: 'Active',
    identityStatus: 'Verified',
    loyaltyPoints: 50,
    tokenVersion: 0,
    isEmailVerified: true,
  });

  const userCustomer4 = await User.create({
    username: 'customer_mai',
    email: 'mai.phuong@gmail.com',
    passwordHash: customerPass,
    firstName: 'Phương Mai',
    lastName: 'Đỗ',
    phoneNumber: '0977889900',
    roles: 'Customer',
    status: 'Active',
    identityStatus: 'Verified',
    loyaltyPoints: 0,
    tokenVersion: 0,
    isEmailVerified: true,
  });

  // Preserve real customer account if present
  await User.findOneAndUpdate(
    { email: 'ht20041975@gmail.com' },
    {
      $setOnInsert: {
        username: 'ht20041975',
        email: 'ht20041975@gmail.com',
        firstName: 'Hoàng',
        lastName: 'Nguyễn',
        phoneNumber: '0905123456',
        roles: 'Customer',
        status: 'Active',
        isEmailVerified: true,
        passwordHash: customerPass,
      },
      $set: {
        avatarUrl: '/uploads/avatar-1791966576733-300583633.png',
        identityStatus: 'Pending',
        idCardFrontFile: 'idCardFront-1791970550085-630193774.png',
        idCardBackFile: 'idCardBack-1791970550092-14746793.png',
        drivingLicenseFile: 'drivingLicense-1791970550094-268328059.png',
        idCardFrontUrl: '/api/auth/ekyc/document/me/idCardFront',
        idCardBackUrl: '/api/auth/ekyc/document/me/idCardBack',
        drivingLicenseUrl: '/api/auth/ekyc/document/me/drivingLicense',
        ekycConsentAgreed: true,
        ekycConsentDate: new Date('2026-10-14T16:35:50'),
        ekycWatermarked: true,
      },
    },
    { upsert: true, new: true }
  );

  // 4. Seed 20 Vehicles (S1 Spec: exactly 20 vehicles across 5 categories and 3 branches)
  console.log('[SEED] Creating 20 authentic vehicles across 5 categories...');
  const categoryMap: Record<string, mongoose.Types.ObjectId> = {
    'xe-tay-ga': catScooter._id as mongoose.Types.ObjectId,
    'xe-so': catManual._id as mongoose.Types.ObjectId,
    'xe-con-tay': catClutch._id as mongoose.Types.ObjectId,
    'xe-50cc': cat50cc._id as mongoose.Types.ObjectId,
    'xe-dien': catElectric._id as mongoose.Types.ObjectId,
  };

  const branches = [branchDAD, branchMK, branchST];

  const platePrefixes: Record<string, string> = {
    'xe-tay-ga': '43-B1',
    'xe-50cc': '43-AB',
    'xe-so': '43-C1',
    'xe-con-tay': '43-H1',
    'xe-dien': '43-MD1',
  };

  // Filter 20 items matching our 5 categories
  const targetVehicles = VEHICLE_CATALOG_34.filter((item) =>
    ['xe-tay-ga', 'xe-so', 'xe-con-tay', 'xe-50cc', 'xe-dien'].includes(item.categorySlug)
  ).slice(0, 20);

  const vehiclesData = targetVehicles.map((item, index) => {
    const branch = branches[index % branches.length];
    const prefix = platePrefixes[item.categorySlug] || '43-B1';
    const numPart = String(100 + index * 23).padStart(3, '0');
    const subPart = String(11 + index * 7).padStart(2, '0');
    const plate = `${prefix} ${numPart}.${subPart}`;

    return {
      branchId: branch._id,
      category: categoryMap[item.categorySlug] || catScooter._id,
      vehicleModel: item.vehicleModel,
      brand: item.brand,
      licensePlate: plate,
      odometer: 1500 + index * 280,
      // Demo vehicles start serviced at their seeded ODO. Later threshold
      // crossings are detected normally by checkout and the ODO sweep.
      lastMaintenanceBucket: Math.floor((1500 + index * 280) / 1500),
      dailyPrice: item.dailyPrice,
      hourlyPrice: item.hourlyPrice,
      status: 'Available' as const,
      transmissionType: item.transmissionType,
      fuelType: item.fuelType,
      yearManufactured: 2024,
      color: item.color,
      requiresMaintenance: false,
      images: item.images,
    };
  });

  const vehicles = await Vehicle.create(vehiclesData);

  // 5. Seed Discounts
  console.log('[SEED] Creating standard discount codes...');
  await Discount.create([
    {
      code: 'CHAOBANMOI',
      description: 'Giảm 10% (tối đa 20.000đ) cho khách hàng thuê lần đầu tiên tại Đà Nẵng',
      discountPercent: 10,
      minBookingAmount: 150000,
      maxDiscountAmount: 20000,
      usageLimit: 500,
      usedCount: 12,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      isActive: true,
    },
    {
      code: 'DANANGVIP',
      description: 'Giảm 15% cho đơn thuê xe từ 3 ngày trở lên',
      discountPercent: 15,
      minBookingAmount: 400000,
      maxDiscountAmount: 100000,
      usageLimit: 200,
      usedCount: 25,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      isActive: true,
    },
  ]);

  // 6. Seed Sample Bookings
  console.log('[SEED] Creating sample bookings...');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfterTomorrow = new Date();
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 3);

  await Booking.create({
    bookingCode: 'MV-100201',
    userId: userCustomer1._id,
    vehicleId: vehicles[0]._id,
    pickupBranchId: branchDAD._id,
    returnBranchId: branchMK._id,
    pickupDateTime: tomorrow,
    returnDateTime: dayAfterTomorrow,
    totalAmount: 300000,
    depositAmount: 90000,
    remainingAmount: 210000,
    paymentMethod: 'Banking',
    isPaid: false,
    status: 'Confirmed',
    startOdometer: vehicles[0].odometer,
  });

  const ongoingStartDate = new Date();
  ongoingStartDate.setDate(ongoingStartDate.getDate() - 1);
  const ongoingEndDate = new Date();
  ongoingEndDate.setDate(ongoingEndDate.getDate() + 1);

  await Booking.create({
    bookingCode: 'MV-100202',
    userId: userCustomer2._id,
    vehicleId: vehicles[1]._id,
    pickupBranchId: branchDAD._id,
    returnBranchId: branchDAD._id,
    pickupDateTime: ongoingStartDate,
    returnDateTime: ongoingEndDate,
    totalAmount: 400000,
    depositAmount: 120000,
    remainingAmount: 280000,
    paymentMethod: 'Banking',
    isPaid: false,
    status: 'Ongoing',
    startOdometer: 5120,
    eSignatureUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40"><text x="10" y="25" fill="%23047857" font-family="serif" font-size="16">Linh Tran</text></svg>',
  });
  vehicles[1].status = 'Rented';
  await vehicles[1].save();

  // 7. Seed Static Pages & Banners
  await StaticPage.create([
    {
      slug: 'dieu-khoan-dich-vu',
      isPublished: true,
      title: 'Điều Khoản Dịch Vụ Thuê Xe Motorent',
      content: 'Chính sách thuê xe tự lái minh bạch: Khách hàng cần xuất trình GPLX và CCCD hợp lệ để đối chiếu eKYC. Motorent cam kết không giữ bản gốc giấy tờ tùy thân của khách.',
      lastUpdatedBy: userAdmin._id,
    },
    {
      slug: 'chinh-sach-bao-mat',
      title: 'Chính Sách Bảo Mật Thông Tin Khách Hàng',
      content: 'Mọi dữ liệu cá nhân, ảnh chụp giấy tờ CCCD/GPLX đều được mã hóa lưu trữ theo tiêu chuẩn bảo mật cao cấp.',
      lastUpdatedBy: userAdmin._id,
    },
  ]);

  await Banner.create([
    {
      title: 'Khám Phá Đà Nẵng Trọn Vẹn Cùng Motorent',
      subtitle: 'Nhận xe Sân Bay - Trả xe Biển Mỹ Khê phụ phí 0đ',
      imageUrl: 'https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643917/bikes/1_1.jpg.png',
      linkUrl: '/bikes',
      order: 1,
      isActive: true,
    },
    {
      title: 'Ưu Đãi Chào Bạn Mới Giảm 20.000đ',
      subtitle: 'Nhập mã CHAOBANMOI khi thanh toán cọc trực tuyến',
      imageUrl: 'https://res.cloudinary.com/dsxbuk4pe/image/upload/f_auto,q_auto/v1780643840/bikes/1_3.jpg.png',
      linkUrl: '/bikes',
      order: 2,
      isActive: true,
    },
  ]);

  // S1 Acceptance Criteria Summary Table
  const [branchCount, categoryCount, userCount, vehicleCount] = await Promise.all([
    Branch.countDocuments(),
    Category.countDocuments(),
    User.countDocuments({ email: { $nin: ['ht20041975@gmail.com', 'ht20041975@outlook.com.vn'] } }),
    Vehicle.countDocuments(),
  ]);

  console.log('\n[SUMMARY TABLE] S1 Seed Acceptance Criteria Verification:');
  console.table([
    { Entity: 'Branches', Required: 3, Actual: branchCount, Status: branchCount === 3 ? 'PASS' : 'FAIL' },
    { Entity: 'Users', Required: 10, Actual: userCount, Status: userCount === 10 ? 'PASS' : 'FAIL' },
    { Entity: 'Categories', Required: 5, Actual: categoryCount, Status: categoryCount === 5 ? 'PASS' : 'FAIL' },
    { Entity: 'Vehicles', Required: 20, Actual: vehicleCount, Status: vehicleCount === 20 ? 'PASS' : 'FAIL' },
  ]);

  console.log('[SEED] Seed database completed successfully.');
  await mongoose.disconnect();
};

seedDatabase().catch((err) => {
  console.error('[SEED ERROR] Fatal error during seed execution:', err);
  process.exit(1);
});
