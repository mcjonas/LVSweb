import { db } from '@/lib/db';
import { securityLogs } from '@/lib/schema';
import nodemailer from 'nodemailer';

interface SecurityEvent {
  event: string;
  severity: 'info' | 'warning' | 'critical';
  ip?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  userId?: number;
}

// Cooldown map: prevent spam-emailing the same event+IP within 10 minutes
const recentCriticalAlerts = new Map<string, number>();
const ALERT_COOLDOWN_MS = 10 * 60 * 1000;

async function sendCriticalAlert(event: SecurityEvent) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return;

  const alertKey = `${event.event}:${event.ip ?? 'unknown'}`;
  const lastAlert = recentCriticalAlerts.get(alertKey);
  if (lastAlert && Date.now() - lastAlert < ALERT_COOLDOWN_MS) return;
  recentCriticalAlerts.set(alertKey, Date.now());

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: (Number(process.env.SMTP_PORT) || 465) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    const detailsHtml = event.details
      ? `<pre style="background:#f5f5f5;padding:12px;border-radius:6px;font-size:13px;overflow:auto">${JSON.stringify(event.details, null, 2)}</pre>`
      : '';

    await transporter.sendMail({
      from: `"LVS Security" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER,
      subject: `🚨 Security Alert: ${event.event} — Love Vibe Studio`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:2px solid #e74c3c;border-radius:10px">
          <h2 style="color:#e74c3c;margin-top:0">🚨 Security Alert</h2>
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
            <tr><td style="padding:6px 0;color:#666;width:120px">Event</td>    <td style="padding:6px 0;font-weight:bold">${event.event}</td></tr>
            <tr><td style="padding:6px 0;color:#666">Severity</td> <td style="padding:6px 0;color:#e74c3c;font-weight:bold;text-transform:uppercase">${event.severity}</td></tr>
            <tr><td style="padding:6px 0;color:#666">IP Address</td><td style="padding:6px 0">${event.ip ?? 'Unknown'}</td></tr>
            <tr><td style="padding:6px 0;color:#666">Time (UTC)</td><td style="padding:6px 0">${new Date().toUTCString()}</td></tr>
          </table>
          ${detailsHtml}
          <hr style="border:0;border-top:1px solid #eee;margin:20px 0"/>
          <p style="color:#aaa;font-size:12px;margin:0">Love Vibe Studio — Automated Security System. Do not reply.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('[Security Logger] Alert email failed:', err);
  }
}

/**
 * logSecurityEvent
 * Fire-and-forget: writes to `security_logs` table, console-logs for Vercel,
 * and sends an email alert for 'critical' severity (with 10-min cooldown per IP).
 */
export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  // Always log to console so Vercel captures it
  const logFn =
    event.severity === 'critical' ? console.error
    : event.severity === 'warning' ? console.warn
    : console.info;

  logFn(`[Security][${event.severity.toUpperCase()}] ${event.event}`, {
    ip: event.ip,
    ...(event.details ?? {}),
  });

  // Non-blocking — never propagates errors to caller
  Promise.all([
    db.insert(securityLogs).values({
      event:     event.event,
      severity:  event.severity,
      ip:        event.ip      ?? null,
      userAgent: event.userAgent ?? null,
      details:   event.details  ? JSON.stringify(event.details) : null,
      userId:    event.userId   ?? null,
    }).catch(err => console.error('[Security Logger] DB insert failed:', err)),

    event.severity === 'critical'
      ? sendCriticalAlert(event)
      : Promise.resolve(),
  ]).catch(() => {});
}
