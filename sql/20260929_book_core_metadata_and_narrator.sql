-- Apply before deploying the narrator UI. One books row is one edition.
begin;
alter table public.books add column if not exists narrator text;
comment on column public.books.narrator is
  'Optional audiobook narrator(s) for this specific edition, independent of the author.';

-- Optional metadata columns are already nullable. Do not rewrite old records or
-- require tracking totals, identifiers, publisher, or narrator.
-- Enforce core fields for new editions, and prevent clearing them on edits.
-- Legacy incomplete editions remain editable without an unrelated backfill.
create or replace function public.validate_book_core_metadata()
returns trigger language plpgsql set search_path = public as $$
begin
  if (TG_OP = 'INSERT' or NEW.title is distinct from OLD.title)
     and nullif(btrim(NEW.title), '') is null then
    raise exception 'Title is required.' using errcode = '23514';
  end if;
  if (TG_OP = 'INSERT' or NEW.author is distinct from OLD.author)
     and nullif(btrim(NEW.author), '') is null then
    raise exception 'Author is required.' using errcode = '23514';
  end if;
  -- Application entry points normalize language aliases to two-letter codes.
  if (TG_OP = 'INSERT' or NEW.language_code is distinct from OLD.language_code)
     and (NEW.language_code is null or NEW.language_code !~ '^[a-z]{2}$') then
    raise exception 'Language is required (two-letter language code).' using errcode = '23514';
  end if;
  if (TG_OP = 'INSERT' or NEW.edition_format is distinct from OLD.edition_format)
     and (NEW.edition_format is null or NEW.edition_format not in
       ('bunko', 'tankobon_hardcover', 'tankobon_softcover', 'paperback',
        'hardcover', 'ebook', 'audiobook', 'other')) then
    raise exception 'Format is required.' using errcode = '23514';
  end if;
  return NEW;
end $$;
drop trigger if exists validate_book_core_metadata on public.books;
create trigger validate_book_core_metadata
before insert or update on public.books
for each row execute function public.validate_book_core_metadata();
notify pgrst, 'reload schema';
commit;
