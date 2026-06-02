'use client';

/**
 * /dashboard/recordings — P5 Admin Recording Dashboard
 *
 * Three-tab interface:
 *   🎥 Recordings   — list all synced Zoom recordings, filter by course, play inline
 *   📡 Webhooks     — recent webhook_events log (status, errors, retry count)
 *   🔐 Access Logs  — recording_access_logs audit trail (viewed / denied)
 *
 * P4 actions exposed:
 *   • "Enrich All"  — POST /api/admin/recordings/sync (enrich stale)
 *   • "Sync Meeting" — POST /api/admin/recordings/sync { meetingId }
 *   • "Backfill N Days" — POST /api/admin/recordings/sync { backfillDays: N }
 */

import { useState, useEffect, useCallback } from 'react';
import styles from './recordings.module.css';

// ── Types ─────────────────────────────────────────────────────────────────

interface Recording {
  id: number;
  title: string;
  courseId: number | null;
  courseTitle: string | null;
  zoomMeetingId: string;
  zoomRecordingId: string;
  durationMinutes: number | null;
  playUrl: string;
  synchronizedAt: string;
  createdAt: string;
}

interface WebhookEvent {
  id: number;
  zoomEventId: string;
  eventType: string;
  status: string;
  retryCount: number | null;
  lastError: string | null;
  processedAt: string | null;
  createdAt: string;
}

interface AccessLog {
  id: number;
  action: string;
  denyReason: string | null;
  ipAddress: string | null;
  timestamp: string;
  studentName: string | null;
  studentEmail: string | null;
  recordingTitle: string | null;
  courseTitle: string | null;
}

type Tab = 'recordings' | 'webhooks' | 'access';

// ── Helpers ───────────────────────────────────────────────────────────────

/** Browser automatically includes the dashboard_auth cookie */
const adminFetch = (url: string, opts: RequestInit = {}) =>
  fetch(url, { ...opts, credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts.headers ?? {}) },
  });

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const fmtDuration = (min: number | null) => {
  if (!min) return '—';
  if (min < 60) return `${min}m`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
};

// ── Component ─────────────────────────────────────────────────────────────

export default function RecordingsDashboard() {
  const [tab, setTab] = useState<Tab>('recordings');

  // Data
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [webhooks, setWebhooks]     = useState<WebhookEvent[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);

  // UI state
  const [loadingRec, setLoadingRec]     = useState(true);
  const [loadingWh, setLoadingWh]       = useState(false);
  const [loadingAl, setLoadingAl]       = useState(false);
  const [syncing, setSyncing]           = useState(false);
  const [toast, setToast]               = useState<{ msg: string; ok: boolean } | null>(null);

  // Sync panel inputs
  const [syncMeetingId, setSyncMeetingId] = useState('');
  const [backfillDays, setBackfillDays]   = useState('30');

  // Filter
  const [courseFilter, setCourseFilter] = useState('');

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 5000);
  };

  // ── Fetch recordings ────────────────────────────────────────────────────
  const fetchRecordings = useCallback(async () => {
    setLoadingRec(true);
    try {
      const res  = await adminFetch('/api/admin/recordings/sync');
      const data = await res.json();
      if (data.success) setRecordings(data.recordings);
      else showToast(data.error ?? 'Failed to load recordings', false);
    } catch {
      showToast('Network error loading recordings', false);
    } finally {
      setLoadingRec(false);
    }
  }, []);

  const fetchWebhooks = useCallback(async () => {
    setLoadingWh(true);
    try {
      const res  = await adminFetch('/api/admin/recordings/webhook-events');
      const data = await res.json();
      if (data.success) setWebhooks(data.events);
    } finally {
      setLoadingWh(false);
    }
  }, []);

  const fetchAccessLogs = useCallback(async () => {
    setLoadingAl(true);
    try {
      const res  = await adminFetch('/api/admin/recordings/access-logs');
      const data = await res.json();
      if (data.success) setAccessLogs(data.logs);
    } finally {
      setLoadingAl(false);
    }
  }, []);

  useEffect(() => { fetchRecordings(); }, [fetchRecordings]);

  useEffect(() => {
    if (tab === 'webhooks' && webhooks.length === 0) fetchWebhooks();
    if (tab === 'access'   && accessLogs.length === 0) fetchAccessLogs();
  }, [tab, webhooks.length, accessLogs.length, fetchWebhooks, fetchAccessLogs]);

  // ── Sync actions ────────────────────────────────────────────────────────
  const doSync = async (body: Record<string, unknown>, label: string) => {
    setSyncing(true);
    try {
      const res  = await adminFetch('/api/admin/recordings/sync', {
        method: 'POST',
        body:   JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✅ ${label} — ${data.enriched ?? data.results?.length ?? 0} action(s) taken`, true);
        fetchRecordings();
      } else {
        showToast(`❌ ${data.error ?? 'Sync failed'}`, false);
      }
    } catch {
      showToast('❌ Network error during sync', false);
    } finally {
      setSyncing(false);
    }
  };

  // ── Derived stats ───────────────────────────────────────────────────────
  const totalRecordings  = recordings.length;
  const linkedRecordings = recordings.filter(r => r.courseId !== null).length;
  const staleDuration    = recordings.filter(r => !r.durationMinutes).length;
  const totalWebhooks    = webhooks.length;
  const failedWebhooks   = webhooks.filter(w => w.status === 'failed').length;

  const filteredRecordings = courseFilter
    ? recordings.filter(r =>
        (r.courseTitle ?? '').toLowerCase().includes(courseFilter.toLowerCase()) ||
        (r.title       ?? '').toLowerCase().includes(courseFilter.toLowerCase()),
      )
    : recordings;

  const uniqueCourses = Array.from(
    new Set(recordings.map(r => r.courseTitle).filter(Boolean))
  ) as string[];

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={styles.container}>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1>🎥 Recordings Dashboard</h1>
          <p>Monitor Zoom Cloud Recordings, webhook events, and access audit logs.</p>
        </div>
        <div className={styles.headerActions}>
          <button
            id="btn-refresh"
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={() => { fetchRecordings(); fetchWebhooks(); fetchAccessLogs(); }}
            disabled={syncing}
          >
            ↻ Refresh
          </button>
          <button
            id="btn-enrich-all"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => doSync({}, 'Enrich stale recordings')}
            disabled={syncing}
          >
            {syncing ? '⏳ Syncing…' : '⚡ Enrich All'}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`${styles.toast} ${toast.ok ? styles.toastOk : styles.toastFail}`}>
          {toast.msg}
        </div>
      )}

      {/* Stat Cards */}
      <div className={styles.statCards}>
        <div className={styles.statCard} style={{ '--stat-color': '#34d399' } as React.CSSProperties}>
          <div className={styles.statValue}>{totalRecordings}</div>
          <div className={styles.statLabel}>Total Recordings</div>
          <span className={styles.statIcon}>🎬</span>
        </div>
        <div className={styles.statCard} style={{ '--stat-color': '#818cf8' } as React.CSSProperties}>
          <div className={styles.statValue}>{linkedRecordings}</div>
          <div className={styles.statLabel}>Linked to Courses</div>
          <span className={styles.statIcon}>🔗</span>
        </div>
        <div className={styles.statCard} style={{ '--stat-color': '#fbbf24' } as React.CSSProperties}>
          <div className={styles.statValue}>{staleDuration}</div>
          <div className={styles.statLabel}>Missing Duration</div>
          <span className={styles.statIcon}>⏱</span>
        </div>
        <div className={styles.statCard} style={{ '--stat-color': '#f87171' } as React.CSSProperties}>
          <div className={styles.statValue}>{failedWebhooks}</div>
          <div className={styles.statLabel}>Failed Webhooks</div>
          <span className={styles.statIcon}>⚠️</span>
        </div>
      </div>

      {/* P4 Sync Panel */}
      <div className={styles.syncPanel}>
        <h3>⚡ Zoom API Sync (P4)</h3>
        <p>
          Fetch authoritative metadata from Zoom Cloud Recordings API — enriches duration, refreshes
          play URLs, and can import recordings that were missed by the webhook. Requires
          <code style={{ color: 'var(--gold)', margin: '0 0.3rem' }}>ZOOM_ACCOUNT_ID</code>
          <code style={{ color: 'var(--gold)', margin: '0 0.3rem' }}>ZOOM_CLIENT_ID</code>
          <code style={{ color: 'var(--gold)' }}>ZOOM_CLIENT_SECRET</code> in .env.local.
        </p>
        <div className={styles.syncRow}>
          <div className={styles.syncField}>
            <label>Sync single meeting ID</label>
            <input
              id="input-meeting-id"
              placeholder="e.g. 85234567890"
              value={syncMeetingId}
              onChange={e => setSyncMeetingId(e.target.value)}
            />
          </div>
          <button
            id="btn-sync-meeting"
            className={`${styles.btn} ${styles.btnSecondary}`}
            disabled={syncing || !syncMeetingId.trim()}
            onClick={() => doSync({ meetingId: syncMeetingId.trim() }, `Sync meeting ${syncMeetingId}`)}
          >
            Sync Meeting
          </button>

          <div className={styles.syncField} style={{ marginLeft: '1rem' }}>
            <label>Backfill last N days</label>
            <input
              id="input-backfill-days"
              type="number"
              min={1}
              max={365}
              value={backfillDays}
              onChange={e => setBackfillDays(e.target.value)}
              style={{ width: '80px' }}
            />
          </div>
          <button
            id="btn-backfill"
            className={`${styles.btn} ${styles.btnSecondary}`}
            disabled={syncing}
            onClick={() => doSync({ backfillDays: Number(backfillDays) }, `Backfill last ${backfillDays} days`)}
          >
            Backfill
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {([
          ['recordings', '🎥 Recordings'],
          ['webhooks',   '📡 Webhooks'],
          ['access',     '🔐 Access Logs'],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            id={`tab-${key}`}
            className={`${styles.tab} ${tab === key ? styles.tabActive : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
            {key === 'recordings' && totalRecordings > 0 && (
              <span style={{ marginLeft: '0.4rem', opacity: 0.5, fontSize: '0.75rem' }}>
                ({totalRecordings})
              </span>
            )}
            {key === 'webhooks' && failedWebhooks > 0 && (
              <span style={{ marginLeft: '0.4rem', color: '#f87171', fontSize: '0.75rem' }}>
                ⚠ {failedWebhooks}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Recordings Tab ── */}
      {tab === 'recordings' && (
        <>
          {/* Course filter */}
          {uniqueCourses.length > 0 && (
            <div style={{ marginBottom: '1.2rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                style={{ fontSize: '0.75rem', padding: '0.4rem 0.9rem' }}
                onClick={() => setCourseFilter('')}
              >
                All
              </button>
              {uniqueCourses.map(c => (
                <button
                  key={c}
                  className={`${styles.btn} ${courseFilter === c ? styles.btnPrimary : styles.btnSecondary}`}
                  style={{ fontSize: '0.75rem', padding: '0.4rem 0.9rem' }}
                  onClick={() => setCourseFilter(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {loadingRec ? (
            <div className={styles.spinner} />
          ) : filteredRecordings.length === 0 ? (
            <div className={styles.empty}>
              No recordings found.{' '}
              {totalRecordings === 0
                ? 'They will appear here once Zoom sends a webhook after a session ends.'
                : 'Try clearing the filter.'}
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Course</th>
                    <th>Duration</th>
                    <th>Meeting ID</th>
                    <th>Synced</th>
                    <th>Play</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecordings.map(r => (
                    <tr key={r.id}>
                      <td title={r.title}>{r.title || '(Untitled)'}</td>
                      <td>
                        {r.courseTitle
                          ? <span className={styles.badgeOk}>{r.courseTitle}</span>
                          : <span className={styles.badgeWarn}>Unlinked</span>}
                      </td>
                      <td>{fmtDuration(r.durationMinutes)}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
                        {r.zoomMeetingId}
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
                        {fmtDate(r.synchronizedAt)}
                      </td>
                      <td>
                        {r.playUrl ? (
                          <a
                            href={r.playUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.playLink}
                          >
                            ▶ Play
                          </a>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Webhooks Tab ── */}
      {tab === 'webhooks' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={fetchWebhooks}
              disabled={loadingWh}
            >
              ↻ Reload
            </button>
          </div>
          {loadingWh ? (
            <div className={styles.spinner} />
          ) : webhooks.length === 0 ? (
            <div className={styles.empty}>No webhook events yet. Events appear here once Zoom sends notifications.</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Event ID</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Retries</th>
                    <th>Processed At</th>
                    <th>Received At</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {webhooks.map(w => (
                    <tr key={w.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>
                        {w.zoomEventId.slice(0, 28)}…
                      </td>
                      <td style={{ fontSize: '0.78rem' }}>{w.eventType}</td>
                      <td>
                        {w.status === 'processed' && <span className={styles.badgeOk}>✓ Processed</span>}
                        {w.status === 'pending'   && <span className={styles.badgePending}>⏳ Pending</span>}
                        {w.status === 'failed'    && <span className={styles.badgeFail}>✗ Failed</span>}
                      </td>
                      <td style={{ textAlign: 'center' }}>{w.retryCount ?? 0}</td>
                      <td style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
                        {fmtDate(w.processedAt)}
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
                        {fmtDate(w.createdAt)}
                      </td>
                      <td title={w.lastError ?? ''} style={{ color: '#f87171', fontSize: '0.78rem', maxWidth: '200px' }}>
                        {w.lastError ? w.lastError.slice(0, 60) + (w.lastError.length > 60 ? '…' : '') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Access Logs Tab ── */}
      {tab === 'access' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={fetchAccessLogs}
              disabled={loadingAl}
            >
              ↻ Reload
            </button>
          </div>
          {loadingAl ? (
            <div className={styles.spinner} />
          ) : accessLogs.length === 0 ? (
            <div className={styles.empty}>No access logs yet. Logs appear here when students view or are denied recordings.</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Student</th>
                    <th>Recording</th>
                    <th>Course</th>
                    <th>Action</th>
                    <th>Deny Reason</th>
                    <th>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {accessLogs.map(l => (
                    <tr key={l.id}>
                      <td style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
                        {fmtDate(l.timestamp)}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem' }}>{l.studentName ?? '—'}</div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>{l.studentEmail ?? ''}</div>
                      </td>
                      <td title={l.recordingTitle ?? ''}>{l.recordingTitle ?? '—'}</td>
                      <td>{l.courseTitle ?? '—'}</td>
                      <td>
                        {l.action === 'viewed'
                          ? <span className={styles.badgeOk}>✓ Viewed</span>
                          : <span className={styles.badgeFail}>✗ Denied</span>}
                      </td>
                      <td style={{ fontSize: '0.78rem', color: '#fbbf24' }}>
                        {l.denyReason ?? '—'}
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
                        {l.ipAddress ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
