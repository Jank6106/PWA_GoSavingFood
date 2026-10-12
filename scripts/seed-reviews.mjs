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

async function seedReviews() {
  // Sign in as customer
  const { data: auth } = await supabase.auth.signInWithPassword({
    email: 'cus_test_987654@example.com',
    password: 'Password123!',
  });
  const customerId = auth.user.id;

  // Lấy store Tous Les Jours
  const { data: storeTlj } = await supabase
    .from('stores')
    .select('id, name')
    .eq('name', 'Tous Les Jours - Hoàng Quốc Việt')
    .single();

  if (!storeTlj) {
    console.error('Không tìm thấy store TLJ');
    return;
  }

  // Lấy 1 bag của TLJ
  const { data: bagTlj } = await supabase
    .from('surprise_bags')
    .select('id, name, discount_price')
    .eq('store_id', storeTlj.id)
    .limit(1)
    .single();

  // 1. Tạo đơn hàng completed cho TLJ
  const orderId = 'd1000000-0000-0000-0000-000000000001';
  const { data: existingOrder } = await supabase
    .from('orders')
    .select('id')
    .eq('id', orderId)
    .maybeSingle();

  if (!existingOrder) {
    const { error: oErr } = await supabase.from('orders').insert({
      id: orderId,
      customer_id: customerId,
      store_id: storeTlj.id,
      total_original_price: 110000,
      total_discount_price: 35000,
      discount_amount: 0,
      final_amount: 35000,
      status: 'completed',
      payment_method: 'banking',
      payment_status: 'success',
      qr_code: 'GSF-TLJ-SEED-01',
      pickup_time: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    });

    if (oErr) {
      console.error('Lỗi tạo order:', oErr.message);
      return;
    }

    if (bagTlj) {
      await supabase.from('order_items').insert({
        order_id: orderId,
        bag_id: bagTlj.id,
        bag_name: bagTlj.name,
        quantity: 1,
        unit_price: bagTlj.discount_price,
        total_price: bagTlj.discount_price,
      });
    }
  }

  // 2. Tạo review trong bảng reviews cho đơn hàng này
  const reviewId = 'e1000000-0000-0000-0000-000000000001';
  const { data: existingReview } = await supabase
    .from('reviews')
    .select('id')
    .eq('id', reviewId)
    .maybeSingle();

  if (!existingReview) {
    const { error: rErr } = await supabase.from('reviews').insert({
      id: reviewId,
      order_id: orderId,
      customer_id: customerId,
      store_id: storeTlj.id,
      rating: 5,
      comment: 'Bánh mì tươi và thơm ngon tuyệt vời, tiết kiệm được rất nhiều tiền! Rất ủng hộ chiến dịch giải cứu thực phẩm.',
    });

    if (rErr) {
      console.error('Lỗi tạo review:', rErr.message);
      return;
    }
    console.log('✅ Đã tạo review thành công cho Tous Les Jours!');
  }

  // 3. Kiểm tra lại rating của store trong Supabase
  const { data: updatedStore } = await supabase
    .from('stores')
    .select('name, rating, total_ratings')
    .eq('id', storeTlj.id)
    .single();

  console.log('Store sau khi có review:', updatedStore);
}

seedReviews().catch(console.error);
