# Quick Start Guide: Zoom Recording Integration

**Phase**: 1 (Design)
**Created**: 2026-06-02
**For**: Developers implementing the Zoom recording feature

---

## Prerequisites

- Node.js 18+
- PostgreSQL 13+
- Zoom account with API credentials
- Cloudinary account (or alternative CDN)
- ngrok (for local webhook testing)

---

## 1. Environment Setup

### Step 1.1: Add Environment Variables

Create `.env.local` with Zoom and CDN credentials:

```bash
# Zoom API Credentials
ZOOM_CLIENT_ID=your_client_id_here
ZOOM_CLIENT_SECRET=your_client_secret_here
ZOOM_WEBHOOK_SECRET=your_webhook_signing_secret_here
ZOOM_ACCOUNT_ID=your_account_id_here

# Cloudinary (for CDN)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Database (existing)
DATABASE_URL=postgresql://...

# Feature Flags (optional)
RECORDING_SYNC_ENABLED=true
WEBHOOK_PROCESSING_ENABLED=true
```

### Step 1.2: Install Dependencies

```bash
npm install zoom-sdk cloudinary
```

(Both should be in `package.json` after schema updates)

---

## 2. Database Setup

### Step 2.1: Update Schema

Add new entities to `lib/schema.ts` (see `data-model.md`):

- `recordings` table
- `recording_access_logs` table
- `webhook_events` table
- Extend `courses` with `zoom_meeting_ids` array

### Step 2.2: Generate Migration

```bash
npm run db:generate
```

Review the generated migration file in `migrations/`:

```bash
ls -la drizzle/
```

### Step 2.3: Apply Migration

```bash
npm run db:push
```

Verify tables created:

```bash
npm run db:studio  # Open Drizzle Studio UI (optional)
```

---

## 3. Implementing Services

### Step 3.1: Webhook Handler (`lib/zoom/webhook-handler.ts`)

```typescript
import crypto from 'crypto';
import { db } from '@/lib/db';
import { webhookEvents } from '@/lib/schema';
import { v4 as uuid } from 'uuid';

export async function handleZoomWebhook(req: Request) {
  // 1. Verify signature
  const signature = req.headers.get('x-zm-signature');
  const timestamp = req.headers.get('x-zm-request-timestamp');
  
  if (!verifyZoomSignature(signature, timestamp, body)) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // 2. Parse payload
  const payload = await req.json();
  if (payload.event !== 'recording.completed') {
    return new Response('OK', { status: 200 }); // Ignore other events
  }
  
  // 3. Enqueue webhook event
  const correlationId = uuid();
  await db.insert(webhookEvents).values({
    zoomEventId: payload.object.id,
    eventType: 'recording.completed',
    payload: payload,
    status: 'pending',
    correlationId: correlationId,
  });
  
  console.log('Webhook enqueued', { correlationId });
  
  return Response.json({ status: 'queued', correlationId });
}

function verifyZoomSignature(signature: string, timestamp: string, body: string) {
  const secret = process.env.ZOOM_WEBHOOK_SECRET;
  const message = `v0:${timestamp}:${body}`;
  const hash = crypto.createHmac('sha256', secret).update(message).digest('hex');
  const expectedSignature = `v0=${hash}`;
  return signature === expectedSignature;
}
```

### Step 3.2: Recording Sync Job (`lib/zoom/webhook-processor.ts`)

```typescript
import { db } from '@/lib/db';
import { webhookEvents, recordings, courses } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

export async function processWebhookQueue() {
  const pendingEvents = await db
    .select()
    .from(webhookEvents)
    .where(and(
      eq(webhookEvents.status, 'pending'),
      // retry_count < 3 would go here
    ))
    .limit(10);
  
  for (const event of pendingEvents) {
    try {
      const { zoomMeetingId, zoomRecordingId, title, duration, thumbnail, downloadUrl } = extractMetadata(event.payload);
      
      // Find courses with this meeting ID
      const coursesWithMeeting = await db
        .select()
        .from(courses)
        .where(/* courses where zoom_meeting_ids contains zoomMeetingId */);
      
      if (!coursesWithMeeting.length) {
        throw new Error(`No courses for meeting ${zoomMeetingId}`);
      }
      
      // Insert recording for each course
      for (const course of coursesWithMeeting) {
        await db.insert(recordings).values({
          courseId: course.id,
          zoomRecordingId,
          zoomMeetingId,
          title,
          duration,
          thumbnailUrl: thumbnail,
          downloadUrl,
          synchronizedAt: new Date(),
        });
      }
      
      // Mark processed
      await db.update(webhookEvents)
        .set({ status: 'processed', processedAt: new Date() })
        .where(eq(webhookEvents.id, event.id));
      
      console.log('Webhook processed', { correlationId: event.correlationId });
    } catch (error) {
      console.error('Webhook processing failed', { error, correlationId: event.correlationId });
      // TODO: Retry logic here
    }
  }
}

function extractMetadata(payload: any) {
  const obj = payload.object;
  return {
    zoomMeetingId: obj.id,
    zoomRecordingId: obj.recording_files[0]?.id,
    title: obj.topic,
    duration: obj.duration * 60, // Convert minutes to seconds
    thumbnail: obj.thumbnail_url,
    downloadUrl: obj.recording_files[0]?.download_url,
  };
}
```

### Step 3.3: Access Control Service (`lib/recordings/access-control.ts`)

```typescript
import { db } from '@/lib/db';
import { enrollments, payments } from '@/lib/schema';
import { and, eq } from 'drizzle-orm';

export async function canAccessRecording(studentId: string, courseId: string) {
  // Check enrollment
  const enrollment = await db.query.enrollments.findFirst({
    where: and(
      eq(enrollments.studentId, studentId),
      eq(enrollments.courseId, courseId),
      eq(enrollments.status, 'enrolled'),
    ),
  });
  
  if (!enrollment) {
    return { allowed: false, reason: 'not_enrolled' };
  }
  
  // Check payment
  const payment = await db.query.payments.findFirst({
    where: and(
      eq(payments.enrollmentId, enrollment.id),
      eq(payments.status, 'paid'),
    ),
  });
  
  if (!payment) {
    return { allowed: false, reason: 'not_paid' };
  }
  
  return { allowed: true };
}
```

### Step 3.4: CDN Service (`lib/recordings/cdn.ts`)

```typescript
import { v2 as cloudinary } from 'cloudinary';

export async function generatePlayUrl(recordingDownloadUrl: string) {
  try {
    const signedUrl = cloudinary.url(recordingDownloadUrl, {
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + 900, // 15 minutes
      resource_type: 'video',
    });
    return signedUrl;
  } catch (error) {
    console.warn('CDN signing failed, using origin URL', { error });
    return recordingDownloadUrl; // Fallback
  }
}
```

---

## 4. API Endpoints

### Step 4.1: Webhook Receiver (`app/api/webhooks/zoom/route.ts`)

```typescript
import { handleZoomWebhook } from '@/lib/zoom/webhook-handler';

export async function POST(req: Request) {
  const body = await req.text();
  return handleZoomWebhook(new Request(req, { body }));
}
```

### Step 4.2: Recording List (`app/api/recordings/course/[courseId]/route.ts`)

```typescript
import { db } from '@/lib/db';
import { recordings } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { canAccessRecording } from '@/lib/recordings/access-control';
import { getSessionUserId } from '@/lib/auth-utils';

export async function GET(req: Request, { params }: any) {
  const studentId = getSessionUserId(req);
  const courseId = params.courseId;
  
  // Check access
  const access = await canAccessRecording(studentId, courseId);
  if (!access.allowed) {
    return Response.json(
      { status: 'error', message: 'Access denied', reason: access.reason },
      { status: 403 }
    );
  }
  
  // Fetch recordings
  const courseRecordings = await db
    .select()
    .from(recordings)
    .where(eq(recordings.courseId, courseId))
    .orderBy(desc(recordings.synchronizedAt));
  
  return Response.json({ recordings: courseRecordings });
}
```

### Step 4.3: Play-URL Endpoint (`app/api/recordings/[id]/play-url/route.ts`)

```typescript
import { generatePlayUrl } from '@/lib/recordings/cdn';
import { canAccessRecording } from '@/lib/recordings/access-control';

export async function GET(req: Request, { params }: any) {
  const studentId = getSessionUserId(req);
  const recordingId = params.id;
  
  // Fetch recording
  const recording = await db.query.recordings.findFirst({
    where: eq(recordings.id, recordingId),
  });
  
  if (!recording) {
    return Response.json(
      { status: 'error', message: 'Recording not found' },
      { status: 404 }
    );
  }
  
  // Check access
  const access = await canAccessRecording(studentId, recording.courseId);
  if (!access.allowed) {
    logAccessDenial(studentId, recordingId, access.reason);
    return Response.json(
      { status: 'error', message: 'Access denied', reason: access.reason },
      { status: 403 }
    );
  }
  
  // Generate signed URL
  const playUrl = await generatePlayUrl(recording.downloadUrl);
  logAccessSuccess(studentId, recordingId);
  
  return Response.json({ playUrl, expiresIn: 900 });
}
```

---

## 5. Frontend Integration

### Step 5.1: Update Course Page (`app/learning/course/[courseId]/page.tsx`)

```typescript
'use client';

import { useEffect, useState } from 'react';

export default function CoursePage({ params }: any) {
  const [recordings, setRecordings] = useState([]);
  
  useEffect(() => {
    async function fetchRecordings() {
      const res = await fetch(`/api/recordings/course/${params.courseId}`);
      const data = await res.json();
      setRecordings(data.recordings);
    }
    
    fetchRecordings();
  }, [params.courseId]);
  
  return (
    <div>
      <h1>Course Content</h1>
      <div>
        {recordings.map((rec) => (
          <div key={rec.id}>
            <h3>{rec.title}</h3>
            <img src={rec.thumbnailUrl} alt="Recording thumbnail" />
            <VideoPlayer recordingId={rec.id} />
          </div>
        ))}
      </div>
    </div>
  );
}

function VideoPlayer({ recordingId }: any) {
  const [playUrl, setPlayUrl] = useState('');
  
  const handlePlay = async () => {
    const res = await fetch(`/api/recordings/${recordingId}/play-url`);
    const data = await res.json();
    setPlayUrl(data.playUrl);
  };
  
  return (
    <>
      <button onClick={handlePlay}>Play</button>
      {playUrl && <video src={playUrl} controls width="100%" />}
    </>
  );
}
```

---

## 6. Local Testing with ngrok

### Step 6.1: Expose Local Server

```bash
npx ngrok http 3000
```

You'll see:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

### Step 6.2: Configure Zoom Webhook

1. Go to Zoom App Marketplace
2. Select your app
3. Set Webhook URL to: `https://abc123.ngrok.io/api/webhooks/zoom`
4. Save signing secret to `.env.local`

### Step 6.3: Test Webhook Locally

Use Zoom's webhook test tool or curl:

```bash
curl -X POST http://localhost:3000/api/webhooks/zoom \
  -H "x-zm-signature: v0=..." \
  -H "x-zm-request-timestamp: $(date +%s)" \
  -H "Content-Type: application/json" \
  -d @webhook-sample.json
```

---

## 7. Running the Webhook Processor

### Option 1: Scheduled Job (Next.js API Route)

```bash
# Call every 30 seconds via external scheduler
curl https://yourdomain.com/api/cron/process-webhooks
```

### Option 2: Background Worker

```typescript
// In lib/workers/webhook-processor.ts
setInterval(async () => {
  await processWebhookQueue();
}, 30 * 1000); // Every 30 seconds
```

---

## 8. Testing Checklist

- [ ] Database schema created (`npm run db:push`)
- [ ] Environment variables configured
- [ ] Webhook signature validation working
- [ ] Recordings sync on webhook
- [ ] Access control blocks non-enrolled students
- [ ] Play-URL returns signed CDN URL
- [ ] Access logging works
- [ ] ngrok tunnel receives webhooks
- [ ] E2E test: Payment → Redirect → View Recording

---

## 9. Debugging Tips

### Check Webhook Events

```bash
npm run db:studio
# Navigate to webhook_events table, filter by status='pending'
```

### View Logs

```bash
tail -f .next/server/logs/webhook-processor.log
```

### Test Access Control

```bash
curl http://localhost:3000/api/recordings/course/not-enrolled-course-id \
  -H "Authorization: Bearer your_jwt_token"
# Should return 403
```

---

## 10. Deployment Checklist

- [ ] All environment variables set in production
- [ ] Database migrations applied
- [ ] Webhook URL updated in Zoom dashboard (prod domain)
- [ ] CDN credentials configured
- [ ] Background job scheduled (webhook processor)
- [ ] Error alerting configured
- [ ] Audit logs exported (or log aggregation service)
- [ ] Rate limiting enabled
- [ ] Monitoring in place (SLO dashboards)

---

## Troubleshooting

**Webhook not received**: Check ngrok tunnel URL in Zoom app settings

**Invalid signature error**: Verify `ZOOM_WEBHOOK_SECRET` matches app settings

**Recording not syncing**: Check webhook_events table for status; see last_error

**Access denied to enrolled students**: Verify enrollments table has enrollment record with status='enrolled' and payment record with status='paid'

**CDN URL fails**: Falls back to origin URL; check Cloudinary credentials

---

For questions or blockers, see `plan.md` or create an issue in the repo.
