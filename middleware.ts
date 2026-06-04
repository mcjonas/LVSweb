import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken } from '@/lib/session';

// ── Rate limiting ────────────────────────────────────────────────────────────
//
// Uses Upstash Redis when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
// are configured (production-grade, works across Vercel instances).
//
// Falls back gracefully to an in-memory Map when env vars are absent
// (suitable for local development / single-instance deployments).
//
// Upstash ratelimit / redis are imported lazily so the middleware still
// compiles even without the packages installed.

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 20; // 20 requests per minute per IP

// ── In-memory fallback ──────────────────────────────────────────────────────
const ipCache = new Map<string, { count: number; lastRequest: number }>();

async function checkRateLimit(ip: string): Promise<{ limited: boolean; retryAfter?: number }> {
  // Use Upstash Redis when configured
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    try {
      // Dynamic import so the middleware bundle doesn't break if packages are absent
      const { Ratelimit } = await import('@upstash/ratelimit');
      const { Redis } = await import('@upstash/redis');

      const redis = new Redis({
        url:   process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });

      const ratelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(MAX_REQUESTS, '1 m'),
        analytics: false,
        prefix: 'lvs_rl',
      });

      const { success, reset } = await ratelimit.limit(ip);
      if (!success) {
        return { limited: true, retryAfter: Math.ceil((reset - Date.now()) / 1000) };
      }
      return { limited: false };
    } catch (err) {
      // If Redis is temporarily unavailable, fail open (don't block all requests)
      console.warn('[Rate Limit] Upstash Redis error, failing open:', err);
      return { limited: false };
    }
  }

  // ── In-memory fallback ────────────────────────────────────────────────────
  const now = Date.now();
  const userData = ipCache.get(ip);

  if (userData) {
    if (now - userData.lastRequest < RATE_LIMIT_WINDOW_MS) {
      if (userData.count >= MAX_REQUESTS) {
        const retryAfter = Math.ceil((userData.lastRequest + RATE_LIMIT_WINDOW_MS - now) / 1000);
        return { limited: true, retryAfter };
      }
      userData.count++;
    } else {
      userData.count = 1;
      userData.lastRequest = now;
    }
  } else {
    ipCache.set(ip, { count: 1, lastRequest: now });
  }

  return { limited: false };
}

// ── Sensitive routes that need rate limiting ────────────────────────────────
const RATE_LIMITED_PATHS = [
  '/api/auth',
  '/api/learning/auth',
  '/api/paystack/initialize',
  '/api/learning/paystack/initialize',
];

// ── Middleware ────────────────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 1. Rate limiting for sensitive routes
  const isRateLimited = RATE_LIMITED_PATHS.some(p => path.startsWith(p));
  if (isRateLimited) {
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'anonymous';

    const { limited, retryAfter } = await checkRateLimit(ip);
    if (limited) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter ?? 60),
        },
      });
    }
  }

  // 2. Protect dashboard routes with HMAC-signed session cookie
  if (path.startsWith('/dashboard')) {
    const authCookie = request.cookies.get('dashboard_auth');

    const isValid = authCookie && await verifySessionToken(authCookie.value);
    if (!isValid) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', path);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/auth/:path*',
    '/api/learning/auth/:path*',
    '/api/paystack/initialize',
    '/api/learning/paystack/initialize',
  ],
};
