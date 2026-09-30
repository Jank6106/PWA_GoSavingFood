import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createClient } = require(require.resolve('@supabase/supabase-js', { paths: ['./apps/customer', '.'] }));

const envContent = readFileSync('.env', 'utf8');
const parseEnv = (key) => {
  const match = envContent.match(new RegExp(`${key}=([^\\r\\n]+)`));
  return match ? match[1].replace(/['"]/g, '').trim() : '';
};

const SUPABASE_URL = parseEnv('SUPABASE_URL') || parseEnv('VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = parseEnv('SUPABASE_ANON_KEY') || parseEnv('VITE_SUPABASE_ANON_KEY');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testQuery() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'cus_test_987654@example.com',
    password: 'Password123!',
  });
  console.log('SignIn:', authData?.user?.id, authError?.message || 'OK');

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      stores (name, address, phone, logo_url),
      order_items (*)
    `)
    .eq('customer_id', authData.user.id)
    .order('created_at', { ascending: false });

  console.log('Query result error:', error);
  console.log('Orders found:', data?.length);
  if (data?.length > 0) {
    console.log('First order:', {
      id: data[0].id,
      status: data[0].status,
      stores: data[0].stores,
      order_items: data[0].order_items?.length,
    });
  }
}

testQuery().catch(console.error);
