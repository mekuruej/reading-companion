import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function productionFunction(file,name,env){
 const source=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
 const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let declaration;
 function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text===name)declaration=node;ts.forEachChild(node,visit)}visit(ast);
 assert.ok(declaration);
 const code=ts.transpileModule(declaration.getText(ast).replace(/^export /,''),{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
 return new Function(...Object.keys(env),code+`;return ${name};`)(...Object.values(env));
}
function client(rows){return {from(table){return {select(){return this},eq(){return this},is(){return this},async maybeSingle(){return {data:rows[table]??null,error:null}}}}}}
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
test('existing Quick Add restricts even super teachers to linked, assigned, correctly owned books',async()=>{
 const file='app/api/teacher/live-lesson-words/route.ts';
 const flag=productionFunction(file,'isSuperTeacherFlag',{});
 const superTeacher=productionFunction(file,'isSuperTeacher',{isSuperTeacherFlag:flag});
 const isTeacher=productionFunction(file,'isTeacher',{isSuperTeacher:superTeacher});
 for(const role of ['teacher','super_teacher']){
  for(const [linked,assigned,owner,allowed] of [[false,false,'student',false],[true,false,'student',false],[true,true,'wrong-owner',false],[true,true,'student',true]]){
   const authorize=productionFunction(file,'authorizeTeacherForStudentBook',{
    getProfile:async()=>({id:'teacher',role}),isTeacher,isSuperTeacher:superTeacher,loadContextualWordTargets:async()=>[],
    supabaseAdmin:client({user_books:{id:'copy',user_id:owner,book_id:'catalog'},teacher_students:linked?{teacher_id:'teacher'}:null,teacher_student_lesson_books:assigned?{id:'assignment'}:null}),
   });
   assert.equal((await authorize({actorId:'teacher',studentId:'student',userBookId:'copy'})).ok,allowed);
  }
 }
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
test('Quick Add allows an eligible trial only for super teachers owning the same book',async()=>{
 const file='app/api/teacher/live-lesson-words/route.ts';
 const flag=productionFunction(file,'isSuperTeacherFlag',{});
 const superTeacher=productionFunction(file,'isSuperTeacher',{isSuperTeacherFlag:flag});
 const isTeacher=productionFunction(file,'isTeacher',{isSuperTeacher:superTeacher});
 for(const role of ['teacher','super_teacher'])for(const eligible of [true,false])for(const own of [true,false]){
  const db=client({user_books:{id:'trial-copy',user_id:'trial',book_id:'catalog'}});
  const from=db.from;
  db.from=table=>{const q=from(table);q.limit=async()=>({data:own?[{id:'own-copy'}]:[],error:null});return q};
  const authorize=productionFunction(file,'authorizeTeacherForStudentBook',{
   getProfile:async()=>({id:'actor',role}),isTeacher,isSuperTeacher:superTeacher,supabaseAdmin:db,
   loadContextualWordTargets:async()=>eligible?[{studentUserBookId:'trial-copy',studentId:'trial'}]:[],
  });
  assert.equal((await authorize({actorId:'actor',studentId:'trial',userBookId:'trial-copy'})).ok,role==='super_teacher'&&eligible&&own);
  assert.equal((await authorize({actorId:'actor',studentId:'wrong-owner',userBookId:'trial-copy'})).ok,false);
 }
});
