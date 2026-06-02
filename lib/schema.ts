import { pgTable, serial, text, timestamp, varchar, integer } from 'drizzle-orm/pg-core';

export const enquiries = pgTable('enquiries', {
  id: serial('id').primaryKey(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  program: varchar('program', { length: 200 }),
  message: text('message'),
  status: varchar('status', { length: 50 }).default('new'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const testimonials = pgTable('testimonials', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  role: varchar('role', { length: 200 }),
  content: text('content').notNull(),
  stars: integer('stars').default(5),
  status: varchar('status', { length: 50 }).default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const courses = pgTable('courses', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  duration: varchar('duration', { length: 100 }),
  priceSingleGHS: integer('price_single_ghs'),
  priceSingleUSD: integer('price_single_usd'),
  priceCoupleGHS: integer('price_couple_ghs'),
  priceCoupleUSD: integer('price_couple_usd'),
  status: varchar('status', { length: 50 }).default('active'),
  // P1: Comma-separated Zoom Meeting IDs linked to this course.
  // Webhook uses this for exact meeting→course matching (no fuzzy text search).
  // Example: "123456789,987654321"
  zoomMeetingIds: text('zoom_meeting_ids').default(''),
  // Comma-separated keywords or aliases used to match Zoom meeting names to courses.
  // Example: "PMC, Pre-Marital"
  matchKeywords: text('match_keywords').default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  dob: varchar('dob', { length: 50 }),
  gender: varchar('gender', { length: 50 }),
  country: varchar('country', { length: 100 }),
  maritalStatus: varchar('marital_status', { length: 100 }),
  course: varchar('course', { length: 255 }),
  amount: integer('amount'),
  status: varchar('status', { length: 50 }).default('pending'),
  paymentStatus: varchar('payment_status', { length: 50 }).default('pending'),
  paymentReference: varchar('payment_reference', { length: 255 }),
  paymentTimestamp: timestamp('payment_timestamp'),
  bookingDate: varchar('booking_date', { length: 50 }),
  bookingTime: varchar('booking_time', { length: 50 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Legacy table — kept for backward compatibility (old booking-flow video lookups).
// New Zoom recordings are stored in the `recordings` table below.
export const videos = pgTable('videos', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  cloudinaryPublicId: varchar('cloudinary_public_id', { length: 255 }),
  zoomId: varchar('zoom_id', { length: 255 }),
  downloadUrl: text('download_url'), // Stores Zoom play_url (permanent, no expiry)
  passcode: varchar('passcode', { length: 100 }), // Legacy field — kept to avoid data loss
  courseId: integer('course_id'),
  moduleId: integer('module_id'),
  lessonId: integer('lesson_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ==========================================
// PHASE 2: LMS (Learning Management System)
// ==========================================

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).default('student'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const modules = pgTable('modules', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  orderIndex: integer('order_index').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const lessons = pgTable('lessons', {
  id: serial('id').primaryKey(),
  moduleId: integer('module_id').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  cloudinaryPublicId: varchar('cloudinary_public_id', { length: 255 }),
  zoomId: varchar('zoom_id', { length: 255 }),
  passcode: varchar('passcode', { length: 100 }), // Legacy field — kept to avoid data loss
  orderIndex: integer('order_index').default(0),
  durationMinutes: integer('duration_minutes').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const enrollments = pgTable('enrollments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  courseId: integer('course_id').notNull(),
  paymentReference: varchar('payment_reference', { length: 255 }),
  status: varchar('status', { length: 50 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const progress = pgTable('progress', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  lessonId: integer('lesson_id').notNull(),
  completed: integer('completed').default(0),
  completedAt: timestamp('completed_at'),
});

// ==========================================
// PHASE 3: Zoom Recording Access (Spec 001)
// ==========================================

/**
 * recordings — canonical store for Zoom Cloud Recording metadata.
 * One row per MP4 recording file.
 * zoomRecordingId UNIQUE prevents duplicate rows when Zoom re-delivers the same webhook.
 */
export const recordings = pgTable('recordings', {
  id:              serial('id').primaryKey(),
  courseId:        integer('course_id').notNull(),
  zoomRecordingId: varchar('zoom_recording_id', { length: 255 }).notNull().unique(),
  zoomMeetingId:   varchar('zoom_meeting_id',   { length: 255 }).notNull(),
  title:           varchar('title',              { length: 500 }).notNull(),
  durationMinutes: integer('duration_minutes').default(0),
  // Zoom web-player URL — embeddable iframe, no token, no expiry.
  playUrl:         text('play_url').notNull(),
  // Direct MP4 URL with access_token (expires ~24h). Fallback only.
  downloadUrl:     text('download_url'),
  synchronizedAt:  timestamp('synchronized_at').defaultNow(),
  createdAt:       timestamp('created_at').defaultNow(),
});

/**
 * webhook_events — idempotency log + durable queue for Zoom webhooks.
 * Webhook receiver writes here immediately (returns 200 fast), then processes synchronously.
 * zoomEventId UNIQUE prevents duplicate processing of re-delivered events.
 */
export const webhookEvents = pgTable('webhook_events', {
  id:          serial('id').primaryKey(),
  zoomEventId: varchar('zoom_event_id', { length: 255 }).notNull().unique(),
  eventType:   varchar('event_type',    { length: 100 }).notNull(),
  payload:     text('payload').notNull(),
  status:      varchar('status', { length: 50 }).default('pending'), // pending | processed | failed
  retryCount:  integer('retry_count').default(0),
  lastError:   text('last_error'),
  processedAt: timestamp('processed_at'),
  createdAt:   timestamp('created_at').defaultNow(),
});

/**
 * recording_access_logs — append-only audit trail (spec FR-008 / SC-006).
 * Records every access attempt: successful views AND denied attempts with reason.
 */
export const recordingAccessLogs = pgTable('recording_access_logs', {
  id:          serial('id').primaryKey(),
  studentId:   integer('student_id').notNull(),
  recordingId: integer('recording_id').notNull(),
  courseId:    integer('course_id').notNull(),
  action:      varchar('action',      { length: 50 }).notNull(),  // 'viewed' | 'denied'
  denyReason:  varchar('deny_reason', { length: 255 }),           // 'not_enrolled' | 'not_paid'
  ipAddress:   varchar('ip_address',  { length: 64 }),
  userAgent:   text('user_agent'),
  timestamp:   timestamp('timestamp').defaultNow(),
});

// ── Type exports ──────────────────────────────────────────────────────────────
export type Enquiry            = typeof enquiries.$inferSelect;
export type NewEnquiry         = typeof enquiries.$inferInsert;
export type Testimonial        = typeof testimonials.$inferSelect;
export type Course             = typeof courses.$inferSelect;
export type Booking            = typeof bookings.$inferSelect;
export type Video              = typeof videos.$inferSelect;
export type User               = typeof users.$inferSelect;
export type Module             = typeof modules.$inferSelect;
export type Lesson             = typeof lessons.$inferSelect;
export type Enrollment         = typeof enrollments.$inferSelect;
export type Progress           = typeof progress.$inferSelect;
export type Recording          = typeof recordings.$inferSelect;
export type WebhookEvent       = typeof webhookEvents.$inferSelect;
export type RecordingAccessLog = typeof recordingAccessLogs.$inferSelect;
