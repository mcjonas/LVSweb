import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { videos } from '@/lib/schema';
import { revalidatePath } from 'next/cache';

export async function POST(req: NextRequest) {
  try {
    const { title, cloudinaryPublicId, zoomId, downloadUrl } = await req.json();

    if (!title || (!cloudinaryPublicId && !zoomId)) {
      return NextResponse.json({ error: 'Title and either Cloudinary ID or Zoom ID are required' }, { status: 400 });
    }

    // Save to Database
    await db.insert(videos).values({
      title,
      cloudinaryPublicId,
      zoomId,
      downloadUrl
    });

    revalidatePath('/dashboard/videos');

    return NextResponse.json({ success: true, message: 'Video saved successfully' });
  } catch (error) {
    console.error('Error saving video:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
