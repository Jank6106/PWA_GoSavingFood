import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './lib/env.mjs';

const { url: SUPABASE_URL, serviceRoleKey: SERVICE_KEY } = getSupabaseConfig({
  requireServiceRole: true,
});

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  const { data: bags, error } = await supabase
    .from('surprise_bags')
    .select('id, image_url');

  if (error) {
    console.error('Error fetching bags:', error);
    return;
  }

  let updated = 0;
  for (const b of bags) {
    if (b.image_url && b.image_url.includes('/bag-images/bags/')) {
      const newUrl = b.image_url.replace('/bag-images/bags/', '/bag-photos/');
      const { error: upErr } = await supabase
        .from('surprise_bags')
        .update({ image_url: newUrl })
        .eq('id', b.id);
      if (!upErr) updated++;
    }
  }

  console.log(`Updated ${updated} bags to use bag-photos bucket URL.`);
}

run();
