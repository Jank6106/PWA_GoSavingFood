import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { getSupabaseConfig } from './lib/env.mjs';

process.env.NODE_ENV ??= 'test';
process.env.USE_LOCAL_DB ??= 'true';

const { url, databaseUrl } = getSupabaseConfig({ requireDatabaseUrl: true });
const apiHost = new URL(url).hostname;
let databaseHost;
try {
  databaseHost = new URL(databaseUrl).hostname;
} catch {
  throw new Error('DATABASE_URL must be a valid PostgreSQL URL for local tests.');
}

const isLocalHost = (host) => host === 'localhost' || host === '127.0.0.1' || host === '::1';
if (!isLocalHost(apiHost) || !isLocalHost(databaseHost)) {
  throw new Error(
    `Refusing to run local tests against non-local Supabase endpoints (API: ${apiHost}, DB: ${databaseHost}). Check .env.test and remove conflicting shell variables.`
  );
}

const [mode = 'vitest', ...args] = process.argv.slice(2);
const command = mode === 'audit'
  ? [resolve('scripts/comprehensive-system-audit.mjs')]
  : [resolve('node_modules/vitest/vitest.mjs'), 'run', ...args];

const result = spawnSync(process.execPath, command, { stdio: 'inherit', env: process.env });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
