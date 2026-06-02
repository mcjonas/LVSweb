/**
 * POST /api/admin/recordings/sync
 *
 * P4 — Zoom API metadata enrichment.
 * Fetches authoritative metadata from Zoom Cloud Recordings API and
 * enriches the `recordings` table rows that are missing duration data
 * or have stale information.
 *
 * Also supports manual "backfill" — scanning all courses with zoom_meeting_ids
 * and importing any recordings from Zoom that aren't yet in the DB.
 *
 * Auth: x-admin-secret header (same pattern as zoom-meetings admin endpoint)
 *
 * Body (all optional):
 *   { "meetingId": "123456" }    → sync a single meeting
 *   { "backfillDays": 30 }       → bulk-import last N days from Zoom
 *   {}                           → enrich all recordings with durationMinutes=0
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { recordings, courses } from '@/lib/schema';
import { eq, or, isNull, sql } from 'drizzle-orm';
import { getZoomMeetingRecordings, listAccountRecordings } from '@/lib/zoom/api';

async function isAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  return jar.get('dashboard_auth')?.value === 'authenticated';
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { meetingId, backfillDays } = body as {
      meetingId?: string;
      backfillDays?: number;
    };

    const results: { meetingId: string; action: string; recordingId?: string }[] = [];

    // ── Mode 1: Single meeting sync ────────────────────────────────────────
    if (meetingId) {
      const enriched = await enrichMeeting(meetingId, results);
      return NextResponse.json({
        success: true,
        mode: 'single',
        meetingId,
        enriched,
        results,
      });
    }

    // ── Mode 2: Bulk backfill from Zoom ────────────────────────────────────
    if (backfillDays && backfillDays > 0) {
      const to   = new Date().toISOString().split('T')[0];
      const from = new Date(Date.now() - backfillDays * 86400_000)
        .toISOString()
        .split('T')[0];

      console.log(`[Sync] Bulk backfill: fetching recordings from ${from} to ${to}`);
      const meetings = await listAccountRecordings(from, to);

      // Fetch all courses with meeting IDs for matching
      const allCourses = await db
        .select({ id: courses.id, title: courses.title, zoomMeetingIds: courses.zoomMeetingIds, matchKeywords: courses.matchKeywords })
        .from(courses);

      for (const meeting of meetings) {
        await enrichMeetingFromData(meeting, allCourses, results);
      }

      return NextResponse.json({
        success: true,
        mode: 'backfill',
        from,
        to,
        meetingsScanned: meetings.length,
        results,
      });
    }

    // ── Mode 3: Enrich all recordings with missing/zero duration ──────────
    const staleRecordings = await db
      .select({
        id: recordings.id,
        zoomMeetingId: recordings.zoomMeetingId,
        zoomRecordingId: recordings.zoomRecordingId,
        durationMinutes: recordings.durationMinutes,
      })
      .from(recordings)
      .where(
        or(
          eq(recordings.durationMinutes, 0),
          isNull(recordings.durationMinutes),
        ),
      );

    console.log(`[Sync] Enriching ${staleRecordings.length} recordings with missing duration`);

    // Group by meetingId to avoid duplicate API calls
    const byMeeting = new Map<string, typeof staleRecordings>();
    for (const rec of staleRecordings) {
      if (!byMeeting.has(rec.zoomMeetingId)) byMeeting.set(rec.zoomMeetingId, []);
      byMeeting.get(rec.zoomMeetingId)!.push(rec);
    }

    for (const [mid, recs] of byMeeting.entries()) {
      const meetingData = await getZoomMeetingRecordings(mid);
      if (!meetingData) {
        results.push({ meetingId: mid, action: 'not_found_on_zoom' });
        continue;
      }

      for (const rec of recs) {
        // Find the matching recording file by zoomRecordingId
        const file = meetingData.recording_files.find(f => f.id === rec.zoomRecordingId);
        const duration = meetingData.duration ?? 0;

        await db.update(recordings)
          .set({
            durationMinutes: duration,
            // Refresh play_url if present (URLs can change)
            ...(file?.play_url ? { playUrl: file.play_url } : {}),
          })
          .where(eq(recordings.id, rec.id));

        results.push({ meetingId: mid, action: 'enriched', recordingId: rec.zoomRecordingId });
      }
    }

    return NextResponse.json({
      success: true,
      mode: 'enrich_stale',
      enriched: results.filter(r => r.action === 'enriched').length,
      results,
    });

  } catch (error) {
    console.error('[Sync] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/** GET — returns all recordings with their linked course info for the admin dashboard */
export async function GET(_req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
  }

  try {
    const rows = await db
      .select({
        id: recordings.id,
        title: recordings.title,
        courseId: recordings.courseId,
        courseTitle: courses.title,
        zoomMeetingId: recordings.zoomMeetingId,
        zoomRecordingId: recordings.zoomRecordingId,
        durationMinutes: recordings.durationMinutes,
        playUrl: recordings.playUrl,
        synchronizedAt: recordings.synchronizedAt,
        createdAt: recordings.createdAt,
      })
      .from(recordings)
      .leftJoin(courses, eq(recordings.courseId, courses.id))
      .orderBy(sql`${recordings.synchronizedAt} DESC`);

    return NextResponse.json({ success: true, recordings: rows, total: rows.length });
  } catch (error) {
    console.error('[Sync GET] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function enrichMeeting(
  meetingId: string,
  results: { meetingId: string; action: string; recordingId?: string }[],
): Promise<number> {
  const meetingData = await getZoomMeetingRecordings(meetingId);
  if (!meetingData) {
    results.push({ meetingId, action: 'not_found_on_zoom' });
    return 0;
  }

  const allCourses = await db
    .select({ id: courses.id, title: courses.title, zoomMeetingIds: courses.zoomMeetingIds, matchKeywords: courses.matchKeywords })
    .from(courses);

  return enrichMeetingFromData(meetingData, allCourses, results);
}

async function enrichMeetingFromData(
  meetingData: Awaited<ReturnType<typeof getZoomMeetingRecordings>> & object,
  allCourses: { id: number; title: string; zoomMeetingIds: string | null; matchKeywords: string | null }[],
  results: { meetingId: string; action: string; recordingId?: string }[],
): Promise<number> {
  if (!meetingData) return 0;

  const mid    = String(meetingData.id);
  const topic  = meetingData.topic || '';
  const duration = meetingData.duration ?? 0;

  // Find associated course (same logic as webhook: meeting ID match first, then normalize)
  let courseId: number | null = null;

  for (const c of allCourses) {
    const ids = (c.zoomMeetingIds || '').split(',').map(s => s.trim()).filter(Boolean);
    if (ids.includes(mid)) { courseId = c.id; break; }
  }

  if (!courseId) {
    const normalize = (s: string) =>
      s.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    const normalizedTopic = normalize(topic);

    const candidates = allCourses.flatMap(c => [
      { id: c.id, matchText: normalize(c.title), priority: 1 },
      ...(c.matchKeywords || '').split(',').map(k => ({
        id: c.id, matchText: normalize(k.trim()), priority: 2,
      })).filter(x => x.matchText),
    ]).sort((a, b) =>
      b.matchText.length !== a.matchText.length
        ? b.matchText.length - a.matchText.length
        : a.priority - b.priority,
    );

    courseId = candidates.find(c => normalizedTopic.includes(c.matchText))?.id ?? null;
  }

  let enriched = 0;
  const mp4Files = meetingData.recording_files.filter(
    f => f.file_type === 'MP4' && f.status === 'completed',
  );

  for (const file of mp4Files) {
    // Check if already in DB
    const existing = await db
      .select({ id: recordings.id })
      .from(recordings)
      .where(eq(recordings.zoomRecordingId, file.id))
      .limit(1);

    if (existing.length > 0) {
      // Update duration & playUrl if stale
      await db.update(recordings)
        .set({ durationMinutes: duration, playUrl: file.play_url })
        .where(eq(recordings.zoomRecordingId, file.id));
      results.push({ meetingId: mid, action: 'enriched', recordingId: file.id });
      enriched++;
    } else if (courseId && file.play_url) {
      // Insert new recording discovered via API (backfill)
      try {
        await db.insert(recordings).values({
          courseId,
          zoomRecordingId: file.id,
          zoomMeetingId: mid,
          title: topic,
          durationMinutes: duration,
          playUrl: file.play_url,
          downloadUrl: file.download_url || null,
        });
        results.push({ meetingId: mid, action: 'inserted', recordingId: file.id });
        enriched++;
      } catch {
        // duplicate — safe to skip
      }
    } else {
      results.push({ meetingId: mid, action: 'skipped_no_course', recordingId: file.id });
    }
  }

  return enriched;
}
