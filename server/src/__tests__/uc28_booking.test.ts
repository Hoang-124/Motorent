import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { app } from '../server';
import { env } from '../config/env';
import { setupTestEnvironment } from './testHelper';
import { User } from '../models/User';
import { Vehicle } from '../models/Vehicle';
import { Branch } from '../models/Branch';

describe('UC-28: Book Rental Integration Tests', () => {
  let customerToken: string;
  let pickupBranchId: string;
  let returnBranchId: string;
  let testVehicleId: string;

  beforeAll(async () => {
    await setupTestEnvironment();

    const customer = await User.findOne({ username: 'customer_hoang' });
    customerToken = jwt.sign(
      { userId: customer!._id.toString(), tokenVersion: customer!.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const branches = await Branch.find({ isActive: true });
    pickupBranchId = branches[0]._id.toString();
    returnBranchId = (branches[1] || branches[0])._id.toString();

    const vehicle = await Vehicle.findOne({ status: 'Available' });
    testVehicleId = vehicle!._id.toString();
  }, 30000);

  afterAll(async () => {
    await mongoose.disconnect();
  }, 10000);

  it('1. POST /api/bookings without auth must be rejected with 401', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({
        vehicleId: testVehicleId,
        pickupBranchId,
        returnBranchId,
        pickupDateTime: new Date(Date.now() + 86400000).toISOString(),
        returnDateTime: new Date(Date.now() + 86400000 * 3).toISOString(),
      });

    expect(res.status).toBe(401);
  });

  it('2. POST /api/bookings/estimate returns accurate pricing and 30% deposit breakdown', async () => {
    const pickupDate = new Date();
    pickupDate.setDate(pickupDate.getDate() + 5);
    pickupDate.setHours(9, 0, 0, 0);

    const returnDate = new Date(pickupDate);
    returnDate.setDate(returnDate.getDate() + 2);
    returnDate.setHours(17, 0, 0, 0);

    const res = await request(app)
      .post('/api/bookings/estimate')
      .send({
        vehicleId: testVehicleId,
        pickupBranchId,
        returnBranchId,
        pickupDateTime: pickupDate.toISOString(),
        returnDateTime: returnDate.toISOString(),
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isAvailable).toBe(true);
    expect(res.body.data.depositAmount).toBe(Math.round(res.body.data.totalAmount * 0.3));
    expect(res.body.data.remainingAmount).toBe(res.body.data.totalAmount - res.body.data.depositAmount);
  });

  it('3. POST /api/bookings successfully creates booking with MV- prefix code and status Pending', async () => {
    const pickupDate = new Date();
    pickupDate.setDate(pickupDate.getDate() + 5);
    pickupDate.setHours(9, 0, 0, 0);

    const returnDate = new Date(pickupDate);
    returnDate.setDate(returnDate.getDate() + 2);
    returnDate.setHours(17, 0, 0, 0);

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: testVehicleId,
        pickupBranchId,
        returnBranchId,
        pickupDateTime: pickupDate.toISOString(),
        returnDateTime: returnDate.toISOString(),
        paymentMethod: 'Banking',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.bookingCode).toMatch(/^MV-[A-Z0-9]{6}$/);
    expect(res.body.data.status).toBe('Pending');
    expect(res.body.data.depositAmount).toBe(Math.round(res.body.data.totalAmount * 0.3));
    expect(res.body.data.remainingAmount).toBe(res.body.data.totalAmount - res.body.data.depositAmount);
  });

  it('4. POST /api/bookings returns 409 Conflict when attempting overlapping booking on same vehicle', async () => {
    const pickupDate = new Date();
    pickupDate.setDate(pickupDate.getDate() + 5);
    pickupDate.setHours(10, 0, 0, 0);

    const returnDate = new Date(pickupDate);
    returnDate.setDate(returnDate.getDate() + 1);
    returnDate.setHours(12, 0, 0, 0);

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: testVehicleId,
        pickupBranchId,
        returnBranchId,
        pickupDateTime: pickupDate.toISOString(),
        returnDateTime: returnDate.toISOString(),
        paymentMethod: 'Banking',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('5. POST /api/bookings rejects rental duration less than 2 hours with 400', async () => {
    const pickupDate = new Date();
    pickupDate.setDate(pickupDate.getDate() + 10);
    pickupDate.setHours(9, 0, 0, 0);

    const returnDate = new Date(pickupDate);
    returnDate.setMinutes(returnDate.getMinutes() + 30); // only 30 mins

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        vehicleId: testVehicleId,
        pickupBranchId,
        returnBranchId,
        pickupDateTime: pickupDate.toISOString(),
        returnDateTime: returnDate.toISOString(),
        paymentMethod: 'Banking',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('tối thiểu');
  });
});
