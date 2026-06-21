import { NextRequest, NextResponse } from 'next/server';
import { logSecurityEvent } from '@/lib/security-logger';

// Shared secret so random internet callers can't spam this endpoint
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET ?? process.env.SESSION_SECRET ?? 'lvs-internal';

export async function POST(req: NextRequest) {
  // Verify caller is internal
  const authHeader = req.headers.get('x-internal-secret');
  if (authHeader !== INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    await logSecurityEvent(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Internal Security Log] Failed:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
