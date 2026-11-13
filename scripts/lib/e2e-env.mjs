import { getSupabaseConfig } from './env.mjs';

export function getE2EConfig() {
  process.env.USE_LOCAL_DB = 'true';
  const config = getSupabaseConfig({ requireAnon: true, requireServiceRole: true, requireDatabaseUrl: true });
  for (const endpoint of [config.url, config.databaseUrl]) {
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(endpoint).hostname)) {
      throw new Error('E2E requires loopback URLs in .env.test; conflicting shell variables are not allowed.');
    }
  }
  return config;
}
