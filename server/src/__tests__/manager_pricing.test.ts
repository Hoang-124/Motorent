import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { app, io, server } from '../server';
import { env } from '../config/env';
import { Branch } from '../models/Branch';
import { Category } from '../models/Category';
import { Vehicle } from '../models/Vehicle';
import { User, type UserRole } from '../models/User';
import { SeasonalPricingRule } from '../models/SeasonalPricingRule';
import { AuditLog } from '../models/AuditLog';
import { Booking } from '../models/Booking';
import { Payment } from '../models/Payment';
import { Discount } from '../models/Discount';
import { sortAndSignParams } from '../modules/payment/vnpayService';
import { vietnamDate } from '../modules/pricing/pricingCalculator';

// This suite never consumes the application/test database from .env. Every
// fixture and deletion belongs to one unique database on the loopback server.
const prefix = 'motorent_manager_pricing_';
const databaseName = `${prefix}${process.pid}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
const mongoUri = `mongodb://127.0.0.1:27017/${databaseName}?serverSelectionTimeoutMS=3000&connectTimeoutMS=3000`;
let ownsConnection = false;
const assertOwnedLocalDatabase = () => {
  const requested = new URL(mongoUri);
  const connection = mongoose.connection;
  if (requested.protocol !== 'mongodb:' || requested.hostname !== '127.0.0.1' ||
    requested.pathname !== `/${databaseName}` || !/^motorent_manager_pricing_\d+_\d+_[a-f0-9]{8}$/.test(databaseName) ||
    !['127.0.0.1', 'localhost', '::1'].includes(connection.host) || connection.name !== databaseName ||
    connection.db?.databaseName !== databaseName || connection.readyState !== 1) {
    throw new Error('Pricing test database ownership check failed; refusing fixture writes/cleanup.');
  }
};

const ids = {
  branchA: new mongoose.Types.ObjectId(), branchB: new mongoose.Types.ObjectId(), category: new mongoose.Types.ObjectId(),
  managerA: new mongoose.Types.ObjectId(), managerB: new mongoose.Types.ObjectId(),
  admin: new mongoose.Types.ObjectId(), staff: new mongoose.Types.ObjectId(), customer: new mongoose.Types.ObjectId(),
};
const auth = (userId: mongoose.Types.ObjectId, role: UserRole) => `Bearer ${jwt.sign({ userId: userId.toString(), role, tokenVersion: 0 }, env.JWT_SECRET, { expiresIn: '10m' })}`;
const managerA = () => auth(ids.managerA, 'BranchManager');
const managerB = () => auth(ids.managerB, 'BranchManager');
const admin = () => auth(ids.admin, 'SystemAdmin');
const staff = () => auth(ids.staff, 'Staff');
const customer = () => auth(ids.customer, 'Customer');
const season = { name: 'Pricing fixture season', startDate: '2026-12-12', endDate: '2026-12-17', multiplier: 2.3 };
let vehicleSequence = 0;
const makeVehicle = async (branchId = ids.branchA) => {
  assertOwnedLocalDatabase();
  vehicleSequence += 1;
  return Vehicle.create({
    vehicleModel: `Pricing fixture ${vehicleSequence}`, brand: 'Honda', licensePlate: `PRICE-${vehicleSequence}`,
    branchId, category: ids.category, dailyPrice: 200_000, hourlyPrice: 30_000, odometer: 100,
  });
};
const pricingPath = (id: unknown) => `/api/vehicles/${String(id)}/pricing`;
const rulesPath = (id: unknown) => `/api/vehicles/${String(id)}/pricing-rules`;
const createRule = (id: unknown, data = season) => request(app).post(rulesPath(id)).set('Authorization', managerA()).send(data).expect(201);
const findPriceAudit = (vehicleId: string) => AuditLog.findOne({
  action: 'UPDATE_VEHICLE_PRICING', entityId: vehicleId, status: 'SUCCESS', userId: ids.managerA,
}).lean();

describe('Manager pricing and seasonal rules APIs (isolated local database)', () => {
  beforeAll(async () => {
    if (process.env.NODE_ENV !== 'test' || process.env.MANAGER_PRICING_ISOLATED !== '1') throw new Error('Use vitest.manager-pricing.config.mts only.');
    if (mongoose.connection.readyState !== 0) throw new Error('Pricing tests require disconnected Mongoose; refusing to reuse an existing database.');
    expect(server.listening).toBe(false);
    await mongoose.connect(mongoUri);
    assertOwnedLocalDatabase();
    ownsConnection = true;
    await Branch.create([
      { _id: ids.branchA, name: 'Pricing A', code: 'PRICE-A', address: 'Isolated A', phone: '0900000001', hours_open: '00:00', hours_close: '23:59' },
      { _id: ids.branchB, name: 'Pricing B', code: 'PRICE-B', address: 'Isolated B', phone: '0900000002', hours_open: '00:00', hours_close: '23:59' },
    ]);
    await Category.create({ _id: ids.category, name: 'Pricing fixtures', slug: 'pricing-fixtures' });
    await User.create([
      { _id: ids.managerA, username: 'pricing_manager_a', roles: 'BranchManager', branchId: ids.branchA, status: 'Active' },
      { _id: ids.managerB, username: 'pricing_manager_b', roles: 'BranchManager', branchId: ids.branchB, status: 'Active' },
      { _id: ids.admin, username: 'pricing_admin', roles: 'SystemAdmin', status: 'Active' },
      { _id: ids.staff, username: 'pricing_staff', roles: 'Staff', branchId: ids.branchA, status: 'Active' },
      { _id: ids.customer, username: 'pricing_customer', roles: 'Customer', status: 'Active', identityStatus: 'Verified' },
    ]);
    await Promise.all([Vehicle.init(), User.init(), SeasonalPricingRule.init(), Payment.init()]);
  });

  afterAll(async () => {
    try {
      if (ownsConnection) {
        assertOwnedLocalDatabase();
        if (!mongoose.connection.db) throw new Error('Owned local pricing database handle is missing.');
        await mongoose.connection.db.dropDatabase();
      }
    } finally {
      if (ownsConnection && mongoose.connection.name === databaseName && ['127.0.0.1', 'localhost', '::1'].includes(mongoose.connection.host)) await mongoose.disconnect();
      await new Promise<void>((resolve) => io.close(() => resolve()));
    }
  });

  it('requires authentication and manager/admin role for price and rule management', async () => {
    const vehicle = await makeVehicle();
    await request(app).put(pricingPath(vehicle._id)).send({ dailyPrice: 220_000 }).expect(401);
    await request(app).get(rulesPath(vehicle._id)).expect(401);
    for (const token of [staff(), customer()]) {
      await request(app).put(pricingPath(vehicle._id)).set('Authorization', token).send({ dailyPrice: 220_000 }).expect(403);
      await request(app).post(rulesPath(vehicle._id)).set('Authorization', token).send(season).expect(403);
      await request(app).get(rulesPath(vehicle._id)).set('Authorization', token).expect(403);
    }
    expect((await Vehicle.findById(vehicle._id))?.dailyPrice).toBe(200_000);
  });

  it('restricts managers to their own branch and permits a system admin across branches', async () => {
    const foreign = await makeVehicle(ids.branchB);
    await request(app).put(pricingPath(foreign._id)).set('Authorization', managerA()).send({ dailyPrice: 220_000 }).expect(403);
    await request(app).post(rulesPath(foreign._id)).set('Authorization', managerA()).send(season).expect(403);
    await request(app).get(rulesPath(foreign._id)).set('Authorization', managerA()).expect(403);
    await request(app).put(pricingPath(foreign._id)).set('Authorization', managerB()).send({ dailyPrice: 230_000 }).expect(200);
    await request(app).put(pricingPath(foreign._id)).set('Authorization', admin()).send({ dailyPrice: 240_000 }).expect(200);
    const rule = await request(app).post(rulesPath(foreign._id)).set('Authorization', admin()).send(season).expect(201);
    await request(app).put(`${rulesPath(foreign._id)}/${rule.body.data._id}`).set('Authorization', managerA()).send({ ...season, multiplier: 2 }).expect(403);
    await request(app).delete(`${rulesPath(foreign._id)}/${rule.body.data._id}`).set('Authorization', managerA()).expect(403);
    await request(app).delete(`${rulesPath(foreign._id)}/${rule.body.data._id}`).set('Authorization', admin()).expect(200);
    expect((await Vehicle.findById(foreign._id))?.dailyPrice).toBe(240_000);
  });

  it('persists daily/hourly changes, supports removing hourly pricing, and records a daily price audit', async () => {
    const vehicle = await makeVehicle();
    const updated = await request(app).put(pricingPath(vehicle._id)).set('Authorization', managerA()).send({ dailyPrice: 250_000, hourlyPrice: 35_000 }).expect(200);
    expect(updated.body.data).toMatchObject({ dailyPrice: 250_000, hourlyPrice: 35_000 });
    await expect.poll(() => findPriceAudit(vehicle._id.toString()), { timeout: 3000, interval: 50 }).toMatchObject({
      action: 'UPDATE_VEHICLE_PRICING', entity: 'Vehicle', statusCode: 200,
      changes: { dailyPrice: 250_000, hourlyPrice: 35_000 },
    });
    await request(app).put(pricingPath(vehicle._id)).set('Authorization', managerA()).send({ dailyPrice: 250_000, hourlyPrice: null }).expect(200);
    const stored = await Vehicle.findById(vehicle._id);
    expect(stored?.dailyPrice).toBe(250_000);
    expect(stored?.hourlyPrice).toBeUndefined();
  });

  it.each([
    { dailyPrice: 0 }, { dailyPrice: -1 }, { dailyPrice: '200000' }, { dailyPrice: null },
    { dailyPrice: 1_000_000_001 }, { dailyPrice: 200_000, hourlyPrice: 0 },
  ])('rejects invalid price payload %j without changing prices', async (payload) => {
    const vehicle = await makeVehicle();
    await request(app).put(pricingPath(vehicle._id)).set('Authorization', managerA()).send(payload).expect(400);
    expect((await Vehicle.findById(vehicle._id))?.dailyPrice).toBe(200_000);
  });

  it('creates, lists, edits its own date range, rejects inclusive overlap, then deletes a rule', async () => {
    const vehicle = await makeVehicle();
    const created = await createRule(vehicle._id);
    const ruleId = created.body.data._id;
    expect(created.body.data).toMatchObject({ ...season, vehicleId: vehicle._id.toString(), branchId: ids.branchA.toString() });
    const listed = await request(app).get(rulesPath(vehicle._id)).set('Authorization', managerA()).expect(200);
    expect(listed.body.data.map((rule: { _id: string }) => rule._id)).toEqual([ruleId]);
    // Keeping one's own interval must not collide with the rule being edited.
    await request(app).put(`${rulesPath(vehicle._id)}/${ruleId}`).set('Authorization', managerA()).send({ ...season, name: 'Edited season', multiplier: 2 }).expect(200);
    const overlap = await request(app).post(rulesPath(vehicle._id)).set('Authorization', managerA()).send({ ...season, name: 'Boundary collision', startDate: '2026-12-17', endDate: '2026-12-20' }).expect(409);
    expect(overlap.body.message).toContain('Edited season');
    const next = await createRule(vehicle._id, { ...season, name: 'Adjacent season', startDate: '2026-12-18', endDate: '2026-12-20' });
    await request(app).put(`${rulesPath(vehicle._id)}/${next.body.data._id}`).set('Authorization', managerA()).send({ ...season, startDate: '2026-12-16', endDate: '2026-12-20' }).expect(409);
    await request(app).delete(`${rulesPath(vehicle._id)}/${ruleId}`).set('Authorization', managerA()).expect(200);
    expect(await SeasonalPricingRule.exists({ _id: ruleId })).toBeNull();
    await request(app).delete(`${rulesPath(vehicle._id)}/${ruleId}`).set('Authorization', managerA()).expect(404);
  });

  it('never edits or deletes a rule through a different vehicle ID', async () => {
    const first = await makeVehicle();
    const second = await makeVehicle();
    const rule = await createRule(first._id);
    await request(app).put(`${rulesPath(second._id)}/${rule.body.data._id}`).set('Authorization', managerA()).send(season).expect(404);
    await request(app).delete(`${rulesPath(second._id)}/${rule.body.data._id}`).set('Authorization', managerA()).expect(404);
    expect(await SeasonalPricingRule.exists({ _id: rule.body.data._id })).not.toBeNull();
  });

  it.each([
    { startDate: '2026-02-29' }, { endDate: '2026-12-11' }, { multiplier: 0 }, { multiplier: -1 },
    { multiplier: 10.01 }, { multiplier: '2.3' }, { name: '  ' },
  ])('rejects invalid seasonal rule input %j', async (override) => {
    const vehicle = await makeVehicle();
    await request(app).post(rulesPath(vehicle._id)).set('Authorization', managerA()).send({ ...season, ...override }).expect(400);
    expect(await SeasonalPricingRule.countDocuments({ vehicleId: vehicle._id })).toBe(0);
  });

  it('keeps public quote, estimate, booking, voucher and stored VNPay totals consistent after a price edit', async () => {
    const vehicle = await makeVehicle();
    const day = vietnamDate(new Date(Date.now() + 20 * 24 * 3600_000));
    const nextDay = vietnamDate(new Date(new Date(`${day}T12:00:00+07:00`).getTime() + 24 * 3600_000));
    await createRule(vehicle._id, { ...season, startDate: day, endDate: nextDay });
    const schedule = { vehicleId: vehicle._id.toString(), pickupBranchId: ids.branchA.toString(), returnBranchId: ids.branchB.toString(),
      pickupDateTime: `${day}T12:00:00+07:00`, returnDateTime: `${nextDay}T12:00:00+07:00` };
    await Discount.create({ code: 'PRICING10', discountPercent: 10, usageLimit: 10, usedCount: 0, isActive: true,
      startDate: new Date(Date.now() - 24 * 3600_000), endDate: new Date(Date.now() + 24 * 3600_000) });
    const publicQuote = await request(app).get(`/api/vehicles/${vehicle._id}/quote`).query({ pickupDateTime: schedule.pickupDateTime, returnDateTime: schedule.returnDateTime }).expect(200);
    const estimate = await request(app).post('/api/bookings/estimate').send({ ...schedule, discountCode: 'PRICING10' }).expect(200);
    expect(publicQuote.body.data).toMatchObject({ baseRentalAmount: 200_000, seasonalSurcharge: 260_000, rentalAmount: 460_000 });
    expect(estimate.body.data).toMatchObject({ ...publicQuote.body.data, discountAmount: 46_000, totalAmount: 414_000, depositAmount: 124_200, remainingAmount: 289_800 });
    const created = await request(app).post('/api/bookings').set('Authorization', customer()).send({ ...schedule, discountCode: 'PRICING10', paymentMethod: 'Banking' }).expect(201);
    const bookingId = created.body.data._id;
    expect(created.body.data).toMatchObject({ totalAmount: 414_000, depositAmount: 124_200, remainingAmount: 289_800, discountAmount: 46_000 });
    expect((await Discount.findOne({ code: 'PRICING10' }))?.usedCount).toBe(1);

    await request(app).put(pricingPath(vehicle._id)).set('Authorization', managerA()).send({ dailyPrice: 300_000, hourlyPrice: 45_000 }).expect(200);
    const revised = await request(app).get(`/api/vehicles/${vehicle._id}/quote`).query({ pickupDateTime: schedule.pickupDateTime, returnDateTime: schedule.returnDateTime }).expect(200);
    expect(revised.body.data.rentalAmount).toBe(690_000);
    const payment = await request(app).post('/api/payments/vnpay/create').set('Authorization', customer()).send({ bookingId, paymentType: 'Full100' }).expect(200);
    expect(payment.body.data.amount).toBe(414_000);
    const paymentUrl = new URL(payment.body.data.paymentUrl);
    expect(paymentUrl.hostname).toBe('127.0.0.1');
    expect(paymentUrl.searchParams.get('vnp_Amount')).toBe('41400000');

    // Signed gateway callback is sent only to the in-process local fixture app.
    const ipn = {
      vnp_TxnRef: paymentUrl.searchParams.get('vnp_TxnRef')!, vnp_Amount: '41400000',
      vnp_ResponseCode: '00', vnp_TransactionStatus: '00', vnp_TransactionNo: `FIXTURE-${bookingId}`,
      vnp_BankCode: 'TEST', vnp_PayDate: '20261212120000',
    };
    const { secureHash } = sortAndSignParams(ipn);
    const callback = await request(app).get('/api/payments/vnpay/ipn').query({ ...ipn, vnp_SecureHash: secureHash }).expect(200);
    expect(callback.body.RspCode).toBe('00');
    const storedBooking = await Booking.findById(bookingId);
    expect(storedBooking).toMatchObject({ totalAmount: 414_000, depositAmount: 124_200,
      discountAmount: 46_000, remainingAmount: 0, paidAmount: 414_000, isPaid: true, status: 'Confirmed' });
    expect(await Payment.findOne({ bookingId }).lean()).toMatchObject({ amount: 414_000, type: 'FULL', status: 'SUCCESS' });
  });
});
