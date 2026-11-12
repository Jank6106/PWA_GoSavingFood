import { afterEach, describe, expect, it } from 'vitest';
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
});

