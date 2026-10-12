import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createClient } = require(require.resolve('@supabase/supabase-js', { paths: ['./apps/customer'] }));

const envContent = readFileSync('.env', 'utf8');
const parseEnv = (key) => {
  const match = envContent.match(new RegExp(`${key}=([^\\r\\n]+)`));
  return match ? match[1].replace(/['"]/g, '').trim() : '';
};

const supabase = createClient(parseEnv('SUPABASE_URL'), parseEnv('SUPABASE_ANON_KEY'));

async function testSignUp() {
  const email = `test_user_${Date.now()}@example.com`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password: 'Password123!',
    options: {
      data: {
        name: 'Hoàng Nam',
      },
    },
  });

  console.log('SignUp result:', data?.user?.id, error?.message || 'OK');
}

testSignUp();
