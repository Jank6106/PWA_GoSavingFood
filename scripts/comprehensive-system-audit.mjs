import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import crypto from 'node:crypto';
import { getSupabaseConfig } from './lib/env.mjs';

const {
  url: SUPABASE_URL,
  anonKey: ANON_KEY,
  serviceRoleKey: SERVICE_KEY,
  databaseUrl: dbUrl,
} = getSupabaseConfig({
  requireAnon: true,
  requireServiceRole: true,
  requireDatabaseUrl: true,
});

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runComprehensiveAudit() {
  console.log('================================================================');
  console.log('🎯 TOÀN DIỆN KIỂM ĐỊNH HỆ THỐNG: DATABASE, AUTH & END-TO-END FLOW');
  console.log('================================================================\n');

  const pgClient = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await pgClient.connect();

  let passCount = 0;
  let failCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passCount++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failCount++;
    }
  }

  // -------------------------------------------------------------
  // TEST SECTION 1: CẤU TRÚC DỮ LIỆU & RÀNG BUỘC DATABASE (ZERO ORPHANS)
  // -------------------------------------------------------------
  console.log('📌 PHẦN 1: KIỂM ĐỊNH TOÀN VẸN DATABASE (STORES & SURPRISE BAGS)');

  // 1.1 Kiểm tra Foreign Keys của stores -> users
  const { rows: orphanStores } = await pgClient.query(`
    SELECT s.id, s.name, s.owner_user_id
    FROM stores s
    LEFT JOIN users u ON s.owner_user_id = u.id
    WHERE u.id IS NULL
  `);
  assert(orphanStores.length === 0, `Không có cửa hàng nào bị mồ côi owner (orphan stores: ${orphanStores.length})`);

  // 1.2 Kiểm tra Foreign Keys của surprise_bags -> stores
  const { rows: orphanBags } = await pgClient.query(`
    SELECT b.id, b.name, b.store_id
    FROM surprise_bags b
    LEFT JOIN stores s ON b.store_id = s.id
    WHERE s.id IS NULL
  `);
  assert(orphanBags.length === 0, `Không có túi hàng nào bị mồ côi store (orphan bags: ${orphanBags.length})`);

  // 1.3 Đếm tổng số cửa hàng & túi hàng
  const { rows: storeCounts } = await pgClient.query(`SELECT count(*)::int as count FROM stores WHERE deleted_at IS NULL`);
  const { rows: bagCounts } = await pgClient.query(`SELECT count(*)::int as count FROM surprise_bags WHERE deleted_at IS NULL`);
  assert(storeCounts[0].count === 54, `Tổng số cửa hàng hoạt động chuẩn xác: ${storeCounts[0].count} / 54`);
  assert(bagCounts[0].count >= 113, `Tổng số túi hàng hoạt động chuẩn xác: ${bagCounts[0].count} túi`);

  // 1.4 Kiểm tra ảnh của 100% túi hàng
  const { rows: invalidImageBags } = await pgClient.query(`
    SELECT id, name, image_url
    FROM surprise_bags
    WHERE image_url IS NULL 
       OR image_url = '' 
       OR (
         image_url NOT LIKE 'https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/%'
         AND image_url NOT LIKE 'https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/bag-photos/%'
         AND image_url NOT LIKE 'https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/bag-images/%'
       )
  `);
  assert(invalidImageBags.length === 0, `100% túi hàng sử dụng ảnh thật từ Supabase Storage buckets (lỗi: ${invalidImageBags.length})`);

  // -------------------------------------------------------------
  // TEST SECTION 2: CÁCH LY TÀI KHOẢN ĐỐI TÁC (MERCHANT 1:1 STORE)
  // -------------------------------------------------------------
  console.log('\n📌 PHẦN 2: KIỂM ĐỊNH TÁCH BIỆT TÀI KHOẢN ĐỐI TÁC (ZERO OVERLAP)');

  // 2.1 Đăng nhập merchant@gosavingfood.vn với Password123!
  const vnClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: vnAuth, error: vnAuthErr } = await vnClient.auth.signInWithPassword({
    email: 'merchant@gosavingfood.vn',
    password: 'Password123!',
  });
  assert(!vnAuthErr && vnAuth.user, 'merchant@gosavingfood.vn đăng nhập thành công với Password123!');

  // 2.2 Kiểm tra danh sách cửa hàng của merchant@gosavingfood.vn
  const { data: vnStores, error: vnStoresErr } = await vnClient
    .from('stores')
    .select('id, name')
    .eq('owner_user_id', vnAuth.user.id);
  assert(!vnStoresErr && vnStores?.length === 1, `merchant@gosavingfood.vn chỉ sở hữu DUY NHẤT 1 cửa hàng (count: ${vnStores?.length})`);
  assert(vnStores?.[0]?.name === 'KFC Vietnam - Bà Triệu', `Cửa hàng của merchant@gosavingfood.vn chính xác là: "${vnStores?.[0]?.name}"`);

  // 2.3 Đăng nhập merchant@gosavingfood.app với Password1234
  const appClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: appAuth, error: appAuthErr } = await appClient.auth.signInWithPassword({
    email: 'merchant@gosavingfood.app',
    password: 'Password1234',
  });
  assert(!appAuthErr && appAuth.user, 'merchant@gosavingfood.app đăng nhập thành công với Password1234');

  // 2.4 Kiểm tra danh sách cửa hàng của merchant@gosavingfood.app
  const { data: appStores, error: appStoresErr } = await appClient
    .from('stores')
    .select('id, name')
    .eq('owner_user_id', appAuth.user.id);
  assert(!appStoresErr && appStores?.length === 1, `merchant@gosavingfood.app chỉ sở hữu DUY NHẤT 1 cửa hàng (count: ${appStores?.length})`);
  assert(appStores?.[0]?.name === 'Bếp Chay An Lạc - Cổ Nhuế', `Cửa hàng của merchant@gosavingfood.app chính xác là: "${appStores?.[0]?.name}"`);

  // 2.5 Kiểm tra cấm đăng nhập chéo mật khẩu
  const { error: cross1 } = await vnClient.auth.signInWithPassword({
    email: 'merchant@gosavingfood.vn',
    password: 'Password1234',
  });
  assert(Boolean(cross1), 'merchant@gosavingfood.vn BỊ TỪ CHỐI khi dùng mật khẩu Password1234');

  const { error: cross2 } = await appClient.auth.signInWithPassword({
    email: 'merchant@gosavingfood.app',
    password: 'Password123!',
  });
  assert(Boolean(cross2), 'merchant@gosavingfood.app BỊ TỪ CHỐI khi dùng mật khẩu Password123!');

  // -------------------------------------------------------------
  // TEST SECTION 3: ĐỒNG BỘ 1:1 GIỮA CUSTOMER HANOI_BAGS VÀ DATABASE
  // -------------------------------------------------------------
  console.log('\n📌 PHẦN 3: KIỂM ĐỊNH ĐỒNG BỘ DỮ LIỆU FRONTEND FALLBACK (1:1 SYNC)');

  const serviceCode = readFileSync('apps/customer/src/services/customer.service.ts', 'utf8');
  const match = serviceCode.match(/export const HANOI_BAGS: SurpriseBag\[\] = (\[[\s\S]*?\n\]);/);
  assert(Boolean(match), 'Tìm thấy mảng HANOI_BAGS trong customer.service.ts');
  const hanoiBags = JSON.parse(match[1]);

  const { rows: dbBags } = await pgClient.query(`SELECT id, image_url, name FROM surprise_bags WHERE deleted_at IS NULL`);
  const dbBagMap = new Map(dbBags.map(b => [b.id, b]));

  let syncMismatches = 0;
  for (const h of hanoiBags) {
    const d = dbBagMap.get(h.id);
    if (!d || d.image_url !== h.imageUrl) {
      syncMismatches++;
    }
  }
  assert(syncMismatches === 0, `0 sai lệch giữa Database và fallback HANOI_BAGS (Mismatches: ${syncMismatches}/${hanoiBags.length})`);

  // -------------------------------------------------------------
  // TEST SECTION 4: LUỒNG END-TO-END: ĐẶT ĐƠN -> RLS CÁCH LY -> NOTIFICATION
  // -------------------------------------------------------------
  console.log('\n📌 PHẦN 4: KIỂM ĐỊNH LUỒNG ĐẶT ĐƠN & CÁCH LY THÔNG BÁO (RLS DATA ISOLATION)');

  // 4.1 Tạo tài khoản khách hàng audit bằng Admin API (tránh rate limit email)
  const custEmail = `audit_order_${Date.now()}@gmail.com`;
  const { data: createdCust, error: crtErr } = await supabaseAdmin.auth.admin.createUser({
    email: custEmail,
    password: 'SecureCustomer123!',
    email_confirm: true,
    user_metadata: { name: 'Khách Hàng Audit', phone: '0912345678', role: 'customer' },
  });
  assert(!crtErr && createdCust?.user, `Tạo tài khoản khách hàng audit thành công: ${custEmail}`);

  // Đăng nhập khách hàng
  const customerClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: custLogin, error: custLoginErr } = await customerClient.auth.signInWithPassword({
    email: custEmail,
    password: 'SecureCustomer123!',
  });
  assert(!custLoginErr && custLogin.user, `Khách hàng audit đăng nhập phiên làm việc thành công`);

  // Lấy 1 túi hàng ĐANG HOẠT ĐỘNG của KFC Vietnam
  const kfcStoreId = vnStores[0].id;
  const { rows: kfcBags } = await pgClient.query(`
    SELECT id, name, original_price, discount_price, quantity 
    FROM surprise_bags 
    WHERE store_id = $1 AND quantity > 0 AND deleted_at IS NULL
    LIMIT 1
  `, [kfcStoreId]);
  assert(kfcBags.length > 0, `Tìm thấy túi hàng hoạt động tại KFC Vietnam: "${kfcBags[0].name}" (stock: ${kfcBags[0].quantity})`);

  const bagToOrder = kfcBags[0];
  const initialStock = bagToOrder.quantity;
  const newOrderId = crypto.randomUUID();
  const idempotencyKey = `audit_idem_${Date.now()}`;

  // Đặt hàng qua RPC place_order theo đúng schema
  const { data: placedOrder, error: orderErr } = await customerClient.rpc('place_order', {
    p_id: newOrderId,
    p_store_id: kfcStoreId,
    p_idempotency_key: idempotencyKey,
    p_items: [{ bagId: bagToOrder.id, quantity: 1 }],
    p_voucher_code: null,
    p_pickup_time: new Date(Date.now() + 3600000).toISOString(),
    p_payment_method: 'payos_vietqr',
    p_note: 'Kiểm định đơn hàng thông suốt',
    p_total_original_price: Number(bagToOrder.original_price),
    p_total_discount_price: Number(bagToOrder.discount_price),
    p_discount_amount: 0,
    p_final_amount: Number(bagToOrder.discount_price),
    p_qr_code: `GSF-QR-AUDIT-${newOrderId.slice(0, 8)}`,
    p_recipient_name: 'Khách Hàng Audit',
    p_recipient_phone: '0912345678'
  });

  assert(!orderErr && placedOrder?.success, `Khách hàng đặt đơn thành công tại KFC: Order #${newOrderId}`);

  // 4.2 Kiểm tra trừ tồn kho chính xác (không âm, trừ đúng 1)
  const { rows: afterStock } = await pgClient.query(`SELECT quantity FROM surprise_bags WHERE id = $1`, [bagToOrder.id]);
  assert(afterStock[0].quantity === initialStock - 1, `Tồn kho túi hàng đã được trừ chính xác (${initialStock} -> ${afterStock[0].quantity})`);

  // 4.3 Kiểm tra RLS: merchant@gosavingfood.vn (chủ KFC) PHẢI đọc được đơn hàng này
  const { data: vnOrderCheck, error: vnOrderErr } = await vnClient
    .from('orders')
    .select('id, store_id, total_original_price, status')
    .eq('id', newOrderId)
    .maybeSingle();
  assert(!vnOrderErr && vnOrderCheck?.id === newOrderId, `merchant@gosavingfood.vn xem được đơn hàng của chính quán mình qua RLS`);

  // 4.4 Kiểm tra RLS: merchant@gosavingfood.app (chủ quán khác) TUYỆT ĐỐI KHÔNG ĐƯỢC đọc đơn hàng này
  const { data: appOrderCheck } = await appClient
    .from('orders')
    .select('id, store_id')
    .eq('id', newOrderId)
    .maybeSingle();
  assert(!appOrderCheck, `merchant@gosavingfood.app BỊ CHẶN HOÀN TOÀN bởi RLS (không thể xem đơn của KFC)`);

  // 4.5 Cập nhật đơn hàng thanh toán thành công (kích hoạt notify_store_new_order trigger)
  await pgClient.query(`
    UPDATE orders 
    SET payment_status = 'success', status = 'paid' 
    WHERE id = $1
  `, [newOrderId]);

  // Kiểm tra thông báo sinh tự động cho chủ KFC
  const { rows: notifs } = await pgClient.query(`
    SELECT id, user_id, title, body
    FROM notifications
    WHERE user_id = $1 AND (data->>'orderId' = $2 OR body ILIKE $3)
  `, [vnAuth.user.id, newOrderId, `%${newOrderId.slice(0, 6)}%`]);
  assert(notifs.length > 0, `Trigger notify_store_new_order tự động sinh thông báo cho chủ KFC (notifications count: ${notifs.length})`);

  // 4.6 Kiểm tra RLS: merchant@gosavingfood.app KHÔNG THỂ đọc thông báo của chủ KFC
  const { data: appNotifs } = await appClient
    .from('notifications')
    .select('id, title')
    .eq('id', notifs[0]?.id);
  assert(!appNotifs || appNotifs.length === 0, `merchant@gosavingfood.app BỊ CHẶN bởi RLS (không đọc được thông báo của KFC)`);

  // 4.7 Dọn dẹp dữ liệu đơn hàng audit
  console.log('\n🧹 Dọn dẹp dữ liệu kiểm định...');
  await pgClient.query(`UPDATE surprise_bags SET quantity = $1 WHERE id = $2`, [initialStock, bagToOrder.id]);
  await supabaseAdmin.from('notifications').delete().eq('user_id', vnAuth.user.id).ilike('body', `%${newOrderId.slice(0, 6)}%`);
  await supabaseAdmin.from('order_items').delete().eq('order_id', newOrderId);
  await supabaseAdmin.from('orders').delete().eq('id', newOrderId);
  await supabaseAdmin.auth.admin.deleteUser(createdCust.user.id);
  console.log('✅ Đã hoàn trả tồn kho và dọn dẹp đơn hàng test sạch sẽ.');

  await pgClient.end();

  // -------------------------------------------------------------
  // TỔNG KẾT KẾT QUẢ
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`📊 TỔNG KẾT KẾT QUẢ KIỂM ĐỊNH:`);
  console.log(`   - TỔNG SỐ BÀI TEST: ${passCount + failCount}`);
  console.log(`   - THÀNH CÔNG:       ${passCount} / ${passCount + failCount} (${((passCount / (passCount + failCount)) * 100).toFixed(1)}%)`);
  console.log(`   - THẤT BẠI:         ${failCount}`);
  console.log('================================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runComprehensiveAudit().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
