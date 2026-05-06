import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { bookings, Booking } from '@/lib/schema';
import { eq, desc, and } from 'drizzle-orm';
import nodemailer from 'nodemailer';
import { revalidatePath } from 'next/cache';

export async function POST(req: Request) {
  try {
    const text = await req.text();
    const signature = req.headers.get('x-paystack-signature');
    const secret = process.env.PAYSTACK_SECRET_KEY || '';

    // Verify signature
    if (secret) {
      const hash = crypto.createHmac('sha512', secret).update(text).digest('hex');
      if (hash !== signature) {
        return NextResponse.json({ message: 'Invalid signature' }, { status: 400 });
      }
    }

    const event = JSON.parse(text);

    if (event.event === 'charge.success') {
      const email = event.data.customer?.email;
      const amount = event.data.amount / 100; // Paystack sends amounts in lowest denomination
      const reference = event.data.reference;

      if (!email) {
        return NextResponse.json({ message: 'No email found in event' }, { status: 400 });
      }

      const bookingId = event.data.metadata?.bookingId;
      
      let booking;
      if (bookingId) {
        const matchingBookings = await db
          .select()
          .from(bookings)
          .where(eq(bookings.id, bookingId));
        if (matchingBookings.length > 0) {
          booking = matchingBookings[0];
        }
      }

      if (!booking) {
        // Fallback: Find the most recent pending booking for this email
        const pendingBookings = await db
          .select()
          .from(bookings)
          .where(and(eq(bookings.email, email), eq(bookings.paymentStatus, 'pending')))
          .orderBy(desc(bookings.createdAt))
          .limit(1);

        if (pendingBookings.length > 0) {
          booking = pendingBookings[0];
        }
      }

      if (booking) {

        // Update database
        await db.update(bookings)
          .set({
            status: 'paid',
            paymentStatus: 'paid',
            paymentReference: reference,
            paymentTimestamp: new Date(),
          })
          .where(eq(bookings.id, booking.id));

        revalidatePath('/dashboard/bookings');

        // Send confirmation email
        await sendConfirmationEmail(booking);
      }
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

async function sendConfirmationEmail(booking: Booking) {
  // Make sure these are set in .env.local
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    console.warn('EMAIL_USER or EMAIL_PASS is not set in environment variables. Skipping email confirmation.');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
    },
  });

  const mailOptions = {
    from: `"Love Vibe Studios" <${user}>`,
    to: booking.email,
    cc: 'lovevibestudio726@gmail.com', // CC the studio
    subject: 'Course Enrollment Confirmation - Love Vibe Studios',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #2D1B4E;">
        <h2 style="color: #7B3FA0;">Payment Successful!</h2>
        <p>Dear ${booking.name},</p>
        <p>Thank you for enrolling in <strong>${booking.course}</strong>.</p>
        <p>We have successfully received your payment. Your enrollment is now confirmed.</p>
        <p>Our team will contact you shortly with the next steps.</p>
        <br/>
        <p>Best regards,</p>
        <p>Love Vibe Studios Team</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}
