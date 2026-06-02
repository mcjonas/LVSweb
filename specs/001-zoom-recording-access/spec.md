# Feature Specification: Zoom Recording Access & Display System

**Feature Branch**: `001-zoom-recording-access`

**Created**: 2026-06-02

**Status**: Draft

**Input**: User description: "Implement Zoom webhook verification system, fix recording access control for enrolled students only, and display recordings in courses after payment. Issue: Previously recorded Zoom videos are not displayed/accessible in the course after payment and enrollment."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Student Views Course Recordings After Payment (Priority: P1)

A student completes payment for a course (either Self-Paced Learning or Normal Enrollment option), gets redirected to the learning platform dashboard, navigates to the enrolled course, and expects to see all recorded Zoom sessions for that specific course.

**Why this priority**: This is the core user value—students cannot access course content after paying, directly blocking the product's primary function. Without this working, the platform is unusable.

**Independent Test**: Can be fully tested by: (1) Creating a test payment, (2) Verifying redirect to learning platform, (3) Checking course page for video list, (4) Confirming all course-related recordings display correctly. Delivers: Student can watch purchased course content immediately.

**Acceptance Scenarios**:

1. **Given** a student has successfully completed payment for a course, **When** they are redirected to the learning platform, **Then** they can navigate to that course and see a list of recorded Zoom sessions associated with it
2. **Given** a student views an enrolled course page, **When** the page loads, **Then** all recording videos related to that course display with titles, thumbnails, and play buttons
3. **Given** a student clicks play on a recording, **When** the video player loads, **Then** the video streams without errors and plays the full recording

---

### User Story 2 - Restrict Recording Access to Enrolled Students Only (Priority: P2)

The system enforces access control so that only students who have completed payment for a specific course can view or play recordings for that course. Unenrolled or non-paying students cannot access the content.

**Why this priority**: Security and business requirement—prevents unauthorized access to paid content and protects revenue. Also required by the project constitution's security principles (access control, logging).

**Independent Test**: Can be fully tested by: (1) Creating test user accounts with/without enrollment, (2) Attempting to access course recordings via API/UI as different user types, (3) Verifying access denied for non-enrolled users. Delivers: Content protection and compliance with enrollment status.

**Acceptance Scenarios**:

1. **Given** a student who has NOT enrolled in a course, **When** they attempt to view that course's recordings via API or UI, **Then** access is denied (403 Forbidden or redirect to enrollment page)
2. **Given** a student who enrolled but has NOT completed payment, **When** they attempt to access course recordings, **Then** access is denied and a message prompts them to complete payment
3. **Given** a student who is enrolled and has paid, **When** they request course recordings, **Then** the API returns only recordings for their enrolled courses

---

### User Story 3 - Secure Zoom Webhook Integration (Priority: P3)

The system validates incoming Zoom webhook events to ensure they originate from Zoom (not spoofed) and processes recording notifications securely. When a Zoom recording becomes available, the system fetches metadata and makes it accessible to enrolled students.

**Why this priority**: Infrastructure security requirement—prevents unauthorized actors from manipulating the system via fake webhooks. Required by constitution principles (security, observability). Necessary for automation but not user-blocking (can fall back to manual sync).

**Independent Test**: Can be fully tested by: (1) Sending valid Zoom webhook signatures and observing processing, (2) Sending invalid signatures and verifying rejection, (3) Checking logs for webhook events. Delivers: Secure, automated recording synchronization from Zoom.

**Acceptance Scenarios**:

1. **Given** Zoom sends a webhook event with a valid signature, **When** the system receives it, **Then** the webhook is processed and the recording metadata is fetched
2. **Given** an attacker sends a webhook with an invalid signature, **When** the system receives it, **Then** the event is rejected (401 Unauthorized) and logged for security review
3. **Given** a Zoom recording becomes available (webhook received), **When** the system processes it, **Then** enrolled students with access to that course see the recording within 5 minutes

---

### Edge Cases

- What happens when a Zoom webhook delivery fails or times out? (Retry with exponential backoff; log for manual review)
- How does the system handle if a student's payment fails or is refunded after they've started watching a recording? (Access revoked immediately; provide grace period notification if needed)
- What if Zoom API is temporarily unavailable when a webhook is received? (Queue the webhook event for retry; do not lose it)
- What happens if a recording is deleted from Zoom Cloud but is still referenced in a course? (Remove from course display; log the deletion event)
- How are concurrent students accessing the same recording handled? (Served from CDN with signed URLs per constitution; no conflicts)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST validate all incoming Zoom webhooks using Zoom's signature verification method before processing
- **FR-002**: System MUST fetch recording metadata (title, duration, thumbnail, transcript if available) from Zoom Cloud Recordings API after webhook validation
- **FR-003**: System MUST link recordings to courses based on Zoom meeting/webinar IDs and course enrollment data
- **FR-004**: System MUST enforce enrollment-based access control: only students with active, paid enrollment for a course can view/access that course's recordings
- **FR-005**: System MUST display course recordings on the enrolled course page, ordered by date (newest first), with playable video player
- **FR-006**: System MUST redirect students to the learning platform/dashboard immediately after successful payment completion
- **FR-007**: System MUST provision CDN signed URLs for recording playback (short-lived, per-student, non-transferable per constitution)
- **FR-008**: System MUST log all recording access attempts (studentId, courseId, recordingId, timestamp, IP) for audit compliance
- **FR-009**: System MUST handle Zoom webhook failures gracefully: retry failed webhook events with exponential backoff (max 3 retries); alert on persistent failures
- **FR-010**: System MUST synchronize recordings within 5 minutes of Zoom webhook notification; longer delays MUST be logged as warnings

### Key Entities

- **Recording**: Represents a Zoom Cloud Recording. Attributes: zoomRecordingId, courseId, title, duration, thumbnailUrl, playbackUrl (signed/expiring), createdAt, transcriptUrl (optional)
- **Enrollment**: Represents student enrollment in a course. Attributes: studentId, courseId, enrollmentStatus (enrolled/unenrolled), paymentStatus (paid/pending/failed), enrollmentDate, paymentDate
- **Course**: Represents a course. Attributes: courseId, title, description, recordingIds (list of associated recordings), createdAt, updatedAt
- **WebhookEvent**: Represents a Zoom webhook event. Attributes: eventId, zoomEventType, payload, signature, receivedAt, processedAt, status (pending/processed/failed), retryCount

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Students see enrolled course recordings within 5 seconds of navigating to the course page after payment (P95 latency)
- **SC-002**: 100% of enrolled students with paid status can access course recordings; 0% of non-enrolled or non-paying students can access
- **SC-003**: Zoom webhook verification rejects 100% of invalid/spoofed webhook requests; valid webhooks processed within 10 seconds
- **SC-004**: Recording synchronization latency: 95% of recordings appear in the course within 5 minutes of Zoom webhook notification
- **SC-005**: Playback success rate: 99% of authorized playback attempts stream video without errors
- **SC-006**: Zero unlogged access attempts: 100% of recording access attempts (successful and failed) are logged for audit

## Assumptions

- **Existing Auth**: The platform's existing authentication system (user login, session management) continues to work and is not modified by this feature
- **Existing Payment System**: The payment processing and enrollment workflow are already functional; this feature assumes successful payment transitions users to "paid" status reliably
- **Zoom Credentials**: Valid Zoom API credentials (OAuth tokens, webhook signing keys) are securely stored and accessible by the backend service
- **Zoom Cloud Recording API**: Recordings are stored in Zoom Cloud Recordings (not local), and Zoom Cloud Recordings API v2 is available and functional
- **Course-Recording Mapping**: A mapping mechanism (manual or automatic) exists or will be created to link Zoom meeting IDs to course IDs
- **Database**: Relational database (PostgreSQL or equivalent) is available to store enrollment, recording metadata, and webhook event logs
- **CDN**: A CDN is available for video delivery (per constitution); signed URLs are used for access control and short-lived playback links
- **No Mobile App v1**: Mobile app playback is out of scope for this initial release; web player is the primary interface
- **Zoom Webhook Retries**: Zoom retries webhook deliveries; system also implements client-side retry logic for resilience
- **Session Duration**: Recorded sessions are long-form (30+ min to several hours); system handles streaming of large video files efficiently
