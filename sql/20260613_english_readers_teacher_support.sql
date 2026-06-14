-- Minimal database scaffolding for future English Readers teacher-created support.
--
-- This keeps existing Japanese Add Word, Jisho, vocabulary_cache, kanji, and
-- user_book_words behavior unchanged. English Readers should start as a
-- teacher-created support flow for English books with Japanese support text.

alter table public.books
  add column if not exists language_code text default 'ja';

update public.books
set language_code = 'ja'
where language_code is null;

comment on column public.books.language_code is
  'Language code for the book text. Defaults to Japanese for existing Mekuru books.';

alter table public.teacher_book_items
  add column if not exists target_language_code text default 'ja',
  add column if not exists support_language_code text default 'en',
  add column if not exists encountered_surface text,
  add column if not exists base_form text,
  add column if not exists lookup_surface text;

update public.teacher_book_items
set target_language_code = 'ja'
where target_language_code is null;

update public.teacher_book_items
set support_language_code = 'en'
where support_language_code is null;

update public.teacher_book_items
set encountered_surface = surface_text
where encountered_surface is null
  and surface_text is not null;

update public.teacher_book_items
set base_form = surface_text
where base_form is null
  and surface_text is not null;

update public.teacher_book_items
set lookup_surface = surface_text
where lookup_surface is null
  and surface_text is not null;

comment on column public.teacher_book_items.target_language_code is
  'Language code for the vocabulary/support item being studied. Defaults to Japanese for existing teacher prep items.';

comment on column public.teacher_book_items.support_language_code is
  'Language code for teacher-created support text. Defaults to English for existing Japanese teacher prep items.';

comment on column public.teacher_book_items.encountered_surface is
  'Exact text from the book or lesson material, such as an inflected English phrase.';

comment on column public.teacher_book_items.base_form is
  'Teacher-selected dictionary, lemma, or reusable study form for the support item.';

comment on column public.teacher_book_items.lookup_surface is
  'Text used for lookup or draft support, which may differ from the encountered or base form.';
