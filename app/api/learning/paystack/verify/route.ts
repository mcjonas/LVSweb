import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { enrollments, users, bookings } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { escHtml } from '@/lib/email-utils';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const reference = searchParams.get('reference');

    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
    }

    // ── Verify transaction with Paystack ──
    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      },
    );

    const paystackData = await paystackRes.json();
    console.log('[LMS Verify] Paystack response status:', paystackData?.data?.status);

    if (!paystackData.status || paystackData.data?.status !== 'success') {
      const reason =
        paystackData.message ||
        paystackData.data?.gateway_response ||
        'Transaction not successful';
      console.error('[LMS Verify] Verification failed:', reason);
      return NextResponse.json(
        {
          error: 'Failed to verify transaction',
          message: `Payment verification failed: ${reason}`,
          paystackStatus: paystackData.data?.status || 'unknown',
        },
        { status: 400 },
      );
    }

    const transaction = paystackData.data;

    // ── P0 FIX: Parse metadata — Paystack sometimes returns it as a JSON string ──
    let metadata = transaction.metadata;
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
        console.log('[LMS Verify] Parsed metadata from string');
      } catch (e) {
        console.error('[LMS Verify] Failed to parse metadata string:', metadata);
        metadata = {};
      }
    }

    const enrollmentId = metadata?.enrollmentId;
    const bookingId    = metadata?.bookingId;
    const courseId     = metadata?.courseId;
    const tempPassword = metadata?.tempPassword || null; // plain-text, set during initialize

    if (!enrollmentId) {
      return NextResponse.json({ success: false, message: 'Missing enrollment ID in metadata' });
    }

    const id = Number(enrollmentId);

    // ── Activate enrollment ──
    await db
      .update(enrollments)
      .set({ status: 'active', paymentReference: reference })
      .where(eq(enrollments.id, id));

    // ── Update booking ──
    if (bookingId) {
      await db
        .update(bookings)
        .set({
          status: 'paid',
          paymentStatus: 'paid',
          paymentReference: reference,
          paymentTimestamp: new Date(transaction.paid_at || Date.now()),
        })
        .where(eq(bookings.id, Number(bookingId)));
    }

    // ── Fetch user for token + email ──
    const [enrollmentRecord] = await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.id, id))
      .limit(1);

    const [userRecord] = await db
      .select()
      .from(users)
      .where(eq(users.id, enrollmentRecord.userId))
      .limit(1);

    // ── Generate JWT for auto-login ──
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('[LMS Verify] JWT_SECRET environment variable is not configured');
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
    const token = jwt.sign(
      {
        userId: userRecord.id,
        email:  userRecord.email,
        name:   userRecord.name,
        role:   userRecord.role,
      },
      jwtSecret,
      { expiresIn: '7d' },
    );

    // ── Send welcome email (non-blocking) ──
    const loginUrl =
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.lovevibestudio.com'}/learning/login`;

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

        await transporter.sendMail({
          from:    `"Love Vibe Studios" <${process.env.SMTP_USER}>`,
          to:      userRecord.email,
          subject: 'Welcome to Love Vibe Studios Learning Platform!',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #7b3fa0; text-align: center;">Welcome to Your Course!</h2>
              <p>Hello ${escHtml(userRecord.name)},</p>
              <p>Thank you for enrolling in our self-paced programme. Your payment was successful and your student account has been activated.</p>
              <div style="background-color: #f9f3fc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #333;">Your Login Credentials</h3>
                <p><strong>Email:</strong> ${escHtml(userRecord.email)}</p>
                ${tempPassword
                  ? `<p><strong>Your Password:</strong> <span style="font-size:1.2rem; font-weight:bold; color:#c62828; letter-spacing:2px;">${escHtml(tempPassword)}</span></p>
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
          `,
        });

        console.log('[LMS Verify] Welcome email sent to', userRecord.email);
      } catch (mailError) {
        console.error('[LMS Verify] Email send error:', mailError);
      }
    } else {
      console.warn('[LMS Verify] SMTP credentials not set — welcome email skipped');
    }

    return NextResponse.json({
      success:      true,
      message:      'Payment verified, account activated',
      token,
      courseId:     courseId || enrollmentRecord.courseId,
      enrollmentId,
      tempPassword, // returned so verify page can display it to the student
    });

  } catch (error) {
    console.error('[LMS Verify] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
