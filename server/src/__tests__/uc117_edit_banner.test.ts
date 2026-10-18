import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { app } from '../server';
import { env } from '../config/env';
import { setupTestEnvironment, teardownTestEnvironment } from './testHelper';
import { User } from '../models/User';
import { Banner } from '../models/Banner';
import { uploadDir } from '../core/uploadMiddleware';

// Valid 1x1 PNG buffer for testing image uploads with valid magic bytes
const VALID_PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

describe('UC-117: Edit Banner Management (Admin)', () => {
  let adminToken: string;
  let customerToken: string;
  let banner1Id: string;
  let banner2Id: string;
  let banner3Id: string;

  beforeAll(async () => {
    await setupTestEnvironment();

    const admin = await User.findOne({ username: 'admin' });
    const customer = await User.findOne({ username: 'customer_hoang' });

    if (!admin || !customer) {
      throw new Error('Test users missing');
    }

    adminToken = jwt.sign(
      { userId: admin._id.toString(), role: admin.roles, tokenVersion: admin.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    customerToken = jwt.sign(
      { userId: customer._id.toString(), role: customer.roles, tokenVersion: customer.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Clean and seed 3 test banners with sequential orders 1, 2, 3
    await Banner.deleteMany({});

    const b1 = await Banner.create({
      title: 'Khuyến mãi mùa hè 2026',
      subtitle: 'Giảm 20% khi thuê từ 3 ngày trở lên',
      imageUrl: 'https://example.com/banner1.jpg',
      linkUrl: '/bikes',
      order: 1,
      isActive: true,
      deletedAt: null,
    });
    banner1Id = b1._id.toString();

    const b2 = await Banner.create({
      title: 'Ưu đãi xe tay ga Đà Nẵng',
      subtitle: 'Tặng bảo hiểm hành trình cho khách thuê đầu tiên',
      imageUrl: 'https://example.com/banner2.jpg',
      linkUrl: '/branches',
      order: 2,
      isActive: true,
      deletedAt: null,
    });
    banner2Id = b2._id.toString();

    const b3 = await Banner.create({
      title: 'Khám phá bán đảo Sơn Trà',
      subtitle: 'Xe côn tay vượt đèo cực mượt',
      imageUrl: 'https://example.com/banner3.jpg',
      linkUrl: '/bikes?type=manual',
      order: 3,
      isActive: false,
      deletedAt: null,
    });
    banner3Id = b3._id.toString();
  }, 30000);

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  // ==========================================
  // Test 1: GET /admin/banners/:id
  // ==========================================
  describe('GET /admin/banners/:id', () => {
    it('1. Admin can fetch banner details by valid ID -> 200', async () => {
      const res = await request(app)
        .get(`/admin/banners/${banner1Id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(banner1Id);
      expect(res.body.data.title).toBe('Khuyến mãi mùa hè 2026');
    });

    it('2. Fetching soft-deleted banner -> 404', async () => {
      const softDeleted = await Banner.create({
        title: 'Banner đã xóa',
        imageUrl: 'https://example.com/deleted.jpg',
        order: 99,
        isActive: false,
        deletedAt: new Date(),
      });

      const res = await request(app)
        .get(`/admin/banners/${softDeleted._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('3. Fetching non-existent ID -> 404', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .get(`/admin/banners/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('4. Customer or unauthenticated request is rejected -> 401/403', async () => {
      const resNoAuth = await request(app).get(`/admin/banners/${banner1Id}`);
      expect(resNoAuth.status).toBe(401);

      const resCustomer = await request(app)
        .get(`/admin/banners/${banner1Id}`)
        .set('Authorization', `Bearer ${customerToken}`);
      expect(resCustomer.status).toBe(403);
    });
  });

  // ==========================================
  // Test 2: PATCH /admin/banners/:id (Field updates)
  // ==========================================
  describe('PATCH /admin/banners/:id (Editing fields)', () => {
    it('1. Sending empty body without file -> 400', async () => {
      const res = await request(app)
        .patch(`/admin/banners/${banner1Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('không được để trống');
    });

    it('2. Update single field: title only -> 200 and other fields unchanged', async () => {
      const original = await Banner.findById(banner1Id);
      expect(original).toBeTruthy();

      const res = await request(app)
        .patch(`/admin/banners/${banner1Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Khuyến mãi mùa thu 2026' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Khuyến mãi mùa thu 2026');

      const updated = await Banner.findById(banner1Id);
      expect(updated?.title).toBe('Khuyến mãi mùa thu 2026');
      expect(updated?.subtitle).toBe(original?.subtitle);
      expect(updated?.linkUrl).toBe(original?.linkUrl);
      expect(updated?.order).toBe(original?.order);
      expect(updated?.isActive).toBe(original?.isActive);
    });

    it('3. Update single field: linkUrl only -> 200', async () => {
      const res = await request(app)
        .patch(`/admin/banners/${banner1Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ linkUrl: '/bikes/promo-autumn' });

      expect(res.status).toBe(200);
      expect(res.body.data.linkUrl).toBe('/bikes/promo-autumn');

      const updated = await Banner.findById(banner1Id);
      expect(updated?.linkUrl).toBe('/bikes/promo-autumn');
    });

    it('4. Update single field: subtitle and order -> 200', async () => {
      const res = await request(app)
        .patch(`/admin/banners/${banner1Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ subtitle: 'Giảm giá 50k cho thành viên mới', order: 1 });

      expect(res.status).toBe(200);
      expect(res.body.data.subtitle).toBe('Giảm giá 50k cho thành viên mới');
    });

    it('5. Editing soft-deleted banner -> 404', async () => {
      const deletedBanner = await Banner.create({
        title: 'Banner Xóa Cũ',
        imageUrl: 'https://example.com/old.jpg',
        order: 99,
        deletedAt: new Date(),
      });

      const res = await request(app)
        .patch(`/admin/banners/${deletedBanner._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Cố tình sửa banner đã xóa' });

      expect(res.status).toBe(404);
    });

    it('6. Validation: Invalid linkUrl scheme (javascript:...) -> 400', async () => {
      const res = await request(app)
        .patch(`/admin/banners/${banner1Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ linkUrl: 'javascript:alert(1)' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('không an toàn');
    });
  });

  // ==========================================
  // Test 3: Image Replacement & Old Image Cleanup
  // ==========================================
  describe('PATCH /admin/banners/:id (Image Replacement)', () => {
    it('1. Upload replacement image: commits to DB and deletes old local image', async () => {
      // Create a dummy old file in uploadDir
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const oldFileName = `test-old-banner-${Date.now()}.png`;
      const oldFilePath = path.join(uploadDir, oldFileName);
      fs.writeFileSync(oldFilePath, VALID_PNG_BUFFER);
      expect(fs.existsSync(oldFilePath)).toBe(true);

      // Create a banner pointing to this old file
      const bannerWithOldImage = await Banner.create({
        title: 'Banner kiểm thử đổi ảnh',
        imageUrl: `/uploads/${oldFileName}`,
        order: 10,
        isActive: true,
        deletedAt: null,
      });

      // Upload replacement image via multipart
      const res = await request(app)
        .patch(`/admin/banners/${bannerWithOldImage._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('image', VALID_PNG_BUFFER, 'new-banner.png');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.imageUrl).not.toBe(`/uploads/${oldFileName}`);

      // Verify the old file was deleted from disk after successful commit
      expect(fs.existsSync(oldFilePath)).toBe(false);

      // Cleanup newly created image from disk
      if (res.body.data.imageUrl.startsWith('/uploads/')) {
        const newFilePath = path.join(uploadDir, path.basename(res.body.data.imageUrl));
        if (fs.existsSync(newFilePath)) {
          fs.unlinkSync(newFilePath);
        }
      }

      // Cleanup test banner from DB so total count returns to 3
      await Banner.deleteOne({ _id: bannerWithOldImage._id });
    });

    it('2. Invalid magic bytes upload -> 400 and old image is preserved', async () => {
      const banner = await Banner.findById(banner2Id);
      const originalImageUrl = banner?.imageUrl;

      const fakeImageBuffer = Buffer.from('THIS_IS_NOT_A_VALID_IMAGE_FILE');

      const res = await request(app)
        .patch(`/admin/banners/${banner2Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('image', fakeImageBuffer, 'bad-file.png');

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('không phải là ảnh hợp lệ');

      // Verify DB was NOT updated
      const afterRes = await Banner.findById(banner2Id);
      expect(afterRes?.imageUrl).toBe(originalImageUrl);
    });
  });

  // ==========================================
  // Test 4: Reorder (PATCH /admin/banners/reorder)
  // ==========================================
  describe('PATCH /admin/banners/reorder (Atomic Reordering)', () => {
    it('1. Reorder successfully with valid permutation: continuous 1..n', async () => {
      // Current active non-deleted banners: banner1, banner2, banner3 (order 1, 2, 3)
      // New permutation: reverse order -> banner3 (1), banner2 (2), banner1 (3)
      const reorderPayload = [
        { id: banner3Id, order: 1 },
        { id: banner2Id, order: 2 },
        { id: banner1Id, order: 3 },
      ];

      const res = await request(app)
        .patch('/admin/banners/reorder')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(reorderPayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const b3 = await Banner.findById(banner3Id);
      const b2 = await Banner.findById(banner2Id);
      const b1 = await Banner.findById(banner1Id);

      expect(b3?.order).toBe(1);
      expect(b2?.order).toBe(2);
      expect(b1?.order).toBe(3);
    });

    it('2. Reorder with duplicate order -> 400 and database rollback (data unchanged)', async () => {
      // Capture orders before invalid request
      const b3Before = await Banner.findById(banner3Id);
      const b2Before = await Banner.findById(banner2Id);
      const b1Before = await Banner.findById(banner1Id);

      // Duplicate order: banner3 has order 1, banner2 ALSO has order 1
      const duplicatePayload = [
        { id: banner3Id, order: 1 },
        { id: banner2Id, order: 1 },
        { id: banner1Id, order: 2 },
      ];

      const res = await request(app)
        .patch('/admin/banners/reorder')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicatePayload);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('trùng lặp');

      // Assert rollback: orders must NOT change!
      const b3After = await Banner.findById(banner3Id);
      const b2After = await Banner.findById(banner2Id);
      const b1After = await Banner.findById(banner1Id);

      expect(b3After?.order).toBe(b3Before?.order);
      expect(b2After?.order).toBe(b2Before?.order);
      expect(b1After?.order).toBe(b1Before?.order);
    });

    it('3. Reorder with invalid or soft-deleted ID -> 400 and database unchanged', async () => {
      const b3Before = await Banner.findById(banner3Id);

      const invalidPayload = [
        { id: '507f1f77bcf86cd799439099', order: 1 }, // Non-existent ID
        { id: banner2Id, order: 2 },
        { id: banner1Id, order: 3 },
      ];

      const res = await request(app)
        .patch('/admin/banners/reorder')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('không tồn tại hoặc đã bị xóa');

      const b3After = await Banner.findById(banner3Id);
      expect(b3After?.order).toBe(b3Before?.order);
    });

    it('4. Reorder with gaps (not continuous 1..n) -> 400', async () => {
      const gappedPayload = [
        { id: banner3Id, order: 1 },
        { id: banner2Id, order: 2 },
        { id: banner1Id, order: 5 }, // Gap: 1, 2, 5 (missing 3)
      ];

      const res = await request(app)
        .patch('/admin/banners/reorder')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(gappedPayload);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('liên tục từ 1 đến n');
    });

    it('5. Reorder with empty body -> 400', async () => {
      const res = await request(app)
        .patch('/admin/banners/reorder')
        .set('Authorization', `Bearer ${adminToken}`)
        .send([]);

      expect(res.status).toBe(400);
    });
  });

  // ==========================================
  // Test 5: Quick Toggle isActive & Public API reflection
  // ==========================================
  describe('PATCH /admin/banners/:id/status (Quick Toggle) & Public API', () => {
    it('1. Toggle isActive to false -> Public API excludes the banner', async () => {
      // banner1 was active, toggle it to false
      const res = await request(app)
        .patch(`/admin/banners/${banner1Id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isActive).toBe(false);

      // Verify Public API GET /banners does NOT include banner1
      const pubRes = await request(app).get('/banners');
      expect(pubRes.status).toBe(200);
      const publicBanners = pubRes.body.data;
      const foundBanner1 = publicBanners.find((b: { id?: string; _id?: string }) => {
        const id = b.id || b._id;
        return String(id) === banner1Id;
      });
      expect(foundBanner1).toBeUndefined();
    });

    it('2. Toggle isActive back to true -> Public API immediately reflects the banner', async () => {
      const res = await request(app)
        .patch(`/admin/banners/${banner1Id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true });

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(true);

      // Verify Public API GET /banners now includes banner1
      const pubRes = await request(app).get('/banners');
      expect(pubRes.status).toBe(200);
      const publicBanners = pubRes.body.data;
      const foundBanner1 = publicBanners.find((b: { id?: string; _id?: string }) => {
        const id = b.id || b._id;
        return String(id) === banner1Id;
      });
      expect(foundBanner1).toBeTruthy();
      expect(foundBanner1.title).toBe('Khuyến mãi mùa thu 2026');
    });

    it('3. Toggle status with missing isActive in body -> 400', async () => {
      const res = await request(app)
        .patch(`/admin/banners/${banner1Id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('bắt buộc');
    });

    it('4. Toggle status on soft-deleted banner -> 404', async () => {
      const softDeleted = await Banner.create({
        title: 'Banner Xóa Tạm',
        imageUrl: 'https://example.com/del.jpg',
        order: 99,
        isActive: false,
        deletedAt: new Date(),
      });

      const res = await request(app)
        .patch(`/admin/banners/${softDeleted._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true });

      expect(res.status).toBe(404);
    });
  });
});
