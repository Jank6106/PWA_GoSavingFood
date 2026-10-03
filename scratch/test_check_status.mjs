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

const clientId = envVars.PAYOS_CLIENT_ID;
const apiKey = envVars.PAYOS_API_KEY;

// Let's test querying the payment link we created earlier: 63615831
async function checkStatus(orderCode) {
  const url = `https://api-merchant.payos.vn/v2/payment-requests/${orderCode}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'x-client-id': clientId,
      'x-api-key': apiKey,
    }
  });
  console.log('Status code:', res.status);
  console.log('Body:', await res.json());
}

checkStatus(63615831);
