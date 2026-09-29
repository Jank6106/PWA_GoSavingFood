import pg from 'pg';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const envText = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq > 0) env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
}

const client = new pg.Client({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  console.log('Connected to DB');

  // Check stores
  const storesRes = await client.query('SELECT id, name, owner_user_id, status FROM stores LIMIT 5');
  console.log('Stores in DB:', JSON.stringify(storesRes.rows, null, 2));

  // Check bags
  const bagsRes = await client.query('SELECT id, store_id, name, discount_price, is_available FROM surprise_bags LIMIT 5');
  console.log('Bags in DB:', JSON.stringify(bagsRes.rows, null, 2));

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
