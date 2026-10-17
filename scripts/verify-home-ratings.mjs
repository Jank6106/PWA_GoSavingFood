import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createClient } = require(require.resolve('@supabase/supabase-js', { paths: ['./apps/customer'] }));

const envContent = readFileSync('.env', 'utf8');
const parseEnv = (key) => {
  const match = envContent.match(new RegExp(`${key}=([^\\r\\n]+)`));
  return match ? match[1].replace(/['"]/g, '').trim() : '';
};

const supabase = createClient(parseEnv('SUPABASE_URL'), parseEnv('SUPABASE_ANON_KEY'));

async function verify() {
  const { data: stores, error } = await supabase
    .from('stores')
    .select('id, name, rating, total_ratings')
    .like('address', '%Hà Nội%');

  console.log(`Tìm thấy ${stores?.length || 0} stores Hà Nội trong Supabase:`);
  for (const s of (stores || [])) {
    console.log(`- ${s.name}: Rating = ${s.rating} (${s.total_ratings} đánh giá) [ID: ${s.id}]`);
  }

  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, store_id, rating, comment');

  console.log(`\nTổng số reviews trong bảng reviews: ${reviews?.length || 0}`);
  for (const r of (reviews || [])) {
    console.log(`- Store ${r.store_id}: ${r.rating} sao - "${r.comment}"`);
  }
}

verify();
