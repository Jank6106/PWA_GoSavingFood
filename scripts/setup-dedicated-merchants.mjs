import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import { getSupabaseConfig } from './lib/env.mjs';

const {
  url: SUPABASE_URL,
  anonKey: ANON_KEY,
  serviceRoleKey: SERVICE_KEY,
  databaseUrl: dbUrl,
} = getSupabaseConfig({
  requireAnon: true,
  requireServiceRole: true,
  requireDatabaseUrl: true,
});

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('🚀 Starting dedicated merchant accounts and stores setup...');

  const pgClient = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await pgClient.connect();

  const { data: { users: currentUsers } } = await supabaseAdmin.auth.admin.listUsers();

  // Helper to ensure an auth user exists
  async function ensureUser(email, password, metadata) {
    let user = currentUsers.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (user) {
      console.log(`Updating ${email} (ID: ${user.id})...`);
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password,
        email_confirm: true,
        user_metadata: metadata,
      });
      if (error) throw error;
      return user;
    } else {
      console.log(`Creating ${email}...`);
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: metadata,
      });
      if (error) throw error;
      return data.user;
    }
  }

  // Helper to ensure public.users entry
  async function ensurePublicUser(userId, email, name) {
    await pgClient.query(`
      INSERT INTO public.users (id, email, name, role)
      VALUES ($1, $2, $3, 'merchant')
      ON CONFLICT (id) DO UPDATE SET email = $2, name = $3, role = 'merchant'
    `, [userId, email, name]);
  }

  // 1. System Partner (for other 52 unmanaged stores)
  const systemEmail = 'system-partner@gosavingfood.vn';
  const systemUser = await ensureUser(systemEmail, 'SysPassword123!', {
    name: 'Hệ Thống Đối Tác GoSavingFood',
    role: 'merchant',
  });
  await ensurePublicUser(systemUser.id, systemEmail, 'Hệ Thống Đối Tác GoSavingFood');

  // 2. Account 1: merchant@gosavingfood.vn -> Password123! -> KFC Vietnam - Bà Triệu
  const vnEmail = 'merchant@gosavingfood.vn';
  const vnPassword = 'Password123!';
  const vnStoreId = '5b051934-45e2-4cbe-92b7-7e78c4b51710'; // KFC Vietnam - Bà Triệu

  const vnUser = await ensureUser(vnEmail, vnPassword, {
    name: 'KFC Vietnam - Bà Triệu',
    store_name: 'KFC Vietnam - Bà Triệu',
    role: 'merchant',
  });
  await ensurePublicUser(vnUser.id, vnEmail, 'KFC Vietnam - Bà Triệu');

  // 3. Account 2: merchant@gosavingfood.app -> Password1234 -> Bếp Chay An Lạc - Cổ Nhuế
  const appEmail = 'merchant@gosavingfood.app';
  const appPassword = 'Password1234';
  const appStoreId = 'b509682b-350a-4f10-8bbc-a76f6537c248'; // Bếp Chay An Lạc - Cổ Nhuế

  const appUser = await ensureUser(appEmail, appPassword, {
    name: 'Bếp Chay An Lạc - Cổ Nhuế',
    store_name: 'Bếp Chay An Lạc - Cổ Nhuế',
    role: 'merchant',
  });
  await ensurePublicUser(appUser.id, appEmail, 'Bếp Chay An Lạc - Cổ Nhuế');

  // 4. Update store ownership strictly
  console.log('Assigning store ownership strictly:');
  console.log(`- ${vnEmail} (${vnUser.id}) -> KFC Vietnam - Bà Triệu (${vnStoreId})`);
  await pgClient.query(`UPDATE stores SET owner_user_id = $1 WHERE id = $2`, [vnUser.id, vnStoreId]);

  console.log(`- ${appEmail} (${appUser.id}) -> Bếp Chay An Lạc - Cổ Nhuế (${appStoreId})`);
  await pgClient.query(`UPDATE stores SET owner_user_id = $1 WHERE id = $2`, [appUser.id, appStoreId]);

  console.log(`- Remaining 52 stores -> ${systemEmail} (${systemUser.id})`);
  const detached = await pgClient.query(`
    UPDATE stores
    SET owner_user_id = $1
    WHERE id NOT IN ($2, $3)
  `, [systemUser.id, vnStoreId, appStoreId]);
  console.log(`Updated ${detached.rowCount} stores to system partner.`);

  // 5. Verification queries
  const vnStores = await pgClient.query(`SELECT id, name FROM stores WHERE owner_user_id = $1`, [vnUser.id]);
  console.log(`\n✅ Stores owned by ${vnEmail}:`, vnStores.rows);

  const appStores = await pgClient.query(`SELECT id, name FROM stores WHERE owner_user_id = $1`, [appUser.id]);
  console.log(`\n✅ Stores owned by ${appEmail}:`, appStores.rows);

  // 6. Test authentication with Supabase Anon Client
  const anonClient = createClient(SUPABASE_URL, ANON_KEY);

  console.log('\n🔐 Testing login: merchant@gosavingfood.vn with Password123! ...');
  const { data: vnLogin, error: vnErr } = await anonClient.auth.signInWithPassword({
    email: vnEmail,
    password: vnPassword,
  });
  if (vnErr) throw new Error(`VN Login failed: ${vnErr.message}`);
  console.log(`✅ Success! Signed in as ${vnLogin.user.email} (ID: ${vnLogin.user.id})`);

  console.log('\n🔐 Testing login: merchant@gosavingfood.app with Password1234 ...');
  const { data: appLogin, error: appErr } = await anonClient.auth.signInWithPassword({
    email: appEmail,
    password: appPassword,
  });
  if (appErr) throw new Error(`APP Login failed: ${appErr.message}`);
  console.log(`✅ Success! Signed in as ${appLogin.user.email} (ID: ${appLogin.user.id})`);

  await pgClient.end();
  console.log('\n🎉 ALL DONE! Accounts and stores are cleanly isolated 1:1!');
}

main().catch(err => {
  console.error('Fatal setup error:', err);
  process.exit(1);
});
