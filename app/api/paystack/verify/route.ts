import jwt from 'jsonwebtoken';
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
    console.log('Paystack Transaction Metadata:', transaction.metadata);

    // Check if payment was successful
    if (transaction.status === 'success') {
      let metadata = transaction.metadata;
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata);
        } catch (e) {
          console.error('Failed to parse metadata string:', metadata);
        }
      }
      
      const bookingId = metadata?.bookingId;

      if (bookingId) {
        const id = Number(bookingId);
        // Update booking in DB
        await db.update(bookings)
          .set({
            paymentStatus: 'paid',
            status: 'paid', 
            paymentReference: reference,
            paymentTimestamp: new Date(transaction.paid_at || Date.now())
          })
          .where(eq(bookings.id, id));
          
        // Generate an access token for videos
        const videoToken = jwt.sign(
          { bookingId: id, email: transaction.customer?.email },
          process.env.JWT_SECRET || 'fallback_secret',
          { expiresIn: '30d' } // 30 days access
        );

        revalidatePath('/dashboard/bookings');
        return NextResponse.json({ 
          success: true, 
          message: 'Payment verified and database updated',
          videoToken 
        });
      } else {
        console.error('No bookingId found in transaction metadata');
        return NextResponse.json({ success: false, message: 'Payment verified but booking ID missing' });
      }
    }

    return NextResponse.json({ success: false, message: `Payment status: ${transaction.status}`, data: transaction.status });
  } catch (error) {
    console.error('Error in /api/paystack/verify:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
