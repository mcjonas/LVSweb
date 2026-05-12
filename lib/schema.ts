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
  cloudinaryPublicId: varchar('cloudinary_public_id', { length: 255 }).notNull(),
  courseId: integer('course_id'), // Optional, to link to a specific course
  createdAt: timestamp('created_at').defaultNow(),
});

export type Enquiry = typeof enquiries.$inferSelect;
export type NewEnquiry = typeof enquiries.$inferInsert;
export type Testimonial = typeof testimonials.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Video = typeof videos.$inferSelect;
