import pg from 'pg';
import fs from 'fs';

const { Client } = pg;
const DATABASE_URL = 'postgres://postgres:EYKLgIdNUN4FaGWn@db.lblwvbedtlxjtkcuxmsf.supabase.co:5432/postgres';

async function run() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  const sql = `
    DROP POLICY IF EXISTS "Public can view images in storage" ON storage.objects;
    CREATE POLICY "Public can view images in storage"
    ON storage.objects FOR SELECT
    USING (bucket_id IN ('bag-photos', 'bag-images', 'store-logos', 'store-assets', 'avatars'));

    DROP POLICY IF EXISTS "Allow upload images to storage" ON storage.objects;
    CREATE POLICY "Allow upload images to storage"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id IN ('bag-photos', 'bag-images', 'store-logos', 'store-assets', 'avatars'));

    DROP POLICY IF EXISTS "Allow update images in storage" ON storage.objects;
    CREATE POLICY "Allow update images in storage"
    ON storage.objects FOR UPDATE
    USING (bucket_id IN ('bag-photos', 'bag-images', 'store-logos', 'store-assets', 'avatars'));

    DROP POLICY IF EXISTS "Allow delete images in storage" ON storage.objects;
    CREATE POLICY "Allow delete images in storage"
    ON storage.objects FOR DELETE
    USING (bucket_id IN ('bag-photos', 'bag-images', 'store-logos', 'store-assets', 'avatars'));
  `;

  await client.query(sql);
  console.log('Storage policies applied successfully to PostgreSQL!');
  await client.end();
}

run().catch(console.error);
