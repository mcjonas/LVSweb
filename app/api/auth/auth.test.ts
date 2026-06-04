/**
 * Unit tests — /api/auth (with HMAC-signed session cookie)
 *
 * Covers:
 *  - POST: correct password → 200 + signed httpOnly cookie
 *  - POST: cookie value is NOT the plaintext 'authenticated' string
 *  - POST: wrong password  → 401
 *  - POST: missing body / password field → 401
 *  - POST: missing DASHBOARD_PASSWORD env → 500
 *  - POST: missing SESSION_SECRET env → 500 (can't sign token)
 *  - DELETE: clears the cookie → 200
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST, DELETE } from './route';
import { NextRequest } from 'next/server';

function makeRequest(body: unknown, method = 'POST'): NextRequest {
  return new NextRequest('http://localhost/api/auth', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/auth POST — login', () => {
  const originalPwd    = process.env.DASHBOARD_PASSWORD;
  const originalSecret = process.env.SESSION_SECRET;

  beforeEach(() => {
    process.env.DASHBOARD_PASSWORD = 'super-secret';
    process.env.SESSION_SECRET     = 'at-least-16-chars-here';
  });

  afterEach(() => {
    process.env.DASHBOARD_PASSWORD = originalPwd;
    process.env.SESSION_SECRET     = originalSecret;
  });

  it('returns 200 and sets httpOnly cookie on correct password', async () => {
    const res = await POST(makeRequest({ password: 'super-secret' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);

    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('dashboard_auth=');
    expect(setCookie.toLowerCase()).toContain('httponly');
  });

  it('cookie value is a signed HMAC token, NOT the plaintext string "authenticated"', async () => {
    const res = await POST(makeRequest({ password: 'super-secret' }));
    const setCookie = res.headers.get('set-cookie') ?? '';

    // The value must contain v1. prefix (our token format)
    expect(setCookie).toMatch(/dashboard_auth=v1\./);
    // It must NOT be the old plaintext value
    expect(setCookie).not.toContain('dashboard_auth=authenticated');
  });

  it('cookie is marked Secure', async () => {
    const res = await POST(makeRequest({ password: 'super-secret' }));
    const setCookie = (res.headers.get('set-cookie') ?? '').toLowerCase();
    expect(setCookie).toContain('secure');
  });

  it('cookie is SameSite=Strict', async () => {
    const res = await POST(makeRequest({ password: 'super-secret' }));
    const setCookie = (res.headers.get('set-cookie') ?? '').toLowerCase();
    expect(setCookie).toContain('samesite=strict');
  });

  it('returns 401 on wrong password', async () => {
    const res = await POST(makeRequest({ password: 'wrong' }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it('returns 401 when password field is missing', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(401);
  });

  it('returns 500 when DASHBOARD_PASSWORD env is not configured', async () => {
    delete process.env.DASHBOARD_PASSWORD;
    const res = await POST(makeRequest({ password: 'anything' }));
    expect(res.status).toBe(500);
  });

  it('returns 500 when SESSION_SECRET env is missing', async () => {
    delete process.env.SESSION_SECRET;
    const res = await POST(makeRequest({ password: 'super-secret' }));
    expect(res.status).toBe(500);
  });

  it('does NOT set cookie on failed authentication', async () => {
    const res = await POST(makeRequest({ password: 'bad' }));
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).not.toContain('dashboard_auth=v1.');
  });
});

describe('/api/auth DELETE — logout', () => {
  it('returns 200 and deletes the cookie', async () => {
    const res = await DELETE();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Cookie should be cleared
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toMatch(/dashboard_auth/i);
  });
});
