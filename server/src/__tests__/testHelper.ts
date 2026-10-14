import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { Branch } from '../models/Branch';
import { User } from '../models/User';
import { Vehicle } from '../models/Vehicle';
import { Category } from '../models/Category';

export const setupTestEnvironment = async (): Promise<void> => {
  await connectDatabase();

  // Find or create category
  let cat = await Category.findOne({ slug: 'xe-tay-ga' });
  if (!cat) {
    cat = await Category.create({
      name: 'Xe Tay Ga Đô Thị',
      slug: 'xe-tay-ga',
      description: 'Dòng xe thông dụng, cốp rộng, tiết kiệm xăng.',
    });
  }

  // Find or create branch DAD
  let branchDAD = await Branch.findOne({ code: 'CN-DAD' });
  if (!branchDAD) {
    branchDAD = await Branch.create({
      name: 'Chi nhánh Sân Bay Quốc Tế Đà Nẵng',
      code: 'CN-DAD',
      address: 'Cổng Ga Quốc Tế, Phường Hòa Thuận Tây, Quận Hải Châu, TP. Đà Nẵng',
      phone: '0236.3822.101',
      email: 'danang.airport@motorent.vn',
      location_lng: 108.2022,
      location_lat: 16.0538,
      hours_open: '06:00',
      hours_close: '23:00',
      isActive: true,
    });
  }

  // Find or create branch MK
  let branchMK = await Branch.findOne({ code: 'CN-MK' });
  if (!branchMK) {
    branchMK = await Branch.create({
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
    });
  }

  const staffPass = await bcrypt.hash('Staff@123456', 10);
  const customerPass = await bcrypt.hash('Customer@123456', 10);

  // Find or create staff_dad
  let staffDad = await User.findOne({ username: 'staff_dad' });
  if (!staffDad) {
    staffDad = await User.create({
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
  } else {
    staffDad.passwordHash = staffPass;
    staffDad.status = 'Active';
    staffDad.lockUntil = undefined;
    staffDad.failedLoginAttempts = 0;
    await staffDad.save();
  }

  // Find or create staff_mk
  let staffMk = await User.findOne({ username: 'staff_mk' });
  if (!staffMk) {
    staffMk = await User.create({
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
  } else {
    staffMk.passwordHash = staffPass;
    staffMk.status = 'Active';
    staffMk.lockUntil = undefined;
    staffMk.failedLoginAttempts = 0;
    await staffMk.save();
  }

  // Find or create customer_hoang
  let customerHoang = await User.findOne({ username: 'customer_hoang' });
  if (!customerHoang) {
    customerHoang = await User.create({
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
  } else {
    customerHoang.passwordHash = customerPass;
    customerHoang.status = 'Active';
    customerHoang.lockUntil = undefined;
    customerHoang.failedLoginAttempts = 0;
    await customerHoang.save();
  }

  // Find or create customer_tuan (used in logout / tokenVersion test)
  let customerTuan = await User.findOne({ username: 'customer_tuan' });
  if (!customerTuan) {
    customerTuan = await User.create({
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
  } else {
    customerTuan.passwordHash = customerPass;
    customerTuan.status = 'Active';
    customerTuan.lockUntil = undefined;
    customerTuan.failedLoginAttempts = 0;
    customerTuan.tokenVersion = 0;
    await customerTuan.save();
  }

  // Find or create vehicle
  let vehicle = await Vehicle.findOne({ licensePlate: '43-B1 999.88' });
  if (!vehicle) {
    vehicle = await Vehicle.create({
      branchId: branchDAD._id,
      category: cat._id,
      brand: 'Honda',
      vehicleModel: 'Honda Air Blade 160cc 2024',
      licensePlate: '43-B1 999.88',
      color: 'Xám Xi Măng Thể Thao',
      dailyPrice: 150000,
      hourlyPrice: 25000,
      status: 'Available',
      fuelType: 'Gasoline',
      transmissionType: 'Automatic',
      odometer: 3200,
      images: ['https://example.com/ab160.jpg'],
      requiresMaintenance: false,
      isDeleted: false,
    });
  } else {
    vehicle.branchId = branchDAD._id;
    vehicle.category = cat._id;
    vehicle.status = 'Available';
    vehicle.odometer = 3200;
    vehicle.requiresMaintenance = false;
    vehicle.isDeleted = false;
    await vehicle.save();
  }
};

export const teardownTestEnvironment = async (): Promise<void> => {
  await disconnectDatabase();
};
