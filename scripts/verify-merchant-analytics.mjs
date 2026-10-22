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
const STORE_ID = 'b509682b-350a-4f10-8bbc-a76f6537c248';

async function verify() {
  await supabase.auth.signInWithPassword({
    email: 'cus_test_987654@example.com',
    password: 'Password123!',
  });

  console.log('=== 1. TÚI HÀNG ĐANG BÁN TRÊN KỆ ===');
  const { data: bags } = await supabase
    .from('surprise_bags')
    .select('id, name, original_price, discount_price, quantity, is_available')
    .eq('store_id', STORE_ID)
    .is('deleted_at', null);
  console.table(bags);

  console.log('=== 2. TỔNG SỐ ĐƠN HÀNG CỦA CỬA HÀNG ===');
  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, final_amount, recipient_name, created_at')
    .eq('store_id', STORE_ID)
    .order('created_at', { ascending: false });
  console.log(`Tổng cộng: ${orders.length} đơn hàng`);
  console.table(orders.slice(0, 10));

  console.log('=== 3. TOP TÚI BÁN CHẠY NHẤT ===');
  const { data: items } = await supabase
    .from('order_items')
    .select('quantity, bag_name, unit_price, total_price, orders!inner(store_id, status)')
    .eq('orders.store_id', STORE_ID);

  const bagStats = {};
  for (const it of items || []) {
    if (it.orders.status === 'completed' || it.orders.status === 'picked_up') {
      bagStats[it.bag_name] = (bagStats[it.bag_name] || 0) + it.quantity;
    }
  }
  console.table(
    Object.entries(bagStats)
      .map(([name, sold]) => ({ 'Tên túi': name, 'Đã bán': sold }))
      .sort((a, b) => b['Đã bán'] - a['Đã bán'])
  );

  console.log('=== 4. ĐÁNH GIÁ KHÁCH HÀNG MỚI NHẤT ===');
  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, rating, comment, created_at')
    .eq('store_id', STORE_ID)
    .order('created_at', { ascending: false });
  console.table(reviews);
}

verify().catch(console.error);
