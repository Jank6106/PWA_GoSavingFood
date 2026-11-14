/**
 * scripts/db-inspect.mjs
 * ---------------------------------------------------------------------------
 * Đọc (READ-ONLY) cấu trúc backend Supabase phục vụ việc "thật hóa" API:
 *   - cột/bảng, enum, RLS (bật/tắt + policies)
 *   - chữ ký & định nghĩa các RPC nghiệp vụ
 *   - trigger (sinh notifications...), constraints, storage buckets
 *
 * Cách chạy:  node scripts/db-inspect.mjs
 * Yêu cầu:    DATABASE_URL trong biến môi trường hoặc file `.env` ở thư mục gốc.
 * Kết quả:    scratch/supabase-backend-raw.md  (script KHÔNG ghi vào database)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(HERE, '..');

const parseEnvFile = (text) => {
  const map = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    map[key] = value;
  }
  return map;
};

const readRootEnv = () => {
  try {
    return parseEnvFile(readFileSync(resolve(ROOT_DIR, '.env'), 'utf8'));
  } catch {
    return {};
  }
};

const RPC_NAMES = [
  'create_order_transaction',
  'transition_order_status_transaction',
  'create_store',
  'list_stores_nearby',
  'list_bags_nearby',
  'update_store_location_and_fields',
  'get_store_by_owner',
  'is_store_owner',
  'expire_stale_surprise_bags',
  'expire_unpaid_orders',
  'cleanup_expired_idempotency_keys',
];

const QUERIES = [];
QUERIES.push(
  {
    title: 'Thông tin chung',
    sql: `SELECT current_database() AS database, current_user AS user_name, version() AS version`,
  },
  {
    title: 'Extensions',
    sql: `SELECT extname, extversion FROM pg_extension ORDER BY extname`,
  },
  {
    title: 'Bảng & cột (schema public)',
    sql: `SELECT table_name, column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_schema = 'public'
          ORDER BY table_name, ordinal_position`,
  },
  {
    title: 'Enum types (schema public)',
    sql: `SELECT t.typname AS enum_name,
                 string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS values
          FROM pg_type t
          JOIN pg_enum e ON e.enumtypid = t.oid
          JOIN pg_namespace n ON n.oid = t.typnamespace
          WHERE n.nspname = 'public'
          GROUP BY t.typname
          ORDER BY t.typname`,
  },
  {
    title: 'RLS bật/tắt (schema public)',
    sql: `SELECT c.relname AS table_name,
                 c.relrowsecurity AS rls_enabled,
                 c.relforcerowsecurity AS rls_forced
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public' AND c.relkind = 'r'
          ORDER BY c.relname`,
  },
  {
    title: 'RLS policies (public + storage)',
    sql: `SELECT schemaname, tablename, policyname, roles::text AS roles, cmd, qual, with_check
          FROM pg_policies
          WHERE schemaname IN ('public', 'storage')
          ORDER BY schemaname, tablename, policyname`,
  }
);
QUERIES.push(
  {
    title: 'Functions (public, không thuộc extension)',
    sql: `SELECT p.proname AS function_name,
                 pg_get_function_arguments(p.oid) AS arguments,
                 pg_get_function_result(p.oid) AS returns,
                 p.prosecdef AS security_definer,
                 p.provolatile AS volatility
          FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public'
            AND p.prokind = 'f'
            AND NOT EXISTS (
              SELECT 1 FROM pg_depend d
              WHERE d.objid = p.oid AND d.deptype = 'e'
            )
          ORDER BY p.proname`,
  },
  {
    title: 'Trigger (public + auth, không tính trigger nội bộ)',
    sql: `SELECT n.nspname AS schema_name,
                 c.relname AS table_name,
                 t.tgname AS trigger_name,
                 pg_get_triggerdef(t.oid) AS definition
          FROM pg_trigger t
          JOIN pg_class c ON c.oid = t.tgrelid
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE NOT t.tgisinternal AND n.nspname IN ('public', 'auth')
          ORDER BY n.nspname, c.relname, t.tgname`,
  },
  {
    title: 'Constraints (các bảng nghiệp vụ)',
    sql: `SELECT conrelid::regclass::text AS table_name,
                 conname AS constraint_name,
                 pg_get_constraintdef(oid) AS definition
          FROM pg_constraint
          WHERE connamespace = 'public'::regnamespace
            AND conrelid IN (
              'public.users'::regclass,
              'public.stores'::regclass,
              'public.surprise_bags'::regclass,
              'public.orders'::regclass,
              'public.order_items'::regclass,
              'public.vouchers'::regclass,
              'public.reviews'::regclass,
              'public.notifications'::regclass,
              'public.issues'::regclass
            )
          ORDER BY 1, 2`,
  },
  {
    title: 'Storage buckets',
    sql: `SELECT id, name, public, file_size_limit, allowed_mime_types, created_at
          FROM storage.buckets
          ORDER BY name`,
  },
  {
    title: 'Định nghĩa RPC nghiệp vụ',
    params: [RPC_NAMES],
    sql: `SELECT p.proname AS function_name, pg_get_functiondef(p.oid) AS definition
          FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = ANY($1::text[])
          ORDER BY p.proname`,
  }
);
const env = readRootEnv();
const connectionString = process.env.DATABASE_URL || env.DATABASE_URL;

if (!connectionString) {
  console.error(
    '❌ Không tìm thấy DATABASE_URL trong biến môi trường hoặc file .env ở thư mục gốc.'
  );
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
  statement_timeout: 20000,
  connectionTimeoutMillis: 15000,
});

await client.connect();
console.log('🔌 Đã kết nối database (chỉ đọc).\n');

const sections = [];
let failures = 0;

for (const query of QUERIES) {
  try {
    const result = await client.query(query.sql, query.params);
    sections.push(
      `## ${query.title}\n\n\`\`\`json\n${JSON.stringify(result.rows, null, 2)}\n\`\`\`\n`
    );
    console.log(`✅ ${query.title}: ${result.rows.length} dòng`);
  } catch (error) {
    failures += 1;
    sections.push(`## ${query.title}\n\n> ⚠️ Lỗi truy vấn: ${error.message}\n`);
    console.warn(`⚠️  ${query.title}: ${error.message}`);
  }
}

await client.end();

const output = [
  '# Supabase Backend — Raw Inspection',
  '',
  `> Tạo lúc: ${new Date().toISOString()}`,
  '> Nguồn: DATABASE_URL trong `.env` (chỉ đọc — không thay đổi dữ liệu)',
  '> Chạy lại: `node scripts/db-inspect.mjs`',
  '',
  ...sections,
].join('\n');

mkdirSync(resolve(ROOT_DIR, 'scratch'), { recursive: true });
const outPath = resolve(ROOT_DIR, 'scratch/supabase-backend-raw.md');
writeFileSync(outPath, output, 'utf8');

console.log(`\n📄 Đã ghi ${outPath} (${(output.length / 1024).toFixed(1)} KB)`);
if (failures > 0) {
  console.warn(`⚠️  Có ${failures} truy vấn lỗi — xem chi tiết trong file kết quả.`);
  process.exitCode = 1;
}
