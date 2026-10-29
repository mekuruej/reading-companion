import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';
import * as bookmarks from '../lib/books/resumeBookmark.mjs';
const require=createRequire(import.meta.url);
function compile(text,scope={}){
 const exports={};const code=ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','exports',...Object.keys(scope),code)(require,exports,...Object.values(scope));return exports;
}
const progress=compile(fs.readFileSync('lib/books/readingProgress.ts','utf8'));
const files=[
 'app/(protected)/books/[userBookId]/curiosity-reading/WordTimerExperience.tsx',
 'app/(protected)/books/[userBookId]/_shared/timed-session/SimpleTimedSessionPage.tsx',
 'app/(protected)/books/[userBookId]/readalong/page.tsx',
];
function form(file,{bookmark=null,total=100,method='page',listening=false,formOpen=false,start='',end='',history=16,available=true,eligible=true}={}){
 let fn;const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 function visit(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==='openTimedSessionFormWithDefaults')fn=n.getText(source);ts.forEachChild(n,visit)}visit(source);assert.ok(fn);
 const state={start,end,open:formOpen,queries:0};
 const scope={
  canAccessBook:true,userBookId:'synthetic-book',showTimedSessionForm:formOpen,isListeningMode:listening,activeSessionMode:listening?'listening':'fluid',
  tracking:{method,totals:{page_count:total}},progressTotal:total,resumeBookmark:{bookmark,available,eligible},
  currentPage:{positionUnit:method},currentPageNumber:history,
  nextProgressStart:progress.nextProgressStart,sessionEnd:progress.sessionEnd,matchingTotal:progress.matchingTotal,
  nextSessionStartPage:bookmarks.nextSessionStartPage,
  setSessionStartPage:v=>{state.start=v},setSessionEndPage:v=>{state.end=v},setShowTimedSessionForm:v=>{state.open=v},
  supabase:{from(table){state.queries++;assert.equal(table,'user_book_reading_sessions');const q={select(){return q},eq(){return q},order(){return q},limit:async()=>({data:[{end_page:history,end_position:history,tracking_unit:method}],error:null})};return q}},
 };
 return {state,open:compile(fn+'\nexports.open=openTimedSessionFormWithDefaults;',scope).open};
}
test('regression: saved Top of page 16 opens the next reading session at 16, not 17',async()=>{
 for(const file of files){const f=form(file,{bookmark:bookmarks.resolveResumeBookmark('top',16,100)});await f.open();assert.equal(f.state.start,'16',file)}
});


test('all four saved choices produce correct defaults through each actual session-form initializer',async()=>{
 for(const file of files)for(const [kind,expected] of [['top','16'],['end','17'],['phrase','16'],['page','17']]){
  const bookmark=bookmarks.resolveResumeBookmark(kind,16,100,'A specific phrase');const original=structuredClone(bookmark);
  const f=form(file,{bookmark,history:80});await f.open();assert.equal(f.state.start,expected,`${file}: ${kind}`);assert.equal(f.state.open,true);assert.equal(f.state.queries,0);
  assert.deepEqual(bookmark,original,'defaulting never rewrites the saved cue');
 }
});
test('no-specific bookmark keeps its stored page while advancing only the next session default',()=>{
 const cue=bookmarks.resolveResumeBookmark('page',16,100,'Discarded old phrase');assert.deepEqual(cue,{kind:'page',page:16,phrase:null});
 assert.equal(bookmarks.nextSessionStartPage(cue,100),'17');assert.equal(cue.page,16);
 assert.equal(bookmarks.resumeBookmarkLabel(cue,100),'Resume from page 16');
});
test('end bookmarks normalized to the next page top are not advanced a second time',()=>{
 const cue=bookmarks.resolveResumeBookmark('end',16,100);assert.deepEqual(cue,{kind:'top',page:17,phrase:null});assert.equal(bookmarks.nextSessionStartPage(cue,100),'17');
 assert.equal(bookmarks.nextSessionStartPage({kind:'end',page:16,phrase:null},100),'17');
});
test('penultimate/final page boundaries work for every choice and every actual form',async()=>{
 for(const total of [17,16])for(const file of files)for(const kind of ['top','end','phrase','page']){
  const cue=bookmarks.resolveResumeBookmark(kind,16,total,'Phrase');const f=form(file,{bookmark:cue,total});await f.open();
  assert.equal(f.state.start,String(Math.min(kind==='end'||kind==='page'?17:16,total)),`${file}: ${kind}/${total}`);
 }
});
test('unknown total and invalid cues keep conservative defaults',()=>{
 for(const [kind,expected] of [['top','16'],['phrase','16'],['end','17'],['page','17']])assert.equal(bookmarks.nextSessionStartPage({kind,page:16,phrase:'Phrase'},null),expected);
 for(const cue of [null,{kind:'unknown',page:16},{kind:'top',page:-1},{kind:'top',page:101},{kind:'phrase',page:16,phrase:' '}])assert.equal(bookmarks.nextSessionStartPage(cue,100),null);
});
test('no valid/available bookmark preserves existing history-based defaults and non-page units',async()=>{
 for(const file of files){
  for(const options of [{bookmark:null},{bookmark:{kind:'unknown',page:16}},{bookmark:{kind:'top',page:16},available:false},{bookmark:{kind:'top',page:16},eligible:false}]){
   const f=form(file,options);await f.open();assert.equal(f.state.start,'17');assert.equal(f.state.queries,1);
  }
  for(const method of ['kindle_location','percent','audiobook_time']){const f=form(file,{bookmark:{kind:'top',page:2},method});await f.open();assert.equal(f.state.start,'16');assert.equal(f.state.queries,1)}
 }
});
test('reopening an active form preserves manual or restored Start Page and end-page edits',async()=>{
 for(const file of files){const f=form(file,{bookmark:{kind:'top',page:16},formOpen:true,start:'9',end:'22'});await f.open();assert.equal(f.state.start,'9');assert.equal(f.state.end,'22');assert.equal(f.state.queries,0)}
});
test('session transitions use the newest saved cue rather than old progress and leave open edits alone',async()=>{
 for(const file of files){
  for(const kind of ['top','end','phrase','page']){
   const saved=bookmarks.resolveResumeBookmark(kind,16,100,'Phrase');const next=form(file,{bookmark:saved,history:16});await next.open();
   const manual=form(file,{bookmark:saved,formOpen:true,start:'12',end:'18'});await manual.open();assert.equal(manual.state.start,'12');assert.equal(manual.state.end,'18');
   const newer=bookmarks.resolveResumeBookmark('top',18,100);const following=form(file,{bookmark:newer,history:80});await following.open();assert.equal(following.state.start,'18');
  }
 }
});
test('Listening retains its existing optional start-page behavior',async()=>{
 for(const file of files.slice(0,2)){const f=form(file,{bookmark:bookmarks.resolveResumeBookmark('top',16,100),listening:true});await f.open();assert.equal(f.state.start,'');assert.equal(f.state.queries,1)}
});
