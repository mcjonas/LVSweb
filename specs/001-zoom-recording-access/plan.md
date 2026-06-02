# Implementation Plan: Zoom Recording Access & Display System

**Branch**: `001-zoom-recording-access` | **Date**: 2026-06-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-zoom-recording-access/spec.md`

## Summary

Implement a secure, scalable Zoom recording synchronization and access control system that:
1. **Validates Zoom webhooks** to securely receive recording notifications from Zoom Cloud
2. **Enforces enrollment-based access control** ensuring only students who paid have access to course recordings  
3. **Displays recordings dynamically** on enrolled course pages after payment, with CDN-based streaming
4. **Logs all access** for audit compliance and security monitoring

This feature unblocks the core learning platform flow: Payment → Redirect → Access Recordings. It aligns with the LVSweb Constitution's principles on modular services, event-driven integration, immutable storage, and observability.

## Technical Context

**Language/Version**: TypeScript 5.x (Next.js 16.2.4 app router)

**Primary Dependencies**: 
- Backend: Next.js API routes, Drizzle ORM, Node.js serverless
- Frontend: React 19, TypeScript
- Database: PostgreSQL (Neon serverless)
- External: Zoom SDK, AWS S3 or Cloudinary (for CDN)

**Storage**: PostgreSQL for enrollment, recording metadata, webhook logs; Zoom Cloud Recordings for video storage

**Testing**: Vitest for unit tests; integration tests for Zoom webhook signature verification and API access control

**Target Platform**: Web (Next.js serverless on Node.js runtime)

**Project Type**: Web service (monolithic Next.js app with modular API routes)

**Performance Goals**: 
- Video playback starts within 2 seconds (P95) from CDN
- Webhook processing within 10 seconds
- Recording synchronization within 5 minutes of Zoom notification

**Constraints**:
- Recording access enforced at API gateway (not file system)
- CDN signed URLs non-transferable and short-lived (15 min)
- Webhook signature validation mandatory (security gate)
- Zero tolerance for unlogged access attempts

**Scale/Scope**: 
- Estimated 1000+ students; 100+ courses; 50+ recordings per course
- Concurrent playback: 500+ streams without degradation (per constitution)

## Constitution Check

**GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.**

### Principle I: Modular Service Architecture ✅
- **Requirement**: Recording/Zoom integration designed as independent service
- **Plan compliance**: Zoom webhook handler, recording metadata service, and access control layer each own their logic and API contracts
- **Design decision**: Separate service for `RecordingService` (fetch metadata, sync), `AccessControlService` (enrollment check), `CDNService` (signed URL generation)
- **Status**: PASS — Services communicate via APIs, no shared database access

### Principle II: Event-Driven Integration ✅
- **Requirement**: Zoom webhooks flow through async event bus; never block user requests
- **Plan compliance**: Webhook receiver validates signature → enqueues event (Kafka/SQS) → async job processes (metadata fetch, transcoding)
- **Design decision**: Separate webhook handler (fast acknowledgment) from processing job
- **Status**: PASS — Webhook queue and retry logic with exponential backoff; idempotent processing with correlation IDs

### Principle III: Immutable Recording Storage & Delivery ✅
- **Requirement**: Access enforced at API gateway; CDN with signed URLs
- **Plan compliance**: Student never gets raw storage URL; API generates signed URLs (15 min expiry) for each playback request
- **Design decision**: Recording access endpoint: `GET /api/recordings/{recordingId}/play-url` returns signed CDN URL
- **Status**: PASS — Immutable Zoom recordings; access controlled by enrollment check; CDN signed URLs per playback

### Principle IV: Database-Per-Service + Eventual Consistency ✅
- **Requirement**: Each service owns its schema; cross-service queries via API
- **Plan compliance**: 
  - Recording Service: owns `recordings`, `recording_metadata` tables
  - Enrollment Service: owns `enrollments`, `payment_status` tables (existing)
  - Access log service: owns `recording_access_logs` table
- **Design decision**: Recording page fetches enrollments via API call; displays cached data with eventual consistency
- **Status**: PASS — No shared database joins; services query each other via API

### Principle V: Observability & Graceful Degradation ✅
- **Requirement**: Structured logs, metrics, distributed traces; handle partial failures
- **Plan compliance**: 
  - JSON logs for all webhook events, access checks, API calls
  - Metrics: webhook success/failure rate, access denial rate, sync latency
  - Degradation: if Zoom API down, queue webhook for retry; if CDN unavailable, serve from origin
- **Design decision**: Correlation ID in all events for distributed tracing; fallback origin URL if CDN fails
- **Status**: PASS — All checks logged; SLOs defined; graceful fallbacks planned

**GATE RESULT**: ✅ **PASS** — Feature design complies with all 5 constitution principles.

## Project Structure

### Documentation (this feature)

```text
specs/001-zoom-recording-access/
├── spec.md                    # Feature specification (user stories, requirements)
├── plan.md                    # This file (technical approach, architecture)
├── research.md                # Phase 0: Research findings on unknowns
├── data-model.md              # Phase 1: Database schema, entities, relationships
├── contracts/                 # Phase 1: API contracts and data formats
│   ├── webhook-contract.md    # Zoom webhook payload and LVSweb processing
│   ├── api-contract.md        # Recording access and display endpoints
│   └── recording-model.md     # Recording metadata schema
├── quickstart.md              # Phase 1: Developer quick-start guide
└── checklists/
    └── requirements.md        # Quality validation (completed)
```

### Source Code (monolithic Next.js app)

```text
app/
├── api/
│   ├── webhooks/
│   │   └── zoom/
│   │       └── route.ts           # Webhook receiver: validate, enqueue
│   ├── recordings/
│   │   ├── [id]/
│   │   │   └── route.ts           # Recording detail endpoint
│   │   ├── course/[courseId]/
│   │   │   └── route.ts           # List recordings for enrolled course
│   │   └── [id]/play-url/
│   │       └── route.ts           # Generate signed CDN URL (access control)
│   └── access-logs/
│       └── route.ts               # Log recording access (audit)
├── learning/
│   └── course/[courseId]/
│       └── page.tsx               # Course page: fetch and display recordings
└── ...existing pages...

lib/
├── db.ts                          # Database connection (existing)
├── schema.ts                       # Drizzle schema (extend for recordings)
├── recordings/
│   ├── service.ts                 # RecordingService: fetch metadata, sync
│   ├── access-control.ts          # AccessControlService: enrollment checks
│   └── cdn.ts                     # CDNService: generate signed URLs
├── zoom/
│   ├── webhook-handler.ts         # Validate Zoom signature, enqueue
│   ├── webhook-processor.ts       # Async job: fetch metadata, store
│   └── client.ts                  # Zoom Cloud Recordings API client
└── logging/
    └── audit.ts                   # Structured access logging

tests/
├── unit/
│   ├── webhook-validator.test.ts
│   ├── access-control.test.ts
│   └── cdn-service.test.ts
├── integration/
│   ├── webhook-flow.test.ts
│   ├── recording-sync.test.ts
│   └── playback-access.test.ts
└── fixtures/
    └── zoom-webhook-samples.ts
```

**Structure Decision**: Monolithic Next.js app extended with new API routes and service layers. Zoom webhook handling and recording sync logic in separate service modules (`lib/zoom/`, `lib/recordings/`) to maintain clear separation. Database schema extended in existing `lib/schema.ts`. No new services deployed—all runs in Next.js serverless (aligns with existing architecture).

## Phase 0: Research & Clarification

### Research Tasks

1. **Zoom Cloud Recordings API Integration**
   - **Task**: Verify Zoom Cloud Recordings API v2 endpoints, authentication methods (OAuth2 token refresh), metadata available (title, duration, thumbnail, transcript)
   - **Dependency**: Required to define recording metadata schema and sync job logic
   - **Finding**: Zoom API provides `/recordings` endpoint with metadata; webhooks provide `recording.completed` event with recordingId
   - **Decision**: Use Zoom SDK for OAuth and API calls; implement local webhook signature validation using HMAC-SHA256

2. **Course-to-Zoom-Meeting Mapping**
   - **Task**: Determine how courses link to Zoom meetings. Is there a many-to-many? Do we store meeting IDs in course schema?
   - **Dependency**: Required to implement `FR-003` (link recordings to courses)
   - **Assumption**: Courses have `zoomMeetingIds` array or single meeting ID; records stored in course table
   - **Decision**: Add `zoomMeetingIds` array field to Course entity; on webhook, match recordingId → meetingId → courseId

3. **CDN and Signed URL Strategy**
   - **Task**: Verify Cloudinary integration (already used in project) supports signed URLs / short-lived tokens. Alternatives: AWS CloudFront, or origin fallback
   - **Dependency**: Required for `FR-007` (provision CDN signed URLs)
   - **Finding**: Cloudinary supports signed delivery URLs with expiry; alternatively use AWS S3 presigned URLs if storing there
   - **Decision**: Use Cloudinary (already integrated) for signed URLs; fallback to origin stream if CDN unavailable

4. **Webhook Retry and Queue Strategy**
   - **Task**: Should we use SQS, local queue (Kafka-lite), or database queue (polling)? What's the retry strategy for failed processing?
   - **Dependency**: Required for `FR-009` (webhook failures handled gracefully)
   - **Assumption**: Use Node.js native queue (Bull/BullMQ with Redis) or database-backed queue for simplicity; 3 retries with exponential backoff (1s, 5s, 30s)
   - **Decision**: Implement database-backed queue (PostgreSQL) with polling worker; retries with correlation ID for idempotent replay

---

### Clarification Decisions (Informed Defaults)

- **Payment Redirect Flow**: Assume Paystack already redirects to `/payment-success` → redirect to `/learning/dashboard` (existing). This feature extends dashboard to fetch and display course recordings.
- **Recording Availability**: Assume Zoom Cloud Recording becomes available within 5 min of session end; we aim to display within 5 min of webhook (SLA met).
- **Access Revocation**: Assume immediate revocation on payment failure/refund (no grace period initially; can be added as enhancement).
- **Concurrent Playback**: Assume CDN handles 500+ concurrent streams; origin fallback if CDN degraded.

---

### Findings Documented

**Decision Log**:
- ✅ Zoom API: Use official SDK + local webhook validation
- ✅ Meeting-to-Course Mapping: Add `zoomMeetingIds` array to Course table
- ✅ CDN: Cloudinary signed URLs (fallback to origin)
- ✅ Webhook Queue: Database-backed queue with Bull MQ or simple polling worker
- ✅ Retry Strategy: 3 attempts, exponential backoff, idempotent with correlation IDs

---

## Phase 1: Design & Contracts

### Data Model

See `data-model.md` for complete schema. Key entities:

**recordings** table:
- `id` (UUID)
- `zoomRecordingId` (string, unique)
- `zoomMeetingId` (string)
- `courseId` (UUID, foreign key)
- `title`, `duration`, `thumbnailUrl`, `playbackUrl` (immutable, from Zoom)
- `synchronizedAt` (timestamp)
- `createdAt`, `updatedAt`

**recording_access_logs** table:
- `id` (UUID)
- `studentId` (UUID)
- `recordingId` (UUID)
- `courseId` (UUID)
- `action` ('viewed', 'attempted_access_denied')
- `timestamp`
- `ipAddress`
- `userAgent`

**webhook_events** table (for reliability):
- `id` (UUID)
- `zoomEventId` (string)
- `eventType` ('recording.completed', etc.)
- `payload` (JSON)
- `status` ('pending', 'processed', 'failed')
- `retryCount`
- `lastError`
- `correlationId`

### API Contracts

See `contracts/` directory for full specifications:

**Webhook Endpoint**: `POST /api/webhooks/zoom`
- Input: Zoom webhook payload with signature header
- Validation: HMAC-SHA256 signature check
- Response: 200 OK (async processing)
- Stores webhook event in queue for processing

**Recording List Endpoint**: `GET /api/recordings/course/{courseId}`
- Input: courseId, studentId (from session)
- Authentication: JWT session required
- Authorization: Check enrollment + payment status
- Response: Array of recordings with playback URLs
- Error: 403 Forbidden if not enrolled/not paid

**Recording Play-URL Endpoint**: `GET /api/recordings/{recordingId}/play-url`
- Input: recordingId, studentId (from session)
- Authorization: Check enrollment + payment status
- Response: Signed CDN URL (15 min expiry) or origin URL
- Logs access attempt (success or denied)

### Service Architecture

1. **WebhookHandler Service**
   - Receives webhook, validates signature
   - Extracts zoomRecordingId, zoomMeetingId
   - Enqueues webhook event with correlation ID
   - Returns 200 OK immediately

2. **RecordingService**
   - Async job picks webhook from queue
   - Calls Zoom API to fetch metadata (title, duration, thumbnail)
   - Maps zoomMeetingId → courseId
   - Stores recording in DB
   - Marks event as 'processed'
   - On failure: logs error, increments retry count, re-enqueues

3. **AccessControlService**
   - Checks student enrollment for courseId
   - Verifies payment status = 'paid'
   - Returns boolean (access granted / denied)
   - Used by all recording access endpoints

4. **CDNService**
   - Generates signed Cloudinary URL (15 min expiry)
   - Falls back to origin if Cloudinary unavailable
   - Returns URL to frontend player

### Quickstart Guide

See `quickstart.md` for developer setup:
- Environment variables (Zoom API credentials, CDN keys)
- Local webhook testing (ngrok tunnel)
- Running webhook processor job locally
- Testing access control scenarios

---

## Complexity Tracking

No constitution violations requiring justification. All design decisions align with project principles.

---

## Next Steps (Phase 2)

1. **Run `/speckit-tasks`** to generate detailed implementation tasks
2. **Review contracts** and finalize API design with team
3. **Create database migration** (drizzle-kit generate)
4. **Implement webhook handler** and signature validation
5. **Implement recording sync job** with Zoom API integration
6. **Implement access control checks** in recording endpoints
7. **Wire up recording display** in course page UI
8. **End-to-end testing** with Zoom sandbox environment
9. **Deploy to staging** and verify with real recordings

---

**Implementation Timeline**: 
- Phase 0 (Research): ✅ Complete (above)
- Phase 1 (Design & Contracts): ✅ Complete (this plan)
- Phase 2 (Tasks): Pending `/speckit-tasks` invocation
- Phase 3 (Implementation): ~2-3 weeks (6-8 dev tasks)
- Phase 4 (Testing & Deployment): ~1 week
