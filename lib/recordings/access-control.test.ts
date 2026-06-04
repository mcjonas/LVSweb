/**
 * Unit tests — lib/recordings/access-control.ts
 *
 * Tests the dual-gate access-control function that guards Zoom recordings.
 *
 * Gate 1: Enrollment row must exist for (userId, courseId)
 * Gate 2: Enrollment must be active AND have a paymentReference
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { canAccessCourseRecordings } from './access-control';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockRows: any[] = [];

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve(mockRows),
        }),
      }),
    }),
  },
}));

beforeEach(() => {
  mockRows.length = 0;
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('canAccessCourseRecordings', () => {
  it('returns not_enrolled when no enrollment row exists', async () => {
    // mockRows is empty
    const result = await canAccessCourseRecordings(1, 10);
    expect(result).toEqual({ allowed: false, reason: 'not_enrolled' });
  });

  it('returns not_paid when enrollment exists but status is not active', async () => {
    mockRows.push({ status: 'inactive', paymentReference: 'ref-123' });
    const result = await canAccessCourseRecordings(1, 10);
    expect(result).toEqual({ allowed: false, reason: 'not_paid' });
  });

  it('returns not_paid when enrollment is active but paymentReference is null', async () => {
    mockRows.push({ status: 'active', paymentReference: null });
    const result = await canAccessCourseRecordings(1, 10);
    expect(result).toEqual({ allowed: false, reason: 'not_paid' });
  });

  it('returns not_paid when enrollment is active but paymentReference is empty string', async () => {
    mockRows.push({ status: 'active', paymentReference: '' });
    const result = await canAccessCourseRecordings(1, 10);
    expect(result).toEqual({ allowed: false, reason: 'not_paid' });
  });

  it('returns allowed when enrollment is active AND paymentReference is present', async () => {
    mockRows.push({ status: 'active', paymentReference: 'pstack_ref_abc123' });
    const result = await canAccessCourseRecordings(1, 10);
    expect(result).toEqual({ allowed: true });
  });

  it('returns not_paid when enrollment has pending status even with payment ref', async () => {
    mockRows.push({ status: 'pending', paymentReference: 'ref-456' });
    const result = await canAccessCourseRecordings(1, 10);
    expect(result).toEqual({ allowed: false, reason: 'not_paid' });
  });
});
