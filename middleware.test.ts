/**
 * Unit tests — middleware.ts (updated for HMAC session cookie)
 *
 * Covers:
 *  - Rate limiter: first N requests pass, N+1 is blocked (429)
 *  - Rate limiter: includes Retry-After header
 *  - Rate limiter: does NOT rate-limit non-auth routes
 *  - Rate limiter: covers /api/learning/auth and /api/paystack/initialize
 *  - Dashboard auth guard: missing cookie → redirect to /login
 *  - Dashboard auth guard: old plaintext 'authenticated' → redirect (no longer valid)
 *  - Dashboard auth guard: invalid HMAC token → redirect to /login
 *  - Dashboard auth guard: valid HMAC token → passes through (200)
 *  - Dashboard auth guard: deep path with valid cookie → passes through
 *  - Redirect includes 'from' param with original path
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { middleware } from './middleware';
import { NextRequest } from 'next/server';
import { createSessionToken } from './lib/session';

const SESSION_SECRET = 'at-least-16-chars-here';

beforeEach(() => {
  process.env.SESSION_SECRET = SESSION_SECRET;
});

function makeRequest(
  path: string,
  opts: { cookie?: string; ip?: string } = {},
): NextRequest {
  const url = `http://localhost${path}`;
  const headers: Record<string, string> = {};
  if (opts.ip)     headers['x-forwarded-for'] = opts.ip;
  if (opts.cookie) headers['cookie']          = opts.cookie;
  return new NextRequest(url, { method: 'POST', headers });
}

// Unique IPs so tests don't share rate-limit state
const uniqueIp = () => `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

describe('Middleware — rate limiter', () => {
  it('allows the first 20 requests within the window', async () => {
    const ip = uniqueIp();
    for (let i = 0; i < 20; i++) {
      const res = await middleware(makeRequest('/api/auth', { ip }));
      expect(res.status).not.toBe(429);
    }
  });

  it('blocks the 21st request with 429', async () => {
    const ip = uniqueIp();
    for (let i = 0; i < 20; i++) await middleware(makeRequest('/api/auth', { ip }));
    const res = await middleware(makeRequest('/api/auth', { ip }));
    expect(res.status).toBe(429);
  });

  it('includes Retry-After header on 429 response', async () => {
    const ip = uniqueIp();
    for (let i = 0; i < 20; i++) await middleware(makeRequest('/api/auth', { ip }));
    const res = await middleware(makeRequest('/api/auth', { ip }));
    expect(res.headers.get('Retry-After')).toBeTruthy();
  });

  it('does NOT rate-limit non-auth routes', async () => {
    const ip = uniqueIp();
    for (let i = 0; i < 30; i++) {
      const res = await middleware(makeRequest('/api/videos', { ip }));
      expect(res.status).not.toBe(429);
    }
  });

  it('rate limits /api/learning/auth/login', async () => {
    const ip = uniqueIp();
    for (let i = 0; i < 20; i++) await middleware(makeRequest('/api/learning/auth/login', { ip }));
    const res = await middleware(makeRequest('/api/learning/auth/login', { ip }));
    expect(res.status).toBe(429);
  });

  it('rate limits /api/paystack/initialize', async () => {
    const ip = uniqueIp();
    for (let i = 0; i < 20; i++) await middleware(makeRequest('/api/paystack/initialize', { ip }));
    const res = await middleware(makeRequest('/api/paystack/initialize', { ip }));
    expect(res.status).toBe(429);
  });
});

describe('Middleware — dashboard auth guard', () => {
  it('redirects to /login when cookie is absent', async () => {
    const res = await middleware(makeRequest('/dashboard'));
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    expect(res.headers.get('location')).toContain('/login');
  });

  it('redirects when old plaintext "authenticated" cookie is presented', async () => {
    const res = await middleware(
      makeRequest('/dashboard', { cookie: 'dashboard_auth=authenticated' }),
    );
    expect(res.headers.get('location')).toContain('/login');
  });

  it('redirects when an invalid/forged HMAC token is presented', async () => {
    const res = await middleware(
      makeRequest('/dashboard', { cookie: 'dashboard_auth=v1.fake.tampered.token' }),
    );
    expect(res.headers.get('location')).toContain('/login');
  });

  it('preserves original path in redirect query param', async () => {
    const res = await middleware(makeRequest('/dashboard/bookings'));
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('from=');
  });

  it('allows access when a valid HMAC-signed token is present', async () => {
    const token = await createSessionToken();
    const res = await middleware(
      makeRequest('/dashboard', { cookie: `dashboard_auth=${token}` }),
    );
    expect(res.status).toBe(200);
  });

  it('allows access to deep dashboard paths with a valid token', async () => {
    const token = await createSessionToken();
    const res = await middleware(
      makeRequest('/dashboard/courses/edit/5', {
        cookie: `dashboard_auth=${token}`,
      }),
    );
    expect(res.status).toBe(200);
  });
});
