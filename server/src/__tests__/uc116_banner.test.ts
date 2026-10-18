import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { app } from '../server';
import { env } from '../config/env';
import { setupTestEnvironment } from './testHelper';
import { User } from '../models/User';
import { Banner } from '../models/Banner';

describe('UC-116: Add Banner for Home Page (Admin)', () => {
  let adminToken: string;
  let customerToken: string;
  let staffToken: string;

  // Minimal valid 1x1 JPEG magic bytes buffer
  const validJpegBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    0x00, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01,
    0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff,
    0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0xbf, 0x00, 0xff, 0xd9
  ]);

  beforeAll(async () => {
    await setupTestEnvironment();

    const admin = await User.findOne({ username: 'admin' });
    const customer = await User.findOne({ username: 'customer_hoang' });
    const staff = await User.findOne({ username: 'staff_dad' });

    if (!admin || !customer || !staff) {
      throw new Error('Test fixtures missing in database');
    }

    adminToken = jwt.sign(
      { userId: admin._id.toString(), tokenVersion: admin.tokenVersion || 0, role: admin.roles },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    customerToken = jwt.sign(
      { userId: customer._id.toString(), tokenVersion: customer.tokenVersion || 0, role: customer.roles },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    staffToken = jwt.sign(
      { userId: staff._id.toString(), tokenVersion: staff.tokenVersion || 0, role: staff.roles },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }, 30000);

  beforeEach(async () => {
    await Banner.deleteMany({});
  });

  afterAll(async () => {
    await Banner.deleteMany({});
    await mongoose.disconnect();
  });

  describe('1. Authentication & RBAC Authorization (401 / 403)', () => {
    it('Guest (unauthenticated) calling POST /admin/banners is rejected with 401', async () => {
      const res = await request(app)
        .post('/admin/banners')
        .field('title', 'Banner Khuyến Mãi Mùa Hè')
        .attach('image', validJpegBuffer, 'summer.jpg');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('Customer calling POST /admin/banners is blocked with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/admin/banners')
        .set('Authorization', `Bearer ${customerToken}`)
        .field('title', 'Banner Khách Hàng Thêm')
        .attach('image', validJpegBuffer, 'summer.jpg');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Staff calling POST /admin/banners is blocked with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/admin/banners')
        .set('Authorization', `Bearer ${staffToken}`)
        .field('title', 'Banner Nhân Viên Thêm')
        .attach('image', validJpegBuffer, 'summer.jpg');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Guest calling GET /admin/banners is rejected with 401', async () => {
      const res = await request(app).get('/admin/banners');
      expect(res.status).toBe(401);
    });

    it('Customer calling GET /admin/banners is blocked with 403', async () => {
      const res = await request(app)
        .get('/admin/banners')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('2. Validation Rules on Creation', () => {
    it('Fails with 400 when title is missing or empty', async () => {
      const res = await request(app)
        .post('/admin/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', '   ')
        .attach('image', validJpegBuffer, 'summer.jpg');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/tiêu đề/i);
    });

    it('Fails with 400 when title exceeds 100 characters', async () => {
      const longTitle = 'A'.repeat(101);
      const res = await request(app)
        .post('/admin/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', longTitle)
        .attach('image', validJpegBuffer, 'summer.jpg');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/100 ký tự/i);
    });

    it('Fails with 400 when image is missing', async () => {
      const res = await request(app)
        .post('/admin/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Banner không có ảnh');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/ảnh/i);
    });

    it('Fails with 400 when file is not a valid image format (.txt or corrupted)', async () => {
      const textBuffer = Buffer.from('Plain text content that is not an image');
      const res = await request(app)
        .post('/admin/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Banner file không hợp lệ')
        .attach('image', textBuffer, 'document.txt');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('Fails with 400 when file size exceeds 5MB', async () => {
      const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024); // 5MB + 1KB
      // Set valid magic bytes at the beginning
      oversizedBuffer[0] = 0xff;
      oversizedBuffer[1] = 0xd8;
      oversizedBuffer[2] = 0xff;

      const res = await request(app)
        .post('/admin/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Banner file quá lớn')
        .attach('image', oversizedBuffer, 'large_image.jpg');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/5MB/i);
    });

    it('Rejects dangerous linkUrl with "javascript:..." or pseudo-protocols with 400', async () => {
      const maliciousUrls = [
        'javascript:alert("XSS")',
        'JAVASCRIPT:alert(document.cookie)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox("test")',
        '//attacker.com/malicious',
      ];

      for (const badUrl of maliciousUrls) {
        const res = await request(app)
          .post('/admin/banners')
          .set('Authorization', `Bearer ${adminToken}`)
          .field('title', 'Banner với link độc hại')
          .field('linkUrl', badUrl)
          .attach('image', validJpegBuffer, 'safe.jpg');

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      }
    });

    it('Accepts valid http(s) URL or internal path starting with "/"', async () => {
      // 1. Internal path
      const resInternal = await request(app)
        .post('/admin/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Banner Đường Dẫn Nội Bộ')
        .field('linkUrl', '/bikes?promo=true')
        .attach('image', validJpegBuffer, 'banner1.jpg');

      expect(resInternal.status).toBe(201);
      expect(resInternal.body.success).toBe(true);
      expect(resInternal.body.data.linkUrl).toBe('/bikes?promo=true');

      // 2. External HTTPS URL
      const resExternal = await request(app)
        .post('/admin/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Banner Đường Dẫn HTTPS Ngoài')
        .field('linkUrl', 'https://motorent.vn/khuyen-mai-mua-he')
        .attach('image', validJpegBuffer, 'banner2.jpg');

      expect(resExternal.status).toBe(201);
      expect(resExternal.body.success).toBe(true);
      expect(resExternal.body.data.linkUrl).toBe('https://motorent.vn/khuyen-mai-mua-he');
    });
  });

  describe('3. Order Auto-Increment & Race Condition Prevention', () => {
    it('Defaults order to 1 when no banner exists and order is not provided', async () => {
      const res = await request(app)
        .post('/admin/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Banner Đầu Tiên')
        .attach('image', validJpegBuffer, 'first.jpg');

      expect(res.status).toBe(201);
      expect(res.body.data.order).toBe(1);
    });

    it('Auto-increments order to max + 1 for subsequent creations', async () => {
      const res1 = await request(app)
        .post('/admin/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Banner 1')
        .attach('image', validJpegBuffer, 'b1.jpg');
      expect(res1.body.data.order).toBe(1);

      const res2 = await request(app)
        .post('/admin/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Banner 2')
        .attach('image', validJpegBuffer, 'b2.jpg');
      expect(res2.body.data.order).toBe(2);

      const res3 = await request(app)
        .post('/admin/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Banner 3')
        .attach('image', validJpegBuffer, 'b3.jpg');
      expect(res3.body.data.order).toBe(3);
    });

    it('Allows explicitly setting order when provided', async () => {
      const res = await request(app)
        .post('/admin/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Banner với Order cụ thể')
        .field('order', 99)
        .attach('image', validJpegBuffer, 'explicit.jpg');

      expect(res.status).toBe(201);
      expect(res.body.data.order).toBe(99);

      // Subsequent creation without order should become 99 + 1 = 100
      const nextRes = await request(app)
        .post('/admin/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', 'Banner tiếp theo')
        .attach('image', validJpegBuffer, 'next.jpg');

      expect(nextRes.status).toBe(201);
      expect(nextRes.body.data.order).toBe(100);
    });

    it('Handles concurrent creation safely without duplicate auto-increment orders', async () => {
      // Send 3 concurrent creations without order
      const [resA, resB, resC] = await Promise.all([
        request(app)
          .post('/admin/banners')
          .set('Authorization', `Bearer ${adminToken}`)
          .field('title', 'Concurrent Banner A')
          .attach('image', validJpegBuffer, 'a.jpg'),
        request(app)
          .post('/admin/banners')
          .set('Authorization', `Bearer ${adminToken}`)
          .field('title', 'Concurrent Banner B')
          .attach('image', validJpegBuffer, 'b.jpg'),
        request(app)
          .post('/admin/banners')
          .set('Authorization', `Bearer ${adminToken}`)
          .field('title', 'Concurrent Banner C')
          .attach('image', validJpegBuffer, 'c.jpg'),
      ]);

      expect(resA.status).toBe(201);
      expect(resB.status).toBe(201);
      expect(resC.status).toBe(201);

      const orders = [resA.body.data.order, resB.body.data.order, resC.body.data.order].sort(
        (a, b) => a - b
      );
      // All 3 orders must be strictly unique and consecutive: 1, 2, 3
      expect(orders).toEqual([1, 2, 3]);
    });
  });

  describe('4. Public API GET /banners & Admin GET /admin/banners', () => {
    beforeEach(async () => {
      // Seed banners with different orders, isActive states, and soft-delete
      await Banner.create([
        {
          title: 'Banner Active 1',
          imageUrl: '/uploads/b1.jpg',
          linkUrl: '/bikes',
          order: 10,
          isActive: true,
          deletedAt: null,
        },
        {
          title: 'Banner Active 2',
          imageUrl: '/uploads/b2.jpg',
          linkUrl: '/branches',
          order: 5,
          isActive: true,
          deletedAt: null,
        },
        {
          title: 'Banner Inactive',
          imageUrl: '/uploads/b_inactive.jpg',
          linkUrl: '/promo',
          order: 1,
          isActive: false,
          deletedAt: null,
        },
        {
          title: 'Banner Deleted',
          imageUrl: '/uploads/b_deleted.jpg',
          linkUrl: '/old',
          order: 2,
          isActive: true,
          deletedAt: new Date(),
        },
      ]);
    });

    it('Public GET /banners returns only active and undeleted banners sorted by order ASC', async () => {
      const res = await request(app).get('/banners');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const banners = res.body.data;
      expect(banners.length).toBe(2);

      // Order should be sorted ASC: order 5 then order 10
      expect(banners[0].title).toBe('Banner Active 2');
      expect(banners[0].order).toBe(5);
      expect(banners[1].title).toBe('Banner Active 1');
      expect(banners[1].order).toBe(10);

      // Must not expose internal fields
      for (const b of banners) {
        expect(b).toHaveProperty('title');
        expect(b).toHaveProperty('imageUrl');
        expect(b).toHaveProperty('order');
        expect(b).toHaveProperty('isActive');
        expect(b.deletedAt).toBeUndefined();
        expect(b.createdAt).toBeUndefined();
        expect(b.updatedAt).toBeUndefined();
        expect(b.__v).toBeUndefined();
      }
    });

    it('Public API also works at /api/banners route alias', async () => {
      const res = await request(app).get('/api/banners');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('Admin GET /admin/banners returns paginated undeleted banners and supports isActive filter', async () => {
      // 1. All undeleted (includes both active and inactive)
      const resAll = await request(app)
        .get('/admin/banners')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resAll.status).toBe(200);
      expect(resAll.body.success).toBe(true);
      expect(resAll.body.data.items.length).toBe(3); // 2 active + 1 inactive, excluding deleted
      expect(resAll.body.data.total).toBe(3);

      // 2. Filter isActive = false
      const resInactive = await request(app)
        .get('/admin/banners?isActive=false')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resInactive.status).toBe(200);
      expect(resInactive.body.data.items.length).toBe(1);
      expect(resInactive.body.data.items[0].title).toBe('Banner Inactive');

      // 3. Filter isActive = true
      const resActive = await request(app)
        .get('/admin/banners?isActive=true')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resActive.status).toBe(200);
      expect(resActive.body.data.items.length).toBe(2);
    });
  });
});
