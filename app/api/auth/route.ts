import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken } from '@/lib/session';

export async function POST(request: NextRequest) {
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

    const response = NextResponse.json({ success: true });
    response.cookies.set('dashboard_auth', sessionToken, {
      httpOnly: true,
      secure: true,           // Always send over HTTPS (P4 fix)
      sameSite: 'strict',     // Upgraded from 'lax' — dashboard is same-origin only
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
    return response;
  }

  return NextResponse.json({ success: false, error: 'Incorrect password' }, { status: 401 });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('dashboard_auth');
  return response;
}
