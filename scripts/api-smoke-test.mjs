/**
 * scripts/api-smoke-test.mjs — Kiểm thử end-to-end API thật trên Supabase.
 *
 * Cách chạy: node scripts/api-smoke-test.mjs
 * Lưu ý: script TẠO dữ liệu test (2 tài khoản smoke, 1 store test, túi mù, đơn hàng)
 * và bật vài túi mù của store seed để demo. Không đụng dữ liệu khác.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(HERE, '..');

const parseEnvFile = (text) => {
  const map = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    map[key] = value;
  }
  return map;
};

const env = parseEnvFile(readFileSync(resolve(ROOT_DIR, '.env'), 'utf8'));
const baseUrl = String(env.SUPABASE_URL || '')
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/$/, '');
const anonKey = env.SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!baseUrl || !anonKey || !serviceKey) {
  console.error('❌ Thiếu SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY trong .env');
  process.exit(1);
}

let passed = 0;
let failed = 0;
const check = (label, ok, detail = '') => {
  if (ok) {
    passed += 1;
    console.log(`✅ ${label}${detail ? ' — ' + detail : ''}`);
  } else {
    failed += 1;
    console.error(`❌ ${label}${detail ? ' — ' + detail : ''}`);
  }
};

const request = async (path, options = {}, token = anonKey) => {
  const apiKey = token === serviceKey ? serviceKey : anonKey;
  const response = await fetch(baseUrl + path, {
    ...options,
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: response.status, body };
};

const ensureAuthUser = async (email, password, metadata) => {
  const result = await request(
    '/auth/v1/admin/users',
    { method: 'POST', body: JSON.stringify({ email, password, email_confirm: true, user_metadata: metadata }) },
    serviceKey
  );
  if (result.status === 200 || result.status === 201) return { id: result.body?.id, created: true };

  const message = String(result.body?.msg || result.body?.message || '');
  if (message.toLowerCase().includes('already')) return { id: null, created: false };
  throw new Error(`Không tạo được user ${email}: ${result.status} ${message}`);
};

const signIn = async (email, password) => {
  const result = await request('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return result.body?.access_token || null;
};

const rpc = (name, token, body) =>
  request(`/rest/v1/rpc/${name}`, { method: 'POST', body: JSON.stringify(body) }, token);

// Kéo id user đã tồn tại theo email (dành cho lần chạy thứ 2 trở đi)
const findUserIdByEmail = async (email) => {
  const result = await request('/rest/v1/users?select=id&email=eq.' + encodeURIComponent(email), {}, serviceKey);
  return Array.isArray(result.body) && result.body[0] ? result.body[0].id : null;
};

console.log(`\n🔎 Smoke test API thật — ${baseUrl}\n`);
const CUSTOMER_EMAIL = 'smoke-customer@gosavingfood.vn';
const MERCHANT_EMAIL = 'smoke-merchant@gosavingfood.vn';
const PASSWORD = 'SmokeTest123!';

const ensureUserProfile = async (id, name, phone, role) => {
  const existing = await request(`/rest/v1/users?select=id&id=eq.${id}`, {}, serviceKey);
  if (Array.isArray(existing.body) && existing.body.length > 0) {
    await request(
      `/rest/v1/users?id=eq.${id}`,
      { method: 'PATCH', body: JSON.stringify({ name, phone, role }) },
      serviceKey
    );
  } else {
    await request(
      '/rest/v1/users',
      { method: 'POST', body: JSON.stringify({ id, name, phone, role }) },
      serviceKey
    );
  }
};

// 1) Tài khoản smoke
await ensureAuthUser(CUSTOMER_EMAIL, PASSWORD, { name: 'Smoke Customer', phone: '+84900000991' });
await ensureAuthUser(MERCHANT_EMAIL, PASSWORD, { name: 'Smoke Merchant', phone: '+84900000992' });

const customerToken = await signIn(CUSTOMER_EMAIL, PASSWORD);
const merchantToken = await signIn(MERCHANT_EMAIL, PASSWORD);
check('Đăng nhập customer smoke', Boolean(customerToken));
check('Đăng nhập merchant smoke', Boolean(merchantToken));
if (!customerToken || !merchantToken) process.exit(1);

const customerId = (await request('/auth/v1/user', {}, customerToken)).body?.id;
const merchantId = (await request('/auth/v1/user', {}, merchantToken)).body?.id;
await ensureUserProfile(customerId, 'Smoke Customer', '+84900000991', 'customer');
await ensureUserProfile(merchantId, 'Smoke Merchant', '+84900000992', 'merchant');

// 2) Merchant: lấy / tạo store
let storeId = null;
const storeByOwner = await rpc('get_store_by_owner', merchantToken, { p_owner_user_id: merchantId });
const storeRows = Array.isArray(storeByOwner.body) ? storeByOwner.body : [];
if (storeRows.length > 0) {
  storeId = storeRows[0].id;
  check('Merchant có store (RPC get_store_by_owner)', true, storeId);
} else {
  const created = await rpc('create_store', merchantToken, {
    p_owner_user_id: merchantId,
    p_name: 'Smoke Test Store',
    p_description: 'Cửa hàng kiểm thử tự động (api-smoke-test)',
    p_phone: '+84900000992',
    p_address: '12 Nguyễn Huệ, Quận 1, TP.HCM',
    p_latitude: 10.7743,
    p_longitude: 106.7038,
    p_logo_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200',
    p_banner_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
    p_food_categories: ['bakery'],
    p_open_time: '08:00:00',
    p_close_time: '22:00:00',
    p_is_open: true,
  });
  storeId = Array.isArray(created.body) ? created.body[0]?.id : created.body?.id;
  check('Tạo store qua RPC create_store', Boolean(storeId), `HTTP ${created.status}`);
}

// 3) Đảm bảo toạ độ/location cho tìm kiếm gần đây
const locationUpdate = await rpc('update_store_location_and_fields', merchantToken, {
  p_owner_user_id: merchantId,
  p_latitude: 10.7743,
  p_longitude: 106.7038,
  p_updates: { name: 'Smoke Test Store' },
});
check(
  'Cập nhật vị trí store (RPC update_store_location_and_fields)',
  locationUpdate.status === 200 &&
    (Array.isArray(locationUpdate.body)
      ? locationUpdate.body.length > 0
      : Boolean(locationUpdate.body)),
  `HTTP ${locationUpdate.status} ${JSON.stringify(locationUpdate.body).slice(0, 220)}`
);

// 4) Merchant: tạo túi mù đang mở bán
const bagInsert = await request(
  '/rest/v1/surprise_bags',
  {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      store_id: storeId,
      name: 'Túi smoke test',
      description: 'Túi kiểm thử tự động',
      original_price: 50000,
      discount_price: 20000,
      category: 'vegetarian',
      image_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600',
      quantity: 5,
      max_quantity: 2,
      pickup_start: '10:00:00',
      pickup_end: '18:00:00',
      is_available: true,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    }),
  },
  merchantToken
);
const bagId = Array.isArray(bagInsert.body) ? bagInsert.body[0]?.id : null;
check('Merchant tạo túi mù (RLS store owner)', Boolean(bagId), `HTTP ${bagInsert.status}`);
// 5) Customer: tìm store/túi quanh đây
const nearbyStores = await rpc('list_stores_nearby', customerToken, {
  p_lat: 10.7743,
  p_lng: 106.7038,
  p_radius: 5000,
  p_category: null,
  p_page: 1,
  p_limit: 20,
});
check(
  'Customer thấy store qua list_stores_nearby',
  Array.isArray(nearbyStores.body) && nearbyStores.body.some((row) => row.id === storeId),
  `HTTP ${nearbyStores.status}`
);

const nearbyBags = await rpc('list_bags_nearby', customerToken, {
  p_lat: 10.7743,
  p_lng: 106.7038,
  p_radius: 5000,
  p_category: null,
  p_page: 1,
  p_limit: 20,
});
check(
  'Customer thấy túi qua list_bags_nearby',
  Array.isArray(nearbyBags.body) && nearbyBags.body.some((row) => row.id === bagId),
  `HTTP ${nearbyBags.status}`
);

// 6) Customer: tạo đơn đủ 14 tham số như app
const orderId = randomUUID();
const qrCode = `GSF-ORDER-SMOKE-${Date.now()}`;
const createOrder = await rpc('place_order', customerToken, {
  p_id: orderId,
  p_store_id: storeId,
  p_idempotency_key: randomUUID(),
  p_items: [{ bagId, quantity: 1 }],
  p_voucher_code: null,
  p_pickup_time: new Date(Date.now() + 3600000).toISOString(),
  p_payment_method: 'cash',
  p_note: 'Đơn smoke test',
  p_total_original_price: 50000,
  p_total_discount_price: 20000,
  p_discount_amount: 0,
  p_final_amount: 20000,
  p_qr_code: qrCode,
});
check(
  'Customer tạo đơn (RPC place_order)',
  createOrder.body?.success === true && createOrder.body?.order_id === orderId,
  JSON.stringify(createOrder.body)
);

// 7) Đọc lại dữ liệu đúng quyền RLS
const myOrders = await request(
  `/rest/v1/orders?select=id,status,final_amount&id=eq.${orderId}`,
  {},
  customerToken
);
check(
  'Customer đọc đơn của mình (RLS)',
  Array.isArray(myOrders.body) && myOrders.body.length === 1,
  `HTTP ${myOrders.status}`
);

const notifBefore = await request(
  `/rest/v1/notifications?select=id,title&user_id=eq.${customerId}`,
  {},
  customerToken
);
check('Customer đọc notifications (RLS)', Array.isArray(notifBefore.body), `HTTP ${notifBefore.status}`);

const merchantOrders = await request(
  `/rest/v1/orders?select=id,final_amount,users!orders_customer_id_fkey(name,phone)&store_id=eq.${storeId}&limit=5`,
  {},
  merchantToken
);
check(
  'Merchant xem tên/SĐT khách của đơn tại quán mình (policy 0009)',
  Array.isArray(merchantOrders.body) &&
    merchantOrders.body.some((row) => row.users && row.users.name),
  `HTTP ${merchantOrders.status} ${JSON.stringify(merchantOrders.body).slice(0, 220)}`
);
// 8) Merchant: chuỗi chuyển trạng thái đúng state machine
const stepTo = (target) =>
  rpc('transition_order_status_transaction', merchantToken, {
    p_order_id: orderId,
    p_target_status: target,
    p_actor_id: merchantId,
    p_actor_role: 'merchant',
  });
const step1 = await stepTo('confirmed');
const step2 = await stepTo('preparing');
const step3 = await stepTo('ready_for_pickup');
check('Merchant: pending → confirmed', step1.body?.success === true, JSON.stringify(step1.body));
check('Merchant: confirmed → preparing', step2.body?.success === true, JSON.stringify(step2.body));
check('Merchant: preparing → ready_for_pickup', step3.body?.success === true, JSON.stringify(step3.body));

// 9) Trigger 0010: customer nhận thông báo "Đơn hàng sẵn sàng nhận"
const notifAfter = await request(
  `/rest/v1/notifications?select=id,title&user_id=eq.${customerId}`,
  {},
  customerToken
);
check(
  'Trigger: customer nhận thông báo "Đơn hàng sẵn sàng nhận"',
  Array.isArray(notifAfter.body) && notifAfter.body.some((n) => n.title === 'Đơn hàng sẵn sàng nhận'),
  JSON.stringify(notifAfter.body || [])
);

// 10) Customer: cập nhật ghi chú qua RPC mới
const noteUpdate = await rpc('update_order_note', customerToken, {
  p_order_id: orderId,
  p_note: 'Ghi chú cập nhật từ smoke test',
});
check(
  'Customer cập nhật ghi chú (RPC update_order_note)',
  noteUpdate.body?.success === true,
  JSON.stringify(noteUpdate.body)
);

// 11) Merchant: hoàn tất đơn (ready_for_pickup → picked_up → completed)
const step4 = await stepTo('picked_up');
const step5 = await stepTo('completed');
check('Merchant: ready_for_pickup → picked_up', step4.body?.success === true, JSON.stringify(step4.body));
check('Merchant: picked_up → completed', step5.body?.success === true, JSON.stringify(step5.body));
// 12) Đơn thứ 2 → customer huỷ + lý do + kiểm tra hoàn kho
const order2 = randomUUID();
const createOrder2 = await rpc('place_order', customerToken, {
  p_id: order2,
  p_store_id: storeId,
  p_idempotency_key: randomUUID(),
  p_items: [{ bagId, quantity: 2 }],
  p_voucher_code: null,
  p_pickup_time: new Date(Date.now() + 3600000).toISOString(),
  p_payment_method: 'cash',
  p_note: null,
  p_total_original_price: 100000,
  p_total_discount_price: 40000,
  p_discount_amount: 0,
  p_final_amount: 40000,
  p_qr_code: `GSF-ORDER-SMOKE2-${Date.now()}`,
});
check('Tạo đơn thứ 2 để test huỷ', createOrder2.body?.success === true, JSON.stringify(createOrder2.body));

const cancel = await rpc('transition_order_status_transaction', customerToken, {
  p_order_id: order2,
  p_target_status: 'cancelled',
  p_actor_id: customerId,
  p_actor_role: 'customer',
});
check('Customer huỷ đơn (transition cancelled)', cancel.body?.success === true, JSON.stringify(cancel.body));

const reason = await rpc('set_order_cancel_reason', customerToken, {
  p_order_id: order2,
  p_reason: 'Lý do hủy smoke test',
});
check('Customer lưu lý do huỷ (RPC set_order_cancel_reason)', reason.body?.success === true, JSON.stringify(reason.body));

const bagAfter = await request(`/rest/v1/surprise_bags?select=quantity,is_available&id=eq.${bagId}`, {}, customerToken);
const qty = Number(bagAfter.body?.[0]?.quantity);
check('Huỷ đơn hoàn kho về đúng số lượng (5 - 1 - 2 + 2 = 4)', qty === 4, `quantity=${qty}`);

// 13) Edge functions
const searchLoc = await request(
  '/functions/v1/search-location',
  { method: 'POST', body: JSON.stringify({ q: 'quan 1' }) },
  anonKey
);
check('Edge function search-location trả success', searchLoc.body?.success === true, `HTTP ${searchLoc.status}`);

const verifyQr = await request('/functions/v1/verify-qr', { method: 'OPTIONS' }, anonKey);
check('Edge function verify-qr phản hồi', verifyQr.status === 200, `HTTP ${verifyQr.status}`);

// 14) Dữ liệu demo: bật túi mù của "Quán Chay Quýt" + đảm bảo location
const seedStoreId = 'b0000000-0000-0000-0000-000000000002';
const seedStore = await request(
  `/rest/v1/stores?select=id,name,location,latitude,longitude&id=eq.${seedStoreId}`,
  {},
  serviceKey
);
const seedRow = Array.isArray(seedStore.body) ? seedStore.body[0] : null;
if (seedRow && !seedRow.location) {
  const lng = seedRow.longitude || 106.7032;
  const lat = seedRow.latitude || 10.7798;
  await request(
    `/rest/v1/stores?id=eq.${seedStoreId}`,
    { method: 'PATCH', body: JSON.stringify({ location: `SRID=4326;POINT(${lng} ${lat})` }) },
    serviceKey
  );
}
const bagPatch = await request(
  `/rest/v1/surprise_bags?store_id=eq.${seedStoreId}`,
  {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      is_available: true,
      expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
    }),
  },
  serviceKey
);
check(
  'Bật túi mù demo của Quán Chay Quýt',
  Array.isArray(bagPatch.body) && bagPatch.body.length > 0,
  `HTTP ${bagPatch.status} — ${Array.isArray(bagPatch.body) ? bagPatch.body.length : 0} túi`
);

console.log(`\n📊 Kết quả smoke test: ${passed} PASS / ${failed} FAIL`);
process.exitCode = failed > 0 ? 1 : 0;
