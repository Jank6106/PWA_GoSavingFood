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

const STORE_ID = 'b509682b-350a-4f10-8bbc-a76f6537c248'; // Bếp Chay An Lạc - Cổ Nhuế

const CUSTOMER_NAMES = [
  'Nguyễn Văn Nam',
  'Trần Thị Mai',
  'Lê Hoàng Long',
  'Phạm Thu Hà',
  'Đỗ Minh Tuấn',
  'Vũ Bích Ngọc',
  'Hoàng Anh Dũng',
  'Bùi Khánh Linh',
  'Đặng Quốc Huy',
  'Trịnh Phương Thảo',
  'Ngô Thanh Tùng',
  'Lê Mai Anh',
];

const REVIEWS_DATA = [
  { rating: 5, comment: 'Bún nem chay giòn rụm ngon bất ngờ, quán đóng gói sạch sẽ thân thiện môi trường.' },
  { rating: 5, comment: 'Cơm thực dưỡng rất thanh nhẹ, đậu hũ sốt nấm đậm đà vừa miệng. Ủng hộ quán lâu dài!' },
  { rating: 5, comment: 'Mua túi cứu trợ mà đồ ăn tươi nguyên như vừa nấu, giá quá hời so với chất lượng!' },
  { rating: 4, comment: 'Đồ ăn chay ngon, nước chấm pha rất chuẩn vị. Sẽ tiếp tục đặt trên GoSavingFood.' },
  { rating: 5, comment: 'Combo lẩu nấm cực kỳ nhiều nấm tươi, nước lẩu ngọt thanh tự nhiên. Rất đáng tiền!' },
  { rating: 5, comment: 'Chè dưỡng nhan ngọt dịu thanh mát, chủ quán chu đáo còn tặng kèm thìa gỗ.' },
  { rating: 4, comment: 'Quán phục vụ nhanh nhẹn, chỉ cần quét mã QR 5 giây là nhận được túi đồ ăn mang về.' },
  { rating: 5, comment: 'Ý nghĩa chống lãng phí rất tuyệt vời, đồ ăn chất lượng vượt mong đợi!' },
];

async function seed() {
  console.log('🚀 Bắt đầu tạo mock data Supabase cho merchant hiện tại...');

  // 1. Đăng nhập với tài khoản đối tác merchant
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'cus_test_987654@example.com',
    password: 'Password123!',
  });
  if (authErr) throw authErr;
  const userId = auth.user.id;
  console.log(`✅ Đã xác thực Merchant: ${auth.user.email} (${userId})`);

  // 2. Cập nhật thông tin Store cho chuẩn đẹp
  const { error: storeErr } = await supabase
    .from('stores')
    .update({
      rating: 4.9,
      total_ratings: 28,
      is_open: true,
      open_time: '08:00:00',
      close_time: '22:00:00',
    })
    .eq('id', STORE_ID);
  if (storeErr) console.warn('Cập nhật store lỗi:', storeErr.message);
  else console.log('✅ Đã cập nhật chỉ số đánh giá của cửa hàng (4.9⭐ / 28 lượt)');

  // 3. Dọn dẹp các túi rác test từ các lần thử nghiệm trước
  const { data: currentBags } = await supabase
    .from('surprise_bags')
    .select('id, name')
    .eq('store_id', STORE_ID)
    .is('deleted_at', null);

  const validBagIds = [
    'ffdae2e8-2df4-4547-88b2-20be1ca1ec79', // Túi Bún Nem Chay
    '2c6f95b8-37f6-4ad2-bfaf-b2550cb8035c', // Phần Cơm Chay Thực Dưỡng
  ];

  for (const b of currentBags || []) {
    if (!validBagIds.includes(b.id) && b.name.includes('Croissant')) {
      await supabase.from('surprise_bags').update({ deleted_at: new Date().toISOString() }).eq('id', b.id);
    }
  }

  // 4. Đảm bảo 4 túi hàng chuẩn cho quán
  const targetBags = [
    {
      id: 'ffdae2e8-2df4-4547-88b2-20be1ca1ec79',
      name: 'Túi Bún Nem Chay & Giò Nấm Hà Thành',
      description: 'Bún tươi mềm dẻo, nem rán giòn vỏ, giò nấm thủ công ăn kèm nước chấm chua ngọt tỏi ớt chay.',
      original_price: 65000,
      discount_price: 30000,
      category: 'vegetarian',
      image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600',
      quantity: 8,
      max_quantity: 3,
      pickup_start: '00:00:00',
      pickup_end: '23:59:59',
      is_daily: true,
      is_available: true,
      status: 'active',
      expires_at: new Date(Date.now() + 86400000 * 30).toISOString(),
      deleted_at: null,
    },
    {
      id: '2c6f95b8-37f6-4ad2-bfaf-b2550cb8035c',
      name: 'Phần Cơm Chay Thực Dưỡng Sen Vàng',
      description: 'Cơm gạo lứt huyết rồng, đậu hũ sốt nấm hương, chả giò chay nấm và canh rong biển thanh mát.',
      original_price: 70000,
      discount_price: 35000,
      category: 'vegetarian',
      image_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600',
      quantity: 6,
      max_quantity: 2,
      pickup_start: '00:00:00',
      pickup_end: '23:59:59',
      is_daily: true,
      is_available: true,
      status: 'active',
      expires_at: new Date(Date.now() + 86400000 * 30).toISOString(),
      deleted_at: null,
    },
    {
      id: '7a110000-0000-0000-0000-000000000003',
      name: 'Combo Lẩu Nấm Chay & Đậu Hũ Non',
      description: 'Nước dùng hầm từ táo đỏ ngô ngọt, các loại nấm đùi gà, nấm kim châm, nấm hương kèm rau hữu cơ tươi.',
      original_price: 120000,
      discount_price: 55000,
      category: 'vegetarian',
      image_url: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600',
      quantity: 5,
      max_quantity: 2,
      pickup_start: '00:00:00',
      pickup_end: '23:59:59',
      is_daily: true,
      is_available: true,
      status: 'active',
      expires_at: new Date(Date.now() + 86400000 * 30).toISOString(),
      deleted_at: null,
    },
    {
      id: '7a110000-0000-0000-0000-000000000004',
      name: 'Túi Chè Dưỡng Nhan & Nước Sâm Hạt Chia',
      description: 'Set đồ uống giải nhiệt: Chè tuyết yến dưỡng nhan ít đường thanh mát và 1 chai nước sâm bông cúc hạt chia.',
      original_price: 50000,
      discount_price: 25000,
      category: 'beverage',
      image_url: 'https://images.unsplash.com/photo-1497534446932-c925b458314e?w=600',
      quantity: 5,
      max_quantity: 2,
      pickup_start: '00:00:00',
      pickup_end: '23:59:59',
      is_daily: true,
      is_available: true,
      status: 'active',
      expires_at: new Date(Date.now() + 86400000 * 30).toISOString(),
      deleted_at: null,
    },
  ];

  const activeBags = [];
  for (const bagDef of targetBags) {
    const { data: upsertedBag, error: bagErr } = await supabase
      .from('surprise_bags')
      .upsert(
        {
          store_id: STORE_ID,
          ...bagDef,
        },
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (bagErr) {
      console.warn(`Lỗi tạo túi ${bagDef.name}:`, bagErr.message);
    } else {
      activeBags.push(upsertedBag);
    }
  }

  console.log(`✅ Đã chuẩn bị ${activeBags.length} loại túi thực phẩm đa dạng trên kệ`);

  // 5. Sinh 28 đơn hàng trải đều qua 30 ngày qua (tập trung 7 ngày gần nhất)
  console.log('📦 Bắt đầu sinh 28 đơn hàng chi tiết...');
  const now = new Date();

  // Định nghĩa kế hoạch các đơn hàng
  // [daysAgo, hour, minute, bagIndex, quantity, status]
  const ordersPlan = [
    // Hôm nay (Day 0) - Giờ tối & trưa
    [0, 19, 15, 0, 2, 'completed'],
    [0, 18, 40, 1, 1, 'completed'],
    [0, 12, 10, 0, 1, 'completed'],
    [0, 11, 45, 3, 1, 'pending'], // Đơn mới đang chờ xử lý
    [0, 14, 20, 2, 1, 'preparing'], // Đơn đang chuẩn bị

    // Hôm qua (Day 1)
    [1, 19, 50, 0, 2, 'completed'],
    [1, 18, 20, 2, 1, 'completed'],
    [1, 12, 30, 1, 1, 'completed'],
    [1, 16, 15, 3, 1, 'completed'],

    // 2 ngày trước (Day 2)
    [2, 20, 10, 0, 1, 'completed'],
    [2, 18, 30, 1, 2, 'completed'],
    [2, 12, 0, 0, 1, 'completed'],

    // 3 ngày trước (Day 3)
    [3, 19, 0, 2, 1, 'completed'],
    [3, 18, 15, 0, 1, 'completed'],
    [3, 17, 45, 1, 1, 'completed'],

    // 4 ngày trước (Day 4)
    [4, 20, 30, 0, 2, 'completed'],
    [4, 19, 10, 3, 1, 'completed'],
    [4, 12, 40, 1, 1, 'completed'],

    // 5 ngày trước (Day 5)
    [5, 18, 50, 0, 1, 'completed'],
    [5, 18, 0, 2, 1, 'completed'],
    [5, 15, 30, 1, 1, 'completed'],

    // 6 ngày trước (Day 6)
    [6, 19, 40, 0, 2, 'completed'],
    [6, 12, 15, 1, 1, 'completed'],

    // Tuần 2 (Day 10 - 13)
    [10, 19, 10, 0, 2, 'completed'],
    [11, 18, 35, 1, 1, 'completed'],
    [12, 20, 0, 2, 1, 'completed'],

    // Tuần 3 (Day 18 - 20)
    [18, 18, 45, 0, 1, 'completed'],
    [19, 12, 20, 1, 1, 'completed'],
    [20, 19, 15, 0, 1, 'cancelled'], // 1 đơn huỷ cho tỉ lệ thực tế (~96%)

    // Tuần 4 (Day 25 - 28)
    [25, 19, 30, 2, 1, 'completed'],
    [26, 18, 50, 0, 2, 'completed'],
    [28, 12, 0, 1, 1, 'completed'],
  ];

  let createdOrdersCount = 0;

  for (let i = 0; i < ordersPlan.length; i++) {
    const [daysAgo, hour, minute, bagIdx, qty, targetStatus] = ordersPlan[i];
    const bag = activeBags[bagIdx];
    if (!bag) continue;

    // Đảm bảo số lượng còn đủ để gọi RPC
    await supabase
      .from('surprise_bags')
      .update({ quantity: 15, pickup_start: '00:00:00', pickup_end: '23:59:59' })
      .eq('id', bag.id);

    const orderDate = new Date(now.getTime() - daysAgo * 86400000);
    orderDate.setHours(hour, minute, Math.floor(Math.random() * 59), 0);
    const orderIso = orderDate.toISOString();

    const orderId = `d2000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`;
    const customerName = CUSTOMER_NAMES[i % CUSTOMER_NAMES.length];
    const customerPhone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
    const unitPrice = bag.discount_price;
    const finalAmount = unitPrice * qty;

    const { data: rpcRes, error: rpcErr } = await supabase.rpc('create_order_transaction', {
      p_id: orderId,
      p_customer_id: userId,
      p_store_id: STORE_ID,
      p_idempotency_key: `seed-idemp-${orderId}`,
      p_items: [{ bagId: bag.id, quantity: qty }],
      p_voucher_code: null,
      p_pickup_time: orderIso,
      p_payment_method: 'payos_vietqr',
      p_note: 'Đóng gói túi giấy thân thiện môi trường',
      p_total_original_price: bag.original_price * qty,
      p_total_discount_price: finalAmount,
      p_discount_amount: 0,
      p_final_amount: finalAmount,
      p_qr_code: `GSF-QR-MOCK-${String(i + 1).padStart(4, '0')}`,
    });

    if (rpcErr && !rpcErr.message.includes('duplicate')) {
      console.warn(`Lỗi tạo đơn ${orderId}:`, rpcErr.message);
      continue;
    }

    // Cập nhật trạng thái và thời gian created_at của đơn hàng
    const isCompleted = targetStatus === 'completed';
    const isCancelled = targetStatus === 'cancelled';
    const isPending = targetStatus === 'pending';

    await supabase
      .from('orders')
      .update({
        status: targetStatus,
        payment_status: isCancelled ? 'refunded' : isPending ? 'pending' : 'success',
        recipient_name: customerName,
        recipient_phone: customerPhone,
        created_at: orderIso,
        updated_at: orderIso,
        completed_at: isCompleted ? orderIso : null,
        cancelled_at: isCancelled ? orderIso : null,
        cancel_reason: isCancelled ? 'Khách bận đột xuất không kịp tới nhận' : null,
      })
      .eq('id', orderId);

    // Cập nhật created_at của order_items tương ứng
    await supabase
      .from('order_items')
      .update({ created_at: orderIso })
      .eq('order_id', orderId);

    createdOrdersCount++;

    // Tạo review cho một số đơn đã hoàn thành
    if (isCompleted && i < REVIEWS_DATA.length) {
      const reviewDef = REVIEWS_DATA[i];
      const reviewId = `e2000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`;
      const reviewTime = new Date(orderDate.getTime() + 1800000).toISOString(); // 30 phút sau khi nhận

      await supabase.from('reviews').upsert(
        {
          id: reviewId,
          order_id: orderId,
          store_id: STORE_ID,
          customer_id: userId,
          rating: reviewDef.rating,
          comment: reviewDef.comment,
          created_at: reviewTime,
          updated_at: reviewTime,
        },
        { onConflict: 'id' }
      );
    }
  }

  // Khôi phục lại tồn kho thực tế cho các túi trên kệ
  const bagStock = [6, 5, 4, 5];
  for (let idx = 0; idx < activeBags.length; idx++) {
    await supabase
      .from('surprise_bags')
      .update({
        quantity: bagStock[idx] || 5,
        pickup_start: '16:00:00',
        pickup_end: '21:30:00',
      })
      .eq('id', activeBags[idx].id);
  }

  console.log(`🎉 HOÀN THÀNH TẠO MOCK DATA!`);
  console.log(`- Đã tạo/đồng bộ: ${createdOrdersCount} đơn hàng thực tế qua các mốc thời gian`);
  console.log(`- Đã gắn đánh giá khách hàng: ${REVIEWS_DATA.length} phản hồi chất lượng cao`);
  console.log(`- Đã thiết lập 4 túi cứu trợ bán chạy với số lượng chuẩn trên kệ`);
}

seed().catch(console.error);
