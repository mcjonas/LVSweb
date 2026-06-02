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

export async function getCourses() {
  return db.select().from(courses).orderBy(desc(courses.createdAt));
}

export async function getCourseById(id: number) {
  const [course] = await db.select().from(courses).where(eq(courses.id, id));
  return course;
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
    return { success: false, error: 'Invalid input data' };
  }

  try {
    await db.insert(courses).values(validated.data);
    revalidatePath('/');
    revalidatePath('/dashboard/courses');
    return { success: true };
  } catch (error) {
    console.error('Failed to add course:', error);
    return { success: false };
  }
}

export async function updateCourse(id: number, data: Partial<typeof courses.$inferInsert>) {
  await checkAuth();
  try {
    await db.update(courses).set(data).where(eq(courses.id, id));
    revalidatePath('/');
    revalidatePath('/dashboard/courses');
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
  try {
    // Insert into enquiries table
    const [enquiry] = await db.insert(enquiries).values(data).returning();
    
    // If a specific program is selected, also create a booking entry
    if (data.program && data.program !== 'Not sure — I need guidance') {
      await db.insert(bookings).values({
        name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        phone: data.phone,
        course: data.program,
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
  try {
    const courseName = `${data.course} (${data.type})`;
    
    await db.insert(bookings).values({
      name: data.name,
      email: data.email,
      phone: data.phone,
      dob: data.dob,
      gender: data.gender,
      country: data.country,
      maritalStatus: data.maritalStatus,
      course: courseName,
      amount: data.amount,
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
  const allEnquiries = await db.select().from(enquiries);
  const allTestimonials = await db.select().from(testimonials);
  const allCourses = await db.select().from(courses);
  const allBookings = await db.select().from(bookings);
  
  return {
    totalEnquiries: allEnquiries.length,
    newEnquiries: allEnquiries.filter(e => e.status === 'new').length,
    totalCourses: allCourses.length,
    pendingBookings: allBookings.filter(b => b.status === 'new').length,
    totalTestimonials: allTestimonials.length,
  };
}
