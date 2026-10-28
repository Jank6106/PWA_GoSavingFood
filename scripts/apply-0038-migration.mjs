import pg from 'pg';
import fs from 'fs';

const { Client } = pg;
const DATABASE_URL = 'postgres://postgres:EYKLgIdNUN4FaGWn@db.lblwvbedtlxjtkcuxmsf.supabase.co:5432/postgres';

async function run() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  const sql = fs.readFileSync('supabase/migrations/0038_optimize_storage_and_payload.sql', 'utf8');
  await client.query(sql);
  console.log('Migration 0038 applied successfully to Supabase PostgreSQL!');
  await client.end();
}

run().catch(console.error);
