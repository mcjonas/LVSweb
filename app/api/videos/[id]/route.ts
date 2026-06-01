import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';
import { videos } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { getVideoUrl } from '@/lib/cloudinary';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1] || req.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      
      const videoRecord = await db.select().from(videos).where(eq(videos.id, Number(id))).limit(1);
      
      if (videoRecord.length === 0) {
        return NextResponse.json({ error: 'Video not found' }, { status: 404 });
      }

      let videoUrl = '';
      if (videoRecord[0].cloudinaryPublicId) {
        videoUrl = getVideoUrl(videoRecord[0].cloudinaryPublicId);
      } else if (videoRecord[0].downloadUrl) {
        videoUrl = videoRecord[0].downloadUrl;
      }
      
      return NextResponse.json({ 
        success: true, 
        url: videoUrl, 
        title: videoRecord[0].title,
        zoomId: videoRecord[0].zoomId 
      });
    } catch (err) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } catch (error) {
    console.error('Error fetching video URL:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
