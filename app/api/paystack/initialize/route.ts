import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { bookings, courses } from '@/lib/schema';
import { revalidatePath } from 'next/cache';
import { and, ilike, eq } from 'drizzle-orm';
import nodemailer from 'nodemailer';
import { escHtml } from '@/lib/email-utils';

// Booking type → price field mapping
type CourseType = 'Single' | 'Couple';
const PRICE_FIELDS: Record<CourseType, 'priceSingleGHS' | 'priceCoupleGHS'> = {
  Single: 'priceSingleGHS',
  Couple: 'priceCoupleGHS',
};

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { name, email, phone, dob, gender, country, maritalStatus, course, type, bookingDate, bookingTime, notes } = data;

    // Validate required fields (amount is no longer trusted from client)
    if (!name || !email || !phone || !course) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // ── P2: Server-side amount resolution ─────────────────────────────────────
    // For special session types (Walk-In, Online, Telephone etc.) the client
    // passes the amount directly because there is no course record in the DB.
    // For course bookings, fetch the authoritative price from the courses table.
    let serverAmount: number | undefined;

    const SPECIAL_SESSION_KEYWORDS = [
      'walk-in', 'telephone', 'whatsapp', 'audio', 'video session'
    ];
    const isSpecialSession = SPECIAL_SESSION_KEYWORDS.some(kw =>
      course.toLowerCase().includes(kw)
    );

    if (isSpecialSession) {
      // Special sessions: trust client amount (no course record)
      serverAmount = typeof data.amount === 'number' ? data.amount : undefined;
      if (!serverAmount || serverAmount <= 0) {
        return NextResponse.json({ error: 'Invalid amount for special session' }, { status: 400 });
      }
    } else {
      // Standard course: resolve price from DB
      const courseRecord = await db
        .select()
        .from(courses)
        .where(ilike(courses.title, `%${course}%`))
        .limit(1);

      if (courseRecord.length === 0) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }

      const c = courseRecord[0];
      const normalizedType = (type || 'Single') as CourseType;
      const priceField = PRICE_FIELDS[normalizedType] ?? 'priceSingleGHS';
      serverAmount = c[priceField] ?? undefined;

      if (!serverAmount || serverAmount <= 0) {
        // Fall back to client amount if course has no price configured yet
        console.warn(`[Initialize API] No ${priceField} set for "${c.title}", using client amount`);
        serverAmount = typeof data.amount === 'number' && data.amount > 0
          ? data.amount
          : undefined;
      }

      if (!serverAmount) {
        return NextResponse.json({ error: 'Course price not configured' }, { status: 400 });
      }
    }

    const amount = serverAmount;

    // Check double-booking for Walk-In sessions
    const isWalkIn = course.toLowerCase().includes('walk-in');
    if (isWalkIn && bookingDate && bookingTime) {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

      const existingWalkIn = await db
        .select()
        .from(bookings)
        .where(
          and(
            eq(bookings.bookingDate, bookingDate),
            eq(bookings.bookingTime, bookingTime),
            ilike(bookings.course, '%walk-in%')
          )
        );

      const isDoubleBooked = existingWalkIn.some(b => {
        const isPaidOrConfirmed = ['paid', 'success'].includes(b.paymentStatus || '') || ['paid', 'success', 'confirmed'].includes(b.status || '');
        const isRecentPending = b.status === 'pending' && b.createdAt && new Date(b.createdAt) > thirtyMinutesAgo;
        return isPaidOrConfirmed || isRecentPending;
      });

      if (isDoubleBooked) {
        return NextResponse.json({ error: 'This Walk-In slot has already been booked. Please choose a different slot.' }, { status: 400 });
      }
    }

    const courseName = type ? `${course} (${type})` : course;

    // Create booking record with status pending
    const [newBooking] = await db.insert(bookings).values({
      name,
      email,
      phone,
      dob: dob || null,
      gender: gender || null,
      country: country || null,
      maritalStatus: maritalStatus || null,
      course: courseName,
      amount,                         // server-resolved amount
      bookingDate: bookingDate || null,
      bookingTime: bookingTime || null,
      notes: notes || null,
      status: 'pending',
      paymentStatus: 'pending'
    }).returning({ id: bookings.id });

    // Revalidate the dashboard bookings page so it shows immediately
    revalidatePath('/dashboard/bookings');

    // Initialize Paystack payment
    const paystackAmount = amount * 100; // Paystack expects amount in pesewas/kobo
    const requestUrl = new URL(req.url);
    const baseUrl = requestUrl.origin;

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        amount: paystackAmount,
        callback_url: `${baseUrl}/payment-success`,
        metadata: {
          bookingId: newBooking.id,
          course: courseName
        }
      })
    });

    const paystackData = await paystackRes.json();

    if (!paystackData.status) {
      console.error('Paystack initialization failed:', paystackData);
      return NextResponse.json({ error: 'Failed to initialize payment' }, { status: 400 });
    }

    // ── P2: HTML-escaped email (prevents email HTML injection) ────────────────
    if (bookingDate && bookingTime && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        const smtpPort = Number(process.env.SMTP_PORT) || 465;
        const transporter = nodemailer.createTransport({
          host:   process.env.SMTP_HOST,
          port:   smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        const formattedDate = new Date(bookingDate).toLocaleDateString('en-US', {
          timeZone: 'UTC',
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        // Escape all user-supplied values before interpolation
        const safeName       = escHtml(name);
        const safeCourseName = escHtml(courseName);
        const safeDate       = escHtml(formattedDate);
        const safeTime       = escHtml(bookingTime);
        const safeAmount     = escHtml(amount.toLocaleString());

        await transporter.sendMail({
          from:    `"Love Vibe Studio" <${process.env.SMTP_USER}>`,
          to:      email,
          subject: "We've Received Your Booking Request – Love Vibe Studio 💛",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #7b3fa0; text-align: center;">We've Received Your Booking Request!</h2>
              <p>Hi ${safeName},</p>
              <p>Thank you for reaching out to Love Vibe Studio! 🌟</p>
              <p>We have received your booking request and payment submission for the following session:</p>

              <div style="background-color: #faf8ff; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px dashed #7b3fa0;">
                <p style="margin: 5px 0;">📌 <strong>Service:</strong> ${safeCourseName}</p>
                <p style="margin: 5px 0;">📅 <strong>Date:</strong> ${safeDate}</p>
                <p style="margin: 5px 0;">⏰ <strong>Time:</strong> ${safeTime}</p>
                <p style="margin: 5px 0;">💰 <strong>Amount:</strong> GHS ${safeAmount}</p>
              </div>

              <p>Your booking is currently <strong>PENDING</strong> confirmation while we verify your payment.</p>
              <p>You will receive a confirmation email from us shortly once your payment has been verified.</p>
              <p>If you have any questions in the meantime, feel free to reach us at +233 503 915 160.</p>

              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
              <p>With love,<br><strong>Love Vibe Studio 💛</strong><br>Adenta, Accra</p>
            </div>
          `,
        });
        console.log('[Initialize API] Pending confirmation email sent to', email);
      } catch (mailError) {
        console.error('[Initialize API] Email send error:', mailError);
      }
    }

    return NextResponse.json({
      authorization_url: paystackData.data.authorization_url,
      reference: paystackData.data.reference
    });
  } catch (error) {
    console.error('Error in /api/paystack/initialize:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
