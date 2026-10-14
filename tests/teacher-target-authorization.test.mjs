import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function productionFunction(file,name,env){
 const source=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
 const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let declaration;
 function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text===name)declaration=node;ts.forEachChild(node,visit)}visit(ast);
 assert.ok(declaration);
 const code=ts.transpileModule(declaration.getText(ast).replace(/^export /,''),{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
 return new Function(...Object.keys(env),code+`;return ${name};`)(...Object.values(env));
}
function client(rows){return {from(table){return {select(){return this},eq(){return this},is(){return this},async maybeSingle(){return {data:rows[table]??null,error:null}}}}}}
function loadModule(file,mocks={},cache=new Map()){
 file=path.resolve(file);
 if(cache.has(file))return cache.get(file).exports;
 const mod={exports:{}};cache.set(file,mod);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 new Function('require','module','exports',code)(name=>{
  if(mocks[name])return mocks[name];
  if(name.startsWith('@/')||name.startsWith('.')){
   const base=name.startsWith('@/')?name.slice(2):path.join(path.dirname(file),name);
   return loadModule([base+'.ts',base+'.tsx'].find(fs.existsSync),mocks,cache);
  }
  return require(name);
 },mod,mod.exports);
 return mod.exports;
}
const uuid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const [teacherId,studentId,bookCopyId]=[uuid(201),uuid(202),uuid(203)];
const {validateTeachingSourceContext}=loadModule('lib/teacher/teachingSource.ts');
function authorizationDb({role='teacher',linked=false,archived=false,ownerId=studentId,appAccessType='reading_access',appAccessExpiresAt=null}={}){
 const tables={
  profiles:[{id:teacherId,role},{id:studentId,role:'member',app_access_type:appAccessType,app_access_expires_at:appAccessExpiresAt}],
  user_books:[{id:bookCopyId,user_id:ownerId,book_id:uuid(204)}],
  teacher_students:linked?[{teacher_id:teacherId,student_id:studentId,archived_at:archived?'2026-01-01T00:00:00Z':null}]:[],
 };
 return {from(table){const filters=[];return {select(){return this},eq(key,value){filters.push(row=>row[key]===value);return this},is(key,value){filters.push(row=>row[key]===value);return this},async maybeSingle(){return {data:(tables[table]??[]).find(row=>filters.every(filter=>filter(row)))??null,error:null}}}}};
}
function quickAddAuthorizer(options={}){
 const profile={id:teacherId,role:options.role??'teacher'};
 const db=authorizationDb(options);
 const flag=productionFunction('app/api/teacher/live-lesson-words/route.ts','isSuperTeacherFlag',{});
 const superTeacher=productionFunction('app/api/teacher/live-lesson-words/route.ts','isSuperTeacher',{isSuperTeacherFlag:flag});
 const isTeacher=productionFunction('app/api/teacher/live-lesson-words/route.ts','isTeacher',{isSuperTeacher:superTeacher});
 return productionFunction('app/api/teacher/live-lesson-words/route.ts','authorizeTeacherForStudentBook',{
  getProfile:async()=>profile,isTeacher,isSuperTeacher:superTeacher,supabaseAdmin:db,validateTeachingSourceContext,
 });
}
const curiosityFile='app/(protected)/books/[userBookId]/curiosity-reading/WordTimerExperience.tsx';
test('existing Curiosity permission permits super teachers without a relationship; ordinary teachers need one',async()=>{
 const check=productionFunction(curiosityFile,'canAccessUserBook',{supabase:client({})});
 assert.equal(await check('teacher','other',{role:'super_teacher'}),true);
 assert.equal(await check('teacher','other',{role:'member',is_super_teacher:true}),true);
 assert.equal(await check('teacher','other',{role:'teacher'}),false);
 assert.equal(await check('teacher','teacher',{role:'member'}),true);
 const linked=productionFunction(curiosityFile,'canAccessUserBook',{supabase:client({teacher_students:{teacher_id:'teacher'}})});
 assert.equal(await linked('teacher','other',{role:'teacher'}),true);
});
test('Quick Add permits super teachers without a link and regular teachers with an active link, without requiring a lesson-book assignment',async()=>{
 const context={actorId:teacherId,studentId,userBookId:bookCopyId};
 assert.equal((await quickAddAuthorizer({role:'super_teacher'})({...context})).ok,true);
 assert.equal((await quickAddAuthorizer({role:'teacher',linked:true})({...context})).ok,true);
 await assert.rejects(quickAddAuthorizer({role:'teacher'})({...context}),error=>error.status===403);
 await assert.rejects(quickAddAuthorizer({role:'teacher',linked:true,archived:true})({...context}),error=>error.status===403);
 assert.equal((await quickAddAuthorizer({role:'teacher',linked:true,ownerId:uuid(299)})({...context})).ok,false);
 assert.equal((await quickAddAuthorizer({role:'admin',linked:true})({...context})).ok,false);
 assert.equal((await quickAddAuthorizer({role:'member',linked:true})({...context})).ok,false);
});

const accessModule={exports:{}};
new Function('exports',ts.transpileModule(fs.readFileSync(new URL('../lib/access/appAccess.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(accessModule.exports);
const featuresModule={exports:{}};
new Function('exports',ts.transpileModule(fs.readFileSync(new URL('../lib/access/featureAccess.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(featuresModule.exports);
const future=new Date(Date.now()+86400000).toISOString(),past=new Date(Date.now()-86400000).toISOString();
const recipients=[
 {id:'linked',app_access_type:'free'},
 {id:'trial',app_access_type:'trial',app_access_expires_at:future},
 {id:'expired',app_access_type:'trial',app_access_expires_at:past},
 {id:'missing-expiry',app_access_type:'trial'},
 {id:'invalid-expiry',app_access_type:'trial',app_access_expires_at:'invalid'},
 {id:'paid',app_access_type:'reading_access'},
 {id:'no-book',app_access_type:'trial',app_access_expires_at:future},
 {id:'wrong-book',app_access_type:'trial',app_access_expires_at:future},
 {id:'actor',app_access_type:'trial',app_access_expires_at:future},
].map(p=>({...p,role:'member',display_name:p.id}));
function targetClient(){
 const copies=recipients.filter(p=>p.id!=='no-book').map(p=>({id:`copy-${p.id}`,user_id:p.id,book_id:p.id==='wrong-book'?'other':'catalog'}));
 copies.push({id:'duplicate-trial',user_id:'trial',book_id:'catalog'});
 return {from(table){let rows=table==='user_books'?copies:recipients;return {
  select(){return this},eq(k,v){rows=rows.filter(r=>r[k]===v);return this},neq(k,v){rows=rows.filter(r=>r[k]!==v);return this},in(k,vs){rows=rows.filter(r=>vs.includes(r[k]));return this},order(){return this},
  then(resolve){return Promise.resolve({data:rows,error:null}).then(resolve)},
 }}};
}
for(const actor of [{id:'actor',role:'teacher'},{id:'actor',role:'super_teacher'},{id:'actor',role:'admin'},{id:'actor',role:'teacher',is_super_teacher:true}])test(`Save Words contextual recipients for ${JSON.stringify(actor)}`,async()=>{
 const load=productionFunction('lib/teacher/contextualWordTargets.ts','loadContextualWordTargets',{
  supabaseAdmin:targetClient(),getAppAccessStatus:accessModule.exports.getAppAccessStatus,getFeatureAccess:featuresModule.exports.getFeatureAccess,
 });
 const targets=await load(targetClient(),'catalog',actor,new Set(['linked']));
 const isAdmin=featuresModule.exports.getFeatureAccess({role:actor.role,isSuperTeacher:actor.is_super_teacher}).isAdmin;
 assert.deepEqual(targets.map(t=>t.studentId),isAdmin?['linked','trial']:['linked']);
 assert.equal(targets.find(t=>t.studentId==='linked').studentUserBookId,'copy-linked');
 if(isAdmin)assert.equal(targets.find(t=>t.studentId==='trial').studentUserBookId,'copy-trial');
 assert.deepEqual((await load(targetClient(),'catalog',actor,new Set())).map(t=>t.studentId),isAdmin?['trial']:[]);
});

test('Bulk Add revalidates the existing target copy at save time',async()=>{
 const authorize=productionFunction('app/api/vocab/bulk/teaching/route.ts','authorizeStudentDestination',{
  authorizeSourceBook:async(actor,source)=>source==='own-source'?{ok:true,bookId:'catalog'}:{ok:false,error:'not owned',status:403},
  loadStudentDestinations:async(actor,book)=>{assert.equal(book,'catalog');return actor==='super'?[{userBookId:'trial-copy',label:'Trial',pageCount:100}]:[]},
 });
 const input={teacherId:'super',sourceUserBookId:'own-source',lessonBookId:'',targetUserBookId:'trial-copy'};
 assert.deepEqual(await authorize(input),{ok:true,userBookId:'trial-copy',pageCount:100,destinationName:'Trial'});
 assert.equal((await authorize({...input,teacherId:'ordinary'})).status,403);
 assert.equal((await authorize({...input,targetUserBookId:'other-copy'})).status,403);
 assert.equal((await authorize({...input,sourceUserBookId:'foreign-source'})).status,403);
});
test('Quick Add authorization does not depend on trial eligibility, but still requires the exact student-owned book',async()=>{
 const context={actorId:teacherId,studentId,userBookId:bookCopyId};
 const tomorrow=new Date(Date.now()+86400000).toISOString();
 for(const appAccessExpiresAt of [tomorrow,'2000-01-01T00:00:00.000Z']){
  assert.equal((await quickAddAuthorizer({role:'super_teacher',appAccessType:'trial',appAccessExpiresAt})({...context})).ok,true);
 }
 assert.equal((await quickAddAuthorizer({role:'super_teacher',ownerId:uuid(299)})({...context})).ok,false);
});
