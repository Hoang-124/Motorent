import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../server';
import { env } from '../config/env';
import { setupTestEnvironment } from './testHelper';
import { Booking } from '../models/Booking';
import { Vehicle } from '../models/Vehicle';
import { Branch } from '../models/Branch';
import { User } from '../models/User';

describe('UC-35: Rental History (Status Tabs & Pagination)', () => {
  let customerToken: string;
  let customerUser: any;
  let vehicleDoc: any;
  let branchDAD: any;
  const createdBookingIds: any[] = [];

  beforeAll(async () => {
    await setupTestEnvironment();

    customerUser = await User.findOne({ username: 'customer_hoang' });
    vehicleDoc = await Vehicle.findOne({ status: 'Available' });
    branchDAD = await Branch.findOne({ code: 'CN-DAD' });

    if (!customerUser || !vehicleDoc || !branchDAD) {
      throw new Error('Test fixtures missing in database');
    }

    customerToken = jwt.sign(
      { userId: customerUser._id.toString(), tokenVersion: customerUser.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Seed test bookings with different statuses
    const now = Date.now();
    const testData = [
      { code: `MV-HSTA${now.toString().slice(-5)}`, status: 'Pending', total: 300000 },
      { code: `MV-HSTB${now.toString().slice(-5)}`, status: 'Ongoing', total: 500000 },
      { code: `MV-HSTC${now.toString().slice(-5)}`, status: 'Completed', total: 700000 },
      { code: `MV-HSTD${now.toString().slice(-5)}`, status: 'Cancelled', total: 200000 },
    ];

    for (let i = 0; i < testData.length; i++) {
      const item = testData[i];
      const pickup = new Date(Date.now() + (i + 1) * 24 * 3600 * 1000);
      const ret = new Date(pickup.getTime() + 24 * 3600 * 1000);
      const b = await Booking.create({
        bookingCode: item.code,
        userId: customerUser._id,
        vehicleId: vehicleDoc._id,
        pickupBranchId: branchDAD._id,
        returnBranchId: branchDAD._id,
        pickupDateTime: pickup,
        returnDateTime: ret,
        totalAmount: item.total,
        depositAmount: Math.round(item.total * 0.3),
        remainingAmount: item.total - Math.round(item.total * 0.3),
        paidAmount: 0,
        status: item.status,
        paymentMethod: 'Banking',
      });
      createdBookingIds.push(b._id);
    }
  });

  afterAll(async () => {
    if (createdBookingIds.length > 0) {
      await Booking.deleteMany({ _id: { $in: createdBookingIds } });
    }
  });

  it('1. Rejects unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/bookings/my');
    expect(res.status).toBe(401);
  });

  it('2. GET /api/bookings/my returns array, pagination meta, and status counts', async () => {
    const res = await request(app)
      .get('/api/bookings/my')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(4);
    expect(res.body.counts).toBeDefined();
    expect(res.body.counts.all).toBeGreaterThanOrEqual(4);
    expect(res.body.counts.active).toBeGreaterThanOrEqual(2); // Pending + Ongoing
    expect(res.body.counts.completed).toBeGreaterThanOrEqual(1);
    expect(res.body.counts.cancelled).toBeGreaterThanOrEqual(1);
    expect(res.body.counts.trips).toBe(res.body.counts.active + res.body.counts.completed);
    expect(res.body.counts.all).toBe(res.body.counts.trips + res.body.counts.cancelled);
  });

  it('3. Filters by status=active tab (Pending, Approved, Confirmed, Ongoing)', async () => {
    const res = await request(app)
      .get('/api/bookings/my?status=active')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    res.body.data.forEach((b: any) => {
      expect(['Pending', 'Approved', 'Confirmed', 'Ongoing']).toContain(b.status);
    });
  });

  it('4. Filters by status=completed tab', async () => {
    const res = await request(app)
      .get('/api/bookings/my?status=completed')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    res.body.data.forEach((b: any) => {
      expect(b.status).toBe('Completed');
    });
  });

  it('5. Filters by status=cancelled tab (Cancelled, Rejected)', async () => {
    const res = await request(app)
      .get('/api/bookings/my?status=cancelled')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    res.body.data.forEach((b: any) => {
      expect(['Cancelled', 'Rejected']).toContain(b.status);
    });
  });

  it('6. Respects pagination parameters (page=1&limit=2)', async () => {
    const res = await request(app)
      .get('/api/bookings/my?page=1&limit=2')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
    expect(res.body.pagination.limit).toBe(2);
    expect(res.body.pagination.totalPages).toBeGreaterThanOrEqual(2);
  });

  it('7. Filters by search query keyword', async () => {
    const targetCode = `MV-HSTA`;
    const res = await request(app)
      .get(`/api/bookings/my?search=${targetCode}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].bookingCode).toContain('MV-HSTA');
  });
});
