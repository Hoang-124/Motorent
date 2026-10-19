import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  categoryFind: vi.fn(),
  categoryExists: vi.fn(),
  categoryCreate: vi.fn(),
  categoryById: vi.fn(),
  categoryDelete: vi.fn(),
  vehicleAggregate: vi.fn(),
  vehicleCount: vi.fn(),
  userById: vi.fn(),
  audit: vi.fn(),
}));

vi.mock('../models/Category', () => ({ Category: {
  find: mocks.categoryFind,
  exists: mocks.categoryExists,
  create: mocks.categoryCreate,
  findById: mocks.categoryById,
  findOneAndDelete: mocks.categoryDelete,
} }));
vi.mock('../models/Vehicle', () => ({ Vehicle: {
  aggregate: mocks.vehicleAggregate,
  countDocuments: mocks.vehicleCount,
} }));
vi.mock('../models/User', () => ({ User: { findById: mocks.userById } }));
vi.mock('../core/auditMiddleware', () => ({
  auditLogger: (action: string, entity: string) => (req: Request, _res: Response, next: NextFunction) => {
    mocks.audit(action, entity, req.method);
    next();
  },
}));

import categoryRoutes from '../modules/category/categoryRoutes';
import { errorHandler } from '../core/errorHandler';
import { env } from '../config/env';

const categoryId = '507f1f77bcf86cd799439011';
const userIds: Record<string, string> = {
  SystemAdmin: '507f1f77bcf86cd799439021',
  BranchManager: '507f1f77bcf86cd799439022',
  Staff: '507f1f77bcf86cd799439023',
  Customer: '507f1f77bcf86cd799439024',
};
const tokenFor = (role: string, claimedRole = role) => jwt.sign({ userId: userIds[role], role: claimedRole, tokenVersion: 0 }, env.JWT_SECRET);
const app = express();
app.use(express.json());
app.use('/api/categories', categoryRoutes);
app.use(errorHandler);

const categoryDocument = () => {
  const document = {
    _id: categoryId,
    name: 'Xe tay ga',
    slug: 'xe-tay-ga',
    description: 'Di chuyển trong phố',
    save: vi.fn().mockResolvedValue(undefined),
    toObject: (): Record<string, unknown> => ({}),
  };
  document.toObject = () => ({ _id: document._id, name: document.name, slug: document.slug, description: document.description });
  return document;
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.categoryExists.mockResolvedValue(null);
  mocks.vehicleCount.mockResolvedValue(0);
  mocks.vehicleAggregate.mockResolvedValue([]);
  mocks.categoryById.mockResolvedValue(categoryDocument());
  mocks.categoryDelete.mockResolvedValue(categoryDocument());
  mocks.categoryCreate.mockImplementation(async (data: Record<string, unknown>) => ({ toObject: () => ({ _id: categoryId, ...data }) }));
  mocks.categoryFind.mockReturnValue({ sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([categoryDocument().toObject()]) }) });
  mocks.userById.mockImplementation(async (id: string) => {
    const role = Object.keys(userIds).find((candidate) => userIds[candidate] === id);
    return role ? { _id: id, roles: role, status: 'Active', tokenVersion: 0 } : null;
  });
});

describe('category public listing', () => {
  it('preserves the public array response and adds assigned vehicle counts', async () => {
    mocks.vehicleAggregate.mockResolvedValue([{ _id: categoryId, count: 3 }]);
    const response = await request(app).get('/api/categories');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, count: 1, data: [{ _id: categoryId, name: 'Xe tay ga', slug: 'xe-tay-ga', vehicleCount: 3 }] });
    expect(mocks.vehicleAggregate).toHaveBeenCalledWith(expect.arrayContaining([{ $match: { isDeleted: { $ne: true } } }]));
  });
});

describe('category permissions', () => {
  it.each(['post', 'put', 'delete'] as const)('requires JWT for %s', async (method) => {
    const path = method === 'post' ? '/api/categories' : `/api/categories/${categoryId}`;
    const response = await request(app)[method](path).send({ name: 'Xe mới', slug: 'xe-moi' });
    expect(response.status).toBe(401);
    expect(mocks.categoryCreate).not.toHaveBeenCalled();
    expect(mocks.categoryById).not.toHaveBeenCalled();
    expect(mocks.audit).toHaveBeenCalledWith(`${method === 'post' ? 'CREATE' : method === 'put' ? 'UPDATE' : 'DELETE'}_CATEGORY`, 'Category', method.toUpperCase());
  });

  it.each(['BranchManager', 'Staff', 'Customer'])('blocks %s even with a claimed admin JWT role', async (role) => {
    const token = tokenFor(role, 'SystemAdmin');
    const results = await Promise.all([
      request(app).post('/api/categories').set('Authorization', `Bearer ${token}`).send({ name: 'Xe mới', slug: 'xe-moi' }),
      request(app).put(`/api/categories/${categoryId}`).set('Authorization', `Bearer ${token}`).send({ name: 'Xe mới' }),
      request(app).delete(`/api/categories/${categoryId}`).set('Authorization', `Bearer ${token}`),
    ]);
    expect(results.map((response) => response.status)).toEqual([403, 403, 403]);
    expect(mocks.categoryCreate).not.toHaveBeenCalled();
    expect(mocks.categoryById).not.toHaveBeenCalled();
    expect(mocks.categoryDelete).not.toHaveBeenCalled();
  });
});

describe('create category', () => {
  it('normalizes Vietnamese slugs and saves plain trimmed values', async () => {
    const response = await request(app).post('/api/categories').set('Authorization', `Bearer ${tokenFor('SystemAdmin')}`).send({ name: '  Xe   điện  ', slug: ' Xe Điện Đà Nẵng ', description: '  Tiết kiệm nhiên liệu.  ' });
    expect(response.status).toBe(201);
    expect(mocks.categoryCreate).toHaveBeenCalledWith({ name: 'Xe điện', slug: 'xe-dien-da-nang', description: 'Tiết kiệm nhiên liệu.' });
    expect(response.body.data.vehicleCount).toBe(0);
  });

  it('returns a useful duplicate name error', async () => {
    mocks.categoryExists.mockImplementation(async (query: { name?: RegExp }) => query.name ? { _id: categoryId } : null);
    const response = await request(app).post('/api/categories').set('Authorization', `Bearer ${tokenFor('SystemAdmin')}`).send({ name: 'Xe tay ga', slug: 'slug-moi' });
    expect(response.status).toBe(409);
    expect(response.body.message).toContain('Tên danh mục');
    expect(mocks.categoryCreate).not.toHaveBeenCalled();
  });

  it('returns a useful duplicate slug error', async () => {
    mocks.categoryExists.mockImplementation(async (query: { slug?: string }) => query.slug ? { _id: categoryId } : null);
    const response = await request(app).post('/api/categories').set('Authorization', `Bearer ${tokenFor('SystemAdmin')}`).send({ name: 'Xe điện', slug: 'Xe Tay Ga' });
    expect(response.status).toBe(409);
    expect(response.body.message).toContain('Slug danh mục');
  });

  it.each([
    { name: '', slug: 'xe-moi' },
    { name: 'Xe mới' },
    { name: 'Xe mới', slug: '---' },
    { name: '<script>alert(1)</script>', slug: 'xe-moi' },
    { name: 'Xe mới', slug: 'xe-moi', description: '<img src=x onerror=alert(1)>' },
    { name: 'Xe mới', slug: 'xe-moi', isDeleted: true },
    { name: 'Xe mới', slug: 'xe-moi', description: 'a'.repeat(2001) },
  ])('rejects invalid category input %#', async (body) => {
    const response = await request(app).post('/api/categories').set('Authorization', `Bearer ${tokenFor('SystemAdmin')}`).send(body);
    expect(response.status).toBe(400);
    expect(mocks.categoryCreate).not.toHaveBeenCalled();
  });

  it('maps a unique index race to a useful conflict', async () => {
    mocks.categoryCreate.mockRejectedValue({ code: 11000, keyPattern: { name: 1 } });
    const response = await request(app).post('/api/categories').set('Authorization', `Bearer ${tokenFor('SystemAdmin')}`).send({ name: 'Xe mới', slug: 'xe-moi' });
    expect(response.status).toBe(409);
    expect(response.body.message).toContain('Tên danh mục');
  });
});

describe('update and delete category', () => {
  it('updates only submitted fields, allows clearing a description, and returns a current count', async () => {
    const document = categoryDocument();
    mocks.categoryById.mockResolvedValue(document);
    mocks.vehicleCount.mockResolvedValue(2);
    const response = await request(app).put(`/api/categories/${categoryId}`).set('Authorization', `Bearer ${tokenFor('SystemAdmin')}`).send({ description: '' });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ name: 'Xe tay ga', slug: 'xe-tay-ga', description: '', vehicleCount: 2 });
    expect(document.save).toHaveBeenCalledOnce();
  });

  it('normalizes a changed slug', async () => {
    const response = await request(app).put(`/api/categories/${categoryId}`).set('Authorization', `Bearer ${tokenFor('SystemAdmin')}`).send({ slug: ' Xe Điện ' });
    expect(response.status).toBe(200);
    expect(response.body.data.slug).toBe('xe-dien');
  });

  it('rejects an empty update', async () => {
    const response = await request(app).put(`/api/categories/${categoryId}`).set('Authorization', `Bearer ${tokenFor('SystemAdmin')}`).send({});
    expect(response.status).toBe(400);
    expect(mocks.categoryById).not.toHaveBeenCalled();
  });

  it.each(['put', 'delete'] as const)('validates the category ID before %s database access', async (method) => {
    const response = await request(app)[method]('/api/categories/not-an-id').set('Authorization', `Bearer ${tokenFor('SystemAdmin')}`).send({ name: 'Xe mới' });
    expect(response.status).toBe(400);
    expect(mocks.categoryById).not.toHaveBeenCalled();
  });

  it.each(['put', 'delete'] as const)('returns 404 for a missing category on %s', async (method) => {
    mocks.categoryById.mockResolvedValue(null);
    const response = await request(app)[method](`/api/categories/${categoryId}`).set('Authorization', `Bearer ${tokenFor('SystemAdmin')}`).send({ name: 'Xe mới' });
    expect(response.status).toBe(404);
    expect(mocks.categoryDelete).not.toHaveBeenCalled();
  });

  it('blocks deletion while any non-deleted vehicle references the category', async () => {
    mocks.vehicleCount.mockResolvedValue(4);
    const response = await request(app).delete(`/api/categories/${categoryId}`).set('Authorization', `Bearer ${tokenFor('SystemAdmin')}`);
    expect(response.status).toBe(409);
    expect(response.body.message).toContain('4 xe');
    expect(mocks.vehicleCount).toHaveBeenCalledWith({ category: expect.anything(), isDeleted: { $ne: true } });
    expect(mocks.categoryDelete).not.toHaveBeenCalled();
  });

  it('deletes an unused category and returns its ID', async () => {
    const response = await request(app).delete(`/api/categories/${categoryId}`).set('Authorization', `Bearer ${tokenFor('SystemAdmin')}`);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, data: { _id: categoryId, vehicleCount: 0 } });
    expect(mocks.categoryDelete).toHaveBeenCalledOnce();
  });
});
