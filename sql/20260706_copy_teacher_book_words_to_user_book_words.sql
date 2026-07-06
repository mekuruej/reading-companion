-- Copy Teacher Book word prep items into the linked My Mekuru Library vocab list.
--
-- This is intentionally a bridge/copy step, not a destructive move:
-- teacher_book_items keeps the original lesson-prep rows for Follow-Along,
-- while item_type = 'word' rows become normal user_book_words attached to
-- teacher_books.user_book_id.
--
-- Non-word prep items stay only in teacher_book_items for now:
-- phrase, grammar, sentence, translation, and note.

alter table public.user_book_words
  add column if not exists source_teacher_book_item_id uuid
    references public.teacher_book_items(id) on delete set null;

create unique index if not exists user_book_words_source_teacher_book_item_id_uidx
  on public.user_book_words (source_teacher_book_item_id)
  where source_teacher_book_item_id is not null;

comment on column public.user_book_words.source_teacher_book_item_id is
  'Original Teacher Book prep item copied into this normal My Mekuru Library vocab row.';

-- If the teacher already has a matching normal vocab row for this book,
-- link it to the Teacher Book item first so the insert below does not duplicate it.
with existing_word_matches as (
  select distinct on (tbi.id)
    ubw.id as user_book_word_id,
    tbi.id as teacher_book_item_id
  from public.teacher_book_items tbi
  join public.teacher_books tb
    on tb.id = tbi.teacher_book_id
  join public.user_book_words ubw
    on ubw.user_book_id = tb.user_book_id
   and trim(ubw.surface) = trim(tbi.surface_text)
   and coalesce(ubw.page_number, -1) = coalesce(tbi.page_number, -1)
   and coalesce(ubw.chapter_number, -1) = coalesce(tbi.chapter_number, -1)
   and coalesce(trim(ubw.chapter_name), '') = coalesce(trim(tbi.chapter_name), '')
  where tb.user_book_id is not null
    and tbi.item_type = 'word'
    and nullif(trim(coalesce(tbi.surface_text, '')), '') is not null
    and ubw.source_teacher_book_item_id is null
    and not exists (
      select 1
      from public.user_book_words already_linked
      where already_linked.source_teacher_book_item_id = tbi.id
    )
  order by tbi.id, ubw.created_at nulls last, ubw.id
)
update public.user_book_words ubw
set source_teacher_book_item_id = existing_word_matches.teacher_book_item_id
from existing_word_matches
where ubw.id = existing_word_matches.user_book_word_id
  and ubw.source_teacher_book_item_id is null;

insert into public.user_book_words (
  user_book_id,
  vocabulary_cache_id,
  surface,
  reading,
  meaning,
  other_definition,
  page_number,
  page_order,
  chapter_number,
  chapter_name,
  seen_on,
  source_teacher_book_item_id
)
select
  tb.user_book_id,
  tbi.vocabulary_cache_id,
  trim(tbi.surface_text),
  nullif(trim(coalesce(tbi.reading, '')), ''),
  nullif(trim(coalesce(tbi.meaning, '')), ''),
  nullif(trim(coalesce(tbi.meaning, '')), ''),
  tbi.page_number,
  tbi.page_order,
  tbi.chapter_number,
  nullif(trim(coalesce(tbi.chapter_name, '')), ''),
  coalesce(tbi.created_at::date, current_date),
  tbi.id
from public.teacher_book_items tbi
join public.teacher_books tb
  on tb.id = tbi.teacher_book_id
where tb.user_book_id is not null
  and tbi.item_type = 'word'
  and nullif(trim(coalesce(tbi.surface_text, '')), '') is not null
  and not exists (
    select 1
    from public.user_book_words existing
    where existing.source_teacher_book_item_id = tbi.id
  )
on conflict (source_teacher_book_item_id)
where source_teacher_book_item_id is not null
do update set
  user_book_id = excluded.user_book_id,
  vocabulary_cache_id = excluded.vocabulary_cache_id,
  surface = excluded.surface,
  reading = excluded.reading,
  meaning = excluded.meaning,
  other_definition = excluded.other_definition,
  page_number = excluded.page_number,
  page_order = excluded.page_order,
  chapter_number = excluded.chapter_number,
  chapter_name = excluded.chapter_name;
