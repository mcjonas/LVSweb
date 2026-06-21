export const dynamic = 'force-dynamic';

import { db } from '@/lib/db';
import { securityLogs } from '@/lib/schema';
import { desc } from 'drizzle-orm';
import styles from './security.module.css';

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', emoji: '🔴', color: '#e74c3c' },
  warning:  { label: 'Warning',  emoji: '🟡', color: '#f39c12' },
  info:     { label: 'Info',     emoji: '🟢', color: '#27ae60' },
} as const;

const EVENT_LABELS: Record<string, string> = {
  admin_login_success:       'Admin Login',
  admin_login_failed:        'Failed Admin Login',
  admin_logout:              'Admin Logout',
  rate_limited:              'Rate Limit Hit',
  student_login_success:     'Student Login',
  student_login_failed:      'Failed Student Login',
  payment_course_not_found:  'Payment — Course Not Found',
  payment_tamper:            'Payment Tamper Attempt',
};

export default async function SecurityPage() {
  const logs = await db
    .select()
    .from(securityLogs)
    .orderBy(desc(securityLogs.createdAt))
    .limit(200);

  const criticalCount = logs.filter(l => l.severity === 'critical').length;
  const warningCount  = logs.filter(l => l.severity === 'warning').length;
  const infoCount     = logs.filter(l => l.severity === 'info').length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>🔒 Security Logs</h1>
          <p>Real-time audit trail of authentication, payment, and access events.</p>
        </div>
      </div>

      {/* Summary badges */}
      <div className={styles.summary}>
        <div className={styles.badge} style={{ borderColor: '#e74c3c' }}>
          <span className={styles.badgeCount} style={{ color: '#e74c3c' }}>{criticalCount}</span>
          <span className={styles.badgeLabel}>🔴 Critical</span>
        </div>
        <div className={styles.badge} style={{ borderColor: '#f39c12' }}>
          <span className={styles.badgeCount} style={{ color: '#f39c12' }}>{warningCount}</span>
          <span className={styles.badgeLabel}>🟡 Warning</span>
        </div>
        <div className={styles.badge} style={{ borderColor: '#27ae60' }}>
          <span className={styles.badgeCount} style={{ color: '#27ae60' }}>{infoCount}</span>
          <span className={styles.badgeLabel}>🟢 Info</span>
        </div>
        <div className={styles.badge} style={{ borderColor: '#7B3FA0' }}>
          <span className={styles.badgeCount} style={{ color: '#7B3FA0' }}>{logs.length}</span>
          <span className={styles.badgeLabel}>📋 Total (last 200)</span>
        </div>
      </div>

      {/* Log table */}
      {logs.length === 0 ? (
        <div className={styles.empty}>
          <p>No security events recorded yet. Events will appear here as they occur.</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Severity</th>
                <th>Event</th>
                <th>IP Address</th>
                <th>Details</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => {
                const sev = SEVERITY_CONFIG[log.severity as keyof typeof SEVERITY_CONFIG]
                  ?? { label: log.severity, emoji: '⚪', color: '#999' };
                const label = EVENT_LABELS[log.event] ?? log.event;
                let parsedDetails: Record<string, unknown> | null = null;
                try { parsedDetails = log.details ? JSON.parse(log.details) : null; } catch {}

                return (
                  <tr key={log.id} className={styles[`row_${log.severity}` as keyof typeof styles] ?? ''}>
                    <td>
                      <span className={styles.sevBadge} style={{ background: sev.color }}>
                        {sev.emoji} {sev.label}
                      </span>
                    </td>
                    <td className={styles.eventCell}>{label}</td>
                    <td className={styles.ipCell}>{log.ip ?? '—'}</td>
                    <td className={styles.detailsCell}>
                      {parsedDetails
                        ? <code className={styles.detailsCode}>{JSON.stringify(parsedDetails)}</code>
                        : '—'}
                    </td>
                    <td className={styles.timeCell}>
                      {log.createdAt
                        ? new Date(log.createdAt).toLocaleString('en-GB', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', second: '2-digit',
                          })
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
