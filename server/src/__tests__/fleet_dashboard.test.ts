import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { errorHandler } from '../core/errorHandler';
import { Branch } from '../models/Branch';
import { User } from '../models/User';
import { Vehicle, type VehicleStatus } from '../models/Vehicle';
import { MaintenanceLog, type MaintenanceStatus } from '../models/MaintenanceLog';
import { VehicleTransfer, type TransferStatus } from '../models/VehicleTransfer';
import dashboardRoutes from '../modules/fleet/dashboardRoutes';

const databaseName = `motorent_fleet_dashboard_${process.pid}_${Date.now()}`;
const uri = `mongodb://127.0.0.1:27017/${databaseName}?serverSelectionTimeoutMS=3000&connectTimeoutMS=3000`;
let ownsConnection = false;
const assertOwnedDatabase = () => {
  const requested = new URL(uri);
  if (requested.protocol !== 'mongodb:' || requested.hostname !== '127.0.0.1' ||
    requested.pathname !== `/${databaseName}` || !/^motorent_fleet_dashboard_\d+_\d+$/.test(databaseName) ||
    mongoose.connection.host !== '127.0.0.1' || mongoose.connection.name !== databaseName ||
    mongoose.connection.db?.databaseName !== databaseName || mongoose.connection.readyState !== 1) {
    throw new Error('Dashboard test database ownership check failed; refusing cleanup.');
  }
};
const app = express();
app.use(express.json()); app.use('/api/fleet', dashboardRoutes); app.use(errorHandler);
const endpoint = '/api/fleet/dashboard';
const ids = {
  a: new mongoose.Types.ObjectId(), b: new mongoose.Types.ObjectId(), c: new mongoose.Types.ObjectId(),
  manager: new mongoose.Types.ObjectId(), unassigned: new mongoose.Types.ObjectId(),
  admin: new mongoose.Types.ObjectId(), staff: new mongoose.Types.ObjectId(), customer: new mongoose.Types.ObjectId(),
  category: new mongoose.Types.ObjectId(), readyA: new mongoose.Types.ObjectId(), dueA: new mongoose.Types.ObjectId(),
  rentedA: new mongoose.Types.ObjectId(), maintenanceA: new mongoose.Types.ObjectId(), transferringA: new mongoose.Types.ObjectId(),
  deletedA: new mongoose.Types.ObjectId(), readyB: new mongoose.Types.ObjectId(), maintenanceB: new mongoose.Types.ObjectId(),
};
const auth = (id: mongoose.Types.ObjectId) => `Bearer ${jwt.sign({ userId: id.toString(), tokenVersion: 0 }, env.JWT_SECRET)}`;
const get = (userId: mongoose.Types.ObjectId, branchId?: string) => request(app).get(endpoint)
  .query(branchId ? { branchId } : {}).set('Authorization', auth(userId));
const vehicle = (id: mongoose.Types.ObjectId, branchId: mongoose.Types.ObjectId, status: VehicleStatus, due = false, isDeleted = false) => ({
  _id: id, branchId, category: ids.category, vehicleModel: 'Dashboard local', brand: 'Honda', licensePlate: `43-${id.toString()}`,
  dailyPrice: 150000, status, requiresMaintenance: due, isDeleted,
});
const maintenance = (vehicleId: mongoose.Types.ObjectId, branchId: mongoose.Types.ObjectId, status: MaintenanceStatus, cost: number) => ({
  vehicleId, branchId, status, cost, description: 'Local dashboard fixture',
});
const transfer = (vehicleId: mongoose.Types.ObjectId, fromBranchId: mongoose.Types.ObjectId, toBranchId: mongoose.Types.ObjectId, status: TransferStatus) => ({
  vehicleId, fromBranchId, toBranchId, status, transferReason: 'Local dashboard fixture', requestedBy: ids.manager,
});

describe('Fleet dashboard branch scope and counts', () => {
  beforeAll(async () => {
    if (process.env.NODE_ENV !== 'test' || mongoose.connection.readyState !== 0) {
      throw new Error('Use vitest.dashboard.config.mts with a disconnected Mongoose instance.');
    }
    await mongoose.connect(uri); assertOwnedDatabase(); ownsConnection = true;
    await Promise.all([Branch.init(), User.init(), Vehicle.init(), MaintenanceLog.init(), VehicleTransfer.init()]);
  });
  beforeEach(async () => {
    assertOwnedDatabase();
    await Promise.all([Branch.deleteMany({}), User.deleteMany({}), Vehicle.deleteMany({}), MaintenanceLog.deleteMany({}), VehicleTransfer.deleteMany({})]);
    await Branch.create([
      { _id: ids.a, name: 'Dashboard A', code: 'DASH-A', address: 'Local A', phone: '0900000001' },
      { _id: ids.b, name: 'Dashboard B', code: 'DASH-B', address: 'Local B', phone: '0900000002' },
      { _id: ids.c, name: 'Dashboard Empty', code: 'DASH-C', address: 'Local C', phone: '0900000003' },
    ]);
    await User.create([
      { _id: ids.manager, username: 'dashboard_manager', roles: 'BranchManager', branchId: ids.a },
      { _id: ids.unassigned, username: 'dashboard_unassigned', roles: 'BranchManager' },
      { _id: ids.admin, username: 'dashboard_admin', roles: 'SystemAdmin' },
      { _id: ids.staff, username: 'dashboard_staff', roles: 'Staff', branchId: ids.a },
      { _id: ids.customer, username: 'dashboard_customer', roles: 'Customer' },
    ]);
    await Vehicle.create([
      vehicle(ids.readyA, ids.a, 'Available'), vehicle(ids.dueA, ids.a, 'Available', true),
      vehicle(ids.rentedA, ids.a, 'Rented'), vehicle(ids.maintenanceA, ids.a, 'Maintenance', true),
      vehicle(ids.transferringA, ids.a, 'Transferring'), vehicle(ids.deletedA, ids.a, 'Available', true, true),
      vehicle(ids.readyB, ids.b, 'Available'), vehicle(ids.maintenanceB, ids.b, 'Maintenance'),
    ]);
    await MaintenanceLog.create([
      maintenance(ids.dueA, ids.a, 'Scheduled', 125000), maintenance(ids.maintenanceA, ids.a, 'InProgress', 200000),
      maintenance(ids.readyA, ids.a, 'Completed', 300000), maintenance(ids.readyB, ids.a, 'Completed', 500000),
      maintenance(ids.readyB, ids.b, 'Completed', 900000), maintenance(ids.deletedA, ids.a, 'Scheduled', 1000000),
      maintenance(ids.deletedA, ids.a, 'Completed', 4000000),
    ]);
    await VehicleTransfer.create([
      transfer(ids.readyA, ids.a, ids.b, 'Pending'), transfer(ids.readyB, ids.b, ids.a, 'Pending'),
      transfer(ids.readyB, ids.b, ids.c, 'Pending'), transfer(ids.transferringA, ids.a, ids.c, 'InTransit'),
      transfer(ids.readyB, ids.b, ids.a, 'InTransit'), transfer(ids.readyA, ids.a, ids.b, 'Approved'),
      transfer(ids.readyA, ids.a, ids.b, 'Completed'), transfer(ids.readyA, ids.a, ids.b, 'Rejected'),
      transfer(ids.deletedA, ids.a, ids.b, 'Pending'), transfer(ids.deletedA, ids.b, ids.a, 'InTransit'),
    ]);
  });
  afterAll(async () => {
    try { if (ownsConnection) { assertOwnedDatabase(); await mongoose.connection.db!.dropDatabase(); } }
    finally { if (ownsConnection && mongoose.connection.host === '127.0.0.1' && mongoose.connection.name === databaseName) await mongoose.disconnect(); }
  });

  it('requires authentication and permits only branch managers and system admins', async () => {
    expect((await request(app).get(endpoint)).status).toBe(401);
    expect((await get(ids.staff)).status).toBe(403);
    expect((await get(ids.customer)).status).toBe(403);
    expect((await get(ids.manager)).status).toBe(200);
    expect((await get(ids.admin)).status).toBe(200);
  });

  it('counts the manager branch, excludes deleted vehicles, and separates due flags from status and readiness', async () => {
    const response = await get(ids.manager);
    expect(response.status).toBe(200);
    const data = response.body.data;
    expect(data.scope).toEqual({ branchId: ids.a.toString(), name: 'Dashboard A', code: 'DASH-A' });
    expect(data.branches).toEqual([]);
    expect(data.vehicles).toEqual({ total: 5, statusCounts: { Available: 2, Rented: 1, Maintenance: 1, Transferring: 1 },
      readyCount: 1, maintenanceDueCount: 2, availableWithMaintenanceDueCount: 1 });
    expect(Object.values(data.vehicles.statusCounts).reduce((sum: number, count) => sum + Number(count), 0)).toBe(data.vehicles.total);
    expect(new Date(data.generatedAt).getTime()).not.toBeNaN();
  });

  it('rejects another branch and refuses global access for an unassigned manager', async () => {
    expect((await get(ids.manager, ids.b.toString())).status).toBe(403);
    expect((await get(ids.unassigned)).status).toBe(403);
    expect((await get(ids.unassigned, ids.a.toString())).status).toBe(403);
    expect((await get(ids.manager, ids.a.toString())).status).toBe(200);
  });

  it('allows an admin to switch between network totals and a selected branch', async () => {
    const all = await get(ids.admin);
    expect(all.status).toBe(200);
    expect(all.body.data.scope.branchId).toBeNull();
    expect(all.body.data.branches.map((branch: { _id: string }) => branch._id).sort()).toEqual([ids.a, ids.b, ids.c].map(String).sort());
    expect(all.body.data.vehicles).toEqual({ total: 7, statusCounts: { Available: 3, Rented: 1, Maintenance: 2, Transferring: 1 },
      readyCount: 2, maintenanceDueCount: 2, availableWithMaintenanceDueCount: 1 });
    const branch = await get(ids.admin, ids.b.toString());
    expect(branch.status).toBe(200);
    expect(branch.body.data.scope.branchId).toBe(ids.b.toString());
    expect(branch.body.data.vehicles).toEqual({ total: 2, statusCounts: { Available: 1, Rented: 0, Maintenance: 1, Transferring: 0 },
      readyCount: 1, maintenanceDueCount: 0, availableWithMaintenanceDueCount: 0 });
  });

  it('keeps completed and estimated costs distinct, preserves recorded-branch history, and excludes deleted vehicle logs', async () => {
    const local = await get(ids.manager);
    expect(local.status).toBe(200);
    expect(local.body.data.maintenance).toEqual({ scheduledCount: 1, inProgressCount: 1, pendingCount: 2,
      completedCount: 2, pendingEstimatedCost: 325000, completedCost: 800000 });
    const other = await get(ids.admin, ids.b.toString());
    expect(other.body.data.maintenance).toEqual({ scheduledCount: 0, inProgressCount: 0, pendingCount: 0,
      completedCount: 1, pendingEstimatedCost: 0, completedCost: 900000 });
    const all = await get(ids.admin);
    expect(all.body.data.maintenance.completedCost).toBe(1700000);
  });

  it('counts active transfers once with local directions and excludes unrelated, closed, and deleted vehicle transfers', async () => {
    const local = await get(ids.manager);
    expect(local.status).toBe(200);
    expect(local.body.data.transfers).toEqual({ pendingCount: 2, pendingInboundCount: 1, pendingOutboundCount: 1,
      inTransitCount: 2, inTransitInboundCount: 1, inTransitOutboundCount: 1 });
    const all = await get(ids.admin);
    expect(all.body.data.transfers.pendingCount).toBe(3);
    expect(all.body.data.transfers.inTransitCount).toBe(2);
  });

  it('rejects malformed branch queries and returns 404 for a missing valid branch', async () => {
    expect((await get(ids.admin, 'invalid')).status).toBe(400);
    expect((await request(app).get(endpoint).query({ branchId: [ids.a.toString(), ids.b.toString()] }).set('Authorization', auth(ids.admin))).status).toBe(400);
    expect((await get(ids.admin, new mongoose.Types.ObjectId().toString())).status).toBe(404);
  });

  it('returns real zeros for a branch with no vehicles or maintenance history', async () => {
    const response = await get(ids.admin, ids.c.toString());
    expect(response.status).toBe(200);
    expect(response.body.data.vehicles).toEqual({ total: 0, statusCounts: { Available: 0, Rented: 0, Maintenance: 0, Transferring: 0 },
      readyCount: 0, maintenanceDueCount: 0, availableWithMaintenanceDueCount: 0 });
    expect(response.body.data.maintenance).toEqual({ scheduledCount: 0, inProgressCount: 0, pendingCount: 0,
      completedCount: 0, pendingEstimatedCost: 0, completedCost: 0 });
    // C has incoming active requests, so zero inventory must not erase them.
    expect(response.body.data.transfers).toEqual({ pendingCount: 1, pendingInboundCount: 1, pendingOutboundCount: 0,
      inTransitCount: 1, inTransitInboundCount: 1, inTransitOutboundCount: 0 });
  });
});
