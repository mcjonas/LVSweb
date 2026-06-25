'use server';

import { db } from './db';
import { enquiries, testimonials, courses, bookings } from './schema';
import { desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { checkAuth } from './auth-utils';
import { z } from 'zod';

const CourseSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().min(10),
  duration: z.string().optional(),
  priceSingleGHS: z.number().nonnegative().optional(),
  priceSingleUSD: z.number().nonnegative().optional(),
  priceCoupleGHS: z.number().nonnegative().optional(),
  priceCoupleUSD: z.number().nonnegative().optional(),
  matchKeywords: z.string().optional(),
});

const EnquirySchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName:  z.string().min(1).max(100),
  email:     z.string().email(),
  phone:     z.string().max(50).optional(),
  program:   z.string().max(200).optional(),
  message:   z.string().max(5000).optional(),
});

const EnrollmentSchema = z.object({
  name:          z.string().min(1).max(255),
  email:         z.string().email(),
  phone:         z.string().min(1).max(50),
  dob:           z.string().max(50).optional(),
  gender:        z.string().max(50).optional(),
  country:       z.string().max(100).optional(),
  maritalStatus: z.string().max(100).optional(),
  course:        z.string().min(1).max(255),
  type:          z.string().max(100),
  amount:        z.number().positive(),
});

export async function getCourses() {
  try {
    return await db.select().from(courses).orderBy(desc(courses.createdAt));
  } catch (err) {
    console.error('[getCourses] Database error — returning empty array. Cause:', err);
    return [];
  }
}

export async function getCourseById(id: number) {
  try {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    return course;
  } catch (err) {
    console.error('[getCourseById] Database error:', err);
    return undefined;
  }
}

export async function addCourse(data: {
  title: string;
  description: string;
  duration?: string;
  priceSingleGHS?: number;
  priceSingleUSD?: number;
  priceCoupleGHS?: number;
  priceCoupleUSD?: number;
  matchKeywords?: string;
}) {
  await checkAuth();
  
  // Validate input
  const validated = CourseSchema.safeParse(data);
  if (!validated.success) {
    const errorMsg = validated.error.issues.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
    console.error('Validation failed for addCourse:', errorMsg);
    return { success: false, error: `Invalid input: ${errorMsg}` };
  }

  try {
    await db.insert(courses).values(validated.data);
    revalidatePath('/');
    revalidatePath('/dashboard/courses');
    revalidatePath('/enroll');
    revalidatePath('/learning/enroll');
    return { success: true };
  } catch (error) {
    console.error('Failed to add course:', error);
    return { success: false };
  }
}

export async function updateCourse(id: number, data: Partial<typeof courses.$inferInsert>) {
  await checkAuth();

  // Validate the fields being updated (partial)
  const validated = CourseSchema.partial().safeParse(data);
  if (!validated.success) {
    const errorMsg = validated.error.issues.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
    console.error('Validation failed for updateCourse:', errorMsg);
    return { success: false, error: `Invalid update: ${errorMsg}` };
  }

  try {
    await db.update(courses).set(validated.data).where(eq(courses.id, id));
    revalidatePath('/');
    revalidatePath('/dashboard/courses');
    revalidatePath('/enroll');
    revalidatePath('/learning/enroll');
    return { success: true };
  } catch (error) {
    console.error('Failed to update course:', error);
    return { success: false };
  }
}

export async function deleteCourse(id: number) {
  await checkAuth();
  try {
    await db.delete(courses).where(eq(courses.id, id));
    revalidatePath('/');
    revalidatePath('/dashboard/courses');
    revalidatePath('/enroll');
    revalidatePath('/learning/enroll');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete course:', error);
    return { success: false };
  }
}

export async function getBookings() {
  await checkAuth();
  return db.select().from(bookings).orderBy(desc(bookings.createdAt));
}

export async function submitEnquiry(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  program?: string;
  message?: string;
}) {
  // Validate input
  const validated = EnquirySchema.safeParse(data);
  if (!validated.success) {
    return { success: false, error: 'Invalid enquiry data' };
  }

  try {
    // Insert into enquiries table
    const [enquiry] = await db.insert(enquiries).values(validated.data).returning();

    // If a specific program is selected, also create a booking entry
    if (validated.data.program && validated.data.program !== 'Not sure — I need guidance') {
      await db.insert(bookings).values({
        name: `${validated.data.firstName} ${validated.data.lastName}`,
        email: validated.data.email,
        phone: validated.data.phone,
        course: validated.data.program,
        status: 'new'
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to submit enquiry:', error);
    return { success: false, error: 'Failed to submit enquiry' };
  }
}

export async function submitEnrollment(data: {
  name: string;
  email: string;
  phone: string;
  dob: string;
  gender: string;
  country: string;
  maritalStatus: string;
  course: string;
  type: string;
  amount: number;
}) {
  // Validate input
  const validated = EnrollmentSchema.safeParse(data);
  if (!validated.success) {
    return { success: false, error: 'Invalid enrollment data' };
  }

  try {
    const courseName = `${validated.data.course} (${validated.data.type})`;

    await db.insert(bookings).values({
      name: validated.data.name,
      email: validated.data.email,
      phone: validated.data.phone,
      dob: validated.data.dob,
      gender: validated.data.gender,
      country: validated.data.country,
      maritalStatus: validated.data.maritalStatus,
      course: courseName,
      amount: validated.data.amount,
      status: 'pending',
      paymentStatus: 'pending'
    });

    revalidatePath('/dashboard/bookings');
    return { success: true };
  } catch (error) {
    console.error('Failed to submit enrollment:', error);
    return { success: false, error: 'Failed to submit enrollment' };
  }
}

export async function deleteEnquiry(id: number) {
  await checkAuth();
  try {
    await db.delete(enquiries).where(eq(enquiries.id, id));
    revalidatePath('/dashboard/enquiries');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete enquiry:', error);
    return { success: false };
  }
}

export async function getEnquiries() {
  await checkAuth();
  return db.select().from(enquiries).orderBy(desc(enquiries.createdAt));
}

export async function getTestimonials() {
  return db.select().from(testimonials).orderBy(desc(testimonials.createdAt));
}

export async function getTestimonialById(id: number) {
  await checkAuth();
  const [testimonial] = await db.select().from(testimonials).where(eq(testimonials.id, id));
  return testimonial;
}

export async function addTestimonial(data: Partial<typeof testimonials.$inferInsert>) {
  await checkAuth();
  try {
    await db.insert(testimonials).values(data as typeof testimonials.$inferInsert);
    revalidatePath('/');
    revalidatePath('/dashboard/testimonials');
    return { success: true };
  } catch (error) {
    console.error('Failed to add testimonial:', error);
    return { success: false };
  }
}

export async function updateTestimonial(id: number, data: Partial<typeof testimonials.$inferInsert>) {
  await checkAuth();
  try {
    await db.update(testimonials).set(data).where(eq(testimonials.id, id));
    revalidatePath('/');
    revalidatePath('/dashboard/testimonials');
    return { success: true };
  } catch (error) {
    console.error('Failed to update testimonial:', error);
    return { success: false };
  }
}

export async function deleteTestimonial(id: number) {
  await checkAuth();
  try {
    await db.delete(testimonials).where(eq(testimonials.id, id));
    revalidatePath('/');
    revalidatePath('/dashboard/testimonials');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete testimonial:', error);
    return { success: false };
  }
}

export async function getStats() {
  await checkAuth();
  try {
    const [allEnquiries, allTestimonials, allCourses, allBookings] = await Promise.all([
      db.select().from(enquiries),
      db.select().from(testimonials),
      db.select().from(courses),
      db.select().from(bookings),
    ]);
    return {
      totalEnquiries:   allEnquiries.length,
      newEnquiries:     allEnquiries.filter(e => e.status === 'new').length,
      totalCourses:     allCourses.length,
      pendingBookings:  allBookings.filter(b => b.status === 'new').length,
      totalTestimonials: allTestimonials.length,
    };
  } catch (err) {
    console.error('[getStats] Database error — returning zero stats. Cause:', err);
    return { totalEnquiries: 0, newEnquiries: 0, totalCourses: 0, pendingBookings: 0, totalTestimonials: 0 };
  }
}
