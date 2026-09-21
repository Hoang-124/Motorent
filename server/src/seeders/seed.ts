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

const seedDatabase = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/motorent_db';
  console.log(`🌱 Connecting to MongoDB: ${uri}...`);
  await mongoose.connect(uri);

  console.log('🧹 Clearing all 18 collections...');
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

  const salt = await bcrypt.genSalt(10);
  const adminPass = await bcrypt.hash('admin123', salt);
  const managerPass = await bcrypt.hash('manager123', salt);
  const staffPass = await bcrypt.hash('staff123', salt);
  const customerPass = await bcrypt.hash('customer123', salt);

  console.log('🏢 Seeding Branches & Categories...');
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
  const catElectric = await Category.create({
    name: 'Xe điện',
    slug: 'xe-dien',
    description: 'Thân thiện môi trường, vận hành êm ái, sạc tiện lợi.',
  });

  const branchQ1 = await Branch.create({
    name: 'Chi nhánh Quận 1 - Chợ Bến Thành',
    code: 'CN-Q1',
    address: '120 Lê Lai, Phường Bến Thành, Quận 1, TP.HCM',
    phone: '028.3822.1101',
    email: 'branch.q1@motorent.vn',
    location_lng: 106.6953,
    location_lat: 10.7719,
    hours_open: '07:30',
    hours_close: '22:30',
    isActive: true,
    description: 'Cơ sở trung tâm gần ga Metro Bến Thành, hỗ trợ giao xe khách sạn Quận 1.',
  });

  const branchSB = await Branch.create({
    name: 'Chi nhánh Sân Bay Tân Sơn Nhất',
    code: 'CN-SB',
    address: '45 Trường Sơn, Phường 2, Quận Tân Bình, TP.HCM',
    phone: '028.3848.2202',
    email: 'branch.sb@motorent.vn',
    location_lng: 106.6663,
    location_lat: 10.8164,
    hours_open: '06:00',
    hours_close: '23:00',
    isActive: true,
    description: 'Cách ga quốc nội Tân Sơn Nhất 200m, thuận tiện cho khách du lịch bay đến TP.HCM.',
  });

  const branchTD = await Branch.create({
    name: 'Chi nhánh TP. Thủ Đức',
    code: 'CN-TD',
    address: '215 Võ Văn Ngân, Phường Linh Chiểu, TP. Thủ Đức, TP.HCM',
    phone: '028.3722.3303',
    email: 'branch.td@motorent.vn',
    location_lng: 106.7718,
    location_lat: 10.8509,
    hours_open: '08:00',
    hours_close: '22:00',
    isActive: true,
    description: 'Gần Làng Đại học Quốc gia, phục vụ đông đảo sinh viên và kỹ sư khu công nghệ cao.',
  });

  console.log('👤 Seeding Users with 4 RBAC Roles...');
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
  });

  const userManagerQ1 = await User.create({
    username: 'manager_q1',
    email: 'manager.q1@motorent.vn',
    passwordHash: managerPass,
    firstName: 'Trần Văn',
    lastName: 'Quản Lý Q1',
    phoneNumber: '0902111222',
    roles: 'BranchManager',
    status: 'Active',
    branchId: branchQ1._id,
    identityStatus: 'Verified',
  });

  const userManagerSB = await User.create({
    username: 'manager_sb',
    email: 'manager.sb@motorent.vn',
    passwordHash: managerPass,
    firstName: 'Lê Hoàng',
    lastName: 'Quản Lý SB',
    phoneNumber: '0903333444',
    roles: 'BranchManager',
    status: 'Active',
    branchId: branchSB._id,
    identityStatus: 'Verified',
  });

  // Assign managers to branches
  branchQ1.managerId = userManagerQ1._id as any;
  await branchQ1.save();
  branchSB.managerId = userManagerSB._id as any;
  await branchSB.save();

  const userStaffQ1 = await User.create({
    username: 'staff_q1',
    email: 'staff.q1@motorent.vn',
    passwordHash: staffPass,
    firstName: 'Nguyễn Văn',
    lastName: 'Nhân Viên Q1',
    phoneNumber: '0904555666',
    roles: 'Staff',
    status: 'Active',
    branchId: branchQ1._id,
    identityStatus: 'Verified',
  });

  const userStaffSB = await User.create({
    username: 'staff_sb',
    email: 'staff.sb@motorent.vn',
    passwordHash: staffPass,
    firstName: 'Phạm Thị',
    lastName: 'Nhân Viên SB',
    phoneNumber: '0905777888',
    roles: 'Staff',
    status: 'Active',
    branchId: branchSB._id,
    identityStatus: 'Verified',
  });

  const userCustomer1 = await User.create({
    username: 'customer_an',
    email: 'hoangan@gmail.com',
    passwordHash: customerPass,
    firstName: 'Hoàng',
    lastName: 'Văn An',
    phoneNumber: '0912345678',
    roles: 'Customer',
    status: 'Active',
    identityStatus: 'Verified',
    drivingLicenseUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500',
    loyaltyPoints: 120,
    referralCode: 'AN2026',
  });

  const userCustomer2 = await User.create({
    username: 'customer_binh',
    email: 'binhle@gmail.com',
    passwordHash: customerPass,
    firstName: 'Lê',
    lastName: 'Thanh Bình',
    phoneNumber: '0987654321',
    roles: 'Customer',
    status: 'Active',
    identityStatus: 'Pending',
    loyaltyPoints: 30,
    referralCode: 'BINH2026',
  });

  console.log('🏍️ Seeding Fleet Vehicles...');
  const v1 = await Vehicle.create({
    branchId: branchQ1._id,
    category: catScooter._id,
    vehicleModel: 'Honda Vision 2024 Smartkey',
    brand: 'Honda',
    licensePlate: '59-P1 988.23',
    odometer: 14200,
    dailyPrice: 150000,
    hourlyPrice: 20000,
    status: 'Available',
    transmissionType: 'Automatic',
    fuelType: 'Gasoline',
    yearManufactured: 2024,
    requiresMaintenance: false,
    images: ['https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=600'],
  });

  const v2 = await Vehicle.create({
    branchId: branchQ1._id,
    category: catScooter._id,
    vehicleModel: 'Honda Air Blade 160 ABS',
    brand: 'Honda',
    licensePlate: '59-B1 776.54',
    odometer: 21500,
    dailyPrice: 200000,
    hourlyPrice: 30000,
    status: 'Rented',
    transmissionType: 'Automatic',
    fuelType: 'Gasoline',
    yearManufactured: 2023,
    requiresMaintenance: false,
    images: ['https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=600'],
  });

  const v3 = await Vehicle.create({
    branchId: branchSB._id,
    category: catManual._id,
    vehicleModel: 'Honda Wave Alpha 110cc',
    brand: 'Honda',
    licensePlate: '59-S2 334.12',
    odometer: 32000,
    dailyPrice: 100000,
    hourlyPrice: 15000,
    status: 'Available',
    transmissionType: 'Semi-Auto',
    fuelType: 'Gasoline',
    yearManufactured: 2023,
    requiresMaintenance: false,
    images: ['https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?w=600'],
  });

  const v4 = await Vehicle.create({
    branchId: branchSB._id,
    category: catClutch._id,
    vehicleModel: 'Yamaha Exciter 155 VVA',
    brand: 'Yamaha',
    licensePlate: '59-K1 889.90',
    odometer: 18400,
    dailyPrice: 220000,
    hourlyPrice: 35000,
    status: 'Maintenance',
    transmissionType: 'Manual',
    fuelType: 'Gasoline',
    yearManufactured: 2024,
    requiresMaintenance: true,
    images: ['https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=600'],
  });

  const v5 = await Vehicle.create({
    branchId: branchTD._id,
    category: catElectric._id,
    vehicleModel: 'VinFast Feliz S Pin LFP',
    brand: 'VinFast',
    licensePlate: '59-E1 123.45',
    odometer: 8900,
    dailyPrice: 160000,
    hourlyPrice: 25000,
    status: 'Available',
    transmissionType: 'Automatic',
    fuelType: 'Electric',
    yearManufactured: 2024,
    requiresMaintenance: false,
    images: ['https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=600'],
  });

  console.log('🏷️ Seeding Discounts...');
  const discountSummer = await Discount.create({
    code: 'HELLOSUMMER',
    description: 'Giảm ngay 10% tối đa 50.000đ cho đơn từ 200.000đ chào hè.',
    discountPercent: 10,
    maxDiscountAmount: 50000,
    minBookingAmount: 200000,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    usageLimit: 500,
    usedCount: 15,
    isActive: true,
  });

  const discountVIP = await Discount.create({
    code: 'VIPRENT',
    description: 'Ưu đãi thành viên VIP giảm 20% tối đa 100.000đ.',
    discountPercent: 20,
    maxDiscountAmount: 100000,
    minBookingAmount: 400000,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    usageLimit: 100,
    usedCount: 8,
    isActive: true,
  });

  console.log('📋 Seeding Bookings & Feedback...');
  // Đơn 1: Đã hoàn tất (Thuê ở Q1, trả ở Sân Bay - Minh họa One-Way Rental)
  const bookingCompleted = await Booking.create({
    bookingCode: 'MTV-100201',
    userId: userCustomer1._id,
    vehicleId: v1._id,
    pickupBranchId: branchQ1._id,
    returnBranchId: branchSB._id, // Trả tại Sân bay!
    pickupDateTime: new Date(Date.now() - 3 * 24 * 3600 * 1000),
    returnDateTime: new Date(Date.now() - 1 * 24 * 3600 * 1000),
    actualReturnDateTime: new Date(Date.now() - 1 * 24 * 3600 * 1000 + 2 * 3600 * 1000), // Trễ 2 tiếng
    totalAmount: 300000,
    depositAmount: 90000, // Cọc 30%
    remainingAmount: 210000, // 70% còn lại
    discountId: discountSummer._id,
    discountAmount: 30000,
    lateFee: 40000, // 2 tiếng trễ
    damageFee: 0,
    loyaltyPointsEarned: 30,
    status: 'Completed',
    paymentMethod: 'Banking',
    isPaid: true,
    approvedBy: userManagerQ1._id,
    eSignatureUrl: 'data:image/png;base64,sampleSignatureDataString',
    startOdometer: 14000,
    endOdometer: 14200,
    startFuelLevel: '100%',
    endFuelLevel: '95%',
  });

  // Đơn 2: Đang lưu thông (Ongoing)
  const bookingOngoing = await Booking.create({
    bookingCode: 'MTV-100202',
    userId: userCustomer2._id,
    vehicleId: v2._id,
    pickupBranchId: branchQ1._id,
    returnBranchId: branchQ1._id,
    pickupDateTime: new Date(Date.now() - 12 * 3600 * 1000),
    returnDateTime: new Date(Date.now() + 36 * 3600 * 1000),
    totalAmount: 400000,
    depositAmount: 120000,
    remainingAmount: 280000,
    status: 'Ongoing',
    paymentMethod: 'Banking',
    isPaid: false,
    approvedBy: userStaffQ1._id,
    startOdometer: 21500,
    startFuelLevel: '100%',
    eSignatureUrl: 'data:image/png;base64,sampleSignature2',
  });

  // Đánh giá 1-1 cho đơn hoàn tất
  await Feedback.create({
    userId: userCustomer1._id,
    vehicleId: v1._id,
    bookingId: bookingCompleted._id,
    rating: 5,
    comment: 'Xe Vision chạy cực kỳ êm ái, nhân viên chi nhánh Quận 1 bàn giao nhanh chóng và nhiệt tình!',
    response: 'Cảm ơn bạn An đã ủng hộ dịch vụ của Motov! Hẹn gặp lại bạn trong những chuyến đi tiếp theo.',
    respondedBy: userManagerQ1._id,
    isPublic: true,
  });

  console.log('🚚 Seeding VehicleTransfer & MaintenanceLog...');
  await VehicleTransfer.create({
    vehicleId: v5._id,
    fromBranchId: branchTD._id,
    toBranchId: branchSB._id,
    transferReason: 'Tăng cường xe điện VinFast đón khách quốc tế cuối tuần tại sân bay.',
    requestedBy: userManagerSB._id,
    approvedBy: userAdmin._id,
    status: 'InTransit',
    departureTime: new Date(Date.now() - 2 * 3600 * 1000),
    notes: 'Đã sạc đầy pin 100%, kèm 1 bộ sạc chính hãng và 2 nón bảo hiểm Motov.',
  });

  await MaintenanceLog.create({
    vehicleId: v4._id,
    branchId: branchSB._id,
    maintenanceType: 'Repair',
    description: 'Thay bố thắng đĩa sau, thay nhớt Motul 300V và căng xích cam.',
    cost: 480000,
    startDate: new Date(Date.now() - 24 * 3600 * 1000),
    performedBy: 'Gara Kỹ Thuật Hoàng Long',
    odometerAtMaintenance: 18400,
    status: 'InProgress',
  });

  console.log('📅 Seeding StaffSchedule & Attendance...');
  await StaffSchedule.create({
    staffId: userStaffQ1._id,
    branchId: branchQ1._id,
    shiftDate: new Date(),
    shiftType: 'Morning',
    checkInTime: new Date(new Date().setHours(7, 35, 0)),
    status: 'Present',
    assignedBy: userManagerQ1._id,
    notes: 'Trực quầy chính, phụ trách bàn giao xe cho khách tour buổi sáng.',
  });

  await StaffSchedule.create({
    staffId: userStaffSB._id,
    branchId: branchSB._id,
    shiftDate: new Date(),
    shiftType: 'Afternoon',
    status: 'Assigned',
    assignedBy: userManagerSB._id,
    notes: 'Ca chiều đón khách trả xe từ các tour miền Tây về sân bay.',
  });

  console.log('⚠️ Seeding Complaint & AuditLog...');
  await Complaint.create({
    customerId: userCustomer1._id,
    bookingId: bookingCompleted._id,
    branchId: branchQ1._id,
    title: 'Đèn xi-nhan bên phải hơi lỏng',
    description: 'Khi đi vào đường xóc thấy đèn xi-nhan phải bị rung lắc nhẹ, mong cửa hàng kiểm tra lại chốt ốc.',
    status: 'Resolved',
    priority: 'Low',
    resolutionNotes: 'Kỹ thuật viên đã siết chặt lại ốc và kiểm tra toàn bộ dàn áo xe trước khi đưa vào khai thác tiếp.',
    resolvedBy: userManagerQ1._id,
    resolvedAt: new Date(),
  });

  await AuditLog.create({
    userId: userAdmin._id,
    action: 'CREATE_BRANCH',
    entity: 'Branch',
    entityId: branchQ1._id.toString(),
    details: { code: 'CN-Q1', name: branchQ1.name },
    ipAddress: '192.168.1.10',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    timestamp: new Date(),
  });

  await AuditLog.create({
    userId: userManagerQ1._id,
    action: 'COMPLETE_BOOKING',
    entity: 'Booking',
    entityId: bookingCompleted._id.toString(),
    details: { bookingCode: 'MTV-100201', lateFee: 40000, remainingPaid: 210000 },
    ipAddress: '192.168.1.25',
    userAgent: 'Chrome/128.0.0.0 Motov Counter Client',
    timestamp: new Date(),
  });

  console.log('💬 Seeding Chat, Banners & CMS...');
  const conv = await Conversation.create({
    participants: [userCustomer1._id, userStaffQ1._id],
    lastMessageText: 'Dạ xe anh An đã sẵn sàng tại quầy Quận 1 rồi ạ!',
    lastMessageAt: new Date(),
  });

  await Message.create({
    conversationId: conv._id,
    senderId: userCustomer1._id,
    content: 'Chào bạn, mình đến sớm hơn 15 phút thì có nhận xe được luôn không?',
    isRead: true,
  });

  await Message.create({
    conversationId: conv._id,
    senderId: userStaffQ1._id,
    content: 'Dạ chào anh An! Xe anh đã được rửa sạch và kiểm tra xăng đầy đủ rồi ạ, anh đến là nhận chìa khóa ngay được ạ!',
    isRead: true,
  });

  await Banner.create({
    title: 'Vi Vu Hè 2026 - Giảm Ngay 10% Khi Thuê Xe Đa Chi Nhánh',
    imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1200',
    linkUrl: '/bikes',
    position: 1,
    isActive: true,
  });

  await StaticPage.create({
    slug: 'terms',
    title: 'Quy Định & Chính Sách Thuê Xe Máy Motov',
    content: '<h2>1. Điều kiện thuê xe</h2><p>Khách hàng cần có CCCD/Hộ chiếu và Giấy phép lái xe hạng A1/A2 hợp lệ...</p><h2>2. Chính sách đặt cọc</h2><p>Thanh toán 30% giá trị hợp đồng khi đặt xe online...</p>',
    isPublished: true,
    updatedBy: userAdmin._id,
  });

  await Notification.create({
    userId: userCustomer1._id,
    title: 'Đặt cọc thành công',
    body: 'Đơn thuê MTV-100201 đã được xác nhận cọc 30%. Hẹn gặp bạn tại Chi nhánh Quận 1!',
    type: 'BOOKING',
    relatedId: bookingCompleted._id.toString(),
    isRead: true,
  });

  await BookingReminder.create({
    bookingId: bookingOngoing._id,
    reminderType: 'RETURN_UPCOMING',
    scheduledTime: new Date(Date.now() + 35 * 3600 * 1000),
    status: 'Pending',
    channel: 'SMS',
  });

  console.log('\n======================================================');
  console.log('🎉 SEEDING COMPLETED SUCCESSFULLY ACROSS ALL 18 TABLES!');
  console.log('======================================================');
  console.log(`1.  Branch:           ${await Branch.countDocuments()} bản ghi`);
  console.log(`2.  User:             ${await User.countDocuments()} bản ghi (Admin, Manager, Staff, Customer)`);
  console.log(`3.  Category:         ${await Category.countDocuments()} bản ghi`);
  console.log(`4.  Vehicle:          ${await Vehicle.countDocuments()} bản ghi`);
  console.log(`5.  Booking:          ${await Booking.countDocuments()} bản ghi`);
  console.log(`6.  VehicleTransfer:  ${await VehicleTransfer.countDocuments()} bản ghi`);
  console.log(`7.  MaintenanceLog:   ${await MaintenanceLog.countDocuments()} bản ghi`);
  console.log(`8.  StaffSchedule:    ${await StaffSchedule.countDocuments()} bản ghi`);
  console.log(`9.  Complaint:        ${await Complaint.countDocuments()} bản ghi`);
  console.log(`10. AuditLog:         ${await AuditLog.countDocuments()} bản ghi`);
  console.log(`11. Discount:         ${await Discount.countDocuments()} bản ghi`);
  console.log(`12. Feedback:         ${await Feedback.countDocuments()} bản ghi`);
  console.log(`13. Notification:     ${await Notification.countDocuments()} bản ghi`);
  console.log(`14. BookingReminder:  ${await BookingReminder.countDocuments()} bản ghi`);
  console.log(`15. Conversation:     ${await Conversation.countDocuments()} bản ghi`);
  console.log(`16. Message:          ${await Message.countDocuments()} bản ghi`);
  console.log(`17. Banner:           ${await Banner.countDocuments()} bản ghi`);
  console.log(`18. StaticPage:       ${await StaticPage.countDocuments()} bản ghi`);
  console.log('======================================================');

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB.');
  process.exit(0);
};

seedDatabase().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
