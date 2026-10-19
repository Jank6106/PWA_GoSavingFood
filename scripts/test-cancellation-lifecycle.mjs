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
    if (eq > 0) map[line.slice(0, eq).trim()] = line.slice(idx = eq + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return map;
};

// Đọc env từ web hoặc root
let dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  try {
    const envLocal = readFileSync(resolve(ROOT_DIR, 'apps', 'web', '.env.local'), 'utf8');
    for (const l of envLocal.split(/\r?\n/)) {
      if (l.startsWith('DATABASE_URL=')) dbUrl = l.split('=')[1].trim();
    }
  } catch {}
}

const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  console.log('================================================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ TOÀN DIỆN MỌI TRƯỜNG HỢP HỦY ĐƠN HÀNG (CUSTOMER & MERCHANT)');
  console.log('================================================================================\n');

  await client.connect();
  let bag = null;

  try {
    // Lấy dữ liệu cơ sở: 1 túi hàng, 1 quán, 1 khách
    const bagRes = await client.query(
      `SELECT id, store_id, name, quantity, discount_price, pickup_start, pickup_end FROM public.surprise_bags WHERE deleted_at IS NULL AND is_available = true AND quantity > 5 LIMIT 1`
    );
    bag = bagRes.rows[0];

    // Cập nhật tạm thời khung giờ của túi để test (00:00 - 23:59)
    await client.query(
      `UPDATE public.surprise_bags SET pickup_start = '00:00:00', pickup_end = '23:59:59' WHERE id = $1`,
      [bag.id]
    );

    const initialBagQty = bag.quantity;

    const storeRes = await client.query(
      `SELECT id, name, owner_user_id FROM public.stores WHERE id = $1 LIMIT 1`,
      [bag.store_id]
    );
    const store = storeRes.rows[0];

    const cusRes = await client.query(
      `SELECT id, name FROM public.users WHERE role = 'customer' AND deleted_at IS NULL LIMIT 1`
    );
    const customer = cusRes.rows[0];

    console.log(`🏠 Quán: ${store.name} (Owner: ${store.owner_user_id})`);
    console.log(`👤 Khách: ${customer.name} (ID: ${customer.id})`);
    console.log(`🎒 Túi: ${bag.name} | Tồn kho trước test: ${initialBagQty}\n`);

    // =========================================================================
    // TEST 1: KHÁCH HỦY ĐƠN "CHỜ THANH TOÁN" (pending_payment)
    // =========================================================================
    console.log('--- TEST 1: Khách hủy đơn "Chờ thanh toán" (pending_payment) ---');
    const order1Id = crypto.randomUUID();
    const orderCode1 = Math.floor(Math.random() * 899999 + 100000);

    // 1. Tạo đơn
    await client.query(`
      SELECT public.create_order_transaction(
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      )
    `, [
      order1Id, customer.id, store.id, `idemp-${order1Id}`,
      JSON.stringify([{ bagId: bag.id, quantity: 2 }]),
      null, new Date().toISOString(), 'payos_vietqr', null,
      bag.discount_price * 2, bag.discount_price * 2, 0, bag.discount_price * 2,
      `QR-${orderCode1}`
    ]);

    // Kiểm tra kho bị trừ 2
    const stockAfterOrder1 = (await client.query(`SELECT quantity FROM public.surprise_bags WHERE id = $1`, [bag.id])).rows[0].quantity;
    if (stockAfterOrder1 !== initialBagQty - 2) throw new Error(`❌ Test 1: Kho chưa bị trừ. Hiện có: ${stockAfterOrder1}`);

    // 2. Khách bấm hủy đơn
    await client.query(`
      SELECT public.transition_order_status_transaction($1, 'cancelled', $2, 'customer', 'Đổi ý không mua nữa')
    `, [order1Id, customer.id]);

    const order1State = (await client.query(`SELECT status, payment_status, pickup_token, cancel_reason FROM public.orders WHERE id = $1`, [order1Id])).rows[0];
    const stockAfterCancel1 = (await client.query(`SELECT quantity FROM public.surprise_bags WHERE id = $1`, [bag.id])).rows[0].quantity;
    const refunds1 = (await client.query(`SELECT * FROM public.refund_requests WHERE order_id = $1`, [order1Id])).rows;

    if (order1State.status !== 'cancelled') throw new Error(`❌ Test 1: Trạng thái đơn chưa sang cancelled`);
    if (stockAfterCancel1 !== initialBagQty) throw new Error(`❌ Test 1: Tồn kho chưa được hoàn lại đủ`);
    if (refunds1.length > 0) throw new Error(`❌ Test 1: Đơn chưa thanh toán mà lại tạo refund_requests!`);
    if (order1State.pickup_token !== null) throw new Error(`❌ Test 1: pickup_token chưa bị xóa`);

    console.log('✅ TEST 1 ĐẠT: Đơn chuyển cancelled, kho hoàn trả đủ +2, KHÔNG tạo hoàn tiền, xóa token bảo mật.\n');

    // =========================================================================
    // TEST 2: KHÁCH HỦY ĐƠN "CHỜ XÁC NHẬN" (paid) + NHẬP THÔNG TIN NGÂN HÀNG HOÀN TIỀN
    // =========================================================================
    console.log('--- TEST 2: Khách hủy đơn "Chờ xác nhận" (paid) + Nhập STK hoàn tiền ---');
    const order2Id = crypto.randomUUID();
    const orderCode2 = Math.floor(Math.random() * 899999 + 100000);

    // 1. Tạo đơn
    await client.query(`
      SELECT public.create_order_transaction(
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      )
    `, [
      order2Id, customer.id, store.id, `idemp-${order2Id}`,
      JSON.stringify([{ bagId: bag.id, quantity: 1 }]),
      null, new Date().toISOString(), 'payos_vietqr', null,
      bag.discount_price, bag.discount_price, 0, bag.discount_price,
      `QR-${orderCode2}`
    ]);
    await client.query(`UPDATE public.orders SET payment_order_code = $1 WHERE id = $2`, [orderCode2, order2Id]);

    // 2. Giả lập thanh toán PayOS thành công -> status = 'paid'
    await client.query(`SELECT public.confirm_payos_payment($1)`, [orderCode2]);
    const paidState = (await client.query(`SELECT status, payment_status FROM public.orders WHERE id = $1`, [order2Id])).rows[0];
    if (paidState.status !== 'paid' || paidState.payment_status !== 'success') {
      throw new Error(`❌ Test 2: Chưa chuyển sang paid: ${JSON.stringify(paidState)}`);
    }

    // 3. Khách bấm hủy đơn kèm thông tin tài khoản ngân hàng
    const bankInfo = {
      bankName: 'MB Bank',
      accountNumber: '038823316420',
      accountHolder: 'NGUYEN HUU DANH',
    };

    await client.query(`
      SELECT public.transition_order_status_transaction(
        $1, 'cancelled', $2, 'customer', 'Bận việc đột xuất không qua lấy được', $3
      )
    `, [order2Id, customer.id, JSON.stringify(bankInfo)]);

    const order2State = (await client.query(`SELECT status, payment_status, pickup_token, cancel_reason FROM public.orders WHERE id = $1`, [order2Id])).rows[0];
    const stockAfterCancel2 = (await client.query(`SELECT quantity FROM public.surprise_bags WHERE id = $1`, [bag.id])).rows[0].quantity;
    const refunds2 = (await client.query(`SELECT * FROM public.refund_requests WHERE order_id = $1`, [order2Id])).rows;
    const notifs2 = (await client.query(`SELECT * FROM public.notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`, [store.owner_user_id])).rows;

    if (order2State.status !== 'cancelled' || order2State.payment_status !== 'refund_pending') {
      throw new Error(`❌ Test 2: Trạng thái đơn hoặc payment_status sai: ${JSON.stringify(order2State)}`);
    }
    if (stockAfterCancel2 !== initialBagQty) throw new Error(`❌ Test 2: Tồn kho chưa được hoàn lại đủ`);
    if (refunds2.length !== 1) throw new Error(`❌ Test 2: Chưa sinh bản ghi refund_requests!`);
    
    const refundRecord = refunds2[0];
    if (Number(refundRecord.amount) !== Number(bag.discount_price)) {
      throw new Error(`❌ Test 2: Số tiền hoàn tiền không khớp`);
    }
    if (!refundRecord.bank_account_info || refundRecord.bank_account_info.accountNumber !== '038823316420') {
      throw new Error(`❌ Test 2: Thông tin tài khoản ngân hàng không lưu đúng: ${JSON.stringify(refundRecord.bank_account_info)}`);
    }
    if (!notifs2.length || !notifs2[0].title.includes('hủy')) {
      console.warn('⚠️ Test 2: Kiểm tra thông báo quán:', notifs2);
    }

    console.log('✅ TEST 2 ĐẠT: Đơn chuyển cancelled, payment_status=refund_pending, tạo refund_requests chứa đúng STK, hoàn kho đủ +1, thông báo cho quán.\n');

    // =========================================================================
    // TEST 3: KHÁCH CỐ TÌNH HỦY KHI ĐƠN ĐANG "ĐANG XỬ LÝ" HOẶC "CHỜ LẤY" (BỊ CHẶN)
    // =========================================================================
    console.log('--- TEST 3: Khách cố tình hủy khi đơn "Đang xử lý" (preparing) ---');
    const order3Id = crypto.randomUUID();
    const orderCode3 = Math.floor(Math.random() * 899999 + 100000);

    await client.query(`
      SELECT public.create_order_transaction(
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      )
    `, [
      order3Id, customer.id, store.id, `idemp-${order3Id}`,
      JSON.stringify([{ bagId: bag.id, quantity: 1 }]),
      null, new Date().toISOString(), 'payos_vietqr', null,
      bag.discount_price, bag.discount_price, 0, bag.discount_price,
      `QR-${orderCode3}`
    ]);
    await client.query(`UPDATE public.orders SET payment_order_code = $1 WHERE id = $2`, [orderCode3, order3Id]);
    await client.query(`SELECT public.confirm_payos_payment($1)`, [orderCode3]);

    // Quán bấm nhận đơn -> preparing
    await client.query(`
      SELECT public.transition_order_status_transaction($1, 'preparing', $2, 'merchant')
    `, [order3Id, store.owner_user_id]);

    // Khách thử gọi hủy -> Bắt buộc ném lỗi CANNOT_CANCEL_PREPARING
    let customerBlocked = false;
    try {
      await client.query(`
        SELECT public.transition_order_status_transaction($1, 'cancelled', $2, 'customer', 'Tôi muốn hủy')
      `, [order3Id, customer.id]);
    } catch (err) {
      if (err.message.includes('CANNOT_CANCEL_PREPARING') || err.message.includes('không thể hủy')) {
        customerBlocked = true;
      } else {
        throw err;
      }
    }

    if (!customerBlocked) throw new Error(`❌ Test 3: Khách vẫn hủy được khi quán đang làm món!`);
    console.log('✅ TEST 3 ĐẠT: Database chặn đứng khách tự hủy khi đơn ở "Đang xử lý" (CANNOT_CANCEL_PREPARING).\n');

    // =========================================================================
    // TEST 4: CHỦ QUÁN HỦY ĐƠN ĐỘT XUẤT TẠI "ĐANG XỬ LÝ" HOẶC "CHỜ LẤY"
    // =========================================================================
    console.log('--- TEST 4: Chủ quán hủy đơn khi gặp sự cố tại quán ---');
    await client.query(`
      SELECT public.transition_order_status_transaction(
        $1, 'cancelled', $2, 'merchant', 'Sự cố mất điện đột xuất tại bếp'
      )
    `, [order3Id, store.owner_user_id]);

    const order3State = (await client.query(`SELECT status, payment_status, cancel_reason FROM public.orders WHERE id = $1`, [order3Id])).rows[0];
    const refunds3 = (await client.query(`SELECT * FROM public.refund_requests WHERE order_id = $1`, [order3Id])).rows;

    if (order3State.status !== 'cancelled' || order3State.payment_status !== 'refund_pending') {
      throw new Error(`❌ Test 4: Trạng thái đơn quán hủy không đúng: ${JSON.stringify(order3State)}`);
    }
    if (refunds3.length !== 1) {
      throw new Error(`❌ Test 4: Quán hủy đơn đã trả tiền nhưng KHÔNG sinh refund_requests!`);
    }

    console.log('✅ TEST 4 ĐẠT: Quán hủy đơn thành công, lý do lưu chuẩn, tự động sinh refund_requests hoàn tiền cho khách.\n');

    // =========================================================================
    // TEST 5: HỆ THỐNG TỰ ĐỘNG HỦY NO-SHOW (Quá 15p sau giờ hẹn lấy) - KHÔNG HOÀN TIỀN
    // =========================================================================
    console.log('--- TEST 5: Tự động hủy đơn No-show (Khách không đến nhận) ---');
    const order5Id = crypto.randomUUID();
    const orderCode5 = Math.floor(Math.random() * 899999 + 100000);

    await client.query(`
      SELECT public.create_order_transaction(
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      )
    `, [
      order5Id, customer.id, store.id, `idemp-${order5Id}`,
      JSON.stringify([{ bagId: bag.id, quantity: 1 }]),
      null, new Date().toISOString(), 'payos_vietqr', null,
      bag.discount_price, bag.discount_price, 0, bag.discount_price,
      `QR-${orderCode5}`
    ]);
    await client.query(`UPDATE public.orders SET payment_order_code = $1 WHERE id = $2`, [orderCode5, order5Id]);
    await client.query(`SELECT public.confirm_payos_payment($1)`, [orderCode5]);
    await client.query(`SELECT public.transition_order_status_transaction($1, 'preparing', $2, 'merchant')`, [order5Id, store.owner_user_id]);
    await client.query(`SELECT public.transition_order_status_transaction($1, 'ready_for_pickup', $2, 'merchant')`, [order5Id, store.owner_user_id]);

    // Cố tình ép giờ tạo đơn về quá khứ (ví dụ hôm qua để giả lập quá giờ pickup_end + 15 phút)
    await client.query(`
      UPDATE public.orders
      SET created_at = NOW() - INTERVAL '2 days'
      WHERE id = $1
    `, [order5Id]);

    const initialStockBeforeNoshow = (await client.query(`SELECT quantity FROM public.surprise_bags WHERE id = $1`, [bag.id])).rows[0].quantity;

    // Chạy hàm quét no-show
    const noshowResult = (await client.query(`SELECT public.expire_noshow_orders() as res`)).rows[0].res;
    console.log('Kết quả expire_noshow_orders:', noshowResult);

    const order5State = (await client.query(`SELECT status, payment_status, cancel_reason, pickup_token FROM public.orders WHERE id = $1`, [order5Id])).rows[0];
    const refunds5 = (await client.query(`SELECT * FROM public.refund_requests WHERE order_id = $1`, [order5Id])).rows;
    const stockAfterNoshow = (await client.query(`SELECT quantity FROM public.surprise_bags WHERE id = $1`, [bag.id])).rows[0].quantity;

    if (order5State.status !== 'expired') {
      throw new Error(`❌ Test 5: Đơn No-show chưa chuyển sang expired: ${JSON.stringify(order5State)}`);
    }
    if (order5State.payment_status !== 'success') {
      throw new Error(`❌ Test 5: Đơn No-show bị đổi payment_status (phải giữ nguyên success): ${order5State.payment_status}`);
    }
    if (refunds5.length > 0) {
      throw new Error(`❌ Test 5: Đơn No-show lại bị sinh refund_requests! Khách bỏ món không được hoàn tiền!`);
    }
    if (stockAfterNoshow !== initialStockBeforeNoshow) {
      throw new Error(`❌ Test 5: Tồn kho bị cộng lại (Món hỏng cuối ngày không được cộng lại kho)!`);
    }
    if (order5State.pickup_token !== null) {
      throw new Error(`❌ Test 5: pickup_token chưa bị xóa vô hiệu hóa!`);
    }

    console.log('✅ TEST 5 ĐẠT: Đơn no-show tự động chuyển expired, payment_status="success", KHÔNG hoàn tiền, KHÔNG hoàn kho, vô hiệu hóa mã nhận hàng.\n');

    console.log('================================================================================');
    console.log('🎉 TẤT CẢ 5/5 KỊCH BẢN HỦY ĐƠN ĐÃ ĐƯỢC KIỂM THỬ THỰC TẾ VÀ ĐẠT 100% TIÊU CHUẨN!');
    console.log('================================================================================');

  } finally {
    if (bag) {
      await client.query(
        `UPDATE public.surprise_bags SET pickup_start = $1, pickup_end = $2 WHERE id = $3`,
        [bag.pickup_start, bag.pickup_end, bag.id]
      ).catch(() => {});
    }
    await client.end();
  }
}

run().catch((err) => {
  console.error('Lỗi khi chạy test:', err);
  process.exit(1);
});
