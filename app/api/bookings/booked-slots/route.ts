import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { bookings } from '@/lib/schema';
import { and, or, eq, inArray, isNotNull } from 'drizzle-orm';

export async function GET() {
  try {
    const activeBookings = await db
      .select({
        bookingDate: bookings.bookingDate,
        bookingTime: bookings.bookingTime,
        course: bookings.course,
      })
      .from(bookings)
      .where(
        and(
          isNotNull(bookings.bookingDate),
          isNotNull(bookings.bookingTime),
          or(
            inArray(bookings.paymentStatus, ['paid', 'success']),
            inArray(bookings.status, ['paid', 'success', 'confirmed'])
          )
        )
      );

    return NextResponse.json(activeBookings);
  } catch (error) {
    console.error('Error fetching booked slots:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
