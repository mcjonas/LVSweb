'use server';

import { db } from './db';
import { enquiries, testimonials, courses, bookings } from './schema';
import { desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

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
}) {
  try {
    await db.insert(courses).values(data);
    revalidatePath('/');
    revalidatePath('/dashboard/courses');
    return { success: true };
  } catch (error) {
    console.error('Failed to add course:', error);
    return { success: false };
  }
}

export async function updateCourse(id: number, data: Partial<typeof courses.$inferInsert>) {
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
  return db.select().from(enquiries).orderBy(desc(enquiries.createdAt));
}

export async function getTestimonials() {
  return db.select().from(testimonials).orderBy(desc(testimonials.createdAt));
}

export async function getTestimonialById(id: number) {
  const [testimonial] = await db.select().from(testimonials).where(eq(testimonials.id, id));
  return testimonial;
}

export async function addTestimonial(data: Partial<typeof testimonials.$inferInsert>) {
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
