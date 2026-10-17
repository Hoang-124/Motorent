import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { app, io, server } from '../server';
import { env } from '../config/env';
import { Branch } from '../models/Branch';
import { Category } from '../models/Category';
import { Vehicle } from '../models/Vehicle';
import { Booking } from '../models/Booking';
import { Feedback } from '../models/Feedback';
import { MaintenanceLog } from '../models/MaintenanceLog';
import { VehicleTransfer } from '../models/VehicleTransfer';
import { User, type IUser } from '../models/User';
import { updateVehicle } from '../modules/vehicle/vehicleService';

const databasePrefix = 'motorent_management_uc67_72_';
const databaseName = `${databasePrefix}${process.pid}_${Date.now()}`;
const mongoUri = `mongodb://127.0.0.1:27017/${databaseName}?serverSelectionTimeoutMS=3000&connectTimeoutMS=3000`;
let ownsConnection = false;

const assertOwnedLocalDatabase = (): void => {
  const requested = new URL(mongoUri);
  const connection = mongoose.connection;
  if (
    requested.protocol !== 'mongodb:' || requested.hostname !== '127.0.0.1' ||
    requested.pathname !== `/${databaseName}` || !/^motorent_management_uc67_72_\d+_\d+$/.test(databaseName) ||
    !databaseName.startsWith(databasePrefix) || !['127.0.0.1', 'localhost', '::1'].includes(connection.host) ||
    connection.name !== databaseName || connection.db?.databaseName !== databaseName || connection.readyState !== 1
  ) throw new Error('Management test database ownership check failed; refusing cleanup.');
};

const ids = {
  branchA: new mongoose.Types.ObjectId(),
  branchB: new mongoose.Types.ObjectId(),
  category: new mongoose.Types.ObjectId(),
  admin: new mongoose.Types.ObjectId(),
  managerA: new mongoose.Types.ObjectId(),
  managerB: new mongoose.Types.ObjectId(),
  unassigned: new mongoose.Types.ObjectId(),
  staff: new mongoose.Types.ObjectId(),
  customer: new mongoose.Types.ObjectId(),
};
let adminUser: IUser;
let sequence = 0;
const tokens: Record<string, string> = {};
const images = (count: number) => Array.from({ length: count }, (_, index) => `https://example.invalid/management-${index}.jpg`);
const vehiclePayload = (extra: Record<string, unknown> = {}) => ({
  branchId: ids.branchA.toString(), category: ids.category.toString(), vehicleModel: 'Management Scooter', brand: 'Honda',
  licensePlate: `43-MG ${String(++sequence).padStart(5, '0')}`, dailyPrice: 150000, hourlyPrice: 25000,
  color: 'Black', odometer: 120, images: images(1), ...extra,
});
const fixtureVehicle = (extra: Record<string, unknown> = {}) => Vehicle.create(vehiclePayload(extra));
const fixtureBooking = (vehicleId: mongoose.Types.ObjectId, status: 'Pending' | 'Completed' = 'Pending') => Booking.create({
  bookingCode: `MANAGEMENT-${++sequence}`, userId: ids.customer, vehicleId,
  pickupBranchId: ids.branchA, returnBranchId: ids.branchA,
  pickupDateTime: new Date(Date.now() + 30 * 86400000), returnDateTime: new Date(Date.now() + 31 * 86400000),
  totalAmount: 150000, status,
});

describe('Management UC67–72 vehicle API', () => {
  beforeAll(async () => {
    if (process.env.NODE_ENV !== 'test') throw new Error('Use vitest.management.config.mts with NODE_ENV=test.');
    if (mongoose.connection.readyState !== 0) throw new Error('A disconnected Mongoose instance is required; existing database is untouched.');
    expect(server.listening).toBe(false);
    // Pass the literal local URI directly; never fall back to configured connection strings.
    await mongoose.connect(mongoUri);
    assertOwnedLocalDatabase();
    ownsConnection = true;
    await Branch.create([
      { _id: ids.branchA, name: 'Management A', code: 'MANAGEMENT-A', address: 'Owned local fixture A', phone: '0900000001' },
      { _id: ids.branchB, name: 'Management B', code: 'MANAGEMENT-B', address: 'Owned local fixture B', phone: '0900000002' },
    ]);
    await Category.create({ _id: ids.category, name: 'Management Scooters', slug: 'management-scooters' });
    const actors = [
      { key: 'admin', roles: 'SystemAdmin' },
      { key: 'managerA', roles: 'BranchManager', branchId: ids.branchA },
      { key: 'managerB', roles: 'BranchManager', branchId: ids.branchB },
      { key: 'unassigned', roles: 'BranchManager' },
      { key: 'staff', roles: 'Staff', branchId: ids.branchA },
      { key: 'customer', roles: 'Customer' },
    ] as const;
    for (const actor of actors) {
      const user = await User.create({ _id: ids[actor.key], username: `management_${actor.key.toLowerCase()}`, status: 'Active', tokenVersion: 0, ...actor });
      tokens[actor.key] = jwt.sign({ userId: user._id, role: user.roles, tokenVersion: user.tokenVersion }, env.JWT_SECRET, { expiresIn: '10m' });
      if (actor.key === 'admin') adminUser = user;
    }
    await Promise.all([Vehicle.init(), Booking.init(), User.init(), Category.init(), Branch.init()]);
  });

  afterAll(async () => {
    try {
      if (ownsConnection) {
        assertOwnedLocalDatabase();
        if (!mongoose.connection.db) throw new Error('Owned local database handle is missing.');
        await mongoose.connection.db.dropDatabase();
      }
    } finally {
      if (ownsConnection && mongoose.connection.name === databaseName && ['127.0.0.1', 'localhost', '::1'].includes(mongoose.connection.host)) await mongoose.disconnect();
      await new Promise<void>((resolve) => io.close(() => resolve()));
    }
  });

  it('requires login and rejects Staff and Customer mutations', async () => {
    const vehicle = await fixtureVehicle();
    await request(app).post('/api/vehicles').send(vehiclePayload()).expect(401);
    for (const role of ['staff', 'customer']) {
      await request(app).post('/api/vehicles').set('Authorization', `Bearer ${tokens[role]}`).send(vehiclePayload()).expect(403);
      await request(app).put(`/api/vehicles/${vehicle._id}`).set('Authorization', `Bearer ${tokens[role]}`).send({ color: 'Red' }).expect(403);
      await request(app).delete(`/api/vehicles/${vehicle._id}`).set('Authorization', `Bearer ${tokens[role]}`).expect(403);
    }
    expect((await Vehicle.findById(vehicle._id))?.isDeleted).toBe(false);
  });

  it('creates, edits and deletes a real unused category through the admin API', async () => {
    const created = await request(app).post('/api/categories').set('Authorization', `Bearer ${tokens.admin}`)
      .send({ name: 'Real category lifecycle', slug: 'real-category-lifecycle', description: 'Initial description' }).expect(201);
    const id = created.body.data._id;
    expect(created.body.data.vehicleCount).toBe(0);
    const edited = await request(app).put(`/api/categories/${id}`).set('Authorization', `Bearer ${tokens.admin}`)
      .send({ name: 'Real category updated', description: 'Updated description' }).expect(200);
    expect(edited.body.data).toMatchObject({ name: 'Real category updated', slug: 'real-category-lifecycle', description: 'Updated description' });
    const listing = await request(app).get('/api/categories').expect(200);
    expect(listing.body.data).toContainEqual(expect.objectContaining({ _id: id, name: 'Real category updated' }));
    await request(app).delete(`/api/categories/${id}`).set('Authorization', `Bearer ${tokens.admin}`).expect(200);
    expect(await Category.findById(id)).toBeNull();
  });

  it('rejects duplicate category names and normalized slugs against the real database', async () => {
    await request(app).post('/api/categories').set('Authorization', `Bearer ${tokens.admin}`)
      .send({ name: 'Different category name', slug: 'MANAGEMENT-SCOOTERS' }).expect(409);
    await request(app).post('/api/categories').set('Authorization', `Bearer ${tokens.admin}`)
      .send({ name: 'management scooters', slug: 'different-real-slug' }).expect(409);
    expect(await Category.countDocuments({ slug: 'different-real-slug' })).toBe(0);
  });

  it('blocks assigned category deletion and permits it only after its vehicle is archived', async () => {
    const category = await Category.create({ name: 'Assigned real category', slug: 'assigned-real-category' });
    const vehicle = await fixtureVehicle({ category: category._id });
    await request(app).delete(`/api/categories/${category._id}`).set('Authorization', `Bearer ${tokens.admin}`).expect(409);
    expect(await Category.exists({ _id: category._id })).not.toBeNull();
    vehicle.isDeleted = true; await vehicle.save();
    await request(app).delete(`/api/categories/${category._id}`).set('Authorization', `Bearer ${tokens.admin}`).expect(200);
    await request(app).post('/api/vehicles').set('Authorization', `Bearer ${tokens.managerA}`)
      .send(vehiclePayload({ category: category.id })).expect(400);
  });

  it('permits only SystemAdmin to mutate real categories', async () => {
    await request(app).post('/api/categories').send({ name: 'Unauthorized', slug: 'unauthorized' }).expect(401);
    for (const role of ['managerA', 'staff', 'customer']) {
      await request(app).post('/api/categories').set('Authorization', `Bearer ${tokens[role]}`).send({ name: 'Unauthorized', slug: 'unauthorized' }).expect(403);
      await request(app).put(`/api/categories/${ids.category}`).set('Authorization', `Bearer ${tokens[role]}`).send({ description: 'Forbidden' }).expect(403);
      await request(app).delete(`/api/categories/${ids.category}`).set('Authorization', `Bearer ${tokens[role]}`).expect(403);
    }
    expect((await Category.findById(ids.category))?.name).toBe('Management Scooters');
  });

  it('keeps category assignment consistent when creation races category deletion', async () => {
    const category = await Category.create({ name: 'Concurrent real category', slug: 'concurrent-real-category' });
    const payload = vehiclePayload({ category: category.id });
    const [created, deleted] = await Promise.all([
      request(app).post('/api/vehicles').set('Authorization', `Bearer ${tokens.managerA}`).send(payload),
      request(app).delete(`/api/categories/${category.id}`).set('Authorization', `Bearer ${tokens.admin}`),
    ]);
    expect([[201, 409], [400, 200]]).toContainEqual([created.status, deleted.status]);
    const assigned = await Vehicle.findOne({ licensePlate: payload.licensePlate });
    if (assigned) expect(await Category.exists({ _id: assigned.category })).not.toBeNull();
  });

  it('accepts ten images and rejects an eleventh on create', async () => {
    const accepted = await request(app).post('/api/vehicles').set('Authorization', `Bearer ${tokens.managerA}`).send(vehiclePayload({ images: images(10) })).expect(201);
    expect(accepted.body.data.images).toHaveLength(10);
    const rejected = vehiclePayload({ images: images(11) });
    await request(app).post('/api/vehicles').set('Authorization', `Bearer ${tokens.admin}`).send(rejected).expect(400);
    expect(await Vehicle.exists({ licensePlate: rejected.licensePlate })).toBeNull();
  });

  it('rejects an eleventh image on update without replacing the stored gallery', async () => {
    const vehicle = await fixtureVehicle();
    await request(app).put(`/api/vehicles/${vehicle._id}`).set('Authorization', `Bearer ${tokens.managerA}`).send({ images: images(11) }).expect(400);
    expect((await Vehicle.findById(vehicle._id))?.images).toEqual(images(1));
  });

  it('rejects image URL protocols that cannot be served as normal web images', async () => {
    await request(app).post('/api/vehicles').set('Authorization', `Bearer ${tokens.admin}`).send(vehiclePayload({ images: ['javascript:alert(1)'] })).expect(400);
  });

  it('never permits a plate field in an API update, including with a color change', async () => {
    const original = await fixtureVehicle();
    const other = await fixtureVehicle();
    for (const licensePlate of [original.licensePlate, other.licensePlate]) {
      await request(app).put(`/api/vehicles/${original._id}`).set('Authorization', `Bearer ${tokens.admin}`).send({ licensePlate, color: 'Red' }).expect(400);
    }
    const unchanged = await Vehicle.findById(original._id);
    expect(unchanged?.licensePlate).toBe(original.licensePlate);
    expect(unchanged?.color).toBe('Black');
    await request(app).put(`/api/vehicles/${original._id}`).set('Authorization', `Bearer ${tokens.admin}`).send({ color: 'Red' }).expect(200);
    const updated = await Vehicle.findById(original._id);
    expect(updated?.color).toBe('Red');
    expect(updated?.licensePlate).toBe(original.licensePlate);
  });

  it('keeps the plate immutable when a caller bypasses controller validation', async () => {
    const vehicle = await fixtureVehicle();
    const bypassUpdate = updateVehicle as unknown as (id: string, data: Record<string, unknown>, actor: IUser) => Promise<unknown>;
    await expect(bypassUpdate(vehicle.id, { licensePlate: '43-BYPASS 999', color: 'Red' }, adminUser)).rejects.toMatchObject({ statusCode: 400 });
    const unchanged = await Vehicle.findById(vehicle._id);
    expect(unchanged?.licensePlate).toBe(vehicle.licensePlate);
    expect(unchanged?.color).toBe('Black');
  });

  it('reserves canonical plate variants even for a deleted vehicle', async () => {
    const licensePlate = '43-MG 123.45';
    await fixtureVehicle({ licensePlate, isDeleted: true });
    const response = await request(app).post('/api/vehicles').set('Authorization', `Bearer ${tokens.admin}`).send(vehiclePayload({ licensePlate: '43MG12345', color: 'Red' })).expect(409);
    expect(response.body.message).toContain('Biển số');
    expect(await Vehicle.countDocuments({ licensePlate: '43MG12345' })).toBe(0);
  });

  it('restricts manager writes to the assigned branch and preserves foreign vehicles', async () => {
    const foreign = await fixtureVehicle({ branchId: ids.branchB });
    await request(app).post('/api/vehicles').set('Authorization', `Bearer ${tokens.managerA}`).send(vehiclePayload({ branchId: ids.branchB.toString() })).expect(403);
    await request(app).put(`/api/vehicles/${foreign._id}`).set('Authorization', `Bearer ${tokens.managerA}`).send({ color: 'Red' }).expect(403);
    await request(app).delete(`/api/vehicles/${foreign._id}`).set('Authorization', `Bearer ${tokens.managerA}`).expect(403);
    const unchanged = await Vehicle.findById(foreign._id);
    expect(unchanged?.color).toBe('Black');
    expect(unchanged?.isDeleted).toBe(false);
  });

  it('does not allow direct branch changes through the general edit endpoint', async () => {
    const own = await fixtureVehicle();
    await request(app).put(`/api/vehicles/${own._id}`).set('Authorization', `Bearer ${tokens.managerA}`).send({ branchId: ids.branchB.toString() }).expect(403);
    const response = await request(app).put(`/api/vehicles/${own._id}`).set('Authorization', `Bearer ${tokens.admin}`).send({ branchId: ids.branchB.toString() });
    expect([403, 409]).toContain(response.status);
    expect((await Vehicle.findById(own._id))?.branchId.toString()).toBe(ids.branchA.toString());
  });

  it('scopes the managed list even if a manager submits another branch filter', async () => {
    const own = await fixtureVehicle();
    const foreign = await fixtureVehicle({ branchId: ids.branchB });
    const response = await request(app).get(`/api/vehicles/management?branchId=${ids.branchB}`).set('Authorization', `Bearer ${tokens.managerA}`).expect(200);
    const resultIds = response.body.data.map((vehicle: { _id: string }) => vehicle._id);
    expect(resultIds).toContain(own.id);
    expect(resultIds).not.toContain(foreign.id);
    await request(app).get('/api/vehicles/management').set('Authorization', `Bearer ${tokens.unassigned}`).expect(403);
  });

  it('blocks soft deletion for a future Pending booking even while the vehicle is Available', async () => {
    const vehicle = await fixtureVehicle();
    const booking = await fixtureBooking(vehicle._id as mongoose.Types.ObjectId);
    await request(app).delete(`/api/vehicles/${vehicle._id}`).set('Authorization', `Bearer ${tokens.managerA}`).expect(409);
    expect((await Vehicle.findById(vehicle._id))?.isDeleted).toBe(false);
    expect((await Booking.findById(booking._id))?.status).toBe('Pending');
  });

  it('blocks soft deletion for an unfinished maintenance record', async () => {
    const vehicle = await fixtureVehicle();
    await MaintenanceLog.create({ vehicleId: vehicle._id, branchId: ids.branchA, description: 'Owned local service fixture', status: 'InProgress' });
    await request(app).delete(`/api/vehicles/${vehicle._id}`).set('Authorization', `Bearer ${tokens.admin}`).expect(409);
    expect((await Vehicle.findById(vehicle._id))?.isDeleted).toBe(false);
  });

  it('blocks soft deletion for a pending transfer', async () => {
    const vehicle = await fixtureVehicle();
    await VehicleTransfer.create({ vehicleId: vehicle._id, fromBranchId: ids.branchA, toBranchId: ids.branchB, requestedBy: ids.managerA, transferReason: 'Owned local transfer fixture', status: 'Pending' });
    await request(app).delete(`/api/vehicles/${vehicle._id}`).set('Authorization', `Bearer ${tokens.admin}`).expect(409);
    expect((await Vehicle.findById(vehicle._id))?.isDeleted).toBe(false);
  });

  it('soft deletes an unused vehicle, preserves history and fields, and makes all public detail APIs return 404', async () => {
    const vehicle = await fixtureVehicle({ images: images(2), color: 'Blue' });
    const booking = await fixtureBooking(vehicle._id as mongoose.Types.ObjectId, 'Completed');
    const feedback = await Feedback.create({ bookingId: booking._id, userId: ids.customer, vehicleId: vehicle._id, rating: 5, comment: 'Owned local history fixture', isPublic: true, isBlocked: false });
    await request(app).delete(`/api/vehicles/${vehicle._id}`).set('Authorization', `Bearer ${tokens.managerA}`).expect(200);
    const archived = await Vehicle.findById(vehicle._id);
    expect(archived).not.toBeNull();
    expect(archived?.isDeleted).toBe(true);
    expect(archived?.licensePlate).toBe(vehicle.licensePlate);
    expect(archived?.color).toBe('Blue');
    expect(archived?.images).toEqual(images(2));
    expect(archived?.odometer).toBe(vehicle.odometer);
    expect(archived?.branchId.toString()).toBe(ids.branchA.toString());
    expect(await Booking.exists({ _id: booking._id })).not.toBeNull();
    expect(await Feedback.exists({ _id: feedback._id })).not.toBeNull();
    await request(app).get(`/api/vehicles/${vehicle._id}`).expect(404);
    await request(app).get(`/api/vehicles/${vehicle._id}/reviews`).expect(404);
    await request(app).get(`/api/vehicles/${vehicle._id}/availability?month=2027-02`).expect(404);
    const publicList = await request(app).get('/api/vehicles').expect(200);
    expect(publicList.body.data.map((entry: { _id: string }) => entry._id)).not.toContain(vehicle.id);
    const managedList = await request(app).get('/api/vehicles/management').set('Authorization', `Bearer ${tokens.managerA}`).expect(200);
    expect(managedList.body.data.map((entry: { _id: string }) => entry._id)).not.toContain(vehicle.id);
    await request(app).delete(`/api/vehicles/${vehicle._id}`).set('Authorization', `Bearer ${tokens.managerA}`).expect(404);
  });
});
