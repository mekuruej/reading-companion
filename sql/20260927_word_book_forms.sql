-- Context is attached to a saved book word, never to the dictionary meaning.
-- Existing row-level ownership/teacher policies remain unchanged.
alter table public.user_book_words
  add column if not exists book_form text,
  add column if not exists book_form_description text,
  add column if not exists follow_along_support_note text;
alter table public.teacher_book_vocabulary
  add column if not exists book_form text,
  add column if not exists book_form_description text,
  add column if not exists alternative_surface text;
comment on column public.user_book_words.book_form is 'Exact printed form for Follow-Along only; surface remains the flashcard word.';
comment on column public.teacher_book_vocabulary.book_form is 'Exact printed form for Follow-Along only; never used as the flashcard prompt.';
