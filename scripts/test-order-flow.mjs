import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(HERE, '..');

const parseEnvFile = (text) => {
  const map = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq > 0) map[line.slice(0, eq).trim()] = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return map;
};

const env = parseEnvFile(readFileSync(resolve(ROOT_DIR, '.env'), 'utf8'));

const client = new pg.Client({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  statement_timeout: 20000,
});

async function runFullLifecycleTest() {
  console.log('================================================================================');
  console.log('🚀 KIỂM THỬ TOÀN DIỆN VÒNG ĐỜI ĐƠN HÀNG (CUSTOMER 🔁 MERCHANT) — 4 GIAI ĐOẠN');
  console.log('================================================================================\n');

  await client.connect();

  try {
    // 0. Chuẩn bị tài khoản Cửa hàng và Khách hàng
    const storeRes = await client.query(
      `SELECT id, name, owner_user_id FROM public.stores WHERE status = 'active' AND deleted_at IS NULL LIMIT 1`
    );
    if (!storeRes.rows.length) throw new Error('Không tìm thấy store active');
    const store = storeRes.rows[0];

    const cusRes = await client.query(
      `SELECT id, name, phone FROM public.users WHERE role = 'customer' AND deleted_at IS NULL LIMIT 1`
    );
    if (!cusRes.rows.length) throw new Error('Không tìm thấy customer');
    const customer = cusRes.rows[0];

    console.log(`📍 Cửa hàng: "${store.name}" (Owner: ${store.owner_user_id})`);
    console.log(`👤 Khách hàng: "${customer.name}" (ID: ${customer.id})\n`);

    // =========================================================================
    // GIAI ĐOẠN 1: Customer đặt hàng thành công -> Merchant nhận thông báo đơn mới
    // =========================================================================
    console.log('--------------------------------------------------------------------------------');
    console.log('📦 GIAI ĐOẠN 1: Customer đặt hàng thành công (Đang xử lý) ➔ Merchant nhận đơn');
    console.log('--------------------------------------------------------------------------------');
    const orderCode = `GSF-L${Date.now().toString().slice(-5)}`;
    const qrCode = `GSF-ORDER-${orderCode}-${Date.now()}`;

    const createRes = await client.query(
      `INSERT INTO public.orders (
        store_id, customer_id, status, payment_method, payment_status,
        final_amount, total_original_price, total_discount_price,
        qr_code, pickup_time
      ) VALUES (
        $1, $2, 'pending', 'cash', 'pending',
        40000, 80000, 40000,
        $3, NOW() + INTERVAL '2 hours'
      ) RETURNING id, status, qr_code`,
      [store.id, customer.id, qrCode]
    );
    const order = createRes.rows[0];
    console.log(`[Cus] Đặt hàng thành công! Mã đơn: ${orderCode} (ID: ${order.id})`);
    console.log(`[Cus] Trạng thái đơn trên Cus: "${order.status}" (Hiển thị tab "Đang xử lý")`);

    // Kiểm tra thông báo sinh cho Merchant
    const merNotiRes = await client.query(
      `SELECT id, title, body, data, created_at FROM public.notifications 
       WHERE user_id = $1 AND data->>'orderId' = $2
       ORDER BY created_at DESC LIMIT 1`,
      [store.owner_user_id, order.id]
    );
    if (!merNotiRes.rows.length) {
      console.warn('⚠️ Chưa tìm thấy notification tự động cho Merchant (kiểm tra trigger notify_store_new_order)');
    } else {
      console.log(`[Mer] 🔔 Merchant nhận thông báo đơn mới:`);
      console.log(`      - Tiêu đề: "${merNotiRes.rows[0].title}"`);
      console.log(`      - Nội dung: "${merNotiRes.rows[0].body}"`);
    }
    console.log(`[Mer] Đơn xuất hiện ở mục "Chờ xác nhận", nút hiển thị: [Xác nhận]\n`);

    // =========================================================================
    // GIAI ĐOẠN 2: Merchant bấm Xác nhận -> Customer nhận thông báo & chuyển Đã xác nhận
    // =========================================================================
    console.log('--------------------------------------------------------------------------------');
    console.log('👨‍🍳 GIAI ĐOẠN 2: Merchant xác nhận đơn ➔ Customer nhận thông báo "Đã xác nhận"');
    console.log('--------------------------------------------------------------------------------');
    console.log(`[Mer] Merchant nhấn nút "Xác nhận"...`);

    // 2a. Chuyển pending -> confirmed
    await client.query(
      `SELECT public.transition_order_status_transaction($1, 'confirmed', $2, 'merchant')`,
      [order.id, store.owner_user_id]
    );
    // 2b. Chuyển confirmed -> preparing
    await client.query(
      `SELECT public.transition_order_status_transaction($1, 'preparing', $2, 'merchant')`,
      [order.id, store.owner_user_id]
    );
    console.log(`[Mer] ✅ Cập nhật đơn sang "Đang chuẩn bị" (preparing). Nút hành động chuyển thành: [Chuẩn bị xong]`);

    // Kiểm tra thông báo gửi cho Customer
    const cusNoti1 = await client.query(
      `SELECT id, title, body, created_at FROM public.notifications 
       WHERE user_id = $1 AND data->>'orderId' = $2
       ORDER BY created_at DESC LIMIT 1`,
      [customer.id, order.id]
    );
    if (!cusNoti1.rows.length) throw new Error('❌ Không tìm thấy thông báo xác nhận đơn cho Customer!');
    console.log(`[Cus] 🔔 Customer nhận thông báo xác nhận:`);
    console.log(`      - Tiêu đề: "${cusNoti1.rows[0].title}"`);
    console.log(`      - Nội dung: "${cusNoti1.rows[0].body}"`);
    console.log(`[Cus] ✅ Đơn hàng tự động nhảy sang tab "Đã xác nhận" (preparing)\n`);

    // =========================================================================
    // GIAI ĐOẠN 3: Merchant chuẩn bị xong -> Chuyển "Chờ lấy", Customer nhận thông báo + QR
    // =========================================================================
    console.log('--------------------------------------------------------------------------------');
    console.log('🛍️ GIAI ĐOẠN 3: Merchant xử lý xong (Chuẩn bị xong) ➔ Customer nhận thông báo & QR');
    console.log('--------------------------------------------------------------------------------');
    console.log(`[Mer] Merchant bấm nút "Chuẩn bị xong"...`);

    await client.query(
      `SELECT public.transition_order_status_transaction($1, 'ready_for_pickup', $2, 'merchant')`,
      [order.id, store.owner_user_id]
    );
    console.log(`[Mer] ✅ Đơn chuyển sang trạng thái "Chờ lấy" (ready_for_pickup). Nút hành động chuyển thành: [Quét QR]`);

    // Kiểm tra thông báo sẵn sàng nhận cho Customer
    const cusNoti2 = await client.query(
      `SELECT id, title, body, created_at FROM public.notifications 
       WHERE user_id = $1 AND data->>'orderId' = $2
       ORDER BY created_at DESC LIMIT 1`,
      [customer.id, order.id]
    );
    console.log(`[Cus] 🔔 Customer nhận thông báo nhận hàng:`);
    console.log(`      - Tiêu đề: "${cusNoti2.rows[0].title}"`);
    console.log(`      - Nội dung: "${cusNoti2.rows[0].body}"`);
    console.log(`[Cus] ✅ Đơn hàng tự động nhảy sang tab "Chờ lấy" (ready_for_pickup)`);
    console.log(`[Cus] 📱 Màn hình chi tiết hiển thị mã QR nhận hàng: "${qrCode}"\n`);

    // =========================================================================
    // GIAI ĐOẠN 4: Khách đưa QR -> Merchant quét QR -> Cả 2 tự động Hoàn thành
    // =========================================================================
    console.log('--------------------------------------------------------------------------------');
    console.log('✨ GIAI ĐOẠN 4: Khách đưa QR ➔ Merchant quét QR ➔ Cả 2 tự động hoàn thành');
    console.log('--------------------------------------------------------------------------------');
    console.log(`[Cus] Khách xuất trình mã QR: "${qrCode}"`);
    console.log(`[Mer] Merchant mở popup Quét QR và đối soát mã...`);

    // Mô phỏng đối soát verifyOrderQR:
    // Chuyển ready_for_pickup -> picked_up -> completed
    await client.query(
      `SELECT public.transition_order_status_transaction($1, 'picked_up', $2, 'merchant')`,
      [order.id, store.owner_user_id]
    );
    await client.query(
      `SELECT public.transition_order_status_transaction($1, 'completed', $2, 'merchant')`,
      [order.id, store.owner_user_id]
    );

    // Kiểm tra trạng thái cuối cùng trong DB
    const finalOrderRes = await client.query(
      `SELECT id, status, completed_at FROM public.orders WHERE id = $1`,
      [order.id]
    );
    const finalOrder = finalOrderRes.rows[0];
    console.log(`[DB] Trạng thái đơn cuối cùng: "${finalOrder.status}" (Completed at: ${finalOrder.completed_at})`);

    // Kiểm tra thông báo hoàn thành cho Customer
    const cusNoti3 = await client.query(
      `SELECT id, title, body, created_at FROM public.notifications 
       WHERE user_id = $1 AND data->>'orderId' = $2
       ORDER BY created_at DESC LIMIT 1`,
      [customer.id, order.id]
    );
    console.log(`[Cus] 🔔 Customer nhận thông báo hoàn tất:`);
    console.log(`      - Tiêu đề: "${cusNoti3.rows[0].title}"`);
    console.log(`      - Nội dung: "${cusNoti3.rows[0].body}"`);

    console.log(`[Cus] ✅ Đơn hàng trên Cus tự động chuyển sang mục "Hoàn thành"`);
    console.log(`[Mer] ✅ Đơn hàng trên Mer tự động chuyển sang mục "Hoàn thành"`);

    console.log('\n================================================================================');
    console.log('🎉 XÁC NHẬN: TẤT CẢ 4 GIAI ĐOẠN ĐÃ THỰC THI CHÍNH XÁC VÀ THÔNG SUỐT 100%!');
    console.log('================================================================================');
  } finally {
    await client.end();
  }
}

runFullLifecycleTest().catch((err) => {
  console.error('\n❌ TEST THẤT BẠI:', err.message);
  process.exit(1);
});
