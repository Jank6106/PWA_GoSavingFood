import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createClient } = require(require.resolve('@supabase/supabase-js', { paths: ['./apps/customer'] }));

const envContent = readFileSync('.env', 'utf8');
const parseEnv = (key) => {
  const match = envContent.match(new RegExp(`${key}=([^\\r\\n]+)`));
  return match ? match[1].replace(/['"]/g, '').trim() : '';
};

const supabaseUrl = parseEnv('SUPABASE_URL');
const supabaseAnonKey = parseEnv('SUPABASE_ANON_KEY');

// 6 tài khoản người dùng thật có trong hệ thống
const REAL_ACCOUNTS = [
  {
    email: 'customer@example.com',
    password: 'Password123!',
    name: 'Nguyễn Hữu Danh',
    phone: '0366728399',
    bepChayComment: 'Bún nem chay và chả giò giòn rụm, nước chấm chua ngọt chuẩn vị. Quán đóng gói hộp giấy rất chỉn chu!',
    bepChayRating: 5,
    bakeryComment: 'Bánh croissant ngàn lớp thơm nức mùi bơ Pháp, date mới tinh trong ngày. Quá hài lòng!',
    bakeryRating: 5,
  },
  {
    email: 'test_cus_1790703959199@gosavingfood.vn',
    password: 'Password123!',
    name: 'Khánh Phạm',
    phone: '0366728398',
    bepChayComment: 'Đồ ăn rất ngon, nhận hàng nhanh và bao bì sạch sẽ! Cơm thực dưỡng thanh đạm hợp khẩu vị cả nhà.',
    bepChayRating: 5,
    bakeryComment: 'Túi bánh mì gối và pastry bơ ăn sáng cực kỳ tiện, tiết kiệm được phân nửa chi phí so với mua lẻ.',
    bakeryRating: 5,
  },
  {
    email: 'smoke-customer@gosavingfood.vn',
    password: 'SmokeTest123!',
    name: 'Nguyễn Bình Minh',
    phone: '0987654321',
    bepChayComment: 'Quán phục vụ nhanh nhẹn, chỉ cần quét mã QR 5 giây là nhận được túi đồ ăn mang về. Ủng hộ mô hình chống lãng phí!',
    bepChayRating: 5,
    bakeryComment: 'Bánh su kem và donut phô mai béo ngậy, bánh mềm không hề bị khô. Chắc chắn sẽ quay lại!',
    bakeryRating: 5,
  },
  {
    email: 'binh.minh@gosavingfood.vn',
    password: 'Password123!',
    name: 'Đỗ Thu Trang',
    phone: '0912345678',
    bepChayComment: 'Combo lẩu nấm cực kỳ nhiều nấm tươi, nước lẩu ngọt thanh tự nhiên. Rất đáng tiền!',
    bepChayRating: 4,
    bakeryComment: 'Bánh tươi ngon mỗi ngày, nhân viên niềm nở đóng gói cẩn thận.',
    bakeryRating: 4,
  },
  {
    email: 'bich.ngoc@gosavingfood.vn',
    password: 'Password123!',
    name: 'Vũ Bích Ngọc',
    phone: '0908123456',
    bepChayComment: 'Chè dưỡng nhan ngọt dịu thanh mát, chủ quán chu đáo còn tặng kèm thìa gỗ. 10/10 trải nghiệm!',
    bepChayRating: 5,
    bakeryComment: 'Túi bánh ngọt bất ngờ rất đầy đặn, bánh nướng thơm lừng.',
    bakeryRating: 5,
  },
  {
    email: 'cus_test_987654@example.com',
    password: 'Password123!',
    name: 'Trần Mai Anh',
    phone: '0988672037',
    bepChayComment: 'Cơm gạo lứt sườn chay sốt nấm và canh rong biển thanh mát, ăn nhẹ bụng mà rất no lâu.',
    bepChayRating: 5,
    bakeryComment: 'Bánh mì sourdough giòn vỏ đặc ruột, nướng lại bằng nồi chiên không dầu thơm nức.',
    bakeryRating: 5,
  },
];

// Danh sách các store cần đảm bảo có review
const STORES = [
  { id: 'b509682b-350a-4f10-8bbc-a76f6537c248', name: 'Bếp Chay An Lạc - Cổ Nhuế', type: 'bepChay' },
  { id: '799e644e-2f82-4a85-ba12-b194cf4cc547', name: 'GoGreen Bakery (Mocks)', type: 'bakery' },
  { id: 'e99f5ec7-f6f8-4b6e-bab9-d07278c9bf9a', name: 'GoGreen Bakery (Hà Nội)', type: 'bakery' },
];

async function seed() {
  console.log('🚀 Bắt đầu tạo mock data review ở database từ các user thật...');

  for (let uIdx = 0; uIdx < REAL_ACCOUNTS.length; uIdx++) {
    const acc = REAL_ACCOUNTS[uIdx];
    const client = createClient(supabaseUrl, supabaseAnonKey);

    // 1. Đăng nhập với tài khoản user thật
    const { data: auth, error: loginErr } = await client.auth.signInWithPassword({
      email: acc.email,
      password: acc.password,
    });

    if (loginErr || !auth?.user) {
      console.warn(`❌ Không đăng nhập được [${acc.name}] (${acc.email}):`, loginErr?.message);
      continue;
    }

    const user = auth.user;
    console.log(`\n👤 [${uIdx + 1}/${REAL_ACCOUNTS.length}] Đã đăng nhập User thật: "${acc.name}" (${user.email} - ${user.id})`);

    // 2. Cập nhật tên chuẩn trong public.users
    await client
      .from('users')
      .update({ name: acc.name, phone: acc.phone })
      .eq('id', user.id);

    // 3. Với mỗi store, tạo đơn hàng completed và chèn review thật
    for (const store of STORES) {
      const orderId = crypto.randomUUID();
      const isBakery = store.type === 'bakery';
      const comment = isBakery ? acc.bakeryComment : acc.bepChayComment;
      const rating = isBakery ? acc.bakeryRating : acc.bepChayRating;
      const price = isBakery ? 45000 : 35000;
      const hoursAgo = (uIdx + 1) * 6;
      const orderTime = new Date(Date.now() - hoursAgo * 3600000).toISOString();

      // 3.1. Tạo đơn hàng completed dưới danh nghĩa user này
      const { error: orderErr } = await client.from('orders').insert({
        id: orderId,
        customer_id: user.id,
        store_id: store.id,
        total_original_price: price * 2,
        total_discount_price: price,
        discount_amount: 0,
        final_amount: price,
        status: 'completed',
        payment_method: 'payos_vietqr',
        payment_status: 'success',
        qr_code: `GSF-QR-${orderId.slice(0, 8)}`,
        pickup_time: orderTime,
        created_at: orderTime,
        updated_at: orderTime,
        completed_at: orderTime,
        recipient_name: acc.name,
        recipient_phone: acc.phone,
      });

      if (orderErr) {
        console.warn(`  ⚠️ Lỗi tạo đơn cho store ${store.name}:`, orderErr.message);
        continue;
      }

      // 3.2. Tạo review từ chính user thật này
      const { data: rev, error: revErr } = await client.from('reviews').insert({
        order_id: orderId,
        customer_id: user.id,
        store_id: store.id,
        rating,
        comment,
        created_at: orderTime,
        updated_at: orderTime,
      }).select().single();

      if (revErr) {
        console.warn(`  ❌ Lỗi chèn review cho store ${store.name}:`, revErr.message);
      } else {
        console.log(`  ⭐ Đã tạo review thành công cho "${store.name}": [${rating}★] "${comment.slice(0, 45)}..."`);
      }
    }
  }

  // 4. Đồng bộ tổng số rating và điểm trung bình cho các stores
  const adminClient = createClient(supabaseUrl, supabaseAnonKey);
  await adminClient.auth.signInWithPassword({
    email: 'cus_test_987654@example.com',
    password: 'Password123!',
  });

  for (const s of STORES) {
    const { data: storeRevs } = await adminClient
      .from('reviews')
      .select('rating')
      .eq('store_id', s.id)
      .is('deleted_at', null);

    if (storeRevs && storeRevs.length > 0) {
      const avg = Number((storeRevs.reduce((acc, r) => acc + (r.rating || 5), 0) / storeRevs.length).toFixed(1));
      await adminClient
        .from('stores')
        .update({ rating: avg, total_ratings: storeRevs.length })
        .eq('id', s.id);
      console.log(`📊 Đã cập nhật chỉ số Store "${s.name}": ${avg}★ (${storeRevs.length} đánh giá)`);
    }
  }

  console.log('\n🎉 HOÀN THÀNH TẠO MOCK REVIEWS TỪ USER THẬT CHO TẤT CẢ STORES!');
}

seed().catch(console.error);
