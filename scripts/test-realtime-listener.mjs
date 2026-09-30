import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import pg from 'pg';
const require = createRequire(import.meta.url);
const { createClient } = require(require.resolve('@supabase/supabase-js', { paths: ['./apps/customer', '.'] }));

const envContent = readFileSync('.env', 'utf8');
const parseEnv = (key) => {
  const match = envContent.match(new RegExp(`${key}=([^\\r\\n]+)`));
  return match ? match[1].replace(/['"]/g, '').trim() : '';
};

const SUPABASE_URL = parseEnv('SUPABASE_URL') || parseEnv('VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = parseEnv('SUPABASE_ANON_KEY') || parseEnv('VITE_SUPABASE_ANON_KEY');
const DATABASE_URL = parseEnv('DATABASE_URL');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const pgClient = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await pgClient.connect();

  // Find customer user and an order
  const orderRes = await pgClient.query(
    "SELECT id, customer_id, status FROM public.orders ORDER BY created_at DESC LIMIT 1"
  );
  if (orderRes.rows.length === 0) {
    console.log('No order found to test.');
    await pgClient.end();
    return;
  }
  const order = orderRes.rows[0];
  console.log(`Testing with order ${order.id}, customer: ${order.customer_id}, status: ${order.status}`);

  // Customer login to get authenticated session
  const customerUserRes = await pgClient.query(
    "SELECT email FROM public.users WHERE id = $1",
    [order.customer_id]
  );
  const email = customerUserRes.rows[0]?.email;
  console.log(`Customer email: ${email}`);

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password: 'Password123!',
  });
  if (authError) {
    console.log('SignIn error (proceeding as anon):', authError.message);
  } else {
    console.log('Customer signed in successfully as:', authData.user.id);
  }

  let receivedEvent = false;

  const channel = supabase
    .channel(`test-order-${order.customer_id}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `customer_id=eq.${order.customer_id}`,
      },
      (payload) => {
        console.log('>>> REALTIME EVENT RECEIVED:', payload.eventType, payload.new?.id, 'status:', payload.new?.status);
        receivedEvent = true;
      }
    )
    .subscribe((status, err) => {
      console.log('Channel subscription status:', status, err || '');
    });

  // Wait 2 seconds for channel subscription to be SUBSCRIBED
  await new Promise((r) => setTimeout(r, 2500));

  // Trigger an update in DB
  console.log('Triggering DB update on order...');
  await pgClient.query(
    "UPDATE public.orders SET updated_at = NOW() WHERE id = $1",
    [order.id]
  );

  // Wait 4 seconds for event
  await new Promise((r) => setTimeout(r, 4000));

  console.log('Result: receivedEvent =', receivedEvent);

  await supabase.removeChannel(channel);
  await pgClient.end();
  process.exit(receivedEvent ? 0 : 1);
}

main().catch(console.error);
