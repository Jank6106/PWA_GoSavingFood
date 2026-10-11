import { createClient } from '@supabase/supabase-js';

// ⚠️ App PWA chỉ được dùng anon (publishable) key — Vite sẽ nhúng mọi biến
// VITE_* vào bundle trình duyệt. TUYỆT ĐỐI không đặt service_role key,
// DATABASE_URL hay bất kỳ secret nào của Supabase trong app này.
const FALLBACK_SUPABASE_URL = 'https://nyxovkcokjsjdnwiddmc.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55eG92a2Nva2pzamRud2lkZG1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0ODUzMzgsImV4cCI6MjEwMTA2MTMzOH0.-4svs1x4o8MUZx1fkszsCdQKIHi-yC3GpQG84OiDuqY';

const readEnv = (value: unknown, fallback: string, name: string) => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  console.warn(
    `[supabase] Thiếu biến môi trường ${name} — đang dùng giá trị mặc định của dự án ` +
      'GoSavingFood. Hãy khai báo biến trong file .env của app (xem .env.example).'
  );
  return fallback;
};

export const SUPABASE_URL = readEnv(
  import.meta.env.VITE_SUPABASE_URL,
  FALLBACK_SUPABASE_URL,
  'VITE_SUPABASE_URL'
);

export const SUPABASE_ANON_KEY = readEnv(
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  FALLBACK_SUPABASE_ANON_KEY,
  'VITE_SUPABASE_ANON_KEY'
);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});
