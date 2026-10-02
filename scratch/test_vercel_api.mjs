import https from 'https';
import fs from 'fs';

const env = fs.readFileSync('apps/web/.env.local', 'utf8');
const match = env.match(/VERCEL_OIDC_TOKEN="([^"]+)"/);
if (!match) {
  console.log('No token');
  process.exit(1);
}
const token = match[1];

function get(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'Authorization': 'Bearer ' + token, 'User-Agent': 'Node.js' } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
  });
}

async function run() {
  const res = await get('https://api.vercel.com/v13/deployments/dpl_Fp8p2bv6ygbQkgn9shxWkTj2DUN5');
  console.log('Status:', res.status);
  console.log('Body:', res.body.slice(0, 500));
}
run();
