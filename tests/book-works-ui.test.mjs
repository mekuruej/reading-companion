import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url);
const edition={id:'edition-print',title:'Work A',author:'Author',work_id:null,edition_format:'paperback',edition_note:null,isbn13:'111',asin:null,language_code:'ja'};
function harness(context,kind='works',results=[]){
 let cursor=0;const state=[context,false,false,'',edition.title,edition.author,kind,'Work',results,false,false];
 const mod={exports:{}};
 new Function('require','module','exports',ts.transpileModule(fs.readFileSync('app/(protected)/teacher/books/add/components/BookWorkMaintenance.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText)(name=>{
  if(name==='react')return {...React,useState(initial){const index=cursor++;return [index<state.length?state[index]:initial,value=>{state[index]=value}]},useEffect(){},useRef:()=>({current:0})};
  if(name==='next/link')return {__esModule:true,default:({children,...props})=>React.createElement('a',props,children)};
  if(name==='@/lib/supabaseClient')return {supabase:{auth:{getSession:async()=>({data:{session:{access_token:'test'}}})}}};
  return require(name);
 },mod,mod.exports);
 const tree=mod.exports.default({bookId:edition.id});
 function nodes(node){if(!node||typeof node!=='object')return [];if(Array.isArray(node))return node.flatMap(nodes);return [node,...nodes(node.props?.children)]}
 const button=text=>nodes(tree).find(node=>node.type==='button'&&String(node.props.children).includes(text));
 return {tree,button,state};
}
test('create requires confirmation; cancellation sends nothing and confirmed action targets only current edition',async()=>{
 const oldFetch=globalThis.fetch,oldWindow=globalThis.window;const requests=[],prompts=[];let approve=false;
 const context={edition,work:null,editions:[]};
 globalThis.window={confirm:text=>{prompts.push(text);return approve}};
 globalThis.fetch=async(url,options)=>{if(options.method==='POST')requests.push(JSON.parse(options.body));return new Response(JSON.stringify(options.method==='POST'?{workId:'new-work'}:context),{status:200})};
 try{
 const h=harness(context);h.button('Create work and link').props.onClick();await new Promise(setImmediate);assert.equal(requests.length,0);
 approve=true;h.button('Create work and link').props.onClick();await new Promise(setImmediate);
 assert.equal(requests.length,1);assert.deepEqual(requests[0],{action:'create',bookId:edition.id,expectedWorkId:null,confirmed:true,title:'Work A',author:'Author'});assert.match(prompts[0],/Current work: Unlinked/);
 }finally{globalThis.fetch=oldFetch;globalThis.window=oldWindow}
});
test('move shows existing work and destination, while group marks current edition',async()=>{
 const work={id:'work-a',title:'Work A',author:'Author'};
 const current={...edition,work_id:work.id};
 const candidate={...edition,id:'edition-kindle',edition_format:'ebook',isbn13:null,asin:'ASIN1',work_id:'work-b',work:{id:'work-b',title:'Wrong Work',author:'Another'}};
 const context={edition:current,work,editions:[current]};
 const h=harness(context,'editions',[candidate]);
 const html=renderToStaticMarkup(h.tree);assert.match(html,/Current edition/);assert.match(html,/Wrong Work/);assert.match(html,/Move edition to this work/);
 const oldFetch=globalThis.fetch,oldWindow=globalThis.window;let prompt='',body;
 globalThis.window={confirm:text=>{prompt=text;return true}};
 globalThis.fetch=async(url,options)=>{if(options.method==='POST')body=JSON.parse(options.body);return new Response(JSON.stringify(options.method==='POST'?{workId:work.id}:context))};
 try{h.button('Move edition').props.onClick();await new Promise(setImmediate);assert.match(prompt,/Current work: Wrong Work \(work-b\)/);assert.match(prompt,/Change to: “Work A” \(work-a\)/);assert.deepEqual(body,{action:'link',bookId:candidate.id,expectedWorkId:'work-b',confirmed:true,workId:'work-a'});}finally{globalThis.fetch=oldFetch;globalThis.window=oldWindow}
});
test('unlink confirms edition remains and never invokes deletion',async()=>{
 const work={id:'work-a',title:'Work A',author:null};const context={edition:{...edition,work_id:work.id},work,editions:[]};
 const oldFetch=globalThis.fetch,oldWindow=globalThis.window;let body,prompt='';
 globalThis.window={confirm:text=>{prompt=text;return true}};
 globalThis.fetch=async(url,options)=>{assert.notEqual(options.method,'DELETE');if(options.method==='POST')body=JSON.parse(options.body);return new Response(JSON.stringify(options.method==='POST'?{workId:null}:context))};
 try{harness(context).button('Remove this edition').props.onClick();await new Promise(setImmediate);assert.match(prompt,/The edition will remain/);assert.deepEqual(body,{action:'unlink',bookId:edition.id,expectedWorkId:'work-a',confirmed:true});}finally{globalThis.fetch=oldFetch;globalThis.window=oldWindow}
});
