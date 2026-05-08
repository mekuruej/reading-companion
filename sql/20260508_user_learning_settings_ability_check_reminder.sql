alter table public.user_learning_settings
add column if not exists show_ability_check_reminder boolean not null default true;
