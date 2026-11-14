-- Minimal records for the local Docker database only. Migration 0041 already
-- creates TMU2026; this upsert standardizes the local test quota.
DO $$
DECLARE
  merchant_id uuid := 'd9c04baf-e9db-4ed1-8a59-6f5a94bb5521';
  store_id uuid := '2a9a946b-5984-4559-b0ed-5a56b5d4b946';
BEGIN
  INSERT INTO auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    merchant_id, 'authenticated', 'authenticated', 'merchant.local@gosavingfood.test',
    crypt('LocalTest123!', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"],"role":"merchant"}'::jsonb,
    '{"name":"Local Test Merchant","phone":"0900000000","role":"merchant"}'::jsonb,
    now(), now()
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = now();

  INSERT INTO public.stores (
    id, owner_user_id, name, description, phone, address, location,
    latitude, longitude, food_categories, open_time, close_time,
    is_open, status, rating, total_ratings, commission_rate, updated_at
  ) VALUES (
    store_id, merchant_id, 'Local Test Bakery', 'Docker integration test store',
    '0240000000', '1 Test Street, Hoan Kiem, Hanoi',
    ST_SetSRID(ST_MakePoint(105.8542, 21.0285), 4326)::geography,
    21.0285, 105.8542, ARRAY['bakery']::text[], '06:00', '23:00',
    true, 'active', 5, 0, 15, now()
  ) ON CONFLICT (id) DO UPDATE SET
    owner_user_id = EXCLUDED.owner_user_id,
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    location = EXCLUDED.location,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    is_open = true,
    status = 'active',
    updated_at = now();

  INSERT INTO public.users (id, name, email, phone, role, store_id, updated_at)
  VALUES (merchant_id, 'Local Test Merchant', 'merchant.local@gosavingfood.test', '0900000000', 'merchant', store_id, now())
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    role = 'merchant',
    store_id = EXCLUDED.store_id,
    updated_at = now();

  INSERT INTO public.surprise_bags (
    id, store_id, name, description, original_price, discount_price,
    category, image_url, quantity, max_quantity, pickup_start, pickup_end,
    is_daily, is_available, bag_type, repeat_mode, daily_quota, expiry_date,
    status, expires_at, updated_at
  ) VALUES
    (
      '00c2cc90-f239-4b1b-bf4b-b471e379ef61', store_id,
      'Local Daily Surprise Bag', 'Daily bag for local integration tests',
      100000, 40000, 'bakery', 'https://example.test/local-daily.webp',
      10, 10, '06:00', '23:59', true, true, 'daily', 'recurring', 10,
      current_date, 'active', now() + interval '90 days', now()
    ),
    (
      '07a8fcb2-3c5c-46e6-94b3-6f0a2378ba16', store_id,
      'Local Shelf Life Surprise Bag', 'Shelf-life bag for local integration tests',
      120000, 50000, 'bakery', 'https://example.test/local-shelf-life.webp',
      10, 10, '06:00', '23:59', false, true, 'shelf_life', 'today_only', 10,
      current_date + 30, 'active', now() + interval '90 days', now()
    )
  ON CONFLICT (id) DO UPDATE SET
    store_id = EXCLUDED.store_id,
    name = EXCLUDED.name,
    quantity = 10,
    max_quantity = 10,
    is_available = true,
    bag_type = EXCLUDED.bag_type,
    status = 'active',
    updated_at = now();

  INSERT INTO public.vouchers (
    id, code, description, discount_type, discount_value, min_order_value,
    quantity, used_count, is_active, is_hidden, start_date, end_date,
    created_at, updated_at
  ) VALUES (
    '8b7af496-2cde-4a75-91c8-69e527a6eb68', 'TMU2026',
    'Local Docker integration test voucher', 'fixed', 1000000, 0,
    100, 0, true, true, now() - interval '1 day', now() + interval '10 years', now(), now()
  ) ON CONFLICT (code) DO UPDATE SET
    description = EXCLUDED.description,
    discount_type = EXCLUDED.discount_type,
    discount_value = EXCLUDED.discount_value,
    min_order_value = EXCLUDED.min_order_value,
    quantity = 100,
    is_active = true,
    is_hidden = true,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    updated_at = now();
END;
$$;
