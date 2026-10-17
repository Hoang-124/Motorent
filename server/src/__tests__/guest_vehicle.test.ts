import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app, io, server } from '../server';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { Branch } from '../models/Branch';
import { Category } from '../models/Category';
import { Vehicle } from '../models/Vehicle';
import { Feedback } from '../models/Feedback';
import { Booking, type BookingStatus } from '../models/Booking';
import { StaticPage } from '../models/StaticPage';
import { User } from '../models/User';

// Never use testHelper or either configured application database. Each invocation
// owns one unique local database; cleanup must validate that exact connection.
const databasePrefix = 'motorent_guest_uc03_14_';
const databaseName = `${databasePrefix}${process.pid}_${Date.now()}`;
const mongoUri = `mongodb://127.0.0.1:27017/${databaseName}?serverSelectionTimeoutMS=3000&connectTimeoutMS=3000`;
let ownsConnection = false;

const assertOwnedLocalDatabase = (): void => {
  const requested = new URL(mongoUri);
  const connection = mongoose.connection;
  if (
    requested.protocol !== 'mongodb:' ||
    requested.hostname !== '127.0.0.1' ||
    requested.pathname !== `/${databaseName}` ||
    !/^motorent_guest_uc03_14_\d+_\d+$/.test(databaseName) ||
    !databaseName.startsWith(databasePrefix) ||
    !['127.0.0.1', 'localhost', '::1'].includes(connection.host) ||
    connection.name !== databaseName ||
    connection.db?.databaseName !== databaseName ||
    connection.readyState !== 1
  ) {
    throw new Error('Guest test database ownership check failed; refusing database cleanup.');
  }
};

const ids = {
  branchA: new mongoose.Types.ObjectId(),
  branchB: new mongoose.Types.ObjectId(),
  scooter: new mongoose.Types.ObjectId(),
  manual: new mongoose.Types.ObjectId(),
  customer: new mongoose.Types.ObjectId(),
  atlas: new mongoose.Types.ObjectId(),
  comet: new mongoose.Types.ObjectId(),
  breeze: new mongoose.Types.ObjectId(),
  literal: new mongoose.Types.ObjectId(),
  dune: new mongoose.Types.ObjectId(),
  deleted: new mongoose.Types.ObjectId(),
};

const publicReviewComments = ['Public atlas older', 'Public atlas newer'];
const resultIds = (body: { data: Array<{ _id: string }> }): string[] => body.data.map((vehicle) => vehicle._id);

describe('Guest UC03–14 public vehicle APIs', () => {
  beforeAll(async () => {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('Run only through vitest.guest.config.mts with NODE_ENV=test.');
    }
    if (mongoose.connection.readyState !== 0) {
      throw new Error('Guest tests require a disconnected Mongoose instance; existing database is untouched.');
    }
    expect(server.listening).toBe(false);

    await connectDatabase(mongoUri);
    assertOwnedLocalDatabase();
    ownsConnection = true;

    await Branch.create([
      { _id: ids.branchA, name: 'Guest Branch A', code: 'GUEST-A', address: 'Local fixture A', phone: '0900000001' },
      { _id: ids.branchB, name: 'Guest Branch B', code: 'GUEST-B', address: 'Local fixture B', phone: '0900000002' },
    ]);
    await Category.create([
      { _id: ids.scooter, name: 'Guest Scooters', slug: 'guest-scooters' },
      { _id: ids.manual, name: 'Guest Manuals', slug: 'guest-manuals' },
    ]);
    await User.create({
      _id: ids.customer,
      username: 'guest_review_fixture',
      firstName: 'Public',
      lastName: 'Reviewer',
      email: 'guest-fixture@example.invalid',
      roles: 'Customer',
      status: 'Active',
    });
    await Vehicle.create([
      { _id: ids.atlas, vehicleModel: 'Atlas Z', brand: 'Honda', licensePlate: '43-A101', dailyPrice: 150000, hourlyPrice: 25000, branchId: ids.branchA, category: ids.scooter, images: ['https://example.invalid/atlas.jpg'] },
      { _id: ids.comet, vehicleModel: 'Road Comet', brand: 'Honda', licensePlate: '43-A102', dailyPrice: 220000, branchId: ids.branchA, category: ids.manual, status: 'Rented' },
      { _id: ids.breeze, vehicleModel: 'Breeze', brand: 'Yamaha', licensePlate: '43-B201', dailyPrice: 120000, branchId: ids.branchB, category: ids.scooter },
      { _id: ids.literal, vehicleModel: 'Lite (Plus)', brand: 'Vespa', licensePlate: 'Q3-A103', dailyPrice: 280000, branchId: ids.branchA, category: ids.scooter },
      { _id: ids.dune, vehicleModel: 'Dune', brand: 'Piaggio', licensePlate: '43-B202', dailyPrice: 90000, branchId: ids.branchB, category: ids.manual },
      { _id: ids.deleted, vehicleModel: 'Archived Z', brand: 'Honda', licensePlate: '43-X001', dailyPrice: 100000, branchId: ids.branchA, category: ids.scooter, isDeleted: true },
    ]);

    // Each Feedback references a distinct Booking, preserving the one-review-per-booking index.
    const reviewCases = [
      { vehicleId: ids.atlas, rating: 3, comment: publicReviewComments[0], isPublic: true, isBlocked: false, createdAt: new Date('2026-01-01T00:00:00Z') },
      { vehicleId: ids.atlas, rating: 5, comment: publicReviewComments[1], imageUrls: ['https://example.invalid/review-side.jpg'], isPublic: true, isBlocked: false, createdAt: new Date('2026-01-02T00:00:00Z') },
      { vehicleId: ids.atlas, rating: 1, comment: 'Blocked atlas review', isPublic: true, isBlocked: true },
      { vehicleId: ids.atlas, rating: 1, comment: 'Private atlas review', isPublic: false, isBlocked: false },
      { vehicleId: ids.comet, rating: 2, comment: 'Public comet review', isPublic: true, isBlocked: false },
      { vehicleId: ids.comet, rating: 5, comment: 'Blocked comet review', isPublic: true, isBlocked: true },
      { vehicleId: ids.comet, rating: 5, comment: 'Private comet review', isPublic: false, isBlocked: false },
      { vehicleId: ids.breeze, rating: 3, comment: 'Public breeze review', isPublic: true, isBlocked: false },
      { vehicleId: ids.deleted, rating: 5, comment: 'Deleted vehicle review', isPublic: true, isBlocked: false },
    ];
    for (const [index, review] of reviewCases.entries()) {
      const booking = await Booking.create({
        bookingCode: `GUEST-REVIEW-${index}`,
        userId: ids.customer,
        vehicleId: review.vehicleId,
        pickupBranchId: ids.branchA,
        returnBranchId: ids.branchA,
        pickupDateTime: new Date('2025-12-01T01:00:00Z'),
        returnDateTime: new Date('2025-12-02T01:00:00Z'),
        totalAmount: 150000,
        status: 'Completed',
      });
      await Feedback.create({ ...review, userId: ids.customer, bookingId: booking._id });
    }

    const calendarCases: Array<{ status: BookingStatus; pickup: string; returned: string }> = [
      { status: 'Confirmed', pickup: '2027-02-01T00:00:00+07:00', returned: '2027-02-02T00:00:00+07:00' },
      { status: 'Pending', pickup: '2027-02-10T23:30:00+07:00', returned: '2027-02-11T00:00:00+07:00' },
      { status: 'Approved', pickup: '2027-02-12T10:00:00+07:00', returned: '2027-02-13T10:00:00+07:00' },
      { status: 'Ongoing', pickup: '2027-02-19T08:00:00+07:00', returned: '2027-02-20T00:00:00+07:00' },
      { status: 'Confirmed', pickup: '2027-02-28T23:00:00+07:00', returned: '2027-03-01T00:00:00+07:00' },
      { status: 'Confirmed', pickup: '2027-01-31T22:00:00+07:00', returned: '2027-02-01T00:00:00+07:00' },
      { status: 'Confirmed', pickup: '2027-03-01T00:00:00+07:00', returned: '2027-03-02T00:00:00+07:00' },
      { status: 'Cancelled', pickup: '2027-02-15T08:00:00+07:00', returned: '2027-02-16T08:00:00+07:00' },
      { status: 'Completed', pickup: '2027-02-16T08:00:00+07:00', returned: '2027-02-17T08:00:00+07:00' },
      { status: 'Rejected', pickup: '2027-02-17T08:00:00+07:00', returned: '2027-02-18T08:00:00+07:00' },
    ];
    await Booking.create(calendarCases.map((entry, index) => ({
      bookingCode: `GUEST-CALENDAR-${index}`,
      userId: ids.customer,
      vehicleId: ids.atlas,
      pickupBranchId: ids.branchA,
      returnBranchId: ids.branchA,
      pickupDateTime: new Date(entry.pickup),
      returnDateTime: new Date(entry.returned),
      status: entry.status,
      totalAmount: 150000,
    })));
    await StaticPage.create([
      { slug: 'rental-policy', title: 'Published rental policy', content: '<p>Published terms fixture.</p>', isPublished: true },
      { slug: 'draft-policy', title: 'Private draft policy', content: '<p>Draft must stay private.</p>', isPublished: false },
    ]);
  });

  afterAll(async () => {
    try {
      if (ownsConnection) {
        assertOwnedLocalDatabase();
        if (!mongoose.connection.db) throw new Error('Owned test database handle is missing.');
        await mongoose.connection.db.dropDatabase();
      }
    } finally {
      if (
        ownsConnection &&
        mongoose.connection.name === databaseName &&
        ['127.0.0.1', 'localhost', '::1'].includes(mongoose.connection.host)
      ) {
        await disconnectDatabase();
      }
      await new Promise<void>((resolve) => io.close(() => resolve()));
    }
  });

  it('returns the complete public fleet without pagination and excludes soft-deleted vehicles', async () => {
    const response = await request(app).get('/api/vehicles').expect(200);
    expect(response.body.success).toBe(true);
    expect(resultIds(response.body)).toHaveLength(5);
    expect(resultIds(response.body)).not.toContain(ids.deleted.toString());
    expect(response.body.count).toBe(5);
  });

  it('combines branch, category slug, manufacturer and inclusive price filters', async () => {
    const response = await request(app).get('/api/vehicles').query({
      branchId: ids.branchA.toString(), category: 'guest-scooters', brand: 'Honda', minPrice: 150000, maxPrice: 150000,
    }).expect(200);
    expect(resultIds(response.body)).toEqual([ids.atlas.toString()]);
  });

  it('returns no vehicles for an unknown category slug instead of discarding the filter', async () => {
    const response = await request(app).get('/api/vehicles').query({ category: 'missing-category', page: 1, limit: 2 }).expect(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.pagination).toMatchObject({ page: 1, limit: 2, total: 0, pages: 0 });
  });

  it('filters availability status together with branch', async () => {
    const response = await request(app).get('/api/vehicles').query({ branchId: ids.branchA.toString(), status: 'Available' }).expect(200);
    expect(resultIds(response.body).sort()).toEqual([ids.atlas.toString(), ids.literal.toString()].sort());
  });

  it('accepts one-character search and searches model, manufacturer and plate without auth', async () => {
    const model = await request(app).get('/api/vehicles').query({ q: 'z' }).expect(200);
    expect(resultIds(model.body).sort()).toEqual([ids.atlas.toString(), ids.breeze.toString()].sort());
    const manufacturer = await request(app).get('/api/vehicles').query({ q: 'piag' }).expect(200);
    expect(resultIds(manufacturer.body)).toEqual([ids.dune.toString()]);
    const plate = await request(app).get('/api/vehicles').query({ q: 'Q3' }).expect(200);
    expect(resultIds(plate.body)).toEqual([ids.literal.toString()]);
  });

  it('treats regular-expression characters as literal search text', async () => {
    const parenthesis = await request(app).get('/api/vehicles').query({ q: '(' }).expect(200);
    expect(resultIds(parenthesis.body)).toEqual([ids.literal.toString()]);
    const wildcard = await request(app).get('/api/vehicles').query({ q: '.*' }).expect(200);
    expect(wildcard.body.data).toEqual([]);
  });

  it('sorts price in both directions and paginates with total metadata', async () => {
    const ascending = await request(app).get('/api/vehicles').query({ sort: 'price_asc' }).expect(200);
    expect(ascending.body.data.map((vehicle: { dailyPrice: number }) => vehicle.dailyPrice)).toEqual([90000, 120000, 150000, 220000, 280000]);
    const descending = await request(app).get('/api/vehicles').query({ sort: 'price_desc', page: 2, limit: 2 }).expect(200);
    expect(resultIds(descending.body)).toEqual([ids.atlas.toString(), ids.breeze.toString()]);
    expect(descending.body.pagination).toMatchObject({ page: 2, limit: 2, total: 5, pages: 3 });
  });

  it('sorts public ratings in both directions without counting blocked or private feedback', async () => {
    const descending = await request(app).get('/api/vehicles').query({ sort: 'rating_desc' }).expect(200);
    expect(resultIds(descending.body).slice(0, 3)).toEqual([ids.atlas.toString(), ids.breeze.toString(), ids.comet.toString()]);
    expect(descending.body.data.slice(0, 3).map((vehicle: { ratingAverage: number }) => vehicle.ratingAverage)).toEqual([4, 3, 2]);
    const ascending = await request(app).get('/api/vehicles').query({ sort: 'rating_asc' }).expect(200);
    expect(resultIds(ascending.body).slice(-3)).toEqual([ids.comet.toString(), ids.breeze.toString(), ids.atlas.toString()]);
  });

  it('returns detail specifications, gallery and public review aggregates', async () => {
    const response = await request(app).get(`/api/vehicles/${ids.atlas}`).expect(200);
    expect(response.body.data).toMatchObject({
      _id: ids.atlas.toString(), vehicleModel: 'Atlas Z', dailyPrice: 150000, hourlyPrice: 25000,
      ratingAverage: 4, reviewCount: 2, images: ['https://example.invalid/atlas.jpg'],
      branchId: { _id: ids.branchA.toString() }, category: { slug: 'guest-scooters' },
    });
  });

  it('paginates only public, unblocked vehicle reviews', async () => {
    const first = await request(app).get(`/api/vehicles/${ids.atlas}/reviews`).query({ page: 1, limit: 1 }).expect(200);
    const second = await request(app).get(`/api/vehicles/${ids.atlas}/reviews`).query({ page: 2, limit: 1 }).expect(200);
    expect(first.body.data).toHaveLength(1);
    expect(second.body.data).toHaveLength(1);
    expect([first.body.data[0].comment, second.body.data[0].comment].sort()).toEqual([...publicReviewComments].sort());
    expect(first.body.data[0]._id).not.toBe(second.body.data[0]._id);
    expect(first.body.data[0].imageUrls).toEqual(['https://example.invalid/review-side.jpg']);
    expect(first.body.pagination).toMatchObject({ page: 1, limit: 1, total: 2, pages: 2 });
    expect(second.body.pagination).toMatchObject({ page: 2, limit: 1, total: 2, pages: 2 });
  });

  it('uses Vietnam dates and half-open intervals for the monthly availability calendar', async () => {
    const response = await request(app).get(`/api/vehicles/${ids.atlas}/availability`).query({ month: '2027-02' }).expect(200);
    expect(response.body.data.blockedDates).toEqual([
      '2027-02-01', '2027-02-10', '2027-02-12', '2027-02-13', '2027-02-19', '2027-02-28',
    ]);
  });

  it('returns 404 for deleted vehicle detail, reviews and calendar', async () => {
    await request(app).get(`/api/vehicles/${ids.deleted}`).expect(404);
    await request(app).get(`/api/vehicles/${ids.deleted}/reviews`).expect(404);
    await request(app).get(`/api/vehicles/${ids.deleted}/availability`).query({ month: '2027-02' }).expect(404);
  });

  it('serves only published rental policy pages to guests', async () => {
    const published = await request(app).get('/api/pages/rental-policy').expect(200);
    expect(published.body.data).toMatchObject({ slug: 'rental-policy', title: 'Published rental policy', content: '<p>Published terms fixture.</p>' });
    await request(app).get('/api/pages/draft-policy').expect(404);
    await request(app).get('/api/pages/unknown-policy').expect(404);
  });
});
