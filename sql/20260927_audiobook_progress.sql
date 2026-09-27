-- Apply before deploying audiobook tracking. No existing positions are converted.
begin;
alter table public.books add column if not exists audiobook_duration_minutes integer
  check (audiobook_duration_minutes > 0);
comment on column public.books.audiobook_duration_minutes is 'Published audio-timeline length in whole minutes. Optional; independent of pages and actual session time.';
alter table public.user_books drop constraint if exists user_books_progress_tracking_method_check;
alter table public.user_books add constraint user_books_progress_tracking_method_check
  check (progress_tracking_method in ('page','kindle_location','percent','audiobook_time'));
alter table public.user_book_reading_sessions drop constraint if exists user_book_reading_sessions_tracking_unit_check;
alter table public.user_book_reading_sessions add constraint user_book_reading_sessions_tracking_unit_check
  check (tracking_unit in ('page','kindle_location','percent','audiobook_time'));
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
  if NEW.tracking_unit <> 'percent' and (NEW.start_position <> trunc(NEW.start_position) or NEW.end_position <> trunc(NEW.end_position)) then raise exception 'Page, location and audio-minute positions must be whole numbers.'; end if;
  if NEW.tracking_unit = 'percent' then
    NEW.progress_total := 100;
    if NEW.start_position > 100 or NEW.end_position > 100 then raise exception 'Percentage must be between 0 and 100.'; end if;
  end if;
  if TG_OP = 'INSERT' then
    select case NEW.tracking_unit when 'page' then b.page_count when 'audiobook_time' then b.audiobook_duration_minutes when 'kindle_location' then b.kindle_location_count when 'percent' then 100 end into known_total
    from public.user_books ub join public.books b on b.id=ub.book_id where ub.id=NEW.user_book_id;
    NEW.progress_total := nullif(known_total,0);
  else
    NEW.progress_total := OLD.progress_total;
  end if;
  if NEW.progress_total > 0 and (NEW.start_position > NEW.progress_total or NEW.end_position > NEW.progress_total) then raise exception 'Position exceeds the matching total.'; end if;
  return NEW;
end $$;

-- The shared vocabulary position helper also uses the selected progress unit.
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
  if NEW.position_unit is not null and NEW.position_unit not in ('page','kindle_location','percent','audiobook_time') then
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

notify pgrst, 'reload schema';
commit;
