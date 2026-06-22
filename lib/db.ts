import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { Agent } from 'undici';
import * as schema from './schema';

// ── Parameters that @neondatabase/serverless does NOT support ─────────────────
// Neon's dashboard generates connection strings with `channel_binding=require`
// and occasionally other libpq-only params. The neon-http driver ignores them
// silently in some contexts but times out in others (Next.js server runtime).
// We strip them here so the app is immune to future Neon connection-string changes.
const UNSUPPORTED_PARAMS = ['channel_binding', 'connect_timeout'];

function sanitizeConnectionString(url: string): string {
  try {
    const parsed = new URL(url);
    UNSUPPORTED_PARAMS.forEach(p => parsed.searchParams.delete(p));
    return parsed.toString();
  } catch {
    // If URL parsing fails, return as-is and let Neon handle the error
    // (but also trim potential whitespace or CR characters)
    return url.trim();
  }
}

const rawConnectionString = process.env.DATABASE_URL;

if (!rawConnectionString) {
  // Warn in all environments so the error is obvious in local dev too
  console.warn(
    '⚠️  DATABASE_URL is not set. ' +
    (process.env.NODE_ENV === 'development'
      ? 'Make sure .env.local exists in the project root and restart your dev server.'
      : 'Configure this environment variable on your hosting platform.')
  );
}

const connectionString = rawConnectionString
  ? sanitizeConnectionString(rawConnectionString)
  : 'postgresql://placeholder:placeholder@localhost:5432/placeholder';

// Create a custom undici Agent with a 30-second connection timeout
// to prevent "TypeError: fetch failed" / "ConnectTimeoutError" during
// Neon Serverless Postgres compute cold starts (which can take 10-15s).
const clientAgent = new Agent({
  connectTimeout: 30000,
});

const sql = neon(connectionString, {
  fetchOptions: {
    dispatcher: clientAgent,
  },
});

export const db = drizzle(sql, { schema });

