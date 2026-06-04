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
import { getZoomAccessToken } from '@/lib/zoom/api';

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

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('[Recordings API] JWT_SECRET environment variable is not configured');
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    let decoded: { userId: number };
    try {
      decoded = jwt.verify(
        authHeader.split(' ')[1],
        jwtSecret,
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
        downloadUrl:     recordings.downloadUrl,
        synchronizedAt:  recordings.synchronizedAt,
        createdAt:       recordings.createdAt,
      })
      .from(recordings)
      .where(eq(recordings.courseId, courseId))
      .orderBy(desc(recordings.synchronizedAt));

    // Get a fresh S2S access token to generate secure video URLs
    let zoomToken = '';
    try {
      zoomToken = await getZoomAccessToken();
    } catch (tokenErr) {
      console.error('[Recordings API] Failed to fetch Zoom access token:', tokenErr);
    }

    const processedRecordings = courseRecordings.map(rec => {
      let videoUrl = '';
      if (rec.downloadUrl && zoomToken) {
        videoUrl = `${rec.downloadUrl}${rec.downloadUrl.includes('?') ? '&' : '?'}access_token=${zoomToken}`;
      }
      return {
        id:              rec.id,
        title:           rec.title,
        durationMinutes: rec.durationMinutes,
        playUrl:         rec.playUrl,
        videoUrl, // secure direct MP4 stream URL
        synchronizedAt:  rec.synchronizedAt,
        createdAt:       rec.createdAt,
      };
    });

    console.log(
      `[Recordings API] User ${userId} fetched ${processedRecordings.length} recordings for course ${courseId}`,
    );

    return NextResponse.json({
      success:    true,
      courseId,
      recordings: processedRecordings,
      total:      processedRecordings.length,
    });

  } catch (error) {
    console.error('[Recordings API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
