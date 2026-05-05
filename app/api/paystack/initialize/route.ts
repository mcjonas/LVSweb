import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { bookings } from '@/lib/schema';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { name, email, phone, dob, gender, country, maritalStatus, course, type, amount } = data;

    // Validate inputs
    if (!name || !email || !phone || !course || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const courseName = `${course} (${type})`;
    
    // Create booking record with status pending
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

    // Initialize Paystack payment
    const paystackAmount = amount * 100; // Paystack expects amount in pesewas/kobo
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        amount: paystackAmount,
        callback_url: `${baseUrl}/enroll/verify`,
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

    return NextResponse.json({
      authorization_url: paystackData.data.authorization_url,
      reference: paystackData.data.reference
    });
  } catch (error) {
    console.error('Error in /api/paystack/initialize:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
