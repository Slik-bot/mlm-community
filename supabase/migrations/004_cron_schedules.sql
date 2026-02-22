-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Remove old cron jobs if they exist (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('update-streaks') FROM cron.job WHERE jobname = 'update-streaks';
  PERFORM cron.unschedule('expire-subscriptions') FROM cron.job WHERE jobname = 'expire-subscriptions';
  PERFORM cron.unschedule('process-referral-monthly') FROM cron.job WHERE jobname = 'process-referral-monthly';
EXCEPTION WHEN OTHERS THEN
  NULL;
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
