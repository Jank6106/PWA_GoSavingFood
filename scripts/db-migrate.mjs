/**
 * scripts/db-migrate.mjs — Chạy migration SQL trong `supabase/migrations`.
 *
 * Cách dùng:
 *   node scripts/db-migrate.mjs list     # xem file nào đã/chưa áp dụng
 *   node scripts/db-migrate.mjs          # áp dụng toàn bộ file còn thiếu
 *
 * Ghi chú:
 *   - Mỗi file SQL chạy trong 1 transaction riêng; tên file được ghi vào `public._migrations`.
 *   - File SQL KHÔNG tự chứa BEGIN/COMMIT (script lo phần đó).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(HERE, '..');
const MIGRATIONS_DIR = resolve(ROOT_DIR, 'supabase', 'migrations');

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

const env = readRootEnv();
const connectionString = process.env.DATABASE_URL || env.DATABASE_URL;

if (!connectionString) {
  console.error(
    '❌ Không tìm thấy DATABASE_URL trong biến môi trường hoặc file .env ở thư mục gốc.'
  );
  process.exit(1);
}

const mode = process.argv[2] ?? 'apply';

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
  statement_timeout: 120000,
  connectionTimeoutMillis: 15000,
});

await client.connect();

const files = readdirSync(MIGRATIONS_DIR)
  .filter((name) => name.endsWith('.sql'))
  .sort();

const { rows: appliedRows } = await client.query(
  'SELECT name FROM public._migrations ORDER BY id'
);
const applied = new Set(appliedRows.map((row) => row.name));
const legacyNames = JSON.parse(readFileSync(resolve(ROOT_DIR, 'supabase/migration-renames.json'), 'utf8'));
for (const [currentName, legacyName] of Object.entries(legacyNames)) {
  if (applied.has(legacyName)) applied.add(currentName);
}
// This snapshot bootstraps an empty database only; never replay it on Cloud.
if (appliedRows.length > 0) applied.add('0000_baseline_schema.sql');

if (mode === 'list') {
  for (const file of files) {
    console.log(`${applied.has(file) ? '✅ đã chạy ' : '⏳ chưa    '} ${file}`);
  }
  await client.end();
  process.exit(0);
}

const pending = files.filter((file) => !applied.has(file));

if (pending.length === 0) {
  console.log('✅ Không có migration mới cần chạy.');
  await client.end();
  process.exit(0);
}

for (const file of pending) {
  const sql = readFileSync(resolve(MIGRATIONS_DIR, file), 'utf8');
  console.log(`🚀 Đang áp dụng ${file} ...`);
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO public._migrations (name) VALUES ($1)', [file]);
    await client.query('COMMIT');
    console.log(`✅ ${file} — OK`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ ${file} — LỖI: ${error.message}`);
    process.exitCode = 1;
    break;
  }
}

await client.end();
