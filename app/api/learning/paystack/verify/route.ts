import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { enrollments, users, bookings } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
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

    if (!paystackData.status || paystackData.data.status !== 'success') {
      return NextResponse.json({ error: 'Failed to verify transaction' }, { status: 400 });
    }

    const transaction = paystackData.data;
    const metadata = transaction.metadata;
    const enrollmentId = metadata?.enrollmentId;
    const bookingId = metadata?.bookingId;

    if (enrollmentId) {
      const id = Number(enrollmentId);
      
      // Update enrollment in DB to active
      await db.update(enrollments)
        .set({
          status: 'active', 
          paymentReference: reference,
        })
        .where(eq(enrollments.id, id));

      if (bookingId) {
        await db.update(bookings)
          .set({
            status: 'paid',
            paymentStatus: 'paid',
            paymentReference: reference,
            paymentTimestamp: new Date()
          })
          .where(eq(bookings.id, Number(bookingId)));
      }
        
      // Fetch user to generate token
      const enrollmentRecord = await db.select().from(enrollments).where(eq(enrollments.id, id)).limit(1);
      const userRecord = await db.select().from(users).where(eq(users.id, enrollmentRecord[0].userId)).limit(1);

      // Generate secure login token (Magic Link approach)
      const token = jwt.sign(
        { userId: userRecord[0].id, email: userRecord[0].email, role: userRecord[0].role },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '30d' }
      );

      // Generate login link
      const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.lovevibestudio.com'}/learning/login`;
      
      // Setup Nodemailer transporter
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        try {
          const smtpPort = Number(process.env.SMTP_PORT) || 465;
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: smtpPort,
            secure: smtpPort === 465, // true for 465, false for other ports (like 587 for STARTTLS)
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
          });

          const mailOptions = {
            from: `"Love Vibe Studios" <${process.env.SMTP_USER}>`,
            to: userRecord[0].email,
            subject: 'Welcome to Love Vibe Studios Learning Platform!',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #7b3fa0; text-align: center;">Welcome to Your Course!</h2>
                <p>Hello ${userRecord[0].name},</p>
                <p>Thank you for enrolling in our self-paced program. Your payment was successful and your student account has been activated.</p>
                <div style="background-color: #f9f3fc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #333;">Your Login Credentials</h3>
                  <p><strong>Email:</strong> ${userRecord[0].email}</p>
                  ${metadata.tempPassword ? `<p><strong>Temporary Password:</strong> ${metadata.tempPassword}</p>` : '<p><strong>Password:</strong> The password you created.</p>'}
                </div>
                <p style="text-align: center; margin: 30px 0;">
                  <a href="${loginUrl}" style="background-color: #d4af37; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Login to Learning Dashboard</a>
                </p>
                <p>If you have any questions, please contact our support team.</p>
                <p>Best regards,<br>Love Vibe Studios Team</p>
              </div>
            `,
          };

          await transporter.sendMail(mailOptions);
          console.log('Welcome email sent to', userRecord[0].email);
        } catch (mailError) {
          console.error('Error sending welcome email:', mailError);
        }
      } else {
        console.warn('SMTP credentials not provided. Welcome email skipped.');
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Payment verified, account activated',
        token,
        tempPassword: metadata.tempPassword || null
      });
    }

    return NextResponse.json({ success: false, message: 'Missing enrollment ID' });
  } catch (error) {
    console.error('Error in LMS verify:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
