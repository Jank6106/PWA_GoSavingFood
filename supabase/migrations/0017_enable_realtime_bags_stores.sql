-- 0017_enable_realtime_bags_stores.sql
-- Enable Realtime publication and REPLICA IDENTITY FULL for surprise_bags and stores

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.surprise_bags;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stores;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END
$$;

ALTER TABLE public.surprise_bags REPLICA IDENTITY FULL;
ALTER TABLE public.stores REPLICA IDENTITY FULL;
