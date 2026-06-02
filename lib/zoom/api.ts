/**
 * lib/zoom/api.ts
 *
 * P4 — Zoom API metadata enrichment.
 * Uses Zoom Server-to-Server OAuth to fetch authoritative recording metadata:
 * duration, host info, recording file details, topic.
 *
 * Required env vars (add to .env.local):
 *   ZOOM_ACCOUNT_ID      – from Zoom Marketplace app credentials
 *   ZOOM_CLIENT_ID       – from Zoom Marketplace app credentials
 *   ZOOM_CLIENT_SECRET   – from Zoom Marketplace app credentials
 */

export interface ZoomRecordingFile {
  id: string;
  meeting_id: string;
  recording_start: string;
  recording_end: string;
  file_type: string;
  file_size: number;
  play_url: string;
  download_url: string;
  status: string;
  recording_type: string;
}

export interface ZoomMeetingRecording {
  uuid: string;
  id: number;
  host_id: string;
  host_email: string;
  topic: string;
  type: number;
  start_time: string;
  timezone: string;
  duration: number; // minutes
  total_size: number;
  recording_count: number;
  recording_files: ZoomRecordingFile[];
}

/** In-memory token cache — avoids fetching a new token on every request */
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Fetches a Server-to-Server OAuth access token from Zoom.
 * Tokens are cached and reused until 60 seconds before expiry.
 */
export async function getZoomAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const accountId    = process.env.ZOOM_ACCOUNT_ID;
  const clientId     = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  if (!accountId || !clientId || !clientSecret) {
    throw new Error(
      '[Zoom API] Missing env vars: ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET. ' +
      'Add them to .env.local from your Zoom Marketplace Server-to-Server OAuth app.',
    );
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`[Zoom API] Token fetch failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  // Cache until 60s before expiry
  cachedToken = {
    token:     data.access_token,
    expiresAt: now + (data.expires_in - 60) * 1000,
  };

  return cachedToken.token;
}

/**
 * Fetches authoritative recording metadata for a given Zoom Meeting ID.
 * Returns null if not found (404) or on any API error.
 */
export async function getZoomMeetingRecordings(
  meetingId: string,
): Promise<ZoomMeetingRecording | null> {
  try {
    const token = await getZoomAccessToken();

    const res = await fetch(
      `https://api.zoom.us/v2/meetings/${encodeURIComponent(meetingId)}/recordings`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (res.status === 404) {
      console.warn(`[Zoom API] No recordings found for meeting ${meetingId}`);
      return null;
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[Zoom API] Failed to fetch recording ${meetingId} (${res.status}): ${errText}`);
      return null;
    }

    return (await res.json()) as ZoomMeetingRecording;
  } catch (err) {
    console.error('[Zoom API] Unexpected error:', err);
    return null;
  }
}

/**
 * Fetches a list of all cloud recordings for the account within a date range.
 * Useful for bulk sync / backfill.
 *
 * @param from – ISO date string e.g. "2026-01-01"
 * @param to   – ISO date string e.g. "2026-06-30"
 */
export async function listAccountRecordings(
  from: string,
  to: string,
  pageSize = 100,
): Promise<ZoomMeetingRecording[]> {
  try {
    const token = await getZoomAccessToken();

    const url = new URL('https://api.zoom.us/v2/accounts/me/recordings');
    url.searchParams.set('from', from);
    url.searchParams.set('to', to);
    url.searchParams.set('page_size', String(pageSize));

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[Zoom API] listAccountRecordings failed (${res.status}): ${errText}`);
      return [];
    }

    const data = await res.json();
    return (data.meetings ?? []) as ZoomMeetingRecording[];
  } catch (err) {
    console.error('[Zoom API] Unexpected error in listAccountRecordings:', err);
    return [];
  }
}
