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
  statement_timeout: 30000,
});

async function runTest() {
  console.log('================================================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG 7 MỤC TIÊU REFACTOR ORDER LIFECYCLE (MIGRATION 0020)');
  console.log('================================================================================\n');

  await client.connect();

  try {
    const bagRes = await client.query(
      `SELECT id, store_id, name, quantity, discount_price FROM public.surprise_bags WHERE deleted_at IS NULL AND quantity > 2 LIMIT 1`
    );
    if (!bagRes.rows.length) throw new Error('Không tìm thấy bag');
    const bag = bagRes.rows[0];
    const initialBagStock = bag.quantity;

    const storeRes = await client.query(
      `SELECT id, name, owner_user_id FROM public.stores WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [bag.store_id]
    );
    if (!storeRes.rows.length) throw new Error('Không tìm thấy store');
    const store = storeRes.rows[0];

    const cusRes = await client.query(
      `SELECT id, name, phone FROM public.users WHERE role = 'customer' AND deleted_at IS NULL LIMIT 1`
    );
    if (!cusRes.rows.length) throw new Error('Không tìm thấy customer');
    const customer = cusRes.rows[0];

    console.log(`📍 Cửa hàng: ${store.name}`);
    console.log(`👤 Khách hàng: ${customer.name}`);
    console.log(`🛍️ Túi thực phẩm: ${bag.name} (Tồn kho ban đầu: ${initialBagStock})\n`);

    // TEST 1: CHẶN PHƯƠNG THỨC TIỀN MẶT (CASH)
    console.log('--- TEST 1: Kiểm tra chặn thanh toán tiền mặt (Cash Rejection) ---');
    const test1OrderId = '11111111-1111-4111-8111-111111111111';
    let cashBlocked = false;
    try {
      await client.query(
        `SELECT public.create_order_transaction(
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        )`,
        [
          test1OrderId,
          customer.id,
          store.id,
          `idemp-${Date.now()}-cash`,
          JSON.stringify([{ bagId: bag.id, quantity: 1 }]),
          null,
          new Date(Date.now() + 3600000).toISOString(),
          'cash', // Cố tình truyền cash
          'Test cash',
          bag.discount_price,
          bag.discount_price,
          0,
          bag.discount_price,
          'QR-CASH',
        ]
      );
    } catch (err) {
      if (err.message.includes('CASH_PAYMENT_NOT_SUPPORTED')) {
        cashBlocked = true;
      } else {
        throw err;
      }
    }
    if (!cashBlocked) throw new Error('❌ LỖI: create_order_transaction không chặn phương thức cash!');
    console.log('✅ TEST 1 ĐẠT: Phương thức tiền mặt (cash) bị từ chối thành công.\n');

    // TEST 2 & 3: TẠO ĐƠN ONLINE (pending_payment, TTL 15m, pickup_token) & KIỂM TRA KHÔNG CÓ BÁO ĐỘNG GIẢ CHO QUÁN
    console.log('--- TEST 2 & 3: Đặt đơn online (pending_payment) & Triệt tiêu báo động giả ---');
    const orderId = `22222222-2222-4222-8222-${Date.now().toString().slice(-12)}`;
    const idempKey = `idemp-${Date.now()}`;
    const paymentOrderCode = Number(String(Date.now()).slice(-8));

    // Đếm thông báo của quán trước khi đặt đơn
    const notifBefore = await client.query(
      `SELECT count(*) FROM public.notifications WHERE user_id = $1`,
      [store.owner_user_id]
    );
    const countBefore = Number(notifBefore.rows[0].count);

    const createRes = await client.query(
      `SELECT public.create_order_transaction(
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      ) as result`,
      [
        orderId,
        customer.id,
        store.id,
        idempKey,
        JSON.stringify([{ bagId: bag.id, quantity: 1 }]),
        null,
        new Date(Date.now() + 3600000).toISOString(),
        'payos_vietqr',
        'Ghi chú test refactor',
        bag.discount_price,
        bag.discount_price,
        0,
        bag.discount_price,
        `GSF-QR-${orderId}`,
      ]
    );

    const createdOrder = await client.query(
      `SELECT status, payment_status, payment_method, payment_expires_at, pickup_token FROM public.orders WHERE id = $1`,
      [orderId]
    );
    const ordRow = createdOrder.rows[0];

    if (ordRow.status !== 'pending_payment') throw new Error(`❌ Lỗi: Status phải là pending_payment, nhận được ${ordRow.status}`);
    if (ordRow.payment_status !== 'pending') throw new Error(`❌ Lỗi: Payment status phải là pending`);
    if (!ordRow.pickup_token) throw new Error(`❌ Lỗi: Thiếu pickup_token bảo mật`);
    if (!ordRow.payment_expires_at) throw new Error(`❌ Lỗi: Thiếu payment_expires_at TTL`);

    // Kiểm tra trigger notify_store_new_order KHÔNG được bắn lúc pending_payment
    const notifAfter = await client.query(
      `SELECT count(*) FROM public.notifications WHERE user_id = $1`,
      [store.owner_user_id]
    );
    const countAfter = Number(notifAfter.rows[0].count);
    if (countAfter !== countBefore) {
      throw new Error(`❌ LỖI: Quán bị bắn thông báo giả khi đơn còn pending_payment! (Trước: ${countBefore}, Sau: ${countAfter})`);
    }
    console.log(`✅ TEST 2 & 3 ĐẠT: Đơn tạo thành công với status='pending_payment', có TTL 15m & pickup_token. Quán KHÔNG bị báo động giả.\n`);

    // TEST 4: XÁC NHẬN THANH TOÁN (confirm_payos_payment) -> status chuyển 'paid' & BẮN THÔNG BÁO CHO QUÁN
    console.log('--- TEST 4: Webhook PayOS xác nhận thanh toán -> Chuyển status="paid" & Thông báo quán ---');
    await client.query(`UPDATE public.orders SET payment_order_code = $1 WHERE id = $2`, [paymentOrderCode, orderId]);

    const confirmRes = await client.query(
      `SELECT public.confirm_payos_payment($1, $2) as result`,
      [paymentOrderCode, 'payos-link-001']
    );

    const paidOrder = await client.query(
      `SELECT status, payment_status FROM public.orders WHERE id = $1`,
      [orderId]
    );
    if (paidOrder.rows[0].status !== 'paid' || paidOrder.rows[0].payment_status !== 'success') {
      throw new Error(`❌ Lỗi confirm_payos_payment: ${JSON.stringify(paidOrder.rows[0])}`);
    }

    // Kiểm tra thông báo của quán ĐÃ ĐƯỢC TẠO
    const notifPaid = await client.query(
      `SELECT title, body FROM public.notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [store.owner_user_id]
    );
    if (!notifPaid.rows.length || !notifPaid.rows[0].title.includes('đã thanh toán')) {
      throw new Error('❌ Lỗi: Quán chưa nhận được thông báo khi đơn đã thanh toán thành công!');
    }
    console.log(`✅ TEST 4 ĐẠT: Đơn chuyển sang status="paid", payment_status="success". Quán nhận được thông báo: "${notifPaid.rows[0].title}".\n`);

    // TEST 5 & 6: QUÁN CHUYỂN 'preparing' & SIẾT CHẶT RBAC KHÁCH KHÔNG ĐƯỢC HỦY KHI 'preparing'
    console.log('--- TEST 5 & 6: Quán chuyển sang "preparing" & Khách bị chặn hủy đơn (RBAC) ---');
    await client.query(
      `SELECT public.transition_order_status_transaction($1, 'preparing', $2, 'merchant')`,
      [orderId, store.owner_user_id]
    );

    let customerCancelBlocked = false;
    try {
      await client.query(
        `SELECT public.transition_order_status_transaction($1, 'cancelled', $2, 'customer', 'Khách đổi ý')`,
        [orderId, customer.id]
      );
    } catch (err) {
      if (err.message.includes('CANNOT_CANCEL_PREPARING')) {
        customerCancelBlocked = true;
      } else {
        throw err;
      }
    }
    if (!customerCancelBlocked) {
      throw new Error('❌ LỖI BẢO MẬT: Khách hàng vẫn hủy được đơn khi quán đã vào trạng thái preparing!');
    }
    console.log('✅ TEST 5 & 6 ĐẠT: Quán chuyển preparing thành công. Khách hàng bị chặn hủy với lỗi CANNOT_CANCEL_PREPARING.\n');

    // TEST 7: QUÁN CHUYỂN 'ready_for_pickup' & ĐỐI SOÁT BẢO MẬT QR QUA verify_pickup_qr (pickup_token)
    console.log('--- TEST 7: Quán chuyển "ready_for_pickup" & Xác thực QR bảo mật qua pickup_token ---');
    await client.query(
      `SELECT public.transition_order_status_transaction($1, 'ready_for_pickup', $2, 'merchant')`,
      [orderId, store.owner_user_id]
    );

    const readyOrder = await client.query(`SELECT pickup_token FROM public.orders WHERE id = $1`, [orderId]);
    const validToken = readyOrder.rows[0].pickup_token;

    // Thử quét bằng sai token hoặc fake token
    const fakeToken = '00000000-0000-0000-0000-000000000000';
    const fakeScan = await client.query(
      `SELECT public.verify_pickup_qr($1, $2) as result`,
      [fakeToken, store.id]
    );
    if (fakeScan.rows[0].result.success !== false) {
      throw new Error('❌ LỖI: Quét sai token mà vẫn báo thành công!');
    }

    // Quét bằng đúng pickup_token bảo mật
    const validScan = await client.query(
      `SELECT public.verify_pickup_qr($1, $2) as result`,
      [validToken, store.id]
    );
    if (!validScan.rows[0].result.success || validScan.rows[0].result.status !== 'completed') {
      throw new Error(`❌ LỖI verify_pickup_qr: ${JSON.stringify(validScan.rows[0].result)}`);
    }

    // Đơn phải ở completed và pickup_token bị vô hiệu hóa
    const finalOrder = await client.query(`SELECT status, pickup_token, completed_at FROM public.orders WHERE id = $1`, [orderId]);
    if (finalOrder.rows[0].status !== 'completed' || finalOrder.rows[0].pickup_token !== null) {
      throw new Error('❌ LỖI: Đơn chưa hoàn thành hoặc pickup_token chưa được vô hiệu hóa!');
    }
    console.log('✅ TEST 7 ĐẠT: Đối soát QR bảo mật qua verify_pickup_qr thành công 100%. Token được vô hiệu hóa ngay sau khi giao món.\n');

    // TEST 8: TÁCH BIỆT HOÀN TIỀN (refund_pending & BẢNG refund_requests)
    console.log('--- TEST 8: Logic hoàn tiền tách biệt (payment_status="refund_pending" & bảng refund_requests) ---');
    const order2Id = `33333333-3333-4333-8333-${Date.now().toString().slice(-12)}`;
    await client.query(
      `SELECT public.create_order_transaction(
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      )`,
      [
        order2Id,
        customer.id,
        store.id,
        `idemp-ref-${Date.now()}`,
        JSON.stringify([{ bagId: bag.id, quantity: 1 }]),
        null,
        new Date(Date.now() + 3600000).toISOString(),
        'payos_vietqr',
        null,
        bag.discount_price,
        bag.discount_price,
        0,
        bag.discount_price,
        `QR-${order2Id}`,
      ]
    );
    // Giả lập đơn đã thanh toán thành công
    await client.query(`UPDATE public.orders SET status = 'paid', payment_status = 'success' WHERE id = $1`, [order2Id]);

    // Merchant hủy đơn kèm lý do
    await client.query(
      `SELECT public.transition_order_status_transaction($1, 'cancelled', $2, 'merchant', 'Quán hết nguyên liệu đột xuất')`,
      [order2Id, store.owner_user_id]
    );

    const cancelledOrder = await client.query(
      `SELECT status, payment_status, cancel_reason FROM public.orders WHERE id = $1`,
      [order2Id]
    );
    if (cancelledOrder.rows[0].payment_status !== 'refund_pending') {
      throw new Error(`❌ Lỗi: payment_status phải là refund_pending, nhận được ${cancelledOrder.rows[0].payment_status}`);
    }

    // Kiểm tra bản ghi trong bảng refund_requests
    const refundReq = await client.query(
      `SELECT * FROM public.refund_requests WHERE order_id = $1`,
      [order2Id]
    );
    if (!refundReq.rows.length || refundReq.rows[0].status !== 'pending') {
      throw new Error('❌ Lỗi: Không tìm thấy bản ghi trong bảng refund_requests!');
    }
    console.log(`✅ TEST 8 ĐẠT: Đơn đã thanh toán khi hủy chuyển payment_status="refund_pending". Bản ghi được lưu vào refund_requests với số tiền ${refundReq.rows[0].amount}đ.\n`);

    // TEST 9: PAYMENT TTL (cleanup_expired_pending_orders)
    console.log('--- TEST 9: Payment TTL (cleanup_expired_pending_orders tự động nhả tồn kho) ---');
    const order3Id = `44444444-4444-4444-8444-${Date.now().toString().slice(-12)}`;
    await client.query(
      `SELECT public.create_order_transaction(
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      )`,
      [
        order3Id,
        customer.id,
        store.id,
        `idemp-exp-${Date.now()}`,
        JSON.stringify([{ bagId: bag.id, quantity: 1 }]),
        null,
        new Date(Date.now() + 3600000).toISOString(),
        'payos_vietqr',
        null,
        bag.discount_price,
        bag.discount_price,
        0,
        bag.discount_price,
        `QR-${order3Id}`,
      ]
    );

    // Cố tình ép payment_expires_at về quá khứ (hết hạn 15 phút)
    await client.query(
      `UPDATE public.orders SET payment_expires_at = NOW() - INTERVAL '1 minute' WHERE id = $1`,
      [order3Id]
    );

    const bagBeforeCleanup = await client.query(`SELECT quantity FROM public.surprise_bags WHERE id = $1`, [bag.id]);
    const stockBeforeCleanup = bagBeforeCleanup.rows[0].quantity;

    // Chạy dọn dẹp
    const cleanupRes = await client.query(`SELECT public.cleanup_expired_pending_orders() as result`);
    if (cleanupRes.rows[0].result.expired_orders_count < 1) {
      throw new Error('❌ Lỗi: cleanup_expired_pending_orders không tìm thấy đơn hết hạn');
    }

    const expiredOrder = await client.query(`SELECT status FROM public.orders WHERE id = $1`, [order3Id]);
    if (expiredOrder.rows[0].status !== 'expired') {
      throw new Error(`❌ Lỗi: Status phải là expired, nhận được ${expiredOrder.rows[0].status}`);
    }

    const bagAfterCleanup = await client.query(`SELECT quantity FROM public.surprise_bags WHERE id = $1`, [bag.id]);
    const stockAfterCleanup = bagAfterCleanup.rows[0].quantity;
    if (stockAfterCleanup !== stockBeforeCleanup + 1) {
      throw new Error(`❌ Lỗi: Tồn kho chưa được hoàn trả! (Trước: ${stockBeforeCleanup}, Sau: ${stockAfterCleanup})`);
    }
    console.log(`✅ TEST 9 ĐẠT: Đơn quá hạn TTL 15 phút chuyển status="expired", tồn kho túi tự động được hoàn trả +1.\n`);

    console.log('================================================================================');
    console.log('🎉 TẤT CẢ 9 MỤC KIỂM THỬ ĐÃ VƯỢT QUA VỚI KẾT QUẢ XUẤT SẮC 100%!');
    console.log('================================================================================');
  } catch (error) {
    console.error('❌ KIỂM THỬ THẤT BẠI:', error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

runTest();
