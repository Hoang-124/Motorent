import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../server';
import { env } from '../config/env';
import { setupTestEnvironment, teardownTestEnvironment } from './testHelper';
import { Booking } from '../models/Booking';
import { Vehicle } from '../models/Vehicle';
import { Branch } from '../models/Branch';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';

describe('UC-58: Record Vehicle Damage (Photos + Description + Damage Fee)', () => {
  let staffTokenDAD: string;
  let staffTokenMK: string;
  let customerToken: string;
  let vehicleId: string;
  let branchDADId: string;
  let testBookingId: string;

  beforeAll(async () => {
    await setupTestEnvironment();

    const staffDAD = await User.findOne({ username: 'staff_dad' });
    const staffMK = await User.findOne({ username: 'staff_mk' });
    const customer = await User.findOne({ username: 'customer_hoang' });
    const branchDAD = await Branch.findOne({ code: 'CN-DAD' });
    const vehicle = await Vehicle.findOne({ branchId: branchDAD?._id });

    if (!staffDAD || !staffMK || !customer || !branchDAD || !vehicle) {
      throw new Error('Test fixtures missing in database');
    }

    branchDADId = branchDAD._id.toString();
    vehicleId = vehicle._id.toString();

    staffTokenDAD = jwt.sign(
      { userId: staffDAD._id.toString(), tokenVersion: staffDAD.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    staffTokenMK = jwt.sign(
      { userId: staffMK._id.toString(), tokenVersion: staffMK.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    customerToken = jwt.sign(
      { userId: customer._id.toString(), tokenVersion: customer.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const now = new Date();
    const testBooking = await Booking.create({
      bookingCode: `MV-58DMG${Date.now().toString().slice(-4)}`,
      userId: customer._id,
      vehicleId: vehicle._id,
      pickupBranchId: branchDAD._id,
      returnBranchId: branchDAD._id,
      pickupDateTime: new Date(now.getTime() - 24 * 3600 * 1000),
      returnDateTime: new Date(now.getTime() + 24 * 3600 * 1000),
      totalAmount: 500000,
      depositAmount: 150000,
      remainingAmount: 350000,
      paidAmount: 150000,
      startOdometer: 3500,
      damageFee: 0,
      status: 'Ongoing',
    });
    testBookingId = testBooking._id.toString();
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  it('TC-58-01: Should reject unauthenticated requests with 401', async () => {
    const res = await request(app)
      .post(`/api/bookings/${testBookingId}/damage`)
      .send({
        description: 'Trầy xước yếm xe bên phải',
        damageFee: 150000,
        severity: 'Minor',
      });

    expect(res.status).toBe(401);
  });

  it('TC-58-02: Should reject Customer role with 403 Forbidden', async () => {
    const res = await request(app)
      .post(`/api/bookings/${testBookingId}/damage`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        description: 'Trầy xước yếm xe bên phải',
        damageFee: 150000,
        severity: 'Minor',
      });

    expect(res.status).toBe(403);
  });

  it('TC-58-03: Should reject staff from different branch with 403', async () => {
    const res = await request(app)
      .post(`/api/bookings/${testBookingId}/damage`)
      .set('Authorization', `Bearer ${staffTokenMK}`) // staffMK is at CN-MK, booking is at CN-DAD
      .send({
        description: 'Trầy xước yếm xe bên phải',
        damageFee: 150000,
        severity: 'Minor',
      });

    expect(res.status).toBe(403);
  });

  it('TC-58-04: Should reject negative damage fee with 400', async () => {
    const res = await request(app)
      .post(`/api/bookings/${testBookingId}/damage`)
      .set('Authorization', `Bearer ${staffTokenDAD}`)
      .send({
        description: 'Trầy xước yếm xe',
        damageFee: -50000,
      });

    expect(res.status).toBe(400);
  });

  it('TC-58-05: Should reject empty description with 400', async () => {
    const res = await request(app)
      .post(`/api/bookings/${testBookingId}/damage`)
      .set('Authorization', `Bearer ${staffTokenDAD}`)
      .send({
        description: '',
        damageFee: 100000,
      });

    expect(res.status).toBe(400);
  });

  it('TC-58-06: Should successfully record minor damage with photos and fee', async () => {
    const photoUrl = 'https://res.cloudinary.com/motorent/image/upload/v1/damage_scratch.jpg';
    const res = await request(app)
      .post(`/api/bookings/${testBookingId}/damage`)
      .set('Authorization', `Bearer ${staffTokenDAD}`)
      .send({
        description: 'Trầy xước cánh yếm trước bên phải',
        damageFee: 150000,
        severity: 'Minor',
        photos: [photoUrl],
        partsReplaced: ['Cánh yếm trước'],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.damageFee).toBe(150000);
    expect(res.body.data.damageRecords).toHaveLength(1);
    expect(res.body.data.damageRecords[0].description).toBe('Trầy xước cánh yếm trước bên phải');
    expect(res.body.data.damageRecords[0].damageFee).toBe(150000);
    expect(res.body.data.damageRecords[0].severity).toBe('Minor');
    expect(res.body.data.damageRecords[0].photos).toContain(photoUrl);

    // Verify AuditLog written
    const audits = await AuditLog.find({
      entityId: testBookingId,
      action: 'RECORD_DAMAGE',
    });
    expect(audits.length).toBeGreaterThanOrEqual(1);
    expect(audits[0].details).toHaveProperty('damageFee', 150000);
    expect(audits[0].details).toHaveProperty('severity', 'Minor');
  });

  it('TC-58-07: Should flag vehicle status as Maintenance when damage is Severe (>= 500,000 VND)', async () => {
    const severePhoto = 'https://res.cloudinary.com/motorent/image/upload/v1/broken_exhaust.jpg';
    const res = await request(app)
      .post(`/api/bookings/${testBookingId}/damage`)
      .set('Authorization', `Bearer ${staffTokenDAD}`)
      .send({
        description: 'Bể lốc máy và cong phuộc trước sau va chạm',
        damageFee: 1200000,
        severity: 'Severe',
        photos: [severePhoto],
        partsReplaced: ['Phuộc nhún trước', 'Lốc máy'],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Cumulative damageFee: 150,000 + 1,200,000 = 1,350,000 VND
    expect(res.body.data.damageFee).toBe(1350000);
    expect(res.body.data.damageRecords).toHaveLength(2);

    // Verify vehicle was flagged for maintenance
    const vehicle = await Vehicle.findById(vehicleId);
    expect(vehicle?.requiresMaintenance).toBe(true);
    expect(vehicle?.status).toBe('Maintenance');
  });
});
