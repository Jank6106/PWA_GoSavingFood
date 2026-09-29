/**
 * scripts/show-rpc.mjs — In định nghĩa RPC từ docs/supabase-backend-raw.md
 * Cách dùng: node scripts/show-rpc.mjs create_order_transaction [tên_khác...]
 * Không truyền tham số: in tất cả RPC.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const rawPath = resolve(HERE, '..', 'docs/supabase-backend-raw.md');
const text = readFileSync(rawPath, 'utf8');

const fence = '```';
const blockRegex = new RegExp(fence + 'json\\n([\\s\\S]*?)' + fence, 'g');
const blocks = [...text.matchAll(blockRegex)].map((match) => JSON.parse(match[1]));

const definitions = blocks[blocks.length - 1];
const wanted = process.argv.slice(2);
const picked = wanted.length
  ? definitions.filter((d) => wanted.includes(d.function_name))
  : definitions;

for (const d of picked) {
  console.log(`===== ${d.function_name} =====`);
  console.log(d.definition);
  console.log('');
}
console.log(`(File có ${definitions.length} RPC — đã in ${picked.length})`);
