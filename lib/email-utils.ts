/**
 * lib/email-utils.ts
 *
 * Shared utilities for email composition.
 */

/**
 * HTML-escapes a string to prevent email HTML injection.
 * Escapes: & < > " '
 *
 * Apply to ALL user-supplied strings before embedding in HTML email templates.
 */
export function escHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
