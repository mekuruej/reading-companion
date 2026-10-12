import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function load(file,db){const mod={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(name=>{
 if(name==='@supabase/supabase-js')return {createClient:()=>db};
 if(name.startsWith('@/'))return load(name.slice(2)+'.ts',db);
 return require(name);
},mod,mod.exports);return mod.exports}
function harness(profile={role:'admin'},failure=null){
 const writes=[],queries=[];
 const db={auth:{async getUser(token){return {data:{user:token==='valid'?{id:id(1)}:null},error:null}}},from(table){let filter='';queries.push(table);const q={select(){return q},eq(){return q},order(){return q},or(value){filter=value;return q},async limit(){return {data:[{id:id(3),title:'Candidate',work_id:null}],error:failure}},async maybeSingle(){return {data:profile,error:null}}};return q},async rpc(name,args){writes.push({name,args});return {data:id(9),error:failure}}};
 const route=load('app/api/admin/book-works/route.ts',db);
 const get=(query='?kind=editions&q=Work',token='valid')=>route.GET(new Request('http://localhost/api/admin/book-works'+query,{headers:{Authorization:'Bearer '+token}}));
 const post=(body,token='valid')=>route.POST(new Request('http://localhost/api/admin/book-works',{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify(body)}));
 return {writes,queries,get,post};
}
const change={bookId:id(2),expectedWorkId:null,action:'link',workId:id(9),confirmed:true};
test('search only discovers candidates and never links or creates ownership',async()=>{
 const h=harness();const r=await h.get();assert.equal(r.status,200);assert.equal((await r.json()).items.length,1);assert.deepEqual(h.writes,[]);
 assert.ok(h.queries.every(t=>['profiles','books'].includes(t)));
});
test('unauthenticated, reader and ordinary teacher access is denied on reads and writes',async()=>{
 for(const profile of [{role:'reader'},{role:'teacher'},{role:'teacher',is_super_teacher:'false'}]){const h=harness(profile);assert.equal((await h.get()).status,403);assert.equal((await h.post(change)).status,403);assert.deepEqual(h.writes,[])}
 const h=harness();assert.equal((await h.get(undefined,'invalid')).status,401);assert.equal((await h.post(change,'invalid')).status,401);assert.deepEqual(h.writes,[]);
});
test('admin and explicit super-teacher changes use authenticated actor, not body actor',async()=>{
 for(const profile of [{role:'admin'},{role:'super_teacher'},{role:'reader',is_super_teacher:true}]){const h=harness(profile);assert.equal((await h.post({...change,actorId:id(99)})).status,200);assert.equal(h.writes[0].args.p_actor_id,id(1));assert.equal(h.writes[0].name,'maintain_book_work')}
});
test('missing confirmation, expected relationship, invalid action or malformed IDs reject before mutation',async()=>{
 for(const body of [{...change,confirmed:false},{...change,confirmed:undefined},{...change,expectedWorkId:undefined},{...change,action:'merge'},{...change,bookId:'bad'},{...change,bookId:[id(2)]},{...change,workId:[id(9)]},{...change,action:'create',workId:null,title:''},{...change,action:'create',workId:null,title:'Work',expectedWorkId:id(8)}]){const h=harness();assert.equal((await h.post(body)).status,400);assert.deepEqual(h.writes,[])}
});
test('create, unlink and move pass explicit expected previous relationship',async()=>{
 for(const body of [{bookId:id(2),expectedWorkId:null,action:'create',title:' Work ',author:' Author ',confirmed:true},{bookId:id(2),expectedWorkId:id(8),action:'unlink',confirmed:true},{...change,expectedWorkId:id(8)}]){const h=harness();assert.equal((await h.post(body)).status,200);assert.equal(h.writes[0].args.p_expected_work_id,body.expectedWorkId);assert.equal(h.writes[0].args.p_action,body.action)}
});
test('conflicts report 409; absent migration reports 503 instead of implying unlinked',async()=>{
 assert.equal((await harness(undefined,{code:'40001'}).post(change)).status,409);
 const r=await harness(undefined,{code:'42703'}).get();assert.equal(r.status,503);assert.match((await r.json()).error,/migration/);
});
