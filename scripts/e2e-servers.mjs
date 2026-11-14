import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { getE2EConfig } from './lib/e2e-env.mjs';

const config = getE2EConfig();
// Pass an allowlist, not the production secrets supplemented by the env loader.
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|APPDATA|LOCALAPPDATA|USERPROFILE|USER|HOME|COMSPEC|CI)$/i.test(key)));
Object.assign(env, {
  NODE_ENV: 'development', E2E_LOCAL: 'true', USE_LOCAL_DB: 'true',
  SUPABASE_URL: config.url, SUPABASE_ANON_KEY: config.anonKey,
  SUPABASE_SERVICE_ROLE_KEY: config.serviceRoleKey,
  DATABASE_URL: config.databaseUrl,
  VITE_SUPABASE_URL: config.url, VITE_SUPABASE_ANON_KEY: config.anonKey,
  NEXT_PUBLIC_SUPABASE_URL: config.url, NEXT_PUBLIC_SUPABASE_ANON_KEY: config.anonKey,
  VITE_API_URL: 'http://localhost:3000',
  PAYOS_CLIENT_ID: '', PAYOS_API_KEY: '', PAYOS_CHECKSUM_KEY: '',
  RESEND_API_KEY: '', RESEND_SMTP_PASS: '',
  NEXT_TELEMETRY_DISABLED: '1',
});
const children = [];
for (const [app, script, args, base] of [
  ['customer', 'vite/bin/vite.js', ['--host', '127.0.0.1'], '/explore/'],
  ['merchant', 'vite/bin/vite.js', ['--host', '127.0.0.1'], '/merchant/'],
  ['web', 'next/dist/bin/next', ['dev', '--hostname', '127.0.0.1', '--port', '3000'], ''],
]) {
  const child = spawn(process.execPath, [resolve(`apps/${app}/node_modules/${script}`), ...args], {
    cwd: resolve(`apps/${app}`), env: { ...env, VITE_BASE_PATH: base }, stdio: 'inherit', windowsHide: true,
  });
  child.on('error', () => process.exit(1));
  child.on('exit', code => { if (code) process.exit(code); });
  children.push(child);
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  for (const child of children) child.kill();
  process.exit(0);
});
