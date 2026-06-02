/**
 * GET /api/admin/recordings/webhook-events
 *
 * Returns recent webhook_events for the admin monitoring dashboard.
 * Auth: x-admin-secret header
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { webhookEvents } from '@/lib/schema';
import { desc } from 'drizzle-orm';

export async function GET(_req: NextRequest) {
  const jar = await cookies();
  if (jar.get('dashboard_auth')?.value !== 'authenticated') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const events = await db
      .select({
        id:          webhookEvents.id,
        zoomEventId: webhookEvents.zoomEventId,
        eventType:   webhookEvents.eventType,
        status:      webhookEvents.status,
        retryCount:  webhookEvents.retryCount,
        lastError:   webhookEvents.lastError,
        processedAt: webhookEvents.processedAt,
        createdAt:   webhookEvents.createdAt,
      })
      .from(webhookEvents)
      .orderBy(desc(webhookEvents.createdAt))
      .limit(100);

    return NextResponse.json({ success: true, events, total: events.length });
  } catch (error) {
    console.error('[Webhook Events] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
