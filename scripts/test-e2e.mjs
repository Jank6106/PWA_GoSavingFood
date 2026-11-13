import { spawnSync } from 'node:child_process';
import { getE2EConfig } from './lib/e2e-env.mjs';

getE2EConfig();
const result = spawnSync(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2)], {
  stdio: 'inherit', env: process.env,
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
