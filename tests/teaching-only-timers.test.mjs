import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const files=[
 ['app/(protected)/books/[userBookId]/_shared/timed-session/SimpleTimedSessionPage.tsx','activeSessionMode','startTimer','saveTimedSession'],
 ['app/(protected)/books/[userBookId]/curiosity-reading/WordTimerExperience.tsx','timedSessionMode',null,'saveReadingSession'],
 ['app/(protected)/books/[userBookId]/readalong/page.tsx','READ_ALONG_TIMED_SESSION_MODE','handleStartTimer','handleSaveTimedSessionFromTimer'],
];
for(const [file,mode,start,save] of files){
 const source=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
 const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let restore;const functions=new Map();
 function visit(node){
  if(ts.isCallExpression(node)&&node.expression.getText(ast)==='useEffect'&&node.arguments[0]?.getText(ast).includes('readPersistedTimedSession('))restore=node.arguments[0].getText(ast);
  if(ts.isFunctionDeclaration(node)&&node.name)functions.set(node.name.text,node.getText(ast));
  ts.forEachChild(node,visit);
 }visit(ast);
 test(`${file}: Teaching Only stops and clears timer draft instead of restoring it`,()=>{
  const calls=[];const env={tracking:{loaded:true,timersEnabled:false},userBookId:'copy',[mode]:'fluid',
   setIsRunning:v=>calls.push(['running',v]),setIsPaused:v=>calls.push(['paused',v]),setStartTime:v=>calls.push(['start',v]),setShowTimedSessionForm:v=>calls.push(['form',v]),clearPersistedTimedSession:(...args)=>calls.push(['clear',...args]),
   readPersistedTimedSession:()=>{throw Error('Must not restore teaching-only timer')},
  };
  const code=ts.transpileModule(`const restore = ${restore};`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
  new Function(...Object.keys(env),code+';restore();')(...Object.values(env));
  assert.deepEqual(calls,[['running',false],['paused',false],['start',null],['form',false],['clear','fluid','copy']]);
 });
 test(`${file}: disabled timer callbacks cannot start or save`,async()=>{
  for(const name of [start,save].filter(Boolean)){
   const code=ts.transpileModule(functions.get(name),{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
   const fn=new Function('tracking',code+`;return ${name};`)({timersEnabled:false});
   await fn(); // Any further work would reference unavailable save/state dependencies.
  }
 });
}
