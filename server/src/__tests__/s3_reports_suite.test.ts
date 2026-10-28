import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../server';
import { env } from '../config/env';
import { setupTestEnvironment } from './testHelper';
import { User, Branch, Vehicle, Booking, Payment } from '../models';

describe('S3 Analytics & Reporting Suite (UC-86..92, UC-103..106)', () => {
  let adminToken = '';
  let managerToken = '';
  let staffToken = '';
  let customerToken = '';
  let branchDadId = '';

  beforeAll(async () => {
    await setupTestEnvironment();

    const [adminUser, managerUser, staffUser, customerUser, branchDad, vehicle] = await Promise.all([
      User.findOne({ username: 'admin' }),
      User.findOne({ username: 'manager_dad' }),
      User.findOne({ username: 'staff_dad' }),
      User.findOne({ username: 'customer_hoang' }),
      Branch.findOne({ code: 'CN-DAD' }),
      Vehicle.findOne({ licensePlate: '43-B1 999.88' }),
    ]);

    if (!adminUser || !managerUser || !staffUser || !customerUser || !branchDad || !vehicle) {
      throw new Error('Test fixtures missing for S3 Reports Suite');
    }

    branchDadId = branchDad._id.toString();

    const signToken = (u: { _id: unknown; tokenVersion?: number }) =>
      jwt.sign({ userId: String(u._id), tokenVersion: u.tokenVersion || 0 }, env.JWT_SECRET, {
        expiresIn: '24h',
      });

    adminToken = signToken(adminUser);
    managerToken = signToken(managerUser);
    staffToken = signToken(staffUser);
    customerToken = signToken(customerUser);

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const booking = await Booking.create({
      bookingCode: `MR-REP-${Date.now()}`,
      userId: customerUser._id,
      vehicleId: vehicle._id,
      pickupBranchId: branchDad._id,
      returnBranchId: branchDad._id,
      pickupDateTime: now,
      returnDateTime: tomorrow,
      totalAmount: 300000,
      depositAmount: 90000,
      remainingAmount: 210000,
      discountAmount: 0,
      lateFee: 0,
      damageFee: 0,
      loyaltyPointsEarned: 30,
      status: 'Completed',
      paymentMethod: 'Banking',
      isPaid: true,
      depositPaid: true,
      paidAmount: 300000,
      startOdometer: 3200,
      endOdometer: 3280,
      checkinAt: now,
      checkoutAt: now,
    });

    await Payment.create([
      {
        bookingId: booking._id,
        txnRef: `REP-DEP-${Date.now()}`,
        amount: 90000,
        type: 'DEPOSIT',
        status: 'SUCCESS',
      },
      {
        bookingId: booking._id,
        txnRef: `REP-CNT-${Date.now()}`,
        amount: 210000,
        type: 'COUNTER',
        status: 'SUCCESS',
      },
    ]);
  });

  it('1. UC-86: GET /api/reports/revenue/daily returns daily revenue breakdown & enforces RBAC', async () => {
    const customerRes = await request(app)
      .get('/api/reports/revenue/daily')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(customerRes.status).toBe(403);

    const res = await request(app)
      .get('/api/reports/revenue/daily')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.metrics.onlineDepositRevenue).toBeGreaterThanOrEqual(90000);
    expect(res.body.data.metrics.counterSettlementRevenue).toBeGreaterThanOrEqual(210000);
    expect(res.body.data.metrics.netRevenue).toBeGreaterThanOrEqual(300000);
  });

  it('2. UC-87 & UC-88: GET /api/reports/revenue/monthly returns daily breakdown & growth metrics', async () => {
    const now = new Date();
    const res = await request(app)
      .get(`/api/reports/revenue/monthly?month=${now.getMonth() + 1}&year=${now.getFullYear()}&branchId=${branchDadId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary.totalRevenue).toBeGreaterThanOrEqual(300000);
    expect(Array.isArray(res.body.data.dailyBreakdown)).toBe(true);
    expect(res.body.data.dailyBreakdown.length).toBeGreaterThanOrEqual(28);
  });

  it('3. UC-89: GET /api/reports/export generates valid Excel (.xlsx) & PDF binaries', async () => {
    const excelRes = await request(app)
      .get('/api/reports/export?format=excel&reportType=daily')
      .set('Authorization', `Bearer ${adminToken}`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });

    expect(excelRes.status).toBe(200);
    expect(excelRes.headers['content-type']).toContain('spreadsheetml.sheet');
    expect(Buffer.isBuffer(excelRes.body)).toBe(true);
    expect((excelRes.body as Buffer).subarray(0, 2).toString('ascii')).toBe('PK');

    const pdfRes = await request(app)
      .get('/api/reports/export?format=pdf&reportType=monthly')
      .set('Authorization', `Bearer ${managerToken}`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });

    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers['content-type']).toContain('application/pdf');
    expect((pdfRes.body as Buffer).subarray(0, 4).toString('ascii')).toBe('%PDF');
  });

  it('4. UC-90..92: GET /api/reports/fleet allows Staff, BranchManager, SystemAdmin', async () => {
    const res = await request(app)
      .get('/api/reports/fleet')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalVehicles).toBeGreaterThanOrEqual(1);
    expect(res.body.data.statusBreakdown).toBeDefined();
  });

  it('5. UC-103 & UC-104: Chain revenue & SystemAdmin-only branch comparison', async () => {
    const chainRes = await request(app)
      .get('/api/reports/chain?period=this_month')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(chainRes.status).toBe(200);
    expect(chainRes.body.data.totalChainRevenue).toBeGreaterThanOrEqual(300000);

    const mgrCompareRes = await request(app)
      .get('/api/reports/compare?period=this_month')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(mgrCompareRes.status).toBe(403);

    const adminCompareRes = await request(app)
      .get('/api/reports/compare?period=this_month')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminCompareRes.status).toBe(200);
    expect(adminCompareRes.body.data.highlights).toBeDefined();
  });

  it('6. UC-105 & UC-106: Executive KPI Dashboard & 7-Day Demand Forecast', async () => {
    const [kpiRes, forecastRes] = await Promise.all([
      request(app).get('/api/reports/dashboard').set('Authorization', `Bearer ${adminToken}`),
      request(app).get('/api/reports/forecast').set('Authorization', `Bearer ${managerToken}`),
    ]);

    expect(kpiRes.status).toBe(200);
    expect(kpiRes.body.data.funnel.length).toBe(4);
    expect(kpiRes.body.data.trend.length).toBe(7);

    expect(forecastRes.status).toBe(200);
    expect(forecastRes.body.data.forecast7Days.length).toBe(7);
    expect(Array.isArray(forecastRes.body.data.insights)).toBe(true);
  });
});
