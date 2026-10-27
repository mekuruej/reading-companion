// Reproducible synthetic plan comparison; timings are diagnostics, never pass/fail limits.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const old=read('sql/verification/20261026_study_identity_rollback.sql');
const corrected=read('sql/20261026_study_visibility_effective_identity.sql');
const identity=read('sql/20260501_library_word_summaries_01_table.sql').match(/create or replace function public.library_study_identity_key[\s\S]*?\$identity_key\$;/)[0];
const owner='11111111-1111-1111-1111-111111111111';
test('scaled EXPLAIN ANALYZE BUFFERS comparisons',async t=>{
 const db=new PGlite();try{
 await db.exec(`create role authenticated;create schema auth;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table user_books(id int primary key,user_id uuid);
 create table user_book_words(id int primary key,user_book_id int,surface text,reading text,study_identity_key text,hidden boolean);
 create table user_book_word_visibility(word_id int primary key,user_id uuid,follow_along_hidden boolean,flashcard_hidden boolean);
 create table user_library_word_summaries(user_id uuid,study_identity_key text,definition_key text default '',last_seen_at timestamptz default now(),unique(user_id,study_identity_key,definition_key));
 ${identity}
 create index derived_identity on user_book_words(library_study_identity_key(surface,reading),user_book_id);
 alter table user_books enable row level security;create policy owner on user_books using(user_id=auth.uid());
 alter table user_book_words enable row level security;create policy owner on user_book_words using(exists(select 1 from user_books b where b.id=user_book_id));
 alter table user_book_word_visibility enable row level security;create policy owner on user_book_word_visibility using(user_id=auth.uid());
 alter table user_library_word_summaries enable row level security;create policy owner on user_library_word_summaries using(user_id=auth.uid());
 create view finalized_user_book_words with(security_invoker=true) as select * from user_book_words;
 grant usage on schema public,auth to authenticated;grant select on all tables in schema public to authenticated;
 ${read('sql/20261014_personal_word_visibility.sql').split('create view public.personal_user_book_words')[1].split('commit;')[0].replace(/^/,'create view public.personal_user_book_words')}
 insert into user_books values(1,'${owner}');set request.jwt.claim.sub='${owner}';`);
 for(const n of [200,2000,10000,50000]){
 await db.exec(`reset role;truncate user_book_words,user_book_word_visibility,user_library_word_summaries;
 insert into user_book_words select n,1,'word'||n,'かな',null,false from generate_series(1,${n})n;
 insert into user_library_word_summaries(user_id,study_identity_key) select '${owner}',library_study_identity_key(surface,reading) from user_book_words;
 insert into user_book_word_visibility select id,'${owner}',false,true from user_book_words where id%20=0;analyze;`);
 const orVariant=corrected.replace('coalesce(w.study_identity_key, public.library_study_identity_key(w.surface, w.reading)) = s.study_identity_key', '(w.study_identity_key = s.study_identity_key or (w.study_identity_key is null and public.library_study_identity_key(w.surface, w.reading) = s.study_identity_key))');
 for(const [label,sql] of [['prior',old],['corrected',corrected],['or_candidate',orVariant]]){
 if(label==='or_candidate' && n>200) continue;
 await db.exec("reset role;set statement_timeout='5s';"+sql+'set role authenticated;');
 for(const [kind,q] of [['available','select count(*) from study_available_library_word_summaries'],['hidden','select count(*) from personally_hidden_study_identities'],['consumer','select * from study_available_library_word_summaries order by last_seen_at desc,study_identity_key asc limit 1001']]){
 if(label==='or_candidate' && kind!=='available')continue;
 const times=[];let plan;
 for(let run=0;run<3;run++){
 plan=(await db.query('explain (analyze,buffers,format json) '+q)).rows[0]['QUERY PLAN'][0];times.push(plan['Execution Time']);
 }
 const count=kind==='consumer'?plan.Plan['Actual Rows']:Number((await db.query(q)).rows[0].count);
 if(label!=='prior')assert.equal(count,kind==='hidden'?n/20:kind==='consumer'?Math.min(n-n/20,1001):n-n/20);
 console.log(JSON.stringify({n,label,kind,count,median_ms:times.sort((a,b)=>a-b)[1],plan}));
 }
 }
 for(const [label,q] of [['scan_only','select sum(length(surface)+length(reading)) from user_book_words'],['derive_only','select sum(length(library_study_identity_key(surface,reading))) from user_book_words']]){
 await db.exec('reset role;set role authenticated;');
 const times=[];let plan;for(let i=0;i<3;i++){plan=(await db.query('explain(analyze,buffers,format json) '+q)).rows[0]['QUERY PLAN'][0];times.push(plan['Execution Time']);}
 console.log(JSON.stringify({n,label,kind:'micro_control',median_ms:times.sort((a,b)=>a-b)[1],plan}));
 }
 // Equal-output control: all words pinned, old and new return exactly the same identities.
 await db.exec('reset role;update user_book_words set study_identity_key=library_study_identity_key(surface,reading);analyze;');
 for(const [label,sql] of [['prior_pinned',old],['corrected_pinned',corrected]]){
 await db.exec('reset role;'+sql+'set role authenticated;');
 let plan;const times=[];for(let i=0;i<3;i++){plan=(await db.query('explain(analyze,buffers,format json) select count(*) from study_available_library_word_summaries')).rows[0]['QUERY PLAN'][0];times.push(plan['Execution Time']);}
 console.log(JSON.stringify({n,label,kind:'available',count:Number((await db.query('select count(*) from study_available_library_word_summaries')).rows[0].count),median_ms:times.sort((a,b)=>a-b)[1],plan}));
 }
 }
 }finally{await db.close();}
});
