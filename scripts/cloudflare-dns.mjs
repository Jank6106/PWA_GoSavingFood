/**
 * scripts/cloudflare-dns.mjs
 * Tự động cấu hình toàn bộ DNS records trên Cloudflare cho gosavingfood.app
 * Sử dụng Cloudflare REST API v4 trực tiếp (siêu nhẹ, không phụ thuộc binary nặng).
 */

import fs from 'fs';
import path from 'path';

// 1. Đọc biến môi trường từ .env
function loadEnv() {
  const envPath = path.resolve('.env');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
    }
  }
  return env;
}

const env = loadEnv();
const apiToken = process.env.CLOUDFLARE_API_TOKEN || env.CLOUDFLARE_API_TOKEN;
const globalKey = process.env.CLOUDFLARE_GLOBAL_KEY || env.CLOUDFLARE_GLOBAL_KEY;
const authEmail = process.env.CLOUDFLARE_EMAIL || env.CLOUDFLARE_EMAIL;

if (!apiToken && (!globalKey || !authEmail)) {
  console.log('\n❌ CHƯA CÓ THÔNG TIN XÁC THỰC CLOUDFLARE!');
  console.log('Vui lòng cung cấp 1 trong 2 cách sau:');
  console.log('1. CLOUDFLARE_API_TOKEN (Khuyên dùng: Token có quyền Zone.DNS:Edit)');
  console.log('   Hoặc:');
  console.log('2. CLOUDFLARE_EMAIL & CLOUDFLARE_GLOBAL_KEY (Global API Key từ Cloudflare Profile)');
  console.log('\nBạn có thể thêm vào file .env hoặc dán trực tiếp vào chat.\n');
  process.exit(1);
}

const headers = apiToken
  ? { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' }
  : {
      'X-Auth-Key': globalKey,
      'X-Auth-Email': authEmail,
      'Content-Type': 'application/json',
    };

async function cfFetch(endpoint, options = {}) {
  const url = `https://api.cloudflare.com/client/v4${endpoint}`;
  const res = await fetch(url, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const data = await res.json();
  if (!res.ok || !data.success) {
    const errorMsg = data.errors?.map((e) => e.message).join(', ') || res.statusText;
    throw new Error(`Cloudflare API Error: ${errorMsg}`);
  }
  return data.result;
}

async function run() {
  console.log('====================================================');
  console.log('   TỰ ĐỘNG THIẾT LẬP CLOUDFLARE DNS CHO GOSAVINGFOOD ');
  console.log('====================================================\n');

  // Bước 1: Lấy Zone ID của gosavingfood.app
  console.log('1. Đang tìm Zone cho domain: gosavingfood.app...');
  const zones = await cfFetch('/zones?name=gosavingfood.app');
  if (!zones || zones.length === 0) {
    throw new Error('Không tìm thấy domain gosavingfood.app trong tài khoản Cloudflare của bạn!');
  }
  const zone = zones[0];
  const zoneId = zone.id;
  console.log(`✅ Tìm thấy Zone ID: ${zoneId} (Status: ${zone.status})\n`);

  // Bước 2: Lấy danh sách DNS records hiện tại
  console.log('2. Đang kiểm tra các bản ghi DNS hiện tại...');
  const existingRecords = await cfFetch(`/zones/${zoneId}/dns_records?per_page=100`);
  console.log(`Đang có ${existingRecords.length} bản ghi DNS trên Cloudflare.\n`);

  // Danh sách các bản ghi chuẩn theo yêu cầu của hệ thống:
  const desiredRecords = [
    {
      type: 'A',
      name: 'gosavingfood.app',
      content: '76.76.21.21',
      proxied: false,
      comment: 'Trỏ Landing Page & /explore về Vercel',
    },
    {
      type: 'CNAME',
      name: 'www',
      content: 'cname.vercel-dns.com',
      proxied: false,
      comment: 'Redirect www về gosavingfood.app',
    },
    {
      type: 'CNAME',
      name: 'merchant',
      content: 'cname.vercel-dns.com',
      proxied: false,
      comment: 'Trỏ Merchant PWA về Vercel',
    },
    {
      type: 'CNAME',
      name: 'api',
      content: 'nyxovkcokjsjdnwiddmc.supabase.co',
      proxied: true, // Bật Proxy Cam để ẩn Supabase và tối ưu CDN
      comment: 'Trỏ API về Supabase Cloud Backend',
    },
  ];

  // Bước 3: Áp dụng hoặc cập nhật từng bản ghi
  console.log('3. Đang đồng bộ các bản ghi DNS theo sơ đồ:');
  for (const record of desiredRecords) {
    const fullName = record.name === '@' ? 'gosavingfood.app' : (record.name.includes('.') ? record.name : `${record.name}.gosavingfood.app`);
    const match = existingRecords.find(
      (r) => r.name.toLowerCase() === fullName.toLowerCase() && r.type === record.type
    );

    if (match) {
      // Đã có -> kiểm tra xem có cần update không
      if (match.content !== record.content || match.proxied !== record.proxied) {
        console.log(`- Đang cập nhật ${record.type} ${fullName} -> ${record.content} (Proxied: ${record.proxied})...`);
        await cfFetch(`/zones/${zoneId}/dns_records/${match.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            type: record.type,
            name: fullName,
            content: record.content,
            proxied: record.proxied,
            comment: record.comment,
          }),
        });
        console.log(`  ✅ Đã cập nhật thành công!`);
      } else {
        console.log(`- Bản ghi ${record.type} ${fullName} -> ${record.content} đã chuẩn xác. (Bỏ qua)`);
      }
    } else {
      // Chưa có -> Tạo mới
      console.log(`- Đang tạo mới ${record.type} ${fullName} -> ${record.content} (Proxied: ${record.proxied})...`);
      await cfFetch(`/zones/${zoneId}/dns_records`, {
        method: 'POST',
        body: JSON.stringify({
          type: record.type,
          name: fullName,
          content: record.content,
          proxied: record.proxied,
          comment: record.comment,
        }),
      });
      console.log(`  ✅ Đã tạo mới thành công!`);
    }
  }

  console.log('\n====================================================');
  console.log('   HOÀN TẤT ĐỒNG BỘ 100% DNS TRÊN CLOUDFLARE!       ');
  console.log('====================================================\n');
}

run().catch((err) => {
  console.error('\n❌ Lỗi thực thi:', err.message);
  process.exit(1);
});
