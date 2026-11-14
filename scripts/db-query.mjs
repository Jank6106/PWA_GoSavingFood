/**
 * scripts/db-query.mjs — Chạy 1 câu SQL đọc tuỳ ý qua DATABASE_URL (chỉ để tra cứu).
 * Cách dùng: node scripts/db-query.mjs "SELECT ..."
 */
import { readFileSync } from 'node:fs';
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
    map[line.slice(0, eq).trim()] = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return map;
};

const env = parseEnvFile(readFileSync(resolve(ROOT_DIR, '.env'), 'utf8'));
const sql = process.argv.slice(2).join(' ');
if (!sql) {
  console.error('❌ Thiếu câu SQL. Ví dụ: node scripts/db-query.mjs "SELECT 1"');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  statement_timeout: 20000,
});

await client.connect();
try {
  const result = await client.query(sql);
  console.log(JSON.stringify(result.rows, null, 2));
} catch (error) {
  console.error('❌ Lỗi SQL:', error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
