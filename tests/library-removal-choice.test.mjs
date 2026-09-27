import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url),root=path.resolve(import.meta.dirname,'..');
let teaching,owner,writes;
const client={auth:{getUser:async()=>({data:{user:{id:'actor'}}})},from(table){let patch;const q={select(){return q},eq(){return q},update(value){patch=value;return q},maybeSingle:async()=>({data:{id:'copy',user_id:owner,book_id:'book'}}),single:async()=>{writes.push({table,patch});return {data:{id:'copy'}}}};return q},rpc:async(name,args)=>{writes.push({name,args});return {error:null}}};
const mod={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path.join(root,'app/api/books/[userBookId]/remove-from-library/route.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(name=>name==='@supabase/supabase-js'?{createClient:()=>client}:name==='@/lib/teacher/teachingRetention'?{requiresTeachingRetention:async()=>teaching}:require(name),mod,mod.exports);
async function remove(choice){return mod.exports.POST(new Request('https://example.invalid/remove',{method:'POST',headers:{authorization:'Bearer fake'},body:JSON.stringify({teachingChoice:choice})}),{params:Promise.resolve({userBookId:'copy'})})}
test('teaching connection never silently retains or deletes; explicit keep/remove determines outcome',async()=>{
 owner='actor';teaching=true;writes=[];
 let response=await remove();assert.equal(response.status,409);assert.equal((await response.json()).requiresTeachingChoice,true);assert.deepEqual(writes,[]);
 response=await remove('keep');assert.equal((await response.json()).outcome,'retained_as_teaching_only');assert.equal(writes[0].patch.personal_tracking_status,'not_tracking');
 writes=[];response=await remove('remove');assert.equal((await response.json()).outcome,'removed');assert.deepEqual(writes,[{name:'remove_owned_library_book',args:{p_actor_id:'actor',p_user_book_id:'copy',p_remove_teaching:true}}]);
});
test('regular removal does not create teaching data and another owner cannot remove it',async()=>{
 teaching=false;owner='actor';writes=[];let response=await remove();assert.equal(response.status,200);assert.equal(writes[0].args.p_remove_teaching,false);
 owner='someone-else';writes=[];response=await remove('remove');assert.equal(response.status,403);assert.deepEqual(writes,[]);
});
test('transaction removes only owner copy/teaching entries, preserves notebook and student copy, rolls back failures', {skip:!process.env.PGLITE_MODULE},async()=>{
 const {PGlite}=await import(process.env.PGLITE_MODULE);const db=new PGlite();
 const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
 const actor=id(1),student=id(2),book=id(3),copy=id(4),studentCopy=id(5),teacherBook=id(6),entry=id(7);
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create table user_books(id uuid primary key,user_id uuid,book_id uuid);
 create table teacher_books(id uuid primary key,teacher_id uuid,book_id uuid,user_book_id uuid references user_books on delete set null);
 create table teacher_book_items(id uuid,teacher_book_id uuid references teacher_books on delete cascade);
 create table teacher_book_prep_items(id uuid,teacher_id uuid,book_id uuid,prep_user_book_id uuid references user_books on delete set null);
 create table teacher_book_vocabulary(id uuid,teacher_id uuid,book_id uuid);
 create table teacher_notebook_entries(id uuid primary key,teacher_id uuid);
 create table teacher_notebook_entry_contexts(id uuid,entry_id uuid references teacher_notebook_entries,book_id uuid,user_book_id uuid references user_books on delete set null,teacher_book_id uuid references teacher_books on delete set null);
 create table teacher_notebook_word_lists(id uuid,teacher_id uuid,book_id uuid,user_book_id uuid references user_books on delete set null);
 create table teacher_student_lesson_books(teacher_id uuid,user_book_id uuid references user_books on delete cascade);`);
 for(const table of ['user_word_collocations','study_logs','user_study_events','user_alerts','user_book_detective_entries','user_book_characters','user_book_chapter_summaries','user_book_reading_sessions','learning_tasks','user_book_words'])await db.exec(`create table ${table}(user_book_id uuid references user_books on delete cascade)`);
 const migration=fs.readFileSync(path.join(root,'sql/20260927_explicit_library_removal.sql'),'utf8');await db.exec(migration);await db.exec(migration);
 await db.query('insert into user_books values ($1,$2,$3),($4,$5,$3)',[copy,actor,book,studentCopy,student]);
 await db.query('insert into teacher_books values ($1,$2,$3,$4)',[teacherBook,actor,book,copy]);
 await db.query('insert into teacher_notebook_entries values ($1,$2)',[entry,actor]);
 await db.query('insert into teacher_notebook_entry_contexts values ($1,$1,$2,$3,$4)',[entry,book,copy,teacherBook]);
 await db.query('insert into teacher_student_lesson_books values ($1,$2)',[actor,studentCopy]);
 await db.query('insert into user_book_words values ($1),($2)',[copy,studentCopy]);
 await assert.rejects(db.query('select remove_owned_library_book($1,$2,false)',[actor,copy]),/explicit/);
 await assert.rejects(db.query('select remove_owned_library_book($1,$2,true)',[student,copy]),/owned/);
 await db.exec(`create function fail_delete() returns trigger language plpgsql as $$begin raise exception 'blocked test';end$$;create trigger stop_delete before delete on user_books for each row execute function fail_delete();`);
 await assert.rejects(db.query('select remove_owned_library_book($1,$2,true)',[actor,copy]),/blocked test/);
 assert.equal((await db.query('select * from teacher_books')).rows.length,1);assert.equal((await db.query('select * from user_book_words')).rows.length,2);
 await db.exec('drop trigger stop_delete on user_books');await db.query('select remove_owned_library_book($1,$2,true)',[actor,copy]);
 assert.deepEqual((await db.query('select id from user_books')).rows,[{id:studentCopy}]);assert.equal((await db.query('select * from teacher_books')).rows.length,0);
 assert.equal((await db.query('select * from teacher_student_lesson_books')).rows.length,1);assert.equal((await db.query('select * from teacher_notebook_entries')).rows.length,1);
 const context=(await db.query('select * from teacher_notebook_entry_contexts')).rows[0];assert.equal(context.book_id,book);assert.equal(context.user_book_id,null);assert.equal(context.teacher_book_id,null);
 for(const role of ['anon','authenticated'])assert.equal((await db.query(`select has_function_privilege('${role}', 'remove_owned_library_book(uuid,uuid,boolean)', 'execute') as allowed`)).rows[0].allowed,false);
 }finally{await db.close()}
});

test('teaching dialog requires a deliberate choice; cancel performs no removal',()=>{
 let choice=null;const result={exports:{}};
 new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path.join(root,'app/(protected)/books/[userBookId]/components/RemoveFromLibraryDialog.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(name=>name==='react'?{useState:()=>[choice,value=>choice=value]}:require(name),result,result.exports);
 const nodes=t=>!t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(nodes):[t,...nodes(t.props?.children)];
 let sent=[],cancelled=false;const render=(retainForTeaching=true)=>result.exports.default({retainForTeaching,isRemoving:false,error:null,onCancel:()=>cancelled=true,onConfirm:value=>sent.push(value)});
 let tree=render();let buttons=nodes(tree).filter(n=>n.type==='button');assert.equal(buttons.at(-1).props.disabled,true);
 buttons[0].props.onClick();assert.equal(cancelled,true);assert.deepEqual(sent,[]);
 for(const [index,expected] of [[0,'keep'],[1,'remove']]){
  nodes(render()).filter(n=>n.type==='input')[index].props.onChange();tree=render();buttons=nodes(tree).filter(n=>n.type==='button');assert.equal(buttons.at(-1).props.disabled,false);buttons.at(-1).props.onClick();assert.equal(sent.at(-1),expected);
 }
 assert.equal(nodes(render(false)).filter(n=>n.type==='input').length,0);
});
