import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { videos, lessons, courses, modules, users, enrollments, recordings, webhookEvents } from '@/lib/schema';
import { eq, ilike, desc, sql } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const zoomSecret = process.env.ZOOM_WEBHOOK_SECRET_TOKEN || '';
    const signature = req.headers.get('x-zm-signature');
    const timestamp = req.headers.get('x-zm-request-timestamp');

    if (!signature || !timestamp) {
      console.warn('[Zoom Webhook] Missing signature or timestamp headers');
      return NextResponse.json({ error: 'Missing headers' }, { status: 401 });
    }

    // ── Replay-attack guard: reject requests older than 5 minutes ─────────────
    const eventTimestampSec = Number(timestamp);
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - eventTimestampSec) > 300) {
      console.warn(`[Zoom Webhook] Timestamp too old (skew: ${Math.abs(nowSec - eventTimestampSec)}s)`);
      return NextResponse.json({ error: 'Request timestamp expired' }, { status: 401 });
    }

    const bodyText = await req.text();

    // ── HMAC-SHA256 signature verification ────────────────────────────────────
    const message = `v0:${timestamp}:${bodyText}`;
    const hashForVerify = crypto
      .createHmac('sha256', zoomSecret)
      .update(message)
      .digest('hex');
    const signatureToVerify = `v0=${hashForVerify}`;

    if (signatureToVerify !== signature) {
      console.warn('[Zoom Webhook] Invalid signature — request rejected');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(bodyText);

    // ── URL validation handshake (required by Zoom when registering webhook) ──
    if (event.event === 'endpoint.url_validation') {
      const plainToken = event.payload.plainToken;
      const encryptedToken = crypto
        .createHmac('sha256', zoomSecret)
        .update(plainToken)
        .digest('hex');
      return NextResponse.json({ plainToken, encryptedToken });
    }

    if (event.event === 'recording.completed') {
      const { payload } = event;
      const { object: recordingObj } = payload;

      const topic     = recordingObj.topic       || 'Zoom Recording';
      const zoomMeetingId = String(recordingObj.id);   // Zoom Meeting ID (numeric string)
      const hostEmail = recordingObj.host_email  || '';

      // Unique event ID for idempotency (Zoom uses event_ts + meeting ID)
      const zoomEventId = `${event.event}_${zoomMeetingId}_${event.event_ts || Date.now()}`;

      // ── P1: Idempotency — write webhook_events first ───────────────────────
      // If zoomEventId already exists (unique constraint), Zoom re-delivered this event.
      // We catch the duplicate error and skip processing.
      try {
        await db.insert(webhookEvents).values({
          zoomEventId,
          eventType: event.event,
          payload:   bodyText,
          status:    'pending',
        });
      } catch (dupErr: unknown) {
        const errMsg = dupErr instanceof Error ? dupErr.message : String(dupErr);
        if (errMsg.includes('unique') || errMsg.includes('duplicate')) {
          console.log(`[Zoom Webhook] Duplicate event skipped: ${zoomEventId}`);
          return NextResponse.json({ status: 'duplicate_ignored' });
        }
        throw dupErr;
      }

      // ── P0 FIX: download_token is at EVENT ROOT, not inside payload.object ──
      const downloadToken: string | undefined = event.download_token;

      // Find the primary MP4 recording file
      const videoFile =
        recordingObj.recording_files?.find(
          (file: any) => file.file_type === 'MP4' && file.status === 'completed',
        ) ||
        recordingObj.recording_files?.find(
          (file: any) => file.file_type === 'MP4',
        );

      if (!videoFile) {
        console.warn(`[Zoom Webhook] No MP4 file found for topic: "${topic}"`);
        await db.update(webhookEvents)
          .set({ status: 'failed', lastError: 'No MP4 recording file found', processedAt: new Date() })
          .where(eq(webhookEvents.zoomEventId, zoomEventId));
        return NextResponse.json({ status: 'no_mp4' });
      }

      // ── Zoom-only URLs ─────────────────────────────────────────────────────
      // playUrl:     Zoom web-player page — stable, embeds in iframe, no token/expiry
      // downloadUrl: direct MP4 with access_token (expires ~24h after recording)
      const playUrl = videoFile.play_url || '';
      const rawDownload = videoFile.download_url || '';
      const downloadUrl = downloadToken
        ? `${rawDownload}?access_token=${downloadToken}`
        : rawDownload;

      // Unique recording file ID from Zoom (use file id if present, fallback to uuid concat)
      const zoomRecordingId = videoFile.id || `${zoomMeetingId}_${event.event_ts || Date.now()}`;

      // ── Duration ───────────────────────────────────────────────────────────
      const durationMinutes = recordingObj.duration || 0;

      console.log(
        `[Zoom Webhook] Processing: "${topic}" | meetingId=${zoomMeetingId} | ` +
        `playUrl=${playUrl ? '✓' : '✗'} | downloadToken=${downloadToken ? '✓' : '✗'}`,
      );

      // ──────────────────────────────────────────────────────────────────────
      // Course matching strategy (most reliable → broadest fallback)
      // ──────────────────────────────────────────────────────────────────────
      let courseId: number | null = null;

      // Strategy 1 (P1 NEW) — exact zoomMeetingId match in courses.zoomMeetingIds
      // zoomMeetingIds is stored as comma-separated string: "123,456,789"
      const allCoursesWithMeetings = await db
        .select({ id: courses.id, title: courses.title, zoomMeetingIds: courses.zoomMeetingIds })
        .from(courses)
        .where(sql`${courses.zoomMeetingIds} != ''`);

      for (const c of allCoursesWithMeetings) {
        const ids = (c.zoomMeetingIds || '').split(',').map(s => s.trim());
        if (ids.includes(zoomMeetingId)) {
          courseId = c.id;
          console.log(`[Zoom Webhook] ✅ Matched via zoomMeetingIds: course "${c.title}"`);
          break;
        }
      }

      // Strategy 2 — Normalized title & custom match keywords substring match
      if (!courseId) {
        const allCourses = await db
          .select({ id: courses.id, title: courses.title, matchKeywords: courses.matchKeywords })
          .from(courses);

        const normalize = (s: string) =>
          s.toLowerCase()
           .replace(/[^a-z0-9]/g, ' ')
           .replace(/\s+/g, ' ')
           .trim();

        const normalizedTopic = normalize(topic);

        // Prepare matching candidates: title is highest priority, keywords are lower
        const candidates: { id: number; title: string; matchText: string; priority: number }[] = [];

        for (const c of allCourses) {
          candidates.push({
            id: c.id,
            title: c.title,
            matchText: normalize(c.title),
            priority: 1, // Higher priority for full title match
          });

          const keywords = (c.matchKeywords || '')
            .split(',')
            .map(k => normalize(k.trim()))
            .filter(Boolean);

          for (const keyword of keywords) {
            candidates.push({
              id: c.id,
              title: c.title,
              matchText: keyword,
              priority: 2, // Lower priority for keywords
            });
          }
        }

        // Sort candidates:
        // 1. Longer match texts first (prevents matching short substrings instead of full titles)
        // 2. Higher priority first (if lengths are equal)
        candidates.sort((a, b) => {
          if (b.matchText.length !== a.matchText.length) {
            return b.matchText.length - a.matchText.length;
          }
          return a.priority - b.priority;
        });

        // Find matching candidate
        const bestMatch = candidates.find(candidate => normalizedTopic.includes(candidate.matchText));
        if (bestMatch) {
          courseId = bestMatch.id;
          console.log(`[Zoom Webhook] ✅ Matched via normalized course candidate "${bestMatch.matchText}" → course "${bestMatch.title}"`);
        }
      }

      // Strategy 3 — lesson title match
      if (!courseId) {
        const matchingLessons = await db
          .select({ id: lessons.id, moduleId: lessons.moduleId })
          .from(lessons)
          .where(ilike(lessons.title, `%${topic}%`))
          .limit(1);

        if (matchingLessons.length > 0) {
          const moduleRecord = await db
            .select({ courseId: modules.courseId })
            .from(modules)
            .where(eq(modules.id, matchingLessons[0].moduleId))
            .limit(1);

          if (moduleRecord.length > 0) {
            courseId = moduleRecord[0].courseId;
            console.log(`[Zoom Webhook] Matched via lesson title → courseId=${courseId}`);
          }
        }
      }

      // Strategy 4 — host email → most-recent enrollment
      if (!courseId && hostEmail) {
        const userRecord = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, hostEmail))
          .limit(1);

        if (userRecord.length > 0) {
          const enrollmentRecord = await db
            .select({ courseId: enrollments.courseId })
            .from(enrollments)
            .where(eq(enrollments.userId, userRecord[0].id))
            .orderBy(desc(enrollments.createdAt))
            .limit(1);

          if (enrollmentRecord.length > 0) {
            courseId = enrollmentRecord[0].courseId;
            console.log(`[Zoom Webhook] Matched via host email "${hostEmail}" → courseId=${courseId}`);
          }
        }
      }

      if (!courseId) {
        console.warn(`[Zoom Webhook] ⚠️  Could not match "${topic}" to any course — stored unlinked`);
      }

      // ── P1: Insert into recordings table (idempotent via UNIQUE zoomRecordingId) ──
      if (courseId && playUrl) {
        try {
          await db.insert(recordings).values({
            courseId,
            zoomRecordingId,
            zoomMeetingId,
            title:           topic,
            durationMinutes,
            playUrl,
            downloadUrl:     downloadUrl || null,
          });
          console.log(`[Zoom Webhook] ✅ Inserted into recordings: "${topic}" | courseId=${courseId}`);
        } catch (recErr: unknown) {
          const errMsg = recErr instanceof Error ? recErr.message : String(recErr);
          if (errMsg.includes('unique') || errMsg.includes('duplicate')) {
            console.log(`[Zoom Webhook] Recording already exists (duplicate zoomRecordingId): ${zoomRecordingId}`);
          } else {
            throw recErr;
          }
        }
      }

      // ── Also update legacy videos table (backwards compat with old booking flow) ──
      const lessonId = await (async () => {
        const m = await db.select({ id: lessons.id }).from(lessons)
          .where(ilike(lessons.title, `%${topic}%`)).limit(1);
        if (m.length > 0) {
          await db.update(lessons).set({ zoomId: zoomMeetingId }).where(eq(lessons.id, m[0].id));
          return m[0].id;
        }
        return null;
      })();

      try {
        await db.insert(videos).values({
          title:              topic,
          zoomId:             zoomMeetingId,
          downloadUrl:        playUrl || downloadUrl,
          cloudinaryPublicId: null,
          lessonId,
          courseId,
        });
      } catch {
        // videos table may already have this zoomId — not critical
      }

      // ── Mark webhook as processed ──────────────────────────────────────────
      await db.update(webhookEvents)
        .set({ status: 'processed', processedAt: new Date() })
        .where(eq(webhookEvents.zoomEventId, zoomEventId));

      console.log(
        `[Zoom Webhook] ✅ Done: "${topic}" | courseId=${courseId ?? 'unmatched'} | ` +
        `recordings table=${courseId && playUrl ? 'inserted' : 'skipped'}`,
      );

      return NextResponse.json({ status: 'success' });
    }

    return NextResponse.json({ status: 'ignored' });

  } catch (error) {
    console.error('[Zoom Webhook] Unhandled error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
