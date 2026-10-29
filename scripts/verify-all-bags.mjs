import { readFileSync } from 'node:fs';
import pg from 'pg';

const envText = readFileSync('.env', 'utf8');
const dbUrl = envText.match(/DATABASE_URL=([^\r\n]+)/)[1].trim();

const serviceCode = readFileSync('apps/customer/src/services/customer.service.ts', 'utf8');
const match = serviceCode.match(/export const HANOI_BAGS: SurpriseBag\[\] = (\[[\s\S]*?\n\]);/);
if (!match) {
  console.error('Could not find HANOI_BAGS in customer.service.ts');
  process.exit(1);
}
const HANOI_BAGS = JSON.parse(match[1]);

async function verifyAll() {
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const res = await client.query(`
    SELECT b.id, s.name as store_name, b.name as bag_name, b.image_url, b.original_price, b.discount_price
    FROM surprise_bags b
    JOIN stores s ON b.store_id = s.id
  `);
  await client.end();

  const dbBags = res.rows;
  console.log(`Total bags in DB: ${dbBags.length}`);
  console.log(`Total bags in HANOI_BAGS: ${HANOI_BAGS.length}`);

  const dbMap = new Map(dbBags.map(b => [b.id, b]));

  let mismatches = 0;
  for (const hBag of HANOI_BAGS) {
    const dBag = dbMap.get(hBag.id);
    if (!dBag) {
      console.log(`❌ Bag in HANOI_BAGS not in DB: ${hBag.id} (${hBag.name})`);
      mismatches++;
    } else if (dBag.image_url !== hBag.imageUrl) {
      console.log(`❌ Image mismatch for ${hBag.name} (${hBag.id}): DB="${dBag.image_url}" vs LOCAL="${hBag.imageUrl}"`);
      mismatches++;
    }
  }

  if (mismatches === 0) {
    console.log('✅ PERFECT! 100% of bags in HANOI_BAGS match Supabase database exactly (0 mismatches)!');
  } else {
    console.log(`⚠️ Found ${mismatches} mismatches!`);
  }
}

verifyAll();
