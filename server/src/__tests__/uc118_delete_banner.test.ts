import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { app } from '../server';
import { env } from '../config/env';
import { setupTestEnvironment, teardownTestEnvironment } from './testHelper';
import { User } from '../models/User';
import { Banner } from '../models/Banner';

describe('UC-118: Delete Banner (Soft Delete) Integration Tests', () => {
  let adminToken: string;
  let customerToken: string;
  let staffToken: string;

  beforeAll(async () => {
    await setupTestEnvironment();

    const admin = await User.findOne({ username: 'admin' });
    adminToken = jwt.sign(
      { userId: admin!._id.toString(), tokenVersion: admin!.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const customer = await User.findOne({ username: 'customer_hoang' });
    customerToken = jwt.sign(
      { userId: customer!._id.toString(), tokenVersion: customer!.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const staff = await User.findOne({ username: 'staff_dad' });
    staffToken = jwt.sign(
      { userId: staff!._id.toString(), tokenVersion: staff!.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }, 30000);

  afterAll(async () => {
    await Banner.deleteMany({});
    await teardownTestEnvironment();
  }, 10000);

  beforeEach(async () => {
    // Reset banners collection for each test to ensure complete test isolation
    await Banner.deleteMany({});
  });

  it('1. Soft delete: set deletedAt = now(). KHÔNG xóa bản ghi, KHÔNG xóa file ảnh', async () => {
    // Create test banner
    const banner = await Banner.create({
      title: 'Banner Khuyến Mãi Hè 2026',
      subtitle: 'Giảm 20% khi đặt trước 3 ngày',
      imageUrl: 'https://res.cloudinary.com/dsxbuk4pe/image/upload/v1/test_banner_1.jpg',
      linkUrl: '/bikes',
      order: 1,
      isActive: true,
      deletedAt: null,
    });

    const res = await request(app)
      .delete(`/api/admin/banners/${banner._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify record still exists in DB
    const dbRecord = await Banner.findById(banner._id);
    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.deletedAt).not.toBeNull();
    expect(new Date(dbRecord!.deletedAt!).getTime()).toBeLessThanOrEqual(Date.now());

    // Verify image URL was NOT deleted/cleared
    expect(dbRecord?.imageUrl).toBe('https://res.cloudinary.com/dsxbuk4pe/image/upload/v1/test_banner_1.jpg');
    expect(dbRecord?.title).toBe('Banner Khuyến Mãi Hè 2026');
  });

  it('2. Banner đã xóa không xuất hiện ở public API và danh sách admin mặc định', async () => {
    // Create 2 banners: 1 active, 1 to be deleted
    const banner1 = await Banner.create({
      title: 'Banner Giữ Lại',
      imageUrl: 'https://example.com/banner1.jpg',
      order: 1,
      isActive: true,
      deletedAt: null,
    });

    const banner2 = await Banner.create({
      title: 'Banner Sắp Xóa',
      imageUrl: 'https://example.com/banner2.jpg',
      order: 2,
      isActive: true,
      deletedAt: null,
    });

    // Delete banner 2
    const delRes = await request(app)
      .delete(`/api/admin/banners/${banner2._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(delRes.status).toBe(200);

    // Check Public API: GET /api/banners
    const publicRes = await request(app).get('/api/banners');
    expect(publicRes.status).toBe(200);
    expect(publicRes.body.success).toBe(true);
    const publicIds = publicRes.body.data.map((b: { id?: string; _id?: string }) => (b.id || b._id)?.toString());
    expect(publicIds).toContain(banner1._id.toString());
    expect(publicIds).not.toContain(banner2._id.toString());

    // Check Admin API: GET /api/admin/banners
    const adminRes = await request(app)
      .get('/api/admin/banners')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.success).toBe(true);
    const adminItems = adminRes.body.data.items;
    const adminIds = adminItems.map((b: { id?: string; _id?: string }) => (b.id || b._id)?.toString());
    expect(adminIds).toContain(banner1._id.toString());
    expect(adminIds).not.toContain(banner2._id.toString());
  });

  it('3. Sau khi xóa, chuẩn hóa lại order của các banner còn lại thành 1..n liên tục trong cùng transaction', async () => {
    // Create 4 banners with orders 1, 2, 3, 4
    const b1 = await Banner.create({
      title: 'Banner 1',
      imageUrl: 'https://example.com/1.jpg',
      order: 1,
      isActive: true,
      deletedAt: null,
    });
    const b2 = await Banner.create({
      title: 'Banner 2',
      imageUrl: 'https://example.com/2.jpg',
      order: 2,
      isActive: true,
      deletedAt: null,
    });
    const b3 = await Banner.create({
      title: 'Banner 3',
      imageUrl: 'https://example.com/3.jpg',
      order: 3,
      isActive: true,
      deletedAt: null,
    });
    const b4 = await Banner.create({
      title: 'Banner 4',
      imageUrl: 'https://example.com/4.jpg',
      order: 4,
      isActive: true,
      deletedAt: null,
    });

    // Delete banner #2
    const delRes = await request(app)
      .delete(`/api/admin/banners/${b2._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(delRes.status).toBe(200);

    // Refresh remaining banners from DB
    const remaining = await Banner.find({ deletedAt: null }).sort({ order: 1 });
    expect(remaining.length).toBe(3);

    // Check continuous order: 1, 2, 3
    expect(remaining[0]._id.toString()).toBe(b1._id.toString());
    expect(remaining[0].order).toBe(1);

    expect(remaining[1]._id.toString()).toBe(b3._id.toString());
    expect(remaining[1].order).toBe(2); // normalized from 3 -> 2

    expect(remaining[2]._id.toString()).toBe(b4._id.toString());
    expect(remaining[2].order).toBe(3); // normalized from 4 -> 3

    // Delete banner #1 (first in sequence)
    const delFirstRes = await request(app)
      .delete(`/api/admin/banners/${b1._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(delFirstRes.status).toBe(200);

    const remainingAfterFirst = await Banner.find({ deletedAt: null }).sort({ order: 1 });
    expect(remainingAfterFirst.length).toBe(2);
    expect(remainingAfterFirst[0]._id.toString()).toBe(b3._id.toString());
    expect(remainingAfterFirst[0].order).toBe(1); // normalized from 2 -> 1
    expect(remainingAfterFirst[1]._id.toString()).toBe(b4._id.toString());
    expect(remainingAfterFirst[1].order).toBe(2); // normalized from 3 -> 2
  });

  it('4. Xóa lần 2 -> 404', async () => {
    const banner = await Banner.create({
      title: 'Banner Xóa Hai Lần',
      imageUrl: 'https://example.com/double_del.jpg',
      order: 1,
      isActive: true,
      deletedAt: null,
    });

    // First deletion -> 200
    const firstRes = await request(app)
      .delete(`/api/admin/banners/${banner._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(firstRes.status).toBe(200);

    // Second deletion -> 404
    const secondRes = await request(app)
      .delete(`/api/admin/banners/${banner._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(secondRes.status).toBe(404);
    expect(secondRes.body.success).toBe(false);
  });

  it('5. Xóa banner không tồn tại hoặc ID không hợp lệ -> 404', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const resNonExistent = await request(app)
      .delete(`/api/admin/banners/${nonExistentId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resNonExistent.status).toBe(404);

    const resInvalidId = await request(app)
      .delete('/api/admin/banners/invalid-mongo-id-123')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resInvalidId.status).toBe(404);
  });

  it('6. Customer gọi -> 403 Forbidden; Chưa đăng nhập -> 401 Unauthorized', async () => {
    const banner = await Banner.create({
      title: 'Banner Kiểm Tra Phân Quyền',
      imageUrl: 'https://example.com/rbac.jpg',
      order: 1,
      isActive: true,
      deletedAt: null,
    });

    // Unauthenticated -> 401
    const unauthRes = await request(app).delete(`/api/admin/banners/${banner._id}`);
    expect(unauthRes.status).toBe(401);

    // Customer role -> 403
    const customerRes = await request(app)
      .delete(`/api/admin/banners/${banner._id}`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(customerRes.status).toBe(403);

    // Staff role -> 403
    const staffRes = await request(app)
      .delete(`/api/admin/banners/${banner._id}`)
      .set('Authorization', `Bearer ${staffToken}`);
    expect(staffRes.status).toBe(403);
  });

  it('7. Direct route /admin/banners/:id (without /api) works seamlessly', async () => {
    const banner = await Banner.create({
      title: 'Banner Direct Route Test',
      imageUrl: 'https://example.com/direct.jpg',
      order: 1,
      isActive: true,
      deletedAt: null,
    });

    const res = await request(app)
      .delete(`/admin/banners/${banner._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const dbRecord = await Banner.findById(banner._id);
    expect(dbRecord?.deletedAt).not.toBeNull();
  });
});
