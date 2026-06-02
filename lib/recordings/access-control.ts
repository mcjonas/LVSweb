/**
 * lib/recordings/access-control.ts
 *
 * Dual-gate access control for Zoom recordings (spec FR-004 / US2).
 *
 * Gate 1 — Enrollment exists for (userId, courseId)
 * Gate 2 — Enrollment is active AND has a paymentReference (payment completed)
 *
 * Both gates must pass before a student can view recordings.
 */

import { db } from '@/lib/db';
import { enrollments } from '@/lib/schema';
import { and, eq } from 'drizzle-orm';

export type AccessResult =
  | { allowed: true }
  | { allowed: false; reason: 'not_enrolled' | 'not_paid' };

/**
 * Checks whether a student has paid, active access to a given course's recordings.
 *
 * @param userId   - The authenticated student's user ID (from JWT)
 * @param courseId - The course ID whose recordings are being requested
 * @returns AccessResult — allowed or denied with reason
 */
export async function canAccessCourseRecordings(
  userId: number,
  courseId: number,
): Promise<AccessResult> {
  // Gate 1: Enrollment row must exist
  const rows = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)))
    .limit(1);

  if (rows.length === 0) {
    return { allowed: false, reason: 'not_enrolled' };
  }

  const enrollment = rows[0];

  // Gate 2: Enrollment must be active AND have a payment reference
  // (paymentReference is only set in /api/learning/paystack/verify after Paystack confirms payment)
  if (enrollment.status !== 'active' || !enrollment.paymentReference) {
    return { allowed: false, reason: 'not_paid' };
  }

  return { allowed: true };
}
