-- Teacher prep support link and translation item type
--
-- Keeps teacher prep data separate from learner vocabulary while allowing a
-- teacher-created reference link and translation rows in prep lists.

alter table public.teacher_book_items
  add column if not exists support_url text;

alter table public.teacher_book_items
  drop constraint if exists teacher_book_items_item_type_check;

alter table public.teacher_book_items
  add constraint teacher_book_items_item_type_check
  check (item_type in ('word', 'phrase', 'grammar', 'sentence', 'translation', 'note'));

comment on column public.teacher_book_items.support_url is
  'Optional teacher-provided reference URL for a prep item.';
