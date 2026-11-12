import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = resolve(HERE, '../..');

let envLoaded = false;

function parseEnvContent(text) {
  const parsed = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eqIndex = line.indexOf('=');
    if (eqIndex <= 0) continue;

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    parsed[key] = value;
  }
  return parsed;
}

/**
 * Loads variables from the monorepo root `.env` into `process.env`
 * without overriding variables already provided by the shell or CI environment.
 */
export function loadRootEnv() {
  if (envLoaded) return process.env;
  envLoaded = true;

  const envPath = resolve(ROOT_DIR, '.env');
  if (!existsSync(envPath)) return process.env;

  const parsed = parseEnvContent(readFileSync(envPath, 'utf8'));
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
  return process.env;
}

export function getEnv(name, fallback = '') {
  loadRootEnv();
  const value = process.env[name];
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
}

export function requireEnv(name, context = '') {
  const value = getEnv(name);
  if (!value) {
    const suffix = context ? ` (${context})` : '';
    throw new Error(
      `Missing required environment variable "${name}"${suffix}. Define it in the root .env file or process environment.`
    );
  }
  return value;
}

export function requireAnyEnv(names, context = '') {
  for (const name of names) {
    const value = getEnv(name);
    if (value) return value;
  }
  const suffix = context ? ` (${context})` : '';
  throw new Error(
    `Missing required environment variable (one of: ${names.join(', ')})${suffix}. Define it in the root .env file or process environment.`
  );
}

export function getSupabaseConfig({
  requireAnon = false,
  requireServiceRole = false,
  requireDatabaseUrl = false,
} = {}) {
  const url = requireAnyEnv(['SUPABASE_URL', 'VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'])
    .replace(/\/rest\/v1\/?$/, '')
    .replace(/\/$/, '');

  const anonKey = requireAnon
    ? requireAnyEnv(['SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'])
    : getEnv('SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  const serviceRoleKey = requireServiceRole
    ? requireEnv('SUPABASE_SERVICE_ROLE_KEY')
    : getEnv('SUPABASE_SERVICE_ROLE_KEY');

  const databaseUrl = requireDatabaseUrl
    ? requireEnv('DATABASE_URL')
    : getEnv('DATABASE_URL');

  return { url, anonKey, serviceRoleKey, databaseUrl };
}

