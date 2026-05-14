import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const userRecord = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (userRecord.length === 0) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const user = userRecord[0];

    // In a real app, use bcrypt.compare(password, user.passwordHash)
    // Since we generated a temporary hex password string in the previous step, we just compare exactly.
    if (user.passwordHash !== password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '30d' }
    );

    return NextResponse.json({ success: true, token });
  } catch (error) {
    console.error('Error logging in student:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
