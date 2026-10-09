-- Required before deploying server-side setup for new users with unknown level.
-- Production inspected 2026-10-09: level was NOT NULL DEFAULT 'Level 1', although
-- init_user_profile_settings() inserts NULL and swallows that insert failure.
-- Keep existing levels, valid-level CHECK, roles, access, and public-name choices.
-- No backfill: existing Level 1 values cannot safely be inferred to be defaults.
begin;
alter table public.profiles alter column level drop not null;
alter table public.profiles alter column level drop default;
commit;
