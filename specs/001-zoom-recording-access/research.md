# Research: Zoom Recording Access & Display System

**Phase**: 0 (Research & Clarification)
**Created**: 2026-06-02
**Plan**: [plan.md](./plan.md)

This document consolidates research findings and decisions made to resolve ambiguities in the feature specification.

---

## 1. Zoom Cloud Recordings API Integration

### Question
How do we reliably fetch recordings from Zoom? What metadata is available? How do we authenticate?

### Decision
- **API Used**: Zoom Cloud Recordings REST API v2
- **Endpoint**: `GET /v2/users/{userId}/recordings` (list) and `GET /v2/recordings/{recordingId}` (detail)
- **Authentication**: OAuth2 token (obtained during Zoom app authorization; tokens refresh automatically via SDK)
- **Webhook**: Zoom sends `recording.completed` event when recording is available in cloud
- **Rationale**: Official SDK handles token refresh; webhook provides reliable notification; REST API provides metadata

### Metadata Available
```json
{
  "id": "zoom_recording_id",
  "topic": "Counselling Session 101",
  "start_time": "2026-06-02T10:00:00Z",
  "duration": 45,
  "share_url": "https://...",
  "download_url": "https://...",
  "thumbnail": "https://...",
  "has_transcript": true,
  "files": [
    {
      "id": "file_id",
      "type": "M4A",
      "download_url": "..."
    }
  ]
}
```

### Implementation Approach
- Store `id`, `topic` (as title), `start_time`, `duration`, `thumbnail`, `download_url` in our database
- Use `download_url` for CDN redirect or transcoding pipeline (out of scope for MVP)

---

## 2. Course-to-Zoom-Meeting Mapping Strategy

### Question
How do we link Zoom recordings (which know their meetingId) to courses (which students enrolled in)?

### Options Considered
1. **Option A**: Store array of `zoomMeetingIds` in Course entity (many meetings per course)
2. **Option B**: Many-to-many junction table `course_zoom_meetings`
3. **Option C**: Admin-configured mapping (manual link each recording to course post-hoc)

### Decision
- **Selected**: Option A (store array in Course)
- **Rationale**: 
  - Most courses have 1-5 recordings per cohort, not 100s
  - PostgreSQL supports native array types (Drizzle ORM has `text[]`)
  - Simpler to query: `WHERE courseId = $1`
  - Reduces schema complexity
- **Fallback**: Add junction table later if needed (e.g., 1000+ recordings per course)

### Schema Addition
```sql
ALTER TABLE courses ADD COLUMN zoom_meeting_ids TEXT[] DEFAULT ARRAY[]::text[];
```

Drizzle schema:
```typescript
courses: {
  // ... existing fields ...
  zoomMeetingIds: text('zoom_meeting_ids').array().default([]),
}
```

### Sync Process
1. Zoom webhook arrives: `recording.meeting_id = "abc123"`
2. Query: `SELECT id FROM courses WHERE $1 = ANY(zoom_meeting_ids)`
3. Store recording with `courseId` (foreign key)

---

## 3. CDN & Signed URL Strategy

### Question
How do we serve recordings with access control? Cloudinary is already integrated; can we use it?

### Options Considered
1. **Option A**: Cloudinary signed delivery URLs (already have Cloudinary account)
2. **Option B**: AWS CloudFront presigned URLs (new infrastructure)
3. **Option C**: Origin fallback (serve directly from Zoom; no CDN caching)
4. **Option D**: Transcode to MP4 and store on S3 (processing overhead)

### Decision
- **Primary**: Option A (Cloudinary signed URLs)
- **Secondary**: Option C (origin fallback if Cloudinary fails)
- **Rationale**:
  - Cloudinary already integrated (Cloudinary SDK in package.json)
  - Supports signed URLs with custom expiry (set to 15 min per spec)
  - Reduces bandwidth from Zoom servers (CDN caching)
  - Fallback to origin ensures graceful degradation (per constitution)

### Implementation
```typescript
// CDNService.generatePlayUrl(recordingId)
const signedUrl = cloudinary.utils.signed_download_url(zoomDownloadUrl, {
  expires_at: Math.floor(Date.now() / 1000) + 900, // 15 minutes
  resource_type: 'video',
});
return signedUrl || zoomDownloadUrl; // fallback
```

---

## 4. Webhook Retry & Queue Strategy

### Question
What happens if a webhook is received but processing fails (Zoom API down, DB error)? How do we retry?

### Options Considered
1. **Option A**: Database-backed queue (rows in PostgreSQL, polling worker)
2. **Option B**: Redis queue (Bull MQ / Bullmq library)
3. **Option C**: No queue (fire-and-forget; log errors only)
4. **Option D**: AWS SQS (external service)

### Decision
- **Selected**: Option A (Database-backed queue)
- **Rationale**:
  - Simpler to deploy (no Redis dependency)
  - Consistent with existing stack (PostgreSQL only)
  - Events persist across restarts
  - Easy to query and debug (just SQL)
  - Polling worker can run in scheduled function or separate task

### Retry Logic
- **Table**: `webhook_events` (event_type, payload, status, retry_count, last_error)
- **Strategy**: 
  - Max 3 retries
  - Backoff: 30s, 5min, 30min
  - On success: mark as `processed`
  - On final failure: mark as `failed`, alert ops
- **Idempotency**: Use `zoom_event_id` as unique key; `correlation_id` for tracing

### Processing Job Pseudo-code
```typescript
async function processWebhookQueue() {
  const events = await db
    .select()
    .from(webhookEvents)
    .where(eq(webhookEvents.status, 'pending'))
    .limit(10);
  
  for (const event of events) {
    try {
      await syncRecordingFromZoom(event);
      await db.update(webhookEvents)
        .set({ status: 'processed' })
        .where(eq(webhookEvents.id, event.id));
    } catch (error) {
      event.retryCount++;
      if (event.retryCount >= 3) {
        await db.update(webhookEvents)
          .set({ status: 'failed', lastError: error.message })
          .where(eq(webhookEvents.id, event.id));
        // Alert
      } else {
        const backoff = [30, 300, 1800][event.retryCount - 1];
        await scheduleRetry(event.id, backoff * 1000);
      }
    }
  }
}
```

---

## 5. Access Control Implementation

### Question
How do we prevent non-enrolled students from accessing recordings?

### Decision
- **Gate 1**: Check JWT session (authentication)
- **Gate 2**: Query `enrollments` table for `(studentId, courseId, status='enrolled')`
- **Gate 3**: Query `payments` table for `(enrollmentId, status='paid')`
- **Response**: Return 403 Forbidden if either gate fails; log denied attempt

### Implementation Endpoint Example
```typescript
// GET /api/recordings/{recordingId}/play-url
export async function GET(req) {
  const studentId = getSessionUserId(req); // from JWT
  const recordingId = params.recordingId;
  
  // Fetch recording metadata
  const recording = await db.query.recordings.findFirst({
    where: eq(recordings.id, recordingId),
  });
  
  // Check enrollment & payment
  const enrollment = await db.query.enrollments.findFirst({
    where: and(
      eq(enrollments.studentId, studentId),
      eq(enrollments.courseId, recording.courseId),
      eq(enrollments.status, 'enrolled'),
    ),
  });
  
  if (!enrollment) {
    logAccessDenial(studentId, recordingId, 'not_enrolled');
    return new Response('Forbidden', { status: 403 });
  }
  
  const payment = await db.query.payments.findFirst({
    where: and(
      eq(payments.enrollmentId, enrollment.id),
      eq(payments.status, 'paid'),
    ),
  });
  
  if (!payment) {
    logAccessDenial(studentId, recordingId, 'not_paid');
    return new Response('Forbidden', { status: 403 });
  }
  
  // Generate signed URL
  const playUrl = await cdnService.generatePlayUrl(recording);
  logAccessSuccess(studentId, recordingId);
  
  return Response.json({ playUrl });
}
```

---

## 6. Webhook Signature Validation

### Question
How do we verify that webhooks really come from Zoom (not spoofed)?

### Decision
- **Method**: HMAC-SHA256 signature verification (Zoom standard)
- **Header**: `x-zm-signature` contains the signature
- **Secret**: Zoom webhook signing secret (stored in env var `ZOOM_WEBHOOK_SECRET`)
- **Validation**: 
  ```typescript
  const message = `v0:${timestamp}:${requestBody}`;
  const hash = hmac('sha256', ZOOM_WEBHOOK_SECRET, message);
  const signature = `v0=${hash}`;
  if (signature !== headerSignature) throw new Error('Invalid signature');
  ```
- **Rationale**: Standard Zoom security practice; prevents unauthorized events from triggering recording sync

---

## 7. Logging & Audit Trail

### Question
What access patterns should we log for compliance?

### Decision
- **What to log**: Every recording access attempt (viewed or denied)
- **Fields**: studentId, recordingId, courseId, action (viewed/denied), timestamp, ipAddress, userAgent, reason (if denied)
- **Storage**: `recording_access_logs` table (append-only)
- **Retention**: Keep for 1 year (configurable)
- **Output**: JSON structured logs for external audit systems
- **Rationale**: Required by spec `FR-008`; supports FERPA/GDPR compliance

---

## 8. Initial Recording Sync (Bootstrap)

### Question
What happens to recordings that existed before this feature was deployed?

### Decision (Deferred for Phase 2)
- For MVP: Assume this feature is deployed before recordings exist OR manual sync initiated
- Future enhancement: Admin endpoint to import existing Zoom recordings for a course
- Approach: Bulk fetch recordings for given `zoomMeetingIds`, validate against Zoom API, store in DB

---

## Summary: Research Findings

| Item | Decision | Status |
|------|----------|--------|
| Zoom API | Official SDK + Cloud Recordings API v2 | ✅ Final |
| Meeting-to-Course Mapping | Array of `zoomMeetingIds` in Course table | ✅ Final |
| CDN Strategy | Cloudinary signed URLs + origin fallback | ✅ Final |
| Webhook Queue | Database-backed (PostgreSQL) with polling | ✅ Final |
| Retry Logic | 3 attempts, exponential backoff (30s, 5min, 30min) | ✅ Final |
| Access Control | Dual-gate check (enrollment + payment) | ✅ Final |
| Signature Validation | HMAC-SHA256 per Zoom spec | ✅ Final |
| Audit Logging | Structured JSON logs to `recording_access_logs` table | ✅ Final |

All research clarifications resolved. No blocking unknowns remain. Ready for Phase 1 design artifact generation.
