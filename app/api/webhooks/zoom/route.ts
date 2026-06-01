import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { videos, lessons, courses, modules } from '@/lib/schema';
import { eq, ilike } from 'drizzle-orm';
import { uploadVideoToCloudinary } from '@/lib/cloudinary';

const ZOOM_WEBHOOK_SECRET_TOKEN = process.env.ZOOM_WEBHOOK_SECRET_TOKEN || '';

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-zm-signature');
    const timestamp = req.headers.get('x-zm-request-timestamp');
    
    if (!signature || !timestamp) {
      return NextResponse.json({ error: 'Missing headers' }, { status: 401 });
    }

    const bodyText = await req.text();
    
    const message = `v0:${timestamp}:${bodyText}`;
    const hashForVerify = crypto.createHmac('sha256', ZOOM_WEBHOOK_SECRET_TOKEN).update(message).digest('hex');
    const signatureToVerify = `v0=${hashForVerify}`;
    
    if (signatureToVerify !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(bodyText);

    if (event.event === 'endpoint.url_validation') {
      const plainToken = event.payload.plainToken;
      const encryptedToken = crypto
        .createHmac('sha256', ZOOM_WEBHOOK_SECRET_TOKEN)
        .update(plainToken)
        .digest('hex');
      
      return NextResponse.json({
        plainToken: plainToken,
        encryptedToken: encryptedToken,
      });
    }

    if (event.event === 'recording.completed') {
      const { payload } = event;
      const { object: recordingObj } = payload;
      const topic = recordingObj.topic || 'Zoom Recording';
      const zoomId = recordingObj.id; // Zoom Meeting ID
      
      const videoFile = recordingObj.recording_files?.find(
        (file: any) => file.file_type === 'MP4'
      );

      if (videoFile && videoFile.download_url) {
        const downloadUrl = recordingObj.download_token 
          ? `${videoFile.download_url}?access_token=${recordingObj.download_token}` 
          : videoFile.download_url;

        // Step 1: Upload to Cloudinary for permanent storage
        // This ensures the video never expires for the student
        let cloudinaryPublicId = null;
        try {
          const uploadRes = await uploadVideoToCloudinary(downloadUrl, topic);
          cloudinaryPublicId = uploadRes.public_id;
          console.log(`Cloudinary upload successful for ${topic}: ${cloudinaryPublicId}`);
        } catch (uploadError) {
          console.error('Cloudinary auto-upload failed, falling back to Zoom URL:', uploadError);
        }

        // Strategy: Match topic to Course/Lesson
        // 1. Try to find a lesson with this title
        const matchingLessons = await db.select().from(lessons).where(ilike(lessons.title, `%${topic}%`)).limit(1);
        
        let lessonId = null;
        if (matchingLessons.length > 0) {
          lessonId = matchingLessons[0].id;
          
          // Link Zoom ID and Cloudinary ID to the lesson
          await db.update(lessons)
            .set({ 
              zoomId: zoomId.toString(),
              cloudinaryPublicId: cloudinaryPublicId
            })
            .where(eq(lessons.id, lessonId));
        }

        // 2. Save to general videos table for audit/backup
        await db.insert(videos).values({
          title: topic,
          zoomId: zoomId.toString(),
          downloadUrl: downloadUrl,
          cloudinaryPublicId: cloudinaryPublicId,
          lessonId: lessonId,
        });

        console.log(`Successfully processed Zoom recording: ${topic}`);
      }
      
      return NextResponse.json({ status: 'success' });
    }

    return NextResponse.json({ status: 'ignored' });
  } catch (error) {
    console.error('Zoom webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
