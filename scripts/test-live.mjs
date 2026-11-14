import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { loadRootEnv } from './lib/env.mjs';

// Vitest otherwise sets NODE_ENV=test and selects the local .env.test file.
process.env.NODE_ENV = 'production';
process.env.USE_LOCAL_DB = 'false';
loadRootEnv();
const result = spawnSync(process.execPath,
  [resolve('node_modules/vitest/vitest.mjs'), 'run', ...process.argv.slice(2)],
  { stdio: 'inherit', env: process.env });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
