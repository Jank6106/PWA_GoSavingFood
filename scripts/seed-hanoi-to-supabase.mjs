import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createClient } = require(require.resolve('@supabase/supabase-js', { paths: ['./apps/customer'] }));

const envContent = readFileSync('.env', 'utf8');
const parseEnv = (key) => {
  const match = envContent.match(new RegExp(`${key}=([^\\r\\n]+)`));
  return match ? match[1].replace(/['"]/g, '').trim() : '';
};

const supabase = createClient(parseEnv('SUPABASE_URL'), parseEnv('SUPABASE_ANON_KEY'));

// Danh sách 12 cửa hàng Hà Nội chuẩn
const STORES_DATA = [
  {
    localId: 'store-hn-01',
    name: 'Tous Les Jours - Hoàng Quốc Việt',
    description: 'Thương hiệu bánh ngọt và bánh mì tươi phong cách Pháp - Hàn Quốc cao cấp.',
    phone: '024 3755 8899',
    address: '234 Hoàng Quốc Việt, Cổ Nhuế 1, Bắc Từ Liêm, Hà Nội',
    logo: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200',
    banner: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800',
    open_time: '06:30:00',
    close_time: '22:00:00',
    latitude: 21.0465,
    longitude: 105.7892,
    categories: ['bakery'],
  },
  {
    localId: 'store-hn-02',
    name: 'Bếp Chay An Lạc - Cổ Nhuế',
    description: 'Cơm chay thanh tịnh, thực phẩm dinh dưỡng từ nấm và rau củ hữu cơ tươi ngon.',
    phone: '0988 234 112',
    address: '128 Cổ Nhuế, Cổ Nhuế 2, Bắc Từ Liêm, Hà Nội',
    logo: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200',
    banner: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
    open_time: '09:00:00',
    close_time: '21:00:00',
    latitude: 21.0620,
    longitude: 105.7765,
    categories: ['vegetarian'],
  },
  {
    localId: 'store-hn-03',
    name: 'Fresh Garden Bakery - Phạm Văn Đồng',
    description: 'Bánh tươi mỗi ngày, bánh mì gối dinh dưỡng, donut và bánh su kem béo ngậy.',
    phone: '024 3856 9900',
    address: '43 Phạm Văn Đồng, Mai Dịch, Cầu Giấy, Hà Nội',
    logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200',
    banner: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800',
    open_time: '07:00:00',
    close_time: '21:30:00',
    latitude: 21.0410,
    longitude: 105.7795,
    categories: ['bakery'],
  },
  {
    localId: 'store-hn-04',
    name: 'WinMart+ - Green Stars Phạm Văn Đồng',
    description: 'Siêu thị tiện lợi hàng đầu, rau củ quả VietGAP và thực phẩm sạch trong ngày.',
    phone: '024 7106 6866',
    address: 'Tòa 27A2 Green Stars, 234 Phạm Văn Đồng, Cổ Nhuế 1, Bắc Từ Liêm, Hà Nội',
    logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200',
    banner: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800',
    open_time: '06:00:00',
    close_time: '22:00:00',
    latitude: 21.0535,
    longitude: 105.7820,
    categories: ['raw_food'],
  },
  {
    localId: 'store-hn-05',
    name: 'Highlands Coffee - IPH Xuân Thủy',
    description: 'Cà phê rang xay đậm đà phong vị Việt cùng bánh ngọt và trà hoa quả thanh mát.',
    phone: '024 3795 4242',
    address: '241 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
    logo: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=200',
    banner: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800',
    open_time: '07:00:00',
    close_time: '23:00:00',
    latitude: 21.0368,
    longitude: 105.7828,
    categories: ['beverage'],
  },
  {
    localId: 'store-hn-06',
    name: 'Cơm Niêu Singapore KOMBO - Duy Tân',
    description: 'Cơm niêu giòn rụm hai mặt hòa quyện cùng sốt bò tiêu đen và sốt gà nấm đặc sản.',
    phone: '0971 615 775',
    address: '86 Duy Tân, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
    logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200',
    banner: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
    open_time: '10:00:00',
    close_time: '21:00:00',
    latitude: 21.0315,
    longitude: 105.7835,
    categories: ['meat'],
  },
  {
    localId: 'store-hn-07',
    name: 'Bánh Mì Dân Tổ - Trần Cung',
    description: 'Đặc sản bánh mì pate trứng xào trứ danh Hà Thành, giòn rụm và thơm nức mũi.',
    phone: '0963 882 190',
    address: '96 Trần Cung, Cổ Nhuế 1, Bắc Từ Liêm, Hà Nội',
    logo: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=200',
    banner: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800',
    open_time: '06:00:00',
    close_time: '22:00:00',
    latitude: 21.0498,
    longitude: 105.7865,
    categories: ['bakery'],
  },
  {
    localId: 'store-hn-08',
    name: 'Nước Ép Juicy Garden - Chùa Láng',
    description: 'Nước ép trái cây tươi nguyên chất 100% không thêm đường và sinh tố detox mát lành.',
    phone: '0912 345 678',
    address: '112 Chùa Láng, Láng Thượng, Đống Đa, Hà Nội',
    logo: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=200',
    banner: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=800',
    open_time: '08:00:00',
    close_time: '22:00:00',
    latitude: 21.0265,
    longitude: 105.8035,
    categories: ['beverage'],
  },
  {
    localId: 'store-hn-09',
    name: 'Bếp Cơm Quê Mẹ Nấu - Hồ Tùng Mậu',
    description: 'Cơm trưa đậm đà hương vị gia đình Bắc Bộ, canh cua rau đay và thịt rang cháy cạnh.',
    phone: '0945 678 910',
    address: '136 Hồ Tùng Mậu, Mai Dịch, Cầu Giấy, Hà Nội',
    logo: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200',
    banner: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
    open_time: '10:30:00',
    close_time: '20:30:00',
    latitude: 21.0395,
    longitude: 105.7695,
    categories: ['meat'],
  },
  {
    localId: 'store-hn-10',
    name: 'Nhà Hàng Chay Vị Lai - Lý Thường Kiệt',
    description: 'Ẩm thực chay nghệ thuật cao cấp giữa lòng thủ đô, không gian thanh tịnh an nhiên.',
    phone: '0853 535 656',
    address: '67 Lý Thường Kiệt, Trần Hưng Đạo, Hoàn Kiếm, Hà Nội',
    logo: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200',
    banner: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
    open_time: '09:30:00',
    close_time: '22:00:00',
    latitude: 21.0245,
    longitude: 105.8495,
    categories: ['vegetarian'],
  },
  {
    localId: 'store-hn-11',
    name: 'Bơ Bồng Bềnh Bakery - Liễu Giai',
    description: 'Bánh kem bắp mềm tan, tart trứng bơ thơm lừng và bánh mì hoa cúc brioche cao cấp.',
    phone: '0936 123 789',
    address: '54 Liễu Giai, Cống Vị, Ba Đình, Hà Nội',
    logo: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200',
    banner: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800',
    open_time: '08:00:00',
    close_time: '21:30:00',
    latitude: 21.0345,
    longitude: 105.8142,
    categories: ['bakery'],
  },
  {
    localId: 'store-hn-12',
    name: 'Lạc Trà & Hoa Quả Tươi - Tây Hồ',
    description: 'Trà sen Tây Hồ thơm ngát, trà ô long mãng cầu tươi cùng đĩa hoa quả nhiệt đới tươi sạch.',
    phone: '0904 889 900',
    address: '18 Đặng Thai Mai, Quảng An, Tây Hồ, Hà Nội',
    logo: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=200',
    banner: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800',
    open_time: '07:30:00',
    close_time: '22:30:00',
    latitude: 21.0665,
    longitude: 105.8235,
    categories: ['beverage'],
  },
];

// Danh sách các túi mù đại diện
const BAGS_DATA = [
  // Store 1
  {
    storeLocalId: 'store-hn-01',
    name: 'Túi Bánh Mì & Pastry Cuối Ngày',
    description: 'Bao gồm 3-4 loại bánh mì nướng tươi trong ngày: bánh sừng bò, bánh mì phô mai mềm và bánh ngọt pastry.',
    original_price: 110000,
    discount_price: 35000,
    category: 'bakery',
    image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600',
    quantity: 5,
    pickup_start: '19:30:00',
    pickup_end: '22:00:00',
  },
  {
    storeLocalId: 'store-hn-01',
    name: 'Túi Bánh Ngọt Pháp & Croissant Bơ',
    description: 'Croissant ngàn lớp giòn rụm bơ Pháp, pain au chocolat và bánh su mềm béo ngậy.',
    original_price: 130000,
    discount_price: 45000,
    category: 'bakery',
    image_url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600',
    quantity: 4,
    pickup_start: '20:00:00',
    pickup_end: '22:00:00',
  },
  // Store 2
  {
    storeLocalId: 'store-hn-02',
    name: 'Phần Cơm Chay Thực Dưỡng Sen Vàng',
    description: 'Cơm gạo lứt huyết rồng, đậu hũ sốt nấm hương, chả giò chay nấm và canh rong biển thanh mát.',
    original_price: 70000,
    discount_price: 35000,
    category: 'vegetarian',
    image_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600',
    quantity: 6,
    pickup_start: '13:00:00',
    pickup_end: '14:30:00',
  },
  {
    storeLocalId: 'store-hn-02',
    name: 'Túi Bún Nem Chay & Giò Nấm Hà Thành',
    description: 'Bún tươi mềm dẻo, nem rán giòn vỏ, giò nấm thủ công ăn kèm nước chấm chua ngọt tỏi ớt chay.',
    original_price: 65000,
    discount_price: 30000,
    category: 'vegetarian',
    image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600',
    quantity: 5,
    pickup_start: '19:00:00',
    pickup_end: '21:00:00',
  },
  // Store 3
  {
    storeLocalId: 'store-hn-03',
    name: 'Túi Bánh Mì Gối Sandwich & Donut Phô Mai',
    description: 'Bánh mì gối vuông mềm mịn thơm bơ và 2 chiếc bánh donut rắc đường phô mai béo ngậy.',
    original_price: 90000,
    discount_price: 32000,
    category: 'bakery',
    image_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600',
    quantity: 5,
    pickup_start: '19:30:00',
    pickup_end: '21:30:00',
  },
  // Store 4
  {
    storeLocalId: 'store-hn-04',
    name: 'Túi Rau Củ Hữu Cơ & Nấm Tươi Trong Ngày',
    description: 'Rau cải xanh VietGAP, cà chua bi organic, dưa chuột và khay nấm đùi gà tươi ngon.',
    original_price: 95000,
    discount_price: 35000,
    category: 'raw_food',
    image_url: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600',
    quantity: 8,
    pickup_start: '18:00:00',
    pickup_end: '21:30:00',
  },
  // Store 5
  {
    storeLocalId: 'store-hn-05',
    name: 'Túi Bánh Ngọt Mousse & Trà Thạch Đào',
    description: 'Bánh mousse đào mềm mịn kết hợp cùng một ly Trà thạch đào thơm ngọt thanh nhiệt ngày hè.',
    original_price: 85000,
    discount_price: 35000,
    category: 'beverage',
    image_url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600',
    quantity: 5,
    pickup_start: '20:30:00',
    pickup_end: '23:00:00',
  },
  // Store 6
  {
    storeLocalId: 'store-hn-06',
    name: 'Suất Cơm Niêu Bò Nướng Sốt Tiêu Đen',
    description: 'Cơm niêu cháy hai mặt giòn rụm, thịt bò ướp đậm đà nước sốt tiêu đen đặc sản cay nồng nàn.',
    original_price: 115000,
    discount_price: 49000,
    category: 'meat',
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
    quantity: 4,
    pickup_start: '13:30:00',
    pickup_end: '14:30:00',
  },
  // Store 7 - Bánh Mì Dân Tổ
  {
    storeLocalId: 'store-hn-07',
    name: 'Combo 2 Bánh Mì Dân Tổ Nhân Thập Cẩm Đầy Đặn',
    description: '2 ổ bánh mì giòn tan ngập nhân pate trứng xúc xích chả xào hành tây thơm nức mũi.',
    original_price: 70000,
    discount_price: 29000,
    category: 'bakery',
    image_url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600',
    quantity: 6,
    pickup_start: '19:00:00',
    pickup_end: '22:00:00',
  },
  // Store 8
  {
    storeLocalId: 'store-hn-08',
    name: 'Chai 500ml Nước Ép Cần Tây Dứa Táo Detox',
    description: 'Ép lạnh nguyên chất 100% thanh lọc cơ thể, giữ trọn enzyme và vitamin tự nhiên.',
    original_price: 65000,
    discount_price: 28000,
    category: 'beverage',
    image_url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600',
    quantity: 5,
    pickup_start: '17:30:00',
    pickup_end: '21:00:00',
  },
  // Store 9
  {
    storeLocalId: 'store-hn-09',
    name: 'Suất Cơm Tấm Sườn Non Rim Mặn Ngọt',
    description: 'Sườn thăn sụn non rim nước sốt cà chua dứa óng ánh, dưa chua xào lòng mề và cơm nóng.',
    original_price: 80000,
    discount_price: 39000,
    category: 'meat',
    image_url: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=600',
    quantity: 4,
    pickup_start: '19:30:00',
    pickup_end: '20:30:00',
  },
  // Store 10
  {
    storeLocalId: 'store-hn-10',
    name: 'Túi Cao Cấp Vị Lai: Súp Nấm Rừng & Cơm Lá Sen',
    description: 'Súp nấm tuyết đông trùng hạ thảo, cơm gạo sen gói lá sen hương thơm quý phái và chả nấm mối nướng.',
    original_price: 140000,
    discount_price: 55000,
    category: 'vegetarian',
    image_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600',
    quantity: 3,
    pickup_start: '20:00:00',
    pickup_end: '22:00:00',
  },
  // Store 11
  {
    storeLocalId: 'store-hn-11',
    name: 'Túi Bánh Kem Bắp & Tart Trứng Nướng Phô Mai',
    description: 'Hộp bánh kem bắp cốt bánh chiffon siêu mềm mịn thơm bơ và 2 chiếc tart trứng vỏ ngàn lớp giòn tan.',
    original_price: 95000,
    discount_price: 39000,
    category: 'bakery',
    image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600',
    quantity: 5,
    pickup_start: '19:30:00',
    pickup_end: '21:30:00',
  },
  // Store 12
  {
    storeLocalId: 'store-hn-12',
    name: 'Túi Trà Ô Long Mãng Cầu Tươi & Trái Cây Cắt Sẵn',
    description: 'Ly trà ô long thượng hạng dầm mãng cầu tươi ngọt thanh cùng khay dưa hấu và ổi ruby cắt sẵn ướp lạnh.',
    original_price: 85000,
    discount_price: 35000,
    category: 'beverage',
    image_url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600',
    quantity: 6,
    pickup_start: '19:00:00',
    pickup_end: '22:00:00',
  },
];

async function seed() {
  console.log('--- BẮT ĐẦU ĐỒNG BỘ CỬA HÀNG VÀ TÚI HÀNG VÀO DATABASE SUPABASE ---');

  // Đăng nhập tài khoản test
  const { data: auth, error: aErr } = await supabase.auth.signInWithPassword({
    email: 'cus_test_987654@example.com',
    password: 'Password123!',
  });
  if (aErr) throw new Error('Đăng nhập thất bại: ' + aErr.message);
  const userId = auth.user.id;
  console.log(`Đã xác thực user ID: ${userId}`);

  // 1. Lấy toàn bộ stores hiện có trong DB
  const { data: existingStores, error: sErr } = await supabase
    .from('stores')
    .select('id, name, rating, total_ratings');
  if (sErr) throw new Error('Lỗi lấy stores: ' + sErr.message);

  const storeMapByName = new Map();
  for (const s of (existingStores || [])) {
    storeMapByName.set(s.name, s);
  }

  const localToDbStoreId = {};

  // 2. Tạo hoặc lấy ID cho 12 cửa hàng Hà Nội
  for (const st of STORES_DATA) {
    let dbStore = storeMapByName.get(st.name);
    if (!dbStore) {
      console.log(`Creating store in DB: ${st.name}...`);
      const { data: newStores, error: createErr } = await supabase.rpc('create_store', {
        p_owner_user_id: userId,
        p_name: st.name,
        p_description: st.description,
        p_phone: st.phone,
        p_address: st.address,
        p_latitude: st.latitude,
        p_longitude: st.longitude,
        p_logo_url: st.logo,
        p_banner_url: st.banner,
        p_food_categories: st.categories,
        p_open_time: st.open_time,
        p_close_time: st.close_time,
        p_is_open: true,
      });

      if (createErr || !newStores || newStores.length === 0) {
        console.error(`Lỗi tạo store ${st.name}:`, createErr?.message);
        continue;
      }
      dbStore = newStores[0];
      console.log(`✅ Đã tạo store DB: ${st.name} (UUID: ${dbStore.id})`);
    } else {
      console.log(`Đã tồn tại store DB: ${st.name} (UUID: ${dbStore.id})`);
    }

    localToDbStoreId[st.localId] = dbStore.id;
  }

  // 3. Đồng bộ Surprise Bags vào DB
  console.log('\n--- ĐỒNG BỘ SURPRISE BAGS VÀO DB ---');
  for (const bg of BAGS_DATA) {
    const storeUuid = localToDbStoreId[bg.storeLocalId];
    if (!storeUuid) continue;

    // Kiểm tra xem bag này đã có chưa
    const { data: existingBags } = await supabase
      .from('surprise_bags')
      .select('id, name')
      .eq('store_id', storeUuid)
      .eq('name', bg.name)
      .limit(1);

    if (existingBags && existingBags.length > 0) {
      console.log(`Bag đã tồn tại: "${bg.name}" (Store: ${bg.storeLocalId})`);
      continue;
    }

    console.log(`Inserting bag: "${bg.name}"...`);
    const { data: createdBag, error: bErr } = await supabase
      .from('surprise_bags')
      .insert({
        store_id: storeUuid,
        name: bg.name,
        description: bg.description,
        original_price: bg.original_price,
        discount_price: bg.discount_price,
        category: bg.category,
        image_url: bg.image_url,
        quantity: bg.quantity,
        max_quantity: 2,
        pickup_start: bg.pickup_start,
        pickup_end: bg.pickup_end,
        is_daily: true,
        is_available: true,
        expires_at: new Date(Date.now() + 86400000 * 30).toISOString(),
      })
      .select()
      .single();

    if (bErr) {
      console.error(`Lỗi tạo bag "${bg.name}":`, bErr.message);
    } else {
      console.log(`✅ Đã tạo bag DB: "${bg.name}" (UUID: ${createdBag.id})`);
    }
  }

  // Lưu file mapping để frontend hoặc migration tra cứu
  writeFileSync('scripts/hanoi-store-map.json', JSON.stringify(localToDbStoreId, null, 2));
  console.log('\n✅ Hoàn thành đồng bộ! File mapping đã lưu tại scripts/hanoi-store-map.json');
}

seed().catch(console.error);
