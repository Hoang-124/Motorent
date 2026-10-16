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

const seedDatabase = async (): Promise<void> => {
  // Reject execution on production
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Lỗi bảo mật: Seeder bị từ chối chạy trong môi trường production (NODE_ENV=production).');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/motorent_db';
  console.log(`🌱 Đang kết nối tới MongoDB: ${uri}...`);
  await mongoose.connect(uri);

  console.log('🧹 Đang làm sạch toàn bộ 18 bộ sưu tập cơ sở dữ liệu...');
  await Promise.all([
    Branch.deleteMany({}),
    User.deleteMany({}),
    Category.deleteMany({}),
    Vehicle.deleteMany({}),
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

  // Read passwords from environment or use secure defaults with notice
  const adminRawPass = process.env.SEED_ADMIN_PASSWORD || 'Admin@123456';
  const managerRawPass = process.env.SEED_MANAGER_PASSWORD || 'Manager@123456';
  const staffRawPass = process.env.SEED_STAFF_PASSWORD || 'Staff@123456';
  const customerRawPass = process.env.SEED_CUSTOMER_PASSWORD || 'Customer@123456';

  console.log('🔑 Thông tin mật khẩu khởi tạo tài khoản hệ thống:');
  console.log(`   - SystemAdmin: ${adminRawPass}`);
  console.log(`   - BranchManager: ${managerRawPass}`);
  console.log(`   - Staff: ${staffRawPass}`);
  console.log(`   - Customer: ${customerRawPass}`);

  const salt = await bcrypt.genSalt(10);
  const adminPass = await bcrypt.hash(adminRawPass, salt);
  const managerPass = await bcrypt.hash(managerRawPass, salt);
  const staffPass = await bcrypt.hash(staffRawPass, salt);
  const customerPass = await bcrypt.hash(customerRawPass, salt);

  console.log('🏢 Khởi tạo 6 Phân loại xe (Categories)...');
  const catScooter = await Category.create({
    name: 'Xe tay ga',
    slug: 'xe-tay-ga',
    description: 'Dòng xe êm ái, cốp rộng, dễ điều khiển trong đô thị.',
  });
  const cat50cc = await Category.create({
    name: 'Xe 50cc (Không cần bằng lái)',
    slug: 'xe-50cc',
    description: 'Dành cho học sinh, sinh viên hoặc khách chưa có bằng lái A1, nhỏ gọn an toàn.',
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
  const catElectric = await Category.create({
    name: 'Xe máy điện',
    slug: 'xe-dien',
    description: 'Thân thiện môi trường, vận hành êm ái, sạc tiện lợi.',
  });
  const catBigBike = await Category.create({
    name: 'Xe phân khối lớn',
    slug: 'xe-phan-khoi-lon',
    description: 'Dung tích từ 300cc trở lên, phong cách touring trải nghiệm dài ngày.',
  });

  console.log('🏢 Khởi tạo 3 Chi nhánh thống nhất (Branches)...');
  const branchDAD = await Branch.create({
    name: 'Chi nhánh Sân Bay Quốc Tế Đà Nẵng',
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
    name: 'Chi nhánh Bãi Biển Mỹ Khê - Sơn Trà',
    code: 'CN-MK',
    address: '28 Võ Nguyên Giáp, Phường Phước Mỹ, Quận Sơn Trà, TP. Đà Nẵng',
    phone: '0236.3822.202',
    email: 'mykhe.beach@motorent.vn',
    location_lng: 108.2472,
    location_lat: 16.0614,
    hours_open: '07:00',
    hours_close: '22:30',
    isActive: true,
    description: 'Nằm sát bãi biển Mỹ Khê, thuận tiện di chuyển khám phá Bán đảo Sơn Trà, Ngũ Hành Sơn và phố cổ Hội An.',
  });

  const branchCR = await Branch.create({
    name: 'Chi nhánh Cầu Rồng - Trung Tâm Hải Châu',
    code: 'CN-CR',
    address: '02 Bạch Đằng, Phường Thạch Thang, Quận Hải Châu, TP. Đà Nẵng',
    phone: '0236.3822.303',
    email: 'dragon.bridge@motorent.vn',
    location_lng: 108.2235,
    location_lat: 16.0658,
    hours_open: '06:30',
    hours_close: '23:00',
    isActive: true,
    description: 'Trung tâm thành phố, ngay chân Cầu Rồng và phố đi bộ Bạch Đằng, đón trả khách sầm uất.',
  });

  console.log('👤 Khởi tạo 11 Tài khoản người dùng chuẩn RBAC...');
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

  const userManagerCR = await User.create({
    username: 'manager_cr',
    email: 'manager.cr@motorent.vn',
    passwordHash: managerPass,
    firstName: 'Vũ Quốc',
    lastName: 'Quản Lý Cầu Rồng',
    phoneNumber: '0904555666',
    roles: 'BranchManager',
    status: 'Active',
    branchId: branchCR._id,
    identityStatus: 'Verified',
    tokenVersion: 0,
    isEmailVerified: true,
  });

  // Assign managers without any
  branchDAD.managerId = userManagerDAD._id as mongoose.Types.ObjectId;
  await branchDAD.save();
  branchMK.managerId = userManagerMK._id as mongoose.Types.ObjectId;
  await branchMK.save();
  branchCR.managerId = userManagerCR._id as mongoose.Types.ObjectId;
  await branchCR.save();

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

  const userStaffCR = await User.create({
    username: 'staff_cr',
    email: 'staff.cr@motorent.vn',
    passwordHash: staffPass,
    firstName: 'Phạm Hồng',
    lastName: 'Nhân Viên Cầu Rồng',
    phoneNumber: '0917555777',
    roles: 'Staff',
    status: 'Active',
    branchId: branchCR._id,
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
    identityStatus: 'Pending',
    loyaltyPoints: 0,
    tokenVersion: 0,
    isEmailVerified: true,
  });

  console.log(`🏍️ Khởi tạo ${VEHICLE_CATALOG_34.length} Phương tiện chính hãng (Vehicles) chuẩn 6 phân khúc, mỗi xe có đủ 3 góc chụp...`);

  const categoryMap: Record<string, mongoose.Types.ObjectId> = {
    'xe-tay-ga': catScooter._id as mongoose.Types.ObjectId,
    'xe-50cc': cat50cc._id as mongoose.Types.ObjectId,
    'xe-so': catManual._id as mongoose.Types.ObjectId,
    'xe-con-tay': catClutch._id as mongoose.Types.ObjectId,
    'xe-dien': catElectric._id as mongoose.Types.ObjectId,
    'xe-phan-khoi-lon': catBigBike._id as mongoose.Types.ObjectId,
  };

  const branches = [branchDAD, branchMK, branchCR];

  const platePrefixes: Record<string, string> = {
    'xe-tay-ga': '43-B1',
    'xe-50cc': '43-AB',
    'xe-so': '43-C1',
    'xe-con-tay': '43-H1',
    'xe-dien': '43-MD1',
    'xe-phan-khoi-lon': '43-A1',
  };

  const vehiclesData = VEHICLE_CATALOG_34.map((item, index) => {
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

  console.log('🏷️ Khởi tạo Mã giảm giá khuyến mãi (Discounts)...');
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

  console.log('📑 Khởi tạo Đơn đặt xe mẫu (Bookings) tiền tố MV-...');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfterTomorrow = new Date();
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 3);

  const booking1 = await Booking.create({
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

  const booking2 = await Booking.create({
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
  // Mark vehicle 1 as Rented for ongoing booking
  vehicles[1].status = 'Rented';
  await vehicles[1].save();

  const completedStartDate = new Date();
  completedStartDate.setDate(completedStartDate.getDate() - 5);
  const completedEndDate = new Date();
  completedEndDate.setDate(completedEndDate.getDate() - 3);

  const booking3 = await Booking.create({
    bookingCode: 'MV-100203',
    userId: userCustomer3._id,
    vehicleId: vehicles[6]._id,
    pickupBranchId: branchCR._id,
    returnBranchId: branchDAD._id,
    pickupDateTime: completedStartDate,
    returnDateTime: completedEndDate,
    actualReturnDateTime: completedEndDate,
    totalAmount: 440000,
    depositAmount: 132000,
    remainingAmount: 308000,
    paymentMethod: 'Banking',
    isPaid: true,
    status: 'Completed',
    startOdometer: 5800,
    endOdometer: 6100,
    loyaltyPointsEarned: 44,
  });
  console.log('💬 Bỏ qua Feedback giả lập — chỉ lưu trữ đánh giá thật từ khách hàng thực tế sau chuyến đi...');

  console.log('📜 Khởi tạo Trang tĩnh (Static Pages)...');
  await StaticPage.create([
    {
      slug: 'dieu-khoan-dich-vu',
      title: 'Điều Khoản Dịch Vụ Thuê Xe Motorent',
      content: 'Chính sách thuê xe tự lái minh bạch: Khách hàng cần xuất trình GPLX và CCCD hợp lệ để đối chiếu eKYC. Motorent cam kết không giữ bản gốc giấy tờ tùy thân của khách.',
      isPublished: true,
      updatedBy: userAdmin._id,
    },
    {
      slug: 'chinh-sach-bao-mat',
      title: 'Chính Sách Bảo Mật Thông Tin Khách Hàng',
      content: 'Mọi dữ liệu cá nhân, ảnh chụp giấy tờ CCCD/GPLX đều được mã hóa lưu trữ theo tiêu chuẩn bảo mật cao cấp.',
      updatedBy: userAdmin._id,
    },
    {
      slug: 'cau-hoi-thuong-gap',
      title: 'Câu Hỏi Thường Gặp (FAQs)',
      content: '1. Thủ tục nhận xe cần những gì? Quý khách chỉ cần CCCD và GPLX còn hạn để đối chiếu 2 phút tại quầy.\n2. Cọc giữ xe bao nhiêu? Hệ thống chỉ thu trước 30% để khóa biển số xe riêng cho bạn.',
      updatedBy: userAdmin._id,
    },
  ]);

  console.log('🖼️ Khởi tạo Banners quảng bá hệ thống...');
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

  console.log('✅ Hoàn tất quá trình nạp dữ liệu hạt giống (Seed Database Finished Successfully)!');
  await mongoose.disconnect();
};

seedDatabase().catch((err) => {
  console.error('❌ Lỗi xảy ra khi chạy seeder:', err);
  process.exit(1);
});
