import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const filename=path.resolve(import.meta.dirname,'../app/(protected)/books/[userBookId]/page.tsx');
const source=fs.readFileSync(filename,'utf8');
const ast=ts.createSourceFile(filename,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let declaration;
function visit(node){
 if(ts.isVariableDeclaration(node) && node.name.getText(ast)==='loadUniqueLookupCount') declaration=node;
 ts.forEachChild(node,visit);
}
visit(ast);
assert.ok(declaration);
const code=ts.transpileModule(`const ${declaration.getText(ast)};`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
async function runQuery(result){
 const state={count:999,word:'stale',page:999,chapter:'stale'};
 const calls=[];const logs=[];
 const query={
  select:fields=>{calls.push(['select',fields]);return query;},
  eq:(key,value)=>{calls.push(['eq',key,value]);return query;},
  order:(key,options)=>{calls.push(['order',key,options]);return Promise.resolve(result);},
 };
 const client={from:table=>{calls.push(['from',table]);return query;}};
 const load=new Function('supabase','setUniqueLookupCount','setLastSavedWord','setLastSavedWordPage','setLastSavedChapter','console',`${code}; return loadUniqueLookupCount;`)(client,v=>state.count=v,v=>state.word=v,v=>state.page=v,v=>state.chapter=v,{error:(...args)=>logs.push(args)});
 await load('reader-copy');return {state,calls,logs};
}
test('Book Hub selects only consumed schema fields, scoped to the copy and newest first',async()=>{
 const {calls}=await runQuery({data:[],error:null});
 assert.deepEqual(calls,[['from','user_book_words'],['select','surface, meaning, page_number, chapter_number, chapter_name, created_at'],['eq','user_book_id','reader-copy'],['order','created_at',{ascending:false}]]);
});
test('Lookup count deduplicates word/meaning pairs while recent word and furthest chapter load',async()=>{
 const {state,logs}=await runQuery({error:null,data:[
  {surface:'取り壊す',meaning:'demolish',page_number:null,chapter_number:2,chapter_name:'Second',created_at:'2026-09-21'},
  {surface:'取り壊す',meaning:'demolish',page_number:37,chapter_number:4,chapter_name:'Fourth',created_at:'2026-09-20'},
  {surface:'取り壊す',meaning:'pull down',page_number:36,created_at:'2026-09-19'},
  {surface:' ',meaning:' ',page_number:99,chapter_number:99,created_at:'2026-09-18'},
 ]});
 assert.deepEqual(state,{count:2,word:'取り壊す',page:null,chapter:'Fourth'});assert.deepEqual(logs,[]);
});
test('Recent-word state supports meaning-only entries and clears on a genuinely empty book',async()=>{
 const loaded=await runQuery({error:null,data:[{surface:' ',meaning:'meaning only',page_number:0,chapter_number:0}]});
 assert.deepEqual(loaded.state,{count:1,word:'meaning only',page:0,chapter:'Chapter 0'});
 const empty=await runQuery({error:null,data:[]});assert.deepEqual(empty.state,{count:0,word:'',page:null,chapter:''});
});
test('Supabase failures expose message/details/hint/code even for non-enumerable error properties',async()=>{
 const error={};
 for(const [key,value] of Object.entries({message:'column does not exist',details:'missing column',hint:'check migration',code:'42703'})) Object.defineProperty(error,key,{value,enumerable:false});
 assert.equal(JSON.stringify(error),'{}');
 const {state,logs}=await runQuery({error,data:null});
 assert.deepEqual(state,{count:null,word:'',page:null,chapter:''});
 assert.equal(logs.length,1);assert.equal(logs[0][0],'Error loading lookup count:');
 assert.deepEqual(logs[0][1],{message:'column does not exist',details:'missing column',hint:'check migration',code:'42703',table:'user_book_words',select:'surface, meaning, page_number, chapter_number, chapter_name, created_at',userBookId:'reader-copy',order:'created_at descending'});
});
