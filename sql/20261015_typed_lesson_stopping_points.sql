-- Phase 3: typed target-owned checkpoints. Apply after 20260716 stopping-point migration.
begin;
alter table public.live_lesson_capture_sessions
  add column if not exists stopping_value numeric,
  add column if not exists stopping_unit text;
-- Historical values always remain pages, irrespective of current copy settings.
do $$
declare prior_mode "char";
begin
  -- Backfill must not reorder historical lessons by changing updated_at.
  select tgenabled into prior_mode from pg_trigger
    where tgrelid = 'public.live_lesson_capture_sessions'::regclass
      and tgname = 'set_live_lesson_capture_sessions_updated_at';
  if prior_mode is not null then
    alter table public.live_lesson_capture_sessions disable trigger set_live_lesson_capture_sessions_updated_at;
  end if;
  update public.live_lesson_capture_sessions
  set stopping_value = stopping_page_number, stopping_unit = 'page'
  where stopping_page_number is not null and stopping_value is null and stopping_unit is null;
  if prior_mode = 'O' then
    alter table public.live_lesson_capture_sessions enable trigger set_live_lesson_capture_sessions_updated_at;
  elsif prior_mode = 'A' then
    alter table public.live_lesson_capture_sessions enable always trigger set_live_lesson_capture_sessions_updated_at;
  elsif prior_mode = 'R' then
    alter table public.live_lesson_capture_sessions enable replica trigger set_live_lesson_capture_sessions_updated_at;
  end if;
end $$;
alter table public.live_lesson_capture_sessions drop constraint if exists live_lesson_stopping_typed_check;
alter table public.live_lesson_capture_sessions add constraint live_lesson_stopping_typed_check check (
  (stopping_value is null and stopping_unit is null) or
  (stopping_value is not null and stopping_unit is not null and
   stopping_unit in ('page','kindle_location','percent') and
   stopping_value >= 0 and stopping_value <= 9007199254740991 and
   ((stopping_unit = 'percent' and stopping_value <= 100) or
    (stopping_unit in ('page','kindle_location') and stopping_value = trunc(stopping_value))))
);
comment on column public.live_lesson_capture_sessions.stopping_value is 'Confirmed position in the student target copy; never the teacher source position.';
comment on column public.live_lesson_capture_sessions.stopping_unit is 'Canonical progress tracking unit at checkpoint save time; historical pages remain page.';
-- Keep stopping_page_number for historical readers. New writes mirror page values only.
commit;
