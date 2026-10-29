import pg from 'pg';
const { Client } = pg;
const DATABASE_URL = 'postgres://postgres:EYKLgIdNUN4FaGWn@db.lblwvbedtlxjtkcuxmsf.supabase.co:5432/postgres';

async function check() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  const res = await client.query("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'surprise_bags'");
  console.log('Indexes on surprise_bags:\n', res.rows.map(r => `  - ${r.indexname}: ${r.indexdef}`).join('\n'));
  await client.end();
}

check().catch(console.error);
