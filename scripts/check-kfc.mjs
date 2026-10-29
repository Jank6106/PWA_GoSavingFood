import { readFileSync } from 'node:fs';
import pg from 'pg';

const envText = readFileSync('.env', 'utf8');
const dbUrl = envText.match(/DATABASE_URL=([^\r\n]+)/)[1].trim();

async function check() {
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const res = await client.query(`
    SELECT b.id, s.name as store_name, b.name as bag_name, b.image_url
    FROM surprise_bags b
    JOIN stores s ON b.store_id = s.id
    WHERE s.name ILIKE '%KFC%'
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}
check();
