import { readFileSync } from 'node:fs';
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
  const res = await client.query("SELECT id, status, customer_id, store_id, qr_code, created_at FROM public.orders WHERE id::text ILIKE '49406b%' OR qr_code ILIKE '%49406b%';");
  console.log('Order GSF-49406B:');
  console.table(res.rows);
  await client.end();
}

check().catch(console.error);
