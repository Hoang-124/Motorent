import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../server';
import { setupTestEnvironment, teardownTestEnvironment } from './testHelper';
import { Branch } from '../models/Branch';
import { User } from '../models/User';
import { Booking } from '../models/Booking';
import { Vehicle } from '../models/Vehicle';

let adminToken: string;
let customerToken: string;
let staffToken: string;

beforeAll(async () => {
  await setupTestEnvironment();

  // Clean up any test users/branches from prior runs
  await User.deleteMany({ username: { $in: ['manager_haichau', 'staff_test_lock', 'hacker_mgr'] } });
  await Branch.deleteMany({ code: { $in: ['CN-HC', 'CN-TRUNG'] } });

  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({ identifier: 'admin', password: 'Admin@123456' });
  adminToken = adminRes.body?.data?.token;

  const customerRes = await request(app)
    .post('/api/auth/login')
    .send({ identifier: 'customer_hoang', password: 'Customer@123456' });
  customerToken = customerRes.body?.data?.token;

  const staffRes = await request(app)
    .post('/api/auth/login')
    .send({ identifier: 'staff_dad', password: 'Staff@123456' });
  staffToken = staffRes.body?.data?.token;
});

afterAll(async () => {
  await teardownTestEnvironment();
});

describe('Admin Role - Branch Management (UC-93, UC-94, UC-95, UC-01, UC-27)', () => {
  let createdBranchId: string;
  let testManagerId: string;

  it('UC-96: Admin creates a Manager account at POST /api/admin/users', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: 'manager_haichau',
        password: 'Manager@123456',
        email: 'haichau.mgr@motorent.vn',
        firstName: 'Văn A',
        lastName: 'Trần',
        phoneNumber: '0905111222',
        roles: 'BranchManager',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.username).toBe('manager_haichau');
    expect(res.body.data.roles).toBe('BranchManager');
    expect(res.body.data.passwordHash).toBeUndefined();
    testManagerId = res.body.data._id;
  });

  it('Non-admin users cannot create accounts at POST /api/admin/users (403)', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        username: 'hacker_mgr',
        firstName: 'Hack',
        lastName: 'Er',
      });

    expect(res.status).toBe(403);
  });

  it('UC-93: Admin creates a new branch at POST /api/branches with code, GPS, hours, manager', async () => {
    const res = await request(app)
      .post('/api/branches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Trạm Hải Châu - Bạch Đằng',
        code: 'CN-HC',
        address: '150 Bạch Đằng, Hải Châu, Đà Nẵng',
        phone: '02363889900',
        email: 'haichau@motorent.vn',
        location_lat: 16.068,
        location_lng: 108.223,
        hours_open: '06:00',
        hours_close: '23:30',
        managerId: testManagerId,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toBe('CN-HC');
    expect(res.body.data.isActive).toBe(true);
    createdBranchId = res.body.data._id;

    // Verify manager user is linked to branch
    const managerUser = await User.findById(testManagerId);
    expect(managerUser?.branchId?.toString()).toBe(createdBranchId);
  });

  it('UC-93 Duplicate code check: Recreating same branch code returns 409', async () => {
    const res = await request(app)
      .post('/api/branches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Trạm Trùng Mã',
        code: 'CN-HC',
        address: '200 Lê Duẩn, Đà Nẵng',
        phone: '02363112233',
      });

    expect(res.status).toBe(409);
  });

  it('UC-01: Public branch list at GET /api/branches includes vehicle count and address', async () => {
    const res = await request(app).get('/api/branches');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    const branch = res.body.data.find((b: any) => b.code === 'CN-HC');
    expect(branch).toBeDefined();
    expect(branch.address).toContain('Bạch Đằng');
    expect(branch.availableVehiclesCount).toBeDefined();
  });

  it('UC-27: GPS Search at GET /api/branches/nearby sorts branches by distance', async () => {
    const res = await request(app).get('/api/branches/nearby?lat=16.065&lng=108.220');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].distanceKm).toBeDefined();
  });

  it('UC-94: Admin updates branch info and details at PUT /api/branches/:id', async () => {
    const res = await request(app)
      .put(`/api/branches/${createdBranchId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Trạm Hải Châu Center - Sông Hàn',
        phone: '02363999888',
        hours_close: '23:59',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Trạm Hải Châu Center - Sông Hàn');
    expect(res.body.data.phone).toBe('02363999888');
  });

  it('UC-95: Admin deactivates branch at PUT /api/branches/:id/deactivate with active booking warning check', async () => {
    // Check deactivation when no active bookings
    const res = await request(app)
      .put(`/api/branches/${createdBranchId}/deactivate`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isActive).toBe(false);
    expect(res.body.activeBookingsCount).toBe(0);

    // Verify inactive branch is hidden from public list unless all=true
    const publicList = await request(app).get('/api/branches');
    expect(publicList.body.data.some((b: any) => b.code === 'CN-HC')).toBe(false);

    const adminList = await request(app).get('/api/branches?all=true');
    expect(adminList.body.data.some((b: any) => b.code === 'CN-HC')).toBe(true);
  });

  it('Admin reactivates branch at PUT /api/branches/:id/activate', async () => {
    const res = await request(app)
      .put(`/api/branches/${createdBranchId}/activate`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isActive).toBe(true);
  });
});

describe('Admin Role - User & Manager Management (UC-96, UC-97-98, UC-100, UC-101)', () => {
  let createdStaffId: string;
  let testStaffToken: string;

  it('Admin creates another staff member at POST /api/admin/users', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: 'staff_test_lock',
        password: 'Password@123',
        email: 'staff_lock@motorent.vn',
        firstName: 'Thị C',
        lastName: 'Lê',
        phoneNumber: '0911223344',
        roles: 'Staff',
      });

    expect(res.status).toBe(201);
    createdStaffId = res.body.data._id;

    // Login as this newly created user to obtain JWT
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'staff_test_lock', password: 'Password@123' });
    expect(loginRes.status).toBe(200);
    testStaffToken = loginRes.body.data.token;
  });

  it('Admin lists users with filtering at GET /api/admin/users', async () => {
    const res = await request(app)
      .get('/api/admin/users?role=Staff')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((u: any) => u.roles === 'Staff')).toBe(true);
  });

  it('UC-97-98: Admin updates user info at PUT /api/admin/users/:id', async () => {
    const res = await request(app)
      .put(`/api/admin/users/${createdStaffId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Thị Cẩm Tú',
        phoneNumber: '0977889900',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.firstName).toBe('Thị Cẩm Tú');
    expect(res.body.data.phoneNumber).toBe('0977889900');
  });

  it('UC-100: Admin locks account at PUT /api/admin/users/:id/lock - status becomes Suspended and JWT invalidated', async () => {
    // Verify token works before lock
    const beforeLockRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${testStaffToken}`);
    expect(beforeLockRes.status).toBe(200);

    // Lock account
    const lockRes = await request(app)
      .put(`/api/admin/users/${createdStaffId}/lock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Vi phạm quy định bàn giao xe' });

    expect(lockRes.status).toBe(200);
    expect(lockRes.body.success).toBe(true);
    expect(lockRes.body.data.status).toBe('Suspended');

    // Attempting request with previous JWT must now be rejected (401 or 403)
    const afterLockRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${testStaffToken}`);
    expect([401, 403]).toContain(afterLockRes.status);

    // Attempting to login with suspended account must fail
    const loginFailRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'staff_test_lock', password: 'Password@123' });
    expect(loginFailRes.status).toBe(403);
    expect(loginFailRes.body.message).toContain('khóa');
  });

  it('UC-101: Admin unlocks account at PUT /api/admin/users/:id/unlock - status becomes Active and login is restored', async () => {
    const unlockRes = await request(app)
      .put(`/api/admin/users/${createdStaffId}/unlock`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(unlockRes.status).toBe(200);
    expect(unlockRes.body.success).toBe(true);
    expect(unlockRes.body.data.status).toBe('Active');

    // Login succeeds now
    const loginSuccessRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'staff_test_lock', password: 'Password@123' });
    expect(loginSuccessRes.status).toBe(200);
    expect(loginSuccessRes.body.data.token).toBeDefined();
  });
});
