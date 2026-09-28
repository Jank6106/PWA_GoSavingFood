import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://nyxovkcokjsjdnwiddmc.supabase.co';
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55eG92a2Nva2pzamRud2lkZG1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0ODUzMzgsImV4cCI6MjEwMTA2MTMzOH0.-4svs1x4o8MUZx1fkszsCdQKIHi-yC3GpQG84OiDuqY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
