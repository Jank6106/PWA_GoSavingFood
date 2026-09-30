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
  const uRes = await client.query("SELECT id, email, role, name, phone FROM public.users WHERE id = '74b19be9-5a56-4034-888d-d1d33fcdedb4'");
  console.log('Customer User:', uRes.rows);

  const mRes = await client.query("SELECT s.id, s.name, s.owner_user_id, u.email FROM public.stores s JOIN public.users u ON u.id = s.owner_user_id WHERE s.id = '799e644e-2f82-4a85-ba12-b194cf4cc547'");
  console.log('Store & Owner:', mRes.rows);

  await client.end();
}

check().catch(console.error);
