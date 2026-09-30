import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';

const envContent = readFileSync('.env', 'utf8');
const match = envContent.match(/DATABASE_URL=([^\r\n]+)/);
const conn = match[1].replace(/['"]/g, '');

const client = new pg.Client({
  connectionString: conn,
  ssl: { rejectUnauthorized: false },
});

async function check() {
  await client.connect();
  const pubRes = await client.query("SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime'");
  console.log('--- Realtime Publication Tables ---');
  console.table(pubRes.rows);

  const relRes = await client.query("SELECT relname, relreplident FROM pg_class WHERE relname IN ('orders', 'notifications', 'order_items')");
  console.log('--- Replica Identity (d=default, f=full, n=nothing, i=index) ---');
  console.table(relRes.rows);

  const rlsRes = await client.query("SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('orders', 'notifications')");
  console.log('--- Row Level Security ---');
  console.table(rlsRes.rows);

  const polRes = await client.query("SELECT tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('orders', 'notifications')");
  console.log('--- Policies ---');
  console.table(polRes.rows);

  await client.end();
}

check().catch(console.error);
