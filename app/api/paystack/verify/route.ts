import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { bookings, users, enrollments, courses } from '@/lib/schema';
import { eq, ilike, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { escHtml } from '@/lib/email-utils';

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

        const alreadyPaid = bookingRecord.paymentStatus === 'paid';

        // 2. Update booking in DB (only if not already paid)
        if (!alreadyPaid) {
          await db.update(bookings)
            .set({
              paymentStatus: 'paid',
              status: 'paid', 
              paymentReference: reference,
              paymentTimestamp: new Date(transaction.paid_at || Date.now())
            })
            .where(eq(bookings.id, id));
        }

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

        // 4. Student account upsert & password generation (always generate for enrollments)
        const userRecord = await db
          .select()
          .from(users)
          .where(ilike(users.email, bookingRecord.email))
          .limit(1);

        let userId: number;
        const tempPassword = crypto.randomBytes(4).toString('hex'); // e.g. "a1b2c3d4"
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        const finalTempPassword = tempPassword;

        if (userRecord.length === 0) {
          // New user — create with hashed generated password
          const [newUser] = await db
            .insert(users)
            .values({ 
              name: bookingRecord.name, 
              email: bookingRecord.email.toLowerCase().trim(), 
              passwordHash: hashedPassword, 
              role: 'student' 
            })
            .returning({ id: users.id });
          userId = newUser.id;
          console.log(`[Verify API] Created new student user: ${bookingRecord.email}`);
        } else {
          // Existing user — update password to the new temp password
          userId = userRecord[0].id;
          await db
            .update(users)
            .set({ passwordHash: hashedPassword })
            .where(eq(users.id, userId));
          console.log(`[Verify API] Updated password for existing student user: ${bookingRecord.email}`);
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
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          console.error('[Verify API] JWT_SECRET environment variable is not configured');
          return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
        const token = jwt.sign(
          {
            userId: fullUser.id,
            email:  fullUser.email,
            name:   fullUser.name,
            role:   fullUser.role,
          },
          jwtSecret,
          { expiresIn: '7d' }
        );

        // 7. Send welcome and notification emails (only if not already paid to prevent duplication)
        if (!alreadyPaid) {
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
                ? new Date(bookingRecord.bookingDate).toLocaleDateString('en-US', { 
                    timeZone: 'UTC',
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
                    <p>Hello ${escHtml(bookingRecord.name)},</p>
                    <p>Your payment has been successfully verified, and your booking is now locked in!</p>

                    <div style="background-color: #faf8ff; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px dashed #7b3fa0;">
                      <p style="margin: 5px 0;">📌 <strong>Service:</strong> ${escHtml(bookingRecord.course)}</p>
                      <p style="margin: 5px 0;">📅 <strong>Date:</strong> ${escHtml(formattedDate)}</p>
                      <p style="margin: 5px 0;">⏰ <strong>Time:</strong> ${escHtml(bookingRecord.bookingTime)}</p>
                      <p style="margin: 5px 0;">💰 <strong>Amount Paid:</strong> GHS ${escHtml((bookingRecord.amount || 0).toLocaleString())}</p>
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
                    <p>Hello ${escHtml(bookingRecord.name)},</p>
                    <p>Thank you for enrolling in our self-paced programme. Your payment was successful and your student account has been activated.</p>
                    <div style="background-color: #f9f3fc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                      <h3 style="margin-top: 0; color: #333;">Your Login Credentials</h3>
                      <p><strong>Email:</strong> ${escHtml(fullUser.email)}</p>
                      ${finalTempPassword
                        ? `<p><strong>Your Password:</strong> <span style="font-size:1.2rem; font-weight:bold; color:#c62828; letter-spacing:2px;">${escHtml(finalTempPassword)}</span></p>
                           <p style="font-size:0.85rem; color:#666;">Please save this password — it should be used whenever you want to log in to learn at your self-paced learning.</p>`
                        : '<p><strong>Password:</strong> Use the password you set previously.</p>'}
                    </div>
                    <p style="text-align: center; margin: 30px 0;">
                      <a href="${escHtml(loginUrl)}"
                         style="background-color: #d4af37; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                        Login to Learning Dashboard
                      </a>
                    </p>
                    <p>If you have any questions please contact our support team.</p>
                    <p>Best regards,<br>Love Vibe Studios Team</p>
                  </div>
                `;

              // Send email to customer
              await transporter.sendMail({
                from:    `"Love Vibe Studio" <${process.env.SMTP_USER}>`,
                to:      fullUser.email,
                subject: emailSubject,
                html:    emailHtml,
              });
              console.log('[Verify API] Booking confirmation email sent to', fullUser.email);

              // Send Notification Email to the Studio (Admin)
              const adminEmailHtml = isSpecialBooking
                ? `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; color: #2D1B4E;">
                    <h2 style="color: #7b3fa0; text-align: center; border-bottom: 2px solid #7b3fa0; padding-bottom: 10px;">New Private Session Booking! 🎉</h2>
                    <p>Hello Love Vibe Studio Admin,</p>
                    <p>A new special booking payment has been successfully processed and verified. Below are the booking details:</p>
                    
                    <h3 style="color: #7b3fa0; margin-top: 20px;">👤 Customer Info</h3>
                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #7b3fa0;">
                      <p style="margin: 5px 0;"><strong>Name:</strong> ${escHtml(bookingRecord.name)}</p>
                      <p style="margin: 5px 0;"><strong>Email:</strong> ${escHtml(bookingRecord.email)}</p>
                      <p style="margin: 5px 0;"><strong>WhatsApp/Phone:</strong> ${escHtml(bookingRecord.phone || 'N/A')}</p>
                      <p style="margin: 5px 0;"><strong>D.O.B:</strong> ${escHtml(bookingRecord.dob || 'N/A')}</p>
                      <p style="margin: 5px 0;"><strong>Gender:</strong> ${escHtml(bookingRecord.gender || 'N/A')}</p>
                      <p style="margin: 5px 0;"><strong>Country:</strong> ${escHtml(bookingRecord.country || 'N/A')}</p>
                      <p style="margin: 5px 0;"><strong>Marital Status:</strong> ${escHtml(bookingRecord.maritalStatus || 'N/A')}</p>
                    </div>

                    <h3 style="color: #7b3fa0; margin-top: 20px;">📅 Booking Details</h3>
                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #7b3fa0;">
                      <p style="margin: 5px 0;"><strong>Service:</strong> ${escHtml(bookingRecord.course)}</p>
                      <p style="margin: 5px 0;"><strong>Date:</strong> ${escHtml(formattedDate)}</p>
                      <p style="margin: 5px 0;"><strong>Time Slot:</strong> ${escHtml(bookingRecord.bookingTime || 'N/A')}</p>
                      <p style="margin: 5px 0;"><strong>Special Notes:</strong> ${escHtml(bookingRecord.notes || 'None')}</p>
                    </div>

                    <h3 style="color: #7b3fa0; margin-top: 20px;">💰 Payment Details</h3>
                    <div style="background-color: #faf8ff; padding: 15px; border-radius: 8px; border: 1px dashed #7b3fa0;">
                      <p style="margin: 5px 0;"><strong>Amount Paid:</strong> GHS ${escHtml((bookingRecord.amount || 0).toLocaleString())}</p>
                      <p style="margin: 5px 0;"><strong>Paystack Reference:</strong> ${escHtml(reference)}</p>
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
                      <p style="margin: 5px 0;"><strong>Name:</strong> ${escHtml(bookingRecord.name)}</p>
                      <p style="margin: 5px 0;"><strong>Email:</strong> ${escHtml(bookingRecord.email)}</p>
                      <p style="margin: 5px 0;"><strong>WhatsApp/Phone:</strong> ${escHtml(bookingRecord.phone || 'N/A')}</p>
                      <p style="margin: 5px 0;"><strong>D.O.B:</strong> ${escHtml(bookingRecord.dob || 'N/A')}</p>
                      <p style="margin: 5px 0;"><strong>Gender:</strong> ${escHtml(bookingRecord.gender || 'N/A')}</p>
                      <p style="margin: 5px 0;"><strong>Country:</strong> ${escHtml(bookingRecord.country || 'N/A')}</p>
                      <p style="margin: 5px 0;"><strong>Marital Status:</strong> ${escHtml(bookingRecord.maritalStatus || 'N/A')}</p>
                    </div>

                    <h3 style="color: #7b3fa0; margin-top: 20px;">📚 Course Details</h3>
                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #7b3fa0;">
                      <p style="margin: 5px 0;"><strong>Course:</strong> ${escHtml(bookingRecord.course)}</p>
                    </div>

                    <h3 style="color: #7b3fa0; margin-top: 20px;">💰 Payment Details</h3>
                    <div style="background-color: #faf8ff; padding: 15px; border-radius: 8px; border: 1px dashed #7b3fa0;">
                      <p style="margin: 5px 0;"><strong>Amount Paid:</strong> GHS ${escHtml((bookingRecord.amount || 0).toLocaleString())}</p>
                      <p style="margin: 5px 0;"><strong>Paystack Reference:</strong> ${escHtml(reference)}</p>
                      <p style="margin: 5px 0;"><strong>Status:</strong> Confirmed & Paid</p>
                    </div>

                    <hr style="border: 0; border-top: 1px solid #eee; margin: 25px 0;" />
                    <p style="font-size: 0.9rem; color: #666; text-align: center;">This is an automated notification from your LVS Learning System.</p>
                  </div>
                `;

              await transporter.sendMail({
                from:    `"Love Vibe Studio Notification" <${process.env.SMTP_USER}>`,
                to:      'lovevibestudio726@gmail.com',
                subject: isSpecialBooking
                  ? `[New Special Booking] GHS ${(bookingRecord.amount || 0).toLocaleString()} - ${bookingRecord.name}`
                  : `[New Course Enrollment] GHS ${(bookingRecord.amount || 0).toLocaleString()} - ${bookingRecord.name}`,
                html:    adminEmailHtml,
              });
              console.log('[Verify API] Admin notification email sent successfully');
            } catch (mailError) {
              console.error('[Verify API] Email send error:', mailError);
            }
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
