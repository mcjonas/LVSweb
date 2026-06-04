/**
 * POST /api/learning/auth/refresh
 *
 * Issues a new short-lived access token (7d) when the client presents a valid
 * long-lived refresh token (30d, stored in httpOnly cookie).
 *
 * Flow:
 *   1. Client reads the `lms_refresh` httpOnly cookie
 *   2. Verifies it is a valid, unexpired JWT signed with REFRESH_TOKEN_SECRET
 *   3. Returns a fresh access token signed with JWT_SECRET
 *
 * Security:
 *   - Refresh token is httpOnly + Secure — JS cannot access it
 *   - Refresh token uses a separate secret to limit blast radius
 *   - Access token expiry: 7d  (down from 30d)
 *   - Refresh token expiry: 30d (rotation window)
 */

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

interface RefreshPayload {
  userId: number;
  email: string;
  role: string | null;
  name: string | null;
}

export async function POST(req: NextRequest) {
  try {
    // Read refresh token from httpOnly cookie
    const refreshToken = req.cookies.get('lms_refresh')?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
    }

    const refreshSecret = process.env.REFRESH_TOKEN_SECRET;
    const accessSecret  = process.env.JWT_SECRET;

    if (!refreshSecret || !accessSecret) {
      console.error('[Refresh] REFRESH_TOKEN_SECRET or JWT_SECRET is not configured');
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    // Verify refresh token
    let payload: RefreshPayload;
    try {
      payload = jwt.verify(refreshToken, refreshSecret) as RefreshPayload;
    } catch {
      return NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 });
    }

    // Issue a new access token
    const newAccessToken = jwt.sign(
      {
        userId: payload.userId,
        email:  payload.email,
        name:   payload.name,
        role:   payload.role,
      },
      accessSecret,
      { expiresIn: '7d' },
    );

    // Optionally rotate the refresh token (sliding window)
    const newRefreshToken = jwt.sign(
      {
        userId: payload.userId,
        email:  payload.email,
        name:   payload.name,
        role:   payload.role,
      },
      refreshSecret,
      { expiresIn: '30d' },
    );

    const response = NextResponse.json({ success: true, token: newAccessToken });

    // Rotate the refresh token cookie
    response.cookies.set('lms_refresh', newRefreshToken, {
      httpOnly: true,
      secure:   true,
      sameSite: 'strict',
      maxAge:   60 * 60 * 24 * 30, // 30 days
      path:     '/api/learning/auth',
    });

    return response;
  } catch (error) {
    console.error('[Refresh] Unhandled error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
