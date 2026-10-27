import fs from 'fs';
import { ALL_STORES, ALL_BAGS } from './seed_34_partners_and_bags.mjs';

let sql = '-- 0036_expand_merchants_and_yindii_bags.sql\n';
sql += '-- Mo rong doi tac len 34 cua hang (Nhom 1 phan lon, Nhom 3, Nhom 4) va cap nhat tui theo chuan Yindii\n\n';

sql += '-- 1. UPSERT STORES (34 Doi tac)\n';
for (const s of ALL_STORES) {
  const cats = s.food_categories.map(c => `'${c}'`).join(', ');
  sql += `INSERT INTO public.stores (
  id, owner_user_id, name, description, phone, address, location, latitude, longitude,
  logo_url, banner_url, food_categories, open_time, close_time, is_open, status, rating, total_ratings, commission_rate, updated_at
) VALUES (
  '${s.id}',
  '20205ac1-1255-4759-a44b-6abe4e097890',
  $$${s.name}$$,
  $$${s.description}$$,
  '${s.phone}',
  $$${s.address}$$,
  ST_SetSRID(ST_MakePoint(${s.longitude}, ${s.latitude}), 4326),
  ${s.latitude},
  ${s.longitude},
  '${s.logo_url}',
  '${s.banner_url}',
  ARRAY[${cats}]::text[],
  '${s.open_time}'::time,
  '${s.close_time}'::time,
  true,
  'active',
  ${s.rating},
  ${s.total_ratings},
  15,
  now()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address,
  location = EXCLUDED.location,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  logo_url = EXCLUDED.logo_url,
  banner_url = EXCLUDED.banner_url,
  food_categories = EXCLUDED.food_categories,
  open_time = EXCLUDED.open_time,
  close_time = EXCLUDED.close_time,
  is_open = EXCLUDED.is_open,
  status = EXCLUDED.status,
  rating = EXCLUDED.rating,
  total_ratings = EXCLUDED.total_ratings,
  updated_at = now();\n\n`;
}

sql += '-- 2. UPSERT SURPRISE BAGS (43 Tui Yindii)\n';
for (const b of ALL_BAGS) {
  sql += `INSERT INTO public.surprise_bags (
  id, store_id, name, description, original_price, discount_price, category, image_url,
  quantity, max_quantity, pickup_start, pickup_end, is_daily, is_available, bag_type,
  repeat_mode, daily_quota, status, expires_at, updated_at
) VALUES (
  '${b.id}',
  '${b.store_id}',
  $$${b.name}$$,
  $$${b.description}$$,
  ${b.original_price},
  ${b.discount_price},
  '${b.category}',
  '${b.image_url}',
  ${b.quantity},
  3,
  '${b.pickup_start}'::time,
  '${b.pickup_end}'::time,
  true,
  true,
  'daily',
  'today_only',
  5,
  'active',
  now() + interval '90 days',
  now()
)
ON CONFLICT (id) DO UPDATE SET
  store_id = EXCLUDED.store_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  original_price = EXCLUDED.original_price,
  discount_price = EXCLUDED.discount_price,
  category = EXCLUDED.category,
  image_url = EXCLUDED.image_url,
  quantity = EXCLUDED.quantity,
  max_quantity = EXCLUDED.max_quantity,
  pickup_start = EXCLUDED.pickup_start,
  pickup_end = EXCLUDED.pickup_end,
  is_daily = EXCLUDED.is_daily,
  is_available = EXCLUDED.is_available,
  bag_type = EXCLUDED.bag_type,
  repeat_mode = EXCLUDED.repeat_mode,
  daily_quota = EXCLUDED.daily_quota,
  status = EXCLUDED.status,
  expires_at = EXCLUDED.expires_at,
  updated_at = now();\n\n`;
}

fs.writeFileSync('supabase/migrations/0036_expand_merchants_and_yindii_bags.sql', sql, 'utf8');
console.log('Migration 0036 generated successfully!');
