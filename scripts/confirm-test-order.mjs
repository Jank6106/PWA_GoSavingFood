import { readFileSync } from 'node:fs';
import pg from 'pg';

const envContent = readFileSync('.env', 'utf8');
const match = envContent.match(/DATABASE_URL=([^\r\n]+)/);
const conn = match[1].replace(/['"]/g, '');

const client = new pg.Client({
  connectionString: conn,
  ssl: { rejectUnauthorized: false },
});

async function confirmOrder() {
  await client.connect();
  const orderId = '49406bc5-a53e-45d2-9d7e-9ad9018227d9';
  const ownerId = '09ce2d9c-7382-4ce2-8299-42effefe6004';

  console.log('Transitioning order to confirmed...');
  await client.query("SELECT public.transition_order_status_transaction($1, 'confirmed', $2, 'merchant')", [orderId, ownerId]);

  console.log('Transitioning order to preparing...');
  await client.query("SELECT public.transition_order_status_transaction($1, 'preparing', $2, 'merchant')", [orderId, ownerId]);

  console.log('Order status updated in DB to preparing!');
  await client.end();
}

confirmOrder().catch(console.error);
