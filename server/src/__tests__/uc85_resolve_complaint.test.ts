import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../server';
import { setupTestEnvironment } from './testHelper';
import { Complaint, ComplaintStatusLog, ComplaintResponse } from '../models/Complaint';
import { Booking } from '../models/Booking';
import { User } from '../models/User';
import { Branch } from '../models/Branch';
import { disconnectDatabase } from '../config/database';

describe('UC-85: Resolve Complaint (Manager Resolution & Close)', () => {
  let managerToken: string;
  let adminToken: string;
  let staffToken: string;
  let customerToken: string;
  let customerUserId: string;
  let sampleBookingId: string;
  let sampleBranchId: string;

  beforeAll(async () => {
    await setupTestEnvironment();

    // 1. Authenticate Manager (BranchManager)
    const managerRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'manager_dad', password: 'Manager@123456' });
    expect(managerRes.status).toBe(200);
    managerToken = managerRes.body.data.token;

    // 2. Authenticate Admin (SystemAdmin)
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'admin', password: 'Admin@123456' });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.data.token;

    // 3. Authenticate Staff
    const staffRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'staff_dad', password: 'Staff@123456' });
    expect(staffRes.status).toBe(200);
    staffToken = staffRes.body.data.token;

    // 4. Authenticate Customer
    const customerRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'customer_hoang', password: 'Customer@123456' });
    expect(customerRes.status).toBe(200);
    customerToken = customerRes.body.data.token;
    customerUserId = customerRes.body.data.user._id;

    // Retrieve sample booking & branch
    const booking = await Booking.findOne();
    if (booking) {
      sampleBookingId = booking._id.toString();
    }
    const branch = await Branch.findOne();
    if (branch) {
      sampleBranchId = branch._id.toString();
    }
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('1. Manager Pending Complaints Queue (GET /manager/complaints/pending)', () => {
    let inProgressId: string;
    let resolvedId: string;
    let openId: string;
    let closedId: string;

    beforeAll(async () => {
      // Clean test complaints
      await Complaint.deleteMany({});
      await ComplaintStatusLog.deleteMany({});
      await ComplaintResponse.deleteMany({});

      // Create test complaints in various states
      const cOpen = await Complaint.create({
        code: 'CMP-20261018-0001',
        customerId: customerUserId,
        bookingId: sampleBookingId,
        branchId: sampleBranchId,
        category: 'Vehicle',
        title: 'Khiếu nại xe bị rung',
        description: 'Xe bị rung lắc khi chạy ở tốc độ 40km/h.',
        status: 'Open',
        priority: 'Medium',
      });
      openId = cOpen._id.toString();

      const cInProgress = await Complaint.create({
        code: 'CMP-20261018-0002',
        customerId: customerUserId,
        bookingId: sampleBookingId,
        branchId: sampleBranchId,
        category: 'Service',
        title: 'Nhân viên giao xe trễ',
        description: 'Nhân viên giao trễ 30 phút tại sân bay.',
        status: 'InProgress',
        priority: 'High',
      });
      inProgressId = cInProgress._id.toString();

      const cResolved = await Complaint.create({
        code: 'CMP-20261018-0003',
        customerId: customerUserId,
        bookingId: sampleBookingId,
        branchId: sampleBranchId,
        category: 'Payment',
        title: 'Chưa nhận hoàn tiền cọc',
        description: 'Đã hoàn tất chuyến đi nhưng chưa thấy hoàn cọc.',
        status: 'Resolved',
        priority: 'Urgent',
        finalResolution: 'Đã đối soát với ngân hàng và hoàn cọc 30% cho khách.',
      });
      resolvedId = cResolved._id.toString();

      const cClosed = await Complaint.create({
        code: 'CMP-20261018-0004',
        customerId: customerUserId,
        bookingId: sampleBookingId,
        branchId: sampleBranchId,
        category: 'Staff',
        title: 'Thái độ phục vụ',
        description: 'Khiếu nại đã đóng hoàn tất.',
        status: 'Closed',
        priority: 'Low',
        finalResolution: 'Quản lý đã gọi điện xin lỗi và tặng voucher giảm giá.',
        closedAt: new Date(),
      });
      closedId = cClosed._id.toString();
    });

    it('GET /manager/complaints/pending returns only InProgress or Resolved complaints, not Open or Closed', async () => {
      const res = await request(app)
        .get('/manager/complaints/pending')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const returnedCodes = res.body.data.map((c: { code: string }) => c.code);
      expect(returnedCodes).toContain('CMP-20261018-0002'); // InProgress
      expect(returnedCodes).toContain('CMP-20261018-0003'); // Resolved
      expect(returnedCodes).not.toContain('CMP-20261018-0001'); // Open (excluded)
      expect(returnedCodes).not.toContain('CMP-20261018-0004'); // Closed (excluded)
    });

    it('Staff calling /manager/complaints/pending returns 403 Forbidden', async () => {
      const res = await request(app)
        .get('/manager/complaints/pending')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('2. Resolution Logic (POST /manager/complaints/:id/resolve)', () => {
    let inProgressComplaintId: string;
    let resolvedComplaintId: string;
    let openComplaintId: string;

    beforeAll(async () => {
      const cOpen = await Complaint.create({
        code: 'CMP-TEST-OPEN-01',
        customerId: customerUserId,
        bookingId: sampleBookingId,
        branchId: sampleBranchId,
        category: 'Vehicle',
        title: 'Xe hỏng đèn xi nhan',
        description: 'Đèn xi nhan bên phải không sáng khi bật công tắc.',
        status: 'Open',
      });
      openComplaintId = cOpen._id.toString();

      const cInProgress = await Complaint.create({
        code: 'CMP-TEST-INPROGRESS-01',
        customerId: customerUserId,
        bookingId: sampleBookingId,
        branchId: sampleBranchId,
        category: 'Service',
        title: 'Mũ bảo hiểm không vừa kích cỡ',
        description: 'Mũ bảo hiểm bị chật, yêu cầu đổi mũ kích thước L.',
        status: 'InProgress',
      });
      inProgressComplaintId = cInProgress._id.toString();

      const cResolved = await Complaint.create({
        code: 'CMP-TEST-RESOLVED-01',
        customerId: customerUserId,
        bookingId: sampleBookingId,
        branchId: sampleBranchId,
        category: 'Payment',
        title: 'Tính sai giờ trả xe',
        description: 'Bị phụ thu thêm 1 giờ mặc dù trả đúng hẹn.',
        status: 'Resolved',
        finalResolution: 'Staff kiểm tra camera và xác nhận khách trả đúng giờ.',
      });
      resolvedComplaintId = cResolved._id.toString();
    });

    it('Resolve complaint Open returns 409 Conflict (must be processed by staff first)', async () => {
      const res = await request(app)
        .post(`/manager/complaints/${openComplaintId}/resolve`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          finalResolution: 'Quản lý muốn kết luận ngay khi chưa nhân viên nào tiếp nhận.',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/Open|nhân viên/i);
    });

    it('Resolve from InProgress -> Resolved: updates status, sets finalResolution, sets resolvedBy, creates status log', async () => {
      const initialLogsCount = await ComplaintStatusLog.countDocuments({
        complaintId: inProgressComplaintId,
      });

      const resolutionText =
        'Đã điều phối kỹ thuật viên mang 02 mũ bảo hiểm size L mới đến khách sạn cho khách.';

      const res = await request(app)
        .post(`/manager/complaints/${inProgressComplaintId}/resolve`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          finalResolution: resolutionText,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Resolved');
      expect(res.body.data.finalResolution).toBe(resolutionText);
      expect(res.body.data.resolvedBy).toBeDefined();

      // Verify DB state
      const dbComplaint = await Complaint.findById(inProgressComplaintId);
      expect(dbComplaint?.status).toBe('Resolved');
      expect(dbComplaint?.finalResolution).toBe(resolutionText);
      expect(dbComplaint?.resolvedBy).toBeDefined();

      // Verify status log was created: InProgress -> Resolved
      const newLogsCount = await ComplaintStatusLog.countDocuments({
        complaintId: inProgressComplaintId,
      });
      expect(newLogsCount).toBe(initialLogsCount + 1);

      const latestLog = await ComplaintStatusLog.findOne({
        complaintId: inProgressComplaintId,
        toStatus: 'Resolved',
      });
      expect(latestLog).toBeDefined();
      expect(latestLog?.fromStatus).toBe('InProgress');
    });

    it('Resolve when already Resolved: only updates content and resolvedBy, does NOT create new status log', async () => {
      const logsBefore = await ComplaintStatusLog.countDocuments({
        complaintId: resolvedComplaintId,
      });

      const updatedResolutionText =
        'Cập nhật kết luận: Kế toán đã chuyển khoản hoàn lại 30.000đ tiền phụ thu giờ qua số tài khoản khách.';

      const res = await request(app)
        .post(`/manager/complaints/${resolvedComplaintId}/resolve`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          finalResolution: updatedResolutionText,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.finalResolution).toBe(updatedResolutionText);

      // Verify DB was updated
      const dbComplaint = await Complaint.findById(resolvedComplaintId);
      expect(dbComplaint?.finalResolution).toBe(updatedResolutionText);

      // Verify NO additional status log was added
      const logsAfter = await ComplaintStatusLog.countDocuments({
        complaintId: resolvedComplaintId,
      });
      expect(logsAfter).toBe(logsBefore);
    });

    it('Resolve validates finalResolution length (must be 10 - 3000 chars)', async () => {
      // Too short (< 10 chars)
      const resShort = await request(app)
        .post(`/manager/complaints/${resolvedComplaintId}/resolve`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          finalResolution: 'Xong nhé',
        });
      expect(resShort.status).toBe(400);

      // Missing or empty
      const resEmpty = await request(app)
        .post(`/manager/complaints/${resolvedComplaintId}/resolve`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          finalResolution: '   ',
        });
      expect(resEmpty.status).toBe(400);
    });

    it('Staff calling resolve returns 403 Forbidden', async () => {
      const res = await request(app)
        .post(`/manager/complaints/${resolvedComplaintId}/resolve`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          finalResolution: 'Nhân viên thử đưa ra kết luận cuối cùng trái phép.',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('3. Close Complaint Logic (POST /manager/complaints/:id/close)', () => {
    let inProgressId: string;
    let resolvedWithoutFinalResId: string;
    let validResolvedId: string;

    beforeAll(async () => {
      const cInProgress = await Complaint.create({
        code: 'CMP-CLOSE-INPROGRESS',
        customerId: customerUserId,
        bookingId: sampleBookingId,
        branchId: sampleBranchId,
        category: 'Vehicle',
        title: 'Xe bị thủng lốp',
        description: 'Xe bị dính đinh trên đường Bạch Đằng.',
        status: 'InProgress',
      });
      inProgressId = cInProgress._id.toString();

      const cNoRes = await Complaint.create({
        code: 'CMP-CLOSE-NO-RES',
        customerId: customerUserId,
        bookingId: sampleBookingId,
        branchId: sampleBranchId,
        category: 'Service',
        title: 'Chưa có kết luận',
        description: 'Đã đổi trạng thái Resolved nhưng chưa ghi kết luận.',
        status: 'Resolved',
        finalResolution: null,
      });
      resolvedWithoutFinalResId = cNoRes._id.toString();

      const cValid = await Complaint.create({
        code: 'CMP-CLOSE-VALID',
        customerId: customerUserId,
        bookingId: sampleBookingId,
        branchId: sampleBranchId,
        category: 'Payment',
        title: 'Hợp đồng cần đóng',
        description: 'Mọi thủ tục đã giải quyết thỏa đáng cho khách hàng.',
        status: 'Resolved',
        finalResolution: 'Khách hàng đã đồng ý bồi thường và hoàn tất tất toán.',
      });
      validResolvedId = cValid._id.toString();
    });

    it('Close from InProgress returns 409 Conflict', async () => {
      const res = await request(app)
        .post(`/manager/complaints/${inProgressId}/close`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/InProgress|Resolved/i);
    });

    it('Close when missing finalResolution returns 400 Bad Request', async () => {
      const res = await request(app)
        .post(`/manager/complaints/${resolvedWithoutFinalResId}/close`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/finalResolution|kết luận/i);
    });

    it('Staff calling close returns 403 Forbidden', async () => {
      const res = await request(app)
        .post(`/manager/complaints/${validResolvedId}/close`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(403);
    });

    it('Close valid Resolved complaint: status becomes Closed, closedAt is set, status log is recorded', async () => {
      const res = await request(app)
        .post(`/manager/complaints/${validResolvedId}/close`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Closed');
      expect(res.body.data.closedAt).toBeDefined();

      // Verify DB
      const dbComplaint = await Complaint.findById(validResolvedId);
      expect(dbComplaint?.status).toBe('Closed');
      expect(dbComplaint?.closedAt).toBeDefined();

      // Verify status log: Resolved -> Closed
      const log = await ComplaintStatusLog.findOne({
        complaintId: validResolvedId,
        toStatus: 'Closed',
      });
      expect(log).toBeDefined();
      expect(log?.fromStatus).toBe('Resolved');
    });
  });

  describe('4. Post-Closed Immutability & Rejections', () => {
    let closedComplaintId: string;

    beforeAll(async () => {
      const cClosed = await Complaint.create({
        code: 'CMP-IMMUTABLE-01',
        customerId: customerUserId,
        bookingId: sampleBookingId,
        branchId: sampleBranchId,
        category: 'Other',
        title: 'Khiếu nại đã đóng vĩnh viễn',
        description: 'Vụ việc đã kết thúc và lưu trữ.',
        status: 'Closed',
        finalResolution: 'Đã giải quyết trọn vẹn và đóng hồ sơ.',
        closedAt: new Date(),
      });
      closedComplaintId = cClosed._id.toString();
    });

    it('Resolve on Closed complaint returns 409 Conflict', async () => {
      const res = await request(app)
        .post(`/manager/complaints/${closedComplaintId}/resolve`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          finalResolution: 'Cố gắng sửa kết luận của khiếu nại đã đóng.',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/Closed|đóng/i);
    });

    it('Close on already Closed complaint returns 409 Conflict', async () => {
      const res = await request(app)
        .post(`/manager/complaints/${closedComplaintId}/close`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(409);
    });

    it('Adding response to Closed complaint returns 409 Conflict', async () => {
      const res = await request(app)
        .post(`/staff/complaints/${closedComplaintId}/response`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          message: 'Nhân viên gửi thêm tin nhắn sau khi hồ sơ đã đóng.',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/Closed|đóng/i);
    });
  });

  describe('5. Customer View in UC-43: finalResolution is properly displayed', () => {
    let activeResolvedComplaintId: string;

    beforeAll(async () => {
      const c = await Complaint.create({
        code: 'CMP-UC43-CHECK',
        customerId: customerUserId,
        bookingId: sampleBookingId,
        branchId: sampleBranchId,
        category: 'Vehicle',
        title: 'Gương chiếu hậu bị lỏng',
        description: 'Gương bên trái bị xoay khi chạy nhanh trên đường đèo.',
        status: 'Resolved',
        finalResolution:
          'Chi nhánh đã siết chặt lại ốc gương và tặng khách hàng 01 ngày thuê miễn phí cho lần sau.',
      });
      activeResolvedComplaintId = c._id.toString();
    });

    it('Customer GET /complaints/:id returns finalResolution for Resolved complaint', async () => {
      const res = await request(app)
        .get(`/complaints/${activeResolvedComplaintId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.finalResolution).toBe(
        'Chi nhánh đã siết chặt lại ốc gương và tặng khách hàng 01 ngày thuê miễn phí cho lần sau.'
      );
    });
  });
});
