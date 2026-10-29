import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
function load(file,mocks={}) { const m={exports:{}}; new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(n=>n in mocks?mocks[n]:require(n),m,m.exports);return m.exports; }
const access=load('lib/teacher/bookInfoAccess.ts');
for(const profile of [{role:'admin'},{role:'super_teacher'},{role:'reader',is_super_teacher:true},{role:'reader',is_super_teacher:'true'}]) test(`catalog review allowed: ${JSON.stringify(profile)}`,()=>assert.equal(access.canReviewBookInfo(profile),true));
for(const profile of [null,{role:'reader'},{role:'teacher'},{role:'adminish'},{role:'reader',is_super_teacher:'false'}]) test(`catalog review denied: ${JSON.stringify(profile)}`,()=>assert.equal(access.canReviewBookInfo(profile),false));
test('admin route exception is exact and excludes unrelated student/tools routes',()=>{
 for(const p of ['/teacher/admin','/teacher/books','/teacher/books/missing-info','/teacher/books/add','/teacher/needs-attention']) assert.equal(access.canEnterTeacherRoute({role:'admin'},p),true,p);
 for(const p of ['/teacher','/teacher/students','/teacher/students/private','/teacher/words','/teacher/books/requests','/teacher/books/flags','/teacher/needs-attention/grammar','/teacher/books/add/anything',null]) assert.equal(access.canEnterTeacherRoute({role:'admin'},p),false,p);
 assert.equal(access.canEnterTeacherRoute({role:'teacher'},'/teacher/students'),true);
 assert.equal(access.canEnterTeacherRoute({role:'super_teacher'},'/teacher/students'),true);
 assert.equal(access.canEnterTeacherRoute(null,'/teacher/books'),false);
});
test('actual queue access helper preserves super-only callers while admitting admin book reviewers',async()=>{
 for(const role of ['admin','super_teacher','teacher','reader']) {
 const client={auth:{getUser:async()=>({data:{user:{id:'synthetic'}}})},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{role}})})})})};
 const helper=load('app/(protected)/teacher/books/_shared/bookAttentionHelpers.ts',{'@/lib/teacher/bookInfoAccess':access,'@/lib/books/bookMetadata':{missingCoreBookFields:()=>[]},'@/lib/supabaseClient':{supabase:client}});
 assert.equal(!!(await helper.requireBookInfoReviewer()).user,['admin','super_teacher'].includes(role));
 assert.equal(!!(await helper.requireSuperTeacher()).user,role==='super_teacher');
 }
});
test('actual Needs Attention admin path loads no student or unrelated activity data',async()=>{
 const cells=[],effects=[];let index=0;const calls=[];
 const react={useState(v){const i=index++;if(!(i in cells))cells[i]=v;return [cells[i],v=>cells[i]=v]},useEffect(fn){if(!effects.length)effects.push(fn)}};
 const missing=()=>null;
 const client={auth:{getUser:async()=>({data:{user:{id:'synthetic'}}})},from(name){calls.push(name);assert.equal(name,'profiles');return {select:()=>({eq:()=>({maybeSingle:async()=>({data:{role:'admin'}})})})}}};
 const Page=load('app/(protected)/teacher/needs-attention/page.tsx',{'react':react,'@/lib/supabaseClient':{supabase:client},'../books/missing-info/page':{default:missing},'@/lib/books/bookMetadata':{missingCoreBookFields:()=>[]},'@/lib/teacher/teacherReviewCompletion':{},'./components/NeedsAttentionCardGrid':{},'./components/NeedsAttentionHeader':{},'./components/NeedsAttentionStatePanels':{NeedsAttentionLoadingPanel:()=>null}}).default;
 Page();effects[0]();for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));index=0;
 assert.equal(Page().type,missing);assert.deepEqual(calls,['profiles']);
});
