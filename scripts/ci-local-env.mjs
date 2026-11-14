// Input: `supabase status -o json`. Never print the status document or keys.
import { readFileSync, writeFileSync } from 'node:fs';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const status = JSON.parse(input);
const values = {
  SUPABASE_URL: status.API_URL,
  SUPABASE_ANON_KEY: status.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
  DATABASE_URL: status.DB_URL,
};
for (const [key, value] of Object.entries(values)) {
  if (typeof value !== 'string' || !value || /[\r\n]/.test(value)) {
    throw new Error(`Missing or invalid local status field: ${key}`);
  }
}
for (const key of ['SUPABASE_URL', 'DATABASE_URL']) {
  if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(values[key]).hostname)) {
    throw new Error('CI configuration requires loopback Supabase endpoints.');
  }
}
if (process.env.GITHUB_ACTIONS === 'true') {
  for (const key of ['SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_URL']) {
    console.log(`::add-mask::${values[key]}`);
  }
}
let template = readFileSync(new URL('../.env.test.example', import.meta.url), 'utf8');
for (const [key, value] of Object.entries(values)) {
  template = template.replace(new RegExp(`^${key}=.*$`, 'm'), () => `${key}=${value}`);
}
writeFileSync(new URL('../.env.test', import.meta.url), template, { mode: 0o600 });
console.log('Configured .env.test from local Docker status.');
