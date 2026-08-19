create extension if not exists pgcrypto;

create table if not exists public.user_book_reviews (
  id uuid primary key default gen_random_uuid(),
  user_book_id uuid not null references public.user_books(id) on delete cascade,
  review_language text not null default 'English',
  review_text text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_book_reviews_has_language check (
    nullif(btrim(review_language), '') is not null
  ),
  constraint user_book_reviews_has_text check (
    nullif(btrim(review_text), '') is not null
  )
);

create index if not exists user_book_reviews_user_book_idx
  on public.user_book_reviews (user_book_id, sort_order, created_at);

create or replace function public.set_user_book_reviews_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_book_reviews_updated_at
  on public.user_book_reviews;

create trigger set_user_book_reviews_updated_at
before update on public.user_book_reviews
for each row
execute function public.set_user_book_reviews_updated_at();

alter table public.user_book_reviews enable row level security;

drop policy if exists "Readers and their teachers can read book reviews"
  on public.user_book_reviews;
create policy "Readers and their teachers can read book reviews"
  on public.user_book_reviews
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

drop policy if exists "Readers and admins can create book reviews"
  on public.user_book_reviews;
create policy "Readers and admins can create book reviews"
  on public.user_book_reviews
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

drop policy if exists "Readers and admins can update book reviews"
  on public.user_book_reviews;
create policy "Readers and admins can update book reviews"
  on public.user_book_reviews
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

drop policy if exists "Readers and admins can delete book reviews"
  on public.user_book_reviews;
create policy "Readers and admins can delete book reviews"
  on public.user_book_reviews
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

insert into public.user_book_reviews (user_book_id, review_language, review_text, sort_order)
select ub.id, 'English', btrim(ub.my_review_en), 10
from public.user_books ub
where nullif(btrim(coalesce(ub.my_review_en, '')), '') is not null
  and not exists (
    select 1
    from public.user_book_reviews ubr
    where ubr.user_book_id = ub.id
      and lower(btrim(ubr.review_language)) = 'english'
      and btrim(ubr.review_text) = btrim(ub.my_review_en)
  );

insert into public.user_book_reviews (user_book_id, review_language, review_text, sort_order)
select ub.id, 'Japanese', btrim(ub.my_review_ja), 20
from public.user_books ub
where nullif(btrim(coalesce(ub.my_review_ja, '')), '') is not null
  and not exists (
    select 1
    from public.user_book_reviews ubr
    where ubr.user_book_id = ub.id
      and lower(btrim(ubr.review_language)) = 'japanese'
      and btrim(ubr.review_text) = btrim(ub.my_review_ja)
  );

insert into public.user_book_reviews (user_book_id, review_language, review_text, sort_order)
select ub.id, 'Review', btrim(ub.my_review), 30
from public.user_books ub
where nullif(btrim(coalesce(ub.my_review, '')), '') is not null
  and not exists (
    select 1
    from public.user_book_reviews ubr
    where ubr.user_book_id = ub.id
      and btrim(ubr.review_text) = btrim(ub.my_review)
  );

comment on table public.user_book_reviews is
  'Reader-owned written reviews for a user book. Overall enjoyment remains on user_books.rating_overall.';
