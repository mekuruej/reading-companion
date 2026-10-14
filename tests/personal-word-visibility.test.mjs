import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const sql = fs.readFileSync('sql/20261014_personal_word_visibility.sql','utf8');
async function fixture() {
 const db = new PGlite();
 await db.exec(`create role authenticated;create role anon;create schema auth;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('app.actor_id',true),'')::uuid$$;
 create table auth.users(id uuid primary key);
 create table user_books(id uuid primary key,user_id uuid not null references auth.users);
 create table user_book_words(id uuid primary key,user_book_id uuid references user_books on delete cascade,study_identity_key text,hidden boolean default false,review_count integer default 7,next_review_at date default '2027-01-01');
 create table user_library_word_summaries(user_id uuid,study_identity_key text,total_encounter_count integer);
 create table review_history(word_id uuid,result text);
 alter table user_books enable row level security;
 create policy books on user_books for select using (user_id=auth.uid());
 alter table user_book_words enable row level security;
 create policy words on user_book_words for select using(exists(select 1 from user_books b where b.id=user_book_id));
 alter table user_library_word_summaries enable row level security;
 create policy summaries on user_library_word_summaries for select using(user_id=auth.uid());
 create view finalized_user_book_words with(security_invoker=true) as select * from user_book_words;
 grant usage on schema auth,public to authenticated,anon;
 grant select on user_books,user_book_words,user_library_word_summaries,finalized_user_book_words to authenticated;
 insert into auth.users values('${id(1)}'),('${id(2)}');
 insert into user_books values('${id(10)}','${id(1)}'),('${id(11)}','${id(1)}'),('${id(12)}','${id(2)}');
 insert into user_book_words(id,user_book_id,study_identity_key) values('${id(20)}','${id(10)}','same'),('${id(21)}','${id(11)}','same'),('${id(22)}','${id(12)}','same');
 insert into user_library_word_summaries values('${id(1)}','same',2),('${id(2)}','same',1);
 insert into review_history values('${id(20)}','good');`);
 await db.exec(sql);
 await db.exec(`set role authenticated;set app.actor_id='${id(1)}'`);
 return db;
}
const save = (db, word, book, feature, hidden) => db.query('select set_book_word_visibility($1,$2,$3,$4)',[id(word),id(book),feature,hidden]);
test('defaults, persistence, independent hide/Undo/restore, book and user isolation, queues and unchanged scheduling',async()=>{
 const db = await fixture();
 try {
  const before = (await db.query('select * from user_book_words order by id')).rows;
  assert.equal((await db.query('select * from personal_user_book_words where follow_along_hidden or flashcard_hidden')).rows.length,0);
  await save(db,20,10,'follow_along',true);
  assert.equal((await db.query('select * from study_visible_user_book_words')).rows.length,2);
  await save(db,20,10,'flashcard',true);
  await save(db,20,10,'flashcard',true); // retry is idempotent
  assert.equal((await db.query('select * from user_book_word_visibility')).rows.length,1);
  assert.equal((await db.query('select * from study_visible_user_book_words')).rows.length,1);
  assert.equal((await db.query('select * from personally_hidden_study_identities')).rows.length,0); // other book visible
  await db.exec(`reset role;set role authenticated;set app.actor_id='${id(1)}'`); // fresh authorization/read, no client state
  assert.deepEqual((await db.query('select follow_along_hidden,flashcard_hidden from personal_user_book_words where id=$1',[id(20)])).rows[0],{follow_along_hidden:true,flashcard_hidden:true});
  await save(db,20,10,'flashcard',false); // Undo only flashcard flag
  assert.deepEqual((await db.query('select follow_along_hidden,flashcard_hidden from personal_user_book_words where id=$1',[id(20)])).rows[0],{follow_along_hidden:true,flashcard_hidden:false});
  await save(db,20,10,'flashcard',true);
  await save(db,21,11,'flashcard',true);
  assert.equal((await db.query('select * from study_visible_user_book_words')).rows.length,0);
  assert.equal((await db.query('select * from study_available_library_word_summaries')).rows.length,0);
  assert.deepEqual((await db.query('select * from personally_hidden_study_identities')).rows,[{study_identity_key:'same'}]);
  await save(db,20,10,'flashcard',false);
  assert.equal((await db.query('select total_encounter_count from study_available_library_word_summaries')).rows[0].total_encounter_count,2);
  assert.deepEqual((await db.query('select * from user_book_words order by id')).rows,before);
  await db.exec(`set app.actor_id='${id(2)}'`);
  assert.equal((await db.query('select * from user_book_word_visibility')).rows.length,0);
  assert.equal((await db.query('select * from study_visible_user_book_words')).rows.length,1);
  await db.exec('reset role');
  assert.equal((await db.query('select * from review_history')).rows.length,1);
 } finally {await db.close();}
});
test('RPC ownership, book mismatch, invalid feature, anonymous and direct table writes are rejected',async()=>{
 const db=await fixture();try {
  await assert.rejects(save(db,22,12,'flashcard',true),/not in your book/);
  await assert.rejects(save(db,20,11,'flashcard',true),/not in your book/);
  await assert.rejects(save(db,20,10,'hidden',true),/Invalid visibility/);
  await assert.rejects(db.exec(`insert into user_book_word_visibility values('${id(20)}','${id(1)}','${id(10)}',true,true)`),/permission denied/);
  await save(db,20,10,'flashcard',true);
  await assert.rejects(db.exec('update user_book_word_visibility set flashcard_hidden=false'),/permission denied/);
  // Even a teacher who can read somebody else's book cannot change or see their preferences.
  await db.exec(`reset role;create policy teacher_books on user_books for select using(true);create policy teacher_words on user_book_words for select using(true);set role authenticated;set app.actor_id='${id(2)}'`);
  assert.equal((await db.query('select * from user_book_word_visibility')).rows.length,0);
  await assert.rejects(save(db,20,10,'flashcard',false),/not in your book/);
  await db.exec('set role anon');
  await assert.rejects(save(db,20,10,'flashcard',false),/permission denied/);
 }finally{await db.close();}
});
test('preference records follow word and book deletion without touching other books',async()=>{
 const db=await fixture();try{
  await save(db,20,10,'flashcard',true);await save(db,21,11,'follow_along',true);
  await db.exec(`reset role;delete from user_book_words where id='${id(20)}'`);
  assert.equal((await db.query('select * from user_book_word_visibility')).rows.length,1);
  await db.exec(`delete from user_books where id='${id(11)}'`);
  assert.equal((await db.query('select * from user_book_word_visibility')).rows.length,0);
 }finally{await db.close();}
});
function load(file, deps={}) {
 const module={exports:{}};
 const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;
 new Function('require','module','exports',js)(name=>{if(name in deps)return deps[name];throw Error(name)},module,module.exports);
 return module.exports;
}
test('cross-book selection excludes hidden encounters without mutating historical totals',()=>{
 const {visibleStudyEncounters}=load('lib/vocabulary/personalVisibility.ts');
 const rows=[{id:'a',flashcard_hidden:true},{id:'b',follow_along_hidden:true},{id:'c'}];
 assert.deepEqual(visibleStudyEncounters(rows).map(x=>x.id),['b','c']);
 assert.equal(rows.length,3);
});
test('save controller serializes actions, commits before hiding, keeps failed Undo retryable, and restores only one flag',async()=>{
 const state=[];let cursor=0;let resolve;let calls=[];let saved=[];
 const React={useRef(initial){const i=cursor++;return state[i]??(state[i]={current:initial})},useState(initial){const i=cursor++;if(!(i in state))state[i]=initial;return [state[i],value=>state[i]=typeof value==='function'?value(state[i]):value]}};
 const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
 const {usePersonalVisibility}=load('components/vocabulary/usePersonalVisibility.tsx',{react:React,'react/jsx-runtime':jsx,'@/lib/supabaseClient':{supabase:{rpc:async(name,args)=>{calls.push({name,args});return await new Promise(r=>resolve=r)}}}});
 const render=()=>{cursor=0;return usePersonalVisibility(change=>saved.push(change))};
 const change={wordId:'a',bookId:'book',feature:'flashcard',hidden:true};
 let hook=render();const pending=hook.save(change);await hook.save(change);
 assert.equal(calls.length,1);assert.equal(saved.length,0);assert.equal(render().busy,true);
 resolve({error:{message:'offline'}});await pending;
 assert.equal(saved.length,0);assert.ok(render().notice);
 hook=render();const retry=hook.save(change);resolve({error:null});await retry;
 assert.equal(saved.length,1);hook=render();
 const nodes=node=>!node||typeof node!=='object'?[]:[node,...[node.props?.children].flat().flatMap(nodes)];
 let undo=nodes(hook.notice).find(n=>n.type==='button');assert.ok(undo);
 undo.props.onClick();resolve({error:{message:'offline'}});await new Promise(r=>setImmediate(r));
 hook=render();undo=nodes(hook.notice).find(n=>n.type==='button');assert.ok(undo);
 undo.props.onClick();resolve({error:null});await new Promise(r=>setImmediate(r));
 assert.deepEqual(saved[1],{...change,hidden:false});assert.equal(render().notice,null);
 assert.ok(calls.every(c=>c.name==='set_book_word_visibility'&&c.args.p_feature==='flashcard'));
});
test('grouped deck Hide and Undo retain other entries, original review state, and book isolation',()=>{
 const {changeGroupedCardVisibility:change}=load('lib/vocabulary/personalVisibility.ts');
 const a={id:'a',sense:'same',book:'A',progress:{reviews:17,due:'2027-01-01'}};
 const b={...a,id:'b',book:'B'};
 const other={...a,id:'other',sense:'different'};
 const same=(a,b)=>a.sense===b.sense;
 const hidden=change([{...a,visibilityEntries:[a,b]},other],a,true,same);
 assert.deepEqual(hidden.map(x=>x.id),['b','other']);
 assert.equal(hidden[0].book,'B');assert.deepEqual(hidden[0].progress,a.progress);
 const restored=change(hidden,a,false,same);
 assert.deepEqual(restored[0].visibilityEntries.map(x=>x.id),['a','b']);
 assert.deepEqual(restored[0].progress,a.progress);
 assert.deepEqual(change([a],a,true,same),[]);
 assert.deepEqual(change([],a,false,same)[0].progress,a.progress);
 // Ungrouped duplicate cards still target the exact clicked entry.
 assert.deepEqual(change([a,b],b,true,same).map(x=>x.id),['a']);
});
test('Follow-Along Hide stops parent click and keyboard handlers and does not alter progress',()=>{
 const jsx={jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
 let hides=0,progress=0,stopped=0,prevented=0;
 const {default:Card}=load('app/(protected)/books/[userBookId]/readalong/components/ReadAlongWordCard.tsx',{
  'react/jsx-runtime':jsx,'@/components/LibraryColorBadge':{default:()=>null},
  '@/lib/vocabulary/wordContext':{followAlongSurface:word=>word.surface},
 });
 const tree=Card({word:{id:'a',surface:'本'},supportMode:'full',isFaded:false,colorInfo:null,setWordRef:()=>{},onProgressTap:()=>progress++,onHide:()=>hides++,hideBusy:false});
 const nodes=node=>!node||typeof node!=='object'?[]:[node,...[node.props?.children].flat().flatMap(nodes)];
 const button=nodes(tree).find(node=>node.type==='button'&&node.props.children==='Hide');
 assert.ok(button);
 button.props.onClick({preventDefault:()=>prevented++,stopPropagation:()=>stopped++});
 button.props.onKeyDown({stopPropagation:()=>stopped++});
 assert.equal(hides,1);assert.equal(progress,0);assert.equal(prevented,1);assert.equal(stopped,2);
});
