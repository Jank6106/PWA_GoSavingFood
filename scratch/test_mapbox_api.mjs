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

  // TEST 1: Forward Geocoding (Tìm kiếm địa điểm)
  total++;
  try {
    const query = 'Chợ Bến Thành';
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      query
    )}.json?access_token=${MAPBOX_TOKEN}&country=vn&language=vi&limit=5`;
    const res = await fetch(url);
    const data = await res.json();

    if (res.ok && data.features && data.features.length > 0) {
      console.log(`\n[PASS] Test 1: Mapbox Geocoding (Search: "${query}")`);
      console.log(`  - Trả về ${data.features.length} kết quả:`);
      data.features.forEach((f, i) => {
        console.log(`    ${i + 1}. ${f.text} - ${f.place_name} [lng: ${f.center[0]}, lat: ${f.center[1]}]`);
      });
      passed++;
    } else {
      console.error(`\n[FAIL] Test 1: Geocoding trả về rỗng hoặc lỗi:`, data);
    }
  } catch (err) {
    console.error(`\n[FAIL] Test 1 exception:`, err);
  }

  // TEST 2: Reverse Geocoding (Lấy địa chỉ từ GPS / Map click)
  total++;
  try {
    const lng = 106.6980;
    const lat = 10.7725;
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&country=vn&language=vi&limit=1`;
    const res = await fetch(url);
    const data = await res.json();

    if (res.ok && data.features && data.features.length > 0) {
      const top = data.features[0];
      console.log(`\n[PASS] Test 2: Mapbox Reverse Geocoding (GPS: lat=${lat}, lng=${lng})`);
      console.log(`  - Địa chỉ nhận diện: ${top.place_name}`);
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

  // TEST 5: Customer PWA Dev Server Bundle Health
  total++;
  try {
    const res = await fetch('http://localhost:5173');
    const html = await res.text();
    if (res.ok && html.includes('<div id="root"></div>')) {
      console.log(`\n[PASS] Test 5: Customer PWA Dev Server (http://localhost:5173)`);
      console.log(`  - Status: 200 OK, HTML root mount element verified`);
      passed++;
    } else {
      console.error(`\n[FAIL] Test 5: Dev server status ${res.status}`);
    }
  } catch (err) {
    console.error(`\n[FAIL] Test 5 exception:`, err);
  }

  console.log(`\n========================================`);
  console.log(`KẾT QUẢ: ${passed}/${total} TESTS PASS THÀNH CÔNG!`);
  console.log(`========================================`);
}

runTests();
