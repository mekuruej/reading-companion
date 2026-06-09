-- Future vocabulary support for English books and Japanese support text.
--
-- Keep user_book_words.surface unchanged for now. Current app code may still
-- store the selected dictionary/basic form there. These optional fields let
-- future Add Word flows preserve the encountered form separately from lookup
-- and study forms.

alter table public.user_book_words
  add column if not exists encountered_surface text,
  add column if not exists base_form text,
  add column if not exists lookup_surface text,
  add column if not exists target_language_code text default 'ja',
  add column if not exists support_language_code text default 'en',
  add column if not exists item_type text default 'word',
  add column if not exists part_of_speech text,
  add column if not exists pronunciation text,
  add column if not exists difficulty_system text,
  add column if not exists difficulty_level text,
  add column if not exists support_note text;

update public.user_book_words
set base_form = surface
where base_form is null
  and surface is not null;

update public.user_book_words
set encountered_surface = surface
where encountered_surface is null
  and surface is not null;

comment on column public.user_book_words.encountered_surface is
  'Exact text the reader saw or typed from the book, such as a conjugated form, phrase, or English phrasal verb.';

comment on column public.user_book_words.base_form is
  'Dictionary or lemma form used for study, such as a Japanese dictionary form or English base phrase.';

comment on column public.user_book_words.lookup_surface is
  'Text used for dictionary/API lookup. This may be the encountered form or a normalized lookup form.';

comment on column public.user_book_words.target_language_code is
  'Language code for the vocabulary item being studied. Defaults to Japanese for existing Mekuru vocabulary.';

comment on column public.user_book_words.support_language_code is
  'Language code for the support/meaning/explanation language. Defaults to English.';

comment on column public.user_book_words.item_type is
  'Vocabulary item type, such as word, phrase, person, place, work title, organization, or cultural reference.';

comment on column public.user_book_words.part_of_speech is
  'Optional part-of-speech or grammar category for future language-aware study support.';

comment on column public.user_book_words.pronunciation is
  'Optional pronunciation support for non-Japanese or mixed-language vocabulary.';

comment on column public.user_book_words.difficulty_system is
  'Optional difficulty scale name, such as JLPT, CEFR, or another language-specific system.';

comment on column public.user_book_words.difficulty_level is
  'Optional difficulty value within the selected difficulty system.';

comment on column public.user_book_words.support_note is
  'Optional learner-facing support note for context, nuance, explanation, or usage.';
