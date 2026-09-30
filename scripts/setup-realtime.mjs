import { readFileSync } from 'node:fs';
import pg from 'pg';

const envContent = readFileSync('.env', 'utf8');
const match = envContent.match(/DATABASE_URL=([^\r\n]+)/);
const conn = match[1].replace(/['"]/g, '');

const client = new pg.Client({
  connectionString: conn,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  await client.connect();
  console.log('Connected to DB.');

  // 1. Check existing publication
  const pub = await client.query("SELECT pubname FROM pg_publication WHERE pubname = 'supabase_realtime'");
  console.log('supabase_realtime pub exists:', pub.rows.length > 0);

  // 2. Add orders and notifications to publication
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
      END IF;
    END
    $$;
  `);

  await client.query(`
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  `).catch(err => {
    console.log('orders add note:', err.message);
  });

  await client.query(`
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  `).catch(err => {
    console.log('notifications add note:', err.message);
  });

  // 3. Set REPLICA IDENTITY FULL so UPDATE/DELETE events contain full row and allow column filters
  await client.query(`ALTER TABLE public.orders REPLICA IDENTITY FULL;`);
  console.log('Set REPLICA IDENTITY FULL on public.orders');

  await client.query(`ALTER TABLE public.notifications REPLICA IDENTITY FULL;`);
  console.log('Set REPLICA IDENTITY FULL on public.notifications');

  // 4. Verify publication tables
  const tables = await client.query("SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime'");
  console.log('Updated supabase_realtime publication tables:');
  console.table(tables.rows);

  await client.end();
}

run().catch(console.error);
