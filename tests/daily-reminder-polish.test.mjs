import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url),cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const module={exports:{}};cache.set(file,module.exports);new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText)(name=>name.startsWith('@/')?load(name.slice(2)+'.ts'):name.startsWith('.')?load(path.resolve(path.dirname(file),name)+'.ts'):require(name),module,module.exports);return module.exports;}
const {dismissCompletedAbilityCheckReminder:complete,abilityCheckReminderCompleted:completed}=load('lib/study/abilityCheckReminderCompletion.ts');
const {selectDailyLibraryReminder:select,dismissDailyReminder,reminderHidden}=load('lib/study/dailyLibraryReminder.ts');
const {ymdInTimeZone}=load('lib/timeZone.ts');
const memory=()=>{const rows=new Map();return {getItem:k=>rows.get(k)??null,setItem:(k,v)=>rows.set(k,v)}};
const day=new Date('2026-10-27T03:00:00Z');
const ids=Array.from({length:10},(_,i)=>'card-'+i);
const session=(extra={})=>({planDay:ymdInTimeZone(day),cardIds:ids,seenIds:new Set(ids),reachedEnd:true,endedEarly:false,...extra});
const input=(extra={})=>({date:day,ownLibrary:true,enabled:true,hidden:false,canUseWordSky:true,wordSkyAvailable:true,canUseAbilityCheck:true,readiness:{status:'ready',eligibleIdentityCount:100,dueCardCount:10,recommendAbilityCheck:true},...extra});
test('full ten-card completion persists only for the authenticated owner and Tokyo date',()=>{
 const store=memory();assert.equal(complete(store,'owner-A',session(),day),true);assert.equal(completed(store,'owner-A',day),true);assert.equal(completed(store,'owner-B',day),false);
 assert.equal(reminderHidden(store,'owner-A',day),false,'completion is separate from Hide for today');
 assert.equal(select(input({abilityCheckCompleted:true})),null);
 assert.equal(select(input({date:new Date('2026-10-28T03:00:00Z'),abilityCheckCompleted:completed(store,'owner-A',new Date('2026-10-28T03:00:00Z'))})),'word_sky');
});
for(const [name,change]of [['opened only',{reachedEnd:false,seenIds:new Set()}],['left early',{endedEarly:true}],['nine answers',{seenIds:new Set(ids.slice(0,9))}],['short deck',{cardIds:ids.slice(0,9)}],['duplicate deck',{cardIds:ids.map(()=>ids[0])}],['skipped broken card',{seenIds:new Set(ids.slice(1))}],['old day',{planDay:'2026-10-26'}]])test('does not dismiss: '+name,()=>assert.equal(complete(memory(),'u',session(change),day),false));
test('resumed plan can complete from its ten saved seen IDs; remaining due counts are irrelevant',()=>assert.equal(complete(memory(),'u',session(),day),true));
test('completion does not suppress Word Sky on a sky day; completion does not substitute a new invitation on check days',()=>{
 assert.equal(select(input({date:new Date('2026-10-26T03:00:00Z'),abilityCheckCompleted:true})),'word_sky');
 assert.equal(select(input({abilityCheckCompleted:true,readiness:{status:'not_ready',eligibleIdentityCount:99,dueCardCount:0,recommendAbilityCheck:false}})),null);
 assert.equal(select(input({abilityCheckCompleted:true,readiness:{status:'unknown'}})),null);
});
test('manual Hide still applies to both; Tokyo midnight expires both markers; storage failures do not throw',()=>{
 const store=memory(),before=new Date('2026-10-27T14:59:59Z'),after=new Date('2026-10-27T15:00:00Z');
 assert.equal(complete(store,'u',session(),before),true);dismissDailyReminder(store,'u',before);
 assert.equal(completed(store,'u',after),false);assert.equal(reminderHidden(store,'u',after),false);
 const failed={getItem(){throw Error()},setItem(){throw Error()}};assert.equal(complete(failed,'u',session(),day),false);assert.equal(completed(failed,'u',day),false);
});
const checkFile='app/(protected)/library-study/check/page.tsx',check=fs.readFileSync(checkFile,'utf8');
const ast=ts.createSourceFile('check.tsx',check,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let integration;function visit(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==='dismissCompletedSessionReminder')integration=n.getText(ast);ts.forEachChild(n,visit)}visit(ast);assert.ok(integration);
async function runIntegration({authOwner='u',endedEarly=false,seenIds=ids,planIds=ids,mode='check',reachedEnd=true}={}){
 const store=memory();const code=ts.transpileModule(integration+';return dismissCompletedSessionReminder;', {compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
 const fn=new Function('currentUserId','dailyCheckPlan','libraryMode','seenTodayIds','reminderSeenIdsRef','endedEarly','supabase','window','dismissCompletedAbilityCheckReminder',code)('u',{dateKey:ymdInTimeZone(),cardIds:planIds},mode,new Set(seenIds.slice(0,-1)),{current:new Set(seenIds.slice(-1))},endedEarly,{auth:{getUser:async()=>({data:{user:{id:authOwner}},error:null})}},{localStorage:store},complete);
 await fn(reachedEnd);return completed(store,'u');
}
test('actual Check completion function includes final pending seen card, rejects early exit, wrong owner and practice',async()=>{
 assert.equal(await runIntegration(),true);assert.equal(await runIntegration({endedEarly:true}),false);assert.equal(await runIntegration({authOwner:'other'}),false);assert.equal(await runIntegration({mode:'practice'}),false);assert.equal(await runIntegration({seenIds:ids.slice(0,9)}),false);assert.equal(await runIntegration({reachedEnd:false}),false);
});
test('scheduler, builders, readiness identities and exploration return validation remain byte-identical',()=>{
 for(const file of ['lib/study/abilityCheckScheduler.ts','lib/study/abilityCheckCards.ts','lib/studySenseIdentity.ts','lib/wordSkyExploration.ts'])assert.equal(fs.readFileSync(file,'utf8'),execFileSync('git',['show','d44dc9f:'+file],{encoding:'utf8'}));
 for(const name of ['recommendationIdentity','calculateDailyReminderReadiness']){
  const file='lib/study/dailyReminderReadiness.ts';
  const extract=text=>{const source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);return source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name).getText(source)};
  assert.equal(extract(fs.readFileSync(file,'utf8')),extract(execFileSync('git',['show','d44dc9f:'+file],{encoding:'utf8'})));
 }
 const wordSky='app/(protected)/library-study/word-sky/page.tsx',current=fs.readFileSync(wordSky,'utf8'),old=execFileSync('git',['show','d44dc9f:'+wordSky],{encoding:'utf8'});
 // Every learning-status color branch is unchanged; only the ordinary unclaimed bubble is themed.
 for(const color of ['red','orange','yellow','grey','green','blue','purple']){
  const re=new RegExp('if \\(color === "'+color+'"\\) return [^;]+;');assert.equal(current.match(re)?.[0],old.match(re)?.[0]);
 }
 assert.match(current,/var\(--appearance-page-image\)/);
});

const fixtureAst=ts.createSourceFile('fixtures.js',fs.readFileSync('tests/daily-library-reminder.test.mjs','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const fixtureText=fixtureAst.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='fixture').getText(fixtureAst);
const fixture=new Function('assert',fixtureText+';return fixture;')(assert);
const {loadDailyLibraryReminder}=load('lib/study/dailyLibraryReminder.ts');
for(const size of [100,1000,10000])test('synthetic loader timing at 25ms request latency, '+size+' words',async t=>{
 const {client}=fixture({words:size});const stages={};const requests=[];
 const delayed=async(stage,run)=>{const start=performance.now();await new Promise(r=>setTimeout(r,25));const result=await run();const end=performance.now();requests.push({stage,start,end});stages[stage]=(stages[stage]??0)+1;return result};
 const getUser=client.auth.getUser.bind(client.auth);client.auth.getUser=()=>delayed('authentication',getUser);
 const rpc=client.rpc.bind(client);client.rpc=(...args)=>delayed('reference_pool',()=>rpc(...args));
 const from=client.from.bind(client);client.from=table=>{
  const q=from(table);let proxy;proxy=new Proxy(q,{get(target,key){if(key==='then')return(resolve,reject)=>delayed(table,()=>Promise.resolve(target)).then(resolve,reject);const value=target[key];return typeof value==='function'?(...args)=>{const result=value.apply(target,args);return result===target?proxy:result}:value}});return proxy;
 };
 const start=performance.now();const result=await loadDailyLibraryReminder(client,'u',memory(),'/users/reader/books');const elapsed=Math.round(performance.now()-start);
 assert.ok(result);assert.equal(stages.profiles,2);assert.equal(stages.user_learning_settings,2);assert.equal(stages.personally_hidden_study_identities,2);
 const pool=requests.find(r=>r.stage==='reference_pool'),readinessProfile=requests.filter(r=>r.stage==='profiles')[1];assert.ok(pool.start<readinessProfile.end,'Word Sky and readiness execute concurrently');
 const stageCumulativeMs={};for(const r of requests)stageCumulativeMs[r.stage]=Math.round((stageCumulativeMs[r.stage]??0)+(r.end-r.start));
 t.diagnostic(JSON.stringify({syntheticOnly:true,words:size,simulatedLatencyMs:25,loaderElapsedMs:elapsed,requestCounts:stages,stageCumulativeMs}));
});

test('Word Sky ordinary text and focus remain readable for all palettes and treatments',()=>{
 const {APPEARANCE_PALETTES}=load('lib/appearance/palettes.ts');
 const luminance=hex=>{const c=hex.slice(1).match(/../g).map(n=>parseInt(n,16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722};
 const contrast=(a,b)=>{const v=[luminance(a),luminance(b)].sort((a,b)=>b-a);return(v[0]+.05)/(v[1]+.05)};
 for(const p of Object.values(APPEARANCE_PALETTES))for(const treatment of ['solid','neutralTouches']){
  const backgrounds=treatment==='solid'?[p.page,p.pageMid,p.surface,p.surfaceMuted]:[p.neutralTouchStart,p.neutralTouchCenter,p.neutralTouchEnd,p.surface,p.surfaceMuted];
  for(const bg of backgrounds){assert.ok(contrast(p.text,bg)>=4.5,p.label+' text '+bg);assert.ok(contrast(p.mutedText,bg)>=4.5,p.label+' muted '+bg)}
  assert.ok(contrast(p.accent,p.surface)>=3,p.label+' focus');
 }
});
test('actual Word Sky control components render palette classes, labels, disabled and keyboard focus states',()=>{
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
 const root='app/(protected)/library-study/word-sky/components/';
 const Header=load(root+'WordSkyHeader.tsx').default,Panel=load(root+'WordSkySelectedPanel.tsx').default,Loading=load(root+'WordSkyLoadingState.tsx').default;
 const header=renderToStaticMarkup(React.createElement(Header,{claimedCount:2,wordPoolCount:180,onBackToStudy(){}}));
 assert.match(header,/appearance-surface/);assert.match(header,/2 claimed/);assert.match(header,/focus-visible:outline/);
 const panel=renderToStaticMarkup(React.createElement(Panel,{selectedWord:{surface:'Synthetic',reading:'しんせ',meaning:'Example'},hasClaim:false,isSaving:true,greenButtonClassName:'border-emerald-200 bg-emerald-50 text-emerald-900',greenLabel:'Ready for Reading Gate',onSaveGreen(){},onClearOrClose(){},onClose(){}}));
 assert.match(panel,/disabled=""/);assert.match(panel,/appearance-muted-text/);assert.match(panel,/Close selected word/);assert.match(panel,/bg-emerald-50/);
 assert.match(renderToStaticMarkup(React.createElement(Loading)),/appearance-page-image/);
});
