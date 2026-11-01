import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../server';
import { env } from '../config/env';
import { setupTestEnvironment } from './testHelper';
import { User, SystemConfig, AuditLog } from '../models';

describe('S4 Polish (Hoàng): Security Hardening & UC-122 Multi-lang i18n', () => {
  let adminToken = '';
  let customerToken = '';
  let originalCustomerFirstName = '';

  beforeAll(async () => {
    await setupTestEnvironment();

    const adminUser = await User.findOne({ username: 'admin' });
    const customerUser = await User.findOne({ username: 'customer_hoang' });

    if (!adminUser || !customerUser) {
      throw new Error('Test fixtures missing admin or customer_hoang');
    }

    originalCustomerFirstName = customerUser.firstName || 'Hoàng';

    adminToken = jwt.sign(
      { userId: adminUser._id.toString(), tokenVersion: adminUser.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    customerToken = jwt.sign(
      { userId: customerUser._id.toString(), tokenVersion: customerUser.tokenVersion || 0 },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  });

  afterAll(async () => {
    await User.updateOne(
      { username: 'customer_hoang' },
      { $set: { firstName: originalCustomerFirstName } }
    );
    await SystemConfig.updateOne(
      { key: 'GLOBAL_CONFIG' },
      { $set: { defaultLocale: 'vi', i18nOverrides: { vi: {}, en: {} } } }
    );
  });

  it('1. Applies hardened Helmet HTTP security headers (CSP, X-Frame-Options DENY, nosniff)', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
  });

  it('2. Enforces global API rate limiting (429 Too Many Requests after threshold)', async () => {
    const bucketKey = `suite-rl-${Date.now()}`;

    for (let i = 0; i < 5; i++) {
      const okRes = await request(app)
        .get('/api/branches')
        .set('X-Test-Ratelimit', 'enforce')
        .set('X-Test-Ratelimit-Key', bucketKey);
      expect(okRes.status).toBe(200);
    }

    const blockedRes = await request(app)
      .get('/api/branches')
      .set('X-Test-Ratelimit', 'enforce')
      .set('X-Test-Ratelimit-Key', bucketKey);

    expect(blockedRes.status).toBe(429);
    expect(blockedRes.body.success).toBe(false);
    expect(blockedRes.body.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('3. Sanitizes XSS payloads & strips NoSQL operators while preserving valid ampersands', async () => {
    const res = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        firstName: '<script>alert("xss")</script><b>Hoàng</b> & Cộng sự',
        $where: 'this.roles === "SystemAdmin"',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.firstName).toBe('Hoàng & Cộng sự');
    expect(res.body.data.firstName).not.toContain('<script>');
  });

  it('4. Issues HMAC-signed CSRF token and blocks forged tokens or untrusted cross-site Origins', async () => {
    // 4a. Issue valid CSRF token
    const csrfRes = await request(app).get('/api/security/csrf-token');
    expect(csrfRes.status).toBe(200);
    expect(csrfRes.body.success).toBe(true);
    const csrfToken = csrfRes.body.data.csrfToken as string;
    expect(typeof csrfToken).toBe('string');
    expect(csrfToken.split('.').length).toBe(3);
    expect(csrfRes.headers['set-cookie']?.[0]).toContain('motorent_csrf=');

    // 4b. Untrusted Origin is rejected with 403 CSRF_ORIGIN_FORBIDDEN
    const evilOriginRes = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Origin', 'https://evil-attacker.example.com')
      .send({ firstName: 'Attacker' });

    expect(evilOriginRes.status).toBe(403);
    expect(evilOriginRes.body.code).toBe('CSRF_ORIGIN_FORBIDDEN');

    // 4c. Tampered CSRF token is rejected with 403 CSRF_TOKEN_INVALID
    const forgedTokenRes = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('X-CSRF-Token', `${csrfToken}tampered`)
      .send({ firstName: 'Tampered' });

    expect(forgedTokenRes.status).toBe(403);
    expect(forgedTokenRes.body.code).toBe('CSRF_TOKEN_INVALID');

    // 4d. Valid Origin + Valid CSRF token succeeds
    const validCsrfRes = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Origin', 'http://localhost:5173')
      .set('X-CSRF-Token', csrfToken)
      .send({ firstName: originalCustomerFirstName });

    expect(validCsrfRes.status).toBe(200);
    expect(validCsrfRes.body.success).toBe(true);
  });

  it('5. UC-122 Multi-lang i18n: Public read, RBAC protection, and SystemAdmin VI/EN persistence', async () => {
    // 5a. Public GET /api/system/i18n works without auth
    const initialRes = await request(app).get('/api/system/i18n');
    expect(initialRes.status).toBe(200);
    expect(initialRes.body.success).toBe(true);
    expect(initialRes.body.data.supportedLocales).toEqual(['vi', 'en']);

    // 5b. Customer cannot update i18n dictionary (403 Forbidden)
    const forbiddenRes = await request(app)
      .put('/api/system/i18n')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        defaultLocale: 'en',
        overrides: {
          vi: { 'nav.home': 'Trang nhất' },
          en: { 'nav.home': 'Discover' },
        },
      });
    expect(forbiddenRes.status).toBe(403);

    // 5c. SystemAdmin updates VI & EN translations (with XSS sanitization check)
    const csrfRes = await request(app).get('/api/security/csrf-token');
    const csrfToken = csrfRes.body.data.csrfToken as string;

    const updateRes = await request(app)
      .put('/api/system/i18n')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send({
        defaultLocale: 'en',
        overrides: {
          vi: {
            'nav.home': 'Trang chủ Đà Nẵng',
            'home.heroTitleMain': '<script>evil()</script>Dạo biển thanh lịch,',
          },
          en: {
            'nav.home': 'Explore Da Nang',
            'home.heroTitleMain': 'Cruise the coastline,',
          },
        },
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.defaultLocale).toBe('en');
    expect(updateRes.body.data.overrides.vi['nav.home']).toBe('Trang chủ Đà Nẵng');
    expect(updateRes.body.data.overrides.vi['home.heroTitleMain']).toBe('Dạo biển thanh lịch,');
    expect(updateRes.body.data.overrides.en['nav.home']).toBe('Explore Da Nang');

    // 5d. Verify AuditLog recorded UPDATE_I18N_TRANSLATIONS
    const audit = await AuditLog.findOne({ action: 'UPDATE_I18N_TRANSLATIONS' }).sort({
      timestamp: -1,
    });
    expect(audit).not.toBeNull();

    // 5e. Subsequent public GET returns persisted VI & EN overrides
    const verifyGet = await request(app).get('/api/system/i18n');
    expect(verifyGet.status).toBe(200);
    expect(verifyGet.body.data.defaultLocale).toBe('en');
    expect(verifyGet.body.data.overrides.en['home.heroTitleMain']).toBe('Cruise the coastline,');
  });
});
