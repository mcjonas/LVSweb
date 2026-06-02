/**
 * PATCH /api/admin/courses/[id]/zoom-meetings
 *
 * Admin endpoint: add or remove a Zoom Meeting ID linked to a course.
 * Once linked, all future Zoom recordings from that meeting ID will
 * automatically map to this course via the webhook (no fuzzy text matching needed).
 *
 * Body: { "zoomMeetingId": "123456789", "action": "add" | "remove" }
 *
 * Auth: Bearer token with role="admin" (or falls back to checking admin cookie)
 */

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';
import { courses } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idStr } = await params;
    const courseId = Number(idStr);

    if (isNaN(courseId)) {
      return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 });
    }

    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    let isAdmin = false;

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(
          authHeader.split(' ')[1],
          process.env.JWT_SECRET || 'fallback_secret',
        ) as { role?: string };
        isAdmin = decoded.role === 'admin';
      } catch {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    }

    // Fallback: simple admin secret header (useful for dashboard calls)
    const adminSecret = req.headers.get('x-admin-secret');
    if (adminSecret && adminSecret === process.env.ADMIN_SECRET) {
      isAdmin = true;
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    const body = await req.json();
    const { zoomMeetingId, action = 'add' } = body as {
      zoomMeetingId?: string;
      action?: 'add' | 'remove';
    };

    if (!zoomMeetingId || typeof zoomMeetingId !== 'string') {
      return NextResponse.json({ error: 'zoomMeetingId is required' }, { status: 400 });
    }

    // ── Fetch current course ──────────────────────────────────────────────────
    const rows = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const course = rows[0];
    const currentIds = (course.zoomMeetingIds || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    let updatedIds: string[];
    if (action === 'add') {
      if (currentIds.includes(zoomMeetingId)) {
        return NextResponse.json({
          success: true,
          message: 'Meeting ID already linked',
          zoomMeetingIds: currentIds,
        });
      }
      updatedIds = [...currentIds, zoomMeetingId];
    } else {
      updatedIds = currentIds.filter(id => id !== zoomMeetingId);
    }

    await db.update(courses)
      .set({ zoomMeetingIds: updatedIds.join(',') })
      .where(eq(courses.id, courseId));

    console.log(
      `[Admin] ${action === 'add' ? 'Linked' : 'Unlinked'} Zoom Meeting ID ${zoomMeetingId} ` +
      `${action === 'add' ? 'to' : 'from'} course ${courseId} ("${course.title}")`,
    );

    return NextResponse.json({
      success:        true,
      message:        `Meeting ID ${action === 'add' ? 'linked' : 'unlinked'} successfully`,
      courseId,
      courseTitle:    course.title,
      zoomMeetingIds: updatedIds,
    });

  } catch (error) {
    console.error('[Admin Zoom Meetings] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * GET /api/admin/courses/[id]/zoom-meetings
 * Returns the current list of Zoom Meeting IDs linked to this course.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idStr } = await params;
    const courseId = Number(idStr);

    if (isNaN(courseId)) {
      return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 });
    }

    const rows = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const course = rows[0];
    const ids = (course.zoomMeetingIds || '').split(',').map(s => s.trim()).filter(Boolean);

    return NextResponse.json({
      success:        true,
      courseId,
      courseTitle:    course.title,
      zoomMeetingIds: ids,
    });

  } catch (error) {
    console.error('[Admin Zoom Meetings GET] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
