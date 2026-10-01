import fs from 'fs';
import path from 'path';

// Load env from apps/customer/.env
const envPath = path.resolve('apps/customer/.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = Object.fromEntries(
  envContent
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const MAPBOX_TOKEN = envVars.VITE_MAPBOX_TOKEN;
const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = envVars.VITE_SUPABASE_ANON_KEY;

console.log('--- BẮT ĐẦU TEST TOÀN DIỆN MAPBOX & POSTGIS ---');
console.log('1. Mapbox Token:', MAPBOX_TOKEN ? `${MAPBOX_TOKEN.slice(0, 15)}... (Đã load)` : 'THIẾU');
console.log('2. Supabase URL:', SUPABASE_URL);

async function runTests() {
  let passed = 0;
  let total = 0;

  // TEST 1: Mapbox Search Box API Forward (Tìm kiếm địa điểm chất lượng cao)
  total++;
  try {
    const query = 'Chợ Bến Thành';
    const proximity = '106.7032,10.7798';
    const url = `https://api.mapbox.com/search/searchbox/v1/forward?q=${encodeURIComponent(
      query
    )}&access_token=${MAPBOX_TOKEN}&country=vn&language=vi&proximity=${proximity}&limit=5&types=poi,address,street,neighborhood,place,district,locality`;
    const res = await fetch(url);
    const data = await res.json();

    if (res.ok && data.features && data.features.length > 0) {
      console.log(`\n[PASS] Test 1: Mapbox Search Box Forward (Search: "${query}")`);
      console.log(`  - Trả về ${data.features.length} kết quả chính xác:`);
      data.features.forEach((f, i) => {
        console.log(`    ${i + 1}. ${f.properties?.name} - ${f.properties?.full_address || f.properties?.place_formatted} [coords: ${f.geometry?.coordinates}]`);
      });
      passed++;
    } else {
      console.error(`\n[FAIL] Test 1: Search Box trả về rỗng hoặc lỗi:`, data);
    }
  } catch (err) {
    console.error(`\n[FAIL] Test 1 exception:`, err);
  }

  // TEST 2: Reverse Geocoding v6 (Lấy địa chỉ từ GPS / Map click)
  total++;
  try {
    const lng = 106.6980;
    const lat = 10.7725;
    const url = `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${lng}&latitude=${lat}&access_token=${MAPBOX_TOKEN}&country=vn&language=vi`;
    const res = await fetch(url);
    const data = await res.json();

    if (res.ok && data.features && data.features.length > 0) {
      const top = data.features[0];
      console.log(`\n[PASS] Test 2: Mapbox Reverse Geocoding v6 (GPS: lat=${lat}, lng=${lng})`);
      console.log(`  - Tên địa danh: ${top.properties?.name}`);
      console.log(`  - Địa chỉ nhận diện: ${top.properties?.full_address || top.properties?.place_formatted}`);
      passed++;
    } else {
      console.error(`\n[FAIL] Test 2: Reverse Geocoding thất bại:`, data);
    }
  } catch (err) {
    console.error(`\n[FAIL] Test 2 exception:`, err);
  }


  // TEST 3: Mapbox Styles API (Kiểm tra quyền load vector tiles / streets-v12)
  total++;
  try {
    const styleUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12?access_token=${MAPBOX_TOKEN}`;
    const res = await fetch(styleUrl);
    const style = await res.json();

    if (res.ok && style.version) {
      console.log(`\n[PASS] Test 3: Mapbox Streets Style v${style.version} (Tiles & Render)`);
      console.log(`  - Style name: ${style.name}, sprite: ${style.sprite ? 'OK' : 'None'}`);
      passed++;
    } else {
      console.error(`\n[FAIL] Test 3: Không thể tải Style Mapbox:`, style);
    }
  } catch (err) {
    console.error(`\n[FAIL] Test 3 exception:`, err);
  }

  // TEST 4: Supabase PostGIS RPC list_stores_nearby
  total++;
  try {
    const lat = 10.7725;
    const lng = 106.6980;
    const rpcUrl = `${SUPABASE_URL}/rest/v1/rpc/list_stores_nearby`;
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_lat: lat,
        p_lng: lng,
        p_radius: 50000,
        p_category: null,
        p_page: 1,
        p_limit: 10,
      }),
    });
    const stores = await res.json();

    if (res.ok && Array.isArray(stores)) {
      console.log(`\n[PASS] Test 4: Supabase PostGIS list_stores_nearby`);
      console.log(`  - Tìm thấy ${stores.length} cửa hàng quanh tọa độ [${lat}, ${lng}]:`);
      stores.slice(0, 3).forEach((s, i) => {
        console.log(`    ${i + 1}. ${s.name} - ${s.address} (~${(s.distance_m / 1000).toFixed(2)} km) [lat: ${s.latitude}, lng: ${s.longitude}]`);
      });
      passed++;
    } else {
      console.error(`\n[FAIL] Test 4: RPC list_stores_nearby trả về lỗi:`, stores);
    }
  } catch (err) {
    console.error(`\n[FAIL] Test 4 exception:`, err);
  }

  // TEST 5: Landmark 81 & Unaccented query test
  total++;
  try {
    const query = 'cho ben thanh';
    const proximity = '106.7032,10.7798';
    const url = `https://api.mapbox.com/search/searchbox/v1/forward?q=${encodeURIComponent(
      query
    )}&access_token=${MAPBOX_TOKEN}&country=vn&language=vi&proximity=${proximity}&limit=3&types=poi,address,street,neighborhood,place,district,locality`;
    const res = await fetch(url);
    const data = await res.json();
    if (res.ok && data.features && data.features.length > 0) {
      console.log(`\n[PASS] Test 5: Unaccented Vietnamese query (Search: "${query}")`);
      data.features.slice(0, 2).forEach((f, i) => {
        console.log(`    ${i + 1}. ${f.properties?.name} - ${f.properties?.full_address || f.properties?.place_formatted}`);
      });
      passed++;
    } else {
      console.error(`\n[FAIL] Test 5 failed:`, data);
    }
  } catch (err) {
    console.error(`\n[FAIL] Test 5 exception:`, err);
  }


  console.log(`\n========================================`);
  console.log(`KẾT QUẢ: ${passed}/${total} TESTS PASS THÀNH CÔNG!`);
  console.log(`========================================`);
}

runTests();
