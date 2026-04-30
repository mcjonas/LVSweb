'use server';

import { db } from './db';
import { enquiries, testimonials } from './schema';
import { desc } from 'drizzle-orm';

export async function submitEnquiry(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  program?: string;
  message?: string;
}) {
  try {
    await db.insert(enquiries).values(data);
    return { success: true };
  } catch (error) {
    console.error('Failed to submit enquiry:', error);
    return { success: false, error: 'Failed to submit enquiry' };
  }
}

export async function getEnquiries() {
  return db.select().from(enquiries).orderBy(desc(enquiries.createdAt));
}

export async function getTestimonials() {
  return db.select().from(testimonials).orderBy(desc(testimonials.createdAt));
}

export async function getStats() {
  const allEnquiries = await db.select().from(enquiries);
  const allTestimonials = await db.select().from(testimonials);
  return {
    totalEnquiries: allEnquiries.length,
    newEnquiries: allEnquiries.filter(e => e.status === 'new').length,
    pendingTestimonials: allTestimonials.filter(t => t.status === 'pending').length,
    totalTestimonials: allTestimonials.length,
  };
}
