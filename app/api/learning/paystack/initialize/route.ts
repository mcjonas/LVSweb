import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { enrollments, users, bookings } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, dob, gender, country, maritalStatus, course, type, amount } = body;

    if (!name || !email || !course || !amount || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

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
      // Create user with a random temporary password (they will get a magic link or can reset it)
      tempPassword = crypto.randomBytes(4).toString('hex'); // shorter, e.g., 'a1b2c3d4'
      
      const newUser = await db.insert(users).values({
        name,
        email,
        passwordHash: tempPassword, // In a real app, hash this with bcrypt
        role: 'student',
      }).returning();
      userId = newUser[0].id;
    } else {
      userId = userRecord[0].id;
      // If user exists, they already have a password. We'll let verify know by passing a flag or empty string
    }

    // 2. Create pending enrollment
    // Note: Since we don't have course IDs easily mapped from strings right now, we'll just save courseId=0 for now and store the string in a metadata field, or we should map the course.
    // Let's just use 1 as a placeholder courseId until we have real dynamic courses in the DB
    const newEnrollment = await db.insert(enrollments).values({
      userId,
      courseId: 1, 
      status: 'pending',
    }).returning();

    // 3. Initialize Paystack payment
    const paystackAmount = amount * 100; // pesewas
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/learning/verify`;

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
          type: 'learning_platform',
          course,
          tempPassword
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
