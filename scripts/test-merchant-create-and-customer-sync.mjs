import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const envText = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq > 0) env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
}

const supabaseUrl = env.SUPABASE_URL.replace('/rest/v1/', '').replace('/rest/v1', '');
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFlow() {
  console.log('=== TEST LUỒNG TẠO SẢN PHẨM & ĐỒNG BỘ 2 APP ===\n');

  // 1. Lấy store có sẵn trong database
  const { data: stores, error: storeErr } = await supabase
    .from('stores')
    .select('id, name')
    .eq('status', 'active')
    .limit(1);

  if (storeErr || !stores || stores.length === 0) {
    throw new Error('Không tìm thấy store nào: ' + (storeErr?.message || 'Empty'));
  }

  const testStore = stores[0];
  console.log(`[Merchant] Tìm thấy Store để tạo sản phẩm: "${testStore.name}" (ID: ${testStore.id})`);

  // 2. Giả lập ảnh tải lên từ máy (Base64 PNG 1x1 pixel hoặc ảnh hợp lệ)
  const sampleBase64Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  console.log('[Merchant] Đã chuẩn bị ảnh tải lên từ máy (Base64 Data URL)');

  // 3. Thực hiện tạo túi hàng (Simulate Merchant App: createBagItem)
  const testBagName = `Túi Bánh Test API ${Date.now().toString().slice(-4)}`;
  const bagPayload = {
    store_id: testStore.id,
    name: testBagName,
    description: 'Túi bánh thử nghiệm luồng Merchant -> Customer đồng bộ tự động',
    original_price: 60000,
    discount_price: 25000,
    category: 'bakery',
    image_url: sampleBase64Png,
    quantity: 5,
    max_quantity: 2,
    pickup_start: '17:00:00',
    pickup_end: '19:30:00',
    is_daily: true,
    is_available: true,
    expires_at: new Date(Date.now() + 86400000 * 3).toISOString(),
  };

  console.log(`[Merchant] Gửi request tạo sản phẩm "${testBagName}" vào bảng surprise_bags...`);
  const { data: createdBag, error: insertError } = await supabase
    .from('surprise_bags')
    .insert(bagPayload)
    .select()
    .single();

  if (insertError) {
    throw new Error(`[Merchant] Lỗi khi tạo sản phẩm: ${insertError.message}`);
  }

  console.log(`[Merchant] ✅ Tạo sản phẩm THÀNH CÔNG!`);
  console.log(`          ID: ${createdBag.id}`);
  console.log(`          Tên: ${createdBag.name}`);
  console.log(`          Giá giảm: ${createdBag.discount_price}đ (Gốc: ${createdBag.original_price}đ)`);
  console.log(`          Số lượng: ${createdBag.quantity}`);
  console.log(`          Ảnh: ${createdBag.image_url.slice(0, 30)}...`);

  // 4. Kiểm tra Customer App đồng bộ sản phẩm (Simulate Customer App: getHome / getBags)
  console.log('\n[Customer] Kiểm tra Customer App truy vấn danh sách túi mới nhất...');
  const { data: customerBags, error: customerErr } = await supabase
    .from('surprise_bags')
    .select('*, stores(name, logo_url, address)')
    .eq('is_available', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(10);

  if (customerErr) {
    throw new Error(`[Customer] Lỗi truy vấn Customer: ${customerErr.message}`);
  }

  const syncedBag = customerBags?.find((b) => b.id === createdBag.id);
  if (!syncedBag) {
    throw new Error(`[Customer] ❌ THẤT BẠI: Không tìm thấy sản phẩm ${createdBag.id} trong danh sách Customer!`);
  }

  console.log(`[Customer] ✅ ĐỒNG BỘ THÀNH CÔNG!`);
  console.log(`          Tìm thấy túi: "${syncedBag.name}"`);
  console.log(`          Cửa hàng: "${syncedBag.stores?.name}"`);
  console.log(`          Giá hiển thị cho khách: ${syncedBag.discount_price.toLocaleString('vi-VN')}đ`);
  console.log(`          Ảnh hiển thị: ${syncedBag.image_url ? 'Hợp lệ' : 'Trống'}`);

  // 5. Cleanup test bag
  console.log('\n[Dọn dẹp] Xóa túi test khỏi Database...');
  await supabase.from('surprise_bags').delete().eq('id', createdBag.id);
  console.log('[Dọn dẹp] ✅ Đã dọn dẹp dữ liệu test sạch sẽ.');

  console.log('\n🎉 KẾT QUẢ: Toàn bộ luồng tạo sản phẩm trên Merchant và đồng bộ sang Customer hoạt động 100% chính xác!');
}

testFlow().catch((err) => {
  console.error('\n❌ TEST THẤT BẠI:', err.message);
  process.exit(1);
});
