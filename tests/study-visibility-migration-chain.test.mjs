import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {PGlite} from '@electric-sql/pglite';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const owner='11111111-1111-1111-1111-111111111111';
test('real identity, finalization, promotion, summary triggers, visibility chain and rollback',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create role authenticated;create role anon;create role service_role;
 create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table books(id uuid primary key,title text,cover_url text);
 create table user_books(id uuid primary key,user_id uuid references auth.users,book_id uuid references books);
 create table user_book_words(id uuid primary key default gen_random_uuid(),user_book_id uuid references user_books,surface text,reading text,meaning text,meaning_choices jsonb,meaning_choice_index int,other_definition text,seen_on date,excluded_from_flashcards boolean,hidden boolean,jlpt text,is_common boolean,created_at timestamptz default now(),vocabulary_cache_id uuid,base_form text,lookup_surface text,encountered_surface text,target_language_code text);
 create table teacher_book_vocabulary(id uuid primary key,linked_user_book_word_id uuid,surface text,alternative_surface text);
 create table live_lesson_capture_sessions(id uuid primary key,status text);
 create table live_lesson_capture_session_words(id uuid primary key,session_id uuid,user_book_word_id uuid);
 alter table user_books enable row level security;create policy owner on user_books for select to authenticated using(user_id=auth.uid());
 alter table user_book_words enable row level security;create policy owner on user_book_words for select to authenticated using(exists(select 1 from user_books b where b.id=user_book_id));
 grant usage on schema public,auth to authenticated;grant select on user_books,user_book_words to authenticated;
 `);
 await db.exec(read('sql/20260501_library_word_summaries_01_table.sql').replace('create extension if not exists pgcrypto;',''));
 const finalized=read('sql/20261012_live_lesson_finalized_visibility.sql');
 await db.exec(finalized.slice(finalized.indexOf('create or replace function public.is_finalized_book_word'),finalized.indexOf('create or replace view public.finalized_teacher_book_vocabulary')));
 await db.exec(read('sql/20261013_alternative_spelling_promotion.sql'));
 await db.exec(read('sql/20261014_personal_word_visibility.sql'));
 await db.exec(`grant select on user_library_word_summaries to authenticated;
 insert into auth.users values('${owner}'),('22222222-2222-2222-2222-222222222222');
 insert into user_books values('${owner}','${owner}',null),('22222222-2222-2222-2222-222222222222','22222222-2222-2222-2222-222222222222',null);
 insert into user_book_words(id,user_book_id,surface,reading,meaning) values
 ('00000000-0000-0000-0000-000000000001','${owner}','ordinary','カナ','meaning'),
 ('00000000-0000-0000-0000-000000000002','${owner}','hidden','かな','meaning'),
 ('00000000-0000-0000-0000-000000000003','${owner}','unfinished','かな','meaning'),
 ('00000000-0000-0000-0000-000000000004','${owner}','ordinary','カナ','other meaning'),
 ('00000000-0000-0000-0000-000000000005','${owner}','promote','かな','meaning'),
 ('00000000-0000-0000-0000-000000000006','${owner}','ordinary','カナ','meaning'),
 ('00000000-0000-0000-0000-000000000007','22222222-2222-2222-2222-222222222222','private','かな','meaning'),
 ('00000000-0000-0000-0000-000000000008','${owner}','','',null),
 ('00000000-0000-0000-0000-000000000009','${owner}','incomplete','',null);
 update user_book_words set surface='promoted',alternative_surface='promote' where id='00000000-0000-0000-0000-000000000005';
 insert into live_lesson_capture_sessions values('${owner}','active');
 insert into live_lesson_capture_session_words values('${owner}','${owner}','00000000-0000-0000-0000-000000000003');
 insert into user_book_word_visibility(word_id,user_id,user_book_id,flashcard_hidden) values
 ('00000000-0000-0000-0000-000000000002','${owner}','${owner}',true),
 ('00000000-0000-0000-0000-000000000004','${owner}','${owner}',true);
 set role authenticated;set request.jwt.claim.sub='${owner}';`);
 const keys=async()=> (await db.query('select study_identity_key from study_available_library_word_summaries order by 1')).rows.map(x=>x.study_identity_key);
 const before=await keys();assert.deepEqual(before,['promote||かな']);
 const acl=async()=> (await db.query("select relname,relowner,relacl::text,reloptions from pg_class where relname in ('study_available_library_word_summaries','personally_hidden_study_identities') order by relname")).rows;
 const beforeAcl=await acl();
 await db.exec('reset role;'+read('sql/20261026_study_visibility_effective_identity.sql')+'set role authenticated;');
 assert.deepEqual(await keys(),['incomplete||','ordinary||かな','promote||かな']);
 const cache=new Map();
 function loadModule(path){
  if(cache.has(path))return cache.get(path);
  const module={exports:{}};cache.set(path,module.exports);
  const js=ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  new Function('require','module','exports',js)(name=>{if(name==='@/lib/libraryStudyColor')return loadModule('lib/libraryStudyColor.ts');throw new Error('Unexpected dependency '+name);},module,module.exports);
  return module.exports;
 }
 const summaries=(await db.query(`select study_identity_key,surface,reading,meaning,total_encounter_count,hidden_encounter_count from study_available_library_word_summaries where user_id='${owner}' order by last_seen_at desc,study_identity_key asc limit 1001`)).rows;
 const readiness=loadModule('lib/study/advancedStudyReadiness.ts').calculateAdvancedStudyReadiness({summaries});
 assert.equal(readiness.eligibleWordCount,2); // Incomplete null-field summary is not usable by Ability Check.
 assert.equal(readiness.abilityCheckReady,false);

 assert.deepEqual((await db.query('select study_identity_key from personally_hidden_study_identities')).rows,[{study_identity_key:'hidden||かな'}]);
 assert.equal((await db.query("select total_encounter_count from study_available_library_word_summaries where study_identity_key='ordinary||かな'")).rows[0].total_encounter_count,3);
 assert.equal((await db.query("select study_identity_key from user_book_words where surface='ordinary' limit 1")).rows[0].study_identity_key,null);
 assert.deepEqual(await acl(),beforeAcl);
 await db.exec(`reset role;insert into user_book_word_visibility(word_id,user_id,user_book_id,flashcard_hidden) values ('00000000-0000-0000-0000-000000000005','${owner}','${owner}',true);set role authenticated;`);
 assert.ok(!(await keys()).includes('promote||かな'));
 assert.ok((await db.query('select study_identity_key from personally_hidden_study_identities')).rows.some(x=>x.study_identity_key==='promote||かな'));
 await db.exec("reset role;delete from user_book_word_visibility where word_id='00000000-0000-0000-0000-000000000005';set role authenticated;");
 await db.exec(`reset role;update live_lesson_capture_sessions set status='completed' where id='${owner}';set role authenticated;`);
 assert.ok((await keys()).includes('unfinished||かな'));
 await db.exec("set request.jwt.claim.sub='22222222-2222-2222-2222-222222222222';");
 assert.deepEqual(await keys(),['private||かな']);
 await db.exec('reset role;set role anon;');await assert.rejects(keys(),/permission denied/);
 await db.exec(`reset role;${read('sql/verification/20261026_study_identity_rollback.sql')}set role authenticated;set request.jwt.claim.sub='${owner}';`);
 assert.deepEqual(await keys(),before);assert.deepEqual(await acl(),beforeAcl);
 }finally{await db.close();}
});
