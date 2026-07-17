-- Diagnostic only: find Teacher Books that are not safely linked to the
-- authenticated teacher's own My Mekuru Library row.
--
-- This query does not modify data. If rows appear here, first confirm that
-- sql/20260704_teacher_books_user_book_link.sql has been applied in the target
-- database. That migration is the intended repair for missing links that can
-- be proven by exact teacher_id + book_id matches.

select
  tb.id as teacher_book_id,
  tb.teacher_id,
  tb.book_id as teacher_book_book_id,
  tb.user_book_id,
  ub.id as linked_user_book_id,
  ub.user_id as linked_user_id,
  ub.book_id as linked_user_book_book_id,
  case
    when tb.user_book_id is null then 'teacher_books.user_book_id is null'
    when ub.id is null then 'linked user_books row is missing'
    when ub.user_id <> tb.teacher_id then 'linked user_books.user_id does not match teacher_books.teacher_id'
    when ub.book_id <> tb.book_id then 'linked user_books.book_id does not match teacher_books.book_id'
    else 'ok'
  end as link_problem
from public.teacher_books tb
left join public.user_books ub
  on ub.id = tb.user_book_id
where tb.user_book_id is null
   or ub.id is null
   or ub.user_id <> tb.teacher_id
   or ub.book_id <> tb.book_id
order by tb.created_at desc nulls last, tb.id;
