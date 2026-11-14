/**
 * scripts/seed_realistic_transactions.mjs
 * Tự động tạo giao dịch chân thực (orders, order_items, reviews) cho các cửa hàng đối tác,
 * đặc biệt là McDonald's - Hồ Gươm và các thương hiệu hàng đầu, đảm bảo các màn hình:
 * - Thống kê / Analytics (Doanh thu, Đơn hoàn thành, Giờ cao điểm, Kênh thanh toán, Biểu đồ tuần)
 * - Quản lý đơn hàng / Orders (Đã hoàn thành, Đang chuẩn bị, Đã huỷ)
 * - Đánh giá của khách hàng / Reviews
 * luôn tràn ngập dữ liệu sống động, không bị rỗng.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
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
  statement_timeout: 60000,
});

await client.connect();

const VIETNAMESE_CUSTOMERS = [
  { name: 'Nguyễn Tuấn Kiệt', phone: '0912345889' },
  { name: 'Trần Thu Hà', phone: '0987654321' },
  { name: 'Lê Hoàng Long', phone: '0903456789' },
  { name: 'Phạm Minh Anh', phone: '0978123456' },
  { name: 'Đỗ Quỳnh Chi', phone: '0936789012' },
  { name: 'Vũ Bích Ngọc', phone: '0945678123' },
  { name: 'Hoàng Anh Dũng', phone: '0918765432' },
  { name: 'Bùi Khánh Linh', phone: '0989012345' },
  { name: 'Đặng Quốc Huy', phone: '0901234890' },
  { name: 'Trịnh Phương Thảo', phone: '0967890123' },
  { name: 'Ngô Thanh Tùng', phone: '0923456789' },
  { name: 'Lê Mai Anh', phone: '0934567890' },
  { name: 'Nguyễn Văn Nam', phone: '0945123789' },
  { name: 'Dương Hải Yến', phone: '0971234567' },
  { name: 'Phan Bảo Trâm', phone: '0983456712' },
];

const REVIEWS_POOL = [
  { rating: 5, comment: 'Đồ ăn còn rất tươi ngon và nóng hổi, phần ăn đầy đặn hơn mình tưởng nhiều! Rất đáng tiền.' },
  { rating: 5, comment: 'Tiết kiệm được bao nhiêu tiền mà lại góp phần giảm lãng phí thực phẩm. Chắc chắn sẽ ủng hộ quán lâu dài.' },
  { rating: 5, comment: 'Nhân viên quán nhiệt tình, quét mã QR nhận túi nhanh trong vòng 1 phút. Quá tiện lợi.' },
  { rating: 4, comment: 'Hương vị món ăn vẫn giữ được chuẩn vị. Túi đóng gói sạch sẽ, cẩn thận, thân thiện môi trường.' },
  { rating: 5, comment: 'Giá siêu hời cho một bữa ăn chất lượng như thế này. Cảm ơn quán và GoSavingFood rất nhiều!' },
  { rating: 5, comment: 'Túi cứu trợ bất ngờ cực kỳ chất lượng, mở ra toàn món mình yêu thích.' },
  { rating: 4, comment: 'Trải nghiệm cứu thực phẩm tuyệt vời, thức ăn sạch sẽ và dịch vụ chu đáo.' },
  { rating: 5, comment: 'Bánh và đồ uống date mới tinh, bao bì bảo quản kỹ lưỡng. Cho quán 5 sao không đắn đo.' },
  { rating: 5, comment: 'Món ăn đậm đà, khẩu phần thoải mái cho cả 2 người ăn no. Rất ưng ý!' },
  { rating: 4, comment: 'Đặt qua GoSavingFood vừa rẻ vừa bảo vệ môi trường, nhân viên hỗ trợ rất nhanh.' },
];

const MCDONALDS_REVIEWS = [
  { rating: 5, comment: 'Burger bò phô mai và khoai tây chiên vẫn giòn rụm thơm phức! Cứu được bữa tối 5 sao với giá quá hạt dẻ.' },
  { rating: 5, comment: 'Gà rán McDonald’s nóng giòn chuẩn vị, nước ngọt mát lạnh. Quét QR lấy túi 30 giây là xong.' },
  { rating: 5, comment: 'Túi bất ngờ gồm 1 burger đẫm sốt và khoai chiên lớn, đóng gói túi giấy bảo vệ môi trường rất đẹp.' },
  { rating: 4, comment: 'Đồ ăn giữ ấm tốt, gà giòn da mọng thịt. Rất hoan nghênh tinh thần cứu thực phẩm của McDonald’s!' },
  { rating: 5, comment: 'Vị trí Hồ Gươm tiện ghé lấy sau giờ làm, nhân viên check mã nhanh gọn và thân thiện.' },
  { rating: 5, comment: 'Chất lượng không khác gì mua giá gốc mà giá chỉ bằng 1/3, cực kỳ hài lòng!' },
  { rating: 4, comment: 'Phần ăn combo no nê, khoai chiên còn độ giòn, tương ớt tương cà đầy đủ.' },
  { rating: 5, comment: 'App đặt mượt mà, đồ ăn nóng sốt thơm ngon. Mình sẽ tiếp tục rủ bạn bè săn túi ở đây!' },
];

function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

async function run() {
  console.log('🚀 Bắt đầu quá trình seed giao dịch thực tế cho các cửa hàng GoSavingFood...');

  // 1. Lấy danh sách customer users hợp lệ trong hệ thống
  const { rows: users } = await client.query(
    "SELECT id, name, phone FROM public.users WHERE role = 'customer' AND deleted_at IS NULL;"
  );
  if (!users || users.length === 0) {
    throw new Error('Không tìm thấy customer users hợp lệ trong public.users!');
  }
  console.log(`✅ Tìm thấy ${users.length} khách hàng mẫu trong hệ thống.`);

  // 2. Lấy danh sách tất cả các stores và túi hàng tương ứng
  const { rows: stores } = await client.query(
    "SELECT id, name, rating, total_ratings FROM public.stores WHERE deleted_at IS NULL ORDER BY name;"
  );
  console.log(`🏪 Tổng số cửa hàng đang hoạt động: ${stores.length}`);

  const { rows: bags } = await client.query(
    "SELECT id, store_id, name, original_price, discount_price, quantity FROM public.surprise_bags WHERE deleted_at IS NULL;"
  );
  console.log(`🛍️ Tổng số túi hàng hoạt động: ${bags.length}`);

  const bagsByStore = new Map();
  for (const b of bags) {
    const arr = bagsByStore.get(b.store_id) || [];
    arr.push(b);
    bagsByStore.set(b.store_id, arr);
  }

  const MCDONALDS_ID = 'afbde72f-ac50-4f1e-873f-9bed4e118f04';

  const allOrders = [];
  const allOrderItems = [];
  const allReviews = [];
  const storeUpdates = [];

  for (const store of stores) {
    const storeBags = bagsByStore.get(store.id) || [];
    if (storeBags.length === 0) continue;

    const isMcDonalds = store.id === MCDONALDS_ID;
    const isKeyPartner = isMcDonalds || [
      'b509682b-350a-4f10-8bbc-a76f6537c248', // Bếp Chay An Lạc
      '5b051934-45e2-4cbe-92b7-7e78c4b51710', // KFC Vietnam
      'fcc75682-534e-495c-91a7-982622d02cf7', // Tous Les Jours HQV
      'b1ead7a1-0008-4000-8000-000000000008', // Cộng Cà Phê
      'b1ead7a1-0001-4000-8000-000000000001', // BreadTalk
      'b1ead7a1-0016-4000-8000-000000000016', // Annam Gourmet
      '799e644e-2f82-4a85-ba12-b194cf4cc547', // Phúc Long
    ].includes(store.id);

    const targetOrderCount = isMcDonalds ? 36 : isKeyPartner ? 20 : 10;
    const storeReviews = [];

    for (let i = 0; i < targetOrderCount; i++) {
      let dayOfMonth = 28;
      let hour = 19;
      let minute = 15;
      let status = 'completed';

      if (i === 0) {
        dayOfMonth = 28;
        hour = 19;
        minute = 20;
        status = 'completed';
      } else if (i === 1) {
        dayOfMonth = 28;
        hour = 18;
        minute = 40;
        status = 'completed';
      } else if (i === 2) {
        dayOfMonth = 28;
        hour = 12;
        minute = 15;
        status = 'completed';
      } else if (i === 3 && isMcDonalds) {
        dayOfMonth = 28;
        hour = 11;
        minute = 30;
        status = 'preparing';
      } else if (i === 4 && isMcDonalds) {
        dayOfMonth = 28;
        hour = 9;
        minute = 10;
        status = 'completed';
      } else {
        const dayWeights = [
          27, 26, 25, 24, 23, 22,
          21, 20, 19, 18, 17, 16, 15,
          14, 13, 12, 11, 10, 9, 8,
          7, 6, 5, 4, 3, 2, 1
        ];
        dayOfMonth = dayWeights[i % dayWeights.length];

        const hourRand = (i * 7 + dayOfMonth) % 100;
        if (hourRand < 55) {
          hour = 18 + ((i * 3 + dayOfMonth) % 4);
        } else if (hourRand < 75) {
          hour = 14 + ((i * 2) % 4);
        } else if (hourRand < 95) {
          hour = 11 + (i % 3);
        } else {
          hour = 8 + (i % 3);
        }
        minute = (i * 17) % 60;

        if (i === 11) {
          status = 'cancelled';
        } else {
          status = (i % 8 === 0) ? 'picked_up' : 'completed';
        }
      }

      const orderDate = new Date(2026, 9, dayOfMonth, hour, minute, 15);
      const orderIso = orderDate.toISOString();

      const orderId = crypto.randomUUID();
      const customer = users[i % users.length];
      const vietName = VIETNAMESE_CUSTOMERS[i % VIETNAMESE_CUSTOMERS.length];

      const bag = storeBags[i % storeBags.length];
      const qty = (i % 5 === 0) ? 2 : 1;
      const unitPrice = Number(bag.discount_price);
      const totalPrice = unitPrice * qty;
      const totalOriginal = Number(bag.original_price) * qty;
      const discountAmount = totalOriginal - totalPrice;

      const isCompleted = status === 'completed' || status === 'picked_up';
      const isCancelled = status === 'cancelled';
      const isPreparing = status === 'preparing';

      const paymentMethod = (i % 4 === 0) ? 'cash' : 'payos_vietqr';
      const paymentStatus = isCancelled ? 'refunded' : 'success';

      const qrCode = `GSF-QR-${orderId.slice(0, 8).toUpperCase()}-${dayOfMonth}${hour}${i}`;

      allOrders.push({
        id: orderId,
        customer_id: customer.id,
        store_id: store.id,
        total_original_price: totalOriginal,
        total_discount_price: totalPrice,
        discount_amount: discountAmount,
        final_amount: totalPrice,
        voucher_code: null,
        status,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        qr_code: qrCode,
        pickup_time: new Date(orderDate.getTime() + 1800000).toISOString(),
        note: i % 3 === 0 ? 'Đóng gói túi giấy cẩn thận giúp mình nhé!' : null,
        created_at: orderIso,
        updated_at: orderIso,
        completed_at: isCompleted ? orderIso : null,
        cancelled_at: isCancelled ? orderIso : null,
        cancel_reason: isCancelled ? 'Khách bận đột xuất không kịp tới nhận túi' : null,
        paid_at: isCancelled ? null : orderIso,
        recipient_name: vietName.name,
        recipient_phone: vietName.phone,
      });

      const itemId = crypto.randomUUID();
      allOrderItems.push({
        id: itemId,
        order_id: orderId,
        bag_id: bag.id,
        bag_name: bag.name,
        quantity: qty,
        unit_price: unitPrice,
        total_price: totalPrice,
        created_at: orderIso,
      });

      if (isCompleted && (isMcDonalds ? storeReviews.length < 8 : storeReviews.length < 4)) {
        const revPool = isMcDonalds ? MCDONALDS_REVIEWS : REVIEWS_POOL;
        const revDef = revPool[storeReviews.length % revPool.length];
        const reviewId = crypto.randomUUID();
        const reviewTime = new Date(orderDate.getTime() + 2400000).toISOString();

        storeReviews.push({
          id: reviewId,
          order_id: orderId,
          customer_id: customer.id,
          store_id: store.id,
          rating: revDef.rating,
          comment: revDef.comment,
          created_at: reviewTime,
          updated_at: reviewTime,
        });
      }
    }

    allReviews.push(...storeReviews);

    const avgRating = isMcDonalds ? 4.8 : Number(store.rating || 4.8);
    const totalRatingsCount = (store.total_ratings && store.total_ratings > 30)
      ? store.total_ratings
      : isMcDonalds ? 55 : 32 + (targetOrderCount * 2);

    storeUpdates.push({ id: store.id, rating: avgRating, total_ratings: totalRatingsCount });
  }

  console.log(`📦 Chuẩn bị insert ${allOrders.length} orders, ${allOrderItems.length} items, ${allReviews.length} reviews...`);

  await client.query('BEGIN');

  try {
    // 1. Bulk insert orders in chunks of 50
    const orderChunks = chunkArray(allOrders, 50);
    for (let c = 0; c < orderChunks.length; c++) {
      const chunk = orderChunks[c];
      const values = [];
      const params = [];
      let paramIdx = 1;

      for (const ord of chunk) {
        values.push(`(
          $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++},
          $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++},
          $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++},
          $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++},
          $${paramIdx++}, $${paramIdx++}
        )`);
        params.push(
          ord.id, ord.customer_id, ord.store_id, ord.total_original_price, ord.total_discount_price,
          ord.discount_amount, ord.final_amount, ord.voucher_code, ord.status, ord.payment_method,
          ord.payment_status, ord.qr_code, ord.pickup_time, ord.note, ord.created_at, ord.updated_at,
          ord.completed_at, ord.cancelled_at, ord.cancel_reason, ord.paid_at, ord.recipient_name, ord.recipient_phone
        );
      }

      await client.query(
        `INSERT INTO public.orders (
          id, customer_id, store_id, total_original_price, total_discount_price,
          discount_amount, final_amount, voucher_code, status, payment_method,
          payment_status, qr_code, pickup_time, note, created_at, updated_at,
          completed_at, cancelled_at, cancel_reason, paid_at, recipient_name, recipient_phone
        ) VALUES ${values.join(',')}
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          final_amount = EXCLUDED.final_amount,
          created_at = EXCLUDED.created_at;`,
        params
      );
    }
    console.log(`✅ Đã insert thành công ${allOrders.length} orders.`);

    // 2. Bulk insert order items in chunks of 100
    const itemChunks = chunkArray(allOrderItems, 100);
    for (let c = 0; c < itemChunks.length; c++) {
      const chunk = itemChunks[c];
      const values = [];
      const params = [];
      let paramIdx = 1;

      for (const it of chunk) {
        values.push(`($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`);
        params.push(it.id, it.order_id, it.bag_id, it.bag_name, it.quantity, it.unit_price, it.total_price, it.created_at);
      }

      await client.query(
        `INSERT INTO public.order_items (
          id, order_id, bag_id, bag_name, quantity, unit_price, total_price, created_at
        ) VALUES ${values.join(',')}
        ON CONFLICT (id) DO NOTHING;`,
        params
      );
    }
    console.log(`✅ Đã insert thành công ${allOrderItems.length} order items.`);

    // 3. Bulk insert reviews in chunks of 50
    const reviewChunks = chunkArray(allReviews, 50);
    for (let c = 0; c < reviewChunks.length; c++) {
      const chunk = reviewChunks[c];
      const values = [];
      const params = [];
      let paramIdx = 1;

      for (const rev of chunk) {
        values.push(`($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`);
        params.push(rev.id, rev.order_id, rev.customer_id, rev.store_id, rev.rating, rev.comment, rev.created_at, rev.updated_at);
      }

      await client.query(
        `INSERT INTO public.reviews (
          id, order_id, customer_id, store_id, rating, comment, created_at, updated_at
        ) VALUES ${values.join(',')}
        ON CONFLICT (order_id) DO UPDATE SET
          rating = EXCLUDED.rating,
          comment = EXCLUDED.comment;`,
        params
      );
    }
    console.log(`✅ Đã insert thành công ${allReviews.length} reviews.`);

    // 4. Update store ratings
    for (const st of storeUpdates) {
      await client.query(
        'UPDATE public.stores SET rating = $1, total_ratings = $2 WHERE id = $3;',
        [st.rating, st.total_ratings, st.id]
      );
    }
    console.log(`✅ Đã cập nhật chỉ số đánh giá cho ${storeUpdates.length} cửa hàng.`);

    await client.query('COMMIT');

    console.log('🎉 QUÁ TRÌNH SEED HOÀN TẤT THÀNH CÔNG VƯỢT TRỘI!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Lỗi khi bulk insert:', err);
    throw err;
  } finally {
    await client.end();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
