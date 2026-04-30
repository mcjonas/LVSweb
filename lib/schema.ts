import { pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';

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
  stars: serial('stars').default(5),
  status: varchar('status', { length: 50 }).default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
});

export type Enquiry = typeof enquiries.$inferSelect;
export type NewEnquiry = typeof enquiries.$inferInsert;
export type Testimonial = typeof testimonials.$inferSelect;
