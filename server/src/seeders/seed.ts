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
  Payment,
  Review,
  Wishlist,
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
    Payment.deleteMany({}),
    Review.deleteMany({}),
    Wishlist.deleteMany({}),
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
  // Reset loyaltyPoints to 0 for preserved real accounts since all historical bookings were cleared
  await User.updateMany({}, { $set: { loyaltyPoints: 0 } });

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
    loyaltyPoints: 0,
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
    loyaltyPoints: 0,
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
    loyaltyPoints: 0,
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

  void [userStaffDAD, userStaffMK, userCustomer1, userCustomer2, userCustomer3, userCustomer4];

  // 4. Seed 20 Vehicles (S1 Spec: exactly 20 vehicles balanced across all 5 categories and 3 branches)
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

  // Select 20 vehicles balanced across all 5 categories (6 + 4 + 4 + 3 + 3 = 20)
  const targetVehicles = [
    ...VEHICLE_CATALOG_34.filter((item) => item.categorySlug === 'xe-tay-ga').slice(0, 6),
    ...VEHICLE_CATALOG_34.filter((item) => item.categorySlug === 'xe-so').slice(0, 4),
    ...VEHICLE_CATALOG_34.filter((item) => item.categorySlug === 'xe-con-tay').slice(0, 4),
    ...VEHICLE_CATALOG_34.filter((item) => item.categorySlug === 'xe-50cc').slice(0, 3),
    ...VEHICLE_CATALOG_34.filter((item) => item.categorySlug === 'xe-dien').slice(0, 3),
  ];

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
      odometer: 0,
      lastMaintenanceBucket: 0,
      dailyPrice: item.dailyPrice,
      hourlyPrice: item.hourlyPrice,
      status: 'Available' as const,
      transmissionType: item.transmissionType,
      fuelType: item.fuelType,
      yearManufactured: 2024,
      color: item.color,
      requiresMaintenance: false,
      averageRating: 0,
      reviewCount: 0,
      images: item.images,
    };
  });

  await Vehicle.create(vehiclesData);

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
      usedCount: 0,
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
      usedCount: 0,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      isActive: true,
    },
  ]);

  // 6. Seed Static Pages & Banners
  await StaticPage.create([
    {
      slug: 'faq',
      title: 'Câu Hỏi Thường Gặp (FAQ)',
      type: 'FAQ',
      isPublished: true,
      content: [
        '<h2>1. Thủ tục nhận xe tại Sân bay Quốc tế Đà Nẵng diễn ra thế nào?</h2><p>Khách hàng xuất trình CCCD/Hộ chiếu và Giấy phép lái xe hợp lệ (A1/A2) để đối chiếu eKYC trực tuyến. Motorent cam kết <strong>không giữ giấy tờ tùy thân gốc</strong> của khách hàng, ký biên bản bàn giao điện tử kèm 02 mũ bảo hiểm đạt chuẩn.</p>',
        '<h2>2. Chính sách đặt cọc 30% và hoàn cọc hoạt động ra sao?</h2><p>Khi thanh toán cọc 30% qua cổng VNPay hoặc VietQR 24/7, hệ thống tự động khóa biển số xe theo đúng khung giờ thuê đã chọn. Khách hàng thông báo hủy trước 24 giờ so với giờ nhận xe được hoàn lại 100% tiền cọc theo chính sách hệ thống.</p>',
        '<h2>3. Tôi có thể nhận xe ở Sân bay và trả xe ở chi nhánh khác không?</h2><p>Có. Hệ thống hỗ trợ giao nhận xe liên trạm giữa Chi nhánh Sân Bay Quốc Tế Đà Nẵng, Chi nhánh Bãi Biển Mỹ Khê và Chi nhánh Bán Đảo Sơn Trà.</p>',
        '<h2>4. Giá thuê xe đã bao gồm những trang bị nào?</h2><p>Giá niêm yết trên hệ thống đã bao gồm 02 mũ bảo hiểm 3/4 khử khuẩn UV, 02 áo mưa tiện lợi, giá đỡ điện thoại và hỗ trợ kỹ thuật nội thành Đà Nẵng.</p>',
      ].join(''),
      lastUpdatedBy: userAdmin._id,
    },
    {
      slug: 'terms',
      title: 'Điều Khoản Dịch Vụ Thuê Xe Motorent',
      type: 'Terms',
      isPublished: true,
      content: '<h2>1. Quy định chung</h2><p>Chính sách thuê xe tự lái minh bạch: Khách hàng cần xuất trình GPLX và CCCD hợp lệ để đối chiếu eKYC. Motorent cam kết không giữ bản gốc giấy tờ tùy thân của khách.</p>',
      lastUpdatedBy: userAdmin._id,
    },
    {
      slug: 'privacy',
      title: 'Chính Sách Bảo Mật Thông Tin Khách Hàng',
      type: 'Privacy',
      isPublished: true,
      content: '<h2>1. Cam kết bảo mật dữ liệu</h2><p>Mọi dữ liệu cá nhân, ảnh chụp giấy tờ CCCD/GPLX đều được đóng dấu bảo mật và lưu trữ theo tiêu chuẩn an toàn cao cấp.</p>',
      lastUpdatedBy: userAdmin._id,
    },
    {
      slug: 'dieu-khoan-dich-vu',
      isPublished: true,
      title: 'Điều Khoản Dịch Vụ Thuê Xe Motorent',
      content: 'Chính sách thuê xe tự lái minh bạch: Khách hàng cần xuất trình GPLX và CCCD hợp lệ để đối chiếu eKYC. Motorent cam kết không giữ bản gốc giấy tờ tùy thân của khách.',
      lastUpdatedBy: userAdmin._id,
    },
    {
      slug: 'chinh-sach-bao-mat',
      isPublished: true,
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
