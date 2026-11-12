import pg from 'pg';
import { requireEnv } from './lib/env.mjs';

const { Client } = pg;
const DATABASE_URL = requireEnv('DATABASE_URL');

async function check() {
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const res = await client.query("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'surprise_bags'");
  console.log('Indexes on surprise_bags:\n', res.rows.map(r => `  - ${r.indexname}: ${r.indexdef}`).join('\n'));
  await client.end();
}

check().catch(console.error);
