import pg from 'pg';
import fs from 'fs';
import { requireEnv } from './lib/env.mjs';

const { Client } = pg;
const DATABASE_URL = requireEnv('DATABASE_URL');

async function run() {
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const sql = fs.readFileSync('supabase/migrations/0038_optimize_storage_and_payload.sql', 'utf8');
  await client.query(sql);
  console.log('Migration 0038 applied successfully to Supabase PostgreSQL!');
  await client.end();
}

run().catch(console.error);
