import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const correct = process.env.DASHBOARD_PASSWORD;

  if (password === correct) {
    const response = NextResponse.json({ success: true });
    response.cookies.set('dashboard_auth', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
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
