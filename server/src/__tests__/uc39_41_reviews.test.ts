import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { app } from '../server';
import { env } from '../config/env';
import { setupTestEnvironment } from './testHelper';
import { User } from '../models/User';
import { Vehicle } from '../models/Vehicle';
import { Booking } from '../models/Booking';
import { Review } from '../models/Review';
import { Branch } from '../models/Branch';
import { Category } from '../models/Category';

describe('UC-39-41: Reviews Integration Tests', () => {
  let customerHoangToken: string;
  let customerTuanToken: string;
  let customerHoangId: string;
  let customerTuanId: string;
  let branchId: string;
  let categoryId: string;
  let testVehicle: any;

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

    // Create a dedicated vehicle for reviews testing
    testVehicle = await Vehicle.create({
      branchId,
      category: categoryId,
      vehicleModel: 'Honda SH 160i ABS Test',
      brand: 'Honda',
      licensePlate: '43-REV-9999',
      odometer: 1500,
      dailyPrice: 350000,
      status: 'Available',
      transmissionType: 'Automatic',
      fuelType: 'Gasoline',
      requiresMaintenance: false,
      isDeleted: false,
      images: ['https://example.com/sh1.jpg'],
      averageRating: 0,
      reviewCount: 0,
    });
  }, 30000);

  afterAll(async () => {
    if (testVehicle) {
      await Vehicle.findByIdAndDelete(testVehicle._id);
    }
    await Review.deleteMany({});
    await mongoose.disconnect();
  }, 10000);

  // Helper to quickly create test bookings
  const createTestBooking = async (userId: string, status: 'Completed' | 'Pending' | 'Ongoing' = 'Completed') => {
    return await Booking.create({
      bookingCode: `MV-REV-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      userId,
      vehicleId: testVehicle._id,
      pickupBranchId: branchId,
      returnBranchId: branchId,
      pickupDateTime: new Date(Date.now() - 86400000 * 3),
      returnDateTime: new Date(Date.now() - 86400000 * 1),
      totalAmount: 700000,
      depositAmount: 210000,
      remainingAmount: 490000,
      discountAmount: 0,
      lateFee: 0,
      damageFee: 0,
      loyaltyPointsEarned: 70,
      status,
      paymentMethod: 'Banking',
      isPaid: true,
      startOdometer: 1000,
      endOdometer: 1500,
    });
  };

  it('1. Tạo review thành công cho booking đã hoàn thành -> 201', async () => {
    const booking = await createTestBooking(customerHoangId, 'Completed');

    const res = await request(app)
      .post(`/api/bookings/${booking._id}/reviews`)
      .set('Authorization', `Bearer ${customerHoangToken}`)
      .send({
        rating: 5,
        comment: 'Xe chạy rất đầm và êm ái, tiếp tân hỗ trợ giao xe nhanh chóng!',
        photos: ['https://example.com/review1.jpg', 'https://example.com/review2.jpg'],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.rating).toBe(5);
    expect(res.body.data.comment).toBe('Xe chạy rất đầm và êm ái, tiếp tân hỗ trợ giao xe nhanh chóng!');
    expect(res.body.data.photos).toHaveLength(2);
    expect(res.body.data.bookingId.toString()).toBe(booking._id.toString());
    expect(res.body.data.vehicleId.toString()).toBe(testVehicle._id.toString());

    // Check Vehicle stats updated
    const updatedVehicle = await Vehicle.findById(testVehicle._id);
    expect(updatedVehicle!.reviewCount).toBe(1);
    expect(updatedVehicle!.averageRating).toBe(5);
  });

  it('2. Booking của người khác -> 404 (IDOR Protection)', async () => {
    const bookingOfHoang = await createTestBooking(customerHoangId, 'Completed');

    // Customer Tuan attempts to review Hoang's booking
    const res = await request(app)
      .post(`/api/bookings/${bookingOfHoang._id}/reviews`)
      .set('Authorization', `Bearer ${customerTuanToken}`)
      .send({
        rating: 4,
        comment: 'Cố tình đánh giá trộm booking người khác',
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('3. Booking chưa hoàn thành -> 400', async () => {
    const pendingBooking = await createTestBooking(customerHoangId, 'Pending');

    const res = await request(app)
      .post(`/api/bookings/${pendingBooking._id}/reviews`)
      .set('Authorization', `Bearer ${customerHoangToken}`)
      .send({
        rating: 5,
        comment: 'Chưa đi xe nhưng muốn đánh giá trước',
      });

    expect([400, 403]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  it('4. Tạo review lần 2 cho cùng 1 booking -> 409 Conflict', async () => {
    const booking = await createTestBooking(customerHoangId, 'Completed');

    // First review
    const res1 = await request(app)
      .post(`/api/bookings/${booking._id}/reviews`)
      .set('Authorization', `Bearer ${customerHoangToken}`)
      .send({
        rating: 4,
        comment: 'Lần 1',
      });
    expect(res1.status).toBe(201);

    // Second review
    const res2 = await request(app)
      .post(`/api/bookings/${booking._id}/reviews`)
      .set('Authorization', `Bearer ${customerHoangToken}`)
      .send({
        rating: 5,
        comment: 'Lần 2 - trùng lặp',
      });

    expect(res2.status).toBe(409);
    expect(res2.body.success).toBe(false);
  });

  it('5. Validation: rating 0 và 6 bị từ chối; 6 ảnh bị từ chối -> 400', async () => {
    const booking = await createTestBooking(customerHoangId, 'Completed');

    // rating 0
    const resRating0 = await request(app)
      .post(`/api/bookings/${booking._id}/reviews`)
      .set('Authorization', `Bearer ${customerHoangToken}`)
      .send({ rating: 0, comment: '0 sao' });
    expect(resRating0.status).toBe(400);

    // rating 6
    const resRating6 = await request(app)
      .post(`/api/bookings/${booking._id}/reviews`)
      .set('Authorization', `Bearer ${customerHoangToken}`)
      .send({ rating: 6, comment: '6 sao' });
    expect(resRating6.status).toBe(400);

    // rating 4.5 (float)
    const resRatingFloat = await request(app)
      .post(`/api/bookings/${booking._id}/reviews`)
      .set('Authorization', `Bearer ${customerHoangToken}`)
      .send({ rating: 4.5, comment: '4.5 sao' });
    expect(resRatingFloat.status).toBe(400);

    // 6 photos
    const res6Photos = await request(app)
      .post(`/api/bookings/${booking._id}/reviews`)
      .set('Authorization', `Bearer ${customerHoangToken}`)
      .send({
        rating: 5,
        photos: [
          'https://example.com/1.jpg',
          'https://example.com/2.jpg',
          'https://example.com/3.jpg',
          'https://example.com/4.jpg',
          'https://example.com/5.jpg',
          'https://example.com/6.jpg',
        ],
      });
    expect(res6Photos.status).toBe(400);

    // comment > 1000 characters
    const longComment = 'a'.repeat(1001);
    const resLongComment = await request(app)
      .post(`/api/bookings/${booking._id}/reviews`)
      .set('Authorization', `Bearer ${customerHoangToken}`)
      .send({ rating: 5, comment: longComment });
    expect(resLongComment.status).toBe(400);
  });

  it('6. Sửa/xóa review của người khác -> 404', async () => {
    const booking = await createTestBooking(customerHoangId, 'Completed');
    const createRes = await request(app)
      .post(`/api/bookings/${booking._id}/reviews`)
      .set('Authorization', `Bearer ${customerHoangToken}`)
      .send({ rating: 5, comment: 'Đánh giá của Hoàng' });
    expect(createRes.status).toBe(201);
    const reviewId = createRes.body.data._id;

    // Tuan tries to PATCH Hoang's review
    const patchRes = await request(app)
      .patch(`/api/reviews/${reviewId}`)
      .set('Authorization', `Bearer ${customerTuanToken}`)
      .send({ rating: 1, comment: 'Sửa bậy bạ' });
    expect(patchRes.status).toBe(404);

    // Tuan tries to DELETE Hoang's review
    const deleteRes = await request(app)
      .delete(`/api/reviews/${reviewId}`)
      .set('Authorization', `Bearer ${customerTuanToken}`);
    expect(deleteRes.status).toBe(404);
  });

  it('7. averageRating/reviewCount chính xác sau khi tạo, sửa rating, và soft delete trong cùng transaction', async () => {
    // Dedicated isolated vehicle for precise calculation checks
    const calcVehicle = await Vehicle.create({
      branchId,
      category: categoryId,
      vehicleModel: 'Yamaha Grande Hybrid Test',
      brand: 'Yamaha',
      licensePlate: '43-CALC-8888',
      odometer: 800,
      dailyPrice: 200000,
      status: 'Available',
      transmissionType: 'Automatic',
      fuelType: 'Gasoline',
      requiresMaintenance: false,
      isDeleted: false,
      averageRating: 0,
      reviewCount: 0,
    });

    try {
      // Step A: Initially 0 reviews
      expect(calcVehicle.averageRating).toBe(0);
      expect(calcVehicle.reviewCount).toBe(0);

      // Create 2 separate completed bookings for calcVehicle
      const b1 = await Booking.create({
        bookingCode: `MV-CALC1-${Date.now()}`,
        userId: customerHoangId,
        vehicleId: calcVehicle._id,
        pickupBranchId: branchId,
        returnBranchId: branchId,
        pickupDateTime: new Date(),
        returnDateTime: new Date(),
        totalAmount: 200000,
        depositAmount: 60000,
        remainingAmount: 140000,
        discountAmount: 0,
        lateFee: 0,
        damageFee: 0,
        loyaltyPointsEarned: 20,
        status: 'Completed',
        paymentMethod: 'Banking',
        isPaid: true,
        startOdometer: 100,
      });

      const b2 = await Booking.create({
        bookingCode: `MV-CALC2-${Date.now()}`,
        userId: customerTuanId,
        vehicleId: calcVehicle._id,
        pickupBranchId: branchId,
        returnBranchId: branchId,
        pickupDateTime: new Date(),
        returnDateTime: new Date(),
        totalAmount: 200000,
        depositAmount: 60000,
        remainingAmount: 140000,
        discountAmount: 0,
        lateFee: 0,
        damageFee: 0,
        loyaltyPointsEarned: 20,
        status: 'Completed',
        paymentMethod: 'Banking',
        isPaid: true,
        startOdometer: 200,
      });

      // Step B: Review 1 with rating = 5
      const resR1 = await request(app)
        .post(`/api/bookings/${b1._id}/reviews`)
        .set('Authorization', `Bearer ${customerHoangToken}`)
        .send({ rating: 5, comment: 'Tuyệt vời' });
      expect(resR1.status).toBe(201);
      const r1Id = resR1.body.data._id;

      let vState = await Vehicle.findById(calcVehicle._id);
      expect(vState!.reviewCount).toBe(1);
      expect(vState!.averageRating).toBe(5);

      // Step C: Review 2 with rating = 4
      const resR2 = await request(app)
        .post(`/api/bookings/${b2._id}/reviews`)
        .set('Authorization', `Bearer ${customerTuanToken}`)
        .send({ rating: 4, comment: 'Khá tốt' });
      expect(resR2.status).toBe(201);
      const r2Id = resR2.body.data._id;

      vState = await Vehicle.findById(calcVehicle._id);
      expect(vState!.reviewCount).toBe(2);
      expect(vState!.averageRating).toBe(4.5); // (5 + 4) / 2 = 4.50

      // Step D: Update Review 2 rating from 4 to 3
      const patchR2 = await request(app)
        .patch(`/api/reviews/${r2Id}`)
        .set('Authorization', `Bearer ${customerTuanToken}`)
        .send({ rating: 3, comment: 'Đổi ý thành 3 sao' });
      expect(patchR2.status).toBe(200);

      vState = await Vehicle.findById(calcVehicle._id);
      expect(vState!.reviewCount).toBe(2);
      expect(vState!.averageRating).toBe(4); // (5 + 3) / 2 = 4.00

      // Step E: Soft delete Review 2
      const delR2 = await request(app)
        .delete(`/api/reviews/${r2Id}`)
        .set('Authorization', `Bearer ${customerTuanToken}`);
      expect(delR2.status).toBe(200);

      vState = await Vehicle.findById(calcVehicle._id);
      expect(vState!.reviewCount).toBe(1);
      expect(vState!.averageRating).toBe(5); // Only R1 (5) remains

      // Verify soft deleted review cannot be patched or deleted again
      const patchDel = await request(app)
        .patch(`/api/reviews/${r2Id}`)
        .set('Authorization', `Bearer ${customerTuanToken}`)
        .send({ rating: 5 });
      expect(patchDel.status).toBe(404);

      const delDel = await request(app)
        .delete(`/api/reviews/${r2Id}`)
        .set('Authorization', `Bearer ${customerTuanToken}`);
      expect(delDel.status).toBe(404);

      // Step F: Soft delete Review 1
      const delR1 = await request(app)
        .delete(`/api/reviews/${r1Id}`)
        .set('Authorization', `Bearer ${customerHoangToken}`);
      expect(delR1.status).toBe(200);

      vState = await Vehicle.findById(calcVehicle._id);
      expect(vState!.reviewCount).toBe(0);
      expect(vState!.averageRating).toBe(0); // No active reviews -> averageRating = 0
    } finally {
      await Vehicle.findByIdAndDelete(calcVehicle._id);
    }
  });

  it('8. Có 2 request tạo review đồng thời cho cùng booking: chỉ 1 thành công', async () => {
    const booking = await createTestBooking(customerHoangId, 'Completed');

    const req1 = request(app)
      .post(`/api/bookings/${booking._id}/reviews`)
      .set('Authorization', `Bearer ${customerHoangToken}`)
      .send({ rating: 5, comment: 'Đồng thời 1' });

    const req2 = request(app)
      .post(`/api/bookings/${booking._id}/reviews`)
      .set('Authorization', `Bearer ${customerHoangToken}`)
      .send({ rating: 4, comment: 'Đồng thời 2' });

    const [res1, res2] = await Promise.all([req1, req2]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([201, 409]);
  });

  it('9. Public list GET /api/vehicles/:vehicleId/reviews: Mới nhất trước, phân trang, không lộ email/sđt', async () => {
    const res = await request(app).get(`/api/vehicles/${testVehicle._id}/reviews?page=1&limit=5`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('reviews');
    expect(res.body.data).toHaveProperty('pagination');
    expect(res.body.data).toHaveProperty('vehicleStats');

    // Check user data privacy
    for (const rev of res.body.data.reviews) {
      expect(rev).not.toHaveProperty('email');
      expect(rev).not.toHaveProperty('phoneNumber');
      expect(rev.user).not.toHaveProperty('email');
      expect(rev.user).not.toHaveProperty('phoneNumber');
      expect(rev.user).toHaveProperty('displayName');
      expect(rev.user.displayName).toMatch(/\b[A-ZÀ-Ỹa-zà-ỹ]+(\s+[A-ZÀ-Ỹa-zà-ỹ]\.|\b)/); // e.g., "Nguyễn H."
    }
  });

  it('10. GET /api/me/reviews: Customer lấy danh sách các review của chính mình', async () => {
    const res = await request(app)
      .get('/api/me/reviews')
      .set('Authorization', `Bearer ${customerHoangToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    for (const r of res.body.data) {
      expect(r.userId.toString()).toBe(customerHoangId);
      expect(r).toHaveProperty('vehicleId');
      expect(r).toHaveProperty('bookingId');
    }
  });
});
