import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { app } from '../server';
import { env } from '../config/env';
import { setupTestEnvironment } from './testHelper';
import { User } from '../models/User';
import { Vehicle } from '../models/Vehicle';
import { Wishlist } from '../models/Wishlist';
import { Branch } from '../models/Branch';
import { Category } from '../models/Category';

describe('UC-25-26: Wishlist Integration Tests', () => {
  let customerHoangToken: string;
  let customerTuanToken: string;
  let customerHoangId: string;
  let customerTuanId: string;
  let branchId: string;
  let categoryId: string;
  let testVehicle1: any;
  let testVehicle2: any;

  beforeAll(async () => {
    await setupTestEnvironment();

    const customerHoang = await User.findOne({ username: 'customer_hoang' });
    customerHoangId = customerHoang!._id.toString();
    customerHoangToken = jwt.sign(
      { userId: customerHoangId, role: 'Customer', tokenVersion: customerHoang!.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const customerTuan = await User.findOne({ username: 'customer_tuan' });
    customerTuanId = customerTuan!._id.toString();
    customerTuanToken = jwt.sign(
      { userId: customerTuanId, role: 'Customer', tokenVersion: customerTuan!.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const branch = await Branch.findOne({ isActive: true });
    branchId = branch!._id.toString();

    const category = await Category.findOne({});
    categoryId = category!._id.toString();

    // Create 2 test vehicles
    testVehicle1 = await Vehicle.create({
      branchId,
      category: categoryId,
      vehicleModel: 'Honda Vision 2026 Wishlist Test 1',
      brand: 'Honda',
      licensePlate: '43-WISH-1111',
      odometer: 1200,
      dailyPrice: 150000,
      status: 'Available',
      transmissionType: 'Automatic',
      fuelType: 'Gasoline',
      requiresMaintenance: false,
      isDeleted: false,
      averageRating: 4.8,
      reviewCount: 5,
    });

    testVehicle2 = await Vehicle.create({
      branchId,
      category: categoryId,
      vehicleModel: 'Yamaha NVX 155 Wishlist Test 2',
      brand: 'Yamaha',
      licensePlate: '43-WISH-2222',
      odometer: 2500,
      dailyPrice: 220000,
      status: 'Available',
      transmissionType: 'Automatic',
      fuelType: 'Gasoline',
      requiresMaintenance: false,
      isDeleted: false,
      averageRating: 4.5,
      reviewCount: 3,
    });
  }, 30000);

  afterAll(async () => {
    if (testVehicle1) await Vehicle.findByIdAndDelete(testVehicle1._id);
    if (testVehicle2) await Vehicle.findByIdAndDelete(testVehicle2._id);
    await Wishlist.deleteMany({});
    await mongoose.disconnect();
  }, 10000);

  it('1. Guest gọi -> 401 Unauthorized', async () => {
    const resGet = await request(app).get('/api/wishlist');
    expect(resGet.status).toBe(401);

    const resGetIds = await request(app).get('/api/wishlist/ids');
    expect(resGetIds.status).toBe(401);

    const resPost = await request(app).post(`/api/wishlist/${testVehicle1._id}`);
    expect(resPost.status).toBe(401);

    const resDelete = await request(app).delete(`/api/wishlist/${testVehicle1._id}`);
    expect(resDelete.status).toBe(401);
  });

  it('2. Thêm xe không tồn tại hoặc xe đã bị xóa -> 404 Not Found', async () => {
    // Non-existent ID
    const fakeId = new mongoose.Types.ObjectId();
    const resFake = await request(app)
      .post(`/api/wishlist/${fakeId}`)
      .set('Authorization', `Bearer ${customerHoangToken}`);
    expect(resFake.status).toBe(404);

    // Vehicle that has isDeleted: true
    const deletedBike = await Vehicle.create({
      branchId,
      category: categoryId,
      vehicleModel: 'Deleted Bike Test',
      brand: 'Honda',
      licensePlate: '43-DEL-9999',
      odometer: 500,
      dailyPrice: 100000,
      status: 'Available',
      transmissionType: 'Automatic',
      fuelType: 'Gasoline',
      requiresMaintenance: false,
      isDeleted: true,
    });

    const resDeleted = await request(app)
      .post(`/api/wishlist/${deletedBike._id}`)
      .set('Authorization', `Bearer ${customerHoangToken}`);
    expect(resDeleted.status).toBe(404);

    await Vehicle.findByIdAndDelete(deletedBike._id);
  });

  it('3. Thêm 2 lần -> chỉ 1 bản ghi, không lỗi; xóa 2 lần không lỗi (204)', async () => {
    // First add
    const add1 = await request(app)
      .post(`/api/wishlist/${testVehicle1._id}`)
      .set('Authorization', `Bearer ${customerHoangToken}`);
    expect([200, 201]).toContain(add1.status);
    expect(add1.body.success).toBe(true);

    // Second add (idempotent)
    const add2 = await request(app)
      .post(`/api/wishlist/${testVehicle1._id}`)
      .set('Authorization', `Bearer ${customerHoangToken}`);
    expect([200, 201]).toContain(add2.status);
    expect(add2.body.success).toBe(true);

    // Verify only 1 record in DB
    const countInDb = await Wishlist.countDocuments({
      userId: customerHoangId,
      vehicleId: testVehicle1._id,
    });
    expect(countInDb).toBe(1);

    // First delete -> 204
    const del1 = await request(app)
      .delete(`/api/wishlist/${testVehicle1._id}`)
      .set('Authorization', `Bearer ${customerHoangToken}`);
    expect(del1.status).toBe(204);

    // Second delete (idempotent, item already removed) -> 204
    const del2 = await request(app)
      .delete(`/api/wishlist/${testVehicle1._id}`)
      .set('Authorization', `Bearer ${customerHoangToken}`);
    expect(del2.status).toBe(204);

    const countAfterDelete = await Wishlist.countDocuments({
      userId: customerHoangId,
      vehicleId: testVehicle1._id,
    });
    expect(countAfterDelete).toBe(0);
  });

  it('4. 2 request thêm đồng thời cho cùng xe -> 1 bản ghi, không crash', async () => {
    const req1 = request(app)
      .post(`/api/wishlist/${testVehicle1._id}`)
      .set('Authorization', `Bearer ${customerHoangToken}`);

    const req2 = request(app)
      .post(`/api/wishlist/${testVehicle1._id}`)
      .set('Authorization', `Bearer ${customerHoangToken}`);

    const [res1, res2] = await Promise.all([req1, req2]);

    expect([200, 201]).toContain(res1.status);
    expect([200, 201]).toContain(res2.status);

    const countInDb = await Wishlist.countDocuments({
      userId: customerHoangId,
      vehicleId: testVehicle1._id,
    });
    expect(countInDb).toBe(1);
  });

  it('5. User A không thấy wishlist của User B & GET /api/wishlist/ids', async () => {
    // Hoang has vehicle1
    // Tuan adds vehicle2
    await request(app)
      .post(`/api/wishlist/${testVehicle2._id}`)
      .set('Authorization', `Bearer ${customerTuanToken}`);

    // Hoang calls GET /api/wishlist
    const hoangList = await request(app)
      .get('/api/wishlist')
      .set('Authorization', `Bearer ${customerHoangToken}`);
    expect(hoangList.status).toBe(200);
    const hoangVehicleIds = hoangList.body.data.items.map((i: any) => i.vehicleId.toString());
    expect(hoangVehicleIds).toContain(testVehicle1._id.toString());
    expect(hoangVehicleIds).not.toContain(testVehicle2._id.toString());

    // Hoang calls GET /api/wishlist/ids
    const hoangIds = await request(app)
      .get('/api/wishlist/ids')
      .set('Authorization', `Bearer ${customerHoangToken}`);
    expect(hoangIds.status).toBe(200);
    expect(hoangIds.body.data).toContain(testVehicle1._id.toString());
    expect(hoangIds.body.data).not.toContain(testVehicle2._id.toString());

    // Tuan calls GET /api/wishlist
    const tuanList = await request(app)
      .get('/api/wishlist')
      .set('Authorization', `Bearer ${customerTuanToken}`);
    expect(tuanList.status).toBe(200);
    const tuanVehicleIds = tuanList.body.data.items.map((i: any) => i.vehicleId.toString());
    expect(tuanVehicleIds).toContain(testVehicle2._id.toString());
    expect(tuanVehicleIds).not.toContain(testVehicle1._id.toString());
  });

  it('6. Xe bị xóa sau khi thêm -> vẫn thấy trong GET kèm isAvailable=false', async () => {
    // Create bike 3 and add to Hoang's wishlist
    const bike3 = await Vehicle.create({
      branchId,
      category: categoryId,
      vehicleModel: 'Honda Wave RSX Wishlist Test 3',
      brand: 'Honda',
      licensePlate: '43-WISH-3333',
      odometer: 3000,
      dailyPrice: 120000,
      status: 'Available',
      transmissionType: 'Semi-Auto',
      fuelType: 'Gasoline',
      requiresMaintenance: false,
      isDeleted: false,
    });

    await request(app)
      .post(`/api/wishlist/${bike3._id}`)
      .set('Authorization', `Bearer ${customerHoangToken}`);

    // Verify bike3 initially has isAvailable === true
    let res = await request(app)
      .get('/api/wishlist')
      .set('Authorization', `Bearer ${customerHoangToken}`);
    let item3 = res.body.data.items.find((i: any) => i.vehicleId.toString() === bike3._id.toString());
    expect(item3).toBeDefined();
    expect(item3.isAvailable).toBe(true);

    // Soft delete bike 3
    bike3.isDeleted = true;
    await bike3.save();

    // Now call GET /api/wishlist again
    res = await request(app)
      .get('/api/wishlist')
      .set('Authorization', `Bearer ${customerHoangToken}`);
    item3 = res.body.data.items.find((i: any) => i.vehicleId.toString() === bike3._id.toString());
    expect(item3).toBeDefined();
    expect(item3.isAvailable).toBe(false);
    expect(item3.vehicle).toBeDefined();
    expect(item3.vehicle.vehicleModel).toBe('Honda Wave RSX Wishlist Test 3');

    // Clean up
    await Vehicle.findByIdAndDelete(bike3._id);
  });
});
