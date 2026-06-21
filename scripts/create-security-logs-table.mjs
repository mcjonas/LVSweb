// Run: node scripts/create-security-logs-table.mjs
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Manually load .env.local
const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
  process.env[key] = val;
}

import pg from 'pg';
const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

await client.query(`
  CREATE TABLE IF NOT EXISTS security_logs (
    id          SERIAL PRIMARY KEY,
    event       VARCHAR(100) NOT NULL,
    severity    VARCHAR(20)  NOT NULL,
    ip          VARCHAR(64),
    user_agent  TEXT,
    details     TEXT,
    user_id     INTEGER,
    created_at  TIMESTAMP DEFAULT NOW()
  );
`);

console.log('✅ security_logs table created (or already exists).');
await client.end();
