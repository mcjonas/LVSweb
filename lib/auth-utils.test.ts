/**
 * Unit tests — lib/auth-utils.ts (HMAC-signed session cookie)
 *
 * Covers:
 *  - throws 'Unauthorized' if cookie is missing
 *  - throws 'Unauthorized' if cookie value is the old plaintext 'authenticated'
 *  - throws 'Unauthorized' if cookie value is an invalid token
 *  - resolves if cookie value is a valid HMAC-signed session token
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkAuth } from './auth-utils';
import { cookies } from 'next/headers';
import { createSessionToken } from './session';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

const SESSION_SECRET = 'at-least-16-chars-here';

beforeEach(() => {
  process.env.SESSION_SECRET = SESSION_SECRET;
});

describe('checkAuth (HMAC session token)', () => {
  it('throws "Unauthorized" if dashboard_auth cookie is missing', async () => {
    (cookies as any).mockReturnValue({
      get: vi.fn().mockReturnValue(undefined),
    });

    await expect(checkAuth()).rejects.toThrow('Unauthorized');
  });

  it('throws "Unauthorized" if cookie has the old plaintext value "authenticated"', async () => {
    (cookies as any).mockReturnValue({
      get: vi.fn().mockReturnValue({ value: 'authenticated' }),
    });

    await expect(checkAuth()).rejects.toThrow('Unauthorized');
  });

  it('throws "Unauthorized" if cookie has a random invalid token', async () => {
    (cookies as any).mockReturnValue({
      get: vi.fn().mockReturnValue({ value: 'v1.not.a.real.token' }),
    });

    await expect(checkAuth()).rejects.toThrow('Unauthorized');
  });

  it('resolves when cookie has a valid HMAC-signed token', async () => {
    const validToken = await createSessionToken();
    (cookies as any).mockReturnValue({
      get: vi.fn().mockReturnValue({ value: validToken }),
    });

    await expect(checkAuth()).resolves.not.toThrow();
  });
});
