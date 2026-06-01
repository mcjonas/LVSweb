import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { enrollments, users, bookings, courses } from '@/lib/schema';
import { eq, ilike } from 'drizzle-orm';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, dob, gender, country, maritalStatus, course, type, amount } = body;

    if (!name || !email || !course || !amount || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find the course by title to get the correct courseId
    const courseRecord = await db.select().from(courses).where(ilike(courses.title, `%${course}%`)).limit(1);
    const courseId = courseRecord.length > 0 ? courseRecord[0].id : 1; // fallback to 1

    const courseName = `${course} (${type || 'Single'})`;

    // 1. Create booking record
    const [newBooking] = await db.insert(bookings).values({
      name,
      email,
      phone,
      dob,
      gender,
      country,
      maritalStatus,
      course: courseName,
      amount,
      status: 'pending',
      paymentStatus: 'pending'
    }).returning({ id: bookings.id });

    // 2. Check if user exists or create pending user
    let userRecord = await db.select().from(users).where(eq(users.email, email)).limit(1);
    let userId;
    let tempPassword = '';

    if (userRecord.length === 0) {
      // Create user with a random temporary password
      tempPassword = crypto.randomBytes(4).toString('hex'); // e.g., 'a1b2c3d4'
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(tempPassword, salt);

      const newUser = await db.insert(users).values({
        name,
        email,
        passwordHash: hashedPassword,
        role: 'student',
      }).returning();
      userId = newUser[0].id;
    } else {
      userId = userRecord[0].id;
      // Note: We don't have the plaintext password for existing users.
      // If we need to send it again, we'd need a reset mechanism.
      // For now, we set tempPassword to empty for existing users.
      tempPassword = '';
    }

    // 3. Create pending enrollment with correct courseId
    const newEnrollment = await db.insert(enrollments).values({
      userId,
      courseId,
      status: 'pending',
      createdAt: new Date(),
    }).returning();

    // 4. Initialize Paystack payment
    const paystackAmount = amount * 100; // pesewas
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` :
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'));
    const callbackUrl = `${baseUrl}/learning/verify`;

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        amount: paystackAmount,
        callback_url: callbackUrl,
        metadata: {
          enrollmentId: newEnrollment[0].id,
          bookingId: newBooking.id,
          courseId,
          type: 'learning_platform',
          course,
          tempPassword // This is only populated for new users
        }
      })
    });

    const paystackData = await paystackRes.json();

    if (!paystackData.status) {
      console.error('Paystack initialization failed:', paystackData);
      return NextResponse.json({ error: 'Payment gateway error' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      authorization_url: paystackData.data.authorization_url,
      reference: paystackData.data.reference
    });

  } catch (error) {
    console.error('Error in LMS paystack init:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
