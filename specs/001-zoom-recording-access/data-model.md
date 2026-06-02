# Data Model: Zoom Recording Access & Display System

**Phase**: 1 (Design)
**Created**: 2026-06-02
**Research**: [research.md](./research.md)

This document defines the database schema, entities, relationships, and validation rules for recording storage, access control, and audit logging.

---

## Entity Relationship Diagram (Conceptual)

```
courses (existing)
├── id (UUID) [PK]
├── title
├── description
├── zoomMeetingIds (TEXT[]) [NEW]
└── ...

enrollments (existing)
├── id (UUID) [PK]
├── studentId (UUID) [FK → users]
├── courseId (UUID) [FK → courses]
├── status (enum: 'enrolled', 'unenrolled')
└── ...

payments (existing or extend)
├── id (UUID) [PK]
├── enrollmentId (UUID) [FK → enrollments]
├── amount
├── status (enum: 'pending', 'paid', 'failed', 'refunded')
└── ...

recordings [NEW]
├── id (UUID) [PK]
├── courseId (UUID) [FK → courses]
├── zoomRecordingId (STRING) [UNIQUE]
├── zoomMeetingId (STRING)
├── title
├── duration (seconds)
├── thumbnailUrl
├── downloadUrl (immutable from Zoom)
├── synchronizedAt (TIMESTAMP)
├── createdAt (TIMESTAMP)
└── updatedAt (TIMESTAMP)

recording_access_logs [NEW]
├── id (UUID) [PK]
├── studentId (UUID) [FK → users]
├── recordingId (UUID) [FK → recordings]
├── courseId (UUID) [FK → courses]
├── action (enum: 'viewed', 'denied')
├── denyReason (string, null if action='viewed')
├── timestamp (TIMESTAMP)
├── ipAddress (INET)
├── userAgent (TEXT)
└── correlationId (UUID)

webhook_events [NEW]
├── id (UUID) [PK]
├── zoomEventId (STRING) [UNIQUE]
├── eventType (enum: 'recording.completed', ...)
├── payload (JSONB)
├── status (enum: 'pending', 'processed', 'failed')
├── retryCount (INT)
├── lastError (TEXT)
├── correlationId (UUID)
├── processedAt (TIMESTAMP)
└── createdAt (TIMESTAMP)
```

---

## Schema: SQL + Drizzle ORM

### 1. Extend `courses` table

```sql
ALTER TABLE courses ADD COLUMN zoom_meeting_ids TEXT[] DEFAULT ARRAY[]::text[];
```

**Drizzle**:
```typescript
export const courses = pgTable('courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  zoomMeetingIds: text('zoom_meeting_ids').array().default([]),
  // ... existing fields ...
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
```

### 2. New `recordings` table

```sql
CREATE TABLE recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  zoom_recording_id VARCHAR(255) NOT NULL UNIQUE,
  zoom_meeting_id VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  duration INT NOT NULL,  -- seconds
  thumbnail_url TEXT,
  download_url TEXT NOT NULL,  -- immutable from Zoom
  synchronized_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT recordings_course_id_fk 
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE INDEX idx_recordings_course_id ON recordings(course_id);
CREATE INDEX idx_recordings_zoom_recording_id ON recordings(zoom_recording_id);
CREATE INDEX idx_recordings_zoom_meeting_id ON recordings(zoom_meeting_id);
```

**Drizzle**:
```typescript
export const recordings = pgTable('recordings', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  zoomRecordingId: varchar('zoom_recording_id', { length: 255 })
    .notNull()
    .unique(),
  zoomMeetingId: varchar('zoom_meeting_id', { length: 255 }).notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  duration: integer('duration').notNull(),  // seconds
  thumbnailUrl: text('thumbnail_url'),
  downloadUrl: text('download_url').notNull(),
  synchronizedAt: timestamp('synchronized_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const recordingsIndex = index('idx_recordings_course_id').on(recordings.courseId);
export const recordingsZoomIdIndex = index('idx_recordings_zoom_recording_id').on(recordings.zoomRecordingId);
export const recordingsMeetingIdIndex = index('idx_recordings_zoom_meeting_id').on(recordings.zoomMeetingId);
```

### 3. New `recording_access_logs` table

```sql
CREATE TABLE recording_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recording_id UUID NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL CHECK (action IN ('viewed', 'denied')),
  deny_reason VARCHAR(255),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  correlation_id UUID,
  CONSTRAINT correlation_id_not_null_check 
    CHECK (action = 'viewed' OR deny_reason IS NOT NULL)
);

CREATE INDEX idx_access_logs_student_id ON recording_access_logs(student_id);
CREATE INDEX idx_access_logs_recording_id ON recording_access_logs(recording_id);
CREATE INDEX idx_access_logs_course_id ON recording_access_logs(course_id);
CREATE INDEX idx_access_logs_timestamp ON recording_access_logs(timestamp);
```

**Drizzle**:
```typescript
export const recordingAccessLogs = pgTable('recording_access_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  recordingId: uuid('recording_id')
    .notNull()
    .references(() => recordings.id, { onDelete: 'cascade' }),
  courseId: uuid('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 50, enum: ['viewed', 'denied'] }).notNull(),
  denyReason: varchar('deny_reason', { length: 255 }),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow(),
  ipAddress: text('ip_address'),  // Store as text INET if DB supports it
  userAgent: text('user_agent'),
  correlationId: uuid('correlation_id'),
});

export const accessLogsStudentIndex = index('idx_access_logs_student_id').on(recordingAccessLogs.studentId);
export const accessLogsRecordingIndex = index('idx_access_logs_recording_id').on(recordingAccessLogs.recordingId);
export const accessLogsCourseIndex = index('idx_access_logs_course_id').on(recordingAccessLogs.courseId);
export const accessLogsTimestampIndex = index('idx_access_logs_timestamp').on(recordingAccessLogs.timestamp);
```

### 4. New `webhook_events` table (Reliability/Audit)

```sql
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zoom_event_id VARCHAR(255) NOT NULL UNIQUE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'processed', 'failed')),
  retry_count INT DEFAULT 0,
  last_error TEXT,
  correlation_id UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_status ON webhook_events(status);
CREATE INDEX idx_webhook_events_zoom_event_id ON webhook_events(zoom_event_id);
CREATE INDEX idx_webhook_events_created_at ON webhook_events(created_at);
```

**Drizzle**:
```typescript
export const webhookEvents = pgTable('webhook_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  zoomEventId: varchar('zoom_event_id', { length: 255 })
    .notNull()
    .unique(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  payload: jsonb('payload').notNull(),
  status: varchar('status', { length: 50, enum: ['pending', 'processed', 'failed'] })
    .notNull()
    .default('pending'),
  retryCount: integer('retry_count').default(0),
  lastError: text('last_error'),
  correlationId: uuid('correlation_id'),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const webhookEventsStatusIndex = index('idx_webhook_events_status').on(webhookEvents.status);
export const webhookEventsZoomIdIndex = index('idx_webhook_events_zoom_event_id').on(webhookEvents.zoomEventId);
export const webhookEventsCreatedIndex = index('idx_webhook_events_created_at').on(webhookEvents.createdAt);
```

---

## Entity Definitions & Validation

### Recording Entity

**Immutability**: Once created (from Zoom webhook), a recording is immutable. Updates are not allowed; only deletion.

**Validation Rules**:
- `zoomRecordingId`: Unique, non-empty (required)
- `courseId`: Must reference valid enrolled course (FK constraint)
- `title`: Non-empty, max 500 chars
- `duration`: Positive integer (seconds)
- `downloadUrl`: Non-empty URL (validate format)
- `synchronizedAt`: Must be after webhook received timestamp

**State Transitions**:
- **NEW** → **SYNCED** (when webhook processed and metadata fetched from Zoom)
- **SYNCED** → **DELETED** (when course deleted or recording deleted from Zoom)

**Example**:
```typescript
export interface Recording {
  id: string;
  courseId: string;
  zoomRecordingId: string;
  zoomMeetingId: string;
  title: string;
  duration: number;  // seconds
  thumbnailUrl?: string;
  downloadUrl: string;
  synchronizedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### RecordingAccessLog Entity

**Immutability**: Append-only; no updates or deletes (audit trail).

**Validation Rules**:
- `action`: Must be 'viewed' or 'denied'
- If `action === 'denied'`, then `denyReason` is required (e.g., 'not_enrolled', 'not_paid', 'payment_pending')
- If `action === 'viewed'`, then `denyReason` must be null
- `timestamp`: Defaults to current time; no manual override
- `ipAddress`: Optional but recommended for security audit
- `correlationId`: Optional; used for distributed tracing with webhook events

**Purpose**: Immutable audit trail for compliance (FERPA, GDPR).

---

## Query Patterns

### Get Recordings for Enrolled Student

```typescript
// In learning/course/[courseId] handler
const recordings = await db
  .select({ ...recordingsColumns })
  .from(recordings)
  .where(eq(recordings.courseId, courseId))
  .orderBy(desc(recordings.synchronizedAt));
```

### Check Access Control (Dual Gate)

```typescript
// In /api/recordings/{id}/play-url
async function canAccessRecording(studentId: string, recordingId: string) {
  const recording = await db.query.recordings.findFirst({
    where: eq(recordings.id, recordingId),
  });
  
  const enrollment = await db.query.enrollments.findFirst({
    where: and(
      eq(enrollments.studentId, studentId),
      eq(enrollments.courseId, recording.courseId),
      eq(enrollments.status, 'enrolled'),
    ),
  });
  
  if (!enrollment) {
    logAccessDenial(studentId, recordingId, 'not_enrolled');
    return false;
  }
  
  const payment = await db.query.payments.findFirst({
    where: and(
      eq(payments.enrollmentId, enrollment.id),
      eq(payments.status, 'paid'),
    ),
  });
  
  if (!payment) {
    logAccessDenial(studentId, recordingId, 'not_paid');
    return false;
  }
  
  return true;
}
```

### Process Webhook Queue

```typescript
const pendingWebhooks = await db
  .select()
  .from(webhookEvents)
  .where(eq(webhookEvents.status, 'pending'))
  .orderBy(asc(webhookEvents.createdAt))
  .limit(10);
```

### Audit Trail Query

```typescript
// Get all access attempts for a recording (compliance audit)
const accessLog = await db
  .select()
  .from(recordingAccessLogs)
  .where(eq(recordingAccessLogs.recordingId, recordingId))
  .orderBy(desc(recordingAccessLogs.timestamp));
```

---

## Migration Strategy

### Step 1: Drizzle Schema Update
- Add new entities to `lib/schema.ts`
- Run `npm run db:generate` to create migration file
- Review generated SQL (verify indexes, constraints)

### Step 2: Migration Deployment
- Run `npm run db:push` in development to test
- Deploy migration to production database
- Verify tables created successfully

### Step 3: Backward Compatibility
- Existing `courses` table extended (add column); no data loss
- New tables created empty; no impact on existing queries
- Fallback: If `zoom_meeting_ids` is empty array, recording fetch returns empty list (safe)

---

## Performance Considerations

**Indexing**:
- `recordings(course_id)`: Fast lookup of recordings for a course
- `recording_access_logs(student_id, timestamp)`: Audit queries by student
- `webhook_events(status, created_at)`: Queue processing

**Caching** (Client-side):
- Recording list cached with 5-minute TTL on course page (eventual consistency per constitution)
- Invalidate cache on payment success or enrollment change

**Batch Operations** (if needed):
- Bulk insert recordings: Use `multiInsert()` if importing existing recordings
- Bulk delete: Cascade ON DELETE handles cleanup

---

## Security & Compliance

- **Immutability**: Recordings and access logs never updated; ensures audit trail integrity
- **Encryption**: Download URLs stored as encrypted in database (if sensitive)
- **Retention**: Access logs retained for 1 year (configurable); automatic purge job
- **PII**: Recording title may contain sensitive info; stored as-is; redacted in logs if needed

---

## Testing Data Model

### Fixtures for Testing

```typescript
// Recording fixture
export const testRecording = {
  id: 'rec-123',
  courseId: 'course-456',
  zoomRecordingId: 'zoom-rec-789',
  zoomMeetingId: 'zoom-meet-101',
  title: 'Counselling Session 101',
  duration: 2700,  // 45 minutes
  thumbnailUrl: 'https://...',
  downloadUrl: 'https://zoom.us/...',
  synchronizedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Access log fixture
export const testAccessLog = {
  studentId: 'student-1',
  recordingId: 'rec-123',
  courseId: 'course-456',
  action: 'viewed',
  denyReason: null,
  timestamp: new Date(),
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  correlationId: 'corr-999',
};
```

### Sample Queries for Testing

```typescript
// Test: Retrieve recordings for enrolled student
test('should return recordings for enrolled student', async () => {
  const recordings = await db
    .select()
    .from(recordings)
    .where(eq(recordings.courseId, 'course-456'));
  
  expect(recordings).toHaveLength(1);
  expect(recordings[0].title).toBe('Counselling Session 101');
});

// Test: Deny access to non-enrolled student
test('should deny access to non-enrolled student', async () => {
  const canAccess = await canAccessRecording('student-999', 'rec-123');
  expect(canAccess).toBe(false);
});

// Test: Log denied access
test('should log denied access attempt', async () => {
  await logAccessDenial('student-999', 'rec-123', 'not_enrolled');
  
  const logs = await db
    .select()
    .from(recordingAccessLogs)
    .where(eq(recordingAccessLogs.recordingId, 'rec-123'));
  
  expect(logs[0].action).toBe('denied');
  expect(logs[0].denyReason).toBe('not_enrolled');
});
```

---

## Next Steps

- Run database migration: `npm run db:generate && npm run db:push`
- Implement service layer (RecordingService, AccessControlService)
- Create API endpoints with access control checks
- Implement webhook processor with queue
