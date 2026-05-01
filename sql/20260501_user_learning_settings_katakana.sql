-- Katakana-only Library Check preference.
-- This lets users skip katakana-only words in strict Library Check without changing the color ladder.

alter table public.user_learning_settings
add column if not exists skip_katakana_library_check boolean not null default true;
