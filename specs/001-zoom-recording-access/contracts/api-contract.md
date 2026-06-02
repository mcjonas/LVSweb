# API Contracts: Zoom Recording Access & Display System

**Phase**: 1 (Design)
**Created**: 2026-06-02

This document defines the API contracts, request/response formats, error handling, and integration points for the Zoom recording system.

---

## 1. Zoom Webhook Endpoint

### Endpoint
```
POST /api/webhooks/zoom
```

### Purpose
Receive Zoom webhook notifications when recordings become available in Zoom Cloud Recordings.

### Authentication
- **Type**: HMAC-SHA256 signature verification
- **Header**: `x-zm-signature` (format: `v0=<hash>`)
- **Secret**: `ZOOM_WEBHOOK_SECRET` (env var)

### Request Headers
```
x-zm-signature: v0=abc123def456...
x-zm-request-timestamp: 1685577418
content-type: application/json
```

### Request Body (Zoom Webhook Payload)

```json
{
  "event": "recording.completed",
  "event_ts": 1685577418000,
  "download_token": "AAA_download_token_BBB",
  "object": {
    "id": "zoom-meeting-id",
    "uuid": "zoom-meeting-uuid",
    "account_id": "zoom-account-id",
    "host_id": "host-id",
    "topic": "Counselling Session 101",
    "type": 1,
    "start_time": "2026-06-02T10:00:00Z",
    "duration": 45,
    "timezone": "America/New_York",
    "recording_count": 1,
    "share_url": "https://zoom.us/...",
    "recording_files": [
      {
        "id": "recording-id-123",
        "recording_type": "shared_screen_with_speaker_view",
        "file_size": 123456789,
        "file_type": "MP4",
        "play_url": "https://zoom.us/...",
        "download_url": "https://zoom.us/...",
        "status": "completed",
        "recording_start": "2026-06-02T10:00:00Z",
        "recording_end": "2026-06-02T10:45:00Z"
      }
    ]
  }
}
```

### Validation Steps

1. **Signature Verification**
   ```
   message = v0:{timestamp}:{request_body}
   expected_hash = HMAC_SHA256(ZOOM_WEBHOOK_SECRET, message)
   if (provided_signature != v0=expected_hash) {
     return 401 Unauthorized
   }
   ```

2. **Timestamp Validation** (prevent replay attacks)
   ```
   if (|current_time - provided_timestamp| > 300 seconds) {
     return 401 Unauthorized
   }
   ```

3. **Event Type Check**
   ```
   if (event != 'recording.completed') {
     return 200 OK (ignore other events)
   }
   ```

### Response (Success)

```
Status: 200 OK
Content-Type: application/json

{
  "status": "queued",
  "correlationId": "corr-123-456-789",
  "message": "Webhook event enqueued for processing"
}
```

- **Status 200**: Webhook accepted and enqueued (processing happens async)
- **Status 401**: Invalid signature or timestamp; request rejected
- **Status 500**: Server error; Zoom should retry

### Implementation Notes

- **Always respond 200 OK** (even for invalid signature) if processing is successful, to prevent Zoom retry loops
- **However, reject silently** for invalid signatures in logs but still acknowledge receipt
- **Store webhook payload** in `webhook_events` table before processing
- **Async processing**: Separate job picks up webhook and syncs recording metadata

---

## 2. Recording List Endpoint

### Endpoint
```
GET /api/recordings/course/{courseId}
```

### Purpose
Retrieve list of Zoom recordings for an enrolled course. Called when student views course page.

### Authentication
- **Type**: JWT Bearer token (session cookie or Authorization header)
- **Required**: User must be authenticated (logged in)

### Path Parameters
```
courseId: UUID (e.g., "550e8400-e29b-41d4-a716-446655440000")
```

### Query Parameters (Optional)
```
?limit=20      # Max 100 (default 20)
?offset=0      # Pagination offset (default 0)
?sort=-created # Sort by field: created, title, duration
```

### Response (Success - 200 OK)

```json
{
  "status": "success",
  "data": {
    "courseId": "550e8400-e29b-41d4-a716-446655440000",
    "recordings": [
      {
        "id": "rec-001",
        "title": "Counselling Session 101 - Introduction",
        "duration": 2700,
        "thumbnailUrl": "https://...",
        "synchronizedAt": "2026-06-02T10:45:30Z",
        "createdAt": "2026-06-02T10:45:30Z"
      },
      {
        "id": "rec-002",
        "title": "Counselling Session 102 - Deep Dive",
        "duration": 3600,
        "thumbnailUrl": "https://...",
        "synchronizedAt": "2026-06-02T11:50:30Z",
        "createdAt": "2026-06-02T11:50:30Z"
      }
    ],
    "total": 2,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

### Response (Forbidden - 403)

```json
{
  "status": "error",
  "code": "FORBIDDEN",
  "message": "You are not enrolled in this course or payment is pending",
  "reason": "not_enrolled | not_paid | payment_pending"
}
```

### Response (Not Found - 404)

```json
{
  "status": "error",
  "code": "NOT_FOUND",
  "message": "Course not found"
}
```

### Access Control Logic

```typescript
function validateAccess(studentId, courseId) {
  // Gate 1: Check enrollment
  enrollment = query enrollments where studentId=? AND courseId=? AND status='enrolled'
  if (!enrollment) {
    logAccessDenial(studentId, courseId, 'not_enrolled')
    return { status: 403, reason: 'not_enrolled' }
  }
  
  // Gate 2: Check payment
  payment = query payments where enrollmentId=? AND status='paid'
  if (!payment) {
    logAccessDenial(studentId, courseId, 'not_paid')
    return { status: 403, reason: 'not_paid' }
  }
  
  return { status: 200 }
}
```

### Caching Strategy (Client-side)

- Cache response for 5 minutes (eventual consistency acceptable)
- Invalidate cache on payment success or enrollment change
- TTL: `max-age=300, must-revalidate`

---

## 3. Play-URL Generation Endpoint

### Endpoint
```
GET /api/recordings/{recordingId}/play-url
```

### Purpose
Generate a signed CDN URL for streaming a specific recording. Called when student clicks "Play" button.

### Authentication
- **Type**: JWT Bearer token (session)
- **Required**: User must be authenticated

### Path Parameters
```
recordingId: UUID (e.g., "rec-001")
```

### Response (Success - 200 OK)

```json
{
  "status": "success",
  "data": {
    "recordingId": "rec-001",
    "playUrl": "https://res.cloudinary.com/...?expires=1685577718&signature=abc123...",
    "expiresIn": 900,
    "format": "mp4",
    "courseName": "Counselling 101"
  }
}
```

- **playUrl**: Signed CDN URL (valid for 15 minutes)
- **expiresIn**: Seconds until URL expires (900 = 15 min)
- **format**: Video format (mp4, etc.)

### Response (Forbidden - 403)

```json
{
  "status": "error",
  "code": "FORBIDDEN",
  "message": "You do not have access to this recording",
  "reason": "not_enrolled | not_paid | payment_pending | recording_not_found"
}
```

### Response (Not Found - 404)

```json
{
  "status": "error",
  "code": "NOT_FOUND",
  "message": "Recording not found"
}
```

### Implementation Flow

```typescript
async function getPlayUrl(recordingId, studentId, correlationId) {
  // 1. Fetch recording metadata
  recording = await db.recordings.findById(recordingId)
  if (!recording) return 404
  
  // 2. Check access control (enrollment + payment)
  canAccess = await validateAccess(studentId, recording.courseId)
  if (!canAccess) {
    logAccessDenial(studentId, recordingId, reason, correlationId)
    return 403
  }
  
  // 3. Generate signed URL
  playUrl = await cdnService.generateSignedUrl(recording.downloadUrl, expirySeconds=900)
  
  // 4. Log successful access
  logAccessSuccess(studentId, recordingId, recording.courseId, correlationId)
  
  // 5. Return play URL
  return { playUrl, expiresIn: 900 }
}
```

### Graceful Degradation

If CDN is unavailable:
```typescript
try {
  playUrl = await cloudinary.generateSignedUrl(...)
} catch (error) {
  // Fallback to origin (direct download_url)
  playUrl = recording.downloadUrl
}
```

---

## 4. Access Denied Logging Endpoint

### Endpoint
```
POST /api/access-logs
```

### Purpose
Server-side logging of recording access attempts (both successful and denied). Called by backend only (not from client).

### Request Body

```json
{
  "studentId": "student-123",
  "recordingId": "rec-001",
  "courseId": "course-456",
  "action": "viewed",
  "denyReason": null,
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "correlationId": "corr-999-111-222"
}
```

Or (for denied access):

```json
{
  "studentId": "attacker-456",
  "recordingId": "rec-001",
  "courseId": "course-456",
  "action": "denied",
  "denyReason": "not_enrolled",
  "ipAddress": "203.0.113.5",
  "userAgent": "curl/7.85.0",
  "correlationId": "corr-888-222-333"
}
```

### Response (201 Created)

```json
{
  "status": "success",
  "logId": "log-uuid-here",
  "message": "Access logged successfully"
}
```

### Internal Implementation

- **No authentication required** (internal API, called from trusted backend)
- **Append-only**: Inserts always; never updates or deletes
- **Immutable**: Access logs are audit trail; stored as-is
- **Structured**: JSON format for external audit systems
- **Retention**: Logs kept for 1 year; auto-purge job

---

## 5. Webhook Retry Processing (Internal Job)

### Purpose
Async background job that processes queued webhook events and syncs recordings from Zoom.

### Trigger
- Scheduled every 30 seconds (or manual trigger)
- Poll `webhook_events` table where `status = 'pending'` and `retry_count < 3`

### Processing Logic

```typescript
async function processWebhookQueue() {
  const pendingEvents = await db.webhookEvents
    .where({ status: 'pending' })
    .limit(10)
  
  for (const event of pendingEvents) {
    try {
      // Extract metadata
      const { zoomRecordingId, zoomMeetingId } = event.payload
      
      // Fetch from Zoom API
      const metadata = await zoomClient.getRecordingMetadata(zoomRecordingId)
      
      // Map meeting → course
      const courses = await db.courses
        .where(course => zoomMeetingId IN course.zoom_meeting_ids)
      
      if (!courses.length) {
        throw new Error(`No courses found for meeting ${zoomMeetingId}`)
      }
      
      // Store recording for each course
      for (const course of courses) {
        await db.recordings.insert({
          zoomRecordingId,
          zoomMeetingId,
          courseId: course.id,
          title: metadata.title,
          duration: metadata.duration,
          thumbnailUrl: metadata.thumbnail,
          downloadUrl: metadata.downloadUrl,
          synchronizedAt: new Date(),
        })
      }
      
      // Mark webhook as processed
      await db.webhookEvents.update(event.id, {
        status: 'processed',
        processedAt: new Date(),
      })
      
      log.info('Webhook processed', { 
        correlationId: event.correlationId,
        recordingCount: courses.length,
      })
    } catch (error) {
      event.retryCount++
      
      if (event.retryCount >= 3) {
        await db.webhookEvents.update(event.id, {
          status: 'failed',
          lastError: error.message,
        })
        log.error('Webhook failed after 3 retries', {
          correlationId: event.correlationId,
          error: error.message,
        })
        // Alert ops
      } else {
        const backoff = [30, 300, 1800][event.retryCount - 1] * 1000
        // Schedule retry
        setTimeout(() => processWebhookQueue(), backoff)
      }
    }
  }
}
```

### Failure Handling

- **Retry Strategy**: 3 attempts (30s, 5min, 30min)
- **Idempotency**: Use `zoomRecordingId` unique constraint; duplicate inserts fail safely
- **Alerting**: After final failure, log alert for ops team review

---

## 6. Error Handling & Response Codes

### Standard Responses

| Code | Meaning | Use Case |
|------|---------|----------|
| 200 | OK | Successful GET/POST |
| 201 | Created | Resource created |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid input (missing field, bad format) |
| 401 | Unauthorized | Invalid/missing JWT token |
| 403 | Forbidden | Authenticated but not authorized (no enrollment, not paid) |
| 404 | Not Found | Resource not found (course, recording) |
| 500 | Server Error | Unexpected error (log for debugging) |

### Error Response Format

```json
{
  "status": "error",
  "code": "FORBIDDEN",
  "message": "You are not enrolled in this course",
  "details": {
    "reason": "not_enrolled",
    "courseId": "course-123",
    "studentId": "student-456"
  },
  "timestamp": "2026-06-02T12:34:56Z",
  "correlationId": "corr-111-222-333"
}
```

---

## 7. Rate Limiting & Throttling

### Webhook Endpoint
- **Limit**: 1000 requests per minute (per IP)
- **Window**: 1 minute rolling
- **Response**: 429 Too Many Requests if exceeded

### Recording List Endpoint
- **Limit**: 100 requests per minute per user
- **Window**: 1 minute rolling
- **Response**: 429 Too Many Requests if exceeded

### Play-URL Endpoint
- **Limit**: 500 requests per minute per user
- **Window**: 1 minute rolling (prevent abuse of signed URL generation)
- **Response**: 429 Too Many Requests if exceeded

---

## 8. Data Formats & Validation

### Duration
- **Format**: Seconds (integer)
- **Range**: 1 - 86400 (up to 24 hours per recording)
- **Example**: 2700 (45 minutes)

### Timestamps
- **Format**: ISO 8601 (RFC 3339)
- **Example**: "2026-06-02T10:45:30Z"
- **Timezone**: Always UTC (Z suffix)

### UUIDs
- **Format**: RFC 4122 v4
- **Example**: "550e8400-e29b-41d4-a716-446655440000"
- **Validation**: Regex or UUID library

### URLs
- **Format**: HTTPS only (no HTTP)
- **Validation**: Must be valid URL scheme
- **Example**: "https://res.cloudinary.com/..."

### Enum Values

**Recording Action**:
- `viewed` — student successfully accessed recording
- `denied` — access denied (not enrolled, not paid, etc.)

**Webhook Status**:
- `pending` — awaiting processing
- `processed` — successfully processed
- `failed` — processing failed after retries

**Payment Status**:
- `pending` — awaiting payment
- `paid` — payment completed
- `failed` — payment failed
- `refunded` — payment refunded (access revoked)

---

## 9. Integration Points

### Zoom Cloud Recordings API
- **Base URL**: `https://zoom.us/v2`
- **Auth**: OAuth2 access token (stored in env)
- **Endpoints Used**:
  - `GET /recordings/{recordingId}` — fetch metadata
  - Webhook events (automatically pushed by Zoom)

### Cloudinary CDN
- **Base URL**: `https://res.cloudinary.com/{cloud_name}`
- **Feature**: Signed delivery URLs with expiry
- **Integration**: `cloudinary` npm package

### Existing LVSweb APIs
- **Enrollments**: `GET /api/enrollments` (or internal query)
- **Payments**: `GET /api/payments` (or internal query)
- **Courses**: `GET /api/courses/{courseId}` (or internal query)

---

## 10. Versioning Strategy

### API Version
- Current: `v1` (implied in endpoints; may add `/api/v1/...` if needed)
- Backward compatibility: Maintained for 1 major release
- Deprecation: Notify 3 months before removal

### Webhook Payload
- **Event schema versioning**: If Zoom webhook payload changes, keep older versions for 6 months
- **Filtering**: Check `event_type` and handle gracefully if unknown

---

## Testing Checklist

- [ ] Webhook signature validation (valid & invalid)
- [ ] Timestamp validation (prevent replay attacks)
- [ ] Recording list returns only for enrolled + paid students
- [ ] Play-URL access control enforced
- [ ] Access logging captures all attempts (viewed & denied)
- [ ] Retry logic with exponential backoff
- [ ] Graceful degradation (CDN fallback)
- [ ] Rate limiting enforced
- [ ] Error responses include correlation IDs for debugging

