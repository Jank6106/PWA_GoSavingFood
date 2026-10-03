import crypto from 'crypto';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split(/\r?\n/).forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      envVars[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
  }
});

const checksumKey = envVars.PAYOS_CHECKSUM_KEY;

const data = {
  orderCode: 33637111,
  amount: 5000,
  description: 'TEST GSF 99',
  accountNumber: 'V3CAS8823316420',
  reference: 'REF123456',
  transactionDateTime: new Date().toISOString(),
  currency: 'VND',
  paymentLinkId: 'b6d5b0b092bc441b87f0404aa729244e',
  code: '00',
  desc: 'success'
};

const sortedKeys = Object.keys(data).sort();
const signData = sortedKeys.map(k => `${k}=${data[k]}`).join('&');
const signature = crypto.createHmac('sha256', checksumKey).update(signData).digest('hex');

const payload = {
  code: '00',
  desc: 'success',
  data,
  signature
};

async function testWebhook() {
  const res = await fetch('http://localhost:3000/api/payos/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  console.log('Webhook test response status:', res.status);
  console.log('Webhook test body:', await res.json());
}

testWebhook();
