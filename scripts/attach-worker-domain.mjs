import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envPath = path.resolve('.env');
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
const key = env.CLOUDFLARE_GLOBAL_KEY;
const email = env.CLOUDFLARE_EMAIL;
const accountId = 'd964f21b7fb856d4dba223e09d405179';
const zoneId = '9286b0cfd1e00750c0dc55e2a2895334';
const headers = { 'X-Auth-Key': key, 'X-Auth-Email': email, 'Content-Type': 'application/json' };

async function run() {
  console.log('1. Xóa bản ghi CNAME cũ của api.gosavingfood.app...');
  const delRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/569d4a0b44c32a13c33d171278ea8b83`, {
    method: 'DELETE',
    headers,
  });
  const delData = await delRes.json();
  console.log('Xóa CNAME:', delData.success ? '✅ Thành công' : delData.errors);

  console.log('\n2. Gán api.gosavingfood.app làm Custom Domain chính thức cho Worker...');
  const domRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/domains`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      environment: 'production',
      hostname: 'api.gosavingfood.app',
      service: 'gsf-api-proxy',
      zone_id: zoneId,
    }),
  });
  const domData = await domRes.json();
  console.log('Gán Custom Domain Worker:', domData.success ? '✅ Thành công' : domData.errors);
  console.log('Result:', JSON.stringify(domData.result, null, 2));
}

run().catch(console.error);
