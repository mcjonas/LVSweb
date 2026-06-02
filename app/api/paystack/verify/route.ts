import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { bookings, users, enrollments, courses } from '@/lib/schema';
import { eq, ilike, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const reference = searchParams.get('reference');

    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
    }

    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
      }
    });

    const paystackData = await paystackRes.json();

    if (!paystackData.status) {
      return NextResponse.json({ error: 'Failed to verify transaction' }, { status: 400 });
    }

    const transaction = paystackData.data;
    console.log('[Verify API] Paystack Transaction Metadata:', transaction.metadata);

    // Check if payment was successful
    if (transaction.status === 'success') {
      let metadata = transaction.metadata;
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata);
        } catch (e) {
          console.error('[Verify API] Failed to parse metadata string:', metadata);
        }
      }
      
      const bookingId = metadata?.bookingId;

      if (bookingId) {
        const id = Number(bookingId);
        
        // 1. Fetch booking record
        const [bookingRecord] = await db
          .select()
          .from(bookings)
          .where(eq(bookings.id, id))
          .limit(1);

        if (!bookingRecord) {
          console.error(`[Verify API] Booking record ${id} not found`);
          return NextResponse.json({ success: false, message: 'Booking record not found' });
        }

        // 2. Update booking in DB
        await db.update(bookings)
          .set({
            paymentStatus: 'paid',
            status: 'paid', 
            paymentReference: reference,
            paymentTimestamp: new Date(transaction.paid_at || Date.now())
          })
          .where(eq(bookings.id, id));

        // 3. Resolve courseId from the booked course title (e.g. "Pre-Marital Counselling (Single)" -> "Pre-Marital Counselling")
        const rawCourseTitle = bookingRecord.course || '';
        const cleanCourseName = rawCourseTitle.replace(/\s*\(.*?\)\s*$/, '').trim();
        
        const isSpecialBooking = [
          'Walk-In Session',
          'Telephone Session',
          'Online WhatsApp Call',
          'Virtual Audio Session',
          'Virtual Video Session'
        ].some(term => cleanCourseName.includes(term));

        let courseId: number | null = null;
        if (!isSpecialBooking) {
          const courseRecord = await db
            .select()
            .from(courses)
            .where(ilike(courses.title, `%${cleanCourseName}%`))
            .limit(1);

          if (courseRecord.length > 0) {
            courseId = courseRecord[0].id;
          } else {
            const allCourses = await db.select().from(courses).limit(1);
            courseId = allCourses.length > 0 ? allCourses[0].id : 1;
          }
        }

        // 4. Student account upsert & password generation
        const userRecord = await db
          .select()
          .from(users)
          .where(eq(users.email, bookingRecord.email))
          .limit(1);

        let userId: number;
        let finalTempPassword: string | null = null;

        if (userRecord.length === 0) {
          // New user — create with hashed generated password
          const tempPassword = crypto.randomBytes(4).toString('hex'); // e.g. "a1b2c3d4"
          const hashedPassword = await bcrypt.hash(tempPassword, 10);
          const [newUser] = await db
            .insert(users)
            .values({ 
              name: bookingRecord.name, 
              email: bookingRecord.email, 
              passwordHash: hashedPassword, 
              role: 'student' 
            })
            .returning({ id: users.id });
          userId = newUser.id;
          finalTempPassword = tempPassword;
          console.log(`[Verify API] Created new student user: ${bookingRecord.email}`);
        } else {
          // Existing user — do not change password
          userId = userRecord[0].id;
          console.log(`[Verify API] Existing student user: ${bookingRecord.email} (password kept)`);
        }

        // Fetch full user record to be safe
        const [fullUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

        // 5. Create or activate enrollment record
        if (!isSpecialBooking && courseId) {
          const existingEnrollment = await db
            .select()
            .from(enrollments)
            .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)))
            .limit(1);

          if (existingEnrollment.length === 0) {
            await db.insert(enrollments).values({
              userId,
              courseId,
              status: 'active',
              paymentReference: reference,
              createdAt: new Date()
            });
            console.log(`[Verify API] Enrolled user ${userId} in course ${courseId}`);
          } else {
            await db.update(enrollments)
              .set({ status: 'active', paymentReference: reference })
              .where(eq(enrollments.id, existingEnrollment[0].id));
            console.log(`[Verify API] Activated existing enrollment for user ${userId} in course ${courseId}`);
          }
        } else {
          console.log(`[Verify API] Skipping enrollment for special booking session: "${cleanCourseName}"`);
        }

        // 6. Generate JWT for auto-login
        const token = jwt.sign(
          {
            userId: fullUser.id,
            email:  fullUser.email,
            name:   fullUser.name,
            role:   fullUser.role,
          },
          process.env.JWT_SECRET || 'fallback_secret',
          { expiresIn: '30d' }
        );

        // 7. Send welcome email (non-blocking)
        const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.lovevibestudio.com'}/learning/login`;
        if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
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

            const emailSubject = isSpecialBooking 
              ? "Booking Confirmed! – Love Vibe Studio 💛" 
              : "Welcome to Love Vibe Studios Learning Platform!";

            const formattedDate = bookingRecord.bookingDate 
              ? new Date(bookingRecord.bookingDate).toLocaleDateString(undefined, { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })
              : '';

            const emailHtml = isSpecialBooking
              ? `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                  <h2 style="color: #7b3fa0; text-align: center;">Booking Confirmed! 🎉</h2>
                  <p>Hello ${fullUser.name},</p>
                  <p>Your payment has been successfully verified, and your booking is now locked in!</p>
                  
                  <div style="background-color: #faf8ff; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px dashed #7b3fa0;">
                    <p style="margin: 5px 0;">📌 <strong>Service:</strong> ${bookingRecord.course}</p>
                    <p style="margin: 5px 0;">📅 <strong>Date:</strong> ${formattedDate}</p>
                    <p style="margin: 5px 0;">⏰ <strong>Time:</strong> ${bookingRecord.bookingTime}</p>
                  </div>

                  <p>We look forward to meeting you! Our team will contact you shortly with the next steps or coordinates for your session.</p>
                  <p>If you have any questions in the meantime, feel free to reach us at +233 503 915 160.</p>
                  
                  <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                  <p>With love,<br><strong>Love Vibe Studio 💛</strong><br>Adenta, Accra</p>
                </div>
              `
              : `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                  <h2 style="color: #7b3fa0; text-align: center;">Welcome to Your Course!</h2>
                  <p>Hello ${fullUser.name},</p>
                  <p>Thank you for enrolling in our self-paced programme. Your payment was successful and your student account has been activated.</p>
                  <div style="background-color: #f9f3fc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #333;">Your Login Credentials</h3>
                    <p><strong>Email:</strong> ${fullUser.email}</p>
                    ${finalTempPassword
                      ? `<p><strong>Your Password:</strong> <span style="font-size:1.2rem; font-weight:bold; color:#c62828; letter-spacing:2px;">${finalTempPassword}</span></p>
                         <p style="font-size:0.85rem; color:#666;">Please save this password — it should be used whenever you want to log in to learn at your self-paced learning.</p>`
                      : '<p><strong>Password:</strong> Use the password you set previously.</p>'}
                  </div>
                  <p style="text-align: center; margin: 30px 0;">
                    <a href="${loginUrl}"
                       style="background-color: #d4af37; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                      Login to Learning Dashboard
                    </a>
                  </p>
                  <p>If you have any questions please contact our support team.</p>
                  <p>Best regards,<br>Love Vibe Studios Team</p>
                </div>
              `;

            await transporter.sendMail({
              from:    `"Love Vibe Studio" <${process.env.SMTP_USER}>`,
              to:      fullUser.email,
              subject: emailSubject,
              html:    emailHtml,
            });
            console.log('[Verify API] Booking confirmation email sent to', fullUser.email);
          } catch (mailError) {
            console.error('[Verify API] Email send error:', mailError);
          }
        }

        revalidatePath('/dashboard/bookings');
        
        return NextResponse.json({ 
          success: true, 
          message: 'Payment verified and database updated',
          token,
          courseId,
          tempPassword: finalTempPassword,
          isSpecialBooking
        });
      } else {
        console.error('[Verify API] No bookingId found in transaction metadata');
        return NextResponse.json({ success: false, message: 'Payment verified but booking ID missing' });
      }
    }

    return NextResponse.json({ success: false, message: `Payment status: ${transaction.status}`, data: transaction.status });
  } catch (error) {
    console.error('Error in /api/paystack/verify:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
