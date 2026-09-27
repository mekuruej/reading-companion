import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const file='app/(protected)/users/[username]/books/page.tsx';
const source=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let loader,effect;
function visit(node){
 if(ts.isFunctionDeclaration(node)&&node.name?.text==='loadPendingBookRequests')loader=node.getText(ast);
 if(ts.isCallExpression(node)&&node.expression.getText(ast)==='useEffect'&&node.getText(ast).includes('setMeId(user.id)'))effect=node.getText(ast);
 ts.forEachChild(node,visit);
}
visit(ast);
assert.ok(loader&&effect);
const code=ts.transpileModule(loader+'\n'+effect,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup(role='super_teacher'){
 let resolveAlert,rejectAlert,cleanup;
 const alertPromise=new Promise((resolve,reject)=>{resolveAlert=resolve;rejectAlert=reject});
 const recorded={viewing:null,requests:null,errors:[],alertQueries:0};
 const noop=()=>{};
 const env={
  useEffect:fn=>{cleanup=fn()},routeUsername:'reader',
  supabase:{auth:{getUser:async()=>({data:{user:{id:'me'}}})},from(table){
   if(table==='book_requests')recorded.alertQueries++;
   return {select(){return this},eq(){return this},or(){return this},
    single:async()=>({data:{id:'me',role,username:'reader',is_super_teacher:false}}),
    order:()=>table==='book_requests'?alertPromise:Promise.resolve({data:[]})};
  }},
  setMeId:noop,setRows:noop,setTrialBanner:noop,setLibraryBooksLoading:noop,setLibraryBooksError:noop,
  setMyRole:noop,setIsSuperTeacher:noop,setCanUseAbilityCheckReminder:noop,setHasFullLearningAccess:noop,setStudents:noop,
  setViewingUserId:id=>recorded.viewing=id,setBookRequests:rows=>recorded.requests=rows,
  logSbError:(...args)=>recorded.errors.push(args),isMissingAppAccessColumnError:()=>false,
  getAppAccessStatus:()=>({hasFullAccess:true}),getFeatureAccess:()=>({}),canUseFullAccessFeature:()=>true,getActiveTrialBannerState:()=>null,
 };
 new Function(...Object.keys(env),code)(...Object.values(env));
 return {recorded,resolveAlert,rejectAlert,cancel:()=>cleanup()};
}
test('library can start loading while pending-request alert is still unresolved',async()=>{
 const run=setup();await tick();
 assert.equal(run.recorded.viewing,'me'); // This state starts the library-fetch effect.
 assert.equal(run.recorded.alertQueries,1);assert.equal(run.recorded.requests,null);
 const requests=[{id:'pending',status:'pending'}];run.resolveAlert({data:requests});await tick();
 assert.deepEqual(run.recorded.requests,requests);
});
test('alert failure does not block library and is handled without an unhandled rejection',async()=>{
 const run=setup();await tick();run.rejectAlert(new Error('Network unavailable'));await tick();
 assert.equal(run.recorded.viewing,'me');assert.deepEqual(run.recorded.requests,[]);assert.equal(run.recorded.errors.length,1);
});
test('late alert response is ignored after leaving the page',async()=>{
 const run=setup();await tick();run.cancel();run.resolveAlert({data:[{id:'old'}]});await tick();assert.equal(run.recorded.requests,null);
});
test('ordinary members do not fetch administrative alerts',async()=>{
 const run=setup('member');await tick();assert.equal(run.recorded.viewing,'me');assert.equal(run.recorded.alertQueries,0);
});
