import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
function load(file,mocks={}){const mod={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText)(name=>name in mocks?mocks[name]:name.startsWith('@/')?load(name.slice(2)+'.ts',mocks):name.startsWith('.')?load(path.join(path.dirname(file),name+(name.endsWith('AddBookCatalogResult')?'.tsx':'.ts')),mocks):require(name),mod,mod.exports);return mod.exports;}
const nodes=t=>!t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(nodes):[t,...nodes(t.props?.children)];
const text=t=>t==null||typeof t==='boolean'?'':typeof t==='string'||typeof t==='number'?String(t):Array.isArray(t)?t.map(text).join(''):text(t.props?.children);
async function harness(){
 let cells=[],index=0,effects=[],tree,authListener,owner='owner',fetchHandler=async()=>({books:[]}),requests=[],navigations=[];
 const equal=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
 const fakeReact={
  useState(initial){const i=index++;if(!(i in cells))cells[i]={v:initial};return [cells[i].v,v=>{cells[i].v=typeof v==='function'?v(cells[i].v):v}]},
  useRef(initial){const i=index++;return cells[i]??(cells[i]={current:initial})},
  useEffect(fn,deps){const i=index++;if(!cells[i]||!equal(cells[i].deps,deps)){const previous=cells[i];cells[i]={deps,cleanup:previous?.cleanup};effects.push(()=>{cells[i].cleanup?.();cells[i].cleanup=fn()})}},
 };
 const client={auth:{getSession:async()=>({data:{session:{user:{id:owner},access_token:'synthetic'}},error:null}),onAuthStateChange(fn){authListener=fn;return {data:{subscription:{unsubscribe(){}}}}}},from(){throw new Error('Unexpected Supabase query')}};
 const previous=globalThis.fetch;
 globalThis.fetch=async(url,options={})=>{const request={url,body:options.body?JSON.parse(options.body):null};requests.push(request);const answer=await fetchHandler(request);return {ok:(answer.status??200)<400,status:answer.status??200,json:async()=>answer.data??answer}};
 const Component=load('app/(protected)/books/add/components/ReaderAddBook.tsx',{react:fakeReact,'next/navigation':{useRouter:()=>({push:url=>navigations.push(url)})},'next/link':{default:props=>React.createElement('a',props,props.children)},'@/lib/supabaseClient':{supabase:client}}).default;
 function render(){index=0;tree=Component({ownerId:'owner'});for(const fn of effects.splice(0))fn();return tree}
 async function settle(){for(let i=0;i<6;i++)await new Promise(resolve=>setImmediate(resolve));render()}
 function change(label,value){const l=nodes(tree).find(n=>n.type==='label'&&text(n).startsWith(label));const input=l?nodes(l).find(n=>['input','select'].includes(n.type)):nodes(tree).find(n=>n.props?.id===label);assert.ok(input,label);input.props.onChange({target:{value}});render()}
 function button(label){return nodes(tree).find(n=>n.type==='button'&&text(n)===label)}
 async function search(value){change('reader-book-search',value);nodes(tree).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});await settle()}
 function submit(){nodes(tree).filter(n=>n.type==='form')[1].props.onSubmit({preventDefault(){}})}
 render();return {search,change,submit,settle,button,requests,navigations,get tree(){return tree},html:()=>renderToStaticMarkup(tree),respond(fn){fetchHandler=fn},switchOwner(value){owner=value;authListener('SIGNED_IN',{user:{id:value}});render()},close(){for(const cell of cells)cell?.cleanup?.();globalThis.fetch=previous}};
}
const synthetic={id:'catalog',title:'Synthetic book',author:null,cover_url:null,book_type:null,isbn13:null,asin:null,language_code:'ja',edition_format:'paperback'};
test('actual reader component mounts one search, offers immediate catalog addition and keeps placeholder',async()=>{
 const h=await harness();try{
  h.respond(async request=>request.body?{userBookId:'copy',alreadyInLibrary:true}:{books:[synthetic]});
  await h.search('Synthetic book');assert.match(h.html(),/No cover/);assert.match(h.html(),/Add to My Library/);
  const result=nodes(h.tree).find(n=>n.props?.result?.id==='catalog');result.props.onAdd();await h.settle();
  assert.deepEqual(h.requests[1].body,{bookId:'catalog'});assert.equal(h.requests[1].url,'/api/books/add-existing');assert.deepEqual(h.navigations,['/books/copy']);
 }finally{h.close()}
});
test('actual reader form has only title/language/format requirements and supports another real language',async()=>{
 const h=await harness();try{
  await h.search('Unrecognized book');assert.equal(nodes(h.tree).filter(n=>n.props?.required).length,4); // Search plus the three entry fields.
  assert.doesNotMatch(h.html(),/Author \*|ISBN \*|Page count \*/);assert.match(h.html(),/sm:flex-row/);
  h.change('Book language','another');h.change('Other supported language','fr');h.change('Format','ebook');
  h.respond(async()=>({userBookId:'new-copy'}));h.submit();await h.settle();
  const request=h.requests.at(-1);assert.equal(request.url,'/api/books/reader');assert.equal(request.body.title,'Unrecognized book');assert.equal(request.body.languageCode,'fr');assert.equal(request.body.editionFormat,'ebook');assert.equal(request.body.targetUserId,undefined);assert.deepEqual(h.navigations,['/books/new-copy']);
 }finally{h.close()}
});
test('partial attachment failure retains drafts and retries the created catalog ID without another creation',async()=>{
 const h=await harness();try{
  await h.search('Draft');h.change('Book language','en');h.change('Format','paperback');h.respond(async()=>({status:500,data:{error:'Synthetic attachment failure',createdBookId:'created'}}));
  h.submit();await h.settle();assert.match(h.html(),/Retry adding to My Library/);assert.match(h.html(),/value="Draft"/);
  h.respond(async()=>({userBookId:'retry-copy'}));h.submit();await h.settle();assert.equal(h.requests.at(-1).url,'/api/books/add-existing');assert.deepEqual(h.requests.at(-1).body,{bookId:'created'});
 }finally{h.close()}
});
test('stale search and save responses cannot appear or navigate after account switching',async()=>{
 for(const saving of [false,true]){
  const h=await harness();try{
   if(saving){await h.search('Draft');h.change('Book language','ja');h.change('Format','paperback')}
   let complete;h.respond(()=>new Promise(resolve=>complete=resolve));
   if(saving){h.submit();await h.settle()}else await h.search('Held search');
   assert.ok(complete);h.switchOwner('different-owner');complete(saving?{userBookId:'private-copy'}:{books:[synthetic]});await h.settle();
   assert.match(h.html(),/Your session changed/);assert.doesNotMatch(h.html(),/Synthetic book|private-copy|Draft/);assert.equal(h.navigations.length,0);
  }finally{h.close()}
 }
});
test('duplicate matches remain explicit, failed lookup is not treated as no catalog match',async()=>{
 const h=await harness();try{
  h.respond(async()=>({status:500,data:{error:'Query failed'}}));await h.search('Title');assert.match(h.html(),/Search could not finish/);assert.doesNotMatch(h.html(),/<h2/);
  h.respond(async()=>({books:[]}));await h.search('Title');h.change('Book language','ja');h.change('Format','paperback');
  h.respond(async()=>({status:409,data:{requiresConfirmation:true,error:'Possible match',possibleMatches:[synthetic]}}));h.submit();await h.settle();assert.match(h.html(),/Mine is a different edition/);assert.equal(h.navigations.length,0);
 }finally{h.close()}
});
