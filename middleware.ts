import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Memory-based rate limiter (note: this resets on server restart/re-deploy)
// For a production app with multiple instances, use Redis.
const ipCache = new Map<string, { count: number; lastRequest: number }>();

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 20; // 20 requests per minute per IP

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 1. Rate Limiting for sensitive routes
  if (path.startsWith('/api/auth') || path.startsWith('/api/learning/auth') || path.startsWith('/api/paystack/initialize')) {
    // Standard way to get IP in Next.js middleware (works on Vercel and standard Node)
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'anonymous';
    
    const now = Date.now();
    const userData = ipCache.get(ip);

    if (userData) {
      if (now - userData.lastRequest < RATE_LIMIT_WINDOW_MS) {
        if (userData.count >= MAX_REQUESTS) {
          return new NextResponse('Too Many Requests', { 
            status: 429,
            headers: {
              'Retry-After': Math.ceil((userData.lastRequest + RATE_LIMIT_WINDOW_MS - now) / 1000).toString()
            }
          });
        }
        userData.count++;
      } else {
        userData.count = 1;
        userData.lastRequest = now;
      }
    } else {
      ipCache.set(ip, { count: 1, lastRequest: now });
    }
  }

  // 2. Protect dashboard routes
  if (path.startsWith('/dashboard')) {
    const authCookie = request.cookies.get('dashboard_auth');
    
    if (!authCookie || authCookie.value !== 'authenticated') {
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
  ],
};
