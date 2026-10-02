import fs from 'fs';
import crypto from 'crypto';

const envContent = fs.readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split(/\r?\n/).forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      envVars[key] = val;
    }
  }
});

const clientId = envVars.PAYOS_CLIENT_ID;
const apiKey = envVars.PAYOS_API_KEY;
const checksumKey = envVars.PAYOS_CHECKSUM_KEY;

console.log('--- KIỂM TRA THÔNG TIN PAYOS TRONG .ENV ---');
console.log('PAYOS_CLIENT_ID:', clientId ? '✓ Đã có (' + clientId + ')' : '✗ THIẾU');
console.log('PAYOS_API_KEY:', apiKey ? '✓ Đã có (' + apiKey.slice(0, 8) + '...)' : '✗ THIẾU');
console.log('PAYOS_CHECKSUM_KEY:', checksumKey ? '✓ Đã có (' + checksumKey.slice(0, 8) + '...)' : '✗ THIẾU');
console.log('PAYOS_BANK_ACCOUNT:', envVars.PAYOS_BANK_ACCOUNT || 'Chưa cấu hình');
console.log('PAYOS_BANK_NAME:', envVars.PAYOS_BANK_NAME || 'Chưa cấu hình');
console.log('PAYOS_ACCOUNT_NAME:', envVars.PAYOS_ACCOUNT_NAME || 'Chưa cấu hình');

function createSignature(data, key) {
  const sortedKeys = Object.keys(data).sort();
  const signData = sortedKeys
    .map(k => `${k}=${data[k]}`)
    .join('&');
  return crypto.createHmac('sha256', key).update(signData).digest('hex');
}

const orderCode = Number(String(Date.now()).slice(-6));
const testBody = {
  orderCode,
  amount: 2000,
  description: `TEST ${orderCode}`,
  cancelUrl: 'https://gosavingfood.vn/cancel',
  returnUrl: 'https://gosavingfood.vn/success'
};

testBody.signature = createSignature(testBody, checksumKey);

async function testPayOS() {
  console.log('\nĐang gửi request test tới PayOS API...');
  try {
    const res = await fetch('https://api-merchant.payos.vn/v2/payment-requests', {
      method: 'POST',
      headers: {
        'x-client-id': clientId,
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testBody)
    });
    const json = await res.json();
    console.log('HTTP Status:', res.status);
    console.log('PayOS Phản hồi:', JSON.stringify(json, null, 2));
    if (json.code === '00') {
      console.log('\n===> KẾT LUẬN: KEY PAYOS HOÀN TOÀN CHÍNH XÁC VÀ ĐÃ KẾT NỐI THÀNH CÔNG! <===');
    } else {
      console.log('\n===> PayOS báo mã:', json.code, '-', json.desc);
    }
  } catch (err) {
    console.error('Lỗi kết nối:', err);
  }
}

testPayOS();
