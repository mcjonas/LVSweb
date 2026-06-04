import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { bookings, Booking } from '@/lib/schema';
import { eq, desc, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { escHtml } from '@/lib/email-utils';

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

      let metadata = event.data.metadata;
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata);
        } catch (e) {
          console.error('Failed to parse webhook metadata string:', metadata);
        }
      }
      
      const bookingId = metadata?.bookingId;
      
      let booking;
      if (bookingId) {
        const id = Number(bookingId);
        const matchingBookings = await db
          .select()
          .from(bookings)
          .where(eq(bookings.id, id));
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
        if (booking.paymentStatus === 'paid') {
          console.log(`[Webhook] Booking ${booking.id} is already marked as paid. Skipping email dispatch.`);
          return NextResponse.json({ status: 'success' });
        }

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

        // Set reference on object for email content
        booking.paymentReference = reference;

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
  // Try to use SMTP credentials (App Password) first, then fallback to EMAIL credentials
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 465;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (!user || !pass) {
    console.warn('SMTP or EMAIL credentials are not set in environment variables. Skipping email confirmation.');
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  const cleanCourseName = (booking.course || '').replace(/\s*\(.*?\)\s*$/, '').trim();
  const isSpecialBooking = [
    'Walk-In Session',
    'Telephone Session',
    'Online WhatsApp Call',
    'Virtual Audio Session',
    'Virtual Video Session'
  ].some(term => cleanCourseName.includes(term));

  const formattedDate = booking.bookingDate 
    ? new Date(booking.bookingDate).toLocaleDateString('en-US', { 
        timeZone: 'UTC',
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : '';

  const subject = isSpecialBooking 
    ? "Booking Confirmed! – Love Vibe Studio 💛" 
    : 'Course Enrollment Confirmation - Love Vibe Studios';

  const amountStr = (booking.amount || 0).toLocaleString();

  const html = isSpecialBooking
    ? `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #2D1B4E;">
        <h2 style="color: #7B3FA0; text-align: center;">Booking Confirmed! 🎉</h2>
        <p>Hello ${escHtml(booking.name)},</p>
        <p>Your payment has been successfully verified, and your booking is now locked in!</p>
        
        <div style="background-color: #faf8ff; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px dashed #7b3fa0;">
          <p style="margin: 5px 0;">📌 <strong>Service:</strong> ${escHtml(booking.course)}</p>
          <p style="margin: 5px 0;">📅 <strong>Date:</strong> ${escHtml(formattedDate)}</p>
          <p style="margin: 5px 0;">⏰ <strong>Time:</strong> ${escHtml(booking.bookingTime)}</p>
          <p style="margin: 5px 0;">💰 <strong>Amount Paid:</strong> GHS ${escHtml(amountStr)}</p>
        </div>

        <p>We look forward to meeting you! Our team will contact you shortly with the next steps or coordinates for your session.</p>
        <p>If you have any questions, feel free to reach us at +233 503 915 160.</p>
        <br/>
        <p>With love,</p>
        <p><strong>Love Vibe Studio 💛</strong></p>
        <p>Adenta, Accra</p>
      </div>
    `
    : `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #2D1B4E;">
        <h2 style="color: #7B3FA0;">Payment Successful!</h2>
        <p>Hello ${escHtml(booking.name)},</p>
        <p>Thank you for enrolling in <strong>${escHtml(booking.course)}</strong>.</p>
        <p>We have successfully received your payment of <strong>GHS ${escHtml(amountStr)}</strong>. Your enrollment is now confirmed.</p>
        <p>Our team will contact you shortly with the next steps.</p>
        <br/>
        <p>Best regards,</p>
        <p>Love Vibe Studios Team</p>
      </div>
    `;

  // Send confirmation email to customer
  await transporter.sendMail({
    from: `"Love Vibe Studio" <${user}>`,
    to: booking.email,
    subject,
    html,
  });
  console.log('[Webhook] Confirmation email sent to client:', booking.email);

  // Send Notification Email to the Studio (Admin)
  const adminEmailHtml = isSpecialBooking
    ? `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; color: #2D1B4E;">
        <h2 style="color: #7b3fa0; text-align: center; border-bottom: 2px solid #7b3fa0; padding-bottom: 10px;">New Private Session Booking! 🎉</h2>
        <p>Hello Love Vibe Studio Admin,</p>
        <p>A new special booking payment has been successfully processed and verified. Below are the booking details:</p>
        
        <h3 style="color: #7b3fa0; margin-top: 20px;">👤 Customer Info</h3>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #7b3fa0;">
          <p style="margin: 5px 0;"><strong>Name:</strong> ${escHtml(booking.name)}</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${escHtml(booking.email)}</p>
          <p style="margin: 5px 0;"><strong>WhatsApp/Phone:</strong> ${escHtml(booking.phone || 'N/A')}</p>
          <p style="margin: 5px 0;"><strong>D.O.B:</strong> ${escHtml(booking.dob || 'N/A')}</p>
          <p style="margin: 5px 0;"><strong>Gender:</strong> ${escHtml(booking.gender || 'N/A')}</p>
          <p style="margin: 5px 0;"><strong>Country:</strong> ${escHtml(booking.country || 'N/A')}</p>
          <p style="margin: 5px 0;"><strong>Marital Status:</strong> ${escHtml(booking.maritalStatus || 'N/A')}</p>
        </div>

        <h3 style="color: #7b3fa0; margin-top: 20px;">📅 Booking Details</h3>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #7b3fa0;">
          <p style="margin: 5px 0;"><strong>Service:</strong> ${escHtml(booking.course)}</p>
          <p style="margin: 5px 0;"><strong>Date:</strong> ${escHtml(formattedDate)}</p>
          <p style="margin: 5px 0;"><strong>Time Slot:</strong> ${escHtml(booking.bookingTime || 'N/A')}</p>
          <p style="margin: 5px 0;"><strong>Special Notes:</strong> ${escHtml(booking.notes || 'None')}</p>
        </div>

        <h3 style="color: #7b3fa0; margin-top: 20px;">💰 Payment Details</h3>
        <div style="background-color: #faf8ff; padding: 15px; border-radius: 8px; border: 1px dashed #7b3fa0;">
          <p style="margin: 5px 0;"><strong>Amount Paid:</strong> GHS ${escHtml(amountStr)}</p>
          <p style="margin: 5px 0;"><strong>Paystack Reference:</strong> ${escHtml(booking.paymentReference || 'N/A')}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> Confirmed & Paid</p>
        </div>

        <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;" />
        <p style="font-size: 0.9rem; color: #666; text-align: center;">This is an automated notification from your LVS Booking System.</p>
      </div>
    `
    : `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; color: #2D1B4E;">
        <h2 style="color: #7b3fa0; text-align: center; border-bottom: 2px solid #7b3fa0; padding-bottom: 10px;">New Course Enrollment! 🎓</h2>
        <p>Hello Love Vibe Studio Admin,</p>
        <p>A new student has successfully enrolled in a course. Below are the details:</p>
        
        <h3 style="color: #7b3fa0; margin-top: 20px;">👤 Student Info</h3>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #7b3fa0;">
          <p style="margin: 5px 0;"><strong>Name:</strong> ${escHtml(booking.name)}</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${escHtml(booking.email)}</p>
          <p style="margin: 5px 0;"><strong>WhatsApp/Phone:</strong> ${escHtml(booking.phone || 'N/A')}</p>
          <p style="margin: 5px 0;"><strong>D.O.B:</strong> ${escHtml(booking.dob || 'N/A')}</p>
          <p style="margin: 5px 0;"><strong>Gender:</strong> ${escHtml(booking.gender || 'N/A')}</p>
          <p style="margin: 5px 0;"><strong>Country:</strong> ${escHtml(booking.country || 'N/A')}</p>
          <p style="margin: 5px 0;"><strong>Marital Status:</strong> ${escHtml(booking.maritalStatus || 'N/A')}</p>
        </div>

        <h3 style="color: #7b3fa0; margin-top: 20px;">📚 Course Details</h3>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #7b3fa0;">
          <p style="margin: 5px 0;"><strong>Course:</strong> ${escHtml(booking.course)}</p>
        </div>

        <h3 style="color: #7b3fa0; margin-top: 20px;">💰 Payment Details</h3>
        <div style="background-color: #faf8ff; padding: 15px; border-radius: 8px; border: 1px dashed #7b3fa0;">
          <p style="margin: 5px 0;"><strong>Amount Paid:</strong> GHS ${escHtml(amountStr)}</p>
          <p style="margin: 5px 0;"><strong>Paystack Reference:</strong> ${escHtml(booking.paymentReference || 'N/A')}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> Confirmed & Paid</p>
        </div>

        <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;" />
        <p style="font-size: 0.9rem; color: #666; text-align: center;">This is an automated notification from your LVS Learning System.</p>
      </div>
    `;

  await transporter.sendMail({
    from: `"Love Vibe Studio Notification" <${user}>`,
    to: 'lovevibestudio726@gmail.com',
    subject: isSpecialBooking
      ? `[New Special Booking] GHS ${amountStr} - ${booking.name}`
      : `[New Course Enrollment] GHS ${amountStr} - ${booking.name}`,
    html: adminEmailHtml,
  });
  console.log('[Webhook] Admin notification email sent successfully');
}
