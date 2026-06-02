/**
 * lib/logging/audit.ts
 *
 * Append-only audit logger for recording access attempts (spec FR-008 / SC-006).
 * Every view AND every denial is logged. Never updates or deletes.
 */

import { db } from '@/lib/db';
import { recordingAccessLogs } from '@/lib/schema';

export async function logRecordingAccess(params: {
  studentId:   number;
  recordingId: number;
  courseId:    number;
  action:      'viewed' | 'denied';
  denyReason?: string;
  ipAddress?:  string;
  userAgent?:  string;
}): Promise<void> {
  try {
    await db.insert(recordingAccessLogs).values({
      studentId:   params.studentId,
      recordingId: params.recordingId,
      courseId:    params.courseId,
      action:      params.action,
      denyReason:  params.denyReason ?? null,
      ipAddress:   params.ipAddress  ?? null,
      userAgent:   params.userAgent  ?? null,
    });
  } catch (err) {
    // Logging must never break the main request flow
    console.error('[Audit] Failed to write access log:', err);
  }
}
