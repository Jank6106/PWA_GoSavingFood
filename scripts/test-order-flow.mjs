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
    if (eq <= 0) continue;
    map[line.slice(0, eq).trim()] = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return map;
};

const env = parseEnvFile(readFileSync(resolve(ROOT_DIR, '.env'), 'utf8'));

const client = new pg.Client({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  statement_timeout: 20000,
});

async function runTest() {
  console.log('=== TEST LUỒNG XỬ LÝ ĐƠN HÀNG: TRẠNG THÁI A -> B & ĐỒNG BỘ CUS + NOTIFICATION ===\n');

  await client.connect();

  try {
    // 1. Lấy store đang active
    const storeRes = await client.query(
      `SELECT id, name, owner_user_id FROM public.stores WHERE status = 'active' AND deleted_at IS NULL LIMIT 1`
    );
    if (!storeRes.rows.length) throw new Error('Không tìm thấy store active');
    const store = storeRes.rows[0];
    console.log(`[Store] "${store.name}" (ID: ${store.id}, Owner: ${store.owner_user_id})`);

    // 2. Lấy 1 customer
    const cusRes = await client.query(
      `SELECT id, name, phone FROM public.users WHERE role = 'customer' AND deleted_at IS NULL LIMIT 1`
    );
    if (!cusRes.rows.length) throw new Error('Không tìm thấy customer');
    const customer = cusRes.rows[0];
    console.log(`[Customer] "${customer.name}" (ID: ${customer.id})`);

    // 3. Tạo 1 đơn hàng mới ở trạng thái A ('pending')
    const orderCode = `GSF-T${Date.now().toString().slice(-5)}`;
    const insertRes = await client.query(
      `INSERT INTO public.orders (
        store_id, customer_id, status, payment_method, payment_status,
        final_amount, total_original_price, total_discount_price,
        qr_code, pickup_time
      ) VALUES (
        $1, $2, 'pending', 'cash', 'pending',
        35000, 70000, 35000,
        $3, NOW() + INTERVAL '2 hours'
      ) RETURNING id, status, qr_code`,
      [store.id, customer.id, orderCode]
    );
    const newOrder = insertRes.rows[0];
    console.log(`\n[Bước 1 - Tạo đơn] Đã tạo đơn ${newOrder.qr_code} (ID: ${newOrder.id})`);
    console.log(`         Trạng thái ban đầu (Trạng thái A): "${newOrder.status}"`);

    // 4. Merchant bấm Xác nhận: gọi transition_order_status_transaction từ pending -> confirmed -> preparing
    console.log('\n[Bước 2 - Mer Xác nhận đơn]');
    console.log('         Merchant gọi hàm RPC transition_order_status_transaction...');

    // 4a. pending -> confirmed
    await client.query(
      `SELECT public.transition_order_status_transaction($1, 'confirmed', $2, 'merchant')`,
      [newOrder.id, store.owner_user_id]
    );

    // 4b. confirmed -> preparing (Trạng thái B)
    await client.query(
      `SELECT public.transition_order_status_transaction($1, 'preparing', $2, 'merchant')`,
      [newOrder.id, store.owner_user_id]
    );
    console.log('         ✅ Chuyển trạng thái thành công sang Trạng thái B ("preparing")');

    // 5. Kiểm tra dữ liệu đơn hàng cập nhật trên Database
    const orderCheck = await client.query(
      `SELECT id, status, updated_at FROM public.orders WHERE id = $1`,
      [newOrder.id]
    );
    console.log(`\n[Bước 3 - Kiểm tra DB] Trạng thái đơn hiện tại: "${orderCheck.rows[0].status}"`);

    // 6. Kiểm tra thông báo sinh ra cho Customer trong bảng notifications
    const notiRes = await client.query(
      `SELECT id, title, body, data, created_at FROM public.notifications 
       WHERE user_id = $1 AND data->>'orderId' = $2
       ORDER BY created_at DESC LIMIT 1`,
      [customer.id, newOrder.id]
    );

    if (!notiRes.rows.length) {
      throw new Error('❌ Chưa tìm thấy notification sinh ra cho khách hàng!');
    }

    const noti = notiRes.rows[0];
    console.log('\n[Bước 4 - Kiểm tra Notification Khách hàng]');
    console.log(`         ✅ Đã tìm thấy thông báo tự động cho Khách hàng:`);
    console.log(`         - Tiêu đề: "${noti.title}"`);
    console.log(`         - Nội dung: "${noti.body}"`);
    console.log(`         - Thời gian: ${noti.created_at}`);

    console.log('\n=============================================================');
    console.log('🎉 TOÀN BỘ LUỒNG XỬ LÝ ĐƠN HÀNG THÀNH CÔNG VÀ ĐÃ THÔNG SUỐT!');
    console.log('=============================================================');
  } finally {
    await client.end();
  }
}

runTest().catch((err) => {
  console.error('\n❌ TEST THẤT BẠI:', err.message);
  process.exit(1);
});
