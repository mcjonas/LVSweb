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

    // ── Resolve courseId from title ──
    const courseRecord = await db
      .select()
      .from(courses)
      .where(ilike(courses.title, `%${course}%`))
      .limit(1);

    let courseId: number;
    if (courseRecord.length > 0) {
      courseId = courseRecord[0].id;
    } else {
      const allCourses = await db.select().from(courses).limit(1);
      if (allCourses.length > 0) {
        courseId = allCourses[0].id;
        console.warn(`[LMS Init] No exact course match for "${course}", defaulting to: ${allCourses[0].title}`);
      } else {
        courseId = 1;
        console.warn('[LMS Init] No courses found in DB, using fallback courseId=1');
      }
    }

    const courseName = `${course} (${type || 'Single'})`;

    // ── 1. Create booking record ──
    const [newBooking] = await db
      .insert(bookings)
      .values({
        name, email, phone, dob, gender, country, maritalStatus,
        course: courseName,
        amount,
        status: 'pending',
        paymentStatus: 'pending',
      })
      .returning({ id: bookings.id });

    // ── 2. User upsert + password generation ──
    const userRecord = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    let userId: number;
    let tempPassword: string | null = null;

    if (userRecord.length === 0) {
      // New user — create with hashed generated password
      tempPassword = crypto.randomBytes(4).toString('hex'); // e.g. "a1b2c3d4"
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      const [newUser] = await db
        .insert(users)
        .values({ name, email, passwordHash: hashedPassword, role: 'student' })
        .returning({ id: users.id });
      userId = newUser.id;
      console.log(`[LMS Init] Created new student user: ${email}`);
    } else {
      // Existing user — do not update password
      userId = userRecord[0].id;
      console.log(`[LMS Init] Existing student: ${email} (password kept)`);
    }

    // ── 3. Create pending enrollment ──
    const [newEnrollment] = await db
      .insert(enrollments)
      .values({
        userId,
        courseId,
        status: 'pending',
        createdAt: new Date(),
      })
      .returning({ id: enrollments.id });

    // ── 4. Initialise Paystack transaction ──
    const paystackAmount = amount * 100; // pesewas / kobo

    const requestUrl = new URL(req.url);
    const baseUrl = requestUrl.origin;

    const callbackUrl = `${baseUrl}/learning/verify`;

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: paystackAmount,
        callback_url: callbackUrl,
        metadata: {
          enrollmentId: newEnrollment.id,
          bookingId: newBooking.id,
          courseId,
          type: 'learning_platform',
          course,
          tempPassword, // null for existing users, generated password for new users
        },
      }),
    });

    const paystackData = await paystackRes.json();

    if (!paystackData.status) {
      console.error('[LMS Init] Paystack initialisation failed:', paystackData);
      return NextResponse.json({ error: 'Payment gateway error' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      authorization_url: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
    });

  } catch (error) {
    console.error('[LMS Init] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
