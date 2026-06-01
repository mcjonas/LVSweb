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
  status: varchar('status', { length: 50 }).default('pending'), // pending, paid
  paymentStatus: varchar('payment_status', { length: 50 }).default('pending'), // success, failed, pending
  paymentReference: varchar('payment_reference', { length: 255 }),
  paymentTimestamp: timestamp('payment_timestamp'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const videos = pgTable('videos', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  zoomId: varchar('zoom_id', { length: 255 }), // Added for Zoom integration
  downloadUrl: text('download_url'), // Added for direct Zoom download if needed
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
  role: varchar('role', { length: 50 }).default('student'), // student, admin
  createdAt: timestamp('created_at').defaultNow(),
});

export const modules = pgTable('modules', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id').notNull(), // Links to existing courses table
  title: varchar('title', { length: 255 }).notNull(),
  orderIndex: integer('order_index').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const lessons = pgTable('lessons', {
  id: serial('id').primaryKey(),
  moduleId: integer('module_id').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  zoomId: varchar('zoom_id', { length: 255 }), // Added for Zoom
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
  completed: integer('completed').default(0), // 0 or 1
  completedAt: timestamp('completed_at'),
});

export type Enquiry = typeof enquiries.$inferSelect;
export type NewEnquiry = typeof enquiries.$inferInsert;
export type Testimonial = typeof testimonials.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Video = typeof videos.$inferSelect;
export type User = typeof users.$inferSelect;
export type Module = typeof modules.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type Enrollment = typeof enrollments.$inferSelect;
export type Progress = typeof progress.$inferSelect;
