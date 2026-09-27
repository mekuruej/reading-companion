import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import React from 'react';
import ts from 'typescript';
const require=createRequire(import.meta.url), root=path.resolve(import.meta.dirname,'..');
let state=[],cursor=0;
function load(file){const mod={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(name=>{
 if(name==='react')return {...React,useState(initial){const i=cursor++;if(!(i in state))state[i]=initial;return [state[i],value=>state[i]=value]}};
 if(name==='@/components/books/BookProgressProvider')return {ProgressTrackingSettings:()=>null};
 if(name.startsWith('@/'))return load(name.slice(2)+'.ts');return require(name);
},mod,mod.exports);return mod.exports;}
const Panel=load('app/(protected)/books/[userBookId]/components/BookHubStatusPanel.tsx').default;
function nodes(t){return !t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(nodes):[t,...nodes(t.props?.children)]}
function text(t){return typeof t==='string'?t:Array.isArray(t)?t.map(text).join(''):text(t?.props?.children??'')}
const button=(t,label)=>nodes(t).find(n=>n.type==='button'&&text(n)===label);
const props={personalTrackingStatus:'reading',dnfReason:'',dnfNote:'',dnfAt:'',startedAt:'2026-09-01',finishedAt:'',wouldRetry:'',progressPercent:10};
const render=p=>{cursor=0;return Panel({...props,...p})};
test('DNF selection opens draft without saving; cancel restores status; save sends reason and note',async()=>{
 state=[];const saves=[],statusChanges=[];const p={onPersonalTrackingStatusChange:v=>statusChanges.push(v),onSaveDnf:async details=>{saves.push(details);return true}};
 nodes(render(p)).find(n=>n.type==='select').props.onChange({target:{value:'dnf'}});
 assert.equal(saves.length,0);assert.equal(statusChanges.length,0);assert.ok(text(render(p)).includes('Why did you stop reading?'));
 button(render(p),'Cancel').props.onClick();assert.equal(nodes(render(p)).find(n=>n.type==='select').props.value,'reading');assert.equal(saves.length,0);
 nodes(render(p)).find(n=>n.type==='select').props.onChange({target:{value:'dnf'}});
 const selects=nodes(render(p)).filter(n=>n.type==='select');selects[1].props.onChange({target:{value:'lost_interest'}});
 nodes(render(p)).find(n=>n.type==='textarea').props.onChange({target:{value:'Not for me'}});
 button(render(p),'Save DNF').props.onClick();await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(saves,[{reason:'lost_interest',note:'Not for me'}]);assert.ok(!text(render(p)).includes('Why did you stop reading?'));
});
test('failed save retains draft for retry; other statuses bypass prompt',async()=>{
 state=[];const changes=[];const p={onPersonalTrackingStatusChange:v=>changes.push(v),onSaveDnf:async()=>false};
 nodes(render(p)).find(n=>n.type==='select').props.onChange({target:{value:'finished'}});assert.deepEqual(changes,['finished']);
 nodes(render(p)).find(n=>n.type==='select').props.onChange({target:{value:'dnf'}});
 nodes(render(p)).filter(n=>n.type==='select')[1].props.onChange({target:{value:'too_difficult_right_now'}});
 button(render(p),'Save DNF').props.onClick();await new Promise(resolve=>setImmediate(resolve));
 assert.ok(text(render(p)).includes('Why did you stop reading?'));assert.equal(nodes(render(p)).filter(n=>n.type==='select')[1].props.value,'too_difficult_right_now');
});
test('existing save writes DNF date, reason and note together and retains retry preference',async()=>{
 const file='app/(protected)/books/[userBookId]/page.tsx',source=fs.readFileSync(path.join(root,file),'utf8');const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let declaration;
 function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='saveBookStatusDates')declaration=node;ts.forEachChild(node,visit)}visit(ast);
 const code=ts.transpileModule(declaration.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
 let payload;const noop=()=>{};
 const env={row:{id:'copy'},dnfReason:'old',dnfNote:'old note',wouldRetry:'maybe',supabase:{from:()=>({update:p=>{payload=p;return {eq:async()=>({error:null})}}})},personalTrackingStatusFromDates:()=> 'dnf',tracking:{refresh:async()=>{}},setStartedAt:noop,setFinishedAt:noop,setDnfAt:noop,setDnfReason:noop,setDnfNote:noop,setWouldRetry:noop,setPersonalTrackingStatus:noop,setRow:noop,setBookStatusError:noop};
 const save=new Function(...Object.keys(env),`${code};return saveBookStatusDates`)(...Object.values(env));
 assert.equal(await save('2026-09-01','','2026-09-27',{reason:'lost_interest',note:'  My note  '}),true);
 assert.equal(payload.status,'did_not_finish');assert.equal(payload.dnf_reason,'lost_interest');assert.equal(payload.dnf_note,'My note');assert.equal(payload.would_retry,'maybe');
});
