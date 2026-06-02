import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';
import { videos, bookings } from '@/lib/schema';
import { desc, eq, ilike } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    // Get token from auth header or query param
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1] || req.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;
      
      let allVideos: (typeof videos.$inferSelect)[] = [];
      
      // If it's a booking-based token (Normal Enrollment)
      if (decoded.bookingId) {
        const booking = await db.select().from(bookings).where(eq(bookings.id, decoded.bookingId)).limit(1);
        if (booking.length > 0 && booking[0].course) {
          // Extract the base course name (removing the "(Single)" or "(Couple)" suffix)
          const courseName = booking[0].course.split(' (')[0];
          allVideos = await db.select()
            .from(videos)
            .where(ilike(videos.title, `%${courseName}%`))
            .orderBy(desc(videos.createdAt));
        } else {
          allVideos = [];
        }
      } else {
        // LMS Student token - for this route we can return all or handle differently
        // But LMS usually uses /api/learning/course/...
        allVideos = await db.select().from(videos).orderBy(desc(videos.createdAt));
      }
      
      return NextResponse.json({ success: true, videos: allVideos });
    } catch (err) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or expired token' }, { status: 403 });
    }
  } catch (error) {
    console.error('Error fetching videos:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
