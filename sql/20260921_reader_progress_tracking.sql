-- Run before deploying the corresponding application changes. Additive and rerunnable.
begin;
alter table public.books add column if not exists kindle_location_count integer check (kindle_location_count > 0);
alter table public.books add column if not exists edition_note text;
alter table public.user_books add column if not exists progress_tracking_method text check (progress_tracking_method in ('page','kindle_location','percent'));
alter table public.user_book_reading_sessions
  add column if not exists tracking_unit text check (tracking_unit in ('page','kindle_location','percent')),
  add column if not exists start_position numeric,
  add column if not exists end_position numeric,
  add column if not exists progress_total numeric;
-- Old session positions were stored in page columns, including percentages that
-- old clients converted to pages. Preserve these stored units; never guess locations.
update public.user_book_reading_sessions
set tracking_unit = 'page', start_position = start_page, end_position = end_page
where tracking_unit is null and (start_page is not null or end_page is not null);
update public.user_books ub set progress_tracking_method = case
  when ub.progress_mode = 'percent' then 'percent'
  when ub.progress_mode in ('page','pages') then 'page'
  when exists (select 1 from public.user_book_reading_sessions s where s.user_book_id = ub.id and s.tracking_unit = 'page') then 'page'
  else null end
where ub.progress_tracking_method is null;

create or replace function public.validate_reading_progress_units()
returns trigger language plpgsql set search_path = public as $$
declare known_total numeric;
begin
  if TG_OP = 'UPDATE' and OLD.tracking_unit is not null and NEW.tracking_unit is distinct from OLD.tracking_unit then
    raise exception 'A reading-history entry must keep its original tracking unit.';
  end if;
  -- Old clients can only write page columns. Do not reinterpret them using the
  -- reader's newly selected method.
  if NEW.tracking_unit is null and (NEW.start_page is not null or NEW.end_page is not null) then
    NEW.tracking_unit := 'page';
    NEW.start_position := NEW.start_page; NEW.end_position := NEW.end_page;
  elsif NEW.tracking_unit = 'page' then
    if TG_OP = 'UPDATE' and NEW.start_position is not distinct from OLD.start_position and NEW.start_page is distinct from OLD.start_page then NEW.start_position := NEW.start_page; end if;
    if TG_OP = 'UPDATE' and NEW.end_position is not distinct from OLD.end_position and NEW.end_page is distinct from OLD.end_page then NEW.end_position := NEW.end_page; end if;
    NEW.start_position := coalesce(NEW.start_position, NEW.start_page);
    NEW.end_position := coalesce(NEW.end_position, NEW.end_page);
    NEW.start_page := NEW.start_position; NEW.end_page := NEW.end_position;
  else
    if NEW.start_page is not null or NEW.end_page is not null then raise exception 'Non-page progress must not be written to page columns.'; end if;
  end if;
  if (NEW.start_position is not null or NEW.end_position is not null) and NEW.tracking_unit is null then raise exception 'Choose a progress tracking method.'; end if;
  if NEW.start_position is not null and NEW.end_position is null then raise exception 'Enter the ending position.'; end if;
  if NEW.start_position < 0 or NEW.end_position < 0 or NEW.start_position > NEW.end_position then raise exception 'Invalid reading progress range.'; end if;
  if NEW.start_position::text in ('NaN','Infinity','-Infinity') or NEW.end_position::text in ('NaN','Infinity','-Infinity') then raise exception 'Progress must be finite.'; end if;
  if NEW.tracking_unit <> 'percent' and (NEW.start_position <> trunc(NEW.start_position) or NEW.end_position <> trunc(NEW.end_position)) then raise exception 'Page and location positions must be whole numbers.'; end if;
  if NEW.tracking_unit = 'percent' then
    NEW.progress_total := 100;
    if NEW.start_position > 100 or NEW.end_position > 100 then raise exception 'Percentage must be between 0 and 100.'; end if;
  end if;
  if TG_OP = 'INSERT' then
    select case NEW.tracking_unit when 'page' then b.page_count when 'kindle_location' then b.kindle_location_count when 'percent' then 100 end into known_total
    from public.user_books ub join public.books b on b.id=ub.book_id where ub.id=NEW.user_book_id;
    NEW.progress_total := nullif(known_total,0);
  else
    NEW.progress_total := OLD.progress_total;
  end if;
  if NEW.progress_total > 0 and (NEW.start_position > NEW.progress_total or NEW.end_position > NEW.progress_total) then raise exception 'Position exceeds the matching total.'; end if;
  return NEW;
end $$;
drop trigger if exists validate_reading_progress_units on public.user_book_reading_sessions;
create trigger validate_reading_progress_units before insert or update on public.user_book_reading_sessions for each row execute function public.validate_reading_progress_units();
comment on column public.user_books.progress_tracking_method is 'This reader’s persistent method. NULL prompts on first reading; independent of the catalog edition.';
comment on column public.user_book_reading_sessions.progress_total is 'Matching total at recording time. NULL means unknown. Never compare totals across units.';
notify pgrst, 'reload schema';
commit;
