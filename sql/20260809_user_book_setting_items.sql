create extension if not exists pgcrypto;

create table if not exists public.user_book_setting_items (
  id uuid primary key default gen_random_uuid(),
  user_book_id uuid not null references public.user_books(id) on delete cascade,
  title text,
  details text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_book_setting_items_has_content check (
    nullif(btrim(coalesce(title, '')), '') is not null
    or nullif(btrim(coalesce(details, '')), '') is not null
  )
);

create index if not exists user_book_setting_items_user_book_idx
  on public.user_book_setting_items (user_book_id, sort_order, created_at);

create or replace function public.set_user_book_setting_items_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_book_setting_items_updated_at
  on public.user_book_setting_items;

create trigger set_user_book_setting_items_updated_at
before update on public.user_book_setting_items
for each row
execute function public.set_user_book_setting_items_updated_at();

alter table public.user_book_setting_items enable row level security;

drop policy if exists "Readers and their teachers can read setting items"
  on public.user_book_setting_items;
create policy "Readers and their teachers can read setting items"
  on public.user_book_setting_items
  for select
  using (
    exists (
      select 1
      from public.user_books ub
      where ub.id = user_book_id
        and (
          ub.user_id = auth.uid()
          or exists (
            select 1
            from public.teacher_students ts
            where ts.teacher_id = auth.uid()
              and ts.student_id = ub.user_id
          )
          or exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and (
                p.role in ('admin', 'super_teacher')
                or coalesce(p.is_super_teacher, false) = true
              )
          )
        )
    )
  );

drop policy if exists "Readers and admins can create setting items"
  on public.user_book_setting_items;
create policy "Readers and admins can create setting items"
  on public.user_book_setting_items
  for insert
  with check (
    exists (
      select 1
      from public.user_books ub
      where ub.id = user_book_id
        and (
          ub.user_id = auth.uid()
          or exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and (
                p.role in ('admin', 'super_teacher')
                or coalesce(p.is_super_teacher, false) = true
              )
          )
        )
    )
  );

drop policy if exists "Readers and admins can update setting items"
  on public.user_book_setting_items;
create policy "Readers and admins can update setting items"
  on public.user_book_setting_items
  for update
  using (
    exists (
      select 1
      from public.user_books ub
      where ub.id = user_book_id
        and (
          ub.user_id = auth.uid()
          or exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and (
                p.role in ('admin', 'super_teacher')
                or coalesce(p.is_super_teacher, false) = true
              )
          )
        )
    )
  )
  with check (
    exists (
      select 1
      from public.user_books ub
      where ub.id = user_book_id
        and (
          ub.user_id = auth.uid()
          or exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and (
                p.role in ('admin', 'super_teacher')
                or coalesce(p.is_super_teacher, false) = true
              )
          )
        )
    )
  );

drop policy if exists "Readers and admins can delete setting items"
  on public.user_book_setting_items;
create policy "Readers and admins can delete setting items"
  on public.user_book_setting_items
  for delete
  using (
    exists (
      select 1
      from public.user_books ub
      where ub.id = user_book_id
        and (
          ub.user_id = auth.uid()
          or exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
              and (
                p.role in ('admin', 'super_teacher')
                or coalesce(p.is_super_teacher, false) = true
              )
          )
        )
    )
  );

comment on table public.user_book_setting_items is
  'Reader-owned Reading Journal setting notes attached to a user book.';
