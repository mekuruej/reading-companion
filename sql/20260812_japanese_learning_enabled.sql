-- Phase 3: profile-level Japanese-learning intent.
--
-- Optional preflight counts before applying:
-- select count(*) as total_profiles from public.profiles;
-- select target_language, count(*) from public.profiles group by target_language order by count(*) desc;
-- select count(*) as japanese_target_language_profiles
-- from public.profiles
-- where lower(coalesce(target_language, '')) in ('ja', 'jp', 'japanese', '日本語');

alter table public.profiles
  add column if not exists japanese_learning_enabled boolean not null default false;

comment on column public.profiles.japanese_learning_enabled is
  'Whether this profile wants Japanese-learning navigation and tools. This is user intent, not paid entitlement.';

update public.profiles
set japanese_learning_enabled = true
where lower(coalesce(target_language, '')) in ('ja', 'jp', 'japanese', '日本語')
  and japanese_learning_enabled is distinct from true;

-- Optional postflight checks:
-- select japanese_learning_enabled, count(*) from public.profiles group by japanese_learning_enabled;
-- select count(*) as still_legacy_japanese_but_disabled
-- from public.profiles
-- where lower(coalesce(target_language, '')) in ('ja', 'jp', 'japanese', '日本語')
--   and japanese_learning_enabled = false;
