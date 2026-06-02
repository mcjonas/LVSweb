/**
 * GET /api/admin/recordings/access-logs
 *
 * Returns recent recording_access_logs for the admin monitoring dashboard.
 * Auth: x-admin-secret header
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { recordingAccessLogs, recordings, users, courses } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(_req: NextRequest) {
  const jar = await cookies();
  if (jar.get('dashboard_auth')?.value !== 'authenticated') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const logs = await db
      .select({
        id:          recordingAccessLogs.id,
        action:      recordingAccessLogs.action,
        denyReason:  recordingAccessLogs.denyReason,
        ipAddress:   recordingAccessLogs.ipAddress,
        timestamp:   recordingAccessLogs.timestamp,
        studentName: users.name,
        studentEmail: users.email,
        recordingTitle: recordings.title,
        courseTitle:    courses.title,
      })
      .from(recordingAccessLogs)
      .leftJoin(users,      eq(recordingAccessLogs.studentId,   users.id))
      .leftJoin(recordings, eq(recordingAccessLogs.recordingId, recordings.id))
      .leftJoin(courses,    eq(recordingAccessLogs.courseId,    courses.id))
      .orderBy(desc(recordingAccessLogs.timestamp))
      .limit(200);

    return NextResponse.json({ success: true, logs, total: logs.length });
  } catch (error) {
    console.error('[Access Logs] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
