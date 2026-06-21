import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { logSecurityEvent } from '@/lib/security-logger';

function getIP(req: Request): string {
  return (req.headers as any).get?.('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
}

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Normalize input email and password
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPassword = password.trim();

    const userRecord = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);

    if (userRecord.length === 0) {
      await logSecurityEvent({
        event: 'student_login_failed',
        severity: 'warning',
        ip: getIP(req),
        details: { reason: 'email_not_found', email: normalizedEmail },
      });
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const user = userRecord[0];

    const isPasswordCorrect = await bcrypt.compare(normalizedPassword, user.passwordHash);

    if (!isPasswordCorrect) {
      await logSecurityEvent({
        event: 'student_login_failed',
        severity: 'warning',
        ip: getIP(req),
        details: { reason: 'wrong_password', email: normalizedEmail },
      });
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const accessSecret  = process.env.JWT_SECRET;
    const refreshSecret = process.env.REFRESH_TOKEN_SECRET;

    if (!accessSecret) {
      console.error('[Login] JWT_SECRET is not configured');
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    const tokenPayload = { userId: user.id, email: user.email, name: user.name, role: user.role };

    // Short-lived access token (7 days)
    const token = jwt.sign(tokenPayload, accessSecret, { expiresIn: '7d' });

    const response = NextResponse.json({ success: true, token });

    // ── Security log: successful student login ────────────────────────────────
    await logSecurityEvent({
      event: 'student_login_success',
      severity: 'info',
      ip: getIP(req),
      userId: user.id,
      details: { email: user.email },
    });

    // Long-lived refresh token in httpOnly cookie (30 days) — requires REFRESH_TOKEN_SECRET
    if (refreshSecret) {
      const refreshToken = jwt.sign(tokenPayload, refreshSecret, { expiresIn: '30d' });
      response.cookies.set('lms_refresh', refreshToken, {
        httpOnly: true,
        secure:   true,
        sameSite: 'strict',
        maxAge:   60 * 60 * 24 * 30, // 30 days
        path:     '/api/learning/auth',
      });
    }

    return response;
  } catch (error) {
    console.error('Error logging in student:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
