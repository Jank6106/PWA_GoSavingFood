import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lblwvbedtlxjtkcuxmsf.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxibHd2YmVkdGx4anRrY3V4bXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjcyMjY3MSwiZXhwIjoyMTA4Mjk4NjcxfQ.vnOu0yTCCeKgWQ0q6uPKPbrnTtPcGoY4x129_G4faII';

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
