import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString && process.env.NODE_ENV === 'production') {
  console.warn('⚠️ DATABASE_URL is missing. Database features will not work.');
}

// We use the URL if it exists, otherwise a placeholder to prevent crashing during build/evaluation
const sql = neon(connectionString || 'postgresql://placeholder:placeholder@localhost:5432/placeholder');
export const db = drizzle(sql, { schema });

