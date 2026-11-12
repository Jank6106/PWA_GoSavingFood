import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { getSupabaseConfig } from './lib/env.mjs';

const { url: SUPABASE_URL, serviceRoleKey: SERVICE_KEY } = getSupabaseConfig({
  requireServiceRole: true,
});

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const hashUrl = (url) => crypto.createHash('md5').update(url).digest('hex').slice(0, 12);

// Cache to avoid re-uploading identical URLs
const urlToStorageMap = new Map();

async function downloadAndUploadImage(url, bucket, folder) {
  if (urlToStorageMap.has(url)) {
    return urlToStorageMap.get(url);
  }

  // If already a supabase storage url for this bucket, return it
  if (url.includes(`storage/v1/object/public/${bucket}`)) {
    urlToStorageMap.set(url, url);
    return url;
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/jpeg,image/png,image/*,*/*;q=0.8'
      }
    });

    if (!res.ok) {
      console.warn(`  [WARN] Failed to fetch image: ${url} (status: ${res.status})`);
      return null;
    }

    const rawContentType = res.headers.get('content-type') || 'image/jpeg';
    const ext = rawContentType.includes('webp') ? 'webp' : rawContentType.includes('png') ? 'png' : 'jpg';
    const contentType = ext === 'webp' ? 'image/webp' : ext === 'png' ? 'image/png' : 'image/jpeg';

    const buffer = Buffer.from(await res.arrayBuffer());
    const fileName = `${folder}/img_${hashUrl(url)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType,
        upsert: true
      });

    if (uploadError) {
      console.error(`  [ERROR] Storage upload failed for ${fileName}:`, uploadError.message);
      return null;
    }

    const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    const publicUrl = pubData.publicUrl;
    urlToStorageMap.set(url, publicUrl);
    return publicUrl;
  } catch (err) {
    console.error(`  [ERROR] Exception processing image ${url}:`, err.message);
    return null;
  }
}

async function migrateBags() {
  console.log('\n======================================================');
  console.log('1. DI CHUYỂN TOÀN BỘ ẢNH TÚI MÙ (SURPRISE BAGS) SANG STORAGE');
  console.log('======================================================');

  const { data: bags, error } = await supabase
    .from('surprise_bags')
    .select('id, name, image_url')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Lỗi lấy danh sách túi:', error);
    return;
  }

  console.log(`Tìm thấy ${bags.length} túi hàng trong database.`);
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < bags.length; i++) {
    const bag = bags[i];
    const currentUrl = bag.image_url;

    if (!currentUrl) {
      skippedCount++;
      continue;
    }

    if (currentUrl.includes('storage/v1/object/public/bag-images/')) {
      skippedCount++;
      continue;
    }

    process.stdout.write(`[${i + 1}/${bags.length}] Xử lý túi: ${bag.name.slice(0, 30)}... `);
    const newStorageUrl = await downloadAndUploadImage(currentUrl, 'bag-images', 'bags');

    if (newStorageUrl) {
      const { error: updateError } = await supabase
        .from('surprise_bags')
        .update({ image_url: newStorageUrl })
        .eq('id', bag.id);

      if (updateError) {
        console.log(`❌ Update DB failed: ${updateError.message}`);
        errorCount++;
      } else {
        console.log(`✅ OK -> ${newStorageUrl.split('/').pop()}`);
        updatedCount++;
      }
    } else {
      console.log('❌ Tải ảnh thất bại');
      errorCount++;
    }
  }

  console.log(`\nKết quả túi hàng: Đã chuyển ${updatedCount} ảnh, Bỏ qua ${skippedCount} ảnh, Lỗi ${errorCount} ảnh.`);
}

async function migrateStoreBanners() {
  console.log('\n======================================================');
  console.log('2. DI CHUYỂN TOÀN BỘ ẢNH BÌA CỬA HÀNG (STORE BANNERS) SANG STORAGE');
  console.log('======================================================');

  const { data: stores, error } = await supabase
    .from('stores')
    .select('id, name, banner_url')
    .order('name', { ascending: true });

  if (error) {
    console.error('Lỗi lấy danh sách cửa hàng:', error);
    return;
  }

  console.log(`Tìm thấy ${stores.length} cửa hàng trong database.`);
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < stores.length; i++) {
    const store = stores[i];
    const currentUrl = store.banner_url;

    if (!currentUrl) {
      skippedCount++;
      continue;
    }

    if (currentUrl.includes('storage/v1/object/public/store-assets/')) {
      skippedCount++;
      continue;
    }

    process.stdout.write(`[${i + 1}/${stores.length}] Xử lý quán: ${store.name.slice(0, 30)}... `);
    const newStorageUrl = await downloadAndUploadImage(currentUrl, 'store-assets', 'banners');

    if (newStorageUrl) {
      const { error: updateError } = await supabase
        .from('stores')
        .update({ banner_url: newStorageUrl })
        .eq('id', store.id);

      if (updateError) {
        console.log(`❌ Update DB failed: ${updateError.message}`);
        errorCount++;
      } else {
        console.log(`✅ OK -> ${newStorageUrl.split('/').pop()}`);
        updatedCount++;
      }
    } else {
      console.log('❌ Tải ảnh thất bại');
      errorCount++;
    }
  }

  console.log(`\nKết quả ảnh bìa quán: Đã chuyển ${updatedCount} ảnh, Bỏ qua ${skippedCount} ảnh, Lỗi ${errorCount} ảnh.`);
}

async function run() {
  console.log('Bắt đầu chuyển toàn bộ ảnh sang Supabase Storage...');
  await migrateBags();
  await migrateStoreBanners();
  console.log('\n🎉 Hoàn thành chuyển đổi toàn bộ ảnh sang Supabase Storage!');
}

run().catch(console.error);
