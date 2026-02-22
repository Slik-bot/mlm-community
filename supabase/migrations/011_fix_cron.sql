-- ═══════════════════════════════════════
-- 011_fix_cron.sql — Re-create pg_cron jobs
-- Fixes: ensure cron jobs are active
-- ═══════════════════════════════════════

-- Ensure extensions exist
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Safely remove old jobs
DO $$
BEGIN
  PERFORM cron.unschedule('update-streaks');
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

DO $$
BEGIN
  PERFORM cron.unschedule('expire-subscriptions');
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

DO $$
BEGIN
  PERFORM cron.unschedule('process-referral-monthly');
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

-- Daily at 00:05 UTC: update streaks
SELECT cron.schedule(
  'update-streaks',
  '5 0 * * *',
  $$SELECT net.http_post(
    url := 'https://tydavmiamwdrfjbcgwny.supabase.co/functions/v1/update-streaks',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5ZGF2bWlhbXdkcmZqYmNnd255Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzg1NTE1NSwiZXhwIjoyMDgzNDMxMTU1fQ.Z-EqF8fcvEnxdWX2y8aQAeVAx2hbLvtqXoTa2AGdg2Y", "Content-Type": "application/json"}'::jsonb
  )$$
);

-- Daily at 01:00 UTC: expire subscriptions
SELECT cron.schedule(
  'expire-subscriptions',
  '0 1 * * *',
  $$SELECT net.http_post(
    url := 'https://tydavmiamwdrfjbcgwny.supabase.co/functions/v1/expire-subscriptions',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5ZGF2bWlhbXdkcmZqYmNnd255Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzg1NTE1NSwiZXhwIjoyMDgzNDMxMTU1fQ.Z-EqF8fcvEnxdWX2y8aQAeVAx2hbLvtqXoTa2AGdg2Y", "Content-Type": "application/json"}'::jsonb
  )$$
);

-- 1st of month at 06:00 UTC: process referral bonuses
SELECT cron.schedule(
  'process-referral-monthly',
  '0 6 1 * *',
  $$SELECT net.http_post(
    url := 'https://tydavmiamwdrfjbcgwny.supabase.co/functions/v1/process-referral-monthly',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5ZGF2bWlhbXdkcmZqYmNnd255Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzg1NTE1NSwiZXhwIjoyMDgzNDMxMTU1fQ.Z-EqF8fcvEnxdWX2y8aQAeVAx2hbLvtqXoTa2AGdg2Y", "Content-Type": "application/json"}'::jsonb
  )$$
);
