import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { randomUUID } from 'node:crypto';
const source=fs.readFileSync('lib/listening/useListeningCapture.ts','utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const tick=()=>new Promise(r=>setImmediate(r));
function harness({storage=new Map(), persisted=null, db={sessions:new Map(),words:new Map(),history:0}, failSave=false, gate=null, user='owner'}={}){
 const slots=[];let cursor=0,effects=[],dirty=false,output;
 let fail=failSave;const events=[];
 const react={useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v;dirty=true;}];},useRef(v){const i=cursor++;return slots[i]??(slots[i]={current:v});},useEffect(fn,deps){const i=cursor++;const prev=slots[i];if(!prev||deps.some((v,n)=>v!==prev[n])){slots[i]=deps;effects.push(fn);}}};
 const supabase={auth:{getUser:async()=>({data:{user:{id:user}}})},rpc:async(name,p)=>{
  events.push(name);
  if(name==='start_listening_capture') {if(!db.sessions.has(p.p_id))db.sessions.set(p.p_id,{completed_at:null});return {data:db.sessions.get(p.p_id)};}
  if(name==='save_listening_word') {if(gate)await gate;if(fail){fail=false;return {error:{message:'connection lost'}};}const w={id:p.p_id,...p.p_word};db.words.set(w.id,w);return {data:w};}
  if(name==='finish_listening_capture'){const s=db.sessions.get(p.p_session);if(!s.completed_at){db.history++;s.completed_at='done';}return {data:'history'};}
 },from(){const q={select(){return q},eq(){return q},order(){return q},then(resolve){return Promise.resolve({data:[...db.words.values()]}).then(resolve)}};return q;}};
 const module={exports:{}};
 vm.runInNewContext(code,{exports:module.exports,require:name=>name==='react'?react:name.includes('supabaseClient')?{supabase}:{readPersistedTimedSession:()=>persisted,hasUnfinishedTimedSession:s=>Boolean(s.startedAt||s.isPaused||s.accumulatedElapsedMs),writePersistedTimedSession:s=>{persisted=s;return true;}},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},crypto:{randomUUID},Date,Error,console});
 const render=()=>{cursor=0;dirty=false;output=module.exports.useListeningCapture('book',true);const e=effects;effects=[];e.forEach(f=>f());return output;};
 const flush=async()=>{for(let i=0;i<8;i++){await tick();if(dirty)render();}return output;};render();
 return {flush,get current(){if(dirty)render();return output;},events,db,storage,get persisted(){return persisted;}};
}
test('capture unavailable before explicit start; failed persistence does not create identity; start does not wait for network',async()=>{
 const h=harness();await h.flush();assert.equal(h.current.identity,null);assert.equal(await h.current.save({surface:'word'}),false);assert.equal(await h.current.finish({}),false);
 assert.equal(h.current.start(()=>false),null);assert.equal(h.current.identity,null);
 let saved;const s=h.current.start(i=>{saved=i;return true;});assert.ok(s.id);assert.equal(saved.id,s.id);assert.equal(h.events.length,0);assert.equal(h.current.words.length,0);
});
test('finalization waits for in-flight word save; repeated finish is idempotent; new start resets list',async()=>{
 let release;const gate=new Promise(r=>release=r);const h=harness({gate});await h.flush();h.current.start(()=>true);
 const save=h.current.save({surface:'聞く',reading:'きく',meaning:'hear',alternative_surface:''});await tick();
 const finish=h.current.finish({minutes_read:1});await tick();assert.equal(h.events.includes('finish_listening_capture'),false);
 release();assert.equal(await save,true);assert.equal(await finish,true);await h.flush();assert.equal(h.current.words.length,1);assert.equal(h.current.completed,true);assert.equal(h.db.history,1);
 await h.current.finish({minutes_read:1});assert.equal(h.db.history,1);const old=h.current.identity.id;h.current.start(()=>true);assert.notEqual(h.current.identity.id,old);assert.equal(h.current.words.length,0);
});
test('failed word retains request ID; refresh recovers identity and retries pending save before finish',async()=>{
 const h=harness({failSave:true});await h.flush();const s=h.current.start(()=>true);
 assert.equal(await h.current.save({surface:'猫',reading:'ねこ',meaning:'cat',alternative_surface:''}),false);
 const pending=JSON.parse([...h.storage.values()][0]);
 const recovered=harness({storage:h.storage,db:h.db,persisted:{captureSessionId:s.id,captureOwnerId:s.owner,captureStartedAt:s.startedAt}});await recovered.flush();
 assert.equal(recovered.current.identity.id,s.id);assert.equal(await recovered.current.finish({minutes_read:1}),true);await recovered.flush();
 assert.equal(recovered.current.words[0].id,pending.id);assert.equal(recovered.db.words.size,1);assert.equal(recovered.storage.size,0);
});
test('recovery restores completed response-loss state and refuses another account identity',async()=>{
 const db={sessions:new Map([['capture',{completed_at:'done'}]]),words:new Map([['word',{id:'word',surface:'本'}]]),history:1};
 const persisted={captureSessionId:'capture',captureOwnerId:'owner',captureStartedAt:1};
 const a=harness({db,persisted});await a.flush();assert.equal(a.current.completed,true);assert.equal(a.current.words.length,1);
 const b=harness({db,persisted,user:'stranger'});await b.flush();assert.equal(b.current.identity,null);assert.equal(b.current.words.length,0);
});

test('legacy already-started timer gains identity without resetting elapsed state or touching historical vocabulary',async()=>{
 const old={startedAt:1000,accumulatedElapsedMs:25000,isPaused:true,sessionDate:'2026-10-14'};
 const h=harness({persisted:old});await h.flush();assert.ok(h.current.identity.id);assert.equal(h.persisted.startedAt,1000);assert.equal(h.persisted.accumulatedElapsedMs,25000);assert.equal(h.persisted.isPaused,true);assert.equal(h.current.words.length,0);assert.equal(h.db.history,0);
});

test('actual timer storage round-trips capture identity and preserves wall-clock elapsed and paused duration',()=>{
 const file='app/(protected)/books/[userBookId]/_shared/timed-session/timedSessionPersistence.ts';
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 const memory=new Map();const module={exports:{}};
 vm.runInNewContext(code,{exports:module.exports,window:{localStorage:{setItem:(k,v)=>memory.set(k,v),getItem:k=>memory.get(k),removeItem:k=>memory.delete(k)}},Date});
 const m=module.exports;const state={version:1,sessionMode:'listening',userBookId:'book',captureSessionId:'capture',captureOwnerId:'owner',captureStartedAt:1000,startedAt:1000,accumulatedElapsedMs:3000,isPaused:false};
 assert.equal(m.writePersistedTimedSession(state),true);const read=m.readPersistedTimedSession('listening','book');assert.equal(read.captureSessionId,'capture');assert.equal(read.captureOwnerId,'owner');assert.equal(m.elapsedMsForPersistedTimedSession(read,5000),7000);assert.equal(m.elapsedMsForPersistedTimedSession({...read,isPaused:true},5000),3000);
});
