-- PRECHECK: capture this installed metadata BEFORE considering application or rollback.
-- Compare definitions, owner, ACL and security options with the reviewed baseline.
-- Stop on drift. These scripts do not automatically certify installed definitions.
begin read only;
set local statement_timeout = '5s';
select c.oid::regclass as object, pg_get_viewdef(c.oid,true) as definition,
       pg_get_userbyid(c.relowner) as owner, c.reloptions, c.relacl
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in (
 'study_available_library_word_summaries','personally_hidden_study_identities',
 'personal_user_book_words','study_visible_user_book_words','finalized_user_book_words')
order by c.relname;
select p.oid::regprocedure as object, pg_get_functiondef(p.oid) as definition,
       pg_get_userbyid(p.proowner) as owner,p.proacl,p.prosecdef,p.proconfig
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('library_study_identity_key','is_finalized_book_word');
rollback;

-- Run unchanged before and after, manually, with authorized SQL access.
-- SELECT-only transactions; local JWT context models each demo owner for personal visibility.
-- No titles, vocabulary text, IDs, credentials or user details are returned.
-- Counts describe different concepts; they are not expected to be equal.

begin read only;
set local statement_timeout = '5s';
set local request.jwt.claim.sub = 'daca8a03-853a-45fd-83a0-9c2ec3aab553';
select 'demo_1' as fixture,
 (select count(*) from public.user_book_words w join public.user_books b on b.id=w.user_book_id where b.user_id=auth.uid()) as saved_occurrences,
 (select count(distinct public.library_study_identity_key(w.surface,w.reading)) from public.user_book_words w join public.user_books b on b.id=w.user_book_id where b.user_id=auth.uid() and nullif(btrim(w.surface),'') is not null) as distinct_derived_identities,
 (select count(distinct coalesce(w.study_identity_key,public.library_study_identity_key(w.surface,w.reading))) from public.user_book_words w join public.user_books b on b.id=w.user_book_id where b.user_id=auth.uid() and nullif(btrim(w.surface),'') is not null) as distinct_effective_identities,
 (select count(*) from public.study_available_library_word_summaries where user_id=auth.uid()) as available_summary_rows,
 (select count(distinct study_identity_key) from public.study_available_library_word_summaries where user_id=auth.uid()) as available_summary_identities,
 (select count(*) from public.personally_hidden_study_identities) as personally_hidden_rows,
 (select count(distinct study_identity_key) from public.personally_hidden_study_identities) as personally_hidden_nonnull_identities;
rollback;

begin read only;
set local statement_timeout = '5s';
set local request.jwt.claim.sub = 'c26379e4-99cd-4717-8cd9-ea44c49931f8';
select 'demo_2' as fixture,
 (select count(*) from public.user_book_words w join public.user_books b on b.id=w.user_book_id where b.user_id=auth.uid()) as saved_occurrences,
 (select count(distinct public.library_study_identity_key(w.surface,w.reading)) from public.user_book_words w join public.user_books b on b.id=w.user_book_id where b.user_id=auth.uid() and nullif(btrim(w.surface),'') is not null) as distinct_derived_identities,
 (select count(distinct coalesce(w.study_identity_key,public.library_study_identity_key(w.surface,w.reading))) from public.user_book_words w join public.user_books b on b.id=w.user_book_id where b.user_id=auth.uid() and nullif(btrim(w.surface),'') is not null) as distinct_effective_identities,
 (select count(*) from public.study_available_library_word_summaries where user_id=auth.uid()) as available_summary_rows,
 (select count(distinct study_identity_key) from public.study_available_library_word_summaries where user_id=auth.uid()) as available_summary_identities,
 (select count(*) from public.personally_hidden_study_identities) as personally_hidden_rows,
 (select count(distinct study_identity_key) from public.personally_hidden_study_identities) as personally_hidden_nonnull_identities;
rollback;

begin read only;
set local statement_timeout = '5s';
set local request.jwt.claim.sub = '6939daa6-0640-42d1-a365-52e71255663c';
select 'demo_3' as fixture,
 (select count(*) from public.user_book_words w join public.user_books b on b.id=w.user_book_id where b.user_id=auth.uid()) as saved_occurrences,
 (select count(distinct public.library_study_identity_key(w.surface,w.reading)) from public.user_book_words w join public.user_books b on b.id=w.user_book_id where b.user_id=auth.uid() and nullif(btrim(w.surface),'') is not null) as distinct_derived_identities,
 (select count(distinct coalesce(w.study_identity_key,public.library_study_identity_key(w.surface,w.reading))) from public.user_book_words w join public.user_books b on b.id=w.user_book_id where b.user_id=auth.uid() and nullif(btrim(w.surface),'') is not null) as distinct_effective_identities,
 (select count(*) from public.study_available_library_word_summaries where user_id=auth.uid()) as available_summary_rows,
 (select count(distinct study_identity_key) from public.study_available_library_word_summaries where user_id=auth.uid()) as available_summary_identities,
 (select count(*) from public.personally_hidden_study_identities) as personally_hidden_rows,
 (select count(distinct study_identity_key) from public.personally_hidden_study_identities) as personally_hidden_nonnull_identities;
rollback;

begin read only;
set local statement_timeout = '5s';
set local request.jwt.claim.sub = '787a392a-cf91-462f-8007-bd64fd48718d';
select 'demo_4' as fixture,
 (select count(*) from public.user_book_words w join public.user_books b on b.id=w.user_book_id where b.user_id=auth.uid()) as saved_occurrences,
 (select count(distinct public.library_study_identity_key(w.surface,w.reading)) from public.user_book_words w join public.user_books b on b.id=w.user_book_id where b.user_id=auth.uid() and nullif(btrim(w.surface),'') is not null) as distinct_derived_identities,
 (select count(distinct coalesce(w.study_identity_key,public.library_study_identity_key(w.surface,w.reading))) from public.user_book_words w join public.user_books b on b.id=w.user_book_id where b.user_id=auth.uid() and nullif(btrim(w.surface),'') is not null) as distinct_effective_identities,
 (select count(*) from public.study_available_library_word_summaries where user_id=auth.uid()) as available_summary_rows,
 (select count(distinct study_identity_key) from public.study_available_library_word_summaries where user_id=auth.uid()) as available_summary_identities,
 (select count(*) from public.personally_hidden_study_identities) as personally_hidden_rows,
 (select count(distinct study_identity_key) from public.personally_hidden_study_identities) as personally_hidden_nonnull_identities;
rollback;

begin read only;
set local statement_timeout = '5s';
set local request.jwt.claim.sub = '6b71f5de-ce36-414b-82f1-7d5c9fc4acef';
select 'demo_5' as fixture,
 (select count(*) from public.user_book_words w join public.user_books b on b.id=w.user_book_id where b.user_id=auth.uid()) as saved_occurrences,
 (select count(distinct public.library_study_identity_key(w.surface,w.reading)) from public.user_book_words w join public.user_books b on b.id=w.user_book_id where b.user_id=auth.uid() and nullif(btrim(w.surface),'') is not null) as distinct_derived_identities,
 (select count(distinct coalesce(w.study_identity_key,public.library_study_identity_key(w.surface,w.reading))) from public.user_book_words w join public.user_books b on b.id=w.user_book_id where b.user_id=auth.uid() and nullif(btrim(w.surface),'') is not null) as distinct_effective_identities,
 (select count(*) from public.study_available_library_word_summaries where user_id=auth.uid()) as available_summary_rows,
 (select count(distinct study_identity_key) from public.study_available_library_word_summaries where user_id=auth.uid()) as available_summary_identities,
 (select count(*) from public.personally_hidden_study_identities) as personally_hidden_rows,
 (select count(distinct study_identity_key) from public.personally_hidden_study_identities) as personally_hidden_nonnull_identities;
rollback;

begin read only;
set local statement_timeout = '5s';
set local request.jwt.claim.sub = '53653657-80e3-4d25-b0aa-4436fa0bcb50';
select 'demo_6' as fixture,
 (select count(*) from public.user_book_words w join public.user_books b on b.id=w.user_book_id where b.user_id=auth.uid()) as saved_occurrences,
 (select count(distinct public.library_study_identity_key(w.surface,w.reading)) from public.user_book_words w join public.user_books b on b.id=w.user_book_id where b.user_id=auth.uid() and nullif(btrim(w.surface),'') is not null) as distinct_derived_identities,
 (select count(distinct coalesce(w.study_identity_key,public.library_study_identity_key(w.surface,w.reading))) from public.user_book_words w join public.user_books b on b.id=w.user_book_id where b.user_id=auth.uid() and nullif(btrim(w.surface),'') is not null) as distinct_effective_identities,
 (select count(*) from public.study_available_library_word_summaries where user_id=auth.uid()) as available_summary_rows,
 (select count(distinct study_identity_key) from public.study_available_library_word_summaries where user_id=auth.uid()) as available_summary_identities,
 (select count(*) from public.personally_hidden_study_identities) as personally_hidden_rows,
 (select count(distinct study_identity_key) from public.personally_hidden_study_identities) as personally_hidden_nonnull_identities;
rollback;
