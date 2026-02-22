-- Temporary function to verify cron jobs via REST API
CREATE OR REPLACE FUNCTION public.get_cron_jobs()
RETURNS TABLE(jobid bigint, jobname text, schedule text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT jobid, jobname, schedule FROM cron.job ORDER BY jobid;
$$;
