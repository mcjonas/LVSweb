/**
 * Unit tests — /api/recordings/course/[courseId]
 *
 * Covers:
 *  - 401 when no Authorization header
 *  - 401 when Authorization header is malformed
 *  - 401 on invalid / expired JWT
 *  - 400 on non-numeric courseId
 *  - 403 when student is not enrolled
 *  - 403 when enrolled but payment not completed
 *  - 200 with recording list when access is granted
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-secret';

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('@/lib/recordings/access-control', () => ({
  canAccessCourseRecordings: vi.fn(),
}));

vi.mock('@/lib/logging/audit', () => ({
  logRecordingAccess: vi.fn(),
}));

// db mock is already in vitest.setup.ts — override per-test as needed.
const mockDbSelect = vi.fn();
vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => Promise.resolve([]),
        }),
      }),
    }),
  },
}));

import { canAccessCourseRecordings } from '@/lib/recordings/access-control';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeToken(payload: object = { userId: 42 }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

function makeRequest(courseId: string, token?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return new NextRequest(
    `http://localhost/api/recordings/course/${courseId}`,
    { headers },
  );
}

function makeParams(courseId: string) {
  return { params: Promise.resolve({ courseId }) };
}

beforeEach(() => {
  vi.resetAllMocks();
  // Patch JWT_SECRET used inside the route
  process.env.JWT_SECRET = JWT_SECRET;
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('GET /api/recordings/course/[courseId]', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const res = await GET(makeRequest('1'), makeParams('1'));
    expect(res.status).toBe(401);
  });

  it('returns 401 when Authorization header is malformed (no Bearer prefix)', async () => {
    const req = new NextRequest('http://localhost/api/recordings/course/1', {
      headers: { Authorization: 'Basic dXNlcjpwYXNz' },
    });
    const res = await GET(req, makeParams('1'));
    expect(res.status).toBe(401);
  });

  it('returns 401 on invalid JWT', async () => {
    const res = await GET(makeRequest('1', 'not.a.valid.jwt'), makeParams('1'));
    expect(res.status).toBe(401);
  });

  it('returns 401 on expired JWT', async () => {
    const expiredToken = jwt.sign({ userId: 1 }, JWT_SECRET, { expiresIn: -1 });
    const res = await GET(makeRequest('1', expiredToken), makeParams('1'));
    expect(res.status).toBe(401);
  });

  it('returns 400 for a non-numeric courseId', async () => {
    const res = await GET(
      makeRequest('abc', makeToken()),
      makeParams('abc'),
    );
    expect(res.status).toBe(400);
  });

  it('returns 403 when student is not enrolled', async () => {
    vi.mocked(canAccessCourseRecordings).mockResolvedValue({
      allowed: false,
      reason: 'not_enrolled',
    });

    const res = await GET(makeRequest('5', makeToken()), makeParams('5'));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.reason).toBe('not_enrolled');
  });

  it('returns 403 when enrolled but payment not completed', async () => {
    vi.mocked(canAccessCourseRecordings).mockResolvedValue({
      allowed: false,
      reason: 'not_paid',
    });

    const res = await GET(makeRequest('5', makeToken()), makeParams('5'));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.reason).toBe('not_paid');
  });

  it('returns 200 with recordings when access is granted', async () => {
    vi.mocked(canAccessCourseRecordings).mockResolvedValue({ allowed: true });

    const res = await GET(makeRequest('5', makeToken()), makeParams('5'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.recordings)).toBe(true);
  });
});
