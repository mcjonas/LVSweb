import { describe, it, expect, vi } from 'vitest';
import { checkAuth } from './auth-utils';
import { cookies } from 'next/headers';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

describe('checkAuth', () => {
  it('should throw "Unauthorized" if dashboard_auth cookie is missing', async () => {
    (cookies as any).mockReturnValue({
      get: vi.fn().mockReturnValue(undefined),
    });

    await expect(checkAuth()).rejects.toThrow('Unauthorized');
  });

  it('should throw "Unauthorized" if dashboard_auth cookie value is not "authenticated"', async () => {
    (cookies as any).mockReturnValue({
      get: vi.fn().mockReturnValue({ value: 'wrong_value' }),
    });

    await expect(checkAuth()).rejects.toThrow('Unauthorized');
  });

  it('should not throw if dashboard_auth cookie value is "authenticated"', async () => {
    (cookies as any).mockReturnValue({
      get: vi.fn().mockReturnValue({ value: 'authenticated' }),
    });

    await expect(checkAuth()).resolves.not.toThrow();
  });
});
