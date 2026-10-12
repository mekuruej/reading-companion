import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require=createRequire(import.meta.url), cache=new Map();
function load(file){
 file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;
 const mod={exports:{}};cache.set(file,mod);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;
 new Function('require','module','exports',code)(name=>{
  if(name.startsWith('.')||name.startsWith('@/')){const base=name.startsWith('@/')?path.resolve(name.slice(2)):path.resolve(path.dirname(file),name);return load(['.ts','.tsx'].map(ext=>base+ext).find(fs.existsSync));}
  return require(name);
 },mod,mod.exports);return mod.exports;
}
const {loadTeacherAttention}=load('lib/teacher/attention.ts');
const Badge=load('components/TeacherAttentionBadge.tsx').default;
function fixture(){
 const tables={teacher_students:[{teacher_id:'t',student_id:'a',archived_at:null},{teacher_id:'t',student_id:'b',archived_at:null},{teacher_id:'other',student_id:'foreign',archived_at:null},{teacher_id:'t',student_id:'past',archived_at:'yesterday'}],live_lesson_capture_sessions:[],book_requests:[],learning_tasks:[{student_id:'a',status:'assigned'}]};
 const calls=[];
 const db={from(table){const filters=[];let from=0,to=Infinity;const q={select(columns){calls.push({table,columns});return q},eq(key,value){filters.push(row=>row[key]===value);return q},is(key,value){filters.push(row=>row[key]===value);return q},in(key,values){filters.push(row=>values.includes(row[key]));return q},or(value){assert.equal(value,'status.eq.pending,status.is.null');filters.push(row=>row.status==='pending'||row.status==null);return q},order(){return q},range(a,b){from=a;to=b;return q},then(resolve,reject){return Promise.resolve({data:tables[table].filter(row=>filters.every(f=>f(row))).slice(from,to+1),error:null}).then(resolve,reject)}};return q}};
 const review=(student,status='deferred',teacher='t')=>tables.live_lesson_capture_sessions.push({id:`r${tables.live_lesson_capture_sessions.length}`,student_id:student,status,teacher_id:teacher});
 const request=(student,status='pending')=>tables.book_requests.push({id:`b${tables.book_requests.length}`,user_id:student,status});
 return {db,tables,calls,review,request};
}
test('1 → 2 → 3 items; completion, resolution, archive and reactivation derive new counts',async()=>{
 const f=fixture(),actor={role:'teacher'},read=()=>loadTeacherAttention(f.db,'t',actor);
 f.review('a');assert.deepEqual(await read(),{total:1,byStudent:{a:1}});
 f.request('a');assert.deepEqual(await read(),{total:2,byStudent:{a:2}});
 f.review('b','reviewing');assert.deepEqual(await read(),{total:3,byStudent:{a:2,b:1}});
 f.tables.live_lesson_capture_sessions[0].status='completed';assert.deepEqual(await read(),{total:2,byStudent:{a:1,b:1}});
 f.tables.book_requests[0].status='reviewed';assert.deepEqual(await read(),{total:1,byStudent:{b:1}});
 f.tables.teacher_students[1].archived_at='today';assert.equal((await read()).total,0);
 f.tables.teacher_students[1].archived_at=null;assert.equal((await read()).total,1);
});
test('ordinary teacher excludes foreign, archived, trials, legacy, other users and student homework',async()=>{
 const f=fixture();for(const id of ['foreign','past','trial','legacy','other']){f.review(id);f.request(id)}
 for(const status of ['capturing','completed','cancelled'])f.review('a',status);
 for(const status of ['reviewed','rejected','cancelled'])f.request('a',status);
 f.review('a','deferred','other');
 assert.deepEqual(await loadTeacherAttention(f.db,'t',{role:'teacher'}),{total:0,byStudent:{}});
 assert.ok(!f.calls.some(call=>call.table==='learning_tasks'));
});
test('super-teacher includes actual current relationships only and own actionable reviews',async()=>{
 const f=fixture();for(const id of ['a','foreign','past','trial','legacy','other']){f.review(id);f.request(id)}
 f.review('a','deferred','other');
 assert.deepEqual(await loadTeacherAttention(f.db,'t',{role:'super_teacher'}),{total:4,byStudent:{a:2,foreign:2}});
 assert.equal((await loadTeacherAttention(f.db,'t',{role:'admin',is_super_teacher:true})).total,4);
});
test('plain admin and reader do not even query teaching data',async()=>{
 const f=fixture();f.review('a');for(const actor of [{role:'admin'},{role:'reader'},null]) assert.deepEqual(await loadTeacherAttention(f.db,'t',actor),{total:0,byStudent:{}});
 assert.equal(f.calls.length,0);
});
test('duplicates in active relationships do not double count; null pending status matches Workspace',async()=>{
 const f=fixture();f.tables.teacher_students.push({teacher_id:'other',student_id:'a',archived_at:null});f.request('a',null);
 assert.deepEqual(await loadTeacherAttention(f.db,'t',{role:'super_teacher'}),{total:1,byStudent:{a:1}});
});
test('many students use batched identity-only reads, not N+1; item pagination is complete',async()=>{
 const f=fixture();f.tables.teacher_students=[];
 for(let i=0;i<100;i++){f.tables.teacher_students.push({teacher_id:'t',student_id:`s${i}`,archived_at:null});f.review(`s${i}`)}
 for(let i=0;i<550;i++)f.review('s0');
 const result=await loadTeacherAttention(f.db,'t',{role:'teacher'});
 assert.equal(result.total,650);assert.equal(result.byStudent.s0,551);assert.equal(f.calls.length,4);
 assert.ok(f.calls.every(call=>!call.columns.includes('*')));
});
test('badges omit zero and expose numeric accessible text',()=>{
 assert.equal(renderToStaticMarkup(React.createElement(Badge,{count:0})), '');
 assert.match(renderToStaticMarkup(React.createElement(Badge,{count:2})),/aria-label="2 items need teacher attention"/);
});
test('all surfaces share count hook; workspace shares status predicates and direct anchor',()=>{
 for(const file of ['components/Header.tsx','app/(protected)/teacher/page.tsx','app/(protected)/teacher/students/page.tsx'])assert.match(fs.readFileSync(file,'utf8'),/useTeacherAttention/);
 const index=fs.readFileSync('app/(protected)/teacher/students/page.tsx','utf8');assert.match(index,/#needs-attention/);
 const workspace=fs.readFileSync('app/(protected)/teacher/students/[studentId]/workspace/page.tsx','utf8');assert.match(workspace,/id="needs-attention"/);assert.match(workspace,/Review captured words/);
 const api=fs.readFileSync('app/api/teacher/student-workspace/route.ts','utf8');assert.match(api,/REVIEW_ATTENTION_STATUSES/);assert.match(api,/PENDING_BOOK_REQUEST_FILTER/);
 const header=fs.readFileSync('components/Header.tsx','utf8');assert.match(header,/profileIsSuperTeacher \? "Users" : "Students"/);
});
test('endpoint rejects anonymous/invalid/plain-admin access and derives teacher identity from token',async()=>{
 let role='teacher', authenticated=true, calls=0;
 const db={auth:{async getUser(token){assert.equal(token,'valid');return {data:{user:authenticated?{id:'signed-in'}:null},error:null}}},from(){return {select(){return this},eq(){return this},async maybeSingle(){return {data:{role},error:null}}}}};
 const mod={exports:{}};
 new Function('require','module','exports',ts.transpileModule(fs.readFileSync('app/api/teacher/attention/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(name=>{
  if(name==='next/server')return {NextResponse:{json:(body,init={})=>({body,status:init.status??200,headers:init.headers})}};
  if(name==='@supabase/supabase-js')return {createClient:()=>db};
  if(name.endsWith('/studentsIndex'))return load('lib/teacher/studentsIndex.ts');
  if(name.endsWith('/attention'))return {loadTeacherAttention:async(_db,actorId)=>{calls++;assert.equal(actorId,'signed-in');return {total:1,byStudent:{a:1}}}};
  throw Error(name);
 },mod,mod.exports);
 const request=()=>new Request('https://example.test/api/teacher/attention?teacherId=forged',{headers:{authorization:'Bearer valid'}});
 assert.equal((await mod.exports.GET(new Request('https://example.test'))).status,401);
 authenticated=false;assert.equal((await mod.exports.GET(request())).status,401);
 authenticated=true;role='admin';assert.equal((await mod.exports.GET(request())).status,403);assert.equal(calls,0);
 role='teacher';const response=await mod.exports.GET(request());assert.equal(response.status,200);assert.equal(response.body.total,1);assert.equal(response.headers['Cache-Control'],'no-store');
});
