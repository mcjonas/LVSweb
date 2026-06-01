import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import jwt from 'jsonwebtoken';

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({
      data,
      status: init?.status || 200,
    })),
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
  },
}));

// Mock db
vi.mock('@/lib/db', () => {
  const chain = {
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    then: vi.fn((resolve) => resolve([])), // Resolve to empty array for select
  };
  return {
    db: {
      select: vi.fn(() => ({
        from: vi.fn(() => chain),
      })),
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          then: vi.fn((resolve) => resolve()),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve()),
        })),
      })),
    },
  };
});

describe('Learning Progress API', () => {
  const mockToken = 'valid-token';
  const mockUserId = 1;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    (jwt.verify as any).mockReturnValue({ userId: mockUserId });
  });

  it('should return 401 if no authorization header is present', async () => {
    const req = {
      headers: { get: vi.fn().mockReturnValue(null) },
    };
    const response: any = await POST(req as any);
    expect(response.status).toBe(401);
  });

  it('should update progress if valid token and lessonId provided', async () => {
    const req = {
      headers: { get: vi.fn().mockReturnValue(`Bearer ${mockToken}`) },
      json: vi.fn().mockResolvedValue({ lessonId: 101 }),
    };

    const response: any = await POST(req as any);
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
  });

  it('should return 400 if lessonId is missing', async () => {
    const req = {
      headers: { get: vi.fn().mockReturnValue(`Bearer ${mockToken}`) },
      json: vi.fn().mockResolvedValue({}),
    };

    const response: any = await POST(req as any);
    expect(response.status).toBe(400);
  });
});
