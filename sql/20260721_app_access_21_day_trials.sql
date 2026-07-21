-- 21-day app access trials
--
-- Free access remains the base state. Trial fields provide a temporary
-- full-access window that is evaluated by application access helpers.

alter table public.profiles
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists app_access_type text,
  add column if not exists app_access_expires_at timestamptz;

alter table public.profiles
  alter column app_access_type set default 'trial',
  alter column app_access_expires_at set default (now() + interval '21 days'),
  alter column trial_started_at set default now(),
  alter column trial_ends_at set default (now() + interval '21 days');

comment on column public.profiles.trial_started_at is
  'When the current or most recent 21-day full-access app trial started.';

comment on column public.profiles.trial_ends_at is
  'When the current or most recent 21-day full-access app trial ends. Past dates fall back to free access.';
