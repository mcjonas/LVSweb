import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken } from '@/lib/session';
import { logSecurityEvent } from '@/lib/security-logger';

function getIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
}

export async function POST(request: NextRequest) {
  const ip = getIP(request);
  const userAgent = request.headers.get('user-agent') ?? undefined;

  const { password } = await request.json();
  const correct = process.env.DASHBOARD_PASSWORD;

  if (!correct) {
    console.error('[Auth] DASHBOARD_PASSWORD environment variable is not configured');
    return NextResponse.json({ success: false, error: 'Server misconfiguration' }, { status: 500 });
  }

  if (password === correct) {
    let sessionToken: string;
    try {
      sessionToken = await createSessionToken();
    } catch (err) {
      console.error('[Auth] Failed to create session token:', err);
      return NextResponse.json({ success: false, error: 'Server misconfiguration' }, { status: 500 });
    }

    // ── Security log: successful admin login ──────────────────────────────────
    await logSecurityEvent({ event: 'admin_login_success', severity: 'info', ip, userAgent });

    const response = NextResponse.json({ success: true });
    response.cookies.set('dashboard_auth', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
    return response;
  }

  // ── Security log: failed admin login (critical — triggers email alert) ──────
  await logSecurityEvent({
    event: 'admin_login_failed',
    severity: 'critical',
    ip,
    userAgent,
    details: { message: 'Wrong password entered for admin dashboard' },
  });

  return NextResponse.json({ success: false, error: 'Incorrect password' }, { status: 401 });
}

export async function DELETE(request?: NextRequest) {
  const ip = request ? getIP(request) : 'unknown';

  // ── Security log: admin logout ───────────────────────────────────────────────
  await logSecurityEvent({ event: 'admin_logout', severity: 'info', ip });

  const response = NextResponse.json({ success: true });
  response.cookies.delete('dashboard_auth');
  return response;
}
