import { describe, it, expect, vi } from 'vitest';
import { POST } from './route';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';

// Mock NextResponse
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({
      data,
      status: init?.status || 200,
    })),
  },
}));

// Mock db
vi.mock('@/lib/db', () => {
  const chain = {
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    then: vi.fn((resolve) => resolve([])), // Resolve to empty array
  };
  return {
    db: {
      select: vi.fn(() => ({
        from: vi.fn(() => chain),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve()),
        })),
      })),
    },
  };
});

describe('Paystack Webhook API', () => {
  it('should return 400 if signature is invalid', async () => {
    process.env.PAYSTACK_SECRET_KEY = 'test_secret';
    
    const req = {
      text: vi.fn().mockResolvedValue('{"event":"charge.success"}'),
      headers: {
        get: vi.fn().mockReturnValue('invalid_signature'),
      },
    };

    const response: any = await POST(req as any);
    expect(response.status).toBe(400);
    expect(response.data.message).toBe('Invalid signature');
  });

  it('should return 200 and process event if signature is valid', async () => {
    const secret = 'test_secret';
    process.env.PAYSTACK_SECRET_KEY = secret;
    const body = JSON.stringify({ event: 'charge.success', data: { customer: { email: 'test@example.com' }, amount: 10000, reference: 'ref123' } });
    const signature = crypto.createHmac('sha512', secret).update(body).digest('hex');

    const req = {
      text: vi.fn().mockResolvedValue(body),
      headers: {
        get: vi.fn().mockReturnValue(signature),
      },
    };

    const response: any = await POST(req as any);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');
  });
});
