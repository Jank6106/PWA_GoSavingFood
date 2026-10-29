import { readFileSync } from 'node:fs';
import pg from 'pg';

const envText = readFileSync('.env', 'utf8');
const dbUrl = envText.match(/DATABASE_URL=([^\r\n]+)/)[1].trim();

async function check() {
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const res = await client.query(`
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'orders'
  `);
  console.log('RLS on orders:', res.rows);
  const pol = await client.query(`
    SELECT policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'orders'
  `);
  console.log('Policies on orders:', JSON.stringify(pol.rows, null, 2));
  await client.end();
}
check();
