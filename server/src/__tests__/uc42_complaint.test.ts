import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { app } from '../server';
import { env } from '../config/env';
import { setupTestEnvironment } from './testHelper';
import { User, IUser } from '../models/User';
import { Booking, IBooking } from '../models/Booking';
import { Branch } from '../models/Branch';
import { Vehicle } from '../models/Vehicle';
import { Complaint, ComplaintStatusLog } from '../models/Complaint';

describe('UC-42: Submit Complaint', () => {
  let customerToken: string;
  let otherCustomerToken: string;
  let customerUser: IUser;
  let otherUser: IUser;
  let testBooking: IBooking;
  let otherBooking: IBooking;

  // Minimal valid 1x1 JPEG buffer
  const validJpegBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    0x00, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01,
    0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff,
    0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0xbf, 0x00, 0xff, 0xd9
  ]);

  // Minimal valid PDF buffer
  const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n');

  beforeAll(async () => {
    await setupTestEnvironment();

    const customer = await User.findOne({ username: 'customer_hoang' });
    const other = await User.findOne({ username: 'customer_tuan' });
    const branch = await Branch.findOne({ code: 'CN-DAD' });
    const vehicle = await Vehicle.findOne();

    if (!customer || !other || !branch || !vehicle) {
      throw new Error('Test fixtures missing');
    }

    customerUser = customer;
    otherUser = other;

    customerToken = jwt.sign(
      { userId: customer._id.toString(), tokenVersion: customer.tokenVersion || 0, role: customer.roles },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    otherCustomerToken = jwt.sign(
      { userId: other._id.toString(), tokenVersion: other.tokenVersion || 0, role: other.roles },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Create bookings for each customer
    testBooking = await Booking.create({
      bookingCode: 'BK-TEST-HOANG',
      userId: customer._id,
      vehicleId: vehicle._id,
      pickupBranchId: branch._id,
      returnBranchId: branch._id,
      pickupDateTime: new Date(),
      returnDateTime: new Date(Date.now() + 86400000),
      totalDays: 1,
      totalAmount: 200000,
      depositAmount: 60000,
      remainingAmount: 140000,
      status: 'Completed',
    });

    otherBooking = await Booking.create({
      bookingCode: 'BK-TEST-TUAN',
      userId: other._id,
      vehicleId: vehicle._id,
      pickupBranchId: branch._id,
      returnBranchId: branch._id,
      pickupDateTime: new Date(),
      returnDateTime: new Date(Date.now() + 86400000),
      totalDays: 1,
      totalAmount: 200000,
      depositAmount: 60000,
      remainingAmount: 140000,
      status: 'Completed',
    });
  }, 30000);

  beforeEach(async () => {
    await Complaint.deleteMany({});
    await ComplaintStatusLog.deleteMany({});
  });

  describe('GET /complaints/categories', () => {
    it('should return complaint categories list', async () => {
      const res = await request(app).get('/complaints/categories');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.categories).toContain('Vehicle');
      expect(res.body.categories).toContain('Service');
      expect(res.body.categories).toContain('Payment');
      expect(res.body.categories).toContain('Staff');
      expect(res.body.categories).toContain('Other');
    });

    it('should also work on /api/complaints/categories', async () => {
      const res = await request(app).get('/api/complaints/categories');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /complaints - Authentication & Authorization', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app)
        .post('/complaints')
        .field('bookingId', testBooking._id.toString())
        .field('category', 'Vehicle')
        .field('description', 'Xe bị chết máy giữa đường trên đèo Hải Vân.');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /complaints - Validation Rules', () => {
    it('should reject non-existent booking with 404', async () => {
      const fakeBookingId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post('/complaints')
        .set('Authorization', `Bearer ${customerToken}`)
        .field('bookingId', fakeBookingId)
        .field('category', 'Vehicle')
        .field('description', 'Xe bị hỏng phanh không sử dụng được.');

      expect(res.status).toBe(404);
    });

    it('should reject booking belonging to another customer with 404', async () => {
      const res = await request(app)
        .post('/complaints')
        .set('Authorization', `Bearer ${customerToken}`)
        .field('bookingId', otherBooking._id.toString())
        .field('category', 'Service')
        .field('description', 'Dịch vụ hỗ trợ chậm trễ, không liên lạc được hotline.');

      expect(res.status).toBe(404);
    });

    it('should reject invalid category with 400', async () => {
      const res = await request(app)
        .post('/complaints')
        .set('Authorization', `Bearer ${customerToken}`)
        .field('bookingId', testBooking._id.toString())
        .field('category', 'InvalidCategory')
        .field('description', 'Mô tả khiếu nại dài hơn 10 ký tự.');

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Danh mục khiếu nại không hợp lệ/i);
    });

    it('should reject missing or short description (< 10 chars) with 400', async () => {
      const res = await request(app)
        .post('/complaints')
        .set('Authorization', `Bearer ${customerToken}`)
        .field('bookingId', testBooking._id.toString())
        .field('category', 'Vehicle')
        .field('description', 'Quá tệ');

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/ít nhất 10 ký tự/i);
    });

    it('should reject whitespace-only or trimmed < 10 chars description with 400', async () => {
      const res = await request(app)
        .post('/complaints')
        .set('Authorization', `Bearer ${customerToken}`)
        .field('bookingId', testBooking._id.toString())
        .field('category', 'Vehicle')
        .field('description', '   12345   ');

      expect(res.status).toBe(400);
    });
  });

  describe('POST /complaints - Successful Creation & Invariants', () => {
    it('should create complaint successfully: status=Open, unique code, 1 status log', async () => {
      const res = await request(app)
        .post('/complaints')
        .set('Authorization', `Bearer ${customerToken}`)
        .field('bookingId', testBooking._id.toString())
        .field('category', 'Vehicle')
        .field('description', 'Xe bị rò rỉ dầu nhớt và hao xăng bất thường trong chuyến đi.');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();

      const complaintId = res.body.data._id || res.body.data.id;
      expect(complaintId).toBeDefined();

      // Check code format: CMP-YYYYMMDD-XXXX
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const codeRegex = new RegExp(`^CMP-${todayStr}-[0-9A-Z]{4}$`);
      expect(res.body.data.code).toMatch(codeRegex);

      // Verify status is Open
      expect(res.body.data.status).toBe('Open');

      // Verify customerId matches authenticated customer
      expect(res.body.data.customerId.toString()).toBe(customerUser._id.toString());

      // Verify ComplaintStatusLog has exactly 1 entry with fromStatus=null, toStatus=Open
      const logs = await ComplaintStatusLog.find({ complaintId: new mongoose.Types.ObjectId(complaintId) });
      expect(logs.length).toBe(1);
      expect(logs[0].fromStatus).toBeNull();
      expect(logs[0].toStatus).toBe('Open');
      expect(logs[0].changedBy.toString()).toBe(customerUser._id.toString());
    });

    it('should ignore client-supplied status=Closed and customerId, forcing status=Open', async () => {
      const fakeCustomerId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post('/complaints')
        .set('Authorization', `Bearer ${customerToken}`)
        .field('bookingId', testBooking._id.toString())
        .field('category', 'Payment')
        .field('description', 'Giao dịch trừ tiền 2 lần qua cổng thanh toán VNPay.')
        .field('status', 'Closed')
        .field('customerId', fakeCustomerId);

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('Open');
      expect(res.body.data.customerId.toString()).toBe(customerUser._id.toString());
    });

    it('should support file attachments up to 5 files (jpg/png/pdf)', async () => {
      const res = await request(app)
        .post('/complaints')
        .set('Authorization', `Bearer ${customerToken}`)
        .field('bookingId', testBooking._id.toString())
        .field('category', 'Vehicle')
        .field('description', 'Hình ảnh thực tế xe bị xước từ trước khi nhận xe.')
        .attach('attachments', validJpegBuffer, 'evidence1.jpg')
        .attach('attachments', validPdfBuffer, 'invoice.pdf');

      expect(res.status).toBe(201);
      expect(res.body.data.attachments).toBeDefined();
      expect(res.body.data.attachments.length).toBe(2);
      expect(res.body.data.attachments[0]).toMatch(/^\/uploads\//);
      expect(res.body.data.attachments[1]).toMatch(/^\/uploads\//);
    });

    it('should reject invalid file extensions with 400', async () => {
      const invalidBuffer = Buffer.from('console.log("malicious")');
      const res = await request(app)
        .post('/complaints')
        .set('Authorization', `Bearer ${customerToken}`)
        .field('bookingId', testBooking._id.toString())
        .field('category', 'Vehicle')
        .field('description', 'Tệp đính kèm chứa mã độc hại.')
        .attach('attachments', invalidBuffer, 'malware.exe');

      expect(res.status).toBe(400);
    });
  });

  describe('POST /complaints - Anti-spam rate limiting (5/day)', () => {
    it('should block 6th complaint in the same day with 429', async () => {
      // Create 5 complaints directly in DB for this customer today
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const complaintsToInsert = [];
      for (let i = 1; i <= 5; i++) {
        complaintsToInsert.push({
          code: `CMP-20261018-000${i}`,
          customerId: customerUser._id,
          bookingId: testBooking._id,
          branchId: testBooking.pickupBranchId,
          category: 'Vehicle',
          description: `Khiếu nại số ${i} đã được gửi trong ngày hôm nay.`,
          status: 'Open',
          createdAt: new Date(),
        });
      }
      await Complaint.insertMany(complaintsToInsert);

      // Attempt 6th complaint
      const res = await request(app)
        .post('/complaints')
        .set('Authorization', `Bearer ${customerToken}`)
        .field('bookingId', testBooking._id.toString())
        .field('category', 'Service')
        .field('description', 'Khiếu nại thứ 6 gửi trong ngày sẽ bị chặn bởi hệ thống anti-spam.');

      expect(res.status).toBe(429);
      expect(res.body.message).toMatch(/tối đa 5 khiếu nại/i);
    });
  });
});
