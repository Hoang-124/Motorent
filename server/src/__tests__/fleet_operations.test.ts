import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { errorHandler } from '../core/errorHandler';
import { env } from '../config/env';
import { Branch } from '../models/Branch';
import { User } from '../models/User';
import { Category } from '../models/Category';
import { Vehicle } from '../models/Vehicle';
import { Booking, type BookingStatus } from '../models/Booking';
import { MaintenanceLog } from '../models/MaintenanceLog';
import { VehicleTransfer } from '../models/VehicleTransfer';
import { Notification } from '../models/Notification';
import transferRoutes from '../modules/fleet/transferRoutes';
import maintenanceRoutes from '../modules/fleet/maintenanceRoutes';
import { runOdometerAlertSweep, stopOdometerAlertJob } from '../core/jobs/odometerAlertJob';

// Avoid importing the application's server/socket lifecycle through bookingService.
vi.mock('../modules/booking/bookingEvents', () => ({ emitBookingStatus: vi.fn() }));
// Audit writes are asynchronous response hooks; keep this suite focused on fleet
// state and access, with no background writes racing its owned database cleanup.
vi.mock('../core/auditMiddleware', () => ({
  auditLogger: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}));

const databaseName = `motorent_fleet_uc64_77_80_${process.pid}_${Date.now()}`;
const uri = `mongodb://127.0.0.1:27017/${databaseName}?serverSelectionTimeoutMS=3000&connectTimeoutMS=3000`;
let ownsConnection = false;
const assertOwnedDatabase = () => {
  const requested = new URL(uri);
  if (requested.protocol !== 'mongodb:' || requested.hostname !== '127.0.0.1' ||
    requested.pathname !== `/${databaseName}` || !/^motorent_fleet_uc64_77_80_\d+_\d+$/.test(databaseName) ||
    mongoose.connection.host !== '127.0.0.1' || mongoose.connection.name !== databaseName ||
    mongoose.connection.db?.databaseName !== databaseName || mongoose.connection.readyState !== 1) {
    throw new Error('Fleet test database ownership check failed; refusing cleanup.');
  }
};
const app = express();
app.use(express.json());
app.use('/api/transfers', transferRoutes); app.use('/api/maintenance', maintenanceRoutes); app.use(errorHandler);
const ids = { a: new mongoose.Types.ObjectId(), b: new mongoose.Types.ObjectId(), c: new mongoose.Types.ObjectId(),
  managerA: new mongoose.Types.ObjectId(), managerB: new mongoose.Types.ObjectId(), managerC: new mongoose.Types.ObjectId(),
  staffA: new mongoose.Types.ObjectId(), staffB: new mongoose.Types.ObjectId(), admin: new mongoose.Types.ObjectId(),
  customer: new mongoose.Types.ObjectId(), category: new mongoose.Types.ObjectId(), vehicle: new mongoose.Types.ObjectId() };
const token = (id: mongoose.Types.ObjectId) => jwt.sign({ userId: id.toString(), tokenVersion: 0 }, env.JWT_SECRET);
const auth = (id: mongoose.Types.ObjectId) => `Bearer ${token(id)}`;
const transferInput = () => ({ vehicleId: ids.vehicle.toString(), toBranchId: ids.b.toString(), transferReason: 'Cân đối số lượng xe chi nhánh nhận' });
const maintenanceInput = () => ({ vehicleId: ids.vehicle.toString(), maintenanceType: 'Repair', description: 'Kiểm tra và thay má phanh trước', performedBy: 'Nguyễn Văn Kỹ', cost: 250000 });
const createTransfer = async () => {
  const response = await request(app).post('/api/transfers').set('Authorization', auth(ids.managerB)).send(transferInput());
  expect(response.status).toBe(201); return response.body.data._id as string;
};
const createTicket = async (extra: Record<string, unknown> = {}) => {
  const response = await request(app).post('/api/maintenance').set('Authorization', auth(ids.staffA)).send({ ...maintenanceInput(), ...extra });
  expect(response.status).toBe(201); return response.body.data._id as string;
};
const createBooking = (status: BookingStatus) => Booking.create({ bookingCode: `FLEET-${status}`, vehicleId: ids.vehicle,
  userId: ids.customer, pickupBranchId: ids.a, returnBranchId: ids.a, pickupDateTime: new Date('2030-01-01T01:00:00Z'),
  returnDateTime: new Date('2030-01-02T01:00:00Z'), totalAmount: 150000, status });

describe('Fleet operations UC64, UC77–80', () => {
  beforeAll(async () => {
    if (process.env.NODE_ENV !== 'test' || mongoose.connection.readyState !== 0) throw new Error('Use vitest.fleet.config.mts with a disconnected Mongoose instance.');
    await mongoose.connect(uri); assertOwnedDatabase(); ownsConnection = true;
    await Promise.all([Branch.init(), User.init(), Category.init(), Vehicle.init(), Booking.init(), MaintenanceLog.init(), VehicleTransfer.init(), Notification.init()]);
  });
  beforeEach(async () => {
    assertOwnedDatabase();
    await Promise.all([Branch.deleteMany({}), User.deleteMany({}), Category.deleteMany({}), Vehicle.deleteMany({}), Booking.deleteMany({}), MaintenanceLog.deleteMany({}), VehicleTransfer.deleteMany({}), Notification.deleteMany({})]);
    await Branch.create([
      { _id: ids.a, name: 'Fleet Source', code: 'FLEET-A', address: 'Local A', phone: '0900000001' },
      { _id: ids.b, name: 'Fleet Destination', code: 'FLEET-B', address: 'Local B', phone: '0900000002' },
      { _id: ids.c, name: 'Fleet Foreign', code: 'FLEET-C', address: 'Local C', phone: '0900000003' },
    ]);
    await Category.create({ _id: ids.category, name: 'Fleet local', slug: 'fleet-local' });
    await User.create([
      { _id: ids.managerA, username: 'fleet_manager_a', roles: 'BranchManager', branchId: ids.a },
      { _id: ids.managerB, username: 'fleet_manager_b', roles: 'BranchManager', branchId: ids.b },
      { _id: ids.managerC, username: 'fleet_manager_c', roles: 'BranchManager', branchId: ids.c },
      { _id: ids.staffA, username: 'fleet_staff_a', roles: 'Staff', branchId: ids.a },
      { _id: ids.staffB, username: 'fleet_staff_b', roles: 'Staff', branchId: ids.b },
      { _id: ids.admin, username: 'fleet_admin', roles: 'SystemAdmin' },
      { _id: ids.customer, username: 'fleet_customer', roles: 'Customer' },
    ]);
    await Vehicle.create({ _id: ids.vehicle, branchId: ids.a, category: ids.category, vehicleModel: 'Local scooter', brand: 'Honda',
      licensePlate: '43-FLEET-01', dailyPrice: 150000, odometer: 1400 });
  });
  afterAll(async () => {
    stopOdometerAlertJob();
    try { if (ownsConnection) { assertOwnedDatabase(); await mongoose.connection.db!.dropDatabase(); } }
    finally { if (ownsConnection && mongoose.connection.name === databaseName) await mongoose.disconnect(); }
  });

  it('keeps a request Pending at its source, then source approval moves the branch exactly once', async () => {
    const id = await createTransfer();
    expect((await Vehicle.findById(ids.vehicle))?.branchId.toString()).toBe(ids.a.toString());
    expect((await VehicleTransfer.findById(id))?.status).toBe('Pending');
    const approved = await request(app).put(`/api/transfers/${id}/approve`).set('Authorization', auth(ids.managerA)).send({});
    expect(approved.status).toBe(200); expect(approved.body.data.status).toBe('Approved');
    expect((await Vehicle.findById(ids.vehicle))?.branchId.toString()).toBe(ids.b.toString());
    expect((await request(app).put(`/api/transfers/${id}/approve`).set('Authorization', auth(ids.managerA)).send({})).status).toBe(409);
  });
  it('rejects self approval, foreign approval, and staff transfer access', async () => {
    const id = await createTransfer();
    for (const actor of [ids.managerB, ids.managerC, ids.staffA]) {
      expect((await request(app).put(`/api/transfers/${id}/approve`).set('Authorization', auth(actor)).send({})).status).toBe(403);
    }
    expect((await request(app).post('/api/transfers').set('Authorization', auth(ids.managerC)).send(transferInput())).status).toBe(403);
    expect((await Vehicle.findById(ids.vehicle))?.branchId.toString()).toBe(ids.a.toString());
  });
  it('allows admin review and rejects duplicate concurrent pending requests', async () => {
    const responses = await Promise.all([request(app).post('/api/transfers').set('Authorization', auth(ids.managerB)).send(transferInput()),
      request(app).post('/api/transfers').set('Authorization', auth(ids.managerB)).send(transferInput())]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    const pending = await VehicleTransfer.findOne({ status: 'Pending' });
    expect((await request(app).put(`/api/transfers/${pending!._id.toString()}/approve`).set('Authorization', auth(ids.admin)).send({})).status).toBe(200);
  });
  it('rejects the request with a reason while retaining the source branch', async () => {
    const id = await createTransfer();
    const response = await request(app).put(`/api/transfers/${id}/reject`).set('Authorization', auth(ids.managerA)).send({ rejectionReason: 'Cần giữ xe phục vụ khách tại chỗ' });
    expect(response.status).toBe(200); expect(response.body.data.status).toBe('Rejected');
    expect((await Vehicle.findById(ids.vehicle))?.branchId.toString()).toBe(ids.a.toString());
    expect((await request(app).put(`/api/transfers/${id}/approve`).set('Authorization', auth(ids.managerA)).send({})).status).toBe(409);
  });
  it.each<BookingStatus>(['Pending', 'Approved', 'Confirmed', 'Ongoing'])('blocks transfer and maintenance for a future %s booking', async (status) => {
    await createBooking(status);
    expect((await request(app).post('/api/transfers').set('Authorization', auth(ids.managerB)).send(transferInput())).status).toBe(409);
    expect((await request(app).post('/api/maintenance').set('Authorization', auth(ids.staffA)).send(maintenanceInput())).status).toBe(409);
  });
  it('rechecks bookings and active branches at approval and prevents inactive destinations', async () => {
    const id = await createTransfer(); await createBooking('Confirmed');
    expect((await request(app).put(`/api/transfers/${id}/approve`).set('Authorization', auth(ids.managerA)).send({})).status).toBe(409);
    await Booking.deleteMany({}); await Branch.updateOne({ _id: ids.b }, { isActive: false });
    expect((await request(app).put(`/api/transfers/${id}/approve`).set('Authorization', auth(ids.managerA)).send({})).status).toBe(409);
    expect((await Vehicle.findById(ids.vehicle))?.branchId.toString()).toBe(ids.a.toString());
  });
  it('stores issue and technician, reserves immediately, and permits only manager completion', async () => {
    await Vehicle.updateOne({ _id: ids.vehicle }, { odometer: 3400, requiresMaintenance: true, lastMaintenanceBucket: 2 });
    const id = await createTicket();
    const scheduled = await MaintenanceLog.findById(id);
    expect(scheduled?.description).toBe(maintenanceInput().description); expect(scheduled?.performedBy).toBe('Nguyễn Văn Kỹ');
    expect(scheduled?.startDate).toBeUndefined(); expect((await Vehicle.findById(ids.vehicle))?.status).toBe('Maintenance');
    expect((await request(app).put(`/api/maintenance/${id}/complete`).set('Authorization', auth(ids.managerA)).send({ cost: 200000 })).status).toBe(409);
    expect((await request(app).put(`/api/maintenance/${id}/start`).set('Authorization', auth(ids.staffA)).send({})).status).toBe(200);
    expect((await request(app).put(`/api/maintenance/${id}/complete`).set('Authorization', auth(ids.staffA)).send({ cost: 200000 })).status).toBe(403);
    const response = await request(app).put(`/api/maintenance/${id}/complete`).set('Authorization', auth(ids.managerA)).send({ cost: 200000, odometer: 3450 });
    expect(response.status).toBe(200); expect(response.body.data.status).toBe('Completed');
    const vehicle = await Vehicle.findById(ids.vehicle);
    expect(vehicle?.status).toBe('Available'); expect(vehicle?.requiresMaintenance).toBe(false); expect(vehicle?.lastMaintenanceBucket).toBe(2);
    expect(response.body.data.endDate).toBeTruthy();
    expect((await request(app).put(`/api/maintenance/${id}/complete`).set('Authorization', auth(ids.managerA)).send({ cost: 200000 })).status).toBe(409);
  });
  it('enforces branch ownership for ticket creation, history, and lifecycle', async () => {
    expect((await request(app).post('/api/maintenance').set('Authorization', auth(ids.staffB)).send(maintenanceInput())).status).toBe(403);
    const id = await createTicket();
    expect((await request(app).get(`/api/maintenance/vehicle/${ids.vehicle}`).set('Authorization', auth(ids.managerB))).status).toBe(403);
    expect((await request(app).put(`/api/maintenance/${id}/start`).set('Authorization', auth(ids.staffB)).send({})).status).toBe(403);
    const list = await request(app).get('/api/maintenance').set('Authorization', auth(ids.staffB));
    expect(list.status).toBe(200); expect(list.body.data).toHaveLength(0);
  });
  it('keeps future scheduled work reserved without fictitious start/completion times', async () => {
    const scheduledDate = new Date(Date.now() + 86400000).toISOString();
    const id = await createTicket({ scheduledDate });
    expect((await Vehicle.findById(ids.vehicle))?.status).toBe('Maintenance');
    expect((await MaintenanceLog.findById(id))?.startDate).toBeUndefined();
    expect((await request(app).put(`/api/maintenance/${id}/start`).set('Authorization', auth(ids.staffA)).send({})).status).toBe(409);
    expect((await request(app).put(`/api/maintenance/${id}/complete`).set('Authorization', auth(ids.managerA)).send({ cost: 1 })).status).toBe(409);
  });
  it('blocks duplicate tickets, rented/transferring vehicles, and pending transfers', async () => {
    await createTicket();
    expect((await request(app).post('/api/maintenance').set('Authorization', auth(ids.staffA)).send(maintenanceInput())).status).toBe(409);
    await MaintenanceLog.deleteMany({});
    for (const status of ['Rented', 'Transferring']) {
      await Vehicle.updateOne({ _id: ids.vehicle }, { status });
      expect((await request(app).post('/api/maintenance').set('Authorization', auth(ids.staffA)).send(maintenanceInput())).status).toBe(409);
    }
    await Vehicle.updateOne({ _id: ids.vehicle }, { status: 'Available' }); await createTransfer();
    expect((await request(app).post('/api/maintenance').set('Authorization', auth(ids.staffA)).send(maintenanceInput())).status).toBe(409);
  });
  it('paginates history and counts completed costs separately from pending estimates', async () => {
    await MaintenanceLog.create([
      { vehicleId: ids.vehicle, branchId: ids.a, description: 'Completed local work', cost: 180000, status: 'Completed' },
      { vehicleId: ids.vehicle, branchId: ids.a, description: 'Pending estimate', cost: 500000, status: 'Scheduled' },
      { vehicleId: ids.vehicle, branchId: ids.b, description: 'Another branch work', cost: 900000, status: 'Completed' },
    ]);
    const response = await request(app).get(`/api/maintenance/vehicle/${ids.vehicle}?page=1&limit=1`).set('Authorization', auth(ids.managerA));
    expect(response.status).toBe(200); expect(response.body.data).toHaveLength(1);
    expect(response.body.pagination).toMatchObject({ total: 2, totalPages: 2, page: 1 });
    expect(response.body.summary).toEqual({ totalCost: 180000, completedCount: 1, pendingCount: 1, pendingEstimatedCost: 500000 });
  });
  it('alerts once per recipient/bucket, including checkout flagged vehicles, and honors completion baseline', async () => {
    await Vehicle.updateOne({ _id: ids.vehicle }, { odometer: 1600 });
    expect(await runOdometerAlertSweep()).toBe(1);
    expect((await Vehicle.findById(ids.vehicle))?.lastMaintenanceBucket).toBe(1);
    expect(await Notification.countDocuments({ type: 'MAINTENANCE' })).toBe(3);
    await runOdometerAlertSweep();
    expect(await Notification.countDocuments({ type: 'MAINTENANCE' })).toBe(3);
    expect(await Notification.countDocuments({ userId: ids.managerB })).toBe(0);
    // Existing checkout sets both fields before the scheduled sweep sees it.
    await Vehicle.updateOne({ _id: ids.vehicle }, { odometer: 3100, requiresMaintenance: true, lastMaintenanceBucket: 2 });
    await runOdometerAlertSweep(); await runOdometerAlertSweep();
    expect(await Notification.countDocuments({ type: 'MAINTENANCE' })).toBe(6);
    const id = await createTicket();
    await request(app).put(`/api/maintenance/${id}/start`).set('Authorization', auth(ids.staffA)).send({});
    await request(app).put(`/api/maintenance/${id}/complete`).set('Authorization', auth(ids.managerA)).send({ cost: 0 });
    expect(await runOdometerAlertSweep()).toBe(0);
    await Vehicle.updateOne({ _id: ids.vehicle }, { odometer: 4500 }); await runOdometerAlertSweep();
    expect(await Notification.countDocuments({ type: 'MAINTENANCE' })).toBe(9);
  });
});
