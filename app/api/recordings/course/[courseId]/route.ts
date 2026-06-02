/**
 * GET /api/recordings/course/[courseId]
 *
 * Returns the list of Zoom recordings for an enrolled, paid course.
 * Spec: api-contract.md §2 — Recording List Endpoint
 *
 * Access control:
 *   1. Valid JWT required (Bearer token)
 *   2. Student must be enrolled in the course
 *   3. Enrollment must be active with a payment reference (payment confirmed)
 */

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';
import { recordings } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';
import { canAccessCourseRecordings } from '@/lib/recordings/access-control';
import { logRecordingAccess } from '@/lib/logging/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const { courseId: courseIdStr } = await params;
    const courseId = Number(courseIdStr);

    if (isNaN(courseId)) {
      return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 });
    }

    // ── Authenticate ──────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: { userId: number };
    try {
      decoded = jwt.verify(
        authHeader.split(' ')[1],
        process.env.JWT_SECRET || 'fallback_secret',
      ) as { userId: number };
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const userId = decoded.userId;

    // ── Dual-gate access control ──────────────────────────────────────────────
    const access = await canAccessCourseRecordings(userId, courseId);
    if (!access.allowed) {
      const message =
        access.reason === 'not_enrolled'
          ? 'You are not enrolled in this course'
          : 'Payment not completed for this course';

      return NextResponse.json(
        { error: message, reason: access.reason },
        { status: 403 },
      );
    }

    // ── Fetch recordings ──────────────────────────────────────────────────────
    const courseRecordings = await db
      .select({
        id:              recordings.id,
        title:           recordings.title,
        durationMinutes: recordings.durationMinutes,
        playUrl:         recordings.playUrl,
        synchronizedAt:  recordings.synchronizedAt,
        createdAt:       recordings.createdAt,
      })
      .from(recordings)
      .where(eq(recordings.courseId, courseId))
      .orderBy(desc(recordings.synchronizedAt));

    console.log(
      `[Recordings API] User ${userId} fetched ${courseRecordings.length} recordings for course ${courseId}`,
    );

    return NextResponse.json({
      success:    true,
      courseId,
      recordings: courseRecordings,
      total:      courseRecordings.length,
    });

  } catch (error) {
    console.error('[Recordings API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
