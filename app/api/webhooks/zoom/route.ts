import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { videos } from '@/lib/schema';
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
    
    // Construct message to verify signature
    const message = `v0:${timestamp}:${bodyText}`;
    const hashForVerify = crypto.createHmac('sha256', ZOOM_WEBHOOK_SECRET_TOKEN).update(message).digest('hex');
    const signatureToVerify = `v0=${hashForVerify}`;
    
    if (signatureToVerify !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(bodyText);

    // Zoom Endpoint Validation
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

    // Handle recording.completed event
    if (event.event === 'recording.completed') {
      const { payload } = event;
      const { object: recordingObj } = payload;
      const topic = recordingObj.topic || 'Zoom Recording';
      
      // Zoom recordings can have multiple files. We'll look for the MP4 video file.
      const videoFile = recordingObj.recording_files?.find(
        (file: any) => file.file_type === 'MP4'
      );

      if (videoFile && videoFile.download_url) {
        // Since Zoom download URLs might require auth, we usually need to append the access_token 
        // to the download URL: `${videoFile.download_url}?access_token=${ZOOM_DOWNLOAD_TOKEN}`
        // Or if it's a public recording, it might download directly.
        // For security, assuming we use a token or webhook download_token if provided:
        const downloadUrl = recordingObj.download_token 
          ? `${videoFile.download_url}?access_token=${recordingObj.download_token}` 
          : videoFile.download_url;
        
        console.log(`Starting upload to Cloudinary for: ${topic}`);
        // Note: For very large files, uploading within the request handler might timeout. 
        // In a production environment, you might want to send this to a background worker (e.g. Inngest/BullMQ).
        // Since we are using Next.js, eager_async in Cloudinary helps, but uploading the URL still takes time.
        const cloudinaryResult = await uploadVideoToCloudinary(downloadUrl, topic);

        // Save to Database
        await db.insert(videos).values({
          title: topic,
          cloudinaryPublicId: cloudinaryResult.public_id,
        });

        console.log(`Successfully saved video: ${topic}`);
      }
      
      return NextResponse.json({ status: 'success' });
    }

    return NextResponse.json({ status: 'ignored' });
  } catch (error) {
    console.error('Zoom webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
