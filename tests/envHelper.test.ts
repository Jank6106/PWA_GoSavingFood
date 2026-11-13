import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { getEnv, getSupabaseConfig, requireAnyEnv, requireEnv } from '../scripts/lib/env.mjs';

const TEST_KEYS = [
  '__TEST_GSF_VAR__',
  '__TEST_GSF_ALT__',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
];

const originalValues = new Map<string, string | undefined>();
for (const key of TEST_KEYS) {
  originalValues.set(key, process.env[key]);
}

afterEach(() => {
  for (const key of TEST_KEYS) {
    const prev = originalValues.get(key);
    if (prev === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = prev;
    }
  }
});

describe('Environment Helper (scripts/lib/env.mjs)', () => {
  it('returns trimmed values and falls back when empty or missing', () => {
    process.env.__TEST_GSF_VAR__ = '  hello-world  ';
    expect(getEnv('__TEST_GSF_VAR__')).toBe('hello-world');

    process.env.__TEST_GSF_VAR__ = '   ';
    expect(getEnv('__TEST_GSF_VAR__', 'fallback')).toBe('fallback');
  });

  it('throws clear error when requireEnv is missing', () => {
    delete process.env.__TEST_GSF_VAR__;
    expect(() => requireEnv('__TEST_GSF_VAR__', 'unit test')).toThrow(
      /Missing required environment variable "__TEST_GSF_VAR__" \(unit test\)/
    );
  });

  it('resolves first non-empty key in requireAnyEnv', () => {
    delete process.env.__TEST_GSF_VAR__;
    process.env.__TEST_GSF_ALT__ = 'alt-value';
    expect(requireAnyEnv(['__TEST_GSF_VAR__', '__TEST_GSF_ALT__'])).toBe('alt-value');
  });

  it('normalizes Supabase URL and enforces required credentials', () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co/rest/v1/';
    process.env.SUPABASE_ANON_KEY = 'anon-test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-test';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

    const cfg = getSupabaseConfig({
      requireAnon: true,
      requireServiceRole: true,
      requireDatabaseUrl: true,
    });

    expect(cfg).toEqual({
      url: 'https://example.supabase.co',
      anonKey: 'anon-test',
      serviceRoleKey: 'service-test',
      databaseUrl: 'postgresql://user:pass@localhost:5432/db',
    });
  });

  it('loads .env.test before .env in test mode without overriding shell values', () => {
    const fixtureDir = mkdtempSync(join(tmpdir(), 'gsf-env-test-'));
    const envModuleUrl = pathToFileURL(join(process.cwd(), 'scripts/lib/env.mjs')).href;
    try {
      writeFileSync(join(fixtureDir, '.env.test'), 'GSF_ENV_PRIORITY=test-value\nGSF_ENV_TEST_ONLY=test-only\n');
      writeFileSync(join(fixtureDir, '.env'), 'GSF_ENV_PRIORITY=base-value\nGSF_ENV_BASE_ONLY=base-only\nGSF_ENV_SHELL=shell-fallback\n');
      const script = `import { loadRootEnv } from '${envModuleUrl}'; loadRootEnv({ rootDir: ${JSON.stringify(fixtureDir)} }); console.log(JSON.stringify({ priority: process.env.GSF_ENV_PRIORITY, testOnly: process.env.GSF_ENV_TEST_ONLY, baseOnly: process.env.GSF_ENV_BASE_ONLY, shell: process.env.GSF_ENV_SHELL }));`;
      const output = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
        encoding: 'utf8',
        env: { ...process.env, NODE_ENV: 'test', GSF_ENV_SHELL: 'from-shell' },
      });

      expect(JSON.parse(output)).toEqual({
        priority: 'test-value',
        testOnly: 'test-only',
        baseOnly: 'base-only',
        shell: 'from-shell',
      });
    } finally {
      rmSync(fixtureDir, { recursive: true, force: true });
    }
  });
});

