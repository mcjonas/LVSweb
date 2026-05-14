import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { progress } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as { userId: number };
    } catch (err) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.userId;
    const body = await req.json();
    const { lessonId } = body;

    if (!lessonId) {
      return NextResponse.json({ error: 'Lesson ID is required' }, { status: 400 });
    }

    // Check if progress already exists
    const existingProgress = await db.select()
      .from(progress)
      .where(and(eq(progress.userId, userId), eq(progress.lessonId, lessonId)))
      .limit(1);

    if (existingProgress.length === 0) {
      // Insert new progress
      await db.insert(progress).values({
        userId,
        lessonId,
        completed: 1,
        completedAt: new Date()
      });
    } else if (existingProgress[0].completed === 0) {
      // Update existing progress
      await db.update(progress)
        .set({ completed: 1, completedAt: new Date() })
        .where(eq(progress.id, existingProgress[0].id));
    }

    return NextResponse.json({ success: true, message: 'Lesson marked as completed' });
  } catch (error) {
    console.error('Error updating progress:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
