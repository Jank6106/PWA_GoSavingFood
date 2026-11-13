export const ROOT_DIR: string;

export function loadRootEnv(options?: { rootDir?: string }): NodeJS.ProcessEnv;
export function getEnv(name: string, fallback?: string): string;
export function requireEnv(name: string, context?: string): string;
export function requireAnyEnv(names: string[], context?: string): string;
export function getSupabaseConfig(options?: {
  requireAnon?: boolean;
  requireServiceRole?: boolean;
  requireDatabaseUrl?: boolean;
}): {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  databaseUrl: string;
};

