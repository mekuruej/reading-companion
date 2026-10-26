import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const read = p => readFileSync(new URL('../'+p, import.meta.url),'utf8');
const migration=read('sql/20261026_study_visibility_effective_identity.sql');
const original=read('sql/20261014_personal_word_visibility.sql');
const identity=read('sql/20260501_library_word_summaries_01_table.sql').match(/create or replace function public.library_study_identity_key[\s\S]*?\$identity_key\$;/)[0];
test('actual views: fallback, pinned identity, visibility, ownership, ACL, plans and rollback', async t=>{
 const db=new PGlite();
 try {
 await db.exec(`create role authenticated; create role anon; create schema auth;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to authenticated; grant execute on function auth.uid() to authenticated;
 create table user_books(id int primary key,user_id uuid);
 create table user_book_words(id int primary key,user_book_id int,surface text,reading text,meaning text,study_identity_key text,hidden boolean,finalized boolean);
 create table user_book_word_visibility(word_id int,user_id uuid,flashcard_hidden boolean,follow_along_hidden boolean);
 create table user_library_word_summaries(user_id uuid,study_identity_key text,definition_key text);
 alter table user_books enable row level security; create policy owner on user_books for select to authenticated using(user_id=auth.uid());
 alter table user_book_words enable row level security; create policy owner on user_book_words for select to authenticated using(exists(select 1 from user_books b where b.id=user_book_id));
 alter table user_library_word_summaries enable row level security; create policy owner on user_library_word_summaries for select to authenticated using(user_id=auth.uid());
 alter table user_book_word_visibility enable row level security; create policy owner on user_book_word_visibility for select to authenticated using(user_id=auth.uid());
 grant select on user_books,user_book_words,user_library_word_summaries,user_book_word_visibility to authenticated;
 create view finalized_user_book_words with(security_invoker=true) as select * from user_book_words where finalized;
 grant select on finalized_user_book_words to authenticated;
 ${identity}
 ${original.slice(original.indexOf('create view public.personal_user_book_words'),original.indexOf('commit;'))}
 insert into user_books values(1,'11111111-1111-1111-1111-111111111111'),(2,'22222222-2222-2222-2222-222222222222');
 insert into user_book_words values
 (1,1,'ordinary','カナ','meaning',null,false,true),
 (2,1,'legacy','かな','meaning',null,false,true),
 (3,1,'promoted','かな','meaning','original||かな',false,true),
 (4,1,'ordinary','カナ','other definition',null,false,true),
 (5,1,'hidden','かな','meaning',null,false,true),
 (6,1,'mixed','かな','meaning',null,false,true),
 (7,1,'mixed','かな','meaning',null,false,true),
 (8,1,'unfinished','かな','meaning',null,false,false),
 (9,1,'excluded','かな','meaning',null,true,true),
 (10,1,'','',null,null,false,true),
 (11,2,'other','かな','meaning',null,false,true);
 insert into user_book_word_visibility values(5,'11111111-1111-1111-1111-111111111111',true,false),(6,'11111111-1111-1111-1111-111111111111',true,false);
 insert into user_library_word_summaries select distinct b.user_id,coalesce(w.study_identity_key,library_study_identity_key(surface,reading)),'' from user_book_words w join user_books b on b.id=w.user_book_id;
 insert into user_library_word_summaries values('11111111-1111-1111-1111-111111111111','ordinary||かな','2');
 set role authenticated; set request.jwt.claim.sub='11111111-1111-1111-1111-111111111111';`);
 const rows=async(view)=> (await db.query(`select * from ${view} order by study_identity_key`)).rows;
 const acl=async()=> (await db.query(`select relname,relacl::text,reloptions from pg_class where relname in ('study_available_library_word_summaries','personally_hidden_study_identities') order by relname`)).rows;
 const beforeAcl=await acl();
 const before=await rows('study_available_library_word_summaries');
 assert.deepEqual(before.map(x=>x.study_identity_key),['original||かな']);
 await db.exec('reset role;'+migration+'set role authenticated;');
 await t.test('ordinary/legacy fallback, pinned precedence, duplicate/sense handling, finalized and hidden exclusions',async()=>{
 const available=await rows('study_available_library_word_summaries');
 assert.deepEqual(available.map(x=>x.study_identity_key),['','legacy||かな','mixed||かな','ordinary||かな','ordinary||かな','original||かな']);
 // Empty identities preserve existing view behavior: eligibility belongs to summary/card helpers.
 assert.equal(available.filter(x=>x.study_identity_key==='ordinary||かな').length,2);
 assert.deepEqual((await rows('personally_hidden_study_identities')).map(x=>x.study_identity_key),['hidden||かな']);
 });
 await t.test('security invoker and grants unchanged; other owner isolated; anonymous denied',async()=>{
 assert.deepEqual(await acl(),beforeAcl);
 await db.exec("set request.jwt.claim.sub='22222222-2222-2222-2222-222222222222';");
 assert.deepEqual((await rows('study_available_library_word_summaries')).map(x=>x.study_identity_key),['other||かな']);
 assert.deepEqual(await rows('personally_hidden_study_identities'),[]);
 await db.exec('reset role; set role anon;');
 await assert.rejects(rows('study_available_library_word_summaries'),/permission denied/);
 await db.exec("reset role;set role authenticated;set request.jwt.claim.sub='11111111-1111-1111-1111-111111111111';");
 });
 await t.test('representative 10000-row plans and rollback',async()=>{
 await db.exec(`reset role;insert into user_book_words select n,1,'bulk'||n,'かな','meaning',null,false,true from generate_series(100,10099)n;
 insert into user_library_word_summaries select '11111111-1111-1111-1111-111111111111',library_study_identity_key('bulk'||n,'かな'),'' from generate_series(100,10099)n;
 create index fixture_identity on user_book_words(library_study_identity_key(surface,reading),user_book_id);analyze;set role authenticated;`);
 for(const v of ['study_available_library_word_summaries','personally_hidden_study_identities']){
 const plan=await db.query(`explain (analyze,format json) select count(*) from ${v}`);
 t.diagnostic(v+' corrected '+JSON.stringify(plan.rows));
 }
 await db.exec('reset role;'+read('sql/verification/20261026_study_identity_rollback.sql')+'set role authenticated;');
 assert.deepEqual(await rows('study_available_library_word_summaries'),before);
 assert.deepEqual(await acl(),beforeAcl);
 const plan=await db.query('explain (analyze,format json) select count(*) from study_available_library_word_summaries');
 t.diagnostic('prior '+JSON.stringify(plan.rows));
 });
 }finally{await db.close();}
});
test('migration retains released summary fallback contract and changes no data or policies',()=>{
 const summary=read('sql/20261013_alternative_spelling_promotion.sql');
 assert.match(summary,/coalesce\(\w+\.study_identity_key, public\.library_study_identity_key\(/);
 assert.doesNotMatch(migration,/\b(?:insert|update|delete|alter table|create policy|grant|revoke)\b/i);
 assert.equal((migration.match(/security_invoker = true/g)||[]).length,2);
 assert.match(migration,/coalesce\(active.study_identity_key, public.library_study_identity_key\(active.surface, active.reading\)\)/);
});
