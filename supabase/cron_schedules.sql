-- ============================================================
-- pg_cron schedules for automated notifications
-- Run this ONCE in Supabase Dashboard → SQL Editor.
--
-- BEFORE RUNNING: replace <SERVICE_ROLE_KEY> below with the
-- project's service_role key (Project Settings → API). The key
-- is stored only in your database's cron.job table — do not
-- commit a copy of this file with the real key filled in.
-- ============================================================

-- Required extensions (safe to run if already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any prior versions so this script is re-runnable
SELECT cron.unschedule('follow-up-reminders')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'follow-up-reminders');
SELECT cron.unschedule('daily-summary')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-summary');

-- Follow-up reminders — every day at 13:00 UTC (≈ 8:00 AM US Eastern)
SELECT cron.schedule(
  'follow-up-reminders',
  '0 13 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://frejdyazcrbcgumyyagz.supabase.co/functions/v1/follow-up-reminder',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>',
      'Content-Type', 'application/json'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Daily summary — every day at 12:00 UTC (≈ 7:00 AM US Eastern)
SELECT cron.schedule(
  'daily-summary',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://frejdyazcrbcgumyyagz.supabase.co/functions/v1/daily-summary',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>',
      'Content-Type', 'application/json'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Verify:
--   SELECT jobname, schedule, active FROM cron.job ORDER BY jobname;
-- Inspect recent runs:
--   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
