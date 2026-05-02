-- Library Check daily session size preference.
-- Users can choose 10, 20, or 30 strict gate cards per session.

alter table public.user_learning_settings
add column if not exists library_check_daily_limit integer not null default 20;

alter table public.user_learning_settings
drop constraint if exists user_learning_settings_library_check_daily_limit_check;

alter table public.user_learning_settings
add constraint user_learning_settings_library_check_daily_limit_check
check (library_check_daily_limit in (10, 20, 30));
