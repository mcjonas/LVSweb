# Tasks: Zoom Recording Access & Display System

**Input**: Design documents from `/specs/001-zoom-recording-access/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Included as part of each user story (integration + contract tests)

**Organization**: Tasks grouped by user story to enable independent implementation and testing. MVP: Complete User Story 1. Story 2 & 3 can follow in parallel after foundational work.

---

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story ([US1], [US2], [US3]) - OMITTED from Setup/Foundational phases
- **File paths**: Exact relative paths from project root (app/, lib/, tests/)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and environment configuration

- [ ] T001 Add environment variables to `.env.local` (ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, ZOOM_WEBHOOK_SECRET, CLOUDINARY credentials)
- [ ] T002 Install Zoom SDK and Cloudinary packages: `npm install zoom-sdk cloudinary`
- [ ] T003 [P] Configure TypeScript strict mode verification in tsconfig.json
- [ ] T004 [P] Setup test fixtures directory at `tests/fixtures/` for Zoom webhook samples

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure MUST be complete before ANY user story implementation

**⚠️ CRITICAL**: User stories cannot begin until this phase is complete

### Database Schema & Migrations

- [ ] T005 Extend `lib/schema.ts` with `recordings` table (id, courseId, zoomRecordingId, zoomMeetingId, title, duration, thumbnailUrl, downloadUrl, synchronizedAt, createdAt, updatedAt)
- [ ] T006 [P] Extend `lib/schema.ts` with `recording_access_logs` table (id, studentId, recordingId, courseId, action, denyReason, timestamp, ipAddress, userAgent, correlationId)
- [ ] T007 [P] Extend `lib/schema.ts` with `webhook_events` table (id, zoomEventId, eventType, payload, status, retryCount, lastError, correlationId, processedAt, createdAt)
- [ ] T008 [P] Extend `courses` entity in `lib/schema.ts` with `zoomMeetingIds` TEXT[] field
- [ ] T009 Run `npm run db:generate` to create Drizzle migration file
- [ ] T010 Run `npm run db:push` to apply migration to PostgreSQL

### Foundational Services & Utilities

- [ ] T011 [P] Create Zoom SDK client wrapper in `lib/zoom/client.ts` with OAuth token management and API methods
- [ ] T012 [P] Implement Zoom signature validator in `lib/zoom/signature-validator.ts` (HMAC-SHA256 verification per Zoom spec)
- [ ] T013 [P] Create CDN service in `lib/recordings/cdn.ts` with `generatePlayUrl()` using Cloudinary signed URLs + origin fallback
- [ ] T014 [P] Create access control service in `lib/recordings/access-control.ts` with `canAccessRecording()` dual-gate check (enrollment + payment)
- [ ] T015 [P] Create audit logging service in `lib/logging/audit.ts` with `logAccessAttempt()` for recording_access_logs

### Middleware & Error Handling

- [ ] T016 [P] Add correlation ID middleware to `app/api/` routes for distributed tracing (store in thread-local or request context)
- [ ] T017 [P] Create error handler utility in `lib/error-handler.ts` that returns JSON responses with error code, message, correlationId
- [ ] T018 [P] Setup structured JSON logging using existing logging framework in `lib/logging/structured.ts`

### Webhook Queue Infrastructure

- [ ] T019 Create webhook event queue table accessor in `lib/recordings/webhook-queue.ts` with `enqueueWebhook()`, `getPendingWebhooks()`, `markProcessed()` methods
- [ ] T020 Implement webhook processor worker script at `scripts/process-webhook-queue.ts` that polls `webhook_events` table and calls async processor

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Student Views Course Recordings After Payment (Priority: P1) 🎯 MVP

**Goal**: After payment, enrolled students see all Zoom recordings for their course on the course page, with working video player. Payment redirect flows to learning dashboard.

**Independent Test**: (1) Create test payment and enrollment, (2) Verify student redirected to learning dashboard post-payment, (3) Navigate to course page, (4) Confirm recordings list displays with titles and thumbnails, (5) Click play and verify video stream starts.

### Integration Tests for User Story 1

- [ ] T021 [US1] Create integration test for recording list retrieval in `tests/integration/test-recording-list.ts` (test Happy path: enrolled + paid student sees recordings)
- [ ] T022 [US1] Create end-to-end test for video playback flow in `tests/integration/test-playback-flow.ts` (test: get play-URL, verify signed URL returned)

### Implementation for User Story 1

- [ ] T023 [P] [US1] Create `Recording` type in `lib/types/recording.ts` (id, courseId, zoomRecordingId, title, duration, thumbnailUrl)
- [ ] T024 [P] [US1] Create Recording repository in `lib/db/recording-repository.ts` with `getRecordingsByCourse()`, `getRecordingById()` query methods
- [ ] T025 [US1] Implement Recording service in `lib/recordings/recording-service.ts` with `fetchRecordingsForCourse()` method (depends on T024, T014)
- [ ] T026 [US1] Create API endpoint `GET /api/recordings/course/[courseId]` in `app/api/recordings/course/[courseId]/route.ts` with access control check (depends on T025)
- [ ] T027 [US1] Create API endpoint `GET /api/recordings/[id]/play-url` in `app/api/recordings/[id]/play-url/route.ts` that returns signed CDN URL (depends on T025, T013)
- [ ] T028 [US1] Update course page component `app/learning/course/[courseId]/page.tsx` to fetch and display recordings list
- [ ] T029 [US1] Create VideoPlayer component in `app/components/VideoPlayer.tsx` with play button, calls play-url endpoint, renders video element
- [ ] T030 [US1] Add recording display UI to course page template with thumbnails, titles, duration, sorted by date (newest first)
- [ ] T031 [US1] Ensure payment success redirect already points to `/learning/dashboard` (verify in payment-success route)
- [ ] T032 [US1] Add error handling for 403 Forbidden responses in recording endpoint with user-friendly message

**Checkpoint**: User Story 1 complete - students can view and play course recordings after payment ✅

---

## Phase 4: User Story 2 - Restrict Recording Access to Enrolled Students Only (Priority: P2)

**Goal**: Enforce dual-gate access control (enrollment + payment). Only paid, enrolled students see/access recordings. Non-enrolled or unpaid students get 403 Forbidden with clear messaging.

**Independent Test**: (1) Test non-enrolled student accessing recording (denied), (2) Test enrolled-but-not-paid student (denied), (3) Test enrolled + paid student (allowed), (4) Verify all denied attempts logged.

### Tests for User Story 2

- [ ] T033 [P] [US2] Create access control unit tests in `tests/unit/test-access-control.ts` (test: not_enrolled → denied, not_paid → denied, enrolled+paid → allowed)
- [ ] T034 [P] [US2] Create integration test for authorization in `tests/integration/test-recording-authorization.ts` (test: API returns 403 for unauthorized students)

### Implementation for User Story 2

- [ ] T035 [P] [US2] Implement `canAccessRecording(studentId, courseId)` in `lib/recordings/access-control.ts` (depends on T014; queries enrollments + payments)
- [ ] T036 [P] [US2] Create enrollment repository in `lib/db/enrollment-repository.ts` with `getEnrollmentStatus()` method
- [ ] T037 [P] [US2] Create payment repository in `lib/db/payment-repository.ts` with `getPaymentStatus()` method
- [ ] T038 [US2] Add access control check to `GET /api/recordings/course/[courseId]` route (return 403 if check fails) (depends on T035, T036, T037)
- [ ] T039 [US2] Add access control check to `GET /api/recordings/[id]/play-url` route (return 403 if not allowed) (depends on T035, T036, T037)
- [ ] T040 [US2] Add access denial logging in both endpoints via `logAccessAttempt('denied', reason)` (depends on T015)
- [ ] T041 [US2] Add user-facing error messages for 403 responses: "You are not enrolled in this course" vs "Please complete payment to access recordings"
- [ ] T042 [US2] Create admin endpoint `GET /api/admin/access-logs?courseId=X` to view access audit trail (optional, for compliance team)

**Checkpoint**: User Story 2 complete - access control gates enforced, logged, and audited ✅

---

## Phase 5: User Story 3 - Secure Zoom Webhook Integration (Priority: P3)

**Goal**: Receive Zoom webhook events securely (signature validation), queue them, and process asynchronously to sync recording metadata. Recordings appear in course within 5 minutes of Zoom notification.

**Independent Test**: (1) Send valid Zoom webhook with correct signature (processed), (2) Send invalid signature (rejected), (3) Verify webhook_events queue populated, (4) Run processor job and confirm recording synced to DB, (5) Check 5-minute SLA.

### Tests for User Story 3

- [ ] T043 [P] [US3] Create webhook signature validation tests in `tests/unit/test-webhook-signature.ts` (test: valid sig → passes, invalid sig → rejected)
- [ ] T044 [P] [US3] Create webhook processing tests in `tests/unit/test-webhook-processor.ts` (test: pending webhook → processed → recorded in DB)
- [ ] T045 [US3] Create integration test for full webhook flow in `tests/integration/test-webhook-end-to-end.ts` (depends on T043, T044; test: webhook → queue → processor → recording visible)

### Implementation for User Story 3

- [ ] T046 [US3] Implement webhook receiver endpoint `POST /api/webhooks/zoom` in `app/api/webhooks/zoom/route.ts` (depends on T012, T019)
  - Validate signature using T012
  - Extract event type and payload
  - Enqueue to webhook_events table via T019
  - Return 200 OK immediately (async processing)
  - Log webhook receipt with correlationId

- [ ] T047 [US3] Implement webhook processor async job in `lib/recordings/webhook-processor.ts` (depends on T019, T025, T011)
  - Poll webhook_events table for status='pending'
  - For each event: call Zoom API to fetch recording metadata
  - Match zoomMeetingId to courseId via courses table
  - Insert recording into recordings table for each course
  - Mark webhook as 'processed' in webhook_events
  - Handle errors: increment retryCount, schedule retry, or mark 'failed'

- [ ] T048 [US3] Create scheduled task to invoke processor via `scripts/process-webhook-queue.ts` (run every 30 seconds via Node.js setInterval or external cron)

- [ ] T049 [US3] Add retry logic to processor with exponential backoff (30s, 5min, 30min) in `lib/recordings/webhook-processor.ts` (depends on T047)

- [ ] T050 [US3] Add error alerting: on final failure (3 retries exhausted), log alert + send notification to ops (depends on T047)

- [ ] T051 [US3] Add structured logging to webhook receiver: log all events (valid/invalid) with reason, correlationId, timestamp to `lib/logging/structured.ts` (depends on T018)

- [ ] T052 [US3] Implement meeting-to-course mapping in processor: query `courses` table where zoomMeetingIds contains webhook's zoomMeetingId (depends on T047)

- [ ] T053 [US3] Add test webhook endpoint `POST /api/webhooks/zoom/test` (dev-only) to manually trigger webhook processing for testing (optional, for developers)

**Checkpoint**: User Story 3 complete - Zoom webhooks securely processed, recordings synced automatically ✅

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Performance optimization, monitoring, documentation, and final validation

### Observability & Monitoring

- [ ] T054 [P] Add metrics collection for all recording endpoints: request count, latency (P95, P99), error rate
- [ ] T055 [P] Add SLO dashboards: video playback starts <2s (P95), webhook processing <10s, recording sync <5 min (95%)
- [ ] T056 [P] Add distributed tracing: ensure all logs include correlationId for end-to-end tracing
- [ ] T057 [P] Setup error alerts: alert on webhook processing failures, access denial spikes, CDN fallback usage

### Documentation & Developer Experience

- [ ] T058 [P] Create deployment guide in `docs/DEPLOYMENT.md` with environment setup, database migration steps, webhook configuration
- [ ] T059 [P] Update README.md with Zoom recording feature overview and usage instructions
- [ ] T060 [P] Create troubleshooting guide in `docs/TROUBLESHOOTING.md` (webhook not received, invalid signature, etc.)
- [ ] T061 [P] Add inline code comments for complex logic in webhook processor, access control, CDN service

### Performance & Security

- [ ] T062 [P] Add rate limiting to webhook endpoint (1000 req/min per IP) in middleware
- [ ] T063 [P] Add rate limiting to recording endpoints (100 req/min per user for list, 500 req/min for play-url)
- [ ] T064 [P] Implement recording list caching with 5-minute TTL for performance
- [ ] T065 [P] Add request/response validation: validate UUIDs, enum values, request body size
- [ ] T066 [P] Security audit: verify no PII in logs, no unencrypted secrets in code, webhook signatures mandatory

### Final Validation

- [ ] T067 Perform full end-to-end test on staging: payment → enrollment → webhook → recording visible → playback works
- [ ] T068 Load test: verify 500+ concurrent video streams without degradation
- [ ] T069 [P] Verify all acceptance scenarios from spec.md are met and pass
- [ ] T070 [P] Manual security testing: attempt access as non-enrolled student, refunded student, invalid session
- [ ] T071 [P] Verify audit logs complete: all access attempts logged with studentId, courseId, timestamp, IP, action
- [ ] T072 Deploy to production: update Zoom webhook URL in app settings, enable webhook processing in prod
- [ ] T073 Post-deployment validation: verify webhooks received, recordings appear in courses, no error spikes

---

## Task Dependencies & Parallelization Strategy

### Critical Path (Must Complete Sequentially)
```
Setup (Phase 1)
  ↓
Database Migrations (T005-T010)
  ↓
Foundational Services (T011-T020) [mostly parallel]
  ↓
User Story 1 (Phase 3) [MVP]
  ↓
User Story 2 (Phase 4) [can overlap with US1 after foundational ready]
  ↓
User Story 3 (Phase 5) [can overlap, independent]
  ↓
Polish & Deployment (Phase 6)
```

### Parallelization Opportunities

**Phase 2 Foundational (run after T010)**:
- T011, T012, T013, T014, T015 can run in parallel (independent services)
- T016, T017, T018 can run in parallel (middleware/utilities)
- T019 can run in parallel (queue infrastructure)

**Phase 3 User Story 1 (after Phase 2)**:
- T023, T024 can run in parallel (types & repository)
- T021, T022 (tests) can start early (write first)
- T025 depends on T024, T014 → starts after both ready
- T026, T027 depend on T025 → can start after T025
- T028, T029, T030 (UI) can run in parallel after T026, T027

**Phase 4 User Story 2 (after Phase 2, can start during Phase 3 backend work)**:
- T033, T034 (tests) can write in parallel
- T035, T036, T037 (repositories & service) can run in parallel
- T038, T039 depend on T035, T036, T037
- T040, T041, T042 depend on T038, T039

**Phase 5 User Story 3 (after Phase 2, can start after Phase 3 DB foundation)**:
- T043, T044 (tests) can write in parallel
- T045 depends on T043, T044 → starts after tests written
- T046, T047, T048 can start in parallel after T012, T019, T011 ready
- T049-T053 depend on T047

**Phase 6 Polish (after Phase 5 complete, many parallel)**:
- T054-T057 (monitoring) parallel
- T058-T061 (docs) parallel
- T062-T066 (perf/security) parallel (except rate limiting depends on middleware framework)
- T067-T073 (validation/deployment) sequential

---

## MVP Scope Recommendation

**To ship MVP (Student Views Recordings):
- Complete Phase 1 (Setup)
- Complete Phase 2 (Foundational)
- Complete Phase 3 (User Story 1)
- Skip Phase 4 & 5 for MVP
- Do minimal Phase 6 (essential docs)

**Timeline**: ~1-2 weeks for MVP (core 25 tasks)

**Post-MVP**:
- Phase 4 (Access Control): ~3-5 days (core security feature)
- Phase 5 (Webhooks): ~5-7 days (automation)
- Phase 6 (Polish): ~3-5 days (monitoring, docs, deployment)

---

## Quality Checklist

- [ ] All tasks have Task ID (T001-T073)
- [ ] All user story tasks labeled with [US1], [US2], [US3]
- [ ] Parallelizable tasks marked with [P]
- [ ] All tasks include exact file paths
- [ ] Dependencies documented in task descriptions
- [ ] Tests written before implementation (T021-T022, T033-T034, T043-T045)
- [ ] Each user story independently testable
- [ ] No orphaned tasks (all have clear prerequisites/dependents)
- [ ] Phase gates clear (Phase 2 must complete before Phase 3+)

---

## Success Metrics (from spec.md)

After completing all phases, verify:
- SC-001: Students see recordings within 5 seconds (P95 latency) ✓
- SC-002: 100% enrolled+paid can access; 0% non-enrolled can access ✓
- SC-003: Webhook verification rejects 100% invalid; processes valid within 10s ✓
- SC-004: 95% of recordings sync within 5 minutes ✓
- SC-005: 99% authorized playback success ✓
- SC-006: 100% of access attempts logged ✓

---

**Total Tasks**: 73
**MVP Tasks (Phase 1-3)**: 32
**Full Scope Tasks (All Phases)**: 73
