-- Preserve teacher prep item reading order within page/chapter groups.

alter table public.teacher_book_items
  add column if not exists page_order integer;

with ordered_items as (
  select
    id,
    row_number() over (
      partition by teacher_book_id, chapter_number, page_number
      order by created_at, id
    ) as next_page_order
  from public.teacher_book_items
  where page_order is null
)
update public.teacher_book_items item
set page_order = ordered_items.next_page_order
from ordered_items
where item.id = ordered_items.id;

create index if not exists teacher_book_items_teacher_book_reading_order_idx
  on public.teacher_book_items (
    teacher_book_id,
    chapter_number,
    page_number,
    page_order,
    created_at
  );

comment on column public.teacher_book_items.page_order is
  'Teacher-controlled reading order for prep items within the same chapter/page group.';
