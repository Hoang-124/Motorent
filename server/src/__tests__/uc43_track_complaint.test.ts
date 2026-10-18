import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { app } from '../server';
import { env } from '../config/env';
import { setupTestEnvironment, teardownTestEnvironment } from './testHelper';
import { User } from '../models/User';
import { Booking } from '../models/Booking';
import { Vehicle } from '../models/Vehicle';
import { Branch } from '../models/Branch';
import { Complaint, ComplaintStatusLog, ComplaintResponse } from '../models/Complaint';

describe('UC-43: Track Complaint (Customer)', () => {
  let customer1Token: string;
  let customer2Token: string;
  let staffToken: string;
  let customer1Id: string;
  let customer2Id: string;
  let staffId: string;

  let complaint1OpenId: string;
  let complaint1ResolvedId: string;
  let complaint1InProgressId: string;
  let complaint2OpenId: string;

  let testBookingId: string;
  let testBookingCode: string;

  beforeAll(async () => {
    await setupTestEnvironment();

    const customer1 = await User.findOne({ username: 'customer_hoang' });
    const customer2 = await User.findOne({ username: 'customer_tuan' });
    const staff = await User.findOne({ username: 'staff_dad' });
    const vehicle = await Vehicle.findOne({ status: 'Available' });
    const branch = await Branch.findOne({ code: 'CN-DAD' });

    if (!customer1 || !customer2 || !staff || !vehicle || !branch) {
      throw new Error('Test fixtures missing');
    }

    customer1Id = customer1._id.toString();
    customer2Id = customer2._id.toString();
    staffId = staff._id.toString();

    customer1Token = jwt.sign(
      { userId: customer1Id, role: customer1.roles, tokenVersion: customer1.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    customer2Token = jwt.sign(
      { userId: customer2Id, role: customer2.roles, tokenVersion: customer2.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    staffToken = jwt.sign(
      { userId: staffId, role: staff.roles, tokenVersion: staff.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Create a booking for customer1
    testBookingCode = `MV-TC${Date.now().toString().slice(-6)}`;
    const booking = await Booking.create({
      bookingCode: testBookingCode,
      userId: customer1._id,
      vehicleId: vehicle._id,
      pickupBranchId: branch._id,
      returnBranchId: branch._id,
      pickupDateTime: new Date(),
      returnDateTime: new Date(Date.now() + 86400000 * 2),
      totalAmount: 300000,
      depositAmount: 90000,
      remainingAmount: 210000,
      status: 'Confirmed',
    });
    testBookingId = booking._id.toString();

    // Clean dynamic complaint collections
    await Complaint.deleteMany({});
    await ComplaintStatusLog.deleteMany({});
    await ComplaintResponse.deleteMany({});

    // 1. Complaint 1 for Customer 1 (Status: Open, linked to booking)
    const c1 = await Complaint.create({
      code: 'CP-20261018-001',
      customerId: customer1._id,
      bookingId: booking._id,
      category: 'Vehicle',
      title: 'Xe bị rung đầu khi lên ga',
      description: 'Xe Honda Air Blade đi qua cầu Rồng bị rung giật nhẹ phần đầu xe khi kéo ga ở tốc độ 30km/h.',
      attachments: ['https://example.com/photo1.jpg'],
      status: 'Open',
      createdAt: new Date(Date.now() - 3600000 * 5), // 5 hours ago
    });
    complaint1OpenId = c1._id.toString();

    // 2. Complaint 2 for Customer 1 (Status: InProgress)
    const c2 = await Complaint.create({
      code: 'CP-20261018-002',
      customerId: customer1._id,
      category: 'Service',
      title: 'Thời gian chờ nhận xe lâu',
      description: 'Chờ tại quầy 25 phút mới hoàn tất bàn giao xe.',
      status: 'InProgress',
      createdAt: new Date(Date.now() - 3600000 * 4), // 4 hours ago
    });
    complaint1InProgressId = c2._id.toString();

    // 3. Complaint 3 for Customer 1 (Status: Resolved, with finalResolution)
    const c3 = await Complaint.create({
      code: 'CP-20261018-003',
      customerId: customer1._id,
      bookingId: booking._id,
      category: 'Payment',
      title: 'Thắc mắc khoản hoàn cọc 30%',
      description: 'Đã hủy đơn trước 48h nhưng chưa thấy tiền cọc hoàn về ví VNPay.',
      status: 'Resolved',
      finalResolution: 'Đã tra soát mã giao dịch VNPay VNP142998, số tiền 90.000đ đã hoàn vào tài khoản quý khách.',
      resolvedBy: staff._id,
      resolvedAt: new Date(Date.now() - 3600000 * 1),
      createdAt: new Date(Date.now() - 3600000 * 3), // 3 hours ago
    });
    complaint1ResolvedId = c3._id.toString();

    // 4. Complaint for Customer 2 (Belongs to different customer)
    const c4 = await Complaint.create({
      code: 'CP-20261018-004',
      customerId: customer2._id,
      category: 'Other',
      title: 'Khiếu nại của Tuấn',
      description: 'Vấn đề kỹ thuật riêng của khách hàng Tuấn.',
      status: 'Open',
      createdAt: new Date(Date.now() - 3600000 * 2),
    });
    complaint2OpenId = c4._id.toString();

    // Add status logs and responses to complaint1Resolved for timeline verification
    // T1: Initial creation log (3 hours ago)
    await ComplaintStatusLog.create({
      complaintId: c3._id,
      fromStatus: null,
      toStatus: 'Open',
      changedBy: customer1._id,
      changedByRole: 'Customer',
      note: 'Khách hàng tạo khiếu nại qua ứng dụng',
      createdAt: new Date(Date.now() - 3600000 * 3),
    });

    // T2: Staff status log to InProgress (2 hours ago)
    await ComplaintStatusLog.create({
      complaintId: c3._id,
      fromStatus: 'Open',
      toStatus: 'InProgress',
      changedBy: staff._id,
      changedByRole: 'Staff',
      note: 'Nhân viên bắt đầu kiểm tra giao dịch hoàn tiền',
      createdAt: new Date(Date.now() - 3600000 * 2),
    });

    // T3: Staff response message (1.5 hours ago)
    await ComplaintResponse.create({
      complaintId: c3._id,
      authorId: staff._id,
      authorRole: 'Staff',
      message: 'Chào bạn, chúng tôi đã gửi yêu cầu đối soát sang cổng thanh toán VNPay.',
      createdAt: new Date(Date.now() - 3600000 * 1.5),
    });

    // T4: Resolution status log (1 hour ago)
    await ComplaintStatusLog.create({
      complaintId: c3._id,
      fromStatus: 'InProgress',
      toStatus: 'Resolved',
      changedBy: staff._id,
      changedByRole: 'Staff',
      note: 'Khiếu nại được giải quyết và hoàn tất',
      createdAt: new Date(Date.now() - 3600000 * 1),
    });
  }, 30000);

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  // =========================================================================
  // Test Suite 1: GET /me/complaints (Listing & Status Filtering)
  // =========================================================================
  describe('GET /me/complaints (List customer complaints)', () => {
    it('1. List chỉ thấy complaint của user hiện tại, sắp xếp mới nhất trước', async () => {
      const res = await request(app)
        .get('/me/complaints')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const items = Array.isArray(res.body.data) ? res.body.data : res.body.data?.items;
      expect(Array.isArray(items)).toBe(true);

      // Customer 1 has exactly 3 complaints
      expect(items.length).toBe(3);

      // Must NOT contain complaint2 belonging to customer 2
      const hasCustomer2Complaint = items.some(
        (c: { _id?: string; id?: string }) => (c._id || c.id) === complaint2OpenId
      );
      expect(hasCustomer2Complaint).toBe(false);

      // Check order: newest first (createdAt descending)
      for (let i = 0; i < items.length - 1; i++) {
        const tCurrent = new Date(items[i].createdAt).getTime();
        const tNext = new Date(items[i + 1].createdAt).getTime();
        expect(tCurrent).toBeGreaterThanOrEqual(tNext);
      }
    });

    it('2. Customer 2 chỉ thấy 1 complaint của chính mình', async () => {
      const res = await request(app)
        .get('/me/complaints')
        .set('Authorization', `Bearer ${customer2Token}`);

      expect(res.status).toBe(200);
      const items = Array.isArray(res.body.data) ? res.body.data : res.body.data?.items;
      expect(items.length).toBe(1);
      expect(items[0]._id).toBe(complaint2OpenId);
    });

    it('3. Lọc theo status đúng: ?status=Open chỉ trả các complaint Open', async () => {
      const res = await request(app)
        .get('/me/complaints?status=Open')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      const items = Array.isArray(res.body.data) ? res.body.data : res.body.data?.items;
      expect(items.length).toBe(1);
      expect(items[0]._id).toBe(complaint1OpenId);
      expect(items[0].status).toBe('Open');
    });

    it('4. Lọc theo status đúng: ?status=Resolved chỉ trả complaint Resolved', async () => {
      const res = await request(app)
        .get('/me/complaints?status=Resolved')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      const items = Array.isArray(res.body.data) ? res.body.data : res.body.data?.items;
      expect(items.length).toBe(1);
      expect(items[0]._id).toBe(complaint1ResolvedId);
      expect(items[0].status).toBe('Resolved');
    });

    it('5. Lọc status giá trị lạ không thuộc enum (Open|InProgress|Resolved|Closed) -> 400', async () => {
      const res = await request(app)
        .get('/me/complaints?status=InvalidStatusValue')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('không hợp lệ');
    });

    it('6. Route alias /api/me/complaints cũng hoạt động đồng nhất', async () => {
      const res = await request(app)
        .get('/api/me/complaints')
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      const items = Array.isArray(res.body.data) ? res.body.data : res.body.data?.items;
      expect(items.length).toBe(3);
    });

    it('7. Chưa đăng nhập gọi GET /me/complaints -> 401', async () => {
      const res = await request(app).get('/me/complaints');
      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // Test Suite 2: GET /me/complaints/:id (Security 404 Guard on IDOR)
  // =========================================================================
  describe('GET /me/complaints/:id (Detail & IDOR Protection)', () => {
    it('1. Xem complaint người khác -> 404 (không dùng 403 để không lộ sự tồn tại)', async () => {
      // Customer 1 tries to view Customer 2's complaint
      const res = await request(app)
        .get(`/me/complaints/${complaint2OpenId}`)
        .set('Authorization', `Bearer ${customer1Token}`);

      // MUST BE 404, NOT 403!
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('2. Xem complaint không tồn tại -> 404', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/me/complaints/${fakeId}`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(404);
    });

    it('3. Customer xem complaint của chính mình -> 200 kèm đầy đủ thông tin tóm tắt', async () => {
      const res = await request(app)
        .get(`/me/complaints/${complaint1OpenId}`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data._id).toBe(complaint1OpenId);
      expect(data.code).toBe('CP-20261018-001');
      expect(data.category).toBe('Vehicle');
      expect(data.description).toContain('rung giật nhẹ');
      expect(Array.isArray(data.attachments)).toBe(true);
      expect(data.status).toBe('Open');

      // Booking summary present
      expect(data.booking).toBeTruthy();
      expect(data.booking.bookingCode).toBe(testBookingCode);
      expect(data.booking.vehicle).toContain('Honda');
    });
  });

  // =========================================================================
  // Test Suite 3: finalResolution Visibility Guard
  // =========================================================================
  describe('finalResolution visibility rule', () => {
    it('1. finalResolution bị ẩn khi complaint chưa Resolved (Open) -> undefined/null', async () => {
      const res = await request(app)
        .get(`/me/complaints/${complaint1OpenId}`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      // finalResolution must be undefined (or omitted) for Open complaint
      expect(res.body.data.finalResolution).toBeUndefined();
    });

    it('2. finalResolution bị ẩn khi complaint là InProgress -> undefined/null', async () => {
      const res = await request(app)
        .get(`/me/complaints/${complaint1InProgressId}`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.finalResolution).toBeUndefined();
    });

    it('3. finalResolution hiển thị khi complaint đã Resolved', async () => {
      const res = await request(app)
        .get(`/me/complaints/${complaint1ResolvedId}`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.finalResolution).toBeTruthy();
      expect(res.body.data.finalResolution).toContain('90.000đ đã hoàn vào tài khoản');
    });
  });

  // =========================================================================
  // Test Suite 4: Timeline Order & Privacy Guard (No Employee PII)
  // =========================================================================
  describe('Timeline chronological order and Employee Privacy', () => {
    it('1. Timeline đúng thứ tự thời gian tăng dần (createdAt ASC)', async () => {
      const res = await request(app)
        .get(`/me/complaints/${complaint1ResolvedId}`)
        .set('Authorization', `Bearer ${customer1Token}`);

      expect(res.status).toBe(200);
      const timeline = res.body.data.timeline;
      expect(Array.isArray(timeline)).toBe(true);
      expect(timeline.length).toBeGreaterThanOrEqual(4);

      // Verify chronological order (oldest to newest)
      for (let i = 0; i < timeline.length - 1; i++) {
        const t1 = new Date(timeline[i].createdAt).getTime();
        const t2 = new Date(timeline[i + 1].createdAt).getTime();
        expect(t1).toBeLessThanOrEqual(t2);
      }
    });

    it('2. Timeline gộp cả status và response đúng type', async () => {
      const res = await request(app)
        .get(`/me/complaints/${complaint1ResolvedId}`)
        .set('Authorization', `Bearer ${customer1Token}`);

      const timeline = res.body.data.timeline;
      const statusItems = timeline.filter((t: { type: string }) => t.type === 'status');
      const responseItems = timeline.filter((t: { type: string }) => t.type === 'response');

      expect(statusItems.length).toBeGreaterThanOrEqual(1);
      expect(responseItems.length).toBeGreaterThanOrEqual(1);

      // Content exists on items
      expect(responseItems[0].content).toContain('chúng tôi đã gửi yêu cầu đối soát');
    });

    it('3. Timeline KHÔNG để lộ thông tin cá nhân của nhân viên (email, phone, employee ID)', async () => {
      const res = await request(app)
        .get(`/me/complaints/${complaint1ResolvedId}`)
        .set('Authorization', `Bearer ${customer1Token}`);

      const timeline = res.body.data.timeline;

      for (const item of timeline) {
        // Must contain name and role
        expect(item.performedBy).toBeTruthy();
        expect(typeof item.performedBy.name).toBe('string');
        expect(typeof item.performedBy.role).toBe('string');

        // MUST NOT contain email, phone, or raw user ID
        expect(item.performedBy.email).toBeUndefined();
        expect(item.performedBy.phoneNumber).toBeUndefined();
        expect(item.performedBy.phone).toBeUndefined();
        expect(item.performedBy._id).toBeUndefined();
        expect(item.performedBy.id).toBeUndefined();

        // Also check root item for leaks
        expect(item.email).toBeUndefined();
        expect(item.phone).toBeUndefined();
        expect(item.phoneNumber).toBeUndefined();
        expect(item.staffId).toBeUndefined();
        expect(item.authorId).toBeUndefined();
        expect(item.changedBy).toBeUndefined();
      }
    });
  });
});
