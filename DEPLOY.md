# Deployment Guide — Lead Management System

## Prerequisites

- Node.js 18+
- Supabase account (https://supabase.com)
- Vercel account (https://vercel.com)
- Supabase CLI installed (`npm install -g supabase`)

## 1. Supabase Project Setup

1. Create a new project at https://app.supabase.com
2. Note your **Project URL** and **Anon Key** from Settings > API
3. Note your **Service Role Key** (for CSV import and Edge Functions)

## 2. Run Database Migrations

Link your local project to the remote Supabase project:

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

Push migrations:

```bash
supabase db push
```

This runs both migration files:
- `20260409184603_create_schema.sql` — tables, enums, indexes, triggers
- `20260410000001_rls_policies.sql` — Row Level Security policies

## 3. Create Initial Users

Option A — Run the seed script in the Supabase SQL Editor:

```bash
# Copy contents of supabase/seed.sql and run in SQL Editor
```

Option B — Create users via Supabase Auth dashboard:

1. Go to Authentication > Users > Add User
2. Create these accounts:
   - `rahul@discountautoparts.com` — will be manager
   - `neal@discountautoparts.com` — sales rep
   - `michael@discountautoparts.com` — sales rep
3. Default password for seed script: `changeme123` (change immediately after first login)

The `on_auth_user_created` trigger automatically creates profile records with the role from `raw_user_meta_data`.

## 4. Deploy Edge Functions

```bash
supabase functions deploy assign-lead
supabase functions deploy follow-up-reminder
supabase functions deploy daily-summary
```

## 5. Set Up pg_cron Schedules

Run this SQL in the Supabase SQL Editor to schedule the cron functions:

```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Follow-up reminders — every day at 8:00 AM UTC
SELECT cron.schedule(
  'follow-up-reminders',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/follow-up-reminder',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Daily summary — every day at 7:00 AM UTC
SELECT cron.schedule(
  'daily-summary',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/daily-summary',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

Alternatively, use the Supabase Dashboard > SQL Editor to set up cron jobs via the `pg_cron` extension, or use an external cron service (e.g., cron-job.org) to call the function URLs.

## 6. Import Existing CSV Data

```bash
# Set environment variables
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Dry run first
node scripts/import-csv.js --dry-run

# Full import
node scripts/import-csv.js
```

## 7. Deploy to Vercel

### Option A — Connect Git Repository

1. Push your code to GitHub/GitLab/Bitbucket
2. Go to https://vercel.com/new
3. Import your repository
4. Set environment variables:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon/public key
5. Deploy

### Option B — Vercel CLI

```bash
npm install -g vercel
vercel --prod
```

Set env vars in Vercel dashboard > Settings > Environment Variables.

## Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | Vercel | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Vercel | Supabase anon/public key |
| `SUPABASE_URL` | Local/CI | For CSV import script |
| `SUPABASE_SERVICE_ROLE_KEY` | Local/CI | For CSV import script (never expose to frontend) |

## Post-Deployment Checklist

- [ ] All 3 users can log in
- [ ] Rahul sees manager dashboard, Neal/Michael see rep dashboard
- [ ] Creating a lead triggers round-robin assignment
- [ ] Status changes create notifications in real time
- [ ] CSV data imported correctly (~100 leads)
- [ ] Follow-up reminders fire on schedule
- [ ] Daily summaries fire on schedule
- [ ] Reps can only see their own leads
- [ ] Manager can see and reassign all leads
