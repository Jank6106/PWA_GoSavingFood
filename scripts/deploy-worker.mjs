import fs from 'fs';
import path from 'path';

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
const token = process.env.CLOUDFLARE_API_TOKEN || env.CLOUDFLARE_API_TOKEN;
const globalKey = process.env.CLOUDFLARE_GLOBAL_KEY || env.CLOUDFLARE_GLOBAL_KEY;
const email = process.env.CLOUDFLARE_EMAIL || env.CLOUDFLARE_EMAIL;
const accountId = 'd964f21b7fb856d4dba223e09d405179';
const zoneId = '9286b0cfd1e00750c0dc55e2a2895334';

function getAuthHeaders() {
  if (globalKey && email) {
    return {
      'X-Auth-Key': globalKey,
      'X-Auth-Email': email,
    };
  }
  return {
    Authorization: `Bearer ${token}`,
  };
}

const workerCode = `
export default {
  async fetch(request) {
    const url = new URL(request.url);
    url.hostname = 'nyxovkcokjsjdnwiddmc.supabase.co';

    const newHeaders = new Headers(request.headers);
    newHeaders.set('Host', 'nyxovkcokjsjdnwiddmc.supabase.co');

    return fetch(url.toString(), {
      method: request.method,
      headers: newHeaders,
      body: request.body,
      redirect: 'follow',
    });
  },
};
`;

async function deploy() {
  console.log('1. Đang tải lên mã nguồn Worker: gsf-api-proxy...');
  const formData = new FormData();
  formData.append(
    'metadata',
    new Blob([JSON.stringify({ main_module: 'worker.js', compatibility_date: '2026-10-01' })], {
      type: 'application/json',
    })
  );
  formData.append(
    'worker.js',
    new Blob([workerCode], { type: 'application/javascript+module' }),
    'worker.js'
  );

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/gsf-api-proxy`,
    {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
      },
      body: formData,
    }
  );

  const data = await res.json();
  console.log('Kết quả deploy Worker:', data.success ? '✅ Thành công' : '❌ Thất bại');
  if (!data.success) {
    console.error('Chi tiết lỗi:', JSON.stringify(data.errors, null, 2));
    return;
  }

  // 2. Gán Custom Domain hoặc Route cho api.gosavingfood.app
  console.log('\n2. Đang gán domain api.gosavingfood.app vào Worker...');
  const domainRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/domains`,
    {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        environment: 'production',
        hostname: 'api.gosavingfood.app',
        service: 'gsf-api-proxy',
        zone_id: zoneId,
      }),
    }
  );

  const domainData = await domainRes.json();
  console.log('Kết quả gán Custom Domain:', domainData.success ? '✅ Thành công' : '❌ Thất bại');
  if (!domainData.success) {
    console.log('Chi tiết lỗi gán Domain:', JSON.stringify(domainData.errors, null, 2));
    
    // Thử fallback sang gán Route theo zone
    console.log('\n3. Đang thử fallback gán Route qua Zone...');
    const routeRes = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/workers/routes`,
      {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pattern: 'api.gosavingfood.app/*',
          script: 'gsf-api-proxy',
        }),
      }
    );
    const routeData = await routeRes.json();
    console.log('Kết quả gán Route:', routeData.success ? '✅ Thành công' : '❌ Thất bại');
    if (!routeData.success) {
      console.log('Chi tiết lỗi gán Route:', JSON.stringify(routeData.errors, null, 2));
    }
  }

  console.log('\n=============================================');
  console.log('HOÀN TẤT SETUP PROXY WORKER QUA CLOUDFLARE API!');
  console.log('=============================================');
}

deploy().catch(console.error);
