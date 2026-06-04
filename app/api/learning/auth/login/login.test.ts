/**
 * Unit tests — /api/learning/auth/login
 *
 * Covers:
 *  - 400 when email or password is missing
 *  - 401 when user does not exist
 *  - 401 when password hash does not match
 *  - 200 + JWT token on successful authentication
 *  - JWT payload contains userId, email, role
 *  - JWT is signed (not plaintext)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockDbResult: any[] = [];

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve(mockDbResult),
        }),
      }),
    }),
  },
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/learning/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockDbResult.length = 0;
  process.env.JWT_SECRET = 'test-jwt-secret';
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('POST /api/learning/auth/login', () => {
  it('returns 400 when email is missing', async () => {
    const res = await POST(makeRequest({ password: 'pw' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/required/i);
  });

  it('returns 400 when password is missing', async () => {
    const res = await POST(makeRequest({ email: 'a@b.com' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when body is empty', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 401 when user does not exist', async () => {
    // mockDbResult is empty → no user found
    const res = await POST(makeRequest({ email: 'ghost@test.com', password: 'pw' }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/invalid credentials/i);
  });

  it('returns 401 on wrong password', async () => {
    const hash = await bcrypt.hash('correct-password', 10);
    mockDbResult.push({
      id: 1,
      email: 'student@test.com',
      passwordHash: hash,
      role: 'student',
    });

    const res = await POST(
      makeRequest({ email: 'student@test.com', password: 'wrong-password' }),
    );
    expect(res.status).toBe(401);
    // Must NOT reveal which field was wrong (user enumeration prevention)
    const body = await res.json();
    expect(body.error).toMatch(/invalid credentials/i);
  });

  it('returns 200 with a JWT on correct credentials', async () => {
    const hash = await bcrypt.hash('mypassword', 10);
    mockDbResult.push({
      id: 7,
      email: 'valid@test.com',
      passwordHash: hash,
      role: 'student',
    });

    const res = await POST(
      makeRequest({ email: 'valid@test.com', password: 'mypassword' }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(typeof body.token).toBe('string');
  });

  it('JWT payload contains correct userId, email, and role', async () => {
    const hash = await bcrypt.hash('mypassword', 10);
    mockDbResult.push({
      id: 7,
      email: 'valid@test.com',
      passwordHash: hash,
      role: 'student',
    });

    const res = await POST(
      makeRequest({ email: 'valid@test.com', password: 'mypassword' }),
    );
    const { token } = await res.json();
    const decoded = jwt.verify(token, 'test-jwt-secret') as any;

    expect(decoded.userId).toBe(7);
    expect(decoded.email).toBe('valid@test.com');
    expect(decoded.role).toBe('student');
  });

  it('returned token is a properly structured JWT (3 parts)', async () => {
    const hash = await bcrypt.hash('pw', 10);
    mockDbResult.push({ id: 1, email: 'u@t.com', passwordHash: hash, role: 'student' });

    const res = await POST(makeRequest({ email: 'u@t.com', password: 'pw' }));
    const { token } = await res.json();

    // A JWT is three base64url segments joined by dots
    expect(token.split('.').length).toBe(3);
  });
});
