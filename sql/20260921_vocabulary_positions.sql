-- Preflight on 2026-09-21: 8473 user_book_words; 77 dual values (one book),
-- 8192 page only, 0 percent only, 204 neither. Never infer Kindle from pages.
begin;
-- Fail with a useful database error instead of waiting indefinitely on another query.
set local lock_timeout = '5s';
set local statement_timeout = '50s';

-- Position-only backfills do not change word identity, readiness or encounter counts.
-- Avoid refreshing the same library aggregates thousands of times. Preserve the
-- trigger's original state and restore it in this transaction. If anything fails,
-- PostgreSQL rolls back both the data changes and this temporary trigger change.
-- No foreign-key, validation, normalization or other application trigger is disabled.
create temporary table vocabulary_position_trigger_restore (
  trigger_name text, enabled "char"
) on commit drop;
insert into vocabulary_position_trigger_restore
select tgname, tgenabled from pg_trigger
where tgrelid = 'public.user_book_words'::regclass
  and tgname = 'refresh_library_word_summary_from_word' and not tgisinternal;
do $pause_summary$
declare saved record;
begin
  for saved in select * from vocabulary_position_trigger_restore loop
    execute format('alter table public.user_book_words disable trigger %I', saved.trigger_name);
  end loop;
end $pause_summary$;

alter table public.user_book_words add column if not exists position_unit text;
alter table public.user_book_words add column if not exists position_value numeric;
-- Reader-confirmed correction: these numbers were Kindle Locations, not pages.
-- Scoped to this copy only; retain each numeric value and discard redundant percent.
update public.user_book_words
set position_unit = 'kindle_location', position_value = page_number,
    page_number = null, percent_location = null
where user_book_id = '9043d677-5719-4b57-89c1-e440cf65ce47'
  and position_unit is null and page_number is not null;

update public.user_book_words
set position_unit = case when page_number is not null then 'page' when percent_location is not null then 'percent' else null end,
    position_value = coalesce(page_number, percent_location)
where position_unit is null and (page_number is not null or percent_location is not null);
update public.user_book_words set percent_location = null
where position_unit = 'page' and page_number is not null and percent_location is not null;

-- Keep legacy columns as unit-specific mirrors for older clients and page-only pace calculations.
create or replace function public.normalize_vocabulary_position() returns trigger
language plpgsql set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    if NEW.position_unit is null then
      if NEW.position_value is not null then raise exception 'Vocabulary position requires a unit'; end if;
      NEW.position_unit := case when NEW.page_number is not null then 'page' when NEW.percent_location is not null then 'percent' else null end;
      NEW.position_value := coalesce(NEW.page_number, NEW.percent_location);
    end if;
  elsif NEW.position_unit is not distinct from OLD.position_unit and NEW.position_value is not distinct from OLD.position_value then
    if NEW.page_number is distinct from OLD.page_number then
      NEW.position_unit := 'page'; NEW.position_value := NEW.page_number;
    elsif NEW.percent_location is distinct from OLD.percent_location then
      NEW.position_unit := 'percent'; NEW.position_value := NEW.percent_location;
    end if;
  end if;
  if NEW.position_unit is not null and NEW.position_unit not in ('page','kindle_location','percent') then
    raise exception 'Invalid vocabulary position unit';
  end if;
  if NEW.position_value is not null and (NEW.position_unit is null or NEW.position_value < 0 or
     NEW.position_value::text in ('NaN','Infinity','-Infinity') or
     (NEW.position_unit = 'percent' and NEW.position_value > 100) or
     (NEW.position_unit <> 'percent' and trunc(NEW.position_value) <> NEW.position_value)) then
    raise exception 'Invalid vocabulary position value';
  end if;
  NEW.page_number := case when NEW.position_unit = 'page' then NEW.position_value else null end;
  NEW.percent_location := case when NEW.position_unit = 'percent' then NEW.position_value else null end;
  return NEW;
end $$;
drop trigger if exists normalize_vocabulary_position on public.user_book_words;
create trigger normalize_vocabulary_position before insert or update on public.user_book_words
for each row execute function public.normalize_vocabulary_position();
-- Teacher vocabulary: 0 existing rows. Teacher prep items: 8 existing page-only rows.
do $$
declare table_name text;
begin
  foreach table_name in array array['teacher_book_vocabulary', 'teacher_book_items'] loop
    execute format('alter table public.%I add column if not exists position_unit text', table_name);
    execute format('alter table public.%I add column if not exists position_value numeric', table_name);
    execute format('alter table public.%I add column if not exists percent_location numeric', table_name);
    execute format('update public.%I set position_unit = ''page'', position_value = page_number where position_unit is null and page_number is not null', table_name);
    execute format('drop trigger if exists normalize_vocabulary_position on public.%I', table_name);
    execute format('create trigger normalize_vocabulary_position before insert or update on public.%I for each row execute function public.normalize_vocabulary_position()', table_name);
  end loop;
end $$;
do $restore_summary$
declare saved record;
begin
  for saved in select * from vocabulary_position_trigger_restore loop
    execute format('alter table public.user_book_words %s trigger %I',
      case saved.enabled when 'A' then 'enable always' when 'R' then 'enable replica'
        when 'D' then 'disable' else 'enable' end,
      saved.trigger_name);
  end loop;
end $restore_summary$;
commit;

-- Expected for the confirmed current copy: 77 Kindle positions, no legacy pages
-- and no redundant percentages (unless more words have been added since inspection).
select position_unit, count(*) as words,
       count(page_number) as legacy_page_values,
       count(percent_location) as percentage_values
from public.user_book_words
where user_book_id = '9043d677-5719-4b57-89c1-e440cf65ce47'
group by position_unit;

