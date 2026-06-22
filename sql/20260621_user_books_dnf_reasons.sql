alter table public.user_books
add column if not exists dnf_reason text,
add column if not exists dnf_note text,
add column if not exists would_retry text;
