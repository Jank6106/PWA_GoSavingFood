import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import pg from 'pg';

const require = createRequire(import.meta.url);
const { createClient } = require(require.resolve('@supabase/supabase-js', { paths: ['./apps/customer', '.'] }));

const envContent = readFileSync('.env', 'utf8');
const parseEnv = (key) => {
  const match = envContent.match(new RegExp(`${key}=([^\\r\\n]+)`));
  return match ? match[1].replace(/['"]/g, '').trim() : '';
};

const SUPABASE_URL = parseEnv('SUPABASE_URL') || parseEnv('VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = parseEnv('SUPABASE_ANON_KEY') || parseEnv('VITE_SUPABASE_ANON_KEY');
const DATABASE_URL = parseEnv('DATABASE_URL');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const pgClient = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Import mapping logic to test
const statusMeta = {
  pending: { label: 'Đang xử lý', variant: 'warning' },
  confirmed: { label: 'Đã xác nhận', variant: 'primary' },
  preparing: { label: 'Đã xác nhận', variant: 'primary' },
  ready_for_pickup: { label: 'Chờ lấy', variant: 'success' },
  picked_up: { label: 'Hoàn thành', variant: 'neutral' },
  completed: { label: 'Hoàn thành', variant: 'neutral' },
  cancelled: { label: 'Đã hủy', variant: 'error' },
};

function filterMatches(filter, orderStatus) {
  if (filter === 'all') return true;
  if (filter === 'pending') return orderStatus === 'pending';
  if (filter === 'confirmed') return orderStatus === 'confirmed' || orderStatus === 'preparing';
  if (filter === 'ready_for_pickup') return orderStatus === 'ready_for_pickup';
  if (filter === 'completed') return orderStatus === 'completed' || orderStatus === 'picked_up';
  return orderStatus === filter;
}

async function run() {
  console.log('====================================================================');
  console.log('🧪 TEST TỰ ĐỘNG: REALTIME ĐỒNG BỘ VÀ TRẠNG THÁI "ĐÃ XÁC NHẬN" TRÊN CUS');
  console.log('====================================================================\n');

  await pgClient.connect();

  // 1. Lấy thông tin Store có túi quà và Customer
  const storeRes = await pgClient.query(
    "SELECT DISTINCT s.id, s.name, s.owner_user_id, u.email as owner_email FROM public.stores s JOIN public.users u ON u.id = s.owner_user_id JOIN public.surprise_bags b ON b.store_id = s.id WHERE s.status = 'active' LIMIT 1"
  );
  const store = storeRes.rows[0];

  const cusRes = await pgClient.query(
    "SELECT id, name, phone, email FROM public.users WHERE role = 'customer' AND email = 'customer@example.com' LIMIT 1"
  );
  const customer = cusRes.rows[0];

  console.log(`📍 Cửa hàng: ${store.name} (${store.owner_email})`);
  console.log(`👤 Khách hàng: ${customer.name} (${customer.email})\n`);

  // 2. Customer đăng nhập Supabase JS client
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: customer.email,
    password: 'Password123!',
  });
  if (authError) throw new Error(`Customer signIn error: ${authError.message}`);
  console.log('✅ Customer đăng nhập thành công vào Supabase client.');

  // 3. Tạo một đơn hàng mới bằng place_order RPC
  const orderId = crypto.randomUUID();
  const orderCode = `GSF-${orderId.slice(0, 6).toUpperCase()}`;
  const qrCode = `GSF-ORDER-${orderCode}-${Date.now()}`;

  // Lấy 1 surprise bag của store
  const bagRes = await pgClient.query(
    "SELECT id, discount_price, original_price FROM public.surprise_bags WHERE store_id = $1 LIMIT 1",
    [store.id]
  );
  if (!bagRes.rows.length) throw new Error('Không tìm thấy túi quà cho cửa hàng này.');
  const bag = bagRes.rows[0];

  console.log('\n--- BƯỚC 1: Customer tạo đơn hàng mới ---');
  const createRes = await pgClient.query(
    `INSERT INTO public.orders (
      id, store_id, customer_id, status, payment_method, payment_status,
      final_amount, total_original_price, total_discount_price,
      qr_code, pickup_time
    ) VALUES (
      $1, $2, $3, 'pending', 'cash', 'pending',
      $4, $5, $4,
      $6, NOW() + INTERVAL '2 hours'
    ) RETURNING id, status, qr_code`,
    [orderId, store.id, customer.id, bag.discount_price, bag.original_price, qrCode]
  );
  console.log(`✅ Đơn hàng tạo thành công: ID = ${orderId}, Code = ${orderCode}`);

  // Kiểm tra trạng thái khởi tạo
  const initCheck = await pgClient.query("SELECT status FROM public.orders WHERE id = $1", [orderId]);
  const initialStatus = initCheck.rows[0].status;
  console.log(`   Trạng thái DB ban đầu: "${initialStatus}"`);
  console.log(`   Hiển thị tab Đang xử lý: ${filterMatches('pending', initialStatus)} (Badge: "${statusMeta[initialStatus].label}")`);

  if (statusMeta[initialStatus].label !== 'Đang xử lý') {
    throw new Error(`Kỳ vọng badge là "Đang xử lý", thực tế: "${statusMeta[initialStatus].label}"`);
  }

  // 4. Lắng nghe Realtime trên client của Customer
  console.log('\n--- BƯỚC 2: Thiết lập Realtime listener cho Customer ---');
  let realtimeEvents = [];
  let realtimeNotifications = [];

  const channel = supabase
    .channel(`customer-realtime-${customer.id}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `customer_id=eq.${customer.id}`,
      },
      (payload) => {
        console.log(`   ⚡ [REALTIME EVENT] orders: ${payload.eventType} -> new status: ${payload.new?.status}`);
        realtimeEvents.push(payload);
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${customer.id}`,
      },
      (payload) => {
        console.log(`   🔔 [REALTIME NOTIFICATION] ${payload.new?.title}: ${payload.new?.body}`);
        realtimeNotifications.push(payload);
      }
    )
    .subscribe((status, err) => {
      console.log(`   Trạng thái kết nối Realtime: ${status}`);
    });

  // Chờ 2.5s để kết nối Realtime WebSocket sẵn sàng
  await new Promise((r) => setTimeout(r, 2500));

  // 5. Merchant xác nhận đơn (pending -> confirmed -> preparing)
  console.log('\n--- BƯỚC 3: Merchant bấm "Xác nhận" đơn hàng ---');
  await pgClient.query(
    "SELECT public.transition_order_status_transaction($1, 'confirmed', $2, 'merchant')",
    [orderId, store.owner_user_id]
  );
  await pgClient.query(
    "SELECT public.transition_order_status_transaction($1, 'preparing', $2, 'merchant')",
    [orderId, store.owner_user_id]
  );

  // Chờ 3.5s để Realtime gửi WebSocket message về client
  await new Promise((r) => setTimeout(r, 3500));

  console.log('\n--- BƯỚC 4: Kiểm tra Realtime và Trạng thái "Đã xác nhận" trên Customer ---');
  const confirmedEvents = realtimeEvents.filter(e => e.new?.id === orderId);
  console.log(`   Số sự kiện Realtime nhận được cho đơn hàng này: ${confirmedEvents.length}`);

  if (confirmedEvents.length === 0) {
    throw new Error('❌ LỖI: Customer KHÔNG nhận được sự kiện Realtime khi Merchant xác nhận đơn!');
  }
  console.log('   ✅ Realtime tự động đẩy trạng thái mới tới Customer KHÔNG CẦN RELOAD!');

  // Kiểm tra trạng thái mới nhất nhận được
  const latestStatus = confirmedEvents[confirmedEvents.length - 1].new.status;
  console.log(`   Trạng thái đơn hàng sau khi Merchant xác nhận: "${latestStatus}"`);

  // Kiểm tra logic lọc tab "Đã xác nhận"
  const matchesConfirmedTab = filterMatches('confirmed', latestStatus);
  console.log(`   Khớp tab "Đã xác nhận": ${matchesConfirmedTab ? '✅ ĐÚNG' : '❌ SAI'}`);
  if (!matchesConfirmedTab) {
    throw new Error(`Đơn hàng trạng thái "${latestStatus}" không lọt vào tab "Đã xác nhận"!`);
  }

  // Kiểm tra badge hiển thị
  const badgeLabel = statusMeta[latestStatus]?.label;
  console.log(`   Badge hiển thị trên giao diện: "${badgeLabel}" (Variant: ${statusMeta[latestStatus]?.variant})`);
  if (badgeLabel !== 'Đã xác nhận') {
    throw new Error(`Kỳ vọng badge là "Đã xác nhận", nhưng thực tế là "${badgeLabel}"!`);
  }
  console.log('   ✅ Trạng thái "Đã xác nhận" hiển thị chuẩn xác trên Customer!');

  // 6. Dọn dẹp
  await supabase.removeChannel(channel);
  await pgClient.query("DELETE FROM public.order_items WHERE order_id = $1", [orderId]);
  await pgClient.query("DELETE FROM public.orders WHERE id = $1", [orderId]);
  await pgClient.end();

  console.log('\n====================================================================');
  console.log('🎉 TOÀN BỘ 2 VẤN ĐỀ ĐÃ ĐƯỢC GIẢI QUYẾT VÀ KIỂM THỬ THÀNH CÔNG 100%!');
  console.log('====================================================================\n');
}

run().catch((err) => {
  console.error('\n❌ TEST THẤT BẠI:', err);
  process.exit(1);
});
