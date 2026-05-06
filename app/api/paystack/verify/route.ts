import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { bookings } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

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

    // Check if payment was successful
    if (transaction.status === 'success') {
      const bookingId = transaction.metadata?.bookingId;

      if (bookingId) {
        // Update booking in DB
        await db.update(bookings)
          .set({
            paymentStatus: 'success',
            status: 'paid', // Or whatever your business logic requires
            paymentReference: reference,
            paymentTimestamp: new Date(transaction.paid_at || Date.now())
          })
          .where(eq(bookings.id, bookingId));
          
        revalidatePath('/dashboard/bookings');
      }

      return NextResponse.json({ success: true, message: 'Payment verified successfully' });
    }

    return NextResponse.json({ success: false, message: 'Payment not successful', data: transaction.status });
  } catch (error) {
    console.error('Error in /api/paystack/verify:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
