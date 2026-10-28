import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../server';
import { setupTestEnvironment } from './testHelper';
import { StaticPage } from '../models/StaticPage';
import { disconnectDatabase } from '../config/database';

describe('UC-119: Static Pages (FAQ / Terms / Privacy / CMS)', () => {
  let adminToken: string;
  let customerToken: string;

  beforeAll(async () => {
    await setupTestEnvironment();

    // Authenticate Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'admin', password: 'Admin@123456' });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.data.token;

    // Authenticate Customer
    const customerRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'customer_hoang', password: 'Customer@123456' });
    expect(customerRes.status).toBe(200);
    customerToken = customerRes.body.data.token;

    // Ensure 3 system pages exist (faq, terms, privacy)
    await StaticPage.deleteMany({});
    await StaticPage.create([
      {
        slug: 'faq',
        title: 'Câu Hỏi Thường Gặp (FAQ)',
        type: 'FAQ',
        isPublished: true,
        content: '<p>Nội dung câu hỏi thường gặp về thuê xe tại Đà Nẵng.</p>',
      },
      {
        slug: 'terms',
        title: 'Điều Khoản Dịch Vụ',
        type: 'Terms',
        isPublished: true,
        content: '<p>Quy định và điều khoản thuê xe tự lái.</p>',
      },
      {
        slug: 'privacy',
        title: 'Chính Sách Bảo Mật',
        type: 'Privacy',
        isPublished: true,
        content: '<p>Cam kết bảo mật dữ liệu khách hàng theo chuẩn eKYC.</p>',
      },
    ]);
  }, 30000);

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('1. Admin CRUD Operations', () => {
    let createdPageId: string;

    it('GET /api/admin/pages should return paginated list of pages and support filtering', async () => {
      const res = await request(app)
        .get('/api/admin/pages?limit=10&page=1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(3);

      // Filter by type
      const faqRes = await request(app)
        .get('/api/admin/pages?type=FAQ')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(faqRes.status).toBe(200);
      expect(faqRes.body.data.every((p: { type: string }) => p.type === 'FAQ')).toBe(true);
    });

    it('POST /api/admin/pages creates a new page and auto-generates slug from Vietnamese title', async () => {
      const res = await request(app)
        .post('/api/admin/pages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Hướng Dẫn Thuê Xe Tự Lái Tại Sân Bay',
          content: '<p>Chi tiết các bước nhận xe tại sảnh đến quốc nội T1.</p>',
          type: 'Other',
          isPublished: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe('huong-dan-thue-xe-tu-lai-tai-san-bay');
      expect(res.body.data.isPublished).toBe(false);
      expect(res.body.data.type).toBe('Other');
      expect(res.body.data.updatedBy).toBeDefined();

      createdPageId = res.body.data._id;
    });

    it('GET /api/admin/pages/:id returns page details with populated updatedBy', async () => {
      const res = await request(app)
        .get(`/api/admin/pages/${createdPageId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(createdPageId);
      expect(res.body.data.title).toBe('Hướng Dẫn Thuê Xe Tự Lái Tại Sân Bay');
    });

    it('PATCH /api/admin/pages/:id updates page fields and sets isPublished to true', async () => {
      const res = await request(app)
        .patch(`/api/admin/pages/${createdPageId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Hướng Dẫn Nhận Xe Sân Bay Đà Nẵng 2026',
          isPublished: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Hướng Dẫn Nhận Xe Sân Bay Đà Nẵng 2026');
      expect(res.body.data.isPublished).toBe(true);
    });

    it('DELETE /api/admin/pages/:id deletes a custom page', async () => {
      const res = await request(app)
        .delete(`/api/admin/pages/${createdPageId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify it no longer exists
      const verifyRes = await request(app)
        .get(`/api/admin/pages/${createdPageId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(verifyRes.status).toBe(404);
    });
  });

  describe('2. Slug Rules: Kebab-case, Reserved Routes, Duplicate Rejections', () => {
    it('POST /api/admin/pages rejects duplicate slug with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/admin/pages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Trùng Lặp FAQ',
          slug: 'faq', // Already exists in system pages
          content: '<p>Trùng lặp slug faq</p>',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/admin/pages rejects reserved route slugs with 400 Bad Request', async () => {
      const reservedSlugs = ['admin', 'login', 'register', 'api', 'vehicles', 'bookings', 'profile'];

      for (const slug of reservedSlugs) {
        const res = await request(app)
          .post('/api/admin/pages')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            title: `Trang ${slug}`,
            slug,
            content: '<p>Nội dung thử nghiệm</p>',
          });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/bảo lưu|hệ thống/i);
      }
    }, 40000);

    it('POST /api/admin/pages rejects invalid slug formats (non kebab-case or invalid length)', async () => {
      // Too short (< 3 chars)
      const resShort = await request(app)
        .post('/api/admin/pages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Ngắn',
          slug: 'ab',
          content: '<p>Nội dung</p>',
        });
      expect(resShort.status).toBe(400);

      // Contains uppercase or special characters
      const resInvalid = await request(app)
        .post('/api/admin/pages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Sai định dạng',
          slug: 'trang_moi@2026',
          content: '<p>Nội dung</p>',
        });
      expect(resInvalid.status).toBe(400);
    }, 40000);
  });

  describe('3. System Page Protection (faq, terms, privacy)', () => {
    it('DELETE /api/admin/pages/:id on a system page is rejected with 400', async () => {
      const faqPage = await StaticPage.findOne({ slug: 'faq' });
      expect(faqPage).toBeDefined();

      const res = await request(app)
        .delete(`/api/admin/pages/${faqPage?._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Không thể xóa trang hệ thống/i);

      // Check page still exists in DB
      const verify = await StaticPage.findOne({ slug: 'faq' });
      expect(verify).not.toBeNull();
    });

    it('PATCH /api/admin/pages/:id changing the slug of a system page is rejected with 400', async () => {
      const termsPage = await StaticPage.findOne({ slug: 'terms' });
      expect(termsPage).toBeDefined();

      const res = await request(app)
        .patch(`/api/admin/pages/${termsPage?._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          slug: 'dieu-khoan-sua-doi',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Không được phép thay đổi slug của trang hệ thống/i);

      // Verify slug remained unchanged
      const verify = await StaticPage.findOne({ slug: 'terms' });
      expect(verify).not.toBeNull();
    });

    it('PATCH /api/admin/pages/:id allowed to update content/title/isPublished of system page', async () => {
      const privacyPage = await StaticPage.findOne({ slug: 'privacy' });
      expect(privacyPage).toBeDefined();

      const res = await request(app)
        .patch(`/api/admin/pages/${privacyPage?._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Chính Sách Bảo Mật Thông Tin Khách Hàng Motorent Đà Nẵng',
          content: '<p>Bảo mật tuyệt đối thông tin cá nhân và dữ liệu số eKYC.</p>',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Chính Sách Bảo Mật Thông Tin Khách Hàng Motorent Đà Nẵng');
    });
  });

  describe('4. HTML & XSS Sanitization on Backend', () => {
    it('Content with <script>, onerror=, and javascript: is thoroughly sanitized before saving', async () => {
      const dangerousHtml = `
        <h2>Chính sách an toàn</h2>
        <p>Văn bản an toàn</p>
        <script>alert('xss-attack')</script>
        <p onerror="alert('onerror-xss')">Đoạn văn có sự kiện inline</p>
        <a href="javascript:alert('malicious')">Nhấn vào đây để nhận thưởng</a>
        <iframe src="https://attacker.com/evil"></iframe>
        <a href="https://motorent.vn/docs" target="_blank">Tài liệu chính thức</a>
      `;

      const res = await request(app)
        .post('/api/admin/pages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Thử Nghiệm Bảo Mật XSS',
          content: dangerousHtml,
          type: 'Other',
          isPublished: true,
        });

      expect(res.status).toBe(201);
      const savedContent = res.body.data.content;

      // Assert malicious tags & attributes were eliminated
      expect(savedContent).not.toContain('<script>');
      expect(savedContent).not.toContain('alert(');
      expect(savedContent).not.toContain('onerror=');
      expect(savedContent).not.toContain('javascript:');
      expect(savedContent).not.toContain('<iframe');

      // Assert target="_blank" has rel="noopener noreferrer" enforced
      expect(savedContent).toContain('rel="noopener noreferrer"');
      expect(savedContent).toContain('target="_blank"');
    });
  });

  describe('5. Public Route: GET /pages/:slug', () => {
    let draftPageSlug: string;

    beforeAll(async () => {
      const draft = await StaticPage.create({
        slug: 'ban-thao-noi-bo',
        title: 'Bản Thảo Nội Bộ Chưa Xuất Bản',
        content: '<p>Nội dung bản thảo.</p>',
        type: 'Other',
        isPublished: false,
      });
      draftPageSlug = draft.slug;
    });

    it('Public GET /pages/:slug returns published page without updatedBy or admin email', async () => {
      const res = await request(app).get('/api/pages/faq');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe('faq');
      expect(res.body.data.title).toBeDefined();
      expect(res.body.data.content).toBeDefined();

      // Ensure updatedBy / admin info is excluded from public response
      expect(res.body.data.updatedBy).toBeUndefined();
    });

    it('Public GET /pages/:slug also works without /api prefix', async () => {
      const res = await request(app).get('/pages/faq');
      expect(res.status).toBe(200);
      expect(res.body.data.slug).toBe('faq');
    });

    it('Public GET /pages/:slug for an unpublished draft page returns 404', async () => {
      const res = await request(app).get(`/api/pages/${draftPageSlug}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/chưa được xuất bản|không tồn tại/i);
    });

    it('Public GET /pages/:slug for non-existent slug returns 404', async () => {
      const res = await request(app).get('/api/pages/non-existent-slug-xyz');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('6. Security & RBAC Enforcement', () => {
    it('Customer calling admin pages API returns 403 Forbidden', async () => {
      // GET
      const getRes = await request(app)
        .get('/api/admin/pages')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(getRes.status).toBe(403);

      // POST
      const postRes = await request(app)
        .post('/api/admin/pages')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          title: 'Khách hàng tạo trái phép',
          content: '<p>Hack</p>',
        });
      expect(postRes.status).toBe(403);
    });

    it('Unauthenticated caller hitting admin pages API returns 401 Unauthorized', async () => {
      const res = await request(app).get('/api/admin/pages');
      expect(res.status).toBe(401);
    });
  });
});
