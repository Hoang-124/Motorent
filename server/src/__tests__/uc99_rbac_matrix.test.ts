import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { app } from '../server';
import { env } from '../config/env';
import { setupTestEnvironment } from './testHelper';
import { User } from '../models/User';
import { Branch } from '../models/Branch';
import { PERMISSION_MATRIX, hasPermission, assertBranchAccess } from '../core/permissions';

describe('UC-99: RBAC Matrix & Role-Based Authorization Enforcement', () => {
  let adminToken: string;
  let managerToken: string;
  let staffToken: string;
  let customerToken: string;

  let branchDADId: mongoose.Types.ObjectId;
  let branchMKId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    await setupTestEnvironment();

    const admin = await User.findOne({ username: 'admin' });
    const staff = await User.findOne({ username: 'staff_dad' });
    const customer = await User.findOne({ username: 'customer_hoang' });
    const branchDAD = await Branch.findOne({ code: 'CN-DAD' });
    const branchMK = await Branch.findOne({ code: 'CN-MK' });

    if (!admin || !staff || !customer || !branchDAD || !branchMK) {
      throw new Error('Test fixtures missing');
    }

    branchDADId = branchDAD._id as mongoose.Types.ObjectId;
    branchMKId = branchMK._id as mongoose.Types.ObjectId;

    // Create manager
    let manager = await User.findOne({ username: 'manager_dad' });
    if (!manager) {
      manager = await User.create({
        username: 'manager_dad',
        email: 'manager.dad@motorent.vn',
        passwordHash: '$2a$10$hashedpasswordplaceholder',
        firstName: 'Nguyễn Văn',
        lastName: 'Quản Lý Sân Bay',
        phoneNumber: '0905111222',
        roles: 'BranchManager',
        status: 'Active',
        branchId: branchDADId,
        identityStatus: 'Verified',
        tokenVersion: 0,
        isEmailVerified: true,
      });
    }

    adminToken = jwt.sign(
      { userId: admin._id.toString(), tokenVersion: admin.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    managerToken = jwt.sign(
      { userId: manager._id.toString(), tokenVersion: manager.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    staffToken = jwt.sign(
      { userId: staff._id.toString(), tokenVersion: staff.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    customerToken = jwt.sign(
      { userId: customer._id.toString(), tokenVersion: customer.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }, 30000);

  afterAll(async () => {
    await mongoose.disconnect();
  }, 10000);

  it('1. Rejects unauthenticated request to /api/system/permissions (401 Unauthorized)', async () => {
    const res = await request(app).get('/api/system/permissions');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('2. Rejects Customer role accessing internal RBAC matrix (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/system/permissions')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('không có quyền');
  });

  it('3. Successfully returns full 4-role RBAC matrix for Staff (200 OK)', async () => {
    const res = await request(app)
      .get('/api/system/permissions')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe('Staff');
    expect(res.body.data.roles).toEqual(
      expect.arrayContaining(['SystemAdmin', 'BranchManager', 'Staff', 'Customer'])
    );
    expect(res.body.data.matrix).toBeDefined();
    expect(res.body.data.modules).toBeDefined();
    expect(res.body.data.roleDescriptions).toBeDefined();

    // Verify Staff has operational permissions
    expect(res.body.data.permissions).toContain('BOOKING_CHECKIN');
    expect(res.body.data.permissions).toContain('BOOKING_CHECKOUT');
    expect(res.body.data.permissions).toContain('BOOKING_COUNTER_PAY');
    expect(res.body.data.permissions).not.toContain('AUDIT_VIEW');
    expect(res.body.data.permissions).not.toContain('BRANCH_MANAGE');
  });

  it('4. Returns correct permissions for BranchManager (200 OK)', async () => {
    const res = await request(app)
      .get('/api/system/permissions')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('BranchManager');
    expect(res.body.data.permissions).toContain('FINANCE_RECONCILE');
    expect(res.body.data.permissions).toContain('VEHICLE_MANAGE');
    expect(res.body.data.permissions).toContain('STAFF_SCHEDULE');
    expect(res.body.data.permissions).not.toContain('AUDIT_VIEW');
    expect(res.body.data.permissions).not.toContain('FINANCE_TAX_REPORT');
  });

  it('5. Returns global permissions for SystemAdmin (200 OK)', async () => {
    const res = await request(app)
      .get('/api/system/permissions')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('SystemAdmin');
    expect(res.body.data.permissions).toContain('AUDIT_VIEW');
    expect(res.body.data.permissions).toContain('USER_MANAGE');
    expect(res.body.data.permissions).toContain('FINANCE_TAX_REPORT');
    expect(res.body.data.permissions).toContain('BRANCH_MANAGE');
  });

  it('6. hasPermission helper correctly evaluates role capability against matrix', () => {
    expect(hasPermission('SystemAdmin', 'AUDIT_VIEW')).toBe(true);
    expect(hasPermission('BranchManager', 'AUDIT_VIEW')).toBe(false);
    expect(hasPermission('Staff', 'AUDIT_VIEW')).toBe(false);
    expect(hasPermission('Customer', 'AUDIT_VIEW')).toBe(false);

    expect(hasPermission('Customer', 'BOOKING_CREATE')).toBe(true);
    expect(hasPermission('Customer', 'BOOKING_CHECKIN')).toBe(false);
    expect(hasPermission('Staff', 'BOOKING_CHECKIN')).toBe(true);
    expect(hasPermission('BranchManager', 'BOOKING_CHECKIN')).toBe(true);
  });

  it('7. assertBranchAccess correctly allows SystemAdmin anywhere and restricts Staff/Manager', () => {
    const adminUser = { roles: 'SystemAdmin' as const };
    const dadManager = {
      roles: 'BranchManager' as const,
      branchId: branchDADId,
    };

    // SystemAdmin passes any branch without error
    expect(() => assertBranchAccess(adminUser, branchMKId)).not.toThrow();

    // DAD Manager passes DAD branch
    expect(() => assertBranchAccess(dadManager, branchDADId)).not.toThrow();

    // DAD Manager throws 403 on MK branch
    expect(() => assertBranchAccess(dadManager, branchMKId)).toThrow(
      'Bạn không có quyền thao tác trên dữ liệu của chi nhánh khác'
    );
  });

  it('8. Enforces Admin-only endpoint protection (/api/finance/tax-report)', async () => {
    // Customer -> 403
    const resCust = await request(app)
      .get('/api/finance/tax-report')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(resCust.status).toBe(403);

    // Staff -> 403
    const resStaff = await request(app)
      .get('/api/finance/tax-report')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(resStaff.status).toBe(403);

    // Manager -> 403
    const resMgr = await request(app)
      .get('/api/finance/tax-report')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(resMgr.status).toBe(403);

    // Admin -> 200
    const resAdmin = await request(app)
      .get('/api/finance/tax-report')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resAdmin.status).toBe(200);
  });

  it('9. Enforces Staff/Internal endpoint protection (/api/audit)', async () => {
    // Customer -> 403
    const resCust = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(resCust.status).toBe(403);

    // Staff -> 200
    const resStaff = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(resStaff.status).toBe(200);

    // Manager -> 200
    const resMgr = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(resMgr.status).toBe(200);

    // Admin -> 200
    const resAdmin = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resAdmin.status).toBe(200);
  });
});
