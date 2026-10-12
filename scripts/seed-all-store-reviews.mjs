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
const storeMap = JSON.parse(readFileSync('scripts/hanoi-store-map.json', 'utf8'));

// Dữ liệu đánh giá mẫu chi tiết cho từng cửa hàng
const STORE_REVIEWS_SEED = {
  'store-hn-01': [
    { rating: 5, comment: 'Bánh mì tươi và thơm ngon tuyệt vời, tiết kiệm được rất nhiều tiền! Rất ủng hộ chiến dịch giải cứu thực phẩm.' },
    { rating: 5, comment: 'Croissant bơ thơm lừng, vỏ ngàn lớp giòn rụm. Nhận hàng lúc 20h bánh vẫn còn rất mới.' },
    { rating: 5, comment: 'Combo bánh gối mềm và bánh mặn ăn sáng siêu tiện lợi. Giá rẻ hơn nửa so với mua lẻ ban ngày.' },
  ],
  'store-hn-02': [
    { rating: 5, comment: 'Cơm chay rất ngon và đậm vị! Suất ăn đầy đặn, rau nấm tươi rói. Sẽ tiếp tục ủng hộ quán.' },
    { rating: 5, comment: 'Bún nem chay giòn tan, nước chấm chua ngọt pha chuẩn vị Hà Nội. Quán phục vụ nhiệt tình.' },
    { rating: 4, comment: 'Phần ăn nhiều, đóng gói hộp bã mía thân thiện với môi trường. Đồ ăn ấm nóng vừa miệng.' },
  ],
  'store-hn-03': [
    { rating: 5, comment: 'Bánh su kem và donut phô mai béo ngậy, các bé nhà mình mê tít. Cảm ơn GoSavingFood!' },
    { rating: 4, comment: 'Bánh mì gối vuông mềm xốp, date sản xuất trong ngày. Tiết kiệm được một khoản đáng kể.' },
    { rating: 5, comment: 'Chất lượng bánh Fresh Garden thì khỏi bàn rồi, giải cứu thực phẩm cuối ngày giá quá hời.' },
  ],
  'store-hn-04': [
    { rating: 5, comment: 'Túi rau củ VietGAP còn rất tươi ngon, nấm đùi gà chắc nịch. Đóng gói cẩn thận.' },
    { rating: 5, comment: 'Siêu thị chuẩn bị túi nhanh gọn, rau sạch về nấu canh và xào ăn ngọt lịm.' },
    { rating: 4, comment: 'Rau củ tươi sạch trong ngày, tiết kiệm được 60% so với giá niêm yết trên kệ.' },
  ],
  'store-hn-05': [
    { rating: 5, comment: 'Bánh mousse đào mềm mịn kết hợp trà thạch đào thanh mát, giải nhiệt mùa hè cực đã.' },
    { rating: 5, comment: 'Cà phê phin sữa đậm đà kèm bánh phô mai béo ngậy. Nhân viên Highlands hỗ trợ nhận túi rất nhanh.' },
    { rating: 5, comment: 'Túi mù bánh mì que giòn rụm và freeze trà xanh đỉnh chóp. Trải nghiệm tuyệt vời!' },
  ],
  'store-hn-06': [
    { rating: 5, comment: 'Cơm niêu cháy hai mặt giòn rụm, thịt bò sốt tiêu đen cay nồng thơm lừng. Suất ăn no căng bụng.' },
    { rating: 5, comment: 'Đồ ăn nóng hổi, nhận lúc 14h chiều vẫn ngon chuẩn vị như ăn tại bàn.' },
    { rating: 4, comment: 'Sốt nấm đậm đà, thịt gà mềm ngọt. Giải cứu bữa trưa chất lượng cao giá siêu tiết kiệm.' },
  ],
  'store-hn-07': [
    { rating: 5, comment: 'Đặc sản bánh mì dân tổ pate trứng xúc xích xào hành tây thơm nức mũi, giòn rụm ăn mê luôn!' },
    { rating: 5, comment: '2 ổ bánh mì đầy ắp nhân, sốt béo ngậy chuẩn vị phố cổ. Mua túi giải cứu rẻ hơn mua trực tiếp nhiều.' },
    { rating: 4, comment: 'Bánh mì giòn nóng, nhân đậm đà. Đặt lấy lúc 20h tối làm bữa khuya quá chuẩn.' },
  ],
  'store-hn-08': [
    { rating: 5, comment: 'Nước ép nguyên chất 100% không đường, uống thanh mát detox cơ thể cực kỳ sảng khoái.' },
    { rating: 5, comment: 'Chai nước ép cần tây dứa táo thơm ngon, vị dễ uống, trái cây tươi ép trong ngày.' },
    { rating: 5, comment: 'Đóng chai thủy tinh sạch đẹp, bảo quản lạnh tốt. Sẽ ủng hộ quán lâu dài.' },
  ],
  'store-hn-09': [
    { rating: 5, comment: 'Cơm sườn non rim chua ngọt đậm đà, canh cua rau đay chuẩn vị mẹ nấu ngoài quê.' },
    { rating: 4, comment: 'Suất cơm đầy đặn thịt thà, dưa chua xào giòn sần sật. Tiết kiệm bữa tối tiện lợi.' },
    { rating: 5, comment: 'Cơm dẻo thơm, đồ ăn sạch sẽ hợp vệ sinh. Rất khuyến khích mọi người ủng hộ quán.' },
  ],
  'store-hn-10': [
    { rating: 5, comment: 'Món chay nghệ thuật đỉnh cao, súp nấm rừng và cơm gói lá sen thơm thanh tịnh quý phái.' },
    { rating: 5, comment: 'Nem rong biển và salad sốt chanh leo tươi mát, trải nghiệm ẩm thực chay đẳng cấp.' },
    { rating: 5, comment: 'Nhà hàng đóng gói hộp cao cấp, đồ ăn tinh tế bổ dưỡng. 10 điểm chất lượng!' },
  ],
  'store-hn-11': [
    { rating: 5, comment: 'Bánh kem bắp mềm tan chảy trong miệng, tart trứng vỏ ngàn lớp giòn rụm béo bùi.' },
    { rating: 5, comment: 'Bánh mì hoa cúc brioche bơ Pháp thơm ngậy nức mũi. Bánh tươi mới nguyên trong ngày.' },
    { rating: 4, comment: 'Chất lượng bánh chuẩn bakery cao cấp, giá giải cứu siêu yêu thương.' },
  ],
  'store-hn-12': [
    { rating: 5, comment: 'Trà ô long mãng cầu tươi dầm ngọt thanh mát lạnh, khay dưa hấu và ổi ruby cắt sẵn ướp lạnh giòn ngọt.' },
    { rating: 5, comment: 'Trà sen Tây Hồ hương thơm dịu nhẹ, trái cây tươi sạch ăn kèm buổi tối rất healthy.' },
    { rating: 4, comment: 'Đồ uống và hoa quả tươi ngon, đóng gói sạch sẽ có sẵn nĩa và ống hút giấy.' },
  ],
};

async function seedAllReviews() {
  console.log('--- BẮT ĐẦU SEED ĐÁNH GIÁ VÀ SAO MẪU CHO TẤT CẢ CỬA HÀNG VÀO SUPABASE ---');

  // Đăng nhập tài khoản test
  const { data: auth, error: aErr } = await supabase.auth.signInWithPassword({
    email: 'cus_test_987654@example.com',
    password: 'Password123!',
  });
  if (aErr) throw new Error('Đăng nhập thất bại: ' + aErr.message);
  const customerId = auth.user.id;
  console.log(`Đã xác thực user ID: ${customerId}`);

  let totalOrdersCreated = 0;
  let totalReviewsCreated = 0;

  let storeIndex = 0;
  for (const [localStoreId, storeUuid] of Object.entries(storeMap)) {
    storeIndex++;
    const reviews = STORE_REVIEWS_SEED[localStoreId] || [];
    console.log(`\n[${storeIndex}/12] Đang xử lý ${localStoreId} (UUID: ${storeUuid})...`);

    // Lấy 1 surprise bag của store này
    const { data: bags } = await supabase
      .from('surprise_bags')
      .select('id, name, discount_price')
      .eq('store_id', storeUuid)
      .limit(1);

    const bag = bags && bags.length > 0 ? bags[0] : null;

    let reviewIndex = 0;
    for (const rev of reviews) {
      reviewIndex++;
      // Tạo UUID đơn định hình cho order và review
      const orderHex = storeIndex.toString(16).padStart(2, '0') + reviewIndex.toString(16).padStart(2, '0');
      const orderId = `d2000000-0000-0000-0000-00000000${orderHex}`;
      const reviewId = `e2000000-0000-0000-0000-00000000${orderHex}`;

      // 1. Kiểm tra / Tạo Order
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('id', orderId)
        .maybeSingle();

      if (!existingOrder) {
        const orderTime = new Date(Date.now() - (storeIndex * 3600000 * 4 + reviewIndex * 3600000 * 2)).toISOString();
        const { error: oErr } = await supabase.from('orders').insert({
          id: orderId,
          customer_id: customerId,
          store_id: storeUuid,
          total_original_price: 100000,
          total_discount_price: 45000,
          discount_amount: 0,
          final_amount: 45000,
          status: 'completed',
          payment_method: 'banking',
          payment_status: 'success',
          qr_code: `GSF-ORDER-${orderHex.toUpperCase()}`,
          pickup_time: orderTime,
          completed_at: orderTime,
          created_at: orderTime,
        });

        if (oErr) {
          console.warn(`  Lỗi tạo order ${orderId}:`, oErr.message);
          continue;
        }

        if (bag) {
          await supabase.from('order_items').insert({
            order_id: orderId,
            bag_id: bag.id,
            bag_name: bag.name,
            quantity: 1,
            unit_price: bag.discount_price,
            total_price: bag.discount_price,
            created_at: orderTime,
          });
        }
        totalOrdersCreated++;
      }

      // 2. Kiểm tra / Tạo Review
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('id', reviewId)
        .maybeSingle();

      if (!existingReview) {
        const reviewTime = new Date(Date.now() - (storeIndex * 3600000 * 4 + reviewIndex * 3600000 * 1)).toISOString();
        const { error: rErr } = await supabase.from('reviews').insert({
          id: reviewId,
          order_id: orderId,
          customer_id: customerId,
          store_id: storeUuid,
          rating: rev.rating,
          comment: rev.comment,
          created_at: reviewTime,
        });

        if (rErr) {
          console.warn(`  Lỗi tạo review ${reviewId}:`, rErr.message);
        } else {
          totalReviewsCreated++;
          console.log(`  ⭐ Đã tạo review (${rev.rating}★): "${rev.comment.slice(0, 45)}..."`);
        }
      }
    }
  }

  console.log(`\n======================================================`);
  console.log(`✅ HOÀN TẤT SEED!`);
  console.log(`- Số đơn hàng mới tạo: ${totalOrdersCreated}`);
  console.log(`- Số đánh giá mới tạo: ${totalReviewsCreated}`);

  // 3. Kiểm tra lại rating & total_ratings của tất cả các store từ Supabase
  console.log(`\n--- KIỂM TRA ĐIỂM SAO VÀ SỐ LƯỢNG ĐÁNH GIÁ TRONG SUPABASE ---`);
  const { data: updatedStores } = await supabase
    .from('stores')
    .select('id, name, rating, total_ratings')
    .like('address', '%Hà Nội%');

  for (const s of (updatedStores || [])) {
    console.log(`- ${s.name}: ${s.rating}★ (${s.total_ratings} đánh giá)`);
  }
}

seedAllReviews().catch(console.error);
