/**
 * GET /api/recordings/[id]/play-url
 *
 * Returns the Zoom play URL for a specific recording after verifying access.
 * Spec: api-contract.md §3 — Play-URL Generation Endpoint
 *
 * Access control:
 *   1. Valid JWT required
 *   2. Student must be enrolled + payment confirmed for the recording's course
 *
 * Logs every access attempt (success and denial) to recording_access_logs.
 */

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';
import { recordings } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { canAccessCourseRecordings } from '@/lib/recordings/access-control';
import { logRecordingAccess } from '@/lib/logging/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idStr } = await params;
    const recordingId = Number(idStr);

    if (isNaN(recordingId)) {
      return NextResponse.json({ error: 'Invalid recording ID' }, { status: 400 });
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
    const ipAddress = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined;
    const userAgent = req.headers.get('user-agent') ?? undefined;

    // ── Fetch recording ───────────────────────────────────────────────────────
    const rows = await db
      .select()
      .from(recordings)
      .where(eq(recordings.id, recordingId))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
    }

    const recording = rows[0];

    // ── Dual-gate access control ──────────────────────────────────────────────
    const access = await canAccessCourseRecordings(userId, recording.courseId);

    if (!access.allowed) {
      const message =
        access.reason === 'not_enrolled'
          ? 'You are not enrolled in this course'
          : 'Payment not completed for this course';

      // Log denial (non-blocking)
      await logRecordingAccess({
        studentId:   userId,
        recordingId,
        courseId:    recording.courseId,
        action:      'denied',
        denyReason:  access.reason,
        ipAddress,
        userAgent,
      });

      return NextResponse.json(
        {
          error:  message,
          reason: access.reason,
          code:   'FORBIDDEN',
        },
        { status: 403 },
      );
    }

    // ── Log successful access ─────────────────────────────────────────────────
    await logRecordingAccess({
      studentId:   userId,
      recordingId,
      courseId:    recording.courseId,
      action:      'viewed',
      ipAddress,
      userAgent,
    });

    console.log(`[Play-URL] User ${userId} accessed recording ${recordingId} ("${recording.title}")`);

    // ── Return the Zoom play URL ──────────────────────────────────────────────
    // playUrl = Zoom web-player page — embed in an iframe, no token needed, no expiry.
    // downloadUrl = fallback for direct MP4 (may have an access_token that expires ~24h).
    return NextResponse.json({
      success:     true,
      recordingId,
      title:       recording.title,
      playUrl:     recording.playUrl,
      downloadUrl: recording.downloadUrl, // available as fallback if needed
    });

  } catch (error) {
    console.error('[Play-URL] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
