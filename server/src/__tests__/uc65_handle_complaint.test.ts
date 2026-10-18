import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { app } from '../server';
import { env } from '../config/env';
import { setupTestEnvironment, teardownTestEnvironment } from './testHelper';
import { User } from '../models/User';
import { Branch } from '../models/Branch';
import { Vehicle } from '../models/Vehicle';
import { Booking } from '../models/Booking';
import { Complaint, ComplaintResponse, ComplaintStatusLog } from '../models/Complaint';
import { canTransition, getAllowedTransitions } from '../modules/support/complaint-status';

describe('UC-65: Handle Complaint Integration Tests', () => {
  let adminToken: string;
  let managerToken: string;
  let staff1Token: string;
  let staff2Token: string;
  let customerToken: string;

  let staff1User: any;
  let staff2User: any;
  let managerUser: any;
  let customerUser: any;
  let testBooking: any;

  beforeAll(async () => {
    await setupTestEnvironment();

    const admin = await User.findOne({ username: 'admin' });
    adminToken = jwt.sign(
      { userId: admin!._id.toString(), tokenVersion: admin!.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    managerUser = await User.findOne({ username: 'manager_dad' });
    managerToken = jwt.sign(
      { userId: managerUser._id.toString(), tokenVersion: managerUser.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    staff1User = await User.findOne({ username: 'staff_dad' });
    staff1Token = jwt.sign(
      { userId: staff1User._id.toString(), tokenVersion: staff1User.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    staff2User = await User.findOne({ username: 'staff_mk' });
    staff2Token = jwt.sign(
      { userId: staff2User._id.toString(), tokenVersion: staff2User.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    customerUser = await User.findOne({ username: 'customer_hoang' });
    customerToken = jwt.sign(
      { userId: customerUser._id.toString(), tokenVersion: customerUser.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const branch = await Branch.findOne({ code: 'CN-DAD' });
    let vehicle = await Vehicle.findOne({});
    if (!vehicle) {
      vehicle = await Vehicle.create({
        vehicleModel: 'Honda Air Blade 125cc',
        licensePlate: '43-D1 888.99',
        brand: 'Honda',
        branchId: branch!._id,
        currentBranchId: branch!._id,
        dailyRate: 150000,
        status: 'Available',
      });
    }

    testBooking = await Booking.findOne({ userId: customerUser._id });
    if (!testBooking) {
      testBooking = await Booking.create({
        bookingCode: 'MV-TEST01',
        userId: customerUser._id,
        customerId: customerUser._id,
        vehicleId: vehicle._id,
        pickupBranchId: branch!._id,
        returnBranchId: branch!._id,
        pickupDateTime: new Date(),
        returnDateTime: new Date(Date.now() + 86400000),
        status: 'Completed',
        totalAmount: 500000,
        depositAmount: 150000,
      });
    }
  }, 30000);

  afterAll(async () => {
    await Complaint.deleteMany({});
    await ComplaintStatusLog.deleteMany({});
    await ComplaintResponse.deleteMany({});
    await teardownTestEnvironment();
  }, 10000);

  beforeEach(async () => {
    await Complaint.deleteMany({});
    await ComplaintStatusLog.deleteMany({});
    await ComplaintResponse.deleteMany({});
  });

  // ==========================================
  // 1. STATE MACHINE TABLE (PARAMETRIZED)
  // ==========================================
  describe('1. State Machine Table (canTransition & getAllowedTransitions)', () => {
    const validCases = [
      { from: 'Open', to: 'InProgress', role: 'Staff', expected: true },
      { from: 'Open', to: 'InProgress', role: 'BranchManager', expected: true },
      { from: 'Open', to: 'InProgress', role: 'SystemAdmin', expected: true },
      { from: 'InProgress', to: 'Resolved', role: 'Staff', expected: true },
      { from: 'InProgress', to: 'Resolved', role: 'BranchManager', expected: true },
      { from: 'InProgress', to: 'Resolved', role: 'SystemAdmin', expected: true },
      { from: 'Resolved', to: 'Closed', role: 'BranchManager', expected: true },
      { from: 'Resolved', to: 'Closed', role: 'SystemAdmin', expected: true },
    ];

    validCases.forEach(({ from, to, role, expected }) => {
      it(`should allow transition ${from} -> ${to} for role ${role}`, () => {
        expect(canTransition(from, to, role)).toBe(expected);
      });
    });

    const invalidCases = [
      // Staff cannot Close
      { from: 'Resolved', to: 'Closed', role: 'Staff', reason: 'Staff cannot close' },
      // Customer cannot transition anything
      { from: 'Open', to: 'InProgress', role: 'Customer', reason: 'Customer cannot transition' },
      { from: 'InProgress', to: 'Resolved', role: 'Customer', reason: 'Customer cannot transition' },
      { from: 'Resolved', to: 'Closed', role: 'Customer', reason: 'Customer cannot transition' },
      // Closed is terminal state
      { from: 'Closed', to: 'Open', role: 'BranchManager', reason: 'Closed is terminal' },
      { from: 'Closed', to: 'InProgress', role: 'SystemAdmin', reason: 'Closed is terminal' },
      { from: 'Closed', to: 'Resolved', role: 'SystemAdmin', reason: 'Closed is terminal' },
      // Self transitions are forbidden
      { from: 'Open', to: 'Open', role: 'Staff', reason: 'Self transition' },
      { from: 'InProgress', to: 'InProgress', role: 'Staff', reason: 'Self transition' },
      { from: 'Resolved', to: 'Resolved', role: 'BranchManager', reason: 'Self transition' },
      // Skipping steps
      { from: 'Open', to: 'Resolved', role: 'Staff', reason: 'Cannot skip InProgress' },
      { from: 'Open', to: 'Closed', role: 'BranchManager', reason: 'Cannot skip InProgress and Resolved' },
      // Backtracking
      { from: 'InProgress', to: 'Open', role: 'Staff', reason: 'Cannot backtrack InProgress -> Open' },
      { from: 'Resolved', to: 'InProgress', role: 'Staff', reason: 'Cannot backtrack Resolved -> InProgress' },
      { from: 'Resolved', to: 'Open', role: 'BranchManager', reason: 'Cannot backtrack Resolved -> Open' },
    ];

    invalidCases.forEach(({ from, to, role, reason }) => {
      it(`should forbid transition ${from} -> ${to} for role ${role} (${reason})`, () => {
        expect(canTransition(from, to, role)).toBe(false);
      });
    });

    it('getAllowedTransitions should correctly return candidates based on role', () => {
      expect(getAllowedTransitions('Open', 'Staff')).toEqual(['InProgress']);
      expect(getAllowedTransitions('InProgress', 'Staff')).toEqual(['Resolved']);
      expect(getAllowedTransitions('Resolved', 'Staff')).toEqual([]); // Staff cannot close
      expect(getAllowedTransitions('Resolved', 'BranchManager')).toEqual(['Closed']);
      expect(getAllowedTransitions('Closed', 'BranchManager')).toEqual([]);
    });
  });

  // ==========================================
  // 2. RBAC: CUSTOMER CALLS /staff/* -> 403
  // ==========================================
  describe('2. RBAC Permissions: Customer calls /staff/* -> 403', () => {
    it('Customer GET /staff/complaints -> 403', async () => {
      const res = await request(app)
        .get('/staff/complaints')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
    });

    it('Customer GET /staff/complaints/:id -> 403', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/staff/complaints/${fakeId}`)
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
    });

    it('Customer POST /staff/complaints/:id/responses -> 403', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/staff/complaints/${fakeId}/responses`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ message: 'Khách hàng thử gọi API staff' });
      expect(res.status).toBe(403);
    });

    it('Customer PATCH /staff/complaints/:id/status -> 403', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .patch(`/staff/complaints/${fakeId}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ toStatus: 'InProgress' });
      expect(res.status).toBe(403);
    });

    it('Unauthenticated request -> 401', async () => {
      const res = await request(app).get('/staff/complaints');
      expect(res.status).toBe(401);
    });
  });

  // ==========================================
  // 3. GET /staff/complaints (QUEUE & SORTING)
  // ==========================================
  describe('3. Queue Listing (GET /staff/complaints)', () => {
    it('Sorts Open first, then oldest first (createdAt: 1)', async () => {
      const now = Date.now();
      // Create 3 complaints in mixed order:
      // c1: InProgress, createdAt: now - 3000ms
      // c2: Open, createdAt: now - 1000ms
      // c3: Open, createdAt: now - 5000ms (oldest Open)
      const c1 = await Complaint.create({
        code: 'CMP-20261018-0001',
        customerId: customerUser._id,
        category: 'Vehicle',
        title: 'C1 InProgress',
        description: 'Mô tả khiếu nại c1',
        status: 'InProgress',
        createdAt: new Date(now - 3000),
      });

      const c2 = await Complaint.create({
        code: 'CMP-20261018-0002',
        customerId: customerUser._id,
        category: 'Service',
        title: 'C2 Open New',
        description: 'Mô tả khiếu nại c2',
        status: 'Open',
        createdAt: new Date(now - 1000),
      });

      const c3 = await Complaint.create({
        code: 'CMP-20261018-0003',
        customerId: customerUser._id,
        category: 'Payment',
        title: 'C3 Open Oldest',
        description: 'Mô tả khiếu nại c3',
        status: 'Open',
        createdAt: new Date(now - 5000),
      });

      const res = await request(app)
        .get('/staff/complaints')
        .set('Authorization', `Bearer ${staff1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(3);

      // Order should be: c3 (Open, oldest) -> c2 (Open, newer) -> c1 (InProgress)
      expect(res.body.data[0].code).toBe('CMP-20261018-0003');
      expect(res.body.data[1].code).toBe('CMP-20261018-0002');
      expect(res.body.data[2].code).toBe('CMP-20261018-0001');
    });

    it('Searches by complaint code using query "q"', async () => {
      await Complaint.create({
        code: 'CMP-SPECIAL-99',
        customerId: customerUser._id,
        category: 'Vehicle',
        title: 'Tìm kiếm xe',
        description: 'Khiếu nại xe hỏng',
        status: 'Open',
      });
      await Complaint.create({
        code: 'CMP-OTHER-11',
        customerId: customerUser._id,
        category: 'Staff',
        title: 'Khiếu nại nhân viên',
        description: 'Thái độ nhân viên',
        status: 'Open',
      });

      const res = await request(app)
        .get('/staff/complaints?q=SPECIAL')
        .set('Authorization', `Bearer ${staff1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].code).toBe('CMP-SPECIAL-99');
    });

    it('Filters by status, returns 400 if status is invalid', async () => {
      const resInvalid = await request(app)
        .get('/staff/complaints?status=UnknownStatus')
        .set('Authorization', `Bearer ${staff1Token}`);

      expect(resInvalid.status).toBe(400);

      const resValid = await request(app)
        .get('/staff/complaints?status=Open')
        .set('Authorization', `Bearer ${staff1Token}`);

      expect(resValid.status).toBe(200);
    });
  });

  // ==========================================
  // 4. GET /staff/complaints/:id (DETAILS & TIMELINE)
  // ==========================================
  describe('4. Complaint Detail & Timeline (GET /staff/complaints/:id)', () => {
    it('Returns customer details, booking, timeline, and allowedTransitions', async () => {
      const complaint = await Complaint.create({
        code: 'CMP-DETAIL-01',
        customerId: customerUser._id,
        bookingId: testBooking._id,
        category: 'Vehicle',
        title: 'Xe bị thủng lốp',
        description: 'Khách hàng báo xe thủng lốp lúc nhận xe',
        status: 'Open',
        createdAt: new Date(),
      });

      const res = await request(app)
        .get(`/staff/complaints/${complaint._id}`)
        .set('Authorization', `Bearer ${staff1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('CMP-DETAIL-01');
      expect(res.body.data.customerId).toBeDefined();
      expect(res.body.data.customerId.email).toBe(customerUser.email);
      expect(res.body.data.bookingId).toBeDefined();
      expect(res.body.data.timeline).toBeDefined();
      expect(Array.isArray(res.body.data.timeline)).toBe(true);
      expect(res.body.data.allowedTransitions).toEqual(['InProgress']);
    });

    it('Returns 404 for non-existent complaint id', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/staff/complaints/${fakeId}`)
        .set('Authorization', `Bearer ${staff1Token}`);

      expect(res.status).toBe(404);
    });
  });

  // ==========================================
  // 5. STAFF RESPONSES (POST /staff/complaints/:id/responses)
  // ==========================================
  describe('5. Staff Responses (POST /staff/complaints/:id/responses)', () => {
    it('Rejects empty message or message > 2000 chars with 400', async () => {
      const complaint = await Complaint.create({
        code: 'CMP-RESP-01',
        customerId: customerUser._id,
        category: 'Vehicle',
        description: 'Nội dung khiếu nại',
        status: 'Open',
      });

      const resEmpty = await request(app)
        .post(`/staff/complaints/${complaint._id}/responses`)
        .set('Authorization', `Bearer ${staff1Token}`)
        .send({ message: '   ' });

      expect(resEmpty.status).toBe(400);

      const resTooLong = await request(app)
        .post(`/staff/complaints/${complaint._id}/responses`)
        .set('Authorization', `Bearer ${staff1Token}`)
        .send({ message: 'A'.repeat(2001) });

      expect(resTooLong.status).toBe(400);
    });

    it('Adding response to Open complaint auto-transitions Open -> InProgress, sets handledBy, and creates status log', async () => {
      const complaint = await Complaint.create({
        code: 'CMP-RESP-AUTO',
        customerId: customerUser._id,
        category: 'Vehicle',
        description: 'Khách hàng gửi khiếu nại chưa xử lý',
        status: 'Open',
      });

      const res = await request(app)
        .post(`/staff/complaints/${complaint._id}/responses`)
        .set('Authorization', `Bearer ${staff1Token}`)
        .send({ message: 'Chào bạn, nhân viên đã tiếp nhận thông tin và đang kiểm tra.' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      // Verify complaint is now InProgress and handledBy = staff1
      const updated = await Complaint.findById(complaint._id);
      expect(updated!.status).toBe('InProgress');
      expect(updated!.handledBy?.toString()).toBe(staff1User._id.toString());

      // Verify ComplaintStatusLog has been created
      const logs = await ComplaintStatusLog.find({ complaintId: complaint._id });
      expect(logs.length).toBe(1);
      expect(logs[0].fromStatus).toBe('Open');
      expect(logs[0].toStatus).toBe('InProgress');
      expect(logs[0].changedBy.toString()).toBe(staff1User._id.toString());
      expect(logs[0].changedByRole).toBe('Staff');
    });

    it('Adding response to Closed complaint returns 409', async () => {
      const complaint = await Complaint.create({
        code: 'CMP-CLOSED-RESP',
        customerId: customerUser._id,
        category: 'Vehicle',
        description: 'Khiếu nại đã đóng',
        status: 'Closed',
        finalResolution: 'Đã hoàn tiền cho khách',
        closedAt: new Date(),
      });

      const res = await request(app)
        .post(`/staff/complaints/${complaint._id}/responses`)
        .set('Authorization', `Bearer ${staff1Token}`)
        .send({ message: 'Thử phản hồi vào khiếu nại đã đóng' });

      expect(res.status).toBe(409);
    });
  });

  // ==========================================
  // 6. STATUS TRANSITIONS & RULES
  // ==========================================
  describe('6. Status Transitions (PATCH /staff/complaints/:id/status)', () => {
    it('Open -> InProgress by Staff sets handledBy and creates ComplaintStatusLog', async () => {
      const complaint = await Complaint.create({
        code: 'CMP-STAT-01',
        customerId: customerUser._id,
        category: 'Vehicle',
        description: 'Xe bị xước nhẹ',
        status: 'Open',
      });

      const res = await request(app)
        .patch(`/staff/complaints/${complaint._id}/status`)
        .set('Authorization', `Bearer ${staff1Token}`)
        .send({ toStatus: 'InProgress', note: 'Staff1 nhận xử lý khiếu nại' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('InProgress');

      const updated = await Complaint.findById(complaint._id);
      expect(updated!.status).toBe('InProgress');
      expect(updated!.handledBy?.toString()).toBe(staff1User._id.toString());

      const logs = await ComplaintStatusLog.find({ complaintId: complaint._id });
      expect(logs.length).toBe(1);
      expect(logs[0].fromStatus).toBe('Open');
      expect(logs[0].toStatus).toBe('InProgress');
    });

    it('Invalid state machine transition (Open -> Resolved) returns 409', async () => {
      const complaint = await Complaint.create({
        code: 'CMP-STAT-INVALID',
        customerId: customerUser._id,
        category: 'Vehicle',
        description: 'Thử nhảy bước trạng thái',
        status: 'Open',
      });

      const res = await request(app)
        .patch(`/staff/complaints/${complaint._id}/status`)
        .set('Authorization', `Bearer ${staff1Token}`)
        .send({ toStatus: 'Resolved' });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('Open');
      expect(res.body.message).toContain('Resolved');
    });

    it('Staff calls Resolved -> Closed returns 403 (or 409)', async () => {
      const complaint = await Complaint.create({
        code: 'CMP-RESOLVED-TO-CLOSED',
        customerId: customerUser._id,
        category: 'Vehicle',
        description: 'Khiếu nại đang ở Resolved',
        status: 'Resolved',
        handledBy: staff1User._id,
      });

      const res = await request(app)
        .patch(`/staff/complaints/${complaint._id}/status`)
        .set('Authorization', `Bearer ${staff1Token}`)
        .send({ toStatus: 'Closed' });

      expect([403, 409]).toContain(res.status);
    });

    it('InProgress -> Resolved when NO staff response returns 400', async () => {
      const complaint = await Complaint.create({
        code: 'CMP-NO-RESP',
        customerId: customerUser._id,
        category: 'Vehicle',
        description: 'Đang xử lý nhưng chưa ai phản hồi',
        status: 'InProgress',
        handledBy: staff1User._id,
      });

      const res = await request(app)
        .patch(`/staff/complaints/${complaint._id}/status`)
        .set('Authorization', `Bearer ${staff1Token}`)
        .send({ toStatus: 'Resolved' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('phản hồi');
    });

    it('InProgress -> Resolved succeeds after at least 1 staff response', async () => {
      const complaint = await Complaint.create({
        code: 'CMP-WITH-RESP',
        customerId: customerUser._id,
        category: 'Vehicle',
        description: 'Đang xử lý đã có phản hồi',
        status: 'InProgress',
        handledBy: staff1User._id,
      });

      // Add a staff response
      await ComplaintResponse.create({
        complaintId: complaint._id,
        authorId: staff1User._id,
        authorRole: 'Staff',
        message: 'Đã giải quyết sự cố cho quý khách.',
      });

      const res = await request(app)
        .patch(`/staff/complaints/${complaint._id}/status`)
        .set('Authorization', `Bearer ${staff1Token}`)
        .send({ toStatus: 'Resolved', note: 'Đã thống nhất phương án với khách' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Resolved');

      const logs = await ComplaintStatusLog.find({ complaintId: complaint._id });
      expect(logs.length).toBe(1);
      expect(logs[0].fromStatus).toBe('InProgress');
      expect(logs[0].toStatus).toBe('Resolved');
    });

    it('Staff2 cannot update complaint handled by Staff1 (returns 403), but Manager can (200)', async () => {
      const complaint = await Complaint.create({
        code: 'CMP-HANDLED-BY-STAFF1',
        customerId: customerUser._id,
        category: 'Vehicle',
        description: 'Staff1 đang phụ trách',
        status: 'InProgress',
        handledBy: staff1User._id,
      });

      await ComplaintResponse.create({
        complaintId: complaint._id,
        authorId: staff1User._id,
        authorRole: 'Staff',
        message: 'Staff1 phản hồi',
      });

      // Staff2 attempts to resolve complaint handled by Staff1 -> 403
      const resStaff2 = await request(app)
        .patch(`/staff/complaints/${complaint._id}/status`)
        .set('Authorization', `Bearer ${staff2Token}`)
        .send({ toStatus: 'Resolved' });

      expect(resStaff2.status).toBe(403);

      // Manager can update status of complaint handled by Staff1 -> 200
      const resManager = await request(app)
        .patch(`/staff/complaints/${complaint._id}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ toStatus: 'Resolved', note: 'Quản lý phê duyệt' });

      expect(resManager.status).toBe(200);
      expect(resManager.body.data.status).toBe('Resolved');
    });
  });

  // ==========================================
  // 7. CONCURRENCY: 2 REQUESTS ĐỔI STATUS ĐỒNG THỜI
  // ==========================================
  describe('7. Concurrency: 2 simultaneous status update requests -> Only 1 succeeds', () => {
    it('2 concurrent status change requests -> Exactly 1 succeeds (200) and 1 fails (409)', async () => {
      const complaint = await Complaint.create({
        code: 'CMP-CONCURRENT-01',
        customerId: customerUser._id,
        category: 'Vehicle',
        description: 'Kiểm tra xung đột đồng thời',
        status: 'InProgress',
        handledBy: staff1User._id,
      });

      await ComplaintResponse.create({
        complaintId: complaint._id,
        authorId: staff1User._id,
        authorRole: 'Staff',
        message: 'Nhân viên đã kiểm tra',
      });

      // Fire 2 simultaneous PATCH requests to change InProgress -> Resolved
      const req1 = request(app)
        .patch(`/staff/complaints/${complaint._id}/status`)
        .set('Authorization', `Bearer ${staff1Token}`)
        .send({ toStatus: 'Resolved', note: 'Request 1' });

      const req2 = request(app)
        .patch(`/staff/complaints/${complaint._id}/status`)
        .set('Authorization', `Bearer ${staff1Token}`)
        .send({ toStatus: 'Resolved', note: 'Request 2' });

      const [res1, res2] = await Promise.all([req1, req2]);

      const statuses = [res1.status, res2.status];
      expect(statuses).toContain(200);
      expect(statuses).toContain(409);

      // Verify exactly 1 status log entry was created for the transition
      const logs = await ComplaintStatusLog.find({ complaintId: complaint._id });
      expect(logs.length).toBe(1);
    });
  });
});
