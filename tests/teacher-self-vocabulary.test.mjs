import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),cache=new Map();
function load(file){if(cache.has(file))return cache.get(file);const mod={exports:{}};cache.set(file,mod.exports);new Function('require','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(name=>name.startsWith('@/')?load(name.slice(2)+'.ts'):name.startsWith('.')?load(path.join(path.dirname(file),name)+'.ts'):require(name),mod.exports);return mod.exports}
const vocabulary=load('lib/teacher/teacherBookVocabulary.ts');
function database({own=true,badLink=false}={}){
 const tables={teacher_books:[{id:'teaching',teacher_id:'teacher',book_id:'catalog',user_book_id:badLink?'student-copy':own?'my-copy':null,books:{page_count:200}}],user_books:[{id:'student-copy',user_id:'student',book_id:'catalog'},...(own?[{id:'my-copy',user_id:'teacher',book_id:'catalog',personal_tracking_status:'reading',started_at:'2025-01-01',finished_at:null,progress_tracking_method:'page'}]:[])],user_book_words:[],teacher_book_vocabulary:[],vocabulary_cache:[]};
 const writes=[];let current='teacher',failTeaching=false;
 const client={auth:{getUser:async()=>({data:{user:{id:current}}})},from(table){let filters=[],mode=null,payload,limit=null;
  const q={select(){return q},eq(key,value){filters.push(row=>row[key]===value);return q},order(){return q},limit(n){limit=n;return q},or(){return q},insert(value){mode='insert';payload=value;return q},update(value){mode='update';payload=value;return q},async single(){return run(true)},async maybeSingle(){return run(true)},then(resolve,reject){return Promise.resolve(run(false)).then(resolve,reject)}};
  function run(single){let rows=tables[table].filter(row=>filters.every(f=>f(row)));if(limit!=null)rows=rows.slice(0,limit);
   if(mode){if(table==='teacher_book_vocabulary'&&failTeaching)return {error:new Error('temporary write failure')};writes.push({table,mode,payload:{...payload}});if(mode==='insert'){const row={id:`${table}-${tables[table].length+1}`,...payload};tables[table].push(row);rows=[row]}else{rows.forEach(row=>Object.assign(row,payload))}}
   return {data:single?rows[0]??null:rows,error:null};}
  return q;
 }};return {client,tables,writes,setUser:value=>current=value,setFailure:value=>failTeaching=value};
}
const input={surface:'読む',reading:'よむ',meaning:'read',isManual:true,pageNumber:'12',chapterNumber:'2',chapterName:'A chapter',book_form:'読んで',book_form_description:'て-form',alternativeSurface:'よむ',followAlongSupportNote:'A request'};
async function save(db){const context=await vocabulary.loadTeacherBookContext(db.client,'teaching','teacher');return vocabulary.saveTeacherVocabularyAndInclude(db.client,context,input)}
for(const badLink of [false,true])test(`self saves reuse owned copy and preserve tracking; foreign linked copy=${badLink}`,async()=>{
 const db=database({badLink});const before=structuredClone(db.tables.user_books);await save(db);
 assert.deepEqual(db.tables.user_books,before);assert.ok(!db.writes.some(w=>w.table==='user_books'));
 const word=db.tables.user_book_words[0];assert.equal(word.user_book_id,'my-copy');assert.equal(word.book_form,'読んで');assert.equal(word.chapter_number,2);assert.equal(word.excluded_from_flashcards,false);assert.equal(word.follow_along_support_note,'A request');
 assert.equal(db.tables.teacher_book_vocabulary[0].linked_user_book_word_id,word.id);
 assert.equal(db.tables.teacher_book_vocabulary[0].alternative_surface,'よむ');
 word.excluded_from_flashcards=true;word.study_marker='untouched';await save(db);
 assert.equal(db.tables.user_book_words.length,1);assert.equal(word.excluded_from_flashcards,true);assert.equal(word.study_marker,'untouched');
});
test('missing own copy uses canonical resolver once and never promotes it to personal tracking',async()=>{
 const db=database({own:false,badLink:true});await save(db);await save(db);
 const own=db.tables.user_books.filter(row=>row.user_id==='teacher');assert.equal(own.length,1);assert.equal(own[0].personal_tracking_status,'not_tracking');assert.equal(own[0].started_at,undefined);
 assert.equal(db.tables.user_book_words[0].user_book_id,own[0].id);
});
test('partial prep-link failure can retry without a second personal word',async()=>{
 const db=database();db.setFailure(true);await assert.rejects(save(db),/temporary/);assert.equal(db.tables.user_book_words.length,1);
 db.setFailure(false);await save(db);assert.equal(db.tables.user_book_words.length,1);assert.equal(db.tables.teacher_book_vocabulary.length,1);
});
test('different authenticated user cannot self-save using a teacher context',async()=>{
 const db=database();const context=await vocabulary.loadTeacherBookContext(db.client,'teaching','teacher');db.setUser('student');await assert.rejects(vocabulary.saveTeacherVocabularyAndInclude(db.client,context,input),/ownership/);assert.deepEqual(db.writes,[]);
});
